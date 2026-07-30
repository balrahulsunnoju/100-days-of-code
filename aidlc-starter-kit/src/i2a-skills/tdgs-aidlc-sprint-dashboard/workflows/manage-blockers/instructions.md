# Manage Blockers Workflow

**Goal:** Add, resolve, or update blockers in sprint-status.yaml. Blockers surface in the dashboard's "Needs Attention" section.

---

## Configuration

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:
- `implementation_artifacts` path
- `sprint_status_path` = `{implementation_artifacts}/sprint-status.yaml`

---

## Step 1: Determine action and gather info

Identify action: `add` | `resolve` | `update`

**If action == 'add':**
- Require: story_key, summary, impact (high/medium/low)
- Optional: blocked_tasks, action_needed

**If action == 'resolve':**
- Require: story_key (or summary match), resolution

**If action == 'update':**
- Require: story_key (or summary match), fields to update

---

## Step 2: Load sprint-status.yaml

- Read `{sprint_status_path}`
- Parse YAML preserving all comments and structure
- Locate or create the `blockers` array at root level

---

## Step 3: Apply blocker change

**If action == 'add':**
Append new blocker entry to the blockers array:
```yaml
blockers:
  - story: {story_key}
    summary: "{summary}"
    impact: {impact}
    identified: {current_utc_iso_timestamp}
    resolved: null
    resolution: null
    blocked_tasks: "{blocked_tasks}"
    action_needed: "{action_needed}"
```

**If action == 'resolve':**
- Find matching blocker by story_key (and optionally summary)
- Set `resolved: {current_utc_iso_timestamp}`
- Set `resolution: "{resolution}"`
- Set `action_needed: null`

**If action == 'update':**
- Find matching blocker by story_key
- Update provided fields (summary, impact, blocked_tasks, action_needed)

---

## Step 4: Save and confirm

- Update `last_updated` at root level to current UTC ISO timestamp
- Save sprint-status.yaml
- Output confirmation:

**If add:** `🚫 Blocker added: {summary} (Story {story_key}, Impact: {impact})`

**If resolve:** `✅ Blocker resolved: {summary} — {resolution}`

**If update:** `📝 Blocker updated: {summary}`

---

## Blocker Schema

```yaml
blockers:
  - story: 1-1-story-name          # Story key experiencing the blocker
    summary: "Brief description"     # What is blocked
    impact: high                     # high | medium | low
    identified: 2026-05-18T14:30:00Z # When identified (UTC)
    resolved: null                   # null or UTC timestamp when resolved
    resolution: null                 # null or how it was resolved
    blocked_tasks: "Task list"       # Which tasks are blocked
    action_needed: "Action needed"   # What action is needed to resolve
```

Active blockers (resolved: null) surface in the dashboard's "Needs Attention" section with red blocker cards.
