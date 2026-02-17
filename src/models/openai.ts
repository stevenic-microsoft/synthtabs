import OpenAI from 'openai';
import { AgentCompletion, completePrompt, PromptCompletionArgs, RequestError } from './types';

export interface OpenaiArgs {
    apiKey: string;
    model: string;
    baseURL?: string;
    organization?: string;
    project?: string;
    temperature?: number;
    maxTokens?: number;
}

export function openai(args: OpenaiArgs): completePrompt {
    const { apiKey, model, baseURL, organization, project, maxTokens = 1000 } = args;

    const client = new OpenAI({ apiKey, baseURL, organization, project });

    return async (completionArgs: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
        const reqMaxTokens = completionArgs.maxTokens ?? maxTokens;

        // Build input messages
        const input: OpenAI.Responses.ResponseInputItem[] = [];
        if (completionArgs.history) {
            for (const msg of completionArgs.history) {
                input.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
            }
        }
        input.push({ role: 'user', content: completionArgs.prompt.content });

        // json_object format requires "json" in the input messages (not instructions).
        // Always ensure it's present when jsonMode or jsonSchema is requested.
        if (completionArgs.jsonMode || completionArgs.jsonSchema) {
            const inputText = input.map(m => ('content' in m && typeof m.content === 'string') ? m.content : '').join(' ');
            if (!/json/i.test(inputText)) {
                const last = input[input.length - 1];
                if (last && 'content' in last && typeof last.content === 'string') {
                    last.content += '\nReturn JSON.';
                }
            }
        }

        // Determine text format
        let text: OpenAI.Responses.ResponseTextConfig | undefined;
        if (completionArgs.jsonSchema) {
            text = {
                format: {
                    type: 'json_schema',
                    name: 'response',
                    strict: true,
                    schema: completionArgs.jsonSchema,
                },
            };
        } else if (completionArgs.jsonMode) {
            text = {
                format: { type: 'json_object' },
            };
        }

        try {
            const response = await client.responses.create({
                model,
                instructions: completionArgs.system?.content,
                input,
                max_output_tokens: reqMaxTokens,
                ...(text ? { text } : {}),
            });

            const output = response.output_text;
            if (output === undefined || output === null) {
                return { completed: false, error: new Error('No response output returned') };
            }

            return { completed: true, value: output };
        } catch (err: unknown) {
            let error: Error;
            if (err instanceof OpenAI.APIError && (err as any).status !== undefined) {
                error = new RequestError(err.message, (err as any).status, err.name ?? 'APIError');
            } else {
                error = err as Error;
            }
            return { completed: false, error };
        }
    };
}
