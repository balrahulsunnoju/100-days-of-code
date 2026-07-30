# Functional Test Generation — Guardrails (Non-Negotiable, Read First)

### G1 — Application-agnostic
No specific app/vendor/service/field/path names hard-coded. Everything is discovered from `*-docs*/`, the UI repo, and the catalog at runtime.

### G2 — Discover-before-generate
Ground every test in: (a) `test-data-catalog.yaml.uiScreens[]` (b) UI route definitions (c) KB business rules. If a screen referenced in catalog has no source-of-truth in the UI repo, ASK the user — do NOT generate.

### G3 — Ask-don't-assume (MANDATORY Pre-Generation Interview)
If `max_tests`, `scope`, `mode`, `categories`, or `coverage_target` is not provided as a parameter, the agent MUST present the **Pre-Generation Interview** below BEFORE any workspace scan/discovery. Do NOT skip questions or assume defaults. Runs ONCE; answers bind ALL downstream behavior.

**Pre-Generation Interview (single prompt — all 6 questions):**

1. **TEST MODE** — `(a) mock` (default; `page.route()` intercept) or `(b) real` (hits real running services).
2. **FLOW SCOPE** — `(a) all discovered`, `(b) specific flow IDs`, or `(c) diff-based since last run`.
3. **TEST CATEGORIES** — `(a) all`, `(b) positive only`, `(c) positive + negative`, or `(d) specific list`.
4. **COVERAGE TARGET** — number (default 80) — applies to flow matrix AND business-rule coverage.
5. **MAX TESTS** — number or unlimited. If capped, highest-value tests prioritized; deferred reported.
6. **CODE COVERAGE TARGET (Phase 3)** — `lines/branches/functions/statements` (default `80/70/80/80`) or `skip`. Different from Q4 (matrix coverage). See G17.

**Enforcement:** Wait for answers. If incomplete, re-prompt missing items. Parse concise replies (e.g. "real, all flows, positive only, 80%"). Emit a **Generation Plan Summary** with all 6 choices and `Proceed? (y/n or adjust):` and WAIT. On adjust, update + re-confirm. Confirmed answers are binding — do NOT deviate downstream (no mocks in real-mode run; no edge-case specs when user said positive only).

### G4 — No hallucinated mock responses or response shapes
- Mock response bodies MUST be derived from one of: (i) OpenAPI spec in KB, (ii) `support/mocks/responses/*.json` fixtures, (iii) actual recorded responses. If none exist, emit the mock with `// TODO: verify response shape` and tag the dependent test `@quarantine`.
- **Quarantine is a LAST RESORT, not a default.** Before quarantining, the generator MUST actively search ALL three sources above. In mock mode, OpenAPI specs in `knowledge-base/api/` almost always exist — derive the mock shape from them. `@quarantine` in mock mode is only legitimate when: (a) endpoint has no OpenAPI spec AND no fixture AND no recording, OR (b) the spec exists but the specific response variant (error shape, edge-case payload) is undocumented. Over-quarantine in mock mode = CI runs zero tests = audit failure (see Check 14l).
- `recordArtifact.fromJsonPath` MUST NOT default to `data.id` or any other invented envelope. If unknown, set `recordArtifact: null` and log `⚠️ unknown response shape for <endpoint> — recordArtifact deferred until a real response is inspected`. (See setup-functional-tests rule: "DO NOT assume a `data.` envelope".)

### G5 — Prerequisite check
If `{ui-repo}/functional-tests/playwright.config.js` does not exist, STOP with `❌ Run /tdgs-aidlc-setup-functional-tests first`. If `test-data-catalog.yaml` does not exist or has no `uiScreens[]`, STOP with `❌ Run /tdgs-aidlc-setup-testdata first`.

