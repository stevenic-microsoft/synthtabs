# SynthOS — The Hyper-Personalized App Builder That Turns Anyone Into a Programmer

**Build real apps by describing what you want.** No coding experience required.

SynthOS is a local AI-powered environment where you create fully functional applications — tools, games, dashboards, utilities — just by chatting. Describe what you need, refine it conversationally, and watch it appear in real time. Every app is a living page that you can save, share, and keep evolving.

<!-- SCREENSHOT: Hero shot — the builder page with a finished app in the viewport (something visually impressive like a dashboard or interactive tool) -->

---

## Why SynthOS?

Most "no-code" tools give you templates and drag-and-drop. SynthOS gives you a **conversation**. Tell it what you want in plain English and it builds it — HTML, CSS, JavaScript — all running live in your browser. You don't need to understand the code. But if you're curious, it's all right there, teaching you as you go.

- **Zero programming knowledge needed** — just describe what you want
- **Unlimited flexibility** — if you can imagine it, SynthOS can build it
- **Learn by doing** — every app you create is real, inspectable code
- **Runs locally** — your data and API keys never leave your machine
- **Iterative refinement** — keep chatting to tweak, extend, and polish

---

## What Can You Build?

Anything that runs in a browser. Here are a few examples:

### Interactive Tools & Utilities

Build JSON formatters, unit converters, note-taking apps, task managers — any productivity tool you can describe.

<!-- SCREENSHOT: A productivity tool or utility app (e.g., JSON Tools or My Notes) -->

### Games

From arcade shooters to text adventures — SynthOS ships with Neon Asteroids (a synthwave space shooter) and Oregon Trail (complete with an AI trail guide named Dusty).

<!-- SCREENSHOT: Neon Asteroids or another game running in the viewport -->

### Data Dashboards & Visualizations

Interactive charts, maps, and dashboards powered by D3.js. Describe the data you want to see and SynthOS builds the visualization.

<!-- SCREENSHOT: A data visualization — US Map or a chart/dashboard -->

### Interactive Educational Experiences

Create rich learning experiences with built-in AI. Solar Explorer lets you click through a 3D-style solar system to learn about planets and orbital mechanics. Oregon Trail teaches frontier history through an AI guide that answers kids' questions at every stop. Western Cities 1850 pairs an interactive map with an AI historian at each location.

<!-- SCREENSHOT: Solar Explorer showing the interactive solar system with a planet info panel -->

Your apps are saved as HTML pages that run within SynthOS. Share them with anyone else running SynthOS, or keep building on them later.

---

## Getting Started

### 1. Install

You'll need [Node.js](https://nodejs.org/en/download/package-manager/current) v20 or later.

```bash
npm install --global synthos
synthos start
```

This starts the SynthOS server at `http://localhost:4242`. Keep the terminal open while you work.

### 2. Follow the First-Run Experience

On your first launch, SynthOS walks you through a **guided setup experience**. It will help you configure your AI model, enter your API key, and learn the basics of building with SynthOS. No reading docs, no guesswork — you'll be creating your first app within minutes.

<!-- SCREENSHOT: The first-run experience / settings page showing model selection and API key input -->

