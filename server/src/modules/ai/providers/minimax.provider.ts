import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from '../interfaces/ai-provider.interface';

@Injectable()
export class MiniMaxProvider implements AiProvider {
  private readonly logger = new Logger(MiniMaxProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || '';
    this.model = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';
    this.baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1';
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.apiKey) {
      this.logger.warn('MINIMAX_API_KEY is not configured');
      return '';
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
        }),
      });

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message?.content || '';
      }

      this.logger.warn('MiniMax returned no choices', JSON.stringify(data));
      return '';
    } catch (error) {
      this.logger.error('MiniMax request failed', error instanceof Error ? error.stack : undefined);
      return '';
    }
  }
}
