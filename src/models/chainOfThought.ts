import { AgentCompletion, AgentArgs, SystemMessage, UserMessage } from './types';

export interface ExplainedAnswer {
    explanation: string;
    answer: string;
}

export interface ChainOfThoughtArgs extends AgentArgs {
    question: string;
    temperature?: number;
    maxTokens?: number;
    instructions?: string;
}

export async function chainOfThought(args: ChainOfThoughtArgs): Promise<AgentCompletion<ExplainedAnswer>> {
    const { completePrompt, question, temperature, maxTokens, instructions } = args;

    const systemContent = instructions
        ? `${instructions}\n\nYou must return your response as a JSON object with "explanation" and "answer" fields.`
        : 'You must return your response as a JSON object with "explanation" and "answer" fields.';

    const system: SystemMessage = { role: 'system', content: systemContent };
    const prompt: UserMessage = { role: 'user', content: question };

    const result = await completePrompt({ prompt, system, temperature, maxTokens, jsonMode: true });

    if (!result.completed || !result.value) {
        return { completed: false, error: result.error };
    }

    try {
        const parsed = typeof result.value === 'object' ? result.value as any : JSON.parse(result.value as string);
        return {
            completed: true,
            value: {
                explanation: parsed.explanation ?? '',
                answer: parsed.answer ?? '',
            },
        };
    } catch {
        return { completed: false, error: new Error('Failed to parse chain-of-thought response') };
    }
}
