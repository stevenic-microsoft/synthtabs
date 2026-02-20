import * as fs from 'fs/promises';
import path from "path";
import { checkIfExists, copyFile, copyFiles, deleteFile, ensureFolderExists, listFiles, saveFile } from "./files";
import { PAGE_VERSION } from "./pages";
import { DefaultSettings } from "./settings";
import { getOutdatedThemes, parseThemeFilename } from "./themes";
import { Customizer } from './customizer';

export interface SynthOSConfig {
    localFolder: string;
    pagesFolder: string;
    requiredPagesFolder: string;
    defaultPagesFolder: string;
    defaultScriptsFolder: string;
    defaultThemesFolder: string;
    pageScriptsFolder: string;
    serviceConnectorsFolder: string;
    debug: boolean;
    debugPageUpdates: boolean;
}

export function createConfig(
    pagesFolder = '.synthos',
    options?: { debug?: boolean; debugPageUpdates?: boolean },
    customizer?: Customizer
): SynthOSConfig {
    return {
        localFolder: pagesFolder,
        pagesFolder: path.join(process.cwd(), pagesFolder),
        requiredPagesFolder: customizer?.requiredPagesFolder ?? path.join(__dirname, '../required-pages'),
        defaultPagesFolder: customizer?.defaultPagesFolder ?? path.join(__dirname, '../default-pages'),
        defaultScriptsFolder: path.join(__dirname, '../default-scripts'),
        defaultThemesFolder: customizer?.defaultThemesFolder ?? path.join(__dirname, '../default-themes'),
        pageScriptsFolder: customizer?.pageScriptsFolder ?? path.join(__dirname, '../page-scripts'),
        serviceConnectorsFolder: customizer?.serviceConnectorsFolder ?? path.join(__dirname, '../service-connectors'),
        debug: options?.debug ?? false,
        debugPageUpdates: options?.debugPageUpdates ?? false
    };
}

export async function init(config: SynthOSConfig, includeDefaultPages: boolean = true): Promise<boolean> {
    // Check for existing folder
    if (await checkIfExists(config.pagesFolder)) {
        await repairMissingFolders(config);
        return false;
    }

    console.log(`Initializing ${config.localFolder} folder...`);

    // Create pages folder
    await ensureFolderExists(config.pagesFolder);

    // Create mandatory files
    await saveFile(path.join(config.pagesFolder, '.gitignore'), 'settings.json\n');
    await saveFile(path.join(config.pagesFolder, 'settings.json'), JSON.stringify(DefaultSettings, null, 4));
    await saveFile(path.join(config.pagesFolder, 'settings.json.example'), JSON.stringify(DefaultSettings, null, 4));

    // Setup default scripts
    console.log(`Copying default scripts to ${config.localFolder} folder...`);
    const scriptsFolder = path.join(config.pagesFolder, 'scripts');
    await ensureFolderExists(scriptsFolder);
    switch (process.platform) {
        case 'win32':
            await copyFile(path.join(config.defaultScriptsFolder, 'windows-terminal.json'), scriptsFolder);
            break;
        case 'darwin':
            await copyFile(path.join(config.defaultScriptsFolder, 'mac-terminal.json'), scriptsFolder);
            break;
        case 'android':
            await copyFile(path.join(config.defaultScriptsFolder, 'android-terminal.json'), scriptsFolder);
            break;
        case 'linux':
        default:
            await copyFile(path.join(config.defaultScriptsFolder, 'linux-terminal.json'), scriptsFolder);
            break;
    }  

    await saveFile(path.join(scriptsFolder, 'example.sh'), `#!/bin/bash\n\n# This is an example script\n\n# You can run this script using the following command:\n# sh ${config.localFolder}/scripts/example.sh\n\n# This script will print "Hello, World!" to the console\n\necho "Hello, World!"\n`);

    // Setup default themes
    console.log(`Copying default themes to ${config.localFolder} folder...`);
    const themesFolder = path.join(config.pagesFolder, 'themes');
    await ensureFolderExists(themesFolder);
    await copyFiles(config.defaultThemesFolder, themesFolder);

    // Copy pages
    if (includeDefaultPages) {
        console.log(`Copying default pages to ${config.localFolder} folder...`);
        await copyDefaultPages(config.defaultPagesFolder, config.pagesFolder);
    }

    return true;
}

