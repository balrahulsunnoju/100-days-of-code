# Pre-flight Checks — Functional Test Generation

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **DO NOT** create test files at the workspace root. All Playwright tests and reports go inside the detected UI repository under `functional-tests/`.

## Pre-flight Check: Scope Boundary — Test Code Only (MANDATORY)

> ⛔ **HARD RULE: This prompt is authorized to CREATE/MODIFY files ONLY inside the UI repository's test directories.**
>
> **ALLOWED write paths** (under `{ui-repo}/`):
> - `functional-tests/tests/**`
> - `functional-tests/support/**` (page-objects, fixtures, helpers, factories, mocks)
> - `functional-tests/scripts/**`
> - `playwright.config.js` (UI repo root — Playwright convention; this is where `/tdgs-aidlc-setup-functional-tests` writes the config)
> - `package.json` — UI repo root, **devDependencies + npm `test:e2e:*` scripts only**; never modify `dependencies`, never alter existing scripts
> - `functional-tests/README.md`
>
> **FORBIDDEN write paths** (NEVER modify, even "safely guarded"):
> - `{ui-repo}/src/**` — application source code (components, store, routes, hooks, utils)
> - `{ui-repo}/public/**`, `{ui-repo}/referencedata/**`
> - Any `package.json` outside `functional-tests/`
> - Any backend service repository (`*-service-sim/src/**`, `pom.xml`, etc.)
> - Any docs repository under `*-docs*/`
>
> **If a component cannot be tested in isolation because it depends on global state, prior wizard steps, auth, or runtime context:**
> 1. **DO NOT** add test hooks, hydration shims, `window.__TEST__` flags, `NODE_ENV` branches, or any other test-only code paths to production source.
> 2. **DO NOT** modify the store, router, or any app entry point to expose test seams.
> 3. **DO** one of the following instead:
>    - **(a)** Drive the component naturally via UI clicks from a reachable starting point (true E2E from step 0)
>    - **(b)** Use Playwright's `page.route()` / `page.evaluate()` / `page.addInitScript()` to inject test state INTO THE BROWSER at runtime, only when the app has a pre-existing public API for it (do NOT create one)
>    - **(c)** Document the component as untestable-in-isolation in `functional-tests/README.md` under a "Known Coverage Gaps" section, with the specific dependency that blocks it, and SKIP it
>
> **If you believe production code MUST change to enable a test, STOP and ask the user explicitly. Never ship a production code change as part of test generation.**

## Pre-flight Check: Read project-context.md (MANDATORY)

> ⚠️ **BEFORE generating any test code**, search the workspace for `project-context.md` (typically in `*-docs*/project-context.md`). If found, **read its Testing Rules section in full** and follow those conventions exactly. This file contains project-specific rules including:
> - Playwright test file naming conventions (`{feature}.positive.spec.js`, etc.)
> - Fixture composition patterns and page object conventions
> - Tag-based filtering (`@edge-case`, `@smoke`)
> - Whether to use `page.route()` for API mocking or real backend services
> - Test location conventions (`functional-tests/tests/e2e/{positive,negative,edge-case,smoke}/`)
>
> **If project-context.md is NOT found**, fall back to auto-detection from workspace scanning.

## Pre-flight Check: Read Test Data Catalog (MANDATORY When Available)

