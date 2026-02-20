import { loadPageMetadata, loadPageState, normalizePageName, PAGE_VERSION, REQUIRED_PAGES, savePageMetadata, savePageState, updatePageState } from "../pages";
import { getModelEntry, hasConfiguredSettings, loadSettings } from "../settings";
import { Application } from 'express';
import { transformPage, buildRouteHints } from "./transformPage";
import { getModelInstructions } from "./modelInstructions";
import { SynthOSConfig } from "../init";
import { createCompletePrompt } from "./createCompletePrompt";
import { completePrompt } from "../models";
import { green, red, dim, estimateTokens } from "./debugLog";
import { loadThemeInfo } from "../themes";
import { Customizer } from "../customizer";
import * as cheerio from 'cheerio';

/**
 * Required CDN imports that must be present on every v2 page.
 * Each entry maps a detection selector to the script tag src to inject.
 */
const REQUIRED_IMPORTS: { selector: string; src: string }[] = [
    { selector: 'script[src*="marked"]', src: 'https://cdnjs.cloudflare.com/ajax/libs/marked/14.1.1/marked.min.js' },
];

/**
 * Uses cheerio to ensure every required import is present in the page's <head>.
 * Skips imports that already exist (detected via selector).
 */
function ensureRequiredImports(html: string, pageVersion: number): string {
    if (pageVersion < 2) return html;
    const $ = cheerio.load(html);
    for (const imp of REQUIRED_IMPORTS) {
        if ($(imp.selector).length === 0) {
            $('head').append(`<script src="${imp.src}"></script>\n`);
        }
    }
    return $.html();
}

const HOME_PAGE_ROUTE = '/builder';
const PAGE_NOT_FOUND = 'Page not found';

function injectPageInfoScript(html: string, pageName: string): string {
    const tag = `<script id="page-info" src="/api/page-info.js?page=${encodeURIComponent(pageName)}"></script>`;

    // Replace any existing page-info script (may have a stale page name from the template)
    const existing = html.match(/<script\s+id="page-info"[^>]*><\/script>/);
    if (existing) {
        return html.replace(existing[0], tag);
    }

    const idx = html.indexOf('</head>');
    if (idx !== -1) {
        return html.slice(0, idx) + tag + '\n' + html.slice(idx);
    }
    return tag + '\n' + html;
}

function injectPageHelpers(html: string, pageVersion: number): string {
    if (pageVersion < 2) return html;
    const tag = `<script id="page-helpers" src="/api/page-helpers.js?v=${pageVersion}"></script>`;

    // Remove any existing page-helpers script (may be at wrong position from prior LLM output)
    // so it gets re-injected at the correct position below.
    const existing = html.match(/<script\s+id="page-helpers"[^>]*><\/script>/);
    if (existing) {
        html = html.replace(existing[0], '');
    }

    // Inject into <head> after page-info so helpers are available before inline body scripts
    const pageInfo = html.indexOf('id="page-info"');
    if (pageInfo !== -1) {
        const closeTag = html.indexOf('</script>', pageInfo);
        if (closeTag !== -1) {
            const insertAt = closeTag + '</script>'.length;
            return html.slice(0, insertAt) + '\n' + tag + html.slice(insertAt);
        }
    }

    const idx = html.indexOf('</head>');
    if (idx !== -1) {
        return html.slice(0, idx) + tag + '\n' + html.slice(idx);
    }
    return tag + '\n' + html;
}

function injectPageScript(html: string, pageVersion: number): string {
    if (pageVersion < 2) return html;
    if (html.includes('id="page-script"')) return html;
    const tag = `<script id="page-script" src="/api/page-script.js?v=${pageVersion}"></script>`;
    const idx = html.indexOf('</body>');
    if (idx !== -1) {
        return html.slice(0, idx) + tag + '\n' + html.slice(idx);
    }
    return html + '\n' + tag;
}

