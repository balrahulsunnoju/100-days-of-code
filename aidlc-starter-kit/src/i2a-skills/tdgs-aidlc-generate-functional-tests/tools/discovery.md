# Discovery — Comprehensive Business Rule Extraction

## Phase 0a — End-to-End Flow Enumeration (MANDATORY — G9a HARD GATE — runs BEFORE Phase 1)

> ⛔ **Root cause this fixes:** the generator was producing per-screen specs (login, search, form-step-1) but missing complete end-to-end flows (entry → form steps → review → submission → confirmation). 120 generated tests with zero coverage of the review/submission/confirmation screens is the documented symptom. Per-screen discovery alone CANNOT find a flow whose entry route reads global state populated by an earlier screen — deep-link discovery lands on a redirect-to-start. **The fix is to enumerate flows FIRST, then expand each flow into its per-screen tests.** Without this phase `ledger.yaml.runs[].perFlowRollup[]` is empty (CI flow-coverage gates and per-service `test-report.md` flow rollup go blank) and the generator silently leaves business-critical journeys uncovered.

**Inputs (in order — first source that returns ≥1 flow wins; subsequent sources only AUGMENT, never override):**

1. **Existing descriptors** — every `{ui-repo}/functional-tests/tests/flows/*.flow.json` already on disk (written by a prior generator run, possibly hand-edited by reviewers). AJV-validate each against `flow-descriptor.schema.json` (created by `/tdgs-aidlc-setup-functional-tests` Step 6b). Malformed descriptor = HARD STOP with the JSON-pointer error — do NOT silently skip.
2. **Knowledge-base process flows** — `*-docs*/knowledge-base/business/process-flows.md` (or equivalent). Parse each documented end-to-end journey into a candidate `*.flow.json` descriptor.
3. **UI route graph traversal** — starting from every public entry route, walk forward via `<Link>`/`navigate()`/router-push call sites in source. Cluster routes that share a wizard parent OR a common global-store namespace into one candidate flow. Each cluster becomes a candidate descriptor with `flowId = <kebab(parent-route or namespace)>`.
4. **Catalog `apiChain[]`** — every chain whose `target` services are reached from a UI screen contributes its endpoint sequence to the matching descriptor's `steps[].emitsApi`.
5. **Backend controller chains (MANDATORY — covers backend-only flows the catalog misses)** — for every Java/Kotlin/.NET service repo discovered in the workspace (`pom.xml` / `build.gradle` / `*.csproj`), grep controllers for routing annotations: `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping`, `@DeleteMapping`, `@FeignClient`, `[HttpGet]`, `[HttpPost]`, `[Route]`. Build a map of `endpoint → controller method → downstream calls (other Feign/RestTemplate/HttpClient invocations within the method body)`. Any chain of ≥2 endpoints reachable from a single inbound request that is NOT already covered by source 4 (catalog `apiChain[]`) becomes a candidate flow with `flowId = <kebab(entry-controller-method-name)>` and `entryRoute = null` (backend-only — the spec uses API-only assertions, no UI navigation). This catches integration paths that have no UI surface (cron-triggered jobs, webhooks, internal admin endpoints).

**Operation (single pass):**

- Merge all sources into one in-memory `flows[]` list keyed by `flowId`. Conflicts (same `flowId`, different fields) resolve in favor of the on-disk descriptor (source 1 wins) — reviewer edits are sacred.
- Write any newly-discovered flows to `{ui-repo}/functional-tests/tests/flows/<flowId>.flow.json` using the atomic-write protocol (`.tmp` → `fsync` → `rename`).
- AJV-validate every descriptor (existing + newly-written) against `flow-descriptor.schema.json`. Any failure = HARD STOP.

**Output (MUST be emitted in chat BEFORE Phase 1 starts):**

