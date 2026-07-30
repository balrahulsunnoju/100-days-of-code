---
mode: agent
description: "Switch workspace between different issues or between EM and ADE roles."
---

# /tdgs-aidlc-switch

Switch the workspace to a different issue — or switch roles (EM ↔ ADE) on the same issue — by checking out the appropriate branches in all repositories. Ensures no uncommitted work is lost before switching.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

---

## Inputs

| Input | Source | Required |
|-------|--------|----------|
| Issue ID | User-provided (e.g., `123` or `#123`) | Yes |
| Role | User-provided: `em` or `ade` | No (auto-detect if omitted) |
| Spec Path | User-provided: relative path to story spec (e.g., `implementation-artifacts/1-3-request-dtos.md`) | No (only with `ade` role) |
| Username | `gh api user --jq '.login'` or `git config user.name` | Auto |
| Worker Repos | `.github/i2a-config.yml` → `worker_repos` + `common_repos` | Yes |

## Syntax

```
/tdgs-aidlc-switch {issue_id}
/tdgs-aidlc-switch {issue_id} {role}
/tdgs-aidlc-switch {issue_id} ade {spec_path}
```

Where `{role}` is one of:
- **`em`** — Switch to EM (planning) context: checks out `planning/*` branch in docs repo, leaves worker repos on master/current
- **`ade`** — Switch to ADE (implementation) context: checks out `dev/*` branch in docs repo + worker repos

Where `{spec_path}` is an optional story spec path (only valid with `ade` role) used to resolve the correct dev branch without interactive selection. The epic/story numbers are extracted from the filename (e.g., `1-3-request-dtos.md` → `dev/ghi-{id}-1-3-*`).

When `{role}` is omitted, the command auto-detects the target branch using priority logic (dev → project → planning → integration).

## Examples

```
/tdgs-aidlc-switch 10              # Switch to issue 10 (auto-detect role)
/tdgs-aidlc-switch #42 em          # Switch to issue 42 as EM (planning branch)
/tdgs-aidlc-switch #42 ade         # Switch to issue 42 as ADE (dev branches)
/tdgs-aidlc-switch 10 ade implementation-artifacts/1-3-request-dtos.md
                                    # Switch to specific story branch
```

---

## Execution Steps

### 1. Discover Repositories

Read `.github/i2a-config.yml` and extract all repository keys from both `worker_repos` and `common_repos` sections. These keys correspond to directory names in the workspace root (some may be symlinked directories for common/shared repos — always follow symlinks). Identify:
- The **docs repository** (contains `knowledge-base/` or `.github/i2a-config.yml`)
- All **worker repositories** listed in `.github/i2a-config.yml` → `worker_repos` and `common_repos` (merge both sections)

### 2. Clean Working Tree Check (CRITICAL)

For **every** git repository in the workspace, run `git status --short`.

**If ANY repository has uncommitted changes → BAIL immediately:**

```
⛔ Cannot switch — uncommitted changes detected

The following repositories have uncommitted work:

  ⚠️  {repo_name} ({branch})
      {list of changed files}

  ⚠️  {repo_name} ({branch})
      {list of changed files}

Please commit all changes first:
  /tdgs-aidlc-commit

Then retry:
  /tdgs-aidlc-switch {issue_id} {role}
```

STOP execution — do NOT switch any branches.

### 3. Resolve Target Issue Branches

Parse the target issue ID (strip `#` if present).

Get the user's GitHub username:
- Run `gh api user --jq '.login'`
- Fallback: `git config user.name` (lowercase, replace spaces with hyphens)

#### 3a. Find Docs Repo Branch

In the docs repository, fetch and scan remote branches for the target issue:

```powershell
# PowerShell (Windows)
cd {docs_repo_path}
git fetch origin
git branch -r | Select-String "origin/(dev|feature|hotfix|project|planning)/ghi-{issue_id}-"
```

```bash
# bash (macOS / Linux)
cd {docs_repo_path}
git fetch origin
git branch -r | grep -E "origin/(dev|feature|hotfix|project|planning)/ghi-{issue_id}-"
```

**Branch resolution depends on `{role}` parameter:**

##### When `role` = `em`

Target the **planning branch** in docs repo:
1. If a `planning/ghi-{issue_id}-*` branch exists → use it
2. If no planning branch but `project/ghi-{issue_id}-*` exists → use the project branch (planning already merged)
3. If only `feature/ghi-{issue_id}-*` or `hotfix/ghi-{issue_id}-*` exists → BAIL: "No planning branch — M&O issues don't have an EM planning phase. Use `/tdgs-aidlc-switch {issue_id}` without a role."