### G6 — PII handling
Never apply Faker to PII fields. The canonical PII regex is defined ONCE in `/tdgs-aidlc-generate-api-tests` Pre-flight item 3 (single source of truth) and is referenced — never duplicated — by every other prompt. Address fields (`address`, `street`, `city`, `state`, `zip`, `postalcode`, `country`) are explicitly NOT PII. PII values come from `identityPools[]` (`external-required` only). Faker is allowed only for non-PII filler (e.g. comments, descriptions, address-line filler when no pool exposes the field).

> **G6a — Real-mode email constraint.** In negative tests where email is NOT the targeted field, use the catalog's `identity-email` pool value (or the project's designated yopmail) — NEVER use synthetic placeholders like `valid@email.com`. In real mode these hit DNS/SMTP and may fail or leak data. Intentionally-malformed emails in `invalid-data-factory.js` (testing client-side regex rejection) are exempt.

### G7 — Cross-service / external dependency
If a flow step requires data only obtainable via a cross-service or external call this framework cannot make, mark the test `skipped` with `reason: cross-service-dependency: <missing-prereq>`. The user MAY supply a stub in `test-data-catalog.yaml.stubs.<key>` to un-skip.

### G8 — Pre-Write Output Contract
Before writing any spec file, emit Blocks 1–6 listing every file with path, purpose, source-of-truth references, and the catalog records that will be consumed.

### G9 — Idempotency
Do not overwrite user-edited specs. Add new specs for new screens; flag existing ones for update with a diff summary.

### G10 — Sync rule
Mirror this file between starter-kit (canonical) and `.github/prompts/`.

### G11 — Shared contracts
- **`caseType` enum (single source of truth):** `positive | negative-validation | boundary | negative-business-rule`. The flow-runner ONLY accepts these four values.
- **Test count budget:** every spec describes both positive AND negative variants per screen — minimum one of each per testable form. The framework is NOT allowed to ship positive-only.
- **Real-mode test timeout:** `60_000` ms (flat for both mock and real) — MAX CAP, not default wait. Playwright resolves on first match and continues immediately. Production APIs incl. payment are <30s worst-case; the 60s ceiling absorbs chained-flow tail latency without masking real defects (selector regressions, hung iframes, infra). DO NOT use `isReal ? 180_000 : 30_000`.
- **Failure artifacts:** `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'retain-on-failure'`. The Playwright HTML report MUST display screenshots and videos inline for failed tests; verify after each run by listing `test-results/**/*.{png,webm,zip}`.
- **Retries:** `playwright.config.js` MUST set `retries: process.env.CI ? 2 : 0` (CI retries only).
- **passRate formula (LOCKED):** `passed / (passed + failed + dataIssue + infra)`. Skipped EXCLUDED from denominator. `0.0` when denominator is 0.
- **Status enum (per-service data-ledger):** `pass | fail | skip | data-issue | infra | generation-bug | unresolved-token`. Workspace `ledger.yaml` uses camelCase: `passed | failed | skipped | dataIssue | infra`. Dashboard maps between them.

### G12 — Mandatory variant/workflow coverage (HARD GATE — read FIRST)
> This is the MOST IMPORTANT guardrail. Generation MUST cover ALL discovered workflow variants — not just one type.

- **ALL dropdown/select/radio values MUST be exercised.** If a form has a "Certificate Type" dropdown with values `[birth, death, divorce, stillbirth]`, the generator MUST produce at least one positive test PER value — not just birth.
- **ALL record types in a polymorphic flow MUST have dedicated test paths.** If the KB or code shows a flow handles multiple document/record/transaction types, EVERY type gets its own positive spec.
- **If Phase 0a-bis proposes variant axes and the user accepts them, the expanded matrix IS the coverage contract.** A flow with 4 variant values × 4 case-types = 16 minimum cells.
- **Enforcement:** After generation, count unique variant values covered per flow. If ANY accepted variant value has zero specs, emit `❌ VARIANT COVERAGE GAP: flow={flowId} variant={value} has 0 specs` and HALT.
- **This guardrail exists because the generator's documented failure mode is "generate tests for only one record type (e.g., birth certificate) and silently skip all others (death, divorce)."** That failure mode is now a HARD STOP.

