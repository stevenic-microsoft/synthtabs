# api-checklist

## purpose

Enforces a mandatory checklist whenever a server API endpoint is added or changed in SynthOS. Ensures that the API Explorer page, the `serverAPIs` constant in `transformPage.ts`, and the page helpers stay in sync.

## rules

1. **Every API change triggers this checklist.** Whenever you add, remove, rename, or change the request/response shape of any route in `useApiRoutes.ts`, `useDataRoutes.ts`, or `usePageRoutes.ts`, you MUST complete all items in the checklist below before considering the task done.
2. **The checklist is non-negotiable.** Even if the developer says "just add the endpoint", remind them that the explorer page and serverAPIs constant also need updating. Do not skip steps without explicit developer approval.
3. **Order matters.** Implement the endpoint first, then update `serverAPIs`, then update the API Explorer page. This order ensures you can reference the real route signature and response shape.
4. **Match existing format exactly.** Both `serverAPIs` and `apis.html` follow strict conventions (see patterns below). New entries must match the style of existing entries — do not introduce new formatting.
5. **Keep serverAPIs and apis.html in 1:1 correspondence.** Every endpoint listed in the `serverAPIs` constant should have a matching section in `apis.html`, and vice versa. The only exception is internal/system routes (like `/api/theme.css` or `/api/page-info.js`) that are not callable by user pages.
6. **Update page helpers when adding client-facing APIs.** If the new endpoint is something page JS would call, add a corresponding `synthos.*` helper entry in the PAGE HELPERS block at the bottom of `serverAPIs`.
7. **Test the explorer section.** After adding a new section to `apis.html`, mentally verify that the `callApi`/custom function wiring matches the endpoint's method, URL pattern, and expected inputs.
8. **On API change or removal, prompt for page impact scan.** When an endpoint is modified (different path, changed request/response shape) or removed, use `AskUserQuestion` to ask the developer whether they want to scan `default-pages/` and `required-pages/` for pages that may be calling the affected endpoint. If they say yes, grep both folders for the old endpoint path and any `synthos.*` helper that wraps it, then report which pages need updating.

## checklist

When adding or changing an API endpoint, complete these steps:

### Step 1 — Implement the endpoint
- [ ] Add/modify the route in the appropriate file (`useApiRoutes.ts`, `useDataRoutes.ts`, or `usePageRoutes.ts`)
- [ ] Follow existing patterns: `requiresSettings()` guard if it needs API keys, standard try/catch error handling, correct Content-Type headers

### Step 2 — Update `serverAPIs` in `transformPage.ts`
- [ ] Add/update the endpoint entry in the `serverAPIs` template literal (~line 511)
- [ ] Include: HTTP method, path, description, request shape (if POST/PUT/DELETE with body), response shape
- [ ] If applicable, add/update the corresponding `synthos.*` helper in the PAGE HELPERS block

### Step 3 — Update the API Explorer page (`required-pages/apis.html`)
- [ ] Add a new `<div class="api-section">` block with the correct header, description, input fields, and submit button
- [ ] Wire the button's `onclick` to the correct function (`callApi`, `callPageApi`, or a custom function)
- [ ] Match input placeholders to the endpoint's parameters
- [ ] If the endpoint needs a custom JS function (like `generateImage` or `webSearch`), add it in the `<script id="api-explorer">` block

### Step 4 — (Change/Remove only) Check for affected pages
- [ ] Ask the developer: *"This API was changed/removed. Want me to scan default and required pages for any that use it?"*
- [ ] If yes, grep `default-pages/` and `required-pages/` for the endpoint path (e.g. `/api/data/`, `/api/generate/completion`) and any related `synthos.*` helper calls
- [ ] Report which pages reference the affected endpoint so the developer can decide what to update

### Step 5 — Verify consistency
- [ ] Confirm the route path in code matches the path in `serverAPIs` matches the path in `apis.html`
- [ ] Confirm request/response shapes are described consistently across all three locations

## patterns

### serverAPIs entry format

```
POST /api/my-endpoint
description: One-line description of what it does
request: { field: type, optionalField?: type }
response: { field: type }
```

Follow the exact whitespace and style of existing entries. No trailing blank lines between entries — use exactly one blank line separator.

### PAGE HELPERS entry format

```
  synthos.myDomain.myMethod(args)    — POST /api/my-endpoint  (notes if any)
```

Two-space indent, method signature left-aligned, em-dash separator, HTTP method + path, optional parenthetical notes.

### apis.html section format

```html
<div class="api-section">
    <div class="api-header" onclick="toggleSection(this)">POST /api/my-endpoint</div>
    <div class="api-content">
        Description of what this endpoint does.
        <div class="api-input">
            <input type="text" placeholder="Parameter Name" />
            <textarea placeholder="JSON Body"></textarea>
            <button onclick="callApi(event, 'POST', '/api/my-endpoint')">Submit</button>
        </div>
        <div class="api-output"></div>
    </div>
</div>
```

For endpoints that need custom logic (non-standard URL building, special response handling), create a dedicated JS function and wire the button to it instead of `callApi`.

## pitfalls

- **Forgetting `serverAPIs` breaks the LLM.** The `serverAPIs` constant is injected into every transformation prompt. If an endpoint exists but isn't listed there, the LLM won't know it's available and won't generate code that uses it. This is the most common miss.
- **Explorer page drift.** The `apis.html` page is a required page that users see. If it lists endpoints that don't exist or is missing new ones, users lose trust in the documentation. Keep it accurate.
- **Page helpers out of sync.** If `synthos.*` helpers are listed in `serverAPIs` but don't actually exist in `page-scripts/helpers-v2.js`, the LLM will generate code using non-existent helpers. When adding a helper entry to `serverAPIs`, also verify the implementation exists.
- **Data routes are page-scoped.** The data API uses `/api/data/:page/:table`, not `/api/data/:table`. The `:page` segment scopes data to a specific page. Don't forget this when documenting new data-related endpoints.

## instructions

This expert is a **gate check**, not an implementation guide. It tells you *what to update* when APIs change, not *how to write Express routes* (that's `express-routes.md`) or *how prompt templates work* (that's `prompt-templates.md`).

Load this expert whenever the task involves: adding a new API endpoint, removing an endpoint, changing an endpoint's path or request/response shape, or renaming an endpoint.

Pair with: `express-routes.md` for implementation patterns, `prompt-templates.md` for how serverAPIs feeds into LLM prompts, `synthos-pages.md` for page lifecycle context.

## key files

| File | What to update |
|---|---|
| `src/service/useApiRoutes.ts` | Route implementation (generate, search, scripts endpoints) |
| `src/service/useDataRoutes.ts` | Route implementation (data CRUD endpoints) |
| `src/service/usePageRoutes.ts` | Route implementation (page/metadata endpoints) |
| `src/service/transformPage.ts` | `serverAPIs` constant (~line 511) and PAGE HELPERS block |
| `required-pages/apis.html` | API Explorer UI — sections + JS functions |
| `page-scripts/helpers-v2.js` | `window.synthos.*` helper implementations |
