# Update Sprint Metrics Workflow

**Goal:** Update sprint-status.yaml with timing timestamps and Harvey ball quality metrics when a story changes status.

**Trigger:** Run after a story status change (e.g., after `/bmad-create-story`, `/bmad-dev-story`, or `/bmad-code-review`).

---

## Configuration

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:
- `implementation_artifacts` path
- `sprint_status_path` = `{implementation_artifacts}/sprint-status.yaml`

---

## Workflow

### Step 1: Load and validate sprint status

- Read `{sprint_status_path}`
- Find story entry for the specified story key
- Validate status transition is allowed
- If story not found: HALT with error message

**Follow:** `./steps/step-01-load-status.md`

### Step 2: Calculate metrics and timing

- Generate UTC timestamp at EXACT moment of write
- Apply status-specific timing and metrics
- Calculate Harvey ball scores based on story content

**Follow:** `./steps/step-02-calculate.md`

### Step 3: Update sprint status file

- Convert story entry to object format if needed
- Apply status, timing, and metrics
- Update top-level `last_updated` to current UTC ISO timestamp
- Preserve all existing fields and comments
- Save sprint-status.yaml
- Update sprint-metrics.md "Last Updated" field to same timestamp

**Follow:** `./steps/step-03-update.md`

---

## Usage

```
/tdgs-aidlc-update-metrics

Specify the story and new status:
  Story: 1-1-story-name
  New Status: in-progress
```

The agent will prompt for the story key and target status if not provided inline.
