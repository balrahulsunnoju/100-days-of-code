# Component Detection + Flow Runner

## Step 7 — Detect Custom Component Libraries and Create Interaction Helpers

> ⚠️ **CRITICAL**: Many UI frameworks use custom component libraries that do NOT render native HTML elements. Playwright's built-in methods (`.selectOption()`, `.fill()`, `.check()`) **will fail silently or throw errors** against these. This step MUST detect them and create appropriate helpers.

Scan the UI repo's `package.json` dependencies AND source files (`src/**/*.{js,jsx,ts,tsx}`) for custom component libraries. For each detected library, create a dedicated interaction helper in `{ui-repo}/functional-tests/support/helpers/`.

---

## 7a — Custom Select/Dropdown Detection

**Scan for:** `react-select`, `@headlessui/react` (Listbox/Combobox), `@mui/material` (Select/Autocomplete), `antd` (Select), `downshift`, `@radix-ui/react-select`, `ng-select`, `vue-select`, or any `<Controller as={Select}>` / `<Controller render={...Select...}>` pattern in form components.

**If `react-select` is detected** (in `package.json` OR imported in source files):

1. Create `{ui-repo}/functional-tests/support/helpers/react-select-helper.js` with the **production 4-strategy + Enter-commit + verify pattern** (NOT a basic click-option stub — react-hook-form `<Controller>` only commits via Enter, and clicking the option element silently no-ops on some react-select v3+ builds):

   ```js
   async function selectReactSelectOption(page, fieldNameOrId, optionText) {
     // 1) Locate control wrapper — try 4 strategies (id/name × parent/ancestor)
     const byIdParent     = page.locator(`[id="${fieldNameOrId}"]`).locator('..').locator('[class*="control"]').first();
     const byNameParent   = page.locator(`[name="${fieldNameOrId}"]`).locator('..').locator('[class*="control"]').first();
     const byIdAncestor   = page.locator(`[id="${fieldNameOrId}"]`).locator(`xpath=ancestor::div[contains(@class,'control')][1]`).first();
     const byNameAncestor = page.locator(`[name="${fieldNameOrId}"]`).locator(`xpath=ancestor::div[contains(@class,'control')][1]`).first();
     let target = null;
     for (const cand of [byIdParent, byNameParent, byIdAncestor, byNameAncestor]) {
       if ((await cand.count()) > 0) { target = cand; break; }
     }
     if (!target) throw new Error(`react-select control not found for: ${fieldNameOrId}`);
     // 2) Open menu, type filter, press Enter (Controller-safe commit)
     await target.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
     await target.click({ timeout: 5000 });
     const menu = page.locator(`[class*="menu"][class*="MenuList"], [class*="-menu"]`).first();
     try { await menu.waitFor({ state: 'visible', timeout: 1500 }); }
     catch { await target.click({ force: true }); await menu.waitFor({ state: 'visible', timeout: 2000 }); }
     await page.keyboard.type(optionText, { delay: 20 });
     await page.keyboard.press('Enter');  // ← commits via Controller's onChange. Do NOT click the option element.
     // 3) VERIFY commit by reading singleValue/value-container; throw loudly if still placeholder
     const valueText = await target.locator(`[class*="singleValue"], [class*="value-container"]`).first().innerText({ timeout: 2000 }).catch(() => '');
     if (!valueText || /^Select\.{0,3}\s*$/i.test(valueText.trim())) {
       // Fallback ONLY if Enter didn't commit: explicit option click + re-verify
       const option = page.locator(`[class*="option"]`, { hasText: optionText }).first();
       if (await option.count()) await option.click({ timeout: 2000 }).catch(() => {});
       const v2 = await target.locator(`[class*="singleValue"], [class*="value-container"]`).first().innerText({ timeout: 2000 }).catch(() => '');
       if (!v2 || /^Select\.{0,3}\s*$/i.test(v2.trim())) {
         throw new Error(`react-select "${fieldNameOrId}": "${optionText}" did not commit (value-container="${v2}")`);
       }
     }
   }
   ```

   **Why each rule exists:** (a) 4 locator strategies — react-select wraps inputs differently across v3/v4/v5; the wrong-strategy fallback was silent before. (b) Enter-key commit — `<Controller as={Select}>` only fires `onChange` on Enter or onBlur, NOT on option-click in some builds. (c) Verify singleValue text — silent fail (option clicked but value not committed) was the #1 source of "form filled but next-button disabled" timeouts.

