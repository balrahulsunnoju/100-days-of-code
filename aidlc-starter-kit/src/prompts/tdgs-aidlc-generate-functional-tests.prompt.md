---
mode: agent
description: "Generate and execute comprehensive Playwright functional test suites inside the UI repository, driven by workspace discovery of business rules, routes, components, API contracts, and flow descriptors."
---

# Functional Test Generation

Generate and execute Playwright functional test suites for the UI repository. Uses **multi-phase discovery**: Phase 0a (flow descriptors), Phase 1 (Knowledge Base), Phase 2 (source code), Phase 3 (reconciliation). Full guardrails, pre-write contract, generation, post-generation checks, execution, and reporting are in the generate-functional-tests skill.

**Do NOT modify production source code** — only create or update files under `{ui-repo}/functional-tests/`.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Command Usage

```
/tdgs-aidlc-generate-functional-tests
/tdgs-aidlc-generate-functional-tests {mode}
/tdgs-aidlc-generate-functional-tests {mode} {flows}
/tdgs-aidlc-generate-functional-tests coverage_target={N}
/tdgs-aidlc-generate-functional-tests max_tests={N}
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `ui_repo` | No | Auto-detect | UI repo directory name |
| `mode` | No | Ask (G3) | `mock` or `real` |
| `flows` | No | Ask (G3) | `all` or comma-separated flow IDs |
| `categories` | No | Ask (G3) | `all`, `positive`, `positive+negative`, or list |
| `coverage_target` | No | `80` | % of flow×case×persona matrix that must be filled |
| `max_tests` | No | unlimited | Upper bound on generated tests |

## Prerequisites

**Hard prerequisites (BAIL if missing):**

- `/tdgs-aidlc-setup-functional-tests` — UI repo must have:
  - `playwright.config.js`
  - `functional-tests/support/` (helpers, fixtures, page-objects)
  - `functional-tests/scripts/generate-report.js`

If the framework is missing, **STOP** and instruct the user to run `/tdgs-aidlc-setup-functional-tests` first.

**Recommended:**

- `*-docs*/project-context.md` and `knowledge-base/` for Phase 1 discovery
- `/tdgs-aidlc-setup-testdata` — `test-data/test-data-catalog.yaml` for `identityPools[]`, `uiScreens[]`, `apiChain[]`

## Instructions

### Step 0: Locate Workspace & Confirm UI Repo

1. Scan workspace for UI repos (detect by `package.json` + React/Angular/Vue deps or `playwright.config.js`).
2. If multiple UI repos found, ask user to confirm target.
3. Verify framework pre-requisites exist.

### Step 1: Interview (G3)

If parameters not provided via command, ask:
- Q1: Mode — `mock` (offline, page.route mocks) or `real` (live backends)?
- Q2: Flows — `all` or specific flow IDs?
- Q3: Categories — `all`, `positive only`, `positive+negative`, or specific list?
- Q4: Coverage target — default 80%?

### Step 2: Delegate to Skill

Read and execute the functional test generation skill workflow:

```
.github/i2a-skills/tdgs-aidlc-generate-functional-tests/workflow.md
```

Pass resolved parameters. Follow `workflow.md` (orchestrator). **Read on demand** from `.github/i2a-skills/tdgs-aidlc-generate-functional-tests/tools/` — `guardrails.md`, `discovery.md`, `pre-write-contract.md`, `generation-rules.md`, `gap-analysis.md`, `post-generation-checks.md`, `execution-and-reports.md`, `phase-4-augmentations.md` (see skill `SKILL.md` table). Do not regenerate extracted prose from memory.

### Step 3: Output

After execution, display results:

```
✅ Functional test generation complete!

   {ui-repo}/functional-tests/test-results/
     html-report/index.html   results.json   test-report.md   data-ledger.json

   Coverage: {actual}% / {coverage_target}%
   Tests: {total} (✅ {passed} | ❌ {failed} | ⚠️ {skipped})
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-setup-functional-tests` | Scaffold framework (required before generate) |
| `/tdgs-aidlc-setup-testdata` | Test data catalog and identity pools |
| `/tdgs-aidlc-run-tests` | Re-run tests without full regeneration |
