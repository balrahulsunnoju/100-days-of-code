# Fixtures and Helpers

## Step 6 — Create Base Fixtures and Helpers

### Composable Fixture Architecture

- `auth-fixture.js` — Authentication/session setup and teardown
- `network-fixture.js` — Network interception patterns for offline execution
- `index.js` — Merges all fixtures for clean imports

### Data Factories

- Valid data, invalid data, boundary data, injection payloads (XSS, SQL injection, path traversal)
- Use `@faker-js/faker` for realistic data generation

### Page Objects

- Auto-detect UI routes/pages from the source code (scan for route definitions, component directories)
- Create a page object per discovered primary page/route
- **Read the actual React/Angular/Vue component source** to extract real field `id`, `name`, and `data-testid` attributes — do NOT guess or infer IDs from field names. If a form field uses `id="streetAddress1"`, the page object must use `#streetAddress1`, not `#address1`.
- **For each page object, verify every required form field** from the associated validation schema (Yup/Zod/formik) has a corresponding locator and fill method. Do not create partial page objects that only cover a subset of required fields.

### API Mock Helpers (MANDATORY — HARD STOP if skipped)

Create `{ui-repo}/functional-tests/support/helpers/api-mock.js` that exports:

> **MANDATORY — Mode-aware behavior (`TEST_MODE` env var):** the helper MUST honor `process.env.TEST_MODE`:
> - `mock` (default when unset) — register `page.route()` interceptors as described below.
> - `real` — EVERY exported function (`setupDefaultApiMocks`, `mockApiError`, `mockApiTimeout`, `mockApi.mock`) MUST EARLY-RETURN before registering any route. The real browser hits the real services on the selected environment. Print one line per spec at first call: `[api-mock] TEST_MODE=real — mocks DISABLED, real network calls will be made.` (idempotent guard via `page._apiMockBannerPrinted`).
> This contract is what makes `/tdgs-aidlc-run-tests` Step A2b's mode toggle work. The spec author writes ONE test that runs both modes — no per-spec branching, no `if (mode === 'real')` checks in test code.

- `setupDefaultApiMocks(page, options)` — (mock mode) registers `page.route()` interceptors for every backend endpoint discovered by scanning `{ui-repo}/src/api/**/*.{js,ts,tsx}` for `axios.<method>(`, `fetch(`, and HTTP-client wrapper calls. Each unique URL gets `route.fulfill({ status: 200, contentType: 'application/json', body: ... })` — body from `support/mocks/responses/{endpoint-slug}.json` if present, else `{}`. `options.overrides = { '<urlPattern>': <responseObj> }` overrides per-call.
- `mockApiError(page, urlPattern, status, body)` — single error-response route.
- `mockApiTimeout(page, urlPattern, delayMs)` — delayed/never-respond route.
- `mockApi.mock(urlPattern, response)` — per-test addition; LAST-registered wins.

