# git

## purpose

Git workflows — commit conventions, branching strategies, history manipulation, collaboration patterns, and tooling integration.

## rules

1. **Write conventional commits.** Follow the Conventional Commits spec: `type(scope): description`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. This enables automated changelogs, semantic versioning, and clear history.
2. **Make atomic commits.** Each commit should represent one logical change that compiles and passes tests independently. If you need "and" to describe the commit, split it. Atomic commits make `bisect`, `revert`, and `cherry-pick` reliable.
3. **Prefer rebase for local cleanup, merge for shared integration.** Use interactive rebase (`git rebase -i`) to clean up local commits before pushing. Use merge commits (or merge --no-ff) when integrating shared branches to preserve the integration point in history.
4. **Never force-push shared branches.** `git push --force` rewrites remote history and breaks collaborators' work. If you must rewrite a shared branch, use `--force-with-lease` to prevent overwriting others' pushes. Never force-push `main`/`master`.
5. **Stage intentionally with `git add -p`.** Use patch mode to review and stage individual hunks. This catches debug statements, unrelated changes, and accidental whitespace modifications before they enter a commit.
6. **Stash with messages.** Always use `git stash push -m "description"` instead of bare `git stash`. Unnamed stashes become unidentifiable within hours. Use `git stash list` to review and `git stash pop` or `git stash apply` to restore.
7. **Treat reflog as your safety net.** `git reflog` records every HEAD movement for 90 days. After a bad rebase, reset, or amend, find the pre-operation commit in reflog and `git reset --hard` to it. Reflog is local-only — it doesn't survive `git clone`.
8. **Use `git bisect` for bug hunting.** When a bug exists now but didn't before, use `git bisect start`, mark good/bad commits, and let Git binary-search the history. Automate with `git bisect run <test-script>` for hands-free identification.
9. **Set up `.gitignore` before the first commit.** Ignoring files after they're tracked requires `git rm --cached`. Start every repo with a comprehensive `.gitignore` from gitignore.io or GitHub's templates. Add project-specific entries immediately.
10. **Use hooks for automated quality gates.** Install pre-commit hooks via `husky` (Node.js) or `pre-commit` (Python) to run linters, formatters, and type checks before every commit. Use `commit-msg` hooks to enforce conventional commit format.
11. **Sign commits in team projects.** Use `git commit -S` with GPG or SSH keys. Configure globally: `git config --global commit.gpgsign true`. This verifies authorship and is required by many open-source projects and enterprise policies.
12. **Use Git LFS for large binaries.** Track binary files (images, models, compiled assets) with `git lfs track "*.psd"`. LFS stores pointers in the repo and actual files on a remote server, keeping clone times fast.
13. **Prefer worktrees over multiple clones.** `git worktree add ../feature-branch feature-branch` creates a separate working directory sharing the same `.git` store. This avoids stashing when switching contexts and saves disk space compared to full clones.
14. **Use submodules sparingly and pin to commits.** Submodules add complexity to clone, pull, and CI workflows. If you use them, always pin to a specific commit (not a branch) and document initialization steps in the README. Consider alternatives: monorepo, package manager, or git subtree.

## patterns

### Interactive rebase to clean up local history

```bash
# Squash last 4 commits into clean, logical units
git rebase -i HEAD~4

# In the editor — mark commits to squash/fixup/reword:
# pick   abc1234 feat(auth): add login endpoint
# squash def5678 fix typo
# squash ghi9012 add missing test
# reword jkl3456 wip cleanup

# After rebase, force-push your feature branch (not shared)
git push --force-with-lease origin feature/auth
```

### Stash, switch, apply workflow

```bash
# Save current work with a descriptive message
git stash push -m "half-done: user profile validation"

# Switch to another branch for a quick fix
git switch bugfix/login-error

# Do the fix, commit, switch back
git commit -am "fix(auth): handle expired token gracefully"
git switch feature/user-profile

# Restore stashed work
git stash pop
# If conflicts: resolve them, then `git stash drop` to clean up
```

### Cherry-pick with conflict resolution

```bash
# Grab a specific commit from another branch
git cherry-pick abc1234

# If conflicts occur:
# 1. Resolve conflicts in affected files
# 2. Stage resolved files
git add resolved-file.ts
# 3. Continue the cherry-pick
git cherry-pick --continue

# To abort and undo the cherry-pick
git cherry-pick --abort
```

### Automated bisect with a test script