```
═══════════════════════════════════════════════════════════════
FLOW INVENTORY — {ui-repo}
═══════════════════════════════════════════════════════════════
  Flow ID                    | Source              | Entry Route       | Steps | Required Pools         | Cross-Service Deps
  ───────────────────────── | ──────────────────── | ────────────────── | ───── | ───────────────────── | ──────────────────────
  {flow-1-id}                | descriptor (kept)   | /...              | 5     | {pool-a}              | {service-x}
  {flow-2-id}                | KB process-flows.md | /...              | 4     | {pool-b}              | (none)
  {flow-3-id}                | route-graph         | /...              | 3     | (none)                | (none)
═══════════════════════════════════════════════════════════════
Total flows: {N} — every flow MUST have at least one positive spec by end of generation.
  Newly written descriptors: {M}
  Existing descriptors kept: {K}
```

## Phase 0a-bis — Variant Axis Expansion (MANDATORY — G9a-VARIANT HARD GATE — runs immediately after Phase 0a, BEFORE the confirmation gate)

> ⛔ **Root cause:** A documented business process often applies to multiple sub-types (record/document/account/product types) AND/OR jurisdictions/channels/tenants. Phase 0a discovers ONE flow per process — it doesn't split into per-variant journeys. Result: matrix shows `1 flow × 2 personas × 4 cases = 8 cells` when reality demands `N variants × M jurisdictions × 4 × P` cells. Coverage looks "100%" because the denominator was wrong. This phase makes the gap LOUD via declarative `variantAxes[]`.

**Inputs (every source CONTRIBUTES, none "wins"):**

1. **Explicit `variantAxes[]` on flow descriptor** — takes precedence. Schema (added by `/tdgs-aidlc-setup-functional-tests` Step 6b):
   ```json
   "variantAxes": [{ "name": "<axisName>", "values": ["<v1>", "<v2>", ...] }]
   ```
   Axis names + values are workspace-specific — never hardcoded by this prompt.
2. **KB-derived signals** — for flows whose `sourceRef` points to `process-flows.md`, scan the linked section for variant enumerations: bullet lists of sub-types, `"Applies to: <a>, <b>, <c>"` sentences, headings naming variant values. Missing axis → gap fires.
3. **UI-source signals** — for each flow's `entryRoute`, read the component (and reachable children) for type/category selectors with >1 option (Yup `oneOf([...])`, JSX `.map(...)` over constants, radio groups). Missing axis → gap fires.
4. **Catalog-pool jurisdictional signal** — when catalog declares ≥2 `identity-<x>` pools, every flow whose `requiredPools[]` includes any `identity-*` pool MUST have a `jurisdiction` (or equivalent) axis covering each `<x>`.

**Operation (single pass per descriptor `d`):**

1. `expected_axes = union(KB, UI, catalog-jurisdictional)`; `actual_axes = d.variantAxes ?? []`; `missing_axes = expected_axes \ actual_axes`.
2. If `missing_axes` non-empty AND `d.acknowledgedMissingAxes !== true` → trigger **Interactive Proposal** below.
3. If `actual_axes` non-empty → expand `d` into Cartesian product of axis tuples. Each tuple = **logical flow** with id `d.flowId + '--' + tuple.values.join('--')`. Expanded flows REPLACE `d` in in-memory `flows[]`; on-disk descriptor unchanged. Logical flows inherit all fields; axis values exposed to flow-runner as `{{variant.<axisName>}}` tokens (resolved like `{{catalog.identityPool.*}}`).
4. Persona axis is INDEPENDENT — derived from `identity-*` pools per Block F4 R10-B8. When a `jurisdiction` axis name-matches persona names, F4's renderer collapses each `(jurisdiction, persona)` pair to ONE row.

**Output (chat, AFTER Phase 0a, BEFORE confirmation gate):**

```
═══════════════════════════════════════════════════════════════
VARIANT AXIS EXPANSION — {ui-repo}
═══════════════════════════════════════════════════════════════
  Base Descriptor   | Declared Axes                  | Expanded To
  ───────────────── | ────────────────────────────── | ────────────────
  {base-flow-1}     | recordType×6, jurisdiction×2   | 12 logical flows
  {base-flow-2}     | recordType×3                   | 3 logical flows
  {base-flow-3}     | (none)                         | 1 logical flow
═══════════════════════════════════════════════════════════════
Total logical flows after expansion: {N} (was {M}).
```

