import assert from 'assert';
import { buildAnthropicRequest } from '../src/models/anthropic';
import { PromptCompletionArgs } from '../src/models/types';

describe('buildAnthropicRequest', () => {
    const baseArgs: PromptCompletionArgs = {
        prompt: { role: 'user', content: 'Hello' },
    };

    it('builds messages from history + prompt', () => {
        const args: PromptCompletionArgs = {
            ...baseArgs,
            history: [
                { role: 'user', content: 'Hi' },
                { role: 'assistant', content: 'Hey' },
            ],
        };
        const { messages } = buildAnthropicRequest(args, 0.0);
        assert.strictEqual(messages.length, 3);
        assert.strictEqual(messages[0].role, 'user');
        assert.strictEqual(messages[0].content, 'Hi');
        assert.strictEqual(messages[1].role, 'assistant');
        assert.strictEqual(messages[1].content, 'Hey');
        assert.strictEqual(messages[2].role, 'user');
        assert.strictEqual(messages[2].content, 'Hello');
    });

    it('appends assistant prefill "{" in jsonMode', () => {
        const args: PromptCompletionArgs = { ...baseArgs, jsonMode: true };
        const { messages } = buildAnthropicRequest(args, 0.0);
        const last = messages[messages.length - 1];
        assert.strictEqual(last.role, 'assistant');
        assert.strictEqual(last.content, '{');
    });

    it('appends assistant prefill "{" when jsonSchema is provided', () => {
        const args: PromptCompletionArgs = { ...baseArgs, jsonSchema: { type: 'object' } };
        const { messages } = buildAnthropicRequest(args, 0.0);
        const last = messages[messages.length - 1];
        assert.strictEqual(last.role, 'assistant');
        assert.strictEqual(last.content, '{');
    });

    it('does not prefill in plain text mode', () => {
        const { messages } = buildAnthropicRequest(baseArgs, 0.0);
        const last = messages[messages.length - 1];
        assert.strictEqual(last.role, 'user');
        assert.strictEqual(last.content, 'Hello');
    });

    it('injects jsonSchema into system content', () => {
        const args: PromptCompletionArgs = {
            ...baseArgs,
            system: { role: 'system', content: 'Be helpful.' },
            jsonSchema: { type: 'object', properties: { name: { type: 'string' } } },
        };
        const { system } = buildAnthropicRequest(args, 0.0);
        assert.ok(system);
        assert.ok(system.includes('Be helpful.'));
        assert.ok(system.includes('JSON conforming to this schema'));
        assert.ok(system.includes('"type":"object"'));
    });

    it('creates system content from schema alone when no system message', () => {
        const args: PromptCompletionArgs = {
            ...baseArgs,
            jsonSchema: { type: 'object' },
        };
        const { system } = buildAnthropicRequest(args, 0.0);
        assert.ok(system);
        assert.ok(system.includes('JSON conforming to this schema'));
    });

    it('uses default temperature when none specified', () => {
        const { temperature } = buildAnthropicRequest(baseArgs, 0.7);
        assert.strictEqual(temperature, 0.7);
    });

    it('uses args temperature when specified', () => {
        const args: PromptCompletionArgs = { ...baseArgs, temperature: 0.3 };
        const { temperature } = buildAnthropicRequest(args, 0.7);
        assert.strictEqual(temperature, 0.3);
    });
});
