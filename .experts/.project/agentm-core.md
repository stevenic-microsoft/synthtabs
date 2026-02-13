# agentm-core

## purpose

Usage patterns for the `agentm-core` AI abstraction layer: model construction, prompt completion, chain-of-thought, and the `AgentCompletion` return type.

## rules

1. **Route models by prefix.** If the model string starts with `claude-`, call `anthropic({ apiKey, model })`. Otherwise, call `openai({ apiKey, model })`. This is the sole branching logic in `createCompletePrompt.ts` — do not add provider-specific code paths elsewhere.
2. **Always use `createCompletePrompt()` to get a `completePrompt` function.** Never construct `anthropic()` or `openai()` instances directly in route handlers. The factory loads settings, validates the API key and model, and optionally wraps with `logCompletePrompt()`.
3. **Handle the `AgentCompletion<T>` return type.** Every agentm-core call returns `{ completed: boolean; value?: T; error?: Error }`. Always check `result.completed` before accessing `result.value`. On failure, `result.error` contains the error.
4. **Use `chainOfThought()` for the completions API endpoint.** The `POST /api/generate/completion` route uses `chainOfThought({ question, temperature, maxTokens, completePrompt })` which returns `AgentCompletion<{ answer: string; explanation: string }>`.
5. **Pass `jsonMode: true` for structured JSON responses.** When calling `completePrompt()` with `jsonMode: true`, agentm-core instructs the model to return JSON and may auto-parse the response. Used by the brainstorm endpoint.
6. **The `completePrompt` type is both a function and a type.** Import it as: `import { completePrompt } from 'agentm-core'`. It's a callable type `(args: { prompt: UserMessage; system?: SystemMessage; maxTokens: number; jsonMode?: boolean }) => Promise<AgentCompletion<string>>`.
7. **Use `SystemMessage` and `UserMessage` for prompt construction.** Both are `{ role: 'system' | 'user'; content: string }`. The `transformPage` function builds these manually — system message contains the page HTML + APIs + theme block, user message contains the goal instructions.
8. **Image generation bypasses agentm-core.** `generateImage()` in `generateImage.ts` uses the OpenAI SDK directly (`new OpenAI({ apiKey })`) because DALL-E 3 image generation is not covered by agentm-core's `completePrompt` abstraction. Non-OpenAI models get a static placeholder via `generateDefaultImage()`.
9. **Wrap with `logCompletePrompt()` for debug logging.** When `settings.logCompletions` is true, `createCompletePrompt()` wraps the model instance with `logCompletePrompt(modelInstance, true)`. This logs all prompts and responses.
10. **The `transformPage` POST handler wraps `completePrompt` for debug output.** In `usePageRoutes.ts`, the inner `completePrompt` is wrapped with a closure that logs system/prompt content and tracks input/output character counts when `config.debugPageUpdates` is true.

## patterns

### Creating a model instance from settings

```typescript
import { createCompletePrompt } from './createCompletePrompt';

// Standard: uses the model from settings
const completePrompt = await createCompletePrompt(config.pagesFolder);

// Override: use a specific model (e.g., from request body)
const completePrompt = await createCompletePrompt(config.pagesFolder, req.body.model);
```

### Calling completePrompt directly

```typescript
import { SystemMessage, UserMessage } from 'agentm-core';

const system: SystemMessage = {
    role: 'system',
    content: 'You are a helpful assistant.'
};

const prompt: UserMessage = {
    role: 'user',
    content: 'Explain quantum computing in one sentence.'
};

const result = await completePrompt({ prompt, system, maxTokens: 1024 });
if (result.completed) {
    console.log(result.value);  // string response
} else {
    console.error(result.error?.message);
}
```

### Using chainOfThought for structured answers

```typescript
import { chainOfThought } from 'agentm-core';

const response = await chainOfThought({
    question: 'What is the capital of France?',
    temperature: 0.7,
    maxTokens: 1024,
    completePrompt
});

if (response.completed) {
    const { answer, explanation } = response.value!;
    // answer: "Paris"
    // explanation: "Paris is the capital and largest city of France..."
}
```

### Using jsonMode for structured output

```typescript
const result = await completePrompt({
    prompt: { role: 'user', content: formatted },
    system: { role: 'system', content: systemPrompt },
    maxTokens: 4096,
    jsonMode: true
});

if (result.completed) {
    // jsonMode may auto-parse — check type before JSON.parse
    const parsed = (typeof result.value === 'object' && result.value !== null)
        ? result.value as Record<string, unknown>
        : (() => { try { return JSON.parse(result.value as string); } catch { return null; } })();
}
```

## pitfalls

- **Don't assume `result.value` is always a string.** With `jsonMode: true`, agentm-core may return an already-parsed object. Always check `typeof result.value` before calling `JSON.parse()`.
- **The `model` parameter in `createCompletePrompt` is display-name, not API-name.** The `availableModels` array uses display names like `'Claude Sonnet 4.5'` and `'GPT-5 mini'`. The model string is passed directly to agentm-core which handles mapping. But the prefix check (`model.startsWith('claude-')`) means display names starting with uppercase don't route to Anthropic — verify the routing logic if adding new models.
- **No retry logic built in.** agentm-core does not retry on transient failures. If a completion fails, `result.completed` is false and `result.error` holds the error. Callers must implement their own retry if needed (the repair pass in `transformPage` is the only retry-like pattern).
- **`maxTokens` is the response cap, not the total context.** It limits the model's output length. The input (system + prompt) has no explicit cap in the code — it relies on the model's context window. Large pages can approach context limits.
- **Settings are cached in-memory.** `loadSettings()` caches after first read. If settings change on disk mid-session (rare), the cache won't reflect it until server restart.

## instructions

Use this expert when working with LLM calls in SynthOS: building prompts, calling models, handling completions, or modifying the model routing logic.

Pair with: `synthos-pages.md` for the page transformation loop, `express-routes.md` for how API endpoints wire into model calls.

## research

Deep Research prompt:

"Write a project-specific expert for agentm-core usage in SynthOS. Cover: the completePrompt function type signature and usage, model constructor functions (anthropic(), openai()) and their routing by model prefix, the AgentCompletion<T> return type pattern (completed/value/error), chainOfThought for structured Q&A, logCompletePrompt for debug wrapping, SystemMessage/UserMessage types, jsonMode for structured JSON responses, the createCompletePrompt factory pattern (settings loading, model validation, optional logging), image generation as the exception that uses OpenAI SDK directly, and the debug wrapper in usePageRoutes.ts that tracks I/O character counts."
