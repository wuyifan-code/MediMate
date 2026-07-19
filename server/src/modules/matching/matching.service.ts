import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchingAlgorithm, EscortFeatureVector, MatchingRequest, MatchingResult } from './matching-algorithm';
import { MatchingRequestDto } from './dto/matching.dto';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 智能匹配：根据患者请求，返回按综合匹配度排序的陪诊师推荐列表
   */
  async matchEscorts(dto: MatchingRequestDto): Promise<{
    request: MatchingRequestDto;
    results: MatchingResult[];
    totalCandidates: number;
    algorithm: string;
    weights: Record<string, number>;
  }> {
    this.logger.log(
      `[MDWMA] Matching request: department=${dto.department}, ` +
      `location=(${dto.latitude}, ${dto.longitude}), budget=${dto.budget}`
    );

    // 1. 获取所有已认证陪诊师及其关联数据
    const escortProfiles = await this.prisma.escortProfile.findMany({
      where: { isVerified: true },
      include: {
        user: {
          include: {
            profile: true,
            ordersAsEscort: {
              where: {
                status: { in: ['IN_PROGRESS', 'EVIDENCE_COLLECTING', 'MEMO_GENERATING', 'CONFIRMED', 'MATCHED'] },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    // 2. 构建特征向量
    const featureVectors: EscortFeatureVector[] = escortProfiles.map((profile) => ({
      id: profile.id,
      name: profile.user.profile?.name || '未知',
      specialties: profile.specialties || [],
      latitude: profile.latitude,
      longitude: profile.longitude,
      trustScore: profile.trustScore || 0,
      rating: profile.rating || 0,
      completedOrders: profile.completedOrders || 0,
      hourlyRate: profile.hourlyRate,
      activeOrderCount: profile.user.ordersAsEscort?.length || 0,
      imageUrl: profile.user.profile?.avatarUrl,
      bio: profile.bio,
      isVerified: profile.isVerified,
    }));

    this.logger.log(`[MDWMA] Candidate pool: ${featureVectors.length} verified escorts`);

    // 3. 执行匹配算法
    const request: MatchingRequest = {
      department: dto.department,
      latitude: dto.latitude,
      longitude: dto.longitude,
      budget: dto.budget,
      serviceType: dto.serviceType,
      appointmentDate: dto.appointmentDate,
    };

    const topK = dto.topK || 10;
    const results = MatchingAlgorithm.rankEscorts(featureVectors, request, topK);

    this.logger.log(
      `[MDWMA] Top result: ${results[0]?.name || 'N/A'} ` +
      `(score: ${results[0]?.compositeScorePercent || 0}%)`
    );

    // 4. 返回结果（附带算法元信息，用于论文可复现性）
    return {
      request: dto,
      results,
      totalCandidates: featureVectors.length,
      algorithm: 'MDWMA v1.0 (Multi-Dimensional Weighted Matching Algorithm)',
      weights: {
        specialty: 0.25,
        proximity: 0.20,
        trust: 0.20,
        quality: 0.15,
        experience: 0.10,
        price: 0.05,
        load_balance: 0.05,
      },
    };
  }

  /**
   * 获取单个陪诊师对特定请求的匹配明细（用于可解释性展示）
   */
  async getMatchDetail(escortId: string, dto: MatchingRequestDto): Promise<MatchingResult | null> {
    const profile = await this.prisma.escortProfile.findUnique({
      where: { id: escortId },
      include: {
        user: {
          include: {
            profile: true,
            ordersAsEscort: {
              where: {
                status: { in: ['IN_PROGRESS', 'EVIDENCE_COLLECTING', 'MEMO_GENERATING', 'CONFIRMED', 'MATCHED'] },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!profile) return null;

    const featureVector: EscortFeatureVector = {
      id: profile.id,
      name: profile.user.profile?.name || '未知',
      specialties: profile.specialties || [],
      latitude: profile.latitude,
      longitude: profile.longitude,
      trustScore: profile.trustScore || 0,
      rating: profile.rating || 0,
      completedOrders: profile.completedOrders || 0,
      hourlyRate: profile.hourlyRate,
      activeOrderCount: profile.user.ordersAsEscort?.length || 0,
      imageUrl: profile.user.profile?.avatarUrl,
      bio: profile.bio,
      isVerified: profile.isVerified,
    };

    return MatchingAlgorithm.computeCompositeScore(featureVector, {
      department: dto.department,
      latitude: dto.latitude,
      longitude: dto.longitude,
      budget: dto.budget,
      serviceType: dto.serviceType,
      appointmentDate: dto.appointmentDate,
    });
  }
}
