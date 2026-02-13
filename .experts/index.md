# experts-router

## purpose

You are the **root task router**. Before doing any work, interview the developer to understand scope and preferences. Then classify intent and load exactly one domain router. Do NOT load micro-expert files directly from here.

## pre-task interview (mandatory)

**Every task starts here.** Before routing, loading experts, or writing any code, interview the developer. The depth scales with the task — a small bug fix may need one confirmation; a multi-file migration needs detailed scoping.

### How it works

1. **Assess complexity.** Read the developer's message. Determine if the task is small (single file, clear intent), medium (multi-file, some ambiguity), or large (architectural, multi-step, cross-cutting).
2. **Ask the right questions.** Use `AskUserQuestion` to walk through the applicable question blocks below. Skip any question the developer's message already answers unambiguously.
3. **Always offer the escape hatch.** Every question set MUST include a **"You decide everything"** (first question) or **"You decide everything else"** (subsequent questions) option. Selecting it means: use your best judgment for all remaining decisions, apply expert defaults, and proceed without further questions.
4. **Record and carry forward.** Store all answers. They shape routing, expert selection, and implementation decisions for the entire task.

### Question blocks

Pick from these based on complexity. You don't need all of them — use judgment.

#### Q1 — Scope & intent (always ask)
```
header: "Scope"
question: "Before I start, let me confirm what you need. Which best describes this task?"
options:
  - label: "You decide everything"
    description: "I trust your judgment — assess the task, make all decisions, and just do it."
  - label: "Quick fix / small change"
    description: "Single file or minor tweak. Just need it done."
  - label: "Feature / migration step"
    description: "Multi-file change with some decisions to make."
  - label: "Architectural / large task"
    description: "Significant scope — I want to review the approach before you start."
multiSelect: false
```

If the developer picks **"You decide everything"** → skip all remaining questions, proceed with expert defaults.

#### Q2 — Approach preferences (medium+ tasks)
```
header: "Approach"
question: "Any preferences on how I tackle this?"
options:
  - label: "You decide everything else"
    description: "No preferences — use best practices and expert defaults."
  - label: "Minimal changes"
    description: "Touch as few files as possible. Keep the diff small."
  - label: "Do it right"
    description: "Refactor if needed. Prioritize correctness and clean code."
  - label: "Let me review first"
    description: "Show me a plan before writing any code."
multiSelect: false
```

If **"Let me review first"** → enter plan mode (`EnterPlanMode`) before implementation.

#### Q3 — Specifics (large tasks or when ambiguity remains)
```
header: "Details"
question: "A few specifics to nail down:"
options:
  - label: "You decide everything else"
    description: "Use your best judgment for all remaining decisions."
  - label: "I'll answer each"
    description: "Walk me through the decisions one at a time."
multiSelect: false
```

If **"I'll answer each"** → proceed to any expert-level `## interview` sections after routing. If **"You decide everything else"** → fill expert interviews with defaults and skip them.

### Interaction with expert-level interviews

The pre-task interview gates the entire workflow. Expert-level `## interview` sections (described in the auto-interview protocol below) handle domain-specific decisions. If the developer chose "You decide everything" or "You decide everything else" at the pre-task level, those expert interviews are auto-filled with defaults and skipped.

## routing rules

Scan the user's message for signal words. Pick the **first matching domain**; if signals overlap, prefer the domain whose signals appear more often.

### Languages — idiomatic patterns and conventions for a programming language
Signals: idioms, idiomatic, conventions, best practices, canonical, code style,
  Pythonic, Rustacean, Gopher, language patterns, naming conventions,
  TypeScript idioms, Python style, Go patterns, Rust ownership, Java conventions,
  C# patterns, Ruby idioms, Swift protocols, Kotlin coroutines
→ Read `.experts/languages/index.md`

