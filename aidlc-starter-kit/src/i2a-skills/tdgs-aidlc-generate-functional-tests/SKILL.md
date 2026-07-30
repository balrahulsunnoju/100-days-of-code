---
name: tdgs-aidlc-generate-functional-tests
description: 'Generate and execute comprehensive Playwright functional test suites inside the UI repository, driven by workspace discovery of business rules, routes, components, API contracts, and flow descriptors. Use when the user says "generate functional tests", "run functional tests", or runs /tdgs-aidlc-generate-functional-tests'
---

Follow the instructions in ./workflow.md.

## Reference artifacts (read on demand — do not regenerate from memory)

| Artifact | Path |
|----------|------|
| Guardrails G1–G18 (HARD GATES) | `tools/guardrails.md` |
| Pre-flights (workspace, scope, project-context, catalog) | `tools/preflight-checks.md` |
| Ground-truth hierarchy (P0–P6, provenance, catalog-gaps loop) | `tools/preflight-ground-truth.md` |
| Discovery (Phase 0a flows, 0a-bis variants, 1 KB, 2 code, 3 reconciliation, 3c budget) | `tools/discovery.md` |
| Pre-write contract (Blocks F1–F6) | `tools/pre-write-contract.md` |
| Generation rules (test file requirements, tag taxonomy, custom-component handling) | `tools/generation-rules.md` |
| Gap analysis (Section 5) | `tools/gap-analysis.md` |
| Post-generation validation gate (Checks 1–14l + Standards Audit Script) | `tools/post-generation-checks.md` |
| Execution and reports (Section 6 + 7 Markdown summary) | `tools/execution-and-reports.md` |
| Phase-4 augmentations (G4-1 … G4-5) | `tools/phase-4-augmentations.md` |
| Runner output contract / framework conventions | `../tdgs-aidlc-setup-functional-tests/` |

## After writing specs

Run the Standards Audit Script from `tools/post-generation-checks.md` (executes Checks 11–14l in one shot). Every line printing other than `OK` = violation; fix before execution.

Then execute the full suite + report:

```bash
cd {ui-repo} && npx playwright test ; node functional-tests/scripts/generate-report.js
```

> Always chain with `;` not `&&` so the report regenerates on failure.

## Prerequisites

- `/tdgs-aidlc-setup-functional-tests` must have created `{ui-repo}/playwright.config.js`, `functional-tests/support/`, `functional-tests/scripts/generate-report.js`, `flow-runner.js`, `skip-helper.js`
- `/tdgs-aidlc-setup-testdata` recommended for `test-data-catalog.yaml` (`identityPools[]`, `uiScreens[]`, `apiChain[]`)

## Parameters (passed from prompt)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `ui_repo` | Auto-detect | UI repo directory name |
| `mode` | Ask (G3) | `mock` or `real` |
| `flows` | Ask (G3) | `all` or comma-separated flow IDs |
| `categories` | Ask (G3) | `all`, `positive`, `positive+negative`, or list |
| `coverage_target` | `80` | % of flow×case×persona matrix that must be filled |
| `max_tests` | `unlimited` | Upper bound on generated tests |
