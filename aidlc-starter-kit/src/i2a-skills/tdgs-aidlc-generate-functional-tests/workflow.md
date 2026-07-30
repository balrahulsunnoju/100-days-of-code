# Functional Test Generation Workflow — Orchestrator

**Goal:** Discover UI flows, business rules, and validation contracts from source code + knowledge base, generate comprehensive Playwright test suites (positive/negative/edge-case), execute tests, and produce per-run reports with gap analysis.

**Your Role:** You are the Functional Test Generation Orchestrator. You run multi-phase discovery (flows → KB → source code → reconciliation), generate specs with full flow coverage, execute via Playwright, and publish Markdown + HTML reports.

This workflow is **application-agnostic** — it discovers UI contracts from source code and flow descriptors, not from hardcoded component names.

---

## Guardrails (Non-Negotiable, Read First)

**Read on demand:** `tools/guardrails.md` (G1–G18). Key highlights:

| ID | Rule |
|----|------|
| G1 | Application-agnostic — discover from code/KB |
| G3 | Interview user (mode, flows, categories, coverage_target) |
| G4 | No invented responses — derive from OpenAPI/KB/source |
| G9 | Never overwrite user-edited specs (checksum + diff) |
| G9a | Flow Coverage Matrix — every flow×persona×case-type cell |
| G11 | Category coverage mandatory (positive + negative + edge) |
| G15 | Real-mode E2E completeness — no mock shortcuts |
| G16 | Landing-page entry point — positive specs start from app root |
| G18 | HARD GATE: negative/ and edge-case/ folders non-empty |

---

## Pipeline Position

```
[/tdgs-aidlc-setup-functional-tests]
   → [/tdgs-aidlc-setup-testdata]
      → [/tdgs-aidlc-generate-functional-tests ← you are here]
         → results.json + html-report/ + test-report.md + data-ledger.json
            → [/tdgs-aidlc-run-tests] (optional re-run)
```

---

## Workflow Steps

### Step 0 — Pre-flight Checks

Validate workspace structure, locate UI repo, confirm framework exists (`playwright.config.js`, `package.json` with Playwright dep), check scope boundaries, load project-context.md + test-data-catalog.yaml.

**Read on demand:** `tools/preflight-checks.md`

HALT conditions:
- Missing `playwright.config.js` → instruct user to run `/tdgs-aidlc-setup-functional-tests`
- UI repo not found in workspace
- Scope boundary violation (touching production source)

---

### Step 0b — Pre-flight Ground Truth Hierarchy

Establish provenance hierarchy (P0–P6) for every test data value. Validate catalog against decision tree. Identify gaps requiring user input.

**Read on demand:** `tools/preflight-ground-truth.md`

---

### Step 1 — Discovery

Multi-phase discovery to build the complete picture of what to test:

- **Phase 0a:** Gather flow descriptors from 5 input sources (flow JSONs, KB, route config, backend endpoints, project-context). Zero flows = HARD FAIL.
- **Phase 0a-bis:** Expand flows into variants (record types × personas × case types). Interactive proposal to user.
- **Phase 1:** Knowledge Base scan for business rules, validation schemas, API contracts.
- **Phase 2:** Source code scan for components, POs, selectors, form fields, validation logic.
- **Phase 3:** Reconciliation — merge all sources, resolve conflicts, compute Test Count Budget.

**Read on demand:** `tools/discovery.md`

---

### Step 2 — Pre-Write Output Contract

Emit 6 mandatory blocks in chat BEFORE writing any spec file:

| Block | Purpose |
|-------|---------|
| F1 | Screen Coverage Inventory — every UI screen mapped to spec |
| F2 | Identity Resolution Plan — catalog pool → fixture wiring |
| F3 | Auth-Gate & Deep-Link Compliance — no gated-route bypasses |
| F4 | Flow Coverage Matrix — every flow×persona×case-type cell (G9a HARD GATE) |
| F5 | Real-Mode Artifact Mandate — recordArtifact on every write endpoint |
| F6 | File Write Plan — every file to create/modify/skip |

**Read on demand:** `tools/pre-write-contract.md`

HARD RULE: No `create_file` on any spec/PO/factory until all 6 blocks emitted with concrete data.

---

### Step 3 — Generate Test Files

Create specs following folder structure (`smoke/`, `positive/`, `negative/`, `edge-case/`), applying all test file requirements (POs, factories, tag taxonomy, web-first assertions, no sleeps, no console, catalog compliance).

**Read on demand:** `tools/generation-rules.md`

Key requirements:
- Every spec imports from composable fixtures
- `setupDefaultApiMocks(page)` in `test.beforeEach` (mock mode)
- Flow-tag emission (R10-B2) on full-flow positive specs
- Tag taxonomy: `@smoke`, `@regression`, `@external-integration`, `@edge-case`, `@quarantine`
- Custom component helpers for react-select, masked inputs, wizards
- Catalog-literal annotation on all hardcoded values

---

### Step 4 — Gap Analysis

Cross-reference discovered business rules against generated tests. Identify uncovered rules, verify test distribution, check PO completeness, validate selector accuracy, confirm mode-conditional mock setup.

**Read on demand:** `tools/gap-analysis.md`

Output: Gap analysis table with Rule ID, coverage status, and notes.

---

### Step 5 — Post-Generation Validation Gate

Run all 14+ checks on generated files BEFORE execution. Fix ALL violations first.

**Read on demand:** `tools/post-generation-checks.md`

Critical checks include:
- Custom select/masked input compliance (Checks 1–2)
- Gated-route deep-link ban (Check 14a)
- `.first()` on singleton ban (Check 14b)
- Helper smoke specs (Check 14c)
- Catalog ledger wiring (Check 14d)
- Tag taxonomy (Check 14e)
- Structured cross-service SKIP (Check 14g)
- Pre-publish ledger AJV gate (Check 14h)
- Non-positive assertion count (Check 14k)
- Quarantine census (Check 14l)
- Standards Audit Script (bash heredoc — runs Checks 11–14l in one shot)

---

### Step 6 — Execute Tests & Generate Reports

Run Playwright suite, generate Markdown summary, validate ledger.

**Read on demand:** `tools/execution-and-reports.md`

```bash
cd {ui-repo} && npx playwright test ; node functional-tests/scripts/generate-report.js
```

Output artifacts:
- `html-report/index.html` — Playwright's built-in interactive report (canonical)
- `test-results/results.json` — machine-readable results
- `test-results/test-report.md` — Markdown summary for PRs/CI
- `test-results/data-ledger.json` — execution metadata + catalog usage

---

### Phase-4 Augmentations

Additional generation mandates that apply on top of the core workflow:

- G4-1: Negative-case generation mandatory per form
- G4-2: Upload/download flow specs
- G4-3: Notification verification
- G4-4: Failure-artifact verification (chained with `;`)
- G4-5: Accessibility opt-in per flow

**Read on demand:** `tools/phase-4-augmentations.md`

---

## Completion Criteria

Before declaring "done":

1. `ls tests/e2e/negative/*.spec.js | wc -l` ≥ 1 per testable form (G18)
2. `ls tests/e2e/edge-case/*.spec.js | wc -l` ≥ 1 (G18)
3. Flow Coverage Matrix (Block F4) meets `coverage_target`
4. Standards Audit Script exits clean (all checks pass)
5. `data-ledger.json` AJV-validates against schema
6. `test-report.md` generated with correct mode badge
7. No priority-inversion violations in tier fill order
