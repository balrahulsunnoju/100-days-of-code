# Generation Rules — Test File Structure & Requirements

## Folder Structure

Create test specs in the following structure:

```
{ui-repo}/functional-tests/tests/e2e/
├── smoke/                                  # custom-component helper smoke specs (one per helper, see Check 14c)
│   ├── react-select-helper.smoke.spec.js
│   └── date-picker-helper.smoke.spec.js
├── positive/
│   ├── {page-name}.positive.spec.js
│   ├── {form-name}-submit.positive.spec.js
│   ├── {workflow-name}-flow.positive.spec.js
│   └── navigation.positive.spec.js
├── negative/
│   ├── {form-name}-validation.negative.spec.js
│   ├── {api-endpoint}-error.negative.spec.js
│   ├── session-timeout.negative.spec.js
│   └── required-fields.negative.spec.js
└── edge-case/
    ├── xss-injection.edge.spec.js
    ├── sql-injection.edge.spec.js
    ├── network-failure.edge.spec.js
    ├── concurrent-sessions.edge.spec.js
    ├── browser-back-forward.edge.spec.js
    └── i18n-{locale}.edge.spec.js
```

## Test File Requirements

**Every test file:**
- Import from composable fixtures (`../../../support/fixtures/`).
- **`test.beforeEach` calls `setupDefaultApiMocks(page)`** (or project equiv) — MANDATORY (mock mode). Without it, app calls real backends → TIMEOUT. From `support/helpers/api-mock.js`, intercepts ALL backend routes. Per-endpoint overrides: `setupDefaultApiMocks(page)` first, then `mockApi.mock()`/`page.route()` (last-registered wins).
- Use POs for page interactions; factories for test data (no hardcoded literals); reference business rule ID(s) in `describe`/`test` title.
- **Flow-tag emission (MANDATORY — R10-B2 — every full-flow positive spec).** Spec from `tests/flows/<flowId>.flow.json` MUST carry `flow:` tag Check 15 can grep:
  - **Preferred:** `// flow: '<flowId>'` as FIRST line inside `test.describe()`, AND prefix describe title with `flow: <flowId> — `.
  - **Alternative:** `flow: '<flowId>'` in test annotation tag (`{ tag: ['@regression', '@flow-<flowId>'] }`) AND retain first-line comment.

  Without tag, Check 15 skips spec via `|| continue`, vacuous-passes, hand-coded `page.click/fill/goto` slips through → defeats G9a.