2. **Update every page object** that has a dropdown field to use `selectReactSelectOption()` instead of `.selectOption()`. The page object methods should accept a display label (not a raw value) since react-select matches by visible text.

**If another select library is detected**, create an equivalent helper following the same pattern — click container, type/filter, click option.

**If ONLY native `<select>` elements are used** (no custom select library found), skip this helper.

---

## 7b — Custom Date Picker Detection

**Scan for:** `react-datepicker`, `@mui/x-date-pickers`, `antd` (DatePicker), `flatpickr`, `pikaday`, `vue-datepicker`, or any `ReactDatePicker` / `DatePicker` imports in source files.

**Also scan for input masks:** `react-maskedinput`, `react-input-mask`, `imask`, `inputmask`, `cleave.js`, or any `MaskedInput` / `InputMask` imports.

**If `react-datepicker` + `react-maskedinput` are detected** (common combo):

1. Create `{ui-repo}/functional-tests/support/helpers/date-picker-helper.js` with:
   ```js
   /**
    * Interact with ReactDatePicker + MaskedInput in Playwright.
    * MaskedInput uses character-by-character input with a mask pattern.
    * Playwright's .fill() may not work — use .pressSequentially() for masked inputs.
    */
   async function fillDatePicker(page, fieldId, dateString) {
     // dateString should match the mask format, e.g., "01/15/1990" for mask "11/11/1111"
     const input = page.locator(`#${fieldId}`);
     await input.click();
     // Triple-click to select all existing text
     await input.click({ clickCount: 3 });
     // Type date character by character (required for masked inputs)
     await input.pressSequentially(dateString, { delay: 50 });
     // Press Tab or click outside to close the date picker popup and trigger validation
     await page.keyboard.press('Tab');
   }

   async function clearDatePicker(page, fieldId) {
     const input = page.locator(`#${fieldId}`);
     await input.click({ clickCount: 3 });
     await page.keyboard.press('Backspace');
   }

   module.exports = { fillDatePicker, clearDatePicker };
   ```

**If another date picker is detected**, create an equivalent helper following the component's interaction pattern.

**If only native `<input type="date">` is used**, skip this helper.

---

## 7c — Multi-Step Wizard / Stepper Detection

**Scan for:** Components that render multiple steps within a single route — look for stepper/wizard patterns:
- State variables like `activeStep`, `currentStep`, `step`, `value` (tab index)
- Components with `{step === 0 && ...}`, `{value === 1 && ...}`, or `switch(step)` rendering
- Material UI `<Stepper>`, `<TabPanel>`, or custom step indicators
- Route components that wrap multi-step flow containers (any component receiving a step index prop)
- **Route-based step patterns** — multiple routes rendering the SAME component with different prop values or query params to select a step (e.g., `/app/review` renders `<Flow value={0}>`, `/app/shipping` renders `<Flow value={1}>`). These routes share global/session state — navigating to step N without completing steps 0..N-1 will fail due to missing state.

**If stepper/wizard patterns are detected:**

1. Create `{ui-repo}/functional-tests/support/helpers/wizard-helper.js` exporting `navigateWizardToStep(page, steps)` that executes `steps[]` (each an async fn) sequentially. Many apps render multiple form steps in a single route — navigating direct to the route lands on step 0; you must complete prior steps to reach later ones.
2. **Document the wizard flow map** in page objects — for each multi-step route, note step indices and advance actions. Inner-step page objects should include `navigateToThisStep()` that completes prior steps.
3. **Route-based step patterns** — if separate routes render the same parent component with different step props, map routes → step index. Document global/session state each step reads. Helper supports either (a) navigating through prior steps to build state, or (b) pre-populating store/session via fixture before direct navigation.

---

## 7d — Data-Driven Flow Runner (MANDATORY — G9a HARD GATE)

> **Why this exists:** the per-flow `wizard-helper.js` (Step 7c) requires hand-coded step functions per spec. That is fine for small wizards but breaks the G9a contract that one descriptor (`tests/flows/<flowId>.flow.json`) must drive a full end-to-end journey without the spec author re-implementing the journey by hand. The flow-runner consumes the descriptor as DATA and produces the Playwright action sequence. App-agnostic — descriptor schema is fixed, descriptor *content* is whatever the app declares.

**Create `{ui-repo}/functional-tests/support/helpers/flow-runner.js` (MANDATORY — HARD STOP if skipped):**

The helper MUST export `runFlow(page, flowDescriptor, options)` that:

1. Reads `flowDescriptor.executionSteps[]` (each step has `kind` ∈ {`navigate`, `fill`, `click`, `select`, `datepicker`, `assert`, `wait-api`, `capture`, `cross-service-skip`, `upload-file`, `download-file`, `verify-notification`, `custom`}, plus per-kind fields). **NOTE:** the flow-runner reads ONLY `executionSteps[]`, never the high-level `steps[]` array.

2. Dispatches each step to the corresponding helper:
   - `navigate` → `page.goto(step.route)` (NEVER for gated routes — Check 14e). For gated routes, `runFlow` MUST walk through prior `flowDescriptor.prerequisiteFlows[]` first.
   - `fill` → `await page.locator(step.selector).fill(step.value)` OR `valueFromCatalog: { pool, field }` resolves at runtime via the test-data catalog.
   - `click` → `await page.locator(step.selector).click()`. Used for button submissions, checkbox toggles, radio selections, and navigation triggers.
   - `select` → react-select helper from Step 7a.
   - `datepicker` → date-picker helper from Step 7b.
   - `assert` → `await expect(page.locator(step.selector)).toContainText(step.assertText)` (or `toBeVisible()` when `step.assertText` is absent).
   - `wait-api` → `page.waitForResponse(resp => resp.url().includes(step.apiPattern) && resp.status() === (step.expectedStatus ?? 200))`. **Real-mode `recordArtifact` (MANDATORY when `TEST_MODE === 'real'`):** when set (`{ key, fromJsonPath?, fromHeader? }`), `appendWorkerLine('runartifacts', { runId, testId, key, value, endpoint: step.apiPattern, mode: 'real', timestamp })` after response resolves. Mock mode silently skips.
   - `capture` → reads response body / page state into `ctx.captures[step.key]` (later steps reference `{{captured.<key>}}`). **MANDATORY persistence (R10-B3):** also `appendWorkerLine('captured', { runId, testId, key: step.key, value, endpoint: step.fromUrlPattern || step.fromSelector, timestamp })`.
   - `upload-file` → `await page.locator(step.selector).setInputFiles(path.resolve(__dirname, '../../fixtures', step.fixture))`.
   - `download-file` → triggers download action, awaits `page.waitForEvent('download')`, asserts extension matches `step.expectedExtension`.
   - `verify-notification` → calls `verifyNotificationDelivered({ recipient: step.recipient, subjectMatch: step.subjectMatch, timeoutMs: step.timeoutMs ?? 30000 })`.
   - `custom` → step-function lookup keyed by `step.customId` from `support/helpers/flow-custom-steps.js`.

   > **⚠️ CRITICAL — wait-api pre-registration pattern (MANDATORY).** `page.waitForResponse()` only catches responses that arrive AFTER the subscription call. If a `wait-api` step follows a `custom`/`click` step that triggers the API call, the response will fire BEFORE the sequential wait-api line executes — causing a full-timeout miss. **The flow-runner MUST pre-register `waitForResponse` promises for ALL downstream wait-api steps BEFORE executing each `custom` or `click` step.** Pattern:
   > ```js
   > if (step.kind === 'custom' || step.kind === 'click') {
   >   for (let j = i + 1; j < steps.length; j++) {
   >     if (steps[j].kind !== 'wait-api') continue;
   >     if (preRegisteredResponses.has(j)) continue;
   >     const s = steps[j];
   >     preRegisteredResponses.set(j, page.waitForResponse(
   >       resp => resp.url().includes(s.apiPattern) && resp.status() === (s.expectedStatus ?? 200),
   >       { timeout: s.timeoutMs || 30000 }
   >     ));
   >   }
   > }
   > ```
   > When the `wait-api` step index `i` is reached in the main loop, check `preRegisteredResponses.has(i)` — if yes, `await` the existing promise instead of creating a new subscription. This ensures responses fired between the triggering action and the wait-api step are captured. Scan ALL remaining steps (not just consecutive wait-api steps after the action) because `assert` or other non-triggering steps may sit between the action and the wait-api.

3. On any step failure, attaches the failed step's index, kind, and selector to `testInfo.attachments` so Playwright HTML report's failure pane shows exactly which descriptor step broke.

4. On `cross_service` step (`kind: "cross-service-skip"` with `{fromService, toService, businessRule, requiredInput, resolution}`), invokes `skipCrossService(test, testInfo, payload)` from `support/helpers/skip-helper.js` (G9b).

5. **Persona / case-type dispatch (R10-B7 — MANDATORY):**
   - `options.persona` → selects identity-pool record set for `valueFromCatalog`. Resolution: for each catalog pool with `poolType` starting `identity-`, derive `pool.persona = poolType.replace(/^identity-/, '')`; pick `pool.persona === options.persona`. Non-identity pools are persona-agnostic.
   - `options.caseType` → toggles VALUE INJECTION on `fill` steps: positive uses `step.value`/`step.valueFromCatalog`; negative-validation uses `step.negativeValidationValue`; boundary uses `step.boundaryValue`; negative-business-rule uses `step.negativeBusinessRuleValue`. Missing variant → `runFlow` throws `Descriptor missing <caseType> variant for step <i> field <selector>` (HARD STOP).

6. Each step logs to `testInfo.attachments` (one attachment per step) for trace visibility.

7. **Round-robin in `flow-runner.js` / `flow-custom-steps.js`:** filter quarantined out, rotate by pool-keyed index. Runner's `pickAvailable(pool)` MUST NOT use bare `.find()`. Use module-level `_pickIndex` Map, key = `pool.poolType ?? pool.type`, idx = `(map.get(key) || 0) % eligible.length`, then `map.set(key, idx + 1)`.

8. **Catalog-pick tracking inside `runFlow` (MANDATORY):** when runner resolves `valueFromCatalog` directly via internal `pickRecordValue(pool, field, ctx)`, record pick on per-flow `ctx.picks[]` (shape `{ poolType, recordId, recordFields, pickedAtStep: i }`; dedup by `poolType+recordId`; `recordId = r.id || r.value || JSON.stringify(r.fields)`). Track `let failedAtStep = -1`. End of `runFlow`, in `try {…} finally {…}` block, `appendWorkerLine('consumed', ...)` for every entry. **`outcome` (QUARANTINE-SAFE):** no error → `'passed'`; error at step ≤ `pickedAtStep` → `'failed'`; error at step > `pickedAtStep` → `'consumed'`.

### appendWorkerLine Skeleton (place ONCE near top of `flow-runner.js`)

```js
const RESULTS_DIR = path.resolve(__dirname, '../../test-results');
const RUN_ID = process.env.TEST_RUN_ID || `${Date.now()}`;
const WORKER_INDEX = process.env.TEST_WORKER_INDEX ?? '0';
function appendWorkerLine(prefix, obj) {
  try {
    if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.appendFileSync(path.join(RESULTS_DIR, `.${prefix}-worker-${WORKER_INDEX}.jsonl`), JSON.stringify(obj) + '\n');
  } catch (_) { /* never block test on disk error */ }
}
```

Same skeleton powers `recordArtifact` (prefix `'runartifacts'`), `consumed`, `skips`, `testresult`.

### Generated Spec Consumption Pattern

Specs MUST consume the runner like this (the `// flow: '<flowId>'` comment is MANDATORY — R10-B2):
```js
// flow: '<flowId>'
const { runFlow } = require('{relPathToSupport}/helpers/flow-runner');
const flow = require('{relPathToFlows}/<flowId>.flow.json');
test.describe("flow: <flowId> — <human-readable name>", () => {
  test("<flowId> — full journey (positive)", async ({ page }, testInfo) => {
    await runFlow(page, flow, { persona: 'default', caseType: 'positive' });
  });
});
```

