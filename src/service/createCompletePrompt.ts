import {anthropic, completePrompt, logCompletePrompt, openai} from 'agentm-core';
import { getModelEntry, loadSettings } from '../settings';
import { PROVIDERS } from '../models';

export async function createCompletePrompt(pagesFolder: string, use: 'builder' | 'chat', modelOverride?: string): Promise<completePrompt> {
    // Get configuration settings
    const settings = await loadSettings(pagesFolder);
    const entry = getModelEntry(settings, use);

    if (!entry.configuration.apiKey) {
        throw new Error('API key not configured');
    }

    // Validate model
    const model = modelOverride || entry.configuration.model;
    if (!model) {
        throw new Error('Model not configured');
    }

    // Create completion functions
    let modelInstance: completePrompt;
    const apiKey = entry.configuration.apiKey;
    if (entry.provider === 'Anthropic') {
        modelInstance = anthropic({apiKey, model});
    } else {
        modelInstance = openai({apiKey, model});
    }

    // Return new model instance
    if (entry.logCompletions) {
        return logCompletePrompt(modelInstance, true);
    } else {
        return modelInstance;
    }
}

export { PROVIDERS };
