import {checkIfExists, deleteFile, deleteFolder, ensureFolderExists, listFiles, listFolders, loadFile, saveFile} from './files';
import path from 'path';

// Page State Cache
const _pages: { [name: string]: string } = {};

export const REQUIRED_PAGES = ['builder', 'pages', 'tabs', 'settings', 'apis', 'scripts'];

export const PAGE_VERSION = 2;

export interface PageInfo {
    name: string;
    title: string;
    categories: string[];
    pinned: boolean;
    showInAll: boolean;    // true = visible in "All" filter, false = only in category filters
    createdDate: string;   // ISO 8601, empty string if unknown
    lastModified: string;  // ISO 8601, empty string if unknown
    pageVersion: number;   // integer, 0 = pre-versioning
    mode: 'unlocked' | 'locked';
}

export type PageMetadata = Omit<PageInfo, 'name'>;

export async function loadPageMetadata(pagesFolder: string, name: string, fallbackFolder?: string): Promise<PageMetadata | undefined> {
    // 1. Try user override: <localFolder>/pages/<name>/page.json
    const metadataPath = path.join(pagesFolder, 'pages', name, 'page.json');
    if (await checkIfExists(metadataPath)) {
        try {
            const raw = await loadFile(metadataPath);
            const parsed = JSON.parse(raw);
            return parseMetadata(parsed);
        } catch {
            // fall through
        }
    }

    // 2. Try fallback: fallbackFolder/<name>.json
    if (fallbackFolder) {
        const fallbackPath = path.join(fallbackFolder, `${name}.json`);
        if (await checkIfExists(fallbackPath)) {
            try {
                const raw = await loadFile(fallbackPath);
                const parsed = JSON.parse(raw);
                return parseMetadata(parsed);
            } catch {
                // fall through
            }
        }
    }

    return undefined;
}

export function parseMetadata(parsed: Record<string, unknown>): PageMetadata {
    return {
        title: typeof parsed.title === 'string' ? parsed.title : '',
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        pinned: typeof parsed.pinned === 'boolean' ? parsed.pinned : false,
        showInAll: typeof parsed.showInAll === 'boolean' ? parsed.showInAll : true,
        createdDate: typeof parsed.createdDate === 'string' ? parsed.createdDate : '',
        lastModified: typeof parsed.lastModified === 'string' ? parsed.lastModified : '',
        pageVersion: typeof parsed.pageVersion === 'number' ? parsed.pageVersion
            : typeof parsed.uxVersion === 'number' ? parsed.uxVersion : 0,
        mode: parsed.mode === 'locked' ? 'locked' : 'unlocked',
    };
}

export async function savePageMetadata(pagesFolder: string, name: string, metadata: PageMetadata): Promise<void> {
    const pageFolder = path.join(pagesFolder, 'pages', name);
    await ensureFolderExists(pageFolder);
    await saveFile(path.join(pageFolder, 'page.json'), JSON.stringify(metadata, null, 4));
}

const DEFAULT_METADATA: PageMetadata = {
    title: '',
    categories: [],
    pinned: false,
    showInAll: true,
    createdDate: '',
    lastModified: '',
    pageVersion: 0,
    mode: 'unlocked',
};

export async function listPages(pagesFolder: string, fallbackPagesFolder: string): Promise<PageInfo[]> {
    const pageMap = new Map<string, PageInfo>();

    // Folder-based pages under pages/ subdirectory
    const pagesSubdir = path.join(pagesFolder, 'pages');
    if (await checkIfExists(pagesSubdir)) {
        const folders = await listFolders(pagesSubdir);
        for (const folder of folders) {
            if (await checkIfExists(path.join(pagesSubdir, folder, 'page.html'))) {
                const metadata = await loadPageMetadata(pagesFolder, folder);
                pageMap.set(folder, {
                    name: folder,
                    ...(metadata ?? DEFAULT_METADATA),
                });
            }
        }
    }

    // Legacy flat .html files in root (v1 pages)
    const flatFiles = (await listFiles(pagesFolder)).filter(file => file.endsWith('.html'));
    for (const file of flatFiles) {
        const name = file.replace(/\.html$/, '');
        if (!pageMap.has(name)) {
            // Derive title: strip brackets, replace underscores with spaces, title-case
            const stripped = name.replace(/^\[/, '').replace(/\]$/, '');
            const title = stripped
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
            // Assign category: bracketed names → "Builder", otherwise → "Page"
            const hasBrackets = name.startsWith('[') && name.endsWith(']');
            const categories = hasBrackets ? ['Builder'] : ['Page'];
            pageMap.set(name, {
                name,
                title,
                categories,
                pinned: false,
                showInAll: true,
                createdDate: '',
                lastModified: '',
                pageVersion: 1,
                mode: 'unlocked',
            });
        }
    }

    // Add pages from fallback (required) pages folder
    const fallbackFiles = (await listFiles(fallbackPagesFolder)).filter(file => file.endsWith('.html'));
    for (const file of fallbackFiles) {
        const name = file.replace(/\.html$/, '');
        if (!pageMap.has(name)) {
            // System page not yet in map — check for user override, then fallback .json
            const metadata = await loadPageMetadata(pagesFolder, name, fallbackPagesFolder);
            pageMap.set(name, {
                name,
                title: metadata?.title ?? '',
                categories: metadata?.categories ?? ['System'],
                pinned: metadata?.pinned ?? true,
                showInAll: metadata?.showInAll ?? true,
                createdDate: metadata?.createdDate ?? '',
                lastModified: metadata?.lastModified ?? '',
                pageVersion: metadata?.pageVersion ?? 0,
                mode: metadata?.mode ?? 'unlocked',
            });
        }
    }

    // Sort alphabetically
    const entries = Array.from(pageMap.values());
    entries.sort((a, b) => a.name.localeCompare(b.name));

    return entries;
}

