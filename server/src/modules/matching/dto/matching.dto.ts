import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchingRequestDto {
  @ApiProperty({ description: '目标科室', example: '心内科' })
  @IsString()
  department: string;

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

  @ApiPropertyOptional({ description: '服务类型', example: 'FULL_PROCESS' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: '预约日期 (ISO)', example: '2026-07-20' })
  @IsOptional()
  @IsString()
  appointmentDate?: string;

  @ApiPropertyOptional({ description: '返回结果数量', example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;
}
