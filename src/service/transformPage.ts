import { AgentArgs, AgentCompletion, SystemMessage, UserMessage } from "agentm-core";
import { listScripts } from "../scripts";
import * as cheerio from "cheerio";
import { ThemeInfo } from "../themes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransformPageArgs extends AgentArgs {
    pagesFolder: string;
    pageState: string;
    message: string;
    maxTokens: number;
    instructions?: string;
    /** Provider-specific formatting instructions injected into the prompt. */
    modelInstructions?: string;
    /** Active theme metadata for theme-aware page generation. */
    themeInfo?: ThemeInfo;
    /** Page mode. */
    mode?: 'unlocked' | 'locked';
}

export type ChangeOp =
    | { op: "update"; nodeId: string; html: string }
    | { op: "replace"; nodeId: string; html: string }
    | { op: "delete"; nodeId: string }
    | { op: "insert"; parentId: string; position: "prepend" | "append" | "before" | "after"; html: string };

export type ChangeList = ChangeOp[];

interface FailedOp {
    op: ChangeOp;
    reason: string;
}

interface ApplyResult {
    html: string;
    failedOps: FailedOp[];
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface TransformPageResult {
    html: string;
    changeCount: number;
}

export async function transformPage(args: TransformPageArgs): Promise<AgentCompletion<TransformPageResult>> {
    const { pagesFolder, pageState, message, maxTokens, completePrompt } = args;

    // 1. Assign data-node-id to every element
    const { html: annotatedHtml } = assignNodeIds(pageState);

    try {
        // 2. Build prompt
        const scripts = await listScripts(pagesFolder);
        const serverScripts = `<SERVER_SCRIPTS>\n${scripts || ''}`;
        const currentPage = `<CURRENT_PAGE>\n${annotatedHtml}`;

        // Build theme context block
        let themeBlock = '<THEME>\n';
        if (args.themeInfo) {
            const { mode, colors } = args.themeInfo;
            const colorList = Object.entries(colors)
                .map(([name, value]) => `  --${name}: ${value}`)
                .join('\n');
            themeBlock += `Mode: ${mode}\nCSS custom properties (use instead of hardcoded values):\n${colorList}\n\nShared shell classes (pre-styled by theme, do not redefine):\n  .chat-panel — Left sidebar container (30% width)\n  .chat-header — Chat panel title bar\n  .chat-messages — Scrollable message container\n  .chat-message — Individual message wrapper\n  .link-group — Navigation links row (Save, Pages, Reset)\n  .chat-input — Message text input\n  .chat-submit — Send button\n  .viewer-panel — Right content area (70% width)\n  .loading-overlay — Full-screen loading overlay\n  .spinner — Animated loading spinner\n\nPage title bars: To align with the chat header, apply these styles:\n  min-height: var(--header-min-height);\n  padding: var(--header-padding-vertical) var(--header-padding-horizontal);\n  line-height: var(--header-line-height);\n  display: flex; align-items: center; justify-content: center; box-sizing: border-box;\n\nFull-viewer mode: For games, animations, or full-screen content, add class "full-viewer" to the viewer-panel element to remove its padding.\n\nChat panel behaviours (auto-injected via page script — do NOT recreate in page code):\n  The server injects page-v2.js after transformation. It provides:\n  - Form submit handler: sets action to window.location.pathname, shows #loadingOverlay, disables inputs\n  - Save/Reset link handlers (#saveLink, #resetLink)\n  - Chat scroll to bottom (#chatMessages)\n  - Chat toggle button (.chat-toggle) — created dynamically if not in markup\n  - .chat-input-wrapper — wraps #chatInput with a brainstorm icon button\n  - Brainstorm modal (#brainstormModal) — LLM-powered brainstorm UI, created dynamically\n  - Focus management — keeps keyboard input directed to #chatInput\n\n  Do NOT:\n  - Create your own form submit handler, toggle button, or input wrapper\n  - Modify or replace .chat-panel, .chat-header, .link-group, #chatForm, or .chat-toggle\n  - INSERT new <script> blocks that duplicate existing ones — when fixing JavaScript, UPDATE or REPLACE the existing script's nodeId instead. Always give inline scripts a unique id attribute.\n  - Set the form action attribute (page-v2.js sets it dynamically)\n  - Include these CSS rules (in the theme): #loadingOverlay position, .chat-submit:disabled, .chat-input:disabled\n\n  To add chat messages: use insert with parentId of #chatMessages and position "append".\n  #chatMessages is the only unlocked element inside .chat-panel.\n\nThe <html> element has class "${mode}-mode". Always add .light-mode CSS overrides for any page-specific styles so the page works in both light and dark themes, unless the user has explicitly requested a very specific color scheme.`;
        }

        const systemMessage = [currentPage, serverAPIs, serverScripts, themeBlock, messageFormat].join('\n\n');
        const system: SystemMessage = {
            role: 'system',
            content: systemMessage
        };

        const userInstr = args.instructions || '';
        const modelInstr = args.modelInstructions || '';
        const instructions = [userInstr, modelInstr, transformInstr].filter(s => s.trim() !== '').join('\n');
        const prompt: UserMessage = {
            role: 'user',
            content: `<USER_MESSAGE>\n${message}\n\n<INSTRUCTIONS>\n${instructions}`
        };

        // 3. Call model
        const result = await completePrompt({ prompt, system, maxTokens });
        if (!result.completed) {
            return { completed: false, error: result.error };
        }

        // 4. Parse JSON change list from response
        const changes = parseChangeList(result.value);

        // 5. Apply changes (first pass — with failure reporting)
        const firstPass = applyChangeListWithReport(annotatedHtml, changes);
        let finalHtml = firstPass.html;
        let successCount = changes.length - firstPass.failedOps.length;

        // 6. Repair pass — if any ops failed, make one follow-up LLM call
        if (firstPass.failedOps.length > 0) {
            console.warn(`transformPage: ${firstPass.failedOps.length} op(s) failed — attempting repair pass`);
            try {
                // Re-assign fresh node IDs on the partially-updated HTML
                const { html: reAnnotatedHtml } = assignNodeIds(stripNodeIds(firstPass.html));

                // Build compact repair prompt
                const failedSummary = firstPass.failedOps
                    .map((f, i) => `${i + 1}. op="${f.op.op}" — ${f.reason}\n   original: ${JSON.stringify(f.op)}`)
                    .join('\n');

                const repairSystem: SystemMessage = {
                    role: 'system',
                    content: `<CURRENT_PAGE>\n${reAnnotatedHtml}\n\n<FAILED_OPERATIONS>\n${failedSummary}`
                };

                const repairPrompt: UserMessage = {
                    role: 'user',
                    content: repairUSER_MESSAGE
                };

                const repairMaxTokens = Math.min(maxTokens, 4096);
                const repairResult = await completePrompt({ prompt: repairPrompt, system: repairSystem, maxTokens: repairMaxTokens });

                if (repairResult.completed) {
                    const repairChanges = parseChangeList(repairResult.value);
                    if (repairChanges.length > 0) {
                        const repairPass = applyChangeListWithReport(reAnnotatedHtml, repairChanges);
                        const repairSuccessCount = repairChanges.length - repairPass.failedOps.length;
                        if (repairPass.failedOps.length > 0) {
                            console.warn(`transformPage: repair pass had ${repairPass.failedOps.length} remaining failure(s) — keeping partial result`);
                        }
                        finalHtml = repairPass.html;
                        successCount += repairSuccessCount;
                        console.log(`transformPage: repair pass applied ${repairSuccessCount} fix(es)`);
                    } else {
                        console.log('transformPage: repair pass returned no changes (model deemed repairs unnecessary)');
                    }
                } else {
                    console.warn('transformPage: repair LLM call failed — keeping partial result from first pass');
                }
            } catch (repairErr: unknown) {
                const msg = repairErr instanceof Error ? repairErr.message : String(repairErr);
                console.warn(`transformPage: repair pass error — ${msg} — keeping partial result from first pass`);
            }
        }

        // 7. Strip data-node-id attributes
        const cleanHtml = stripNodeIds(finalHtml);

        // 8. Remove duplicate inline scripts (LLM may insert instead of update)
        const dedupedHtml = deduplicateInlineScripts(cleanHtml);

        return { completed: true, value: { html: dedupedHtml, changeCount: successCount } };
    } catch (err: unknown) {
        // On any error: return original page with error block injected
        const cleanOriginal = stripNodeIds(annotatedHtml);
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorHtml = injectError(cleanOriginal, 'Something went wrong try again', errorMessage);
        return { completed: true, value: { html: errorHtml, changeCount: 0 } };
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Assign sequential `data-node-id` to every element in the HTML.
 */
export function assignNodeIds(html: string): { html: string; nodeCount: number } {
    const $ = cheerio.load(html, { decodeEntities: false });

    let counter = 0;
    $('*').each(function (this: cheerio.Element) {
        const el = $(this);
        if (this.type === 'tag') {
            el.attr('data-node-id', String(counter++));
        }
    });
    return { html: $.html(), nodeCount: counter };
}

/**
 * Remove all `data-node-id` attributes from the HTML.
 */
export function stripNodeIds(html: string): string {
    const $ = cheerio.load(html, { decodeEntities: false });
    $('[data-node-id]').removeAttr('data-node-id');
    return $.html();
}

/**
 * Remove duplicate inline `<script>` blocks using a two-pass approach.
 *
 * **Pass 1 — ID-based dedup (deterministic):**
 * Groups inline scripts by their `id` attribute (skipping system IDs:
 * page-info, page-helpers, page-script, error and scripts with `src`).
 * If any group has 2+ scripts with the same id, all but the **last** are removed.
 *
 * **Pass 2 — Declaration-overlap dedup (heuristic fallback):**
 * For scripts with no `id`, no `src`, and no `type="application/json"`,
 * compares top-level declaration names. When overlap >= 60% of the smaller
 * set (minimum 2 declarations each), the **first** script is removed.
 */
export function deduplicateInlineScripts(html: string): string {
    const $ = cheerio.load(html, { decodeEntities: false });

    const SYSTEM_IDS = new Set(['page-info', 'page-helpers', 'page-script', 'error']);

    // ── Pass 1: ID-based dedup ──────────────────────────────────────────
    const idGroups = new Map<string, cheerio.Cheerio[]>();
    $('script').each(function (_, rawEl) {
        const el = $(rawEl);
        if (el.attr('src')) return;
        const id = el.attr('id');
        if (!id || SYSTEM_IDS.has(id)) return;

        if (!idGroups.has(id)) {
            idGroups.set(id, []);
        }
        idGroups.get(id)!.push(el);
    });

    for (const [id, group] of idGroups) {
        if (group.length < 2) continue;
        for (let i = 0; i < group.length - 1; i++) {
            console.log(`deduplicateInlineScripts: removing duplicate script id="${id}" (keeping last of ${group.length})`);
            group[i].remove();
        }
    }

    // ── Pass 2: Declaration-overlap dedup (fallback for id-less scripts) ─
    interface ScriptInfo {
        el: cheerio.Cheerio;
        declarations: Set<string>;
    }

    const declPattern = /(?:^|;|\n)\s*(?:let|const|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

    const scripts: ScriptInfo[] = [];
    $('script').each(function (_, rawEl) {
        const el = $(rawEl);
        if (el.attr('src')) return;
        if (el.attr('id')) return;
        if ((el.attr('type') ?? '').toLowerCase() === 'application/json') return;

        const code = (el.html() ?? '').trim();
        if (!code) return;

        const declarations = new Set<string>();
        let m: RegExpExecArray | null;
        declPattern.lastIndex = 0;
        while ((m = declPattern.exec(code)) !== null) {
            declarations.add(m[1]);
        }

        scripts.push({ el, declarations });
    });

    // Compare each pair; mark earlier script for removal when overlap is high
    const toRemove = new Set<number>();
    for (let i = 0; i < scripts.length; i++) {
        if (toRemove.has(i)) continue;
        for (let j = i + 1; j < scripts.length; j++) {
            if (toRemove.has(j)) continue;

            const a = scripts[i].declarations;
            const b = scripts[j].declarations;

            // Both must have at least 2 declarations
            if (a.size < 2 || b.size < 2) continue;

            // Count overlap
            let overlap = 0;
            for (const name of a) {
                if (b.has(name)) overlap++;
            }

            const smallerSize = Math.min(a.size, b.size);
            if (overlap / smallerSize >= 0.6) {
                // Remove the first (older) script, keep the last (LLM fix)
                console.log(`deduplicateInlineScripts: removing duplicate script (${overlap}/${smallerSize} declaration overlap)`);
                toRemove.add(i);
                break; // script i is already marked, move on
            }
        }
    }

    // Remove marked scripts
    for (const idx of toRemove) {
        scripts[idx].el.remove();
    }

    return $.html();
}

/**
 * Apply a list of CRUD operations to annotated HTML (elements must have `data-node-id`).
 */
export function applyChangeList(html: string, changes: ChangeList): string {
    const $ = cheerio.load(html, { decodeEntities: false });

    for (const change of changes) {
        switch (change.op) {
            case 'update': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) {
                    console.warn(`applyChangeList: skipping update — node ${change.nodeId} not found (already removed?)`);
                    break;
                }
                el.html(change.html);
                break;
            }
            case 'replace': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) {
                    console.warn(`applyChangeList: skipping replace — node ${change.nodeId} not found (already removed?)`);
                    break;
                }
                el.replaceWith(change.html);
                break;
            }
            case 'delete': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) {
                    console.warn(`applyChangeList: skipping delete — node ${change.nodeId} not found (already removed?)`);
                    break;
                }
                el.remove();
                break;
            }
            case 'insert': {
                const parent = $(`[data-node-id="${change.parentId}"]`);
                if (parent.length === 0) throw new Error(`insert: parent node ${change.parentId} not found`);
                switch (change.position) {
                    case 'prepend': parent.prepend(change.html); break;
                    case 'append': parent.append(change.html); break;
                    case 'before': parent.before(change.html); break;
                    case 'after': parent.after(change.html); break;
                    default: throw new Error(`insert: unknown position "${(change as any).position}"`);
                }
                break;
            }
            default:
                throw new Error(`Unknown change op: "${(change as any).op}"`);
        }
    }

    return $.html();
}