> **BEFORE generating form fill data**, search for `*-docs*/test-data/test-data-catalog.yaml` (created by `/tdgs-aidlc-setup-testdata`). Top-level sections ONLY: `apiChain[]`, `uiScreens[]`, `identityPools[]`. Catalog deliberately does NOT include `dynamicFields`, `businessConstants`, `recordTypeVariants`, etc. — those values come from UI source (Yup/Zod schemas, dropdown sources) at generation time.
>
> **IF CATALOG FOUND — MANDATORY:**
>
> 1. **`identityPools[]`** — for `class === 'external-required'` pools, identity values MUST come from the runtime `catalogRecord()` fixture in `support/fixtures/catalog-fixture.js`. The fixture picks an `available` record, tracks consumption for the data-ledger, persists `consumedCount`/`consecutiveFailureCount`/quarantine state back to the catalog YAML, and hard-fails `data-issue` when no record is available.
> 2. **`uiScreens[]`** — maps screen → API `calls[]` (`endpoint` + `target` service). Scopes which screens are testable E2E vs need `page.route()` mocks (target service not running locally).
> 3. **`apiChain[]`** — for sequential API flows (create → fetch → update), the chain ordering dictates mock response sequence.
> 4. **Real pool data vs mocks** — use REAL pool data when: (a) test tagged `@e2e-live`, OR (b) `project-context.md` sets `mockApiCalls: false`, OR (c) `--no-mock` flag, OR (d) user selected "Real mode" in G3 interview. Otherwise mock with `page.route()` + OpenAPI-derived shapes; pool data is the form INPUT.
>    - **Real mode (G15):** NO `page.route()` for ANY endpoint, and every page has real UI interaction (payment fill, receipt verification). Do NOT generate mocks "just in case".
>    - **Consumption:** `globalTeardown` writes `{ui-repo}/functional-tests/test-results/data-ledger.json` AND persists pool status back to YAML. Cross-app dashboard refresh: re-run `/tdgs-aidlc-setup-testdata`.
> 5. Display: `📋 Using test data catalog (identityPools / apiChain / uiScreens)`.
> 6. **Per-field data-source decision tree (MANDATORY — every filled field):** mirror of API-test 9-step chain (`/tdgs-aidlc-generate-api-tests` Pre-flight item 3); collapsed to 4 UI-relevant sources:
>
>    | Order | Source | When | Burns? | Tag |
>    |-------|--------|------|--------|-----|
>    | 1 | `identityPools[].fields` | field exposed by `external-required` pool used on this screen | Yes | `catalog.identityPool.{poolType}` |
>    | 2 | UI source (Yup/Zod, dropdown file, date validator, `initialValues`) | finite/constrained values declared in UI code | No | `ui-source.{schema-or-file}` |
>    | 2b | KB (OpenAPI `example`/`enum[0]`, business-rules-catalog constants, data-dictionary samples) | documented in KB but not UI-constrained (e.g. `applicationId="<APP-ID>"`) | No | `kb.{openapi\|business-rule\|data-dictionary}` |
>    | 3 | Faker (non-PII only) | generic free text / address-line / city / filler | No | `faker` |
>    | 4 | Constraint-aware literal — read DDL `CHECK`, `@Pattern`, `@Size`, `@Email`, `@JsonFormat` and emit a satisfying value (e.g. `@Pattern("^[A-Z]{2}$")` → `"XX"`; `CHAR(1) CHECK IN('Y','N')` → `"N"`) | field has any wire/DB constraint | No | `constraint-aware` |
>    | 5 | Typed-placeholder literal | required, no other source | No | `inline-placeholder` |
>
>    **Typed-Placeholder Fallback (step 5):** deterministic literal whose JSON type matches declared type (String → `"placeholder-string"`, Integer → `0`, Boolean → `false`, LocalDate → `"2026-01-01"`, LocalDateTime → `"2026-01-01T00:00:00Z"`, Email → `"noreply@example.com"` (RFC 2606), Phone → `"555-0100"`, UUID → `"00000000-0000-0000-0000-000000000000"`, Enum → first declared value). NEVER use when step 4 can satisfy the constraint.
>
>    **PII rule (HARD STOP):** canonical PII regex defined ONCE in `/tdgs-aidlc-generate-api-tests` Pre-flight item 3 (do NOT duplicate). PII field exposed by `external-required` pool → rule 1 wins (faker forbidden). Otherwise typed-placeholder (NEVER faker for PII). Address fields (`address`/`street`/`city`/`state`/`zip`/`postalcode`/`country`) are NOT PII; faker allowed when no pool exposes them.
>
>    **Enforcement:**
>    - Every fill carries a trailing source-tag comment (e.g. `await form.state.fill('TX'); // source: ui-source.stateDropdown`).
>    - Faker FORBIDDEN on any `external-required`-pool-exposed field.
>    - Pool data (rule 1) is form INPUT in mocked flows too (matches mock's expected request shape); same ledger entry written.
>    - Tests `import` from `support/factories/` for pool-backed values; inline faker only for rule 3.
>    - Provenance recorded by PO `fillForm()` into per-test `dataSources[]`; `globalTeardown` aggregates into `data-ledger.json.catalogUsage`. Workspace dashboard reads `dataSources[]` live; `test-report.md` reads aggregated map.
>
> 7. After generation display: `📊 Field data sources used:` with counts per `catalog.identityPool` / `ui-source` / `faker` / `inline-placeholder` (placeholders flagged as GAPS if business-meaningful).
>
> **IF CATALOG NOT FOUND — CONFIRMATION GATE:** display warning + `Options: 1) Proceed with placeholder values  2) Stop — run /tdgs-aidlc-setup-testdata first` and WAIT. Choice 1 → proceed with inline values; choice 2 → STOP, no tests generated.
>
> **IF CATALOG FOUND — Update factories:** regenerate `functional-tests/support/factories/` to use catalog values. For every `external-required` pool, expose an accessor (named `poolType`) that returns `record.fields` from the runtime fixture (NOT baked at generation time). Field-level values come from UI source — NOT from removed catalog sections.

## Workspace Scan & Repository Confirmation

1. Scan workspace root for subdirectories.
2. Classify each repo — frontend (UI), backend (service), docs, config.
3. Display discovered repos in a numbered table:
   ```
   ══════════════════════════════════════════════════════════════
   WORKSPACE REPOSITORY SCAN
   ══════════════════════════════════════════════════════════════
     #  Repo                           Type          Stack               Include?
     1  {ui-repo}/                     Frontend      React 18.x           ✅ (UI — tests go here)
     2  {backend-repo-1}/              Backend       Java/Spring Boot     ✅ (rules source)
     3  {backend-repo-2}/              Backend       Java/Spring Boot     ✅ (rules source)
     4  {docs-repo}/                   Docs          Markdown             ✅ (rules source)
     5  {starter-kit}/                 Config        —                    ❌ (excluded)
   ══════════════════════════════════════════════════════════════
   ```
4. Ask user: `Confirm repos to include? (Enter to accept, or specify numbers to exclude, e.g., "exclude 3,4"):`
5. Only scan confirmed repos during discovery.

## Framework Pre-checks

1. **Auto-detect UI repo** — same logic as `/tdgs-aidlc-setup-functional-tests`.
2. **Framework exists:** `{ui-repo}/playwright.config.js` AND `{ui-repo}/functional-tests/` — missing → **HALT**, instruct user to run `/tdgs-aidlc-setup-functional-tests` first (Copilot prompts cannot invoke other prompts; inlining setup duplicates scaffolding and drifts).
3. **`{ui-repo}/node_modules/@playwright/test/`** → `npm install` if missing.
4. **Browsers:** `npx playwright install --with-deps` if missing.
5. **`webServer` block** in `playwright.config.js` → warn if missing (tests may need dev server running manually).