**Hard rule:** if Step 6b's `tests/flows/` directory contains ≥1 descriptor but `flow-runner.js` does not exist, the framework is incomplete. Exit non-zero: `❌ flow-runner.js missing — G9a contract broken. Re-run /tdgs-aidlc-setup-functional-tests.`

---

## 7d.1 — Real-Mode Operational Guardrails (MANDATORY)

The following rules are non-negotiable when `process.env.TEST_MODE === 'real'`. Each one closes a class of silent failure observed in actual end-to-end runs:

1. **Test timeout MUST be `60_000` ms (flat — NOT mode-aware).** MAX CAP, not a default wait. Inflating to 90s/180s masks selector regressions, hung iframes, and infra problems.

2. **Viewport in the chromium project MUST be ≥ 1600×900 in real mode.** Hosted-payment / hosted-tokenization iframes from third-party providers are often absolute-positioned; at 1280-wide they render off-screen. Set `use: { viewport: { width: 1600, height: 900 } }`.

3. **`recordArtifact` body parsing MUST use `await resp.json()` directly — NEVER `resp.clone().json()`.** Playwright's `Response` does NOT expose `.clone()` and will throw. Body can be read at most once; use a single `try { body = await resp.json(); } catch (_) {}`.

4. **`recordArtifact.fromJsonPath` MUST match actual response shape — DO NOT assume a `data.` envelope.** Many gateways return FLAT JSON. Wrong `fromJsonPath` silently extracts `undefined`. **If shape unknown, `recordArtifact: null` and tag `@quarantine` (G4).**

