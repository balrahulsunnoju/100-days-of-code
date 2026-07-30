# Setup Test Data — Discovery

## Step 1 — Discover (preserve, do not skip)

> Discovery logic IS the business logic of this prompt. Before changing or removing any discovery rule below, confirm you are not removing a real scan.

Run all four discoveries and display a short status line per discovery (`✅ Found N` / `❌ None`).

### 1a. Find the docs repo, UI repo, and backend service repos

- **Docs repo**: directory matching `*-docs*/` or `*-docs-sim/` containing `project-context.md` or `knowledge-base/`.
- **Backend service repos**: presence of `pom.xml` (Spring), `package.json` with express/fastify/nestjs, `requirements.txt` with Flask/FastAPI, `*.csproj` (ASP.NET), etc. Exclude `node_modules`, `_bmad*`, `tdgs-aidlc-starter-kit`, `*-docs*`, `.github`, `apigee-exports`.
- **UI repo**: `package.json` with `react`, `angular`, or `vue` dependencies.

### 1b. Discover the actively-consumed endpoint set (UI is the source of truth)

For the UI repo:

1. Scan the API helper directory (`src/api/**`, `src/services/**`, `src/composables/**`, etc.) for axios/fetch calls. Record `{ method, path, helperFile, exportName }`.
2. For each helper export, grep components/pages/hooks for `import ... from "<helper>"` AND for the call site `exportName(...)`. A helper that is **never imported** is dropped.
3. **Inline-call fallback (MANDATORY when helper-directory scan yields 0 files OR fewer endpoints than expected).** Scan ALL component/page/form files (`src/components/**/*.{js,jsx,ts,tsx}`, `src/pages/**/*.{js,jsx,ts,tsx}`, `src/views/**/*.{vue}`) for direct HTTP client invocations — patterns: `axios.post(`, `axios.get(`, `axios.put(`, `axios.delete(`, `fetch(`, `$http.post(`, `this.http.post(`. For each match, extract `{ method, path (from URL argument), componentFile, functionScope }` and MERGE into the `activeEndpoints[]` list. This catches apps that bypass a centralized API client layer (common in older React/jQuery codebases). **Run this scan even when the helper directory exists** — some endpoints (e.g. identity verification, third-party auth) may be called inline from shared form components outside the pages directory.
4. Cross-reference each `path` against backend controllers and tag `target: backend|external`.

   > **Target classification recipe (MANDATORY — do not guess):**
   >
   > For each `path`:
   > 1. Search every backend repo in the workspace (any folder matching `*-service*/`, `*-svc*/`, or whatever convention `project-context.md` declares) for controllers — typically files matching `**/src/main/java/**/*Controller*.java`, `**/*Resource*.java`, `**/*Endpoint*.java` for Java/Spring; `**/routes/**`, `**/controllers/**` for Node; `**/views.py`, `**/urls.py` for Django; `**/Controllers/**.cs` for .NET. Adapt the glob to the language stack actually present.
   > 2. Within those files, collect every declared HTTP route (Spring `@RequestMapping`/`@GetMapping`/`@PostMapping`, Express `app.post('/...')`, Django `path('...')`, ASP.NET `[Route]`/`[HttpPost]`, etc.). Reconstruct each full path by concatenating class-level mapping + method-level mapping (e.g. `@RequestMapping("/v1/ovra/transaction")` on the class + `@PostMapping("/SaveOrder")` on the method = `POST /v1/ovra/transaction/SaveOrder`).
   > 3. If the UI's `path` matches a declared route in step 2 (case-sensitive, exact path — ignore method case) → `target: backend` AND `service: <repo-folder-name>`.
   > 4. If NO match in any in-workspace backend repo → `target: external`. **This is the default**: a path that begins with the app prefix (e.g. `/v1/ovra/...`) is NOT automatically `backend` — the API gateway also proxies third-party services through that same prefix. Common external patterns: payment processors (`/Checkout`, `/SubmitPayment`), address validators (`/util/validate/*`), public IP lookup, third-party order/status systems (`/txever/*`, `/usps/*`, etc.). When in doubt, `external`.
   > 5. Record evidence: when `backend`, attach `evidenceSource: "<service-repo>/<controller-file>:<line>"`. When `external`, leave `evidenceSource` unset (proves "no backend match found" by absence, which the dashboard surfaces).
   > 6. **Anti-drift sanity check before write:** if the workspace has N backend repos and your `activeEndpoints[]` produces 0 entries with `target: external`, you have almost certainly mis-classified — STOP and report `⚠️ No endpoints classified as 'external'. Verify the controller-glob actually matched files (run: find . -path '*/main/java/*Controller*.java' | head). If the glob is correct and there genuinely are no third-party calls, override this check with a one-line note in the catalog.`
