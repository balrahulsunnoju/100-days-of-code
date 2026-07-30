---
name: tdgs-aidlc-project-kanban-planning
description: 'Orchestrate full sprint-ready planning — detects missing prerequisites (epics, sprint-status), delegates to BMAD skills to fill gaps, then generates kanban plan, dashboard, and sprint metrics. Use when the user says "generate kanban plan", "create kanban artifacts", "run kanban planning", "plan the sprint", "update kanban parameters", "change team size", "change ADE count", "recalculate with target date", or "update plan capacity"'
---

# Kanban Planning — Skill Router

Orchestrate full sprint-ready planning: detect missing prerequisites, delegate to BMAD skills, generate kanban plan + dashboard + sprint metrics.

## Artifact Table (read on demand)

| File | Purpose | When to Read |
|------|---------|--------------|
| `workflow.md` | Step-by-step orchestrator (Phases 0–4) | Always — first file after SKILL.md |

## Key Contracts

- **Prerequisite auto-fill:** If epics or sprint-status are missing, delegates to BMAD `create-epics-and-stories` and `sprint-planning` before proceeding
- **Two modes:** `new` (full Phases 0–4) vs `update` (reload params, skip to Phase 3)
- **Capacity-based scheduling:** Uses `ade_count × hours_per_day × (1 - contingency_pct)` to compute available capacity
- **Dependency-aware ordering:** Stories are scheduled respecting inter-story and inter-epic dependencies
- **Dashboard integration:** Triggers the `sprint-dashboard` skill for HTML generation after plan creation

## Pipeline Position

```
[/bmad-create-epics-and-stories] + [/bmad-sprint-planning]
   → [/tdgs-aidlc-project-kanban-planning ← this]
      → [/tdgs-aidlc-generate-dashboard]
```
