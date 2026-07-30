---
mode: agent
description: "Add, resolve, or update blockers on stories in sprint-status.yaml."
---

# Manage Blockers

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

You are helping a user add, resolve, or update blockers in `sprint-status.yaml`. Active blockers surface in the sprint dashboard's "Needs Attention" section as red blocker cards with impact levels and required actions.

## Command Usage

```
/tdgs-aidlc-manage-blockers
```

The agent will ask for the action type and relevant details. Or provide inline:

```
/tdgs-aidlc-manage-blockers add 1-1-story-name "Docker org policy blocks container creation" impact:high
/tdgs-aidlc-manage-blockers resolve 1-1-story-name "Switched to personal Docker account"
/tdgs-aidlc-manage-blockers update 1-1-story-name action_needed:"Escalate to DevOps team"
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

Read and execute the manage-blockers workflow:

```
.github/i2a-skills/tdgs-aidlc-sprint-dashboard/workflows/manage-blockers/instructions.md
```

Follow all steps:
- If `sprint-status.yaml` does not exist or cannot be parsed: BAIL with "❌ sprint-status.yaml not found or invalid at {path}"

1. **Determine action** — add, resolve, or update
2. **Load sprint-status.yaml** — Parse YAML, locate/create `blockers` array
3. **Apply blocker change** — Add new entry, resolve existing, or update fields
4. **Save and confirm** — Update `last_updated`, write file, output confirmation

## Actions

### Add a Blocker

Required:
- `story_key` — Which story is blocked (e.g., `1-1-story-name`)
- `summary` — Brief description of the blocker
- `impact` — `high`, `medium`, or `low`

Optional:
- `blocked_tasks` — Which specific tasks are blocked
- `action_needed` — What action is needed to resolve

### Resolve a Blocker

Required:
- `story_key` — Which story's blocker to resolve
- `resolution` — How the blocker was resolved

### Update a Blocker

Required:
- `story_key` — Which story's blocker to update
- Fields to update (summary, impact, blocked_tasks, action_needed)

## Blocker Schema in sprint-status.yaml

```yaml
blockers:
  - story: 1-1-story-name
    summary: "Brief description"
    impact: high
    identified: 2026-05-18T14:30:00Z
    resolved: null
    resolution: null
    blocked_tasks: "Task list"
    action_needed: "Required action"
```

## Dashboard Integration

Active blockers (where `resolved: null`) appear in the dashboard's "Needs Attention" section:
- Red blocker cards with impact badge
- Affected tasks listed
- Required action highlighted
- "Since" date from `identified` timestamp

Resolved blockers no longer show in the dashboard but remain in the YAML for audit trail.

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-update-metrics` | Update sprint-status.yaml with timing + metrics |
| `/tdgs-aidlc-generate-dashboard` | Generate/regenerate the HTML dashboard |
| `/tdgs-aidlc-metrics-report` | Generate markdown metrics report |
