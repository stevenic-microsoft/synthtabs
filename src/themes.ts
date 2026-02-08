import path from 'path';
import { checkIfExists, listFiles, loadFile } from './files';
import { SynthOSConfig } from './init';

export interface ThemeInfo {
    mode: 'light' | 'dark';
    colors: Record<string, string>;
}

function userThemesFolder(config: SynthOSConfig): string {
    return path.join(config.pagesFolder, 'themes');
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
    const localPath = path.join(userThemesFolder(config), `${name}.css`);
    if (await checkIfExists(localPath)) {
        return await loadFile(localPath);
    }

    const defaultPath = path.join(config.defaultThemesFolder, `${name}.css`);
    if (await checkIfExists(defaultPath)) {
        return await loadFile(defaultPath);
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
            if (f.endsWith('.css')) {
                names.add(f.replace(/\.css$/, ''));
            }
        }
    }

    // Collect from package defaults
    if (await checkIfExists(config.defaultThemesFolder)) {
        const files = await listFiles(config.defaultThemesFolder);
        for (const f of files) {
            if (f.endsWith('.css')) {
                names.add(f.replace(/\.css$/, ''));
            }
        }
    }

    return Array.from(names).sort();
}
