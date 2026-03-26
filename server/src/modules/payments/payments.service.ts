import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStripePaymentDto, ConfirmPaymentDto, WechatPaymentDto, RefundDto, CreateRefundDto, ApproveRefundDto } from './dto/payments.dto';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import axios from 'axios';

// WeChat Pay V3 SDK (simplified implementation)
interface WechatPayConfig {
  appid: string;
  mchid: string;
  privateKey: string;
  serialNo: string;
  apiV3Key: string;
  notifyUrl: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private wechatConfig: WechatPayConfig;
  private readonly logger = new Logger(PaymentsService.name);

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

        const response = await axios.post(
          'https://api.mch.weixin.qq.com/v3/pay/transactions/native',
          requestBody,
          {
            headers: {
              'Authorization': authorization,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
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

        const response = await axios.get(
          `https://api.mch.weixin.qq.com${url}`,
          {
            headers: {
              'Authorization': authorization,
              'Accept': 'application/json',
            },
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
   * Handle WeChat Pay callback notification
   */
  async handleWechatNotify(notifyData: any) {
    try {
      // Decrypt notification data (simplified)
      let decryptedData = notifyData;
      
      // If encrypted, decrypt using API v3 key
      if (notifyData.resource) {
        const { ciphertext, associated_data, nonce } = notifyData.resource;
        
        // Use createDecipheriv for AES-GCM decryption
        const key = Buffer.from(this.wechatConfig.apiV3Key);
        const authTag = Buffer.from(ciphertext.slice(-32), 'hex');
        const encryptedData = Buffer.from(ciphertext.slice(0, -32), 'hex');
        const aad = Buffer.from(associated_data);
        const iv = Buffer.from(nonce);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        decipher.setAAD(aad);
        
        let decrypted = decipher.update(encryptedData, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        decryptedData = JSON.parse(decrypted);
      }

      const { out_trade_no, transaction_id, trade_state, attach } = decryptedData;
      const attachData = JSON.parse(attach || '{}');
      const orderId = attachData.orderId;

      if (!orderId) {
        throw new BadRequestException('Invalid notification data');
      }

      const payment = await this.prisma.payment.findUnique({
        where: { wechatOrderId: out_trade_no },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (trade_state === 'SUCCESS') {
        await this.finalizePaymentSuccess({
          paymentId: payment.id,
          orderId,
          userId: payment.userId,
          note: `Payment confirmed via WeChat Pay. Transaction ID: ${transaction_id}`,
        });
      }

      return { 
        code: 'SUCCESS', 
        message: 'OK',
      };
    } catch (error) {
      this.logger.error('WeChat notify error:', error);
      return {
        code: 'FAIL',
        message: error.message,
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

      const response = await axios.post(
        'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds',
        requestBody,
        {
          headers: {
            'Authorization': authorization,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
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
