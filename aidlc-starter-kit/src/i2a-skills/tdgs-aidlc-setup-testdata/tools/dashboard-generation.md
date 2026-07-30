# Setup Test Data — Dashboard Generation

## Step 4 — Generate the dashboard

> This prompt generates (or overwrites) a standalone dashboard generator script at `{docs-repo}/test-data/scripts/generate-workspace-dashboard.js`. The script encapsulates ALL dashboard rendering logic so that `/tdgs-aidlc-run-tests` can invoke it directly after test execution without re-running this entire prompt. This prompt ALSO invokes the script immediately after writing it (so the user sees the dashboard on every `setup-testdata` run). On re-runs, the script is overwritten with the latest logic (idempotent).

### 4a. Write `{docs-repo}/test-data/scripts/generate-workspace-dashboard.js`

The script MUST:

- Be a self-contained Node.js script (no external dependencies beyond `js-yaml` and `ajv` which are already in the test-runner's `node_modules`).
- Accept `--workspace-root <path>` (default: `path.resolve(__dirname, '../../..')`) and `--setup-only`.
- Read all inputs listed below, apply the latest-run rule, and write `dashboard.html` + `db-transactions.json` + (when not `--setup-only`) append to `ledger.yaml`.
- **Resolve `js-yaml` and `ajv` from a sibling workspace's `node_modules` (MANDATORY — docs repo has no `package.json`).** Walk the workspace root's children for `**/node_modules/{js-yaml,ajv}` (typically under `<service>/api-tests/node_modules/` or `<ui>/functional-tests/node_modules/`). Use `require(absolute-path)`, NOT bare-name require.
- **Use the AJV draft-2020-12 entrypoint (MANDATORY).** Schemas declare `"$schema": "https://json-schema.org/draft/2020-12/schema"`. Load `ajv/dist/2020.js` and instantiate `new Ajv({ allErrors: true, strict: false })`.
- **Idempotent ledger append (MANDATORY — dedup guard).** Before appending to `ledger.yaml.runs[]`, compute `runFingerprint = SHA-1(sorted concat of (serviceName + perServiceLatestRunId))`. If the most recent existing entry has the SAME `runFingerprint`, do NOT append a duplicate — update the existing entry's `aggregatedAt` instead. Each entry MUST include `runFingerprint` and `aggregatedAt` (ISO-8601 UTC).
- **Concurrent-write lock (MANDATORY — multi-service post-test races).** Wrap every `ledger.yaml` read-modify-write in `acquireLock('{ledger}.lock', timeoutMs=5000)` / `releaseLock(...)`. Three services finishing within seconds (api `posttest` hook) all write the same ledger; without a lock the last writer wins and earlier entries are lost. Lock helper: write own PID into `.lock` file via exclusive `wx` open; on `EEXIST` poll every 100ms until acquire OR timeout; STALE recovery: if existing lock's mtime > 30s old, `unlinkSync` and retry. Always release in `finally`.
- **Per-run `runSeed` field (MANDATORY when RUN_SEED env present).** Each `runs[]` entry MUST include `runSeed: process.env.RUN_SEED || '0'` so deterministic-replay runs are auditable from the ledger. Add the field to `ledger.schema.json` `runs[].properties` as optional `string` (see Step 7 schema authoring).
- **Canonical read-key (MANDATORY).** When reading per-service `results.json`, consume KPI counts from `r.data.summary` and ONLY `summary` (default `{}` if absent). Forbidden: `testSummary`/`counters`/`stats`/`totals` or `||` fallback chains. Pre-publish self-check greps the generated script for literal `r.data.summary` (or `result.summary`/`entry.summary`); if absent, abort with `❌ generate-workspace-dashboard.js does not consume results.json.summary — refuse to publish`.
- **Setup-only mode (MANDATORY).** When `--setup-only` is passed: (1) do NOT append to `ledger.yaml.runs[]` or mutate the ledger; (2) dashboard MUST display "No runs yet" badge and zero tiles regardless of stale `results.json` on disk; (3) Run Manifest, DB Records, and Slowest Tests sections suppressed. Rationale: setup-testdata never executes tests — showing a "last run" would be a lie.
- **AJV-validate every input AND every output against its sibling schema BEFORE consuming/writing it (MANDATORY).** On any validation failure exit 1 with file path, JSON-pointer, and the violation message. Do NOT silently coerce.
- **XSS-safe rendering (MANDATORY).** ALL test-derived strings (test names, error messages, field values, endpoint paths, identifiers) MUST be passed through `escapeHtml()` (from `scripts/lib/html-escape.js`) before injection into HTML. Additionally, before embedding any JSON blob into a `<script type="application/json">` block, replace all occurrences of `</script>` (case-insensitive) with `<\/script>`.
- Honor atomic writes (`.tmp` → `fsync` → `rename`) and ledger GC (max 200 entries).
- Print a one-line summary on success: `✅ Dashboard regenerated: {path} (N services aggregated, M created identifiers, K cross-service skips)`.
- Exit 0 on success, exit 1 on validation failure with a clear error message.

### 4b. Invoke the script

After writing/overwriting the script, immediately run it WITH the `--setup-only` flag:

```bash
node {docs-repo}/test-data/scripts/generate-workspace-dashboard.js --workspace-root {workspace-root} --setup-only
```

> `/tdgs-aidlc-run-tests` invokes the SAME script WITHOUT `--setup-only` after real test execution — that is when ledger entries get appended and run KPIs populate.

### 4c. Inputs the script reads at runtime

- `{docs-repo}/test-data/test-data-catalog.yaml` — single source of truth.
- `{docs-repo}/test-data/ledger.yaml` — append-only run history (created on first run if missing).
- `<each-workspace-child>/api-tests/test-results/results.json` and `data-ledger.json` — per-service backend test output.
- `<each-workspace-child>/functional-tests/test-results/results.json` and `data-ledger.json` — UI Playwright test output.
- Treat any missing file as "no run for that suite yet" — never block on absence.

> **Latest-run rule (MANDATORY).** `runId` is NOT comparable across services (each service generates its own `"run-{ISO-timestamp}"`). Pick the LATEST `runId` PER SERVICE (highest ISO suffix), then sum `total/passed/failed/skipped/dataIssue/infra` across services for the page-header tiles.

> **Endpoint canonical form (MANDATORY).** When matching ledger endpoints against `uiScreens[].endpoints[].endpoint`, both sides MUST be normalized to `"METHOD /path"` (uppercase method, no `[backend]`/`[external]` tag, no trailing slash, no query string). The `[target]` suffix is display-only; the dashboard ADDS it at render time by reading `uiScreens[].endpoints[].target`.

### 4d. Dashboard structure

**Output:** `{docs-repo}/test-data/dashboard.html` — single self-contained HTML (CSS/JS inline, no network requests, dark theme, max-width ~1200px).

**Application-agnostic (MANDATORY — G1).** No app-specific names, screens, pools, endpoints, or test-id prefixes hardcoded. Page title uses `catalog.application` (fallback `Application`). All section content derived from catalog + per-service output at runtime.

Render top to bottom — section order is FIXED:

1. **Header** — non-prod warning banner, page title `{catalog.application} — Test Dashboard`, last-run badge (`Last run · X% pass` colored green ≥ 90% / yellow 70–89% / red < 70% / dim "No runs yet" if ledger is empty), run id + ISO timestamp.
2. **Summary tiles** — 7 tiles: `Total · Passed · Failed · Skipped · Data Issue · Infra · Duration`. `Passed` green, `Failed` red, `Data Issue` yellow, `Infra` orange, `Duration` is the sum of per-service `durationMs` formatted as `Ns`/`Nms`. When `--setup-only` or no per-service results exist, render the no-data message instead.
3. **Quarantine callout** (conditional — only when `count(records where status==quarantined) > 0`).
4. **Failure Analysis** (conditional — only when `failed > 0`, suppressed under `--setup-only`) — `Root Cause · Category · Count · Action` table. Group all failed tests by error-message pattern (collapse similar errors, e.g. same exception class or same selector-mismatch target). Category: `Test Defect` (assertion / reference / selector errors) or `Infra / App` (timeout, navigation, service-down). Action column: one-line fix hint. Omit section entirely when no failures.
5. **Screen Flow** — `Screen | API Calls` table. One row per `uiScreens[]` entry. Each API call rendered as `<code>METHOD /path</code>` followed by a small backend/external badge (color-coded from `uiScreens[].endpoints[].target`). Screens without API calls are omitted.
6. **Test Data** — `Pool | Record | Used | Failed | Status` table for `class: external-required` pools only. Show every user-touched record (at least one field NOT matching `^PLACEHOLDER_`). Empty pool renders one row `Pool · 0 records — paste needed via setup-testdata`. **Used / Failed columns are derived LIVE from the current run** (see 4e below) — do NOT rely on the catalog's `consumedCount`/`failureCount`, which the runner does not always write back. Header annotates `Used/Failed reflect last run` when run data exists.
7. **Quick Actions** (conditional — only when `failed > 0` OR `dataIssue > 0` OR `quarantinedCount > 0`). Three definition-list rows referencing `/tdgs-aidlc-run-tests`, `/tdgs-aidlc-setup-testdata`, `/tdgs-aidlc-generate-api-tests` as appropriate to the surfaced issue.
8. **Run Manifest** (suppressed under `--setup-only`) — one row per `(service, suite-type)` pair. Columns: `Service · Suite · Total · Pass · Fail · Skip · DI · Infra · Pass% · Duration · Run ID`. Suite is `api` or `functional` derived from the file path (`/api-tests/` vs `/functional-tests/`), rendered as a colored badge. Pass% uses the shared `computePassRate` (Phase-7 A7-1).
9. **DB Records Created** (suppressed under `--setup-only`) — `Identifier · Unique Count · Range / Details` table. Groups captured values from `data-ledger.json` by field name (discovered dynamically — G1 prohibits hardcoded field-name whitelists or noise-key blacklists) and shows the count of unique values plus the min–max range. **Filter MANDATORY: only true persisted writes** — same rules: `outcome === 'created'`, non-empty key/value, no `(`/`{`/`[` prefixes. Footer line: `{N} {id1} · {M} {id2} · … · Source: data-ledger.json`. Empty-state: `No DB records were created in the last run.` Per-test detail belongs in per-service `test-report.md`, NOT this dashboard.
10. **Slowest Tests** (conditional — `executedTests.length >= 1`, suppressed under `--setup-only`) — top 10 by `duration` (ms) with a CSS-only bar (max-width = current row's duration / max(duration)). Skipped tests are excluded. Columns: `Service · Test · Endpoint · Duration · Status`.
11. **Run History** (suppressed under `--setup-only`) — last N runs from `ledger.yaml` (default N=5). Columns: `Run ID · Timestamp · Total · Pass · Fail · Skip · DI · Infra · Pass% · Duration · Services`. Pass% uses `computePassRate` (same formula as §8 — excludes skipped from denominator). Each row is one ledger entry. Omit section when ledger has zero entries.

> **Anything not above is out of scope.** Do NOT render: catalog browser, API-flow chain diagrams, per-flow rollups, sparkline trend, pool-readiness strip, executed-tests log, cross-service skip table, time-since-last-run badge. Per-test failure detail lives in per-service `test-report.md`.

### 4e. Live Used/Failed derivation (MANDATORY)

The catalog's `consumedCount` and `failureCount` fields are not always written back by the runner. The dashboard MUST derive both columns LIVE from `results.json.tests[].dataSources[]`:

```js
// Build a (poolType, resolvedValue) → {used, failed} map from all test dataSources
for (const t of allTests) {
  const isFail = t.status === 'fail' || t.status === 'data-issue' || t.status === 'infra';
  const seen = new Set(); // dedup per-test so repeated references in one request don't inflate
  for (const ds of (t.dataSources || [])) {
    if (!String(ds.source || '').startsWith('catalog.identityPool.')) continue;
    const poolType = ds.source.split('.')[2];
    const dedupKey = poolType + '|' + ds.resolvedValue;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    bumpUsage(poolType, ds.resolvedValue, isFail);
  }
}
// At render time, match each catalog record's field values against the map (first match wins)
function lookupRecordUsage(poolType, fields) {
  for (const v of Object.values(fields || {})) {
    const e = liveUsage.get(poolType + '|' + v);
    if (e) return { used: e.used, failed: e.failed };
  }
  return { used: 0, failed: 0 };
}
```

Fall back to `rec.consumedCount || 0` / `rec.failureCount || 0` only when no live entry is found.

### 4f. Generation rules

1. Read `test-data-catalog.yaml` (required), `ledger.yaml` (optional — empty if missing), and ALL per-service `results.json` + `data-ledger.json` files.
2. For each pool, validate `count(records) == count(available + reserved + quarantined)`. If the assertion fails, do NOT write the HTML — surface the inconsistency to the user.
3. The page header MUST use `catalog.application` with a generic fallback of `Application`. **No app-specific names anywhere in the generated HTML.**
4. All interactive features (copy-to-clipboard buttons, time-since computation) are implemented in inline `<script>` blocks at the bottom of the HTML. No external JS libraries.
5. **Record formatter contract (MANDATORY — G2 app-agnostic, show-all-fields rule):** the inline `formatRecord(poolType, fields)` helper that renders the Record column in the Test Data section MUST display EVERY non-internal field the user provided — nothing is hidden. Iterate ALL `Object.entries(fields)` (filtering only keys starting with `_`), and render each as `label: value` joined by ` · `. Build the label by converting the camelCase key to a short human-friendly form (e.g., `firstName` → `First`, `dateOfBirth` → `DOB`, `cardNumber` → `Card`). For any key where no abbreviation is obvious, use the raw camelCase key name as-is. Run an inline self-test BEFORE writing `dashboard.html` that exercises `formatRecord` with at least 3 fixture `fields` objects and asserts each returns a non-empty string containing every field value.
6. **Pool-naming canonical-form check (MANDATORY).** At script start, validate that every `poolType` referenced by any `data-ledger.json` actually exists in `catalog.identityPools[*].poolType`. STOP with `❌ unknown poolType '<x>' referenced by {service}/data-ledger.json` if not. The script MUST NOT carry a hard-coded list of expected pool names — pool names are workspace-specific and discovered from the catalog at runtime.

---
