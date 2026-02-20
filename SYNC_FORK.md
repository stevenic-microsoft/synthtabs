# Syncing SynthTabs with Upstream SynthOS

## Upstream Remote

```
upstream = ../synthos   (local path)
```

If the git remote `upstream` is not configured yet, add it:

```bash
git remote add upstream ../synthos
```

## Sync Procedure

1. **Fetch upstream changes**
   ```bash
   git fetch upstream main
   ```

2. **Create a sync branch**
   ```bash
   git checkout -b sync/upstream-YYYY-MM-DD
   ```

3. **Merge upstream into sync branch**
   ```bash
   git merge upstream/main --no-commit
   ```

4. **Apply conflict-resolution rules** (see below), then commit and PR.

---

## Conflict-Resolution Rules

### ALWAYS KEEP OURS (never accept upstream)

| File / Pattern | Reason |
|----------------|--------|
| `README.md` | SynthTabs has its own README |
| `package.json` — `name` | Must stay `"synthtabs"` |
| `package.json` — `version` | We maintain our own version |
| `package.json` — `description` | Teams-specific description |
| `package.json` — `keywords` | Teams-specific keywords |
| `package.json` — `bugs` | Points to our repo |
| `package.json` — `repository` | Points to our repo |
| `package.json` — `bin` | Must stay `"./bin/synthtabs.js"` (our CLI) |
| `package.json` — `files` | Includes `teams-*` folders and `teams-tests` |
| `package.json` — `scripts.start` | Must use our CLI entry point |
| `package.json` — `scripts.test:mocha` | Must include both `tests/**/*.spec.ts` and `teams-tests/**/*.spec.ts` |
| `SHARED-MEMORIES.md` | We may have our own project context |
| `.github/` | Our own CI/CD config |
| `.claude/` | Our own Claude Code settings |
| `.experts/` | Our own expert knowledge base |

### ALWAYS ACCEPT UPSTREAM

| File / Pattern | Reason |
|----------------|--------|
| `src/**/*.ts` | Core logic — we extend via Customizer, not by editing source |
| `required-pages/` | System pages come from upstream |
| `default-pages/` | Starter templates come from upstream |
| `default-scripts/` | OS script templates come from upstream |
| `default-themes/` | Base themes come from upstream |
| `page-scripts/` | Versioned page scripts come from upstream |
| `service-connectors/` | Base connector definitions come from upstream |
| `migration-rules/` | Page migration rules come from upstream |
| `tests/` | Upstream test coverage — run alongside our `teams-tests/` |

### MERGE CAREFULLY (manual review required)

| File / Pattern | How to merge |
|----------------|-------------|
| `package.json` — `dependencies` | Accept new/updated deps from upstream. Keep any Teams-specific deps we added. |
| `package.json` — `devDependencies` | Same — accept upstream updates, keep our additions. |
| `package.json` — `scripts` (non-start) | Accept upstream changes to `build`, `test`, etc. Keep our custom scripts. |
| `tsconfig.json` | Accept upstream compiler changes. Keep any overrides we need. |
| `bin/` | Upstream may update `synthos.js`. Our `synthtabs.js` wrapper is separate — keep both. |
| `src/synthos-cli.ts` → `src/synthtabs-cli.ts` | When upstream changes `synthos-cli.ts`, manually migrate those changes into `synthtabs-cli.ts`. Our CLI mirrors upstream but uses our branding (`synthtabs` script name, `SynthTabs` messaging) and passes our `customizer` instance. |

### NEVER TOUCH (ours only, upstream doesn't have these)

| File / Pattern | Reason |
|----------------|--------|
| `teams-default-pages/` | Teams-specific content |
| `teams-default-scripts/` | Teams-specific content |
| `teams-default-themes/` | Teams-specific content |
| `teams-page-scripts/` | Teams-specific content |
| `teams-required-pages/` | Teams-specific content |
| `teams-service-connectors/` | Teams-specific content |
| `teams-tests/` | Our own unit and integration tests |
| `.architecture/` | Our architecture docs |
| `SYNC_FORK.md` | This file |

---

## Post-Merge Checklist

- [ ] `package.json` — name is still `"synthtabs"`, version is ours, bin points to our CLI
- [ ] `npm install` succeeds (new upstream deps are picked up)
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (runs both upstream `tests/` and our `teams-tests/`)
- [ ] Our `teams-*` folders are untouched
- [ ] `README.md` is still our Teams-specific readme
- [ ] No upstream-only files leaked into our `files` list that shouldn't be there

---

## Quick Reference: Manual package.json Merge

When `package.json` conflicts, use this approach:

1. Accept the upstream version first
2. Restore our overrides:
   - `name`: `"synthtabs"`
   - `version`: our current version
   - `description`: `"Dynamic vibe coded Tab Apps for Microsoft Teams."`
   - `bin`: `"./bin/synthtabs.js"`
   - `bugs.url`: our GitHub issues URL
   - `repository.url`: our GitHub repo URL
   - `keywords`: include `"teams"`
   - `files`: include `teams-*` folders and `teams-tests`
   - `scripts.start`: `"node ./bin/synthtabs.js start"`
   - `scripts.test:mocha`: `"nyc ts-mocha tests/**/*.spec.ts teams-tests/**/*.spec.ts"`
3. Add back any Teams-specific dependencies we have