Worker repos: **do NOT switch** — EM work happens only in the docs repo. Leave worker repos on their current branch.

##### When `role` = `ade`

Target the **dev branch** in docs + worker repos:
1. If a `dev/ghi-{issue_id}-*-{username}` branch exists in docs repo → use it (M&O workflow)
2. If no dev branch but `project/ghi-{issue_id}-*` exists → use the project branch in docs (project workflow — docs stays on project branch while ADE uses dev branches in worker repos)
3. If only `feature/ghi-{issue_id}-*` or `hotfix/ghi-{issue_id}-*` exists but no dev branch → BAIL: "No dev branch found — run `/tdgs-aidlc-prepare-repos` first to create dev branches."

Worker repos: **switch to dev branches** (see Step 3b).

##### When `role` is omitted (auto-detect)

Use the existing priority logic:
1. If a `dev/ghi-{issue_id}-*-{username}` branch exists → use it (M&O workflow, ADE context)
2. If a `project/ghi-{issue_id}-*` branch exists → use it (project workflow — docs stays on project branch)
3. If a `planning/ghi-{issue_id}-*` branch exists (and no project branch) → use it (EM still in planning phase)
4. If a `feature/ghi-{issue_id}-*` or `hotfix/ghi-{issue_id}-*` branch exists but no dev branch → the ADE hasn't started work on this issue yet

Worker repos: switch to dev branches if they exist (same as ADE behavior).

##### Multiple dev branch matches (same issue + same user)

When **more than one** remote branch matches `dev/ghi-{issue_id}-*-{username}`:

1. Do **not** pick a branch arbitrarily.
2. Present a numbered list: branch name, slug segment, and last commit date (`git log -1 --format=%ci origin/{branch}`).
3. Ask the user to select before any `git checkout`.
4. If the user declines to choose → **BAIL**: `❌ Multiple dev branches match issue #{issue_id}. Specify which branch to use.`

**If no branches found for the target issue → BAIL:**
```
❌ No branches found for issue #{issue_id}

No remote branches matching *ghi-{issue_id}-* were found in the docs repository.

To start work on a new issue, use:
  /tdgs-aidlc-initiate-issue {issue_id} {type}

Exiting...
```

#### 3b. Find Worker Repo Branches (ADE and auto-detect only)

**Skip this step entirely when `role` = `em`.**

For each worker repository:

```powershell
# PowerShell (Windows)
cd {worker_repo_path}
git fetch origin
git branch -r | Select-String "origin/dev/ghi-{issue_id}-.*-{username}"
```

```bash
# bash (macOS / Linux)
cd {worker_repo_path}
git fetch origin
git branch -r | grep "origin/dev/ghi-{issue_id}-.*-{username}"
```

Collect all matching dev branches for this user + issue across worker repos.

### 4. Display Switch Plan

Present what will happen before executing:

#### When switching as EM:

```
══════════════════════════════════════════════════════════════
SWITCH: Issue #{issue_id} — Role: EM (Planning)
══════════════════════════════════════════════════════════════

Current State:
  Docs repo:    {current_docs_branch}

Target State:
  Docs repo:    {target_planning_branch}
  Worker repos: unchanged (EM work is docs-only)

══════════════════════════════════════════════════════════════
```

#### When switching as ADE:

```
══════════════════════════════════════════════════════════════
SWITCH: Issue #{issue_id} — Role: ADE (Implementation)
══════════════════════════════════════════════════════════════

Current State:
  Docs repo:    {current_docs_branch}
  Worker repos: {current_worker_branch} (summarized)

Target State:
  Docs repo:    {target_docs_branch}
  Worker repos:
    ☐ {repo_name} → {target_dev_branch}
    ☐ {repo_name} → {target_dev_branch}
    ☐ {repo_name} — no dev branch (will stay on current branch)
    ...

══════════════════════════════════════════════════════════════
```

#### When auto-detect (no role specified):

```
══════════════════════════════════════════════════════════════
SWITCH: Issue #{issue_id}
══════════════════════════════════════════════════════════════

Current State:
  Docs repo:    {current_docs_branch}
  Worker repos: {current_worker_branch} (summarized)

Target State:
  Docs repo:    {target_docs_branch}
  Worker repos:
    ☐ {repo_name} → {target_dev_branch}
    ☐ {repo_name} → {target_dev_branch}
    ☐ {repo_name} — no dev branch (will stay on current branch)
    ...

══════════════════════════════════════════════════════════════
```

