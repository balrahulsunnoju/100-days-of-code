# i2a-manage-review

ACE-only skill for running adversarial and persona-based reviews of the AIDLC Starter Kit. Six specialist personas each review the kit through their professional lens, producing prioritized findings with concrete resolution approaches. Blocker, Critical, and High findings can be auto-fixed.

## Audience

ACEs only. This skill is **not** distributed to user workspaces.

## Invocation

```
/i2a-manage-review
/i2a-manage-review review
/i2a-manage-review review --persona architect,qa
/i2a-manage-review fix
/i2a-manage-review fix RV-C001
/i2a-manage-review fix RV-C001 RV-H003
/i2a-manage-review report
```

## Modes

| Mode | Description | Modifies Files? |
|------|-------------|----------------|
| `review` | Full adversarial review across all 6 personas (default) | No (generates report) |
| `review --persona X,Y` | Review using only selected personas | No |
| `fix` | Re-read previous review findings; auto-fix Blocker/Critical/High items with ACE approval | Yes |
| `fix RV-{id}` | Fix a single finding by ID (or multiple space-separated IDs) | Yes |
| `report` | Regenerate review report from last scan without re-analyzing | No |

Default mode (no argument): `review` with all personas.

## Design Philosophy

Combines two review patterns from BMAD v6.3.0:

**Adversarial Review** -- every persona MUST find issues. Zero findings triggers re-analysis. This prevents rubber-stamp "looks good" approvals and forces genuine analysis. Expect false positives; the ACE decides what's real.

**Party Mode (Persona-Based)** -- multiple specialist perspectives review the same codebase. Each persona has a distinct professional lens, review scope, and set of questions. Cross-cutting findings (flagged by multiple personas) get severity bumped.

**Fact-Check Gate** -- every finding's factual claims ("X is missing", "only N entries exist") are verified with targeted searches or terminal commands BEFORE inclusion in the report. This eliminates false positives from partial file reads or stale assumptions.

## Severity Model

| Severity | Definition | Auto-Fix? |
|----------|-----------|-----------|
| **Blocker** | Prevents correct operation; broken workflows, missing critical files, contradictory instructions | Yes |
| **Critical** | Significant gap that misleads agents or users; wrong cross-references, stale behavioral rules, security gaps | Yes |
| **High** | Material quality issue that degrades experience; inconsistent patterns, missing coverage, unclear guidance | Yes |
| **Medium** | Improvement opportunity; suboptimal structure, missing examples, minor inconsistencies | Report only |
| **Low** | Nitpick or polish; formatting, wording preferences, optional enhancements | Report only |

## Review Personas

Six persona definition files in `personas/`:

| Persona | File | Review Lens |
|---------|------|-------------|
| **Architect** | `personas/architect.md` | Structure, boundaries, data flow, naming consistency, separation of concerns |
| **PM** | `personas/pm.md` | Feature completeness, user value, workflow coverage, role parity |
| **Dev** | `personas/dev.md` | Prompt clarity for AI agents, implementation ambiguity, developer experience |
| **QA** | `personas/qa.md` | Test coverage, quality gates, edge cases, regression protection |
| **BA** | `personas/ba.md` | Requirements traceability, terminology consistency, specification completeness |
| **UX** | `personas/ux.md` | Workflow ergonomics, documentation navigability, learning curve |

## Output

| Document | Path | Purpose |
|----------|------|---------|
| Review Report | `doc/contributing/review-report.md` | All findings grouped by severity with resolution approaches |

### Finding Format

Each finding includes:

- **ID:** `RV-{severity_letter}{sequence}` (e.g., `RV-B001`, `RV-C003`, `RV-H012`)
- **Severity:** Blocker / Critical / High / Medium / Low
- **Personas:** Which personas flagged this (cross-cutting findings noted)
- **Location:** File path and section/line reference
- **Description:** What's wrong or missing
- **Impact:** Why it matters
- **Resolution:** Specific fix approach (for Blocker/Critical/High)
- **Status:** OPEN / RESOLVED

## Scan Sources

All review personas analyze:

- `src/prompts/` -- all prompt files
- `src/i2a-skills/` -- custom skill directories
- `src/i2a-config.yml` -- configuration template
- `doc/` -- all user-facing guides
- `doc/contributing/` -- ACE docs, specs (if they exist), catalog
- `test/` -- test suite files and simulation rules
- `README.md`, `package.json`, `VERSION`, `NEXT_VERSION`
- `.github/workflows/` -- CI/CD pipeline (including NEXT_VERSION override flow)

BA and PM personas additionally read `doc/contributing/functional-specification.md` and `doc/contributing/technical-specification.md` (if present) to cross-check requirements traceability.

## Execution Model

This skill is designed for **GitHub Copilot Chat** and uses **parallel tool calls** wherever sub-tasks are independent:

- **Phase 1 (Load Context):** All codebase file reads (prompts, skills, guides, tests, config) run in a single parallel batch
- **Phase 2 (Persona Reviews):** All 6 persona reviews run **concurrently** — this is the highest-impact parallelization point since each persona analyzes the same codebase independently through a different lens

See `workflow.md` for the specific parallel batch definitions.

## Workflow

Read and follow: `./workflow.md`
