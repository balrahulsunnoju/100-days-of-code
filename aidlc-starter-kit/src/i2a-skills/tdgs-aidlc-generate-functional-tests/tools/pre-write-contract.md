# Pre-Write Output Contract (MANDATORY — HARD STOP — emit BEFORE writing any spec file)

> ⚠️ Functional analogue of `/tdgs-aidlc-generate-api-tests` Pre-Write Output Contract. Makes agent reasoning visible BEFORE any `create_file`. Without it, generated specs miss screens, hardcode identity values, or deep-link past auth gates — bugs only surface after full Playwright run. Agent MUST emit ALL six blocks below in chat with concrete (non-placeholder) values BEFORE first spec write. Any block missing/TBD/placeholder → **STOP**, redo discovery.

## Block F1 — Screen Coverage Inventory

ONE row per `uiScreens[]` entry that gets tests:

```
═══════════════════════════════════════════════════════════════
SCREEN COVERAGE INVENTORY — {ui-repo}
═══════════════════════════════════════════════════════════════
  Screen                 | Route               | Auth-Gated? | Catalog Identity Pool | Spec File To Write
  ─────────────────────  | ───────────────────  | ─────────── | ─────────────────────  | ─────────────────────────
  {Login}                | /login              | No          | login-user             | tests/e2e/positive/login.spec.js
  {Dashboard}            | /dashboard          | YES         | login-user             | tests/e2e/positive/dashboard.spec.js
  {RecordList}           | /records            | YES         | login-user, {pool}     | tests/e2e/positive/record-list.spec.js
  {SubmitForm}           | /submit             | YES         | login-user, payment    | tests/e2e/positive/submit-form.spec.js
═══════════════════════════════════════════════════════════════
```

Every screen in `uiScreens[]` MUST appear. Intentional skips (e.g., admin-only without test creds) listed with `Spec File To Write: SKIP — reason`.

## Block F2 — Identity Resolution Plan

ONE table per `{{catalog.identityPool.*}}` token appearing in any spec:

```
═══════════════════════════════════════════════════════════════
IDENTITY RESOLUTION PLAN — {ui-repo}
═══════════════════════════════════════════════════════════════
  Spec / Fixture                | Pool                 | Field            | Resolution Point
  ───────────────────────────── | ────────────────────  | ──────────────── | ─────────────────────────
  login.spec.js / loginFixture  | login-user           | username, pwd    | beforeAll (per worker)
  checkout.spec.js              | payment-card         | number, cvv      | beforeEach (per test)
═══════════════════════════════════════════════════════════════
```

Hardcoded identity values = HARD FAILURE — every entry resolves via catalog at fixture-load time.

## Block F3 — Auth-Gate & Deep-Link Compliance

For every `Auth-Gated? YES` row in F1, declare nav strategy:

```
═══════════════════════════════════════════════════════════════
AUTH-GATE & DEEP-LINK COMPLIANCE — {ui-repo}
═══════════════════════════════════════════════════════════════
  Spec                       | Target Route   | Navigation Strategy
  ─────────────────────────  | ─────────────  | ──────────────────────────────────────────────
  dashboard.spec.js          | /dashboard     | Login flow → click navbar "Dashboard" link
  order-history.spec.js      | /orders        | Login flow → click "My Orders" → wait for table
  checkout.spec.js           | /checkout      | Login → add item to cart → click "Checkout" CTA
═══════════════════════════════════════════════════════════════
```

ANY entry using `page.goto('/<gated-route>')` to bypass auth/nav = HARD FAILURE (Check 14a). Replace with user-flow strategy.

## Block F4 — Flow Coverage Matrix (G9a HARD GATE)

> One row per `(flow × case-type × persona)` from **Phase 0a-bis EXPANDED** Flow Inventory × case-types × personas. "Flow" = logical flow AFTER variant expansion — each Cartesian tuple is a distinct row. Every logical flow needs ≥1 positive spec PER persona walking FULL `executionSteps[]` end-to-end (`{{variant.*}}` tokens resolved) — NOT per-screen isolation. Coverage = `non-empty cells / (expanded_flows × case-types × personas)`. Target ≥ user's `coverage_target` (G3 interview). Below target = HARD FAILURE, STOP.
>
> **Categories filter (interview Q3):** "Positive only" → only `positive` column. "Positive + Negative" → `positive` + `negative-business-rule` + `negative-validation`. "All" → all 4 case-types. Coverage % computed ONLY against selected categories — excluded columns omitted from both numerator and denominator.

