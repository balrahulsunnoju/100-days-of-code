# Guardrails (Non-Negotiable, Read First)

These guardrails apply to every step of this prompt. Violating any of them is a defect, not a stylistic choice. Each `Gn` rule below is referenced by ID throughout the rest of this prompt.

## G1 — Application-agnostic
This prompt MUST NOT contain or generate any reference to a specific application name, vendor brand, payment provider, service name, endpoint path, port, hostname, field name, or business term that is not discovered from the workspace at runtime. If you find a literal app/vendor name (e.g. an actual company brand, a literal service path like `/v1/<your-app>/...`, or a domain field like `OrderNumber`/`TraceNumber`/`ReceiptUrl`) hard-coded inside this prompt while reading it, treat it as a defect to flag — do NOT propagate it into generated artifacts.

## G2 — Discover-before-generate
Before authoring any file, scan the workspace and knowledge base for ground truth. Sources, in order of precedence:
1. `*-docs*/project-context.md` (workspace overrides — always wins)
2. `*-docs*/knowledge-base/` (architecture, business rules, API specs, test-management)
3. Source code in service/UI repos (controllers, routes, models, validators, config)
4. Existing test artifacts (`test-data-catalog.yaml`, `ledger.yaml`, prior test files)
If the source-of-truth for a value is not found, STOP and ask the user — do NOT invent.

## G3 — Ask-don't-assume
When a required input is ambiguous or missing (target version, coverage threshold, max test count, scope, environment, identity record values, etc.), ASK the user with a concrete options list. Never silently default. The only acceptable defaults are those explicitly documented in this prompt as "default if user is silent."

## G4 — No hallucination of schemas, response shapes, or field names
Never invent JSON response shapes, response envelopes (`data.*`, `result.*`, `payload.*`), database column names, or API field names. If the shape is unknown, emit the artifact with `recordArtifact: null` (or equivalent placeholder) plus a `⚠️ unknown shape — needs real response inspection` log line, and tag the dependent test with `@quarantine` so it is excluded from pass-rate math until grounded.

## G5 — Prerequisite check (hard-fail)
At the start of execution, verify the prerequisites named in this prompt's **Prerequisites** line. If a prerequisite artifact does not exist, STOP and instruct the user to run the upstream prompt. Do NOT attempt to generate missing prerequisites silently.

## G6 — PII handling
Never apply Faker / random / synthetic generators to PII fields. PII pattern (case-insensitive substring match on field name): `ssn`, `socialsecurity`, `dateofbirth`, `dob`, `driverlicense`, `dl`, `firstname`, `lastname`, `fullname`, `email`, `phone`, `mobile`, `nationalid`, `passport`. **Address fields (`address`, `street`, `city`, `state`, `zip`, `postalcode`, `country`) are NOT PII** — they are non-identifying location data and MAY be Faker-generated. PII field values MUST come from the test data catalog's `identityPools[]`. If the catalog has no record for a required PII field, mark the test `data-issue` (NOT a failure). PII values are rendered **plain** in logs / reports / dashboard — no masking is applied. The catalog and all test artifacts are local-only (gitignored), so masking would only obscure debugging. See `/tdgs-aidlc-setup-testdata` G6 for the canonical no-masking rationale.

> **G6a — Email in negative/auxiliary contexts (MANDATORY in real mode).** Even in negative tests where the email field is NOT the target field being tested (e.g., testing zip code validation while filling email as "valid background data"), the email value MUST still come from the catalog's `identity-email` pool — NEVER use synthetic placeholders like `valid@email.com`, `test@test.com`, or `user@example.org`. In real mode these hit actual DNS, may trigger SMTP delivery to unknown domains, or fail DMARC checks. Use the catalog email (fallback: the project's designated yopmail address). The `invalid-data-factory.js` intentionally-malformed emails (missing `@`, double `@@`, etc.) are exempt — they test client-side regex rejection and never reach the backend.

