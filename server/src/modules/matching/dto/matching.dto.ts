import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  IsEnum,
  Matches,
  ValidateIf,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType } from '@prisma/client';

export class MatchingRequestDto {
  @ApiProperty({ description: '目标科室', example: '心内科' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiPropertyOptional({ description: '目标医院 ID，用于校验发布服务覆盖范围' })
  @IsOptional()
  @IsString()
  hospitalId?: string;

  @ApiPropertyOptional({ description: '患者/医院纬度', example: 26.647 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: '患者/医院经度', example: 106.630 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: '预算 (元/小时)', example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: '服务类型', enum: ServiceType, example: 'FULL_PROCESS' })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({ description: '预约日期 (ISO)', example: '2026-07-20' })
  @ValidateIf(value => value.appointmentDate !== undefined || value.appointmentTime !== undefined)
  @IsDateString()
  appointmentDate?: string;

  @ApiPropertyOptional({ description: '预约时间 (HH:mm)', example: '09:30' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  appointmentTime?: string;

  @ApiPropertyOptional({ description: '预计服务时长（小时）', example: 2, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  durationHours?: number;

  @ApiPropertyOptional({ description: '返回结果数量', example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  topK?: number;
}
