import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import path from 'path';
import {
    checkIfExists,
    ensureFolderExists,
    saveFile,
    loadFile,
    deleteFile,
    listFiles,
    listFolders,
    copyFile,
    copyFiles,
    copyFolderRecursive,
    deleteFolder,
} from '../src/files';

let tmpDir: string;

beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'synthos-test-'));
});

afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// checkIfExists
// ---------------------------------------------------------------------------

describe('checkIfExists', () => {
    it('returns true for an existing file', async () => {
        const file = path.join(tmpDir, 'exists.txt');
        await fs.writeFile(file, 'hi');
        assert.strictEqual(await checkIfExists(file), true);
    });

    it('returns false for a non-existing file', async () => {
        assert.strictEqual(await checkIfExists(path.join(tmpDir, 'nope.txt')), false);
    });

    it('returns true for an existing directory', async () => {
        assert.strictEqual(await checkIfExists(tmpDir), true);
    });
});

// ---------------------------------------------------------------------------
// ensureFolderExists
// ---------------------------------------------------------------------------

describe('ensureFolderExists', () => {
    it('creates a new folder', async () => {
        const dir = path.join(tmpDir, 'new-folder');
        await ensureFolderExists(dir);
        const stat = await fs.stat(dir);
        assert.ok(stat.isDirectory());
    });

    it('creates nested folders recursively', async () => {
        const dir = path.join(tmpDir, 'a', 'b', 'c');
        await ensureFolderExists(dir);
        const stat = await fs.stat(dir);
        assert.ok(stat.isDirectory());
    });

    it('does not throw if folder already exists', async () => {
        await ensureFolderExists(tmpDir);
    });
});

// ---------------------------------------------------------------------------
// saveFile / loadFile roundtrip
// ---------------------------------------------------------------------------

describe('saveFile / loadFile', () => {
    it('writes and reads back the same content', async () => {
        const file = path.join(tmpDir, 'round.txt');
        await saveFile(file, 'hello world');
        const content = await loadFile(file);
        assert.strictEqual(content, 'hello world');
    });

    it('handles unicode content', async () => {
        const file = path.join(tmpDir, 'unicode.txt');
        const text = '日本語テスト 🎉';
        await saveFile(file, text);
        assert.strictEqual(await loadFile(file), text);
    });
});

// ---------------------------------------------------------------------------
// deleteFile
// ---------------------------------------------------------------------------

describe('deleteFile', () => {
    it('removes an existing file', async () => {
        const file = path.join(tmpDir, 'del.txt');
        await fs.writeFile(file, 'bye');
        await deleteFile(file);
        assert.strictEqual(await checkIfExists(file), false);
    });
});

// ---------------------------------------------------------------------------
// listFiles
// ---------------------------------------------------------------------------

describe('listFiles', () => {
    it('returns files with extensions', async () => {
        await fs.writeFile(path.join(tmpDir, 'a.txt'), '');
        await fs.writeFile(path.join(tmpDir, 'b.json'), '');
        const files = await listFiles(tmpDir);
        assert.ok(files.includes('a.txt'));
        assert.ok(files.includes('b.json'));
    });

    it('filters out dot-files', async () => {
        await fs.writeFile(path.join(tmpDir, '.hidden'), '');
        await fs.writeFile(path.join(tmpDir, 'visible.txt'), '');
        const files = await listFiles(tmpDir);
        assert.ok(!files.includes('.hidden'));
        assert.ok(files.includes('visible.txt'));
    });

    it('filters out directories (no dot in name)', async () => {
        await fs.mkdir(path.join(tmpDir, 'subdir'));
        await fs.writeFile(path.join(tmpDir, 'file.txt'), '');
        const files = await listFiles(tmpDir);
        assert.ok(!files.includes('subdir'));
        assert.ok(files.includes('file.txt'));
    });
});

// ---------------------------------------------------------------------------
// listFolders
// ---------------------------------------------------------------------------

describe('listFolders', () => {
    it('returns only directories', async () => {
        await fs.mkdir(path.join(tmpDir, 'dirA'));
        await fs.mkdir(path.join(tmpDir, 'dirB'));
        await fs.writeFile(path.join(tmpDir, 'file.txt'), '');
        const folders = await listFolders(tmpDir);
        assert.ok(folders.includes('dirA'));
        assert.ok(folders.includes('dirB'));
        assert.ok(!folders.includes('file.txt'));
    });

    it('filters out dot-directories', async () => {
        await fs.mkdir(path.join(tmpDir, '.hidden'));
        await fs.mkdir(path.join(tmpDir, 'visible'));
        const folders = await listFolders(tmpDir);
        assert.ok(!folders.includes('.hidden'));
        assert.ok(folders.includes('visible'));
    });
});

// ---------------------------------------------------------------------------
// copyFile
// ---------------------------------------------------------------------------

describe('copyFile', () => {
    it('copies a file to a destination folder', async () => {
        const src = path.join(tmpDir, 'src.txt');
        const destDir = path.join(tmpDir, 'dest');
        await fs.writeFile(src, 'content');
        await copyFile(src, destDir);
        const copied = await fs.readFile(path.join(destDir, 'src.txt'), 'utf8');
        assert.strictEqual(copied, 'content');
    });

    it('creates the destination folder if it does not exist', async () => {
        const src = path.join(tmpDir, 'src2.txt');
        const destDir = path.join(tmpDir, 'new-dest');
        await fs.writeFile(src, 'data');
        await copyFile(src, destDir);
        assert.strictEqual(await checkIfExists(destDir), true);
    });
});

// ---------------------------------------------------------------------------
// copyFiles
// ---------------------------------------------------------------------------

describe('copyFiles', () => {
    it('copies all files from source to destination folder', async () => {
        const srcDir = path.join(tmpDir, 'src-dir');
        const destDir = path.join(tmpDir, 'dest-dir');
        await fs.mkdir(srcDir);
        await fs.writeFile(path.join(srcDir, 'a.txt'), 'aaa');
        await fs.writeFile(path.join(srcDir, 'b.txt'), 'bbb');

        await copyFiles(srcDir, destDir);

        assert.strictEqual(await fs.readFile(path.join(destDir, 'a.txt'), 'utf8'), 'aaa');
        assert.strictEqual(await fs.readFile(path.join(destDir, 'b.txt'), 'utf8'), 'bbb');
    });
});

// ---------------------------------------------------------------------------
// copyFolderRecursive
// ---------------------------------------------------------------------------

describe('copyFolderRecursive', () => {
    it('copies a folder tree recursively', async () => {
        const srcDir = path.join(tmpDir, 'tree');
        await fs.mkdir(path.join(srcDir, 'sub'), { recursive: true });
        await fs.writeFile(path.join(srcDir, 'root.txt'), 'root');
        await fs.writeFile(path.join(srcDir, 'sub', 'child.txt'), 'child');

        const destDir = path.join(tmpDir, 'tree-copy');
        await copyFolderRecursive(srcDir, destDir);

        assert.strictEqual(await fs.readFile(path.join(destDir, 'root.txt'), 'utf8'), 'root');
        assert.strictEqual(await fs.readFile(path.join(destDir, 'sub', 'child.txt'), 'utf8'), 'child');
    });
});

// ---------------------------------------------------------------------------
// deleteFolder
// ---------------------------------------------------------------------------

describe('deleteFolder', () => {
    it('removes a folder and its contents', async () => {
        const dir = path.join(tmpDir, 'to-delete');
        await fs.mkdir(dir);
        await fs.writeFile(path.join(dir, 'f.txt'), '');
        await deleteFolder(dir);
        assert.strictEqual(await checkIfExists(dir), false);
    });
});