**Discovery Completeness Interactive Proposal (MANDATORY when missing axes detected — NEVER hard-stop without first proposing):**

> ⛔ **Anti-pattern prevented:** "HARD STOP, go hand-edit JSON" is a UX failure. With KB + catalog, the prompt can DERIVE variants and PROPOSE them. User confirms/edits/rejects.

When `missing_axes` non-empty, the agent MUST:

1. **Auto-derive concrete values per missing axis** by re-reading signal sources (KB body, UI dropdown source, catalog pools). Show EXACT values from workspace with citations (file:line or pool name) — never generic placeholders.
2. **Display proposal in chat:**

   ```
   ═══════════════════════════════════════════════════════════════
   VARIANT AXIS PROPOSAL — review and confirm
   ═══════════════════════════════════════════════════════════════
   Descriptor: {base-flow-1}  (sourceRef: {kb-path-or-route})

     Proposed axis #1: <axisName>
       Values:
         - <value-1>      ← <citation: file:line or pool name>
         - <value-2>      ← <citation>
         - <value-3>      ← <citation>

     Proposed axis #2: <axisName>
       Values:
         - <value-1>      ← <citation>
         - <value-2>      ← <citation>

     Matrix impact: <V1> × <V2> = <V1*V2> logical flows
                    × 4 case-types × <P> personas = <total> cells
   (Repeat per descriptor)
   ═══════════════════════════════════════════════════════════════
   Choose ONE per descriptor:
     [accept all]   apply every proposed axis — proceed to expansion
     [edit]         specify keep/drop/rename or value removals
     [acknowledge]  acknowledge gap without splitting (sets acknowledgedMissingAxes:true; reason required)
     [stop]         halt to refine KB or UI source first
   Reply:
   ```

3. **WAIT for response.** No silent proceed, no auto-accept timeout.
4. **`[accept all]`:** persist `variantAxes` to each descriptor (atomic `.tmp` → `fsync` → `rename`), AJV-revalidate against `flow-descriptor.schema.json`, expand per Operation #3.
5. **`[edit]`:** prompt for edits, apply, re-display, confirm, persist.
6. **`[acknowledge]`:** prompt for one-line `axisAcknowledgmentReason` per descriptor, set both fields, persist, expand using declared axes (may be zero).
7. **`[stop]`:** halt with no writes. Hint: "Refine `knowledge-base/business/process-flows.md` or UI source so variants are signaled, then re-run."
8. **No silent hard-stop.** The proposal IS the only allowed UX. Hard stop ONLY on explicit `[stop]`.

**Hard rule:** confirmation gate (next block) operates on EXPANDED `flows[]`, not pre-expansion. Block F4 denominator MUST be `expanded_flows × case-types × personas`. Reporting "100% of 1 flow" when 12 logical flows existed pre-expansion is the failure mode this gate prevents.

**Confirmation gate:** if `M > 0` (newly-written descriptors exist), the agent MUST display:
```
⚠️  {M} new flow descriptor(s) written to {ui-repo}/functional-tests/tests/flows/.
   Review them now. Edit/delete any that are wrong. Then reply 'continue' to proceed,
   or reply 'stop' to abort and refine descriptors before generation runs.
```
WAIT for the user's response. Do NOT proceed silently. (If `M === 0`, no confirmation is needed — reviewer-curated descriptors are trusted.)

**Hard rule:** every entry in `flows[]` MUST appear in the Section 3d Flow Coverage Matrix below AND in the Block F4 pre-write contract. A flow with zero generated specs is a HARD FAILURE at the Section 3d gate, not a warning.