5. **Version filter**: when the backend exposes multiple versions of the same logical endpoint (e.g. `/CalculateFees` and `/v5/CalculateFees`), keep only the version(s) actually imported by the UI. Drop the rest from the catalog.
6. **Output**: a deduped list `activeEndpoints[]` of `{ method, path, target, service?, helperFile|componentFile, exportName|functionScope }` — every other discovery step refers back to this list.

### 1c. Discover API CHAINS (sequenced, UI-derived)

For each component in the UI repo that contains a submit / click / mount handler:

1. Find the **entry call** (the first `helperExportName(...)` OR inline `axios.post(...)`/`fetch(...)` invocation in the handler).
2. Walk the call's `.then(callback)` AND any sequential calls inside the callback — each subsequent call is the **next step** in the chain. For `await` patterns, walk top-to-bottom in the `async` body.
3. Record one chain entry:
   - `chainId` (kebab-case) — short, unique
   - `steps[]` — each `{ endpoint, target }` **in call order**
4. If a single screen has multiple independent chains (e.g. mount-time effect AND a submit chain), record each as its own `chainId`.
5. **Skip** chains whose only step is unreachable / dead code (no caller can be found).
6. **Do not invent edges** by matching DTO field names — only sequence by actual `.then()` / `await` order.
7. **Do not repeat** a chain. If two screens trigger the exact same ordered step list, keep one chain (use a `chainId` that names the outcome, not the screen).
8. **Endpoint paths recorded VERBATIM (MANDATORY).** Discovered endpoint method+path strings MUST be copied character-for-character from the UI source — do NOT "correct" apparent typos (e.g., `/ipping/retrieveClientIp` looks like it should be `/shipping/retrieveClientIp`, but the UI literally calls the former and the API gateway is configured to accept that exact string). The UI source is the ground truth for what the running app actually transmits. When a path looks suspicious, attach `note: "literal-source-string"` to the chain step (and to the screen-endpoint entry in 1d) and proceed. Auto-correcting one of these silently produces tests that 404 against the real backend.
9. **`evidenceSource` (RECOMMENDED).** Each `apiChain[].steps[]` SHOULD carry `evidenceSource: "<workspace-relative-path>:<line>"` pointing to the UI file/line that issues the call (typically the `let url = ...` or `fetch(...)` line in the API client module). The dashboard renders this as a tooltip on the endpoint code so reviewers can audit the discovery in one click.

10. **Chain-Field Auto-Derivation — MANDATORY chain-level `capture[]` AND `inject[]` blocks (HARD RULE — generic, app-agnostic).** After determining step ORDER (rules 1–9 above), the catalog producer MUST also derive the per-field DATA FLOW between steps and write BOTH a `capture:` and an `inject:` block at the chain level. Declaring step order without field wiring is a HARD FAILURE — downstream consumers (api-tests, functional-tests) need both blocks to chain calls correctly without re-deriving them at every regen. Procedure (run once per chain, BEFORE writing the catalog):

   1. **Build the producer field map.** For each step `s` whose `target` is `backend`, locate the response DTO/schema (OpenAPI in `knowledge-base/api/`, Java `@JsonProperty` on `*Response` classes, .NET `[DataMember]`, Python Pydantic response models, TS `interface *Response`, JSON-schema files). Record `producerFields[s] = { fieldName: jsonPath }` (default `$.<fieldName>` for top-level scalars; nested paths derived from schema, never guessed).
   2. **Build the consumer field map.** For each step `c`, locate the request DTO/schema (`*Request` classes, `@RequestBody`, request body schemas). Record `consumerFields[c] = { fieldName: requiredFlag }`.
   3. **Three-way intersect for each (producer s, consumer c) where `s` precedes `c`:** for every `fieldName` in `producerFields[s] ∩ consumerFields[c]`, verify the caller-side data flow (the same `.then(callback)` / `await` traversal as rule 1c) actually passes the field from response to request. Literal source evidence required (e.g. `SaveOrderDetails(response.data)`); name-match alone is insufficient.
   4. **Emit chain-level `capture[]`** — one entry per matched producer field: `{ fromStep: <s>, field: "<fieldName>", as: "<canonicalName>" }`. Producer field name = canonical, unless caller-side renames it (`as:` is the renamed key).
   5. **Emit chain-level `inject[]`** — one entry per matched consumer field: `{ intoStep: <c>, field: "<consumerRequestFieldName>", from: "<canonicalName>" }`. The `from:` value MUST exactly match a `capture[].as` value on the same chain OR a `stubs.<svc>.<field>` key (cross-service, see G7).
   6. **Write a `_derivedFrom:` audit comment** above each chain block citing producer DTO `file:line`, consumer DTO `file:line`, caller-side data-flow `file:line`. Auditable without re-running discovery.
   7. **HARD STOP conditions (do NOT fabricate):**
      - Step has zero detected producer fields → leave `capture: []`, add `_derivationGap: "no producer schema found at <searched paths>"`, surface in `catalog-gaps.yaml`. Do NOT invent.
      - Downstream consumer requires field with no upstream producer AND no `stubs.<svc>.<field>` exists → emit `stubs.<consumerSvc>.<fieldName>: "TODO-PROVIDE-VALUE"` with comment `# TODO: cross-service value from <producer or external>` AND emit `inject: { intoStep: <c>, field: "<fieldName>", from: "stubs.<svc>.<fieldName>" }`. Cross-service bridge per G7.
      - Two producers in same chain declare same `fieldName` → LATER wins; record earlier with `as: "<fieldName>_step<n>"` so neither is silently dropped.
   8. **Idempotency on re-run:** preserve user-edited `capture[]`/`inject[]` entries; only ADD newly-discovered (matched on `(fromStep, field)` / `(intoStep, field)`).

   Framework-agnostic: relies only on (a) request/response DTO shape, (b) caller-side `.then`/`await` order, (c) name + position matching. Apigee/Lambda/nginx hops documented separately via `via[]` (G7c) and do NOT affect derivation — wire-level body fields are unchanged by transparent proxies.

