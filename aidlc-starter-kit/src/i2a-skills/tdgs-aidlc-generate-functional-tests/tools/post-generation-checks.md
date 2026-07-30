# Post-Generation Validation Gate (Section 5b — MANDATORY)

> ⚠️ **BEFORE executing tests**, run all checks below on generated files. Fix ALL violations before execution.

**Check 1 — Custom select interaction:** if a custom select library (react-select, ng-select, vue-select, etc.) was detected, grep ALL POs/specs for `.selectOption(` — any match is HARD ERROR. Replace with the helper. Native `<select>` exempt.

**Check 2 — Masked input interaction:** if masked-input libraries (react-maskedinput, react-input-mask, imask, cleave.js) detected, grep for `.fill(` on masked field IDs — match = HARD ERROR. Replace with `.pressSequentially()` via mask helper.

**Check 3 — Route literal accuracy:** every `page.goto()` URL must match a literal route path extracted in Discovery. Flag URLs not in route config.

**Check 4 — Anchor-vs-button selectors:** every `getByRole('button')` in PO must target an actual `<button>`/`<Button>` (not `<a>` styled as button). Fix mismatches.

**Check 5 — Stateful route dependencies:** every test navigating to a step > 0 in a multi-step flow must include prior step completion or state pre-population. Flag bare deep-links to mid-flow routes.

**Check 6 — Mock response state transitions (multi-step flows):** `page.route()` mocks must return **step-appropriate** responses. Each step's mock advances the UI to the next step. Specifically:
- UI state checks (`transactionStatus: 'APPROVED'`, `orderStatus: 'COMPLETE'`) must be returned by mock
- If a step depends on prior API data, the mock must include that data
- Payment/checkout: mock gateway endpoints with realistic state transitions. **Mock bodies MUST come from (priority):** (i) OpenAPI in KB/service repo, (ii) `support/mocks/responses/<endpoint>.json`, (iii) recorded responses via `playwright trace`. **None available → emit `{}` + `// TODO: verify response shape — no source-of-truth found for <endpoint>` comment, tag dependent test `@quarantine`** (G4). Do NOT invent shapes from prose.
- Flag specs where ALL mocks use the same static response.

**Check 7 — Catalog data consistency in mocks (catalog-found only):** mock response data in `support/mocks/responses/` uses field values consistent with form-fill paths (factories or UI-source-derived constants). Catalog has NO `dynamicFields.constrained` / `businessConstants` — source of truth for dropdowns/constants is UI source code. Mocks MUST use that source-of-truth.

