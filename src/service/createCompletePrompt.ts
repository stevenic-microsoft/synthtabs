import {anthropic, completePrompt, logCompletePrompt, openai} from 'agentm-core';
import { loadSettings } from '../settings';

export const availableModels = [
    'claude-opus-4-5',
    'Claude Sonnet 4.5',
    'Claude Haiku 4.5',
    'GPT-5.2',
    'GPT-5 mini',
    'GPT-5 nano'
];

export async function createCompletePrompt(pagesFolder: string, model?: string): Promise<completePrompt> {
    // Get configuration settings
    const settings = await loadSettings(pagesFolder);
    if (!settings.serviceApiKey) {
        throw new Error('OpenAI API key not configured');
    }

    // Validate model
    model = model || settings.model;
    if (!model) {
        throw new Error('Model not configured');
    }

    // Create completion functions
    let modelInstance: completePrompt;
    const apiKey = settings.serviceApiKey;
    if (model.startsWith('claude-')) {
        modelInstance = anthropic({apiKey, model});
    } else {
        modelInstance = openai({apiKey, model});
    }

    // Return new model instance
    if (settings.logCompletions) {
        return logCompletePrompt(modelInstance, true);
    } else {
        return modelInstance;
    }
}