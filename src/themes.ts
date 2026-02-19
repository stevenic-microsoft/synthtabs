import path from 'path';
import { checkIfExists, listFiles, loadFile } from './files';
import { SynthOSConfig } from './init';

export const THEME_VERSION = 2;

export interface ThemeInfo {
    mode: 'light' | 'dark';
    colors: Record<string, string>;
}

function userThemesFolder(config: SynthOSConfig): string {
    return path.join(config.pagesFolder, 'themes');
}

/**
 * Extract the base theme name and version from a CSS filename.
 * e.g. "nebula-dusk.v2.css" → { name: "nebula-dusk", version: 2 }
 *      "nebula-dusk.css"    → { name: "nebula-dusk", version: 1 }
 */
export function parseThemeFilename(filename: string): { name: string; version: number } | undefined {
    if (!filename.endsWith('.css')) return undefined;
    const versionedMatch = filename.match(/^(.+)\.v(\d+)\.css$/);
    if (versionedMatch) {
        return { name: versionedMatch[1], version: parseInt(versionedMatch[2], 10) };
    }
    return { name: filename.replace(/\.css$/, ''), version: 1 };
}

/**
 * Find the CSS file for a theme by name in a folder.
 * Prefers the highest-versioned file (e.g. name.v2.css over name.css).
 */
async function findThemeCssFile(folder: string, name: string): Promise<{ path: string; version: number } | undefined> {
    if (!await checkIfExists(folder)) return undefined;
    const files = await listFiles(folder);
    let best: { path: string; version: number } | undefined;
    for (const f of files) {
        const parsed = parseThemeFilename(f);
        if (parsed && parsed.name === name) {
            if (!best || parsed.version > best.version) {
                best = { path: path.join(folder, f), version: parsed.version };
            }
        }
    }
    return best;
}

export async function loadThemeInfo(name: string, config: SynthOSConfig): Promise<ThemeInfo | undefined> {
    // Check user's local themes first, then fall back to package defaults
    const localPath = path.join(userThemesFolder(config), `${name}.json`);
    if (await checkIfExists(localPath)) {
        const raw = await loadFile(localPath);
        return raw ? JSON.parse(raw) : undefined;
    }

    const defaultPath = path.join(config.defaultThemesFolder, `${name}.json`);
    if (await checkIfExists(defaultPath)) {
        const raw = await loadFile(defaultPath);
        return raw ? JSON.parse(raw) : undefined;
    }

    return undefined;
}

export async function loadTheme(name: string, config: SynthOSConfig): Promise<string | undefined> {
    // Check user's local themes first, then fall back to package defaults
    const local = await findThemeCssFile(userThemesFolder(config), name);
    if (local) {
        return await loadFile(local.path);
    }

    const def = await findThemeCssFile(config.defaultThemesFolder, name);
    if (def) {
        return await loadFile(def.path);
    }

    return undefined;
}

export async function listThemes(config: SynthOSConfig): Promise<string[]> {
    const names = new Set<string>();

    // Collect from user's local themes folder
    const localFolder = userThemesFolder(config);
    if (await checkIfExists(localFolder)) {
        const files = await listFiles(localFolder);
        for (const f of files) {
            const parsed = parseThemeFilename(f);
            if (parsed) names.add(parsed.name);
        }
    }

    // Collect from package defaults
    if (await checkIfExists(config.defaultThemesFolder)) {
        const files = await listFiles(config.defaultThemesFolder);
        for (const f of files) {
            const parsed = parseThemeFilename(f);
            if (parsed) names.add(parsed.name);
        }
    }

    return Array.from(names).sort();
}

/**
 * Compare local theme versions against defaults and return themes that need upgrading.
 */
export async function getOutdatedThemes(config: SynthOSConfig): Promise<string[]> {
    const localFolder = userThemesFolder(config);
    if (!await checkIfExists(localFolder)) return [];

    const defaultFiles = await listFiles(config.defaultThemesFolder);
    const localFiles = await listFiles(localFolder);

    // Build maps: theme name → highest version
    const defaultVersions = new Map<string, number>();
    for (const f of defaultFiles) {
        const parsed = parseThemeFilename(f);
        if (parsed) {
            const cur = defaultVersions.get(parsed.name) ?? 0;
            if (parsed.version > cur) defaultVersions.set(parsed.name, parsed.version);
        }
    }

    const localVersions = new Map<string, number>();
    for (const f of localFiles) {
        const parsed = parseThemeFilename(f);
        if (parsed) {
            const cur = localVersions.get(parsed.name) ?? 0;
            if (parsed.version > cur) localVersions.set(parsed.name, parsed.version);
        }
    }

    const outdated: string[] = [];
    for (const [name, defVer] of defaultVersions) {
        const localVer = localVersions.get(name) ?? 0;
        if (localVer < defVer) {
            outdated.push(name);
        }
    }
    return outdated;
}