### G13 — DB transaction capture for real-mode (MCP SQL Developer integration)
> When tests run in `real` mode, every write-endpoint response MUST be captured into `dbRecordsCreated[]` with plain-text field values — no masking, no hashing. These values feed the dashboard's DB Transactions section, which QA uses with SQL Developer MCP to verify database state.

- **Capture ALL write-endpoint responses** — POST, PUT, PATCH, DELETE — regardless of HTTP status (2xx, 4xx, 5xx).
- **Extract business identifiers** from response bodies using catalog `apiChain[].capture[].field` first, then regex fallback for ID-shaped fields.
- **Never leave `key`/`value` empty** — if nothing extractable, omit the entry entirely.
- **Plain text only** — values are test environment data (gitignored), used for `SELECT * FROM table WHERE field = 'value'` queries.
- **Output:** `db-transactions.json` alongside `dashboard.html` for MCP tool consumption.

### G14 — Reports sync guardrail (single source of truth for all formats)
> Every report script MUST build ONE in-memory results object, then render ALL formats (.json, .md, .html) from that SAME object in ONE pass. Never re-read source data between format renders. After writing: assert `json.total === md.total === html.total`.

### G15 — Real-mode means ZERO mocks and REAL UI interaction at every step (HARD GATE)
> **Root cause:** In real mode the generator still emitted `setupDefaultApiMocks()` and skipped real form interaction on intermediate/late pages (payment, review, confirmation) — "passing" a payment page by asserting a container without filling the form. #1 user-reported failure mode.

**When user selects `real` mode (or `TEST_MODE=real`):**

1. **NO `page.route()` interception in positive specs.** No `setupDefaultApiMocks()`, no `beforeEach` mock blocks, no response overrides. Helper may remain imported (Check 8) — it early-returns in real mode.
2. **EVERY page in the flow MUST have real UI interaction:** fill every required field + click submit (no "assert container visible then wait for redirect"); iframes use `page.frameLocator()`; if submit-enable depends on async API (e.g. GetCheckout returns iframe URL), wait for enabled state before clicking.
3. **Page objects MUST exist for EVERY page** — including payment and receipt. Forbidden failure pattern: LandingPage✅, GetStartedPage✅, IdentityPage✅, RecordInfoPage✅, OrderReviewPage✅, ShippingPage✅, **PaymentPage❌, ReceiptPage❌**. Read component source for selectors/submit text.
4. **Payment fields come from `payment-card` catalog pool** (or equivalent whose `usedIn` includes payment/checkout). Use `catalogRecord('payment-card')` — never faker, never hardcoded.
5. **Receipt assertions** verify container AND ≥1 business-meaningful element (heading, remittance number label, transaction date, download link). Container-only assertion is insufficient.
6. **Enforcement (Check 14i):** every positive spec navigates through ALL screens entry→terminal. Intermediate page with only visibility assertion + `waitForURL` = HARD ERROR (will hang in real mode).

### G16 — Every positive spec starts from the application entry point (landing page)
> **Root cause this fixes:** Specs that start mid-flow (e.g., `orderStatusPage.navigate()` without going through the landing page first) are not true E2E tests. They bypass the natural user journey and may miss navigation bugs, auth redirects, or session initialization that only happens on the landing page.

- Every positive-flow spec MUST begin with `LandingPage.navigate()` followed by a user action (click "Get Started", click "Check Order Status", etc.) that routes to the first flow-specific page.
- The ONLY exception is smoke specs explicitly tagged `@smoke` that are designed for quick health-check validation of a single page.
- **Enforcement:** Grep every `tests/e2e/positive/*.spec.js` for `LandingPage`. If ANY positive spec does NOT import and use `LandingPage`, it is a HARD ERROR.

### G17 — Code coverage instrumentation (Phase 3, post-matrix)
> **Root cause:** Matrix coverage (G11/Q4) proves journeys exercised, NOT source-code lines/branches reached. Standard ISTQB / ISO/IEC/IEEE 29119 layering: behavioral first, code coverage second.