**Persona enumeration (MANDATORY — no hard-coded list; R10-B8 LOCKED):** discover at runtime using EXACTLY this rule:

  ```
  personas = (
    catalog.identityPools
      .filter(p => (p.poolType ?? p.type ?? '').startsWith('identity-'))
      .map(p => (p.poolType ?? p.type).replace(/^identity-/, ''))
      .filter((v, i, a) => a.indexOf(v) === i)
  ).concat(
    flows.flatMap(f => Array.isArray(f.personas) ? f.personas : [])
  ).filter((v, i, a) => a.indexOf(v) === i);
  if (personas.length === 0) personas = ['default'];
  ```

  **Why:** non-identity pools (`payment-card`, `recipient-email`, `login-user`, `addresses`) are persona-agnostic data — naive prefix extraction would explode the matrix denominator with meaningless cells. Per-flow `flowDescriptor.personas[]` overrides unioned in. Single-persona apps (no `identity-*` pools) collapse to `['default']`. Print derived persona list verbatim before rendering matrix.

**Case-type enumeration:** fixed = `['positive', 'negative-validation', 'boundary', 'negative-business-rule']` (G11 contract). Backend-only flows (Phase 0a source 5) drop `negative-validation`. Flows with `"skipCases": ["<case>"]` drop listed cases with reason recorded.

**Priority fill order (MANDATORY when `coverage_target < 100` — workflows-first):**

> `coverage_target = 80` does NOT mean "fill 80% anywhere." It means "fill strict priority tiers below until threshold met." 20% gap MUST land on lower-priority tiers, never on workflow positives/negatives. Agent MUST exhaust tier N entirely before tier N+1:

  - **Tier 1 — Positive × every flow × every persona** (zero-positive = HARD FAILURE).
  - **Tier 2 — Negative-Business-Rule × every flow × every persona** (every workflow needs ≥1 failure-path spec per persona before any boundary/validation).
  - **Tier 3 — Boundary × every flow × every persona** (min/max/edge on primary form fields).
  - **Tier 4 — Negative-Validation × every flow × every persona** (field-level format/required-field; lowest priority).

  **Priority-inversion HARD FAILURE:** any tier-N cell empty while any tier-(N+1) cell filled (same flow set) → halt with `❌ PRIORITY INVERSION` block listing offending pairs.

  **Permitted within-tier skips:** flow may declare `"skipCases": ["<case>"]` or `"deferred": [...]` to exempt a cell (removed from denominator with recorded reason). Silent omission forbidden.

```
═══════════════════════════════════════════════════════════════
FLOW COVERAGE MATRIX — {ui-repo}
Dimensions: {F} flows × {C} case-types × {P} personas = {F*C*P} cells. Target ≥ 80%.
═══════════════════════════════════════════════════════════════
  Flow ID            | Persona      | Positive | Negative-Validation | Boundary | Negative-Business-Rule | Status
  ────────────────── | ──────────── | ──────── | ──────── | ──────── | ──────────────── | ───────
  {flow-id-A}        | {persona-1}  | ✅       | ✅       | ✅       | ✅                | 🟢
  {flow-id-A}        | {persona-2}  | ✅       | ❌       | ❌       | ❌                | 🟡
  {flow-id-B}        | {persona-1}  | ✅       | ✅       | ❌       | ✅                | 🟡
  {flow-id-C}        | {persona-1}  | ❌       | ❌       | ❌       | ❌                | 🔴 GAP
═══════════════════════════════════════════════════════════════
Covered cells: {covered}/{total} = {pct}%.   Threshold: 80%.   Verdict: {PASS | FAIL}.

Per-tier fill rates (MANDATORY when coverage_target < 100):
  Tier 1 Positive               : {t1_filled}/{t1_total} = {t1_pct}%   {✅ complete | ❌ INCOMPLETE — blocks tiers 2-4}
  Tier 2 Negative-Business-Rule : {t2_filled}/{t2_total} = {t2_pct}%   {✅ complete | ⚠️ partial | ❌ INCOMPLETE — blocks tiers 3-4}
  Tier 3 Boundary               : {t3_filled}/{t3_total} = {t3_pct}%   {✅ complete | ⚠️ partial | ⏭️ deferred until tier 2 = 100%}
  Tier 4 Negative-Validation    : {t4_filled}/{t4_total} = {t4_pct}%   {✅ complete | ⚠️ partial | ⏭️ deferred until tier 3 = 100%}

Deferred-by-priority cells (within the {100 - coverage_target}% gap budget):
  - flow=<id>  persona=<p>  case=<c>   reason=priority-cap  (tier <N>, deferred because coverage_target={target}% met at tier <M>)
  - ...
```

