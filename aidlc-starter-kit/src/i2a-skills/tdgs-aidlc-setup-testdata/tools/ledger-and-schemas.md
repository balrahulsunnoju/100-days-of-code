# Setup Test Data — Ledger, Schemas & Math Utilities

## Ledger format (`ledger.yaml`, append-only)

The per-service test runner (owned by `/tdgs-aidlc-setup-api-tests` and `/tdgs-aidlc-run-tests`) writes the per-run entries. **This prompt has two distinct execution modes** with different ledger semantics:

- **Setup mode (first run / re-run for catalog editing):** This prompt only **reads** the ledger to render historical context in the dashboard. It never writes ledger entries.
- **Cross-app aggregation mode (re-run AFTER one or more API/functional test executions, per Hard Rule 14):** This prompt **does** write ONE consolidated cross-app entry per re-aggregation pass and prunes older entries per Hard Rule 16. This is an aggregation step, not a per-run step — individual service runs continue to be written by their own runners.

```yaml
runs:                                  # Top-level wrapper (REQUIRED). Bare arrays at the top level break consumers that load via `yaml.load(file).runs`.
  - runId: "run-{ISO-timestamp}"
    timestamp: "{ISO-8601}"
    environment: "local"               # canonical key. Legacy alias `env` MAY be tolerated by readers but new writers MUST emit `environment`.
    scope: "full|changed|single"       # MANDATORY (G11) — full = entire suite, changed = git-diff scoped, single = single-test invocation. Drives Section 8 (Run Manifest) expectations.
    commitSha: "{git-sha or null}"     # MANDATORY (G11) — `git rev-parse HEAD` in the docs repo at run time, or null when not in a git context.
    total: 0
    passed: 0
    failed: 0
    skipped: 0
    skippedCrossService: 0             # MANDATORY (G9b/G11) — count of structured cross-service skips. Detail rows live in `crossServiceSkips[]` below.
    dataIssue: 0
    infra: 0                           # MANDATORY (G11) — infrastructure failures (DB down, timeout, etc). Part of passRate denominator. Omitting breaks the math invariant with NaN.
    durationMs: 0
    services:                          # list of service identifiers that contributed to this consolidated entry (e.g., `{service-a}`, `{service-b}`, `{ui-repo}-functional`)
      - "{service-id}"
    poolConsumption:                   # map of poolType → records-consumed-this-run; aggregated across `services[]`
      "{poolType}": 0
    recordsUsed:                       # OPTIONAL detail — per-record outcomes, when the writer can attribute them. Readers MUST tolerate omission.
      - poolType: "{poolType}"
        recordKey: "{field1}={value}"
        outcome: "pass|fail"
        reason: null
    endpointResults:                   # OPTIONAL — populates Screen Flow per-call marks + per-screen badges. Readers MUST tolerate omission and render no marks/badges in that case.
      - endpoint: "{METHOD} /{generic-canonical-path}"  # MUST match catalog.uiScreens[].endpoints[].endpoint exactly
        outcome: "pass|fail"
        reason: null
    perFlowRollup:                     # MANDATORY when functional tests ran (G9a) — one entry per discovered flow.
                                       # OMIT this property entirely when only API/unit ran (do NOT write an empty array — the ledger.schema.json `allOf` rule rejects `perFlowRollup: []` with `minItems: 1`).
      - flowId: "{flowId from tests/flows/*.flow.json descriptor}"   # property MUST be `flowId` (matches ledger.schema.json) — using `flow:` is a hard AJV rejection
        total: 0
        passed: 0
        failed: 0
        skipped: 0
        dataIssue: 0
        infra: 0
        passRate: 0.0                  # = passed / (passed + failed + dataIssue + infra) per G11 locked formula
    crossServiceSkips:                 # MANDATORY when `skippedCrossService > 0` (G9b) — structured payload, NOT free text.
                                       # 7 required fields (service + testId + 5 G9b strings). OMIT this property entirely when `skippedCrossService === 0` (do NOT write an empty array).
      - service: "{originating-service-id — same value as the emitting service in the run's services[] list}"
        testId: "{test-id}"
        fromService: "{service that emitted the skip}"
        toService: "{upstream service blocking it}"
        businessRule: "{one-line rule description}"
        requiredInput: "{what data would unblock — e.g., 'order# in catalog identity-orders pool'}"
        resolution: "{exact next step — e.g., 'Run /tdgs-aidlc-setup-testdata, choose update on identity-orders'}"
    createdIdentifiers:                # OPTIONAL — populates dashboard §9 (DB Records Created). Aggregated across services from `data-ledger.json.{dbRecordsCreated, capturedValues}`. Readers MUST tolerate omission.
      - service: "{service-id}"
        testId: "{test-id}"
        source: "db-record|captured"
        key: "{field name — e.g., referenceId, traceNumber}"
        value: "{the produced value}"
        endpoint: "{METHOD /path}"
        timestamp: "{ISO-8601}"
```

