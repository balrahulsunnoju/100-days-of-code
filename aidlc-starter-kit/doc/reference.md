# Reference

> **Roles:** All | **Reading path:** [EM Guide](em-guide.md) or [ADE Guide](ade-guide.md)

Quick reference, troubleshooting, and shared conventions.

---

## BMAD Skills Reference

BMAD 6.3.0+ provides standalone skills that can be invoked directly in Agent chat:

| Skill | Command | Description |
|-------|---------|-------------|
| Quick-Dev | `/bmad-quick-dev` | Create spec, implement, and review in one workflow |
| Code-Review | `/bmad-code-review` | Standalone 3-layer adversarial code review |
| Checkpoint-Preview | `/bmad-checkpoint-preview` | Guided human review of commits, branches, or PRs |
| Help | `/bmad-help` | Context-aware guidance on BMAD workflows and next steps |

### Sprint Dashboard Commands

These commands manage the live sprint dashboard and metrics tracking:

| Command | Description |
|---------|-------------|
| `/tdgs-aidlc-project-kanban-planning` | Orchestrate kanban plan, dashboard, and sprint metrics from planning artifacts |
| `/tdgs-aidlc-generate-dashboard` | Generate/regenerate the live HTML sprint dashboard |
| `/tdgs-aidlc-update-metrics` | Update sprint-status.yaml with timing + Harvey ball metrics after a status change |
| `/tdgs-aidlc-manage-blockers` | Add, resolve, or update blockers in sprint-status.yaml |
| `/tdgs-aidlc-metrics-report` | Generate a markdown metrics summary report |

#### Viewing the Sprint Dashboard

The sprint dashboard is a live HTML file that auto-refreshes every 5 seconds:

```bash
cd {docs}/implementation-artifacts
python3 -m http.server 8080       # macOS / Linux
# — or —
python -m http.server 8080        # Windows
# Open: http://localhost:8080/sprint-dashboard.html
```

#### When to Update Metrics

Run `/tdgs-aidlc-update-metrics` after:
- Starting work on a story (`ready-for-dev` → `in-progress`) — adds `started` timestamp
- Completing development (`in-progress` → `review`) — adds preliminary metrics
- Passing code review (`review` → `done`) — adds `completed` timestamp + final metrics

#### When to Manage Blockers

Run `/tdgs-aidlc-manage-blockers` when:
- A story is blocked by an external dependency, access issue, or environment problem
- A previously reported blocker has been resolved
- Blocker details need updating (impact level, action needed)

### Invoking BMAD Skills

Type the skill command directly in Agent chat (no agent selection required):
```
/bmad-quick-dev    → Create spec, implement, and review
/bmad-code-review  → Standalone adversarial code review
```

### Party Mode `/bmad-party-mode`

For complex multi-agent orchestration, use Party Mode to coordinate multiple specialists. Party Mode now spawns **real subagents** via the Agent tool — each agent thinks independently instead of being role-played by a single LLM. Supports `--solo` mode as a fallback for environments without subagent support.

### Splunk MCP Server

The Splunk MCP Server provides AI agent access to Splunk for querying application logs, monitoring dashboards, and investigating production issues — all from within VS Code Agent chat.

For full setup instructions, configuration details, and available capabilities, see the **[MCP Setup Guide — Splunk](mcp-setup-guide.md)**.

---

## Branch Naming Convention

### Branch Hierarchy

```
master (protected)
  ├── feature/ghi-{issue_id}-{slug}    (M&O integration branch)
  │     └── dev/ghi-{issue_id}-{slug}-{username}
  ├── hotfix/ghi-{issue_id}-{slug}     (M&O integration branch)
  │     └── dev/ghi-{issue_id}-{slug}-{username}
  ├── project/ghi-{issue_id}-{slug}    (Full BMAD — protected, no direct push)
  │     ├── planning/ghi-{issue_id}-{slug}   (EM planning work, PRs to project/*)
  │     ├── feature/ghi-{issue_id}-epic-{N}-{epic_slug}   (epic branch)
  │     │     ├── dev/ghi-{issue_id}-{N}-{S}-{story_slug}-{username}  (story branch)
  │     │     ├── dev/ghi-{bug_id}-bug-e{N}-{slug}-{username}  (bug fix, epic-level)
  │     │     └── dev/ghi-{bug_id}-bug-e{N}-s{S}-{slug}-{username}  (bug fix, story-level)
  │     ├── feature/ghi-{issue_id}-epic-{N}-{epic_slug}   (another epic)
  │     │     ├── dev/ghi-{issue_id}-{N}-{S}-{story_slug}-{ade1}
  │     │     └── dev/ghi-{issue_id}-{N}-{S}-{story_slug}-{ade2}
  │     ├── dev/ghi-{bug_id}-bug-{slug}-{username}  (bug fix, project-level — cross-epic)
  │     └── ...
  └── release/X.X.X (created by EM manually after Test Env validation)
```

