---
name: tdgs-aidlc-sprint-dashboard
description: 'Generate a live HTML sprint dashboard with real-time KPIs, Harvey ball quality metrics, blocker tracking, and critical path visualization. Reads sprint-status.yaml and sprint-metrics.md, auto-refreshes every 5 seconds. Use when the user says "generate dashboard", "create sprint dashboard", "build dashboard", or "update dashboard"'
---

Follow the instructions in ./workflow.md.

## Sub-Workflows

Sub-workflows use `instructions.md` files (not `SKILL.md`) as their entry point.
This is intentional: sub-workflows are internal implementation details of the
sprint-dashboard skill, not independently invocable skills. The parent `SKILL.md`
delegates to them; they are not registered in the top-level skill catalog.

| Workflow | Prompt | Purpose |
|----------|--------|---------|
| `workflows/update-sprint-metrics/` | `/tdgs-aidlc-update-metrics` | Update timing + Harvey ball metrics after story status change |
| `workflows/manage-blockers/` | `/tdgs-aidlc-manage-blockers` | Add/resolve/update blockers in sprint-status.yaml |
| `workflows/sprint-metrics-report/` | `/tdgs-aidlc-metrics-report` | Generate markdown metrics summary report |

## Reference Data

- `data/color-schemes/` — Color scheme YAMLs (`default.yaml`, `deloitte.yaml`, `custom-template.yaml`) that override the template's CSS custom properties; copy `custom-template.yaml` to `_bmad/_config/dashboard-colors.yaml` for project-level theming
- `data/metric-definitions.csv` — Canonical metric dimension definitions for reference
- `tools/metrics-calculator.md` — Reusable Harvey ball calculation logic
- `tools/yaml-format-spec.md` — sprint-status.yaml format specification
