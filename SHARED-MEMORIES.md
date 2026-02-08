# Synthos — Shared Project Knowledge

This file is checked into the repo so that any developer using Claude Code gets
project-level context automatically. Per-developer details (OS, editor paths)
belong in each developer's personal `MEMORY.md`.

## What SynthOS Is
An AI-powered local web environment where every page is a living, AI-modifiable SPA. Installed via `npm install -g synthos`, run with `synthos start` from any folder.

## Core Concept: The Page Transformation Loop (Delta-Based)
1. User types a message in a page's chat panel
2. `POST /:page` sends the message + current full HTML to an LLM
3. `transformPage` assigns `data-node-id` to every element (via cheerio), sends annotated HTML to the LLM, and asks for a JSON array of CRUD change operations (update/replace/delete/insert) keyed by `data-node-id`
4. Changes are applied via cheerio, `data-node-id` attributes are stripped, and clean HTML replaces old page state
5. Browser renders the new page
6. On error (bad JSON, missing nodes, etc.), the original page is returned unchanged with an injected `<script id="error" type="application/json">` block

Users conversationally build apps, tools, games, visualizations — anything expressible as HTML/CSS/JS — through chat.

## Folder Structure
- **`src/`** — CLI entry, init, file/page/script/settings helpers
- **`src/service/`** — Express server, routes, API logic, page transformation
- **`bin/synthos.js`** — CLI entry point
- **`default-pages/`** — starter HTML templates copied to `.synthos/` on first run
- **`required-pages/`** — built-in pages always served (builder, settings, pages, scripts, apis)
- **`default-scripts/`** — OS-specific shell script templates (one per OS)

## API Surface
- **Data** (`/api/data/:table`) — file-based JSON storage; folders under `.synthos/`, rows are UUID-named JSON files; full CRUD
- **Completions** (`/api/generate/completion`) — proxies to OpenAI/Anthropic via `agentm-core`; uses chain-of-thought
- **Image generation** (`/api/generate/image`) — DALL-E 3 via OpenAI; non-OpenAI models get placeholder
- **Scripts** (`/api/scripts/:id`) — executes shell commands from JSON templates with `{{variable}}` substitution; returns stdout
- **Pages** (`GET /api/pages`) — lists all available pages
- **Page Metadata** (`GET /api/pages/:name`) — returns full metadata (title, categories, pinned, createdDate, lastModified, pageVersion, mode)
- **Page Metadata** (`POST /api/pages/:name`) — merge-updates page metadata; accepts title, categories, pinned, mode; auto-sets lastModified
- **Pin Page** (`POST /api/pages/:name/pin`) — toggles pinned status for a page
- **Settings** (`GET/POST /api/settings`) — API key, model, maxTokens, imageQuality, instructions, logCompletions

## Page System
- Pages served from `.synthos/` (user local) with fallback to `required-pages/` (built-in)
- Each page has a companion `page.json` metadata file with: `title` (display name, falls back to folder name), `categories`, `pinned`, `createdDate` (ISO 8601), `lastModified` (ISO 8601), `pageVersion` (integer, current = 1), `mode` (`"unlocked"` | `"locked"`)
- `POST /api/pages/:name` uses merge semantics — send only the fields to update; `lastModified` is auto-set, `createdDate`/`pageVersion` are preserved
- Pages can be saved-as, reset, and managed via the `pages.html` required page

## Scripts System
- `default-scripts/` has one JSON template per OS (Windows, Mac, Linux, Android)
- On init, correct OS template copied to `.synthos/scripts/`
- Scripts are shell commands; managed via `scripts.html`; execution returns stdout to calling page

## Key Dependencies
- `agentm-core` — AI abstraction layer providing `completePrompt`, `chainOfThought`, `generateObject`, and model constructors for OpenAI + Anthropic
- `cheerio` — server-side DOM manipulation for assigning/stripping `data-node-id` and applying CRUD change ops during page transformation

## Settings
Stored in `.synthos/settings.json`. Fields: `serviceApiKey`, `model`, `maxTokens`, `imageQuality`, `instructions`, `logCompletions`

## Theme System
- Themes live in `themes/` as folders (e.g. `themes/nebula-dusk/`, `themes/nebula-dawn/`).
- Each theme folder contains a `theme.json` (metadata, CSS variable values, mode) and a `theme.css` (compiled stylesheet).
- `theme.json` declares `mode: "dark"` or `mode: "light"`, plus color values for CSS custom properties (`--accent-primary`, `--accent-secondary`, `--text-primary`, `--text-secondary`, `--border-color`, `--accent-glow`, etc.).
- `theme-info.js` (served at `/api/theme-info.js`) runs at page load: sets `window.themeInfo` with the active theme's metadata/colors and adds a `light-mode` or `dark-mode` class to `<html>`.
- `theme.css` (served at `/api/theme.css`) handles shared shell elements (chat panel, viewer panel, scrollbar, buttons, loading overlay, modal dialogs, form elements).
- **Page-specific light-mode support:** Each page's `<style>` block contains its own dark-mode defaults. Pages that need light-mode adaptation have `.light-mode` CSS overrides appended at the end of their `<style>` block. Canvas-based scenes (solar_system, space_invaders) keep their canvas dark; only UI chrome adapts.
- Three pages need no light-mode overrides: `builder.html`, `pages.html`, `split-application.html` (they use only accent-color CSS variables).

## Page Info System
- `/api/page-info.js?page=<name>` — returns a self-executing JS script that sets `window.pageInfo = { name, mode }` synchronously
- Server-side injection: `usePageRoutes.ts` injects `<script id="page-info" src="/api/page-info.js?page=<name>">` before `</head>` on every `GET /:page` response — works automatically for all pages including user-created ones
- **Locked mode** (required/system pages): hides `#chatForm`, changes `#saveLink` text to "Copy" (save-as flow preserved), replaces `#resetLink` with "Reload" (navigates to same pathname)
- **Unlocked mode** (default pages, user pages): no DOM changes, standard Save/Reset behavior

## Models Supported
Claude (Opus/Sonnet/Haiku) and GPT (5.2/5 mini/5 nano). Model prefix `claude-` routes to Anthropic, `gpt-` routes to OpenAI. All models use a single `transformPage` pipeline that returns delta-based JSON change operations. Provider-specific prompt tuning is handled by `getModelInstructions()` in `src/service/modelInstructions.ts`.