### Tools — developer tooling, data formats, version control
Signals: JSON, YAML, yml, convert JSON, convert YAML, jq, yq,
  schema validation, yamllint, git, commit, branch, rebase, merge,
  stash, cherry-pick, reflog, bisect, .gitignore, hooks, LFS,
  worktree, submodule, conventional commits, prompt engineering,
  prompt design, write a prompt, fix my prompt, LLM prompt,
  system prompt, RAG prompt, prompt template, prompt debugging
→ Read `.experts/tools/index.md`

### Project — SynthOS-specific systems, libraries, and workflows
Signals: page, pages, page lifecycle, page metadata, pageVersion, migration,
  locked, unlocked, page transformation, page cache, loadPageState, page.json,
  LLM, model, completePrompt, completion, chainOfThought, agentm, AI call,
  anthropic, openai, createCompletePrompt, AgentCompletion, generateImage,
  cheerio, DOM, data-node-id, node ID, assignNodeIds, stripNodeIds,
  CRUD operations, change list, applyChangeList, HTML injection, injectError,
  express, route, endpoint, API route, middleware, server, requiresSettings,
  usePageRoutes, useApiRoutes, useDataRoutes, SynthOSConfig,
  theme, themes, CSS custom properties, light mode, dark mode, ThemeInfo,
  loadTheme, nebula-dusk, nebula-dawn, viewer-panel,
  test, tests, mocha, ts-mocha, nyc, coverage, spec, npm test,
  prompt template, system prompt, system message, goal, serverAPIs, theme block,
  repair prompt, migration prompt, brainstorm prompt, getModelInstructions,
  CURRENT_PAGE, SERVER_APIS, SERVER_SCRIPTS, repairGoal, parseChangeList
→ Read `.experts/.project/index.md`

## auto-interview protocol (expert-level)

After loading any expert, check for a `## interview` section. If one exists **and the developer did NOT choose "You decide everything" / "You decide everything else" in the pre-task interview**, execute the expert interview before writing any code or giving implementation advice.

If the developer DID choose an escape hatch in the pre-task interview, auto-fill all expert interview answers with the expert's documented defaults and skip the questions.

### How it works

1. **Check pre-task answers.** If the developer already opted out of detailed questions, skip to implementation using defaults.
2. **Detect.** After reading an expert file, scan for `## interview`. If missing, proceed directly to implementation.
3. **Execute.** Walk through each question block (`### Q1`, `### Q2`, ...) in order. Use `AskUserQuestion` for each one, following the `header`, `question`, `options`, and `multiSelect` fields exactly as specified.
4. **Record.** Store the developer's answers. Pass them into the expert's rules and patterns as context — the answers shape which code paths, patterns, and configurations apply.
5. **Escape hatch.** Every expert interview MUST include a "You decide everything else" option. Selecting it fills all remaining answers with the expert's documented defaults and skips remaining questions.
6. **Context-skip.** If the developer's original message already answers an interview question unambiguously (e.g., "use Azure OpenAI" when the question is "OpenAI or Azure OpenAI?"), skip that question — don't re-ask what's already known.

### Experts with embedded interviews

Some experts have the interview woven into their phased workflow rather than in a separate `## interview` section. These already satisfy the protocol — their phased decision walkthrough IS the interview.

## ambiguity tiebreaker

