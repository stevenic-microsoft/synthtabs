# SynthOS: An AI Powered Interactive Shell Experience

[SynthOS](https://github.com/Stevenic/synthos) is an interactive shell experience powered by generative AI, featuring a user interface that is entirely AI-generated. Similar to a wiki, it organizes everything into pages, but with a twist: these pages are self-modifying and can transform into anything. Each page includes a chat panel and a content viewer. Entering a command into the chat panel prompts the configured Large Language Model (LLM) to completely rewrite the current page. The page can morph into anything—from providing answers to questions to becoming a tool that assists you with complex tasks. It supports the latest language models like Claude-Opus-4.5 and GPT-5.2.

SynthOS has access to tools in the form of APIs and scripts. Built-in APIs enable SynthOS to read and write objects to local storage or make additional generative AI calls. Scripts are user-defined extensions that allow SynthOS to perform local actions on your machine. You can add scripts that let SynthOS start a build, make a Git commit, or run a cURL command.

> Version 0.4.0 is coming... Create complex presentations in less then 2 minutes. [Star Trek Computer Deck](https://tinyurl.com/StarTrekComputer)  

You can create anything you want from animations:

<img width="1901" height="988" alt="image" src="https://github.com/user-attachments/assets/8da6dedd-e568-48d3-b2ac-106a8ab50117" />

To games:

<img width="1888" height="979" alt="image" src="https://github.com/user-attachments/assets/496b0be0-39f5-4bbf-9a40-2d6877f8a6cc" />

To developer tools:

<img width="1891" height="987" alt="image" src="https://github.com/user-attachments/assets/951053f0-f025-45d3-8799-7bcd33942b80" />

SynthOS is like a wiki for apps. You can save the apps you create to your pages directory;

<img width="1888" height="976" alt="image" src="https://github.com/user-attachments/assets/5c727cf5-30de-4d08-80ee-54eed7b64d20" />

## Installing SynthOS

To get started using SynthOS you'll need to first install a recent version of [Node.js](https://nodejs.org/en/download/package-manager/current). I use version `22.20.0` but any version >20 should work. 

Open a terminal window and run the following commands:

```bash
npm install --global synthos
synthos start
```

This will install the CLI and start the SynthOS server running. This terminal window needs to stay open to keep the server running.  You should see a message saying `SynthOS's server is running on http://localhost:4242`.  You can open your browser to that link and you should land on the `settings` page.

## Configuring Your Model

When the server first runs it's going to show you a settings dialog. You'll need to pick the model you;d like to use and configure it with a developer key. 

<img width="1885" height="975" alt="image" src="https://github.com/user-attachments/assets/34c662c2-3ea5-421d-bad2-4c98d13c72f3" />

For Opus (recomended) you'll want to sign up for a developer account at [Anthropics Developer Platform](https://platform.claude.com/login) You can then generate an API key [here](https://platform.claude.com/settings/keys). For GPT-5.2 you can sign up for an [OpenAI Developer account](https://auth.openai.com/create-account) and then generate an API key [here](https://platform.openai.com/api-keys)

## Using SynthOS

Once you've configured your model you will be then sent to the home page. You can then specify any thing you want to create and it will be rendered to the display port.

<img width="1882" height="980" alt="image" src="https://github.com/user-attachments/assets/57cb01c7-f060-4dfc-8100-de85d850b104" />

You can make as many changes as you want to the app and you have controlls above the chat box that let you save the app to the pages gallery, reset the view port, or navigate to the pages gallery:

<img width="542" height="155" alt="image" src="https://github.com/user-attachments/assets/34acf4a0-4dde-4a0f-b766-e5aec46a6496" />

Each saved page is as stand alone HTML page that can be found in a `.synthos` folder in the directory where you started the server, There are system pages which can't be deleted but you can save changes to them and SynthOS will use those over the defaults. If you wish to delete a page/app just delete it from your `.synthos` folder:

<img width="825" height="589" alt="image" src="https://github.com/user-attachments/assets/2e7c8432-24d2-4f49-a608-3207bf1c1cda" />

## Application Templates

There are a set of pre-built application templates that give you a good starting point.

The `[application]` template is great for creating tools:

<img width="1891" height="984" alt="image" src="https://github.com/user-attachments/assets/6216c1fc-e1f8-4db8-86d3-d6041cbbf841" />

The `[markdown]` template has a rich built-in markdown viewer:

<img width="1887" height="979" alt="image" src="https://github.com/user-attachments/assets/99828cac-bb95-4de5-85c6-d164b37c8505" />

The `[sidebar]` template allows for rich content that's not markdown based:

<img width="1876" height="976" alt="image" src="https://github.com/user-attachments/assets/0a9ae38b-354f-4709-b92a-b466458aa3ba" />

The `[split-application]` template has two panes with a movable splitter:

<img width="1882" height="975" alt="image" src="https://github.com/user-attachments/assets/770b17c5-e9c3-44d4-8015-5cf401efba26" />

## API Explorer

One of the more powerful capabilities of SynthOS is that it has built in APIs for things like storage that you're apps can use to persist data. You can use the API Explorer to test the API's out:

<img width="1882" height="973" alt="image" src="https://github.com/user-attachments/assets/6a1e2823-7313-429c-9b28-79c5687fdef7" />

## Script Editor

You can also create custom scripts that your apps can invoke vi a scripts API:

<img width="1889" height="982" alt="image" src="https://github.com/user-attachments/assets/8047d3c3-e5d3-4be8-b403-88169610b3b2" />

## Contributing with Claude Code

This repo includes a `SHARED-MEMORIES.md` file that gives Claude Code project-level context (architecture, APIs, folder structure). When you first clone the repo and start working with Claude Code, ask it:

> "Initialize my personal MEMORY.md file using SHARED-MEMORIES.md"

Claude will create a personal `MEMORY.md` inside `~/.claude/projects/` with the shared knowledge as a starting point.

You can then personalize it by telling Claude:
- What OS you're on
- Where your checkout lives on disk
- Your editor and path conventions (e.g. VS Code with forward-slash paths)

These personal details stay in your `MEMORY.md` and are never checked in.

Here's an example of what a developer's `MEMORY.md` might look like:

```markdown
# Synthos — Developer-Specific Memory

Shared project knowledge (architecture, APIs, folder structure, etc.) lives in
`SHARED-MEMORIES.md` at the project root. This file holds per-developer context only.

## Session Start
- **Always** read `SHARED-MEMORIES.md` from the project root at the start of every new coding session to load project-level context.

## Environment
- **Windows** machine
- When opening files in VS Code, use `code "C:/source/synthos/<path>"` (quoted, forward slashes)
- **Auto-run VS Code launches** — when opening files in VS Code via `code`, run the Bash command without asking for permission
```

> **Note:** The `## Environment` section is entirely developer-specific. Your entries will differ based on your OS, editor, file paths, and workflow preferences. This is the right place to capture anything unique to your local setup.
