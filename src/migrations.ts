import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import path from 'path';
import { completePrompt } from 'agentm-core';
import { deduplicateInlineScripts } from './service/transformPage';

/**
 * Registry of migration functions: fromVersion -> transform.
 * Each function transforms page HTML from version N to version N+1.
 */
const migrations: Record<number, (html: string, completePrompt: completePrompt) => Promise<string>> = {
    1: migrateV1toV2,
};

/**
 * Migrate a page's HTML from one version to another by applying
 * sequential migration steps.
 */
export async function migratePage(html: string, fromVersion: number, toVersion: number, completePrompt: completePrompt): Promise<string> {
    let current = html;
    for (let v = fromVersion; v < toVersion; v++) {
        const migrate = migrations[v];
        if (!migrate) {
            throw new Error(`No migration defined for version ${v} -> ${v + 1}`);
        }
        current = await migrate(current, completePrompt);
    }
    return current;
}

/** CSS selectors provided by the shared theme — used by post-processing to strip leftovers. */
const SHARED_CSS_SELECTORS = [
    // Base
    ':root', '*', 'body', 'html',
    // Chat panel
    '.chat-panel', '.chat-header', '.chat-messages',
    '.chat-message', '.chat-message p', '.chat-message p strong', '.chat-message p code',
    '.chat-message strong', '.chat-message pre', '.chat-message code', '.chat-message a',
    '.link-group', '.link-group a', '.link-group a:hover',
    'form',
    '.chat-input', '.chat-input:focus', '.chat-input::placeholder', '.chat-input:disabled',
    '.chat-submit', '.chat-submit:hover', '.chat-submit:active', '.chat-submit:disabled',
    '.chat-input-wrapper', '.chat-input-wrapper .chat-input',
    // Viewer panel
    '.viewer-panel', '.viewer-panel::before', '.viewer-panel.full-viewer',
    // Loading
    '.loading-overlay', '.spinner', '#loadingOverlay',
    // Chat toggle
    '.chat-toggle', '.chat-toggle:hover', '.chat-toggle-dots', '.chat-toggle-dot',
    '.chat-toggle:hover .chat-toggle-dot',
    'body.chat-collapsed .chat-panel', 'body.chat-collapsed .chat-toggle',
    // Modal system
    '.modal-overlay', '.modal-overlay.show', '.modal-content', '.modal-header',
    '.modal-body', '.modal-footer', '.modal-footer-right',
    '.modal-btn', '.modal-btn-primary', '.modal-btn-primary:hover',
    '.modal-btn-secondary', '.modal-btn-secondary:hover',
    '.modal-btn-danger', '.modal-btn-danger:hover',
    // Form elements
    '.form-group', '.form-group:last-child', '.form-label',
    '.form-input', '.form-input:focus', '.form-input:read-only', '.form-input::placeholder',
    '.checkbox-label', '.checkbox-label input[type="checkbox"]', '.checkbox-label span',
    // Brainstorm
    '.brainstorm-icon-btn', '.brainstorm-icon-btn:hover',
    '.brainstorm-modal .modal-content', '.brainstorm-modal .modal-header',
    '.brainstorm-close-btn', '.brainstorm-close-btn:hover',
    '.brainstorm-messages', '.brainstorm-message', '.brainstorm-user', '.brainstorm-assistant',
    '.brainstorm-input-row', '.brainstorm-input', '.brainstorm-input:focus', '.brainstorm-input::placeholder',
    '.brainstorm-send-btn', '.brainstorm-send-btn:hover', '.brainstorm-send-btn:disabled',
    '.brainstorm-assistant p', '.brainstorm-assistant pre', '.brainstorm-assistant code',
    '.brainstorm-build-row', '.brainstorm-build-btn', '.brainstorm-build-btn:hover',
    '.brainstorm-suggestions', '.brainstorm-suggestion-chip',
    '.brainstorm-suggestion-chip:hover', '.brainstorm-suggestion-chip:disabled',
    '.brainstorm-thinking',
];

/** Default chat panel HTML — restored by post-processing if the LLM removes it. */
const DEFAULT_CHAT_PANEL = `
    <div class="chat-panel">
        <div class="chat-header">SynthOS</div>
        <div class="chat-messages" id="chatMessages">
            <div class="chat-message"><p>Welcome! How can I help you?</p></div>
        </div>
        <div class="link-group">
            <a href="#" id="saveLink">Save</a>
            <a href="/pages" id="pagesLink">Pages</a>
            <a href="#" id="resetLink">Reset</a>
        </div>
        <form action="/" method="POST" id="chatForm">
            <input type="text" class="chat-input" id="chatInput" name="message" placeholder="Type a message...">
            <button type="submit" class="chat-submit">Send</button>
        </form>
    </div>`;

/**
 * Load migration rules from the migration-rules/ folder.
 */
async function loadMigrationRules(filename: string): Promise<string> {
    const rulesPath = path.join(__dirname, '..', 'migration-rules', filename);
    return await fs.readFile(rulesPath, 'utf8');
}

/**
 * v1 -> v2: LLM-based migration that strips shared code and adds theme support.
 * Post-processes with cheerio to verify critical elements are present.
 */