export function usePageRoutes(config: SynthOSConfig, app: Application, customizer?: Customizer): void {
    // Redirect / to /home page
    app.get('/', (req, res) => res.redirect(HOME_PAGE_ROUTE));
    
    // Page retrieval
    app.get('/:page', async (req, res) => {
        // Redirect if settings not configured
        const { page } = req.params;
        const isConfigured = await hasConfiguredSettings(config.pagesFolder);
        if (!isConfigured && page !== 'settings') {
            res.redirect('/settings?firstRun=1');
            return;
        }

        // Ensure page exists
        const pageState = await loadPageWithFallback(page, config, false);
        if (!pageState) {
            res.status(404).send(PAGE_NOT_FOUND);
            return;
        }

        // Load page metadata for version-based script injection
        const metadata = await loadPageMetadata(config.pagesFolder, page, config.requiredPagesFolder);
        const pageVersion = metadata?.pageVersion ?? 0;

        // Block outdated pages (redirect to tabs list so user sees upgrade UI)
        if (pageVersion < PAGE_VERSION && !REQUIRED_PAGES.includes(page)) {
            res.redirect(customizer?.tabsListRoute ?? '/pages');
            return;
        }

        let html = ensureRequiredImports(pageState, pageVersion);
        html = injectPageInfoScript(html, page);
        html = injectPageHelpers(html, pageVersion);
        html = injectPageScript(html, pageVersion);
        res.send(html);
    });

    // Page reset
    app.get('/:page/reset', async (req, res) => {
        // Redirect if settings not configured
        const { page } = req.params;
        const isConfigured = await hasConfiguredSettings(config.pagesFolder);
        if (!isConfigured) {
            res.redirect('/settings?firstRun=1');
            return;
        }

        // Ensure page exists
        const pageState = await loadPageWithFallback(page, config, true);
        if (!pageState) {
            res.status(404).send(PAGE_NOT_FOUND);
            return;
        }

        res.redirect(`/${page}`);
    });

    // Page save
    app.post('/:page/save', async (req, res) => {
        try {
            // Redirect if settings not configured
            const { page } = req.params;
            const isConfigured = await hasConfiguredSettings(config.pagesFolder);
            if (!isConfigured) {
                res.status(400).json({ error: 'Settings not configured' });
                return;
            }

            // Extract fields from JSON body
            const { title, categories, greeting } = req.body;
            if (!title || typeof title !== 'string') {
                res.status(400).json({ error: 'title is required' });
                return;
            }
            if (!categories || !Array.isArray(categories) || categories.length === 0) {
                res.status(400).json({ error: 'categories is required (array of strings)' });
                return;
            }

            // Normalize page name from title
            const saveAs = normalizePageName(title);
            if (!saveAs) {
                res.status(400).json({ error: 'Invalid title — cannot derive a page name' });
                return;
            }

            // Reject reserved names
            if (saveAs === 'builder') {
                res.status(400).json({ error: '"Builder" is a reserved page name' });
                return;
            }

            // Load page state
            let pageState = await loadPageWithFallback(page, config, false);
            if (!pageState) {
                res.status(404).json({ error: PAGE_NOT_FOUND });
                return;
            }

            // If greeting is provided, process with cheerio
            if (greeting && typeof greeting === 'string' && greeting.trim().length > 0) {
                const $ = cheerio.load(pageState);
                const messages = $('#chatMessages .chat-message');
                // Keep only the first message, remove the rest
                messages.slice(1).remove();
                // Update the greeting text in the first message
                const firstP = messages.first().find('p');
                const strong = firstP.find('strong');
                if (strong.length) {
                    firstP.html('<strong>Synthos:</strong> ' + greeting.trim());
                }
                pageState = $.html();
            }

            // Inject save-line marker at the end of chat messages (skip for locked pages)
            const sourceMetadata = await loadPageMetadata(config.pagesFolder, page, config.requiredPagesFolder);
            if (sourceMetadata?.mode !== 'locked') {
                const $ = cheerio.load(pageState);
                // Remove any existing save-line first
                $('#chatMessages .save-line').remove();
                // Append new save-line
                $('#chatMessages').append(
                    '<div class="save-line" data-locked="true"><span class="save-line-label">Saved</span></div>'
                );
                pageState = $.html();
            }

            // Save as new page
            await savePageState(config.pagesFolder, saveAs, pageState, title, categories);

            // Also update metadata with categories (in case page.json already existed)
            await savePageMetadata(config.pagesFolder, saveAs, {
                title,
                categories,
                pinned: false,
                showInAll: true,
                createdDate: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                pageVersion: PAGE_VERSION,
                mode: 'unlocked',
            });

            res.json({ redirect: `/${saveAs}` });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // Page transformation
    app.post('/:page', async (req, res) => {
        try {
            // Ensure settings configured
            const { page } = req.params;
            const isConfigured = await hasConfiguredSettings(config.pagesFolder);
            if (!isConfigured) {
                res.status(400).send('Settings not configured');
                return;
            }

            // Ensure page exists
            const pageState = await loadPageWithFallback(page, config, false);
            if (!pageState) {
                res.status(404).send(PAGE_NOT_FOUND);
                return;
            }

            // Get required and optional parameters
            const { message } = req.body; // Extract the message from the request body
            if (typeof message !== 'string') {
                res.status(400).send('Invalid or missing message parameter');
                return;
            }

            // Create model instance
            const innerCompletePrompt = await createCompletePrompt(config.pagesFolder, 'builder', req.body.model);
            const debugVerbose = config.debugPageUpdates;
            let inputChars = 0;
            let outputChars = 0;
            const completePrompt: completePrompt = async (args) => {
                if (debugVerbose) {
                    console.log(green(dim('\n  ===== PAGE UPDATE REQUEST =====')));
                    console.log(green(`  SYSTEM:\n${args.system?.content}`));
                    console.log(green(`\n  PROMPT:\n${args.prompt.content}`));
                }
                inputChars += (args.system?.content?.length ?? 0) + (args.prompt.content?.length ?? 0);
                const result = await innerCompletePrompt(args);
                if (result.completed) {
                    outputChars += result.value?.length ?? 0;
                }
                if (debugVerbose) {
                    console.log(green(dim('\n  ----- PAGE UPDATE RESPONSE -----')));
                    if (result.completed) {
                        console.log(green(`  RESPONSE:\n${result.value}`));
                    } else {
                        console.log(red(`  ERROR: ${result.error?.message}`));
                    }
                    console.log(green(dim('  ================================\n')));
                }
                return result;
            }

            // Transform and cache updated page
            const pagesFolder = config.pagesFolder;
            const settings = await loadSettings(config.pagesFolder);
            const builder = getModelEntry(settings, 'builder');
            const { instructions } = builder;
            const theme = settings.theme;
            const themeInfo = await loadThemeInfo(theme ?? 'nebula-dusk', config);
            const modelInstructions = getModelInstructions(builder.provider);
            const configuredConnectors = settings.connectors;
            const configuredAgents = settings.agents;
            const routeHints = customizer ? buildRouteHints(customizer) : undefined;
            const customTransformInstructions = customizer ? customizer.getTransformInstructions() : undefined;
            const result = await transformPage({ pagesFolder, pageState, message, instructions, modelInstructions, completePrompt, themeInfo, configuredConnectors, configuredAgents, routeHints, customTransformInstructions });
            if (result.completed) {
                const { html, changeCount } = result.value!;
                if (config.debug) {
                    const inTokens = estimateTokens(inputChars).toLocaleString();
                    const outTokens = estimateTokens(outputChars).toLocaleString();
                    console.log(`  page: ${page} | message: ${message.length} chars | changes: ${changeCount} ops | ~${inTokens} in / ~${outTokens} out tokens`);
                }
                updatePageState(page, html);

                // Update lastModified timestamp in page metadata
                const metadata = await loadPageMetadata(pagesFolder, page, config.requiredPagesFolder);
                if (metadata) {
                    metadata.lastModified = new Date().toISOString();
                    await savePageMetadata(pagesFolder, page, metadata);
                }

                // Inject required imports and page scripts (same as GET)
                const pv = metadata?.pageVersion ?? 0;
                let out = ensureRequiredImports(html, pv);
                out = injectPageInfoScript(out, page);
                out = injectPageHelpers(out, pv);
                out = injectPageScript(out, pv);
                res.send(out);
            } else {
                throw result.error;
            }
        } catch (err: unknown) {
            if (config.debug) {
                console.log(red(`  ERROR: ${(err as Error).message}`));
            } else {
                console.error(err);
            }
            res.status(500).send((err as Error).message);
        }
    });
}

export async function loadPageWithFallback(page: string, config: SynthOSConfig, reset: boolean): Promise<string|undefined> {
    // Try primary pages folder first
    const pageState = await loadPageState(config.pagesFolder, page, reset);
    if (pageState) {
        return pageState;
    }

    // Try fallback pages folder second
    return loadPageState(config.requiredPagesFolder, page, reset);
}
