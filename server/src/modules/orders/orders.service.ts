import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { CreateOrderDto, UpdateOrderDto, CancelOrderDto, RefundOrderDto, SmartMatchDto } from './dto/orders.dto';
import { OrderStatus, Prisma, ServiceType } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
  ) {}

  // 生成订单号
  private generateOrderNo(): string {
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MM${dateStr}${randomStr}`;
  }

  // ===== 服务端定价常量：客户端传入的 price/platformFee 一律不信任 =====
  private static readonly PLATFORM_FEE = 10;

  // 服务端兜底价目表（元/小时），仅在既无 serviceId、陪诊师也无对应服务记录时使用
  private static readonly SERVICE_TYPE_BASE_PRICES: Record<ServiceType, number> = {
    [ServiceType.FULL_PROCESS]: 100,
    [ServiceType.APPOINTMENT]: 50,
    [ServiceType.REPORT_PICKUP]: 30,
    [ServiceType.VIP_TRANSPORT]: 80,
  };

  // 服务端优惠券表：折扣 + 有效期（过期直接拒绝，不再无限期有效）
  private static readonly COUPONS: Record<string, { discount: number; validUntil: string }> = {
    MEDIMATE10: { discount: 10, validUntil: '2026-12-31' },
    WELCOME20: { discount: 20, validUntil: '2026-12-31' },
    NEWUSER50: { discount: 50, validUntil: '2026-12-31' },
  };

  // 服务端优惠券校验：只认服务端表并校验有效期；折扣封顶为服务小计，保证订单总额 ≥ 平台费
  private resolveCouponDiscount(couponCode: string | undefined, serviceTotal: number): number {
    if (!couponCode) return 0;

    const normalized = couponCode.toUpperCase();
    const coupon = OrdersService.COUPONS[normalized];
    if (!coupon) return 0;

    if (new Date(coupon.validUntil).getTime() < Date.now()) {
      throw new BadRequestException(`优惠券 ${normalized} 已过期`);
    }

    return Math.min(coupon.discount, serviceTotal);
  }

  // 创建订单（支持智能匹配自动分配陪诊师）
  async create(patientId: string, dto: CreateOrderDto) {
    const duration = dto.duration || 1;

    // ===== 服务端定价（第一阶段）：指定 serviceId 时以 Service.basePrice 为准 =====
    let unitPrice: number | null = null;
    if (dto.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
      });
      if (!service || !service.isActive) {
        throw new BadRequestException('所选服务不存在或已下架');
      }
      if (service.type !== dto.serviceType) {
        throw new BadRequestException('服务类型与所选服务不一致');
      }
      unitPrice = service.basePrice;
    }

    // ===== 智能匹配：如果未指定陪诊师，自动匹配最优 =====
    let escortId = dto.escortId;
    let matchingMeta: any = null;

    if (!escortId) {
      this.logger.log(`[SmartMatch] No escortId provided, running MDWMA auto-match...`);

      // 推导科室：优先用 dto.department，否则从医院信息获取
      let department = dto.department;
      if (!department && dto.hospitalId) {
        const hospital = await this.prisma.hospital.findUnique({
          where: { id: dto.hospitalId },
          select: { department: true },
        });
        department = hospital?.department || '综合';
      }
      if (!department) {
        department = '综合';
      }

      const matchResult = await this.matchingService.matchEscorts({
        department,
        hospitalId: dto.hospitalId,
        // 预算提示仅用服务端已知的单价（serviceId 定价结果或服务端兜底价目表），
        // 不再信任客户端传入的 price
        budget: unitPrice ?? OrdersService.SERVICE_TYPE_BASE_PRICES[dto.serviceType],
        serviceType: dto.serviceType,
        appointmentDate: dto.appointmentDate,
        appointmentTime: dto.appointmentTime,
        durationHours: dto.duration,
        topK: 1,
      });

      if (matchResult.results.length === 0) {
        throw new BadRequestException('暂无可用的陪诊师，请稍后重试或手动选择');
      }

      const topMatch = matchResult.results[0];
      // 将陪诊师的 userId 映射为 escortId（订单表存的是 User.id）
      const escortProfile = await this.prisma.escortProfile.findUnique({
        where: { id: topMatch.escortId },
        select: { userId: true },
      });

      if (!escortProfile) {
        throw new BadRequestException('匹配到的陪诊师资料异常，请重试');
      }

      escortId = escortProfile.userId;
      matchingMeta = {
        autoMatched: true,
        algorithm: matchResult.algorithm,
        compositeScore: topMatch.compositeScore,
        compositeScorePercent: topMatch.compositeScorePercent,
        matchLevel: topMatch.matchLevel,
        summary: topMatch.summary,
        dimensions: topMatch.dimensions.map(d => ({
          label: d.label,
          score: d.score,
          weight: d.weight,
          explanation: d.explanation,
        })),
      };

      this.logger.log(
        `[SmartMatch] Auto-matched escort ${topMatch.name} ` +
        `(score: ${topMatch.compositeScorePercent}%, level: ${topMatch.matchLevel})`
      );
    }

    // ===== 服务端定价（第二阶段）：未指定 serviceId 时按陪诊师已发布服务计价，兜底服务端价目表 =====
    if (unitPrice === null) {
      const escortService = escortId
        ? await this.prisma.escortService.findFirst({
            where: { escortId, serviceType: dto.serviceType, isActive: true },
            orderBy: { createdAt: 'desc' },
          })
        : null;
      unitPrice = escortService
        ? escortService.pricePerHour
        : OrdersService.SERVICE_TYPE_BASE_PRICES[dto.serviceType];
    }

    // ===== 金额计算（全部服务端：忽略客户端传入的 price / platformFee） =====
    const serviceTotal = unitPrice * duration;
    const platformFee = OrdersService.PLATFORM_FEE;
    const couponDiscount = this.resolveCouponDiscount(dto.couponCode, serviceTotal);
    const totalAmount = serviceTotal + platformFee - couponDiscount;

    // 生成订单号
    const orderNo = this.generateOrderNo();

    // 使用事务确保数据一致性
    const result = await this.prisma.$transaction(async (tx) => {
      // 创建订单
      const order = await tx.order.create({
        data: {
          orderNo,
          patientId,
          escortId,
          hospitalId: dto.hospitalId,
          serviceId: dto.serviceId,
          serviceType: dto.serviceType,
          status: OrderStatus.PENDING,
          price: unitPrice,
          duration,
          couponCode: dto.couponCode,
          couponDiscount,
          platformFee,
          totalAmount,
          paymentStatus: 'PENDING' as any,
          appointmentDate: dto.appointmentDate ? new Date(dto.appointmentDate) : null,
          appointmentTime: dto.appointmentTime,
          notes: dto.notes,
        },
        include: {
          hospital: true,
          service: true,
          patient: {
            include: { profile: true },
          },
          escort: {
            include: { profile: true, escortProfile: true },
          },
        },
      });

      // 创建订单状态历史
      const historyNote = matchingMeta?.autoMatched
        ? `订单创建成功（智能匹配：${matchingMeta.summary}）`
        : '订单创建成功';

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.PENDING,
          createdBy: patientId,
          note: historyNote,
        },
      });

      // 创建通知给陪诊师
      if (escortId) {
        await tx.notification.create({
          data: {
            userId: escortId,
            type: 'ORDER_STATUS',
            title: '新订单提醒',
            content: matchingMeta?.autoMatched
              ? `您有一个新的智能匹配订单（匹配度 ${matchingMeta.compositeScorePercent}%），请尽快处理`
              : '您有一个新的预约订单，请尽快处理',
            data: { orderId: order.id, orderNo: order.orderNo },
          },
        });
      }

      return order;
    });

    // 返回订单 + 匹配元数据
    return {
      ...result,
      matching: matchingMeta,
    };
  }

  /**
   * 智能匹配推荐：根据医院/科室/位置/预算，返回 MDWMA 排序的陪诊师列表
   * 用于前端下单前的"推荐陪诊师"环节
   */
  async smartMatch(dto: SmartMatchDto) {
    // 推导科室
    let department = dto.department;
    if (!department && dto.hospitalId) {
      const hospital = await this.prisma.hospital.findUnique({
        where: { id: dto.hospitalId },
        select: { department: true, name: true },
      });
      department = hospital?.department || '综合';
    }
    if (!department) {
      department = '综合';
    }

    return this.matchingService.matchEscorts({
      department,
      hospitalId: dto.hospitalId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      budget: dto.budget,
      serviceType: dto.serviceType,
      appointmentDate: dto.appointmentDate,
      appointmentTime: dto.appointmentTime,
      durationHours: dto.duration,
      topK: dto.topK || 5,
    });
  }

  // 创建订单状态历史
  private async createStatusHistory(
    orderId: string, 
    status: OrderStatus, 
    createdBy?: string, 
    note?: string
  ) {
    return this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        createdBy,
        note,
      },
    });
  }

  // 创建通知
  private async createNotification(
    userId: string,
    type: string,
    title: string,
    content: string,
    data?: any
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        data: data || {},
      },
    });
  }

  // 获取患者订单列表
  async findByPatient(patientId: string, query?: { status?: string; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { patientId };
    if (query?.status) {
      where.status = query.status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          hospital: true,
          service: true,
          escort: {
            include: { profile: true, escortProfile: true },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取陪诊师订单列表
  async findByEscort(escortId: string, query?: { status?: string; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      OR: [
        { escortId },
        { status: OrderStatus.PENDING }, // 可接单的订单
      ],
    };
    
    if (query?.status) {
      where.status = query.status as OrderStatus;
      delete where.OR; // 如果指定了状态，不使用 OR 查询
      where.escortId = escortId;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          hospital: true,
          service: true,
          patient: {
            include: { profile: true },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取订单详情
  async findById(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        hospital: true,
        service: true,
        patient: {
          include: { profile: true },
        },
        escort: {
          include: { profile: true, escortProfile: true },
        },
        payment: true,
        reviews: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 检查访问权限
    if (role === 'PATIENT' && order.patientId !== userId) {
      throw new ForbiddenException('无权访问此订单');
    }
    if (role === 'ESCORT' && order.escortId && order.escortId !== userId) {
      throw new ForbiddenException('无权访问此订单');
    }

    return order;
  }

  // 接单
  async acceptOrder(orderId: string, escortId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('订单状态不允许接单');
    }

    if (order.escortId && order.escortId !== escortId) {
      throw new ForbiddenException('订单已被其他陪诊师接单');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        escortId,
        status: OrderStatus.CONFIRMED,
      },
      include: {
        hospital: true,
        service: true,
        patient: {
          include: { profile: true },
        },
        escort: {
          include: { profile: true },
        },
      },
    });

    // 记录状态历史
    await this.createStatusHistory(orderId, OrderStatus.CONFIRMED, escortId, '陪诊师已接单');

    // 通知患者
    await this.createNotification(
      order.patientId,
      'ORDER_STATUS',
      '订单已确认',
      '陪诊师已接受您的订单',
      { orderId: order.id, orderNo: order.orderNo }
    );

    return updatedOrder;
  }

  // 更新订单状态
  async updateStatus(orderId: string, userId: string, status: OrderStatus, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 检查权限
    const isPatient = order.patientId === userId;
    const isEscort = order.escortId === userId;

    if (!isPatient && !isEscort) {
      throw new ForbiddenException('无权操作此订单');
    }

    // 状态流转验证
    const validTransitions = this.getValidTransitions(order.status, isPatient, isEscort);
    if (!validTransitions.includes(status)) {
      throw new BadRequestException(`无法从 ${order.status} 状态变更为 ${status} 状态`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        hospital: true,
        service: true,
        patient: {
          include: { profile: true },
        },
        escort: {
          include: { profile: true },
        },
      },
    });

    // 记录状态历史
    await this.createStatusHistory(orderId, status, userId, note);

    // 发送通知
    const notifyUserId = isPatient ? order.escortId : order.patientId;
    if (notifyUserId) {
      await this.createNotification(
        notifyUserId,
        'ORDER_STATUS',
        '订单状态更新',
        `订单状态已更新为: ${this.getStatusLabel(status)}`,
        { orderId: order.id, orderNo: order.orderNo, status }
      );
    }

    return updatedOrder;
  }

  // 取消订单
  async cancelOrder(orderId: string, userId: string, dto?: CancelOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 只有患者可以取消自己的订单
    if (order.patientId !== userId) {
      throw new ForbiddenException('无权取消此订单');
    }

    // 只能取消待支付或已支付的订单
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('当前订单状态不允许取消');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: {
        hospital: true,
        service: true,
        patient: {
          include: { profile: true },
        },
        escort: {
          include: { profile: true },
        },
      },
    });

    // 记录状态历史
    await this.createStatusHistory(orderId, OrderStatus.CANCELLED, userId, dto?.reason || '用户取消订单');

    // 通知陪诊师（如果已分配）
    if (order.escortId) {
      await this.createNotification(
        order.escortId,
        'ORDER_STATUS',
        '订单已取消',
        '患者已取消订单',
        { orderId: order.id, orderNo: order.orderNo }
      );
    }

    return updatedOrder;
  }

  // 申请退款
  async requestRefund(orderId: string, userId: string, dto: RefundOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.patientId !== userId) {
      throw new ForbiddenException('无权申请退款');
    }

    // 只能对已支付或已确认的订单申请退款
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('当前订单状态不允许退款');
    }

    // 更新订单状态为退款中
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.REFUNDING },
      include: {
        hospital: true,
        service: true,
        patient: {
          include: { profile: true },
        },
        escort: {
          include: { profile: true },
        },
        payment: true,
      },
    });

    // 记录状态历史
    await this.createStatusHistory(orderId, OrderStatus.REFUNDING, userId, `申请退款: ${dto.reason || '用户申请退款'}`);

    // 更新支付记录状态
    if (order.payment) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: 'REFUNDED' as any },
      });
    }

    return updatedOrder;
  }

  // 开始服务
  async startService(orderId: string, escortId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.escortId !== escortId) {
      throw new ForbiddenException('无权操作此订单');
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('订单状态不允许开始服务');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.IN_PROGRESS },
      include: {
        hospital: true,
        service: true,
        patient: {
          include: { profile: true },
        },
        escort: {
          include: { profile: true },
        },
      },
    });

    // 记录状态历史
    await this.createStatusHistory(orderId, OrderStatus.IN_PROGRESS, escortId, '陪诊师开始服务');

    // 通知患者
    await this.createNotification(
      order.patientId,
      'ORDER_STATUS',
      '服务已开始',
      '陪诊师已开始为您服务',
      { orderId: order.id, orderNo: order.orderNo }
    );

    return updatedOrder;
  }

  // 完成服务
  async completeService(orderId: string, escortId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.escortId !== escortId) {
      throw new ForbiddenException('无权操作此订单');
    }

    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new BadRequestException('订单状态不允许完成服务');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED },
      include: {
        hospital: true,
        service: true,
        patient: {
          include: { profile: true },
        },
        escort: {
          include: { profile: true },
        },
      },
    });

    // 记录状态历史
    await this.createStatusHistory(orderId, OrderStatus.COMPLETED, escortId, '服务已完成');

    // 通知患者
    await this.createNotification(
      order.patientId,
      'ORDER_STATUS',
      '服务已完成',
      '陪诊服务已完成，请对服务进行评价',
      { orderId: order.id, orderNo: order.orderNo }
    );

    return updatedOrder;
  }

  // 获取有效的状态流转
  private getValidTransitions(currentStatus: OrderStatus, isPatient: boolean, isEscort: boolean): OrderStatus[] {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: isPatient ? [OrderStatus.CANCELLED] : [],
      [OrderStatus.PAID]: isPatient ? [OrderStatus.CANCELLED, OrderStatus.REFUNDING] : [OrderStatus.CONFIRMED],
      [OrderStatus.CONFIRMED]: isPatient ? [OrderStatus.REFUNDING] : [OrderStatus.MATCHED],
      [OrderStatus.MATCHED]: isEscort ? [OrderStatus.IN_PROGRESS] : [],
      [OrderStatus.IN_PROGRESS]: isEscort ? [OrderStatus.EVIDENCE_COLLECTING] : [],
      [OrderStatus.EVIDENCE_COLLECTING]: isEscort ? [OrderStatus.MEMO_GENERATING] : [],
      [OrderStatus.MEMO_GENERATING]: isEscort ? [OrderStatus.COMPLETED] : [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDING]: [],
      [OrderStatus.REFUNDED]: [],
    };
    return transitions[currentStatus] || [];
  }

  // 获取状态标签
  private getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: '待支付',
      [OrderStatus.PAID]: '已支付',
      [OrderStatus.CONFIRMED]: '已确认',
      [OrderStatus.MATCHED]: '已匹配',
      [OrderStatus.IN_PROGRESS]: '服务中',
      [OrderStatus.EVIDENCE_COLLECTING]: '取证打卡中',
      [OrderStatus.MEMO_GENERATING]: '报告生成中',
      [OrderStatus.COMPLETED]: '已完成',
      [OrderStatus.CANCELLED]: '已取消',
      [OrderStatus.REFUNDING]: '退款中',
      [OrderStatus.REFUNDED]: '已退款',
    };
    return labels[status] || status;
  }
}
