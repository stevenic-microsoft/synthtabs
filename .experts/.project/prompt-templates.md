# prompt-templates

## purpose

Prompt construction pipeline in SynthOS: how system and user messages are assembled for page transformation, migration, brainstorm, and completion LLM calls.

## rules

1. **Follow the four-section system message structure for page transformation.** The system message in `transformPage()` is built from four concatenated blocks in this exact order: `<CURRENT_PAGE>` (annotated HTML), `<SERVER_APIS>` (constant API reference), `<SERVER_SCRIPTS>` (dynamic, only if scripts exist), `<THEME>` (dynamic, only if `themeInfo` provided), then `<USER_MESSAGE>` (the chat message). Never reorder these sections — the model relies on this layout.
2. **Keep the user message for transformation as goal + optional layers.** The user (prompt) message is: `goal` constant (transformation instructions + JSON format spec) + optional `<INSTRUCTIONS>` (user's custom instructions from settings) + optional `<MODEL_INSTRUCTIONS>` (provider-specific tuning from `getModelInstructions()`). The goal constant is the core — it never changes per-request.
3. **Annotate HTML with `data-node-id` before embedding in prompts.** `assignNodeIds()` runs on the raw page HTML before it enters the system prompt. Every element gets a sequential integer ID. The model references these IDs in its JSON change operations. Strip them from output via `stripNodeIds()` — they must never reach the client.
4. **Use XML-style delimiter tags for prompt sections.** All major prompt blocks use `<SECTION_NAME>` tags (e.g., `<CURRENT_PAGE>`, `<SERVER_APIS>`, `<SERVER_SCRIPTS>`, `<THEME>`, `<USER_MESSAGE>`, `<MODEL_INSTRUCTIONS>`, `<INSTRUCTIONS>`, `<CONTEXT>`, `<FAILED_OPERATIONS>`). These are not self-closing — the content follows on the next line. Maintain this convention when adding new sections.
5. **Build the theme block from `ThemeInfo` dynamically.** The `<THEME>` block is constructed inline in `transformPage()` (not a separate constant). It includes: mode, CSS custom property list, shared shell class inventory, page title bar alignment helpers, full-viewer mode instructions, auto-injected chat panel behaviours (with a "do NOT" list), and a light-mode override reminder. Changes to this block directly affect transformation quality — test thoroughly.
6. **List all APIs and helpers in the `serverAPIs` constant.** This is a module-level constant in `transformPage.ts` that documents every REST endpoint and every `window.synthos.*` helper method. When adding a new API endpoint or helper, update this constant so the model knows about it.
7. **Inject scripts dynamically via `listScripts()`.** The `<SERVER_SCRIPTS>` block only appears when the user has configured scripts in `.synthos/scripts/`. Each script is formatted as `POST /api/scripts/{id}` with description, request variables, and response type. Scripts are cached module-level after first load; call `clearCachedScripts()` after mutations to the scripts table.
8. **Use `getModelInstructions()` as the provider-specific tuning hook.** Currently identical for Claude and GPT ("Return ONLY the JSON array..."), but the function exists in `modelInstructions.ts` as a clean extension point. Add provider-specific tuning here, not scattered in `transformPage()`.
9. **Use the repair prompt pattern for self-healing.** When change operations fail (missing nodes), `transformPage()` makes a second LLM call with: system = `<CURRENT_PAGE>` (re-annotated) + `<FAILED_OPERATIONS>` (numbered failure summaries), user = `repairGoal` constant. The repair prompt is intentionally minimal — no APIs, no theme, no scripts — because it only needs to fix specific DOM mutations.
10. **Migration prompts are standalone system messages.** `V1_TO_V2_SYSTEM_PROMPT` in `migrations.ts` is a comprehensive single-shot instruction with rules for what to remove, add, transform, and preserve. Migration prompts expect raw HTML output (not JSON change ops). Always include a structural example and a "return ONLY the HTML" instruction.
11. **Brainstorm uses `jsonMode: true` with an inline system prompt.** The brainstorm endpoint in `useApiRoutes.ts` builds its system message inline (not a module constant). It includes a JSON schema specification, a `<CONTEXT>` block with page context, and formats multi-turn conversation as `User:` / `Assistant:` pairs in the user message. The response has three fields: `response`, `prompt`, `suggestions`.
12. **Completion uses `chainOfThought()` — no custom prompt construction.** The `POST /api/generate/completion` endpoint delegates entirely to agentm-core's `chainOfThought()` helper, which builds its own internal prompt. No custom system or user messages are involved.
13. **The `goal` constant defines protected elements explicitly.** The transformation goal lists protected CSS selectors (`.chat-panel`, `.chat-header`, `.link-group`, `#chatForm`, `#chatInput`, `.chat-submit`, `.chat-toggle`, `#thoughts`) and instructs the model not to update, replace, or delete them. When adding new protected infrastructure, update this list.
14. **Always request JSON-only output in transformation prompts.** Both the `goal` constant and `getModelInstructions()` instruct the model to return only a JSON array. The `parseChangeList()` function is tolerant (strips markdown fences, extracts embedded arrays), but the prompt should still request clean JSON to minimize parsing failures.

## patterns

### Full system message assembly (transformPage)

```typescript
// 1. Annotate page HTML
const { html: annotatedHtml } = assignNodeIds(pageState);

// 2. Load dynamic content
const scripts = await listScripts(pagesFolder);
const serverScripts = scripts.length > 0 ? `<SERVER_SCRIPTS>\n${scripts}\n\n` : '';

// 3. Build theme block (only if themeInfo provided)
let themeBlock = '';
if (args.themeInfo) {
    const { mode, colors } = args.themeInfo;
    const colorList = Object.entries(colors)
        .map(([name, value]) => `  --${name}: ${value}`)
        .join('\n');
    themeBlock = `<THEME>\nMode: ${mode}\nCSS custom properties:\n${colorList}\n...\n\n`;
}

// 4. Compose system message
const system: SystemMessage = {
    role: 'system',
    content: `<CURRENT_PAGE>\n${annotatedHtml}\n\n<SERVER_APIS>\n${serverAPIs}\n\n${serverScripts}${themeBlock}<USER_MESSAGE>\n${message}`
};
```

### Full user message assembly (transformPage)

```typescript
const modelInstr = args.modelInstructions
    ? `\n\n<MODEL_INSTRUCTIONS>\n${args.modelInstructions}` : '';
const userInstr = args.instructions
    ? `\n\n<INSTRUCTIONS>\n${args.instructions}` : '';
const prompt: UserMessage = {
    role: 'user',
    content: `${goal}${userInstr}${modelInstr}`
};
```

### Repair prompt assembly

```typescript
// Re-annotate the partially-updated HTML
const { html: reAnnotatedHtml } = assignNodeIds(stripNodeIds(firstPass.html));

// Build compact failure summary
const failedSummary = firstPass.failedOps
    .map((f, i) => `${i + 1}. op="${f.op.op}" — ${f.reason}\n   original: ${JSON.stringify(f.op)}`)
    .join('\n');

const repairSystem: SystemMessage = {
    role: 'system',
    content: `<CURRENT_PAGE>\n${reAnnotatedHtml}\n\n<FAILED_OPERATIONS>\n${failedSummary}`
};
const repairPrompt: UserMessage = { role: 'user', content: repairGoal };
const repairMaxTokens = Math.min(maxTokens, 4096);
```

### Migration prompt pattern

```typescript
// Standalone system prompt — comprehensive single-shot instruction
const system = { role: 'system' as const, content: V1_TO_V2_SYSTEM_PROMPT };
const prompt = { role: 'user' as const, content: `Convert this v1 page to v2 format:\n\n${html}` };
const result = await completePrompt({ prompt, system, maxTokens: 16000 });

// Always post-process LLM migration output with cheerio verification
let migrated = result.value!.trim();
if (migrated.startsWith('```')) {
    migrated = migrated.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
}
migrated = postProcessV2(migrated);
```

### Adding a new API to the prompt

```typescript
// In transformPage.ts — add to the serverAPIs constant:
const serverAPIs = `
...existing endpoints...

POST /api/my-new-endpoint
description: What it does
request: { param: type }
response: { result: type }

PAGE HELPERS (available globally as window.synthos):
  ...existing helpers...
  synthos.myModule.myMethod(args)   — POST /api/my-new-endpoint
...`;
```

## pitfalls

- **The theme block is inline, not a constant.** Unlike `goal`, `serverAPIs`, and `repairGoal` which are module-level constants, the theme block is built inline in `transformPage()` because it varies per-request. If you're looking for the theme prompt text, search for `<THEME>` in `transformPage()`, not for a named constant.
- **`serverAPIs` must stay in sync with actual routes.** If you add a new API endpoint in `useApiRoutes.ts` but forget to update `serverAPIs` in `transformPage.ts`, the model won't know the endpoint exists and will use raw `fetch()` or hallucinate an API shape.
- **`serverAPIs` must also list new `synthos.*` helpers.** The constant has a `PAGE HELPERS` section at the bottom. Adding a helper method in `helpers-v2.js` without listing it here means the model won't use it.
- **Repair prompt caps `maxTokens` at 4096.** The repair call uses `Math.min(maxTokens, 4096)` because repairs should be small. If you add a new LLM call pattern, decide the appropriate token budget — don't blindly reuse the user's `maxTokens`.
- **Migration prompts expect raw HTML output, not JSON change ops.** The migration pipeline uses a completely different output format from transformation. Never add `parseChangeList()` to a migration result — use markdown fence stripping + cheerio post-processing instead.
- **The brainstorm system prompt is inline in a route handler.** It's not a named constant or separate file — it's a template literal inside the `POST /api/brainstorm` handler in `useApiRoutes.ts`. This makes it harder to find. If modifying brainstorm behavior, search for `brainstorming assistant` in that file.
- **`parseChangeList()` is tolerant but not bulletproof.** It tries direct `JSON.parse`, then regex extraction of `[...]`. Deeply nested arrays or multiple JSON arrays in a single response can cause incorrect extraction. The prompt instructions ("Return ONLY the JSON array") are the primary defense.
- **Adding `<USER_MESSAGE>` to the system message is deliberate.** The user's chat message appears in the system message (not the user message) because the user message slot is reserved for the `goal` + `instructions` + `modelInstructions` — the structural instructions that don't change between requests.

## instructions

Use this expert when modifying any LLM prompt in SynthOS: changing the transformation prompt, adding new API references, building migration prompts, modifying the brainstorm flow, adding new prompt sections, or tuning model-specific instructions.

Pair with: `agentm-core.md` for how `completePrompt` is called, `synthos-pages.md` for the page transformation lifecycle, `cheerio-transforms.md` for how the annotated HTML is built and change ops are applied.

## research

Deep Research prompt:

"Write a project-specific expert for the prompt template system in SynthOS. Cover: the four-section system message structure for page transformation (CURRENT_PAGE, SERVER_APIS, SERVER_SCRIPTS, THEME, USER_MESSAGE), the user message structure (goal constant + optional INSTRUCTIONS + optional MODEL_INSTRUCTIONS), the data-node-id annotation pipeline, the XML-style delimiter tag convention, the goal constant (protected elements, JSON change operation format, viewer panel and canvas instructions), the serverAPIs constant (REST endpoints + window.synthos helpers), the dynamic scripts block from listScripts(), the inline theme block construction (mode, CSS properties, shared classes, protected infrastructure, light-mode guidance), the repair prompt pattern (re-annotated HTML + FAILED_OPERATIONS), the migration prompt pattern (standalone system prompt with remove/add/transform/preserve rules, raw HTML output), the brainstorm prompt (inline system with JSON schema + CONTEXT, multi-turn formatting), the completion endpoint (chainOfThought delegation), the getModelInstructions() extension point, and parseChangeList() tolerance patterns."