**Hard-fail report (MANDATORY when coverage <80% OR any flow×persona has 0 positive specs OR priority-inversion detected):**
```
❌ FLOW COVERAGE GAP REPORT — generation HALTED
   Total cells: {F × C × P} = {N}    Covered: {covered} ({pct}%)    Threshold: 80% → FAIL by {gap}%

   Missing cells (one line per uncovered combination):
     - flow=<id> persona=<p> case=<c> reason=<missing|wizard-helper-only|descriptor-deferred|priority-cap>

   Flows with ZERO positive specs across ALL personas:
     - <flow-id> (entry: <route>, steps: <count>, source: <descriptor|kb|route-graph|backend>)

   Priority-inversion violations (tier-N empty while tier-(N+1) filled):
     - empty: flow=<id-X> persona=<p> case=negative | filled-instead: flow=<id-Y> persona=<p> case=boundary
     (Non-empty → regenerate: remove lower-tier cells, add missing higher-tier, re-evaluate.)

   Unblock options:
     (a) author one positive spec per missing cell at tests/e2e/<case>/flows/<flow-id>.<persona>.spec.js
     (b) mark deferred in flow descriptor: "deferred": [{persona, case, reason, trackingIssue}] — renders 🟡, covered-with-defer
     (c) reduce persona/case set via descriptor's "skipCases"/"skipPersonas" arrays (with recorded reason; silent omission forbidden)

   `ledger.yaml.runs[].perFlowRollup[]` and per-service `test-report.md` flow rollup both read this matrix.
```

**Per-form-component negative coverage (MANDATORY — supplements flow×case-type matrix):**

The flow coverage matrix ensures each WORKFLOW has negative specs. Additionally, each DISTINCT testable form component discovered in Discovery Block F1 MUST have ≥1 negative spec exercising its validation rules. Shared forms (identity-verification, shipping, payment) count once regardless of how many flows use them. Record-type-specific forms (one per record type) each get their own negative spec. Count check:
```bash
FORM_COUNT=$(echo "<discovered-form-components>" | wc -w)   # from Block F1 screen inventory
NEG_COUNT=$(find tests/e2e/negative -name '*.spec.js' | wc -l)
[ "$NEG_COUNT" -lt "$FORM_COUNT" ] && echo "❌ HARD FAILURE: $NEG_COUNT negative specs < $FORM_COUNT distinct form components. Each testable form needs ≥1 negative spec."
```
This prevents the failure mode where 2 negative specs satisfy `NEG_COUNT >= 1` globally while 10+ form components remain uncovered.

## Block F5 — Real-Mode Artifact Mandate (Katalon-Parity Proof)

> Under `TEST_MODE=real`, framework's `dbRecordsCreated[]` ledger is the ONLY auditable trail proving a real downstream transaction happened. Populated EXCLUSIVELY by `recordArtifact` on `wait-api` steps in flow descriptors. **Missing `recordArtifact` on write endpoints → real-mode passes green but zero proof — dashboard's Real-Mode Artifacts table empty, parity claim against legacy tool fails.**

**Hard rule (every flow descriptor):** every `wait-api` step whose `apiPattern` matches a write endpoint (`POST`/`PUT`/`PATCH`/`DELETE` per discovered OpenAPI/project-context) MUST include `step.recordArtifact = { key: "<businessId>", fromJsonPath: "<dot.path.in.response>" }`. `key` = stable business identifier from this workspace's actual DTO field names — do NOT invent or import from other apps. `fromJsonPath` MUST resolve to a field the real backend returns (validate against OpenAPI before emitting). **Unknown response shape → `recordArtifact: null`, log `⚠️ unknown response shape for <endpoint> — recordArtifact deferred`, tag dependent test `@quarantine`.** Do NOT fall back to `data.id` or invented envelope (G4; setup rule: "DO NOT assume a `data.` envelope").

**`GET` endpoints** SHOULD NOT have `recordArtifact`. Exception: discovered receipt/document GET returning auditable URL/document-ref — use actual discovered field name; never hard-code unverified.

**Wizard `executionSteps[]` ordering rule (MANDATORY — discovered from UI walk, NOT inferred from screen names).** Step ordering bugs are silent failures: tests run, hit timeout on the wrong button selector, fail with `locator(...) not found`. Author the step array by walking the actual UI step transitions in source — for each step boundary capture (a) the form-submit selector, (b) the `wait-api` for the persistence call, (c) any intermediate review/confirmation click. Common pitfalls:
- An intermediate "review" screen between two data-entry steps requires its OWN click step; do NOT collapse it into the prior step's submit.
- Each form's submit button has a DISTINCT selector (e.g., one screen's `next-button`, another's `next-button-shipping-Info`, an intermediate review's `next-button-order` — discover the actual class names from the UI source). Authoring the wrong selector at the wrong position produces a 30s timeout that masquerades as a real-mode network failure.
- The order MUST mirror the UI's actual step-state transitions (read `useState`/`switch(step)`/router calls in source) — NOT the order of routes in the URL bar.