### Integration Branches (Feature/Hotfix — M&O)
```
feature/ghi-{issue_id}-{slug}
hotfix/ghi-{issue_id}-{slug}
```
- `ghi` = GitHub Issue (reference)
- `{issue_id}` = Issue number
- `{slug}` = Kebab-case description derived from issue title
- Created FROM `master` via `/tdgs-aidlc-initiate-issue {id} {type}`
- Serves as the target branch for dev branch PRs
- Multiple ADEs can work on the same issue via their own dev branches

**Examples**:
```
feature/ghi-2-zip-code-enhancement
feature/ghi-123-add-payment-retry
hotfix/ghi-99-critical-payment-fix
```

### Integration Branches (Project — Full BMAD)
```
project/ghi-{issue_id}-{slug}
```
- Same naming convention as feature/hotfix but with `project/` prefix
- Created FROM `master` via `/tdgs-aidlc-initiate-project {id}` (run by EM)
- **Protected** — code changes require PRs (no direct feature code pushes). The ADE team is configured as a **bypass actor** in a repository ruleset, and a CI guard workflow (`project-branch-guard.yml`) restricts direct pushes to only `sprint-status.yaml` and `bug-brief-*.md` files. Configured by `/tdgs-aidlc-initiate-project`.
- Used for larger initiatives that follow the Full BMAD planning workflow
- **NOT the direct PR target for dev branches** — dev branches target the epic branch instead
- Planning artifacts are merged into it via PR from the `planning/*` branch

**Examples**:
```
project/ghi-42-ovra-modernization
project/ghi-10-bulk-refund-application
project/ghi-150-api-v2-migration
```

### Planning Branches (Project workflow only)
```
planning/ghi-{issue_id}-{slug}
```
- Same naming as the corresponding `project/*` branch but with `planning/` prefix
- Created FROM `project/*` via `/tdgs-aidlc-initiate-project {id}` (run by EM)
- EM works on this branch during the planning phase (Product Brief, PRD, Architecture, Epics, Sprint Plans, Story Specs)
- PRs from `planning/*` target the corresponding `project/*` branch
- After planning is merged, ADEs read from the `project/*` branch

**Examples**:
```
planning/ghi-42-ovra-modernization
planning/ghi-10-bulk-refund-application
planning/ghi-150-api-v2-migration
```

### Epic Branches (Project workflow only)
```
feature/ghi-{issue_id}-epic-{N}-{epic_slug}
```
- `{N}` = epic number (1, 2, 3...)
- `{epic_slug}` = kebab-case of the epic title (truncated to ~40 chars)
- Created FROM the `project/*` branch via `/tdgs-aidlc-prepare-repos`
- Groups all stories within a single epic
- Serves as the **PR target for dev branches** in project workflow
- Merged to `project/*` when all stories in the epic are complete

**Examples**:
```
feature/ghi-10-epic-1-batch-submission-dry-run
feature/ghi-10-epic-2-live-execution-audit
feature/ghi-10-epic-3-retry-idempotency-traceability
feature/ghi-42-epic-1-authentication-layer
```

### Dev Branches (Personal Work Branches)

**M&O (feature/hotfix):**
```
dev/ghi-{issue_id}-{slug}-{username}
```
- Personal work branch for each ADE
- `{username}` = GitHub username (from `gh api user --jq '.login'`)
- Created FROM the integration branch (feature or hotfix)
- PRs from dev branches target the integration branch

**Project (story-level):**
```
dev/ghi-{issue_id}-{N}-{S}-{story_slug}-{username}
```
- `{N}-{S}` = epic number + story number (mirrors the spec filename, e.g., `1-1`, `2-3`)
- `{story_slug}` = truncated story name from spec filename
- Created FROM the epic branch (`feature/ghi-{id}-epic-{N}-*`)
- PRs from dev branches target the **epic branch**

**Examples (M&O)**:
```
dev/ghi-2-zip-code-enhancement-johndoe
dev/ghi-123-add-payment-retry-janesmith
dev/ghi-99-critical-payment-fix-devuser
```

**Examples (Project)**:
```
dev/ghi-10-1-1-project-scaffolding-yogenjos
dev/ghi-10-1-2-exception-hierarchy-yogenjos
dev/ghi-10-2-1-audit-table-repository-janesmith
dev/ghi-42-1-3-user-session-management-devuser
```

### Bug Branches (Project workflow only)

