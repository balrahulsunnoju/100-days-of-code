# API Test Generation Workflow — Orchestrator

**Goal:** Discover API contracts, generate comprehensive Insomnia test suites per backend service, execute tests, and produce HTML/MD/JSON reports with gap analysis.

**Your Role:** You are the API Test Generation Orchestrator. You run two-phase discovery (Phase 1: Knowledge Base, Phase 2: Source Code), generate tests with field-provenance and chain wiring, execute via the service test-runner, and publish reports.

---

# API Test Generation

Generate and execute a comprehensive API test suite inside each backend service repository. This prompt dynamically discovers endpoints, request/response models, validation annotations, and business logic to build thorough API test coverage.

This prompt is **application-agnostic** — it discovers API contracts from source code, not from hardcoded service names.

## Guardrails (Non-Negotiable, Read First)

**Read on demand:** `tools/guardrails.md` (G1–G25). Highlights:

| ID | Rule |
|----|------|
| G1 | Application-agnostic — discover from code/KB |
| G2 | Discover-before-generate; `audit-coverage.js` enforces |
| G5 | HALT if setup/testdata missing or service not health-probable |
| G7 | Cross-service → `{{catalog.stubs.*}}}`; no other-service URLs |
| G8 | Pre-write contract before any collection write |
| G12 | Variant/workflow coverage — enumerate from DTO `List<>` |
| G15 | Catalog + stub manifests BEFORE collection JSON |
| G16–G21 | Assertion contract, quoting, G19 allow-list, format maps |
| G25 | `audit-coverage.js` exit 0 before "done" |

## TL;DR — Quick Start

- **What this does:** For EACH backend service: discovers endpoints (KB OpenAPI + controller scan), filters to UI-consumed versions, writes Insomnia collections (positive/negative/edge-case folders; cross-service consumers use `{{catalog.stubs.*}}` per G7 — runner `data-issue` when stub is TODO), executes via `inso run test` (Node/axios fallback with mini-chai), generates HTML + Markdown reports, refreshes the cross-app dashboard.
- **When to run:** After `/tdgs-aidlc-setup-api-tests` (framework) and `/tdgs-aidlc-setup-testdata` (catalog with `identityPools[]` + `apiChain[]`). Re-run after API changes or to refresh execution results.
- **Prerequisites:** `api-tests/scripts/test-runner.js` exists per service; `test-data-catalog.yaml` exists; each service is reachable on its expected port (health-probed; HARD STOP if not running — per G7, this prompt NEVER auto-starts services).
- **Outputs:** `{service-repo}/api-tests/collections/<svc>.json`, `test-results/results.json`, `test-summary.html`, `test-report.md`, `data-ledger.json`, refresh of `{docs-repo}/test-data/dashboard.html` and `ledger.yaml`.
- **Most common failure:** Catalog `apiChain[]` defines chains but no `capture`/`inject` wiring → every downstream test skips with `<UNCAPTURED:...>` sentinel. Check 16 catches this BEFORE write.
- **Hard guardrails:** **G15 Token Resolution & Stub Coverage Manifests MUST be emitted BEFORE any collection JSON is written** — this is the gate that prevents the documented "0 real positive verifications" failure mode. Pre-Write Output Contract (Blocks 1–9) MUST be emitted before any `create_file`/`replace_string_in_file`. 20 post-generation checks with auto-fix loops. NEVER faker on PII fields. NEVER hardcoded chained values. NEVER `{{captured.*}}` for cross-service producers — use `{{catalog.stubs.<svc>.<field>}}` AND register missing stubs in the catalog YAML before writing the collection (G15.2 Action: WRITE TODO + ASK USER).

## Pipeline Position

```
[/tdgs-aidlc-setup-api-tests]
   → [/tdgs-aidlc-setup-testdata]
      → [/tdgs-aidlc-generate-api-tests ← you are here]
         → results.json + test-summary.html + test-report.md + data-ledger.json + dashboard.html refresh
```

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **DO NOT** create test files at the workspace root. All API tests and reports go inside each service's `api-tests/` directory.


## Pre-flight Check: Read project-context.md (MANDATORY)

> ⚠️ **BEFORE generating any test code**, search the workspace for `project-context.md` (typically in `*-docs*/project-context.md`). If found, **read its Testing Rules section in full** and follow those conventions exactly. This file contains project-specific rules including:
> - API test framework preferences (Insomnia CLI with Node.js fallback)
> - Collection format requirements (`unit_test_suite` + `unit_test` resources for `inso run test`)
> - Test code syntax (`insomnia.send()` + chai, NOT `pm.*` Postman scripting)
> - Test data organization conventions
>
> **If project-context.md is NOT found**, fall back to auto-detection from workspace scanning.


