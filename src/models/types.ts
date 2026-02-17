// ---------------------------------------------------------------------------
// Provider types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export interface Message {
    role: string;
    content: string;
    name?: string;
}

export interface SystemMessage extends Message {
    role: 'system';
}

export interface UserMessage extends Message {
    role: 'user';
}

// ---------------------------------------------------------------------------
// Completions
// ---------------------------------------------------------------------------

export interface AgentCompletion<TValue> {
    completed: boolean;
    value?: TValue;
    error?: Error;
}

export interface PromptCompletionArgs {
    prompt: UserMessage;
    system?: SystemMessage;
    history?: Message[];
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    /** JSON schema for structured output. When provided, the model is asked to return JSON conforming to this schema. */
    jsonSchema?: Record<string, unknown>;
}

export type completePrompt<TValue = string> = (args: PromptCompletionArgs) => Promise<AgentCompletion<TValue>>;

// ---------------------------------------------------------------------------
// Agent args
// ---------------------------------------------------------------------------

export interface AgentArgs {
    completePrompt: completePrompt<any>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RequestError extends Error {
    readonly status: number;

    constructor(message: string, status: number, name?: string) {
        super(message);
        this.status = status;
        this.name = name ?? 'RequestError';
    }
}