### 1d. Per-screen API call list (business-logic attributed, drives Screen Flow)

For each route component, list the endpoints **originated** by that screen — NOT every endpoint reachable from its subtree. "Originated" means the screen contains the user action (submit / next / pay click) whose handler is the **first** caller of that endpoint in the order chain. Each entry MUST include `target` (`backend|external`).

**Routes come from the router — NOT from screen names (MANDATORY).** Open the UI router (typical files: `App.js`, `App.tsx`, `router.js`, `routes.js`, `main.tsx`, `index.tsx`; framework patterns: `<Route path="...">` for react-router, `{ path: '...' }` arrays for vue-router/Angular, `pages/` directory conventions for Next.js, etc.). For each owning screen, the `route` field MUST be the literal `path` declared in the router for THAT screen's component. Do NOT shorten, prettify, normalize, or invent route paths from screen-component names. If multiple `<Route>` declarations share the same component (i18n duplicates, alias paths), pick the **canonical English one** (the one without language qualifiers like `/es/`, `/fr/`, `/zh/`); record the others under an optional `aliasRoutes: [...]` array on the screen entry.

**Step-variant collapse rule (MANDATORY — prevents duplicate-looking screens).** Some UIs use a multi-step wizard component (typical pattern: `useState(currentStep)` + `switch(step)` + `history.push(URL)` per case) where the SAME step number renders DIFFERENT child screens depending on a runtime flag (e.g. `if (state.isOnlineOrder) push(EMAIL_URL); else push(SHIPPING_URL);`). When you detect this pattern (same parent wizard, same step value, branching `history.push`), record ONE owning screen for that step in the catalog — do NOT emit two rows. Selection rule:

- Pick the screen whose endpoint set is the **superset** of the other (e.g. ShippingInfo calls `validate` + `SaveOrder` + `SaveOrderDetails`; EnterYourEmail calls only `SaveOrder` + `SaveOrderDetails` — ShippingInfo wins because it is the superset).
- On a tie (identical endpoint sets), pick the screen invoked by the `else` / default branch of the discriminator.
- The losing variant is recorded as `_alternativeScreens: [{ screen: "<other-name>", route: "<other-route>", branchCondition: "<flag-name=value>", evidenceSource: "<wizard-component>:<line>" }]` on the winning screen entry. The dashboard reads this and renders a small note under the Step row (e.g. `│ alt branch: EnterYourEmail when isOnlineOrder=true`) — NOT a separate Screen Flow row.
- If the two variants have **disjoint** endpoint sets (each owns endpoints the other does not), they are NOT step-variants — they are two distinct screens that happen to share a wizard. Record both rows.

For each route component, list the endpoints **originated** by that screen, attributed per the rules above.

**Single-owner rule (this is business logic, do not skip):**

