# synthos-pages

## purpose

Page lifecycle in SynthOS: storage, metadata, transformation loop, versioning, migrations, and mode system.

## rules

1. **Use folder-based page storage.** Every page lives at `.synthos/pages/<name>/page.html` with a companion `page.json`. Legacy flat files (`.synthos/<name>.html`) are v1 remnants — the init system migrates them automatically.
2. **Never mutate `PAGE_VERSION` without adding a migration.** `PAGE_VERSION` in `src/pages.ts` is the global latest version. Bumping it requires a corresponding entry in `migrations.ts`'s `migrations` registry so `migratePage()` can step through sequentially.
3. **Treat `page.json` metadata with merge semantics.** The `POST /api/pages/:name` endpoint overlays only the fields sent in the request body onto existing metadata. `lastModified` is always auto-set. `createdDate` and `pageVersion` are never overwritten by the merge — they're preserved from existing metadata.
4. **Respect the in-memory page cache.** `loadPageState()` caches HTML in a module-level `_pages` object keyed by page name. Passing `reset: true` forces a re-read from disk. `updatePageState()` updates only the cache (no disk write) — used by `POST /:page` after transformation so the next `GET` returns the latest HTML without re-reading.
5. **Normalize page names before storage.** `normalizePageName()` lowercases and replaces non-alphanumeric characters (except `-_[](){}@#$%&`) with underscores. Always normalize user-provided names before creating or looking up pages.
6. **Use `loadPageWithFallback()` for all page reads.** It tries the user's `.synthos/` folder first, then the `required-pages/` folder. This ensures required/system pages are always available even if the user hasn't customized them.
7. **Never delete required pages.** `REQUIRED_PAGES` array (`['builder', 'pages', 'settings', 'apis', 'scripts']`) is protected — `DELETE /api/pages/:name` rejects deletion of these. Check this list before any destructive page operation.
8. **Block outdated pages at the route level.** `GET /:page` redirects non-required pages with `pageVersion < PAGE_VERSION` to `/pages` so the user sees the upgrade UI. Required pages are exempt from this block.
9. **Inject scripts in a fixed order on every page serve.** `GET /:page` and `POST /:page` both run: `ensureRequiredImports()` → `injectPageInfoScript()` → `injectPageHelpers()` → `injectPageScript()`. All four injections are idempotent (they check for existing script IDs before adding).
10. **Migrations are LLM-powered + cheerio-verified.** The v1→v2 migration sends page HTML to the LLM with a detailed system prompt, then `postProcessV2()` uses cheerio to verify/fix critical elements (theme-info.js, theme.css, leftover shared CSS/JS). Always add a `postProcess` step after LLM-based migrations.
11. **The transformation loop has a repair pass.** `transformPage()` applies CRUD ops, then if any fail due to missing nodes, it makes a second LLM call with the partially-updated HTML and the list of failed ops. This self-healing pattern handles cascading node-ID invalidation.
12. **`copyPage()` is the save-as mechanism.** It loads source HTML (user folder → required folder fallback), saves it to the target folder via `savePageState()`, then overwrites the generated metadata with the provided title and categories.

## patterns

### Loading a page with full fallback chain

```typescript
import { loadPageState, loadPageMetadata, PAGE_VERSION } from '../pages';

// Load HTML: user folder → required folder
const html = await loadPageState(config.pagesFolder, pageName, false);
if (!html) {
    const html = await loadPageState(config.requiredPagesFolder, pageName, false);
}

// Load metadata: user override → fallback .json → undefined
const metadata = await loadPageMetadata(
    config.pagesFolder, pageName, config.requiredPagesFolder
);
const pageVersion = metadata?.pageVersion ?? 0;
```

### Creating a new page with metadata

```typescript
import { savePageState, savePageMetadata, PageMetadata, PAGE_VERSION } from '../pages';

// savePageState creates the folder + page.html + page.json (if page.json doesn't exist)
await savePageState(config.pagesFolder, 'my-page', htmlContent, 'My Page Title');

// To set specific metadata, overwrite after save:
const metadata: PageMetadata = {
    title: 'My Page',
    categories: ['Tools'],
    pinned: false,
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    pageVersion: PAGE_VERSION,
    mode: 'unlocked',
};
await savePageMetadata(config.pagesFolder, 'my-page', metadata);
```

### Adding a new migration step

```typescript
// In src/migrations.ts — add entry to the migrations registry:
const migrations: Record<number, (html: string, completePrompt: completePrompt) => Promise<string>> = {
    1: migrateV1toV2,
    2: migrateV2toV3,  // ← new step
};

// Then implement migrateV2toV3 with LLM call + cheerio post-processing:
async function migrateV2toV3(html: string, completePrompt: completePrompt): Promise<string> {
    const system = { role: 'system' as const, content: V2_TO_V3_SYSTEM_PROMPT };
    const prompt = { role: 'user' as const, content: `Convert this v2 page to v3:\n\n${html}` };
    const result = await completePrompt({ prompt, system, maxTokens: 16000 });
    if (!result.completed || !result.value) {
        throw new Error('LLM migration failed: ' + (result.error?.message ?? 'no response'));
    }
    let migrated = result.value.trim();
    if (migrated.startsWith('```')) {
        migrated = migrated.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return postProcessV3(migrated);  // cheerio verification
}

// IMPORTANT: bump PAGE_VERSION in src/pages.ts to match
```

## pitfalls

- **The `_pages` cache never expires.** It persists for the lifetime of the server process. If you modify page HTML files on disk while the server is running, the server won't see the changes until the page is reset (`GET /:page/reset`) or the cache is updated via `updatePageState()`.
- **`savePageState()` won't overwrite existing `page.json`.** It only creates `page.json` if it doesn't already exist. To update metadata, use `savePageMetadata()` separately.
- **Legacy `uxVersion` field.** Old page.json files may have `uxVersion` instead of `pageVersion`. The `parseMetadata()` function handles this fallback, but new code should always use `pageVersion`.
- **Script injection order matters.** `page-info` goes in `<head>` (synchronous load), while `page-helpers` and `page-script` go before `</body>`. If you add new injections, match this pattern to avoid race conditions.
- **Mode promotion.** When metadata `POST` sets mode to anything other than `'locked'`, if the page only exists in `required-pages/`, it gets copied to the user folder automatically. This is intentional — locked pages can't be transformed.

## instructions

Use this expert when working on anything related to SynthOS pages: creating, serving, transforming, saving, deleting, migrating, or managing page metadata.

Pair with: `cheerio-transforms.md` for DOM manipulation patterns, `agentm-core.md` for LLM calls in the transformation loop and migrations.

## research

Deep Research prompt:

"Write a project-specific expert for SynthOS's page system. Cover: folder-based page storage (.synthos/pages/<name>/page.html + page.json), page metadata schema (title, categories, pinned, createdDate, lastModified, pageVersion, mode), page version constants and the migration pipeline (sequential version transforms using LLM + cheerio post-processing), the in-memory page cache and its invalidation patterns, page name normalization, the page loading fallback chain (user folder → required pages folder), required/system pages protection, page transformation loop (data-node-id annotation → LLM call → CRUD op application → repair pass → strip IDs), script injection order (page-info in head, page-helpers + page-script before body close), locked/unlocked mode behavior, the save-as copy flow, and the outdated-page blocking redirect."
