import { LLMProvider, ProviderConfig, CompletionOptions, CompletionResponse, Message } from './types';

export abstract class BaseProvider implements LLMProvider {
  protected config: ProviderConfig;
  abstract name: string;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract chat(options: CompletionOptions): Promise<CompletionResponse>;

  async *streamChat?(_options: CompletionOptions): AsyncIterableIterator<CompletionResponse> {
    throw new Error('Streaming not implemented for this provider');
  }

  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries || 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }

  protected normalizeMessages(messages: Message[]): any[] {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'function',
          name: msg.toolCallId,
          content: msg.content
        };
      }
      return msg;
    });
  }

  protected createCompletionResponse(
    id: string,
    message: Message,
    finishReason: CompletionResponse['choices'][0]['finishReason'],
    usage?: CompletionResponse['usage']
  ): CompletionResponse {
    return {
      id,
      choices: [{
        message,
        finishReason
      }],
      usage
    };
  }
}