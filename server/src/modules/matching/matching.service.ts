import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MatchingAlgorithm,
  EscortAvailability,
  EscortFeatureVector,
  MatchingRequest,
  MatchingResult,
} from './matching-algorithm';
import { MatchingRequestDto } from './dto/matching.dto';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 智能匹配：根据患者请求，返回按综合匹配度排序的陪诊师推荐列表
   */
  async matchEscorts(dto: MatchingRequestDto) {
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

    type AvailabilityRecord = {
      id: string;
      escortId: string;
      serviceType: string;
      pricePerHour: number;
      hospitalIds: string[];
      startDate: Date;
      endDate: Date;
      availableWeekdays: number[];
      timeSlots: unknown;
      maxDailyOrders: number;
      bookings: { startTime: string; endTime: string }[];
    };

    const escortUserIds = escortProfiles.map(profile => profile.userId);
    let availabilityRecords: AvailabilityRecord[] = [];
    if (escortUserIds.length > 0 && dto.appointmentDate) {
      const dateOnly = dto.appointmentDate.slice(0, 10);
      const dayStart = new Date(`${dateOnly}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const records = await this.prisma.escortService.findMany({
        where: { escortId: { in: escortUserIds }, isActive: true },
        select: {
          id: true,
          escortId: true,
          serviceType: true,
          pricePerHour: true,
          hospitalIds: true,
          startDate: true,
          endDate: true,
          availableWeekdays: true,
          timeSlots: true,
          maxDailyOrders: true,
          bookings: {
            where: {
              bookingDate: { gte: dayStart, lt: dayEnd },
              status: { in: ['booked', 'completed'] },
            },
            select: { startTime: true, endTime: true },
          },
        },
      });
      availabilityRecords = records.map(record => ({ ...record, serviceType: String(record.serviceType) }));
    } else if (escortUserIds.length > 0) {
      const records = await this.prisma.escortService.findMany({
        where: { escortId: { in: escortUserIds }, isActive: true },
        select: {
          id: true,
          escortId: true,
          serviceType: true,
          pricePerHour: true,
          hospitalIds: true,
          startDate: true,
          endDate: true,
          availableWeekdays: true,
          timeSlots: true,
          maxDailyOrders: true,
        },
      });
      availabilityRecords = records.map(record => ({
        ...record,
        serviceType: String(record.serviceType),
        bookings: [],
      }));
    }

    const parseTimeSlots = (value: unknown): { start: string; end: string }[] => {
      if (!Array.isArray(value)) return [];
      return value.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const slot = item as Record<string, unknown>;
        return typeof slot.start === 'string' && typeof slot.end === 'string'
          ? [{ start: slot.start, end: slot.end }]
          : [];
      });
    };

    const servicesByEscort = new Map<string, EscortAvailability[]>();
    for (const service of availabilityRecords) {
      const normalized: EscortAvailability = {
        serviceId: service.id,
        serviceType: service.serviceType,
        pricePerHour: service.pricePerHour,
        hospitalIds: service.hospitalIds,
        startDate: service.startDate.toISOString().slice(0, 10),
        endDate: service.endDate.toISOString().slice(0, 10),
        availableWeekdays: service.availableWeekdays,
        timeSlots: parseTimeSlots(service.timeSlots),
        bookedTimeSlots: service.bookings.map(booking => ({
          start: booking.startTime,
          end: booking.endTime,
        })),
        bookingsOnDate: service.bookings.length,
        maxDailyOrders: service.maxDailyOrders,
      };
      servicesByEscort.set(service.escortId, [
        ...(servicesByEscort.get(service.escortId) || []),
        normalized,
      ]);
    }
    const availabilityDataCovered = availabilityRecords.length > 0;

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
      availableServices: availabilityDataCovered
        ? (servicesByEscort.get(profile.userId) || [])
        : undefined,
    }));

    this.logger.log(`[MDWMA] Candidate pool: ${featureVectors.length} verified escorts`);

    // 3. 执行匹配算法
    const request: MatchingRequest = {
      department: dto.department,
      latitude: dto.latitude,
      longitude: dto.longitude,
      budget: dto.budget,
      serviceType: dto.serviceType,
      hospitalId: dto.hospitalId,
      appointmentDate: dto.appointmentDate,
      appointmentTime: dto.appointmentTime,
      durationHours: dto.durationHours,
    };

    const topK = dto.topK || 10;
    const decision = MatchingAlgorithm.rankEscortsFull(featureVectors, request, topK);
    const results = decision.results;
    const weights = decision.meta.robustWeighting.weights;

    this.logger.log(
      `[MDWMA] Top result: ${results[0]?.name || 'N/A'} ` +
      `(score: ${results[0]?.compositeScorePercent || 0}%, status=${decision.meta.status})`
    );

    // 4. 返回结果（附带算法元信息，用于论文可复现性）
    return {
      request: dto,
      results,
      totalCandidates: featureVectors.length,
      eligibleCandidates: decision.meta.hardConstraints.passed,
      algorithm: decision.meta.method,
      weights: {
        specialty: weights[0],
        proximity: weights[1],
        trust: weights[2],
        quality: weights[3],
        experience: weights[4],
        price: weights[5],
        load_balance: weights[6],
      },
      diagnostics: {
        status: decision.meta.status,
        warnings: decision.meta.warnings,
        hardConstraints: decision.meta.hardConstraints,
        weighting: decision.meta.robustWeighting,
        consensus: {
          methodNames: decision.meta.aggregation.methodNames,
          methodWeights: decision.meta.aggregation.methodWeights,
          consensusIndex: decision.meta.aggregation.consensusIndex,
        },
        uncertainty: {
          iterations: decision.meta.uncertainty.iterations,
          noiseLevel: decision.meta.uncertainty.noiseLevel,
          firstRankAcceptability: decision.meta.uncertainty.firstRankAcceptability,
          expectedRanks: decision.meta.uncertainty.expectedRanks,
          meanKendallTau: decision.meta.uncertainty.meanKendallTau,
          top1Confidence: decision.meta.uncertainty.referenceTop1Confidence,
        },
        pareto: {
          paretoFront: decision.meta.pareto.paretoFront,
          paretoLayers: decision.meta.pareto.paretoLayers,
          top1IsParetoOptimal: decision.meta.pareto.top1IsParetoOptimal,
        },
      },
    };
  }

  /**
   * 获取单个陪诊师对特定请求的匹配明细（用于可解释性展示）
   */
  async getMatchDetail(escortId: string, dto: MatchingRequestDto): Promise<MatchingResult | null> {
    // 详情必须复用同一候选集与现行 MDWMA 动态权重，否则详情分数会和列表排序不一致。
    const decision = await this.matchEscorts({
      ...dto,
      topK: Number.MAX_SAFE_INTEGER,
    });
    return decision.results.find(result => result.escortId === escortId) || null;
  }
}