**Check 8 — API mock setup compliance (MODE-CONDITIONAL — aligns with gap analysis #11):**
- **`TEST_MODE=mock`:** every spec MUST call `setupDefaultApiMocks` (or project equivalent) in `test.beforeEach`/`test.describe`. Missing = HARD FAILURE (test will timeout). ONLY exception: tests of offline/error behavior using targeted `page.route()` errors.
- **`TEST_MODE=real`:** any positive spec containing `setupDefaultApiMocks`, `page.route(`, `overrides:`, or mock response imports = HARD FAILURE. ONLY exception: negative/error specs with `// intentional-error-injection` comments.
- **`page.route()` regex scope (negative specs):** scope narrowly to the API path — `/order-status/i` will also match `page.goto('/.../vital-record-order-status/')`, breaking page nav. Use `/v\d+\/.*\/GetOrderStatus/i` + restrict to `POST`.

**Check 9 — Mock response field completeness (CRITICAL):** every mock in `support/helpers/api-mock.js` and `support/mocks/responses/` must include ALL fields the UI conditionally checks. Read component source for `response.data.{fieldName}` accesses. Common failures:
- **Missing conditional field:** UI checks `feeDetails !== undefined && feeDetails.length > 0` — omitted field blocks navigation despite 200 status
- **Wrong field value:** UI checks `status === "Success"` — `{ valid: true }` or `"success"` (lowercase) silently fails
- **Missing nested object:** UI accesses `checkoutConfiguration.host` — flat response throws runtime error

Per endpoint: (a) grep component for `response.data.` accesses, (b) list fields, (c) verify mock includes ALL with values satisfying conditionals, (d) flag missing fields. **If skipped: tests pass mock layer but fail UI navigation on incomplete data.**

**Check 10 — Catalog override compliance (CRITICAL when `identityPools[]` exists):** no form-fill code uses raw `faker.*` for a field exposed by any `external-required` pool (decision-tree rule 1 wins over rule 3). Procedure:
1. Build "pool-owned field names" set from every `external-required` pool's `fields[]`.
2. Scan PO `fillForm()` and specs for `faker.` calls.
3. If field name is pool-owned → HARD ERROR. Replace with pool-backed factory from `support/factories/`.
4. Verify every `fillForm()` carries `// source: ...` comment matching decision tree.

**Legitimate Check-10 exceptions** (must be inline-commented):
- `// not-in-catalog: <field> not catalogued` — UI-only fields
- `// not-in-catalog: boundary <field>` — negative/boundary tests
- `// not-in-catalog: security payload` — XSS / SQLi / path-traversal

Grep enforcement: every literal in `fillForm()` is either `data.X()` call OR has adjacent `// not-in-catalog:` comment. Fail = HARD ERROR.

**Check 11 — Web-first assertion compliance (CRITICAL):** no `await expect(await locator.count())`, `await expect(await locator.textContent())`, `await expect(await locator.isVisible())`, or any pre-resolved Promise into `expect()` — these don't auto-retry, #1 source of flake. Grep `await expect\(await` in `tests/`/`support/` — must be 0. Replace with `toHaveCount(N)` / `not.toHaveCount(0)` / `toHaveText(/.../)`. Also remove `page.waitForTimeout(...)` / `setTimeout(...)` from tests (arbitrary sleeps).

**Check 12 — No assertions in page objects (CRITICAL):** `grep expect\( support/page-objects/` must be 0. POs are pure DOM mappers (locators + actions). Move all `expect(...)` to specs. POs may expose locators (`get anyError() { return this.page.locator('.error') }`) but never assert.

**Check 13 — No console output (CRITICAL):** `grep console\.(log|warn|error|debug)` in `tests/` and `support/` must be 0. Use `--debug`/`--trace=on`/`--ui` instead. Only exception: `support/scripts/` (report generators).

**Check 14a — Gated-route deep-link ban (CRITICAL — #1 source of false failures):** for every PO whose route was classified "gated" in Discovery, grep `page\.goto\(` in the PO file. PO `goto()` calling `await this.page.goto('/...gated-path...')` directly = HARD ERROR. PO MUST (a) drive wizard from entry route via UI clicks, (b) delegate to `wizardHelper.navigateTo(stepName)`, or (c) be marked `untestable-in-isolation` in `functional-tests/README.md` Known Coverage Gaps and SKIPPED. Symptom: tests time out on `locator('#field')`; failure screenshot shows wizard start page ("Welcome", "Get Started", record-type selection).

**Check 14b — `.first()` on singleton locators ban (CRITICAL — false failures where screenshot looks correct):** grep `support/page-objects/**/*.js` and `tests/**/*.spec.js` for forbidden patterns:
- `locator\(['"]h[1-6]['"]\)\.first\(\)`
- `locator\(['"]\.error[^'"]*['"]\)\.first\(\)`
- `getByRole\(['"]heading['"]\)\.first\(\)`
- `locator\(['"]button['"]\)\.first\(\)`

Match = HARD ERROR. Replace with text-anchored: `getByRole('heading', { name: /pattern/i })`, `locator('.actual-error-class', { hasText: /pattern/i })`, `getByRole('button', { name: /label/i })`. Singletons MUST use text/attribute filter, never positional `.first()`.

**Check 14c — Custom-component helper runtime smoke (CRITICAL — prevents helpers built from docs not DOM):** for EACH `support/helpers/*-helper.js` (react-select, date-picker, masked-input), generate ONE smoke spec under `tests/e2e/smoke/` exercising the helper against a real page. Run as part of post-generation gate (before full suite). Smoke fail = helper built from library docs not actual DOM (react-select v2/v3/v5 differ, @mui v4/v5 differ). To regenerate: navigate to a page using the component, run `await page.evaluate(() => document.querySelector('[name="<knownField>"]').closest('[class]').outerHTML)` to capture DOM, then rewrite helper selectors. Helpers built only on `[class*="control"]`/`[class*="option"]` patterns silently fail at runtime — smoke spec is the ONLY catch.

**Check 14d — Catalog ledger wiring (CRITICAL — fixes empty "Test Data Used" sections):** if both fixture (`catalog-fixture.js` exposing `catalogRecord(poolType)`) AND helper (`catalog-data.js` exposing `data.X()`) accessors exist, they MUST share ONE ledger writer. Symptom: report's "Test Data Used" all zeros despite catalog usage.

Required architecture:
1. **One shared writer** — `support/helpers/ledger-writer.js` exporting `setCurrentTest(testKey, specFile)`, `clearCurrentTest()`, `recordUsage(field, source, value)`, `readLedger()`, `writeLedger()`. Both fixture + helper modules import this.
2. **Per-test auto-fixture** — `auto: true` Playwright fixture calling `setCurrentTest(testInfo.titlePath.join(' > '), relativeSpecPath)` before each test, `clearCurrentTest()` after — lets helper accessors (no `testInfo`) attribute writes.
3. **Every accessor records usage** — wrap `data` from `catalog-data.js` in a `Proxy` whose `get` calls `recordUsage(field, source, value)` after the underlying accessor. `SOURCE_MAP` constant maps accessor name → source class (`catalog.identityPool` | `ui-source` | `faker` | `inline-placeholder`).
4. **Single canonical ledger location** — `LEDGER_FILE = path.join(<ui-repo-root>, 'functional-tests/test-results/data-ledger.json')` — same committed-relative path that `/tdgs-aidlc-setup-functional-tests` Step 6 writes from `globalTeardown`. NOT `os.tmpdir()`. Override env `AIDLC_DATA_LEDGER_FILE` allowed for advanced CI.
5. **Global teardown reads same ledger** — `support/global-teardown.js` reads canonical `LEDGER_FILE`, attaches `counts` per-test from `dataSources`, writes final `data-ledger.json` to same path.
6. **`test:e2e:full` script uses `;` not `&&`** — report generator must run unconditionally; `&&` swallows the report on test failure.

Validation: `grep -RnE "recordUsage|setCurrentTest" support/helpers/catalog-data.js support/fixtures/catalog-fixture.js` ≥1 hit per file. After any passing form-touching spec, `data-ledger.json.catalogUsage` non-empty.

**Check 14e — Tag taxonomy compliance (CRITICAL):** every `test.describe(` line contains ≥1 of `@smoke @regression @external-integration @edge-case @quarantine`. Distribution:
- Positive workflow describe → `@smoke` (top ≤10 critical happy paths only) OR `@regression` (all other positives)
- Negative validation/error describe → `@regression`
- Edge-case (security/i18n/404) describe → `@edge-case`
- Spec invokes Apigee passthrough OR real third-party (Stripe/OPM/USPS) outside the app's own services → `@external-integration`
- `@quarantine` requires adjacent `// TODO(<issue-link>): unquarantine when …`

Untagged = HARD ERROR (CI tag-filtering breaks silently).

**Check 14f — Test de-duplication (HARD FAILURE):** two tests are duplicates if they assert the SAME boundary on the SAME field/screen with the SAME identity pool. Detection:
1. Per `test(` block, fingerprint = `sha1({screen}|{field}|{boundary-class}|{identity-pool}|{expected-outcome})` (boundary-class: `min`, `max`, `null`, `pattern-violation`, `xss`, etc.)
2. If ≥2 share fingerprint, all but the FIRST are duplicates.
3. **Action:** auto-remove and report `❌ N duplicate tests removed: - tests/e2e/positive/login.spec.js:42 (kept: tests/e2e/negative/login-validation.spec.js:18)`.
4. Duplicates >5% of total → WARNING (discovery may be over-expanding; check Test Count Budget Reconciliation).

**Check 14g — Structured cross-service SKIP enforcement (G9b HARD FAILURE):**
> Free-text `test.skip()` hides why/who/what. The per-service `test-report.md` Cross-Service Skips section + `ledger.yaml.runs[].crossServiceSkips[]` need structured payload. Every cross-service skip goes through ONE helper that emits all 5 G9b fields into per-worker `.skips-worker-*.jsonl` (aggregated by `globalTeardown` into `data-ledger.json.skippedCrossService[]` per `/tdgs-aidlc-setup-functional-tests` Step 6).

Allowed pattern (the ONLY one):
```js
const { skipCrossService } = require('{relPathToSupport}/helpers/skip-helper');
if (!upstreamRecord) {
  return skipCrossService(test, testInfo, {
    fromService:  '{ui-repo}-functional',
    toService:    '{upstream-service-id}',
    businessRule: 'downstream screen requires existing {businessId} from upstream service',
    requiredInput:'{businessId} in catalog {pool-type} pool, status=available',
    resolution:   'Run /tdgs-aidlc-setup-testdata, choose update on {pool-type} pool',
  });
}
```

**If helper missing on disk**, this prompt MUST write `{ui-repo}/functional-tests/support/helpers/skip-helper.js`. Required `skipCrossService(test, testInfo, payload)` exports: (a) AJV-validate `payload` against inline 5-field schema, (b) `fs.appendFileSync` JSONL line to `.skips-worker-${process.env.TEST_WORKER_INDEX ?? '0'}.jsonl`, (c) `test.skip(true, JSON.stringify(payload))`. AJV-fail = `throw` (not silent).

Forbidden (HARD FAILURE per match):
- `test.skip(...)` not preceded by `skipCrossService(` within 5 lines AND missing `// not-cross-service: <reason>` comment.
- `test.skip(condition, 'free-text reason')` for cross-service skips.
- `if (!data) return;` early-returns (records as `passed` with 0 assertions, inflates pass rate).

Validation grep:
```bash
grep -RnE "test\.skip\(" tests/ | while read -r line; do
  file="${line%%:*}"; rest="${line#*:}"; lno="${rest%%:*}"
  start=$((lno-5)); [ "$start" -lt 1 ] && start=1
  ctx=$(sed -n "${start},${lno}p" "$file" 2>/dev/null)
  echo "$ctx" | grep -qE "skipCrossService\(|not-cross-service:" || echo "VIOLATION $file:$lno"
done
```

**Check 14h — Pre-publish ledger AJV gate (G11 HARD FAILURE):**
> Cross-app dashboard reads `data-ledger.json` immediately. Malformed (missing `skippedCrossService[]`/`schemaVersion`/functional-v2 fields) → `/tdgs-aidlc-setup-testdata` Step 4a `exit 1`s with JSON-pointer error → entire workspace dashboard breaks until investigated. Validate BEFORE publishing.

At end of Section 6 (after Playwright, BEFORE chained `node functional-tests/scripts/generate-report.js`):

1. Read `{ui-repo}/functional-tests/test-results/data-ledger.json` (from `globalTeardown`).
2. Read `{docs-repo}/test-data/data-ledger.schema.json` (per `/tdgs-aidlc-setup-testdata` Hard Rule 20). If absent, use bundled fallback in `support/helpers/ledger-writer.js` (carries inline copy).
3. AJV-validate. Failure → print JSON-pointer per violation, EXIT 1, do NOT generate report, do NOT publish.
4. Read `functional-tests/test-results/results.json`. Verify `stats.expected + stats.unexpected + stats.flaky + stats.skipped === stats.total`. Mismatch → warning banner only (don't block — report generator surfaces it).

Implement as `validateLedgerOrExit()` in `support/helpers/ledger-writer.js`, called from `globalTeardown` AFTER atomic write. Generation prompt writes if missing.

**Check 14k — Minimum assertion count per non-positive spec (CRITICAL — HARD FAILURE):**
> **Root cause this fixes:** Non-positive specs (negative/, edge-case/) with ZERO `expect()` calls always pass — Playwright marks a test "passed" when it completes without throwing. 96 tests "passing" with no assertions provides zero validation signal. G18 defines a negative test as one that ASSERTS error UI + ASSERTS no advance — this check mechanically enforces that definition.

Rule: every `*.spec.js` under `tests/e2e/negative/` and `tests/e2e/edge-case/` MUST contain ≥1 `expect(` call PER `test(` block. A test block with zero assertions = HARD FAILURE.

Validation:
```bash
for f in tests/e2e/negative/**/*.spec.js tests/e2e/edge-case/**/*.spec.js; do
  [ -f "$f" ] || continue
  tests_count=$(grep -cE "^\s*(test|it)\(" "$f" 2>/dev/null || echo 0)
  asserts_count=$(grep -cE "expect\(" "$f" 2>/dev/null || echo 0)
  [ "$tests_count" -eq 0 ] && continue
  ratio=$((asserts_count / tests_count))
  [ "$ratio" -lt 1 ] && echo "HARD FAILURE $f: $tests_count test(s) but only $asserts_count assertion(s) — tests with 0 assertions always pass"
done
```

Minimum per non-positive spec:
- **Negative-validation:** ≥1 `expect()` asserting error message visible OR field error state (`toHaveClass(/error/)`, `toHaveText(/required|invalid/)`, `toBeVisible()` on error element)
- **Negative-business-rule:** ≥1 `expect()` asserting rejection UI (banner, toast, blocked submit)
- **Edge-case (security):** ≥1 `expect()` asserting input was sanitized OR error shown (NOT that the page "loaded successfully")
- **Edge-case (i18n):** ≥1 `expect()` asserting translated text content

Anti-pattern: `expect(page).toHaveURL(...)` alone does NOT count as a meaningful assertion for negative tests — it proves navigation happened, not that validation fired. Meaningful = asserts an ERROR element or a BLOCKED state.

**Check 14l — Quarantine census (mock-mode excess gate — HARD FAILURE):**
> **Root cause this fixes:** When `TEST_MODE=mock`, every `@quarantine` spec is excluded from CI execution. If too many specs are quarantined, CI "passes" vacuously because it ran nothing meaningful. In mock mode the agent controls the mock shapes — quarantine should be rare (only when no OpenAPI/fixture/recording exists for the endpoint).

Rule: in mock mode, `@quarantine`-tagged specs MUST be ≤10% of total generated specs. Above 10% = HARD FAILURE — the generator is quarantining instead of deriving mock shapes from available sources (see G4 clarification).

Validation:
```bash
TOTAL=$(find tests/e2e -name '*.spec.js' | wc -l)
QUARANTINED=$(grep -Rl "@quarantine" tests/e2e/ | wc -l)
PCT=$((QUARANTINED * 100 / (TOTAL > 0 ? TOTAL : 1)))
[ "$PCT" -gt 10 ] && echo "HARD FAILURE: $QUARANTINED/$TOTAL specs ($PCT%) quarantined — exceeds 10% mock-mode cap. Derive mock shapes from OpenAPI (G4)."
```

Each quarantined spec MUST have `// TODO(<issue-link>): unquarantine when <specific condition>` — missing = Check 14e violation. Quarantine without an issue link = parking the spec forever.

## Validation Results Display

```
══════════════════════════════════════════════════════════════
POST-GENERATION VALIDATION
══════════════════════════════════════════════════════════════
  Check                              Result
  ─────────────────────────────────  ─────────────────────────────────
  Custom select compliance           {✅ Pass | ❌ N violations fixed}
  Masked input compliance            {✅ Pass | ❌ N violations fixed}
  Route literal accuracy             {✅ Pass | ❌ N mismatches fixed}
  Anchor-vs-button selectors         {✅ Pass | ❌ N mismatches fixed}
  Stateful route dependencies        {✅ Pass | ❌ N tests fixed}
  Mock setup in beforeEach           {✅ Pass | ❌ N missing (mock) | ❌ N have mocks (real)}
  Mock state transitions             {✅ Pass | ❌ N mocks updated}
  Mock response field completeness   {✅ Pass | ❌ N responses missing fields}
  Gated-route deep-link ban          {✅ Pass | ❌ N PO goto() fixed}
  .first() on singleton ban          {✅ Pass | ❌ N positional locators fixed}
  Helper runtime smoke validation    {✅ Pass | ❌ N helpers regenerated | ⏭ no helpers}
  Catalog ledger wiring              {✅ Pass | ❌ ledger empty | ⏭ no catalog}
  Catalog data consistency           {✅ Pass | ❌ N mismatches | ⏭ no catalog}
  Catalog override compliance        {✅ Pass | ❌ N faker-on-catalog-field | ⏭ no catalog}
  Web-first assertion compliance     {✅ Pass | ❌ N non-retrying assertions fixed}
  No assertions in page objects      {✅ Pass | ❌ N expect() moved to specs}
  No console output in tests         {✅ Pass | ❌ N console.* removed}
  Tag taxonomy compliance            {✅ Pass | ❌ N untagged describes fixed}
  Test de-duplication                {✅ Pass | ❌ N duplicates removed}
  Structured cross-service SKIP      {✅ Pass | ❌ N bare test.skip() fixed}
  Pre-publish ledger AJV gate        {✅ Pass | ❌ ledger violations — HALTED}
  Non-positive assertion count (14k) {✅ Pass | ❌ N specs with 0 assertions — HALTED}
  Quarantine census (14l)            {✅ Pass | ❌ N% quarantined > 10% cap — HALTED | ⏭ mode=real}
  Flow coverage (G9a)                {✅ Pass | ❌ N flows uncovered — see Block F4}
  Flow-runner consumption (G9a)      {✅ Pass | ❌ N positive full-flow specs hand-code navigation}
  Real-mode E2E completeness (G15)   {✅ Pass | ❌ N specs skip pages | ⏭ mode=mock}
  Landing-page entry point (G16)     {✅ Pass | ❌ N positive specs bypass landing page}
══════════════════════════════════════════════════════════════
```

## Standards Audit Script (copy-paste runnable, executes Checks 11–14l in one shot)

```bash
# Run from the test root, e.g.: cd functional-tests && bash <<'EOF'
echo "=== Check 11a: non-retrying await expect(await ...) ==="
grep -RnE "await expect\(await" tests/ support/ || echo OK
echo "=== Check 11b: arbitrary sleeps in tests ==="
grep -RnE "page\.waitForTimeout|setTimeout\(" tests/ || echo OK
echo "=== Check 11c: silent catch swallow ==="
grep -RnE "\.catch\(\(\)\s*=>\s*(false|null|undefined)\)" tests/ || echo OK
echo "=== Check 12: assertions in page objects ==="
grep -RnE "expect\(" support/page-objects/ || echo OK
echo "=== Check 13: console output in tests/support ==="
grep -RnE "console\.(log|warn|error|debug)" tests/ support/page-objects/ support/helpers/ support/fixtures/ || echo OK
echo "=== Check 14a: gated-route deep-link in PO goto() ==="
grep -RnE "this\.page\.goto\(" support/page-objects/ || echo OK
echo "=== Check 14b: .first() on singleton locators (HARD BAN) ==="
grep -RnE "locator\(['\"]h[1-6]['\"]\)\.first\(\)|locator\(['\"]\.error[^'\"]*['\"]\)\.first\(\)|getByRole\(['\"]heading['\"]\)\.first\(\)|locator\(['\"]button['\"]\)\.first\(\)" tests/ support/page-objects/ || echo OK
echo "=== Check 14c: helper smoke specs exist for every custom helper ==="
for h in support/helpers/*-helper.js; do [ -f "$h" ] && base=$(basename "$h" .js) && [ -f "tests/e2e/smoke/${base}.smoke.spec.js" ] || echo "MISSING smoke spec for $h"; done; echo OK
echo "=== Check 14d: catalog ledger wiring ==="
if [ -f support/helpers/catalog-data.js ] && [ -f support/fixtures/catalog-fixture.js ]; then
  grep -qE "recordUsage|setCurrentTest" support/helpers/catalog-data.js && grep -qE "recordUsage|setCurrentTest" support/fixtures/catalog-fixture.js && echo OK || echo "FAIL: ledger writer not wired"
else echo OK; fi
echo "=== Check 14e: untagged test.describe() ==="
grep -RnE "test\.describe\(" tests/ | grep -vE "@(smoke|critical|regression|edge-case|quarantine|slow)" || echo OK
echo "=== Check 14f: tag distribution ==="
grep -RhoE "@(smoke|critical|regression|edge-case|quarantine|slow)" tests/ | sort | uniq -c
echo "=== Check 14g: bare test.skip() without skipCrossService( within 5 lines (HARD FAIL) ==="
grep -RnE "test\.skip\(" tests/ | while IFS= read -r line; do
  file="${line%%:*}"; rest="${line#*:}"; lno="${rest%%:*}"
  start=$((lno-5)); [ "$start" -lt 1 ] && start=1
  ctx=$(sed -n "${start},${lno}p" "$file" 2>/dev/null)
  echo "$ctx" | grep -qE "skipCrossService\(|not-cross-service:" || echo "VIOLATION $file:$lno"
done | grep -v ^$ || echo OK
echo "=== Check 14h: ledger AJV-validates ==="
if [ -f functional-tests/test-results/data-ledger.json ]; then
  node -e "const Ajv=require('ajv'),fs=require('fs');const a=new Ajv({allErrors:true});const s=JSON.parse(fs.readFileSync('../{docs-repo}/test-data/data-ledger.schema.json'));const d=JSON.parse(fs.readFileSync('functional-tests/test-results/data-ledger.json'));const v=a.compile(s);if(!v(d)){console.error(JSON.stringify(v.errors,null,2));process.exit(1)}console.log('OK')" || echo "FAIL: ledger AJV violations"
else echo "SKIP: data-ledger.json not present"; fi
echo "=== Check 14i: real-mode E2E completeness (G15) ==="
if [ "${TEST_MODE:-mock}" = "real" ]; then
  for f in functional-tests/tests/e2e/positive/*.spec.js functional-tests/tests/e2e/positive/**/*.spec.js; do
    [ -f "$f" ] || continue
    if grep -qE "payment|Payment|checkout|order-receipt" "$f" 2>/dev/null; then
      grep -qE "paymentPage\.(fill|submit)|PaymentPage" "$f" || echo "VIOLATION $f: payment flow without PaymentPage interaction"
    fi
  done | grep -v ^$ || echo OK
else echo "SKIP (mode=mock)"; fi
echo "=== Check 14j: positive specs start from LandingPage (G16) ==="
for f in functional-tests/tests/e2e/positive/*.spec.js functional-tests/tests/e2e/positive/**/*.spec.js; do
  [ -f "$f" ] || continue
  grep -qE "LandingPage|landingPage" "$f" || echo "VIOLATION $f: positive spec does not use LandingPage"
done | grep -v ^$ || echo OK
echo "=== Check 14j-bis: negative/edge specs navigate through UI (not deep-links) ==="
for f in tests/e2e/negative/**/*.spec.js tests/e2e/edge-case/**/*.spec.js; do
  [ -f "$f" ] || continue
  grep -qE "navigateTo|LandingPage|landingPage|customStep\(|runFlow" "$f" || echo "VIOLATION $f: negative/edge spec does not use navigation helper — must navigate through UI flow, not deep-link"
done | grep -v ^$ || echo OK
echo "=== Check 14k: non-positive specs with zero assertions (HARD FAIL) ==="
for f in tests/e2e/negative/**/*.spec.js tests/e2e/edge-case/**/*.spec.js; do
  [ -f "$f" ] || continue
  tc=$(grep -cE "^\s*(test|it)\(" "$f" 2>/dev/null || echo 0)
  ac=$(grep -cE "expect\(" "$f" 2>/dev/null || echo 0)
  [ "$tc" -eq 0 ] && continue
  [ "$ac" -lt "$tc" ] && echo "VIOLATION $f: $tc test(s), $ac assertion(s) — non-positive tests must assert error state"
done | grep -v ^$ || echo OK
echo "=== Check 14l: quarantine census (mock mode only) ==="
if [ "${TEST_MODE:-mock}" = "mock" ]; then
  TOTAL=$(find tests/e2e -name '*.spec.js' 2>/dev/null | wc -l | tr -d ' ')
  QUAR=$(grep -Rl "@quarantine" tests/e2e/ 2>/dev/null | wc -l | tr -d ' ')
  [ "$TOTAL" -gt 0 ] && PCT=$((QUAR * 100 / TOTAL)) || PCT=0
  [ "$PCT" -gt 10 ] && echo "VIOLATION: $QUAR/$TOTAL ($PCT%) quarantined — exceeds 10% cap. Derive mocks from OpenAPI (G4)." || echo OK
else echo "SKIP (mode=real)"; fi
echo "=== Flow coverage (G9a) ==="
for f in functional-tests/tests/flows/*.flow.json; do [ -f "$f" ] || continue; id=$(node -e "console.log(require('./$f').flowId)"); cnt=$(grep -RlE "flow:\s*['\"]?$id['\"]?" functional-tests/tests/e2e/ 2>/dev/null | wc -l); [ "$cnt" -eq 0 ] && echo "GAP: flow $id has 0 specs"; done | grep -v ^$ || echo OK
echo "=== Flow-runner consumption (G9a R8) ==="
for f in functional-tests/tests/e2e/positive/*.spec.js functional-tests/tests/e2e/positive/**/*.spec.js; do
  [ -f "$f" ] || continue
  grep -qE "flow:\s*['\"]" "$f" || continue
  if ! grep -qE "runFlow|flow-runner" "$f"; then
    nav=$(grep -cE "page\.(click|fill|goto|selectOption)\(" "$f")
    [ "$nav" -ge 3 ] && echo "VIOLATION: $f tagged full-flow but hand-codes $nav navigation calls without flow-runner"
  fi
done | grep -v ^$ || echo OK
EOF
```
Every line printing other than `OK` (or, for 14f, distribution) = violation; fix before execution.
