import path from "path";
import { listPages, loadPageMetadata, PageMetadata, savePageMetadata, REQUIRED_PAGES, deletePage, copyPage, loadPageState, savePageState, PAGE_VERSION } from "../pages";
import { checkIfExists, deleteFile, loadFile } from "../files";
import {loadSettings, saveSettings, ServicesConfig } from "../settings";
import { Application } from 'express';
import { SynthOSConfig } from "../init";
import { availableModels, createCompletePrompt } from "./createCompletePrompt";
import { generateDefaultImage, generateImage } from "./generateImage";
import { chainOfThought } from "agentm-core";
import { requiresSettings } from "./requiresSettings";
import { executeScript } from "../scripts";
import { listThemes, loadTheme, loadThemeInfo } from "../themes";
import { migratePage } from "../migrations";
import { loadPageWithFallback } from "./usePageRoutes";

// ---------------------------------------------------------------------------
// Service registry
// ---------------------------------------------------------------------------

interface ServiceField {
    name: string;
    label: string;
    type: 'password' | 'text';
}

interface ServiceDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    fields: ServiceField[];
    exclusive?: string;
}

const SERVICE_REGISTRY: ServiceDefinition[] = [
    {
        id: 'brave-search',
        name: 'Brave Search',
        category: 'Search',
        description: 'Web search powered by the Brave Search API. Provides real-time search results from the web.',
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password' }
        ],
        exclusive: 'search'
    }
];

