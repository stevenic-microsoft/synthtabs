import assert from 'assert';
import { buildOpenAIRequest } from '../src/models/openai';
import { PromptCompletionArgs } from '../src/models/types';

describe('buildOpenAIRequest', () => {
    const baseArgs: PromptCompletionArgs = {
        prompt: { role: 'user', content: 'Hello' },
    };

    it('builds input from history + prompt', () => {
        const args: PromptCompletionArgs = {
            ...baseArgs,
            history: [
                { role: 'user', content: 'Hi' },
                { role: 'assistant', content: 'Hey' },
            ],
        };
        const { input } = buildOpenAIRequest(args);
        assert.strictEqual(input.length, 3);
        assert.strictEqual(input[2].content, 'Hello');
    });

    it('appends "Return JSON." when jsonMode and no "json" in input', () => {
        const args: PromptCompletionArgs = {
            ...baseArgs,
            jsonMode: true,
        };
        const { input } = buildOpenAIRequest(args);
        const last = input[input.length - 1];
        assert.ok(last.content.includes('Return JSON.'));
    });

    it('does not append "Return JSON." when input already contains "json"', () => {
        const args: PromptCompletionArgs = {
            prompt: { role: 'user', content: 'Return this as json please' },
            jsonMode: true,
        };
        const { input } = buildOpenAIRequest(args);
        const last = input[input.length - 1];
        assert.ok(!last.content.includes('Return JSON.'));
    });

    it('returns json_schema text config when jsonSchema provided', () => {
        const schema = { type: 'object', properties: { x: { type: 'number' } } };
        const args: PromptCompletionArgs = {
            ...baseArgs,
            jsonSchema: schema,
        };
        const { text } = buildOpenAIRequest(args);
        assert.ok(text);
        assert.strictEqual(text.format.type, 'json_schema');
        assert.strictEqual(text.format.name, 'response');
        assert.strictEqual(text.format.strict, true);
        assert.deepStrictEqual(text.format.schema, schema);
    });

    it('returns json_object text config when jsonMode (no schema)', () => {
        const args: PromptCompletionArgs = {
            ...baseArgs,
            jsonMode: true,
        };
        const { text } = buildOpenAIRequest(args);
        assert.ok(text);
        assert.strictEqual(text.format.type, 'json_object');
    });

    it('returns no text config for plain text', () => {
        const { text } = buildOpenAIRequest(baseArgs);
        assert.strictEqual(text, undefined);
    });
});
