import { Provider, ProviderName } from './types';

export const AnthropicProvider: Provider = {
    name: 'Anthropic',
    builderModels: ['claude-opus-4-6', 'claude-sonnet-4-5'],
    chatModels: ['claude-haiku-4-5', 'claude-sonnet-4-5'],
    detectModel(model: string): boolean {
        return model.startsWith('claude-');
    }
};

export const OpenAIProvider: Provider = {
    name: 'OpenAI',
    builderModels: ['gpt-5.2', 'gpt-5.2-codex'],
    chatModels: ['gpt-5-nano', 'gpt-5-mini', 'gpt-4.1'],
    detectModel(model: string): boolean {
        return model.startsWith('gpt-') || model.startsWith('GPT-');
    }
};

export const PROVIDERS: Provider[] = [AnthropicProvider, OpenAIProvider];

export function getProvider(name: ProviderName): Provider {
    const provider = PROVIDERS.find(p => p.name === name);
    if (!provider) {
        throw new Error(`Unknown provider: ${name}`);
    }
    return provider;
}

export function detectProvider(model: string): Provider | undefined {
    return PROVIDERS.find(p => p.detectModel(model));
}