**Derived rollup (computed by the dashboard script, NOT stored in `ledger.yaml`):** `recordsUseCountAllTime{poolType: {recordKey: lifetimeCount}}` is recomputed on every dashboard regeneration by walking the catalog's `identityPools[].records[].consumedCount` (single source of truth). It is held in memory only and embedded into the dashboard's `<script type="application/json">` blob. Do NOT persist it to `ledger.yaml` — that would create a denormalized field that inevitably drifts from the catalog.

> **`endpointResults[]` derivation pipeline (MANDATORY — eliminates the "no badges in Screen Flow" failure mode).**
> The orchestrator (this prompt, when re-run after a test execution) builds each ledger entry's `endpointResults[]` array by walking each contributing service's `{service-repo}/api-tests/test-results/results.json` and the UI's `{ui-repo}/functional-tests/test-results/results.json`. The mapping is:
> 1. For each test entry `t` in `results.json.tests[]`, take `endpoint = t.endpoint` (already in canonical `"METHOD /path"` form per the API runner contract) and `outcome = (t.status === 'pass' ? 'pass' : 'fail')`. Treat `skip`, `data-issue`, `infra` all as `fail` for the purpose of the dashboard tick mark — Screen Flow only renders ✓ on a clean pass.
> 2. Strip any `[backend]` / `[external]` suffix and any `?query=...` from `endpoint` before writing (per the Endpoint canonical form rule above).
> 3. Deduplicate per `(endpoint, outcome)` — if the same endpoint ran multiple times in the run, the entry's `outcome` is `pass` only if EVERY execution passed; any failure flips it to `fail`. Use the LAST failing test's `error` as `reason` when applicable.
> 4. SETUP requests (`category === 'setup'` OR name starts with `SETUP:`) are EXCLUDED from `endpointResults[]` — they are cross-service preconditions, not the screen's own owned calls. (This matches the per-service report's Endpoint Coverage filter.)
> 5. Functional results.json (Playwright JSON reporter) does NOT carry per-endpoint outcomes directly. Derive them from the per-test `data-ledger.json` `catalogUsage[testId].dataSources[].apiCallsObserved[]` block when present; otherwise omit functional contributions from `endpointResults[]` (the per-screen badge falls back to the API-side aggregation).
>
> Without this pipeline, Screen Flow renders endpoint paths but no ✓/✗ marks and no per-screen `passed/total` badges — the dashboard looks "wired" but provides zero run-quality signal.

After every run, the runner updates each used record's `consumedCount`, `failureCount`, `consecutiveFailureCount`, `lastUsedAt`, `lastUsedRunId` in the catalog, and writes back to disk.

---

## Catalog JSON Schema (Hard Rule 20)

