import path from "path";
import { checkIfExists, copyFile, copyFiles, ensureFolderExists, saveFile } from "./files";
import { DefaultSettings } from "./settings";

export interface SynthOSConfig {
    pagesFolder: string;
    requiredPagesFolder: string;
    defaultPagesFolder: string;
    defaultScriptsFolder: string;
    defaultThemesFolder: string;
    debug: boolean;
    debugPageUpdates: boolean;
}

export function createConfig(pagesFolder = '.synthos', options?: { debug?: boolean; debugPageUpdates?: boolean }): SynthOSConfig {
    return {
        pagesFolder: path.join(process.cwd(), pagesFolder),
        requiredPagesFolder: path.join(__dirname, '../required-pages'),
        defaultPagesFolder: path.join(__dirname, '../default-pages'),
        defaultScriptsFolder: path.join(__dirname, '../default-scripts'),
        defaultThemesFolder: path.join(__dirname, '../default-themes'),
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

    console.log(`Initializing .synthos folder...`);

    // Create pages folder
    await ensureFolderExists(config.pagesFolder);

    // Create mandatory files
    await saveFile(path.join(config.pagesFolder, '.gitignore'), 'settings.json\n');
    await saveFile(path.join(config.pagesFolder, 'settings.json'), JSON.stringify(DefaultSettings, null, 4));
    await saveFile(path.join(config.pagesFolder, 'settings.json.example'), JSON.stringify(DefaultSettings, null, 4));

    // Setup default scripts
    console.log(`Copying default scripts to .synthos folder...`);
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

    await saveFile(path.join(scriptsFolder, 'example.sh'), '#!/bin/bash\n\n# This is an example script\n\n# You can run this script using the following command:\n# sh .synthos/scripts/example.sh\n\n# This script will print "Hello, World!" to the console\n\necho "Hello, World!"\n');

    // Setup default themes
    console.log(`Copying default themes to .synthos folder...`);
    const themesFolder = path.join(config.pagesFolder, 'themes');
    await ensureFolderExists(themesFolder);
    await copyFiles(config.defaultThemesFolder, themesFolder);

    // Copy pages
    if (includeDefaultPages) {
        console.log(`Copying default pages to .synthos folder...`);
        await copyFiles(config.defaultPagesFolder, config.pagesFolder);
    }

    return true;
}

async function repairMissingFolders(config: SynthOSConfig): Promise<void> {
    // Rebuild scripts folder from defaults if missing
    const scriptsFolder = path.join(config.pagesFolder, 'scripts');
    if (!await checkIfExists(scriptsFolder)) {
        console.log(`Restoring default scripts to .synthos folder...`);
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
        await saveFile(path.join(scriptsFolder, 'example.sh'), '#!/bin/bash\n\n# This is an example script\n\n# You can run this script using the following command:\n# sh .synthos/scripts/example.sh\n\n# This script will print "Hello, World!" to the console\n\necho "Hello, World!"\n');
    }

    // Rebuild themes folder from defaults if missing
    const themesFolder = path.join(config.pagesFolder, 'themes');
    if (!await checkIfExists(themesFolder)) {
        console.log(`Restoring default themes to .synthos folder...`);
        await ensureFolderExists(themesFolder);
        await copyFiles(config.defaultThemesFolder, themesFolder);
    }
}
