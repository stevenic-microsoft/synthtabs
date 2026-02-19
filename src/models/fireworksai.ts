import OpenAI from 'openai';
import { AgentCompletion, completePrompt, PromptCompletionArgs, RequestError } from './types';

export interface FireworksAIArgs {
    apiKey: string;
    model: string;
    temperature?: number;
}

/** Known short-name → full Fireworks model path mappings. */
const FIREWORKS_MODEL_MAP: Record<string, string> = {
    'fireworks-glm-5': 'accounts/fireworks/models/glm-5',
    'fireworks-minimax-m2p5': 'accounts/fireworks/models/minimax-m2p5',
    'fireworks-kimi-k2p5': 'accounts/fireworks/models/kimi-k2p5',
};

const FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1';

/**
 * Extract JSON from a string that may be wrapped in markdown fences or prose.
 * Returns the original string if no JSON object/array is found.
 */
export function extractJSON(text: string): string {
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) {
        return fenceMatch[1].trim();
    }

    // Find the first top-level { ... } or [ ... ]
    const start = text.search(/[\[{]/);
    if (start === -1) return text;

    const open = text[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === open || ch === (open === '{' ? '[' : '{')) depth++;
        else if (ch === close || ch === (close === '}' ? ']' : '}')) depth--;
        if (depth === 0) {
            return text.slice(start, i + 1);
        }
    }

    // Fallback: return from the first brace to end
    return text.slice(start);
}

/**
 * Resolve a short Fireworks model name to the full API path.
 * Returns the input unchanged if not a known short name.
 */
export function resolveFireworksModel(model: string): string {
    return FIREWORKS_MODEL_MAP[model] || model;
}

/**
 * Build the messages array, temperature, and JSON flag for a FireworksAI request.
 * Pure function — no SDK dependency.
 */
export function buildFireworksRequest(args: PromptCompletionArgs, defaultTemp: number): {
    messages: { role: string; content: string }[];
    temperature: number;
    useJson: boolean;
} {
    const temperature = args.temperature ?? defaultTemp;
    const useJson = !!(args.jsonMode || args.jsonSchema);

    const messages: { role: string; content: string }[] = [];
    if (args.system) {
        messages.push({ role: 'system', content: args.system.content });
    }
    if (args.history) {
        for (const msg of args.history) {
            messages.push({ role: msg.role, content: msg.content });
        }
    }

    let userContent = args.prompt.content;
    if (useJson) {
        userContent += '\n\nRespond with valid JSON only. No markdown fences.';
    }
    messages.push({ role: 'user', content: userContent });

    return { messages, temperature, useJson };
}

export function fireworksai(args: FireworksAIArgs): completePrompt {
    const { apiKey, temperature = 0.0 } = args;
    const model = resolveFireworksModel(args.model);

    const client = new OpenAI({ apiKey, baseURL: FIREWORKS_BASE_URL });

    return async (completionArgs: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
        const { messages, temperature: reqTemp, useJson } = buildFireworksRequest(completionArgs, temperature);

        try {
            const response = await client.chat.completions.create({
                model,
                messages: messages as OpenAI.ChatCompletionMessageParam[],
                temperature: reqTemp,
                max_tokens: 32768,
                ...(useJson ? { response_format: { type: 'json_object' } } : {}),
            });

            const choice = response.choices[0];
            if (!choice?.message) {
                return { completed: false, error: new Error('No response choice returned') };
            }

            let text = choice.message.content ?? '';

            // Robust JSON extraction as a safety net
            if (useJson && text) {
                text = extractJSON(text);
            }

            return { completed: true, value: text };
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