Bug branches fix defects found during testing within an active project. They branch from the appropriate parent (project or epic branch) — NOT from master.

**Naming patterns:**
| Scope | Pattern | Example |
|-------|---------|---------|
| Project (cross-epic) | `dev/ghi-{bug_id}-bug-{slug}-{username}` | `dev/ghi-74-bug-jwt-token-expiry-johndoe` |
| Epic | `dev/ghi-{bug_id}-bug-e{N}-{slug}-{username}` | `dev/ghi-73-bug-e1-uswds-compile-johndoe` |
| Story | `dev/ghi-{bug_id}-bug-e{N}-s{S}-{slug}-{username}` | `dev/ghi-72-bug-e2-s6-null-pointer-johndoe` |

**Validation regex:**
```regex
^dev\/ghi-\d+-bug-(e\d+(-s\d+)?-)?[a-z0-9]([a-z0-9-]*[a-z0-9])?-[a-z0-9]+$
```

**Rules:**
- `{bug_id}` = GitHub Issue number for the **bug** (distinct from project issue)
- `{slug}` = kebab-case from bug issue title, capped at 50 chars (truncate at word boundary)
- Total branch name max **100 chars**
- Created FROM parent branch (project or epic) — never from master
- PRs target the parent branch:
  - Epic/story-scoped bugs → PR targets `feature/ghi-{pid}-epic-{N}-*`
  - Project-scoped bugs → PR targets `project/ghi-{pid}-*`
- NOT tracked in `sprint-status.yaml` — tracked via GitHub Issues with `bug` label

**Examples:**
```
dev/ghi-74-bug-jwt-token-expiry-johndoe
dev/ghi-73-bug-e1-uswds-compile-johndoe
dev/ghi-72-bug-e2-s6-null-pointer-johndoe
```

### Release Branches
```
release/{version}
```
- Created by EM manually after Test Env validation (outside AIDLC automation)
- EM creates release branches and merges integration changes
- After release branch is ready, deployment proceeds

**Examples**:
```
release/4.0.0
release/4.1.0
release/5.0.0-beta
```

### Branch Flow Summary

**M&O (feature/hotfix) — 2-tier:**

| Action | Source Branch | Target Branch | Created By |
|--------|---------------|---------------|------------|
| Create M&O integration branch | `master` | `feature/ghi-*` or `hotfix/ghi-*` | ADE via `/tdgs-aidlc-initiate-issue` |
| Create dev branch (M&O) | `feature/ghi-*` or `hotfix/ghi-*` | `dev/ghi-*-{username}` | ADE via `/tdgs-aidlc-initiate-issue` |
| Merge dev PR | `dev/ghi-*` | `feature/ghi-*` or `hotfix/ghi-*` | ADE via `/tdgs-aidlc-create-pull-request` |
| Create release branch | `master` | `release/X.X.X` | EM (manual) |
| Merge integration to release | `feature/ghi-*` or `hotfix/ghi-*` | `release/X.X.X` | EM (manual) |
| Release to production | `release/X.X.X` | `master` | EM (post-deployment) |

**Project (Full BMAD) — 3-tier:**

| Action | Source Branch | Target Branch | Created By |
|--------|---------------|---------------|------------|
| Create project branch (protected) | `master` | `project/ghi-*` | EM via `/tdgs-aidlc-initiate-project` |
| Create planning branch | `project/ghi-*` | `planning/ghi-*` | EM via `/tdgs-aidlc-initiate-project` |
| Merge planning PR (planning complete) | `planning/ghi-*` | `project/ghi-*` | EM via `/tdgs-aidlc-create-pull-request` |
| Create epic branch | `project/ghi-*` | `feature/ghi-*-epic-{N}-*` | ADE via `/tdgs-aidlc-prepare-repos` |
| Create dev branch (story) | `feature/ghi-*-epic-{N}-*` | `dev/ghi-*-{N}-{S}-*-{username}` | ADE via `/tdgs-aidlc-prepare-repos` |
| Merge dev PR (story complete) | `dev/ghi-*-{N}-{S}-*` | `feature/ghi-*-epic-{N}-*` | ADE via `/tdgs-aidlc-create-pull-request` |
| Merge epic PR (epic complete) | `feature/ghi-*-epic-{N}-*` | `project/ghi-*` | EM (after all stories merged) |
| Merge project to release | `project/ghi-*` | `release/X.X.X` | EM (manual) |
| Release to production | `release/X.X.X` | `master` | EM (post-deployment) |

**Bug Remediation (project workflow):**