- Phase 3 runs AFTER flow×variant×caseType matrix is green (G12). Final gate before suite-complete.
- **V8 coverage** (Playwright `page.coverage.startJSCoverage()` / `stopJSCoverage()`) — works against unmodified bundle, source-map-aware. Do NOT modify webpack/babel.
- Convert V8 → Istanbul via `monocart-reporter` (preferred — single reporter, handles filtering + remapping). Fallback: `v8-to-istanbul` + `nyc report`.
- Config lives in `playwright.config.js` reporters array; writes HTML + json-summary to `functional-tests/test-results/coverage/`.
- **Filters (mandatory):** include `src/**`; exclude `node_modules/**`, `**/*.test.{js,jsx,ts,tsx}`, `**/__mocks__/**`, generated files, vendor bundles.
- **Gate (Q6 default locked):** lines≥80, branches≥70, functions≥80, statements≥80. Threshold fail → exit non-zero. Q6=`skip` → omit Phase 3 entirely.
- **Dashboard:** `json-summary` read by cross-app dashboard refresh, rendered as `codeCoverage: { lines, branches, functions, statements }` block per app, visually distinct from matrix-coverage block.
- **Enforcement:** after Phase 3, `coverage-summary.json` MUST exist (unless Q6=`skip`); parse and verify thresholds — fail = HARD ERROR.

### G18 — Mandatory category folder population (HARD GATE)
> **Root cause this fixes:** A previous run shipped 730 specs in `tests/e2e/positive/flows/` while leaving `tests/e2e/negative/` completely empty and `tests/e2e/edge-case/` with only 3 cross-cutting specs. The `caseType` axis (positive | negative-validation | boundary | negative-business-rule) was used as a TAG on positive specs instead of a directive to write distinct invalid-input flows. Tag without distinct invalid-input flow ≠ negative test. This violates G11 ("framework is NOT allowed to ship positive-only").

A negative or edge-case spec is one that:
1. SUBMITS invalid / boundary / hostile data (different from positive payload), AND
2. ASSERTS the error UI (validation message, banner, blocked submit), AND
3. ASSERTS the form did NOT advance / no record created.

Same payload + different tag does NOT satisfy this.

**Required folder structure (post-generation):**

```
tests/e2e/
├── positive/
│   └── flows/                       — happy-path E2E per workflow
├── negative/
│   ├── forms/                       — field-validation per testable form (one spec per form)
│   └── business-rules/              — rule rejection scenarios (declined card, duplicate, age limits)
└── edge-case/                       — cross-cutting (XSS/SQLi, i18n parity, deep-link, network failure, a11y)
```

**Minimum count per workflow (HARD GATE):**
- ≥ 1 positive spec (happy path) in the default locale
- ≥ 1 positive full-flow spec **per non-default locale** if the app defines parallel localized route trees (e.g., EN `/order-birth-certificate` + ES `/solicitar-certificado-de-nacimiento`). Route parity in `edge-case/` (reachability only) does NOT satisfy this — the localized positive must execute an end-to-end order submission in that locale. One representative workflow per locale is sufficient (typically the most-trafficked product flow).
- ≥ 1 negative-validation spec PER testable form discovered in the workflow
- ≥ 1 negative-business-rule spec per known rejectable rule (discovered from KB business rules + service-impl `if/throw` branches)
- ≥ 3 edge-case specs covering at minimum: (a) XSS or SQLi injection, (b) i18n parity (Spanish locale — route reachability + ≥1 translated-text assertion), (c) deep-link / auth-bypass attempt

**Bypass:** if Q3 = "Positive only" (option b), G18 is bypassed but MUST be logged as `documented exception: user requested positive only`.

**Mechanical enforcement (Phase 0a + post-generation Check 14j):**

