import { Application, Response } from 'express';
import { SynthOSConfig } from "../init";
import { checkIfExists, deleteFile, ensureFolderExists, listFiles, loadFile, saveFile } from "../files";
import path from "path";
import { v4 } from "uuid";
import { clearCachedScripts } from '../scripts';

export function useDataRoutes(config: SynthOSConfig, app: Application): void {
    app.get('/api/data/:page/:table', (req, res) => handleList(config, req.params.page, req.params.table, req.query, res));
    app.get('/api/data/:page/:table/:id', (req, res) => handleGet(config, req.params.page, req.params.table, req.params.id, res));
    app.post('/api/data/:page/:table', (req, res) => handleUpsert(config, req.params.page, req.params.table, req.body, res));
    app.delete('/api/data/:page/:table/:id', (req, res) => handleDelete(config, req.params.page, req.params.table, req.params.id, res));
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleList(config: SynthOSConfig, page: string, table: string, query: Record<string, any>, res: Response): Promise<void> {
    const folder = tableFolder(config, page, table);
    if (!(await checkIfExists(folder))) {
        res.status(404).json({ error: 'table_not_found', page, table });
        return;
    }

    const ids = (await listFiles(folder)).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

    const rows: Record<string, any>[] = [];
    for (const id of ids) {
        const file = recordFile(folder, id);
        try {
            const row = JSON.parse(await loadFile(file));
            row.id = id;
            rows.push(row);
        } catch (err: unknown) {
            console.error(err);
        }
    }

    // Paginate when limit is provided
    const limitParam = typeof query.limit === 'string' ? parseInt(query.limit, 10) : NaN;
    if (!isNaN(limitParam) && limitParam > 0) {
        const offset = Math.max(0, typeof query.offset === 'string' ? parseInt(query.offset, 10) || 0 : 0);
        const items = rows.slice(offset, offset + limitParam);
        res.json({ items, total: rows.length, offset, limit: limitParam, hasMore: offset + limitParam < rows.length });
    } else {
        res.json(rows);
    }
}

async function handleGet(config: SynthOSConfig, page: string, table: string, id: string, res: Response): Promise<void> {
    const folder = tableFolder(config, page, table);
    if (!(await checkIfExists(folder))) {
        res.status(404).json({ error: 'table_not_found', page, table });
        return;
    }

    const file = recordFile(folder, id);
    try {
        const row = JSON.parse(await loadFile(file));
        row.id = id;
        res.json(row);
    } catch (err: unknown) {
        res.json({});
    }
}

async function handleUpsert(config: SynthOSConfig, page: string, table: string, body: any, res: Response): Promise<void> {
    const id = body.id ?? v4();
    const folder = tableFolder(config, page, table);
    const file = recordFile(folder, id);
    try {
        const row = { ...body, id };
        await ensureFolderExists(folder);
        await saveFile(file, JSON.stringify(row, null, 4));
        if (table === 'scripts') {
            clearCachedScripts();
        }
        res.json(row);
    } catch (err: unknown) {
        console.error(err);
        res.status(500).send((err as Error).message);
    }
}

async function handleDelete(config: SynthOSConfig, page: string, table: string, id: string, res: Response): Promise<void> {
    const folder = tableFolder(config, page, table);
    const file = recordFile(folder, id);
    try {
        if (await checkIfExists(file)) {
            await deleteFile(file);
            if (table === 'scripts') {
                clearCachedScripts();
            }
        }
        res.json({ success: true });
    } catch (err: unknown) {
        console.error(err);
        res.status(500).send((err as Error).message);
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tableFolder(config: SynthOSConfig, page: string, table: string): string {
    return path.join(config.pagesFolder, 'pages', page, table);
}

function recordFile(folder: string, id: string): string {
    return path.join(folder, `${id}.json`);
}