- **Tag taxonomy (REQUIRED on every describe title):** `@smoke` (top ≤10 critical happy paths only — universal `@smoke` defeats purpose), `@regression` (all other positives + full validation/negative; nightly/pre-release), `@external-integration` (emit iff spec calls Apigee passthrough OR any real third-party network call — Stripe/OPM/USPS — outside the app's own services), `@edge-case` (security/i18n/404/browser-quirks), `@quarantine` (parked from CI gates; requires `// TODO(<issue-link>)`). Positive→`@smoke`-or-`@regression`; negative→`@regression`; edge-case→`@edge-case`. When in doubt, leave `@smoke` OFF.
> **Deprecated:** `@critical` and `@slow` were removed from the v3 emitted-tag vocab. Do NOT emit on new specs; treat surviving occurrences as legacy and convert at next touch.
> **Workflow axis:** `workflow:` is expressed via spec folder (`tests/e2e/positive/flows/<workflow>.spec.js`) + `test.describe()` title prefix. It is NOT emitted as an `@tag`. Filter via `npx playwright test --grep "<workflow>"`.
- Use `data-testid` or role selectors (`getByRole`, `getByLabel`, `getByText`).
- Handle conditional UI gracefully (check element exists before interaction).
- **Custom select/dropdown** (react-select etc.) — use helper from `support/helpers/`; NEVER `.selectOption()` on non-native.
- **Masked-input date pickers** (react-datepicker + MaskedInput) — use date-picker helper with `.pressSequentially()`; NEVER `.fill()`.
- **Multi-step wizard routes** — use wizard helper or PO `navigateToThisStep()`; NEVER assume URL nav lands on inner step.
- **Web-first auto-retrying assertions ONLY.** No `await expect(await locator.count())` / `.textContent()` / `.isVisible()` patterns (don't auto-retry — #1 flake source). Use `toHaveCount(N)` / `not.toHaveCount(0)` / `toHaveText(/regex/)` / `toBeVisible()`.
- **No arbitrary sleeps.** No `page.waitForTimeout` / `setTimeout` in tests. Either-or waits → `Promise.race([locator.waitFor({state:'visible'}), page.waitForURL(...)])`. Never `try/catch.then(()=>false)`.
- **No console.* in spec/PO files.** Use `--debug`/`--trace=on`.
- **No assertions in POs.** POs are pure DOM mappers (locators + actions). All `expect()` in specs. POs may expose locators (`get anyError() { return this.page.locator('.error') }`).
- **`test.step()` for ≥3-action tests.** Wrap each in `await test.step('describe', ...)` for readable traces. Single-action exempt.
- **Strict locators.** Avoid `.first()`/`.nth(0)` on supposed-unique — reserve for genuinely-multi-match (lists/tables) with rationale comment.
- **NEVER `.first()` on singletons.** Headings, page titles, error banners, primary buttons, form-level error containers = `.first()` HARD ERROR (silently grabs stale DOM, often previous page's heading mid-redirect). #1 source of "screenshot looks right but test fails". Use text-anchored: `getByRole('heading', { name: /404|error/i })`, `locator('.error-red-content', { hasText: /required/i })`, `getByRole('button', { name: /next/i })`. Forbidden: `locator('h1').first()`, `locator('h2').first()`, `locator('.error').first()`, `locator('button').first()`, `getByRole('heading').first()`.
- **PO `goto()` MUST NOT deep-link to gated routes.** Gated route = app redirects when required state (wizard data, auth, session) missing. PO MUST drive through wizard from entry (or `wizardHelper.navigateTo(stepName)`) — NOT `await page.goto('/path/to/gated/route')`. Direct goto → lands on wizard start; locators time out; screenshot shows wizard start. #1 source of "locator not found".
- **Catalog-literal annotation rule.** Literal form-fill values (vs `data.X()`) MUST carry inline comment: `// not-in-catalog: <field> not catalogued` | `boundary <field>` | `security payload` | `<other reason>`. Literals without annotation = HARD ERROR (Check 10).

## Positive Tests

- **End-to-end process flows** — KB/code-discovered → dedicated workflow specs for complete multi-step journey. Highest priority.
- Complete happy-path flows; all valid form submissions; all nav paths (forward/sidebar/breadcrumb); successful API responses + data display; multi-step wizards start→finish; all dropdown options with valid selections; valid file uploads; pagination/sorting/filtering.

## Negative Tests

- Every validation rule (required, min, max, pattern, email); missing required fields (one at a time + all empty); invalid formats; API errors (400/401/403/404/500) + UI display; session timeout; invalid URL → 404; double-click/rapid-submit prevention; boundary values (±1 char around min/max).
- **No `test.skip()` as navigation avoidance (Check 14g — HARD BAN).** If a negative test requires multi-step navigation to reach the target form, implement a `navigateTo<FormName>()` helper in `support/helpers/` that walks the UI flow — NEVER skip the test because navigation is complex. Negative/edge specs MUST navigate through the real UI (same entry-point rule as positive specs).

## Edge-Case Tests

- XSS in text inputs (`<script>alert('xss')</script>`, `"><img onerror=alert(1)>`); SQL injection (`' OR 1=1--`, `'; DROP TABLE users;--`); path traversal (`../../etc/passwd`); network failure (offline via `page.route()` errors); browser back/forward; concurrent sessions.
- i18n: all locales render correctly. **Route parity:** if app defines parallel route trees per locale (`/app/` + `/app/es/`), verify every English route has working counterpart per supported language. **Read translated paths from `public/locales/{locale}/translation.json` (or i18n config) — do NOT guess by translating slugs or appending `/es/`.** Translated routes are often fully different (e.g., `/order-birth-certificate` → `/solicitar-certificado-de-nacimiento`).
- Extremely long input strings (10,000+ chars); Unicode/emoji; empty-state handling.
