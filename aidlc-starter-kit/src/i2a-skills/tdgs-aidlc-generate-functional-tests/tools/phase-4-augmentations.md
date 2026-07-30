# Phase-4 Augmentations & Constraints

## Constraints

- All test files → `{ui-repo}/functional-tests/tests/e2e/`. All reports → `{ui-repo}/functional-tests/test-results/`. Nowhere else.
- Do NOT modify production source. Only create/update inside functional-tests/. No root-level files.
- Every test traceable to a discovered business rule or validation requirement.
- Tests executable offline via `page.route()` mocks if backends unavailable.
- Use `@faker-js/faker` for dynamic data — never hardcode PII/real user data.

## Phase-4 Augmentations — Generation Mandates

### G4-1 — Negative-case generation is mandatory

For every flow whose UI has a form, generator MUST author ≥1 spec per `caseType` (G11): `positive`, `negative-validation`, `boundary`, `negative-business-rule`. Subject to priority tiers in Pre-Write Contract Block F4. Positive-only spec set = HARD FAILURE.

### G4-2 — Upload/download flows

`<input type="file">` → ≥1 upload spec via `support/helpers/file-helpers.js#uploadFile()` + `support/fixtures/sample.<ext>` matching `accept` (default `sample.pdf`). Terminal step triggering download (anchor `download` attr OR response `Content-Disposition: attachment`) → ≥1 download spec.

### G4-3 — Notification verification

Descriptor `step.kind = 'verify-notification'` OR catalog notification recipient pool wired to chain endpoint → spec calls `support/helpers/notification-verifier.js#verifyNotificationDelivered()` and asserts delivery (real) or mock-pass (mock).

### G4-4 — Failure-artifact verification

Generated `npm run test:e2e:*` scripts MUST chain `; node functional-tests/scripts/verify-failure-artifacts.js` (semicolon NOT `&&`). Missing verifier → this prompt MUST create it first.

### G4-5 — Accessibility opt-in per flow

Descriptor MAY declare `"a11y": { "enabled": true, "failOnViolations": false, "tags": ["wcag2a", "wcag2aa"] }`. Enabled → generator inserts `await runA11yAudit(page, options)` after each nav step.

---

- If Playwright browsers missing → `npx playwright install --with-deps` before execution.

## Execution Context

Requires framework set up via `/tdgs-aidlc-setup-functional-tests`. If missing during pre-checks, this prompt **halts** and instructs user to run setup first — does NOT scaffold inline.
