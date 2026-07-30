# Execution, Gap Analysis, and Reports

### 6. Execute Tests and Generate Reports Per Service

For each service:

```bash
cd {service-repo}/api-tests && npm test; npm run test:report
```

Or via the combined npm script:

```bash
cd {service-repo}/api-tests && npm run test:full
```

> ⚠️ **CRITICAL: ALWAYS chain report generation after test execution.** Never run `npm test` alone — always follow it with `npm run test:report` so that `test-summary.html` and `test-report.md` are regenerated from the latest `results.json`. If reports are not regenerated, they will be stale and out of sync with actual results.

> **Execution chain:** `npm test` → `test-runner.js` → tries `inso run test --src collections/{service-name}.json --env Local` first → if `inso` fails with installation/compilation error (NOT a test failure), falls back to Node.js + axios executor. Then `npm run test:report` → `generate-report.js` reads `results.json` → generates `test-summary.html` + `test-report.md`. For issue-scoped testing, use `npm test -- --collection={file}; npm run test:report` (`;`, NOT `&&`).

**Execution prerequisites — PROBE the local app, NEVER auto-start it (R10-C5: G7 HARD RULE):**

This prompt MUST NOT auto-start application servers. The G7 guardrail is non-negotiable: prompts probe whether the local app is running and **fail loud** when it is not. Auto-starting `mvn spring-boot:run`, `npm start`, `uvicorn`, `flask run`, `dotnet run`, or `sam local start-api` from a Copilot prompt:
  - hides startup failures (the dev never sees the real Spring stack trace, just "tests failed"),
  - leaks orphan processes that hold ports across runs,
  - makes test results non-reproducible (one machine has the app pre-started, another auto-starts it with a different env, results disagree),
  - and conflicts with the `TEST_BASE_URL` real-mode contract used by `/tdgs-aidlc-run-tests` (a remote target has no local process to start).

**Required behavior:** before running API tests for each service, probe whether the service is reachable on its expected port:

```bash
port={detected-port}
health_paths=("/actuator/health" "/health" "/api/health" "/")
reachable=0
for p in "${health_paths[@]}"; do
  if curl -sfm 3 "http://localhost:${port}${p}" >/dev/null 2>&1; then reachable=1; break; fi
done

if [ "$reachable" -ne 1 ]; then
  cat <<EOF
❌ {service-name} is not reachable on http://localhost:${port}
   The API test framework does NOT auto-start application servers (G7 — see /tdgs-aidlc-setup-api-tests Anti-Hallucination Guardrails).

   To start it manually (pick the one that matches your stack):
     Java/Spring Boot:    cd {service-repo} && mvn spring-boot:run -Plocal
     Node.js:             cd {service-repo} && npm start
     Python (FastAPI):    cd {service-repo} && uvicorn main:app --port ${port}
     Python (Flask):      cd {service-repo} && flask run --port ${port}
     C#/.NET:             cd {service-repo} && dotnet run
     Lambda (SAM):        cd {service-repo} && sam local start-api --port ${port}

   Then re-run /tdgs-aidlc-generate-api-tests (or /tdgs-aidlc-run-tests for the orchestrated path).

   For real-mode runs against deployed envs, set TEST_BASE_URL instead:
     export TEST_BASE_URL=https://test.example.com
     /tdgs-aidlc-run-tests --env test
EOF
  exit 2   # G7 fail-loud — do NOT proceed to test execution
fi
```

**If the service IS already running:** proceed normally — the tests will hit it. Do not duplicate the probe per-test; one probe per `/tdgs-aidlc-generate-api-tests` invocation is sufficient.

**Scope discipline:** this prompt is responsible for generating tests, NOT for managing the application lifecycle. Starting and stopping the app is the developer's (or CI's) job — always.

**Result categorization — clearly distinguish:**

| Category | Meaning | Example | Action |
|----------|---------|---------|--------|
| ✅ PASS | Test passed, API behaves correctly | 200 OK with valid payload | None |
| ❌ API DEFECT | API returns unexpected result | 500 instead of 400 for invalid input | Report as bug |
| ⚠️ INFRA ISSUE | Service unreachable or timeout | Connection refused on port 8080 | Check if service is running |
| 🔄 CONTRACT MISMATCH | API response doesn't match documented contract | Field name differs from DTO | Investigate — test or API may need update |