**Optional artifact-capture `wait-api` short-timeout rule (MANDATORY).** When a `wait-api` step is `optional: true` and exists ONLY to harvest `recordArtifact` for the audit ledger (i.e., the test does NOT functionally depend on the response), set `timeoutMs: 500` (NOT 5000+). Rationale: `page.waitForResponse` only catches responses fired AFTER subscription. If the response already arrived (typical for in-flight calls between custom-step end and wait-api start), Playwright waits the FULL timeout then skips. With 11+ optional wait-apis × 5000ms each = 55s blown on a 30s test budget. 11 × 500ms = 5.5s acceptable. Required wait-apis (where the test asserts on response) keep their normal timeout.

**F5 emission contract:** before `create_file` on any `*.flow.json`, emit:
```
═══════════════════════════════════════════════════════════════
REAL-MODE ARTIFACT PLAN — {ui-repo}
One row per (flow × wait-api step on write endpoint).
═══════════════════════════════════════════════════════════════
  Flow ID         | Step idx | Method | apiPattern              | recordArtifact.key | fromJsonPath
  ─────────────── | ──────── | ────── | ──────────────────────── | ────────────────── | ────────────
  <flow-id>       | 12       | POST   | <write-endpoint-1>       | <discoveredKey-1>  | <discovered.path-1>
  <flow-id>       | 14       | POST   | <write-endpoint-2>       | <discoveredKey-2>  | <discovered.path-2>
  <flow-id>       | 16       | POST   | <write-endpoint-3>       | <discoveredKey-3>  | <discovered.path-3>
═══════════════════════════════════════════════════════════════
Total write endpoints: {N}.   Covered with recordArtifact: {C}/{N}.   Verdict: {PASS=100% | FAIL}.
```
A row missing `recordArtifact` on a write endpoint = HARD FAILURE — STOP, fix descriptor, re-emit F5. Mock-mode runs unaffected (runner suppresses recordArtifact when `TEST_MODE !== 'real'`); gated at generation because the descriptor is the durable contract.

## Block F6 — File Write Plan (HARD GATE — emit BEFORE any `create_file` call)

> Makes every spec/PO/factory/flow-descriptor file VISIBLE in chat BEFORE writing. Without F6: silent scope drop (8 of 23 specs from F4), out-of-allowed-path writes, or duplicating user-edited specs (G9). Functional analogue of API generator's Pre-Write Output Contract §7.

Emit one table (HALT until user confirms or auto-proceed unattended):

```
═══════════════════════════════════════════════════════════════
FILE WRITE PLAN — {ui-repo}/functional-tests/
One row per file the agent will create or modify in this run.
═══════════════════════════════════════════════════════════════
  #  Action  Path (relative to ui-repo)                                       Origin                            Allowed?
  ─  ──────  ────────────────────────────────────────────────────────────────  ───────────────────────────────  ────────
  1  CREATE  functional-tests/tests/flows/<flowId-1>.flow.json                  Block F4 row 1                    ✅
  2  CREATE  functional-tests/tests/e2e/positive/<flowId-1>.full.positive.spec.js  Block F4 row 1 + Block F5 row 1  ✅
  3  CREATE  functional-tests/tests/e2e/negative/<screen>.negative.spec.js      Block F1 screen N                  ✅
  4  MODIFY  functional-tests/support/factories/<pool>.factory.js               Block F2 pool wiring               ✅
  5  SKIP    functional-tests/tests/e2e/positive/<existing>.spec.js             G9 — user-edited, diff in chat     ⏭️
═══════════════════════════════════════════════════════════════
Total CREATE: {C}.   MODIFY: {M}.   SKIP (idempotency): {S}.
Forbidden-path violations: {must be 0 — see Pre-flight Scope Boundary}.
Cross-check vs Block F4: {C+M} matches the F4 row count of {N}? {✅ | ❌ — STOP, reconcile}.
```

Hard-rule preconditions (any violation = STOP, fix, re-emit F6):
1. Path starts with `functional-tests/`, `playwright.config.js`, `package.json` (devDeps + `test:e2e:*` scripts only), or `functional-tests/README.md` — anything else = Pre-flight Scope Boundary violation.
2. CREATE rows MUST NOT collide with existing file (use `file_search`); collisions become MODIFY with diff summary.
3. MODIFY rows list user-visible delta (added test names, modified factory exports).
4. SKIP rows cite G9 + show existing file's first 5 test titles so reviewer confirms it really is same spec.
5. CREATE+MODIFY count MUST equal F4 row count. Mismatch = F4 dropped rows silently OR F6 invented files — HARD STOP.

## Hard Rule

> Agent MUST NOT call `create_file` against any `tests/e2e/**/*.spec.js`, `tests/flows/**/*.flow.json`, or `support/**/*.js` until Blocks F1–F6 have been emitted in chat with concrete data. Skipping = documented root cause of "spec passes locally, fails in CI because deep-link bypassed gating" AND "120 tests generated but every payment/receipt screen uncovered" AND "real-mode runs produce no auditable proof" AND "8 specs written when 23 promised".
