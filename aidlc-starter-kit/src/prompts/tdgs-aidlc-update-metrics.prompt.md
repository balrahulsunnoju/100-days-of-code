---
mode: agent
description: "Update sprint-status.yaml with timestamps and Harvey ball quality metrics after a story status change."
---

# Update Sprint Metrics

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

You are helping a user update `sprint-status.yaml` with timing timestamps and Harvey ball quality metrics after a story status change. This keeps the live sprint dashboard current with accurate progress data.

## When to Use

Run this command after:
- A story file is created (`backlog` → `ready-for-dev`)
- Development begins on a story (`ready-for-dev` → `in-progress`)
- A story is submitted for review (`in-progress` → `review`)
- A story passes code review (`review` → `done`)

## Command Usage

```
/tdgs-aidlc-update-metrics
```

The agent will ask for:
1. **Story key** — e.g., `1-1-story-name` (the key from sprint-status.yaml)
2. **New status** — e.g., `in-progress`, `review`, or `done`

Or provide inline:
```
/tdgs-aidlc-update-metrics 1-1-story-name → in-progress
```

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

### Step 1: Load Configuration

Read `{project-root}/_bmad/bmm/config.yaml` to resolve:
- `implementation_artifacts` path
- Sprint status path: `{implementation_artifacts}/sprint-status.yaml`

### Step 2: Delegate to Workflow

Read and execute the update-sprint-metrics workflow:

```
.github/i2a-skills/tdgs-aidlc-sprint-dashboard/workflows/update-sprint-metrics/instructions.md
```

Follow all steps:
- If story key not found in sprint-status.yaml: BAIL with "❌ Story '{key}' not found in sprint-status.yaml"
- If status transition is invalid (e.g., done → in-progress): BAIL with "❌ Invalid transition: {current} → {target}"

1. **Load and validate** — Read YAML, find story, validate transition
2. **Calculate metrics and timing** — Generate UTC timestamp, apply status-specific updates
3. **Update sprint status file** — Write changes, update `last_updated`, preserve comments

### Step 3: Confirm

Display the update confirmation with story key, new status, timing fields, and metrics.

## Critical Rules

- **Timestamps must be UTC** with Z suffix (e.g., `2026-05-18T14:39:00Z`)
- **Never reuse** a timestamp from earlier in the session — generate at moment of write
- **Preserve** all existing YAML comments and structure
- **Update `last_updated`** at root level (this is what the dashboard reads for "Status Updated" timestamp)
- **Convert** simple format entries (`story-name: backlog`) to object format when adding timing/metrics

## Harvey Ball Metrics (0–4 scale)

| Metric | What it measures |
|--------|-----------------|
| impl | Task/subtask completion ratio |
| test | Test coverage and pass rate |
| review | Code review findings severity |
| docs | Documentation completeness (Dev Notes, File List, Change Log) |
| arch | Architecture pattern compliance |
| qa | Quality gate status |
| a11y | Accessibility (write `0` in YAML for backend stories; dashboard displays as "N/A") |

Refer to `.github/i2a-skills/tdgs-aidlc-sprint-dashboard/workflows/update-sprint-metrics/steps/step-02-calculate.md` for detailed scoring rules.

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-generate-dashboard` | Generate/regenerate the HTML dashboard |
| `/tdgs-aidlc-manage-blockers` | Add/resolve blockers |
| `/tdgs-aidlc-metrics-report` | Generate markdown metrics report |
