# Generation Rules (Payloads, Taxonomy, Chaining, Field Values)

### 4. Generate Test Cases Per Service

Update the Insomnia collection and test data files for each service.

> **CRITICAL: Only generate tests for endpoints confirmed in the reconciliation step (Section 3b).** Do NOT generate tests for KB-only endpoints that were skipped during reconciliation. Do NOT generate tests for endpoints not discovered in either KB or code.

#### Payload Realism Mandate (positive vs negative — different rules)

> ⚠️ **Positive and negative tests have OPPOSITE payload-construction rules.** Confusing them is the #2 cause of stale or useless API tests (after model non-compliance).
>
> **Positive tests — populate ALL model fields, not just `@NotNull` ones.** A "minimal" payload satisfies bean validation but rarely exercises real downstream logic — DAO inserts blow up on missing context, mappers NPE on absent nested objects, audit/logging never executes. Every positive test body MUST: (1) include EVERY `@NotNull`/`@NotBlank` field (already enforced by Check 1); (2) include EVERY optional model field — "optional" in bean-validation terms does NOT mean safe to omit (legacy JdbcTemplate services dereference unconditionally → NPE → 500); for String fields without `@Size(min=1)` use `""`, for nested DTOs recursively populate ALL leaf fields; (3) resolve each value via the 9-step Field Value Resolution Chain (Pre-flight item 3); (4) for non-PII filler fields (`city`, `state`, `zip`, `country`, `street*`, `addressLine*`, generic free-text, list/array entries) faker tokens are allowed; (5) **PII / contact / identity fields prefer `{{catalog.identityPool.<pool>.<field>}}` tokens per the canonical PII regex (Pre-flight item 3)** — NEVER faker for PII (faker risks reaching real third parties); (6) faker for non-PII (`{{$randomStreetAddress}}`, `{{$randomCity}}`, `{{$randomState}}`, `{{$randomZip}}`, `{{$randomUUID}}`, `{{$randomInt}}`, `{{$randomDate}}` for non-PII dates ONLY — NEVER `dateOfBirth`/`dob`/`birthDate`). PII-only faker tokens (`{{$randomFirstName}}`, etc.) exist only as last-resort safety net for non-identity contexts.
>
> **Negative tests — chain-independent by design.** Negative/edge tests for chain-consuming endpoints MUST NOT use `{{captured.*}}` (upstream chain failure would skip every downstream negative test exactly when validation coverage matters most). Use a **deterministic invalid identifier** matching the consumer model field's JSON type (HARD RULE — wrong-type sentinel masks the validation defect under test):
> - String field → `"INVALID_999999"`
> - Numeric (`Long`/`Integer`/`BigDecimal`/etc.) → `-999999` or `99999999`
> - UUID/Guid → `"00000000-0000-0000-0000-000000000000"` (nil UUID)
> - Date/DateTime → far-future/far-past valid-format value the system rejects (e.g., `"1900-01-01"` or `"2999-12-31"`)
>
> Document in test name: `"POST /Endpoint - Missing required: foo (uses {sentinel} to bypass chain)"`. Edge-case tests (XSS/SQL injection/path traversal) follow the same rule — chain-independent literals only.

#### Industry-standard negative/edge taxonomy (MANDATORY coverage)

