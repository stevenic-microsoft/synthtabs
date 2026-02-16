import {checkIfExists, loadFile, saveFile} from './files';
import path from 'path';
import { ModelEntry, ProviderName, detectProvider } from './models';

let _settings: Partial<SettingsV2>|undefined;

export interface ServiceConfig {
    apiKey: string;
    enabled: boolean;
}

export type ServicesConfig = { [serviceId: string]: ServiceConfig };

// Re-export ModelEntry from models so existing imports from settings still work
export type { ModelEntry } from './models';

/**
 * V1 settings shape (flat, single model). Used as migration source.
 */
export interface SettingsV1 {
    serviceApiKey: string;
    model: string;
    maxTokens: number;
    imageQuality: 'standard' | 'hd';
    instructions?: string;
    logCompletions?: boolean;
    theme?: string;
    services?: ServicesConfig;
}

/**
 * V2 settings shape with versioned models array.
 */
export interface SettingsV2 {
    version: 2;
    theme: string;
    models: ModelEntry[];
    features: string[];
    services?: ServicesConfig;
}

export const DefaultSettings: SettingsV2 = {
    version: 2,
    theme: 'nebula-dawn',
    models: [
        {
            use: 'builder',
            provider: 'Anthropic',
            configuration: { apiKey: '', model: '', maxTokens: 32000 },
            imageQuality: 'standard',
            instructions: '',
            logCompletions: false,
        },
        {
            use: 'chat',
            provider: 'Anthropic',
            configuration: { apiKey: '', model: '', maxTokens: 32000 },
            imageQuality: 'standard',
            instructions: '',
            logCompletions: false,
        },
    ],
    features: [],
    services: {}
};

/**
 * Find a model entry by its `use` field. Falls back to default if not found.
 */
export function getModelEntry(settings: SettingsV2, use: 'builder' | 'chat'): ModelEntry {
    const entry = settings.models.find(m => m.use === use);
    if (entry) return entry;
    return DefaultSettings.models.find(m => m.use === use)!;
}

/**
 * Migrate a v1 settings object to v2 by detecting provider from model prefix
 * and wrapping fields into the new configuration object.
 */
function migrateV1toV2(raw: Record<string, unknown>): SettingsV2 {
    const v1 = raw as unknown as SettingsV1;
    const rawModel = v1.model ?? '';
    // Migrate retired model names
    const model = rawModel === 'claude-opus-4-5' ? 'claude-opus-4-6' : rawModel;
    const detected = detectProvider(model);
    const provider: ProviderName = detected?.name ?? 'Anthropic';

    // Default chat to claude-haiku-4-5 when migrating from an Anthropic model
    const chatModel = provider === 'Anthropic' ? 'claude-haiku-4-5' : model;

    return {
        version: 2,
        theme: v1.theme ?? 'nebula-dusk',
        models: [
            {
                use: 'builder',
                provider,
                configuration: {
                    apiKey: v1.serviceApiKey ?? '',
                    model,
                    maxTokens: v1.maxTokens ?? 32000,
                },
                imageQuality: v1.imageQuality ?? 'standard',
                instructions: v1.instructions ?? '',
                logCompletions: v1.logCompletions ?? false,
            },
            {
                use: 'chat',
                provider,
                configuration: {
                    apiKey: v1.serviceApiKey ?? '',
                    model: chatModel,
                    maxTokens: v1.maxTokens ?? 32000,
                },
                imageQuality: v1.imageQuality ?? 'standard',
                instructions: v1.instructions ?? '',
                logCompletions: v1.logCompletions ?? false,
            },
        ],
        features: [],
        services: v1.services,
    };
}

export async function hasConfiguredSettings(folder: string): Promise<boolean> {
    const settings = await loadSettings(folder);
    const builder = getModelEntry(settings, 'builder');
    if (typeof builder.configuration.apiKey !== 'string' || builder.configuration.apiKey.length == 0) {
        return false;
    }
    if (typeof builder.configuration.model !== 'string' || builder.configuration.model.length == 0) {
        return false;
    }
    if (typeof builder.configuration.maxTokens !== 'number' || builder.configuration.maxTokens <= 0) {
        return false;
    }

    return true;
}

export async function loadSettings(folder: string): Promise<SettingsV2> {
    if (_settings == undefined) {
        const filename = path.join(folder, 'settings.json');
        if (await checkIfExists(filename)) {
            try {
                const raw = JSON.parse(await loadFile(filename));
                if (!raw.version) {
                    // V1 file — migrate
                    console.log('Migrating settings.json from v1 to v2...');
                    const migrated = migrateV1toV2(raw);
                    _settings = migrated;
                    await saveFile(filename, JSON.stringify(migrated, null, 4));
                } else {
                    _settings = raw as Partial<SettingsV2>;
                }
            } catch {
                // Invalid JSON
            }
        }
    }

    return {...DefaultSettings, ..._settings, models: _settings?.models ?? DefaultSettings.models};
}

export async function saveSettings(folder: string, settings: Partial<SettingsV2>): Promise<void> {
    _settings = {..._settings, ...settings};
    if (settings.models) {
        _settings.models = settings.models;
    }
    _settings.version = 2;
    await saveFile(path.join(folder, 'settings.json'), JSON.stringify(_settings, null, 4));
}
