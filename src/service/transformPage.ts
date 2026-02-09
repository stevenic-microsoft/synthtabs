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
        const serverScripts = scripts.length > 0 ? `<SERVER_SCRIPTS>\n${scripts}\n\n` : '';

        // Build theme context block
        let themeBlock = '';
        if (args.themeInfo) {
            const { mode, colors } = args.themeInfo;
            const colorList = Object.entries(colors)
                .map(([name, value]) => `  --${name}: ${value}`)
                .join('\n');
            themeBlock = `<THEME>\nMode: ${mode}\nCSS custom properties (use instead of hardcoded values):\n${colorList}\n\nShared shell classes (pre-styled by theme, do not redefine):\n  .chat-panel — Left sidebar container (30% width)\n  .chat-header — Chat panel title bar\n  .chat-messages — Scrollable message container\n  .chat-message — Individual message wrapper\n  .link-group — Navigation links row (Save, Pages, Reset)\n  .chat-input — Message text input\n  .chat-submit — Send button\n  .viewer-panel — Right content area (70% width)\n  .loading-overlay — Full-screen loading overlay\n  .spinner — Animated loading spinner\n\nPage title bars: To align with the chat header, apply these styles:\n  min-height: var(--header-min-height);\n  padding: var(--header-padding-vertical) var(--header-padding-horizontal);\n  line-height: var(--header-line-height);\n  display: flex; align-items: center; justify-content: center; box-sizing: border-box;\n\nFull-viewer mode: For games, animations, or full-screen content, add class "full-viewer" to the viewer-panel element to remove its padding.\n\nThe <html> element has class "${mode}-mode". Always add .light-mode CSS overrides for any page-specific styles so the page works in both light and dark themes, unless the user has explicitly requested a very specific color scheme.\n\n`;
        }

        const system: SystemMessage = {
            role: 'system',
            content: `<CURRENT_PAGE>\n${annotatedHtml}\n\n<SERVER_APIS>\n${serverAPIs}\n\n${serverScripts}${themeBlock}<USER_MESSAGE>\n${message}`
        };

        const modelInstr = args.modelInstructions ? `\n\n<MODEL_INSTRUCTIONS>\n${args.modelInstructions}` : '';
        const userInstr = args.instructions ? `\n\n<INSTRUCTIONS>\n${args.instructions}` : '';
        const prompt: UserMessage = {
            role: 'user',
            content: `${goal}${userInstr}${modelInstr}`
        };

        // 3. Call model
        const result = await completePrompt({ prompt, system, maxTokens });
        if (!result.completed) {
            return { completed: false, error: result.error };
        }

        // 4. Parse JSON change list from response
        const changes = parseChangeList(result.value);

        // 5. Apply changes
        const updatedHtml = applyChangeList(annotatedHtml, changes);

        // 6. Strip data-node-id attributes
        const cleanHtml = stripNodeIds(updatedHtml);

        return { completed: true, value: { html: cleanHtml, changeCount: changes.length } };
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
 * Apply a list of CRUD operations to annotated HTML (elements must have `data-node-id`).
 */
export function applyChangeList(html: string, changes: ChangeList): string {
    const $ = cheerio.load(html, { decodeEntities: false });

    for (const change of changes) {
        switch (change.op) {
            case 'update': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) throw new Error(`update: node ${change.nodeId} not found`);
                el.html(change.html);
                break;
            }
            case 'replace': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) throw new Error(`replace: node ${change.nodeId} not found`);
                el.replaceWith(change.html);
                break;
            }
            case 'delete': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) throw new Error(`delete: node ${change.nodeId} not found`);
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
function parseChangeList(response: string): ChangeList {
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

const goal =
`Generate changes to the web page based on the users message.
Append the users message and a brief response from the AI to the chat panel.
Maintain the full conversation history in the chat panel unless asked to clear it.
Any details or visualizations should be rendered to the viewer panel.
The basic layout structure of the page needs to be maintained.
You're free to write any additional CSS or JavaScript to enhance the page.
Write an explication of your reasoning or any hidden thoughts to the thoughts div.
If the user asks to create something like an app, tool, game, or ui create it in the viewer panel.
If the user asks to draw something use canvas to draw it in the viewer panel.
The viewer panel can be resized by the user, so for animations, games, and presentations always add the "full-viewer" class to the viewer-panel element and ensure content stays centered and uses the maximum available space (use 100% width/height, flexbox centering, or viewport-relative sizing as appropriate).

IMPORTANT: Each element in the CURRENT_PAGE has a data-node-id attribute.
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
`GET /api/data/:table
description: Retrieve all rows from a table
response: Array of JSON rows [{ id: string, ... }]

GET /api/data/:table/:id
description: Retrieve a single row from a table
response: JSON row { id: string, ... }

POST /api/data/:table
description: Replaces or adds a single row to a table and returns the row
request: JSON row { id?: string, ... }
response: { id: string, ... }

DELETE /api/data/:table/:id
description: Delete a single row from a table
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
description: Retrieve a list of all pages
response: Array of page names [string]

POST /api/scripts/:id
description: Execute a script with the passed in variables
request: { [key: string]: string }
response: string`;
