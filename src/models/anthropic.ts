import Anthropic from '@anthropic-ai/sdk';
import { AgentCompletion, completePrompt, PromptCompletionArgs, RequestError } from './types';

export interface AnthropicArgs {
    apiKey: string;
    model: string;
    baseURL?: string;
    temperature?: number;
    maxRetries?: number;
}

/**
 * Build the messages array and system content for an Anthropic API request.
 * Pure function — no SDK dependency.
 */
export function buildAnthropicRequest(args: PromptCompletionArgs, defaultTemp: number): {
    messages: { role: string; content: string }[];
    system: string | undefined;
    temperature: number;
} {
    const reqTemp = args.temperature ?? defaultTemp;

    const messages: { role: string; content: string }[] = [];
    if (args.history) {
        for (const msg of args.history) {
            messages.push({ role: msg.role, content: msg.content });
        }
    }

    const useJsonPrefill = args.jsonMode || args.jsonSchema;
    if (useJsonPrefill) {
        messages.push({ role: 'user', content: args.prompt.content });
        messages.push({ role: 'assistant', content: '{' });
    } else {
        messages.push({ role: 'user', content: args.prompt.content });
    }

    let system = args.system?.content;
    if (args.jsonSchema) {
        const schemaInstruction = `\n\nYou must return valid JSON conforming to this schema:\n${JSON.stringify(args.jsonSchema)}`;
        system = system ? system + schemaInstruction : schemaInstruction;
    }

    return { messages, system, temperature: reqTemp };
}

export function anthropic(args: AnthropicArgs): completePrompt {
    const { apiKey, model, baseURL, temperature = 0.0, maxRetries } = args;

    const client = new Anthropic({ apiKey, baseURL, maxRetries });

    return async (completionArgs: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
        const { messages, system: systemContent, temperature: reqTemp } = buildAnthropicRequest(completionArgs, temperature);

        const useJsonPrefill = completionArgs.jsonMode || completionArgs.jsonSchema;

        try {
            const stream = await client.messages.create({
                model,
                max_tokens: 32768,
                temperature: reqTemp,
                system: systemContent,
                messages: messages as Anthropic.MessageParam[],
                stream: true,
            });

            let text = '';
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    text += event.delta.text;
                }
            }

            if (useJsonPrefill) {
                text = '{' + text;
            }

            return { completed: true, value: text };
        } catch (err: unknown) {
            let error: Error;
            if (err instanceof Anthropic.APIError && (err as any).status !== undefined) {
                error = new RequestError(err.message, (err as any).status, err.name);
            } else {
                error = err as Error;
            }
            return { completed: false, error };
        }
    };
}
