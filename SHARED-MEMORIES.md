# Synthos — Shared Project Knowledge

This file is checked into the repo so that any developer using Claude Code gets
project-level context automatically. Per-developer details (OS, editor paths)
belong in each developer's personal `MEMORY.md`.

## What SynthOS Is
An AI-powered local web environment where every page is a living, AI-modifiable SPA. Installed via `npm install -g synthos`, run with `synthos start` from any folder.

## Core Concept: The Page Transformation Loop
1. User types a message in a page's chat panel
2. `POST /:page` sends the message + current full HTML to an LLM
3. `transformPage` prompts the LLM to produce a new page state — maintaining layout, appending chat history, rendering content in the viewer panel
4. Returned HTML replaces old page state (in-memory cache + optionally disk)
5. Browser renders the new page

Users conversationally build apps, tools, games, visualizations — anything expressible as HTML/CSS/JS — through chat.

## Folder Structure
- **`src/`** — CLI entry, init, file/page/script/settings helpers
- **`src/service/`** — Express server, routes, API logic, page transformation
- **`bin/synthos.js`** — CLI entry point
- **`default-pages/`** — starter HTML templates copied to `.synthos/` on first run
- **`required-pages/`** — built-in pages always served (home, settings, pages, scripts, apis)
- **`default-scripts/`** — OS-specific shell script templates (one per OS)

## API Surface
- **Data** (`/api/data/:table`) — file-based JSON storage; folders under `.synthos/`, rows are UUID-named JSON files; full CRUD
- **Completions** (`/api/generate/completion`) — proxies to OpenAI/Anthropic via `agentm-core`; uses chain-of-thought
- **Image generation** (`/api/generate/image`) — DALL-E 3 via OpenAI; non-OpenAI models get placeholder
- **Scripts** (`/api/scripts/:id`) — executes shell commands from JSON templates with `{{variable}}` substitution; returns stdout
- **Pages** (`GET /api/pages`) — lists all available pages
- **Settings** (`GET/POST /api/settings`) — API key, model, maxTokens, imageQuality, instructions, logCompletions

## Page System
- Pages served from `.synthos/` (user local) with fallback to `required-pages/` (built-in)
- Bracket-prefixed names like `[application]` are templates, sorted to end of page list
- Pages can be saved-as, reset, and managed via the `pages.html` required page

## Scripts System
- `default-scripts/` has one JSON template per OS (Windows, Mac, Linux, Android)
- On init, correct OS template copied to `.synthos/scripts/`
- Scripts are shell commands; managed via `scripts.html`; execution returns stdout to calling page

## Key Dependency
`agentm-core` — AI abstraction layer providing `completePrompt`, `chainOfThought`, `generateObject`, and model constructors for OpenAI + Anthropic

## Settings
Stored in `.synthos/settings.json`. Fields: `serviceApiKey`, `model`, `maxTokens`, `imageQuality`, `instructions`, `logCompletions`

## Models Supported
Claude (Opus/Sonnet/Haiku) and GPT (5.2/5 mini/5 nano). Model prefix `claude-` routes to Anthropic, `gpt-` routes to OpenAI. GPT models use `transformPageAsObject` (structured output), Claude uses `transformPage` (raw text extraction).
