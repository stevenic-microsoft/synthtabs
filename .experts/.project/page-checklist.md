# page-checklist

## purpose

Enforces a mandatory impact-check whenever core page infrastructure is modified — the shared page scripts, the builder page, or the server-side injection pipeline. These components are consumed by every page in the system, so changes can silently break default and required pages.

## scope — what counts as "core page infrastructure"

| Component | Files | Why it matters |
|---|---|---|
| **Core page scripts** | `page-scripts/page-v2.js`, `page-scripts/helpers-v2.js` | Loaded by every v2 page via `<script id="page-script">` and `<script id="page-helpers">`. Changes affect all pages at once. |
| **Builder page** | `required-pages/builder.html` | The home/landing page. Its chat panel, link group, idle animation, and script wiring serve as the canonical template other pages copy from. Structural changes here often need to propagate. |
| **Injected script blocks** | `injectPageInfoScript()`, `injectPageHelpers()`, `injectPageScript()`, `ensureRequiredImports()` in `src/service/usePageRoutes.ts` | Server-side injection runs on every page serve. Changes to injection logic, tag format, or `REQUIRED_IMPORTS` affect all pages. |
| **Transformation prompt infrastructure** | System prompt template, `SYSTEM_IDS`, dedup logic in `src/service/transformPage.ts` | Controls what the LLM is told about script blocks and how duplicate scripts are handled post-transformation. |

## rules

1. **Every change to core page infrastructure triggers this checklist.** When you modify any file or function listed in the scope table above, you MUST complete the checklist below before considering the task done.
2. **Prompt the developer for a page impact scan.** After making the change, use `AskUserQuestion` to ask: *"This touches core page infrastructure. Want me to scan default and required pages for any that may need updating?"* Do not skip this step — even small changes (e.g., renaming a CSS class used in `page-v2.js`) can break pages that depend on the old name.
3. **If the developer says yes, scan both page folders.** Grep `default-pages/` and `required-pages/` for references to the changed element (function names, CSS classes, element IDs, script IDs, helper methods, etc.). Report which pages reference the affected code.
4. **If the developer says no, note the skip.** Acknowledge their choice but remind them that pages may need manual review later.
5. **Builder changes deserve extra scrutiny.** Because `builder.html` is the canonical page template, structural changes to its chat panel, link group, form, or viewer panel layout may need to propagate to other required pages (`settings.html`, `pages.html`, `scripts.html`, `apis.html`) that share the same skeleton.

## checklist

### Step 1 — Make the change
- [ ] Modify the core page script, builder page, or injection function as needed
- [ ] If changing `page-v2.js` or `helpers-v2.js`, verify the version number in `REQUIRED_IMPORTS` and injection functions still matches

### Step 2 — Ask about page impact scan
- [ ] Use `AskUserQuestion`: *"This touches core page infrastructure (`<file changed>`). Want me to scan default and required pages for any that may need updating?"*
- [ ] Options: "Yes, scan for affected pages" / "No, I'll handle it manually"

### Step 3 — (If yes) Scan for affected pages
- [ ] Grep `default-pages/*.html` and `required-pages/*.html` for references to the changed element
- [ ] For script changes: search for function names, element IDs, CSS classes, or `window.*` globals that were added/removed/renamed
- [ ] For builder structural changes: compare the chat-panel, link-group, and form markup across required pages to identify divergence
- [ ] For injection changes: check that all pages still have the expected `<script>` tags and that no page hardcodes what the injector now handles differently
- [ ] Report findings to the developer with specific file names and line references

### Step 4 — Verify no regressions
- [ ] If tests exist for the changed component (e.g., `transformPage.spec.ts`), run them
- [ ] Confirm no `SYSTEM_IDS` mismatch between `transformPage.ts` and actual injected script IDs

## what to scan for — common patterns

| Change type | Grep targets |
|---|---|
| Renamed element ID in `page-v2.js` | Old ID string (e.g., `chatInput`, `loadingOverlay`, `saveLink`) |
| New/changed `synthos.*` helper in `helpers-v2.js` | Old method name, new method name |
| Changed `REQUIRED_IMPORTS` entries | Old CDN URL, old selector string |
| Changed injection tag format | Old `<script id="page-info"` pattern, old `src=` pattern |
| Builder structural change | CSS class names, element IDs from the changed section |
| Changed `SYSTEM_IDS` set in `transformPage.ts` | Old/new ID values across both files |

## pitfalls

- **`page-v2.js` runs on every page but is not in the page HTML.** It's injected via `injectPageScript()`. Pages don't contain it in their source — grepping page HTML for its functions won't find usage. Instead, look for the element IDs and CSS classes that `page-v2.js` targets (e.g., `chatInput`, `chatForm`, `loadingOverlay`, `saveLink`, `resetLink`, `pagesLink`).
- **`helpers-v2.js` defines `window.synthos`.** If you rename or remove a helper method, any page with inline `<script>` blocks calling `synthos.data.list()` etc. will break at runtime with no build-time error.
- **Builder is the template, not the only consumer.** Other required pages (`settings.html`, `pages.html`, `scripts.html`, `apis.html`) share the same chat-panel + viewer-panel + link-group structure. A change to this structure in the builder may need to be mirrored in all of them.
- **Injection order matters.** `usePageRoutes.ts` injects in a specific order: `ensureRequiredImports` → `injectPageInfoScript` → `injectPageHelpers` → `injectPageScript`. Changing this order or the tag placement logic can break pages that rely on script load order.
- **Some pages still hardcode script tags.** Older or hand-edited pages may have `<script id="page-helpers" src="...">` baked into their HTML. The injector handles this (it replaces existing tags), but if you change the injector's detection regex, those pages could end up with duplicates.

## instructions

This expert is a **impact-check gate**, not an implementation guide. It tells you *when and how to check for downstream breakage* when core infrastructure changes, not *how to write page scripts* or *how injection works*.

Load this expert whenever the task involves: modifying `page-v2.js`, `helpers-v2.js`, `builder.html` structure, `injectPageInfoScript`, `injectPageHelpers`, `injectPageScript`, `ensureRequiredImports`, `REQUIRED_IMPORTS`, or `SYSTEM_IDS`.

Pair with: `synthos-pages.md` for page lifecycle, `express-routes.md` for how scripts are served, `prompt-templates.md` for how the LLM is told about script conventions.

## key files

| File | Role |
|---|---|
| `page-scripts/page-v2.js` | Core page script — chat panel, save/reset/pages links, form submit, loading overlay |
| `page-scripts/helpers-v2.js` | `window.synthos.*` helper library — data, generate, scripts, pages, search APIs |
| `required-pages/builder.html` | Canonical page template — chat panel + viewer panel structure |
| `required-pages/settings.html` | Required page — shares builder skeleton |
| `required-pages/pages.html` | Required page — shares builder skeleton |
| `required-pages/scripts.html` | Required page — shares builder skeleton |
| `required-pages/apis.html` | Required page — API Explorer, shares builder skeleton |
| `src/service/usePageRoutes.ts` | Server-side script injection (`injectPageInfoScript`, `injectPageHelpers`, `injectPageScript`, `ensureRequiredImports`) |
| `src/service/transformPage.ts` | `SYSTEM_IDS` set, dedup logic, system prompt script conventions |
