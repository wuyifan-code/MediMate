import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreateStripePaymentDto,
  ConfirmPaymentDto,
  WechatPaymentDto,
  RefundDto,
  CreateRefundDto,
  ApproveRefundDto,
  WechatNotifyDto,
} from './dto/payments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ========== STRIPE ==========

  @Post('stripe/create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe payment intent' })
  async createStripePaymentIntent(
    @Request() req: any,
    @Body() dto: CreateStripePaymentDto,
  ) {
    const paymentIntent = await this.paymentsService.createStripePaymentIntent(req.user.sub, dto);
    return {
      success: true,
      data: paymentIntent,
    };
  }

  @Post('stripe/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm Stripe payment' })
  async confirmStripePayment(@Request() req: any, @Body() dto: ConfirmPaymentDto) {
    const payment = await this.paymentsService.confirmStripePayment(req.user.sub, dto);
    return {
      success: true,
      data: payment,
    };
  }

  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    const body = req.rawBody || Buffer.from('');
    return this.paymentsService.handleStripeWebhook(body, signature);
  }

  // ========== WECHAT ==========

  @Post('wechat/create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create WeChat payment order' })
  async createWechatPayment(
    @Request() req: any,
    @Body() dto: WechatPaymentDto,
  ) {
    const payment = await this.paymentsService.createWechatPayment(req.user.sub, dto);
    return {
      success: true,
      data: payment,
    };
  }

  @Post('wechat/notify')
  @ApiOperation({ summary: 'Handle WeChat payment callback' })
  async handleWechatNotify(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('wechatpay-signature') signature?: string,
    @Headers('wechatpay-timestamp') timestamp?: string,
    @Headers('wechatpay-nonce') nonce?: string,
    @Headers('wechatpay-serial') serial?: string,
    @Body() data?: WechatNotifyDto,
  ) {
    return this.paymentsService.handleWechatNotify(data as WechatNotifyDto, {
      signature,
      timestamp,
      nonce,
      serial,
      rawBody: req.rawBody,
    });
  }

  @Get('wechat/query/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query WeChat payment status' })
  async queryWechatPayment(@Request() req: any, @Param('orderId') orderId: string) {
    const payment = await this.paymentsService.queryWechatPayment(req.user.sub, orderId);
    return {
      success: true,
      data: payment,
    };
  }

  // ========== REFUNDS ==========

  @Post('refunds')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create refund request' })
  async createRefund(@Request() req: any, @Body() dto: CreateRefundDto) {
    const refund = await this.paymentsService.createRefund(req.user.sub, dto);
    return {
      success: true,
      data: refund,
    };
  }

  @Get('refunds/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my refund requests' })
  async getMyRefunds(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const refunds = await this.paymentsService.getUserRefunds(req.user.sub, page, limit);
    return {
      success: true,
      data: refunds,
    };
  }

  @Get('refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all refund requests (Admin)' })
  async getAllRefunds(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    const refunds = await this.paymentsService.getAllRefunds(page, limit, status);
    return {
      success: true,
      data: refunds,
    };
  }

  @Post('refunds/:refundId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve refund (Admin)' })
  async approveRefund(
    @Request() req: any,
    @Param('refundId') refundId: string,
    @Body() dto: ApproveRefundDto,
  ) {
    const refund = await this.paymentsService.approveRefund(refundId, req.user.sub, dto);
    return {
      success: true,
      data: refund,
    };
  }

  @Post('refunds/:refundId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject refund (Admin)' })
  async rejectRefund(
    @Request() req: any,
    @Param('refundId') refundId: string,
    @Body() dto: ApproveRefundDto,
  ) {
    const refund = await this.paymentsService.rejectRefund(refundId, req.user.sub, dto);
    return {
      success: true,
      data: refund,
    };
  }

  @Get('refunds/:refundId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get refund details' })
  async getRefundById(@Request() req: any, @Param('refundId') refundId: string) {
    const refund = await this.paymentsService.getRefundById(refundId, req.user.sub, req.user.role);
    return {
      success: true,
      data: refund,
    };
  }

  // ========== LEGACY REFUND ==========

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request refund (Legacy)' })
  async refundPayment(@Request() req: any, @Body() dto: RefundDto) {
    const refund = await this.paymentsService.refundPayment(req.user.sub, dto);
    return {
      success: true,
      data: refund,
    };
  }

  // ========== QUERIES ==========

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by order ID' })
  async getPaymentByOrderId(@Request() req: any, @Param('orderId') orderId: string) {
    const payment = await this.paymentsService.getPaymentByOrderId(orderId, req.user.sub, req.user.role);
    return {
      success: true,
      data: payment,
    };
  }
}
