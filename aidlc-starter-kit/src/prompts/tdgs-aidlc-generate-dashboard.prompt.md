---
mode: agent
description: "Generate a live HTML sprint dashboard from planning artifacts with auto-refresh from YAML status."
---

# Generate Sprint Dashboard

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

You are helping a user generate a live HTML sprint dashboard that visualizes their project's progress in real-time. This command creates (or regenerates) a `sprint-dashboard.html` file that reads `sprint-status.yaml` and `sprint-metrics.md`, auto-refreshing every 5 seconds.

## Command Usage

```
/tdgs-aidlc-generate-dashboard
/tdgs-aidlc-generate-dashboard {title}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `{title}` | No | Custom dashboard title. If omitted, derived from the project branch slug (without issue ID) or falls back to `project_name` from config. |

## Prerequisites

Before running this command, the following must exist:
- **Epics file** — `{planning_artifacts}/*epic*.md` (created by `/bmad-create-epics-and-stories`)
- **Sprint status** — `{implementation_artifacts}/sprint-status.yaml` (created by `/bmad-sprint-planning`)

**Optional but recommended:**
- **Kanban plan** — `{implementation_artifacts}/kanban-plan.md` (from `/tdgs-aidlc-project-kanban-planning`) — provides story complexity, milestones, risks, critical path, and velocity data

## Instructions

### Step 0: Locate Project Root

- **Identify the docs repository** by finding the folder containing `knowledge-base/README.md` or `_bmad/bmm/config.yaml`
- All subsequent paths are relative to this docs repository root (`{project-root}`)
- If neither marker file is found, BAIL:
  ```
  ❌ Cannot locate project root

  Expected to find knowledge-base/README.md or _bmad/bmm/config.yaml
  in a repository subdirectory. Run /tdgs-aidlc-setup-workspace first.
  ```

### Step 1: Load Configuration & Validate Prerequisites

Read `{project-root}/_bmad/bmm/config.yaml` to resolve:
- `project_name`
- `implementation_artifacts` path
- `planning_artifacts` path

Verify prerequisites exist:
- `{planning_artifacts}/*epic*.md` — if missing: BAIL with "❌ No epics file found. Run /bmad-create-epics-and-stories first."
- `{implementation_artifacts}/sprint-status.yaml` — if missing: BAIL with "❌ sprint-status.yaml not found. Run /bmad-sprint-planning first."

**Resolve dashboard title** (used as `PROJECT_TITLE` in the workflow):

1. If the user provided a `{title}` argument → use it as-is.
2. Otherwise, detect the current branch in the docs repo (`git branch --show-current`):
   - Match pattern: `(project|planning|feature|hotfix)/ghi-{id}-{slug}`
   - Extract `{slug}`, replace hyphens with spaces, title-case each word.
   - Example: `project/ghi-42-tabc-licensing-modernization` → `TABC Licensing Modernization`
3. If no branch match → use `project_name` from config with hyphens replaced by spaces and title-cased.
4. Final fallback → `"Sprint Dashboard"`.

Pass the resolved title to the skill workflow as `PROJECT_TITLE`.

### Step 2: Delegate to Skill

Verify the sprint dashboard skill is installed:

```
.github/i2a-skills/tdgs-aidlc-sprint-dashboard/workflow.md
```

If that file does not exist → **BAIL**:

```
❌ Sprint dashboard skill not installed.

Run /tdgs-aidlc-quick-setup to copy i2a-skills into .github/i2a-skills/, then retry.
```

Read and execute the sprint dashboard skill workflow at the path above.

Follow all phases in the workflow:
1. **PHASE 0: INITIALIZATION** — Load config, resolve paths
2. **PHASE 1: DISCOVER** — Find epics, parse kanban-plan.md for metadata
3. **PHASE 2: BUILD CONFIGURATION** — Construct JavaScript constants from project data
4. **PHASE 3: GENERATE** — Load template, inject configuration, write HTML

### Step 3: Output

After generation, display:
```
✅ Sprint Dashboard generated!

   Location: {implementation_artifacts}/sprint-dashboard.html

   To view:
     cd {implementation_artifacts}
     python3 -m http.server 8080
     → http://localhost:8080/sprint-dashboard.html

   The dashboard auto-refreshes every 5 seconds.
```

## When to Re-Run

Re-run this command when:
- Epics are added, removed, or renamed
- Team size (ADE count) changes
- Kanban plan is regenerated with new milestones/risks
- You want to refresh velocity or timeline projections

You do **NOT** need to re-run when:
- Story statuses change (dashboard reads YAML live)
- Metrics are updated (dashboard reads sprint-metrics.md live)
- Blockers are added/resolved (dashboard reads blockers from YAML live)

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-update-metrics` | Update sprint-status.yaml with timing + Harvey ball metrics |
| `/tdgs-aidlc-manage-blockers` | Add/resolve/update blockers in sprint-status.yaml |
| `/tdgs-aidlc-metrics-report` | Generate a markdown metrics summary report |
| `/tdgs-aidlc-project-kanban-planning` | Generate kanban plan (provides data for the dashboard) |