```bash
# Start bisect
git bisect start
git bisect bad HEAD              # current commit is broken
git bisect good v2.1.0           # this tag was working

# Automate: script exits 0 for good, 1 for bad
git bisect run npm test

# When done, bisect identifies the first bad commit
# Reset when finished
git bisect reset
```

### Conventional commit examples

```bash
# Feature with scope
git commit -m "feat(api): add pagination to /users endpoint"

# Bug fix
git commit -m "fix(auth): prevent token refresh race condition"

# Breaking change (footer notation)
git commit -m "feat(config): migrate to YAML-based configuration

BREAKING CHANGE: JSON config files are no longer supported.
Run 'npm run migrate-config' to convert."

# Docs
git commit -m "docs(readme): add deployment instructions for AWS"

# Chore with no production impact
git commit -m "chore(deps): bump eslint from 8.50 to 9.0"
```

## pitfalls

- **`git pull` creates unnecessary merge commits.** By default, `git pull` does a fetch + merge, creating merge commits on fast-forwardable branches. Use `git pull --rebase` (or configure `git config --global pull.rebase true`) to keep linear history. Even better: `git fetch` then `git rebase origin/main`.
- **`git commit --amend` after push rewrites shared history.** Amending a commit that's already pushed requires a force-push. If anyone else has pulled the original commit, their history diverges. Only amend local, unpushed commits.
- **`.gitignore` doesn't untrack already-tracked files.** Adding a pattern to `.gitignore` only affects future `git add` operations. To stop tracking an existing file: `git rm --cached <file>`, commit the removal, then add the pattern to `.gitignore`.
- **Rebasing shared/public commits causes chaos.** Never rebase commits that exist on a remote branch others are working on. Rebase rewrites commit hashes — other developers' branches will diverge and require manual reconciliation.
- **`git stash pop` with conflicts doesn't drop the stash.** If `git stash pop` encounters merge conflicts, the stash remains in the stash list (unlike a clean pop). After resolving conflicts, manually run `git stash drop` to remove it.
- **`git checkout` is overloaded — use `switch` and `restore`.** `git checkout` does three different things: switch branches, restore files, and create branches. Since Git 2.23, use `git switch` for branches and `git restore` for files. The intent is clearer and the commands are harder to misuse.
- **Forgetting `--force-with-lease` on force pushes.** Bare `--force` overwrites the remote regardless of others' pushes. `--force-with-lease` fails if the remote has commits you haven't seen, preventing data loss. Always use `--force-with-lease` when force-pushing.
- **Large files in history are permanent without rewriting.** Once a large binary is committed, it lives in `.git/` forever — even after deletion. Removing it requires `git filter-repo` or BFG Repo Cleaner, which rewrite history. Use LFS or `.gitignore` from the start.

## references

- Pro Git book (free): https://git-scm.com/book/en/v2
- Conventional Commits spec: https://www.conventionalcommits.org/
- git-scm.com reference: https://git-scm.com/docs
- gitignore.io: https://www.toptal.com/developers/gitignore
- Git LFS: https://git-lfs.com/
- husky (Git hooks): https://typicode.github.io/husky/
- pre-commit framework: https://pre-commit.com/
- git-filter-repo: https://github.com/newren/git-filter-repo

## instructions

Use this expert for any question about Git workflows, commit conventions, branching strategies, history manipulation, or collaboration patterns.

**Trigger phrases:** "git commit," "rebase," "merge conflict," "branching strategy," "conventional commits," "git stash," "bisect," "gitignore," "force push," "cherry-pick," "git hooks."

This expert is language-agnostic. Pair with: any language expert from `../languages/` for project-specific hooks, CI integration, or language-specific Git workflows (e.g., Go module versioning, Rust's `cargo` + Git tags).

## research

Deep Research prompt:

"Write a micro-expert for Git workflows and best practices. Cover: conventional commit format (types, scopes, breaking changes, automated changelogs), atomic commit principles, branching strategies (rebase vs merge, feature branches, trunk-based), interactive rebase for history cleanup, stash workflows, cherry-pick with conflict resolution, git bisect (manual and automated), .gitignore patterns and untracking, pre-commit hooks (husky, pre-commit framework), commit signing (GPG/SSH), Git LFS for large binaries, worktrees for parallel development, submodule management, reflog as safety net, and common pitfalls (pull merge commits, amend after push, checkout overload, force-push dangers). Include CLI examples for each workflow."
