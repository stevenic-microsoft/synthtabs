# SynthTabs — Dynamic Vibe-Coded Tab Apps for Microsoft Teams

SynthTabs brings the [SynthOS](https://github.com/Stevenic/synthos) AI-powered app builder into Microsoft Teams. Users describe what they want in plain English and the AI builds it — HTML, CSS, JavaScript — all running live as a Teams tab app.

## What Is It?

SynthTabs is a fork of SynthOS that uses the Customizer extensibility layer to integrate with Microsoft Teams. It lets users create fully functional tab applications through natural language conversation, right inside Teams.

- **Chat-driven development** — describe what you want, refine it conversationally
- **Runs as a Teams tab** — apps live inside Microsoft Teams
- **Powered by LLMs** — supports Anthropic, OpenAI, and Fireworks AI models
- **Built on SynthOS** — inherits the full feature set: templates, themes, connectors, storage API, and more

## Getting Started

```bash
npm install
npm run build
npm start
```

## Tech Stack

- TypeScript, Express, cheerio
- Anthropic / OpenAI / Fireworks AI SDKs
- Mocha + ts-mocha for tests

## License

MIT
