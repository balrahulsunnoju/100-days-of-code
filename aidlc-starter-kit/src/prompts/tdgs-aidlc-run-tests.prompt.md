---
mode: agent
description: "Execute tests across unit, API, and functional layers with consolidated HTML reports."
---

# Run Tests

Execute existing tests across the workspace — supports **full-suite** and **issue-scoped** runs for all test types: **unit**, **functional (Playwright)**, and **API (Insomnia / Node.js)**.

This prompt is **application-agnostic** — it dynamically discovers repos, test infrastructure, and test files from the workspace.

## Guardrails (Non-Negotiable, Read First)

### G1 — Application-agnostic
No specific app/vendor/service/field names. Every command, path, and report location is discovered from the workspace at runtime.

### G2 — Discover-before-generate
Ground every test command in: (a) `*-docs*/project-context.md` Testing Rules (b) `package.json` scripts / `pom.xml` plugins (c) prior test artifacts.

### G3 — Ask-don't-assume
If scope (full/issue/scoped), environment (local/test/stage), or mode (mock/real) is ambiguous, ASK.

### G5 — Prerequisite check
If no test framework is scaffolded in a target repo, STOP with the relevant `❌ Run /tdgs-aidlc-setup-* first`. NEVER auto-scaffold.

### G7 — Cross-service / external dependency
Tests classified `skipped` with `reason: cross-service-dependency: <missing-prereq>` MUST be reported in their own dashboard category — they are NOT failures and NOT passes. The pass-rate computation MUST exclude them from the denominator.

### G9 — Idempotency
A re-run with the same scope is safe. `data-ledger.json` uses a `runs[]` array with timestamped entries (appends, does not overwrite). HTML reports and `test-summary.html` are overwritten by design — they always reflect the latest run. `results.json` is per-run-ID when multiple runs coexist.

### G10 — Sync rule
Mirror this file between starter-kit (canonical) and `.github/prompts/`.

### G11 — Shared contracts (single source of truth)
- **`caseType` enum:** `positive | negative-validation | boundary | negative-business-rule`.
- **Test timeout (mock & real):** `60_000` ms (MAX CAP). Playwright resolves on first match and continues immediately; the cap only fires on hangs. 60s ceiling absorbs the slowest legitimate real-mode chain (payment + receipt + email tail latency). Anything longer is a defect — do NOT inflate beyond 60s to mask failures. Per-test override allowed via `test.setTimeout()` only with a recorded justification.
- **`passRate` formula:** `passed / (passed + failed + dataIssue + infra)` — `skipped` (incl. `cross-service-dependency`) EXCLUDED. `0.0` when denominator is 0. Use the shared `scripts/lib/math.js#computePassRate(counts)` utility.
- **Status enum (per-service data-ledger):** `pass | fail | skip | data-issue | infra | generation-bug | unresolved-token`. Workspace `ledger.yaml` uses camelCase: `passed | failed | skipped | dataIssue | infra`. Dashboard maps between them.
- **Ledger ownership:** This prompt READS `ledger.yaml` for context and TRIGGERS a re-aggregation by invoking `setup-testdata`'s aggregator script; it does NOT itself append entries to `ledger.yaml.runs[]`. Per-service runners DO write `data-ledger.json`.
- **Dashboard refresh:** Always refresh `*-docs*/test-data/dashboard.html` AND `*-docs*/test-data/db-transactions.json` at end of run. Show: last N runs, records used per run with frequency counts, per-test record-usage detail, skipped-by-reason breakdown.
- **Failure artifacts:** Functional runs MUST emit screenshots+videos for failures into the Playwright HTML report. After every run, list `test-results/**/*.{png,webm,zip}` and verify the HTML report displays them; if not, surface a `⚠️ failure artifacts not linked in report` warning.

### G12 — DB transaction capture (MCP SQL Developer integration)
> After each run, the aggregation pass MUST merge ALL per-service `data-ledger.json.dbRecordsCreated[]` into `{docs-repo}/test-data/db-transactions.json`. This file is the primary interface for MCP SQL Developer queries.

- Values are PLAIN TEXT (no masking) — test environment only, gitignored.
- Include ALL HTTP statuses: 2xx (created), 4xx (attempted-failed), 5xx (attempted-server-error).
- Include consumed identity pool records with field values.
- File is overwritten each run (last run only, not historical).

### G13 — Reports sync guardrail
> After run completion, validate that `results.json.total === test-report.md.Total === dashboard.html total tile`. If any format shows different counts, emit `⚠️ REPORT SYNC MISMATCH` warning.

### G14 — Report-chaining contract (canonical)
**ALWAYS chain report generation after test execution with an exit-code-preserving pattern (NOT `&&`).** `&&` short-circuits on test failure, leaving stale `test-summary.html` / `test-report.md` from a prior green run — reviewers then read fake-green data while real failures are invisible. The report script MUST ALWAYS run against the latest `results.json` regardless of test exit code, BUT the overall command MUST preserve the test command's exit code so CI/callers still see failures.

**Exit-code-preserving pattern (use in all npm scripts and direct commands):**
```bash
# Shell (direct invocation):
cmd && exit_code=0 || exit_code=$?; node scripts/generate-report.js; exit $exit_code

# npm scripts (package.json — no $? available, use shell wrapper):
"test:ci": "sh -c 'npx jest --coverage && ec=0 || ec=$?; node scripts/generate-report.js; exit $ec'"
```