| Provider | Recommended Model | Get an API Key |
|----------|-------------------|----------------|
| Anthropic | Claude Opus | [platform.claude.com](https://platform.claude.com/settings/keys) |
| OpenAI | GPT-5.2 | [platform.openai.com](https://platform.openai.com/api-keys) |
| Fireworks AI | GLM-5 | [fireworks.ai](https://fireworks.ai/) |

### 3. Start Building

Type what you want to create. That's it.

<!-- SCREENSHOT: The builder page with a user prompt and the resulting app being generated -->

Use the controls above the chat box to **save** your app, **reset** the viewport, or browse your **pages gallery**.

<!-- SCREENSHOT: Close-up of the chat controls (save, reset, pages buttons) -->

---

## Tips for Best Results

- **Claude Opus is recommended** for the best experience overall. It produces the highest quality apps right out of the box.

- **Using GPT-5.2 or GLM-5?** Start with **Brainstorming Mode**. Click the brainstorm icon in the chat input to open an AI-powered ideation assistant that helps you explore and refine your idea before building. It generates a clean, optimized build prompt that gets dramatically better results from any model. This is especially useful with non-Opus models where prompt quality makes a bigger difference.

<!-- SCREENSHOT: Brainstorming Mode modal showing a conversation with suggestions and the "Build It" button -->

- **Save often, reset freely.** Save your app whenever you hit a version you like. Use **Reset** to return to your last save point and take things in a different direction. Think of it like checkpoints — experiment boldly knowing you can always go back.

---

## How It Works

```
You describe what you want
        ↓
   AI writes the code
        ↓
  App appears instantly
        ↓
 You refine with chat
        ↓
   Save & reuse
```

Every app is a self-contained HTML page. Behind the scenes, SynthOS sends your conversation and the current page state to your chosen LLM, which returns precise, surgical edits — not a full rewrite. The page updates in place — no reloads, no lost state.

---

## Templates — A Head Start

SynthOS ships with starter templates so you don't have to start from scratch:

| Template | Best For |
|----------|----------|
| **Application** | Tools, utilities, single-pane apps |
| **Two-Panel Page** | Side-by-side layouts with a draggable splitter |
| **Sidebar Page** | Content with navigation or controls on the side |
| **US Map** | Interactive D3.js map visualization as a starting point |

Plus ready-to-use apps like **My Notes** (a full note-taking app with rich text editing), **Neon Asteroids**, and **Solar Explorer** — all built entirely within SynthOS.

<!-- SCREENSHOT: One or two template examples showing the layout structure -->

---

## Your Apps, Your Machine

Everything SynthOS creates lives in a `.synthos` folder wherever you started the server. Apps are plain HTML files you can:

- Open directly in any browser
- Copy to another machine
- Edit by hand if you want to
- Delete when you're done

<!-- SCREENSHOT: File explorer showing the .synthos folder structure with saved pages -->

---

## Themes

SynthOS ships with dark and light themes out of the box:

- **Nebula Dusk** — a synthwave dark theme with glowing purple and magenta accents
- **Nebula Dawn** — a soft pastel light theme with the same color palette

Switch themes in Settings and every page adapts automatically.

<!-- SCREENSHOT: Side-by-side or before/after showing Nebula Dusk and Nebula Dawn -->

---

## Power Features

### Built-in Storage API

Your apps can save and retrieve data locally — no database setup needed. Just call `synthos.data.save("tasks", {title: "Buy milk"})` and it works. Build todo lists, note-taking apps, inventory trackers, and more.

### AI Inside Your Apps

Apps can make their own AI calls using `synthos.generate.completion()`. This is how Oregon Trail's "Dusty" guide and Western Cities' AI historian work — your apps can talk back to users intelligently.

### Custom Scripts

Create shell scripts that your apps can invoke. Start builds, run Git commands, call APIs — extend SynthOS to automate anything on your machine.

### API Explorer

Test and explore all of SynthOS's built-in APIs interactively from the APIs system page.

<!-- SCREENSHOT: The API Explorer page -->

---

## Connectors — 28 External Services (Preview)

Connect your apps to real-world APIs without writing any authentication code. SynthOS handles credentials and proxies requests automatically.

**Search & News** — Brave Search, NewsAPI, RSS2JSON
**Developer Tools** — GitHub, Jira
**Social Media** — Instagram (full OAuth2)
**Databases** — Airtable, Notion
**Communication** — Twilio, SendGrid, Resend, ElevenLabs
**Maps & Weather** — Mapbox, OpenWeatherMap
**Media** — Unsplash, Pexels, Imgur, Giphy, Cloudinary, Stability AI
**Finance** — Alpha Vantage, Open Exchange Rates
**Knowledge** — NASA, Wolfram Alpha, YouTube Data, Hugging Face, DeepL
**Food** — Spoonacular

Configure a connector in Settings, and the AI automatically knows how to use it when building your apps.

<!-- SCREENSHOT: The Connectors section in Settings showing a few configured services -->

---

## Agents (Preview)

Integrate external AI agents into your apps. SynthOS supports two protocols:

- **A2A (Agent-to-Agent)** — standard HTTP-based agent communication with streaming support
- **OpenClaw** — WebSocket-based protocol with session management, chat history, and SSH tunnel support for secure remote agents

Your apps can send messages to agents, stream responses in real time, and maintain conversation history — all through `synthos.agents.*`.

<!-- SCREENSHOT: The Agents section in Settings showing a configured agent -->

---

## From User to Developer

SynthOS isn't just a tool — it's a bridge. You never need to look at the code, but the skills you build while using SynthOS are real programming skills:

1. **Break problems down** — you'll learn to describe what you want in smaller, concrete pieces
2. **Think in components** — headers, sidebars, buttons, data — you'll start seeing how apps are assembled
3. **Iterate and refine** — building through conversation teaches you the same feedback loop every developer uses
4. **Debug by describing** — when something isn't right, you'll get better at pinpointing what to change
5. **Build confidence** — every app you ship is proof that you can create real software

You don't have to become a programmer. But if you want to, SynthOS meets you where you are.

---

## Contributing

This is an open-source project. Contributions are welcome.

The repo includes a `SHARED-MEMORIES.md` that gives AI coding assistants (like Claude Code) full project context. If you're contributing with Claude Code:

1. Clone the repo
2. Ask Claude: *"Initialize my personal MEMORY.md file using SHARED-MEMORIES.md"*
3. Start building

---

## License

MIT

---

**Ready to build something?**

```bash
npm install --global synthos
synthos start
```