> ⚠️ Negative and edge tests follow a documented taxonomy aligned with **OWASP API Security Top-10 (2023)** and **ISO/IEC/IEEE 29119-4** boundary patterns. For every endpoint with a non-trivial request model, generate at least one test in EACH applicable category below. Missing entire categories is a HARD FAILURE in Check 10 (business rule variant coverage) when those rules exist, and a soft warning otherwise.
>
> | Category | OWASP / ISO ref | Pattern | Folder |
> |---|---|---|---|
> | Missing required field | API3:2023 (Property-level auth) | omit each `@NotNull`/`@NotBlank` field one at a time | Negative |
> | Invalid type | API8:2023 (Misconfig) | send string for `Integer`, integer for `String`, array for object, etc. | Negative |
> | Invalid format | ISO 29119-4 boundary | `@Pattern`/`@Email` violations, malformed dates (e.g., `13/45/2026`), bad UUID | Negative |
> | Boundary — below min | ISO 29119-4 | `@Size(min=N)` → send N-1 chars; `@Min(N)` → send N-1 | Negative |
> | Boundary — above max | ISO 29119-4 | `@Size(max=N)` → send N+1 chars; `@Max(N)` → send N+1 | Negative |
> | Boundary — empty/null | ISO 29119-4 | `""`, `null`, `[]` for list/array required fields | Negative |
> | XSS injection | API10:2023 (Unsafe consumption) | `<script>alert(1)</script>`, `"><img onerror=alert(1)>`, `javascript:alert(1)` in every text field | Edge-Case |
> | SQL injection | API8:2023 (Misconfig) | `' OR '1'='1`, `1; DROP TABLE x;--`, `' UNION SELECT * FROM users--` in every text/numeric field | Edge-Case |
> | NoSQL injection | API8:2023 | `{"$ne": null}`, `{"$gt": ""}` in JSON fields | Edge-Case |
> | Path traversal | API1:2023 (BOLA) | `../../../etc/passwd`, `..\\..\\windows\\system32\\config\\sam` in any path/filename field | Edge-Case |
> | Command injection | API10:2023 | `; rm -rf /`, `&& cat /etc/passwd`, backtick-wrapped command in any shell-interpreted field | Edge-Case |
> | Mass assignment | API6:2023 | inject extra unauthorized field (e.g., `"isAdmin": true`, `"role": "ADMIN"`) the model doesn't expose | Edge-Case |
> | Unicode / encoding edge | ISO 29119-4 | 4-byte UTF-8 (emoji), RTL override `\u202E`, NULL byte `\u0000`, UTF-16 surrogates | Edge-Case |
> | Oversized payload | API4:2023 (Resource consumption) | 1MB string in a single field, 10k array entries | Edge-Case |
> | Auth bypass attempt | API2:2023 (Broken auth) | omit/forge auth header where applicable | Edge-Case |
> | Function-level auth bypass | API5:2023 (Broken function-level authorization) | call admin/elevated-privilege endpoint with a non-admin / unprivileged token; expect 403. Detect candidate endpoints by `@PreAuthorize`/`@RolesAllowed("ADMIN"…)`/policy attributes — generate one test per privileged endpoint with a token that lacks the role | Edge-Case |
> | SSRF — Server-Side Request Forgery | API7:2023 (SSRF) | for any field that accepts a URL/URI/host (`callbackUrl`, `webhookUrl`, `imageUrl`, `redirectUri`, `targetHost`, `proxyUrl`), submit `http://169.254.169.254/latest/meta-data/` (cloud metadata), `http://localhost:22`, `file:///etc/passwd`, `gopher://...`. Detect candidate fields by name regex `/(url|uri|host|callback|webhook|redirect|endpoint)$/i` AND by `@URL` / `@Pattern("^https?://...")` annotations. Expect 4xx with allowlist rejection | Edge-Case |
> | Improper inventory — deprecated/internal endpoint reachable | API9:2023 (Improper inventory mgmt) | for endpoints flagged `legacy` (UI no longer calls but controller still serves) and for endpoints under `/internal/`/`/admin/`/`/debug/`, send a benign request from an unauthenticated context and assert the endpoint either returns 404 (removed) or 401/403 (blocked). Detect by Section 3c filter — every "DROP — legacy" endpoint MUST get one inventory test that proves it is gated, otherwise it is a live attack surface | Edge-Case |
> | HTTP method tamper | API1:2023 | call `POST` endpoint with `PUT`/`DELETE`/`PATCH` to verify 405 | Edge-Case |
>
> Every negative test name MUST encode the category: `"POST /{endpoint-path} - {Category}: {field} {pattern}"`. Example: `"POST /{resource} - Boundary: {field} max-length+1 (N+1 chars)"`. This makes triage and traceability deterministic.

##### Validation-Annotation Coverage Gate (MANDATORY — closes the "6 negatives for 93 annotations" gap)

