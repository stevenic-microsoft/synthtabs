// ANSI color helpers — no external dependency
export const reset = '\x1b[0m';
export const cyan = (s: string): string => `\x1b[36m${s}${reset}`;
export const yellow = (s: string): string => `\x1b[33m${s}${reset}`;
export const green = (s: string): string => `\x1b[32m${s}${reset}`;
export const red = (s: string): string => `\x1b[31m${s}${reset}`;
export const dim = (s: string): string => `\x1b[2m${s}${reset}`;

/** Format milliseconds as `X.XXXs` */
export function formatTime(ms: number): string {
    return `${(ms / 1000).toFixed(3)}s`;
}

/** Rough token estimate based on chars / 4 heuristic */
export function estimateTokens(chars: number): number {
    return Math.ceil(chars / 4);
}