5. **Async downstream notification APIs MUST be marked `optional: true` with explicit `timeoutMs`.** Backend endpoints (document-gen, notification-dispatch) often return 200 long after the page rendered. Declare `{ "kind": "wait-api", ..., "timeoutMs": 45000, "optional": true }`. Handler honors both: catch timeout when `optional: true` and log `wait-api OPTIONAL skip` instead of throwing.

   > **⚠️ EXCEPTION — `recordArtifact` with business-critical capture.** If a wait-api step has `recordArtifact` that captures a business identifier needed for test verification or audit trail (e.g., receipt/remittance number, order confirmation ID), it MUST NOT be optional — it is functionally required. Only truly fire-and-forget endpoints (email dispatch, webhook notifications, audit logging) where the test does NOT depend on the response should be `optional: true`. A receipt-generation endpoint that returns the remittanceNumber is NOT optional — mark it `"timeoutMs": 30000` without `"optional": true`, and ensure the pre-registration pattern (item 2 above) captures the response.

6. **Cross-origin nested iframes (hosted payment forms) MUST be driven via `page.frames()` + `frame.locator(...).click({force:true}).fill(value, {force:true})` — NEVER `page.mouse.click(x, y)`.** Pattern (packaged as `custom` step in `flow-custom-steps.js`):
   ```js
   let cardFrame = null;
   const startedAt = Date.now();
   while (Date.now() - startedAt < 25_000) {
     cardFrame = page.frames().find((f) => /<provider-host-fragment>/i.test(f.url() || ''));
     if (cardFrame && (await cardFrame.locator('input').count()) > 0) break;
     await page.waitForTimeout(300);
   }
   if (cardFrame) {
     const cardInput = cardFrame.locator('<provider-stable-selector>').first();
     await cardInput.waitFor({ state: 'attached', timeout: 10_000 });
     await cardInput.click({ force: true });
     try { await cardInput.fill(String(v.cardNumber), { force: true, timeout: 5000 }); }
     catch (_) { await cardInput.click({ force: true }); await cardInput.pressSequentially(String(v.cardNumber), { delay: 60 }); }
     await cardInput.press('Tab');
   }
   ```
   `force: true` is required because provider iframes are often non-interactable per Playwright actionability checks.

7. **Host-allowlist MUST include the payment provider's tokenizer + API hosts in real mode.** Discover provider hostnames from UI repo config — do NOT hard-code vendor hostnames. Add discovered hosts to the request-route interceptor allowlist.

8. **Email field MUST resolve from a non-persona catalog pool (e.g. `recipient-email`) — never hardcoded.** Enables `consumedCount` rollup and proves end-to-end deliverability.
