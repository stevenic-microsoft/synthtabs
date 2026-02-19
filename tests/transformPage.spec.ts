import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import path from 'path';
import {
    assignNodeIds,
    stripNodeIds,
    applyChangeList,
    parseChangeList,
    injectError,
    deduplicateInlineScripts,
    transformPage,
    ChangeList,
    TransformPageArgs,
} from '../src/service/transformPage';
import { AgentCompletion, PromptCompletionArgs } from '../src/models/types';

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

    it('assigns data-node-id to script and style elements', () => {
        const html = '<html><head><style>.a{color:red}</style><script>var x=1;</script></head><body><script src="/app.js"></script></body></html>';
        const { html: result, nodeCount } = assignNodeIds(html);
        // All 6 elements should have ids: html, head, style, script(inline), body, script(src)
        const ids = result.match(/data-node-id="/g);
        assert.strictEqual(ids?.length, nodeCount);
        assert.strictEqual(nodeCount, 6);
        // Verify the style and script tags specifically got ids
        assert.ok(result.match(/<style[^>]+data-node-id="/), 'style element should have data-node-id');
        assert.ok(result.match(/<script[^>]+data-node-id="/), 'script element should have data-node-id');
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

    it('applies "style-element" — sets style attribute on unlocked element', () => {
        const changes: ChangeList = [
            { op: 'style-element', nodeId: '11', style: 'color: red; font-size: 16px' },
        ];
        const result = applyChangeList(annotated, changes);
        assert.ok(result.includes('style="color: red; font-size: 16px"'));
        assert.ok(result.includes('data-node-id="11"'));
    });

    it('skips "style-element" on a data-locked element', () => {
        const lockedHtml = '<html><head></head><body>' +
            '<div data-node-id="10"><p data-node-id="11" data-locked>Locked text</p></div>' +
            '</body></html>';
        const changes: ChangeList = [
            { op: 'style-element', nodeId: '11', style: 'color: red' },
        ];
        const result = applyChangeList(lockedHtml, changes);
        assert.ok(!result.includes('style="color: red"'));
    });

    it('warns but does not throw on missing node for style-element', () => {
        const changes: ChangeList = [
            { op: 'style-element', nodeId: '999', style: 'color: red' },
        ];
        const result = applyChangeList(annotated, changes);
        assert.ok(!result.includes('color: red'));
    });

    it('allows delete of unlocked child inside a data-locked parent', () => {
        const lockedParentHtml = '<html><head></head><body>' +
            '<div data-node-id="10" data-locked="true">' +
            '<p data-node-id="11">Child message</p>' +
            '<p data-node-id="12">Another child</p>' +
            '</div></body></html>';
        const changes: ChangeList = [
            { op: 'delete', nodeId: '11' },
        ];
        const result = applyChangeList(lockedParentHtml, changes);
        assert.ok(!result.includes('Child message'));
        assert.ok(result.includes('Another child'));
    });

    it('blocks delete of element that itself has data-locked', () => {
        const lockedHtml = '<html><head></head><body>' +
            '<div data-node-id="10"><p data-node-id="11" data-locked="true">Locked</p></div>' +
            '</body></html>';
        const changes: ChangeList = [
            { op: 'delete', nodeId: '11' },
        ];
        const result = applyChangeList(lockedHtml, changes);
        assert.ok(result.includes('Locked'));
    });

    it('allows replace of unlocked child inside a data-locked parent', () => {
        const lockedParentHtml = '<html><head></head><body>' +
            '<div data-node-id="10" data-locked="true">' +
            '<p data-node-id="11">Old child</p>' +
            '</div></body></html>';
        const changes: ChangeList = [
            { op: 'replace', nodeId: '11', html: '<span>New child</span>' },
        ];
        const result = applyChangeList(lockedParentHtml, changes);
        assert.ok(result.includes('<span>New child</span>'));
        assert.ok(!result.includes('Old child'));
    });

    it('warns but does not throw on missing node for replace', () => {
        const changes: ChangeList = [
            { op: 'replace', nodeId: '999', html: '<span>Ghost</span>' },
        ];
        const result = applyChangeList(annotated, changes);
        assert.ok(!result.includes('Ghost'));
    });

    it('skips replace on a data-locked element', () => {
        const lockedHtml = '<html><head></head><body>' +
            '<div data-node-id="10"><p data-node-id="11" data-locked>Locked</p></div>' +
            '</body></html>';
        const changes: ChangeList = [
            { op: 'replace', nodeId: '11', html: '<span>Replaced</span>' },
        ];
        const result = applyChangeList(lockedHtml, changes);
        assert.ok(result.includes('Locked'));
        assert.ok(!result.includes('Replaced'));
    });

    it('warns but does not throw on missing node for delete', () => {
        const changes: ChangeList = [
            { op: 'delete', nodeId: '999' },
        ];
        const result = applyChangeList(annotated, changes);
        // Should not throw, original content preserved
        assert.ok(result.includes('Old text'));
    });

    it('throws on unknown insert position', () => {
        const changes = [
            { op: 'insert', parentId: '10', position: 'sideways', html: '<em>Oops</em>' },
        ] as unknown as ChangeList;
        assert.throws(() => applyChangeList(annotated, changes), /unknown position/);
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

// ---------------------------------------------------------------------------
// transformPage (integration with stub completePrompt)
// ---------------------------------------------------------------------------

describe('transformPage', () => {
    let tmpDir: string;

    // Minimal page with a viewer-panel and thoughts div
    const testPage = `<html><head></head><body>
        <div class="chat-panel" data-locked>
            <div id="chatMessages"><div class="chat-message"><p><strong>SynthOS:</strong> Welcome!</p></div></div>
        </div>
        <div class="viewer-panel"><p id="content">Hello world</p></div>
        <div id="thoughts" style="display: none;"></div>
    </body></html>`;

    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'synthos-tp-test-'));
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    /** Extract the data-node-id for an element identified by a CSS-style attribute (e.g. id="content") from annotated HTML. */
    function findNodeId(annotatedHtml: string, idAttr: string): string {
        // Match a tag that contains both data-node-id="X" and the target id, in either order
        const pattern1 = new RegExp(`data-node-id="(\\d+)"[^>]*${idAttr}`);
        const pattern2 = new RegExp(`${idAttr}[^>]*data-node-id="(\\d+)"`);
        const m = annotatedHtml.match(pattern1) || annotatedHtml.match(pattern2);
        return m ? m[1] : '99999';
    }

    function makeArgs(stub: (args: PromptCompletionArgs) => Promise<AgentCompletion<string>>, pageState?: string): TransformPageArgs {
        return {
            completePrompt: stub,
            pagesFolder: tmpDir,
            pageState: pageState ?? testPage,
            message: 'Change the content',
        };
    }

    it('happy path — applies valid change list and returns transformed HTML', async () => {
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            const sys = args.system?.content ?? '';
            const nodeId = findNodeId(sys, 'id="content"');
            return {
                completed: true,
                value: JSON.stringify([
                    { op: 'update', nodeId, html: 'Updated content' },
                ]),
            };
        };

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, true);
        assert.ok(result.value);
        assert.ok(result.value.html.includes('Updated content'));
        assert.strictEqual(result.value.changeCount, 1);
        // Should not contain data-node-id attributes
        assert.ok(!result.value.html.includes('data-node-id'));
    });

    it('returns error when completePrompt fails', async () => {
        const stub = async (): Promise<AgentCompletion<string>> => ({
            completed: false,
            error: new Error('API quota exceeded'),
        });

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, false);
        assert.strictEqual(result.error?.message, 'API quota exceeded');
    });

    it('injects error block when response is not valid JSON', async () => {
        const stub = async (): Promise<AgentCompletion<string>> => ({
            completed: true,
            value: 'I cannot help with that request.',
        });

        const result = await transformPage(makeArgs(stub));
        // Should still complete (error is injected into HTML, not thrown)
        assert.strictEqual(result.completed, true);
        assert.ok(result.value);
        assert.strictEqual(result.value.changeCount, 0);
        assert.ok(result.value.html.includes('id="error"'));
    });

    it('handles failed ops and triggers repair pass', async () => {
        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            const sys = args.system?.content ?? '';
            if (callCount === 1) {
                const contentNodeId = findNodeId(sys, 'id="content"');
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'update', nodeId: contentNodeId, html: 'First pass change' },
                        { op: 'update', nodeId: '9999', html: 'Ghost node' }, // will fail
                    ]),
                };
            } else {
                // Repair call: target an element that exists in re-annotated HTML
                const thoughtsNodeId = findNodeId(sys, 'id="thoughts"');
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'update', nodeId: thoughtsNodeId, html: 'Repaired content' },
                    ]),
                };
            }
        };

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, true);
        assert.ok(result.value);
        // Should have made 2 calls (initial + repair)
        assert.strictEqual(callCount, 2);
        // changeCount should be 2 (1 success from first pass + 1 from repair)
        assert.strictEqual(result.value.changeCount, 2);
    });

    it('keeps partial result when repair pass LLM call fails', async () => {
        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            if (callCount === 1) {
                const sys = args.system?.content ?? '';
                const contentNodeId = findNodeId(sys, 'id="content"');
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'update', nodeId: contentNodeId, html: 'Partial update' },
                        { op: 'update', nodeId: '9999', html: 'Ghost' },
                    ]),
                };
            } else {
                // Repair call fails
                return { completed: false, error: new Error('Repair failed') };
            }
        };

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, true);
        assert.ok(result.value);
        assert.ok(result.value.html.includes('Partial update'));
        assert.strictEqual(result.value.changeCount, 1);
    });

    it('handles repair pass returning empty array (no repairs needed)', async () => {
        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            if (callCount === 1) {
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'update', nodeId: '9999', html: 'Ghost' },
                    ]),
                };
            } else {
                return { completed: true, value: '[]' };
            }
        };

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, true);
        assert.strictEqual(callCount, 2);
    });

    it('includes instructions and modelInstructions in prompt', async () => {
        let capturedPrompt: string | undefined;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            capturedPrompt = args.prompt.content;
            return { completed: true, value: '[]' };
        };

        await transformPage({
            ...makeArgs(stub),
            instructions: 'Be creative',
            modelInstructions: 'Return concise JSON',
        });

        assert.ok(capturedPrompt);
        assert.ok(capturedPrompt.includes('Be creative'));
        assert.ok(capturedPrompt.includes('Return concise JSON'));
    });

    it('includes theme info in system prompt when provided', async () => {
        let capturedSystem: string | undefined;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            capturedSystem = args.system?.content;
            return { completed: true, value: '[]' };
        };

        await transformPage({
            ...makeArgs(stub),
            themeInfo: {
                mode: 'dark',
                colors: { 'accent-primary': '#ff0000', 'text-primary': '#ffffff' },
            },
        });

        assert.ok(capturedSystem);
        assert.ok(capturedSystem.includes('Mode: dark'));
        assert.ok(capturedSystem.includes('--accent-primary: #ff0000'));
    });

    it('includes connector info in system prompt when provided', async () => {
        let capturedSystem: string | undefined;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            capturedSystem = args.system?.content;
            return { completed: true, value: '[]' };
        };

        await transformPage({
            ...makeArgs(stub),
            configuredConnectors: {
                'brave-search': { enabled: true, apiKey: 'test-key' } as any,
            },
        });

        assert.ok(capturedSystem);
        assert.ok(capturedSystem.includes('CONFIGURED_CONNECTORS'));
    });

    it('includes agent info in system prompt when provided', async () => {
        let capturedSystem: string | undefined;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            capturedSystem = args.system?.content;
            return { completed: true, value: '[]' };
        };

        await transformPage({
            ...makeArgs(stub),
            configuredAgents: [{
                id: 'test-agent',
                name: 'Test Agent',
                description: 'A test agent',
                url: 'http://localhost:3000',
                enabled: true,
                provider: 'a2a' as any,
            }],
        });

        assert.ok(capturedSystem);
        assert.ok(capturedSystem.includes('CONFIGURED_AGENTS'));
        assert.ok(capturedSystem.includes('Test Agent'));
    });

    it('includes agent capabilities and skills in system prompt', async () => {
        let capturedSystem: string | undefined;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            capturedSystem = args.system?.content;
            return { completed: true, value: '[]' };
        };

        await transformPage({
            ...makeArgs(stub),
            configuredAgents: [{
                id: 'agent-1',
                name: 'Streaming Agent',
                description: 'Agent with streaming',
                url: 'http://localhost:3000',
                enabled: true,
                provider: 'a2a',
                capabilities: { streaming: true },
                skills: [
                    { id: 'summarize', name: 'summarize', description: 'Summarizes text', tags: [] },
                ],
            }],
        });

        assert.ok(capturedSystem);
        assert.ok(capturedSystem.includes('Supports streaming: yes'));
        assert.ok(capturedSystem.includes('summarize'));
        assert.ok(capturedSystem.includes('Summarizes text'));
    });

    it('exercises replace, delete, insert, and style-element ops through pipeline', async () => {
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            const sys = args.system?.content ?? '';
            const contentNodeId = findNodeId(sys, 'id="content"');
            const viewerNodeId = findNodeId(sys, 'class="viewer-panel"');
            return {
                completed: true,
                value: JSON.stringify([
                    { op: 'replace', nodeId: contentNodeId, html: '<p id="content">Replaced</p>' },
                    { op: 'insert', parentId: viewerNodeId, position: 'append', html: '<span>Appended</span>' },
                    { op: 'style-element', nodeId: viewerNodeId, style: 'background: blue' },
                ]),
            };
        };

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, true);
        assert.ok(result.value);
        assert.ok(result.value.html.includes('Replaced'));
        assert.ok(result.value.html.includes('Appended'));
        assert.ok(result.value.html.includes('background: blue'));
        assert.strictEqual(result.value.changeCount, 3);
    });

    it('reports failed replace on locked element and triggers repair', async () => {
        // Use a page where the content is data-locked
        const lockedPage = `<html><head></head><body>
            <div class="chat-panel" data-locked>
                <div id="chatMessages"><div class="chat-message"><p><strong>SynthOS:</strong> Welcome!</p></div></div>
            </div>
            <div class="viewer-panel"><p id="content" data-locked>Locked content</p></div>
            <div id="thoughts" style="display: none;"></div>
        </body></html>`;

        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            const sys = args.system?.content ?? '';
            if (callCount === 1) {
                const contentNodeId = findNodeId(sys, 'id="content"');
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'replace', nodeId: contentNodeId, html: '<p>Should fail</p>' },
                    ]),
                };
            } else {
                // Repair: return empty array (nothing to fix)
                return { completed: true, value: '[]' };
            }
        };

        const result = await transformPage(makeArgs(stub, lockedPage));
        assert.strictEqual(result.completed, true);
        assert.strictEqual(callCount, 2);
        // Original locked content should still be present
        assert.ok(result.value!.html.includes('Locked content'));
    });

    it('handles repair pass that throws an error', async () => {
        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            if (callCount === 1) {
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'update', nodeId: '9999', html: 'Ghost' },
                    ]),
                };
            } else {
                // Repair call returns invalid JSON that will cause parseChangeList to throw
                return { completed: true, value: 'not valid json at all' };
            }
        };

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, true);
        assert.strictEqual(callCount, 2);
        // Should have kept partial result from first pass
        assert.ok(result.value);
    });

    it('reports failed insert on missing parent through pipeline', async () => {
        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            if (callCount === 1) {
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'insert', parentId: '9999', position: 'append', html: '<span>Ghost</span>' },
                    ]),
                };
            } else {
                return { completed: true, value: '[]' };
            }
        };

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, true);
        assert.strictEqual(callCount, 2);
    });

    it('reports failed delete on locked element through pipeline', async () => {
        const lockedPage = `<html><head></head><body>
            <div class="chat-panel" data-locked>
                <div id="chatMessages"><div class="chat-message"><p><strong>SynthOS:</strong> Welcome!</p></div></div>
            </div>
            <div class="viewer-panel"><p id="content" data-locked>Locked</p></div>
            <div id="thoughts" style="display: none;"></div>
        </body></html>`;

        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            const sys = args.system?.content ?? '';
            if (callCount === 1) {
                const contentNodeId = findNodeId(sys, 'id="content"');
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'delete', nodeId: contentNodeId },
                    ]),
                };
            } else {
                return { completed: true, value: '[]' };
            }
        };

        const result = await transformPage(makeArgs(stub, lockedPage));
        assert.strictEqual(result.completed, true);
        assert.ok(result.value!.html.includes('Locked'));
    });

    it('reports failed style-element on locked element through pipeline', async () => {
        const lockedPage = `<html><head></head><body>
            <div class="chat-panel" data-locked>
                <div id="chatMessages"><div class="chat-message"><p><strong>SynthOS:</strong> Welcome!</p></div></div>
            </div>
            <div class="viewer-panel"><p id="content" data-locked>Styled</p></div>
            <div id="thoughts" style="display: none;"></div>
        </body></html>`;

        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            const sys = args.system?.content ?? '';
            if (callCount === 1) {
                const contentNodeId = findNodeId(sys, 'id="content"');
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'style-element', nodeId: contentNodeId, style: 'color: red' },
                    ]),
                };
            } else {
                return { completed: true, value: '[]' };
            }
        };

        const result = await transformPage(makeArgs(stub, lockedPage));
        assert.strictEqual(result.completed, true);
        // Locked element should not have the style applied
        assert.ok(!result.value!.html.includes('color: red'));
    });

    it('repair pass with remaining failures keeps partial result', async () => {
        let callCount = 0;
        const stub = async (args: PromptCompletionArgs): Promise<AgentCompletion<string>> => {
            callCount++;
            if (callCount === 1) {
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'update', nodeId: '9999', html: 'Ghost' },
                    ]),
                };
            } else {
                // Repair also fails — targets non-existent node
                return {
                    completed: true,
                    value: JSON.stringify([
                        { op: 'update', nodeId: '8888', html: 'Still ghost' },
                    ]),
                };
            }
        };

        const result = await transformPage(makeArgs(stub));
        assert.strictEqual(result.completed, true);
        assert.strictEqual(callCount, 2);
    });
});
