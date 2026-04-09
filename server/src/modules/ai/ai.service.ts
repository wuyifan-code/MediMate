import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from './interfaces/ai-provider.interface';
import { MiniMaxProvider } from './providers/minimax.provider';
import {
  AssistantRequestDto,
  ChatHistoryMessageDto,
  MatchReasoningRequestDto,
  TriageRequestDto,
  WebSearchRequestDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private readonly provider: MiniMaxProvider) {}

  async getHealthTriage(dto: TriageRequestDto): Promise<string> {
    let locationInfo = '';
    let locationHint = '';
    
    if (dto.latitude && dto.longitude) {
      locationInfo = `User location: latitude ${dto.latitude.toFixed(4)}, longitude ${dto.longitude.toFixed(4)} (Guizhou Province, China area).`;
      locationHint = `Based on the user's location in the Guizhou area, recommend 1-2 specific hospitals with name and approximate distance.`;
    }

    const prompt = [
      {
        role: 'user',
        content:
          `You are a professional medical triage assistant for a Chinese healthcare platform.\n` +
          `Based on the user's symptoms, provide a concise response with:\n` +
          `1. Recommended hospital department (科室推荐)\n` +
          `2. Specific hospital recommendation: ${locationHint || 'general hospital recommendation'}\n` +
          `3. Preparation advice (就诊准备)\n` +
          `4. One warm tip (温馨提示)\n\n` +
          `User's symptoms: ${dto.symptoms}\n` +
          `${locationInfo}\n\n` +
          `Respond in Chinese. Be specific about hospital names. No thinking tags, no markdown formatting.`,
      },
    ];

    const text = this.cleanResponse(await this.provider.chat(prompt));
    return text || 'Service temporarily unavailable. Please visit a hospital.';
  }

  async getMatchReasoning(dto: MatchReasoningRequestDto): Promise<string> {
    const prompt = [
      {
        role: 'user',
        content:
          `Explain why this escort is a good match for the patient in one sentence. No thinking tags, no markdown.\n\n` +
          `Patient Needs: ${dto.patientNeeds}\n` +
          `Escort Profile: ${dto.escortProfile}`,
      },
    ];

    const text = this.cleanResponse(await this.provider.chat(prompt));
    return text || '基于地理位置与专业资质智能推荐';
  }

  async getAssistantResponse(dto: AssistantRequestDto): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [
      ...this.mapHistory(dto.history),
      { role: 'user', content: dto.prompt + '\n\nPlease respond without thinking tags or markdown formatting.' },
    ];

    const text = this.cleanResponse(await this.provider.chat(messages));
    return text || 'Sorry, the service is temporarily unavailable.';
  }

  async getWebSearchSynthesis(dto: WebSearchRequestDto): Promise<any> {
    const langInstructions = dto.lang === 'zh' 
      ? `请用全中文回答。输出格式必须是纯JSON，不要任何markdown代码块或反引号。` 
      : `Please answer in English. Output must be pure JSON with no markdown code blocks or backticks.`;

    const prompt = [
      {
        role: 'system',
        content: `You are MediMate AI medical search aggregator.\n\n` +
                 `CRITICAL: Output ONLY valid JSON after your thinking. Do NOT wrap JSON in markdown.\n` +
                 `Format:\n` +
                 `{\n` +
                 `  "synthesisText": "2-3 sentence summary",\n` +
                 `  "keyInfo": [\n` +
                 `    { "title": "Title", "val": "Value" }\n` +
                 `  ],\n` +
                 `  "sources": ["Source 1", "Source 2"]\n` +
                 `}\n\n` +
                 `${langInstructions}`
      },
      {
        role: 'user',
        content: `Query: ${dto.query}\nProvide medical info.`
      }
    ];

    try {
      const text = await this.provider.chat(prompt);
      this.logger.log(`Raw AI response (first 300 chars): ${text.substring(0, 300)}`);
      
      // Strip <think>...</think> CoT tags from MiniMax-M2.7
      let jsonStr = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      // Clean up markdown formatting if the model leaked it
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0];
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0];
      }
      
      return JSON.parse(jsonStr.trim());
    } catch (e) {
      this.logger.error('Failed to parse Web Search JSON from AI', e);
      // Fallback response
      return {
        synthesisText: dto.lang === 'zh' ? '抱歉，检索生成摘要时出现了问题，建议您直接预约专业陪诊师获取定制化服务。' : 'Sorry, we encountered an issue synthesizing the search results. We recommend booking an expert escort directly.',
        keyInfo: [
          { title: dto.lang === 'zh' ? '状态' : 'Status', val: dto.lang === 'zh' ? '加载失败' : 'Failed to load' }
        ],
        sources: [
          dto.lang === 'zh' ? '系统内部报错回退处理' : 'System Fallback Error'
        ]
      };
    }
  }

  private mapHistory(history: ChatHistoryMessageDto[] = []) {
    return history.map((message) => ({
      role: message.role,
      content: message.text,
    }));
  }

  private cleanResponse(text: string): string {
    if (!text) return text;
    
    let cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*?$/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .replace(/^```\s*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .replace(/^\s*[\n\r]+/gm, '')
      .trim();
    
    return cleaned;
  }
}
