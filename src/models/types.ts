export type ProviderName = 'Anthropic' | 'OpenAI' | 'FireworksAI';

export interface ProviderConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
}

export interface ModelEntry {
    use: 'builder' | 'chat';
    provider: ProviderName;
    configuration: ProviderConfig;
    imageQuality: 'standard' | 'hd';
    instructions?: string;
    logCompletions?: boolean;
}

export interface Provider {
    name: ProviderName;
    builderModels: string[];
    chatModels: string[];
    detectModel(model: string): boolean;
}
