import { ProviderName } from '../models';

/**
 * Returns provider-specific prompt instructions for how the model should
 * format its change-list response.
 */
export function getModelInstructions(provider: ProviderName): string {
    if (provider === 'Anthropic') {
        return `Return ONLY the JSON array of change operations. Do not wrap it in markdown code fences or add any other text.`;
    }

    // OpenAI and other providers
    return `Return ONLY the JSON array of change operations. Do not wrap it in markdown code fences or add any other text.`;
}
