import assert from 'assert';
import { normalizePageName, parseMetadata } from '../src/pages';

// ---------------------------------------------------------------------------
// normalizePageName
// ---------------------------------------------------------------------------

describe('normalizePageName', () => {
    it('lowercases the name', () => {
        assert.strictEqual(normalizePageName('MyPage'), 'mypage');
    });

    it('replaces invalid characters with underscores', () => {
        assert.strictEqual(normalizePageName('my page!'), 'my_page_');
    });

    it('preserves allowed special characters', () => {
        // Allowed: a-z 0-9 - _ [ ] ( ) { } @ # $ % &
        const input = 'test-name_[ok](yes){no}@#$%&';
        assert.strictEqual(normalizePageName(input), input.toLowerCase());
    });

    it('returns undefined for empty string', () => {
        assert.strictEqual(normalizePageName(''), undefined);
    });

    it('returns undefined for undefined input', () => {
        assert.strictEqual(normalizePageName(undefined), undefined);
    });
});

// ---------------------------------------------------------------------------
// parseMetadata
// ---------------------------------------------------------------------------

describe('parseMetadata', () => {
    it('parses complete input', () => {
        const input = {
            title: 'My Page',
            categories: ['Tools'],
            pinned: true,
            createdDate: '2025-01-01T00:00:00Z',
            lastModified: '2025-06-01T00:00:00Z',
            pageVersion: 2,
            mode: 'locked',
        };
        const result = parseMetadata(input);
        assert.strictEqual(result.title, 'My Page');
        assert.deepStrictEqual(result.categories, ['Tools']);
        assert.strictEqual(result.pinned, true);
        assert.strictEqual(result.createdDate, '2025-01-01T00:00:00Z');
        assert.strictEqual(result.lastModified, '2025-06-01T00:00:00Z');
        assert.strictEqual(result.pageVersion, 2);
        assert.strictEqual(result.mode, 'locked');
    });

    it('provides defaults for missing fields', () => {
        const result = parseMetadata({});
        assert.strictEqual(result.title, '');
        assert.deepStrictEqual(result.categories, []);
        assert.strictEqual(result.pinned, false);
        assert.strictEqual(result.createdDate, '');
        assert.strictEqual(result.lastModified, '');
        assert.strictEqual(result.pageVersion, 0);
        assert.strictEqual(result.mode, 'unlocked');
    });

    it('provides defaults for wrong types', () => {
        const result = parseMetadata({
            title: 42,
            categories: 'not-array',
            pinned: 'yes',
            createdDate: 123,
            lastModified: null,
            pageVersion: 'two',
            mode: 'invalid',
        });
        assert.strictEqual(result.title, '');
        assert.deepStrictEqual(result.categories, []);
        assert.strictEqual(result.pinned, false);
        assert.strictEqual(result.createdDate, '');
        assert.strictEqual(result.lastModified, '');
        assert.strictEqual(result.pageVersion, 0);
        assert.strictEqual(result.mode, 'unlocked');
    });

    it('falls back from uxVersion to pageVersion', () => {
        const result = parseMetadata({ uxVersion: 1 });
        assert.strictEqual(result.pageVersion, 1);
    });

    it('prefers pageVersion over uxVersion when both present', () => {
        const result = parseMetadata({ pageVersion: 2, uxVersion: 1 });
        assert.strictEqual(result.pageVersion, 2);
    });

    it('validates mode — only "locked" passes, everything else becomes "unlocked"', () => {
        assert.strictEqual(parseMetadata({ mode: 'locked' }).mode, 'locked');
        assert.strictEqual(parseMetadata({ mode: 'unlocked' }).mode, 'unlocked');
        assert.strictEqual(parseMetadata({ mode: 'read-only' }).mode, 'unlocked');
        assert.strictEqual(parseMetadata({ mode: 123 }).mode, 'unlocked');
    });
});
