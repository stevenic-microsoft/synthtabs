import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import path from 'path';
import { composeArguments } from '../src/scripts';
import { listScripts, clearCachedScripts, executeScript } from '../src/scripts';

let tmpDir: string;

beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'synthos-scripts-test-'));
});

afterEach(async () => {
    clearCachedScripts();
    await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// composeArguments
// ---------------------------------------------------------------------------

describe('composeArguments', () => {
    it('substitutes {{var}} with variable value', () => {
        const result = composeArguments('echo {{name}}', { name: 'world' });
        assert.strictEqual(result, 'echo world');
    });

    it('handles multiple variables', () => {
        const result = composeArguments('{{a}} and {{b}}', { a: 'X', b: 'Y' });
        assert.strictEqual(result, 'X and Y');
    });

    it('replaces missing vars with empty string', () => {
        const result = composeArguments('hello {{missing}}!', {});
        assert.strictEqual(result, 'hello !');
    });

    it('handles spaces inside braces', () => {
        const result = composeArguments('{{ name }}', { name: 'trimmed' });
        assert.strictEqual(result, 'trimmed');
    });

    it('converts object values to JSON strings', () => {
        const result = composeArguments('data: {{obj}}', { obj: { key: 'val' } });
        assert.strictEqual(result, 'data: {"key":"val"}');
    });

    it('converts number values to strings', () => {
        const result = composeArguments('count: {{n}}', { n: 42 });
        assert.strictEqual(result, 'count: 42');
    });
});

// ---------------------------------------------------------------------------
// listScripts
// ---------------------------------------------------------------------------

describe('listScripts', () => {
    it('returns formatted script list from JSON files', async () => {
        const scriptsDir = path.join(tmpDir, 'pages', 'scripts', 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });

        const script = {
            id: 'test-script',
            type: 'command',
            command: 'echo hello',
            description: 'A test script',
            variables: 'name: string',
            response: 'string',
        };
        await fs.writeFile(path.join(scriptsDir, 'test-script.json'), JSON.stringify(script));

        const result = await listScripts(tmpDir);
        assert.ok(result.includes('POST /api/scripts/test-script'));
        assert.ok(result.includes('description: A test script'));
        assert.ok(result.includes('request: name: string'));
        assert.ok(result.includes('response: string'));
    });

    it('caches results on second call', async () => {
        const scriptsDir = path.join(tmpDir, 'pages', 'scripts', 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });

        const script = { id: 'cached', type: 'command', command: 'echo cached' };
        await fs.writeFile(path.join(scriptsDir, 'cached.json'), JSON.stringify(script));

        const first = await listScripts(tmpDir);
        // Add another file — should NOT appear due to caching
        const script2 = { id: 'new', type: 'command', command: 'echo new' };
        await fs.writeFile(path.join(scriptsDir, 'new.json'), JSON.stringify(script2));
        const second = await listScripts(tmpDir);

        assert.strictEqual(first, second);
        assert.ok(!second.includes('new'));
    });

    it('returns empty string when scripts folder does not exist', async () => {
        const result = await listScripts(tmpDir);
        assert.strictEqual(result, '');
    });
});

// ---------------------------------------------------------------------------
// clearCachedScripts
// ---------------------------------------------------------------------------

describe('clearCachedScripts', () => {
    it('invalidates cache so next listScripts re-reads from disk', async () => {
        const scriptsDir = path.join(tmpDir, 'pages', 'scripts', 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });

        const script = { id: 'original', type: 'command', command: 'echo original' };
        await fs.writeFile(path.join(scriptsDir, 'original.json'), JSON.stringify(script));

        const first = await listScripts(tmpDir);
        assert.ok(first.includes('original'));

        clearCachedScripts();

        // Add a new script
        const script2 = { id: 'added', type: 'command', command: 'echo added' };
        await fs.writeFile(path.join(scriptsDir, 'added.json'), JSON.stringify(script2));

        const second = await listScripts(tmpDir);
        assert.ok(second.includes('added'));
    });
});

// ---------------------------------------------------------------------------
// executeScript
// ---------------------------------------------------------------------------

describe('executeScript', () => {
    it('executes a simple command and returns output', async () => {
        const scriptsDir = path.join(tmpDir, 'pages', 'scripts', 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });

        const script = { id: 'hello', type: 'command', command: 'node -e "console.log(\'hello\')"' };
        await fs.writeFile(path.join(scriptsDir, 'hello.json'), JSON.stringify(script));

        const result = await executeScript({
            pagesFolder: tmpDir,
            scriptId: 'hello',
            variables: {},
        });

        assert.strictEqual(result.completed, true);
        assert.ok(result.value!.output.includes('hello'));
    });

    it('throws on missing script file', async () => {
        await assert.rejects(
            () => executeScript({
                pagesFolder: tmpDir,
                scriptId: 'nonexistent',
                variables: {},
            }),
            /ENOENT/,
        );
    });

    it('returns error for invalid JSON', async () => {
        const scriptsDir = path.join(tmpDir, 'pages', 'scripts', 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });
        await fs.writeFile(path.join(scriptsDir, 'bad.json'), 'not valid json{{{');

        const result = await executeScript({
            pagesFolder: tmpDir,
            scriptId: 'bad',
            variables: {},
        });
        assert.strictEqual(result.completed, false);
        assert.ok(result.error);
    });

    it('returns error for empty command', async () => {
        const scriptsDir = path.join(tmpDir, 'pages', 'scripts', 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });

        const script = { id: 'empty', type: 'command', command: '' };
        await fs.writeFile(path.join(scriptsDir, 'empty.json'), JSON.stringify(script));

        const result = await executeScript({
            pagesFolder: tmpDir,
            scriptId: 'empty',
            variables: {},
        });
        assert.strictEqual(result.completed, false);
        assert.ok(result.error?.message.includes('No command'));
    });

    it('substitutes variables in the command', async () => {
        const scriptsDir = path.join(tmpDir, 'pages', 'scripts', 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });

        const script = { id: 'greet', type: 'command', command: 'node -e "console.log(\'{{msg}}\')"' };
        await fs.writeFile(path.join(scriptsDir, 'greet.json'), JSON.stringify(script));

        const result = await executeScript({
            pagesFolder: tmpDir,
            scriptId: 'greet',
            variables: { msg: 'hi there' },
        });

        assert.strictEqual(result.completed, true);
        assert.ok(result.value!.output.includes('hi there'));
    });
});