App-agnostic at scaffold time. Generated specs import via (compute `{relPathToSupport}` from the spec's own location):
```js
const { setupDefaultApiMocks, mockApiError } = require('{relPathToSupport}/helpers/api-mock');
```

> **POST-CREATION VERIFICATION (HARD STOP):** `test -f api-mock.js && grep -q 'setupDefaultApiMocks' api-mock.js && grep -q 'module.exports' api-mock.js || echo "❌ missing"`. Without this, generate-functional-tests Check 8 fails every spec.

---

### Catalog Fixture (MANDATORY when test data catalog exists)

Create `{ui-repo}/functional-tests/support/fixtures/catalog-fixture.js` that:

1. Locates and parses `{docs-repo}/test-data/test-data-catalog.yaml` at test runtime (NOT at generation time — baked-in factory data is the documented limitation we are removing).
2. Reads the **top-level** `identityPools[]` array (per the simplified catalog schema in `/tdgs-aidlc-setup-testdata`). For each pool, only `class === 'external-required'` pools hold runtime-resolvable records. `upstream-generated` pools are populated by API responses (not relevant to UI form fill). `derivable-from-ui` pools are synthesized inline at test-generation time.
3. Exposes a Playwright fixture (e.g., `catalogRecord(poolType)`) that picks the next `available` record using **round-robin rotation** (filter to `status === 'available'`, then index via `(_pickIndex.get(key) || 0) % eligible.length` and increment — never always pick `records[0]`), marks the choice in an in-memory tracker, and returns `record.fields` (NOT the bare record — the new schema nests values under `fields`). Use `pool.poolType` as the lookup key with `pool.type` as a back-compat fallback (`const key = pool.poolType ?? pool.type`) — some older catalogs still use the legacy `type` field; the API runner already handles this fallback (setup-api-tests Section 5 GUARD item 1) and the functional fixture MUST too, otherwise generation against an older catalog produces "pool not found" hard-fails.
   
   **CRITICAL — Record identity for consumed-tracking and teardown matching:** Catalog records do NOT have `id` or `value` top-level fields — they have `fields` (an object) and `status`. The `recordId` used for consumption deduplication and teardown matching MUST be `r.id || r.value || JSON.stringify(r.fields)` — NOT `r.id || r.value` alone (evaluates to `undefined`, causing the `consumed.find()` to never match and teardown to silently skip catalog updates). Both the fixture's `find()` filter and the `globalTeardown` `updateCatalogStatus()` record lookup MUST use the same 3-part fallback chain.

4. **Cross-worker consumption tracking (MANDATORY).** In `test.afterEach`, `appendWorkerLine('consumed', { runId, testId, poolType, recordId, recordFields, outcome, timestamp })` per the per-worker-JSONL pattern. Process-level in-memory `consumed[]` is FORBIDDEN — worker memory is invisible to main-process `globalTeardown`.

5. **Hard-fails** the test with `data-issue` (Playwright `test.fail` annotation + clear error) when no `available` record exists OR when the only available record's value is a `PLACEHOLDER_*` literal in non-`local` env — do NOT generate placeholder/fake values.

Compose this fixture into `support/fixtures/index.js` so generated specs can import it. **The relative path from a spec to `functional-tests/support/` depends on the spec's depth under `tests/e2e/`:** specs at `tests/e2e/<category>/<spec>.js` (e.g., `edge-case/*.spec.js`) use `require('../../../support/fixtures')` (3 `..`); specs at `tests/e2e/<category>/<subcategory>/<spec>.js` (e.g., `positive/flows/*.spec.js`, `negative/forms/*.spec.js`, `negative/business-rules/*.spec.js`, `negative/boundary/*.spec.js`) use `require('../../../../support/fixtures')` (4 `..`). Generated specs MUST compute the relative path from their own location — do NOT hardcode `'../../support/'` (which resolves to a non-existent `tests/e2e/support/` for every spec depth and silently breaks the entire suite).

> ⚠️ **POST-EXECUTION VERIFICATION GATE (HARD STOP).** Verify both files exist:
> ```bash
> test -f {ui-repo}/functional-tests/support/fixtures/catalog-fixture.js || echo "❌ MISSING"
> test -f {ui-repo}/functional-tests/support/global-teardown.js || echo "❌ MISSING"
> ```
> Either missing = HARD FAILURE. Re-run step with `create_file` tool (not markdown description). Without these, generate-functional-tests produces specs that fail with `catalogRecord is not a function`.

### Deterministic Replay via `RUN_SEED` (MANDATORY — three coordinated mechanisms)

Same seed + same catalog + same code → identical pass/fail/skip counts across runs:

1. **`catalog-fixture.js` AND `support/helpers/flow-custom-steps.js`** — round-robin index seeded by `mulberry32(hash32(RUN_SEED + ':' + poolKey))` when `process.env.RUN_SEED` is set. Both files MUST use the SAME `_mulberry32` + `_hash32` helpers (copy-paste — divergence breaks parity with API-test runner). Default seed `'0'` when env unset (still deterministic; user can rotate via `RUN_SEED=1`, `RUN_SEED=2`, …).
2. **`support/global-setup.js`** — export `resetCatalogQuarantineForReplay()` that, ONLY when `process.env.RUN_SEED` is set, walks every catalog pool record and zeros `consecutiveFailureCount` + flips `status: 'quarantined'` → `'available'`. Without this, replays diverge from the original run because quarantine state persists across runs and the seeded PRNG re-picks a now-quarantined record.
3. **`playwright.config.js`** — `workers: process.env.CI ? 1 : (process.env.RUN_SEED ? 1 : undefined)`. Multi-worker parallelism races on the catalog round-robin index → seed determinism collapses. Single worker is the only safe replay mode.

Verification: `RUN_SEED=42 npx playwright test --grep @smoke` twice → identical results.json `expected/unexpected/skipped` counts.

---

### Data-Ledger Writer (MANDATORY when catalog fixture is present)

Add a Playwright global teardown (`globalTeardown` in `playwright.config.js`) at `{ui-repo}/functional-tests/support/global-teardown.js` that:

1. **Glob-reads ALL `.consumed-worker-*.jsonl`** files (per the per-worker-JSONL pattern), concatenates into `consumed[]`, then `unlink`s each (gitignored).

2. Writes `{ui-repo}/functional-tests/test-results/data-ledger.json` using the atomic-write protocol from `/tdgs-aidlc-setup-testdata` Hard Rule 15 (`.tmp` sibling → `fsync` → atomic `rename`) — the orchestrator reads this file concurrently while teardown may still be running. Schema:

   ```json
   {
     "runId": "...",
     "timestamp": "...",
     "environment": "local|test|stage",
     "executionMode": "mock|real",
     "service": "{ui-repo}-functional",
     "capturedValues": [
       { "testId": "...", "key": "{businessId}", "value": "...", "endpoint": "POST /{resource}", "timestamp": "..." }
     ],
     "identityPoolUsage": {
       "{poolType}": { "recordUsed": "...", "status": "consumed|data-issue", "reason": "..." }
     },
     "catalogUsage": {
       "{testId}": {
         "specFile": "tests/e2e/positive/{name}.spec.js",
         "dataSources": [
           { "field": "firstName", "source": "catalog.identityPool.loginUser" },
           { "field": "state",     "source": "faker" },
           { "field": "customId",  "source": "inline-placeholder" }
         ],
         "counts": { "catalog.identityPool": 1, "faker": 1, "inline-placeholder": 1 }
       }
     },
     "dbRecordsCreated": [
       { "testId": "...", "key": "<discoveredKey>", "value": "<captured-value>", "endpoint": "<METHOD endpoint-path>", "mode": "real", "timestamp": "..." }
     ],
     "skippedCrossService": [
       {
         "testId": "...",
         "status": "skipped",
         "reason": "cross-service-dependency: {missingPrereq}",
         "skipReason": {
           "fromService": "{ui-repo}-functional",
           "toService": "{upstream-service-id}",
           "businessRule": "{one-line rule}",
           "requiredInput": "{what data would unblock}",
           "resolution": "{exact next step}"
         }
       }
     ],
     "testSummary": { "total": N, "executed": N, "passed": N, "failed": N, "skipped": N, "skippedCrossService": N, "dataIssue": N, "infra": N },
     "schemaVersion": "functional-v2"
   }
   ```

   `schemaVersion` discriminates from API runner's `api-v2`; cross-app dashboard dispatches accordingly. `executed`/`infra` keys MUST match API runner shape (setup-api-tests §5); functional has no `infra` path so always `0`. **`v2` adds `skippedCrossService[]` (G9b) and changes `capturedValues` `{}`→`[]`.** Readers tolerate `v1` (missing `skippedCrossService` → `[]`; legacy `capturedValues:{}` → `[]`).

   **Per-worker-JSONL pattern** (uniform across `consumed`, `runartifacts`, `captured`, `skips`, `testresult` — workers are separate processes; main-process `globalTeardown` cannot read worker memory): helpers `fs.appendFileSync` per event to `.<prefix>-worker-${process.env.TEST_WORKER_INDEX ?? '0'}.jsonl`; `globalTeardown` glob-reads, concatenates into ledger array, `unlink`s. Per-worker filenames eliminate `O_APPEND` concurrency on Windows.

   **`skippedCrossService[]` validity gate (G9b).** Events missing top-level `status`/`reason` or any of 5 `skipReason` fields written verbatim but counted only when 7/7 present. `test-report.md` renders malformed entries red. Do NOT silently drop.

   **Per-test outcome line + `testSummary` fallback** (closes silent-zero-counts bug): `flow-runner.js` MUST `appendWorkerLine('testresult', { runId, testId, outcome, flowId, persona, caseType, timestamp })` per test (same `try/finally` as `consumed`). `globalTeardown` glob-reads `.testresult-worker-*.jsonl`, dedupes by `testId` (last-write-wins), **falls back when `results.json` missing/empty `stats`** — reporter-agnostic safety net for `--reporter=list`.

   `dataSources[]` populated by page object's `fillForm()` (generate-functional-tests decision tree item 9). `globalTeardown` aggregates into `catalogUsage` map + `counts`. `test-report.md` and dashboard read this.

3. Persists status updates back to catalog YAML (PASS → `consumedCount++`, `consecutiveFailureCount=0`, `status='available'` REUSABLE; FAIL → `failureCount++`, `consecutiveFailureCount++`, `threshold=(pool.quarantineThreshold ?? 5)`, set `status='quarantined'` only when `consecutiveFailureCount >= threshold`) per `/tdgs-aidlc-setup-testdata` reusability+quarantine model. Use SAME atomic-write + sidecar-lock protocol as API runner (setup-testdata Hard Rule #15, setup-api-tests §5 `persistCatalogStatus`): `.tmp` → `fsync` → atomic `rename`, holding `test-data-catalog.yaml.lock` throughout. Without lock, parallel API+functional runs lose increments.

4. **Incremental dashboard update (MANDATORY — immediate feedback).** After writing `data-ledger.json` and persisting catalog status, the teardown MUST perform incremental updates to `{docs-repo}/test-data/dashboard.html` and `{docs-repo}/test-data/db-transactions.json`. This is COMPLEMENTARY to the full-regeneration script (`generate-workspace-dashboard.js`) — teardown provides instant post-run visibility; full-regen provides crash recovery and cross-service aggregation.

   The incremental update performs these operations in order:
   - **(a) Update "Last updated" timestamp** in the dashboard header.
   - **(b) Accumulate summary tiles** — read existing Total/Passed/Failed counts from the HTML, ADD this run's counts (tiles are CUMULATIVE across all runs, never reset).
   - **(c) Append run-history row** — determine next `#N` by scanning existing `<td>#(\d+)</td>` patterns, insert new `<tr>` before the run-history table's `</table>`. Include a "Test Data Used" column summarizing which catalog records were consumed (identity, email, payment card). Existing rows are NEVER modified or deleted.
   - **(d) Append DB Records section** — insert HTML table of all `dbRecordsCreated[]` entries before the DB Records `</details>` tag.
   - **(e) Update Test Data table counts** — for each consumed record, match its row in Section 6 by DOB+DL (identity-requestor), email (identity-email), or cardLast4 (identity-payment-card) using regex, then INCREMENT the Used count (+1) and Failed count (+1 if outcome=failed). Update Status span color (green=available, red=failed). Counts are CUMULATIVE — never reset to 0.
   - **(f) Append to `db-transactions.json`** — read existing JSON, push a new run entry to `runs[]` array with testSummary, capturedValues, dbRecordsCreated, identityPoolUsage. Atomic write.

   > **Architectural invariant:** the incremental update ONLY appends/increments — it NEVER deletes rows, resets counts, or overwrites existing run data. If `dashboard.html` becomes corrupted, run `node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js` to regenerate from source data (ledger.yaml + all data-ledger.json files).

Without this writer, `dashboard.html` cannot show what catalog records the run used.

---

### Run-Artifact Capture from Network (MANDATORY — populates `dbRecordsCreated[]`)

> Functional tests drive the UI which calls the backend; business identifiers come back in those responses. To make functional runs visible alongside API runs in the dashboard's "Persisted Records" section, intercept network responses and populate `dbRecordsCreated[]` using the SAME generic key-derivation rule as the API runner.

Create `{ui-repo}/functional-tests/support/network-capture.js` that:

1. Wires `page.on('response', handler)` per test.
2. Filter to write methods only: `POST|PUT|PATCH|DELETE`.
3. Parse JSON body (skip silently on non-JSON); derive candidate keys generically — NEVER hardcode `orderNumber`, `traceId`, etc.:
   - (a) `apiChain[].capture[]` paths from the catalog (preferred when present)
   - (b) Body fields matching `/(?:^|[._]|[a-z])(id|number|code|reference|guid|uuid|key)$/i`
   - (c) Top-level fields matching `/^[A-Z]{2,}[-_].+/`
4. Push one entry per write-response into `_runArtifacts[]`:
   ```js
   {
     endpoint: `${request.method()} ${new URL(request.url()).pathname}`,
     testId, testName,
     outcome: response.ok() ? 'created' : (response.status() >= 500 ? 'attempted-server-error' : 'attempted-failed'),
     key: '<derived>', value: '<derived>',
     requestSummary: <3-6 business fields>,
     responseStatus: response.status(), timestamp: new Date().toISOString()
   }
   ```
5. **Cross-worker persistence (MANDATORY).** In `test.afterEach`, `appendWorkerLine('runartifacts', entry)` per the per-worker-JSONL pattern above; `globalTeardown` aggregates into `dbRecordsCreated[]`.

Schema, key names, and outcome enum (`created` / `attempted-failed` / `attempted-server-error`) MUST exactly match API runner's `dbRecordsCreated[]` (setup-api-tests Section 5) so the cross-app dashboard renders one unified table.

Wiring verify: `grep -q "page.on('response'" {ui-repo}/functional-tests/support/network-capture.js || echo "❌ network-capture.js missing response interception"`.

**App-agnostic:** key derivation walks the catalog's `apiChain[]` and falls through to regex heuristics. No business names appear in helper code.
