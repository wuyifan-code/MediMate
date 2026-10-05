import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsIn,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStripePaymentDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ default: 'cny' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty()
  @IsString()
  paymentIntentId: string;
}

export class WechatPaymentDto {
  @ApiProperty()
  @IsString()
  orderId: string;
}

export class RefundDto {
  @ApiProperty()
  @IsString()
  paymentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class CreateRefundDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class ApproveRefundDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectRefundDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

export class WechatNotifyResourceDto {
  @ApiProperty()
  @IsString()
  original_type: string;

  @ApiProperty()
  @IsIn(['AEAD_AES_256_GCM'])
  algorithm: string;

  @ApiProperty()
  @IsString()
  ciphertext: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  associated_data?: string;

  @ApiProperty()
  @IsString()
  nonce: string;
}

export class WechatNotifyDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  create_time: string;

  @ApiProperty()
  @IsString()
  resource_type: string;

  @ApiProperty()
  @IsString()
  event_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ type: WechatNotifyResourceDto })
  @ValidateNested()
  @Type(() => WechatNotifyResourceDto)
  resource: WechatNotifyResourceDto;
}

/** 微信支付回调HTTP头 + 原始报文，用于验签 */
export class WechatCallbackMeta {
  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  nonce?: string;

  @IsOptional()
  @IsString()
  serial?: string;

  rawBody?: Buffer;
}
