import assert from 'assert';
import { resolveFireworksModel, buildFireworksRequest, extractJSON } from '../src/models/fireworksai';
import { PromptCompletionArgs } from '../src/models/types';

// ---------------------------------------------------------------------------
// resolveFireworksModel
// ---------------------------------------------------------------------------

describe('resolveFireworksModel', () => {
    it('maps known short names to full paths', () => {
        assert.strictEqual(
            resolveFireworksModel('fireworks-glm-5'),
            'accounts/fireworks/models/glm-5',
        );
        assert.strictEqual(
            resolveFireworksModel('fireworks-minimax-m2p5'),
            'accounts/fireworks/models/minimax-m2p5',
        );
    });

    it('passes through unknown model names unchanged', () => {
        assert.strictEqual(resolveFireworksModel('custom-model'), 'custom-model');
    });
});

// ---------------------------------------------------------------------------
// buildFireworksRequest
// ---------------------------------------------------------------------------

describe('buildFireworksRequest', () => {
    const baseArgs: PromptCompletionArgs = {
        prompt: { role: 'user', content: 'Hello' },
    };

    it('builds messages from system + history + prompt', () => {
        const args: PromptCompletionArgs = {
            ...baseArgs,
            system: { role: 'system', content: 'Be helpful' },
            history: [
                { role: 'user', content: 'Hi' },
                { role: 'assistant', content: 'Hey' },
            ],
        };
        const { messages } = buildFireworksRequest(args, 0.0);
        assert.strictEqual(messages.length, 4);
        assert.strictEqual(messages[0].role, 'system');
        assert.strictEqual(messages[0].content, 'Be helpful');
        assert.strictEqual(messages[3].role, 'user');
        assert.strictEqual(messages[3].content, 'Hello');
    });

    it('appends JSON instruction to user content in jsonMode', () => {
        const args: PromptCompletionArgs = { ...baseArgs, jsonMode: true };
        const { messages, useJson } = buildFireworksRequest(args, 0.0);
        const last = messages[messages.length - 1];
        assert.ok(last.content.includes('Respond with valid JSON only'));
        assert.strictEqual(useJson, true);
    });

    it('does not append JSON instruction in plain mode', () => {
        const { messages, useJson } = buildFireworksRequest(baseArgs, 0.0);
        const last = messages[messages.length - 1];
        assert.ok(!last.content.includes('JSON'));
        assert.strictEqual(useJson, false);
    });

    it('uses default temperature when none specified', () => {
        const { temperature } = buildFireworksRequest(baseArgs, 0.5);
        assert.strictEqual(temperature, 0.5);
    });

    it('uses args temperature when specified', () => {
        const args: PromptCompletionArgs = { ...baseArgs, temperature: 0.9 };
        const { temperature } = buildFireworksRequest(args, 0.5);
        assert.strictEqual(temperature, 0.9);
    });
});

// ---------------------------------------------------------------------------
// extractJSON (moved from providers.spec.ts for completeness)
// ---------------------------------------------------------------------------

describe('extractJSON (fireworksai)', () => {
    it('extracts JSON from markdown code fences', () => {
        const input = '```json\n{"key": "value"}\n```';
        assert.strictEqual(extractJSON(input), '{"key": "value"}');
    });

    it('returns original text when no JSON found', () => {
        assert.strictEqual(extractJSON('no json here'), 'no json here');
    });
});