**Zero-flows hard fail (G9a HARD STOP):** if `flows.length === 0` after merging ALL FIVE input sources above, the generator MUST exit immediately with:
```
❌ Phase 0a discovered ZERO flows after scanning:
     1. tests/flows/*.flow.json   →  0 descriptors on disk
     2. knowledge-base/business/process-flows.md   →  not found OR no parseable journeys
     3. UI route graph traversal   →  no routes / no router detected
     4. catalog apiChain[]   →  empty
     5. backend controllers (@RequestMapping et al.)   →  no controllers found
   At least ONE source MUST yield ≥1 flow for an end-to-end functional test suite to be meaningful.
   Either (a) author a manual flow descriptor at tests/flows/<id>.flow.json,
        or (b) populate knowledge-base/business/process-flows.md with at least one journey,
        or (c) re-run /tdgs-aidlc-setup-functional-tests against a real UI/backend repo.
   Generation HALTED.
```
Do NOT proceed to Phase 1. Do NOT write any spec. Per-screen-only generation without a flow inventory is exactly the failure mode this gate exists to prevent.

## Phase 1: From Knowledge Base (Primary — Canonical Rule IDs)

Before scanning source code, check for KB (`*-docs/knowledge-base/`). If found, read these FIRST to establish canonical rule inventory:

1. **Business Rules Catalog** — `knowledge-base/business/business-rules-catalog.md`. IDs become **canonical test anchors** — every test references them. Capture validation (field constraints/format), calculation (formulas with exact expected values), eligibility rules.
2. **Process Flows** — `knowledge-base/business/process-flows.md`. E2E user journeys → **positive workflow tests** (highest priority).
3. **OpenAPI Specs** — `knowledge-base/api/*.yaml`/`*.json`. Endpoints + request/response schemas → accurate `page.route()` mocks + API interception.
4. **UI Architecture Docs** — `knowledge-base/repos/{ui-repo}/architecture.md`, `ui-components.md`. Component hierarchy/routing/state → PO baseline.
5. **Integration Architecture** — `knowledge-base/shared/integration-architecture.md`. Understand API gateway routing if present (proxy paths vs backend service paths). Mock routes intercept paths the **UI actually calls**, not backend service paths (if gateway exists).

**No KB →** skip this phase, code-only discovery (Phase 2).

## Phase 2: From Source Code (Augment & Validate)

Scan **ALL repositories** in workspace (not just UI). Cross-reference code against KB — flag discrepancies (rule in KB not in code, or vice versa).

