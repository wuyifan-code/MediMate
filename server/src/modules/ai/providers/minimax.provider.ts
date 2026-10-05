import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from '../interfaces/ai-provider.interface';
import { assertPublicHttpUrl, OUTBOUND_REQUEST_TIMEOUT_MS } from '../../../common/utils/assert-public-url';

@Injectable()
export class MiniMaxProvider implements AiProvider {
  private readonly logger = new Logger(MiniMaxProvider.name);
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.refreshConfig();
  }

  private refreshConfig() {
    this.apiKey = process.env.MINIMAX_API_KEY || '';
    this.model = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';
    this.baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';
    
    if (!this.apiKey) {
      this.logger.error('MINIMAX_API_KEY is not configured in process.env');
    } else {
      this.logger.log(`MiniMaxProvider initialized with model: ${this.model} and URL: ${this.baseUrl}`);
    }
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    // Refresh config just in case process.env was updated later
    if (!this.apiKey) this.refreshConfig();

    if (!this.apiKey) {
      this.logger.warn('MINIMAX_API_KEY is missing, aborting chat request.');
      return '';
    }

    try {
      // 出站 URL 统一校验：仅 http/https、拒绝环回/私有/保留地址（MINIMAX_BASE_URL 来自环境变量，必须防 SSRF）
      const targetUrl = await assertPublicHttpUrl(`${this.baseUrl}/chat/completions`);
      this.logger.log(`Calling MiniMax API: ${targetUrl.toString()} for model ${this.model}`);

      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
        }),
        // 统一出站超时兜底
        signal: AbortSignal.timeout(OUTBOUND_REQUEST_TIMEOUT_MS),
      });

      this.logger.log(`MiniMax API Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MiniMax API error (${response.status}): ${errorText}`);
        return '';
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message?.content || '';
        this.logger.log('MiniMax chat request successful.');
        return content;
      }

      this.logger.warn('MiniMax returned no content in choices.');
      return '';
    } catch (error) {
      this.logger.error('MiniMax request failed exception', error instanceof Error ? error.stack : String(error));
      return '';
    }
  }
}