/**
 * Apply a list of CRUD operations and report any ops that failed due to
 * missing nodes (instead of throwing). Unknown op types still throw.
 */
function applyChangeListWithReport(html: string, changes: ChangeList): ApplyResult {
    const $ = cheerio.load(html, { decodeEntities: false });
    const failedOps: FailedOp[] = [];

    for (const change of changes) {
        switch (change.op) {
            case 'update': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) {
                    const reason = `node ${change.nodeId} not found (already removed?)`;
                    console.warn(`applyChangeListWithReport: skipping update — ${reason}`);
                    failedOps.push({ op: change, reason });
                    break;
                }
                el.html(change.html);
                break;
            }
            case 'replace': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) {
                    const reason = `node ${change.nodeId} not found (already removed?)`;
                    console.warn(`applyChangeListWithReport: skipping replace — ${reason}`);
                    failedOps.push({ op: change, reason });
                    break;
                }
                el.replaceWith(change.html);
                break;
            }
            case 'delete': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) {
                    const reason = `node ${change.nodeId} not found (already removed?)`;
                    console.warn(`applyChangeListWithReport: skipping delete — ${reason}`);
                    failedOps.push({ op: change, reason });
                    break;
                }
                el.remove();
                break;
            }
            case 'insert': {
                const parent = $(`[data-node-id="${change.parentId}"]`);
                if (parent.length === 0) {
                    const reason = `parent node ${change.parentId} not found`;
                    console.warn(`applyChangeListWithReport: skipping insert — ${reason}`);
                    failedOps.push({ op: change, reason });
                    break;
                }
                switch (change.position) {
                    case 'prepend': parent.prepend(change.html); break;
                    case 'append': parent.append(change.html); break;
                    case 'before': parent.before(change.html); break;
                    case 'after': parent.after(change.html); break;
                    default: throw new Error(`insert: unknown position "${(change as any).position}"`);
                }
                break;
            }
            default:
                throw new Error(`Unknown change op: "${(change as any).op}"`);
        }
    }

    return { html: $.html(), failedOps };
}

