import * as cheerio from 'cheerio';
import { completePrompt } from 'agentm-core';

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

/** CSS classes that belong to the shared theme and must NOT appear in page-specific <style> blocks. */
const SHARED_CSS_SELECTORS = [
    '*',
    'body',
    '.chat-panel',
    '.chat-header',
    '.chat-messages',
    '.chat-message',
    '.chat-message p',
    '.chat-message strong',
    '.chat-message pre',
    '.chat-message code',
    '.chat-message a',
    '.link-group',
    '.link-group a',
    'form',
    '.chat-input',
    '.chat-submit',
    '.loading-overlay',
    '.spinner',
    '.viewer-panel',
    '#loadingOverlay',
    '.chat-submit:disabled',
    '.chat-input:disabled',
];

const V1_TO_V2_SYSTEM_PROMPT = `You are a code migration tool. You convert SynthOS v1 pages to v2 format.

## Rules — What to REMOVE

1. **Shared CSS rules** — Remove ALL CSS rules for these selectors (they are now in theme.css):
   \`*\`, \`body\`, \`.chat-panel\`, \`.chat-header\`, \`.chat-messages\`, \`.chat-message\` (and descendants like \`.chat-message p\`, \`.chat-message strong\`, \`.chat-message pre\`, \`.chat-message code\`, \`.chat-message a\`), \`.link-group\`, \`.link-group a\`, \`form\`, \`.chat-input\`, \`.chat-submit\`, \`.loading-overlay\`, \`.spinner\`, \`.viewer-panel\`, \`#loadingOverlay\`, \`.chat-submit:disabled\`, \`.chat-input:disabled\`
   Also remove any \`@keyframes spin\` and scrollbar pseudo-element rules (\`::-webkit-scrollbar\`, \`::-webkit-scrollbar-track\`, \`::-webkit-scrollbar-thumb\`).

2. **Shared inline JS** — Remove these specific code blocks from \`<script>\` tags:
   - \`document.getElementById('chatInput').focus()\` line
   - \`chatForm\` submit event listener (the one with setTimeout and loading overlay)
   - \`saveLink\` click handler
   - \`resetLink\` click handler
   - \`window.onload\` that ONLY scrolls chatMessages (keep other onload logic!)
   - Chat panel toggle IIFE (references \`synthos-chat-collapsed\`)
   - Focus management IIFE (references \`stopImmediatePropagation\`)
   - \`// Basic chat functionality\` comment

3. **Empty \`<script>\` tags** — If a script block becomes empty after stripping, remove it entirely.

## Rules — What to ADD

1. In \`<head>\`, add these two lines right after the \`<title>\` tag (if not already present):
   \`\`\`
   <script src="/api/theme-info.js"></script>
   <link rel="stylesheet" href="/api/theme.css">
   \`\`\`

## Rules — What to TRANSFORM

Replace hardcoded Nebula Dusk colors with CSS variables in **page-specific** CSS only:
| Hardcoded | CSS Variable |
|-----------|-------------|
| \`#667eea\` | \`var(--accent-primary)\` |
| \`#764ba2\` | \`var(--accent-secondary)\` |
| \`#f093fb\` | \`var(--accent-tertiary)\` |
| \`#b794f6\` | \`var(--text-secondary)\` |
| \`#e0e0e0\` | \`var(--text-primary)\` |
| \`rgba(138, 43, 226, 0.3)\` or similar purple rgba | \`var(--border-color)\` or \`var(--accent-glow)\` (use border-color for borders, accent-glow for shadows) |
| \`#1a1a2e\` | \`var(--bg-primary)\` |
| \`#16213e\` | \`var(--bg-secondary)\` |
| \`#0f0f23\` | \`var(--bg-tertiary)\` |

For gradients using these colors (e.g. \`linear-gradient(135deg, #667eea, #764ba2)\`), replace with \`linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))\`.

## Rules — What to PRESERVE (do NOT modify)

- ALL viewer-panel HTML content (games, presentations, tools, etc.)
- ALL page-specific JavaScript (game logic, presentation logic, keyboard handlers, etc.)
- ALL page-specific CSS (game styles, presentation styles, layout rules for non-shared classes)
- Chat message history in \`.chat-messages\`
- \`<div id="thoughts">\` content
- External CDN script tags (\`<script src="...">\`)
- The two-panel layout structure (chat-panel + viewer-panel)
- The \`<div id="loadingOverlay" class="loading-overlay"><div class="spinner"></div></div>\` element
- The chat form, link-group, chat-header elements (structure only, their CSS is handled by theme)

## V2 page structure example

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SynthOS - Page Title</title>
    <script src="/api/theme-info.js"></script>
    <link rel="stylesheet" href="/api/theme.css">
    <style>
        /* Only page-specific styles here — no shared chat/layout CSS */
        .my-custom-element {
            color: var(--text-primary);
            background: var(--bg-secondary);
        }
    </style>
    <!-- external CDN scripts if needed -->
</head>
<body>
    <div class="chat-panel">
        <div class="chat-header">SynthOS</div>
        <div class="chat-messages" id="chatMessages">
            <!-- chat messages preserved -->
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
    </div>
    <div class="viewer-panel" id="viewerPanel">
        <!-- page content preserved -->
        <div id="loadingOverlay" class="loading-overlay"><div class="spinner"></div></div>
    </div>
    <div id="thoughts" style="display: none;">...</div>
    <script>
        // Only page-specific JS here — no shared chat handlers
    </script>
</body>
</html>
\`\`\`

## Output format

Return ONLY the complete migrated HTML. No markdown fences, no explanation, no commentary. Just the raw HTML starting with \`<!DOCTYPE html>\`.`;

/**
 * v1 -> v2: LLM-based migration that strips shared code and adds theme support.
 * Post-processes with cheerio to verify critical elements are present.
 */
async function migrateV1toV2(html: string, completePrompt: completePrompt): Promise<string> {
    const system = { role: 'system' as const, content: V1_TO_V2_SYSTEM_PROMPT };
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
    migrated = postProcessV2(migrated);

    return migrated;
}

/**
 * Cheerio-based post-processing to verify the LLM output meets v2 requirements.
 */
export function postProcessV2(html: string): string {
    const $ = cheerio.load(html, { decodeEntities: false });

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

    // Remove leftover shared CSS selectors from <style> blocks
    $('style').each(function (_, el) {
        let css = $(el).html() ?? '';
        for (const selector of SHARED_CSS_SELECTORS) {
            // Escape special regex chars in selector
            const escaped = selector.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
            // Match the full rule block: selector { ... }
            const pattern = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{[^}]*\\}`, 'g');
            css = css.replace(pattern, '');
        }
        // Remove @keyframes spin
        css = css.replace(/@keyframes\s+spin\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, '');
        // Remove scrollbar pseudo-element rules
        css = css.replace(/(?:^|\n)\s*(?:\*|body|)::-webkit-scrollbar(?:-(?:track|thumb))?\s*\{[^}]*\}/g, '');
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

    return $.html();
}
