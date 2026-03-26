import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AssistantRequestDto, MatchReasoningRequestDto, TriageRequestDto } from './dto/ai.dto';

@ApiTags('AI')
@Controller('ai')
@UseGuards(ThrottlerGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('triage')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate AI triage advice' })
  async triage(@Body() dto: TriageRequestDto) {
    const text = await this.aiService.getHealthTriage(dto);
    return {
      success: true,
      data: { text },
    };
  }

  @Post('match-reasoning')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate escort match reasoning' })
  async matchReasoning(@Body() dto: MatchReasoningRequestDto) {
    const text = await this.aiService.getMatchReasoning(dto);
    return {
      success: true,
      data: { text },
    };
  }

  @Post('assistant')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate AI assistant response' })
  async assistant(@Body() dto: AssistantRequestDto) {
    const text = await this.aiService.getAssistantResponse(dto);
    return {
      success: true,
      data: { text },
    };
  }
}
