import * as fs from 'fs/promises';
import path from 'path';

export async function checkIfExists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

export async function copyFile(srcFile: string, destFolder: string): Promise<void> {
    await ensureFolderExists(destFolder);
    const fileName = path.basename(srcFile);
    const destFile = path.join(destFolder, fileName);
    await fs.copyFile(srcFile, destFile);
}

export async function copyFiles(srcFolder: string, destFolder: string): Promise<void> {
    await ensureFolderExists(destFolder);

    const files = await fs.readdir(srcFolder);
    for (const file of files) {
        const srcPath = `${srcFolder}/${file}`;
        const destPath = `${destFolder}/${file}`;
        await fs.copyFile(srcPath, destPath);
    }
}

export async function ensureFolderExists(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true });
}

export async function listFiles(path: string): Promise<string[]> {
    return (await fs.readdir(path)).filter(file => !file.startsWith('.') && file.includes('.'));
}

export async function listFolders(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name);
}

export async function loadFile(path: string): Promise<string> {
    return await fs.readFile(path, 'utf8');
}

export async function saveFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, 'utf8');
}

export async function deleteFile(path: string): Promise<void> {
    await fs.unlink(path);
}

export async function copyFolderRecursive(srcFolder: string, destFolder: string): Promise<void> {
    await ensureFolderExists(destFolder);
    const entries = await fs.readdir(srcFolder, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcFolder, entry.name);
        const destPath = path.join(destFolder, entry.name);
        if (entry.isDirectory()) {
            await copyFolderRecursive(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

export async function deleteFolder(dirPath: string): Promise<void> {
    await fs.rm(dirPath, { recursive: true });
}
