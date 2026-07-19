import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @ApiPropertyOptional({ description: '陪诊师ID（不填则自动智能匹配最优陪诊师）' })
  @IsOptional()
  @IsString()
  escortId?: string;

  @ApiPropertyOptional({ description: '目标科室（用于智能匹配，如不填则从医院信息推导）' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: '医院ID' })
  @IsOptional()
  @IsString()
  hospitalId?: string;

  @ApiPropertyOptional({ description: '服务ID' })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ enum: ServiceType, description: '服务类型' })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiProperty({ description: '服务价格' })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ description: '服务时长（小时）', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  duration?: number;

  @ApiPropertyOptional({ description: '预约日期' })
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @ApiPropertyOptional({ description: '预约时间' })
  @IsOptional()
  @IsString()
  appointmentTime?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '优惠券码' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: '平台费', default: 10 })
  @IsOptional()
  @IsNumber()
  platformFee?: number;
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus, description: '订单状态' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ description: '订单状态' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ description: '取消原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RefundOrderDto {
  @ApiProperty({ description: '退款金额' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: '退款原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SmartMatchDto {
  @ApiPropertyOptional({ description: '医院ID（用于推导科室）' })
  @IsOptional()
  @IsString()
  hospitalId?: string;

  @ApiPropertyOptional({ description: '目标科室（优先于医院推导）', example: '心内科' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: '患者/医院纬度', example: 26.647 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '患者/医院经度', example: 106.630 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '预算 (元/小时)', example: 80 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ description: '服务类型', enum: ServiceType })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({ description: '返回结果数量', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
