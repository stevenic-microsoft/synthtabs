import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import path from 'path';
import {
    normalizePageName,
    parseMetadata,
    savePageMetadata,
    loadPageMetadata,
    savePageState,
    loadPageState,
    updatePageState,
    listPages,
    deletePage,
    copyPage,
    PAGE_VERSION,
} from '../src/pages';

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

// ---------------------------------------------------------------------------
// Page I/O (temp-dir tests)
// ---------------------------------------------------------------------------

describe('page I/O', () => {
    let tmpDir: string;
    let pagesFolder: string;
    let fallbackFolder: string;

    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'synthos-test-'));
        pagesFolder = path.join(tmpDir, 'synthos');
        fallbackFolder = path.join(tmpDir, 'fallback');
        await fs.mkdir(pagesFolder, { recursive: true });
        await fs.mkdir(fallbackFolder, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    // -- savePageMetadata / loadPageMetadata ---------------------------------

    describe('savePageMetadata / loadPageMetadata', () => {
        it('roundtrips metadata correctly', async () => {
            const meta = {
                title: 'Test Page',
                categories: ['Tools', 'Dev'],
                pinned: true,
                showInAll: true,
                createdDate: '2025-01-01T00:00:00Z',
                lastModified: '2025-06-01T00:00:00Z',
                pageVersion: 2,
                mode: 'locked' as const,
            };
            await savePageMetadata(pagesFolder, 'mypage', meta);
            const loaded = await loadPageMetadata(pagesFolder, 'mypage');
            assert.ok(loaded);
            assert.strictEqual(loaded.title, 'Test Page');
            assert.deepStrictEqual(loaded.categories, ['Tools', 'Dev']);
            assert.strictEqual(loaded.pinned, true);
            assert.strictEqual(loaded.pageVersion, 2);
            assert.strictEqual(loaded.mode, 'locked');
        });

        it('returns undefined when no metadata file exists', async () => {
            const loaded = await loadPageMetadata(pagesFolder, 'nonexistent');
            assert.strictEqual(loaded, undefined);
        });

        it('falls back to fallbackFolder', async () => {
            // Write a fallback JSON file
            await fs.writeFile(
                path.join(fallbackFolder, 'system-page.json'),
                JSON.stringify({ title: 'System', categories: ['System'], pinned: true, pageVersion: 2, mode: 'locked' }),
            );
            const loaded = await loadPageMetadata(pagesFolder, 'system-page', fallbackFolder);
            assert.ok(loaded);
            assert.strictEqual(loaded.title, 'System');
        });
    });

    // -- savePageState / loadPageState ---------------------------------------

    describe('savePageState / loadPageState', () => {
        it('roundtrips page HTML and creates metadata', async () => {
            const html = '<html><body>Hello</body></html>';
            await savePageState(pagesFolder, 'testpage', html, 'Test Title', ['Cat']);
            const loaded = await loadPageState(pagesFolder, 'testpage', true);
            assert.strictEqual(loaded, html);

            // Metadata should have been created
            const meta = await loadPageMetadata(pagesFolder, 'testpage');
            assert.ok(meta);
            assert.strictEqual(meta.pageVersion, PAGE_VERSION);
        });

        it('returns undefined for non-existent page', async () => {
            const loaded = await loadPageState(pagesFolder, 'nope', false);
            assert.strictEqual(loaded, undefined);
        });

        it('with reset=true re-reads from disk', async () => {
            const html1 = '<html>v1</html>';
            const html2 = '<html>v2</html>';
            await savePageState(pagesFolder, 'resetpage', html1);
            // First load
            const first = await loadPageState(pagesFolder, 'resetpage', false);
            assert.strictEqual(first, html1);

            // Overwrite the file on disk directly
            const pageHtmlPath = path.join(pagesFolder, 'pages', 'resetpage', 'page.html');
            await fs.writeFile(pageHtmlPath, html2);

            // Without reset, should return cached version
            const cached = await loadPageState(pagesFolder, 'resetpage', false);
            assert.strictEqual(cached, html1);

            // With reset, should re-read
            const refreshed = await loadPageState(pagesFolder, 'resetpage', true);
            assert.strictEqual(refreshed, html2);
        });
    });

    // -- updatePageState -----------------------------------------------------

    describe('updatePageState', () => {
        it('updates in-memory cache', async () => {
            await savePageState(pagesFolder, 'cachepage', '<html>original</html>');
            await loadPageState(pagesFolder, 'cachepage', false);

            updatePageState('cachepage', '<html>updated</html>');

            // Loading without reset should return updated cache
            const loaded = await loadPageState(pagesFolder, 'cachepage', false);
            assert.strictEqual(loaded, '<html>updated</html>');
        });
    });

    // -- listPages -----------------------------------------------------------

    describe('listPages', () => {
        it('lists folder-based pages', async () => {
            await savePageState(pagesFolder, 'alpha', '<html>A</html>');
            await savePageState(pagesFolder, 'beta', '<html>B</html>');
            const pages = await listPages(pagesFolder, fallbackFolder);
            const names = pages.map(p => p.name);
            assert.ok(names.includes('alpha'));
            assert.ok(names.includes('beta'));
        });

        it('lists legacy flat HTML files', async () => {
            await fs.writeFile(path.join(pagesFolder, 'legacy.html'), '<html>Legacy</html>');
            const pages = await listPages(pagesFolder, fallbackFolder);
            const legacy = pages.find(p => p.name === 'legacy');
            assert.ok(legacy);
            assert.strictEqual(legacy.pageVersion, 1);
        });

        it('lists fallback (required) pages', async () => {
            await fs.writeFile(path.join(fallbackFolder, 'builder.html'), '<html>Builder</html>');
            const pages = await listPages(pagesFolder, fallbackFolder);
            const builder = pages.find(p => p.name === 'builder');
            assert.ok(builder);
        });

        it('returns pages sorted alphabetically', async () => {
            await savePageState(pagesFolder, 'zebra', '<html></html>');
            await savePageState(pagesFolder, 'apple', '<html></html>');
            const pages = await listPages(pagesFolder, fallbackFolder);
            const names = pages.map(p => p.name);
            const sortedNames = [...names].sort();
            assert.deepStrictEqual(names, sortedNames);
        });
    });

    // -- deletePage ----------------------------------------------------------

    describe('deletePage', () => {
        it('removes folder-based page and clears cache', async () => {
            await savePageState(pagesFolder, 'doomed', '<html>bye</html>');
            await loadPageState(pagesFolder, 'doomed', false);

            await deletePage(pagesFolder, 'doomed');

            // Folder should be gone
            const folderExists = await fs.access(path.join(pagesFolder, 'pages', 'doomed'))
                .then(() => true).catch(() => false);
            assert.strictEqual(folderExists, false);

            // Cache should be cleared — loading should return undefined
            const loaded = await loadPageState(pagesFolder, 'doomed', true);
            assert.strictEqual(loaded, undefined);
        });
    });

    // -- copyPage ------------------------------------------------------------

    describe('copyPage', () => {
        it('copies HTML and creates metadata with correct title/categories', async () => {
            await savePageState(pagesFolder, 'source', '<html>Source</html>');
            await copyPage(pagesFolder, 'source', 'target', 'Copied Page', ['Copy'], fallbackFolder);

            const html = await loadPageState(pagesFolder, 'target', true);
            assert.strictEqual(html, '<html>Source</html>');

            const meta = await loadPageMetadata(pagesFolder, 'target');
            assert.ok(meta);
            assert.strictEqual(meta.title, 'Copied Page');
            assert.deepStrictEqual(meta.categories, ['Copy']);
            assert.strictEqual(meta.pageVersion, PAGE_VERSION);
        });

        it('throws when source page does not exist', async () => {
            await assert.rejects(
                () => copyPage(pagesFolder, 'ghost', 'target', 'T', [], fallbackFolder),
                /Source page "ghost" not found/,
            );
        });

        it('copies from required pages folder as fallback', async () => {
            await fs.writeFile(path.join(fallbackFolder, 'system.html'), '<html>System</html>');
            await copyPage(pagesFolder, 'system', 'mycopy', 'My Copy', ['User'], fallbackFolder);

            const html = await loadPageState(pagesFolder, 'mycopy', true);
            assert.strictEqual(html, '<html>System</html>');
        });
    });
});