export function useApiRoutes(config: SynthOSConfig, app: Application): void {
    // List pages
    app.get('/api/pages', async (req, res) => {
        const pages = await listPages(config.pagesFolder, config.requiredPagesFolder);
        res.json(pages);
    });

    // Get page metadata
    app.get('/api/pages/:name', async (req, res) => {
        try {
            const { name } = req.params;
            const metadata = await loadPageMetadata(config.pagesFolder, name, config.requiredPagesFolder);
            if (metadata) {
                res.json(metadata);
            } else {
                const defaults: PageMetadata = {
                    title: '',
                    categories: [],
                    pinned: false,
                    createdDate: '',
                    lastModified: '',
                    pageVersion: 0,
                    mode: 'unlocked',
                };
                res.json(defaults);
            }
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // Save page metadata (merge semantics)
    app.post('/api/pages/:name', async (req, res) => {
        try {
            const { name } = req.params;
            const body = req.body;

            // Validate provided fields only
            if ('title' in body && typeof body.title !== 'string') {
                res.status(400).json({ error: 'title must be a string' });
                return;
            }
            if ('categories' in body && !Array.isArray(body.categories)) {
                res.status(400).json({ error: 'categories must be an array' });
                return;
            }
            if ('pinned' in body && typeof body.pinned !== 'boolean') {
                res.status(400).json({ error: 'pinned must be a boolean' });
                return;
            }
            if ('mode' in body && body.mode !== 'unlocked' && body.mode !== 'locked') {
                res.status(400).json({ error: 'mode must be "unlocked" or "locked"' });
                return;
            }

            // Load existing metadata (or defaults)
            const existing = await loadPageMetadata(config.pagesFolder, name, config.requiredPagesFolder);
            const metadata: PageMetadata = {
                title: existing?.title ?? '',
                categories: existing?.categories ?? [],
                pinned: existing?.pinned ?? false,
                createdDate: existing?.createdDate ?? '',
                lastModified: existing?.lastModified ?? '',
                pageVersion: existing?.pageVersion ?? 0,
                mode: existing?.mode ?? 'unlocked',
            };

            // Overlay provided fields
            if ('title' in body) metadata.title = body.title;
            if ('categories' in body) metadata.categories = body.categories;
            if ('pinned' in body) metadata.pinned = body.pinned;
            if ('mode' in body) metadata.mode = body.mode;

            // Auto-set lastModified
            metadata.lastModified = new Date().toISOString();

            // Promote required page to user folder if being unlocked/designed
            if (metadata.mode !== 'locked') {
                const userPagePath = path.join(config.pagesFolder, 'pages', name, 'page.html');
                if (!(await checkIfExists(userPagePath))) {
                    const html = await loadPageState(config.requiredPagesFolder, name, false);
                    if (html) {
                        await savePageState(config.pagesFolder, name, html);
                    }
                }
            }

            await savePageMetadata(config.pagesFolder, name, metadata);
            res.json(metadata);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // Pin/unpin a page
    app.post('/api/pages/:name/pin', async (req, res) => {
        try {
            const { name } = req.params;
            const { pinned } = req.body;
            if (typeof pinned !== 'boolean') {
                res.status(400).json({ error: 'pinned must be a boolean' });
                return;
            }

            // Load existing metadata (user override → fallback .json → defaults)
            let metadata = await loadPageMetadata(config.pagesFolder, name, config.requiredPagesFolder);
            if (!metadata) {
                metadata = {
                    title: '',
                    categories: [],
                    pinned: false,
                    createdDate: '',
                    lastModified: '',
                    pageVersion: 0,
                    mode: 'unlocked',
                };
            }

            metadata.pinned = pinned;
            await savePageMetadata(config.pagesFolder, name, metadata);
            res.json(metadata);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // Delete a page
    app.delete('/api/pages/:name', async (req, res) => {
        try {
            const { name } = req.params;

            // Cannot delete required pages
            if (REQUIRED_PAGES.includes(name)) {
                res.status(400).json({ error: `Cannot delete required page "${name}"` });
                return;
            }

            // Check if page exists (folder-based or legacy flat file)
            const folderPath = path.join(config.pagesFolder, 'pages', name, 'page.html');
            const flatPath = path.join(config.pagesFolder, `${name}.html`);
            const exists = await checkIfExists(folderPath) || await checkIfExists(flatPath);
            if (!exists) {
                res.status(404).json({ error: `Page "${name}" not found` });
                return;
            }

            await deletePage(config.pagesFolder, name);
            res.json({ deleted: true });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // Copy a page to a new name
    app.post('/api/pages/:name/copy', async (req, res) => {
        try {
            const sourceName = req.params.name;
            const { name: targetName, title, categories } = req.body;

            // Validate target name
            if (!targetName || typeof targetName !== 'string') {
                res.status(400).json({ error: 'name is required' });
                return;
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(targetName)) {
                res.status(400).json({ error: 'name can only contain letters, numbers, hyphens, and underscores' });
                return;
            }

            // Can't copy over yourself
            if (targetName === sourceName) {
                res.status(400).json({ error: 'Cannot copy a page to itself' });
                return;
            }

            // Check source exists (user pages → required pages)
            const sourceFolderPath = path.join(config.pagesFolder, 'pages', sourceName, 'page.html');
            const sourceFlatPath = path.join(config.pagesFolder, `${sourceName}.html`);
            const sourceRequiredPath = path.join(config.requiredPagesFolder, `${sourceName}.html`);
            const sourceExists = await checkIfExists(sourceFolderPath)
                || await checkIfExists(sourceFlatPath)
                || await checkIfExists(sourceRequiredPath);
            if (!sourceExists) {
                res.status(404).json({ error: `Source page "${sourceName}" not found` });
                return;
            }

            // Check target doesn't already exist
            const targetFolderPath = path.join(config.pagesFolder, 'pages', targetName, 'page.html');
            const targetFlatPath = path.join(config.pagesFolder, `${targetName}.html`);
            if (await checkIfExists(targetFolderPath) || await checkIfExists(targetFlatPath)) {
                res.status(409).json({ error: `Page "${targetName}" already exists` });
                return;
            }

            await copyPage(
                config.pagesFolder,
                sourceName,
                targetName,
                typeof title === 'string' ? title : '',
                Array.isArray(categories) ? categories : [],
                config.requiredPagesFolder
            );

            // Return the new page metadata
            const metadata = await loadPageMetadata(config.pagesFolder, targetName);
            res.status(201).json({ name: targetName, ...metadata });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // Define a route to return settings
    app.get('/api/settings', async (req, res) => {
        const settings = await loadSettings(config.pagesFolder);
        res.json({...settings, availableModels});
    });

    // Define a route to save settings
    app.post('/api/settings', async (req, res) => {
        try {
            // Covert non-string values
            const settings = req.body as Record<string, any>;
            if (typeof settings.maxTokens === 'string') {
                settings.maxTokens = parseInt(settings.maxTokens);
            }
            if (typeof settings.logCompletions === 'string') {
                settings.logCompletions = settings.logCompletions === 'true';
            }

            // Save settings
            await saveSettings(config.pagesFolder, settings);
            res.redirect('/builder');
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // Define a route to generate an image
    app.post('/api/generate/image', async (req, res) => {
        await requiresSettings(res, config.pagesFolder, async (settings) => {
            const { prompt, shape, style } = req.body;
            const { serviceApiKey, imageQuality, model } = settings;
            const response = model.startsWith('gpt-') ?
                await generateImage({ apiKey: serviceApiKey, prompt, shape, quality: imageQuality, style }) :
                await generateDefaultImage();
            if (response.completed) {
                res.json(response.value);
            } else {
                res.status(500).send(response.error?.message);
            }
        });
    });

    // Define a route to generate a completion using chain-of-thought
    app.post('/api/generate/completion', async (req, res) => {
        await requiresSettings(res, config.pagesFolder, async (settings) => {
            const { prompt, temperature } = req.body;
            const { maxTokens } = settings;
            const completePrompt = await createCompletePrompt(config.pagesFolder, req.body.model);
            const response = await chainOfThought({ question: prompt, temperature, maxTokens, completePrompt });
            if (response.completed) {
                res.json(response.value ?? {});
            } else {
                console.error(response.error);
                res.status(500).send(response.error?.message);
            }
        });
    });

    // Brainstorm endpoint
    app.post('/api/brainstorm', async (req, res) => {
        await requiresSettings(res, config.pagesFolder, async (settings) => {
            const { context, messages } = req.body;
            const { maxTokens } = settings;
            const completePrompt = await createCompletePrompt(config.pagesFolder);

            const system: { role: 'system'; content: string } = {
                role: 'system',
                content: `You are a creative brainstorming assistant for SynthOS, a tool that builds web pages through conversation. The user is brainstorming — exploring ideas before building. Be concise, creative, and collaborative. Suggest concrete approaches when you can.

You MUST return your response as a JSON object with exactly these fields:
{
  "response": "Your conversational reply — explanations, options, suggestions. Markdown OK.",
  "prompt": "A clean, actionable instruction ready to paste into SynthOS chat to build what was discussed. Update this each exchange to reflect the latest brainstorm state.",
  "suggestions": ["Short clickable option A", "Short clickable option B", "Short clickable option C"]
}

suggestions — 2-4 short phrases the user can click to continue the conversation. These are next-step options: directions to explore, questions to answer, or choices to make. Keep each under 60 characters. Always provide suggestions.

Return ONLY the JSON object. No markdown fences.

<CONTEXT>
${context}
</CONTEXT>`
            };

            // Format multi-turn conversation into a single prompt
            const formatted = (messages as { role: string; content: string }[]).map(m =>
                `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
            ).join('\n\n');

            const prompt: { role: 'user'; content: string } = { role: 'user', content: formatted };

            const result = await completePrompt({ prompt, system, maxTokens, jsonMode: true });
            if (result.completed) {
                let response = result.value || '';
                let brainstormPrompt = '';
                let suggestions: string[] = [];
                // jsonMode returns an already-parsed object from agentm-core
                const parsed = (typeof result.value === 'object' && result.value !== null)
                    ? result.value as Record<string, unknown>
                    : (() => { try { return JSON.parse(result.value as string); } catch { return null; } })();
                if (parsed) {
                    if (typeof parsed.response === 'string') response = parsed.response;
                    if (typeof parsed.prompt === 'string') brainstormPrompt = parsed.prompt;
                    if (Array.isArray(parsed.suggestions)) {
                        suggestions = parsed.suggestions.filter((s: unknown) => typeof s === 'string');
                    }
                }
                res.json({ response, prompt: brainstormPrompt, suggestions });
            } else {
                console.error(result.error);
                res.status(500).send(result.error?.message);
            }
        });
    });

    // Define a route for running configured scripts
    app.post('/api/scripts/:id', async (req, res) => {
        await requiresSettings(res, config.pagesFolder, async (settings) => {
            const { id } = req.params;
            const pagesFolder = config.pagesFolder;
            const scriptId = id;
            const response = await executeScript({ pagesFolder, scriptId, variables: req.body });
            if (response.completed) {
                // Return the response as text
                const value = (response.value?.output ?? (response.value?.errors ?? []).join('\n')).trim();
                res.set('Content-Type', 'text/plain');
                res.send(value);
            } else {
                console.error(response.error);
                res.status(500).send(response.error);
            }
        });
    });

    // Return theme info as a self-executing JS script
    app.get('/api/theme-info.js', async (req, res) => {
        try {
            const settings = await loadSettings(config.pagesFolder);
            const themeName = settings.theme ?? 'nebula-dusk';
            const info = await loadThemeInfo(themeName, config);
            if (!info) {
                res.status(404).send(`// Theme info for "${themeName}" not found`);
                return;
            }
            const js = `window.themeInfo=${JSON.stringify(info)};document.documentElement.classList.add(window.themeInfo.mode+"-mode");`;
            res.set('Content-Type', 'application/javascript');
            res.send(js);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send(`// ${(err as Error).message}`);
        }
    });

    // Return page info as a self-executing JS script
    app.get('/api/page-info.js', async (req, res) => {
        try {
            const page = req.query.page as string;
            if (!page) {
                res.status(400).send('// Missing page query parameter');
                return;
            }
            const metadata = await loadPageMetadata(config.pagesFolder, page, config.requiredPagesFolder);
            const mode = metadata?.mode ?? 'unlocked';
            const title = metadata?.title ?? '';
            const categories = metadata?.categories ?? [];
            const info = JSON.stringify({ name: page, mode, latestPageVersion: PAGE_VERSION, title, categories });
            const js = [
                `window.pageInfo=${info};`,
                `if(window.pageInfo.mode==="locked"){`,
                `document.addEventListener("DOMContentLoaded",function(){`,
                `var f=document.getElementById("chatForm");if(f)f.style.display="none";`,
                `var s=document.getElementById("saveLink");if(s)s.textContent="Copy";`,
                `var r=document.getElementById("resetLink");if(r){`,
                `var c=r.cloneNode(true);c.textContent="Reload";`,
                `c.addEventListener("click",function(e){e.preventDefault();window.location.href=window.location.pathname;});`,
                `r.parentNode.replaceChild(c,r);}`,
                `});`,
                `}`,
            ].join('');
            res.set('Content-Type', 'application/javascript');
            res.set('Cache-Control', 'no-store');
            res.send(js);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send(`// ${(err as Error).message}`);
        }
    });

    // Return the current theme as CSS
    app.get('/api/theme.css', async (req, res) => {
        try {
            const settings = await loadSettings(config.pagesFolder);
            const themeName = settings.theme ?? 'nebula-dusk';
            const css = await loadTheme(themeName, config);
            if (!css) {
                res.status(404).send(`Theme "${themeName}" not found`);
                return;
            }
            res.set('Content-Type', 'text/css');
            res.send(css);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // List available themes
    app.get('/api/themes', async (req, res) => {
        try {
            const themes = await listThemes(config);
            res.json(themes);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // Return a versioned page script
    app.get('/api/page-script.js', async (req, res) => {
        try {
            const v = parseInt(req.query.v as string, 10);
            if (isNaN(v) || v < 1) {
                res.status(400).send('// Invalid version parameter');
                return;
            }
            const scriptPath = path.join(config.pageScriptsFolder, `page-v${v}.js`);
            if (!(await checkIfExists(scriptPath))) {
                res.status(404).send(`// page-v${v}.js not found`);
                return;
            }
            const js = await loadFile(scriptPath);
            res.set('Content-Type', 'application/javascript');
            res.set('Cache-Control', 'public, max-age=3600');
            res.send(js);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send(`// ${(err as Error).message}`);
        }
    });

    // Return versioned page helpers
    app.get('/api/page-helpers.js', async (req, res) => {
        try {
            const v = parseInt(req.query.v as string, 10);
            if (isNaN(v) || v < 1) {
                res.status(400).send('// Invalid version parameter');
                return;
            }
            const scriptPath = path.join(config.pageScriptsFolder, `helpers-v${v}.js`);
            if (!(await checkIfExists(scriptPath))) {
                res.status(404).send(`// helpers-v${v}.js not found`);
                return;
            }
            const js = await loadFile(scriptPath);
            res.set('Content-Type', 'application/javascript');
            res.set('Cache-Control', 'public, max-age=3600');
            res.send(js);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send(`// ${(err as Error).message}`);
        }
    });

    // -----------------------------------------------------------------------
    // Services
    // -----------------------------------------------------------------------

    // Return the service registry (available service definitions)
    app.get('/api/services/registry', (_req, res) => {
        res.json(SERVICE_REGISTRY);
    });

    // Return user's configured services (API keys masked)
    app.get('/api/services', async (_req, res) => {
        try {
            const settings = await loadSettings(config.pagesFolder);
            const services = settings.services ?? {};
            const masked: Record<string, { enabled: boolean; hasKey: boolean }> = {};
            for (const [id, cfg] of Object.entries(services)) {
                masked[id] = {
                    enabled: cfg.enabled,
                    hasKey: typeof cfg.apiKey === 'string' && cfg.apiKey.length > 0
                };
            }
            res.json(masked);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // Save services config (enforces exclusive groups)
    app.post('/api/services', async (req, res) => {
        try {
            const incoming = req.body as ServicesConfig;
            const settings = await loadSettings(config.pagesFolder);
            const existing = settings.services ?? {};

            // Build merged config — empty apiKey means "keep existing"
            const merged: ServicesConfig = {};
            for (const [id, cfg] of Object.entries(incoming)) {
                const apiKey = (cfg.apiKey && cfg.apiKey.length > 0) ? cfg.apiKey : (existing[id]?.apiKey ?? '');
                merged[id] = { apiKey, enabled: cfg.enabled };
            }

            // Enforce exclusive groups: only one enabled per group
            for (const def of SERVICE_REGISTRY) {
                if (!def.exclusive) continue;
                if (!merged[def.id]?.enabled) continue;
                for (const other of SERVICE_REGISTRY) {
                    if (other.id !== def.id && other.exclusive === def.exclusive && merged[other.id]) {
                        merged[other.id].enabled = false;
                    }
                }
            }

            await saveSettings(config.pagesFolder, { services: merged });
            res.json({ saved: true });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).send((err as Error).message);
        }
    });

    // -----------------------------------------------------------------------
    // Web Search (Brave Search API)
    // -----------------------------------------------------------------------

    app.post('/api/search/web', async (req, res) => {
        try {
            const { query, count, country, freshness } = req.body;
            if (!query || typeof query !== 'string') {
                res.status(400).json({ error: 'query is required' });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const braveConfig = settings.services?.['brave-search'];
            if (!braveConfig || !braveConfig.enabled || !braveConfig.apiKey) {
                res.status(400).json({ error: 'Brave Search is not configured or not enabled. Add your API key in Settings > Services.' });
                return;
            }

            const params = new URLSearchParams({ q: query });
            if (count) params.set('count', String(Math.min(Number(count) || 5, 20)));
            if (country) params.set('country', country);
            if (freshness) params.set('freshness', freshness);

            const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip',
                    'X-Subscription-Token': braveConfig.apiKey
                }
            });

            if (!response.ok) {
                const text = await response.text();
                res.status(response.status).json({ error: `Brave Search API error: ${text}` });
                return;
            }

            const data = await response.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
            const results = (data.web?.results ?? []).map(r => ({
                title: r.title,
                url: r.url,
                description: r.description
            }));

            res.json({ results });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // Upgrade a page to the latest version
    app.post('/api/pages/:name/upgrade', async (req, res) => {
        try {
            const { name } = req.params;

            // Load current metadata
            const metadata = await loadPageMetadata(config.pagesFolder, name, config.requiredPagesFolder);
            if (!metadata) {
                res.status(404).json({ error: `Page "${name}" not found` });
                return;
            }

            const currentVersion = metadata.pageVersion;
            if (currentVersion >= PAGE_VERSION) {
                res.json({ upgraded: false, currentVersion });
                return;
            }

            // Load the page HTML
            const html = await loadPageWithFallback(name, config, false);
            if (!html) {
                res.status(404).json({ error: `Page HTML for "${name}" not found` });
                return;
            }

            // Run LLM-based migration
            const completePrompt = await createCompletePrompt(config.pagesFolder);
            const migratedHtml = await migratePage(html, currentVersion, PAGE_VERSION, completePrompt);

            // Save upgraded HTML to v2 folder structure
            await savePageState(config.pagesFolder, name, migratedHtml);

            // Delete legacy flat file if it exists
            const flatPath = path.join(config.pagesFolder, `${name}.html`);
            if (await checkIfExists(flatPath)) {
                await deleteFile(flatPath);
            }

            // Update metadata
            metadata.pageVersion = PAGE_VERSION;
            metadata.lastModified = new Date().toISOString();
            await savePageMetadata(config.pagesFolder, name, metadata);

            res.json({ upgraded: true, fromVersion: currentVersion, toVersion: PAGE_VERSION });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });
}