### 7. Generate Reports Per Service (Auto-Chained — No Manual Step Needed)

> ⚠️ **CRITICAL: NEVER write static/hardcoded report files.** All reports MUST be generated programmatically by the `generate-report.js` script that reads `results.json`. This is the #1 root cause of report inconsistency — manually authored HTML/MD files with hardcoded counts, pass rates, and durations that drift out of sync with actual test results.

> **This step is automated by the chained command in Step 6.** You do NOT need to run it manually — it happens automatically when using `npm run test:full` or the chained command `npm test; npm run test:report`.

Reports generated into `{service-repo}/api-tests/test-results/`:

1. **JSON Results** — `results.json` with structured test execution data (auto by test-runner.js)
2. **Standalone HTML Dashboard** — `test-summary.html` (auto by generate-report.js from results.json)
3. **Markdown Summary** — `test-report.md` (auto by generate-report.js from results.json)

#### results.json schema

Authoritative contract: **`../tdgs-aidlc-setup-api-tests/tools/runner-contract.md`**. Shape example: `templates/results-json-shape.example.json`.



> **CRITICAL:** Every test entry MUST include the full `request` object (method, url, headers, body) and `response` object (status, headers, body) regardless of pass/fail. This data powers the failure detail cards and is essential for debugging. The `request.body` must be the **resolved** body (after catalog and captured token substitution), not the template with `{{tokens}}`.
>
> **Status → summary counter mapping (closed enum):** the per-test `status` field accepts 7 values (`pass`, `fail`, `skip`, `data-issue`, `infra`, `generation-bug`, `unresolved-token`) but `summary` has only 5 counters. The two pre-send-guard statuses roll up into `dataIssue`: `generation-bug` → `summary.dataIssue`, `unresolved-token` → `summary.dataIssue`. The literal status string stays on the test entry so the dashboard's "Generation Bugs" section can filter on it, but for the math invariant (`passed + failed + skipped + dataIssue + infra == total`) they count as dataIssue. See `/tdgs-aidlc-setup-api-tests` Section 5.0 for the canonical contract.
>
> **CRITICAL — `dataSources[]` per-test (MANDATORY when catalog or captured tokens were used):**
>
> The test-runner MUST emit a `dataSources` array on every test entry, recording one item per top-level field in the request body that was filled by token resolution OR by faker OR by a hardcoded literal. This array is the source of truth for Section 6 of the dashboard (Endpoint → Catalog Tokens Used) and prevents silent faker fallback when the catalog already defines the field.
>
> Each entry: `{ "field": "<request body field path, e.g. licenseNumber or address.zip>", "source": "catalog.identityPool.<pool>.<field> | captured.<testId>.<field> | faker.<provider>.<method> | typed-placeholder | hardcoded", "resolvedValue": "<actual value sent>" }`.
>
> **Decision tree the test-runner MUST follow when filling each request body field** (also enforced at test-generation time when writing payload templates):
> 1. Catalog `identityPool.<pool>.<field>` matches AND endpoint requires identity record → use `{{catalog.identityPool.<pool>.<field>}}`, source = `catalog.identityPool.<pool>.<field>`
> 2. `apiChain[]` shows an upstream step produces this field → use `{{captured.<sourceTestId>.<field>}}`, source = `captured.<sourceTestId>.<field>`
> 3. Field name is non-PII filler (city, state, zip, address, generic free-text) → use a faker token (`{{$randomCity}}` etc.), source = `faker.<provider>.<method>`
> 4. Otherwise → typed-placeholder literal per the Typed-Placeholder Fallback Rule (Pre-flight item 3), source = `typed-placeholder`. For values pulled from the project's `data/valid-payloads.json` golden file, source = `hardcoded`.
>
> **Hard rule:** if a field exists in `identityPools` (rule 1) and the test-runner used a hardcoded literal or faker instead, the report's Section 6 "Faker / Hardcoded Fields" column MUST flag it as a GAP. Do NOT silently fall back to faker when the catalog covers the field — that defeats identity rotation, pool tracking, and reproducibility.
>
> **CRITICAL — Error Classification Rules (MANDATORY for test-runner and reports):**
>
> | HTTP Response | Classification | `status` Value | Meaning |
> |---|---|---|---|
> | No response (connection refused, timeout, ECONNREFUSED) | Infrastructure failure | `infra` | Service not running or unreachable |
> | 500 with response body containing DB/downstream error keywords | Downstream dependency failure | `infra` | Service is up but database or external dependency is down |
> | 500 with response body containing application error message | API/Application defect | `fail` | Service received the request but threw an exception — this is a CODE bug, NOT infra |
> | 500 when catalog tokens resolved to PLACEHOLDER_* values | Test data issue | `data-issue` | Identity pool has placeholder data — replace with real records via `/tdgs-aidlc-setup-testdata` |
> | 400/422 with validation error | Expected for negative tests (pass); unexpected for positive tests (fail) | `pass` or `fail` | Depends on whether the test expected this status code |
> | Assertion mismatch (expected 200, got 500) | Test failure — likely API defect | `fail` | API behavior doesn't match expectation |
> | Skipped due to missing chained value | Chain dependency | `skip` | Upstream test failed, so this test cannot execute |
>
> **DB/Downstream Error Keywords (classify as `infra`, NOT `fail`):**
> The canonical keyword list lives ONCE as the `DB_ERROR_KEYWORDS` JavaScript array in `/tdgs-aidlc-setup-api-tests` Section 5 (under "DB error keyword detection — PRECISE STACKTRACE TOKENS ONLY"). The test-runner imports / inlines that array directly. Do NOT duplicate the literal list here or in any other prompt — drift between the spec and the runtime check has historically misclassified DB-down failures as application defects. If a new keyword needs to be added (or removed), edit it in `/tdgs-aidlc-setup-api-tests` Section 5 only; this section automatically inherits.
>
> **Do NOT include bare `database` or `datasource`** in the keyword list — they over-match application JSON (e.g., `{"errorMessage":"database lookup returned no rows"}`) which is an APPLICATION error, not infra. The exclusion is enforced at the source (`/tdgs-aidlc-setup-api-tests` Section 5).
>
> **The #1 misclassification to prevent:** A 500 response WITH a JSON error body that is a BUSINESS/APPLICATION error (e.g., `{"errorCode":"ERR003","errorMessage":"Critical Error"}`) is **NOT** an infrastructure issue. But a 500 with a DATABASE error (e.g., `{"errorMessage":"Cannot get JDBC connection"}`) IS an infrastructure issue — the service cannot reach its data layer. Distinguish between application errors (code bugs → `fail`) and infrastructure errors (dependency down → `infra`).
>
> **PLACEHOLDER detection:** When the test-runner resolves `{{catalog.*}}` tokens and ANY resolved value contains `PLACEHOLDER_`, the test entry MUST be tagged with `"dataWarning": "PLACEHOLDER identity data — replace via /tdgs-aidlc-setup-testdata"` and the status should be `data-issue` if the test fails.

