import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStripePaymentDto,
  ConfirmPaymentDto,
  WechatPaymentDto,
  RefundDto,
  CreateRefundDto,
  ApproveRefundDto,
  WechatNotifyDto,
  WechatCallbackMeta,
} from './dto/payments.dto';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import axios from 'axios';
import { assertPublicHttpUrl, OUTBOUND_REQUEST_TIMEOUT_MS } from '../../common/utils/assert-public-url';

// WeChat Pay V3 SDK (simplified implementation)
interface WechatPayConfig {
  appid: string;
  mchid: string;
  privateKey: string;
  serialNo: string;
  apiV3Key: string;
  notifyUrl: string;
}

const WECHAT_PAY_API_BASE = 'https://api.mch.weixin.qq.com';

/** 微信支付解密后的回调解报文（v3 支付通知 resource 明文） */
interface DecryptedWechatNotification {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  attach?: string;
  amount?: {
    total?: number;
    payer_total?: number;
    currency?: string;
    payer_currency?: string;
  };
  [key: string]: unknown;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private wechatConfig: WechatPayConfig;
  private readonly logger = new Logger(PaymentsService.name);
  /** 微信平台证书缓存（serial -> 公钥证书 PEM），用于回调验签 */
  private readonly platformCertCache = new Map<string, string>();
  private platformCertsFetchedAt = 0;

