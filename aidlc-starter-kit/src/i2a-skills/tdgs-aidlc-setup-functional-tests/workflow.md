# Setup Functional Tests — Workflow

## Execution Flow

```
Step 0: Read guardrails.md (always first)
Step 1: Read preflight-and-discovery.md → Execute Pre-flight + Auto-Detect UI Repo
Step 2: Read preflight-and-discovery.md → Detect All Repos
Step 3: Read scaffold-structure.md → Create Directory Structure
Step 4: Read scaffold-structure.md → Add Playwright Deps + npm Scripts
Step 5: Read playwright-config.md → Create playwright.config.js
Step 6: Read fixtures-and-helpers.md → Create Fixtures + Helpers + Catalog + Ledger
Step 6b: Read flow-descriptors.md → Establish Flow Descriptor Convention
Step 7: Read component-detection.md → Detect Libraries + Create Interaction Helpers + Flow Runner
Step 8: Read verification-and-docs.md → Selector Conventions + Verify + Document
```

## Step 0 — Guardrails (MANDATORY)

Read `tools/guardrails.md`. Every subsequent step must comply with G1-G13. Violating any guardrail is a defect.

## Step 1 — Pre-flight + Auto-Detect UI Repository

Read `tools/preflight-and-discovery.md` (§Pre-flight, §Ground-Truth Hierarchy, §Parameters, §Step 1).

1. Verify workspace is multi-repo (repos in subdirs, NOT root).
2. Scan for UI repos (`package.json` with frontend framework deps).
3. Handle: 0 found → warn; 1 found → use it; multiple → ask user.
4. Display detected UI repo banner (framework, package manager, existing tests).

## Step 2 — Detect All Repositories

Read `tools/preflight-and-discovery.md` (§Step 2).

Scan workspace for ALL repos (frontend + backend) to understand full application context.

## Step 3 — Scaffold Directory Structure

Read `tools/scaffold-structure.md` (§Directory Structure).

Create the full `functional-tests/` tree inside the UI repo.

## Step 4 — Add Playwright Dependencies + npm Scripts

Read `tools/scaffold-structure.md` (§Dependencies, §npm Scripts).

1. Add devDependencies to UI's `package.json` (merge, never overwrite).
2. Add npm scripts (merge, never overwrite).
3. Handle `{RELATIVE_PATH_TO_DOCS_REPO}` resolution.

## Step 5 — Create Playwright Configuration

Read `tools/playwright-config.md`.

Create `{ui-repo}/playwright.config.js` with all mandatory settings:
- Reporter array (html + json + list, `open: 'never'`)
- Conditional webServer (only when `TEST_BASE_URL` unset)
- Flat `timeout: 60_000`
- Mode-aware `baseURL`
- Artifact capture (`trace: 'retain-on-failure'`, NOT `on-first-retry`)
- `globalSetup` health-check
- `globalTeardown` (path relative to config file dir)
- `fullyParallel: false` (deterministic replay)
- Browser projects (Chromium, Firefox, WebKit, Mobile Chrome)
- Visual regression project (optional)
- Workers config for seed-based determinism

## Step 6 — Create Base Fixtures and Helpers

Read `tools/fixtures-and-helpers.md`.

1. Create composable fixtures (`auth-fixture.js`, `network-fixture.js`, `index.js`).
2. Create data factories (valid, invalid, boundary, injection).
3. Create page objects (from actual UI component source — real selectors only).
4. Create API mock helpers (`api-mock.js` — HARD STOP if missing).
5. Create catalog fixture (`catalog-fixture.js` — MANDATORY when catalog exists).
6. Create data-ledger writer (`global-teardown.js` — MANDATORY).
7. Create network-capture helper (`network-capture.js` — populates `dbRecordsCreated[]`).
8. POST-EXECUTION VERIFICATION GATE: both `catalog-fixture.js` and `global-teardown.js` must exist.

## Step 6b — Establish Flow Descriptor Convention

Read `tools/flow-descriptors.md`.

1. Create `{ui-repo}/functional-tests/tests/flows/README.md` with schema contract.
2. Create `flow-descriptor.schema.json` (draft-2020-12, `additionalProperties: false`).
3. Skip if no `knowledge-base/business/process-flows.md` exists.

## Step 7 — Detect Custom Components + Create Interaction Helpers

Read `tools/component-detection.md`.

### 7a — Custom Select/Dropdown Detection
Scan for react-select, MUI, antd, etc. Create helpers if found.

### 7b — Custom Date Picker Detection
Scan for react-datepicker, masked-input, etc. Create helpers if found.

### 7c — Multi-Step Wizard/Stepper Detection
Scan for stepper patterns. Create wizard-helper if found.

### 7d — Data-Driven Flow Runner (G9a HARD GATE)
Create `flow-runner.js` (MANDATORY when flow descriptors exist).

### 7d.1 — Real-Mode Operational Guardrails
Apply 8 real-mode rules from production debugging.

## Step 8 — Selector Conventions + Verify + Document

Read `tools/verification-and-docs.md`.

1. Establish selector/stability conventions (§8).
2. Verify framework setup — npm install, playwright install, test list (§9).
3. Create mandatory scripts: `generate-report.js`, `verify-failure-artifacts.js`.
4. Update `.gitignore`.
5. Create `functional-tests/README.md` (§10).
6. Apply Phase-4 augmentations (A4-1 through A4-5).

## Post-Completion Checklist

- [ ] `test -f {ui-repo}/playwright.config.js`
- [ ] `test -f {ui-repo}/functional-tests/support/helpers/api-mock.js`
- [ ] `grep -q 'setupDefaultApiMocks' api-mock.js`
- [ ] `test -f {ui-repo}/functional-tests/support/fixtures/catalog-fixture.js` (when catalog exists)
- [ ] `test -f {ui-repo}/functional-tests/support/global-teardown.js` (when catalog exists)
- [ ] `test -f {ui-repo}/functional-tests/support/helpers/flow-runner.js` (when flows exist)
- [ ] `grep -q "open: 'never'" playwright.config.js`
- [ ] `grep -q "functional-tests/support/global-teardown" playwright.config.js`
- [ ] All npm scripts merged (not overwritten)
- [ ] No files created at workspace root
- [ ] G1 compliance — no hardcoded app/vendor names anywhere

## Next Steps

After completion:
1. Run `/tdgs-aidlc-setup-testdata` to create the catalog.
2. Then run `/tdgs-aidlc-generate-functional-tests` to author + execute test specs.