**STOP and confirm** with user before switching.

### 5. Execute Branch Switch

#### 5a. Switch Docs Repo

```bash
cd {docs_repo_path}
git checkout {target_docs_branch}
git pull origin {target_docs_branch}
```

#### 5b. Switch Worker Repos (ADE and auto-detect only)

**Skip this step when `role` = `em`.**

For each worker repo that has a dev branch for this issue + user:

```bash
cd {worker_repo_path}
git checkout {target_dev_branch}
git pull origin {target_dev_branch}
```

For worker repos **without** a dev branch for this issue: leave them on their current branch (do not switch). Note this in the output.

### 6. Output

#### EM role output:

```
══════════════════════════════════════════════════════════════
SWITCH COMPLETE — Issue #{issue_id} (EM / Planning)
══════════════════════════════════════════════════════════════

  ✓ {docs_repo_name} → {target_planning_branch}
  ○ Worker repos unchanged (EM context)

Ready for planning work on issue #{issue_id}.
Prompts available: /bmad-create-prd, /bmad-create-architecture,
                   /bmad-create-epics-and-stories, /bmad-create-story

══════════════════════════════════════════════════════════════
```

#### ADE role output:

```
══════════════════════════════════════════════════════════════
SWITCH COMPLETE — Issue #{issue_id} (ADE / Implementation)
══════════════════════════════════════════════════════════════

  ✓ {docs_repo_name} → {target_docs_branch}
  ✓ {worker_repo_name} → {target_dev_branch}
  ✓ {worker_repo_name} → {target_dev_branch}
  ○ {worker_repo_name} — unchanged (no dev branch for this issue)

Ready for implementation on issue #{issue_id}.
Prompts available: /bmad-dev-story, /bmad-quick-dev, /bmad-code-review

══════════════════════════════════════════════════════════════
```

#### Auto-detect output:

```
══════════════════════════════════════════════════════════════
SWITCH COMPLETE — Now on Issue #{issue_id}
══════════════════════════════════════════════════════════════

  ✓ {docs_repo_name} → {target_docs_branch}
  ✓ {worker_repo_name} → {target_dev_branch}
  ✓ {worker_repo_name} → {target_dev_branch}
  ○ {worker_repo_name} — unchanged (no dev branch for this issue)

Ready to continue development on issue #{issue_id}.

══════════════════════════════════════════════════════════════
```

---

## Edge Cases

### Multiple dev branches for same issue in one worker repo

If a worker repo has multiple dev branches for the same issue and user (e.g., multiple stories in a project), list them and ask the user which to checkout:

```
⚠️  Multiple dev branches found in {repo_name} for issue #{issue_id}:

  1. dev/ghi-{issue_id}-1-1-project-scaffolding-{username}
  2. dev/ghi-{issue_id}-1-2-error-handling-{username}
  3. dev/ghi-{issue_id}-2-1-batch-processing-{username}

Which branch should I checkout? (Enter number or branch name)
```

**For project workflows with multiple stories**: If the ADE provides a story spec path as an additional argument, use it to resolve the correct dev branch automatically:
```
/tdgs-aidlc-switch 10 ade implementation-artifacts/1-3-request-dtos.md
```
This maps to `dev/ghi-10-1-3-*-{username}`.

### Worker repo has no local tracking branch

If the dev branch exists on remote but not locally:
```bash
git checkout -b {target_dev_branch} origin/{target_dev_branch}
```

### Same issue — switching from EM to ADE (or vice versa)

When already on issue `{issue_id}` but switching roles:
- The command still performs the full clean-check and branch resolution
- If already on the correct branch, report "Already on target branch" and skip the checkout

Example workflow for dual-role user:
```
/tdgs-aidlc-switch 42 em       # Work on planning for issue 42
... do planning work ...
/tdgs-aidlc-commit              # Commit planning artifacts
/tdgs-aidlc-switch 42 ade      # Switch to ADE context for same issue
... do implementation work ...
/tdgs-aidlc-commit              # Commit implementation
/tdgs-aidlc-switch 42 em       # Back to planning if needed
```

### EM role requested but only M&O branches exist

If `role=em` is specified but the issue only has `feature/*` or `hotfix/*` branches (M&O workflow), BAIL:

```
⚠️  Cannot switch to EM role for issue #{issue_id}

This is an M&O issue (feature/hotfix) — there is no planning branch.
M&O issues go directly from assignment to ADE implementation.

Use without role to switch:
  /tdgs-aidlc-switch {issue_id}
```