> ⚠️ **Negative test count is NOT a stylistic choice; it is derived deterministically from the discovered validation annotations.** Generic taxonomy categories above describe HOW to write each negative test; this gate dictates HOW MANY are required.
>
> **Step 1 — Build `validationInventory[]` per endpoint.** During Phase 2 (source-code scan), for every field in every request DTO reached by the endpoint, record each validation rule found. Include both Java/Kotlin annotations (`@NotNull`, `@NotBlank`, `@NotEmpty`, `@Size(min=N,max=M)`, `@Pattern(...)`, `@Email`, `@Min(N)`, `@Max(N)`, `@Digits`, `@Past`, `@Future`, `@AssertTrue`, `@AssertFalse`, custom validators) AND framework-equivalent constraints in other stacks (Pydantic `Field(...)`, FastAPI/Flask validators, .NET `[Required]/[StringLength]/[RegularExpression]/[Range]`, Express/Joi/Zod schemas, etc.). Also include constraints derivable from DDL when the field is persisted directly (`NOT NULL` → missing-required; `VARCHAR2(N)` → boundary above max; `CHECK (col IN (…))` → invalid-enum). Record each entry as `{endpoint, fieldPath, annotation, parameter}`.
>
> **Step 2 — Required-negative-count formula (per endpoint).** Let `V` = number of `validationInventory[]` rows for this endpoint. The collection MUST contain at least the following negative tests:
>
> | Annotation found | Required negative tests |
> |---|---|
> | `@NotNull` / `@NotBlank` / `@NotEmpty` / `NOT NULL` | 1 test — omit (or null) the field, expect 4xx |
> | `@Size(min=N)` (N>0) / DDL min-length | 1 test — send N-1 chars, expect 4xx |
> | `@Size(max=M)` / `VARCHAR2(M)` | 1 test — send M+1 chars, expect 4xx |
> | `@Pattern(regex)` / `@Email` | 1 test — send a value that violates the regex (e.g., `"!!!"` for an alphanumeric pattern), expect 4xx |
> | `@Min(N)` | 1 test — send N-1, expect 4xx |
> | `@Max(N)` | 1 test — send N+1, expect 4xx |
> | `@Digits(integer=I,fraction=F)` | 1 test — send I+1 integer digits OR F+1 fraction digits, expect 4xx |
> | `@Past` / `@Future` | 1 test — send the wrong-direction date, expect 4xx |
> | `@AssertTrue` / `@AssertFalse` | 1 test — send the inverse, expect 4xx |
> | DDL `CHECK (col IN (...))` (and not already enforced by `@Pattern`) | 1 test — send a value outside the allowed set, expect 4xx (or persistence-layer error) |
> | Custom `@<Validator>` | 1 test per documented failure mode in the validator's source |
>
> Multiple annotations on the same field each count separately (e.g., `@NotBlank @Size(min=2,max=10) @Pattern(...)` on one field → 4 negative tests for that field). Required minimum negative test count for the endpoint is the sum.
>
> **Step 3 — Hard gate.** If `count(negative tests for endpoint) < count(validationInventory[] for endpoint)`, the collection FAILS the gate. The Pre-Write Output Contract MUST display this table per endpoint:
>
> ```
> VALIDATION COVERAGE — {METHOD} {path}
>   field            | annotation             | required negative test                 | present?
>   ---------------- | ---------------------- | -------------------------------------- | --------
>   firstName        | @NotBlank              | omit firstName → 4xx                   | ✅
>   firstName        | @Size(min=1,max=50)    | send 51-char firstName → 4xx           | ✅
>   firstName        | @Pattern("^[A-Za-z]+$")| send "123!@#" → 4xx                    | ❌ MISSING
>   email            | @Email                 | send "not-an-email" → 4xx              | ✅
>   ...
>   ----
>   Required: {V}, Present: {P}, Missing: {V-P}    → STOP if missing > 0
> ```
>
> **Step 4 — Cross-cutting categories remain MANDATORY in addition.** The injection / SSRF / mass-assignment / oversized-payload / HTTP-method-tamper categories from the taxonomy above are NOT covered by per-annotation tests; they are still required at least once per endpoint (or per applicable field for the field-targeted ones). The validation-coverage gate is additive, not a replacement.

