import OpenAI from 'openai';
import { AgentCompletion, completePrompt, PromptCompletionArgs, RequestError } from './types';

export interface OpenaiArgs {
    apiKey: string;
    model: string;
    baseURL?: string;
    organization?: string;
    project?: string;
    temperature?: number;
}

/**
 * Build the input messages and text format config for an OpenAI Responses API request.
 * Pure function — no SDK dependency.
 */
export function buildOpenAIRequest(args: PromptCompletionArgs): {
    input: { role: string; content: string }[];
    text?: { format: any };
} {
    const input: { role: string; content: string }[] = [];
    if (args.history) {
        for (const msg of args.history) {
            input.push({ role: msg.role, content: msg.content });
        }
    }
    input.push({ role: 'user', content: args.prompt.content });

    if (args.jsonMode || args.jsonSchema) {
        const inputText = input.map(m => m.content).join(' ');
        if (!/json/i.test(inputText)) {
            const last = input[input.length - 1];
            if (last) {
                last.content += '\nReturn JSON.';
            }
        }
    }

    let text: { format: any } | undefined;
    if (args.jsonSchema) {
        text = {
            format: {
                type: 'json_schema',
                name: 'response',
                strict: true,
                schema: args.jsonSchema,
            },
        };
    } else if (args.jsonMode) {
        text = {
            format: { type: 'json_object' },
        };
    }

    return { input, text };
}

export function openai(args: OpenaiArgs): completePrompt {
    const { apiKey, model, baseURL, organization, project } = args;

    const client = new OpenAI({ apiKey, baseURL, organization, project });

    return async (completionArgs: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
        const { input, text } = buildOpenAIRequest(completionArgs);

        try {
            const response = await client.responses.create({
                model,
                instructions: completionArgs.system?.content,
                input: input as OpenAI.Responses.ResponseInputItem[],
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
