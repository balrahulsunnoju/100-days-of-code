---
mode: agent
description: "View available stories with dependency resolution and branch-based claim detection."
---

# /tdgs-aidlc-show-available-stories

Read-only discovery command for ADEs to see which stories are available for pickup from the current project.

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
| Epic filter | User-provided `--epic {N}` | No (optional) |
| Docs repo | Auto-detected from workspace | Yes |
| Worker repos | `.github/i2a-config.yml` → `worker_repos` + `common_repos` | Yes |
| Sprint status | `implementation-artifacts/sprint-status.yaml` | Yes |

---

## Execution Steps

### 1. Pre-flight Checks

#### GitHub MCP Activation (when reading issues from GitHub)

If this workflow uses `mcp_github*` or `gh` for issue/story data:

1. Verify GitHub MCP tools are available (pattern `mcp_github`) **or** `gh` is authenticated.
2. If neither is available → **BAIL**: `❌ GitHub MCP is not activated. Enable it per doc/mcp-setup-guide.md before running this command.`

#### Workspace and sprint status

- Locate the docs repository in the workspace (contains `.github/i2a-config.yml`)
- Confirm the docs repo is on a `project/*` or `planning/*` branch (self-service only applies to project workflow)
- Parse the branch name: `project/ghi-{issue_id}-{slug}` or `planning/ghi-{issue_id}-{slug}`
- Load `.github/i2a-config.yml` to get `worker_repos` and `common_repos` (merge both sections into a single repo list)
- Load `implementation-artifacts/sprint-status.yaml`

**If not on a project or planning branch:**
```
❌ Not on a project or planning branch

Docs repository branch: {current_branch}

Self-service story pickup only applies to project workflows.
The docs repo must be on a project/* or planning/* branch.

Exiting...
```
STOP execution.

**If sprint-status.yaml not found:**
```
❌ sprint-status.yaml not found

Expected: {docs}/implementation-artifacts/sprint-status.yaml

Run sprint planning first to generate the sprint status file.

Exiting...
```
STOP execution.

### 2. Collect Story Statuses

From `sprint-status.yaml`, collect all story entries under `development_status`:
- Filter to stories with status = `ready-for-dev` → these are **candidates**
- Stories with status = `in-progress` or `review` → these are **claimed**
- Stories with status = `done` → these are **completed**
- Stories with status = `backlog` → these are **not ready**

### 3. Scan Remote Branches for Claims

For each worker repo in `i2a-config.yml`:
1. Navigate to the repository directory
2. Run `git fetch origin`
3. Run `git branch -r` and grep for `dev/ghi-{issue_id}-` branches (matching the project issue ID)
4. Parse each matching dev branch: `dev/ghi-{issue_id}-{N}-{S}-{slug}-{username}`
   - Extract `{N}-{S}` → maps to a story
   - Extract `{username}` → who claimed it

Aggregate results across all worker repos (a story is "claimed" if ANY worker repo has a dev branch for it).

### 4. Resolve Dependencies

If `sprint-status.yaml` contains a `dependencies` section, evaluate each `ready-for-dev` story:

```yaml
dependencies:
  1-7-dry-run-pipeline-and-controller-endpoint: [1-1, 1-2, 1-3, 1-4, 1-5, 1-6]
  1-8-status-polling-endpoint: [1-7]
  2-4-live-execution-pipeline-orchestration: [2-1, 2-2, 2-3]
  3-1-idempotency-guard-and-double-refund-prevention: [epic-2]
  3-2-audit-query-service-and-batch-traceability: [epic-2]
  3-3-retry-endpoint-and-orchestration: [3-1, 3-2]
```

**Dependency resolution rules:**
- A story reference like `1-1` means story `1-1-*` must have status = `done`
- An epic reference like `epic-2` means the epic entry must have status = `done`
- If ANY dependency is not met → story is **BLOCKED**

**If no `dependencies` section exists:** Treat all `ready-for-dev` stories as AVAILABLE (no blocking relationships can be reliably inferred from free-text comments). Surface a notice:
```
ℹ️  No machine-readable dependencies section found in sprint-status.yaml.
    All ready-for-dev stories are shown as AVAILABLE.
    Check ADE PARALLELISM NOTES comments for advisory ordering guidance.
```

### 5. Categorize Stories

Assign each story to exactly one category:

| Category | Criteria |
|----------|----------|
| **AVAILABLE** | status = `ready-for-dev` AND no remote dev branch AND no unmet dependencies |
| **BLOCKED** | status = `ready-for-dev` AND no remote dev branch AND has unmet dependencies |
| **CLAIMED** | Has a remote dev branch (any worker repo) by another user, OR status = `in-progress`/`review` |
| **DONE** | status = `done` |

If `--epic {N}` was provided, filter all categories to only show stories from that epic.

### 6. Display Results

```
╔══════════════════════════════════════════════════════════════╗
║  Available Stories — project/ghi-{issue_id}-{slug}          ║
╠══════════════════════════════════════════════════════════════╣

📋 AVAILABLE (ready-for-dev, unclaimed, unblocked):
  {N}-{S}  {Story Title}
  {N}-{S}  {Story Title}
  ...

🔒 BLOCKED (dependencies not met):
  {N}-{S}  {Story Title} (needs {dep1}, {dep2} done)
  ...

👤 CLAIMED:
  {N}-{S}  {Story Title} ({username}) — status: {status}
  ...

✅ DONE:
  {N}-{S}  {Story Title}
  ...

╚══════════════════════════════════════════════════════════════╝

💡 To claim a story:
   /tdgs-aidlc-prepare-repos implementation-artifacts/{N}-{S}-{slug}.md
```

**Story title derivation:** Use the story key from sprint-status.yaml, converting the slug to title case (e.g., `1-2-exception-hierarchy-and-global-error-handler` → "Exception Hierarchy and Global Error Handler").

---

## Edge Cases

### No Stories Available
```
ℹ️  No stories currently available for pickup.

All ready-for-dev stories are either claimed or blocked.

👤 CLAIMED:
  {list claimed stories}

🔒 BLOCKED:
  {list blocked stories with dependencies}

Check back after dependencies are resolved, or coordinate with EM.
```

### Worker Repo Not in Workspace
```
⚠ Worker repo not found: {repo_key}
  Expected path: {expected_path}
  Skipping remote branch scan for this repo.
  
  ⚠️  Claim detection may be incomplete — some stories might already be claimed
     in repos not present in this workspace.
```

### Git Fetch Fails
```
⚠ Failed to fetch from {repo_name}: {error}
  Using cached remote branch data (may be stale).
```

### No sprint-status.yaml Dependencies Section
```
ℹ️  No machine-readable dependencies section found in sprint-status.yaml.
    All ready-for-dev stories are shown as AVAILABLE.
    Check ADE PARALLELISM NOTES comments for advisory ordering guidance.
```
