import assert from 'assert';
import { chainOfThought, ChainOfThoughtArgs } from '../src/models/chainOfThought';
import { AgentCompletion, PromptCompletionArgs } from '../src/models/types';

/** Helper: build a stub completePrompt that returns the given result. */
function stubCompletePrompt(result: AgentCompletion<any>) {
    return async (_args: PromptCompletionArgs) => result;
}

/** Helper: build a stub that captures the args it was called with. */
function capturingStub(result: AgentCompletion<any>) {
    let captured: PromptCompletionArgs | undefined;
    const fn = async (args: PromptCompletionArgs) => { captured = args; return result; };
    return { fn, getCaptured: () => captured };
}

describe('chainOfThought', () => {
    it('returns parsed {explanation, answer} from a valid JSON string response', async () => {
        const stub = stubCompletePrompt({
            completed: true,
            value: '{"explanation": "because", "answer": "42"}',
        });
        const result = await chainOfThought({ completePrompt: stub, question: 'What?' });
        assert.strictEqual(result.completed, true);
        assert.deepStrictEqual(result.value, { explanation: 'because', answer: '42' });
    });

    it('returns parsed result when completePrompt returns a pre-parsed object', async () => {
        const stub = stubCompletePrompt({
            completed: true,
            value: { explanation: 'reason', answer: 'yes' },
        });
        const result = await chainOfThought({ completePrompt: stub, question: 'Q?' });
        assert.strictEqual(result.completed, true);
        assert.deepStrictEqual(result.value, { explanation: 'reason', answer: 'yes' });
    });

    it('strips markdown code fences before parsing', async () => {
        const stub = stubCompletePrompt({
            completed: true,
            value: '```json\n{"explanation": "x", "answer": "y"}\n```',
        });
        const result = await chainOfThought({ completePrompt: stub, question: 'Q?' });
        assert.strictEqual(result.completed, true);
        assert.deepStrictEqual(result.value, { explanation: 'x', answer: 'y' });
    });

    it('extracts JSON from text with surrounding prose', async () => {
        const stub = stubCompletePrompt({
            completed: true,
            value: 'Here is my answer: {"explanation": "e", "answer": "a"} hope that helps!',
        });
        const result = await chainOfThought({ completePrompt: stub, question: 'Q?' });
        assert.strictEqual(result.completed, true);
        assert.deepStrictEqual(result.value, { explanation: 'e', answer: 'a' });
    });

    it('returns {completed: false} when completePrompt fails', async () => {
        const stub = stubCompletePrompt({
            completed: false,
            error: new Error('API error'),
        });
        const result = await chainOfThought({ completePrompt: stub, question: 'Q?' });
        assert.strictEqual(result.completed, false);
        assert.strictEqual(result.error?.message, 'API error');
    });

    it('returns parse-error when response is not valid JSON', async () => {
        const stub = stubCompletePrompt({
            completed: true,
            value: 'this is not json at all',
        });
        const result = await chainOfThought({ completePrompt: stub, question: 'Q?' });
        assert.strictEqual(result.completed, false);
        assert.ok(result.error?.message.includes('parse'));
    });

    it('includes custom instructions in system prompt when provided', async () => {
        const { fn, getCaptured } = capturingStub({
            completed: true,
            value: '{"explanation": "", "answer": ""}',
        });
        await chainOfThought({ completePrompt: fn, question: 'Q?', instructions: 'Be concise.' });
        const system = getCaptured()!.system!;
        assert.ok(system.content.startsWith('Be concise.'));
        assert.ok(system.content.includes('JSON object'));
    });

    it('uses default system prompt when no instructions given', async () => {
        const { fn, getCaptured } = capturingStub({
            completed: true,
            value: '{"explanation": "", "answer": ""}',
        });
        await chainOfThought({ completePrompt: fn, question: 'Q?' });
        const system = getCaptured()!.system!;
        assert.ok(system.content.startsWith('You must return'));
    });

    it('defaults missing explanation/answer to empty strings', async () => {
        const stub = stubCompletePrompt({
            completed: true,
            value: '{}',
        });
        const result = await chainOfThought({ completePrompt: stub, question: 'Q?' });
        assert.strictEqual(result.completed, true);
        assert.deepStrictEqual(result.value, { explanation: '', answer: '' });
    });
});
