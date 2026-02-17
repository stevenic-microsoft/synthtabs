import { AgentCompletion, AgentArgs, SystemMessage, UserMessage } from './types';

export interface ExplainedAnswer {
    explanation: string;
    answer: string;
}

export interface ChainOfThoughtArgs extends AgentArgs {
    question: string;
    temperature?: number;
    instructions?: string;
}

export async function chainOfThought(args: ChainOfThoughtArgs): Promise<AgentCompletion<ExplainedAnswer>> {
    const { completePrompt, question, temperature, instructions } = args;

    const systemContent = instructions
        ? `${instructions}\n\nYou must return your response as a JSON object with "explanation" and "answer" fields.`
        : 'You must return your response as a JSON object with "explanation" and "answer" fields.';

    const system: SystemMessage = { role: 'system', content: systemContent };
    const prompt: UserMessage = { role: 'user', content: question };

    const result = await completePrompt({ prompt, system, temperature, jsonMode: true });

    if (!result.completed || !result.value) {
        return { completed: false, error: result.error };
    }

    try {
        let parsed: any;
        if (typeof result.value === 'object') {
            parsed = result.value;
        } else {
            let text = result.value as string;
            // Strip markdown code fences if present
            text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
            // Extract the first JSON object from the text
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end > start) {
                text = text.substring(start, end + 1);
            }
            parsed = JSON.parse(text);
        }
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