/**
 * Inject an error script block into the page HTML.
 */
export function injectError(html: string, message: string, details: string): string {
    const $ = cheerio.load(html, { decodeEntities: false });
    const errorPayload = JSON.stringify({ message, details });
    const scriptTag = `<script id="error" type="application/json">${errorPayload}</script>`;

    // Remove any existing error block first
    $('script#error').remove();

    // Inject before closing </body> or at end
    if ($('body').length > 0) {
        $('body').append(scriptTag);
    } else {
        return html + scriptTag;
    }

    return $.html();
}

/**
 * Parse a JSON change list from the model's raw response text.
 * Handles responses that may include markdown fences or extra text around the JSON.
 */
export function parseChangeList(response: string): ChangeList {
    // Try direct parse first
    try {
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed)) return parsed as ChangeList;
    } catch {
        // fall through to extraction
    }

    // Try to extract JSON array from the response
    const match = response.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) return parsed as ChangeList;
        } catch {
            // fall through
        }
    }

    throw new Error('Failed to parse change list from model response');
}

// ---------------------------------------------------------------------------
// Prompt constants
// ---------------------------------------------------------------------------

const messageFormat =
`<MESSAGE_FORMAT>
<div class="chat-message"><p><strong>{SynthOS: | User:}</strong> {message contents}</p></div>
`

