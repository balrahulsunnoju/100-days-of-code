---
mode: agent
description: "Generate and execute a comprehensive API test suite inside each backend service repository, driven by workspace discovery of endpoints, request/response models, validation annotations, and business logic."
---

# API Test Generation

Generate and execute API test suites per backend service. Uses **two-phase discovery**: Phase 1 (Knowledge Base contracts) and Phase 2 (source-code augmentation). Full guardrails, field hierarchy, chain map, generation, execution, and reporting are in the generate-api-tests skill.

**Do NOT modify production source code** — only create or update files under each service's `api-tests/` directory.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Command Usage

```
/tdgs-aidlc-generate-api-tests
/tdgs-aidlc-generate-api-tests {service}
/tdgs-aidlc-generate-api-tests {coverage_target}
/tdgs-aidlc-generate-api-tests {service} {coverage_target}
/tdgs-aidlc-generate-api-tests max_tests={N}
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `service` | No | All confirmed | Specific service repo directory name, or `all` for every confirmed backend service. |
| `coverage_target` | No | `80` or `coverage.json` | Minimum endpoint coverage percentage. |
| `max_tests` | No | unlimited | Cap on generated test cases (prioritize highest-value tests when set). |

## Prerequisites

**Hard prerequisites (BAIL if missing):**

- `/tdgs-aidlc-setup-api-tests` — each target service must have:
  - `{service-repo}/api-tests/scripts/test-runner.js` with `loadCatalogPools` and `resolveCatalogTokens`
  - `{service-repo}/api-tests/collections/` and `api-tests/config/`

If the framework is missing or stale, **STOP** and instruct the user to run `/tdgs-aidlc-setup-api-tests` first. You may auto-invoke setup only when the user explicitly requested generation across the entire workspace.

**Recommended:**

- `*-docs*/project-context.md` and `knowledge-base/` for Phase 1 discovery
- `/tdgs-aidlc-setup-testdata` — `test-data/test-data-catalog.yaml` for catalog tokens and `apiChain[]`

## Instructions

### Step 0: Locate Workspace & Confirm Services

1. Scan workspace for backend service repos (same detection rules as setup-api-tests).
2. Display a numbered table of discovered services and **ask the user to confirm** which repos to include (workspace scan — Enter to accept all, or exclude by number).
3. Only process confirmed services in subsequent steps.

### Step 1: Pre-check Framework Per Service

For each confirmed service, verify `api-tests/` framework exists. If `package.json` exists but `node_modules` is missing:

```bash
cd {service-repo}/api-tests && npm install
```

If framework is missing, HALT with instruction to run `/tdgs-aidlc-setup-api-tests` first.

### Step 2: Resolve Parameters

- Parse `service`, `coverage_target`, and `max_tests` from user input
- If `coverage_target` is missing, read `{service}/api-tests/config/coverage.json` when present, else prompt (default `80`)

### Step 3: Delegate to Skill

Read and execute the API test generation skill workflow:

```
.github/i2a-skills/tdgs-aidlc-generate-api-tests/workflow.md
```

Pass resolved `service`, `coverage_target`, and `max_tests`. Follow `workflow.md` (orchestrator). **Read on demand** from `.github/i2a-skills/tdgs-aidlc-generate-api-tests/tools/` — `guardrails.md`, `discovery.md`, `generation-rules.md`, `pre-write-contract.md`, `post-generation-checks.md`, etc. (see skill `SKILL.md` table). Reuse `tdgs-aidlc-setup-api-tests/tools/runner-contract.md` for `results.json`. After generation, run `scripts/post-generation-gate.mjs`, then semantic checks from `post-generation-checks.md`. Do not regenerate extracted prose from memory.

### Step 4: Output

After execution, display per-service pass rate, report paths, and gap summary:

```
✅ API test generation complete!

   {service-repo}/api-tests/test-results/
     results.json   test-summary.html   test-report.md

   Coverage vs target: {actual}% / {coverage_target}%
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-setup-api-tests` | Scaffold framework (required before generate) |
| `/tdgs-aidlc-setup-testdata` | Test data catalog and apiChain wiring |
| `/tdgs-aidlc-run-tests` | Re-run tests without full regeneration |