```bash
# Phase 0a — fail fast if categories not in plan
echo "$CATEGORIES" | grep -qE 'negative|all' || [ "$Q3_BYPASS" = "true" ] || \
  { echo "❌ G18: categories include neither negative nor all"; exit 1; }

# Post-generation Check 14j
NEG_COUNT=$(find tests/e2e/negative -name '*.spec.js' 2>/dev/null | wc -l)
EDGE_COUNT=$(find tests/e2e/edge-case -name '*.spec.js' 2>/dev/null | wc -l)
[ "$Q3_BYPASS" = "true" ] && exit 0
[ "$NEG_COUNT" -ge 1 ] || { echo "❌ G18: tests/e2e/negative/ is empty"; exit 1; }
[ "$EDGE_COUNT" -ge 3 ] || { echo "❌ G18: tests/e2e/edge-case/ has only $EDGE_COUNT spec(s), need ≥3"; exit 1; }

# Check 14k — locale-parity positive flow: if app source declares non-default localized routes,
# require ≥1 positive flow spec exercising each non-default locale end-to-end. Match any reference
# to a localized route fragment (string literal, constant, template), not only inline `goto(` calls.
LOCALIZED_ROUTES=$(grep -oE 'Route path="/[^"]*/(es|fr|de|ja|zh)/[^"]+' {ui-repo}/src/App.js 2>/dev/null | grep -oE '/(es|fr|de|ja|zh)/[a-zà-ü-]+' | sort -u)
for ROUTE_FRAG in $LOCALIZED_ROUTES; do
  LOCALE=$(echo "$ROUTE_FRAG" | grep -oE '/(es|fr|de|ja|zh)/' | tr -d '/')
  FOUND=$(grep -lr "$ROUTE_FRAG" tests/e2e/positive/ 2>/dev/null | wc -l)
  [ "$FOUND" -ge 1 ] && { LOCALE_OK_$LOCALE=1; continue; }
done
for LOCALE in $(echo "$LOCALIZED_ROUTES" | grep -oE '/(es|fr|de|ja|zh)/' | tr -d '/' | sort -u); do
  COVERED=$(grep -lrE "/ovra/$LOCALE/|/$LOCALE/order|solicitar|carta-de" tests/e2e/positive/ 2>/dev/null | wc -l)
  [ "$COVERED" -ge 1 ] || { echo "❌ G18 locale-parity: no positive flow spec exercises locale '$LOCALE' end-to-end (route-parity reachability in edge-case/ is insufficient)"; exit 1; }
done

# Check 14l — generated-spec REQUIRE-PATH validation (HARD GATE).
# Catches the entire-suite-broken failure mode where specs reference modules via a
# path that doesn't resolve (e.g., '../../support/' from a depth-3 spec resolves to
# tests/e2e/<cat>/support which does not exist). Symptom: `npx playwright test --list`
# returns "Total: 0 tests in 0 files". The fix is to compute relative paths from each
# spec's own depth (see setup-functional-tests fixture-import note).
LIST_OUT=$(cd {ui-repo} && npx playwright test --list 2>&1)
TOTAL_LINE=$(echo "$LIST_OUT" | tail -1)
echo "$TOTAL_LINE" | grep -qE 'Total: [1-9][0-9]* tests in [1-9]' || {
  echo "❌ G18 require-path: Playwright test discovery returned: $TOTAL_LINE"
  echo "   This usually means generated specs use a require() path that doesn't resolve."
  echo "   From tests/e2e/<cat>/<spec>.js use '../../../support/...'; from"
  echo "   tests/e2e/<cat>/<subcat>/<spec>.js use '../../../../support/...'."
  echo "   Sample errors:"; echo "$LIST_OUT" | grep -E 'Cannot find module|ENOENT' | head -5
  exit 1
}
```

**Reporting:** the Pre-Write Output Contract (G8 Block 6) MUST list spec files grouped by `positive/` (with per-locale subtotals when localized routes exist), `negative/forms/`, `negative/business-rules/`, `edge-case/` with counts. A run that emits Block 6 with `negative/forms/: 0`, or with `positive/{non-default-locale}: 0` while the app declares localized routes, is incomplete by definition — STOP and generate the missing specs before writing any file.
