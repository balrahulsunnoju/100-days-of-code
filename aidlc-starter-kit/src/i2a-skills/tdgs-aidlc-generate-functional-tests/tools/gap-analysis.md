# Gap Analysis (Section 5)

After generating tests:

1. **Cross-reference** every discovered business rule against generated tests.
2. **Identify uncovered rules** — list with reason (not applicable to UI, deferred, etc.).
3. **Verify test distribution** — balanced positive/negative/edge-case coverage.
4. **Check missing page objects** — every tested page has corresponding PO.
5. **Verify PO completeness** — every PO has locators for ALL required fields per validation schema. Cross-reference PO field count against Yup/Zod schema `required` count per form.
6. **Verify selector accuracy** — every PO locator matches ACTUAL `id`/`name`/`data-testid` in component source. Flag guessed locators.
7. **Verify interaction method correctness** — no `.selectOption()` on react-select, no `.fill()` on masked date inputs, no direct URL nav to inner wizard steps.
8. **Anchor-vs-button selectors** — PO actions clicking nav elements (back/cancel/home/lang toggle) match actual DOM element type. Source `<a className="button-secondary">` → PO must NOT use `getByRole('button')` — use `getByRole('link')` or CSS/text selector.
9. **Route-based step state deps** — every test navigating to stateful step (shipping needs order data, payment needs shipping) either completes prior steps OR pre-populates state via fixtures.
10. **Check missing factories** — every form has data factory.
11. **Mock setup MODE-CONDITIONAL** —
    - **`TEST_MODE=mock`** (or unset): every spec interacting with API-calling pages MUST call `setupDefaultApiMocks` in `test.beforeEach`. Missing = timeout failures. Exception: offline/error-behavior tests using `mockApiError`/`mockApiTimeout`.
    - **`TEST_MODE=real`**: ANY positive-flow spec containing `setupDefaultApiMocks`, `page.route(`, or mock response imports = HARD ERROR. Real-mode specs interact directly with running app — mocks defeat purpose, mask failures. Negative/error specs that intentionally inject failures may use targeted `page.route()` overrides with `// intentional-error-injection` comments.

    > Mode-aware: `setupDefaultApiMocks` import MAY remain in real-mode specs ONLY IF the helper genuinely reads `process.env.TEST_MODE` and early-returns when `real`. No `overrides: {...}`, no `beforeEach` with response bodies, no mock-dependent nav logic in real-mode positive specs. When in doubt: OMIT mock infrastructure entirely in real mode.

**Use KB rule IDs as anchors.** If KB found in Phase 1, gap analysis table uses canonical rule IDs from catalog — not auto-generated IDs. Ensures traceability.

Display gap analysis table:
```
| Rule ID | Business Rule | Source | Covered? | Test File | Notes |
|---------|---------------|--------|----------|-----------|-------|
| {id-1}  | {rule description} | KB + Code | ✅ | positive/{spec}.spec.js | |
| {id-2}  | {rule description} | KB | ❌ | — | Backend-only, no UI surface |
| —       | {undocumented rule} | Code only | ✅ | negative/{spec}.spec.js | Not in KB |
```
