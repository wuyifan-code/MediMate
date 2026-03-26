export interface AiProvider {
  chat(messages: Array<{ role: string; content: string }>): Promise<string>;
}