> **CRITICAL — Data Ledger Output (MANDATORY after every test execution):**
>
> After ALL tests complete, the test-runner MUST write `{service-repo}/api-tests/test-results/data-ledger.json` using the atomic-write protocol from `/tdgs-aidlc-setup-testdata` Hard Rule 15 (write `.tmp` sibling → `fsync` → atomic `rename`). The orchestrator (`/tdgs-aidlc-setup-testdata` re-run) reads every service's `data-ledger.json` concurrently — a non-atomic write produces a half-formed JSON that crashes cross-app aggregation. Contents:
> ```json
> {
>   "schemaVersion": "api-v2",
>   "runId": "run-{ISO-timestamp}",
>   "timestamp": "ISO-8601",
>   "environment": "local|test|stage",
>   "service": "{service-name}",
>   "capturedValues": [
>     { "testId": "{test-id}", "key": "{captured-key}", "value": "{value}", "endpoint": "{METHOD /path}", "timestamp": "ISO-8601" }
>   ],
>   "identityPoolUsage": {
>     "{pool-type}": {
>       "recordUsed": { "field1": "val1", "field2": "val2" },
>       "status": "consumed|returned",
>       "reason": "all tests passed|test {METHOD} {/endpoint} failed"
>     }
>   },
>   "dbRecordsCreated": [
>     { "endpoint": "{METHOD} {/endpoint}", "testId": "{test-id}", "testName": "{test-name}", "outcome": "created|attempted-failed|attempted-server-error", "key": "{primary-key-field}", "value": "{created-or-attempted-value}", "requestSummary": { "<businessKey1>": "<value>", "<businessKey2>": "<value>" }, "responseStatus": 201, "timestamp": "ISO-8601" }
>   ],
>   "skippedCrossService": [
>     { "testId": "{test-id}", "fromService": "{service-name}", "toService": "{upstream-service-id}", "businessRule": "{one-line}", "requiredInput": "{what-data-needed}", "resolution": "{exact-next-step}" }
>   ],
>   "testSummary": { "total": 0, "executed": 0, "passed": 0, "failed": 0, "skipped": 0, "skippedCrossService": 0, "dataIssue": 0, "infra": 0 }
> }
> ```
> This ledger enables:
> - **Audit trail** — what test data was consumed, what DB records were created (and which writes were attempted but failed)
> - **DB MCP / external query verification** — because every persisted entity is recorded with its primary key + business identifying fields, an external DB MCP (or DBA) can pick any `dbRecordsCreated[*]` entry and verify the row exists with `SELECT * FROM <table> WHERE <key>='<value>'`. The `requestSummary` block lets you cross-check secondary fields without needing the full request body.
> - **Reuse tracking** — which order numbers/transaction IDs exist from prior runs
> - **Pool health** — which identity records are consumed vs returned
> - The `generate-report.js` script reads this file to render the Data Ledger section in the HTML dashboard
>
> **`dbRecordsCreated` population (generic, framework-agnostic):** the test-runner MUST emit one entry per write request (`POST`/`PUT`/`PATCH`/`DELETE`) regardless of outcome. Skip read requests (`GET`/`HEAD`/`OPTIONS`). Detection rules (in order):
> 1. **Discover business keys generically** — union of: (a) JSONPaths captured via `apiChain[]` for this endpoint; (b) response-body fields matching `/(?:^|[._])(id|number|code|reference|guid|uuid|key)$/i`; (c) `@Id`/`@GeneratedValue` fields (when source available).
> 2. **Outcome:** `created` = 2xx + at least one candidate key in response (`value` = key value); `attempted-failed` = [400, 409, 422] (likely no DB write — record request natural keys for DBA absence-confirm); `attempted-server-error` = [500, 502, 503, 504] (partial transaction possible — record request natural keys + any echoed IDs from error response).
> 3. **`requestSummary` block** — always include 3–6 business-identifying fields from the resolved REQUEST body (catalog tokens already resolved). Lets DBAs uniquely identify the row even when no ID was returned.
> 4. **Negative tests count too** — `attempted-failed` entries give DBAs a complete picture of every write attempt.
>
> **Why this matters:** with this contract, after any test run a developer with a DB MCP server (or `psql`/`sqlplus`) can answer "For every endpoint exercised, what rows were inserted/updated, with what business keys, and which writes failed at validation vs server error?" — without re-reading request bodies.