If the request is about **writing in** a language (idioms, patterns, best practices, pitfalls), route to **languages/**.

If the request mixes **tools** signals with **languages** signals (e.g., "parse YAML in Python"), route to **tools/** for format/workflow rules and also load the relevant language expert for programmatic implementation.

## fallback

If no domain matches, ask **one** clarifying question:
> "What kind of help do you need? A programming language question, a developer tool question, or something else?"

If the routed experts don't fully cover the request (gaps remain after the initial pass), read `.experts/fallback.md` for a two-phase recovery: re-scan all domain routers for missed experts, then web-search for any remaining gaps.

## expert evolution

The expert system is **self-evolving**. As conversations reveal knowledge gaps, outdated patterns, or new topic areas, update the system in-place. Follow the rules below.

### Naming conventions

| Convention | Meaning |
|---|---|
| `topic-ts.md` | Normal expert — can be created, updated, or replaced |
| `topic-ts.locked.md` | **Locked** — read-only, do NOT edit. Rename to remove `.locked` only with explicit user approval |
| `_filename.md` | System/template file — not a routable expert |
| `index.md` | Domain router — update when adding/removing experts in that domain |

To lock an expert: rename `topic-ts.md` → `topic-ts.locked.md`. The routing system treats `.locked.md` identically for reads — only writes are blocked.

### When to UPDATE an existing expert

Update an expert when **any** of these are true during a conversation:
1. **Corrected mistake** — you discover a rule, code pattern, or pitfall is wrong and fix it in practice. Backport the correction to the expert.
2. **New pattern emerged** — you write a working pattern that isn't covered by any existing expert. Add it to the most relevant expert's `## patterns` section.
3. **SDK/API changed** — the user provides or you discover updated API signatures, new options, or deprecated features. Update the affected rules and patterns.
4. **Missing pitfall** — you hit a gotcha during implementation that the expert didn't warn about. Add it to `## pitfalls`.
5. **Cross-reference gap** — an expert should reference another but doesn't. Add a `Pair with` entry to `## instructions` and update the domain `index.md` cluster.

**Do NOT update locked experts** (`*.locked.md`). If a locked expert needs changes, flag it to the user.

### When to CREATE a new expert

Create a new expert when **all** of these are true:
1. **No existing expert covers the topic** — the knowledge doesn't fit as an addition to any current file.
2. **The topic is reusable** — it will apply to future tasks, not just the current one-off request.
3. **Sufficient depth** — the topic warrants 8+ rules and 2+ code patterns. If it's only 2-3 rules, add them to an existing expert instead.

**Creation steps:** Follow the workflow in `.experts/builder.md` — it covers scoping, research, drafting, validation, and routing integration in a single guided process.

### When to CREATE a new domain folder

Create a new domain (folder + `index.md` router) when **all** of these are true:
1. **3+ experts** would belong to the new domain — a domain with 1-2 experts should stay as a cluster within an existing domain.
2. **Distinct signal words** — the domain's topics wouldn't naturally route through any existing domain's signals.
3. **Separable routing** — moving these experts out of an existing domain simplifies that domain's router, not complicates it.

**Creation steps:**
1. Create the folder: `.experts/{domain-name}/`.
2. Create `.experts/{domain-name}/index.md` following the router pattern from any existing domain index (purpose, task clusters with `When:`/`Read:`, combining rule, file inventory).
3. Move or create the expert files in the new folder.
4. Add a new routing entry to this root `index.md` under `## routing rules` with `Signals:` and a `→ Read` directive.
5. Remove any moved experts from their old domain's `index.md`.

## utilities

These files support the expert system itself — not a specific domain.

### Builder — create a new micro-expert
→ Read `.experts/builder.md`
Signals: create expert, new expert, build expert, add expert, make expert, write expert, expert template, research expert
Full lifecycle for creating a new micro-expert: scoping, research, drafting, validation, and routing integration. Preferred over the legacy template + researcher workflow.

### Fallback recovery
→ Read `.experts/fallback.md`
When the initial routing pass leaves knowledge gaps.

### Update Experts — sync index files with actual expert files on disk
→ Read `.experts/update-experts.md`
Signals: update experts, sync indexes, update index, refresh routing,
  fix index files, new experts not routed, clean up indexes, reconcile experts
Scans the `.experts/` directory tree, detects added/removed expert files, and updates every `index.md` to match. Run after bulk expert creation or deletion.

### Analyzer — assess project and recommend experts
→ Read `.experts/analyzer.md`
Signals: explore the codebase, recommend experts, analyze project,
  audit experts, expert coverage, gap analysis, scan my project
