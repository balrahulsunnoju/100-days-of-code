---
mode: agent
description: "Orchestrate sprint-ready kanban planning with prerequisite detection and dashboard generation."
---

# Project Kanban Planning

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

You are helping an Engineering Manager orchestrate full sprint-ready planning — detecting missing prerequisites (epics, sprint-status), delegating to BMAD skills to fill gaps, then generating a kanban plan with dependency graph, dashboard, and Harvey Ball sprint metrics.

## Command Usage

```
/tdgs-aidlc-project-kanban-planning
/tdgs-aidlc-project-kanban-planning update
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `update` | No | Reload existing plan parameters and prompt for changes. Skips prerequisite checks and jumps directly to the planning phase. |

## Prerequisites

Before running this command, the following **must** exist:
- **PRD** — `{planning_artifacts}/*prd*.md` (created by `/bmad-create-prd`)
- **Architecture** — `{planning_artifacts}/*architecture*.md` (created by `/bmad-create-architecture`)

The following are **soft prerequisites** — they will be auto-generated if missing:
- **Epics** — `{planning_artifacts}/*epic*.md` (delegated to `/bmad-create-epics-and-stories`)
- **Sprint Status** — `{implementation_artifacts}/sprint-status.yaml` (delegated to `/bmad-sprint-planning`)

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

### Step 1: Load Configuration & Validate Hard Prerequisites

Read `{project-root}/_bmad/bmm/config.yaml` to resolve:
- `project_name`
- `implementation_artifacts` path
- `planning_artifacts` path

Verify hard prerequisites exist:
- `{planning_artifacts}/*prd*.md` — if missing: BAIL with "❌ PRD not found. Run /bmad-create-prd first."
- `{planning_artifacts}/*architecture*.md` — if missing: BAIL with "❌ Architecture document not found. Run /bmad-create-architecture first."

### Step 2: Delegate to Skill

Read and execute the kanban planning skill:

```
.github/i2a-skills/tdgs-aidlc-project-kanban-planning/workflow.md
```

Pass through the user's arguments (including `update` if provided).

Follow all phases in the workflow:
1. **PHASE 0: INITIALIZATION** — Detect mode (new vs update), prompt for capacity inputs (ADE count or target date)
2. **PHASE 1: PREREQUISITE CHECK** — Scan for epics and sprint-status; report findings
3. **PHASE 2: DELEGATE** — Fill missing soft prerequisites by delegating to BMAD skills (epics, sprint-planning)
4. **PHASE 3: GENERATE** — Parse epics, build dependency graph, generate kanban-plan.md, dashboard.md, sprint-metrics.md
5. **PHASE 4: DASHBOARD** — Delegate to `tdgs-aidlc-sprint-dashboard` skill for live HTML generation

### Step 3: Output

After generation, display:
```
✅ Kanban Planning Artifacts Generated!

   kanban-plan.md     — dependency graph, pull sequence, timeline projections
   dashboard.md       — progress overview, epic status, ready-to-pull queue
   sprint-metrics.md  — Harvey Ball quality metrics per story
   sprint-dashboard.html — live auto-refreshing HTML dashboard

   Location: {implementation_artifacts}/

   To view the live dashboard:
     cd {implementation_artifacts}
     python3 -m http.server 8080
     → http://localhost:8080/sprint-dashboard.html
```

## When to Re-Run

Re-run this command when:
- Team size (ADE count) changes — use `update` mode
- Capacity assumptions change (hours/day, contingency, target date) — use `update` mode
- Epics are modified (stories added, removed, or re-scoped)
- Stories change status (new completions, new in-progress)
- After each epic completion (milestone checkpoint)

You do **NOT** need to re-run when:
- Story statuses change (the live HTML dashboard reads YAML live)
- Metrics are updated (the live HTML dashboard reads sprint-metrics.md live)
- Blockers are added/resolved (the live HTML dashboard reads blockers from YAML live)

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-generate-dashboard` | Regenerate live HTML dashboard only (without re-planning) |
| `/tdgs-aidlc-update-metrics` | Update sprint-status.yaml with timing + Harvey ball metrics |
| `/tdgs-aidlc-manage-blockers` | Add/resolve/update blockers in sprint-status.yaml |
| `/tdgs-aidlc-metrics-report` | Generate a markdown metrics summary report |
| `/tdgs-aidlc-project-course-correction` | Accept mid-project change requests and update planning artifacts |
