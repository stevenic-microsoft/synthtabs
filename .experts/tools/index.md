# tools-router

## purpose

Route developer-tooling requests to the correct expert. This domain covers **language-agnostic tools** — data formats, version control, and CLI utilities that developers use regardless of programming language.

## task clusters

### JSON / YAML — data format conversion, syntax, validation, tooling
When: JSON, YAML, yml, convert JSON, convert YAML, jq, yq, JSON Schema,
  yamllint, anchors, aliases, merge keys, block scalar, multiline string,
  YAML 1.2, Norway problem, schema validation, data serialization
→ Read `.experts/tools/json-yaml.md`

### Git — version control workflows, history, collaboration
When: git, commit, branch, rebase, merge, stash, cherry-pick, reflog,
  bisect, .gitignore, hooks, husky, pre-commit, LFS, worktree, submodule,
  conventional commits, interactive rebase, force push, commit message,
  git log, git diff, git reset, git switch, git restore, sign commits
→ Read `.experts/tools/git.md`

### Prompt Engineering — LLM prompt design, debugging, and optimization
When: prompt engineering, prompt design, write a prompt, fix my prompt,
  prompt not working, LLM prompt, system prompt, improve prompt,
  prompt template, RAG prompt, optimize prompt, prompt debugging,
  prompt architecture, token distance, prompt compression, prompt constraints
→ Read `.experts/tools/prompt-engineer.md`

## combining rule

If a request touches **multiple** clusters (e.g., "commit my YAML config changes with a conventional commit message"), load both experts. Let `git.md` lead on workflow and `json-yaml.md` lead on format questions.

## ambiguity fallback

If the request mentions tooling but doesn't clearly match either cluster, ask **one** clarifying question:

> "Are you asking about a data format (JSON/YAML) or a Git workflow?"

## cross-domain note

These experts are language-agnostic. If the request also involves language-specific concerns (e.g., "parse YAML in Python"), load the relevant language expert from `../languages/` for the programmatic side, and the tools expert here for format rules and CLI usage.

## file inventory

git.md | json-yaml.md | prompt-engineer.md