#### Update `{service-repo}/api-tests/collections/{service-name}.json`:

Organize requests into folders:

```
{service-name} Collection
├── {endpoint-group-1}/
│   ├── Positive/
│   │   ├── GET {path} - Valid request
│   │   ├── POST {path} - Valid payload
│   │   └── ...
│   ├── Negative/
│   │   ├── POST {path} - Missing required field: {field}
│   │   ├── POST {path} - Invalid format: {field}
│   │   ├── GET {path} - Invalid path parameter
│   │   ├── POST {path} - Boundary: field below minimum
│   │   └── ...
│   └── Edge-Case/
│       ├── POST {path} - XSS injection in {field}
│       ├── POST {path} - SQL injection in {field}
│       ├── GET {path} - Path traversal attempt
│       └── ...
├── {endpoint-group-2}/
│   └── ...
└── Workflow/
    ├── Create → Read → Update → Delete (CRUD lifecycle)
    └── ...
```

> **Categorization rationale:** the folder tree above mirrors common enterprise API-test grouping conventions (positive → negative → edge-case → workflow). The grouping enables selective re-runs (e.g., run only `Negative/` during regression triage) and makes the Insomnia sidebar self-documenting. If the service under test has a different natural grouping (e.g., by business domain or by actor role), the agent MAY propose an alternative structure in the Pre-Write Contract for the user's approval.

**Every request must have corresponding `unit_test` resources:**

The collection MUST include `unit_test_suite` and `unit_test` resources — these are what `inso run test` discovers and executes. Without them, `inso` will report "no test suites found" and silently fail.

**Collection resource structure:** see `templates/insomnia-unit-test-resources.json.template`.

> **Optional `requiresEnv` (string array) and `requiresEnvReason` (string)**: declare environments the test can meaningfully execute in. When present, the runner skips the test in any environment not listed, reporting `status: 'skip'` with `error: 'env-blocked: requires [...] but running in <current>'`. Use for tests depending on external payment gateways / identity verification services unavailable locally; DB state that only exists after multi-service flows; third-party callbacks/webhooks. `requiresEnvReason` documents the dependency (runner does not read it). **If `requiresEnv` is not present, the test runs in ALL environments (default).**

**Test code:** See **tools/unit-test-code-patterns.md** and `../tdgs-aidlc-setup-api-tests/tools/insomnia-unit-test-examples.md`. Collection resource shape: `templates/insomnia-unit-test-resources.json.template`.

### Chaining Is MANDATORY When `apiChain[]` Defines Multi-Step Sequences

