# cheerio-transforms

## purpose

Cheerio DOM manipulation patterns used in SynthOS: node-ID annotation, CRUD change operations, HTML injection, CSS cleanup, and post-processing.

## rules

1. **Always pass `{ decodeEntities: false }` to `cheerio.load()`.** This preserves special characters and HTML entities in page content. Every cheerio usage in the codebase uses this option — omitting it corrupts user content.
2. **Assign `data-node-id` sequentially starting from 0.** `assignNodeIds()` iterates all elements via `$('*').each()`, checks `this.type === 'tag'`, and assigns `String(counter++)`. The IDs are only valid for a single transformation pass — they must be stripped before returning HTML to the client.
3. **Always strip `data-node-id` before serving HTML.** Call `stripNodeIds()` which uses `$('[data-node-id]').removeAttr('data-node-id')`. Leaked node IDs in served HTML will confuse future transformation passes.
4. **Select nodes by attribute selector, not by tag or class.** The CRUD system uses `$(`[data-node-id="${nodeId}"]`)` to find target elements. This is the only supported way to reference elements in change operations.
5. **Handle missing nodes gracefully in CRUD operations.** For `update`, `replace`, and `delete` ops: if the target node is not found, log a warning and skip (do not throw). For `insert`: a missing parent node is collected as a failed op in `applyChangeListWithReport()`. The repair pass handles these failures.
6. **Understand the four CRUD operations.** `update`: replaces innerHTML via `el.html(change.html)`. `replace`: replaces the entire element (outerHTML) via `el.replaceWith(change.html)`. `delete`: removes the element via `el.remove()`. `insert`: adds new HTML relative to a parent via `prepend`/`append`/`before`/`after`.
7. **Use `applyChangeListWithReport()` for production code.** Unlike the original `applyChangeList()` which throws on insert failures, the report variant collects all failures in a `FailedOp[]` array and continues processing. This enables the repair pass.
8. **Re-annotate HTML between passes.** After applying changes in the first pass, if a repair pass is needed, strip old node IDs (`stripNodeIds`) and re-assign fresh ones (`assignNodeIds`) before sending to the repair LLM call. Old IDs are invalid after DOM mutations.
9. **Remove CSS rules by regex, not by parsing.** `postProcessV2()` strips shared CSS selectors from `<style>` blocks using regex patterns: escape special chars in the selector, build `new RegExp(\`(?:^|\\n)\\s*${escaped}\\s*\\{[^}]*\\}\`, 'g')`. This handles most CSS but can miss nested `@keyframes`.
10. **Clean up empty elements after stripping.** After removing CSS rules or JS code, check if the `<style>` or `<script>` element is now empty (`.html().trim() === ''`) and remove the element entirely.
11. **Inject into `<head>` vs `</body>` deliberately.** Synchronous metadata scripts (theme-info.js, page-info.js) inject before `</head>`. Behavioral scripts (page-helpers, page-script) inject before `</body>`. Use `html.indexOf('</head>')` or `html.indexOf('</body>')` with string slicing for injection, or `$('head').append()` / `$('body').append()` when using cheerio.
12. **Use `injectError()` to surface errors to the client.** It inserts `<script id="error" type="application/json">{message, details}</script>` before `</body>`, removing any existing error block first. The page-script reads this to display errors.

## patterns

### Annotating and stripping node IDs

```typescript
import * as cheerio from 'cheerio';

function assignNodeIds(html: string): { html: string; nodeCount: number } {
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

function stripNodeIds(html: string): string {
    const $ = cheerio.load(html, { decodeEntities: false });
    $('[data-node-id]').removeAttr('data-node-id');
    return $.html();
}
```

### Applying CRUD operations with failure reporting

```typescript
function applyChangeListWithReport(html: string, changes: ChangeList): ApplyResult {
    const $ = cheerio.load(html, { decodeEntities: false });
    const failedOps: FailedOp[] = [];

    for (const change of changes) {
        switch (change.op) {
            case 'update': {
                const el = $(`[data-node-id="${change.nodeId}"]`);
                if (el.length === 0) {
                    failedOps.push({ op: change, reason: `node ${change.nodeId} not found` });
                    break;
                }
                el.html(change.html);
                break;
            }
            // ... replace, delete, insert follow same pattern
        }
    }
    return { html: $.html(), failedOps };
}
```

### Injecting a script tag before </body>

```typescript
function injectBeforeBodyClose(html: string, tag: string): string {
    const idx = html.indexOf('</body>');
    if (idx !== -1) {
        return html.slice(0, idx) + tag + '\n' + html.slice(idx);
    }
    return html + '\n' + tag;
}
```

### Ensuring required imports in <head>

```typescript
import * as cheerio from 'cheerio';

const REQUIRED_IMPORTS = [
    { selector: 'script[src*="marked"]', src: 'https://cdnjs.cloudflare.com/ajax/libs/marked/14.1.1/marked.min.js' },
];

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
```

## pitfalls

- **`$.html()` always returns a full document.** Cheerio's `$.html()` returns the serialized document including `<html>`, `<head>`, and `<body>` wrappers, even if they weren't in the original HTML. This is expected behavior — the page transformation loop works with full HTML documents.
- **`replace` invalidates child node IDs.** When `el.replaceWith(newHtml)` runs, all `data-node-id` attributes on child elements of the replaced node become stale. Subsequent ops targeting those IDs will fail — this is why the repair pass exists.
- **Regex CSS removal can't handle nested braces.** The pattern `selector\s*\{[^}]*\}` breaks on `@keyframes` rules which have nested `{}`. The code handles `@keyframes spin` separately with a more specific regex. If adding new nested-brace CSS patterns, add dedicated regex patterns.
- **`cheerio.load()` without `decodeEntities: false` mangles content.** It will decode HTML entities like `&amp;` to `&`, breaking JavaScript code inside `<script>` tags. Always use the option.
- **String-based injection vs cheerio-based injection.** Some injections (page-info, page-helpers, page-script) use `html.indexOf()` + string slicing for speed — they don't load cheerio at all. Others (ensureRequiredImports, postProcessV2) use cheerio because they need to query the DOM. Don't mix: if you're already in a cheerio context, use `$()` methods.

## instructions

Use this expert when working with DOM manipulation in SynthOS: modifying the transformation pipeline, adding new CRUD operations, building migration post-processors, or injecting new elements into served pages.

Pair with: `synthos-pages.md` for the page transformation loop context, `agentm-core.md` for how LLM responses feed into the change list.

## research

Deep Research prompt:

"Write a project-specific expert for cheerio usage in SynthOS. Cover: the data-node-id annotation system (sequential assignment to all tag elements, stripping before serving), the four CRUD change operations (update innerHTML, replace outerHTML, delete element, insert with prepend/append/before/after), the applyChangeListWithReport pattern for graceful failure handling, the repair pass flow (re-annotate → second LLM call → re-apply), CSS rule removal via regex patterns in postProcessV2, empty element cleanup, script/stylesheet injection strategies (string-based vs cheerio-based), the injectError pattern for client-side error display, and the decodeEntities: false requirement."
