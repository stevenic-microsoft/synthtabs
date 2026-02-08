import path from "path";
import { listPages, loadPageMetadata, PageMetadata, savePageMetadata, REQUIRED_PAGES, deletePage, copyPage, loadPageState, savePageState } from "../pages";
import { checkIfExists } from "../files";
import {loadSettings, saveSettings } from "../settings";
import { Application } from 'express';
import { SynthOSConfig } from "../init";
import { availableModels, createCompletePrompt } from "./createCompletePrompt";
import { generateDefaultImage, generateImage } from "./generateImage";
import { chainOfThought } from "agentm-core";
import { requiresSettings } from "./requiresSettings";
import { executeScript } from "../scripts";
import { listThemes, loadTheme, loadThemeInfo } from "../themes";

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
            const info = JSON.stringify({ name: page, mode });
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
}