  constructor(private prisma: PrismaService) {
    // Initialize Stripe
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2023-10-16',
    });

    // Initialize WeChat Pay config
    this.wechatConfig = {
      appid: process.env.WECHAT_PAY_APPID || '',
      mchid: process.env.WECHAT_PAY_MCHID || '',
      privateKey: process.env.WECHAT_PAY_PRIVATE_KEY || '',
      serialNo: process.env.WECHAT_PAY_SERIAL_NO || '',
      apiV3Key: process.env.WECHAT_PAY_APIV3_KEY || '',
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || 'http://localhost:3001/api/payments/wechat/notify',
    };
  }

  private async finalizePaymentSuccess(params: {
    paymentId: string;
    orderId: string;
    userId: string;
    note: string;
    paidAt?: Date;
  }) {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id: params.paymentId },
    });

    if (!existingPayment) {
      throw new NotFoundException('Payment not found');
    }

    if (existingPayment.status === 'COMPLETED') {
      return existingPayment;
    }

    const paidAt = params.paidAt || new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: 'COMPLETED',
          paidAt,
        },
      });

      await tx.order.update({
        where: { id: params.orderId },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: params.orderId,
          status: 'CONFIRMED',
          note: params.note,
        },
      });

      return updatedPayment;
    });

    await this.createPaymentNotification(params.userId, params.orderId, 'payment_success');
    return result;
  }

  private async markPaymentFailed(stripePaymentIntentId: string) {
    await this.prisma.payment.updateMany({
      where: {
        stripePaymentIntentId,
        status: { not: 'COMPLETED' as any },
      },
      data: { status: 'FAILED' },
    });
  }

  private async assertPaymentAccess(orderId: string, userId: string, role?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (role !== 'ADMIN' && payment.order.patientId !== userId) {
      throw new ForbiddenException('You can only access your own payment');
    }

    return payment;
  }

  // ========== STRIPE PAYMENTS ==========

  async createStripePaymentIntent(userId: string, dto: CreateStripePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.patientId !== userId) {
      throw new BadRequestException('You can only pay for your own orders');
    }

    if (order.paymentStatus === 'COMPLETED') {
      throw new BadRequestException('Order is already paid');
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });

    // Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: dto.currency || 'cny',
      metadata: {
        orderId: dto.orderId,
        userId,
      },
    });

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          userId,
          amount: order.totalAmount * 100,
          currency: dto.currency || 'cny',
          method: 'STRIPE',
          status: 'PENDING',
          stripePaymentIntentId: paymentIntent.id,
          wechatOrderId: null,
          wechatPrepayId: null,
          paidAt: null,
        },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          orderId: dto.orderId,
          userId,
          amount: order.totalAmount * 100,
          currency: dto.currency || 'cny',
          method: 'STRIPE',
          status: 'PENDING',
          stripePaymentIntentId: paymentIntent.id,
        },
      });
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async confirmStripePayment(userId: string, dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: dto.paymentIntentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.order.patientId !== userId) {
      throw new ForbiddenException('You can only confirm your own payment');
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(dto.paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(`Payment is not completed. Current status: ${paymentIntent.status}`);
    }

    await this.finalizePaymentSuccess({
      paymentId: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      note: 'Payment confirmed via verified Stripe status',
      paidAt: paymentIntent.created ? new Date(paymentIntent.created * 1000) : undefined,
    });

    return { success: true, orderId: payment.orderId };
  }

  async handleStripeWebhook(body: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
      );

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const paymentRecord = await this.prisma.payment.findUnique({
            where: { stripePaymentIntentId: paymentIntent.id },
          });

          if (paymentRecord) {
            await this.finalizePaymentSuccess({
              paymentId: paymentRecord.id,
              orderId: paymentRecord.orderId,
              userId: paymentRecord.userId,
              note: 'Payment succeeded via Stripe webhook',
              paidAt: paymentIntent.created ? new Date(paymentIntent.created * 1000) : undefined,
            });
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          await this.markPaymentFailed(failedIntent.id);
          break;
        }
      }

      return { received: true };
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }

  // ========== WECHAT PAYMENTS ==========

  /**
   * Generate WeChat Pay V3 signature
   */
  private generateWechatSignature(method: string, url: string, timestamp: string, nonceStr: string, body: string): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(this.wechatConfig.privateKey, 'base64');
  }

  /**
   * Generate random nonce string
   */
  private generateNonceStr(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create WeChat Native Payment (QR Code)
   */
  async createWechatPayment(userId: string, dto: WechatPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.patientId !== userId) {
      throw new BadRequestException('You can only pay for your own orders');
    }

    if (order.paymentStatus === 'COMPLETED') {
      throw new BadRequestException('Order is already paid');
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existingPayment && existingPayment.status === 'PENDING') {
      // Return existing payment QR code
      return {
        wechatOrderId: existingPayment.wechatOrderId,
        qrCodeUrl: `weixin://wxpay/bizpayurl?pr=${existingPayment.wechatOrderId}`,
        codeUrl: existingPayment.wechatOrderId,
      };
    }

    // Generate unique out_trade_no
    const outTradeNo = `MM${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Prepare WeChat Pay request body
    const requestBody = {
      appid: this.wechatConfig.appid,
      mchid: this.wechatConfig.mchid,
      description: `MediMate Order - ${order.orderNo}`,
      out_trade_no: outTradeNo,
      time_expire: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes expiry
      attach: JSON.stringify({ orderId: dto.orderId, userId }),
      notify_url: this.wechatConfig.notifyUrl,
      amount: {
        total: Math.round(order.totalAmount * 100), // Convert to cents
        currency: 'CNY',
      },
    };

    let codeUrl = '';
    let prepayId = '';

    // If WeChat Pay credentials are configured, call real API
    if (this.wechatConfig.mchid && this.wechatConfig.apiV3Key) {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = this.generateNonceStr();
        const bodyStr = JSON.stringify(requestBody);
        const signature = this.generateWechatSignature('POST', '/v3/pay/transactions/native', timestamp, nonceStr, bodyStr);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.wechatConfig.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.wechatConfig.serialNo}"`;

        await assertPublicHttpUrl(`${WECHAT_PAY_API_BASE}/v3/pay/transactions/native`);
        const response = await axios.post(
          'https://api.mch.weixin.qq.com/v3/pay/transactions/native',
          requestBody,
          {
            headers: {
              'Authorization': authorization,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            timeout: OUTBOUND_REQUEST_TIMEOUT_MS,
          }
        );

        codeUrl = response.data.code_url;
        prepayId = response.data.prepay_id;
      } catch (error) {
        this.logger.error('WeChat Pay API error:', error.response?.data || error.message);
        // Fall back to mock mode
      }
    }

    // Mock mode or fallback
    if (!codeUrl) {
      codeUrl = `weixin://wxpay/bizpayurl?pr=${outTradeNo}`;
      prepayId = `wx${outTradeNo}`;
    }

    // Create or update payment record
    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          wechatOrderId: outTradeNo,
          wechatPrepayId: prepayId,
          amount: order.totalAmount * 100,
        },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          orderId: dto.orderId,
          userId,
          amount: order.totalAmount * 100,
          currency: 'cny',
          method: 'WECHAT',
          status: 'PENDING',
          wechatOrderId: outTradeNo,
          wechatPrepayId: prepayId,
        },
      });
    }

    return {
      wechatOrderId: outTradeNo,
      qrCodeUrl: codeUrl,
      codeUrl: codeUrl,
    };
  }

  /**
   * Query WeChat payment status
   */
  async queryWechatPayment(userId: string, orderId: string) {
    const payment = await this.assertPaymentAccess(orderId, userId);

    // If WeChat Pay is configured, query real status
    if (this.wechatConfig.mchid && payment.wechatOrderId && payment.status === 'PENDING') {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = this.generateNonceStr();
        const url = `/v3/pay/transactions/out-trade-no/${payment.wechatOrderId}?mchid=${this.wechatConfig.mchid}`;
        const signature = this.generateWechatSignature('GET', url, timestamp, nonceStr, '');
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.wechatConfig.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.wechatConfig.serialNo}"`;

        await assertPublicHttpUrl(`${WECHAT_PAY_API_BASE}${url}`);
        const response = await axios.get(
          `https://api.mch.weixin.qq.com${url}`,
          {
            headers: {
              'Authorization': authorization,
              'Accept': 'application/json',
            },
            timeout: OUTBOUND_REQUEST_TIMEOUT_MS,
          }
        );

        const tradeState = response.data.trade_state;
        if (tradeState === 'SUCCESS') {
          await this.finalizePaymentSuccess({
            paymentId: payment.id,
            orderId,
            userId: payment.userId,
            note: 'Payment confirmed via WeChat Pay query',
          });

          return { ...payment, status: 'COMPLETED', tradeState };
        }

        return { ...payment, tradeState };
      } catch (error) {
        this.logger.error('Query WeChat payment error:', error.response?.data || error.message);
      }
    }

    return payment;
  }

  /**
   * AES-256-GCM 解密（微信支付 APIv3：ciphertext 为 base64，末 16 字节为 GCM auth tag）
   */
  private decryptWechatAesGcm(ciphertext: string, nonce: string, associatedData: string): Buffer {
    const key = Buffer.from(this.wechatConfig.apiV3Key, 'utf8');
    if (key.length !== 32) {
      throw new UnauthorizedException('WeChat Pay APIv3 key is missing or not 32 bytes');
    }

    const cipherBuffer = Buffer.from(ciphertext, 'base64');
    if (cipherBuffer.length <= 16) {
      throw new UnauthorizedException('Invalid WeChat notify ciphertext');
    }

    const authTag = cipherBuffer.subarray(cipherBuffer.length - 16);
    const encryptedData = cipherBuffer.subarray(0, cipherBuffer.length - 16);
    const iv = Buffer.from(nonce, 'utf8');
    const aad = Buffer.from(associatedData, 'utf8');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(aad);
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  /**
   * 解析微信平台证书的候选公钥，用于回调验签：
   * 1. 环境变量 WECHAT_PAY_PUBLIC_KEY（公钥模式，可配 WECHAT_PAY_PUBLIC_KEY_ID）；
   * 2. 环境变量 WECHAT_PAY_PLATFORM_CERTS / WECHAT_PAY_PLATFORM_CERT（平台证书 PEM）；
   * 3. 商户号 + 商户私钥配置齐全时，从 /v3/certificates 拉取并缓存平台证书。
   * 返回 null 表示当前无法验签（调用方需降级并告警）。
   */
  private async getWechatPlatformVerifyKeys(serial: string): Promise<string[] | null> {
    // 1. 公钥模式
    const publicKeyEnv = process.env.WECHAT_PAY_PUBLIC_KEY;
    if (publicKeyEnv) {
      const publicKeyId = process.env.WECHAT_PAY_PUBLIC_KEY_ID;
      if (publicKeyId && publicKeyId !== serial) {
        return null;
      }
      return [publicKeyEnv.replace(/\\n/g, '\n')];
    }

    // 2. 环境变量提供的平台证书
    const envCerts = (process.env.WECHAT_PAY_PLATFORM_CERTS || process.env.WECHAT_PAY_PLATFORM_CERT || '')
      .split('-----END CERTIFICATE-----')
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .map(part => `${part}\n-----END CERTIFICATE-----`);
    if (envCerts.length > 0) {
      const matched: string[] = [];
      for (const pem of envCerts) {
        try {
          const cert = new crypto.X509Certificate(pem);
          if (cert.serialNumber.toLowerCase() === serial.toLowerCase()) {
            matched.push(pem);
          }
        } catch {
          this.logger.warn('Ignoring invalid WECHAT_PAY_PLATFORM_CERT(S) PEM entry');
        }
      }
      // 序列号匹配不到时仍尝试全部已配置证书（证书序列号格式差异兜底），
      // 验签本身仍能证明该通知由微信平台私钥签名。
      return matched.length > 0 ? matched : envCerts;
    }

    // 3. 在线拉取平台证书（需商户凭据齐全）
    const canFetch =
      this.wechatConfig.mchid &&
      this.wechatConfig.privateKey &&
      this.wechatConfig.serialNo &&
      this.wechatConfig.apiV3Key;
    if (!canFetch) {
      return null;
    }

    const now = Date.now();
    if (!this.platformCertCache.has(serial) && now - this.platformCertsFetchedAt > 60_000) {
      await this.fetchWechatPlatformCertificates();
    }
    const cached = this.platformCertCache.get(serial);
    if (!cached) {
      return null;
    }
    return [cached];
  }

  /**
   * 从微信 /v3/certificates 拉取平台证书并缓存
   */
  private async fetchWechatPlatformCertificates(): Promise<void> {
    try {
      const urlPath = '/v3/certificates';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const signature = this.generateWechatSignature('GET', urlPath, timestamp, nonceStr, '');
      const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.wechatConfig.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.wechatConfig.serialNo}"`;

      await assertPublicHttpUrl(`${WECHAT_PAY_API_BASE}${urlPath}`);
      const response = await axios.get(`${WECHAT_PAY_API_BASE}${urlPath}`, {
        headers: {
          'Authorization': authorization,
          'Accept': 'application/json',
        },
        timeout: OUTBOUND_REQUEST_TIMEOUT_MS,
      });

      const certs = response?.data?.data;
      if (Array.isArray(certs)) {
        for (const cert of certs) {
          const { ciphertext, nonce, associated_data } = cert.encrypt_certificate || {};
          if (!ciphertext || !nonce || !cert.serial_no) continue;
          const pem = this.decryptWechatAesGcm(ciphertext, nonce, associated_data || 'certificate').toString('utf8');
          this.platformCertCache.set(cert.serial_no, pem);
        }
        this.platformCertsFetchedAt = Date.now();
        this.logger.log(`Fetched ${this.platformCertCache.size} WeChat platform certificate(s)`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to fetch WeChat platform certificates:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 微信回调验签：
   * - 时间戳窗口（±5 分钟）始终强制校验；
   * - 拿得到平台公钥/证书时严格验签，失败返回 401；
   * - 拿不到平台证书时记录告警并降级（此时报文真伪由强制 AES-GCM 解密保证）。
   */
  private async verifyWechatCallbackSignature(meta: WechatCallbackMeta): Promise<void> {
    const { signature, timestamp, nonce, serial } = meta;

    const ts = Number(timestamp);
    if (!timestamp || !Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      throw new UnauthorizedException('WeChat notify timestamp is missing or outside the allowed window');
    }
    if (!signature || !nonce || !serial) {
      throw new UnauthorizedException('WeChat notify signature headers are missing');
    }
    if (!meta.rawBody || meta.rawBody.length === 0) {
      throw new UnauthorizedException('WeChat notify raw body is missing');
    }

    const verifyKeys = await this.getWechatPlatformVerifyKeys(serial);
    if (!verifyKeys || verifyKeys.length === 0) {
      this.logger.warn(
        'WeChat platform certificate unavailable, skipping signature verification ' +
        '(payload authenticity still enforced by mandatory AES-GCM decryption)',
      );
      return;
    }

    const message = Buffer.from(`${timestamp}\n${nonce}\n${meta.rawBody.toString('utf8')}\n`, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'base64');
    const verified = verifyKeys.some(key => {
      try {
        return crypto.createVerify('RSA-SHA256').update(message).verify(key, signatureBuffer);
      } catch {
        return false;
      }
    });

    if (!verified) {
      throw new UnauthorizedException('WeChat notify signature verification failed');
    }
  }

  /**
   * Handle WeChat Pay callback notification
   *
   * 安全约束：
   * - 先验签（时间戳窗口 + 平台证书/公钥，尽力而为）；
   * - 必须携带 resource 且经 APIv3 key AES-256-GCM 解密，不接受任何明文回调
   *   （原「无 resource 就当明文」分支已删除，杜绝伪造 trade_state=SUCCESS）；
   * - 解密后的 out_trade_no/amount 必须与本地 payment 记录一致才允许 finalize。
   */
  async handleWechatNotify(
    notifyData: WechatNotifyDto,
    callbackMeta: WechatCallbackMeta = {},
  ): Promise<{ code: string; message: string }> {
    try {
      // 1. 验签（时间戳窗口强制，平台证书尽力接入）
      await this.verifyWechatCallbackSignature(callbackMeta);

      // 2. 必须存在 resource 并通过 APIv3 key 解密
      const resource = notifyData?.resource;
      if (!resource || !resource.ciphertext || !resource.nonce) {
        throw new UnauthorizedException('WeChat notify resource is required and must be encrypted');
      }
      if (resource.algorithm && resource.algorithm !== 'AEAD_AES_256_GCM') {
        throw new UnauthorizedException('Unsupported WeChat notify encryption algorithm');
      }

      let decryptedData: DecryptedWechatNotification;
      try {
        const decryptedBuffer = this.decryptWechatAesGcm(
          resource.ciphertext,
          resource.nonce,
          resource.associated_data || '',
        );
        decryptedData = JSON.parse(decryptedBuffer.toString('utf8')) as DecryptedWechatNotification;
      } catch (error) {
        if (error instanceof UnauthorizedException) throw error;
        // GCM tag 校验失败/JSON 解析失败都意味着报文不可信
        throw new UnauthorizedException('WeChat notify payload decryption failed');
      }

      const { out_trade_no, transaction_id, trade_state, attach, amount } = decryptedData;
      if (!out_trade_no) {
        throw new UnauthorizedException('WeChat notify payload is missing out_trade_no');
      }

      // 3. 与本地支付记录一致性校验
      const payment = await this.prisma.payment.findUnique({
        where: { wechatOrderId: out_trade_no },
      });

      if (!payment || payment.wechatOrderId !== out_trade_no) {
        throw new UnauthorizedException('WeChat notify does not match any local payment record');
      }

      // attach 中的 orderId 若存在，必须与本地记录一致
      let attachOrderId: string | undefined;
      if (attach) {
        try {
          attachOrderId = JSON.parse(attach)?.orderId;
        } catch {
          attachOrderId = undefined;
        }
        if (attachOrderId && attachOrderId !== payment.orderId) {
          throw new UnauthorizedException('WeChat notify attach.orderId does not match local payment record');
        }
      }

      // 金额一致性（分）：解密报文的 amount.total 必须等于本地记录
      if (amount?.total == null || Math.round(Number(amount.total)) !== Math.round(payment.amount)) {
        throw new UnauthorizedException('WeChat notify amount does not match local payment record');
      }

      if (trade_state === 'SUCCESS') {
        await this.finalizePaymentSuccess({
          paymentId: payment.id,
          orderId: payment.orderId,
          userId: payment.userId,
          note: `Payment confirmed via WeChat Pay. Transaction ID: ${transaction_id}`,
        });
      }

      return {
        code: 'SUCCESS',
        message: 'OK',
      };
    } catch (error) {
      // 验签/解密/一致性失败 → HTTP 401（微信会重试）；其余按 FAIL 应答
      if (error instanceof UnauthorizedException) {
        this.logger.warn(`WeChat notify rejected: ${error.message}`);
        throw error;
      }
      this.logger.error('WeChat notify error:', error);
      return {
        code: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ========== REFUNDS ==========

  /**
   * Create refund request
   */
  async createRefund(userId: string, dto: CreateRefundDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.order.patientId !== userId) {
      throw new BadRequestException('You can only refund your own payments');
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Can only refund paid payments');
    }

    // Check if refund already exists
    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        paymentId: payment.id,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
      },
    });

    if (existingRefund) {
      throw new BadRequestException('Refund request already exists');
    }

    // Validate refund amount
    const refundAmount = dto.amount ? dto.amount * 100 : payment.amount;
    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    // Create refund record
    const refund = await this.prisma.refund.create({
      data: {
        paymentId: payment.id,
        orderId: dto.orderId,
        userId,
        amount: refundAmount,
        reason: dto.reason,
        reasonType: dto.reasonType || 'other',
        description: dto.description,
        status: 'PENDING',
      },
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { status: 'REFUNDING' },
    });

    // Create order status history
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: dto.orderId,
        status: 'REFUNDING',
        note: `Refund requested: ${dto.reason}`,
        createdBy: userId,
      },
    });

    // Create notification for admin
    await this.createRefundNotification(userId, dto.orderId, 'refund_requested');

    return refund;
  }

  /**
   * Get refund list for user
   */
  async getUserRefunds(userId: string, page = 1, limit = 20) {
    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        where: { userId },
        include: {
          payment: {
            select: {
              method: true,
              amount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.refund.count({ where: { userId } }),
    ]);

    return {
      data: refunds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all refunds (admin)
   */
  async getAllRefunds(page = 1, limit = 20, status?: string) {
    const where = status ? { status: status as any } : {};
    
    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        include: {
          payment: {
            select: {
              method: true,
              wechatOrderId: true,
              stripePaymentIntentId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return {
      data: refunds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Approve refund (admin)
   */
  async approveRefund(refundId: string, adminId: string, dto: ApproveRefundDto) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Refund is not pending');
    }

    // Process refund based on payment method
    if (refund.payment.method === 'STRIPE' && refund.payment.stripePaymentIntentId) {
      try {
        await this.stripe.refunds.create({
          payment_intent: refund.payment.stripePaymentIntentId,
          amount: Math.round(refund.amount),
        });
      } catch (error) {
        this.logger.error('Stripe refund error:', error);
        throw new BadRequestException('Stripe refund failed: ' + error.message);
      }
    } else if (refund.payment.method === 'WECHAT' && refund.payment.wechatOrderId) {
      // Process WeChat refund
      await this.processWechatRefund(refund);
    }

    // Update refund status
    await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'COMPLETED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: dto.note,
      },
    });

    // Update payment status
    await this.prisma.payment.update({
      where: { id: refund.paymentId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: refund.orderId },
      data: {
        paymentStatus: 'REFUNDED',
        status: 'REFUNDED',
      },
    });

    // Create order status history
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: refund.orderId,
        status: 'REFUNDED',
        note: `Refund approved. Amount: ¥${(refund.amount / 100).toFixed(2)}. ${dto.note || ''}`,
        createdBy: adminId,
      },
    });

    // Create notification
    await this.createRefundNotification(refund.userId, refund.orderId, 'refund_approved');

    return { success: true, refund };
  }

  /**
   * Reject refund (admin)
   */
  async rejectRefund(refundId: string, adminId: string, dto: ApproveRefundDto) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Refund is not pending');
    }

    // Update refund status
    await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: dto.note,
      },
    });

    // Update order status back to CONFIRMED
    await this.prisma.order.update({
      where: { id: refund.orderId },
      data: {
        status: 'CONFIRMED',
      },
    });

    // Create order status history
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: refund.orderId,
        status: 'CONFIRMED',
        note: `Refund rejected. Reason: ${dto.note}`,
        createdBy: adminId,
      },
    });

    // Create notification
    await this.createRefundNotification(refund.userId, refund.orderId, 'refund_rejected');

    return { success: true, refund };
  }

  /**
   * Process WeChat refund
   */
  private async processWechatRefund(refund: any) {
    if (!this.wechatConfig.mchid || !this.wechatConfig.apiV3Key) {
      this.logger.log('WeChat refund in mock mode');
      return;
    }

    try {
      const outRefundNo = `RF${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const requestBody = {
        out_trade_no: refund.payment.wechatOrderId,
        out_refund_no: outRefundNo,
        reason: refund.reason,
        notify_url: `${this.wechatConfig.notifyUrl}/refund`,
        amount: {
          refund: Math.round(refund.amount),
          total: Math.round(refund.payment.amount),
          currency: 'CNY',
        },
      };

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const bodyStr = JSON.stringify(requestBody);
      const signature = this.generateWechatSignature('POST', '/v3/refund/domestic/refunds', timestamp, nonceStr, bodyStr);
      const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.wechatConfig.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.wechatConfig.serialNo}"`;

      await assertPublicHttpUrl(`${WECHAT_PAY_API_BASE}/v3/refund/domestic/refunds`);
      const response = await axios.post(
        'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds',
        requestBody,
        {
          headers: {
            'Authorization': authorization,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: OUTBOUND_REQUEST_TIMEOUT_MS,
        }
      );

      // Update refund with WeChat refund ID
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          wechatRefundId: response.data.refund_id,
          status: 'PROCESSING',
        },
      });
    } catch (error) {
      this.logger.error('WeChat refund error:', error.response?.data || error.message);
      throw new BadRequestException('WeChat refund failed');
    }
  }

  /**
   * Legacy refund method (for backward compatibility)
   */
  async refundPayment(userId: string, dto: RefundDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Can only refund paid payments');
    }

    if (payment.order.patientId !== userId) {
      throw new BadRequestException('You can only refund your own payments');
    }

    // Process refund based on payment method
    if (payment.method === 'STRIPE' && payment.stripePaymentIntentId) {
      await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: dto.amount ? Math.round(dto.amount * 100) : undefined,
      });
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'REFUNDED',
        status: 'REFUNDED',
      },
    });

    return { success: true, refundedAmount: payment.amount / 100 };
  }

  // ========== NOTIFICATIONS ==========

  /**
   * Create payment notification
   */
  private async createPaymentNotification(userId: string, orderId: string, type: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { hospital: true, service: true },
      });

      if (!order) return;

      let title = '';
      let content = '';

      switch (type) {
        case 'payment_success':
          title = '支付成功';
          content = `您的订单 ${order.orderNo.slice(0, 8)}... 支付成功，金额 ¥${order.totalAmount.toFixed(2)}`;
          break;
        case 'payment_failed':
          title = '支付失败';
          content = `您的订单 ${order.orderNo.slice(0, 8)}... 支付失败，请重试`;
          break;
      }

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'PAYMENT',
          title,
          content,
          data: { orderId, orderNo: order.orderNo },
        },
      });
    } catch (error) {
      this.logger.error('Create notification error:', error);
    }
  }

  /**
   * Create refund notification
   */
  private async createRefundNotification(userId: string, orderId: string, type: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) return;

      let title = '';
      let content = '';

      switch (type) {
        case 'refund_requested':
          title = '退款申请已提交';
          content = `您的订单 ${order.orderNo.slice(0, 8)}... 退款申请已提交，等待审核`;
          break;
        case 'refund_approved':
          title = '退款申请已通过';
          content = `您的订单 ${order.orderNo.slice(0, 8)}... 退款申请已通过，款项将原路退回`;
          break;
        case 'refund_rejected':
          title = '退款申请被拒绝';
          content = `您的订单 ${order.orderNo.slice(0, 8)}... 退款申请被拒绝，请联系客服`;
          break;
      }

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'PAYMENT',
          title,
          content,
          data: { orderId, orderNo: order.orderNo },
        },
      });
    } catch (error) {
      this.logger.error('Create refund notification error:', error);
    }
  }

  // ========== QUERIES ==========

  async getPaymentByOrderId(orderId: string, userId: string, role?: string) {
    const payment = await this.assertPaymentAccess(orderId, userId, role);
    return this.prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        refunds: {
          where: {
            status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED'] },
          },
        },
      },
    });
  }

  async getRefundById(refundId: string, userId: string, role?: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          select: {
            orderId: true,
            method: true,
            amount: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (role !== 'ADMIN' && refund.userId !== userId) {
      throw new ForbiddenException('You can only access your own refund');
    }

    return refund;
  }
}