const transformInstr =
`Apply the users <USER_MESSAGE> to the .viewerPanel of the <CURRENT_PAGE> by generating a list of changes in JSON format.
Never remove any element that has a data-locked attribute. You may modfiy the inner text of a data-locked element or any of its unlocked child elements.

If the <USER_MESSAGE> involves clearning the chat history, remove all .chat-message elements inside the #chatMessages container except for the first SynthOS: message. You may modify that message contents if requested.
If there's no <USER_MESSAGE> add a SynthOS: message to the chat with aasking the user what they would like to do.
If there is a <USER_MESSAGE> but the intent is unclear, add a User: message with the <USER_MESSAGE> to the chat and add a SynthOS: message asking the user for clarification on their intent.
If there is a <USER_MESSAGE> with clear intent, add a User: message with the <USER_MESSAGE> to the chat and add a SynthOS: message explaining your change or answering their question.
If a <USER_MESSAGE> is overly long, summarize the User: message.

When updating the .viewerPanel you may alse add/remove script & style blocks to the header unless they're data-locked.
You may add/remove new script blocks to the body but all script & style blocks should have a unique id.
You may modify the contents of a data-locked script block but may not remove it.

Every <CURRENT_PAGE> has hidden data-locked "thoughts" and "instructions" divs.
The instruction div, if pressent, contains custom <INSTRUCTIONS> for that page that should be followed in addition to these general instructions. You may modify the instructions div if needed (e.g. to add new instructions or update existing ones), but do not remove it. Add it if it's missing though.
The thoughts block is for your internal use only — you can write anything in there to help you reason through the user's request, but it is not visible to the user. You can also use it to keep track of any relevant state or information that may be useful across multiple turns.
If the <USER_MESSAGE> indicates that a change didn't work, use your thoughts to diagnose the problem before fixing the issue.

The <MESSAGE_FORMAT> section provides the HTML structure for chat messages in the chat panel. Use this format when generating new messages to ensure they display correctly.
The <SERVER_APIS> section provides a list of available server APIs and helper functions you can call from injected scripts. You should use the synthos.* helper functions for any server API calls instead of raw fetch().
The <SERVER_SCRIPTS> section provides a list of available scripts you can call from injected scripts. These are user-created scripts stored on the server that can be executed by calling synthos.scripts.run(id, variables).
The <THEME> section provides details on the current theme's color scheme and shared shell classes to help you generate theme-aware pages that fit seamlessly into the user experience.
The viewer panel can be resized by the user, so for animations, games, and presentations should always add the ",full-viewer" class to the viewer-panel element and ensure content stays centered and uses the maximum available space (use 100% width/height, flexbox centering, or viewport-relative sizing as appropriate).
window.themeInfo is available and has a structure like this: { mode: 'light' | 'dark', colors: { primary: '#hex', secondary: '#hex', background: '#hex', text: '#hex', ... } }. Use these colors instead of hardcoded values to ensure your page works with the user's selected theme and any custom themes they may have. You can also use the shared shell classes defined in the theme info for consistent styling of common elements like the chat panel and header.

Do not add duplicate script blocks with the same logic! Consolidate inline scrips if needed and double check that variables and functions are defined in the correct order.

Each element in the CURRENT_PAGE has a data-node-id attribute. Don't use the id attribute for targeting nodes (reserve it for scripts and styles) — use data-node-id.
If you're trying to assign an id to script or style block, use "replace" not "update".
Your first operation should always be an update to your thoughts block, where you can reason through the user's request and plan your changes before applying them to the page.
Return a JSON array of change operations to apply to the page. Do NOT return the full HTML page.

Each operation must be one of:
{ "op": "update", "nodeId": "<data-node-id>", "html": "<new innerHTML>" }
  — replaces the innerHTML of the target element

{ "op": "replace", "nodeId": "<data-node-id>", "html": "<new outerHTML>" }
  — replaces the entire element (outerHTML) with new markup

{ "op": "delete", "nodeId": "<data-node-id>" }
  — removes the element from the page

{ "op": "insert", "parentId": "<data-node-id>", "position": "prepend"|"append"|"before"|"after", "html": "<new element HTML>" }
  — inserts new HTML relative to the parent element

Return ONLY the JSON array. Example:
[
  { "op": "update", "nodeId": "5", "html": "<p>Hello world</p>" },
  { "op": "insert", "parentId": "3", "position": "append", "html": "<div class=\\"msg\\">New message</div>" }
]`;

