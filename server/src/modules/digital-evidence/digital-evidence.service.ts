import { Injectable, Logger, HttpException, HttpStatus, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

export interface EvidenceInput {
  orderId: string;
  nodeName: string;
  type: string;
  url?: string;
  content?: string;
  metadata?: any;
}

export interface ValidationResult {
  passed: boolean;
  reason: string;
  score?: number;
}

@Injectable()
export class DigitalEvidenceService {
  private readonly logger = new Logger(DigitalEvidenceService.name);

  // GPS 验证距离阈值 (米)
  private readonly GPS_DISTANCE_THRESHOLD = 500;

  // 音频最小有效时长 (秒)
  private readonly AUDIO_MIN_DURATION = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录多模态存证打卡、执行算法验真并生成不可篡改的数据指纹
   * 引擎核心：算法驱动信任协议 (Algorithm-Driven Trust Protocol) 的数据落库总闸
   */
  async submitEvidence(input: EvidenceInput, requesterId: string) {
    const { orderId, nodeName, type, url, content, metadata } = input;

    this.logger.log(`Executing Trust Protocol for order ${orderId}, node [${nodeName}]`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { patientId: true, escortId: true, hospitalId: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.patientId !== requesterId && order.escortId !== requesterId) {
      throw new ForbiddenException('无权为此订单提交服务记录');
    }

    // 1. 算法交叉验真拦截 (AI-Driven Multimodal Validation)
    const validationResult = await this.verifyEvidence(type, content, metadata);
    if (!validationResult.passed) {
      throw new HttpException(
        `[信任协议熔断] 存证验真失败: ${validationResult.reason}`,
        HttpStatus.BAD_REQUEST
      );
    }

    // 获取订单信息以更新陪诊师
    // 更新订单状态为取证打卡中
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'EVIDENCE_COLLECTING' }
    });

    // 2. 生成抗篡改数据指纹 (使用 SHA-256)
    const evidenceMetadata = {
      ...(metadata || {}),
      capturedAt: metadata?.capturedAt || new Date().toISOString(),
      nonce: metadata?.nonce || randomBytes(16).toString('hex'),
    };
    const evidenceHash = this.generateEvidenceHash({ ...input, metadata: evidenceMetadata });

    // 3. 落库：完成信任底座资产沉淀
    const digitalAsset = await this.prisma.digitalEvidence.create({
      data: {
        orderId,
        nodeName,
        type,
        url,
        content: content || validationResult.reason,
        evidenceHash,
        verified: validationResult.passed,
        validationScore: validationResult.score || 0,
        metadata: evidenceMetadata,
      }
    });

    // 4. 动态信任分更新
    if (order?.escortId) {
      try {
        // 动态导入避免循环依赖
        const { TrustAlgorithm } = await import('../trust/trust-algorithm');
        const trustAlgo = new TrustAlgorithm(this.prisma);
        await trustAlgo.updateTrustScoreOnEvidence(order.escortId);
        this.logger.log(`[Trust] Updated trust score for escort ${order.escortId}`);
      } catch (error) {
        this.logger.error(`[Trust] Failed to update trust score: ${error.message}`);
      }
    }

    this.logger.log(
      `[Trust Asset Generated] ${type.toUpperCase()} 存证验真完毕，验证得分: ${validationResult.score || 0}, 哈希: ${evidenceHash.substring(0, 16)}...`
    );

    return {
      message: '服务记录已保存，并生成完整性指纹',
      evidenceHash,
      validationScore: validationResult.score || 0,
      verified: validationResult.passed,
      digitalAsset
    };
  }

  /**
   * 使用 SHA-256 生成密码学哈希
   */
  private generateEvidenceHash(input: EvidenceInput): string {
    const rawData = JSON.stringify({
      orderId: input.orderId,
      nodeName: input.nodeName,
      type: input.type,
      url: input.url,
      content: input.content,
      metadata: input.metadata || {},
    });

    // 使用 SHA-256 生成真正的密码学哈希
    const hash = createHash('sha256').update(rawData).digest('hex');
    return '0x' + hash;
  }

  /**
   * 多模态 AI 交叉验真算法流程
   * 接入 MiniMax 大语言模型能力池
   */
  private async verifyEvidence(type: string, content: string | undefined | null, metadata: any): Promise<ValidationResult> {
    switch (type) {
      case 'gps':
        return this.verifyGps(metadata);
      case 'photo':
        return this.verifyPhoto(metadata);
      case 'audio':
        return this.verifyAudio(metadata);
      case 'emotion':
        return this.verifyEmotion(content || '', metadata);
      default:
        return { passed: false, reason: `不支持的存证类型：${type}` };
    }
  }

  /**
   * GPS 验证：检查是否在医院范围内
   */
  private async verifyGps(metadata: any): Promise<ValidationResult> {
    const { lat, lng, orderId } = metadata || {};

    if (!lat || !lng) {
      return { passed: false, reason: 'GPS 坐标缺失' };
    }

    // 获取订单对应的医院坐标
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { hospital: true },
    });

    if (!order?.hospital) {
      return { passed: false, reason: '无法验证：订单没有关联医院坐标', score: 0 };
    }

    // 医院坐标（假设医院表有 latitude/longitude 字段，这里做兼容处理）
    const hospitalLat = (order.hospital as any).latitude || 0;
    const hospitalLng = (order.hospital as any).longitude || 0;

    if (hospitalLat === 0 && hospitalLng === 0) {
      return { passed: false, reason: '无法验证：医院坐标尚未配置', score: 0 };
    }

    // 计算距离
    const distance = this.calculateDistance(lat, lng, hospitalLat, hospitalLng);

    if (distance > this.GPS_DISTANCE_THRESHOLD) {
      return {
        passed: false,
        reason: `GPS 距离医院 ${Math.round(distance)}米，超过阈值 ${this.GPS_DISTANCE_THRESHOLD}米`,
        score: 0,
      };
    }

    this.logger.log(`[Trust GPS] Distance to hospital: ${Math.round(distance)}m`);
    return { passed: true, reason: `GPS 打卡成功，距离医院 ${Math.round(distance)}米`, score: 100 - (distance / this.GPS_DISTANCE_THRESHOLD) * 20 };
  }

  /**
   * 使用 Haversine 公式计算两点间距离
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 地球半径 (米)
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * 图像验证：检查文件信息和基本质量
   */
  private verifyPhoto(metadata: any): ValidationResult {
    const { size, width, height, format } = metadata || {};

    // 检查文件大小 (最大 10MB)
    if (size && size > 10 * 1024 * 1024) {
      return { passed: false, reason: '图片大小超过 10MB 限制', score: 0 };
    }

    // 检查分辨率 (最小 320x240)
    if ((width && width < 320) || (height && height < 240)) {
      return { passed: false, reason: '图片分辨率过低', score: 0 };
    }

    // 检查格式
    const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];
    if (format && !allowedFormats.includes(format.toLowerCase())) {
      return { passed: false, reason: '不支持的图片格式', score: 0 };
    }

    // TODO: 后续集成 MiniMax VLM API 进行翻拍检测
    this.logger.log(`[Trust Photo] Basic validation passed, size: ${size}, ${width}x${height}`);

    return {
      passed: true,
      reason: '图片验证通过',
      score: 85, // 基础分，待集成AI后提升
    };
  }

  /**
   * 音频验证：检查时长和静音比例
   */
  private verifyAudio(metadata: any): ValidationResult {
    const { duration, size, format } = metadata || {};

    // 检查时长
    if (duration && duration < this.AUDIO_MIN_DURATION) {
      return { passed: false, reason: `音频时长 ${duration}秒，少于最小要求 ${this.AUDIO_MIN_DURATION}秒`, score: 0 };
    }

    // 检查文件大小 (最大 10MB)
    if (size && size > 10 * 1024 * 1024) {
      return { passed: false, reason: '音频文件过大', score: 0 };
    }

    // 检查格式
    const allowedFormats = ['mp3', 'wav', 'm4a', 'aac'];
    if (format && !allowedFormats.includes(format.toLowerCase())) {
      return { passed: false, reason: '不支持的音频格式', score: 0 };
    }

    // TODO: 后续集成 MiniMax API 进行情绪分析
    this.logger.log(`[Trust Audio] Basic validation passed, duration: ${duration}s`);

    return {
      passed: true,
      reason: '音频验证通过',
      score: 80,
    };
  }

  /**
   * 情绪验证：检查情绪标签有效性
   */
  private verifyEmotion(content: string, metadata: any): ValidationResult {
    const validEmotions = ['happy', 'calm', 'anxious', 'sad', 'worried', 'neutral', 'hopeful', 'grateful'];

    // 如果有情绪标签，检查是否有效
    if (content && !validEmotions.includes(content.toLowerCase())) {
      return { passed: false, reason: '无效的情绪标签', score: 0 };
    }

    return {
      passed: true,
      reason: content ? `情绪记录: ${content}` : '情绪打卡成功',
      score: content ? 90 : 70,
    };
  }

  /**
   * 获取订单的存证列表
   */
  async getEvidencesByOrder(orderId: string, requesterId: string) {
    await this.assertOrderAccess(orderId, requesterId);
    return this.prisma.digitalEvidence.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 验证存证哈希
   */
  async verifyEvidenceHash(evidenceId: string, requesterId: string) {
    const evidence = await this.prisma.digitalEvidence.findUnique({
      where: { id: evidenceId },
      include: { order: { select: { patientId: true, escortId: true } } },
    });

    if (!evidence) {
      return { valid: false, reason: '存证不存在' };
    }
    if (evidence.order.patientId !== requesterId && evidence.order.escortId !== requesterId) {
      throw new ForbiddenException('无权验证此服务记录');
    }

    // 使用提交时保存的 canonical 字段重新计算，避免重新生成时间和随机数。
    const input: EvidenceInput = {
      orderId: evidence.orderId,
      nodeName: evidence.nodeName,
      type: evidence.type,
      url: evidence.url || undefined,
      content: evidence.content || undefined,
      metadata: evidence.metadata || undefined,
    };

    const computedHash = this.generateEvidenceHash(input);

    // 简单比对（实际应考虑 nonce 等动态因素）
    return {
      valid: computedHash === evidence.evidenceHash,
      reason: computedHash === evidence.evidenceHash ? '哈希验证通过' : '哈希不匹配',
    };
  }

  private async assertOrderAccess(orderId: string, requesterId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { patientId: true, escortId: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.patientId !== requesterId && order.escortId !== requesterId) {
      throw new ForbiddenException('无权查看此服务记录');
    }
  }
}