#### Report Generation Script (MANDATORY)

The `generate-report.js` script (scaffolded by `/tdgs-aidlc-setup-api-tests` at `{service-repo}/api-tests/scripts/generate-report.js`) MUST:

1. **Read** `results.json` (test runner output) as the **single source of truth**
2. **Generate** both `test-summary.html` and `test-report.md` programmatically
3. **Never hardcode** test counts, pass rates, endpoint counts, or any metric — ALL values MUST be computed from the JSON at runtime
4. **Be runnable standalone:** `node scripts/generate-report.js`
5. **Produce identical layout** regardless of which service it runs against — the format is standardized, only the data changes
6. **Service-scoping guard (MANDATORY):** The script MUST resolve `results.json` using `path.resolve(__dirname, '..', 'test-results', 'results.json')` to ensure it reads ONLY the results from its own service repo. NEVER use a relative path like `./test-results/results.json` which depends on `cwd` and can cross-contaminate service reports when run from the workspace root. Similarly, write outputs to `path.resolve(__dirname, '..', 'test-results', 'test-summary.html')` and `test-report.md`.
7. **Markdown report MUST include service name header** — first line: `# {Service Name} — API Test Report` where the service name is dynamically extracted from the results, the parent directory name, or `package.json`.

#### Standardized HTML Dashboard Format (MANDATORY — Same for Every Service)

The `test-summary.html` MUST be a self-contained HTML file (embedded CSS/JS, zero external deps) with the following standardized sections. Format is non-negotiable; only the data changes per service. ALL values computed from `results.json` at runtime, never hardcoded.