## Pre-flight: Test Data Catalog

> **Read on demand:** `tools/preflight-catalog.md` when `test-data-catalog.yaml` exists.

## Pre-flight: Ground-Truth Hierarchy

> **Read on demand:** `tools/preflight-ground-truth.md` and `tools/field-derivation-hierarchy.md` (P0–P6).

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `service` | No | All confirmed | Specific service repo directory name, or `all` for every confirmed backend service. |
| `coverage_target` | No | `80` | Minimum endpoint coverage percentage (% of discovered endpoints that must have tests). |
| `max_tests` | No | unlimited | Cap on generated test cases; prioritize highest-value tests when set. Parse `max_tests={N}` from user input. |

> ⚠️ **`coverage_target` is COVERAGE, not a TEST-COUNT budget.** It controls what fraction of discovered endpoints must be covered (e.g., 80% of 50 endpoints = 40 covered endpoints). The TOTAL number of generated test cases is independently driven by:
> - Number of endpoints × test variants (positive / negative / edge / OWASP)
> - Number of business-rule variants per endpoint
> - Number of `apiChain[]` chains × steps per chain
>
> Two runs of the same workspace can legitimately produce 100 vs 500 tests if KB OpenAPI / business rules were extended between runs. To make this variance explicit and auditable, the agent MUST emit the **Test Count Budget Reconciliation** block (see Discovery section) BEFORE generating any test file. To set an upper bound, pass `max_tests=<int>` (default `unlimited`) — the generator will then prioritize highest-value tests up to the bound and report which ones were deferred.

### Coverage Target Behavior

1. **If parameter provided:** Use it (e.g., `/tdgs-aidlc-generate-api-tests 90`)
2. **If NOT provided:** Check if `{service-repo}/api-tests/config/coverage.json` exists (created by `/tdgs-aidlc-setup-api-tests`). If found, read `{ "target": N }` and use that value.
3. **If no parameter AND no coverage.json:** Prompt the user:
   ```
   📊 Coverage target not specified.
   
   What minimum API endpoint coverage percentage should tests target?
   Enter a number (e.g., 60, 80, 90) or press Enter for default (80%):
   > _
   ```
4. **If user presses Enter / skips:** Use default `80%`
5. **Coverage target appears in:** gap analysis (endpoints without tests flagged if below target), generated reports, and final pass/fail verdict.

---

## Process

### 0. Pre-flight: Verify API Test Framework Exists (MANDATORY)

Before any generation work, for EACH target service repo verify that the API test framework is in place. The framework is created by `/tdgs-aidlc-setup-api-tests` and includes:

- `{service-repo}/api-tests/scripts/test-runner.js` — must exist and must export/define `loadCatalogPools` AND `resolveCatalogTokens` (catalog-aware token resolution)
- `{service-repo}/api-tests/collections/` — Insomnia collection directory
- `{service-repo}/api-tests/config/` — environment + coverage configuration

**If the runner is missing or stale (no `resolveCatalogTokens` symbol):**

```
⚠️ API test framework not detected (or out of date) in {service-repo}.
   Required: api-tests/scripts/test-runner.js with catalog token resolution.

   STOPPING — run /tdgs-aidlc-setup-api-tests first, then re-run this prompt.
```

Do NOT proceed past this gate. Auto-invoking setup is acceptable when the user explicitly requested generation across the workspace; otherwise stop and surface the message above.

### 1. Workspace Scan & Repository Confirmation

Before generating any tests, scan the workspace and confirm with the user which backend services to include:

1. **Scan workspace root** for all subdirectories
2. **Classify each repo** — identify backend service repos (pom.xml with Spring Boot, package.json with express/fastify/nestjs, etc.)
3. **Display discovered services** in a numbered table:
   ```
   ══════════════════════════════════════════════════════════════
   WORKSPACE BACKEND SERVICE SCAN
   ══════════════════════════════════════════════════════════════

     #  Service Repo                    Stack               Port     Include?
     ─  ──────────────────────────────  ──────────────────   ──────   ────────
     1  {service-repo-1}/              {stack}              {port}   ✅
     2  {service-repo-2}/              {stack}              {port}   ✅
     3  {service-repo-3}/              {stack}              {port}   ✅

   Coverage Target: {coverage_target}%

   ══════════════════════════════════════════════════════════════
   ```
