---
mode: agent
description: "Generate a markdown sprint metrics summary with velocity, completion rate, and cycle time."
---

# Sprint Metrics Report

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

You are helping a user generate a markdown metrics summary report from `sprint-status.yaml`. This report provides a snapshot of project progress, Harvey ball quality scores, and identifies stories needing attention.

## Command Usage

```
/tdgs-aidlc-metrics-report
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
- `project_name`
- `implementation_artifacts` path
- Sprint status path: `{implementation_artifacts}/sprint-status.yaml`
- Output path: `{implementation_artifacts}/sprint-metrics-report.md`

### Step 2: Delegate to Workflow

Read and execute the sprint-metrics-report workflow:

```
.github/i2a-skills/tdgs-aidlc-sprint-dashboard/workflows/sprint-metrics-report/instructions.md
```

Follow all steps:
- If `sprint-status.yaml` does not exist or has no stories: BAIL with "❌ No sprint data available for report generation"

1. **Load sprint status data** — Parse YAML, calculate aggregate stats
2. **Calculate metrics summaries** — Per-metric averages, identify attention stories
3. **Generate report** — Populate template, write to output file

### Step 3: Confirm

```
✅ Sprint metrics report generated at {implementation_artifacts}/sprint-metrics-report.md
```

## Report Contents

The generated report includes:

| Section | Content |
|---------|---------|
| **Summary** | Total epics, stories, completion %, dev time |
| **Epic Status** | Per-epic progress and timing |
| **Quality Metrics Overview** | Average/min/max per Harvey ball dimension |
| **Story Metrics Summary** | Per-story Harvey ball scores with symbols |
| **Stories Needing Attention** | Stories with any metric below 3 |
| **Quality Gaps** | Priority-ranked gaps with recommended actions |
| **Completed Stories** | Duration and final metric scores |

## Harvey Ball Symbols

The report uses standard Harvey ball symbols:

| Symbol | Score | Meaning |
|:------:|:-----:|---------|
| ○ | 0 | Not started / N/A |
| ◔ | 1 | Minimal / Major issues |
| ◑ | 2 | Partial / Moderate issues |
| ◕ | 3 | Mostly complete / Minor issues |
| ● | 4 | Complete / Fully compliant |

## Dashboard Integration

The sprint dashboard HTML reads `sprint-metrics.md` (not `sprint-metrics-report.md`) for its Harvey Ball Quality Metrics section. This command generates `sprint-metrics-report.md` as a standalone summary artifact. To update the dashboard's live metrics display, ensure `sprint-metrics.md` is kept current — the kanban planning skill (`/tdgs-aidlc-project-kanban-planning`) generates and maintains that file.

## When to Run

- After completing code reviews (stories get final metrics)
- Before sprint retrospectives or status meetings
- When you want a snapshot of quality for reporting
- After running `/tdgs-aidlc-update-metrics` on multiple stories

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-update-metrics` | Update sprint-status.yaml with timing + metrics |
| `/tdgs-aidlc-manage-blockers` | Add/resolve blockers |
| `/tdgs-aidlc-generate-dashboard` | Generate/regenerate the HTML dashboard |