### From UI Repository:
- **Route definitions (LITERAL EXTRACTION)** — read actual route config (React Router `<Route path="...">`, Angular `RouterModule.forRoot([...])`, Vue Router `routes: [...]`). Extract exact `path` value — do NOT infer from component/file names. May include base prefixes (`/app/`, `/portal/`), localized slugs (not English translations), or hash routing. Per route record: literal path, rendered component, props passed.
- **Multi-step wizard / stepper detection** — per route component check for steps within single URL (`activeStep`/`currentStep`/`step`/`value` state, `switch(step)` or `{step === N && ...}`, `<Stepper>`/`<TabPanel>`/custom). **Map step sequence:** which exist, what advances them, which contains the form. Tests interacting with inner steps MUST nav through prior steps — cannot deep-link by URL.
- **Route-based step patterns (CRITICAL)** — detect when **multiple routes render SAME component** with different props/query to control step (e.g., `/app/review` → `<Flow value={0}>`, `/app/shipping` → `<Flow value={1}>`). Share state from earlier steps — direct nav to step 1+ without step 0 fails on missing state. Per pattern: (a) map route→step, (b) identify shared state each reads, (c) generate tests that complete prior steps OR pre-populate state via fixture.
- **Form schemas** — Yup/Zod, formik/react-hook-form (detect both coexisting), Angular FormBuilder, HTML5 attrs.
- **Validation rules** — `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `matches`, `oneOf`, `email`, `url`.
- **Conditional required fields (CRITICAL)** — fields whose `required` depends on ANOTHER field's value. Patterns: `yup.when()`, `zod.refine()`/`superRefine()`, Formik `validate` cross-field, Angular cross-field validators. Common:
  - Checkbox toggles required for a field group ("Only one parent listed" removes Parent 2 `required`)
  - Dropdown changes required (selecting "Self" disables DOB — prefilled from prior step)
  - Radio shows/hides entire form section

  Per detected: (a) record trigger field, value, affected fields; (b) wizard-nav-helper + PO `fillForm()` handle the conditional (fill the conditional fields OR activate the trigger that removes them); (c) add negative tests verifying conditional behavior. **If skipped, wizard helpers timeout on unfilled conditional-required fields.**
- **Component structure** — page components, form components, modal/dialog patterns, stepper/wizard.
- **Custom component libraries (CRITICAL)** — scan `package.json` deps + source `import`s for:
  - **Custom select/dropdown:** `react-select`, `@headlessui/react`, `@mui/material` Select/Autocomplete, `antd` Select, `downshift`, `@radix-ui/react-select`, `ng-select`, `vue-select`. Found → every dropdown interaction MUST use react-select helper (or equiv) from `support/helpers/`. **NEVER `.selectOption()`** — these render `<div>` not native `<select>`.
  - **Custom date pickers:** `react-datepicker`, `@mui/x-date-pickers`, `antd` DatePicker, `flatpickr`. Combined with input masks (`react-maskedinput`, `react-input-mask`, `imask`) → use date-picker helper with `.pressSequentially()`. **NEVER `.fill()`** on masked.
  - **Custom checkboxes/toggles/radios:** Material UI, Ant Design, Radix — check if they render native `<input type="checkbox">` or custom.
  - **Private/internal design system libs:** scan `package.json` for private-registry deps, git URLs (`git+https://`, `git+ssh://`), or `file:` refs providing UI components (org-specific design systems, e.g., gov agency's shared lib). Read `import`s to identify which components come from these; inspect DOM rendering. If a private lib provides form inputs, determine native vs custom DOM, choose selectors accordingly.
  - Display detection table:
    ```
    ══════════════════════════════════════════════════════════════
    CUSTOM COMPONENT LIBRARIES DETECTED
    ══════════════════════════════════════════════════════════════
      Library              Usage Count   Interaction Method
      react-select         {N} fields    reactSelectHelper (click→type→select)
      react-datepicker     {N} fields    datePickerHelper (pressSequentially)
      react-maskedinput    {N} fields    pressSequentially (char-by-char)
      {other}              {N} fields    {method}
      ⚠️ Playwright .selectOption() disabled for {N} dropdown fields
      ⚠️ Playwright .fill() disabled for {N} masked date fields
    ══════════════════════════════════════════════════════════════
    ```
- **Actual form field IDs/names (CRITICAL)** — read JSX/TSX source for real `id`, `name`, `data-testid` on every `<input>`/`<select>`/`<textarea>`/`<Controller>`. Do NOT infer/guess from variable names or schema keys. `<input id="streetAddress1">` → PO uses `#streetAddress1` (not guessed `#address1`). Cross-reference vs schema to ensure every required field has a locator.
- **Actual error/notification/heading classNames (CRITICAL)** — same "read source, don't guess" rule for non-form locators (error banners, toasts, modals, spinners, headings, steppers). Generic placeholders (`.error`, `.notification`, `.alert`, `.modal`, `.loading`, `h1`) are FORBIDDEN unless they literally exist. Use exact discovered className (e.g. `.error-red-content`); for headings prefer `getByRole('heading', { name: /text/i })` — never bare `h1`.
- **i18n keys and language toggle** — translation files, locale switching. Read source to determine toggle type: `<button onClick>`, framework `<Link onClick>` (no href), `<a href>`, custom dropdown. Extract exact element type, label ("ENG", "ESP"), and interaction. Do NOT assume `<a href="/{locale}/">` — many apps use `history.push()` / `router.navigate()` / `i18n.changeLanguage()`. PO uses correct selector (`getByRole('link')` vs `getByRole('button')` vs `getByText`).
- **Anchor tags styled as buttons (CRITICAL)** — scan for `<a>` with button-like classes (`btn`, `button-primary`, `button-secondary`, `btn-link`). They render as `<a>` — `getByRole('button')` will NOT find them. Use `getByRole('link')`, `locator('a.{className}')`, or `getByText('{label}')`. Document element type per action in PO.
- **Error handling** — error boundaries, display components, toast/notification patterns
- **Conditional rendering** — feature flags, role-based UI, status-dependent views
- **API integration points** — `fetch`, `axios`, API service files, endpoint constants
- **State management** — Redux, Context, Zustand/Recoil, `use-global-hook` (treat like Redux for fixtures)
- **Navigation flows** — multi-step wizards, breadcrumbs, back/forward
- **Chatbot / conversational flows** — dialog-tree directories, conversation paths, user intents