4. **Ask user to confirm:**
   ```
   The services marked ✅ will have API tests generated.
   We can’t run all services every time — please confirm.

   Confirm services to include? (Enter to accept all, or specify numbers to exclude, e.g., "exclude 2"):
   > _
   ```
5. **Only process confirmed services** in subsequent steps.

### 2. Pre-checks

1. **Auto-detect all backend service repos** — same logic as `/tdgs-aidlc-setup-api-tests`.
2. **Verify framework exists per service:**
   - `{service-repo}/api-tests/` must exist → if missing, **HALT** and instruct the user to run `/tdgs-aidlc-setup-api-tests` first; do NOT attempt to scaffold from this prompt (Copilot prompts cannot programmatically invoke other prompts; inlining setup logic here would duplicate scaffolding and drift)
   - `{service-repo}/api-tests/package.json` must exist → if missing, **HALT** with the same instruction as above
   - `{service-repo}/api-tests/scripts/test-runner.js` must exist → if missing, **HALT** with the same instruction as above
3. **Install dependencies** if `node_modules` is missing:
   ```bash
   cd {service-repo}/api-tests && npm install
   ```


### 3. Discovery

> **Read on demand:** `tools/discovery.md` — Phase 0 chain map, Phase 1 KB, Phase 2 code, reconciliation (3b), endpoint gate (3c), test-count budget.

### 3d. Pre-Write Output Contract

> **Read on demand:** `tools/pre-write-contract.md` — emit Blocks 1–9 in chat with concrete values BEFORE writing any `collections/*.json`. Do not call file-write tools until Block 6 shows ✅ on every check.

**Hard rule:** No `create_file` / `replace_string_in_file` on collection JSON until all blocks are emitted. User may reply `STOP — emit Pre-Write Output Contract first`.



### 4. Generate Test Cases Per Service

> **Read on demand:** `tools/generation-rules.md` — payload realism, OWASP/ISO negative taxonomy, validation-inventory gate, folder tree, chaining, cross-service boundary, field-value verification.

**Unit tests:** `tools/unit-test-code-patterns.md`, `templates/insomnia-unit-test-resources.json.template`, `../tdgs-aidlc-setup-api-tests/tools/insomnia-unit-test-examples.md`.

### 5. Gap Analysis Per Service

After generating tests:

1. **Cross-reference** every discovered endpoint against generated test requests
2. **Cross-reference** every validation annotation against negative test cases
3. **Cross-reference** every exception handler against error test cases
4. **Cross-reference KB rule IDs** against test assertions — every KB rule must appear in at least one test title or be explicitly flagged as untestable at this layer
5. **Flag gateway-only rules** — rules identified as living in the API gateway (not backend) should be listed separately with a note that they require gateway-level testing
6. **Identify missing coverage** — list uncovered endpoints/rules with reason

Display gap analysis:
```
| Rule ID | Endpoint | Method | Positive | Negative | Edge | Source | Notes |
|---------|----------|--------|----------|----------|------|--------|-------|
| {id-1}  | {path} | POST | ✅ | ✅ | ✅ | KB + Code | |
| {id-2}  | {path} | POST | ✅ | ✅ | ⚠️ | KB + Code | Assert expected value |
| {id-3}  | {path} | POST | ❌ | ❌ | ❌ | KB only | Gateway rule (not in backend) |
| —       | {path} | GET | ✅ | — | — | Code only | Not documented in KB |
```


### 6–7. Execute Tests and Reports

> **Read on demand:** `tools/execution-and-reports.md` — health probe (G7), `npm test; npm run test:report`, `results.json` contract via setup `runner-contract.md`.

### Post-Generation Validation Gate

> **Read on demand:** `tools/post-generation-checks.md` (Checks 1–20). Run `node .github/i2a-skills/tdgs-aidlc-generate-api-tests/scripts/post-generation-gate.mjs {service}/api-tests/collections/*.json` for mechanical greps (covers Checks 11, 15, 17, 20 + rule #5 `elapsedTime` + Postman `pm.*`). Documented overrides: `SKIP_AJV=1` (no KB OpenAPI / non-JSON response), `SKIP_ELAPSED_TIME=1` (async endpoint, SLA upstream) — record carve-out reason in generation report. Then complete the remaining semantic checks from the tool doc. **Do not proceed to Step 6 until all checks pass.**



## Constraints and Phase-5

> **Read on demand:** `tools/constraints-and-phase5.md`.


## Execution Context

This prompt requires the framework to be set up via `/tdgs-aidlc-setup-api-tests`. If the framework is missing during pre-checks, this prompt **halts** and instructs the user to run the setup prompt first — it does NOT attempt to scaffold inline.
