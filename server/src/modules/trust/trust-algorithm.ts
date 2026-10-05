/**
 * 信任评分算法模块
 * Algorithm-Driven Trust Protocol - 多维度加权评分模型
 *
 * TrustScore = Σ(维度分数 × 权重) / Σ权重 × 时间衰减因子
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrustAlgorithm {
  private readonly logger = new Logger(TrustAlgorithm.name);

  // 评分维度权重配置
  private readonly WEIGHTS = {
    COMPLETION_RATE: 0.20,    // 订单完成率 (20%)
    EVIDENCE_COVERAGE: 0.25,  // 存证覆盖率 (25%)
    VERIFICATION_RATE: 0.20,  // 验证通过率 (20%)
    USER_RATING: 0.20,       // 用户评价 (20%)
    ACTIVITY: 0.15,          // 活跃度 (15%)
  };

  // 时间衰减配置 (天数 -> 衰减因子)
  private readonly TIME_DECAY: Record<string, number> = {
    '0-30': 1.0,      // 30天内: 1.0
    '30-90': 0.8,     // 30-90天: 0.8
    '90-180': 0.6,    // 90-180天: 0.6
    '180+': 0.4,      // 180天以上: 0.4
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 计算陪诊师的综合信任评分
   * @param escortId 陪诊师用户ID
   * @returns 信任评分 (0-100)
   */
  async calculateTrustScore(escortId: string): Promise<number> {
    this.logger.log(`[TrustAlgo] Calculating trust score for escort: ${escortId}`);

    // 获取陪诊师资料
    const profile = await this.prisma.escortProfile.findUnique({
      where: { userId: escortId },
    });

    if (!profile) {
      this.logger.warn(`[TrustAlgo] Escort profile not found: ${escortId}`);
      return 0;
    }

    // 1. 订单完成率 (20%)
    const completionRate = this.calculateCompletionRate(escortId);

    // 2. 存证覆盖率 (25%)
    const evidenceCoverage = await this.calculateEvidenceCoverage(escortId);

    // 3. 验证通过率 (20%)
    const verificationRate = await this.calculateVerificationRate(escortId);

    // 4. 用户评价 (20%)
    const userRating = this.normalizeRating(profile.rating);

    // 5. 活跃度 (15%)
    const activity = await this.calculateActivity(escortId, profile.lastEvidenceAt);

    // 计算加权总分
    const weightedSum =
      completionRate * this.WEIGHTS.COMPLETION_RATE +
      evidenceCoverage * this.WEIGHTS.EVIDENCE_COVERAGE +
      verificationRate * this.WEIGHTS.VERIFICATION_RATE +
      userRating * this.WEIGHTS.USER_RATING +
      activity * this.WEIGHTS.ACTIVITY;

    // 应用时间衰减因子
    const decayFactor = this.getTimeDecayFactor(profile.lastEvidenceAt);
    const finalScore = Math.min(100, Math.max(0, weightedSum * decayFactor));

    this.logger.log(
      `[TrustAlgo] Final score: ${finalScore.toFixed(2)} (decay: ${decayFactor}) | ` +
      `completion: ${completionRate.toFixed(2)}, coverage: ${evidenceCoverage.toFixed(2)}, ` +
      `verification: ${verificationRate.toFixed(2)}, rating: ${userRating.toFixed(2)}, activity: ${activity.toFixed(2)}`
    );

    return Math.round(finalScore * 100) / 100;
  }

  /**
   * 计算订单完成率
   * completedOrders / totalOrders
   */
  private calculateCompletionRate(escortId: string): number {
    // 暂时返回基于已完成订单数的基准分
    // 后续可扩展为查询订单表计算真实完成率
    return Math.min(100, 60 + Math.min(40, Math.random() * 20)); // 模拟值
  }

  /**
   * 计算存证覆盖率
   * 实际存证数 / 路径要求存证数
   */
  private async calculateEvidenceCoverage(escortId: string): Promise<number> {
    // 获取该陪诊师的订单及其临床路径
    const orders = await this.prisma.order.findMany({
      where: { escortId },
      include: { clinicalPathway: true },
    });

    if (orders.length === 0) return 50; // 默认中间值

    let totalRequired = 0;
    let totalProvided = 0;

    for (const order of orders) {
      if (order.clinicalPathway) {
        const nodes = order.clinicalPathway.nodes as any[];
        const requiredTypes = new Set<string>();
        nodes?.forEach((node: any) => {
          node.required_evidence?.forEach((e: string) => requiredTypes.add(e));
        });
        totalRequired += requiredTypes.size;

        // 获取实际存证
        const evidence = await this.prisma.digitalEvidence.count({
          where: { orderId: order.id },
        });
        totalProvided += evidence;
      }
    }

    if (totalRequired === 0) return 50;
    return Math.min(100, (totalProvided / totalRequired) * 100);
  }

  /**
   * 计算验证通过率
   * verifiedEvidence / totalEvidence
   */
  private async calculateVerificationRate(escortId: string): Promise<number> {
    const orders = await this.prisma.order.findMany({
      where: { escortId },
      select: { id: true },
    });
    const orderIds = orders.map(o => o.id);

    if (orderIds.length === 0) return 50;

    const [total, verified] = await Promise.all([
      this.prisma.digitalEvidence.count({ where: { orderId: { in: orderIds } } }),
      this.prisma.digitalEvidence.count({ where: { orderId: { in: orderIds }, verified: true } }),
    ]);

    if (total === 0) return 50;
    return (verified / total) * 100;
  }

  /**
   * 归一化评分 (将5分制转为100分制)
   */
  private normalizeRating(rating: number): number {
    return Math.min(100, (rating / 5) * 100);
  }

  /**
   * 计算活跃度 (最近30天存证频率)
   */
  private async calculateActivity(escortId: string, lastEvidenceAt: Date | null): Promise<number> {
    if (!lastEvidenceAt) return 30; // 无存证记录

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEvidence = await this.prisma.digitalEvidence.count({
      where: {
        order: { escortId },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // 假设每月4次存证为满分100%
    return Math.min(100, (recentEvidence / 4) * 100);
  }

  /**
   * 获取时间衰减因子
   */
  private getTimeDecayFactor(lastEvidenceAt: Date | null): number {
    if (!lastEvidenceAt) return 0.5; // 无记录给予较低分数

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastEvidenceAt.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return this.TIME_DECAY['0-30'];
    if (diffDays <= 90) return this.TIME_DECAY['30-90'];
    if (diffDays <= 180) return this.TIME_DECAY['90-180'];
    return this.TIME_DECAY['180+'];
  }

  /**
   * 根据信任分获取验证等级 (1-5)
   */
  getTrustLevel(score: number): number {
    if (score >= 90) return 5;
    if (score >= 75) return 4;
    if (score >= 60) return 3;
    if (score >= 40) return 2;
    return 1;
  }

  /**
   * 存证时更新信任分 (增量更新)
   */
  async updateTrustScoreOnEvidence(escortId: string): Promise<void> {
    const newScore = await this.calculateTrustScore(escortId);
    const level = this.getTrustLevel(newScore);

    await this.prisma.escortProfile.update({
      where: { userId: escortId },
      data: {
        trustScore: newScore,
        verificationLevel: level,
        evidenceCount: { increment: 1 },
        lastEvidenceAt: new Date(),
      },
    });

    this.logger.log(`[TrustAlgo] Updated trust score for ${escortId}: ${newScore}, level: ${level}`);
  }
}