### From Backend Repositories:
- **API contracts** — OpenAPI/Swagger; route annotations: Java `@GetMapping`/`@PostMapping`/`@RestController`; Python FastAPI `@app.get`/`@router.post`, Flask `@app.route`, Django `urlpatterns`; Node Express `router.get`, NestJS `@Get`/`@Post`; .NET `[HttpGet]`/`[HttpPost]`, Minimal API; Lambda SAM/serverless events.
- **Request/response models** — Java `@NotNull`/`@Size`/`@Min`/`@Max`/`@Pattern`/`@Email`; Python Pydantic `Field()`/marshmallow; Node Joi/Zod/Yup/class-validator; .NET `[Required]`/`[StringLength]`/`[Range]`/FluentValidation.
- **Business logic, error responses, auth** — service layer rules, calculations, workflow states; exception handlers, error codes, HTTP status maps; Spring Security, Passport.js, FastAPI `Depends()`, Lambda authorizers, `[Authorize]`, JWT.

### From Configuration & Docs:
- README files (documented rules/flows), test artifacts (gap analysis, coverage), environment configs (env-specific behavior).

## Phase 3: Reconciliation

After both phases complete, display:
```
══════════════════════════════════════════════════════════════
DISCOVERY RECONCILIATION
══════════════════════════════════════════════════════════════
  KB Rules: {n}    Code Rules: {n}
  Matched: {n}     KB-only: {n}     Code-only: {n}
══════════════════════════════════════════════════════════════
```
KB-only = may be in API gateway/external service/DB trigger — flag but still generate tests if UI-visible. Code-only = undocumented — add to KB backlog.

Discovered test backlog:
```
══════════════════════════════════════════════════════════════
DISCOVERED TEST BACKLOG
══════════════════════════════════════════════════════════════
Sources scanned: {N} repos, {M} source files
Business rules: {n}   Form validations: {n}   API endpoints: {n}
Error scenarios: {n}  Navigation flows: {n}
Test cases: Positive {n}   Negative {n}   Edge-case {n}   TOTAL {n}
══════════════════════════════════════════════════════════════
```

## 3c. Test Count Budget Reconciliation (MANDATORY — emit BEFORE Section 4)

Same workspace can produce 80 vs 650 tests across runs (KB grows, more rules). Variance must be visible/justifiable so it doesn't surprise reviewers or blow CI budgets. Emit BEFORE writing any spec file:

```
═══════════════════════════════════════════════════════════════
TEST COUNT BUDGET RECONCILIATION — {ui-repo}
═══════════════════════════════════════════════════════════════
  Driver                              | Count | Multiplier | Subtotal
  Discovered screens                    | 14    | 3 (P/N/E)  | 42
  Discovered business rules             | 78    | 2 (P/N)    | 156
  Form validations (per field)          | 92    | 2 (P/N)    | 184
  OWASP a11y / i18n / xss / sql variants| 14    | 4          | 56
  Conditional-field branches            | 23    | 2          | 46
  RAW TOTAL                                                  | 484
  De-duplicated (same field × boundary across N specs = 1)   | 412
  Capped by max_tests={value or 'unlimited'}                 | 412
  FINAL PLANNED TEST COUNT                                   | 412
═══════════════════════════════════════════════════════════════
```

Compare to previous run (read `functional-tests/test-results/results.json` if exists):
```
  Previous run total: {N}    Delta: {±N}    Reason: {KB grew by 8 rules, 2 new screens}
```
Delta > +50% with no KB growth → **STOP** (over-generation, likely dup-detection bug). Delta < −50% with no KB shrinkage → **STOP** (under-generation, likely discovery regression).
