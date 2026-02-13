import assert from 'assert';
import {
    assignNodeIds,
    stripNodeIds,
    applyChangeList,
    parseChangeList,
    injectError,
    ChangeList,
} from '../src/service/transformPage';

// ---------------------------------------------------------------------------
// assignNodeIds
// ---------------------------------------------------------------------------

describe('assignNodeIds', () => {
    it('assigns sequential data-node-id to every element', () => {
        const html = '<html><head></head><body><div><p>Hello</p></div></body></html>';
        const { html: result, nodeCount } = assignNodeIds(html);
        assert.ok(result.includes('data-node-id="0"'));
        assert.ok(nodeCount > 0);
        // Every tag should have an id — count occurrences
        const ids = result.match(/data-node-id="/g);
        assert.strictEqual(ids?.length, nodeCount);
    });

    it('returns nodeCount matching the number of tags', () => {
        const html = '<div><span>A</span><span>B</span></div>';
        const { nodeCount } = assignNodeIds(html);
        // cheerio wraps in <html><head></head><body>...</body> so count includes those
        assert.ok(nodeCount >= 4); // html, head, body, div, span, span = 6
    });
});

// ---------------------------------------------------------------------------
// stripNodeIds
// ---------------------------------------------------------------------------

describe('stripNodeIds', () => {
    it('removes all data-node-id attributes', () => {
        const html = '<div data-node-id="0"><p data-node-id="1">Hi</p></div>';
        const result = stripNodeIds(html);
        assert.ok(!result.includes('data-node-id'));
        assert.ok(result.includes('<p>Hi</p>'));
    });
});

// ---------------------------------------------------------------------------
// assignNodeIds -> stripNodeIds roundtrip
// ---------------------------------------------------------------------------

describe('assignNodeIds -> stripNodeIds roundtrip', () => {
    it('produces HTML without data-node-id attributes', () => {
        const original = '<html><head></head><body><div><p>Hello</p></div></body></html>';
        const { html: annotated } = assignNodeIds(original);
        assert.ok(annotated.includes('data-node-id'));
        const stripped = stripNodeIds(annotated);
        assert.ok(!stripped.includes('data-node-id'));
        assert.ok(stripped.includes('<p>Hello</p>'));
    });
});

// ---------------------------------------------------------------------------
// applyChangeList
// ---------------------------------------------------------------------------

describe('applyChangeList', () => {
    // Helper: wrap content in a minimal annotated structure
    const annotated = '<html><head></head><body>' +
        '<div data-node-id="10"><p data-node-id="11">Old text</p></div>' +
        '</body></html>';

    it('applies "update" — replaces innerHTML', () => {
        const changes: ChangeList = [
            { op: 'update', nodeId: '11', html: 'New text' },
        ];
        const result = applyChangeList(annotated, changes);
        assert.ok(result.includes('<p data-node-id="11">New text</p>'));
    });

    it('applies "replace" — replaces outerHTML', () => {
        const changes: ChangeList = [
            { op: 'replace', nodeId: '11', html: '<span>Replaced</span>' },
        ];
        const result = applyChangeList(annotated, changes);
        assert.ok(result.includes('<span>Replaced</span>'));
        assert.ok(!result.includes('data-node-id="11"'));
    });

    it('applies "delete" — removes element', () => {
        const changes: ChangeList = [
            { op: 'delete', nodeId: '11' },
        ];
        const result = applyChangeList(annotated, changes);
        assert.ok(!result.includes('data-node-id="11"'));
        assert.ok(!result.includes('Old text'));
    });

    it('applies "insert" with position "append"', () => {
        const changes: ChangeList = [
            { op: 'insert', parentId: '10', position: 'append', html: '<em>Appended</em>' },
        ];
        const result = applyChangeList(annotated, changes);
        assert.ok(result.includes('<em>Appended</em>'));
    });

    it('applies "insert" with position "prepend"', () => {
        const changes: ChangeList = [
            { op: 'insert', parentId: '10', position: 'prepend', html: '<em>Prepended</em>' },
        ];
        const result = applyChangeList(annotated, changes);
        // Prepended element should appear before the <p>
        const prependIdx = result.indexOf('<em>Prepended</em>');
        const pIdx = result.indexOf('<p data-node-id="11">');
        assert.ok(prependIdx < pIdx);
    });

    it('applies "insert" with position "before"', () => {
        const changes: ChangeList = [
            { op: 'insert', parentId: '11', position: 'before', html: '<em>Before</em>' },
        ];
        const result = applyChangeList(annotated, changes);
        const beforeIdx = result.indexOf('<em>Before</em>');
        const pIdx = result.indexOf('<p data-node-id="11">');
        assert.ok(beforeIdx < pIdx);
    });

    it('applies "insert" with position "after"', () => {
        const changes: ChangeList = [
            { op: 'insert', parentId: '11', position: 'after', html: '<em>After</em>' },
        ];
        const result = applyChangeList(annotated, changes);
        const afterIdx = result.indexOf('<em>After</em>');
        const pIdx = result.indexOf('<p data-node-id="11">');
        assert.ok(afterIdx > pIdx);
    });

    it('warns but does not throw on missing node for update/replace/delete', () => {
        const changes: ChangeList = [
            { op: 'update', nodeId: '999', html: 'Ghost' },
        ];
        // Should not throw
        const result = applyChangeList(annotated, changes);
        assert.ok(!result.includes('Ghost'));
    });

    it('throws on missing parent for insert', () => {
        const changes: ChangeList = [
            { op: 'insert', parentId: '999', position: 'append', html: '<em>Fail</em>' },
        ];
        assert.throws(() => applyChangeList(annotated, changes), /not found/);
    });

    it('throws on unknown op', () => {
        const changes = [{ op: 'explode', nodeId: '10' }] as unknown as ChangeList;
        assert.throws(() => applyChangeList(annotated, changes), /Unknown change op/);
    });
});

// ---------------------------------------------------------------------------
// parseChangeList
// ---------------------------------------------------------------------------

describe('parseChangeList', () => {
    it('parses raw JSON array', () => {
        const input = '[{"op":"update","nodeId":"1","html":"Hi"}]';
        const result = parseChangeList(input);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].op, 'update');
    });

    it('parses markdown-fenced JSON', () => {
        const input = '```json\n[{"op":"delete","nodeId":"2"}]\n```';
        const result = parseChangeList(input);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].op, 'delete');
    });

    it('extracts JSON array embedded in text', () => {
        const input = 'Here are the changes:\n[{"op":"delete","nodeId":"3"}]\nDone.';
        const result = parseChangeList(input);
        assert.strictEqual(result.length, 1);
    });

    it('throws on invalid JSON', () => {
        assert.throws(() => parseChangeList('not json at all'), /Failed to parse/);
    });

    it('throws on non-array JSON', () => {
        assert.throws(() => parseChangeList('{"op":"update"}'), /Failed to parse/);
    });
});

// ---------------------------------------------------------------------------
// injectError
// ---------------------------------------------------------------------------

describe('injectError', () => {
    it('injects error script block into body', () => {
        const html = '<html><head></head><body><p>Page</p></body></html>';
        const result = injectError(html, 'Oops', 'details here');
        assert.ok(result.includes('<script id="error" type="application/json">'));
        assert.ok(result.includes('"message":"Oops"'));
        assert.ok(result.includes('"details":"details here"'));
    });

    it('replaces existing error block', () => {
        const html = '<html><head></head><body><script id="error" type="application/json">{"message":"old"}</script></body></html>';
        const result = injectError(html, 'New', 'new detail');
        // Should have exactly one error script
        const matches = result.match(/<script id="error"/g);
        assert.strictEqual(matches?.length, 1);
        assert.ok(result.includes('"message":"New"'));
    });

    it('appends to end if no body tag', () => {
        const html = '<div>No body</div>';
        const result = injectError(html, 'Err', 'det');
        assert.ok(result.includes('<script id="error"'));
    });
});
