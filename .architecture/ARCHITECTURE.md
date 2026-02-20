# SynthOS / SynthTabs Architecture

## Overview

SynthOS is an AI-powered local web application builder. Users create fully functional
HTML/CSS/JS apps through conversational chat — no manual coding required. **SynthTabs**
is a fork that adds Microsoft Teams integration via the **Customizer** extensibility
layer.

Installed via `npm install -g synthos`, run with `synthos start`. Node.js v20+.

---

## Tech Stack

| Layer        | Technology                                      |
|------------- |-------------------------------------------------|
| Language     | TypeScript (strict, ESNext target)              |
| Server       | Express.js                                      |
| DOM Engine   | cheerio (server-side HTML manipulation)         |
| AI Providers | Anthropic SDK, OpenAI SDK, FireworksAI (OpenAI-compat) |
| Agent Protocols | A2A SDK, OpenClaw (WebSocket)                |
| CLI          | yargs                                           |
| Tests        | Mocha + ts-mocha, nyc (coverage)                |

---

## Folder Structure

```
synthtabs/
├── bin/                        CLI entry (synthos.js)
├── src/                        TypeScript source
│   ├── index.ts                Public exports
│   ├── init.ts                 Config creation, first-run setup
│   ├── files.ts                File I/O helpers
│   ├── pages.ts                Page CRUD, metadata, versioning
│   ├── scripts.ts              Shell script execution
│   ├── settings.ts             Settings persistence (v2)
│   ├── themes.ts               Theme loading & parsing
│   ├── migrations.ts           Page version upgrades (v1 → v2)
│   ├── synthos-cli.ts          CLI command parser
│   ├── customizer/
│   │   ├── Customizer.ts       Extensibility framework
│   │   └── index.ts            Default Customizer instance
│   ├── service/
│   │   ├── server.ts           Express app assembly
│   │   ├── usePageRoutes.ts    GET/POST /:page (serve + transform)
│   │   ├── useApiRoutes.ts     /api/pages, /api/themes, /api/settings, etc.
│   │   ├── useConnectorRoutes.ts  /api/connectors (OAuth2, proxy)
│   │   ├── useAgentRoutes.ts   /api/agents (A2A + OpenClaw streaming)
│   │   ├── useDataRoutes.ts    /api/data/:page/:table (JSON CRUD)
│   │   ├── transformPage.ts    Core page transformation pipeline
│   │   ├── createCompletePrompt.ts  Provider-specific prompt routing
│   │   ├── modelInstructions.ts  Per-model prompt tuning
│   │   ├── generateImage.ts    DALL-E 3 image generation
│   │   ├── requiresSettings.ts Middleware: settings guard
│   │   └── debugLog.ts         Colored debug logging
│   ├── models/                 LLM provider implementations
│   │   ├── anthropic.ts        Claude (Opus/Sonnet/Haiku)
│   │   ├── openai.ts           GPT (5.2/5-mini/5-nano)
│   │   └── fireworksai.ts      FireworksAI (GLM-5)
│   ├── agents/                 Agent protocol implementations
│   │   ├── a2aProvider.ts      A2A HTTP protocol
│   │   └── openclawProvider.ts OpenClaw WebSocket + SSH tunnels
│   └── connectors/             Connector registry loader
├── default-pages/              Starter HTML templates (copied on init)
├── default-scripts/            OS-specific shell script templates
├── default-themes/             Theme CSS + JSON (Nebula Dusk/Dawn)
├── page-scripts/               Versioned page scripts (page-v2.js, helpers-v2.js)
├── required-pages/             System pages (builder, settings, pages, scripts, apis)
├── service-connectors/         28+ connector JSON definitions
├── migration-rules/            Markdown rules for page upgrades
├── tests/                      Unit tests
├── teams-default-pages/        [TEAMS] Custom page templates
├── teams-default-scripts/      [TEAMS] Custom shell scripts
├── teams-default-themes/       [TEAMS] Custom themes
├── teams-page-scripts/         [TEAMS] Custom versioned page scripts
├── teams-required-pages/       [TEAMS] Custom system pages
├── teams-service-connectors/   [TEAMS] Custom connectors
└── .synthos/                   USER DATA (created at runtime, git-ignored)
    ├── settings.json           API keys, model config, features
    ├── pages/<name>/           page.html + page.json + data tables
    ├── themes/                 Local theme copies
    └── scripts/                User shell scripts
```

---

## Core Loop: Page Transformation

This is the heart of SynthOS — every page edit goes through this pipeline:

```
User types message in chat panel
        │
        ▼
POST /:page  (usePageRoutes.ts)
        │
        ▼
transformPage()  (transformPage.ts)
  1. Assign data-node-id to every element (cheerio)
  2. Build LLM prompt with:
     - Annotated HTML
     - Theme info (CSS variables, colors)
     - Enabled connectors + hints
     - Enabled agents + capabilities
     - Available scripts
     - Custom transform instructions (from Customizer)
  3. Route to provider (Anthropic / OpenAI / FireworksAI)
  4. LLM returns JSON array of change operations:
     { op: "update"|"delete"|"insert", nodeId, html, parentId }
  5. Apply changes via cheerio
  6. Strip data-node-id attributes
        │
        ▼
Save updated HTML → Serve to browser
```

On error (bad JSON, missing nodes), the original page is returned unchanged
with an injected `<script id="error">` block.

---

## Key Interfaces

### SynthOSConfig (src/init.ts)
```typescript
interface SynthOSConfig {
    pagesFolder: string;           // User's .synthos/ directory
    requiredPagesFolder: string;   // Built-in system pages
    defaultPagesFolder: string;    // Starter templates
    defaultScriptsFolder: string;  // OS-specific scripts
    defaultThemesFolder: string;   // Theme CSS/JSON
    pageScriptsFolder: string;     // Versioned page scripts
    serviceConnectorsFolder: string; // Connector definitions
    debug: boolean;
    debugPageUpdates: boolean;
}
```

### PageInfo (src/pages.ts)
```typescript
interface PageInfo {
    name: string;
    title: string;
    categories: string[];
    pinned: boolean;
    showInAll: boolean;
    createdDate: string;        // ISO 8601
    lastModified: string;       // ISO 8601
    pageVersion: number;        // 0=pre, 1=legacy, 2=current
    mode: 'unlocked' | 'locked';
}
```

### SettingsV2 (src/settings.ts)
```typescript
interface SettingsV2 {
    version: 2;
    theme: string;
    models: ModelEntry[];       // builder + chat models
    features: string[];
    connectors?: ServicesConfig;
    agents?: AgentConfig[];
}
```

---

## Customizer Architecture (src/customizer/)

The `Customizer` class is the extensibility hook for forks like SynthTabs.
It allows a derived class to:

1. **Override content folder paths** — point to `teams-*` folders instead of defaults
2. **Disable feature groups** — `'pages'`, `'api'`, `'connectors'`, `'agents'`, `'data'`, `'brainstorm'`, `'search'`, `'scripts'`
3. **Add custom Express routes** — with optional LLM routing hints
4. **Inject custom LLM instructions** — appended to transformPage prompt

### How it plugs in

- `createConfig()` in `init.ts` accepts an optional `Customizer` and uses its
  folder getters (with `??` fallback to defaults)
- `server()` in `server.ts` checks `customizer.isEnabled(group)` before
  mounting each route set
- `server()` installs any extra routes via `customizer.getExtraRoutes()`
- The default singleton in `customizer/index.ts` enables everything with base paths

### For SynthTabs

A `TeamsCustomizer extends Customizer` would override folder getters to return
the `teams-*` paths, disable irrelevant feature groups, and add Teams-specific
routes + LLM instructions.

---

## Route Map

| Route Group       | Guard                         | Key Endpoints |
|-------------------|-------------------------------|---------------|
| Page routes       | `isEnabled('pages')`          | `GET /:page`, `POST /:page`, `/:page/reset` |
| API routes        | `isEnabled('api')`            | `/api/pages`, `/api/themes`, `/api/settings`, `/api/generate/*` |
| Connector routes  | `isEnabled('connectors')`     | `/api/connectors`, `/api/connectors/:id` |
| Agent routes      | `isEnabled('agents')`         | `/api/agents`, `/api/agents/:id/send` |
| Data routes       | `isEnabled('data')`           | `/api/data/:page/:table/*` |
| Custom routes     | Always installed              | Defined by `Customizer.addRoutes()` |

---

## Model Routing

Model prefix determines provider:
- `claude-*` → Anthropic (`src/models/anthropic.ts`)
- `gpt-*` → OpenAI (`src/models/openai.ts`)
- `glm-*` → FireworksAI (`src/models/fireworksai.ts`)

Each model can be assigned to a **use**: `'builder'` (page transformation) or
`'chat'` (in-app conversations). Different models can serve different roles.

---

## Data Storage

All user data lives in `.synthos/` (file-based, no database):

```
.synthos/pages/<page-name>/
  ├── page.html          Page state (full HTML)
  ├── page.json          Metadata (title, version, mode, dates)
  └── <table-name>/      Data tables
      ├── <uuid>.json    Individual records
      └── ...
```

CRUD via `/api/data/:page/:table` endpoints. Client helper: `synthos.data.*`.

---

## Upstream Reference

The upstream SynthOS source lives at `..\synthos` relative to this repo.
The Customizer pattern means SynthTabs can diverge in content (pages, themes,
connectors) while staying in sync with core logic changes from upstream.