const serverAPIs =
`<SERVER_APIS>
GET /api/data/:page/:table
description: Retrieve all rows from a page-scoped table (tables are stored per-page). Supports pagination via query params.
query params: limit (number, optional) — max rows to return; offset (number, optional, default 0) — rows to skip
response (without limit): Array of JSON rows [{ id: string, ... }]
response (with limit): { items: [{ id: string, ... }], total: number, offset: number, limit: number, hasMore: boolean }

GET /api/data/:page/:table/:id
description: Retrieve a single row from a page-scoped table
response: JSON row { id: string, ... }

POST /api/data/:page/:table
description: Replaces or adds a single row to a page-scoped table and returns the row
request: JSON row { id?: string, ... }
response: { id: string, ... }

DELETE /api/data/:page/:table/:id
description: Delete a single row from a page-scoped table
response: { success: true }

POST /api/generate/image
description: Generate an image based on a prompt
request: { prompt: string, shape: 'square' | 'portrait' | 'landscape', style: 'vivid' | 'natural' }
response: { url: string }

POST /api/generate/completion
description: Generates a text completion based on a prompt
request: { prompt: string, temperature?: number }
response: { answer: string, explanation: string }

GET /api/pages
description: Retrieve a list of all pages with metadata
response: Array of { name: string, title: string, categories: string[], pinned: boolean, createdDate: string, lastModified: string, pageVersion: number, mode: 'unlocked' | 'locked' }

GET /api/pages/:name
description: Retrieve metadata for a single page
response: { title: string, categories: string[], pinned: boolean, createdDate: string, lastModified: string, pageVersion: number, mode: 'unlocked' | 'locked' }

POST /api/pages/:name
description: Update page metadata (merge semantics — send only fields to change; lastModified is auto-set)
request: { title?: string, categories?: string[], pinned?: boolean, mode?: 'unlocked' | 'locked' }
response: Full metadata object

DELETE /api/pages/:name
description: Delete a user page (cannot delete required/system pages)
response: { deleted: true }

POST /api/scripts/:id
description: Execute a script with the passed in variables
request: { [key: string]: string }
response: string

POST /api/search/web
description: Search the web using Brave Search (must be enabled in Settings > Services)
request: { query: string, count?: number, country?: string, freshness?: string }
response: { results: [{ title: string, url: string, description: string }] }

PAGE HELPERS (available globally as window.synthos):
  synthos.data.list(table, opts?)       — GET /api/data/:page/:table  (auto-scoped to current page; opts: { limit?, offset? } — when limit is set, returns { items, total, offset, limit, hasMore })
  synthos.data.get(table, id)           — GET /api/data/:page/:table/:id  (auto-scoped to current page)
  synthos.data.save(table, row)         — POST /api/data/:page/:table  (auto-scoped to current page)
  synthos.data.remove(table, id)        — DELETE /api/data/:page/:table/:id  (auto-scoped to current page)
  synthos.generate.image({ prompt, shape, style })       — POST /api/generate/image
  synthos.generate.completion({ prompt, temperature? })  — POST /api/generate/completion
  synthos.scripts.run(id, variables)    — POST /api/scripts/:id
  synthos.pages.list()                  — GET /api/pages
  synthos.pages.get(name)               — GET /api/pages/:name
  synthos.pages.update(name, metadata)  — POST /api/pages/:name
  synthos.pages.remove(name)            — DELETE /api/pages/:name
  synthos.search.web(query, opts?)      — POST /api/search/web  (opts: { count?, country?, freshness? })
All methods return Promises. Prefer these helpers over raw fetch().`;

const repairUSER_MESSAGE =
`Some change operations from the previous response failed because the target nodes no longer exist in the page (they were removed or replaced by earlier operations in the same batch).

Below is the CURRENT state of the page after the successful operations were applied, followed by the list of operations that failed and why.

Re-generate corrected versions of ONLY the failed operations, targeting nodes that actually exist in the current page. Each element has a data-node-id attribute you can reference.
If a failed operation is no longer needed (e.g. the intended change was already accomplished by another op), omit it.
Return an empty JSON array [] if no repairs are needed.

Return ONLY a JSON array of change operations using the same format:
{ "op": "update", "nodeId": "<data-node-id>", "html": "<new innerHTML>" }
{ "op": "replace", "nodeId": "<data-node-id>", "html": "<new outerHTML>" }
{ "op": "delete", "nodeId": "<data-node-id>" }
{ "op": "insert", "parentId": "<data-node-id>", "position": "prepend"|"append"|"before"|"after", "html": "<new element HTML>" }`;

