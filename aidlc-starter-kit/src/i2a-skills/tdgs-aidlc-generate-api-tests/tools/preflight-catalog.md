# Pre-flight: Test Data Catalog

## Pre-flight Check: Read Test Data Catalog (MANDATORY When Available)

> ⚠️ **BEFORE generating any test payloads**, search the workspace for `test-data/test-data-catalog.yaml` (typically in `*-docs*/test-data/test-data-catalog.yaml`). This catalog is created by `/tdgs-aidlc-setup-testdata` and contains exactly THREE top-level sections (the simplified catalog schema):
> - `apiChain[]` — sequenced API chains, each with `chainId`, ordered `steps[].endpoint + target`, and an explicit `capture[]` array of `{ fromStep: <0-based index>, field: <response field>, as: <captured token name> }` entries. Producer-consumer order is the `steps[]` order; capture wiring is read directly from `capture[]` (the producer step is `steps[fromStep]`; downstream steps consume the value via `{{captured.<as>}}`).
> - `uiScreens[]` — per-screen API call inventory (`screen + route + endpoints[].endpoint + endpoints[].target`). Used by tests to map screen-driven flows.
> - `identityPools[]` (TOP LEVEL — NOT nested under `staticMandateData`) — each pool has `poolType`, `class` (`external-required` | `upstream-generated` | `derivable-from-ui`), `providedBy`, `fields[]`, `usedIn[]`, `quarantineThreshold` (default **5**), and `records[]` carrying `fields{}` + lifecycle counters (`status`, `consumedCount`, `failureCount`, `consecutiveFailureCount`).
>
> The catalog deliberately **does NOT** include: `dynamicFields`, `requiredFieldsByPayload`, `dataDependencies`, `businessConstants`, `endpointVersionMap`, `businessRules`, `recordTypeVariants`, `globalStateShape`, `staticMandateData` (any of these from prior versions). Field-level realism is now derived from MODEL classes (request/response DTOs) at generation time, not from catalog metadata. Chaining is read from `apiChain[].capture[]` (the canonical source) — the producer step is `steps[fromStep]` and the captured value is exposed as `{{captured.<as>}}` for any later step in the same chain that needs it; if `capture[]` is empty for a chain, no automatic capture/inject wiring is generated for that chain.
>
> **IF CATALOG FOUND — ALL of the following are MANDATORY (not suggestions):**
>
> 1. **Read `identityPools[]`** — for every endpoint whose model declares fields (PII, credentials, government IDs) that match a pool's `fields[]` AND the pool's `class === 'external-required'`, you MUST insert catalog token references in payloads — but **ONLY for fields that exist in the model class** (see "Request Model Field Extraction" in Phase 2):
>    ```json
>    "{modelFieldName}": "{{catalog.identityPool.{poolType}.{catalogFieldName}}}"
>    ```
>    The JSON key is the MODEL field name; the token path uses the CATALOG field name from `pool.fields[]`. These may differ — verify both sides.
>
>    **Pool name accuracy (MANDATORY — #1 cause of `data-issue: unrecognized catalog token` failures):** The `{poolType}` in every emitted `{{catalog.identityPool.{poolType}.*}}` token MUST be the EXACT `poolType` string as it appears in the catalog YAML's `identityPools[].poolType` field. Do NOT invent pool names, do NOT rearrange words (e.g., the catalog says `contact-email` → use `contact-email`, NOT `email-contact`). Before emitting any catalog token, look up the actual pool name from the loaded catalog. A pool name mismatch causes the runner to fail with `unrecognized catalog token` because it cannot find a pool matching the fabricated name.
>
>    **Pool-field existence check (MANDATORY — #2 cause of `data-issue: unresolved catalog token` failures):** Before emitting `{{catalog.identityPool.<pool>.<field>}}`, verify that `<field>` is LITERALLY listed in that pool's `fields[]` array (or exists as a key in `records[0].fields{}`). If the field does NOT exist in the pool, do NOT emit a catalog token for it. Instead, continue walking the 9-step Field Value Resolution Chain from where you left off — the field falls through to whatever step produces a datatype-appropriate value:
>    - String name fields → step 8 faker (`{{$randomFirstName}}`, `{{$randomLastName}}`, etc.)
>    - Email → step 8 faker (`{{$randomEmail}}`) or step 9 (`"noreply@example.com"`)
>    - Phone → step 8 faker (`{{$randomPhone}}`) or step 9 (`"555-0100"`)
>    - Numeric/ID fields → step 7 constraint-aware or step 9 type-default (`{{$randomInt}}`, `0`)
>    - Date fields → step 7 constraint-aware (`"01-Jan-2000"`) matching service format
>    - UUID fields → step 8 (`{{$randomUUID}}`)
>    - Any other type → continue the chain per its datatype until a step fires
>
>    **NEVER emit a catalog token for a field that does not exist in the referenced pool — this produces an unresolvable token at runtime.** The token `{{catalog.identityPool.poolX.fieldY}}` is ONLY valid when `poolX.fields[]` contains `fieldY`. If it doesn't, the runner cannot resolve it and the test fails with `TokenResolutionError` or sends the literal token string to the server.
>
>    **NEVER reference a DIFFERENT pool that happens to expose the field but is semantically wrong for the test case** (e.g., do NOT use `identity-out-of-state.firstName` in an in-state requestor test just because that pool has `firstName` — the test's identity context would be wrong).
>
>    **Cross-service pool guard (MANDATORY — prevents wrong-service pool references):** Before emitting a `{{catalog.identityPool.<pool>.<field>}}` token, check the pool's `usedIn[]` endpoints. If ALL endpoints in `usedIn[]` belong to a DIFFERENT service than the one being generated, AND the pool's `class` is NOT `external-required` with shared-DB semantics, do NOT emit tokens from that pool. Instead, evaluate whether the field is a cross-service dependency per G7: (a) if the value can only come from another service's response, use `{{catalog.stubs.<currentSvc>.<field>}}` from `test-data-catalog.yaml.stubs` (or `TODO-PROVIDE-VALUE` until the user supplies a known-good value); (b) if the user provides a hardcoded known-good value for that field (e.g., a real order number from a pre-existing DB record), use it directly. Example failure mode: receipt service needs `orderNumber` from orderdetails service → generator incorrectly references `{{catalog.identityPool.order-status-lookup.orderNumber}}` (a TxEVER pool meant for a completely different workflow) → test sends wrong order number → 500 from server.
>
>    **Indirect catalog pool usage (MANDATORY):** A catalog pool's `usedIn[]` identifies which WORKFLOW ENDPOINT needs the data — it does NOT mean the token belongs in that endpoint's request body. The `{{catalog.identityPool.<pool>.<field>}}` token MUST be placed in whichever service's request DTO actually CARRIES a matching field. Algorithm: for EVERY catalog `identityPool`, iterate its `fields` (or `records[0]` keys). For EACH field, scan ALL request DTOs across ALL services being generated. If a DTO field name matches (case-insensitive, ignoring nesting depth), emit the catalog token there — even when `usedIn[]` names a completely different service or endpoint. Common example: a shared-DB pattern where service A's DTO writes the value to the database and service B reads it back without ever receiving it in its own request body. The token goes in service A's payload. Never hardcode a literal when a matching catalog pool field exists.
>
>    **ALWAYS use `{{catalog.identityPool.*}}` tokens for ALL identity pool fields that have a matching model field — whether records contain real data or `PLACEHOLDER_*` values.** Do NOT hardcode identity values. Tokens are resolved at runtime by the test-runner reading the catalog YAML, which enables:
>    - **Pool rotation** — different identity record used per run (round-robin)
>    - **Reuse + quarantine** — on PASS the record stays `available` (`consumedCount++`, `consecutiveFailureCount = 0`); on FAIL `failureCount++` and `consecutiveFailureCount++`; quarantined ONLY at `consecutiveFailureCount >= pool.quarantineThreshold` (default **5**)
>    - **Soft-stop on exhaustion** — when no `available` record exists for a pool, only the tests needing that pool are marked `data-issue` and skipped; other tests continue
>    - **Ledger audit trail** — every consumption recorded in `test-data/ledger.yaml` (writer = orchestrator, NOT the per-test runner)
>
>    Pool `class` interpretation:
>    - `external-required` — values must come from the catalog (real records pasted by user, or `PLACEHOLDER_*` until populated). Use `{{catalog.identityPool.*}}` tokens.
>    - `upstream-generated` — values come from a prior chain step's response (use `{{captured.*}}` tokens after wiring `capture` from the producer step). **SCOPE GUARD:** This applies ONLY when ALL of the following are true: (a) the current endpoint is listed in the pool's `usedIn[]`, (b) the producer and consumer are in the SAME `apiChain[]` entry as adjacent or ordered steps, and (c) no external/Apigee step intervenes between them in that chain. If ANY condition fails, do NOT wire a capture — fall through to later resolution steps (KB example, business rule, constraint-aware literal, etc.). A field sharing the same name as a pool field does NOT automatically create a chaining dependency.
>    - `derivable-from-ui` — the catalog stores `records: []` for these pools INTENTIONALLY (see `/tdgs-aidlc-setup-testdata` Hard Rule #17). Do NOT emit `{{catalog.identityPool.<derivable-pool>.*}}` tokens — the runtime resolver has nothing to bind them to and will throw `TokenResolutionError`. Instead, fill the field at GENERATION TIME via the decision tree's typed-placeholder fallback (see Pre-flight item 3 typed-placeholder rule). For functional tests the equivalent path is the decision tree's `ui-source` rule (read UI Yup/Zod schemas).
>
> 2. **Read `apiChain[]` to wire chaining** — for every chain entry, the catalog already declares the capture wiring in `capture[]`. For each `{ fromStep, field, as }` entry: the producer is `steps[fromStep]` (its response field `field` is captured under name `as`); every later step in the same chain whose request model declares a same-named field consumes it via `{{captured.<as>}}`. Verify the producer's response model actually exposes `field` and the consumer's request model declares the receiving field; if either is missing, surface a discovery warning and ask the user (do NOT silently invent the wiring). Then emit `capture` on the producer request and an `inject` + `{{captured.<as>}}` token in the consumer body:
>    ```json
>    "capture": { "{valueName}": "$.{jsonPath}" }
>    "inject": { "{fieldInBody}": "{{captured.{valueName}}}" }
>    ```
>    **CONCRETE EXAMPLE — a 2-step chain (Create → Use):**
>    ```json
>    {
>      "_type": "request",
>      "_id": "req_create_resource",
>      "name": "POST /resources - Create resource (chain step 1)",
>      "method": "POST",
>      "url": "{{ base_url }}{{ context_path }}/resources",
>      "body": { "mimeType": "application/json", "text": "{\"name\":\"test-item\",\"type\":\"standard\"}" },
>      "headers": [{ "name": "Content-Type", "value": "application/json" }],
>      "capture": { "resourceId": "$.id" }
>    },
>    {
>      "_type": "request",
>      "_id": "req_process_resource",
>      "name": "POST /resources/process - Process resource (chain step 2)",
>      "method": "POST",
>      "url": "{{ base_url }}{{ context_path }}/resources/process",
>      "body": { "mimeType": "application/json", "text": "{\"resourceId\":\"{{captured.resourceId}}\",\"action\":\"activate\"}" },
>      "headers": [{ "name": "Content-Type", "value": "application/json" }],
>      "inject": { "resourceId": "{{captured.resourceId}}" }
>    }
>    ```
>    Order requests so capture-providers appear BEFORE inject-consumers in the collection. Do NOT hardcode chained values — they MUST be captured from upstream responses.
>
> 3. **Field Value Resolution Chain (MANDATORY — addresses "no leftover variables" and "no naive `placeholder-string` literals"):** For EVERY model field on a positive test, the value emitted MUST resolve via this 9-step chain. Walk the chain in order and STOP at the first hit. The historical name "Typed-Placeholder Fallback Rule" now refers to steps 7–9 (last-resort literals).
>
>    | Step | Source | When it fires | Example | Tag |
>    |---|---|---|---|---|
>    | 1 | `catalog.identityPools[].records[].fields{}` (class `external-required`) | A pool's `fields[]` lists this model field | `{{catalog.identityPool.driver.licenseNumber}}` | `catalog` |
>    | 2 | `apiChain[]` upstream step's response model | An earlier step **in the same `apiChain[]` entry** produces this field AND the current endpoint is in the producer pool's `usedIn[]` AND no external step intervenes between producer and consumer in that chain | `{{captured.referenceId}}` | `chain-capture` |
>    | 3 | KB OpenAPI `example` / `examples` / `default` / `enum[0]` (`knowledge-base/api/<service>-openapi.yaml`) | Schema declares an example or enum | `"{AGENCY}"` from `enum:[{AGENCY_LIST}]` | `kb-openapi-example` |
>    | 4 | KB business-rules-catalog (default path `knowledge-base/business/business-rules-catalog.md`; if absent, glob `knowledge-base/**/*rules*.md`, `knowledge-base/**/*validation*.md`) — rule-stated constants, calculation inputs, sample values | A BR-### rule pins the field to a constant or sample value | `"<APP_KEY>"` from a rule like "BR-001: applicationId is always <APP_KEY>" (the actual value is read from the workspace KB — NEVER hard-coded in this prompt) | `kb-business-rule` |
>    | 5 | KB data-dictionary / glossary (default paths `knowledge-base/business/data-dictionary.md`, `knowledge-base/shared/data-dictionary.md`; if absent, glob `knowledge-base/**/*dictionary*.md`, `knowledge-base/**/*glossary*.md`) | Field has a documented semantic + sample/default | `"TX"` from "state codes — project default TX" | `kb-data-dictionary` |
>    | 6 | UI source — Yup/Zod/Joi schema defaults, form `initialValues`, dropdown option lists in `{ui-repo}/src/**` | UI hard-codes a default or constrained option set | `"Express"` from UI dropdown options | `ui-default` |
>    | 7a | **DAO/Service implementation scan (MANDATORY for nested-object and format inference)** — open the DAO/Repository/ServiceImpl class that handles this endpoint. Scan for: (a) `.getNestedObject().getField()` dereference chains → the parent nested object is STRUCTURALLY REQUIRED regardless of `@NotNull`; (b) `CHAR(1)` column binds → field is a single-char flag (Y/N/0/1); (c) raw string binds to Oracle `DATE` columns without `TO_DATE()` → field uses `NLS_DATE_FORMAT` (typically DD-Mon-YYYY); (d) `field-format-map.json` entries. This step establishes the REAL wire contract that annotations alone cannot express. | DAO dereferences field or binds to typed column | `getMatchingInfo().getX()` → matchingInfo is structurally required; `CHAR(1 BYTE)` → Y/N flag; raw DATE bind → DD-Mon-YYYY | `dao-inferred` |
    | 7b | Constraint-aware literal — read DDL `CHECK` (`*.sql`), `@Pattern`, `@Size(min,max)`, `@Email`, `@JsonFormat(pattern=...)`, Oracle DAO date format (per existing rule) and emit a value that SATISFIES the constraint | Field has a constraint annotation or DDL constraint | `@Pattern("^[A-Z]{2}$")` → `"XX"`; `CHAR(1) CHECK IN ('Y','N')` → `"N"`; `@JsonFormat("dd-MMM-yyyy")` → `"01-Jan-2000"` | `constraint-aware` |
>    | 8 | Faker / Insomnia built-in (NON-PII only — see PII rule below) | Optional non-PII filler (city/street/zip/uuid/timestamp) | `{{$randomStreetAddress}}`, `{{$randomUUID}}` | `faker` |
>    | 9 | Type-default literal (LAST RESORT — KB and constraints silent) | All above silent | `String→"placeholder-string"`, `Integer/Long→0`, `Double/BigDecimal→0.0`, `Boolean→false`, `LocalDate→"2026-01-01"`, `LocalDateTime/Instant→"2026-01-01T00:00:00Z"`, `Email→"noreply@example.com"` (RFC 2606 reserved), `Phone→"555-0100"`, `UUID→"00000000-0000-0000-0000-000000000000"`, `Enum→first declared value` | `type-literal` |
>
>    **Step 7 examples (constraint-aware + DAO-inferred — ALWAYS prefer over step 9 type-literals when ANY constraint is present):**
>    - `@Pattern("^[A-Z]{2}$")` → `"XX"` or first enum; `@Email` → `"noreply@example.com"` (RFC 2606); `@Size(min=10,max=10)` numeric → `"5550100000"`; `@JsonFormat(pattern="dd-MMM-yyyy")` → `"01-Jan-2000"`.
>    - DDL `CHAR(1) CHECK IN ('Y','N')` / `CHAR(1 BYTE)` flag column → `"Y"`/`"N"`. `VARCHAR2(10)` phone → `"5550100000"` digits-only.
>    - Oracle raw `String→DATE` bind without `TO_DATE()` → `"DD-Mon-YYYY"` (e.g., `"11-Sep-1970"`).
>    - DAO does `parent.getNestedObject().getField()` without null-check → nested object is STRUCTURALLY REQUIRED → include in positive payload even without `@NotNull`.
>    - Controller guard `if (x == 0) throw ...` → first realistic positive value (e.g., `1`), NEVER `0`.
>    - `field-format-map.json` entry exists → use the declared `to` format.
>
>    **Nested-object recursion (MANDATORY — R10-C2):** When a model field is itself a nested DTO, recursively apply the 9-step chain to EVERY leaf field. NEVER emit `{}` for a `@NotNull` nested object. **ALWAYS open the nested DTO's source file** — KB OpenAPI commonly flattens, renames, or omits nested fields. Optional nested DTO with no KB/catalog/chain source: minimal/negative variants MAY emit `null`; the DEFAULT positive test MUST populate ALL leaf fields (`""` for Strings without `@Size(min=1)`, typed-placeholder otherwise). Rationale: legacy JdbcTemplate services dereference nested objects unconditionally → omit = NPE → 500. The DAO is the source of truth for structural requirements, NOT `@NotNull` alone.
>
>
>    **Canonical PII regex (MANDATORY — the SINGLE source of truth referenced by Pre-flight item 3, Section 4 Payload Realism Mandate, and Check 14 Part B):** `/(^|_|\b)(ssn|socialsecuritynumber|sin|socialinsurancenumber|nino|ninumber|nationalinsurance|cpf|curp|rut|bsn|aadhaar|aadhar|pan|nric|ic_no|hkid|myki|dob|dateofbirth|birthdate|firstname|lastname|middlename|fullname|maidenname|mothername|fathername|spousename|driverlicense|dlnumber|stateid|nationalid|passport|taxid|tin|email|emailaddress|phone|phonenumber|mobile|mobilenumber|fax|gender|race|ethnicity|iban|bankaccount|creditcard|cardnumber)($|_|\b)/i`
>
>    **Address fields are NOT PII** for the purpose of this regex (`address`, `street`, `streetaddress`, `addressline*`, `city`, `state`, `zip`, `zipcode`, `postalcode`, `country`). Synthetic faker addresses do NOT correspond to real people; they are safe to use as non-PII filler PROVIDED no `external-required` pool exposes the field. If a pool exposes an address field, rule 1 (catalog) still wins for that field. This intentional carve-out resolves the contradiction between earlier prompt versions that listed address tokens as both PII (no-faker) AND non-PII filler (faker allowed).
>
>    **PII rule:** for fields whose name matches the canonical regex above, prefer a `{{catalog.identityPool.*}}` token if ANY pool exposes that field. If no pool exposes it, fall back to a deterministic NON-real typed placeholder (e.g., `"noreply@example.com"` (RFC 2606 reserved domain — never `"placeholder@example.test"`, some validators reject the `.test` TLD), `"555-0100"`) — NEVER faker for PII (faker risks accidentally matching a real person and contacting real third parties).
>
>    **HARD RULE — NO leftover unresolved variables in request bodies.** The runner enforces this with `TokenResolutionError`, but generation MUST guarantee resolvability up front. Allowed runtime tokens (resolved by the test-runner before send): `{{catalog.identityPool.*}}`, `{{captured.*}}`, Insomnia built-ins (`{{$timestamp}}`, `{{$randomUUID}}`, `{{$randomInt}}`, `{{$isoTimestamp}}`), and the closed faker token list (`{{$randomFirstName}}`, `{{$randomLastName}}`, `{{$randomEmail}}`, etc. — see `/tdgs-aidlc-setup-api-tests` Section 5 token reference). EVERY other `{{...}}` token in a body is a generation bug. **Runtime exemption for chain captures:** when a `{{captured.<as>}}` token resolves to `undefined` because the producer step returned 4xx/5xx OR the JSONPath did not match the actual response shape, the runner classifies the dependent test as `infra` (HTTP error from producer) or `data-issue` (JSONPath miss / shape mismatch) — NOT `TokenResolutionError`, NOT `fail`. Generation still emits the capture exactly as inferred from KB/DTO; runtime classification surfaces shape drift via the dashboard's existing `infra` and `data-issue` tiles. The developer fixes the JSONPath in the collection; no catalog flag, no two-phase workflow.
>
>    When step 7, 8, or 9 of the resolution chain is used for a positive test, tag the test description with `(field-source: <tag> for <fieldA>, <fieldB>)` so the report can classify the test correctly. The legacy tag `(uses typed-placeholder for <field>)` remains valid for steps 7 and 9 (back-compat with existing reports/checks).
>
> 4. **Display in discovery output:**
>    ```
>    📋 Test data catalog found — USING identityPools (record-based) + apiChain (chain order) + uiScreens (screen→endpoint map)
>    ```
>
> **IF CATALOG FOUND — MANDATORY VERIFICATION (before proceeding past this section):**
> After reading the catalog, immediately display a verification summary:
> ```
> ✅ Catalog loaded: {N} identityPools ({M} records total), {N} apiChain entries ({M} steps total), {N} uiScreens
>    Chains to wire (capture/inject pairs): {list each chain's steps in order}
>    Identity pools (external-required only): {list pool name + record count}
> ```
> **If `apiChain[]` defines multi-step chains and you have NOT added `capture`/`inject` to any request, STOP and go back. This is the single most common generation failure.**
>
> **CATALOG-vs-RUNNER SCHEMA CONSISTENCY CHECK (MANDATORY):** Before emitting `{{catalog.identityPool.*}}` tokens, verify each `{service-repo}/api-tests/scripts/test-runner.js` reads pools from top-level `catalog.identityPools` (keyed by `pool.poolType`, with `pool.type` fallback) AND reads each value from `record.fields[fieldName]` (with `record[fieldName]` fallback). If any runner is stale, surgically patch in place — do NOT regenerate. Display: `🔧 Detected stale test-runner.js in <repo> — self-healed pool-lookup paths.` Without this check, every catalog token surfaces as 4xx/5xx (literal token string sent to server).
>
> **PER-FIELD VALUE VERIFICATION PROCEDURE (MANDATORY — applies to EVERY field in EVERY positive-test request body, BEFORE the P0–P6 tier decision):**
>
> A single format mismatch on a persisted field (e.g., date sent as `MM/DD/YYYY` to an Oracle raw-bind DAO) causes the DB INSERT to fail → `capture` gets no value → every downstream chained test sees `<UNCAPTURED:...>` → cascade. Different services may need different formats for the SAME logical field; the catalog stores ONE canonical — generation must adapt.
>
> **Step 1 — Determine the service's accepted format** by tracing controller → service → DAO → DB. Stop at the first definitive answer from: DTO annotations (`@JsonFormat`, `@Pattern`, `@Size`, `@Email`, `@DateTimeFormat`, enum) → DAO bind statements (raw vs `TO_DATE/TO_NUMBER/TO_TIMESTAMP_TZ` wrapper, `SimpleDateFormat`, `DateTimeFormatter.ofPattern`) → DDL (`VARCHAR2(N)`, `CHAR(N)`, `NUMBER(p,s)`, `CHECK(col IN(...))`) → DB session defaults (Oracle `NLS_DATE_FORMAT=DD-MON-RR`, PostgreSQL ISO-8601, MongoDB ISODate) → UI payload builder for the same endpoint → KB OpenAPI schema (`format`, `pattern`, `example`).
>
> **Step 2 — Determine the catalog's stored format** (when a pool exposes the field) by inferring from the value pattern: `01/19/1961`→MM/DD/YYYY, `19-Jan-1961`→DD-Mon-YYYY, `1961-01-19`→ISO, 9-digit→full SSN, 4-digit→last 4, `PLACEHOLDER_*`→not real.
>
> **Step 3 — Compare and decide:** match (or no constraint) → emit `{{catalog.identityPool.<pool>.<field>}}` (P0). Mismatch with runner `fieldFormatMap` coercion → emit token + verify coercion (P0 `catalog-with-coercion`). Mismatch without coercion, OR semantic mismatch (catalog `ssnLast4` vs model full SSN) → DO NOT emit; fall through P2→P3→P4→...→P6.
>
> **Step 4 — Record in the Per-Field Provenance Table.** `source ref` MUST cite code location (e.g., `{Dao}.java:{line} raw bind :{PARAM}`, `DDL {table} CHAR(1) CHECK IN ('Y','N')`).
>
> **Examples (generic):** Catalog `01/19/1961` + DAO raw bind to Oracle DATE → service format = `DD-Mon-YYYY` → reject catalog at P0; emit `"19-Jan-1961"` at P4. Catalog `01/19/1961` + DAO `TO_DATE(:DOB,'MM/DD/YYYY')` → emit catalog token at P0. Catalog `ssnLast4: "0005"` + model `String ssn` (9 digits) → semantic mismatch → emit `"555010005"` at P6.
>
> **IF CATALOG NOT FOUND — CONFIRMATION GATE (MANDATORY):** Display options 1 (proceed with typed-placeholder values) or 2 (stop — run `/tdgs-aidlc-setup-testdata` first), and WAIT for user input.
>
>   **If user chooses 1:** proceed with code-scanned values only. Even without catalog, the following STILL apply: chaining is MANDATORY (analyze response/request models for producer/consumer pairs, add `capture`/`inject` + `{{captured.*}}` — NEVER hardcode chained values); response body assertions are MANDATORY for positive tests (`expect(body).to.have.property(...)`); business constants MUST be verified from UI API source code (Source #4 in Ground-Truth Hierarchy — backend constants are often DB-internal, NOT what the UI sends); identity fields use realistic placeholders matching constraints; the Per-Field Value Verification Procedure above STILL applies (DDL widths, `CHECK` domains, DB-driver date format compatibility — e.g., Oracle raw bind without `TO_DATE()` requires `DD-Mon-YYYY` not `MM/DD/YYYY`, else `ORA-01843`; flag columns require `"Y"`/`"N"` not numeric strings, else `ORA-12899`).
>
>   **If user chooses 2:** STOP immediately.
