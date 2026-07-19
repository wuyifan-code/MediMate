import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, CancelOrderDto, RefundOrderDto, OrderQueryDto, SmartMatchDto } from './dto/orders.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('smart-match')
  @ApiOperation({
    summary: '智能匹配推荐陪诊师',
    description:
      '基于 MDWMA 多维加权匹配算法，根据医院科室、患者位置、预算等条件，' +
      '返回按综合匹配度排序的陪诊师推荐列表。用于下单前的推荐环节。',
  })
  async smartMatch(@Body() dto: SmartMatchDto) {
    const result = await this.ordersService.smartMatch(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post()
  @ApiOperation({
    summary: '创建新订单',
    description: '创建订单。如不指定 escortId，系统将自动运行 MDWMA 算法匹配最优陪诊师。',
  })
  async create(@Request() req: any, @Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(req.user.sub, dto);
    return {
      success: true,
      data: order,
      message: order.matching?.autoMatched
        ? `订单创建成功，已智能匹配陪诊师（匹配度 ${order.matching.compositeScorePercent}%）`
        : '订单创建成功',
    };
  }

  @Get()
  @ApiOperation({ summary: '获取我的订单列表' })
  async findMyOrders(@Request() req: any, @Query() query: OrderQueryDto) {
    const userRole = req.user.role;
    const result = userRole === 'ESCORT'
      ? await this.ordersService.findByEscort(req.user.sub, query)
      : await this.ordersService.findByPatient(req.user.sub, query);
    
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  async findById(@Request() req: any, @Param('id') id: string) {
    const order = await this.ordersService.findById(id, req.user.sub, req.user.role);
    return {
      success: true,
      data: order,
    };
  }

  @Post(':id/accept')
  @ApiOperation({ summary: '接单（陪诊师）' })
  async acceptOrder(@Request() req: any, @Param('id') id: string) {
    const order = await this.ordersService.acceptOrder(id, req.user.sub);
    return {
      success: true,
      data: order,
      message: '接单成功',
    };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  async cancelOrder(
    @Request() req: any, 
    @Param('id') id: string,
    @Body() dto?: CancelOrderDto,
  ) {
    const order = await this.ordersService.cancelOrder(id, req.user.sub, dto);
    return {
      success: true,
      data: order,
      message: '订单已取消',
    };
  }

  @Post(':id/refund')
  @ApiOperation({ summary: '申请退款' })
  async requestRefund(
    @Request() req: any, 
    @Param('id') id: string,
    @Body() dto: RefundOrderDto,
  ) {
    const order = await this.ordersService.requestRefund(id, req.user.sub, dto);
    return {
      success: true,
      data: order,
      message: '退款申请已提交',
    };
  }

  @Post(':id/start')
  @ApiOperation({ summary: '开始服务（陪诊师）' })
  async startService(@Request() req: any, @Param('id') id: string) {
    const order = await this.ordersService.startService(id, req.user.sub);
    return {
      success: true,
      data: order,
      message: '服务已开始',
    };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成服务（陪诊师）' })
  async completeService(@Request() req: any, @Param('id') id: string) {
    const order = await this.ordersService.completeService(id, req.user.sub);
    return {
      success: true,
      data: order,
      message: '服务已完成',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新订单状态' })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    const order = await this.ordersService.updateStatus(
      id, 
      req.user.sub, 
      dto.status as OrderStatus,
      dto.notes,
    );
    return {
      success: true,
      data: order,
      message: '订单状态已更新',
    };
  }
}
