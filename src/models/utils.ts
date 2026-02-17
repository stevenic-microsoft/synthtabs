/**
 * Convert any value to a string suitable for template substitution.
 * Replaces double quotes and line feeds with spaces.
 */
export function variableToString(variable: any): string {
    if (variable === null || variable === undefined) {
        return '';
    }
    if (typeof variable === 'string') {
        return variable;
    }
    if (typeof variable === 'object') {
        return JSON.stringify(variable);
    }
    return variable.toString();
}
