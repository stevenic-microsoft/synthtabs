import assert from 'assert';
import {
    assignNodeIds,
    stripNodeIds,
    applyChangeList,
    parseChangeList,
    injectError,
    deduplicateInlineScripts,
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

// ---------------------------------------------------------------------------
// deduplicateInlineScripts
// ---------------------------------------------------------------------------

describe('deduplicateInlineScripts', () => {
    it('removes the first of two exact-duplicate inline scripts', () => {
        const script = `let count = 0;\nlet name = "test";\nfunction init() {}\nfunction render() {}`;
        const html = `<html><head></head><body><script>${script}</script><script>${script}</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        // Should keep exactly one script
        const matches = result.match(/<script>/g);
        assert.strictEqual(matches?.length, 1);
        assert.ok(result.includes('function render'));
    });

    it('removes the first script when declarations overlap >= 60%', () => {
        const scriptOld = `let count = 0;\nlet name = "old";\nfunction init() {}\nfunction render() {}\nfunction oldHelper() {}`;
        const scriptNew = `let count = 0;\nlet name = "new";\nfunction init() {}\nfunction render() {}\nfunction newHelper() {}`;
        const html = `<html><head></head><body><script>${scriptOld}</script><script>${scriptNew}</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        const matches = result.match(/<script>/g);
        assert.strictEqual(matches?.length, 1);
        // Should keep the second (newer) script
        assert.ok(result.includes('newHelper'));
        assert.ok(!result.includes('oldHelper'));
    });

    it('preserves both scripts when declarations do not overlap', () => {
        const scriptA = `let alpha = 1;\nlet beta = 2;\nfunction doA() {}`;
        const scriptB = `let gamma = 3;\nlet delta = 4;\nfunction doB() {}`;
        const html = `<html><head></head><body><script>${scriptA}</script><script>${scriptB}</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        const matches = result.match(/<script>/g);
        assert.strictEqual(matches?.length, 2);
    });

    it('never touches scripts with id attribute', () => {
        const script = `let count = 0;\nlet name = "test";\nfunction init() {}\nfunction render() {}`;
        const html = `<html><head></head><body><script id="app">${script}</script><script>${script}</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        // Both should be preserved — the id-script is exempt from dedup
        assert.ok(result.includes('id="app"'));
        const scriptTags = result.match(/<script/g);
        assert.strictEqual(scriptTags?.length, 2);
    });

    it('never touches scripts with src attribute', () => {
        const html = `<html><head></head><body><script src="/app.js"></script><script src="/app.js"></script></body></html>`;
        const result = deduplicateInlineScripts(html);
        const matches = result.match(/<script/g);
        assert.strictEqual(matches?.length, 2);
    });

    it('never touches scripts with type="application/json"', () => {
        const json = `{"key": "value"}`;
        const html = `<html><head></head><body><script type="application/json">${json}</script><script type="application/json">${json}</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        const matches = result.match(/<script/g);
        assert.strictEqual(matches?.length, 2);
    });

    it('does not remove scripts with fewer than 2 declarations', () => {
        const scriptA = `let onlyOne = 1;`;
        const scriptB = `let onlyOne = 1;`;
        const html = `<html><head></head><body><script>${scriptA}</script><script>${scriptB}</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        const matches = result.match(/<script>/g);
        assert.strictEqual(matches?.length, 2);
    });
});

// ---------------------------------------------------------------------------
// deduplicateInlineScripts — ID-based dedup (Pass 1)
// ---------------------------------------------------------------------------

describe('deduplicateInlineScripts — ID-based dedup', () => {
    it('removes the first of two scripts with the same id', () => {
        const html = `<html><head></head><body><script id="app">let x = 1;</script><script id="app">let x = 2;</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        const matches = result.match(/id="app"/g);
        assert.strictEqual(matches?.length, 1);
        assert.ok(result.includes('let x = 2'));
        assert.ok(!result.includes('let x = 1'));
    });

    it('keeps only the last of three scripts with the same id', () => {
        const html = `<html><head></head><body><script id="logic">let v = 1;</script><script id="logic">let v = 2;</script><script id="logic">let v = 3;</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        const matches = result.match(/id="logic"/g);
        assert.strictEqual(matches?.length, 1);
        assert.ok(result.includes('let v = 3'));
        assert.ok(!result.includes('let v = 1'));
        assert.ok(!result.includes('let v = 2'));
    });

    it('preserves scripts with different ids', () => {
        const html = `<html><head></head><body><script id="alpha">let a = 1;</script><script id="beta">let b = 2;</script></body></html>`;
        const result = deduplicateInlineScripts(html);
        assert.ok(result.includes('id="alpha"'));
        assert.ok(result.includes('id="beta"'));
        assert.ok(result.includes('let a = 1'));
        assert.ok(result.includes('let b = 2'));
    });

    it('never removes scripts with system ids even if duplicated', () => {
        const systemIds = ['page-info', 'page-helpers', 'page-script', 'error'];
        for (const sysId of systemIds) {
            const html = `<html><head></head><body><script id="${sysId}">content1</script><script id="${sysId}">content2</script></body></html>`;
            const result = deduplicateInlineScripts(html);
            const matches = result.match(new RegExp(`id="${sysId}"`, 'g'));
            assert.strictEqual(matches?.length, 2, `Expected 2 scripts with id="${sysId}" to be preserved`);
        }
    });
});