async function migrateV1toV2(html: string, completePrompt: completePrompt): Promise<string> {
    const rules = await loadMigrationRules('v1-to-v2.md');
    const system = { role: 'system' as const, content: rules };
    const prompt = { role: 'user' as const, content: `Convert this v1 page to v2 format:\n\n${html}` };

    const result = await completePrompt({ prompt, system, maxTokens: 16000 });
    if (!result.completed || !result.value) {
        throw new Error('LLM migration failed: ' + (result.error?.message ?? 'no response'));
    }

    // Strip markdown fencing if present
    let migrated = result.value.trim();
    if (migrated.startsWith('```')) {
        migrated = migrated.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // Post-process with cheerio to verify and fix critical elements
    migrated = postProcessV2(migrated, html);

    return migrated;
}

/**
 * Cheerio-based post-processing to verify the LLM output meets v2 requirements.
 * Uses the original HTML as a fallback source for critical elements.
 */
export function postProcessV2(html: string, originalHtml?: string): string {
    const $ = cheerio.load(html, { decodeEntities: false });
    const $original = originalHtml ? cheerio.load(originalHtml, { decodeEntities: false }) : null;

    // --- Critical structural checks ---

    // Ensure chat-panel exists with chatForm
    if ($('#chatForm').length === 0) {
        if ($('.chat-panel').length > 0) {
            // Chat panel exists but form is missing — restore form from original or default
            const originalForm = $original?.('#chatForm').parent('.chat-panel');
            if (originalForm && originalForm.length > 0) {
                $('.chat-panel').replaceWith(originalForm.html()!);
            } else {
                // Append default form
                $('.chat-panel').append(`
        <form action="/" method="POST" id="chatForm">
            <input type="text" class="chat-input" id="chatInput" name="message" placeholder="Type a message...">
            <button type="submit" class="chat-submit">Send</button>
        </form>`);
            }
        } else {
            // Entire chat panel is missing — restore from original or use default
            const originalPanel = $original?.('.chat-panel');
            if (originalPanel && originalPanel.length > 0) {
                $('body').prepend($.html(originalPanel));
            } else {
                $('body').prepend(DEFAULT_CHAT_PANEL);
            }
        }
    }

    // Ensure thoughts div exists
    if ($('#thoughts').length === 0) {
        const originalThoughts = $original?.('#thoughts');
        if (originalThoughts && originalThoughts.length > 0) {
            $('body').append($.html(originalThoughts));
        } else {
            $('body').append('<div id="thoughts" style="display: none;"></div>');
        }
    }

    // Ensure loadingOverlay exists inside viewer-panel
    const overlay = $('#loadingOverlay');
    const viewerPanel = $('.viewer-panel');
    if (overlay.length === 0 && viewerPanel.length > 0) {
        viewerPanel.append('<div id="loadingOverlay" class="loading-overlay"><div class="spinner"></div></div>');
    } else if (overlay.length > 0 && viewerPanel.length > 0) {
        // Move inside viewer-panel if it's outside
        if (overlay.closest('.viewer-panel').length === 0) {
            const overlayHtml = $.html(overlay);
            overlay.remove();
            viewerPanel.append(overlayHtml);
        }
    }

    // --- Theme refs ---

    // Ensure theme-info.js is in <head>
    if ($('script[src="/api/theme-info.js"]').length === 0) {
        const titleEl = $('title');
        if (titleEl.length > 0) {
            titleEl.after('\n<script src="/api/theme-info.js"></script>');
        } else {
            $('head').prepend('<script src="/api/theme-info.js"></script>\n');
        }
    }

    // Ensure theme.css is in <head>
    if ($('link[href="/api/theme.css"]').length === 0) {
        const themeScript = $('script[src="/api/theme-info.js"]');
        if (themeScript.length > 0) {
            themeScript.after('\n<link rel="stylesheet" href="/api/theme.css">');
        } else {
            $('head').append('<link rel="stylesheet" href="/api/theme.css">\n');
        }
    }

    // --- Strip leftover shared CSS ---

    $('style').each(function (_, el) {
        let css = $(el).html() ?? '';
        for (const selector of SHARED_CSS_SELECTORS) {
            // Escape special regex chars in selector
            const escaped = selector.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
            // Match the full rule block: selector { ... }
            const pattern = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{[^}]*\\}`, 'g');
            css = css.replace(pattern, '');
        }
        // Remove @keyframes spin and nebula-pulse
        css = css.replace(/@keyframes\s+spin\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, '');
        css = css.replace(/@keyframes\s+nebula-pulse\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, '');
        // Remove scrollbar pseudo-element rules
        css = css.replace(/(?:^|\n)\s*(?:\*|body|)::-webkit-scrollbar(?:-(?:track|thumb|corner))?(?::hover)?\s*\{[^}]*\}/g, '');
        $(el).html(css);
    });

    // Remove empty <style> blocks
    $('style').each(function (_, el) {
        const content = ($(el).html() ?? '').trim();
        if (content === '') {
            $(el).remove();
        }
    });

    // Remove empty <script> blocks (no src)
    $('script').each(function (_, el) {
        const src = $(el).attr('src');
        if (src) return;
        const code = ($(el).html() ?? '').trim();
        if (code === '') {
            $(el).remove();
        }
    });

    // Remove duplicate inline scripts that share overlapping declarations
    return deduplicateInlineScripts($.html());
}