20. **Catalog JSON Schema (MANDATORY).** Every artifact this prompt writes MUST have a sibling `.schema.json` file emitted alongside it, AND every reader (this prompt on re-run, the API runner, the functional `globalTeardown`) MUST validate the artifact against the schema BEFORE parsing. Without this, a typo like `identityPool` instead of `identityPools` only surfaces as an obscure runtime error far from the source.

    **Files to emit (one-time, idempotent — overwrite on every run):**
    - `{docs-repo}/test-data/test-data-catalog.schema.json` — JSON Schema (draft-2020-12) describing the catalog: top-level `schemaVersion: catalog-v1`, `application: string`, `identityPools[]` with required `poolType`/`class`/`records`/`dataSources`/`quarantineThreshold` AND optional `_rotationIndex: { type: integer, minimum: 0 }` (internal runtime state for round-robin record selection — written by the API test-runner per `/tdgs-aidlc-setup-api-tests` Section 5, read on next run; if omitted from the schema, AJV rejects every catalog the runner persists — hard catch-22). Each `identityPools[].records[]` item carries the per-record properties listed below AND optional `addedAt: { type: ['string','null'], format: 'date-time' }` (ISO-8601 timestamp recorded when the record was first added to the catalog — retained for forensic queries and cross-run record-age analysis; legacy records may be `null`). Step 3 (catalog write) MUST set `addedAt` to the current ISO-8601 string for every NEW record; existing records keep their stored value untouched. `apiChain[]` with required `chainId`/`steps`/`capture`. **`apiChain[].steps[]` items REQUIRE `endpoint` and `target` AND OPTIONALLY allow `via: { type: array, items: { type: string, pattern: '^(apigee|lambda|other):.+' } }` and `transformsAt: { type: string, enum: [apigee, lambda, backend, none] }` — both OPTIONAL (unknown when undeclared = direct call), but when present they MUST validate. `additionalProperties: false` on the step item.** `uiScreens[]` with required `screen`/`route`/`endpoints`, AND optional top-level `stubs: { type: 'object', additionalProperties: { type: 'object', additionalProperties: { type: ['string','number','boolean','null'] } } }` (cross-service stub overrides per G7 — keys are endpoint slugs, values map field names to static literals; the property is OPTIONAL and may be entirely absent, but when present it MUST validate against this nested-object shape so a typo like `stub:` instead of `stubs:` AJV-rejects). `additionalProperties: false` at every level — unknown fields are HARD FAILURES.
    - `{docs-repo}/test-data/ledger.schema.json` — schema for `ledger.yaml`: `schemaVersion: ledger-v2` (bumped from `ledger-v1` to add the G9b/G11 mandatory fields), top-level `runs[]` (REQUIRED, never bare-array), each entry with required `runId`/`timestamp`/`environment`/`scope`/`commitSha`/`total`/`passed`/`failed`/`skipped`/`skippedCrossService`/`dataIssue`/`infra`/`durationMs`/`services` and OPTIONAL `recordsUsed`/`endpointResults`/`perFlowRollup`/`crossServiceSkips`/`createdIdentifiers`/`skippedOther`. `infra` MUST appear in the run-level `required` array (along with `dataIssue`) — omitting it breaks the math invariant `passed + failed + skipped + dataIssue + infra == total` with `NaN`. `scope` enum: `[full, changed, single]`. `perFlowRollup[]` items REQUIRE `flowId` (string — NOT `flow`; matches the descriptor file's `flowId`), `total`, `passed`, `failed`, `skipped`, `dataIssue`, `infra`, and OPTIONAL `passRate` (number 0..1) — `additionalProperties: false`. `crossServiceSkips[]` items REQUIRE 7 strings total: `service`, `testId`, plus all five G9b fields (`fromService`, `toService`, `businessRule`, `requiredInput`, `resolution`) — missing any of the 7 is a HARD FAILURE. `skippedOther` is OPTIONAL and DERIVED (`skipped - skippedCrossService`); the dashboard generator computes it on read so writers may omit it. `additionalProperties: false`. **Conditional (`allOf`) requirements (MANDATORY — close silent-empty-section drift):** (1) when `skippedCrossService > 0`, `crossServiceSkips` MUST be present; (2) when `perFlowRollup` is present, it MUST have `minItems: 1`; (3) when `recordsUsed` is present, it MUST have `minItems: 1`. All three MUST be emitted as `if`/`then` blocks under `runs.items.allOf`; the regenerated schema MUST contain `runs.items.allOf.length === 3`; `/tdgs-aidlc-run-tests` Step 9d.0a verifies and HARD STOPS on a stale schema. **Backward compatibility:** readers MUST accept `ledger-v1` (treat missing G9b/G11 fields as zero/empty); writers MUST emit `ledger-v2`. On first re-run the orchestrator upgrades the file in place by adding defaults to existing entries (`scope: 'full'`, `commitSha: null`, `skippedCrossService: 0`, `infra: 0`, `createdIdentifiers: []`). MUST NOT add `perFlowRollup: []` or `crossServiceSkips: []` to upgraded entries (both have `allOf` `minItems: 1` rules and would AJV-reject) — OMIT the property entirely on legacy entries.
    - `{docs-repo}/test-data/data-ledger.schema.json` — schema for per-service `data-ledger.json`: `schemaVersion` enum MUST include `api-v1`, `api-v2`, `functional-v1`, `functional-v2`. Top-level required: `schemaVersion`, `runId`, `tests[]`. `tests[]` items require `name`/`status`/`reason?`/`unresolvedToken?`. OPTIONAL top-level `dbRecordsCreated[]`, `capturedValues[]` (each `{testId, key, value, endpoint, timestamp}`), `skippedCrossService[]` (each REQUIRES the five G9b fields), `testSummary` object, and — for backward-compat with v1 — a top-level `counters` object. `dbRecordsCreated[]` items MUST declare these properties (writer contract per `/tdgs-aidlc-setup-api-tests` Section 5): `endpoint` (string, required), `testId` (string, required), `testName` (string, required), `outcome` (string, required, enum `[created, attempted-failed, attempted-server-error]`), `timestamp` (string, required, ISO-8601), `key` (string, optional), `value` (string|number|boolean|null, optional), `requestSummary` (object, optional), `responseStatus` (integer, optional). Per-test items MAY include `request`, `response`, `assertions`, `dataWarning`, `duration`, `skipReason` (5-field G9b payload), AND OPTIONAL **`chainBreak`** (per-test contract per `/tdgs-aidlc-setup-api-tests` Section 5 chain-break payload): an object with required string fields `producerEndpoint`, `consumerEndpoint`, `inferredPath`, `observedShape`, `proxyHop` (enum `[direct, apigee, lambda, apigee+lambda]` OR string matching `^other:.+`), `suggestedFix`, `collectionFile`, AND optional nullable `collectionLineHint: { type: ['integer','null'], minimum: 1 }`. `chainBreak.additionalProperties: false`. The `chainBreak` block is ONLY valid on `tests[]` items whose `status === 'data-issue'` — emit ONLY for chain-capture misses (NOT for `unresolved-token` or `generation-bug`). `additionalProperties: false`. **Schema-version conditional (MANDATORY):** add `allOf: [{ if: { properties: { schemaVersion: { enum: ['api-v2','functional-v2'] } } }, then: { required: ['testSummary'] } }, { if: { properties: { schemaVersion: { enum: ['api-v1','functional-v1'] } } }, then: { required: ['counters'] } }]`. The conditional decides which one is mandatory based on the declared `schemaVersion`. The `counters` object (when present) MUST require all six keys: `total`, `passed`, `failed`, `skipped`, `dataIssue`, `infra`. Same v1 → v2 backward-compat rule as the run ledger.

    > **Schema-regeneration freshness gate (MANDATORY — R8/R9 fix).** The three `*.schema.json` files are committed artifacts; a stale schema silently breaks downstream AJV validation (v2 ledger fails v1 schema; `_rotationIndex` fails un-listed schema; `flowId` fails `flow`-named schema). Therefore: (1) ALWAYS overwrite all three on every run — do NOT skip if a file already exists; (2) BEFORE writing each, build the in-memory object exactly per spec then `fs.writeFileSync` atomically (`.tmp` + rename); (3) AFTER writing, re-read each file and assert ALL of the following — each is HARD STOP `❌ schema regeneration failed: <file> still stale at <field>` on mismatch:
    >   - `data-ledger.schema.json.properties.schemaVersion.enum` includes BOTH `api-v2` AND `functional-v2`.
    >   - `data-ledger.schema.json` declares ALL of `testSummary`, `capturedValues`, `skippedCrossService` as top-level properties.
    >   - `data-ledger.schema.json.properties.tests.items.properties.skipReason` is defined.
    >   - `data-ledger.schema.json` carries the schema-version conditional (`allOf.length >= 1` with one `if`/`then` selecting `testSummary` for v2 and another selecting `counters` for v1).
    >   - `data-ledger.schema.json.properties.dbRecordsCreated.items.required` includes ALL of `endpoint`, `testId`, `testName`, `outcome`, `timestamp`.
    >   - `ledger.schema.json.properties.runs.items.required` includes `infra`.
    >   - `ledger.schema.json.properties.runs.items.properties.perFlowRollup.items.required` includes `flowId` (NOT `flow`).
    >   - `ledger.schema.json.properties.runs.items.properties.crossServiceSkips.items.required` includes ALL 7 strings: `service`, `testId`, `fromService`, `toService`, `businessRule`, `requiredInput`, `resolution`.
    >   - `ledger.schema.json.properties.runs.items.allOf.length === 3` (the three conditionals above).
    >   - `test-data-catalog.schema.json.properties.identityPools.items.properties._rotationIndex` is defined.
    >   - `test-data-catalog.schema.json` declares `addedAt` on `identityPools[].records[]` items (optional, `format: date-time`).
    >   - `test-data-catalog.schema.json.properties.apiChain.items.properties.steps.items.properties.via` is defined (optional array; pairs with `transformsAt`).
    >   - `test-data-catalog.schema.json.properties.apiChain.items.properties.steps.items.properties.transformsAt` is defined (optional enum).
    >   - `data-ledger.schema.json.properties.tests.items.properties.chainBreak` is defined (optional object; pairs with the dashboard Chain Contract Mismatches sub-panel).
    > Any single mismatch → STOP. Durable fix for the recurring gap where prior spec edits updated the contract but on-disk schema lagged.

    **Validation gate at LOAD time (every reader):**
    ```js
    const Ajv = require('ajv').default;
    const schema = require('./test-data-catalog.schema.json');
    const ajv = new Ajv({ allErrors: true, strict: true });
    const validate = ajv.compile(schema);
    const catalog = yaml.load(fs.readFileSync(catalogPath, 'utf8'));
    if (!validate(catalog)) {
      const errs = validate.errors.map(e => `  ${e.instancePath || '/'} ${e.message}`).join('\n');
      throw new Error(`❌ test-data-catalog.yaml fails schema validation:\n${errs}\n\nCommon causes: typo in field name (e.g., 'identityPool' vs 'identityPools'), missing required field, unknown field. Fix the catalog or run /tdgs-aidlc-setup-testdata to regenerate.`);
    }
    ```

    **Why this matters:** without schema validation, a typo silently drops a pool/chain/screen and surfaces as `unresolved-token` failures across many downstream tests with no pointer to root cause. With it, one clear error names the field and line.

    **Display schema-validation result on every re-run, BEFORE the merge summary** as a `CATALOG SCHEMA VALIDATION` banner block listing each artifact's status (`✅ valid (schemaVersion=…)` or `❌ <field> <message>`) and the schema files written.

---

## Phase-7 Augmentations — Dashboard, Ledger, Math

### A7-1 — Shared math utility (G11 contract)

The scaffolded `{docs-repo}/test-data/scripts/lib/math.js` (or `scripts/lib/math.py` for Python-only workspaces) MUST export:

```js
// scripts/lib/math.js
function computePassRate(counts) {
  // counts: { passed, failed, skipped, dataIssue, infra, total }
  // skipped (incl. cross-service-dependency) is EXCLUDED from denominator (G11)
  const denom = counts.passed + counts.failed + counts.dataIssue + counts.infra;
  if (denom === 0) return null;
  return counts.passed / denom;
}
function assertCountsMath(counts) {
  const sum = counts.passed + counts.failed + counts.skipped + counts.dataIssue + counts.infra;
  if (sum !== counts.total) throw new Error(`counter drift: ${sum} ≠ ${counts.total}`);
}
module.exports = { computePassRate, assertCountsMath };
```

Every script that computes pass-rate (per-service report generators, dashboard generator, run-tests summarizer) MUST `require('./lib/math.js')` — do NOT inline the formula.

### A7-2 — Ledger archive policy (G9)

When `ledger.yaml.runs[]` exceeds 200 entries, the oldest entries MUST be moved to `ledger-archive/ledger-YYYYMMDD.yaml` (one file per archive date; merge into existing file if same-date archive exists).

### A7-3 — XSS-safe HTML rendering (MANDATORY)

All dashboard / report cells that render user-controlled or test-derived strings (test names, error messages, field values, endpoint paths, captured tokens, business identifiers, skip reasons) MUST be HTML-entity-escaped before injection into the DOM. Use the helper `escapeHtml(str)` from `{docs-repo}/test-data/scripts/lib/html-escape.js` (sibling of `math.js`, regen alongside it):

```js
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
module.exports = { escapeHtml };
```

The `escapeHtml` rule applies BEFORE the `</script>` escape rule above (escape HTML first, then sanitize embedded script blobs). XSS edge-case test names (`<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, etc.) routinely reach the dashboard via `tests[].name` — unescaped, they execute in the reviewer's browser as soon as the dashboard opens. This is a security-critical rule, not a stylistic preference; CI builds MUST grep generated `dashboard.html` for known XSS attack strings and fail the run if any unescaped form survives.

---