export async function loadPageState(pagesFolder: string, name: string, reset: boolean): Promise<string|undefined> {
    if (!_pages[name] || reset) {
        // Try folder-based path under pages/ first, then fall back to flat file
        const folderPath = path.join(pagesFolder, 'pages', name, 'page.html');
        const flatPath = path.join(pagesFolder, `${name}.html`);

        if (await checkIfExists(folderPath)) {
            _pages[name] = await loadFile(folderPath);
        } else if (await checkIfExists(flatPath)) {
            _pages[name] = await loadFile(flatPath);
        } else {
            return undefined;
        }
    }

    return _pages[name];
}

export function normalizePageName(name: string|undefined): string|undefined {
    return typeof name == 'string' && name.length > 0 ? name.replace(/[^a-z0-9\-_\[\]\(\)\{\}@#\$%&]/gi, '_').toLowerCase() : undefined;
}

export async function savePageState(pagesFolder: string, name: string, content: string, title?: string, categories?: string[]): Promise<void> {
    _pages[name] = content;
    const pageFolder = path.join(pagesFolder, 'pages', name);
    await ensureFolderExists(pageFolder);
    await saveFile(path.join(pageFolder, 'page.html'), content);

    // Create page.json with full metadata if it doesn't exist
    const metadataPath = path.join(pageFolder, 'page.json');
    if (!(await checkIfExists(metadataPath))) {
        const now = new Date().toISOString();
        const metadata: PageMetadata = {
            title: title ?? '',
            categories: categories ?? [],
            pinned: false,
            showInAll: true,
            createdDate: now,
            lastModified: now,
            pageVersion: PAGE_VERSION,
            mode: 'unlocked',
        };
        await saveFile(metadataPath, JSON.stringify(metadata, null, 4));
    }
}

export function updatePageState(name: string, content: string): void {
    _pages[name] = content;
}

export async function deletePage(pagesFolder: string, name: string): Promise<void> {
    // Delete folder-based page: <pagesFolder>/pages/<name>/
    const folderPath = path.join(pagesFolder, 'pages', name);
    if (await checkIfExists(folderPath)) {
        await deleteFolder(folderPath);
    }

    // Delete legacy flat file: <pagesFolder>/<name>.html
    const flatPath = path.join(pagesFolder, `${name}.html`);
    if (await checkIfExists(flatPath)) {
        await deleteFile(flatPath);
    }

    // Clear in-memory cache
    delete _pages[name];
}

export async function copyPage(
    pagesFolder: string,
    sourceName: string,
    targetName: string,
    title: string,
    categories: string[],
    requiredPagesFolder: string
): Promise<void> {
    // Load source HTML from user folder, then try required folder as fallback
    let html = await loadPageState(pagesFolder, sourceName, true);
    if (!html) {
        const requiredPath = path.join(requiredPagesFolder, `${sourceName}.html`);
        if (await checkIfExists(requiredPath)) {
            html = await loadFile(requiredPath);
        }
    }

    if (!html) {
        throw new Error(`Source page "${sourceName}" not found`);
    }

    // Save HTML to target (creates folder + page.html + page.json)
    await savePageState(pagesFolder, targetName, html, title);

    // Overwrite the generated metadata with provided title + categories
    const now = new Date().toISOString();
    const metadata: PageMetadata = {
        title,
        categories,
        pinned: false,
        showInAll: true,
        createdDate: now,
        lastModified: now,
        pageVersion: PAGE_VERSION,
        mode: 'unlocked',
    };
    await savePageMetadata(pagesFolder, targetName, metadata);
}
