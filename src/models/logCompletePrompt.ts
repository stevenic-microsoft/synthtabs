import { AgentCompletion, completePrompt, PromptCompletionArgs } from './types';

export function logCompletePrompt<TValue = string>(
    inner: completePrompt<TValue>,
    logDetails?: boolean
): completePrompt<TValue> {
    return async (args: PromptCompletionArgs): Promise<AgentCompletion<TValue>> => {
        const result = await inner(args);

        if (result.completed) {
            const value = typeof result.value === 'string'
                ? result.value
                : JSON.stringify(result.value, null, 2);
            console.log(`\x1b[32m${value}\x1b[0m`);
        } else if (result.error) {
            console.log(`\x1b[31m${result.error.message}\x1b[0m`);
        }

        if (logDetails) {
            console.log('─'.repeat(80));
        }

        return result;
    };
}
