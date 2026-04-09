import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryMessageDto {
  @ApiProperty({ enum: ['user', 'model'] })
  @IsString()
  role: 'user' | 'model';

  @ApiProperty()
  @IsString()
  text: string;
}

export class TriageRequestDto {
  @ApiProperty()
  @IsString()
  symptoms: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class MatchReasoningRequestDto {
  @ApiProperty()
  @IsString()
  patientNeeds: string;

  @ApiProperty()
  @IsString()
  escortProfile: string;
}

export class AssistantRequestDto {
  @ApiProperty()
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ type: [ChatHistoryMessageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  history?: ChatHistoryMessageDto[];
}

export class WebSearchRequestDto {
  @ApiProperty()
  @IsString()
  query: string;

  @ApiProperty({ enum: ['zh', 'en'] })
  @IsString()
  lang: 'zh' | 'en';
}
