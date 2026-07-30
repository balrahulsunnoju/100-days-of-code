# Sprint Status YAML Format Specification

## Overview
The sprint-status.yaml file tracks development progress with timing and quality metrics.

## File Structure

### Header Section
```yaml
generated: {ISO timestamp}
project: {name}
project_key: {key}
tracking_system: bmad
story_location: {path}
last_updated: {ISO timestamp with Z suffix}
```

### Blockers Section (optional)
```yaml
blockers:
  - story: 1-1-story-name
    summary: "Brief description of the blocker"
    impact: high
    identified: 2026-05-18T14:30:00Z
    resolved: null
    resolution: null
    blocked_tasks: "Which tasks are blocked"
    action_needed: "What action is needed to resolve"
```

### Development Status Section
```yaml
development_status:
  epic-N: {status}
  N-M-story-name: {status or object}
  epic-N-retrospective: optional
```

## Entry Formats

### Simple Format (backlog stories)
```yaml
1-1-story-name: backlog
```

### Object Format (active/completed stories)
```yaml
1-1-story-name:
  status: done
  story_file: 1-1-story-name.md
  created: 2026-02-16T08:00:00Z
  started: 2026-02-16T09:00:00Z
  completed: 2026-02-16T12:30:00Z
  metrics:
    impl: 4
    test: 4
    review: 4
    docs: 3
    arch: 4
    qa: 4
    a11y: 3

# Follow-up story created by course correction (optional field)
2-3a-payment-validation-fix:
  status: ready-for-dev
  story_file: 2-3a-payment-validation-fix.md
  supersedes: 2-3-payment-validation
```

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `supersedes` | string | Story key of the original story this follow-up replaces (set by course correction for done-story follow-ups) |

## Status Values

### Epic Status
- `backlog` - Epic not yet started
- `in-progress` - Epic actively being worked on
- `done` - All stories in epic completed

### Story Status
- `backlog` - Story only exists in epic file
- `ready-for-dev` - Story file created in stories folder
- `in-progress` - Developer actively working on implementation
- `review` - Ready for code review
- `done` - Story completed

## Timing Fields

| Field | Set By | When |
|-------|--------|------|
| created | create-story workflow | Story file created |
| started | dev-story workflow | Developer begins work |
| completed | code-review workflow | Story approved |

All timestamps MUST be UTC with Z suffix (e.g., `2026-05-18T14:39:00Z`).

### Duration Calculation
```
duration = completed - started
```

## Metrics (Harvey Balls)

### Scale
| Score | Visual | Meaning |
|-------|--------|---------|
| 0 | Empty circle | Not started / N/A |
| 1 | Quarter fill | ~25% complete |
| 2 | Half fill | ~50% complete |
| 3 | Three-quarter fill | ~75% complete |
| 4 | Full circle | 100% complete |

### Metric Definitions
| ID | Name | Description |
|----|------|-------------|
| impl | Implementation | Task/subtask completion ratio |
| test | Tests | Test coverage and pass rate |
| review | Code Review | Review status and findings |
| docs | Documentation | Documentation completeness |
| arch | Architecture | Architecture pattern compliance |
| qa | QA Gate | Quality assurance status |
| a11y | Accessibility | WCAG compliance level (0 for backend stories — dashboard displays as N/A based on UI_STORIES) |

## Backward Compatibility

### Reading Files
Agents must handle both formats when reading:
```javascript
function getStoryStatus(entry) {
  if (typeof entry === 'string') {
    return entry;  // Simple format
  }
  return entry.status;  // Object format
}
```

### Writing Files
- Simple format: Use for new backlog stories
- Object format: Use when timing or metrics are added
- Preserve comments when updating existing files
