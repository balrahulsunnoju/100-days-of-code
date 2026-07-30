---
mode: agent
description: "Generate comprehensive unit tests for all repositories targeting the configured coverage threshold. Discovers testable units from source analysis and covers happy paths, edge cases, and error handling."
---

# Unit Test Generation

Generate comprehensive unit tests for **ALL repositories** targeting ≥`{coverage_target}`% coverage. Uses **two-phase discovery**: Phase 1 (Knowledge Base rules and expected values) and Phase 2 (source code testable unit extraction). Full guardrails, hermeticity contracts, generation rules, and reporting are in the generate-unit-tests skill.

**Do NOT modify production source code** — only create test files and update test configurations.

This prompt is **application-agnostic** — it discovers testable code from source analysis, not from hardcoded module names.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> Unit tests are generated in their standard locations per stack. Do NOT consolidate tests into a separate directory.

## Command Usage

```
/tdgs-aidlc-generate-unit-tests
/tdgs-aidlc-generate-unit-tests {repo}
/tdgs-aidlc-generate-unit-tests {coverage_target}
/tdgs-aidlc-generate-unit-tests {repo} {coverage_target}
/tdgs-aidlc-generate-unit-tests skip_completed=module-a,module-b
/tdgs-aidlc-generate-unit-tests max_tests_per_module={N}
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `repo` | No | All confirmed | Specific repo directory name, or `all` for every detected repo. |
| `coverage_target` | No | `80` or `coverage.json` | Minimum coverage percentage threshold. |
| `skip_completed` | No | None | Comma-separated list of already-completed modules to skip (resumption). |
| `max_tests_per_module` | No | unlimited | Upper bound on generated tests per module. |
| `patch_threshold` | No | `false` | If `true`, update build-file threshold to match `coverage_target`. |

## Prerequisites

**Hard prerequisites (BAIL if missing):**

- `/tdgs-aidlc-setup-unit-tests` — each target repo must have:
  - Test framework configured (JaCoCo/Jest/Vitest/pytest/Coverlet)
  - Coverage threshold set in build files
  - Report generation script at `scripts/generate-report.js` (or Python equivalent)

If the framework is missing, **STOP** and instruct the user to run `/tdgs-aidlc-setup-unit-tests` first.

**Recommended:**

- `*-docs*/project-context.md` for project-specific testing conventions
- `*-docs*/knowledge-base/` for business rules and expected values

## Instructions

### Step 0: Locate Workspace & Confirm Repos

1. Scan workspace for all subdirectories with recognized stack types.
2. Display a numbered table of discovered repos and **ask the user to confirm** which to include (Enter to accept all, or exclude by number).
3. Only process confirmed repos in subsequent steps.

### Step 1: Pre-check Framework Per Repo

For each confirmed repo, verify test framework exists per stack:
- Java: `spring-boot-starter-test` in `pom.xml`, JaCoCo configured
- React/JS: `@testing-library/*` in `package.json`, coverage threshold configured
- Python: `pytest` + `pytest-cov` installed
- C#/.NET: test SDK + coverlet configured

If framework is missing, HALT with instruction to run `/tdgs-aidlc-setup-unit-tests` first.

### Step 2: Resolve Parameters

- Parse `repo`, `coverage_target`, `skip_completed`, `max_tests_per_module` from user input
- If `coverage_target` is missing, read `{repo}/test-results/coverage.json` when present, else prompt (default `80`)
- Detect threshold drift: configured threshold in build files vs runtime `coverage_target`

### Step 3: Delegate to Skill

Read and execute the unit test generation skill workflow:

```
.github/i2a-skills/tdgs-aidlc-generate-unit-tests/workflow.md
```

Pass resolved parameters. Follow `workflow.md` (orchestrator). **Read on demand** from `.github/i2a-skills/tdgs-aidlc-generate-unit-tests/tools/` — `guardrails.md`, `discovery.md`, `pre-write-contract.md`, `generation-rules.md`, `post-generation-checks.md`, `execution-and-reports.md`, `constraints-and-augmentations.md` (see skill `SKILL.md` table). Do not regenerate extracted prose from memory.

### Step 4: Output

After execution, display per-repo coverage, report paths, and defect summary:

```
✅ Unit test generation complete!

   {repo}/test-results/
     test-summary.html   test-report.md

   Coverage vs target: {actual}% / {coverage_target}%
   Defects found: {N} (tests enabled, build may fail — dev team owns fixes)
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-setup-unit-tests` | Scaffold framework (required before generate) |
| `/tdgs-aidlc-run-tests` | Re-run tests without full regeneration |
| `/tdgs-aidlc-generate-api-tests` | API integration tests (separate from unit tests) |
| `/tdgs-aidlc-generate-functional-tests` | Playwright E2E tests (separate from unit tests) |
