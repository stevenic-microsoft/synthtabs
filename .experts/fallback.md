# fallback

## purpose

Safety-net invoked when the routed experts don't fully cover the user's request. Runs a two-phase recovery to fill knowledge gaps.

## when to use

- The domain router's experts answered part of the question but left gaps.
- The root router picked a domain but the user's request spans multiple domains.
- The user explicitly says the answer is incomplete or asks for more detail.

## phase 1 — scan for missed experts

1. List every domain router: `languages/index.md`, `tools/index.md`, `.project/index.md`.
2. For each router, read its `## task clusters` section and compare every **When:** line against the current request.
3. Collect any expert files whose **When:** signals match but were **not** loaded in the initial routing pass.
4. Read those missed expert files and incorporate their guidance into the response.

### example

User asks: "Convert my YAML config to JSON and commit it with a proper message."

Initial route → `tools/index.md` → loaded `json-yaml.md`.

Phase 1 re-scan finds:
- `git.md` (signal: "commit … proper message")

Load the missed expert and merge its guidance on conventional commits with the JSON/YAML conversion advice.

## phase 2 — web search

After Phase 1, identify any remaining knowledge gaps that **no** expert file covers:

1. Formulate a targeted search query for each gap (SDK name + version + specific API/concept).
2. Execute web searches.
3. Synthesize the results into the response, citing sources.

### search tips

- Prefix queries with the tool/library name and version (e.g., `yq v4`, `git 2.43`).
- Prefer official docs (git-scm.com, yaml.org, language-specific documentation sites).
- If a search returns outdated results, add the current year to the query.

## constraints

- Do NOT fabricate API signatures. If a web search yields no answer, say so.
- Do NOT re-read expert files already loaded in the initial pass — only add missed ones.
- Keep Phase 1 fast: scan headings only, do not read full expert file bodies until you confirm a match.