async function repairMissingFolders(config: SynthOSConfig): Promise<void> {
    // Rebuild scripts folder from defaults if missing
    const scriptsFolder = path.join(config.pagesFolder, 'scripts');
    if (!await checkIfExists(scriptsFolder)) {
        console.log(`Restoring default scripts to ${config.localFolder} folder...`);
        await ensureFolderExists(scriptsFolder);
        switch (process.platform) {
            case 'win32':
                await copyFile(path.join(config.defaultScriptsFolder, 'windows-terminal.json'), scriptsFolder);
                break;
            case 'darwin':
                await copyFile(path.join(config.defaultScriptsFolder, 'mac-terminal.json'), scriptsFolder);
                break;
            case 'android':
                await copyFile(path.join(config.defaultScriptsFolder, 'android-terminal.json'), scriptsFolder);
                break;
            case 'linux':
            default:
                await copyFile(path.join(config.defaultScriptsFolder, 'linux-terminal.json'), scriptsFolder);
                break;
        }
        await saveFile(path.join(scriptsFolder, 'example.sh'), `#!/bin/bash\n\n# This is an example script\n\n# You can run this script using the following command:\n# sh ${config.localFolder}/scripts/example.sh\n\n# This script will print "Hello, World!" to the console\n\necho "Hello, World!"\n`);
    }

    // Rebuild themes folder from defaults if missing
    const themesFolder = path.join(config.pagesFolder, 'themes');
    if (!await checkIfExists(themesFolder)) {
        console.log(`Restoring default themes to ${config.localFolder} folder...`);
        await ensureFolderExists(themesFolder);
        await copyFiles(config.defaultThemesFolder, themesFolder);
    } else {
        // Upgrade outdated themes — copy newer versioned CSS from defaults
        const outdated = await getOutdatedThemes(config);
        if (outdated.length > 0) {
            console.log(`Upgrading ${outdated.length} theme(s): ${outdated.join(', ')}...`);
            const defaultFiles = await listFiles(config.defaultThemesFolder);
            for (const themeName of outdated) {
                // Remove old versioned CSS files for this theme
                const localFiles = await listFiles(themesFolder);
                for (const f of localFiles) {
                    const parsed = parseThemeFilename(f);
                    if (parsed && parsed.name === themeName) {
                        await deleteFile(path.join(themesFolder, f));
                    }
                }
                // Copy the new versioned CSS from defaults
                for (const f of defaultFiles) {
                    const parsed = parseThemeFilename(f);
                    if (parsed && parsed.name === themeName) {
                        await copyFile(path.join(config.defaultThemesFolder, f), themesFolder);
                    }
                }
            }
        }
    }

    // Ensure pages/ subfolder exists
    const pagesSubdir = path.join(config.pagesFolder, 'pages');
    if (!await checkIfExists(pagesSubdir)) {
        // No pages folder and no flat files — rebuild from defaults
        const htmlFiles = (await listFiles(config.pagesFolder)).filter(f => f.endsWith('.html'));
        if (htmlFiles.length === 0) {
            console.log(`Restoring default pages to ${config.localFolder}/pages/ folder...`);
            await copyDefaultPages(config.defaultPagesFolder, config.pagesFolder);
        } else {
            await ensureFolderExists(pagesSubdir);
        }
    }

    // Migrate any stray flat .html files from root into pages/<name>/
    await migrateFlatPages(config.pagesFolder, config.localFolder);
}

function toTitleCase(name: string): string {
    // Strip brackets, replace underscores/hyphens with spaces, then Title Case each word
    return name
        .replace(/[\[\]]/g, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

async function migrateFlatPages(pagesFolder: string, localFolder: string): Promise<void> {
    const pagesSubdir = path.join(pagesFolder, 'pages');
    const htmlFiles = (await listFiles(pagesFolder)).filter(f => f.endsWith('.html'));
    if (htmlFiles.length === 0) return;

    console.log(`Migrating ${htmlFiles.length} page(s) to ${localFolder}/pages/ folder...`);
    await ensureFolderExists(pagesSubdir);
    const now = new Date().toISOString();

    for (const file of htmlFiles) {
        const pageName = file.replace(/\.html$/, '');
        const category = pageName.startsWith('[') ? 'Builder' : 'Pages';
        const title = toTitleCase(pageName);
        const pageFolder = path.join(pagesSubdir, pageName);
        await ensureFolderExists(pageFolder);
        await fs.copyFile(
            path.join(pagesFolder, file),
            path.join(pageFolder, 'page.html')
        );
        await saveFile(
            path.join(pageFolder, 'page.json'),
            JSON.stringify({
                title,
                categories: [category],
                pinned: false,
                showInAll: true,
                createdDate: now,
                lastModified: now,
                pageVersion: 1,
                mode: 'unlocked',
            }, null, 4)
        );
        await deleteFile(path.join(pagesFolder, file));
    }
}

async function copyDefaultPages(srcFolder: string, destFolder: string): Promise<void> {
    const pagesDir = path.join(destFolder, 'pages');
    await ensureFolderExists(pagesDir);
    const files = await fs.readdir(srcFolder);
    const now = new Date().toISOString();
    for (const file of files) {
        if (!file.endsWith('.html')) continue;
        const pageName = file.replace(/\.html$/, '');
        const pageFolder = path.join(pagesDir, pageName);
        await ensureFolderExists(pageFolder);
        await fs.copyFile(path.join(srcFolder, file), path.join(pageFolder, 'page.html'));

        // Read companion .json metadata from source folder, fall back to defaults
        let metadata: Record<string, unknown> = {};
        const jsonPath = path.join(srcFolder, `${pageName}.json`);
        if (await checkIfExists(jsonPath)) {
            try {
                const raw = await fs.readFile(jsonPath, 'utf-8');
                metadata = JSON.parse(raw);
            } catch {
                // use defaults
            }
        }
        const fullMetadata = {
            title: typeof metadata.title === 'string' ? metadata.title : '',
            categories: Array.isArray(metadata.categories) ? metadata.categories : [],
            pinned: typeof metadata.pinned === 'boolean' ? metadata.pinned : false,
            showInAll: typeof metadata.showInAll === 'boolean' ? metadata.showInAll : true,
            createdDate: now,
            lastModified: now,
            pageVersion: typeof metadata.pageVersion === 'number' ? metadata.pageVersion
                : typeof metadata.uxVersion === 'number' ? metadata.uxVersion : PAGE_VERSION,
            mode: metadata.mode === 'locked' ? 'locked' : 'unlocked',
        };
        await saveFile(path.join(pageFolder, 'page.json'), JSON.stringify(fullMetadata, null, 4));
    }
}
