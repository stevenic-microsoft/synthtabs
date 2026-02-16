import * as fs from 'fs';
import * as path from 'path';
import { ConnectorDefinition, ConnectorJson } from './types';

const connectorsDir = __dirname;

function loadConnectorJson(dir: string): ConnectorDefinition | null {
    const file = path.join(dir, 'connector.json');
    if (!fs.existsSync(file)) return null;
    const raw: ConnectorJson = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return {
        ...raw,
        hints: raw.hints ? raw.hints.join('\n') : undefined
    };
}

export const CONNECTOR_REGISTRY: ConnectorDefinition[] = fs
    .readdirSync(connectorsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => loadConnectorJson(path.join(connectorsDir, d.name)))
    .filter((d): d is ConnectorDefinition => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
