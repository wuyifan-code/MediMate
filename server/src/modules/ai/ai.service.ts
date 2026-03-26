import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from './interfaces/ai-provider.interface';
import { MiniMaxProvider } from './providers/minimax.provider';
import {
  AssistantRequestDto,
  ChatHistoryMessageDto,
  MatchReasoningRequestDto,
  TriageRequestDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: AiProvider;

  constructor() {
    // Default to MiniMaxProvider; can be extended to swap providers via AI_PROVIDER env
    this.provider = new MiniMaxProvider();
  }

  async getHealthTriage(dto: TriageRequestDto): Promise<string> {
    const prompt = [
      {
        role: 'user',
        content:
          `You are a professional medical triage assistant.\n` +
          `Based on the user's symptoms, provide:\n` +
          `1. Recommended hospital department\n` +
          `2. Preparation advice\n` +
          `3. One warm tip\n\n` +
          `Symptoms: ${dto.symptoms}\n\n` +
          `Keep the answer concise and practical.`,
      },
    ];

    const text = await this.provider.chat(prompt);
    return text || 'Service temporarily unavailable. Please visit a hospital.';
  }

  async getMatchReasoning(dto: MatchReasoningRequestDto): Promise<string> {
    const prompt = [
      {
        role: 'user',
        content:
          `Explain why this escort is a good match for the patient in one sentence.\n\n` +
          `Patient Needs: ${dto.patientNeeds}\n` +
          `Escort Profile: ${dto.escortProfile}`,
      },
    ];

    const text = await this.provider.chat(prompt);
    return text || '基于地理位置与专业资质智能推荐';
  }

  async getAssistantResponse(dto: AssistantRequestDto): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [
      ...this.mapHistory(dto.history),
      { role: 'user', content: dto.prompt },
    ];

    const text = await this.provider.chat(messages);
    return text || 'Sorry, the service is temporarily unavailable.';
  }

  private mapHistory(history: ChatHistoryMessageDto[] = []) {
    return history.map((message) => ({
      role: message.role,
      content: message.text,
    }));
  }
}