## G7 — Cross-service / external dependency
If a test step requires a value owned by another service or an external system this framework cannot legitimately call (per `project-context.md` constraints), classify the test as **`skipped` with reason `cross-service-dependency: <missing-prereq>`**. This is a distinct dashboard category — NOT a pass and NOT a failure. The skip payload has 7 fields total: `status: 'skipped'` and `reason: 'cross-service-dependency: <missingPrereq>'` at the top level, plus a nested `skipReason: { fromService, toService, businessRule, requiredInput, resolution }` block (5 fields — same shape as the API runner's `skipReason`). All 7 are MANDATORY — the dashboard's structured-skip surface depends on every field being present. The user MAY override by providing a static stub value in the catalog under `stubs:` (then the test runs against the stub).

## G8 — Pre-Write Output Contract
Before any `create_file` or `replace_string_in_file`, emit a **Pre-Write Output Contract** block listing every file that will be written, with absolute path, byte estimate, purpose, and the source-of-truth reference for any non-trivial value in it. The user can interrupt before writes occur.

## G9 — Idempotency and merge semantics
Re-running this prompt on a workspace where prior outputs exist MUST merge, not overwrite. Existing identity records, ledger entries, and user-edited config MUST be preserved. Conflicts MUST be flagged for user review, not auto-resolved.

## G10 — Sync rule
This prompt file exists at BOTH `tdgs-aidlc-starter-kit/src/prompts/` (canonical) AND `.github/prompts/` (workspace consumption). Any edit MUST be mirrored. The canonical copy is the starter-kit one.

## G11 — Shared contracts (cross-prompt)
- **`caseType` enum (single source of truth):** `positive | negative-validation | boundary | negative-business-rule`. Any other value is a defect.
- **Status enum (per-service data-ledger):** `pass | fail | skip | data-issue | infra | generation-bug | unresolved-token`. Workspace `ledger.yaml` uses camelCase: `passed | failed | skipped | dataIssue | infra`. Dashboard maps between them.
- **Environment enum:** `local | test | stage` only. `prod` and `production` are explicitly forbidden — functional tests never run against production.
- **Test timeout (mock & real):** `60_000` ms — this is a MAX CAP, not a default wait. Playwright resolves `waitForResponse` / `expect().toBeVisible({timeout})` the moment the condition is met and continues immediately; the cap only fires if the condition never occurs. Production APIs (incl. payment) respond in <30s worst-case; the 60s ceiling absorbs payment-sandbox + receipt + email tail latency without masking defects. A test that consistently approaches 60s is a defect — do NOT inflate further.
- **`passRate` formula:** `passed / (passed + failed + dataIssue + infra)` — `skipped` is EXCLUDED from the denominator. `0.0` when denominator is 0.
- **Skip category:** `cross-service-dependency: <reason>` is a first-class status, surfaced separately in the dashboard.
- **Failure artifacts (Playwright):** `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'retain-on-failure'` (NOT `on-first-retry` — that bug drops artifacts). Playwright HTML report displays screenshots and videos inline for failed tests.

## G12 — DB transaction capture in real mode
> When `TEST_MODE=real`, the network-capture helper MUST populate `data-ledger.json.dbRecordsCreated[]` with plain-text business identifiers from ALL write-endpoint responses (POST/PUT/PATCH/DELETE regardless of HTTP status). This feeds the dashboard's DB Transactions section for MCP SQL Developer integration.

## G13 — Reports sync guardrail
> Every report script MUST build ONE in-memory results object, then render ALL formats from that SAME object in ONE pass. After writing: assert totals match across all formats.

---

## Constraints

- **Do NOT create files at workspace root.** Everything goes inside the UI repo.
- **Do NOT modify existing source code or production files.** Only scaffold new files in functional-test directories + add Playwright devDeps/scripts to UI's `package.json`.
- Include `page.route()` mocks so tests run independently when backend is unavailable.
- Verify Playwright browser binaries; run `npx playwright install` if missing.
- Page objects + factories generated by scanning real UI source — no hardcoding.
