import * as fs from 'fs';
import * as path from 'path';
import { ConnectorDefinition, ConnectorJson } from './types';

function loadConnectorJson(dir: string): ConnectorDefinition | null {
    const file = path.join(dir, 'connector.json');
    if (!fs.existsSync(file)) return null;
    const raw: ConnectorJson = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return {
        ...raw,
        hints: raw.hints ? raw.hints.join('\n') : undefined
    };
}

export function loadConnectorRegistry(connectorsDir: string): ConnectorDefinition[] {
    if (!fs.existsSync(connectorsDir)) return [];
    return fs.readdirSync(connectorsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => loadConnectorJson(path.join(connectorsDir, d.name)))
        .filter((d): d is ConnectorDefinition => d !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
}

let _registry: ConnectorDefinition[] | undefined;
export function getConnectorRegistry(connectorsDir?: string): ConnectorDefinition[] {
    if (!_registry || connectorsDir) {
        _registry = loadConnectorRegistry(connectorsDir ?? path.join(__dirname, '../../service-connectors'));
    }
    return _registry;
}
