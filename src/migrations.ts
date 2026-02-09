import * as cheerio from 'cheerio';

/**
 * Registry of migration functions: fromVersion -> transform.
 * Each function transforms page HTML from version N to version N+1.
 */
const migrations: Record<number, (html: string) => string> = {
    1: migrateV1toV2,
};

/**
 * Migrate a page's HTML from one version to another by applying
 * sequential migration steps.
 */
export function migratePage(html: string, fromVersion: number, toVersion: number): string {
    let current = html;
    for (let v = fromVersion; v < toVersion; v++) {
        const migrate = migrations[v];
        if (!migrate) {
            throw new Error(`No migration defined for version ${v} -> ${v + 1}`);
        }
        current = migrate(current);
    }
    return current;
}

/**
 * v1 -> v2: Strip inline shared chat panel code.
 *
 * Removes:
 * - chatInput.focus() line
 * - chatForm submit event listener
 * - saveLink click handler
 * - resetLink click handler
 * - window.onload chat scroll (preserves other onload logic like markdown rendering)
 * - Chat panel toggle IIFE (contains 'synthos-chat-collapsed')
 * - Focus management IIFE (contains 'stopImmediatePropagation')
 * - 3 CSS rules: #loadingOverlay { position: absolute }, .chat-submit:disabled, .chat-input:disabled
 */
function migrateV1toV2(html: string): string {
    const $ = cheerio.load(html, { decodeEntities: false });

    // --- Strip CSS rules from <style> blocks ---
    $('style').each(function (_, el) {
        let css = $(el).html() ?? '';
        // Remove #loadingOverlay { position: absolute; }
        css = css.replace(/#loadingOverlay\s*\{\s*position:\s*absolute;\s*\}/g, '');
        // Remove .chat-submit:disabled { ... }
        css = css.replace(/\.chat-submit:disabled\s*\{[^}]*\}/g, '');
        // Remove .chat-input:disabled { ... }
        css = css.replace(/\.chat-input:disabled\s*\{[^}]*\}/g, '');
        $(el).html(css);
    });

    // --- Strip JS from <script> blocks ---
    $('script').each(function (_, el) {
        const src = $(el).attr('src');
        if (src) return; // Skip external scripts

        let code = $(el).html() ?? '';

        // Remove chatInput.focus() line
        code = code.replace(/document\.getElementById\(["']chatInput["']\)\.focus\(\);?\s*/g, '');

        // Remove chatForm submit listener block
        code = code.replace(
            /document\.getElementById\(["']chatForm["']\)\.addEventListener\(\s*['"]submit['"]\s*,\s*(?:function\s*\([^)]*\)|[^)]*=>|\([^)]*\)\s*=>)\s*\{[^}]*setTimeout\(\s*(?:function\s*\(\)|[^)]*=>|\(\)\s*=>)\s*\{[^}]*\}\s*,\s*50\s*\)\s*;?\s*\}\s*\)\s*;?\s*/gs,
            ''
        );

        // Remove saveLink click handler
        code = code.replace(
            /document\.getElementById\(["']saveLink["']\)\.addEventListener\(\s*["']click["']\s*,\s*function\s*\([^)]*\)\s*\{[^}]*\}\s*\)\s*;?\s*/gs,
            ''
        );

        // Remove resetLink click handler
        code = code.replace(
            /document\.getElementById\(["']resetLink["']\)\.addEventListener\(\s*["']click["']\s*,\s*function\s*\([^)]*\)\s*\{[^}]*\}\s*\)\s*;?\s*/gs,
            ''
        );

        // Remove window.onload that ONLY contains chat scroll
        // Match window.onload that contains scrollTo/scrollTop and nothing else significant
        code = code.replace(
            /window\.onload\s*=\s*function\s*\(\)\s*\{\s*(?:const|var|let)\s+chatMessages\s*=\s*document\.getElementById\(\s*['"]chatMessages['"]\s*\)\s*;?\s*chatMessages\.scrollTo\(\s*\{[^}]*\}\s*\)\s*;?\s*\}\s*;?\s*/gs,
            ''
        );
        // Also handle scrollTop variant (settings.html)
        code = code.replace(
            /window\.onload\s*=\s*function\s*\(\)\s*\{\s*(?:const|var|let)\s+chatMessages\s*=\s*document\.getElementById\(\s*['"]chatMessages['"]\s*\)\s*;?\s*chatMessages\.scrollTop\s*=\s*chatMessages\.scrollHeight\s*;?\s*\}\s*;?\s*/gs,
            ''
        );

        // For markdown.html: remove only the chat scroll lines inside a larger window.onload
        // Remove the chatMessages scroll lines but keep the rest
        code = code.replace(
            /(window\.onload\s*=\s*function\s*\(\)\s*\{)\s*(?:const|var|let)\s+chatMessages\s*=\s*document\.getElementById\(\s*['"]chatMessages['"]\s*\)\s*;?\s*chatMessages\.scrollTo\(\s*\{[^}]*\}\s*\)\s*;?\s*/gs,
            '$1\n'
        );

        // Remove chat toggle IIFE (contains 'synthos-chat-collapsed')
        code = code.replace(
            /\/\/\s*(?:Chat panel toggle|chat panel toggle)[^\n]*\n\s*\(function\s*\(\)\s*\{[\s\S]*?synthos-chat-collapsed[\s\S]*?\}\)\(\)\s*;?\s*/g,
            ''
        );

        // Remove focus management IIFE (contains 'stopImmediatePropagation')
        code = code.replace(
            /\/\/\s*(?:Focus management|focus management)[^\n]*\n\s*\(function\s*\(\)\s*\{[\s\S]*?stopImmediatePropagation[\s\S]*?\}\)\(\)\s*;?\s*/g,
            ''
        );

        // Remove "// Basic chat functionality" comment if left behind
        code = code.replace(/\/\/\s*Basic chat functionality\s*\n/g, '');

        $(el).html(code);
    });

    // Remove empty script blocks
    $('script').each(function (_, el) {
        const src = $(el).attr('src');
        if (src) return;
        const code = ($(el).html() ?? '').trim();
        if (code === '') {
            $(el).remove();
        }
    });

    return $.html();
}