| Action | Source Branch | Target Branch | Created By |
|--------|---------------|---------------|------------|
| Create bug dev branch (epic-level) | `feature/ghi-{pid}-epic-{N}-*` | `dev/ghi-{bug_id}-bug-e{N}-*` | ADE via `/tdgs-aidlc-prepare-repos` |
| Create bug dev branch (project-level) | `project/ghi-{pid}-*` | `dev/ghi-{bug_id}-bug-{slug}-*` | ADE via `/tdgs-aidlc-prepare-repos` |
| Merge bug PR (epic-level) | `dev/ghi-{bug_id}-bug-e{N}-*` | `feature/ghi-{pid}-epic-{N}-*` | ADE via `/tdgs-aidlc-create-pull-request` |
| Merge bug PR (project-level) | `dev/ghi-{bug_id}-bug-{slug}-*` | `project/ghi-{pid}-*` | ADE via `/tdgs-aidlc-create-pull-request` |

---

## Troubleshooting

### Common Issues — Quick Reference

| Error / Symptom | Who | Fix |
|----------------|-----|-----|
| "Issues repository not configured" | All | Set `issues.repository` in `.github/i2a-config.yml` — [details](#issues-repository-not-configured) |
| "Worker repositories not configured" | All | Run `/tdgs-aidlc-quick-setup update-workspace` — [details](#worker-repositories-not-configured) |
| "Dirty working tree" error | All | Commit or stash changes before switching — [details](#dirty-working-tree-error) |
| "Cannot commit directly to protected branch" | ADE | Switch to a `dev/*` branch first — [details](#cannot-commit-directly-to-protected-branch) |
| Commit blocked due to sensitive files | ADE | Remove `.env`/credential files from staging — [details](#commit-blocked-due-to-sensitive-files) |
| "Branch already exists" during prepare-repos | ADE | Choose skip (keep), reset (overwrite), or abort — [details](#branch-already-exists-during-tdgs-aidlc-prepare-repos) |
| Tests fail after implementation | ADE | Run `/tdgs-aidlc-run-tests` and check reports — [details](#tests-fail-after-implementation) |
| Pipeline fails with Gitleaks | ADE | Check if baseline issue or real secret — [details](#pipeline-fails-with-gitleaks-secrets-detected) |
| Post-Deployment Sync issues | EM | Verify release tag and branch state — [details](#post-deployment-sync-issues-em-only) |
| BMAD Installation fails | EM | Check Node.js version and network — [details](#bmad-installation-fails-em-only) |

---

### "Issues repository not configured"
```yaml
# Update .github/i2a-config.yml
issues:
  repository: "org/project-docs"
```

### "Worker repositories not configured"
```yaml
# Update .github/i2a-config.yml
worker_repos:
  service-name: "org/repo-name"
```

### "Spec references '{name}' but not found in i2a-config.yml worker_repos"

The spec references a repository that cannot be resolved in `worker_repos`. Possible causes:
- The repo doesn't exist yet (needs to be created)
- The repo exists but isn't registered in `i2a-config.yml`
- The spec uses a semantic name that doesn't match any config key (typo or unmapped name)

**For Project workflow:**
1. Create the repository if it doesn't exist
2. Clone it into the workspace
3. Switch docs repo to `planning/*` branch
4. Add the repo to `.github/i2a-config.yml` → `worker_repos`
5. Commit + PR from `planning/*` → `project/*`
6. After merge, re-run `/tdgs-aidlc-prepare-repos {story-spec}`

**For M&O workflow:**
1. Create the repository if it doesn't exist
2. Clone it into the workspace
3. Create `feature/*` branch in docs repo from master
4. Add the repo to `.github/i2a-config.yml` → `worker_repos`
5. Commit + PR to master
6. After merge, re-run `/tdgs-aidlc-prepare-repos`

After config is merged, run [incremental KB generation](knowledge-base-generation.md#adding-kb-for-new-repositories-incremental) to create knowledge-base docs for the new repo. Subsequent `/tdgs-aidlc-update-context-docs` runs will then maintain those docs from code deltas.

See also: [Adding Repositories to Workspace After KB Creation](setup.md#adding-repositories-to-workspace-after-kb-creation) (full process) | [Adding a New Repository Mid-Project](project-implementation.md#adding-a-new-repository-mid-project) (ADE quick path)

### "Not on master branch" error
You must be on master before running `/tdgs-aidlc-initiate-issue`:
```bash
# Ensure you're on master and up-to-date
git fetch origin
git checkout master
git pull origin master
```

### "Dirty working tree" error
```bash
git stash          # Save changes temporarily
# Or
git add . && git commit -m "WIP"
```

### "Spec not found"
Run `/bmad-quick-dev` first to create the spec, then run `/tdgs-aidlc-prepare-repos`.

### Quick-Dev skips steps or goes too fast
If `/bmad-quick-dev` seems to skip essential workflow steps (like adversarial review):
1. **Do NOT include the spec path** with the command
   - ❌ Wrong: `/bmad-quick-dev spec-xyz.md`
   - ✅ Correct: Just type `/bmad-quick-dev`
2. The agent will **automatically detect** and load the spec
3. Including the path manually may cause the workflow to skip steps
4. If steps were skipped, start a fresh Agent chat and run `/bmad-quick-dev` without any arguments

### "Repository not found in workspace"
Clone the missing repository or update the path in `i2a-config.yml`.

### "Branch already exists" during /tdgs-aidlc-prepare-repos
The integration or dev branch already exists in the worker repository. Choose one of:
- **Skip** — Keep existing branch and continue
- **Reset** — Delete and recreate branch from master (use if branch is stale)
- **Abort** — Stop preparation entirely

> 💡 **Tip**: If you previously started work and need to reset, choose **Reset** to get a fresh branch from master.

### Tests fail after implementation
1. Review test output for specific failures
2. Fix the issues in code
3. Re-run tests
4. Continue to Code Review

### Commit blocked due to sensitive files
1. Add files to `.gitignore`
2. Remove from staging: `git reset <file>`
3. Re-run `/tdgs-aidlc-commit`

### "Cannot commit directly to protected branch"
You're on master, main, or an integration/release branch. Switch to your dev branch:
```bash
git checkout dev/ghi-{issue_id}-{slug}-{username}
```

### "Integration branch not found" during PR creation
This can happen if:
1. The integration branch doesn't exist - run `/tdgs-aidlc-initiate-issue` first
2. You specified an incorrect target - check available branches with `git branch -r | grep -E "feature/gh|hotfix/gh"` (on Windows PowerShell: `git branch -r | Select-String "feature/gh|hotfix/gh"`)

> 💡 **Note**: `/tdgs-aidlc-prepare-repos` creates integration and dev branches in worker repos. This error typically only occurs if you skip `/tdgs-aidlc-prepare-repos` or manually work in a repo.

### "pre-commit not found" error
Install pre-commit using one of:
```bash
brew install pre-commit    # macOS
pip install pre-commit     # All platforms
```

### "gitleaks not found" error
Install gitleaks using one of:
```bash
brew install gitleaks           # macOS
choco install gitleaks -y       # Windows (Chocolatey)
winget install gitleaks         # Windows (winget)
```

### Pre-commit hooks blocking commit
If hooks are failing and blocking your commit:
1. Fix the issues identified by the hooks
2. Or temporarily skip: `git commit --no-verify` (use sparingly)

### "Cannot run pipeline from main branch" error
```bash
git checkout <your-feature-branch>
```

### Pipeline workflow not found
Ensure the CI workflow exists:
1. Check `.github/workflows/ci-feature.yml` in the repository
2. Verify you have access to trigger workflows
3. Contact repository admin if workflow is missing

### Pipeline fails with build errors
1. Review the failure details in the output
2. Run build locally: `mvn compile` or `npm run build`
3. Fix the errors
4. Commit changes: `/tdgs-aidlc-commit`
5. Re-run pipeline: `/tdgs-aidlc-pre-check-pull-request`

### Pipeline fails with Gitleaks (secrets detected)
1. Review the Gitleaks job logs for file paths
2. Remove or rotate exposed secrets
3. Use environment variables instead of hardcoded values
4. Add sensitive files to `.gitignore`
5. Consider using `git-filter-repo` to remove secrets from history

### Pipeline fails with Gitleaks (baseline error on IDE trigger)

**Issue:** Gitleaks fails when pipeline is triggered from IDE (`/tdgs-aidlc-pre-check-pull-request`) but passes when changes are pushed directly.

**Symptoms:** Error logs contain messages like:
- `fatal: bad revision`
- `could not determine log options`
- `no commits to scan`
- `failed to get commits`

**Root Cause:** When the CI pipeline is triggered via `workflow_dispatch` (IDE trigger), Gitleaks cannot determine the proper commit range because `workflow_dispatch` events lack the `before`/`after` commit refs that `push` events provide.

**Solutions:**

1. **Push directly to trigger a push event (recommended):**
   ```bash
   git push origin <branch-name>
   ```
   This triggers a `push` event which provides proper commit context for Gitleaks.

2. **Ensure merge-base exists with default branch:**
   ```bash
   git fetch origin master
   git merge-base origin/master HEAD
   ```
   If merge-base fails, rebase your branch:
   ```bash
   git rebase origin/master
   ```

3. **If IDE-triggered pipeline consistently fails but direct push passes:**
   - This is a known limitation of `workflow_dispatch` triggers
   - You can safely proceed with your PR if the pipeline passes on direct push

> 💡 **Note:** The `/tdgs-aidlc-pre-check-pull-request` prompt now includes automatic checks for this scenario and will warn you proactively if a baseline issue is detected.

### "Push rejected to project/* branch" (branch protection)

If `prepare-repos` or `initiate-issue` (bug type) fails to push directly to a `project/*` branch:

**Cause:** The ADE is not configured as a bypass actor in the repository ruleset, or no ruleset/bypass exists.

**Solutions:**
1. **(Recommended)** Ask your EM to add the ADE team as a **bypass actor** in the repository ruleset:
   ```bash
   # Find team ID
   gh api orgs/{org}/teams/{team-slug} --jq '.id'
   # Update ruleset to add bypass actor (via GitHub Settings > Rules > Rulesets)
   ```
2. **(Alternative)** Route changes through `planning/*` → PR → `project/*`:
   - Switch to the planning branch
   - Commit the status/bug-brief change there
   - Create PR targeting the project branch
3. **Verify CI guard exists:** Ensure `.github/workflows/project-branch-guard.yml` is present — it restricts direct pushes to only `sprint-status.yaml` and `bug-brief-*.md`. Without it, bypass actors could push any file.

> This is non-fatal for `prepare-repos` — branch creation in worker repos already succeeded (the true claim). Sprint-status is a convenience update.

---

### "Integration branch not found" for project PRs
If the PR fails to find the `project/ghi-*` integration branch:
```bash
# Verify project branch exists
git branch -r | grep "project/gh"
# If missing, run initiate-project first in docs repo
```

> **Windows PowerShell:** `git branch -r | Select-String "project/gh"`

### Project workflow: Which step to do next?
If you lose track of where you are in the project implementation workflow:
1. Check that `planning-artifacts/` and `implementation-artifacts/` have story specs (created by EM)
2. Check which stories have been implemented:
   - No dev branch in worker repo → `/tdgs-aidlc-prepare-repos`
   - Dev branch exists but no code changes → `/bmad-dev-story`
   - Code exists but no PR → `/bmad-code-review` → `/tdgs-aidlc-commit` → `/tdgs-aidlc-create-pull-request`
3. If all stories in current sprint are done, notify EM for the next batch of story specs

### Dev-Story skips steps or goes too fast
Same as Quick-Dev: do NOT pass the story file path as an argument. Let the agent detect it automatically. If steps were skipped, start a fresh Agent chat and re-run `/bmad-dev-story`.

### Post-Deployment Sync Issues (EM Only)

#### Release Not Found

**Issue:** `❌ Release not found: {release}`

**Solution:**
```bash
# Check available releases
git tag --list 'v*'
git branch -r | grep release

# Ensure release was merged to master and tagged
git log --oneline master -20
```

> **Windows PowerShell:** Use `git branch -r | Select-String release` instead of `grep`.

#### No Issues Found for Release

**Issue:** `⚠️ No GitHub Issues found for release {release}`

**Solution:**
```bash
# Manually specify issue IDs
/tdgs-aidlc-post-deployment-docs-sync 4.0.0 issues:123,456,789

# Or continue without issue tracking (documentation will still be updated)
# When prompted, select option 2 to continue without issue tracking
```

#### Worker Repo Access Failed

**Issue:** `❌ Cannot access worker repository`

**Solution:**
1. Verify `worker_repos` is configured in `.github/i2a-config.yml`
2. Ensure you have access to the worker repositories
3. Check that github-mcp is configured correctly

#### Documentation Already Synced

**Issue:** `ℹ️ Documentation appears current for release {release}`

**Solution:**
```bash
# Force re-sync if needed
/tdgs-aidlc-post-deployment-docs-sync 4.0.0 --force
```

### BMAD Installation Fails (EM Only)

**Issue:** `npx bmad-method@{version} install` fails (version is read from `i2a-config.yml`)

**Solution:**
```bash
# Clear npm cache and retry
npm cache clean --force
npx --yes bmad-method@{version} install
# The version is specified in tdgs-aidlc-starter-kit/src/i2a-config.yml
# Follow the interactive prompts to select:
# - BMM module
# - GitHub Copilot as IDE
```

### GitHub CLI Not Authenticated (EM Only)

**Issue:** `gh repo create` fails with authentication error

**Solution:**
```bash
gh auth login
# Follow prompts to authenticate
```

### Prompts Not Found (EM Only)

**Issue:** `/tdgs-aidlc-setup-workspace` says prompts not found

**Solution:** Ensure you completed [Step 5](setup.md#step-5-add-aidlc-starter-kit-to-workspace) (cloning or symlinking `tdgs-aidlc-starter-kit`):
```bash
# Verify tdgs-aidlc-starter-kit folder exists
ls tdgs-aidlc-starter-kit/src/prompts
# Should list prompt files
```

> **Windows PowerShell:** `dir tdgs-aidlc-starter-kit\src\prompts`

### Remote Repository Already Exists (EM Only)

**Issue:** `gh repo create` says repo already exists

**Solution:** This is fine! The script will use the existing repo. Just ensure you have push access.

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────────┐
│                    QUICK COMMAND REFERENCE                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ═══ M&O WORKFLOW (feature / hotfix) ═══                           │
│                                                                    │
│  DOCS REPO - PLANNING                                              │
│  ────────────────────                                              │
│  /tdgs-aidlc-initiate-issue {id} {type}    # Branch + change brief│
│  /tdgs-aidlc-reference-sync {owner/repo}   # Sync shared docs    │
│  /tdgs-aidlc-commit                        # Commit spec          │
│  /tdgs-aidlc-create-pull-request           # Draft PR for docs    │
│  /tdgs-aidlc-prepare-repos                 # Branches in workers  │
│                                                                    │
│  WORKER REPOS - IMPLEMENTATION                                     │
│  ─────────────────────────────                                     │
│  /bmad-quick-dev                # Implement story specs            │
│  /bmad-code-review              # Code review                      │
│  /tdgs-aidlc-commit                        # Commit changes       │
│  /tdgs-aidlc-pre-check-pull-request        # CI pipeline check    │
│  /tdgs-aidlc-create-pull-request           # PR → integration     │
│                                                                    │
│  M&O WORKFLOW ORDER                                                │
│  ──────────────────                                                │
│   0. /tdgs-aidlc-initiate-issue {id} {type}                      │
│   1. /tdgs-aidlc-reference-sync                                   │
│   2. /tdgs-aidlc-commit + /tdgs-aidlc-create-pull-request       │
│   3. /tdgs-aidlc-prepare-repos                                    │
│   4. /bmad-quick-dev (per worker repo)                             │
│   5. /bmad-code-review                                             │
│   6. /tdgs-aidlc-commit                                           │
│   7. /tdgs-aidlc-pre-check-pull-request                           │
│   8. /tdgs-aidlc-create-pull-request                              │
│   9. Notify EM                                                     │
│                                                                    │
│  ═══ PROJECT WORKFLOW (Full BMAD) ═══                              │
│                                                                    │
│  NOTE: EM completes all planning steps (Initiate Project,          │
│  Product Brief, PRD, Architecture, Epics, Sprint Planning,         │
│  Kanban Planning, Create Story). ADE implements from story specs.  │
│                                                                    │
│  DOCS REPO - SETUP                                                 │
│  ────────────────                                                  │
│  /tdgs-aidlc-initiate-issue {id} project   # Dev branch + verify  │
│  /tdgs-aidlc-reference-sync {owner/repo}   # (Optional) Re-sync  │
│  /tdgs-aidlc-prepare-repos {spec}          # Branches in workers  │
│                                                                    │
│  WORKER REPOS - IMPLEMENTATION                                     │
│  ─────────────────────────────                                     │
│  /bmad-dev-story                # Implement from story spec        │
│  /bmad-code-review              # Code review                      │
│  /tdgs-aidlc-commit                        # Commit changes       │
│  /tdgs-aidlc-pre-check-pull-request        # CI pipeline check    │
│  /tdgs-aidlc-create-pull-request           # PR → project branch  │
│                                                                    │
│  PROJECT WORKFLOW ORDER (ADE only)                                  │
│  ─────────────────────────────────                                  │
│   0. /tdgs-aidlc-initiate-issue {id} project                      │
│   1. /tdgs-aidlc-reference-sync (optional)                        │
│   2. /tdgs-aidlc-prepare-repos {spec-path}                        │
│   3. /bmad-dev-story (per worker repo)                             │
│   4. /bmad-code-review                                             │
│   5. /tdgs-aidlc-commit                                           │
│   6. /tdgs-aidlc-pre-check-pull-request                           │
│   7. /tdgs-aidlc-create-pull-request                              │
│   8. Notify EM → Repeat from 2 for next story                     │
│                                                                    │
│  ═══ BUG REMEDIATION (project workflow) ═══                        │
│                                                                    │
│  DOCS REPO (on project/* branch)                                   │
│  ────────────────────────────────                                  │
│  /tdgs-aidlc-initiate-issue {bug_id} bug  # Bug-brief + dev branch│
│  /bmad-quick-dev                   # Fix spec (root cause, plan)   │
│  /tdgs-aidlc-prepare-repos         # Branches from parent          │
│                                                                    │
│  WORKER REPOS                                                      │
│  ─────────────                                                     │
│  /bmad-quick-dev              # Implement fix                      │
│  /bmad-code-review            # Adversarial review                 │
│  /tdgs-aidlc-commit                        # Commit fix            │
│  /tdgs-aidlc-create-pull-request           # PR → parent branch   │
│                                                                    │
│  BUG BRANCH PATTERNS                                               │
│  ────────────────────                                              │
│  dev/ghi-{bug_id}-bug-{slug}-{user}           (project-level)     │
│  dev/ghi-{bug_id}-bug-e{N}-{slug}-{user}      (epic-level)        │
│  dev/ghi-{bug_id}-bug-e{N}-s{S}-{slug}-{user} (story-level)       │
│                                                                    │
│  POST-MERGE KB SYNC (EM, optional — project workflow)              │
│  ────────────────────────────────────────────────────               │
│  /tdgs-aidlc-update-context-docs {id}  # KB regen on planning/*   │
│                                                                    │
│  BRANCH FLOW                                                       │
│  ───────────                                                       │
│  M&O:                                                              │
│  master → feature/ghi-{id} → dev/ghi-{id}-{user} → PR → feature/* │
│  master → hotfix/ghi-{id}  → dev/ghi-{id}-{user} → PR → hotfix/*  │
│                                                                    │
│  Project (3-tier):                                                 │
│  master → project/ghi-{id} (protected)                             │
│    ├─ planning/ghi-{id}  (EM planning → PR → project/*)           │
│    └─ feature/ghi-{id}-epic-{N}-* (epic branch)                   │
│         └─ dev/ghi-{id}-{N}-{S}-*-{user} → PR → epic branch      │
│                                                                    │
│  After Test Env: EM creates release/{ver} manually                 │
│                                                                    │
│  INITIAL SETUP (ONE-TIME)                                          │
│  ────────────────────────                                          │
│  /tdgs-aidlc-install-hooks                 # Pre-commit hooks     │
│                                                                    │
│  BMAD SKILL COMMANDS                                               │
│  ───────────────────                                               │
│  /bmad-quick-dev     /bmad-code-review   /bmad-dev-story           │
│  /bmad-party-mode                                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Summary Checklists

### Initial Setup Checklist (EM)

- [ ] Created project workspace folder
- [ ] Cloned all code repositories
- [ ] Set up Apigee sources (choose one):
  - [ ] **Option A (Git-based):** Cloned Apigee proxy repos (e.g., `tdgs-ovra-transaction-proxy`, `tdgs-ovra-onlinecertificate-proxy`, `tdgs-ovra-utility-proxy`)
  - [ ] **Option B (Legacy):** Exported Apigee packages into `apigee-exports/` folder
- [ ] Added `tdgs-aidlc-starter-kit` to workspace (cloned or symlinked)
- [ ] Opened workspace in VS Code
- [ ] Ran `/tdgs-aidlc-setup-workspace` command
- [ ] BMAD installed with GitHub Copilot selected
- [ ] Docs folder created with proper structure
- [ ] Git repository created with initial commit
- [ ] Generated knowledge base documentation using BMAD Document Project (including Apigee documentation)
- [ ] Generated `project-context.md` with testing rules, DB scripts, KB scanning, and Common Services rules
- [ ] Synced reference documentation from common services repository
- [ ] Reviewed all generated documentation (including project-context.md rules)
- [ ] Validated test context alignment
- [ ] Committed documentation to same feature branch
- [ ] Created PR with both commits
- [ ] PR reviewed by Copilot (if enabled)
- [ ] PR reviewed by team members
- [ ] PR merged to master
- [ ] Shared workspace location with development team

### Post-Deployment Checklist (EM)

- [ ] Production deployment confirmed successful
- [ ] Ran `/tdgs-aidlc-post-deployment-docs-sync {release}`
- [ ] Reviewed all documentation changes
- [ ] Verified flagged items (potential removals, business rules)
- [ ] Created PR for documentation updates
- [ ] PR reviewed and merged
- [ ] Team notified of documentation updates

---

## Additional Resources

- [Engineering Manager Guide](em-guide.md) - One-time setup and configuration
- [Agentic Delivery Engineer Guide](ade-guide.md) - Development workflow
- [Setup Guide](setup.md) - Workspace setup and prerequisites
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Conventional Commits](https://www.conventionalcommits.org/)
- Project-specific configuration: `.github/i2a-config.yml`
- Prompt definitions: `.github/prompts/`