Detect which report script exists per repo: `scripts/generate-report.js` (JS) or `scripts/generate_report.py` (Python). For Playwright, also chain `node functional-tests/scripts/generate-report.js` so `test-report.md` is regenerated (Playwright's HTML report self-refreshes; only the markdown summary needs the chained call).

---

## Pre-flight Checks (run BEFORE any test command)

1. **Workspace root is NOT a git repo** — run `git` only inside repo subdirs, never at workspace root.
2. **Read `*-docs*/project-context.md` Testing Rules** — extract per-stack commands, test file locations, report paths, stack quirks (RTL/node-sass/MSW versions, `env-cmd` wrappers).
3. **JS/TS rule:** ALWAYS use `npm test --` or `npm run test:coverage` (never raw `react-scripts test`) — `package.json#test` may wrap with `env-cmd` / `cross-env` that raw invocation bypasses.

## Pre-flight Check: Read Test Data Catalog (Fully Autonomous Data Provisioning)

> **AUTOMATICALLY** search for `test-data/test-data-catalog.yaml` in the docs repo (typically `*-docs*/test-data/test-data-catalog.yaml`). This catalog is created by `/tdgs-aidlc-setup-testdata`.
>
> **IF CATALOG FOUND — smart data provisioning based on what tests actually need:**
>
> Not every test run needs data provisioning. The catalog helps only when tests involve identity records (finite data) or multi-endpoint chaining. For simple tests with inline data, the catalog is a no-op.
>
> | Test Scenario | Catalog Action | Example |
> |--------------|----------------|----------|
> | Form fill with inline values | **No-op** — values already baked into spec | Shipping form test with hardcoded address |
> | Status code / validation assertion | **No-op** — static assertion | 400 on missing required field |
> | Identity verification (government IDs, credentials) | **Provisions** — picks from pool, reserves, tracks | Verify-identity endpoint with real ID record |
> | Multi-endpoint chain (create → process → confirm) | **Provisions** — resolves capture/inject chaining | Reference ID from step 1 feeds step 2 |
> | Dynamic value rotation per run | **Optional** — regenerates faker values | Different name/address each run |
>
> **BEFORE EXECUTION (only steps that apply):**
> 1. Read catalog → check if any collection/test references `{{catalog.*}}` tokens or chaining (`{{captured.*}}` tokens)
> 2. If `{{catalog.identityPool.*}}` tokens are found in any collection:
>    - Snapshot pool state: `"📊 Pre-run pool health: {pool} {N} available"`
>    - The test-runner.js resolves tokens automatically — it reads the catalog YAML via `--catalog` flag (or auto-detects from workspace), picks the next available record from each pool, and replaces tokens in request bodies before sending
>    - If a pool is empty → **SOFT-STOP** (skip affected tests, continue with the rest): `"⚠️ No available {pool-type} records for {env}. Tests needing this pool will be skipped. Paste new records: /tdgs-aidlc-setup-testdata"`
> 3. If `{{captured.*}}` chaining tokens are found: the test-runner handles `capture`/`inject` automatically (built into the Node.js fallback executor by `/tdgs-aidlc-setup-api-tests`)
> 4. If dynamic field rotation is needed: auto-generate values using catalog generators
> 5. Detect environment from `api-tests/environments/*.json`
> 6. Display what will be provisioned:
>    - If `{{catalog.*}}` tokens found: `"📋 Catalog tokens detected — test-runner will resolve from identity pools at runtime"`
>    - If collections use inline/hardcoded data (no `{{catalog.*}}` tokens): `"⚠️ Collections use inline/hardcoded data — not referencing test data catalog pools. For dynamic data provisioning, regenerate collections with /tdgs-aidlc-generate-api-tests"`
>    - If no catalog exists: `"ℹ️ No test data catalog found. Run /tdgs-aidlc-setup-testdata to create one."`
>
> **DURING EXECUTION:**
> - **Detect cross-service dependencies before running:** Scan each collection's request URLs for references to OTHER services' environment variables (e.g., `{{ serviceA_base_url }}` appearing in service B's collection means B depends on A). Build a dependency graph and run collections in topological order — upstream services first.
> - If a collection has NO cross-service dependencies, it runs independently — other collections' failures don't affect it
> - If a collection has cross-service SETUP steps (chaining to another service's endpoints), and those SETUP steps fail, downstream tests WITHIN that collection are skipped (chain is broken)
> - Only WITHIN a chain: downstream tests are skipped on chain break
> - Show progressive chain execution progress (pass/fail/skip per step — see Step 8 format)
>
> **AFTER EXECUTION (only if `{{catalog.*}}` tokens were resolved from identity pools):**
> 1. Read the test-runner's results to determine which identity records were used (the test-runner logs which pool records it picked)
> 2. Finalize identity record status in the catalog YAML (the actual write-back is performed by the per-service runner per Step 9a — this section describes the EXPECTED post-run state for verification only):
>    - Tests that **PASSED** → records remain `available`, `consecutiveFailureCount` reset to 0 (catalog status enum is `[available, reserved, quarantined]` — there is NO `consumed` state; counter increments on the record track historical usage instead)
>    - Tests that **FAILED** → reserved records returned to `available`; `failureCount++` and `consecutiveFailureCount++` (record stays reusable; quarantined only after `quarantineThreshold` consecutive failures)
> 2. Append consumption record to `test-data/ledger.yaml`
> 3. Show before/after pool summary:
>    ```
>    ┌─────────────────────────────────────────────────
>    │ 📊 DATA CONSUMPTION SUMMARY
>    │
>    │ Pool         Before   Used       Returned   After
>    │ ──────────   ──────   ────────   ────────   ─────
>    │ {pool-1}     {N}      {N}        {N}        {N}
>    │ {pool-2}     {N}      {N}        {N}        {N}
>    │
>    │ ⚠️ {pool}: {N} remaining — add more data soon
>    └─────────────────────────────────────────────────
>    ```
> 4. Regenerate `test-data/dashboard.html` with latest results
>
> **Dashboard regeneration:** happens AFTER test execution — see Step 9c. Pre-flight only READS the catalog.
>
> **IF CATALOG NOT FOUND:**
> - Existing behavior unchanged — run tests with whatever data is hardcoded in collections
> - Display: `"ℹ️ No test data catalog found. Tests use inline data. Run /tdgs-aidlc-setup-testdata to enable smart test data management."`
> - Still show progressive execution report

---

## Interactive Mode — Step-by-Step

This prompt uses a **strict interactive conversation flow**. Ask ONE question at a time, wait for the user's answer, then proceed to the next step. Do NOT skip steps or combine questions.

### Step 1: Full Suite or Issue-Scoped?

```
══════════════════════════════════════════════════════════════
TEST RUNNER
══════════════════════════════════════════════════════════════

  1. Full Suite — run all existing tests in the workspace
  2. Issue-Scoped — run tests for a specific GitHub issue

Enter choice (1-2):
> _
══════════════════════════════════════════════════════════════
```

**Based on the answer, follow Path A (Full Suite) or Path B (Issue-Scoped) below.**

### Step 2: Which Environment?

> ⚠️ **Production is NEVER an option.** Only `local`, `test`, and `stage` are supported.

If the user specified `--env local`, `--env test`, or `--env stage` when invoking the prompt, use that value and **skip this question**. Otherwise, ask:

```
══════════════════════════════════════════════════════════════
ENVIRONMENT

  1. Local — services on localhost (pointing to test DB/URLs)
  2. Test  — deployed test environment
  3. Stage — deployed stage environment

Enter choice (1-3, default = 1):
> _
══════════════════════════════════════════════════════════════
```

**If the user presses Enter with no input → default to Local.**

Store the selected environment as `{selected-env}` (`local`, `test`, or `stage`) and use it for:
- API tests: `npm run test:full` (local) or `node scripts/test-runner.js --env {selected-env} && ec=0 || ec=$?; node scripts/generate-report.js; exit $ec` (test/stage)
- Port detection / health checks: read from `api-tests/environments/{selected-env}.json`
- Identity pool filtering: match catalog records where `env` equals `{selected-env}` or `any`
- Service readiness check: only when `{selected-env}` is `local` — verify required services are running (prompt user to start them if not; do NOT auto-start application services). Test/stage services are already running remotely.

---

## Path A: Full Suite

### Step A2: What type of tests?

```
══════════════════════════════════════════════════════════════
TEST TYPE

  1. Unit Tests
  2. Functional Tests (Playwright)
  3. API Tests (Insomnia / Node.js)
  4. All Tests (unit + functional + API)

Enter choice (1-4):
> _
══════════════════════════════════════════════════════════════
```
### Step A2b: Functional Test Mode (ONLY when functional is selected)

> **Skip this step entirely** if the user picked Unit (1) or API (3) only. For choice 2 (Functional) or 4 (All), MUST ask:

```
═════════════════════════════════════════════════════════════
FUNCTIONAL TEST EXECUTION MODE

  1. Mock   — page.route() intercepts every backend call. Hermetic, fast,
               no real services needed. Use for CI / local without backend.
  2. Real   — Real browser → real services on {selected-env} → real payment
               sandbox → real email/receipt. End-to-end behavioral parity
               with Katalon. Requires backend services reachable on the
               selected environment AND sandbox credentials configured.
               (Note: ALL three envs — local/test/stage — point to test
               APIs and test DB, so Real mode is valid in ALL of them.)

Enter choice (1-2) — NO default, user MUST pick:
> _
═════════════════════════════════════════════════════════════
```

**Rules:**
- Store the answer as `{test-mode}` ∈ {`mock`, `real`}.
- **No smart default — user MUST pick explicitly every time.** All three environments (`local`, `test`, `stage`) point to test APIs/DB, so Real mode is valid in ALL three. If the user presses Enter without typing 1 or 2, re-prompt with `❌ Mode is required — type 1 for Mock or 2 for Real.` Do NOT silently default.
- The choice is exported as `TEST_MODE` env var to ALL Playwright invocations: `TEST_MODE=mock npx playwright test ...` or `TEST_MODE=real npx playwright test ...`.

> **`RUN_SEED=<integer>` env var (deterministic-replay switch — OPTIONAL but documented).** When set and forwarded to BOTH api-tests (`RUN_SEED=42 npm test`) AND functional-tests (`RUN_SEED=42 npx playwright test`), the run is reproducible: same seed → same record selection (mulberry32 PRNG in both runners) → same request bodies → same pass/fail/skip counts. Required for triaging flaky vs deterministic failures. Side effects activated when set: (a) Playwright forces `workers: 1`; (b) functional `global-setup` resets catalog quarantine state; (c) ledger entries record `runSeed: "<value>"` for audit. Unset (default `'0'`) still uses seeded PRNG — fully deterministic across machines unless catalog/code changes.

> **`--type=<slice>` CLI slice filter (OPTIONAL, v3 taxonomy).** Accepted values: `smoke` | `regression` | `external-integration`. When supplied to this prompt, fan out to each layer's runner: (a) **Functional** — append `--grep @{type}` to every `npx playwright test ...` command in Step A4 (e.g., `TEST_MODE={mode} npx playwright test --grep @smoke`); (b) **API** — append `--tag {type}` to every `node scripts/test-runner.js ...` command in Step A5 (filters `unit_test.metadata.tags[]`); (c) **Unit (Java)** — append `-Dgroups={type}` to every `mvn test ...` command in Step A6 (Surefire 3.x honors `-Dgroups` natively; no `<groups>` pom block required). `--type=external-integration` is **real-mode-only** — if `{test-mode}=mock`, STOP and re-ask; also **skip the unit layer** (Java `@Tag` taxonomy has no external-integration tier — that axis applies to functional + API only). Unset `--type` = today's behavior unchanged (all tests run, slice axis ignored).
- The `setupDefaultApiMocks(page)` helper (created by `/tdgs-aidlc-setup-functional-tests` Step 9 item 5) reads `process.env.TEST_MODE` at runtime: `mock` → register all `page.route()` interceptors; `real` → early-return so the real browser hits the real services.
- **Real-mode pre-flight:** No service health checks needed for functional tests. The UI routes API calls through the **API gateway** (e.g., Apigee) — not directly to localhost backends. Playwright's `webServer` config auto-starts the dev server, and `global-setup.js` verifies reachability before tests run. If either fails, Playwright aborts with a clear message. Backend service `/actuator/health` checks are ONLY for API tests (Step A6).
- **Real-mode banner (MANDATORY):** print before execution starts:
  ```
  ⚠️  REAL MODE — tests will hit real services on {selected-env}.
      • Real payment-card pool record will be charged against the sandbox gateway.
      • Real emails will be sent to recipient-email pool addresses.
      • Real DB writes will land in the {selected-env} database.
      Press Ctrl-C within 5 seconds to abort.
  ```
  Then sleep 5 seconds before launching Playwright. The banner is suppressed when `TEST_MODE=mock`.
- **Report annotation:** the chained `node functional-tests/scripts/generate-report.js` MUST embed `"executionMode": "{test-mode}"` into `results.json.metadata` so reviewers can tell at a glance whether a green run was hermetic-mock or real-wire. The dashboard renders a colored badge (`MOCK` blue, `REAL` orange) next to the run row.
### Step A3: Scan Workspace & Show Inventory

Scan the workspace for **all repos** and check each for test infrastructure matching the selected type(s).

**How to detect test infrastructure per type:**

| Test Type | What to Scan For | Test File Patterns |
|-----------|-----------------|-------------------|
| **Unit** | Java: `src/test/java/` dir; JS: `src/__tests__/` dir or `*.test.js` files; Python: `tests/` dir | `*Test.java`, `*.test.js`, `*.test.jsx`, `*.test.ts`, `test_*.py` |
| **Functional** | `playwright.config.js` + `functional-tests/tests/e2e/` dir | `*.spec.js`, `*.spec.ts` in `functional-tests/tests/e2e/` |
| **API** | `api-tests/` dir + `api-tests/scripts/test-runner.js` + `api-tests/collections/*.json` | `*.json` in `api-tests/collections/` |

**Count the actual test files** — not just whether a directory exists. An empty `api-tests/collections/` with no JSON files is "⚠️ No tests", not "✅ Ready".

**Display the full inventory:**

```
══════════════════════════════════════════════════════════════
FULL SUITE — TEST INVENTORY
══════════════════════════════════════════════════════════════

  Selected: {Unit | Functional | API | All}

  #  Repo                         Type         Files    Status
  ─  ───────────────────────────  ───────────  ───────  ──────────
  1  {ui-repo}/                   Unit         {N}      ✅ Ready
  2  {ui-repo}/                   Functional   {N}      ✅ Ready
  3  {backend-repo-1}/            Unit         {N}      ✅ Ready
  4  {backend-repo-1}/            API          {N}      ✅ Ready
  5  {backend-repo-2}/            Unit         {N}      ✅ Ready
  6  {backend-repo-2}/            API          0        ⚠️ No tests
  7  {backend-repo-3}/            Unit         0        ⚠️ No tests
  8  {backend-repo-3}/            API          0        ⚠️ No tests

══════════════════════════════════════════════════════════════
```

> **Only show rows for the selected test type(s).** If the user chose "Unit Tests", don't show Functional or API rows. If "All", show all types.

### Step A4: Handle Missing Tests (this prompt NEVER generates)

> **HARD CONTRACT:** `/tdgs-aidlc-run-tests` only runs existing tests. It MUST NOT invoke any `generate-*` prompt, MUST NOT scaffold any test files, and MUST NOT silently skip the check. This contract aligns with G5 (no auto-scaffolding) and the canonical decision that test creation is exclusively owned by the `generate-*` prompts.

**If ANY repo shows "⚠️ No tests" for the selected type(s):**

```
⚠️  The following repos have no tests for the requested type:

  • {backend-repo-2}/ — API (0 test files)
  • {backend-repo-3}/ — Unit (0 test files)
  • {backend-repo-3}/ — API (0 test files)

This prompt does NOT generate tests. To create them, exit and run the
appropriate generate prompt first, then return:
  • Unit:        /tdgs-aidlc-generate-unit-tests
  • Functional:  /tdgs-aidlc-generate-functional-tests
  • API:         /tdgs-aidlc-generate-api-tests

For THIS run, choose how to proceed with the missing repos:
  a) Skip all — exclude every "No tests" row from this run
  b) Specify per repo — e.g., "6 skip, 7 skip, 8 skip"
  c) Abort — stop now and run the generate prompt first

Choice (a/b/c):
> _
```

**If the user picks (c)**, STOP with: `⏹️ Aborted. Run the appropriate /tdgs-aidlc-generate-* prompt to create tests, then re-run /tdgs-aidlc-run-tests.` Do NOT auto-invoke any generator.

**If ALL repos show ✅ Ready:** Skip this step entirely — proceed to confirmation.

### Step A5: Confirm and Run

```
Ready to run:

  • Unit tests in: {repo-1}/, {repo-2}/, ...
  • Functional tests in: {ui-repo}/
  • API tests in: {service-1}/, {service-2}/, ...

Confirm? (Enter to proceed, or specify row numbers to exclude, e.g., "exclude 3,5"):
> _
```

### Step A6: Execute Full Suite

> ⚠️ **CRITICAL: NEVER write static/hardcoded report files.** All custom HTML dashboards and markdown summaries MUST be generated by report scripts that read native test output (results.json / surefire XML / Jest JSON). If a report generation script exists in the repo, it MUST be chained after every test execution using the exit-code-preserving pattern (per G14). Never manually author or edit report HTML/MD files.

Run tests per confirmed repo. For **each test type**, use the commands and report locations below.

#### Unit Tests — Full Suite

> **CRITICAL: Detect existing test scripts before running commands.** Read each repo's `package.json` (for JS/TS repos) or `pom.xml` (for Java) to determine the correct test command. Many apps use `env-cmd`, `cross-env`, or similar wrappers. ALWAYS invoke via `npm test --` or `npm run test:coverage` (the npm script) — never raw `react-scripts test`.
>
> **JS/TS unit tests do NOT require env files to exist.** `env-cmd` v8+ gracefully continues when the referenced `.env.*` file is missing (no hard error — it simply sets no variables). Unit tests mock all network/service dependencies and do not need real environment variables. Do NOT flag a missing env file as a blocker for unit test execution. The env file requirement only applies to **dev server startup** (Functional Tests pre-check) where real backend URLs are needed.

> **CRITICAL (Java/Maven): `-Dmaven.test.failure.ignore=true` is MANDATORY** when `test` and `jacoco:report` are goals in a single Maven invocation. Without it, Maven aborts the entire reactor on test failures — `jacoco:report` never executes, producing 0% coverage, empty Module Coverage Breakdown, and no `jacoco.csv`. The flag makes Surefire record failures without stopping Maven, so JaCoCo still instruments and reports coverage. The exit-code-preserving pattern (`&& ec=0 || ec=$?; ...; exit $ec`) ensures the overall command still reflects test failures for CI. The surefire XML files (`target/surefire-reports/*.xml`) capture individual test failures regardless.

| Stack | Command | Coverage Report | Test Results |
|-------|---------|-----------------|--------------|
| Java / Spring Boot | `cd {repo} && mvn clean test jacoco:report -Dmaven.test.failure.ignore=true && ec=0 \|\| ec=$?; (mvn surefire-report:report-only 2>&1 \|\| echo "⚠️ surefire-report skipped"); node scripts/generate-report.js; exit $ec` | `target/site/jacoco/index.html` | `target/site/surefire-report.html` (if generated) + `test-results/test-summary.html` |
| React / JS (if `test:coverage:full` exists) | `cd {repo} && npm run test:coverage:full` | `coverage/lcov-report/index.html` | `test-results/test-summary.html` + `test-results/test-report.md` |
| React / JS (if only `test:coverage` exists) | `cd {repo} && npm run test:coverage && ec=0 \|\| ec=$?; node scripts/generate-report.js; exit $ec` | `coverage/lcov-report/index.html` | `test-results/test-summary.html` + `test-results/test-report.md` |
| React / JS (if NO coverage script) | `cd {repo} && npm test -- --watchAll=false --coverage && ec=0 \|\| ec=$?; node scripts/generate-report.js; exit $ec` | `coverage/lcov-report/index.html` | `test-results/test-summary.html` + `test-results/test-report.md` |
| Python | `cd {repo} && pytest --cov --cov-report=html && ec=0 \|\| ec=$?; python scripts/generate_report.py; exit $ec` | `htmlcov/index.html` | `test-results/test-summary.html` |
| Node.js (backend) | `cd {repo} && npm run test:coverage && ec=0 \|\| ec=$?; node scripts/generate-report.js; exit $ec` | `coverage/lcov-report/index.html` | `test-results/test-summary.html` |
| C# / .NET | `cd {repo} && dotnet test --collect:"XPlat Code Coverage"` | `TestResults/coverage/` | `TestResults/` |

> Report chaining: **per G14** (use exit-code-preserving `;` pattern — NOT `&&`). In direct shell invocations, capture exit code before running report scripts: `cmd && ec=0 || ec=$?; <report-scripts>; exit $ec`.
>
> **Detection rule:** For Java/Spring Boot and React/JS repos, expect `.js` (created by `/tdgs-aidlc-setup-unit-tests`). For Python repos, expect `.py`. If the expected file does not exist, check for the alternate extension before skipping.

(`npm test --` / `npm run test:coverage` rationale: see Pre-flight Check #3.)

#### Functional Tests — Full Suite

```bash
cd {ui-repo} && TEST_MODE={test-mode} npx playwright test && ec=0 || ec=$?; node functional-tests/scripts/generate-report.js; node functional-tests/scripts/verify-failure-artifacts.js; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec
```

Or via the mode-specific npm scripts (preferred — avoids mode mismatch):
```bash
# For mock mode:
cd {ui-repo} && npm run test:e2e:mock
# For real mode:
cd {ui-repo} && npm run test:e2e:real
```

> **`TEST_MODE` is MANDATORY** — every `npx playwright test` invocation in this prompt MUST be prefixed with `TEST_MODE={test-mode}` where `{test-mode}` came from Step A2b. Forgetting it makes the helper fall back to its default (`mock`), silently masking real-mode runs as hermetic. Use `cross-env TEST_MODE={test-mode}` on Windows shells.
>
> **Timeout (mock & real):** Playwright config sets `timeout: 60_000` for both modes — MAX CAP, not default wait. Playwright resolves on first match and continues immediately; the cap only fires on hangs. 60s ceiling absorbs the slowest legitimate real-mode chain (payment + receipt + email tail latency). Anything longer is hung — fail fast and surface the real defect; see G11 contract above.

> Report chaining: **per G14** — use exit-code-preserving pattern: `npx playwright test && ec=0 || ec=$?; node functional-tests/scripts/generate-report.js; exit $ec`.

**Pre-check — dev server:**
- If `webServer` is configured in `playwright.config.js` → Playwright auto-starts it. **But first verify the webServer command will succeed:**
  1. Read the `webServer.command` value (usually `npm start` or similar)
  2. Read the UI repo's `package.json` `"start"` script to check if it uses `env-cmd`, `cross-env`, `dotenv-cli`, or similar environment wrappers
  3. If an env wrapper is detected (e.g., `env-cmd environments/.env.serve.local`), **verify the referenced env file exists on disk**. If the file is missing → STOP with: `"❌ Dev server requires {env-file} but it was not found. Create the file or update the start script, then re-run."`
  4. Also verify `node_modules/` exists in the UI repo — if missing, run `npm install` first
- If `webServer` is NOT configured → tell the user: "Start the dev server first (`npm start` in `{ui-repo}/`) and re-run."

**Report locations:**
| Report | Path |
|--------|------|
| **Playwright HTML (canonical — open this)** | `{ui-repo}/functional-tests/test-results/html-report/index.html` |
| Markdown Summary (for PRs / CI logs) | `{ui-repo}/functional-tests/test-results/test-report.md` |
| JSON results (machine-readable) | `{ui-repo}/functional-tests/test-results/results.json` |

#### API Tests — Full Suite

**Cross-service execution order (MANDATORY before execution):**

Some collections have SETUP steps that call OTHER services' endpoints (e.g., service B's collection calls service A's endpoints to create prerequisite data before testing service B's own endpoints). These cross-service SETUP calls are normal chaining — they run in ALL environments unconditionally:

1. **Scan each collection's request URLs** for references to other services' environment variables — look for `{{ <service_name>_base_url }}` patterns that don't match the collection's own service
2. **Build execution order:** If service B's collection references service A's URLs → run A's tests before B's (A must be healthy)
3. **Health-check ALL referenced services:** If service B's collection calls service A's endpoints, BOTH service A AND service B must be health-checked and running
4. **Display the execution order:**
   ```
   API Test Execution Order:
     1. <service-folder-1>/   (no cross-service SETUP calls)
     2. <service-folder-2>/   (no cross-service SETUP calls)
     3. <service-folder-3>/   (SETUP calls: <service-1>)
   ```

For **each** backend service with a confirmed `api-tests/` (in dependency order):

1. **Health check** — is the service reachable AND healthy?
   
   **If `{selected-env}` is `local`:**
   ```bash
   curl -sf http://localhost:{port}/actuator/health || curl -sf http://localhost:{port}/health || echo "NOT RUNNING"
   ```
   **Port detection:** Read from `api-tests/environments/local.json` → `base_url`, or from `application.properties`/`application.yml` → `server.port`, or default to 8080 for the first service and increment by 1 for each additional service.

   **CRITICAL — Health Check Response Validation (NOT just HTTP status):**
   A service returning HTTP 200 for `/actuator/health` is necessary but NOT sufficient. The response body must also be checked:
   - Parse the JSON response body
   - If `status` field is `"DOWN"` or `"OUT_OF_SERVICE"` → the service is NOT healthy (database or downstream dependency is unavailable)
   - If `status` field is `"UP"` → the service is healthy
   - If `details` or `components` contains any sub-component with `status: "DOWN"` (e.g., `db`, `diskSpace`, `redis`) → log a warning about which component is down
   - Common pattern: service returns `200 OK` with `{"status":"DOWN","components":{"db":{"status":"DOWN","details":{"error":"...JDBC..."}}}}` — this means the DB is unreachable. Classify as infrastructure issue, NOT application defect.

   **If `{selected-env}` is `test` or `stage`:** Read `base_url` from `api-tests/environments/{selected-env}.json` and health-check that URL. Do NOT attempt to start services locally.

2. **HARD STOP if not running (G7 — NEVER auto-start services):**

   > ⚠️ **This prompt MUST NOT start application servers.** The user is responsible for starting services before running tests (per G7 guardrail). This prompt ONLY probes health endpoints.

   If a service is unreachable after the health check above, **STOP** with a clear message listing each down service and its manual-start command:

   ```
   ❌ SERVICE NOT RUNNING — cannot proceed.

   The following service(s) did not respond to health checks:
     • {service-name} on port {port}

   Start manually before re-running this prompt:
     Java / Spring Boot:  cd {service-repo} && mvn spring-boot:run -Plocal
     Node.js:             cd {service-repo} && npm start
     Python (FastAPI):    cd {service-repo} && uvicorn main:app --port {port}
     Python (Flask):      cd {service-repo} && flask run --port {port}
     C# / .NET:           cd {service-repo} && dotnet run
     Lambda (SAM):        cd {service-repo} && sam local start-api --port {port}

   Then re-run /tdgs-aidlc-run-tests.
   ```

   **Do NOT proceed to step 3 until ALL required services pass health checks.**

3. **Run tests and generate reports (chained):**

   **Local:**
   ```bash
   cd {service-repo}/api-tests && npm run test:full
   ```
   **Test or Stage:**
   ```bash
   cd {service-repo}/api-tests && node scripts/test-runner.js --env {selected-env} && ec=0 || ec=$?; node scripts/generate-report.js; exit $ec
   ```

4. **After ALL API tests for ALL services complete:** Proceed to report aggregation (Step 8).

**Report locations:**
| Report | Path |
|--------|------|
| HTML summary | `{service-repo}/api-tests/test-results/test-summary.html` |
| JSON results | `{service-repo}/api-tests/test-results/results.json` |
| Markdown | `{service-repo}/api-tests/test-results/test-report.md` |

---

## Path B: Issue-Scoped

### Step B2: Ask for Issue Number

```
══════════════════════════════════════════════════════════════
ISSUE-SCOPED TEST RUN

Enter the GitHub issue number (e.g., 3, 8, 42):
> _
══════════════════════════════════════════════════════════════
```

### Step B3: Locate Spec

Search the docs repo for the spec associated with this issue:

1. **Find the docs repo** — scan workspace for directories matching `*-docs*/` or `*-docs-sim/` that contain an `implementation-artifacts/` subdirectory.

2. **Search for spec files** matching the issue number:
   - `implementation-artifacts/spec-ghi-{issue-number}*.md`
   - `implementation-artifacts/spec-gh-{issue-number}*.md`
   - `implementation-artifacts/spec*{issue-number}*.md`

3. **If found:** Read the spec's **YAML frontmatter** to extract:
   - `files_to_create` — array of file paths (includes new test files planned by Quick-Dev)
   - `files_to_modify` — array of file paths (includes existing test files updated by Quick-Dev)
   - `test_patterns` — testing conventions used
   - Also scan the **Implementation Plan** section for test-related tasks with file paths and scenarios

4. **If NOT found:**
   ```
   ⚠️  No spec found for issue #{issue-number}.
   
   Options:
     a) Search by branch name — look for branches in all repos containing "{issue-number}" 
        (e.g., feature/GHI-{N}-*, dev/GHI-{N}-*)
     b) Manually specify test file paths
     c) Abort
   
   Choice (a/b/c):
   > _
   ```

   **Option (a):** For each repo in the workspace, run `cd {repo} && git branch -a | grep -i "{issue-number}"`. If branches found, run `git diff --name-only {integration-branch}...{issue-branch}` to find test files added/modified. Filter to test file patterns only (`*Test.java`, `*.test.js`, `*.spec.js`, `api-tests/collections/*.json`).

   **Option (b):** Ask for paths interactively:
   ```
   Enter test file paths (one per line, empty line when done):
   > _
   ```

### Step B4: Extract & Classify Test Files from Spec

From the spec's `files_to_create` and `files_to_modify`, extract **only test files** and classify each by type:

**Classification rules:**

| Pattern | Type |
|---------|------|
| `src/test/java/**/*Test.java` | Unit (Java) |
| `src/__tests__/**/*.test.js` or `*.test.jsx` or `*.test.ts` | Unit (JS/TS) |
| `tests/**/test_*.py` or `tests/**/*_test.py` | Unit (Python) |
| `functional-tests/tests/e2e/**/*.spec.js` or `*.spec.ts` | Functional |
| `api-tests/collections/*.json` | API |
| `api-tests/data/*.json` | API (test data — not directly runnable, but required by API tests) |

**Check each file's existence on disk.** For each file in the combined `files_to_create` + `files_to_modify` list, verify the file actually exists in the workspace.

### Step B5: Show Issue Test Plan & Ask for Test Type

Display what the spec planned, what exists, and let the user choose which type(s) to run:

```
══════════════════════════════════════════════════════════════
ISSUE #{issue-number} — TEST PLAN
══════════════════════════════════════════════════════════════

  Spec:       {docs-repo}/implementation-artifacts/{spec-filename}.md
  Title:      {spec title from frontmatter}

  Test files from spec:

  #  Type          Repo                      File                                       Exists?
  ─  ───────────   ────────────────────────  ─────────────────────────────────────────   ───────
  1  Unit (Java)   {backend-repo}/           src/test/java/.../SomeClassTest.java        ✅
  2  Unit (JS)     {ui-repo}/                src/__tests__/.../SomeComponent.test.js     ✅
  3  Unit (JS)     {ui-repo}/                src/__tests__/.../AnotherComp.test.js       ✅
  4  Functional    {ui-repo}/                functional-tests/.../feature.positive.spec.js  ✅
  5  Functional    {ui-repo}/                functional-tests/.../feature.negative.spec.js  ✅
  6  API           {backend-repo}/           api-tests/collections/some-tests.json       ❌
  7  API (data)    {backend-repo}/           api-tests/data/some-test-data.json          ❌

  Summary:
    Unit:        3 files (3 exist ✅)
    Functional:  2 files (2 exist ✅)
    API:         2 files (0 exist ❌)

══════════════════════════════════════════════════════════════
```

**Then ask:**

```
Which test type(s) do you want to run for issue #{issue-number}?

  1. Unit Tests only       (3 files)
  2. Functional Tests only (2 files)
  3. API Tests only        (0 files — ⚠️ none exist yet)
  4. All available         (run all that exist: 5 files)

Enter choice (1-4):
> _
```

### Step B6: Handle Missing Files

**If the user's selection includes files that don't exist (❌):**

```
⚠️  {count} test file(s) from the spec do not exist yet.

These were planned by Quick-Dev but haven't been created yet.
The following will be SKIPPED (cannot run non-existent files):

  • {backend-repo}/api-tests/collections/some-tests.json
  • {backend-repo}/api-tests/data/some-test-data.json

Continuing with {remaining-count} existing file(s).

Press Enter to proceed, or type "abort" to cancel:
> _
```

> **Issue-scoped runs do NOT invoke generate prompts.** The spec defines exactly what should exist — if files are missing, it means Quick-Dev hasn't created them yet. Exit, run Quick-Dev for the issue (or the appropriate `/tdgs-aidlc-generate-*` prompt) first, then re-run `/tdgs-aidlc-run-tests`.

### Step B6b: Functional Mode (Issue-Scoped, conditional)

> **Skip entirely** if the user's selection in Step B5 does NOT include any Functional file. Otherwise ask the SAME mock-vs-real question from Step A2b (no smart default — user MUST pick), and emit the SAME 5-second abort banner before launching Playwright. No service health checks needed — Playwright's `webServer` + `global-setup.js` handle reachability. Issue-scoped runs MUST honor the same TEST_MODE contract as full-suite runs — silently defaulting to mock for an issue-scoped real-mode validation is a documented misclassification source.

### Step B7: Execute Issue-Scoped Tests

Run **only** the specific test files from the spec that exist on disk, filtered by the user's type selection.

#### Unit Tests — Issue-Scoped

> **Same environment-aware principle as full suite:** Use `npm test --` for JS/TS repos to inherit `env-cmd` or other wrappers from `package.json`.

| Stack | Command | Report |
|-------|---------|--------|
| Java | `cd {repo} && mvn test -Dtest={TestClass1},{TestClass2} jacoco:report -Dmaven.test.failure.ignore=true -Plocal; (mvn surefire-report:report-only 2>&1 || echo "⚠️ surefire-report skipped"); node scripts/generate-report.js` | `target/site/jacoco/index.html` + `target/site/surefire-report.html` (if generated) + `test-results/test-summary.html` |
| React / JS | `cd {repo} && npm test -- --watchAll=false --coverage --testPathPattern="{file1}\|{file2}"; node scripts/generate-report.js` | `coverage/lcov-report/index.html` + `test-results/test-summary.html` |
| Python | `cd {repo} && pytest {file1} {file2} --cov --cov-report=html; python scripts/generate_report.py` | `htmlcov/index.html` + `test-results/test-summary.html` |

> Report chaining: **per G14** — detect `.js` vs `.py` script before chaining.

> **Java — multiple test classes:** Extract class names from file paths (e.g., `src/test/java/.../SomeServiceTest.java` → `SomeServiceTest`) and join with commas for `-Dtest=`.
>
> **JS — multiple files:** Join paths with `\|` for `--testPathPattern` regex.

**If Java tests and JaCoCo is configured**, also generate coverage:
```bash
cd {repo} && mvn test -Dtest={TestClasses} jacoco:report -Dmaven.test.failure.ignore=true -Plocal
```

#### Functional Tests — Issue-Scoped

```bash
cd {ui-repo} && TEST_MODE={test-mode} npx playwright test {spec-file-1} {spec-file-2} && ec=0 || ec=$?; node functional-tests/scripts/generate-report.js; exit $ec
```

Pass the **exact relative spec file paths** from the spec (relative to the UI repo root). Example:
```bash
cd {ui-repo} && TEST_MODE={test-mode} npx playwright test \
  functional-tests/tests/e2e/positive/{feature}.positive.spec.js \
  functional-tests/tests/e2e/negative/{feature}.negative.spec.js \
  ; node functional-tests/scripts/generate-report.js
```

> `{test-mode}` carries forward from Step A2b (user explicitly chose Mock or Real — no implicit default). Issue-scoped runs respect the same mode contract as full-suite — do NOT silently fall back to mock.

**Pre-check — dev server:** Same as full suite (auto-start via `webServer` config or ask user to start manually).

**Report locations:** Same paths as full suite — `{ui-repo}/functional-tests/test-results/`.

#### API Tests — Issue-Scoped

```bash
cd {service-repo}/api-tests && node scripts/test-runner.js --env {selected-env} --collection={collection-filename}; node scripts/generate-report.js
```

Pass the **collection JSON file name** from the spec (e.g., `{feature}-validation.json`).

**Pre-check — service health:** Same as full suite (health check + auto-start for local only; remote health check for test/stage).

**Report locations:** Same paths as full suite — `{service-repo}/api-tests/test-results/`.

---

## Step 8: Results Summary (Both Paths)

After execution completes, display a unified summary:

```
══════════════════════════════════════════════════════════════
TEST EXECUTION RESULTS
══════════════════════════════════════════════════════════════

  Scope:      {Full Suite | Issue #N}
  Environment: {selected-env}
  Test Types: {Unit, Functional, API}
  Date:       {timestamp}

  ───────────────────────────────────────────────────────────
  Type            Repo                    Total  Pass  Fail  Skip  DataIssue  Infra
  ──────────────  ──────────────────────  ─────  ────  ────  ────  ─────────  ─────
  Unit            {repo-1}/               {N}    {N}   {N}   {N}   {N}        {N}
  Unit            {repo-2}/               {N}    {N}   {N}   {N}   {N}        {N}
  Functional      {ui-repo}/              {N}    {N}   {N}   {N}   {N}        {N}
  API             {service-1}/            {N}    {N}   {N}   {N}   {N}        {N}
  API             {service-2}/            {N}    {N}   {N}   {N}   {N}        {N}
  ──────────────  ──────────────────────  ─────  ────  ────  ────  ─────────  ─────
  TOTAL                                   {N}    {N}   {N}   {N}   {N}        {N}

  Overall: {pass-rate}% pass rate  (G11 formula: passed / (passed + failed + dataIssue + infra) — skipped EXCLUDED from denominator)
  ───────────────────────────────────────────────────────────

══════════════════════════════════════════════════════════════
```

### Report Locations

Always list the generated reports so the user can open them:

```
  Reports generated:
    ✅ {repo}/target/site/jacoco/index.html              ← Unit coverage (Java)
    ✅ {repo}/target/site/surefire-report.html            ← Unit test results (Java)
    ✅ {repo}/coverage/lcov-report/index.html            ← Unit coverage (JS) — Jest --coverage interactive HTML
    ✅ {repo}/test-results/test-report.md                 ← Unit markdown summary (JS — for PRs)
    ✅ {ui-repo}/functional-tests/test-results/html-report/index.html  ← Playwright HTML (canonical per-run report — open this)
    ✅ {ui-repo}/functional-tests/test-results/test-report.md          ← Functional markdown summary (for PRs)
    ✅ {service}/api-tests/test-results/test-summary.html              ← API custom dashboard (Inso has no built-in HTML)
    ✅ {service}/api-tests/test-results/test-report.md                 ← API markdown summary (for PRs)
    ✅ {docs-repo}/test-data/dashboard.html                            ← Cross-run trend (workspace-wide)
```

> **Why no JUnit XML in the table:** no CI pipeline in this workspace consumes JUnit XML today. Functional + Unit (JS) reporters are configured to NOT emit it. When a real CI consumer is wired up, re-enable: Playwright `['junit', { outputFile: '…/results.xml' }]` reporter, and Jest `--reporters=jest-junit` flag.
>
> **Why API has a custom HTML dashboard but Functional doesn't:** Playwright ships a rich built-in HTML report (per-test steps, screenshot, video, trace viewer, request/response). Inso CLI does not — so API tests own a small custom dashboard. Don't try to "match formats" between the two; each runner uses the best report its ecosystem provides.

> **Reports use the same file paths for both full-suite and issue-scoped runs.** Issue-scoped results are scoped to the tested files but written to the same locations. A subsequent full-suite run will overwrite them.

### Failed Test Analysis

**If any tests failed**, categorize each failure and present an analysis:

| Category | Meaning | Typical Cause | Action |
|----------|---------|---------------|--------|
| **Test Defect** | Test code is wrong or stale | Selector changed, timing issue, stale mock data | Describe needed fix — do NOT auto-fix |
| **Application Defect** | Production code returns unexpected result | Bug in controller, service, DAO, or UI component | Flag as bug — do NOT modify production code |
| **Data Issue** | Test data is invalid, placeholder, or token unresolved | Identity pool has `PLACEHOLDER_*` values; data doesn’t match external system validation; SETUP request references `{{ <service>_base_url }}` that the consumer's `environments/<env>.json` does not define | If "unrecognized token" → add the missing cross-service var to all 3 env files (see `/tdgs-aidlc-generate-api-tests` Cross-Service Chaining section). Otherwise run `/tdgs-aidlc-setup-testdata` to replace placeholders with real records |
| **Chain Skip** | Skipped due to upstream failure | A preceding test in the chain failed, so this test could not execute | Fix the upstream failure first — this test will run once its dependency passes |
| **Cross-Service Skip (G9b)** | Skipped because an upstream service (different repo) did not produce required data | The test entry has a structured `skipReason: { fromService, toService, businessRule, requiredInput, resolution }` payload. Counted as a SUBSET of `skipped` (in `summary.skippedCrossService`). | Read the test's `skipReason.resolution` verbatim and follow it — do NOT improvise a different fix. The runner already wrote the exact next step. |
| **Infrastructure Issue** | Service unreachable, no HTTP response at all | DB not running, port conflict, ECONNREFUSED, DNS failure, socket timeout | Describe resolution steps |

> **CRITICAL — Error Classification Alignment with test-runner:**
>
> The test-runner writes `status` values in `results.json`: `pass|fail|skip|data-issue|infra|generation-bug|unresolved-token`. The two pre-send-guard statuses (`generation-bug`, `unresolved-token`) roll up into the `dataIssue` summary counter for math-invariant purposes; treat them as data-issue triage cases (re-generate the affected collection — do NOT report as API defects). When categorizing failures in this analysis:
> - `status: "fail"` → **Application Defect** OR **Test Defect** (read the assertion message to determine which)
> - `status: "data-issue"` → **Data Issue** (resolved values contained `PLACEHOLDER_*` strings, OR an `apiChain[]` `capture` JSONPath did not match the producer's actual response shape and yielded `undefined` — the generator emitted the best-inferred path from KB/DTO; runtime drift is surfaced here, not as a hard fail; dev opens the collection and updates the JSONPath)
> - `status: "skip"` AND entry has `skipReason: {fromService, toService, businessRule, requiredInput, resolution}` → **Cross-Service Skip (G9b)** (render the 5-field payload verbatim — see render template below)
> - `status: "skip"` AND no `skipReason` → **Chain Skip** (within-service `{{captured.*}}` value missing)
> - `status: "infra"` → **Infrastructure Issue** (no HTTP response received at all, OR HTTP 500 with DB/downstream error keywords)
>
> **DB/Downstream Error Keywords (classify as `infra`, NOT `fail`):**
> If the HTTP 500 response body contains ANY of these keywords (case-insensitive), classify as `infra` — the service is running but its database or downstream dependency is not:
> `connection refused`, `cannot connect`, `JDBC`, `Connection reset`, `table not found`, `ORA-`, `PSQLException`, `DataAccessException`, `SocketTimeoutException`, `UnknownHostException`, `connection pool`, `too many connections`, `ECONNREFUSED`, `database`, `datasource`, `pool exhausted`, `SQLTransientConnectionException`
>
> **The #1 misclassification to prevent:** HTTP 500 with a JSON error body that is a BUSINESS/APPLICATION error (e.g., `{"errorCode":"ERR003","errorMessage":"Critical Error"}`) is **NOT** an Infrastructure Issue. But HTTP 500 with a DATABASE error (e.g., `{"errorMessage":"Cannot get JDBC connection"}`) IS an Infrastructure Issue. Distinguish between application errors (code bugs → `fail`) and infrastructure errors (dependency down → `infra`).

```
══════════════════════════════════════════════════════════════
FAILED TEST ANALYSIS
══════════════════════════════════════════════════════════════

  #  Test Name                       Type        Category        Repo                  Hint
  ─  ──────────────────────────────  ──────────  ──────────────  ────────────────────  ──────────────
  1  {test method/spec name}         Unit        App Defect      {repo}/              Expected 400, got 500
  2  {test method/spec name}         Functional  Test Defect     {ui-repo}/           Selector not found
  3  {test method/spec name}         API         Infra Issue     {service}/           Connection refused :8080

══════════════════════════════════════════════════════════════
```

**For API test failures**, always include the request/response context from `results.json`:
```
  API FAILURE DETAIL — #{N}
  ────────────────────────────────────────────────────────
  Test:      {test name}
  Endpoint:  {METHOD} {url}
  Expected:  {expected status}
  Actual:    {actual status}

  Request:   {method} {url}
  Headers:   Content-Type: application/json | Authorization: Bearer ***
  Body:      {resolved request body — first 500 chars}

  Response:  {status code} {status text}
  Body:      {response body — first 500 chars}

  Assertion: {failed assertion description}
  ────────────────────────────────────────────────────────
```

> This request/response context is the #1 debugging artifact. Without seeing what was sent, developers cannot diagnose failures. The data comes from the `request` and `response` objects in `results.json` which the test-runner captures for every test execution.

### Post-Run Suggestion

Based on outcome, surface ONE of the following next-step lines (substitute `{N}`):

| Outcome | Surface message + next action |
|---|---|
| All passed | `✅ All tests passed.` → `/tdgs-aidlc-create-pull-request` (or full suite as regression if scoped) |
| App Defect | `❌ {N} application defect(s) found.` Fix production code, re-run `/tdgs-aidlc-run-tests` |
| Test Defect | `⚠️ {N} test defect(s) found.` Fix selectors/mocks/assertions, re-run `/tdgs-aidlc-run-tests` |
| Infra Issue | `🔧 {N} infrastructure issue(s).` Start required service(s), re-run `/tdgs-aidlc-run-tests` |
| Data Issue | `⚠️ {N} data issue(s).` Run `/tdgs-aidlc-setup-testdata` to replace PLACEHOLDER values, re-run |
| Chain Skip | `⏭️ {N} skipped due to upstream chain failures.` Fix upstream first — skipped tests auto-execute when deps pass |

**Cross-Service Skip (G9b) — render VERBATIM, never paraphrase the 5 fields.** For every `results.json` entry where `status==='skip'` AND `skipReason` is present, render ONE block:

```
⏭️ CROSS-SERVICE SKIP — #{N}
───────────────────────────────────────────────────────────
Test:           {test name}
From service:   {skipReason.fromService}
To service:     {skipReason.toService}      ← fix this upstream first
Business rule:  {skipReason.businessRule}
Required input: {skipReason.requiredInput}
Resolution:     {skipReason.resolution}
───────────────────────────────────────────────────────────
```

Footer summary line (always):
```
⏭️ Cross-service skips: {summary.skippedCrossService} test(s) blocked by {M} unique upstream service(s).
  → Fix upstream services in this order: {topo-sorted list of unique skipReason.toService values}
```

**If a `status==='skip'` entry's `skipReason` fails the 5-required-string AJV shape (any field missing or non-string)**, do NOT silently render — surface it explicitly:
```
⚠️ MALFORMED skipReason on test "{test name}" (service {service}). The runner emitted a partial payload. Re-run /tdgs-aidlc-setup-api-tests (or /tdgs-aidlc-setup-functional-tests for functional) to repair the runner's skip emitter — do NOT hand-patch results.json.
```

### Post-Run Report Validation (MANDATORY)

After test execution and report generation, validate the report's accuracy:

1. **Read `results.json`** — count actual pass/fail/skip/data-issue/infra per endpoint
2. **Read the generated report** (HTML or MD) — check the endpoint coverage table
3. **Cross-reference:** Every endpoint listed in the coverage table must match `results.json` counts:
   - If `results.json` shows 0 tests executed for an endpoint → coverage table MUST show ❌ NOT ✅
   - If `results.json` shows all tests skipped for an endpoint → coverage table MUST show ⏭️ SKIP NOT ✅
   - Only show ✅ when at least one test for that endpoint actually ran and passed
4. **If the report disagrees with `results.json`**, flag it:
   ```
   ⚠️ Report accuracy issue: {endpoint} shows ✅ in coverage table but results.json has 0 passing tests for this endpoint.
   → Regenerate the report: node scripts/generate-report.js
   ```

### Captured Values Summary (API Tests Only — MANDATORY)

After all API test results are collected, display a **consolidated captured-values summary** showing all data generated or consumed during this run. This is the single place to see every order number, trace number, reference ID, and other business values produced:

```
══════════════════════════════════════════════════════════════
CAPTURED VALUES SUMMARY (Data Ledger)
══════════════════════════════════════════════════════════════

  Service                  Key                     Value               Source Endpoint
  ───────────────────────  ──────────────────────  ──────────────────  ──────────────────────
  {service-1}/             {primaryKey-1}          {value-1}           POST /{endpointA}
  {service-1}/             {captureKey-2}          {value-2}           POST /{endpointA}
  {service-1}/             {captureKey-3}          {value-3}           POST /{endpointB}
  {service-2}/             {primaryKey-4}          {value-4}           POST /{endpointC}
  ───────────────────────  ──────────────────────  ──────────────────  ──────────────────────

  Identity Records Used:
  ───────────────────────  ──────────────────────  ──────────────────
  Pool Type                Record ID / Key Field   Status After Run
  ───────────────────────  ──────────────────────  ──────────────────
  {pool-type-1}            {key-field-value}       used → available (pass)
  {pool-type-2}            {key-field-value}       used → available (fail, consecutiveFailureCount++)
  ───────────────────────  ──────────────────────  ──────────────────

══════════════════════════════════════════════════════════════
```

> This data comes from `{service-repo}/api-tests/test-results/data-ledger.json` (per service). **`data-ledger.json` is MANDATORY** — it is written by the test-runner per the contract in `/tdgs-aidlc-setup-api-tests`. If a service ran API tests but its `data-ledger.json` is missing, this is a HARD FAILURE: stop with `❌ {service-repo}/api-tests/test-results/data-ledger.json missing after test run. test-runner.js is not honoring the data-ledger contract — re-run /tdgs-aidlc-setup-api-tests to repair the runner.` Do NOT silently skip the section — the absence of the ledger means downstream visibility (what data was consumed, what was created) is broken and that must be surfaced, not hidden.

---

### Step 8b: Phantom Endpoint Reconciliation (MANDATORY — HARD STOP)

> ⚠️ After every API test run, reconcile the endpoints actually exercised against the endpoints physically present in the tested service's source code. This catches generation bugs that the pre-generation gate (in `/tdgs-aidlc-generate-api-tests`) may have missed and prevents reports from claiming coverage for endpoints that do not exist.

For each service that ran API tests:

1. Read every `endpoint` field from `{service-repo}/api-tests/test-results/results.json` (`tests[].endpoint`)
2. Build `controllerEndpoints[]` for THIS service by scanning its controller files for `(METHOD, PATH)` pairs (same logic as the pre-generation gate)
3. **SETUP requests** (test name starts with `SETUP:`) are exempted — they intentionally call other services
4. For every non-SETUP endpoint in `results.json` that is NOT in `controllerEndpoints[]`:
   - Surface as a phantom: `❌ PHANTOM in results: {service-repo} ran tests for "{METHOD} {PATH}" but no controller in {service-repo} has this endpoint.`
   - Stop the post-run pipeline (do NOT regenerate the dashboard with bad data)
   - Instruct: `Re-run /tdgs-aidlc-generate-api-tests for {service-repo} — the pre-generation gate failed or was skipped.`

**Display reconciliation per service:**
```
═══════════════════════════════════════════════════════════════
PHANTOM ENDPOINT RECONCILIATION
═══════════════════════════════════════════════════════════════
  Service                  Controllers   Endpoints in results   Phantom
  ───────────────────────   ───────────   ────────────────────   ───────
  {service-1}/             {N}           {N}                    {0 ✅ | N ❌}
  {service-2}/             {N}           {N}                    {0 ✅ | N ❌}
═══════════════════════════════════════════════════════════════
```

If any phantom is found, the post-execution dashboard step (Step 9) MUST NOT proceed — a dashboard built from contaminated results is worse than no dashboard.

---

## Step 9: Post-Execution Dashboard & Catalog Write-Back (MANDATORY)

> This step runs AFTER all test execution and reporting. It ensures the catalog and dashboard reflect the actual test run results. **The dashboard is rendered by exactly one script — this prompt does NOT render HTML directly.**

### 9a. Catalog YAML Write-Back

The per-service `test-runner.js` is responsible for catalog write-back per the contract in `/tdgs-aidlc-setup-api-tests` (Catalog Finalization Flow). This step **verifies** the write-back happened:

1. Compare `test-data-catalog.yaml` modified time to the run start time — if older, the runner did NOT write back. Print a hard error: `❌ {service-repo}/api-tests/scripts/test-runner.js did not persist catalog changes — verify persistCatalogStatus() is wired and re-run.`
2. Confirm each `{service-repo}/api-tests/test-results/data-ledger.json` exists and contains `summary` matching the corresponding `results.json.summary` (use the math invariants below).
3. **Do NOT** invent retroactive status changes here — the runner is the only source of truth for record state transitions. This step is read-only verification.

### 9b. Trust the Runner's Status Field (NO LLM RE-CLASSIFICATION)

Every test entry in `results.json` already has `status` (`pass|fail|skip|data-issue|infra`) set deterministically by `test-runner.js` per the classification rules in `/tdgs-aidlc-setup-api-tests`. **This prompt MUST NOT re-classify by reading log tails, error strings, or response bodies.** All triage logic in this prompt reads `status` directly:

- `infra` → surface to the user as an environment problem (no service running, DNS, timeout); do NOT treat as code defect
- `data-issue` → surface as catalog/data problem (token unresolved, PLACEHOLDER value, business rule violation); link to `/tdgs-aidlc-setup-testdata`
- `fail` → surface as code or contract defect; show captured request + response from `results.json`
- `skip` → surface as upstream chain failure; do NOT count against pass rate
- `pass` → success

**LLM-driven re-classification is the documented root cause of "DB connection not defined" hallucinations** when the actual cause was an unresolved catalog token. The runner already knows; trust it.

### 9c. Regenerate the Workspace Dashboard Automatically

After the per-service `generate-report.js` writers finish, regenerate the workspace-level dashboard and append a run entry to `ledger.yaml` by running the standalone dashboard generator script:

```bash
node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js --workspace-root {workspace-root}
```

This script (generated by `/tdgs-aidlc-setup-testdata` Step 4a) reads:
- `{docs-repo}/test-data/test-data-catalog.yaml` (with persisted pool record statuses written back by every per-service test-runner)
- Every service's `api-tests/test-results/data-ledger.json` and `results.json`
- The existing `{docs-repo}/test-data/ledger.yaml`

...and (a) regenerates `{docs-repo}/test-data/dashboard.html` inline + (b) appends one consolidated entry to `{docs-repo}/test-data/ledger.yaml` (run timestamp, env, services, pass-rate, captured value count, pool consumption — schema defined in `/tdgs-aidlc-setup-testdata`).

**If the script does not exist** (user never ran `/tdgs-aidlc-setup-testdata`), per-service test results are already on disk (`results.json`, `data-ledger.json`, per-service `test-summary.html` / `test-report.md`) and remain valid — only the *workspace-level* dashboard regeneration is missing. Surface a HARD STOP at the end of this prompt (do NOT pretend the run succeeded — a stale dashboard hides every other guard downstream):
`❌ {docs-repo}/test-data/scripts/generate-workspace-dashboard.js not found — workspace dashboard NOT regenerated. Per-service test results are written and valid. Run /tdgs-aidlc-setup-testdata to generate the dashboard script, then re-run this prompt to refresh dashboard.html and append to ledger.yaml. The workspace dashboard MUST be in sync with every run — silent staleness is a defect.`
Exit 1. Do not continue to Step 9d (cross-report consistency verification depends on a regenerated dashboard).

**The per-service `test-runner.js` is responsible for writing the per-service `data-ledger.json` and persisting pool record status back to the catalog YAML — nothing else.** It does NOT write `ledger.yaml` or `dashboard.html`. Those are the dashboard script's job. Do NOT render HTML inline from this prompt. Do NOT append to `ledger.yaml` from anywhere other than the dashboard script.

### 9d. Cross-Report Consistency Verification (HARD STOP)

After the generator finishes, re-read every per-service `results.json`, `test-summary.html`, and `test-report.md`. Verify:

**0a. Schema & dashboard freshness gate (HARD STOP — runs FIRST, R8 fix).**

The schemas under `{docs-repo}/test-data/*.schema.json` and the `dashboard.html` template are committed artifacts. A fresh clone, a stale merge, or a manual edit can leave them lagging behind the prompt spec — every downstream AJV gate then either false-passes (silent gap) or false-fails (cryptic error). Verify currency BEFORE attempting any validation:

1. **`data-ledger.schema.json` is structurally complete (v2 + writer-contract properties):** `node -e "const s=require('{docs-repo}/test-data/data-ledger.schema.json'); const v=s.properties&&s.properties.schemaVersion&&s.properties.schemaVersion.enum||[]; const p=s.properties||{}; const t=(p.tests&&p.tests.items&&p.tests.items.properties)||{}; const dbItems=(p.dbRecordsCreated&&p.dbRecordsCreated.items)||{}; const dbReq=dbItems.required||[]; const allOf=Array.isArray(s.allOf)?s.allOf:[]; const errs=[]; if(!v.includes('api-v2')||!v.includes('functional-v2'))errs.push('schemaVersion.enum missing api-v2/functional-v2 (got '+JSON.stringify(v)+')'); for(const k of ['testSummary','capturedValues','skippedCrossService']) if(!p[k]) errs.push('top-level property '+k+' undeclared'); if(!t.skipReason) errs.push('tests.items.properties.skipReason undeclared'); for(const k of ['endpoint','testId','testName','outcome','timestamp']) if(!dbReq.includes(k)) errs.push('dbRecordsCreated.items.required missing '+k); if(allOf.length<1) errs.push('schema-version conditional (allOf) missing — testSummary vs counters disambiguation'); if(errs.length){console.error('STALE: data-ledger.schema.json:\n  - '+errs.join('\n  - '));process.exit(1)}"`. On failure: `❌ data-ledger.schema.json is stale or structurally incomplete. Re-run /tdgs-aidlc-setup-testdata to regenerate schemas before proceeding.` STOP. (Checking ONLY `schemaVersion.enum` is validation theater — every required v2 writer property must also be declared, otherwise the runner's first write trips `additionalProperties: false`.)

2. **`ledger.schema.json` carries 3 allOf rules AND `infra` in run-level required AND `flowId` (not `flow`) in perFlowRollup items AND ALL 7 fields on crossServiceSkips items:** `node -e "const s=require('{docs-repo}/test-data/ledger.schema.json'); const r=(s.properties&&s.properties.runs&&s.properties.runs.items)||{}; const a=r.allOf||[]; const req=r.required||[]; const pfr=(r.properties&&r.properties.perFlowRollup&&r.properties.perFlowRollup.items&&r.properties.perFlowRollup.items.required)||[]; const xs=(r.properties&&r.properties.crossServiceSkips&&r.properties.crossServiceSkips.items&&r.properties.crossServiceSkips.items.required)||[]; const errs=[]; if(a.length<3) errs.push('runs.items.allOf has '+a.length+' rules, expected 3 (crossServiceSkips, perFlowRollup.minItems, recordsUsed.minItems)'); if(!req.includes('infra')) errs.push('runs.items.required missing \"infra\" — math invariant breaks with NaN'); if(!pfr.includes('flowId')) errs.push('perFlowRollup.items.required missing \"flowId\" (uses legacy \"flow\"?) — writer/schema mismatch under additionalProperties:false'); for(const k of ['service','testId','fromService','toService','businessRule','requiredInput','resolution']) if(!xs.includes(k)) errs.push('crossServiceSkips.items.required missing \"'+k+'\" — R10-A2 7-field contract not enforced'); if(errs.length){console.error('STALE: ledger.schema.json:\n  - '+errs.join('\n  - '));process.exit(1)}"`. On failure: `❌ ledger.schema.json is stale — missing R7-1/R7-2/R9/R10 contracts. Re-run /tdgs-aidlc-setup-testdata to regenerate.` STOP.

3. **`test-data-catalog.schema.json` allows `_rotationIndex` AND declares `addedAt` on records:** `node -e "const s=require('{docs-repo}/test-data/test-data-catalog.schema.json'); const ip=(s.properties&&s.properties.identityPools&&s.properties.identityPools.items)||{}; const p=ip.properties||{}; const recProps=(p.records&&p.records.items&&p.records.items.properties)||{}; const errs=[]; if(!p._rotationIndex) errs.push('identityPools.items.properties._rotationIndex undeclared — API runner cannot persist round-robin state'); if(!recProps.addedAt) errs.push('identityPools.items.properties.records.items.properties.addedAt undeclared — Section 8 Never-Used age check has no source field'); if(errs.length){console.error('STALE: test-data-catalog.schema.json:\n  - '+errs.join('\n  - '));process.exit(1)}"`. On failure: `❌ test-data-catalog.schema.json is stale. Re-run /tdgs-aidlc-setup-testdata.` STOP.

4. **Dashboard `passRate` formula matches G11 lock (catches BOTH `r.total` and bare `total` denominator drift):** `grep -nE "passed\s*/\s*(r\.)?total" {docs-repo}/test-data/dashboard.html && echo "STALE_FORMULA" || echo OK`. If `STALE_FORMULA` printed, EITHER the sparkline (`r.passed / r.total`) OR a per-flow / per-screen badge (`passed / total` with bare locals) divides by `total` (includes `skipped`) instead of the locked formula `passed / (passed + failed + dataIssue + infra)`. Surface: `❌ dashboard.html uses wrong denominator (sparkline OR per-flow). Re-run /tdgs-aidlc-setup-testdata to regenerate dashboard with the G11-locked formula everywhere.` STOP.

5. **Dashboard `formatRecord` is field-shape-driven, not poolType-string-matched:** `grep -nE "poolType\s*===|poolType\.startsWith\(" {docs-repo}/test-data/dashboard.html && echo "STALE_FORMATTER" || echo OK`. If `STALE_FORMATTER` printed, the formatter hard-codes pool names — catalog naming drift (e.g., `email-recipient` vs `recipient-email`) silently breaks the Record column. Surface: `❌ dashboard.html formatRecord uses poolType string matching instead of field-shape detection. Re-run /tdgs-aidlc-setup-testdata to regenerate.` STOP.

All 5 checks PASS → proceed to 9d.0 below. Any FAIL → the user MUST run `/tdgs-aidlc-setup-testdata` before `/tdgs-aidlc-run-tests` will continue. This gate is the durable fix for the R8 root cause: prompt specs evolved across rounds but committed schemas/dashboard lagged, causing intermittent validation failures and silent dashboard rot.

0. **Ledger AJV gate (HARD STOP — runs after 9d.0a):** validate every `{service-repo}/api-tests/test-results/data-ledger.json` and `{ui-repo}/functional-tests/test-results/data-ledger.json` against the ledger schema (api-v2 / functional-v2 — see `/tdgs-aidlc-setup-api-tests` Section 5.0 and `/tdgs-aidlc-setup-functional-tests` Step 6b). On any AJV failure, surface `❌ {service} data-ledger.json schema invalid at {jsonPointer}: {ajvError}. Do NOT regenerate dashboard — fix runner emit logic via /tdgs-aidlc-setup-api-tests (or setup-functional-tests) and re-run.` Then STOP. The dashboard MUST NOT be regenerated from a structurally-invalid ledger.

   **Workspace ledger gate (HARD STOP — runs SECOND, after per-service gates pass):** validate `{docs-repo}/test-data/ledger.yaml` against `{docs-repo}/test-data/ledger.schema.json` BEFORE the dashboard script appends a new run AND AFTER the append. Per G11 the schema requires `runs[*]` to include `runId, scope (enum: full|changed|single), timestamp, environment, commitSha, total, passed, failed, skipped, skippedCrossService, dataIssue, durationMs` — and `crossServiceSkips[]` (5 fields each) when `skippedCrossService > 0`, `perFlowRollup[]` when functional tests ran. The dashboard regeneration script (`{docs-repo}/test-data/scripts/generate-workspace-dashboard.js`, generated by `/tdgs-aidlc-setup-testdata` Step 4a) MUST embed this AJV check internally; this Step 9d.0 is the second-line defense. On failure, surface `❌ schema violation: {docs-repo}/test-data/ledger.yaml at {jsonPointer}: {ajvError}. Dashboard NOT regenerated. Fix via /tdgs-aidlc-setup-testdata (regenerates the script) or hand-edit ledger.yaml to satisfy ledger.schema.json.` Then STOP.
1. **Math invariant per service:** `summary.passed + summary.failed + summary.skipped + summary.dataIssue + summary.infra == summary.total` AND `summary.executed <= summary.total` AND `summary.skippedCrossService <= summary.skipped` (subset counter, not in main invariant). Note: env-blocked skipped tests are counted in `total` and `skipped` but NOT in `executed`.
2. **HTML ↔ JSON match:** the totals shown in `test-summary.html` must equal `results.json.summary` for the SAME service (no cross-service contamination)
3. **Markdown ↔ JSON match:** ditto for `test-report.md`
4. **Dashboard aggregation:** the per-service tiles in `dashboard.html` must equal the same-service `results.json.summary`. The aggregate row must equal the sum of per-service summaries.
5. **Persisted-records sync:** the "Persisted Records" panel in each per-service `test-summary.html` MUST list exactly the rows in that service's `data-ledger.json.dbRecordsCreated[]` (current `runId`). The workspace `dashboard.html` "Persisted Records (this run)" section MUST equal the concatenation across all services. Counts of `created` / `attempted-failed` / `attempted-server-error` MUST match between per-service report and workspace dashboard for that service.
6. **Write-attempt completeness:** for every test in `results.json` whose `request.method` is `POST`/`PUT`/`PATCH`/`DELETE` AND whose `status` is in {`pass`, `fail`}, there MUST be a corresponding entry in `data-ledger.json.dbRecordsCreated[]` keyed by `testId`. Missing entries indicate the test-runner forgot to record a write attempt — HARD STOP, surface as `❌ {service}: {N} write-style test(s) missing from data-ledger dbRecordsCreated[]: {testIds}`.
7. **Cross-service skip surfacing in dashboard (G9b — HARD STOP):** parse `{docs-repo}/test-data/dashboard.html`. If the union across all per-service ledgers' `skippedCrossService[]` is non-empty, the dashboard MUST contain a section whose heading text matches `/Skipped Cross[- ]Service/i` AND that section MUST render at least one row per ledger entry with all 5 fields visible. Missing section or hidden rows = `❌ dashboard.html missing G9b cross-service skip panel despite {N} skipped entries in ledgers. Re-run /tdgs-aidlc-setup-testdata to update the dashboard generator script — do NOT hand-patch dashboard.html.`
7a. **Chain Contract Mismatches sub-panel surfacing (HARD STOP — pairs with `chainBreak` payload):** parse `{docs-repo}/test-data/dashboard.html`. If the union across all per-service `data-ledger.json.tests[]` AND `results.json.tests[]` contains at least one entry with a non-empty `chainBreak` object, dashboard.html MUST contain a sub-panel whose heading matches `/Chain Contract Mismatches/i` AND that sub-panel MUST render at least one row per unique `(consumerEndpoint, inferredPath)` pair, with the `Suggested Fix` and `Quick Action` columns visible (per the Section 3a contract in `/tdgs-aidlc-setup-testdata`). Missing panel or hidden rows = `❌ dashboard.html missing Chain Contract Mismatches sub-panel despite {N} chainBreak entries in ledgers. Re-run /tdgs-aidlc-setup-testdata to update the dashboard generator script — do NOT hand-patch dashboard.html.` Also assert: every emitted `chainBreak.proxyHop` value matches the closed enum `direct|apigee|lambda|apigee+lambda|other:.+` (regex). A test classified `data-issue` whose cause was clearly an `<UNCAPTURED:…>` sentinel BUT lacks `chainBreak` is a runner bug — surface as `❌ {service}: {N} data-issue test(s) with UNCAPTURED sentinel but no chainBreak block: {testIds}. Re-run /tdgs-aidlc-generate-api-tests to refresh the runner emission contract.`
8. **Created Identifiers panel presence (HARD STOP):** dashboard.html MUST contain a section whose heading matches `/Created Identifiers|Created Identifiers & DB Records/i` and MUST render at least one row when the union of `dbRecordsCreated[]` + `capturedValues[]` across all ledgers is non-empty. Missing = same fix path as #7.
9. **Per-Flow Rollup panel presence (HARD STOP, functional only):** if any functional ledger contains `perFlowRollup[]` (non-empty), dashboard.html MUST contain a section whose heading matches `/Per[- ]Flow|Flow Coverage/i`. Missing = same fix path.
10. **Top-Used Records panel presence (HARD STOP, G11):** dashboard.html MUST contain a section whose heading matches `/Top[- ]Used Records|Most[- ]Used Records|Record Usage/i`. The section MUST render at least one row whenever the workspace ledger has any run with `recordsUsed[]` non-empty across history. Missing = `❌ dashboard.html missing G11 Top-Used Records panel. Re-run /tdgs-aidlc-setup-testdata to update the dashboard generator script — do NOT hand-patch dashboard.html.`
11. **Never-Used Records panel presence (HARD STOP, G11):** dashboard.html MUST contain a sub-section whose heading matches `/Never[- ]Used Records|Unused Records/i`. Either renders the never-used rows OR renders an explicit `✅ Every external-required record has been exercised at least once.` line — silent omission is forbidden. Missing = same fix path as #10. (Rationale: never-used records are the strongest signal that the test suite has stopped exercising onboarding/identity branches and that the catalog has dead-weight rows.)
12. **Run Manifest panel presence (HARD STOP, single-pane analysis):** dashboard.html MUST contain a section whose heading matches `/Run Manifest|Run Summary/i` whenever at least one per-service `results.json` exists in the workspace. The section MUST render one row per contributing service with all of these visible columns: Service, Executor, RunId, StartTime, EndTime, Duration, Total, Pass/Fail/Skip/DI/Infra, Pass%, Staleness. Missing or under-populated = `❌ dashboard.html missing Run Manifest panel. Re-run /tdgs-aidlc-setup-testdata to update the dashboard generator script — do NOT hand-patch dashboard.html.` Also assert that EVERY service-row's KPI columns (Total/Pass/Fail/Skip/DI/Infra) numerically equal the corresponding fields under `results.json.summary` (NOT under any other read-key — see #13).
13. **Executed Tests panel presence (HARD STOP, single-pane analysis):** dashboard.html MUST contain a section whose heading matches `/Executed Tests|Test Execution Log/i` whenever the union of per-service `results.json.tests[]` is non-empty. The section MUST render rows whose count equals the union total (assertion via simple row count vs sum of `results.json.tests.length` across services). Each row MUST surface Test Name, Endpoint, Status, Duration. Missing or row-count drift = `❌ dashboard.html missing Executed Tests panel or row count drift (rendered={N}, expected={M}). Re-run /tdgs-aidlc-setup-testdata to update the dashboard generator script — do NOT hand-patch dashboard.html.`
14. **Canonical summary read-key (HARD STOP — pairs with `/tdgs-aidlc-setup-api-tests` R10-C3a and `/tdgs-aidlc-setup-testdata` Latest-run rule):** the workspace dashboard generator MUST read each per-service KPI block from `results.json.summary` and ONLY `summary`. Detection: grep `{docs-repo}/test-data/scripts/generate-workspace-dashboard.js` for the literal substring `r.data.summary` (or equivalent `result.summary` / `entry.summary` depending on the local variable name). Absence = `❌ generate-workspace-dashboard.js does not consume results.json.summary as the canonical KPI read-key — KPI tiles will silently zero. Re-run /tdgs-aidlc-setup-testdata to regenerate the script. Do NOT hand-patch dashboard.html.` Also forbidden patterns (grep MUST find ZERO matches): `r\.data\.testSummary`, `r\.data\.counters`, `r\.data\.stats`, `r\.data\.totals`, and the `||`-fallback chain `r.summary \|\| r.testSummary \|\| r.counters` (the fallback chain itself is the defect — there is exactly one canonical key). Same fix path: regenerate via `/tdgs-aidlc-setup-testdata`.

**On any mismatch, do NOT patch the HTML/MD file directly.** Re-run the appropriate per-service `generate-report.js`, then re-run `node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js` to regenerate the workspace dashboard. If the mismatch persists, surface it as a hard failure with the exact field that differs and stop — the user must reconcile the data before any reporting is trusted.

### 9e. Reports Never Lie — Void Invalid Reports (HARD STOP)

> ⚠️ **Reports MUST NEVER overstate coverage, mask failures, or hallucinate passing tests.** The `results.json` written by `test-runner.js` is the single source of truth. Every other artifact (HTML, markdown, dashboard, ledger) is a derived view. If a derived view disagrees with `results.json`, the derived view is wrong by definition — never the other way around.
>
> **Voiding rule:** if any of the following hold AFTER the generator has run, the entire report directory for that service is INVALID and MUST be voided rather than published:
>
> 1. Math invariant fails (9d.1).
> 2. HTML/MD totals diverge from `results.json` (9d.2/9d.3).
> 3. Coverage table claims ✅ for an endpoint that `results.json` shows 0 passing tests for (8a).
> 4. Coverage table includes endpoints not present in the service's source (8b phantom endpoint check).
> 5. Any test entry in `results.json` has `status=pass` but `response.status` is in [4xx, 5xx] AND the test was not explicitly a negative test (i.e., positive test "passed" while server returned an error → the runner has a classification bug; the entire report is suspect).
> 6. Any test entry in `results.json` has `status=pass` but `response.body` is empty/null AND the test definition asserts response body content — a passing test with no response body content was never validated.
>
> **Voiding action:**
> ```bash
> mv {service-repo}/api-tests/test-results {service-repo}/api-tests/test-results.invalid.$(date +%Y%m%d-%H%M%S)
> ```
> Then print: `❌ Report voided for {service}. Cause: {specific check that failed}. Re-run /tdgs-aidlc-run-tests after fixing {root cause}. Do NOT publish or share the invalid directory.`
>
> **Forbidden actions when reports look wrong:**
> - ❌ Manually editing summary numbers in `results.json`, `test-summary.html`, or `test-report.md`
> - ❌ Re-classifying a `fail` to `pass` in the LLM-authored markdown when `results.json` says `fail`
> - ❌ Claiming "all positive tests passed" when one or more positive entries have `status=skip` due to chain failure (a skipped positive is NOT a passed positive)
> - ❌ Publishing a dashboard whose tile totals don't sum to the aggregate row
> - ❌ Inventing test entries for endpoints that exist in source but were not actually exercised at runtime

---

## Constraints

- **Production environment is NEVER allowed.** Only `local`, `test`, and `stage` are valid environments. If the user requests production, respond: "❌ Production test execution is not supported by this prompt. Use local, test, or stage."
- **Do NOT modify production source code** or existing test files. This prompt only runs and reports.
- **Do NOT create any files at the workspace root.** This includes workspace-level aggregate reports, scripts, HTML dashboards, or any other artifacts. Specifically: do NOT create files like `workspace-test-report.md`, `workspace-test-summary.html`, `generate-workspace-report.py`, or any similar aggregate files at the workspace root directory. All reports go INSIDE their respective repo directories (see report locations table above).
- **If workspace-level cross-repo summary is needed**, put it in the docs repo: `{docs-repo}/test-data/` (e.g., `{docs-repo}/test-data/workspace-test-summary.html`). NEVER at the workspace root.
- **Reports go in standard locations** per test type (see table above).
- **NEVER auto-start application services (G7).** This prompt ONLY probes health endpoints. If a service is not running, HARD STOP with manual-start instructions and ask the user to start it themselves.
- **For issue-scoped runs:** Only run the specific test files from the spec. Do NOT run the full suite. Do NOT invoke generate prompts — if files are missing, the user needs Quick-Dev first.
- **For full-suite runs:** If repos have no tests, offer generation via the appropriate generate prompt.
- **Environment files must NOT contain secrets.** Use `${VARIABLE}` placeholders.
- **NEVER hardcode application-specific values** (app names, agency IDs, business constants, city/state values) in any generated output. All values must come from the workspace. These prompts are an enterprise-level common framework used across multiple applications.
- **Pool exhaustion is a soft-stop, NOT a hard-stop.** If an identity pool has zero available records, log a warning and skip tests needing that pool — but continue executing all other tests that don't need that pool.
- **Test data is REUSABLE across runs.** A failed record stays `available` and is picked again next run; its `consecutiveFailureCount` increments and the record is `quarantined` only after `quarantineThreshold` (default 5) consecutive failures — then a human releases it via `/tdgs-aidlc-setup-testdata`. Do NOT auto-retry with a different record inside a single run, do NOT auto-recycle quarantined records, do NOT one-shot consume records. See `/tdgs-aidlc-setup-testdata` for the full reusability + quarantine model.
- **Catalog YAML must be written back to disk** after test execution changes record statuses. Without write-back, the dashboard shows stale pool health.

## Anti-Hallucination Guardrails

> ⚠️ **These guardrails apply to every action taken by this prompt. Violation is a HARD FAILURE.**

1. **NEVER re-classify a test entry's `status` from log tails or response bodies.** The `status` field in `results.json` is set deterministically by `test-runner.js` per the classification rules in `/tdgs-aidlc-setup-api-tests`. Triage in this prompt reads that field as authoritative. LLM re-classification is the documented root cause of fake "DB connection" failures when the actual cause was an unresolved catalog token.
2. **NEVER report a service as "healthy" based solely on HTTP 200 from the health endpoint.** Parse the response body — if `status: "DOWN"`, the service is NOT healthy. If any component (db, redis, diskSpace) is DOWN, report it.
3. **NEVER classify an HTTP 500 with a DB error message as an "Application Defect".** DB errors (`JDBC`, `connection refused`, `ORA-`, `DataAccessException`, etc.) are Infrastructure Issues, not code bugs.
4. **NEVER generate report files with static/hardcoded counts.** All reports MUST be generated programmatically from `results.json` by the service's `generate-report.js` script. The workspace dashboard MUST be regenerated by running `node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js` (generated by `/tdgs-aidlc-setup-testdata` Step 4a). This prompt never renders dashboard HTML directly.
5. **NEVER write one service's report data into another service's report directory.** Each `generate-report.js` uses `path.resolve(__dirname, '..')` to stay scoped to its own service.
6. **NEVER skip the dashboard regeneration step (Step 9c).** Even if all tests passed with no catalog changes, the workspace dashboard must be regenerated by running `node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js`. Also re-run after ANY manual catalog edit (resetting quarantined records, adjusting `consecutiveFailureCount`) — without regeneration, the dashboard shows stale quarantine badges. Use `--setup-only` flag for catalog-only refresh.
7. **NEVER patch report HTML/MD files when totals don't reconcile.** If counts disagree across results.json/test-summary.html/test-report.md/dashboard.html, re-run the relevant per-service `generate-report.js` and then re-run `node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js` to regenerate the workspace dashboard. Manual edits hide drift; regenerating exposes it.
8. **NEVER hard-stop the entire test suite because one identity pool is exhausted.** Skip affected tests, continue with the rest.
9. **NEVER auto-retry a failed test with a different identity record inside the same run.** Per the quarantine model, increment `consecutiveFailureCount` and let cross-run quarantine handle it.
10. **NEVER assume endpoints, ports, or paths without reading actual config files.** Ports come from `application.properties` or environment JSON. Paths come from controllers. Guessing causes phantom failures.
11. **NEVER pass `--reporter=…` on the Playwright CLI for functional tests.** A CLI `--reporter=` flag REPLACES the entire `reporter[]` array in `playwright.config.js` (Playwright merge semantics: CLI wins, no merge). That drops the `html` reporter (no `html-report/index.html`), drops the `json` reporter (no `results.json` → empty `testSummary` → "No runs yet" on the dashboard), and silently breaks the per-service `test-report.md`, `ledger.yaml.runs[].perFlowRollup[]`, and the `runs[]` append. The `['list']` reporter is ALREADY in the config; it gives one-line console output by default. All shell commands this prompt emits, all `package.json` scripts, and all README examples MUST be `npx playwright test [grep|filter]` with NO `--reporter=` flag. To raise log verbosity for debugging, use `DEBUG=pw:api` instead — it augments without replacing.

## Single-Source-of-Truth Sync Contract (HARD INVARIANT)

Every read/write surface MUST stay in sync after a run. The dependency chain below is the contract; any step that fails to write its output is a HARD FAILURE that breaks every downstream surface.

```
playwright.config.js (reporter[])
        │
        ├──> functional-tests/test-results/results.json          (Playwright json reporter — REQUIRED)
        ├──> functional-tests/test-results/html-report/          (Playwright html reporter — REQUIRED)
        └──> functional-tests/test-results/.{consumed|runartifacts|captured|skips|testresult}-worker-*.jsonl
                          │  (per-worker on-disk state — only crosses worker→main process boundary via disk)
                          ▼
            globalTeardown (functional-tests/support/global-teardown.js)
                          │
                          ├──> functional-tests/test-results/data-ledger.json     (per-service ledger — schema-validated)
                          └──> {docs-repo}/test-data/test-data-catalog.yaml      (consumedCount / failureCount writeback under file lock)
                                          │
                                          ▼
            node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js
                          │
                          ├──> {docs-repo}/test-data/dashboard.html              (cross-run trend — Sections 1–8)
                          ├──> {docs-repo}/test-data/ledger.yaml                 (runs[] append, capped at 200)
                          └──> {docs-repo}/test-data/db-transactions.json        (MCP SQL Developer — last run only)
```

**`db-transactions.json` schema (generated per G12):**
```json
{
  "runId": "<uuid>",
  "runTimestamp": "<ISO-8601>",
  "transactions": [
    {
      "service": "<service-name>",
      "testId": "<test-id>",
      "testName": "<human-readable>",
      "endpoint": "POST /api/v1/orders",
      "httpStatus": 201,
      "outcome": "created|attempted-failed|attempted-server-error",
      "captures": [
        { "field": "orderId", "value": "ORD-2025-001234", "dbColumn": "ORDER_ID", "dbTable": "ORDERS" }
      ],
      "timestamp": "<ISO-8601>"
    }
  ],
  "consumed": [
    {
      "pool": "<pool-name>",
      "recordKey": "<record-key>",
      "fields": { "ssn": "123-45-6789", "firstName": "Jane" },
      "usedByTest": "<test-id>",
      "usedByService": "<service-name>"
    }
  ]
}
```
The `dbColumn` / `dbTable` fields are OPTIONAL — populated when the service's OpenAPI spec or entity annotations expose the mapping. When unavailable, omit (do NOT guess).

**Invariants that MUST hold after every successful run:**

1. `results.json.stats.expected + .unexpected + .skipped + .flaky` == `data-ledger.json.testSummary.total`. If they disagree, the global-teardown's per-worker JSONL fallback was used because the json reporter was overridden — see Anti-Hallucination guardrail #11.
2. The number of green checkmarks in the `list` reporter console output == `data-ledger.json.testSummary.passed`. If they disagree, the per-test `appendWorkerLine('testresult', …)` call inside `flow-runner.js`'s `try/finally` was skipped — fix the runner, not the ledger.
3. Every record consumed via `valueFromCatalog` has `consumedCount` incremented in `test-data-catalog.yaml`. If a pool stays at `0` after a passing run that demonstrably used it, either (a) the flow JSON hardcodes the value inside a `custom` step instead of using `valueFromCatalog`, or (b) `runFlow`'s `ctx.picks[]` tracking isn't writing the `.consumed-worker-*.jsonl` line — both are bugs in the test framework, not the catalog.
4. `dashboard.html` mtime > `data-ledger.json` mtime > `results.json` mtime. If `dashboard.html` is older than the latest `data-ledger.json`, the post-test `node generate-workspace-dashboard.js` step was skipped.
5. `ledger.yaml` `runs[]` length increments by 1 per real run (capped at 200). If it doesn't grow, the dashboard generator's `serviceArtifacts.length > 0 && tiles.total > 0` guard returned false — usually because `testSummary.total === 0` (see invariants #1 and #2).
6. Section 4 of `dashboard.html` groups `createdIdentifiers[]` by the **dynamically-discovered cross-service correlation key** (header per `(service, testId)`, value resolved by reading `apiChain[].capture[].as` field names from the catalog at render time, ranking by frequency, and using the most-captured field as the lookup key with the next-most-captured fields as fallbacks; literal `(no trace)` when no chain captures are present). A flat one-row-per-artifact table is a stale dashboard generator — re-run `/tdgs-aidlc-setup-testdata` to regenerate the script. Do NOT hard-code field names from any specific application. The DB Records / Created Identifiers section MUST show only **meaningful identifiers** (orderNumber, outTransactionId/traceNumber, reference_id, and similar correlation keys). Filter out intermediate/internal keys (jwtToken, agencyId, usasCodes, messageCode, `<no-derivable-key>`, etc.) — these are noise that obscures the actionable identifiers a tester needs for DB lookup and cross-service tracing.

**Verification:** see Step 9d invariants 1 + 4 (HARD STOP). Do NOT inline a separate bash check — 9d is the single execution gate.

## Relationship to Other Prompts

This prompt is the EXECUTION step in the pipeline; it never authors tests, never edits production code, and never writes the workspace dashboard inline. The full table appears at the end of this file (after the Phase-7 Augmentations) — see "Relationship to Other Prompts (Pipeline Map)" below for the full peer list. In short: `setup-*` prompts scaffold; `generate-*` prompts author tests; this prompt runs them and triggers the dashboard re-aggregator owned by `/tdgs-aidlc-setup-testdata`.

## Phase-7 Augmentations — Run → Dashboard Pipeline

### A7r-1 — Mandatory dashboard refresh after every run

Covered by Step 9c (canonical). Run-tests triggers the re-aggregator; it does NOT append to `ledger.yaml.runs[]` itself (G11 ledger ownership).

### A7r-2 — Shared math utility (G11 / A7-1)

The run-tests summarizer MUST `require('<docs-repo>/test-data/scripts/lib/math.js')` and use `computePassRate(counts)` and `assertCountsMath(counts)` — NEVER inline the formula. If the utility file is missing, STOP with `❌ run /tdgs-aidlc-setup-testdata first — shared math utility missing`.

### A7r-3 — Failure-artifact post-run check (functional only)

After a Playwright run completes, the runner MUST execute the failure-artifact verification (A4-1 in setup-functional-tests). If `verify-failure-artifacts.js` is absent in the UI repo, log a warning and continue (do NOT fail) but instruct the user to re-run `/tdgs-aidlc-setup-functional-tests` to add it.

### A7r-4 — Per-run record-usage rollup

After aggregating service `data-ledger.json` files, the re-aggregator (called via A7r-1) MUST compute `runs[N].recordUsageRollup`:
```yaml
recordUsageRollup:
  - pool: <poolName>
    recordId: <recordId>
    timesUsedThisRun: <int>
    tests: [<testId>, ...]
    outcomes: { passed: <int>, failed: <int>, dataIssue: <int> }
```
This feeds `ledger.yaml.runs[].recordsUsed` (forensic / CI use only — the workspace dashboard does NOT render record-usage history). Without it, `recordsUsed` is empty in the ledger.

### A7r-5 — Skipped-by-reason breakdown (G7)

The summary line printed at the end of a run MUST split skipped counts:
`✅ P passed | ❌ F failed | ⏭️ S skipped (cross-service: C, quarantine: Q, other: O) | 🔴 D data-issue | 🆚 I infra | total: T`

---

| Prompt | Purpose | When to Use |
|--------|---------|-------------|
| `/tdgs-aidlc-run-tests` (this) | **Run** existing tests + report | After code changes, before PR, post-Quick-Dev validation |
| `/tdgs-aidlc-generate-unit-tests` | **Generate + run** unit tests | First time or periodic coverage audits |
| `/tdgs-aidlc-generate-functional-tests` | **Generate + run** Playwright tests | First time or periodic coverage audits |
| `/tdgs-aidlc-generate-api-tests` | **Generate + run** API tests | First time or periodic coverage audits |
| `/tdgs-aidlc-setup-*-tests` | **Scaffold** test framework (no tests) | One-time infrastructure setup |
