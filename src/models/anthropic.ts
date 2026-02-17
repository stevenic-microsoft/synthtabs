import Anthropic from '@anthropic-ai/sdk';
import { AgentCompletion, completePrompt, PromptCompletionArgs, RequestError } from './types';

export interface AnthropicArgs {
    apiKey: string;
    model: string;
    baseURL?: string;
    temperature?: number;
    maxRetries?: number;
}

export function anthropic(args: AnthropicArgs): completePrompt {
    const { apiKey, model, baseURL, temperature = 0.0, maxRetries } = args;

    const client = new Anthropic({ apiKey, baseURL, maxRetries });

    return async (completionArgs: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
        const reqTemp = completionArgs.temperature ?? temperature;

        // Build messages array from history + prompt
        const messages: Anthropic.MessageParam[] = [];
        if (completionArgs.history) {
            for (const msg of completionArgs.history) {
                messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
            }
        }

        const useJsonPrefill = completionArgs.jsonMode || completionArgs.jsonSchema;
        if (useJsonPrefill) {
            // JSON mode: append prompt then prefill with '{'
            messages.push({ role: 'user', content: completionArgs.prompt.content });
            messages.push({ role: 'assistant', content: '{' });
        } else {
            messages.push({ role: 'user', content: completionArgs.prompt.content });
        }

        // When a JSON schema is provided, include it in the system prompt
        let systemContent = completionArgs.system?.content;
        if (completionArgs.jsonSchema) {
            const schemaInstruction = `\n\nYou must return valid JSON conforming to this schema:\n${JSON.stringify(completionArgs.jsonSchema)}`;
            systemContent = systemContent ? systemContent + schemaInstruction : schemaInstruction;
        }

        try {
            const stream = await client.messages.create({
                model,
                max_tokens: 32768,
                temperature: reqTemp,
                system: systemContent,
                messages,
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
