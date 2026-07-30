---
name: tdgs-aidlc-ops-runbook
description: 'Update an existing runbook (.docx or .md) for a release, or create a new .md runbook from the Texas.gov Run Book Template. Application-agnostic — discovers details from workspace. Uses implementation plan version matrix as release scope. Use when the user says "update runbook", "create runbook", "sync runbook", or runs /tdgs-aidlc-ops-runbook'
---

## Mode Dispatch

| User selects | Workflow | Output |
|--------------|----------|--------|
| **Update** (existing `.docx` or `.md`) | `./workflow.md` | Surgically edited runbook (release-scoped changes only) + change manifest |
| **Create** (new `.md` from template) | `./workflow-create.md` | `.md` runbook + Mermaid diagrams (.mmd + .svg) + screenshots (Phase 5, if test/staging URL provided) |

## Reference Artifacts (Create mode — read on demand)

| Artifact | Path | Notes |
|----------|------|-------|
| **Organization defaults** | `config/org-defaults.yaml` | **READ FIRST** — constants for all apps (contacts, CI/CD, gateway) |
| Guardrails (Create) | `tools/guardrails-create.md` | Full guardrail definitions |
| Section grounding rules | `tools/section-grounding.md` | Per-section fill rules |
| Diagram standards | `tools/diagram-standards.md` | Color palette, syntax examples |
| Post-generation checks | `tools/post-generation-checks.md` | Verification checklist (20 checks) |
| Runbook template | `templates/runbook-md.template.md` | Section structure to follow |
| Diagram render script | `scripts/render-diagrams.sh` | Batch render `.mmd` → `.svg` |
| Screenshot capture script | `scripts/capture-screenshots.js` | Auto-captures UI pages from test/staging (Phase 5, Playwright) |

> **Precedence:** If `workflow-create.md` inline rules conflict with `tools/` reference docs, the **workflow rules take precedence** (they are the latest-updated authoritative source).

## Parameters (passed from prompt)

| Parameter | Required | Description |
|-----------|----------|-------------|
| `runbook_path` | For update mode | Path to existing `.docx` or `.md` runbook file |
| `release_source` | Required (update) | Path to implementation plan `.md` file OR manual repo+version list |
| `mode` | Optional | `update` (default) or `create` — pass via command argument to skip intake question |

## Critical Principles

- **Release-scoped** — update mode edits ONLY sections affected by repos in the implementation plan version matrix. Everything else is untouched.
- **Implementation plan is source of truth** — the version matrix defines which repos and versions are in scope. No change briefs needed.
- **Exhaustive scan** — read ALL knowledge-base docs and ALL relevant source code for in-scope repos before writing. No exceptions.
- **Comprehend before edit** — read the ENTIRE document structure, identify patterns, understand voice
- **Clone, never create** — every new paragraph inherits formatting from its nearest sibling (deep-copy `w:pPr` + `w:rPr`) *(Update .docx)*
- **Place by semantics** — insertion point determined by which SERVICE/COMPONENT the content belongs to, not by keyword matching
- **Preserve descriptive content** — never delete, rename, or overwrite prose. Version numbers, URLs, and dates may be updated in-place. *(Update mode)*
- **Write for ops** — internal class names go in Source Files only, descriptions use plain operational language
- **No fabrication** — every sentence traces to source code or KB. Unverifiable facts get `[VERIFY: specific guidance]`. Never hallucinate.
- **Read-only workspace** — ONLY the runbook file is modified. Source code, KB, configs, git state are strictly read-only.
- **Diagrams from evidence** — every node in a C4/sequence diagram must trace to a discovered source file *(Create mode)*
