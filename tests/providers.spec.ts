import assert from 'assert';
import {
    getProvider,
    detectProvider,
    AnthropicProvider,
    OpenAIProvider,
} from '../src/models/providers';
import { variableToString } from '../src/models/utils';
import { extractJSON } from '../src/models/fireworksai';

// ---------------------------------------------------------------------------
// getProvider
// ---------------------------------------------------------------------------

describe('getProvider', () => {
    it('returns Anthropic provider by name', () => {
        const p = getProvider('Anthropic');
        assert.strictEqual(p.name, 'Anthropic');
    });

    it('returns OpenAI provider by name', () => {
        const p = getProvider('OpenAI');
        assert.strictEqual(p.name, 'OpenAI');
    });

    it('returns FireworksAI provider by name', () => {
        const p = getProvider('FireworksAI');
        assert.strictEqual(p.name, 'FireworksAI');
    });

    it('throws on unknown provider name', () => {
        assert.throws(() => getProvider('Unknown' as any), /Unknown provider/);
    });
});

// ---------------------------------------------------------------------------
// detectProvider
// ---------------------------------------------------------------------------

describe('detectProvider', () => {
    it('detects Anthropic from claude- prefix', () => {
        const p = detectProvider('claude-sonnet-4-5');
        assert.strictEqual(p?.name, 'Anthropic');
    });

    it('detects OpenAI from gpt- prefix', () => {
        const p = detectProvider('gpt-5-mini');
        assert.strictEqual(p?.name, 'OpenAI');
    });

    it('detects FireworksAI from fireworks- prefix', () => {
        const p = detectProvider('fireworks-glm-5');
        assert.strictEqual(p?.name, 'FireworksAI');
    });

    it('returns undefined for unknown model', () => {
        assert.strictEqual(detectProvider('llama-3'), undefined);
    });
});

// ---------------------------------------------------------------------------
// variableToString
// ---------------------------------------------------------------------------

describe('variableToString', () => {
    it('returns empty string for null', () => {
        assert.strictEqual(variableToString(null), '');
    });

    it('returns empty string for undefined', () => {
        assert.strictEqual(variableToString(undefined), '');
    });

    it('passes through strings unchanged', () => {
        assert.strictEqual(variableToString('hello'), 'hello');
    });

    it('serializes objects to JSON', () => {
        assert.strictEqual(variableToString({ a: 1 }), '{"a":1}');
    });

    it('converts numbers via toString', () => {
        assert.strictEqual(variableToString(42), '42');
    });

    it('converts booleans via toString', () => {
        assert.strictEqual(variableToString(true), 'true');
    });

    it('serializes arrays to JSON', () => {
        assert.strictEqual(variableToString([1, 2]), '[1,2]');
    });
});

// ---------------------------------------------------------------------------
// extractJSON
// ---------------------------------------------------------------------------

describe('extractJSON', () => {
    it('extracts JSON from markdown code fences', () => {
        const input = '```json\n{"key": "value"}\n```';
        assert.strictEqual(extractJSON(input), '{"key": "value"}');
    });

    it('extracts JSON from fences without language tag', () => {
        const input = '```\n[1, 2, 3]\n```';
        assert.strictEqual(extractJSON(input), '[1, 2, 3]');
    });

    it('extracts a raw JSON object from surrounding text', () => {
        const input = 'Here is the result: {"a": 1} end.';
        const result = extractJSON(input);
        assert.strictEqual(result, '{"a": 1}');
    });

    it('extracts a raw JSON array from surrounding text', () => {
        const input = 'Result: [{"op":"update"}] done.';
        const result = extractJSON(input);
        assert.strictEqual(result, '[{"op":"update"}]');
    });

    it('handles nested braces correctly', () => {
        const input = 'output: {"a": {"b": {"c": 1}}} end';
        const result = extractJSON(input);
        assert.strictEqual(result, '{"a": {"b": {"c": 1}}}');
    });

    it('handles escaped strings inside JSON', () => {
        const input = '{"msg": "hello \\"world\\""}';
        const result = extractJSON(input);
        assert.strictEqual(result, '{"msg": "hello \\"world\\""}');
    });

    it('returns original text when no JSON found', () => {
        const input = 'no json here at all';
        assert.strictEqual(extractJSON(input), 'no json here at all');
    });

    it('handles braces inside JSON strings (not counting them)', () => {
        const input = '{"text": "a { b } c"}';
        const result = extractJSON(input);
        assert.strictEqual(result, '{"text": "a { b } c"}');
    });
});
