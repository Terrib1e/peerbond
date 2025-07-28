import { LLMProvider, ProviderConfig } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';

export * from './types';
export * from './base';

export type ProviderName = 'openai' | 'anthropic' | 'gemini';

export class ProviderRegistry {
  private static providers = new Map<string, LLMProvider>();
  private static configs = new Map<string, ProviderConfig>();

  static register(name: ProviderName, config: ProviderConfig) {
    this.configs.set(name, config);
  }

  static get(name: ProviderName): LLMProvider {
    if (!this.providers.has(name)) {
      const config = this.configs.get(name);
      if (!config) {
        throw new Error(`Provider ${name} not configured`);
      }

      let provider: LLMProvider;
      switch (name) {
        case 'openai':
          provider = new OpenAIProvider(config);
          break;
        case 'anthropic':
          provider = new AnthropicProvider(config);
          break;
        case 'gemini':
          provider = new GeminiProvider(config);
          break;
        default:
          throw new Error(`Unknown provider: ${name}`);
      }

      this.providers.set(name, provider);
    }

    return this.providers.get(name)!;
  }

  static getAll(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  static clear() {
    this.providers.clear();
    this.configs.clear();
  }
}

export function createProvider(name: ProviderName, config: ProviderConfig): LLMProvider {
  ProviderRegistry.register(name, config);
  return ProviderRegistry.get(name);
}