> ⚠️ **If the catalog's `apiChain[]` section defines a chain (step N produces a value that step N+1 needs), you MUST wire `capture`/`inject` metadata AND use `{{captured.*}}` tokens in request bodies. Hardcoding chained values (like a static reference ID, transaction ID, or any produced value) is a HARD FAILURE.**
>
> **Why hardcoded values fail:**
> - The hardcoded ID may not exist in the database → 404 or 500
> - Even if it exists now, it won't after a database refresh → flaky tests
> - The test proves nothing about the chain — it only proves the endpoint accepts a hardcoded payload
>
> **Chaining implementation checklist:**
> 1. For each chain in `apiChain[]`, walk `steps[]` in order. The order IS the producer→consumer order.
> 2. For each adjacent (producer, consumer) pair, read producer's response model and consumer's request model to identify the matching field name (e.g., producer returns `referenceId`; consumer body needs `referenceId`).
> 3. On the producer's `request` resource: add `"capture": { "{valueName}": "$.{jsonPath}" }` (the JSONPath comes from the response model field's location).
> 4. On the consumer's `request` resource: add `"inject": { "{fieldInBody}": "{{captured.{valueName}}}" }` AND replace the literal value in the body text with `{{captured.{valueName}}}`.
> 5. **Order requests so producers come BEFORE consumers** in the collection.
> 6. The test runner resolves `{{captured.*}}` tokens at runtime — if a producer test fails, consumer tests are automatically SKIPPED (chain failure detection).
>
> **Chain-Field Auto-Derivation (MANDATORY when `apiChain[]` declares step ORDER but omits per-step `capture`/`inject` fields).** Many catalogs declare the screen flow (the order steps run in) but leave `capture: null`/`inject: null` because the human author didn't know the wire-level field name yet. In that case the agent MUST derive both blocks itself — it is a HARD FAILURE to skip wiring just because the catalog row is empty:
>
> 1. **Detect the gap.** For every adjacent `(producer, consumer)` pair in a chain where `producer.capture` is missing/empty AND `consumer.inject` is missing/empty AND the consumer's request body OR the consumer's caller (Workspace Source #4) shows a field whose value cannot be resolved by P0 (catalog) or P3 (KB) or P4/P5 (constraints) → suspect a missing chain wiring.
> 2. **Confirm via three-way intersect.**
>    a. Read producer's response DTO → set `producerResponseFields = {fieldName, jsonPath}` for every leaf field.
>    b. Read consumer's request DTO → set `consumerRequestFields = {fieldName}` for every required leaf field.
>    c. Read the consumer's caller in the client app (Workspace Source #4 step b–d). The caller pattern is almost always `consumerCall({...someResponseFromProducer..., otherStuff})` — find every spread/destructure/property-read of a producer-response variable and record which producer-response key flows into which consumer-request key.
>    d. The intersection (producer response key ∩ consumer request key, validated by caller-side data flow) is the chain field.
> 3. **Emit derived metadata** on both the producer and consumer request resources AND patch the catalog: also append the derived `capture`/`inject` blocks to `apiChain[]` in `*-docs*/test-data/test-data-catalog.yaml` (under the same step) so the next run reads explicit metadata. Each derived block MUST include a `_derivedFrom` audit comment containing the producer DTO file:line, consumer caller file:line, and the matched field name.
> 4. **Provenance row.** Add an entry to the per-endpoint provenance block: `{field, source: "chain-auto-derived", producerCapture, consumerInject, evidenceFiles}`.
> 5. **Failure mode (HARD STOP).** If the agent cannot find a producer-response field that matches a consumer-request field via either name match OR caller-side data flow, the agent MUST NOT fabricate a value AND MUST NOT use a placeholder like `"TODO"` or `"100001"`. It MUST stop and ask the user: "Chain `{name}` declares `{producer} → {consumer}` but I cannot identify which field carries the value. Please add `capture`/`inject` to `apiChain[]` step in the catalog." This is the only correct behavior for an unwired chain — generating a "passing" test that hardcodes a value silently breaks the contract the chain promised to enforce.
>
> **Cross-token-name reference detection (HARD GATE).** Before writing any collection JSON, scan every request body for `{{captured.<name>}}` tokens. For EVERY such token, there MUST exist an upstream request (earlier in the same collection) whose `capture` block declares `<name>`. Any orphan `{{captured.X}}` (no upstream producer) → STOP. Any `capture: { X: ... }` with no downstream consumer → WARN (acceptable but flagged in the provenance audit). This gate catches the failure mode where the agent writes `{{captured.orderNumber}}` in a consumer body but forgets to add `capture: { orderNumber: "$.orderNumber" }` to the producer.
>
> **Example — a 2-step chain in `apiChain[]` where step 1 (EndpointA) produces `referenceId` and step 2 (EndpointD) needs it:** producer's request adds `"capture": { "referenceId": "$.referenceId" }`; consumer's body uses `{{captured.referenceId}}` (NEVER a hardcoded literal like `"100001"`). Non-chain fields use catalog identityPool tokens (when a pool exposes them) or typed-placeholder literals; NEVER use `{{businessConstants.*}}` (the catalog no longer has that section).

### Server-Generated Identifiers — Sentinel Pattern (MANDATORY for INSERT/UPDATE producer endpoints)

> ⚠️ **When a PRODUCER endpoint assigns its primary key from a server-side source (DB sequence, UUID, auto-increment, app counter), the test MUST send the documented "create new" sentinel — NEVER a fabricated literal like `100001`, `1`, etc.** The captured response value flows downstream via `{{captured.<name>}}`.
>
> **Why fabricated IDs break the chain (HARD FAILURE):** server contract is typically `id == sentinel → INSERT; id != sentinel → UPDATE`. Guessed value forces UPDATE on a row that may not exist → NPE / silent partial writes. The downstream chain receives the server-assigned key, not the fabricated value.
>
> **Discover the sentinel from source code (MANDATORY):** open producer's controller → service → DAO. Locate the INSERT vs UPDATE branch. Common patterns: `if (id > 0) UPDATE else INSERT` → sentinel `0` / `"0"`; `if (id != null && !id.isBlank()) UPDATE else INSERT` → sentinel `null` / `""`; `INSERT ... RETURNING id` (no UPDATE branch) → omit field entirely; `@GeneratedValue(IDENTITY)` → omit. Confirm the generator (`sequence.nextval`, `@GeneratedValue`, `UUID.randomUUID()`, `IDENTITY`).
>
> **Implementation:** producer body uses sentinel + declares `"capture": { "<key>": "$.<key>" }`; EVERY downstream consumer (within-service AND cross-service stub-derived) uses `{{captured.<key>}}`, NEVER the sentinel and NEVER a literal.
>
> **Pre-write self-check (HARD STOP):** before writing any positive payload targeting a producer, fill this row in the Pre-Write Output Contract: `Producer endpoint | Sentinel field | Source of truth (DAO file:line) | Sentinel value ("0" / omit / "" / null) | Captured-as`. If you cannot fill the source-of-truth cell (haven't read the DAO branch), STOP — do NOT guess; downgrade to negative-only and emit a `gaps.json` entry per Catalog-Gaps Feedback Loop.
>
> **Negative tests are the ONLY place fabricated IDs are allowed.** A `404 Not Found` test for `POST /UpdateThingDetails` with `thingId:"-999999"` is correct because the assertion expects 4xx.

### Cross-Service Boundary (G7 — Skip-with-Stub, NOT SETUP Requests)

> ⚠️ Per **G7** (intra-service boundary HARD RULE), each service's collection MUST NOT contain requests targeting another service's `base_url` — not as SETUP, not as `Setup` folder, not as chain prerequisite, not in any form. Cross-service interaction belongs in a separate integration-test suite (Pact / Spring Cloud Contract / E2E harness).
>
> **Phase 0 chain-map decision rule for every "Cross-Svc? YES" row:**
> - **Gate 0:** Does an explicit `apiChain[]` entry contain BOTH endpoints as ordered steps in DIFFERENT services? NO → not cross-service; resolve via Field Value Resolution Chain. YES → proceed.
> - **Gate 1:** Generate the consumer test as a runnable request whose cross-service field uses `{{catalog.stubs.<currentServiceShortName>.<fieldName>}}`. If the catalog lacks the stub, write `TODO-PROVIDE-VALUE` to `stubs.<svc>.<field>` AND append to `catalog-gaps.yaml` `requiredStubs:`. Do NOT add SETUP, env vars, `Setup` folder, or `_skipReason` (LINT-6 rejects).
> - **Gate 2 (un-block):** User replaces `TODO-PROVIDE-VALUE` (or sets `CATALOG_STUB_<UPPER_SVC>_<UPPER_FIELD>` env var). Until then, runner classifies the test `data-issue` (per `/tdgs-aidlc-setup-api-tests` Section 5 item 6).
>
> **Common misfire — DOWNSTREAM-SERVICE pattern (do NOT confuse with chain):** if no `apiChain[]` entry lists both endpoints (real flow has external steps between them), Gate 0 returns NO → resolve via Field Value Resolution Chain.
>
> **Shared-database dependency (CRITICAL — enterprise monolith decompositions):** when service B reads data service A wrote directly from the shared DB:
> - Consumer (B): cross-service field uses `{{catalog.stubs.<service-b>.<field>}}` per G7; document the stub references a real DB record.
> - Producer (A): every field matching a catalog pool field MUST use `{{catalog.identityPool.<pool>.<field>}}` even when `usedIn[]` lists service B (per indirect-pool-usage rule — token goes in whichever service's DTO carries the field).
> - Never add a SETUP request in B that calls A.
>
> **Forbidden patterns (HARD FAILURE — enforced by lint-collection.js):** request URL contains `{{<other-svc>_base_url}}` or hardcoded other-service host; top-level `Setup` folder with cross-service calls; request name beginning `SETUP:` targeting another service; `<other-svc>_base_url`/`<other-svc>_context_path` in this service's `environments/*.json`; `capture` block on a request targeting another service; `apiChain[]` walk crossing service boundary wired via `capture`/`inject` instead of Block 7 skip row. Check 13 enforces this and HARD-FAILs the build.

### External / Apigee-Routed Endpoints in Chains

> Endpoints flagged `Apigee-routed` / external-only (per KB integration-architecture / proxy-catalog notes) are NOT reachable from backend API tests. Rules: (1) do NOT generate test requests for them; (2) do NOT include as setup; (3) if a chain has an external step BETWEEN producer and consumer, the downstream is still testable — use test data (catalog token / hardcoded value) for the reference field instead of chaining (NOT a gap); (4) if a chain REQUIRES a runtime-generated value ONLY the external endpoint can produce, flag in gap analysis as covered by E2E only; (5) identity pools whose `usedIn[]` is UI-screens-only — do NOT use in API tests; (6) chain breaks at external service boundaries are acceptable.

### Field Values Source-of-Truth Verification

> ⚠️ Business-identifier values (agency codes, org IDs, site codes) MUST be derived from the UI source code per **Source #4 in the Ground-Truth Hierarchy**. The simplified catalog has no `businessConstants` section. Procedure: scan UI API files (read ≥5) → extract literals → confirm against backend DTO `@Size`/`@Pattern` → NEVER use backend Constants class values (DB-internal IDs, NOT API payload values) → bake into `data/valid-payloads.json` as literals (NOT `{{businessConstants.*}}` tokens — runner has no backing data).
>
> Display: `✅ {field} verified: "{value}" (UI: {N} files consistent, DTO: passes @Size)`. For multi-form fields, pick the form the API expects (read `@Size`); document inline.

#### Update test data files:

**`valid-payloads.json`** — One valid payload per endpoint that accepts a request body, using realistic data. If calculation rules with expected values were found in the KB, include payloads that produce **known expected results** for assertion.

**`invalid-payloads.json`** — For each validated field (use KB validation rule IDs where available):
- Missing required fields (one at a time)
- All required fields missing simultaneously
- Invalid format/type (string where number expected, etc.)
- Invalid patterns (malformed email, invalid phone format)

**`boundary-payloads.json`** — For each constrained field:
- Exactly at minimum value/length
- One below minimum
- Exactly at maximum value/length
- One above maximum
- Empty string / zero / null
- Extremely large values

**`injection-payloads.json`** — Security test payloads:
- XSS: `<script>alert('xss')</script>`, `"><img onerror=alert(1)>`, `javascript:alert(1)`
- SQL injection: `' OR 1=1--`, `'; DROP TABLE users;--`, `1; SELECT * FROM users`
- Path traversal: `../../etc/passwd`, `..\\..\\windows\\system32`
- Command injection: `; ls -la`, `| cat /etc/passwd`
- LDAP injection: `*)(uid=*))(|(uid=*`
- Header injection: `\r\nX-Injected: header`

> 🛑 **Data File Population HARD GATE (F2 — from production audit 2026-05-16):** After generation, verify EVERY data file is populated — empty data files are a HARD FAILURE. Check: `for f in valid-payloads.json invalid-payloads.json boundary-payloads.json injection-payloads.json; do [[ $(jq length "$f") -gt 0 ]] || echo "❌ EMPTY: $f"; done`. Each file MUST contain at least ONE entry derived from actual code discovery. `valid-payloads.json` entries MUST come from DTO field analysis (not placeholder stubs). `invalid-payloads.json` count MUST be ≥ validation annotation count (see Validation-Annotation Coverage Gate). An empty data file means the generation phase skipped the entire category — go back and populate from discovered model classes.
