# express-routes

## purpose

Express server architecture in SynthOS: route organization, middleware, request handling patterns, and the config-driven setup.

## rules

1. **Register route groups in fixed order.** `server.ts` registers: page routes (`usePageRoutes`) → API routes (`useApiRoutes`) → data routes (`useDataRoutes`). Page routes use `/:page` wildcard, so they must come first — Express matches routes in registration order and page routes include redirect logic.
2. **Pass `SynthOSConfig` to every route setup function.** All three `use*Routes()` functions accept `(config: SynthOSConfig, app: Application)`. Config provides folder paths (`pagesFolder`, `requiredPagesFolder`, `defaultPagesFolder`, `defaultThemesFolder`, `pageScriptsFolder`) and debug flags.
3. **Use `requiresSettings()` for API endpoints that need an API key.** This wrapper checks `hasConfiguredSettings()`, loads settings, and passes them to the callback. It handles 400 responses and error catching. Used by: image generation, completion, brainstorm, scripts.
4. **Follow the standard error handling pattern.** Every route handler wraps its body in `try/catch`, logs the error via `console.error(err)`, and sends `res.status(500).send((err as Error).message)`. JSON endpoints use `res.status(500).json({ error: message })` instead.
5. **Use `express.urlencoded({ extended: true })` and `express.json()` middleware.** These are the only body parsers — no multipart, no raw. Form submissions from the chat panel come as URL-encoded (`message` field); API calls come as JSON.
6. **The home page redirects to `/builder`.** `app.get('/')` does `res.redirect('/builder')`. The `HOME_PAGE_ROUTE` constant controls this.
7. **Guard page routes with settings check.** Both `GET /:page` and `POST /:page` check `hasConfiguredSettings()` and redirect to `/settings` if the API key or model isn't configured. The settings page itself is exempt from this check.
8. **Set correct `Content-Type` for JS and CSS API routes.** Theme info (`/api/theme-info.js`), page info (`/api/page-info.js`), page script (`/api/page-script.js`), and page helpers (`/api/page-helpers.js`) set `Content-Type: application/javascript`. Theme CSS (`/api/theme.css`) sets `Content-Type: text/css`. Cache-Control varies: scripts get `public, max-age=3600`; page-info gets `no-store`.
9. **Data routes use file-based JSON storage.** `useDataRoutes` stores rows as individual `<id>.json` files under `.synthos/<table>/`. Each row gets a UUID via `v4()` if no `id` is provided. The table folder is auto-created via `ensureFolderExists()`.
10. **Clear script cache on data mutation to `scripts` table.** When a POST or DELETE hits `/api/data/scripts`, call `clearCachedScripts()` so the script list used in transformation prompts is refreshed.
11. **Debug logging middleware is conditional.** When `config.debug` is true, a middleware logs `METHOD /path → statusCode (Xs)` for every request. It uses `res.on('finish')` to capture timing. This middleware is only added if debug mode is enabled.
12. **Metadata POST uses merge semantics with field validation.** `POST /api/pages/:name` validates each field (`title` must be string, `categories` must be array, `pinned` must be boolean, `mode` must be `'unlocked' | 'locked'`) but only for fields present in the body. Missing fields are preserved from existing metadata.

## patterns

### Standard route with settings guard

```typescript
app.post('/api/my-endpoint', async (req, res) => {
    await requiresSettings(res, config.pagesFolder, async (settings) => {
        const { someParam } = req.body;
        const { serviceApiKey, model } = settings;
        // ... business logic
        res.json({ result: 'ok' });
    });
});
```

### Standard route with try/catch error handling

```typescript
app.get('/api/my-endpoint', async (req, res) => {
    try {
        const data = await loadSomething(config.pagesFolder);
        res.json(data);
    } catch (err: unknown) {
        console.error(err);
        res.status(500).send((err as Error).message);
    }
});
```

### Serving a dynamic JS file with correct headers

```typescript
app.get('/api/my-script.js', async (req, res) => {
    try {
        const js = `window.myData=${JSON.stringify(data)};`;
        res.set('Content-Type', 'application/javascript');
        res.set('Cache-Control', 'no-store');  // or 'public, max-age=3600' for stable content
        res.send(js);
    } catch (err: unknown) {
        console.error(err);
        res.status(500).send(`// ${(err as Error).message}`);
    }
});
```

### Data route CRUD pattern

```typescript
import { v4 } from 'uuid';

// Upsert: use provided id or generate UUID
app.post('/api/data/:table', async (req, res) => {
    const { table } = req.params;
    const id = req.body.id ?? v4();
    const folder = await tableFolder(config, table);
    const file = recordFile(folder, id);
    const row = { ...req.body, id };
    await ensureFolderExists(folder);
    await saveFile(file, JSON.stringify(row, null, 4));
    res.json(row);
});
```

## pitfalls

- **`/:page` wildcard matches everything.** Because page routes use `app.get('/:page')`, any unmatched GET request falls into the page handler. API routes work because they're registered on `/api/*` paths which are more specific. If you add new non-API top-level routes, they could be swallowed by the page handler.
- **No authentication or authorization.** SynthOS runs locally with no auth layer. All endpoints are open. Don't add public-facing features without adding auth first.
- **`requiresSettings` swallows errors.** Its catch block sends a generic 500 response. If you need more granular error handling (e.g., distinguishing between auth failures and server errors), handle errors inside the callback instead.
- **Settings are cached module-level.** `loadSettings()` caches in a module-level `_settings` variable. Changes to `settings.json` on disk during a running session are invisible until `saveSettings()` updates the cache. Don't rely on file watches for settings changes.
- **Form POST and JSON POST share `/:page`.** The `POST /:page` handler reads `req.body.message` from URL-encoded form data (chat panel submit). But `req.body` also parses JSON thanks to `express.json()` middleware. The handler only validates `message` — other fields like `model` are optional.

## instructions

Use this expert when adding new API endpoints, modifying existing routes, working with middleware, or changing the server startup flow.

Pair with: `synthos-pages.md` for page route logic, `agentm-core.md` for how completions/brainstorm endpoints call the AI layer.

## research

Deep Research prompt:

"Write a project-specific expert for Express usage in SynthOS. Cover: the server() factory function in server.ts, route registration order (page → API → data), the SynthOSConfig dependency injection pattern, the requiresSettings() guard wrapper, standard error handling (try/catch → 500), body parser middleware (urlencoded + json), page route lifecycle (settings check → load page → block outdated → inject scripts → serve), API routes for settings/pages/metadata/completions/images/scripts/themes, data routes as file-based JSON CRUD with UUID generation, debug request-logging middleware, Content-Type and Cache-Control headers for dynamic JS/CSS, the HOME_PAGE_ROUTE redirect, and metadata merge-update validation."