- Each `{ method, path }` from `activeEndpoints[]` is attributed to **exactly one** owning screen across the whole catalog.
- The owner is the screen whose submit/commit handler is the **entry call** of the chain that contains this endpoint (see 1c). Re-renders, mount-time refetches that re-issue an already-owned endpoint, and read-after-write polling do NOT create new owners.
- Order-mutating endpoints (e.g. anything that creates, finalizes, or updates the persisted record — typical patterns: `Create*`, `Save*`, `Submit*`, `Finalize*`) are owned by the **commit screen** in their chain (the screen whose user action causes the mutation), even if downstream confirmation screens display data derived from them.
- Read-only / lookup endpoints (e.g. `Get*Status`, `Search*`, `Lookup*`) may legitimately be owned by multiple screens IF each screen issues the call independently as the entry call of its own chain. Do not collapse these.
- Build the catalog by walking `apiChain[]` first; `uiScreens[].endpoints` is then a projection of those chains onto their originating screens. **Never** populate `uiScreens[].endpoints` by scraping the screen's component subtree mechanically.
- **Single-owner duplicate-detection pre-flight (MANDATORY before write).** After projecting chains onto screens, build a flat list of all `(uiScreens[i].screen, uiScreens[i].endpoints[j].endpoint)` pairs. Group by canonical endpoint string (uppercased METHOD + path, no target tag). Any endpoint that appears under MORE than one screen MUST be reduced to its single first-caller owner per the rule above; the LATER screens lose the entry. Common false-positive trigger: the same `import SaveOrder` appears in `EnterYourEmailScreen.js` AND `ShippingInfoScreen.js` because both submit handlers call it. The owner is the screen that fires it FIRST in the user journey (use the route order from the UI router config + apiChain[] sequencing to determine "first"); the later screen owns ONLY the endpoints unique to its own submit handler. If the first-caller is genuinely ambiguous (no route order discoverable, no apiChain[] linkage), STOP and ask the user `❓ Endpoint <ep> is called by both <screen-A> and <screen-B>. Which screen is the first caller in the user journey? (single-owner rule)`. Each `evidenceSource` (rule 9 above) recorded on a screen-endpoint entry should point to the actual line in THAT screen's component source where the call is invoked, not just the API client module — this lets reviewers verify the single-owner attribution.
- **Per-endpoint `evidenceSource` on `uiScreens[].endpoints[]` (RECOMMENDED).** Each entry SHOULD carry `evidenceSource: "<screen-component-path>:<line>"` pointing to the line in the screen's React/Vue/etc component where the API client function is invoked (typically the line containing `apiName(...)` inside a submit handler). This is the auditable proof of single-owner attribution.

**Deduplicate across the workspace**: if multiple screen components share the same API call set (e.g. `RequestTypeA` and `RequestTypeB` both make zero calls; `VerifyVariantA` and `VerifyVariantB` both call only `LookupStatus`), record them under ONE generic screen name (`Verify`) — do not list both.

**Distinguish from single-owner rule:** the dedup rule above collapses *screen-name* variants that have *identical* call sets; the single-owner rule above prevents *the same endpoint* from appearing under *different* screens. Both run; they are not in conflict.

Generic naming rules:

- Strip product/state qualifiers when the API call list is identical: `VerifyVariantA` + `VerifyVariantB` → `Verify`.
- Strip product qualifiers when calls are identical across products: `RequestTypeA` + `RequestTypeB` + `RequestTypeC` (all `endpoints: []`) → drop entirely (no endpoints = no row).
- Screens with no API calls at all MUST NOT appear in the catalog's `uiScreens` (they're not interesting for the dashboard).

> User journeys (whatever flows the workspace happens to expose) are NOT a separate dashboard section in this version. Discover them silently if useful for chain attribution, but do not write a `userJourneys` array — the catalog only carries `uiScreens` and `apiChain`. (No app-specific flow names appear anywhere in this prompt — names are runtime-discovered.)

### 1e. Classify identity pools (decides what to ASK vs DERIVE)

Scan auth middleware, security config, and request DTOs to find finite pools. Then **classify** each pool.

**Pool field completeness (MANDATORY — cross-reference existing collections):** Before finalizing each pool's `fields[]` list, scan ALL existing collection files (`*-service*/api-tests/collections/*.json` and `*-ui*/functional-tests/**/*.spec.*`) for `{{catalog.identityPool.<poolType>.<field>}}` token references. Every `<field>` referenced by a collection token MUST appear in the pool's `fields[]` list — regardless of whether the DTO scan discovered it. This is the most common cause of `data-issue` failures: `setup-testdata` discovers pool fields from DTOs but misses fields that `generate-api-tests` later references (e.g., `firstName`/`lastName` needed by a downstream service but absent from the initially-scanned service's DTO). On re-run, if existing collections reference fields not in the pool's current `fields[]`, APPEND those fields and prompt the user to provide values for them.

Then **classify** each pool:

| Class | What it means | Action |
|---|---|---|
| `external-required` | Value is verified by an outside system or shared across runs and CANNOT be invented (gov-ID + state + DOB, login credentials, API keys, payment cards, recipient emails, pre-existing order/tracking numbers) | **ASK the user in Step 2** |
| `upstream-generated` | Value is produced by an earlier endpoint or platform (e.g. `{businessId}` from a `Create*`/`Save*` endpoint, `sessionId` from login) | Do NOT ask. Mark `records: []` and let the runner capture from upstream response |
| `derivable-from-ui` | Pool fields appear only in UI form schemas (yup/zod) — runner can synthesize from the form's validation rules at test time | Do NOT ask. Mark `records: []` |

Display the classified pools to the user before doing anything else.

---