| # | Section | Contents | Conditional |
|---|---------|----------|-------------|
| 1 | Header banner | Gradient banner, auto-detected service name, subtitle "API Tests — Automated Quality Dashboard", metadata row (date/time, baseUrl, environment) | Always |
| 2 | Pass Rate Gauge & Summary Cards | Circular gauge color-coded (green ≥90%, yellow ≥70%, red <70%); cards: Total / Passed (green) / Failed (red) / Infra (orange) / Duration | Always |
| 2b | Last Run vs This Run | Compact delta strip (metric / previous / this / Δ) for pass rate, passed, failed, skipped, dataIssue, infra, duration. Source: `results.previous.json` (rotated by runner per setup-api-tests Section 5). Per-test status changes (newly failing/passing/new/removed) appear in collapsible "Status Changes Since Last Run" panel inside Section 4. Omit on first run — do NOT fabricate prior totals | When `results.previous.json` exists |
| 3 | Endpoint Coverage Table | Cols: Endpoint / Method / Positive / Negative / Edge / Status. **Coverage accuracy rules (MANDATORY):** 0 executed tests → ❌ (NEVER ✅); chain-failure skips → ⏭️ SKIP (NOT ✅); ✅ only when ≥1 test ran AND PASSED; ❌ when tests ran but ALL failed. Coverage % denominator = endpoints confirmed in code (NOT KB/catalog). Cross-service consumer endpoints marked `skipped` per G7 count as ⏭️ SKIP (this service's endpoints, only the prerequisite is external). `/X` and `/v5/X` are SEPARATE rows | Always |
| 4 | Category Breakdown (expandable) | Cols: Category / Tests / Passed / Failed / Rate / Progress Bar. Categories: Positive / Negative / Edge-case / Security / Contract. Each row clickable → reveals individual test results. Failed sub-rows expand further to show Request (method/URL/headers/body) and Response (status/headers/body) in collapsible panels. Toggle icon ▶/▼ | Always |
| 5 | Business Rules Coverage Matrix | Cols: Rule ID / Description / Tests / Status. Rule IDs from test titles (e.g., `PROC-001`). Uncovered rules red. Omit when no rule IDs tagged | When rule IDs present |
| 6 | Endpoint → Catalog Tokens Used | Cols: Endpoint / Method / Catalog Tokens Resolved / Faker / Hardcoded Fields / Identity Pool Records / Status. One row per executed endpoint. Source: per-test `dataSources[]` in `results.json`. Faker/Hardcoded column flags GAPS for catalog evaluation. Cross-app sync: per-service token counts MUST equal the workspace dashboard's contribution for that service | When catalog tokens resolved |
| 7 | Data Ledger Summary | Four sub-tables from `data-ledger.json`: Captured values (primary keys, reference IDs reusable by future runs); Identity pool usage (pool / record / status / reason — plain text, no masking); Persisted records — succeeded (filter `outcome=='created'`: endpoint / testId / testName / key / value / requestSummary / responseStatus / timestamp); Persisted records — attempted (filter `attempted-failed`/`attempted-server-error` — add DBA action badge `⚠️ Verify in DB — partial transaction possible` for server errors). DB-MCP usability note: rows derived from runtime HTTP responses; verify with `SELECT * FROM <table> WHERE <key>='<value>'` | When `data-ledger.json` exists |
| 8 | Failed Test Details | Error detail cards per failed test. Each card top→bottom: header (test name / endpoint / category badge), status row (expected→actual, red on mismatch), Request panel collapsible (method/URL/headers/body, JSON syntax-highlighted, monospace, max-height with scroll), Response panel collapsible (status/headers/body), Assertion details (expected vs actual). Card border color-coded: red=API defect, orange=infra, yellow=contract mismatch. Request/Response default expanded for first 3 failures, collapsed thereafter. **MANDATE:** the request payload is the #1 debugging artifact — every failure card MUST include full request and response | When failures exist |
| 9 | Gap Analysis | Cols: Endpoint / Method / Reason Not Covered | When endpoint coverage < 100% |
| 10 | Test Infra Info & Footer | Cols: Runner / Base URL / Environment / Auth Method / Total Endpoints. "Generated from `results.json`" with timestamp, link to JSON source + `data-ledger.json` | Always |

**CSS:** clean modern design (flexbox/grid, soft shadows, rounded cards, monospace counts), responsive desktop+tablet, all CSS inline (zero external deps), consistent professional palette (not randomized), hover effects on cards/rows, print-friendly.

#### Run-over-Run Comparison (MANDATORY — prior-run snapshot)

Before overwriting `test-results/results.json`, the test-runner MUST copy the existing file (if present) to `test-results/results.previous.json`. After the new run completes, `generate-report.js` compares the two and renders the delta strip in Section 2b plus a collapsible "Status Changes Since Last Run" panel in Section 4 listing: **newly failing** (regression — red), **newly passing** (recovery — green), **new tests** (badge: NEW), **removed tests** (badge: REMOVED). Comparison MUST be derived from the JSON files only — no DB, no external state. Omit on first run; do NOT fabricate prior totals.

#### Cross-App Dashboard Refresh (MANDATORY — performed automatically by THIS prompt after per-service reports)

> Copilot MUST execute this refresh inline as the FINAL step of `/tdgs-aidlc-generate-api-tests`, immediately after per-service `generate-report.js` finishes. Do NOT ask the user to run another prompt; do NOT surface as a "Next Step". Skipping = defect (per-service reports drift from workspace dashboard).

> **Tool:** `node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js` (the standalone script generated by `/tdgs-aidlc-setup-testdata` Step 4a; same script invoked by `/tdgs-aidlc-run-tests` orchestrator Step 9c). The per-service test-runner does NOT regenerate the dashboard.

**Inputs (read at run time):** `{docs-repo}/test-data/test-data-catalog.yaml` (single source of truth), `{docs-repo}/test-data/dashboard.html` (extract embedded `#catalog-data` if newer than YAML, else re-embed from YAML; extract `#ledger-data` for prior runs), `{docs-repo}/test-data/ledger.yaml` (append-only run history; create if missing), `{service-repo}/api-tests/test-results/data-ledger.json` AND `results.json` for EVERY backend service (glob `*-service*/api-tests/test-results/*`; missing = service did not contribute, do NOT block), `{ui-repo}/functional-tests/test-results/{data-ledger,results}.json` if present.

**Aggregation algorithm (MANDATORY — execute in this exact order):**

1. **Pick latest `runId` PER SERVICE.** `runId` is NOT comparable across services (each writes its own `"run-{ISO-timestamp}"`). Group ledgers by service, keep highest ISO-8601 `timestamp` per group.
2. **Sum summary tiles** across the latest entry of every contributing service: `total / passed / failed / skipped / dataIssue / infra / durationMs`.
3. **Build `endpointResults[]`** by walking each contributing service's `results.json.tests[]`:
   - Skip `category === 'setup'` OR `name` matching `/^\s*SETUP[: ]/i` (cross-service preconditions, not the screen's owned calls).
   - Derive `endpoint = "<METHOD> <path>"`. Map service-relative → catalog-canonical by prefixing the service's API base path (read from `application.yml` / `@RequestMapping` / OpenAPI). For absolute-URL chained requests, strip `http://host[:port]/{context-path}` first, then map.
   - Strip `[backend]`/`[external]` suffix and any `?query` (per setup-testdata Step 4 canonical form).
   - Deduplicate per endpoint: `pass` only if EVERY execution passed; ANY failure flips to `fail`. Treat `skip`, `data-issue`, `infra`, `generation-bug`, `unresolved-token` as `fail` for the dashboard tick (Screen Flow renders ✓ only on a clean pass).
4. **Build `poolConsumption{}`** by summing `identityPoolUsage` keys across services (one consumption per service-run that touched the pool).
5. **Verify (NOT increment) catalog `identityPools[].records[]` pool status.** The per-service runner's `persistCatalogStatus()` ALREADY delta-merged `consumedCount/failureCount/consecutiveFailureCount/lastUsedAt/lastUsedRunId/status` into the catalog YAML. The dashboard refresh MUST NOT increment again — doing so double-counts. Instead READ the catalog and verify: `lastUsedRunId === ledger[service].runId` → ✅ already persisted; mismatch → fallback delta-merge with same logic. Log: `[DASHBOARD] Pool status: {N} verified consistent, {M} required fallback merge.`
6. **Construct merged run entry** for `ledger.yaml` (also embedded into `dashboard.html#ledger-data`):
   ```yaml
   runId: "run-{latestServiceTimestamp}"
   timestamp: "{ISO-8601}"
   environment: "local"
   total: <sum>
   passed: <sum>
   failed: <sum>
   skipped: <sum>
   dataIssue: <sum>
   durationMs: <sum>
   services: ["<service-id>", ...]      # contributing services in stable alpha order
   poolConsumption: { "<poolType>": <count>, ... }
   endpointResults: [ { endpoint: "<METHOD> <canonical-path>", outcome: "pass|fail", reason: "<lastError or null>" }, ... ]
   perServiceRunIds: [ { service: "<id>", runId: "<runId>", timestamp: "<ISO-8601>" }, ... ]
   ```
7. **Append to `ledger.yaml`** (top-level wrapper `runs:`; create if missing). De-duplicate by `runId`. Cap at most recent 50 entries.
8. **Re-embed both blobs into `dashboard.html`:** replace `<script type="application/json" id="catalog-data">…</script>` content with `JSON.stringify(<catalog>)` (single-line); replace `<script type="application/json" id="ledger-data">…</script>` with `JSON.stringify({ runs: <last 10 runs> })`. Do NOT modify any other HTML/CSS/`<script>`. Atomic write: `dashboard.html.tmp` → fsync → rename.

**Sync invariants the dashboard MUST satisfy when regenerated:** summary tiles = SUM of every contributing service's `results.json.summary` for the latest per-service run; identity-pool consumption table = union of all `data-ledger.json.identityPoolUsage`; captured-values count = sum of `data-ledger.json.capturedValues` keys; Run History row count = distinct `runId` count in `ledger.yaml`; "Persisted Records (this run)" = concatenation of every service's `dbRecordsCreated[]` for latest `runId` (sub-counts: `created`=✅, `attempted-failed`=⚠️, `attempted-server-error`=🔴); **three-way sync chain:** `results.json` + `data-ledger.json` (per service, by `test-runner.js`) → `test-summary.html` + `test-report.md` (per service, by `generate-report.js`) → `dashboard.html` + `ledger.yaml` (workspace, by THIS prompt). Every downstream artifact is a derived view of the upstream JSON; any divergence voids the run per the reports-never-lie rule.

**Anti-skip rule:** completion summary MUST show the regenerated `{docs-repo}/test-data/dashboard.html` path AND aggregated `passed/total` numbers — proof refresh happened. The `/tdgs-aidlc-run-tests` orchestrator inherits this step; do NOT delegate refresh to a follow-up `/tdgs-aidlc-setup-testdata` re-run.

**CSS Requirements:**
- Clean modern design: flexbox/grid layout, soft shadows, rounded cards, monospace for counts
- Responsive: readable on desktop and tablet
- All CSS **inline/embedded** — zero external dependencies
- Color palette: consistent professional theme (not random colors each generation)
- Hover effects on cards and table rows
- Print-friendly (no broken layouts when printing)

#### Standardized Markdown Summary Format (MANDATORY — Same for Every Service)

The `test-report.md` MUST mirror the HTML dashboard data exactly:
- Service info, test summary, category breakdown, endpoint coverage, business rules, defect analysis, gap analysis
- All values computed from `results.json` — never hardcoded

**If running all services:** Generate an aggregate `aggregate-test-summary.html` inside `{docs-repo}/test-data/` (the same docs repo that holds `test-data-catalog.yaml`), comparing results across all confirmed services. Do NOT create files at the workspace root or inside any individual service's `api-tests/test-results/` directory.

#### Report Generation Workflow

> **This workflow is automated by the chained command in Step 6.** You do NOT need to run these steps manually — they happen automatically when using `npm run test:full` or `npm test; npm run test:report`.

```
Step A: Run API tests (automatic)
        → test-runner.js auto-generates: results.json

Step B: Run report generation script (automatic — chained after Step A)
        → node scripts/generate-report.js
        → Script reads results.json
        → Script generates: test-summary.html, test-report.md

Step C: Validate consistency across all outputs
```

**Post-execution validation** — verify that:
- `test-summary.html` total/passed/failed counts match `results.json`
- `test-report.md` total/passed/failed counts match `results.json`
- Endpoint coverage % is consistent across all formats

> ⚠️ **NEVER run `npm test` without chaining `npm run test:report`.** Always use: `npm test; npm run test:report` or `npm run test:full` (which is itself defined with `;`, NOT `&&`, so reports regenerate even when tests fail). Using `&&` is FORBIDDEN here — a failed test run with `&&` skips the report step and leaves stale reports on disk that lie about the previous run. If reports are stale, re-run the full chained command — never manually edit report files.

---
