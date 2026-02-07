/**
 * Returns provider-specific prompt instructions for how the model should
 * format its change-list response.
 */
export function getModelInstructions(model: string): string {
    if (model.startsWith('claude-')) {
        return `Return ONLY the JSON array of change operations. Do not wrap it in markdown code fences or add any other text.`;
    }

    // GPT and other models
    return `Return ONLY the JSON array of change operations. Do not wrap it in markdown code fences or add any other text.`;
}
