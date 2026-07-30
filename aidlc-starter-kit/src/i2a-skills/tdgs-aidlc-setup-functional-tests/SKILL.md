# Setup Functional Tests — Skill Router

Initialize a production-ready Playwright functional test framework inside the detected **UI repository**. Workspace-driven, application-agnostic — dynamically discovers the UI repo and scaffolds inside it (not at workspace root).

## Artifact Table (read on demand)

| File | Purpose | When to Read |
|------|---------|--------------|
| `workflow.md` | Step-by-step orchestrator | Always — first file after SKILL.md |
| `tools/guardrails.md` | G1-G13 + constraints | Always — read before any action |
| `tools/preflight-and-discovery.md` | Pre-flight checks, ground-truth hierarchy, field derivation, params, Steps 1-2 | Step 0-2 (detection phase) |
| `tools/scaffold-structure.md` | Step 3 (directory tree) + Step 4 (deps/npm scripts) | Step 3-4 |
| `tools/playwright-config.md` | Step 5 (playwright.config.js full spec) | Step 5 |
| `tools/fixtures-and-helpers.md` | Step 6 (fixtures, factories, catalog fixture, data-ledger writer, network-capture) | Step 6 |
| `tools/flow-descriptors.md` | Step 6b (flow descriptor convention + JSON schema) | Step 6b |
| `tools/component-detection.md` | Step 7 (react-select, datepicker, wizard, flow-runner) | Step 7 |
| `tools/verification-and-docs.md` | Steps 8-10 (selectors, verify, document) + Phase-4 augmentations | Step 8-10 |

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `ui_repo` | No | Auto-detect | UI repo directory name |
| `coverage_target` | No | `80` | Min business-rule coverage % |

## Key Contracts

- Scaffolds framework ONLY — does NOT author tests (that's `/tdgs-aidlc-generate-functional-tests`).
- Everything goes inside the UI repo — NEVER at workspace root.
- Re-run safe: user-edited fixtures/page-objects preserved; only framework files regenerate.
- `flow-runner.js` is MANDATORY when flow descriptors exist (G9a HARD GATE).
- `api-mock.js` is MANDATORY (HARD STOP if skipped — generate-functional-tests depends on it).
- `catalog-fixture.js` + `global-teardown.js` are MANDATORY when test data catalog exists.

## Pipeline Position

```
[/tdgs-aidlc-setup-functional-tests ← this]
   → [/tdgs-aidlc-setup-testdata]
      → [/tdgs-aidlc-generate-functional-tests]
         → Playwright HTML reports + ledger.yaml + dashboard.html refresh
```
