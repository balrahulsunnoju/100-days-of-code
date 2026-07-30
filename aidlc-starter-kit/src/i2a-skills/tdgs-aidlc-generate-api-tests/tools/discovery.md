# Discovery (Phase 0–2, Reconciliation, Endpoint Gate)

### 3. Discovery — Comprehensive API Contract Extraction

#### Phase 0: Build Cross-Service Workflow Chain Map (MANDATORY — Before Per-Service Discovery)

> ⚠️ **Before discovering individual service contracts, you MUST build a unified workflow chain map that identifies which service owns which endpoint, what data flows between them, and where cross-service dependencies exist.** This map drives ALL subsequent chaining decisions. Without it, you will miss cross-service chains and produce broken test suites.
>
> **Read these sources in order (stop after the first source that provides a complete chain):**
>
> 1. **Process Flows** — `knowledge-base/business/process-flows.md`
>    - Contains the canonical end-to-end workflow sequence (e.g., PROC-001 sequence diagram)
>    - Shows the exact call order across ALL services and external systems
>    - Identifies which system (UI, backend services, external systems, Apigee, etc.) owns each step
>    - **This is the primary chain source — it defines THE order**
>
> 2. **Test Data Catalog** — `test-data/test-data-catalog.yaml` → `apiChain[]` section
>    - Machine-readable chain: each entry has `chainId`, ordered `steps[].endpoint + target`, and an explicit `capture[]` array of `{ fromStep, field, as }` entries
>    - The order of `steps[]` IS the producer→consumer order; the `capture[]` array IS the wiring (producer = `steps[fromStep]`; consumers downstream of it use `{{captured.<as>}}`)
>    - Cross-reference with process flows to confirm order
>    - **This is the primary chain ordering AND wiring source.** No model-class derivation is required when `capture[]` is populated; the model-class walk is only used to VERIFY that the producer's response model exposes `field` and that consumer request models declare the receiving field.
>
> 3. **Integration Architecture** — `knowledge-base/shared/integration-architecture.md`
>    - Shows external service integrations and which backend service calls them
>    - Identifies Apigee-mediated calls vs direct backend calls
>    - Error handling, timeouts, retry policies per integration
>
> 4. **Apigee Proxy Catalog** — `knowledge-base/apigee/proxy-catalog.md` and `knowledge-base/apigee/target-endpoints.md`
>    - Definitive endpoint-to-service routing: which proxy routes to which backend service URL
>    - Identifies endpoints that are Apigee-orchestrated (multi-step policies, not simple pass-through)
>    - Identifies external-only endpoints (external systems, payment gateways, third-party integrations) that backends cannot serve directly
>
> 5. **UI API Layer** — `{ui-repo}/src/api/` (or equivalent)
>    - Scan ALL API call files (fetch/axios/wrapper functions)
>    - Extract the Apigee URL paths each UI call targets
>    - Cross-reference with the proxy catalog to map each UI call → Apigee proxy → backend service
>    - **Catches endpoints that exist in code but are missing from KB docs**
>
> 6. **Per-Service Architecture Docs** — `knowledge-base/repos/{service-name}/architecture.md`
>    - Internal flow within each service (controller → service → DAO → DB)
>    - Confirms endpoint ownership and DB table relationships
>
> **Build and display the unified chain map (header + key columns; rows show actual data):** Endpoint | Service | Produces | Needs (fromChain) | Cross-Svc?. Mark each step `—` (intra-service), `✅ YES` (cross-service consumer of another service's producer), or `EXTERNAL` (Apigee-routed / external system). Display "Sources consulted:" checklist + "Cross-service chains detected:" + "External/Apigee-only endpoints (excluded from backend API tests):" + "Chain breaks at external boundaries:" sub-summaries.
>
> **This map is the SINGLE SOURCE OF TRUTH for all chaining decisions in subsequent phases.** When generating per service:
> - Steps marked "Cross-Svc? YES" → generate **runnable** consumer tests with `{{catalog.stubs.<currentSvc>.<field>}}` per G7 (see "Cross-Service Boundary" in `tools/generation-rules.md`). Missing stubs → `TODO-PROVIDE-VALUE` in catalog; runner reports `data-issue` until a real value is supplied.
> - Steps marked "EXTERNAL" → skip per the "External / Apigee-Routed Endpoints" section.
> - Steps with `fromChain` values within the same service → wire `capture`/`inject` within the collection.
>
> **If the chain map cannot be built (no KB, no catalog, no UI):** display a warning and ask the user which endpoints depend on which — do NOT guess.

#### Phase 1: From Knowledge Base (Per-Service Canonical Contracts)

After the chain map is built, perform per-service contract discovery. Check if the workspace contains a knowledge base (`*-docs/knowledge-base/` or similar). If found, read these files **first** per service:

1. **OpenAPI Specs** — `knowledge-base/api/{service-name}-openapi.yaml` (or `.json`)
   - Extract the **definitive** endpoint catalog: paths, HTTP methods, request/response schemas, status codes
   - These specs are the primary source for test case generation — code scanning augments them
   - Use response schemas directly for AJV schema validation assertions in tests

2. **Business Rules Catalog** — `knowledge-base/business/business-rules-catalog.md`
   - Extract rules with canonical IDs as found in the catalog
   - **Calculation rules** (formulas, schedules) provide **exact expected values** for assertions — the test asserts that the service returns the exact amount documented in the rule
   - **Validation rules** provide the constraints to test against (field lengths, formats, limits)

3. **Integration Architecture** — `knowledge-base/shared/integration-architecture.md`
   - Understand the **API gateway layer** between client and backend services if one exists
   - Identify rules implemented in the **gateway, not the backend** (e.g., request validation, rate limiting, CORS, response transformation)
   - Flag gateway-only rules in discovery output — these cannot be tested by hitting the backend directly

4. **Service Architecture Docs** — `knowledge-base/repos/{service-name}/architecture.md`
   - Understand internal layers (controller → service → DAO), external dependencies, error handling patterns

**If no knowledge base is found:** Skip this phase and proceed with code-only discovery (Phase 2).

#### Phase 1.5: Source-of-Truth Precedence + UI Endpoint-Version Filter (MANDATORY — HARD STOP)

> ⚠️ **This phase decides, for EACH endpoint, which source the request/response schema comes from. Skipping or guessing here is the documented root cause of (a) faker tokens leaking into PII fields, (b) missing required fields in payloads, and (c) tests being generated for `/v4/Foo` when the UI only calls `/v5/Foo`.**

**1. Source-of-truth precedence (per endpoint, per direction):**

For request schema, response schema, required-field flags, enums, examples — the agent MUST consult sources in this exact order and STOP at the first hit:

| Order | Source | Used When | Recorded as |
|---|---|---|---|
| 1 | KB OpenAPI `components.schemas.<X>` (resolved through every `$ref`) | Endpoint exists in `knowledge-base/api/<service>-openapi.yaml` | `schemaSource: kb-openapi` |
| 2 | KB `business-rules-catalog.md` (validation/calculation rule constraints) | Augments schema with min/max/pattern/expected values | `constraintsSource: kb-rules` |
| 3 | Source-code DTO scan (`@RequestBody` model + `@JsonProperty`/`@NotNull`/`@Size`/`@Pattern`/`@Email` + nested classes recursively) | KB OpenAPI is missing the endpoint OR the schema lacks `required[]`/`properties` for a field | `schemaSource: code-fallback` |
| 4 | Typed-Placeholder Fallback Rule (Pre-flight item 3) | All above are silent | `schemaSource: typed-placeholder` |

For EVERY endpoint that produces a positive test, emit ONE row in the **Schema Source Inventory** table (see Pre-Write Output Contract below) showing which source level (1–4) supplied the schema. This is non-optional output.

**2. KB-vs-code drift check (when both KB and code are present):**

For each endpoint with `schemaSource: kb-openapi`, additionally open the controller and the `@RequestBody` DTO and verify:

- Path matches: KB OpenAPI `paths` key === controller `@PostMapping`/`@GetMapping` path. Mismatch → log `⚠️ Path drift {endpoint}: KB={kbPath} code={codePath} — using CODE path`.
- DTO name matches: KB OpenAPI `requestBody.content.application/json.schema.$ref` last segment === DTO class simple name. Mismatch → log `⚠️ DTO drift {endpoint}: KB={kbDto} code={codeDto} — using CODE DTO fields`.
- Field count: KB schema `properties` count vs DTO declared field count (including inherited + nested). Difference of more than 1 → log `⚠️ Field-count drift {endpoint}: KB={kbCount} code={codeCount} — superset taken`.

**PROACTIVE RULE (do NOT wait for drift detection):** The **CODE is ALWAYS the wire contract** — KB OpenAPI is documentation that may be stale, incomplete, or structurally wrong (common failure modes: flattened nested objects, wrong field names, missing fields, outdated nesting). For EVERY endpoint, the agent MUST read the actual `@RequestBody` DTO source file(s) and use THOSE field names and nesting structures in payloads — regardless of whether a drift check detected any discrepancy. KB OpenAPI constraints (min/max/pattern/example/enum) are kept whenever they apply to the same field name as determined by the DTO source. This rule supersedes the drift-check below — the drift check is a documentation audit, not a payload-construction gate.

When drift is detected, log the discrepancy for documentation backlog. Override the KB schema field set with the DTO's actual field set, but keep KB-derived constraints (min/max/pattern/example) wherever they apply to the same field name.

**3. UI Endpoint-Version Filter (MANDATORY — applied AFTER schema discovery, BEFORE generation):**

Versioned endpoints (e.g., `/Foo`, `/v4/Foo`, `/v5/Foo`) commonly co-exist in code while the UI calls only one. Tests for non-UI-called versions are dead weight.

Procedure:

1. **Build `uiCalledPaths[]`** by scanning EVERY UI source file under `{ui-repo}/src/api/**/*.{js,ts,jsx,tsx}` and `{ui-repo}/src/components/**/*.{js,ts,jsx,tsx}`. Extract every string literal that looks like an HTTP path (regex anchor: `["']/[A-Za-z0-9/_\-\.]+["']` and template-literal equivalents). Record `(path, version)` where `version` is parsed from `/v\d+/` segment if present, else `null`.
2. **Union with catalog** `uiScreens[].endpoints[].endpoint` — same `(path, version)` records.
3. **For each endpoint discovered in Phase 1/2**, classify:
   - `uiCalled = true` if `(path, version)` is in `uiCalledPaths[]` (exact match on path AND version)
   - `uiCalled = false` otherwise
4. **Generation rule:**
   - `uiCalled = true` → generate the full test set for this endpoint
   - `uiCalled = false` AND a different version of the same base path IS uiCalled → DROP (legacy version, log: `⏭️ LEGACY: {METHOD} {path} dropped — UI calls {newerPath} instead`)
   - `uiCalled = false` AND no other version is uiCalled → DROP (not-UI-consumed, log: `⏭️ NOT-UI-CONSUMED: {METHOD} {path} — no UI source or uiScreens entry references it`). Listed in gap analysis as "candidate for legacy/internal review".
5. **Special case — internal/scheduler endpoints (e.g., `/ping`, `/actuator/health`, `/internal/*`)**: keep without UI gate; tag `uiCalled: n/a (internal)`.

**4. External / Apigee-only endpoints (already handled — re-confirmed here):**

If KB `proxy-catalog.md` / `target-endpoints.md` flags an endpoint as Apigee-orchestrated or external-only (third-party gateway, payment processor, identity provider), DROP it from this service's collection regardless of UI call status. Log: `⏭️ EXTERNAL: {METHOD} {path} routed via Apigee/external — not backend-testable`.

#### Phase 1.6: KB Field-Value Mining (MANDATORY — feeds Field Value Resolution Chain steps 3–6)

> ⚠️ **Before generating any payload**, mine the knowledge base, UI source, and DDL/annotations to build a `kbFieldValueMap[]` keyed by JSON wire-name. This map provides realistic values for fields that have NO catalog identityPool entry and NO upstream chain producer — replacing naive type-default literals (e.g., `"placeholder-string"`, `0`) with KB-grounded values whenever possible.
>
> **Sources scanned (in this order, results merged):**
>
> 1. **KB OpenAPI** (`knowledge-base/api/<service>-openapi.yaml`) — extract `example`, `examples[].value`, `default`, `enum[]` for every schema property (resolve `$ref` chains).
> 2. **KB business rules catalog** (`knowledge-base/business/business-rules-catalog.md`) — parse rule statements for "field X is always Y" / "field X must equal Y" / "default Y for field X" patterns; record the rule ID (`BR-###`).
> 3. **KB data-dictionary / glossary** (`knowledge-base/business/data-dictionary.md`, `knowledge-base/shared/data-dictionary.md`, `knowledge-base/business/glossary.md`, `knowledge-base/shared/glossary.md` — whichever exist) — extract documented sample values, project defaults, valid value lists.
> 4. **KB integration architecture + proxy catalog** — extract tenant/application/agency/partner identifiers documented as constants on the wire.
> 5. **UI source** (`{ui-repo}/src/api/**`, `{ui-repo}/src/components/**`, `{ui-repo}/src/forms/**` — adjust to actual structure) — extract:
>    - Yup/Zod/Joi schema `.default(...)`, `.oneOf([...])` literal lists
>    - React `initialValues` / Formik form initial state
>    - Hardcoded request payload field literals in fetch/axios calls
>    - Dropdown / radio / checkbox option arrays
> 6. **Source-code constants** — `*Constants.java`, `application.properties`, `application.yml`, `@Value("${...}")` injection defaults — but EXCLUDE DB-internal numeric IDs (per Section 2 rule "backend constants classes often contain DB-internal numeric IDs that are NEVER sent in API payloads").
> 7. **DDL CHECK constraints + JSR-303 annotations** — parse `*.sql` `CHECK (col IN ('A','B'))`, `VARCHAR2(N)` widths, `@Pattern`, `@Size`, `@Email`, `@JsonFormat`, `@DateTimeFormat`. These feed step 7 of the resolution chain.
>
> **Build and display the mined map (MANDATORY discovery output, before any payload is written)** as a table with columns: Field (JSON wire-name) | Resolved Value | Source (one of `kb-business-rule (BR-XXX)` / `kb-openapi-example` / `kb-data-dictionary` / `ddl-check-constraint` / `ui-default (Yup oneOf|Formik initialValues|...)` / `(no KB hit)` deferring to chain step 1/9) | Constraint (e.g., `enum[A,B]` / `@Pattern(...)` / `CHAR(1) CHECK IN('Y','N')` / `—`). Display per-source counts and `Total fields mined: {N} of {M} model fields ({P}% KB-grounded)` summary.
>
> **The mined map is consumed by:**
> - The Field Value Resolution Chain (Pre-flight Item 3, steps 3–6) at payload-generation time.
> - Block 4 (Catalog Token Mapping) — fields with no KB hit AND no catalog mapping are flagged for chain steps 7–9.
> - Block 3 (Required/Optional Inventory) — every required field must reference a step in the resolution chain.
>
> **If KB sources are absent (no `knowledge-base/` directory):** scan only UI source + constants + DDL + annotations (steps 5–7). Display the map with `Sources scanned: ⚠️ KB not present — UI/code only` and continue. Do NOT block on missing KB.

#### Phase 2: From Source Code (Augment & Validate)

For each backend service, perform deep source code analysis. Cross-reference code findings against KB — flag any discrepancies (endpoint in KB but not in code, or vice versa).

> **Source-of-truth precedence reminder:** Per Phase 1.5, the source-code DTO scan is the FALLBACK for schema discovery (when KB OpenAPI is missing or incomplete) AND the AUTHORITATIVE override when KB-vs-code drift is detected. The DTO is always the wire contract — the code that actually runs. KB OpenAPI is the preferred starting point because it's pre-resolved and saves time, not because it's more correct.

#### Request Model Field Extraction (MANDATORY — HARD REQUIREMENT)

> ⚠️ **Before generating ANY request payload**, you MUST read the actual model/DTO class the controller accepts as `@RequestBody` (or equivalent). The model class is the **single source of truth** for which fields can appear in a request body. **NEVER invent, guess, or copy fields from the catalog that do not exist in the model class.**
>
> **Procedure (per endpoint with a request body):**
> 1. Find controller method (e.g., `@PostMapping("/EndpointA")`); read `@RequestBody` parameter type.
> 2. Open the class; extract every declared field (name + type).
> 3. **Inheritance** — if `extends BaseRequest` or any parent, walk the chain and include all inherited fields.
> 4. **JSON serialization annotations (CRITICAL for correct field names):** `@JsonProperty("wire_name")` overrides the Java field name (JSON key = `wire_name`); `@JsonAlias([...])` lists alternative deserialization names; `@JsonIgnore` excludes from JSON (do NOT include in payloads); `@JsonIgnoreProperties` on class lists exclusions; `@JsonNaming(SnakeCaseStrategy)` makes all fields snake_case in JSON. Equivalent for Python (Pydantic `Field(alias=...)`, `model_config=ConfigDict(alias_generator=...)`) and C# (`[JsonPropertyName(...)]`, `[JsonIgnore]`).
> 5. For nested objects (e.g., `AddressInfo addressInfo`) recurse into THAT class.
> 6. **Record the complete field inventory per endpoint** — this is your allowlist. Use JSON wire names (from `@JsonProperty` if present, else Java field name).
> 7. **Polymorphic / variant collection fields (MANDATORY — complete variant coverage per G12):** when a DTO declares multiple `List<T>`/array fields where each represents a different record-type variant, you MUST: open EACH variant type's DTO class file and extract its complete field inventory (applying inheritance + `@JsonProperty` + nested recursion to each variant); generate tests across ALL categories per variant type per G12 coverage matrix (≥1 positive per variant; ≥1 negative per variant targeting variant-specific required/constrained fields unique to that variant; ≥1 edge/boundary per variant if it has specific constraints; shared parent-level negative/edge tests count once not per variant); the edge-case folder MUST include ≥1 test combining multiple variant types in a single payload; document all variant types in Block 3 (one sub-table per variant). Common failure: generating tests for only 2 of N variants because KB OpenAPI only documented 2 — the source code DTO is the authority for ALL variant types (scan ALL `List<*>` fields on parent DTO). If a variant has its own nested DTOs, those nested structures MUST be read from source code, not inferred from KB OpenAPI.
>
> **When building request payloads:**
> - **ONLY include fields that exist in the model class.** If catalog has `extraField` but the model does NOT — DO NOT add it. The API will either ignore it or reject it.
> - **Map catalog field names to model field names.** Catalog and model may use DIFFERENT names for the same concept (e.g., catalog `socialSecurityNumber` ⇄ model `ssn`; `licenseNumber` ⇄ `licenseNo`; `dateOfBirth` ⇄ `dob`). Build a per-endpoint mapping table with columns `Model Field | Catalog Source | Token` and display before generation. Skip rows where the catalog field is not in the model.
> - **Common mistakes prevented:** adding catalog-only fields to payload; using `dateOfBirth` as JSON key when model uses `dob`; missing fields that ARE in the model but NOT in the catalog (fill via Field Value Resolution Chain); using wrong catalog token name (token path MUST match the catalog YAML key — `{{catalog.identityPool.<pool>.socialSecurityNumber}}`, NOT `.ssn`).

#### Required vs Optional Field Strategy (MANDATORY)

> ⚠️ **Required fields and optional fields are NOT treated the same.** Confusing them is the #1 cause of "random" 400 errors and silent test gaps.
>
> **For each field in the model class, classify it BEFORE writing the payload:**
>
> | Source of "required" signal | Examples |
> |---|---|
> | Bean Validation annotation | `@NotNull`, `@NotBlank`, `@NotEmpty`, `@Size(min>=1)`, Pydantic field with no default, C# `[Required]`, Joi/Zod `.required()` |
> | Primitive type (Java) | `int`, `long`, `double`, `boolean` — cannot be null on the wire (deserialization defaults to 0/false but missing causes binding errors in strict configs) |
> | Controller-side guard | Explicit `if (req.getX() == null) throw ...` in the handler |
>
> Field-level required signals come from the model class and controller code — the catalog no longer maintains a `requiredFieldsByPayload` shortcut.
>
> **Rules for POSITIVE tests:**
> - **Every REQUIRED field MUST be present** with a real, valid value (catalog token, captured token, faker, or hardcoded literal per the data-source decision tree).
> - **REQUIRED fields MUST NEVER receive a `PLACEHOLDER_*` value** unless the catalog's identity pool is intentionally seeded with placeholders. If the resolved value contains `PLACEHOLDER_`, the test-runner tags the entry `dataWarning: "PLACEHOLDER identity data"` and a 500 result is classified `data-issue` (not `fail`).
> - **OPTIONAL fields** are populated by category:
>   - The DEFAULT positive payload includes ALL optional fields populated with realistic values (best coverage of serialization paths).
>   - At LEAST ONE additional positive variant per endpoint omits ALL optional fields (the "minimal positive" test) to prove the API does not silently require optional fields.
>   - Optional fields with explicit catalog mappings still use catalog tokens — do NOT downgrade to faker just because the field is optional.
>
> **Rules for NEGATIVE tests (validation):**
> - For EVERY required field, generate one negative test that **omits ONLY that field** (everything else valid) and asserts a 4xx.
> - For EVERY optional field, generate ZERO negative "missing field" tests — omitting an optional field is by definition valid. (Generate boundary/format negative tests instead, e.g., `@Size(max=10)` → send 11 chars.)
> - For ENUM/`@Pattern`/`@Email` constrained fields (required OR optional), generate one negative test per constraint with an invalid value.
>
> **Rules for fakeable / hardcoded fallback (when no catalog token applies):**
> - When no `external-required` identityPool field maps to the model field AND no upstream chain step provides it, use the **Typed-Placeholder Fallback Rule** (Pre-flight item 3 above): pick a deterministic typed literal by Java/OpenAPI type. Reserve faker tokens (`{{$randomFirstName}}`, `{{$randomEmail}}`, etc.) for low-risk realism on optional non-PII fields only.
> - **Never use `PLACEHOLDER_*` literals as a generation fallback.** `PLACEHOLDER_<FIELD>` strings are produced ONLY by the catalog when an `external-required` pool record has no real value yet; a generated payload should never INVENT them. If a required field has no catalog source AND no chain producer, emit the typed literal (e.g., `"placeholder-string"`) and tag the test with `(uses typed-placeholder for <field>)`.
>
> **Per-endpoint required/optional inventory display (MANDATORY)** as a table with columns: Field | Required? (✅ annotation name OR ⏸️ optional) | Resolved Source (chain step + value, e.g., `step 4 kb-business-rule BR-001 → "<APP_KEY>"`) | Negative test (`omit-required` for required fields, `(none)` for optional). Include nested-field rows (`applicant.dlNumber`, `currentAddress.state`, etc.). Footer: `Required: N  Optional: M  Negative tests planned: N (one per required)` and `Resolution chain coverage: catalog=N  chain-capture=N  kb-openapi=N  kb-rule=N  kb-dict=N  ui=N  constraint-aware=N  faker=N  type-literal=N`. If this inventory is not displayed for an endpoint, the AI did not re-read the model — STOP and re-read.

#### Response Model Field Extraction (MANDATORY — HARD REQUIREMENT for Positive Tests)

> ⚠️ **For every endpoint that returns a JSON response body**, you MUST read the actual response model/DTO class. The response model is the **single source of truth** for which fields the response WILL contain. Positive test assertions MUST validate fields that ACTUALLY exist in the response model — never guess or invent response fields.
>
> **Step-by-step — repeat for EVERY endpoint with a JSON response:**
> 1. Find the controller method's return type (e.g., `ResponseEntity<SomeResponseDto>`, `SomeOutputModel`)
> 2. If the return type is a generic wrapper (e.g., `ResponseEntity<T>`), extract the inner type `T`
> 3. Open that class file and extract **every declared field** (name + type)
> 4. For nested objects, open the nested class and extract its fields too
> 5. **Record the complete response field inventory** per endpoint
>
> **When building positive test assertions:**
> - **ONLY assert fields that exist in the response model class.** If you add `expect(body).to.have.property('extraField')` but `extraField` is NOT in the response class, the assertion will always fail.
> - For **chained endpoints** that produce values (endpoints with `capture` metadata): the captured field MUST exist in the response model. For every `apiChain[].capture[]` entry `{ fromStep, field, as }`, verify the producer (`steps[fromStep]`) response model declares `field`. If the field is not in the model, abort and ask the user to clarify the chain.
> - For **non-JSON responses** (PDF, file download — flagged during endpoint discovery): do NOT assert JSON body properties. Assert `Content-Type` header and `bytesRead > 0` instead.
>
> **Display per-endpoint response field verification:**
> ```
> 📋 Response model: {endpoint} — {ResponseClass}
> ┌──────────────────────┬──────────────────────┬─────────────┐
> │ Response Field       │ Type                 │ Asserted?   │
> ├──────────────────────┼──────────────────────┼─────────────┤
> │ {field-from-model}   │ String               │ ✅ property  │
> │ {another-field}      │ BigDecimal           │ ✅ property  │
> │ {status-field}       │ String               │ ✅ value     │
> │ {internal-field}     │ Long                 │ ❌ skip (internal) │
> └──────────────────────┴──────────────────────┴─────────────┘
> ```

#### Versioned Endpoint Handling (UI-Consumed Versions Only)

> ⚠️ **When a controller exposes the same endpoint at multiple versions** (e.g., `/Foo`, `/v4/Foo`, `/v5/Foo`), tests SHOULD be generated ONLY for the version(s) the UI actually calls. The simplified catalog no longer maintains an `endpointVersionMap`; instead, derive UI-consumed versions by scanning `{ui-repo}/src/api/` (or equivalent) for the exact base paths the UI fetches and cross-referencing with the catalog's `uiScreens[]` entries.
>
> **Rules:**
> 1. **Generate tests ONLY for paths the UI calls.** A path that exists in code but is not referenced from the UI source AND not listed in `uiScreens[].endpoints[].endpoint` is a `legacy` path and is excluded from the collection.
> 2. **If multiple versions of the same base path are UI-consumed** (rare — in-flight migration), generate a separate `unit_test_suite` per version with a clearly differentiated label (e.g., `"POST /v4/Foo - Valid (UI-legacy)"` vs `"POST /v5/Foo - Valid (UI-current)"`).
> 3. **Each tested version is its own `unit_test_suite`** — do not combine across versions.
> 4. **Each tested version participates in chaining** if it consumes captured values via `apiChain[]`.
> 5. **In the gap analysis table**, every legacy version excluded from the collection MUST appear as a separate row with `Reason: "Not UI-consumed — superseded by {newVersion}"`.

#### Domain Invariants

> The simplified catalog no longer carries a `businessRules` section with pre-computed `testVariants`. Domain invariants (e.g., "first-create call must omit the server-assigned primary key") are discovered at generation time by reading: (a) the model class field annotations (`@Id`, `@GeneratedValue`, `@JsonProperty(access = WRITE_ONLY)`), (b) controller-side guard clauses (`if (req.getX() != null) throw ...`), (c) knowledge-base business-rules catalog when present (`*-docs/knowledge-base/business/business-rules-catalog.md`).
>
> Generate negative variants for any invariant that emerges from the above signals (e.g., for an `@Id @GeneratedValue` field on a POST request, emit one negative test that includes the field with a non-null value and asserts the documented 4xx). Tag the test name with the rule ID `[BR-XXX]` if the KB provides one.

#### Endpoint, Validation, Business Logic, Error & Security Discovery (framework-agnostic)

For each backend service, scan source code per the framework conventions below. Cross-reference against KB; flag discrepancies (endpoint in KB but not code, or vice versa).

| Concern | Java/Spring | Python (Flask/FastAPI/Django) | Node (Express/Fastify/NestJS) | C#/.NET | AWS Lambda |
|---|---|---|---|---|---|
| Endpoint discovery | `@RestController`/`@Controller`; `@GetMapping`/`@PostMapping`/`@PutMapping`/`@DeleteMapping`/`@PatchMapping`/`@RequestMapping`; `@PathVariable`/`@RequestParam`/`@RequestBody`/`@RequestHeader` | FastAPI `@app.get`/`@router.post`; Flask `@app.route`/`@blueprint.route`; Django `urlpatterns`/`ViewSet`/`APIView`; bodies via Pydantic / marshmallow / DRF serializers | Express `router.get`/`app.post`; Fastify route schemas; NestJS `@Get`/`@Post`/`@Controller` decorators; validation via Joi/Yup/Zod/express-validator/class-validator | `[ApiController]`/`[Route]`/`[HttpGet]`/`[HttpPost]`; Minimal APIs `app.MapGet`/`app.MapPost`; bodies via `[FromBody]`/`[FromQuery]`/`[FromRoute]` | `template.yaml` `Events:` (`Api` type, method+path); `serverless.yml` `functions:` with `http` events; handler exports + event structure |
| Validation rules | `@NotNull`, `@NotBlank`, `@NotEmpty`, `@Size(min,max)`, `@Min`, `@Max`, `@Pattern`, `@Email`, `@Digits`, `@Positive`, `@Negative`, `@Past`, `@Future`, custom validators | Pydantic `Field(min_length, max_length, ge, le, regex)`; marshmallow validators; Django validators | Joi `.required()`/`.min()`/`.max()`/`.email()`; Zod `.string()`/`.number()`; class-validator decorators | `[Required]`, `[StringLength]`, `[Range]`, `[RegularExpression]`; FluentValidation rules | Handler input validation + schema libs |
| Error handling | `@ExceptionHandler`, `@ControllerAdvice`, custom error DTOs | FastAPI exception handlers; Flask `@app.errorhandler`; Django exception middleware | Express error middleware `(err, req, res, next)`; NestJS exception filters | Exception filters/middleware; `ProblemDetails` responses | Handler catch blocks formatting error responses |
| Auth / security | Spring Security `@PreAuthorize`/`@Secured`/`@RolesAllowed` | FastAPI `Depends()` w/ auth; Flask-Login; Django permissions | Passport.js; JWT middleware; NestJS guards | `[Authorize]`; policy-based authorization | API Gateway authorizers (IAM, Cognito, custom Lambda) |
| Non-JSON response detection (CRITICAL — flag so tests assert correct `Content-Type` and don't parse as JSON) | `produces` attribute (e.g., `MediaType.APPLICATION_PDF_VALUE`); return type `byte[]`/`Resource`/`InputStreamResource`/`StreamingResponseBody`; `Content-Disposition` headers | FastAPI `response_class=FileResponse`/`StreamingResponse`; Flask `send_file()`; Django `FileResponse`/`HttpResponse(content_type=...)` | `res.download()`/`res.sendFile()`; `@Header('Content-Type', ...)`; `@StreamableFile()` | `[Produces("application/pdf")]`; `FileResult`/`FileStreamResult`/`PhysicalFileResult` | Handler return content type |

**Business logic** — scan service-layer methods called from controllers/handlers; capture business calculations, rule evaluations, workflow state transitions, conditional logic (different responses based on input combinations), and request/response data transformations. Also note CORS configuration where applicable.

Display per-service discovery:
```
══════════════════════════════════════════════════════════════
API CONTRACT DISCOVERY: {service-name}
══════════════════════════════════════════════════════════════

  Discovery Source:    {KB only | Code only | KB + Code}
  Endpoints:           {count} ({GET}/{POST}/{PUT}/{DELETE})
  Request Models:      {count}
  Response Models:     {count}
  Validation Rules:    {count} (with KB rule IDs where available)
  Calculation Rules:   {count} (with expected values from KB)
  Error Handlers:      {count}
  Auth-Required:       {count} endpoints
  Non-JSON Responses:  {count} endpoints (PDF, file download, binary)
  Gateway-Only Rules:  {count} (implemented in API gateway, not backend)

  Test cases to generate:
    Positive:   {count}
    Negative:   {count}
    Edge-case:  {count}
    TOTAL:      {count}

══════════════════════════════════════════════════════════════
```

### 3b. Reconciliation — Cross-Reference KB vs Code (MANDATORY)

> ⚠️ **Do NOT skip this step.** Tests generated from stale KB docs for endpoints that no longer exist in code will fail at runtime. Tests generated only from code may miss documented business rules. This reconciliation prevents blind generation.

After BOTH discovery phases complete for each service, **reconcile KB findings against code findings** and display:

```
══════════════════════════════════════════════════════════════
DISCOVERY RECONCILIATION: {service-name}
══════════════════════════════════════════════════════════════

  KB Endpoints Found:         {count} (from OpenAPI specs / business rules catalog)
  Code Endpoints Found:       {count} (from source code scan — controllers, annotations)
  Matched (KB ↔ Code):        {count}
  KB-only (not in code):       {count} — may be stale docs, gateway-layer, or external service
  Code-only (not in KB):       {count} — undocumented endpoints, add to KB backlog

  Validation Rules (KB ↔ Code):
    Matched:                   {count}
    KB-only:                   {count}
    Code-only:                 {count}

══════════════════════════════════════════════════════════════
```

**Reconciliation rules — what to do with each category:**

| Category | Action | Reason |
|----------|--------|--------|
| **Matched (KB ↔ Code)** | ✅ Generate tests — highest confidence | Endpoint exists in code AND is documented |
| **Code-only (not in KB)** | ✅ Generate tests — flag as undocumented | Endpoint exists in actual code, tests will work. Flag in gap analysis for KB update |
| **KB-only (not in code)** | ⚠️ Do NOT generate tests by default | Endpoint may be removed, renamed, or gateway-only. Generating tests for non-existent endpoints causes 404 failures |

**For KB-only endpoints, display a decision prompt:**
```
⚠️  {count} endpoints found in knowledge base but NOT in source code:

  #  Method  Path                     Likely Reason
  ─  ──────  ───────────────────────   ──────────────────────────
  1  POST    {path-1}                 {gateway-only | deprecated | renamed?}
  2  GET     {path-2}                 {gateway-only | deprecated | renamed?}

Options:
  a) Skip all KB-only endpoints (recommended — tests would fail against the backend)
  b) Include specific ones (enter numbers, e.g., "1" — only if you know the gateway handles them)

Enter choice: _
```

**Only proceed to test generation with the reconciled, confirmed endpoint list.** This ensures every generated test targets an endpoint that actually exists.

### 3c. Pre-Generation Endpoint Gate (MANDATORY — HARD STOP)

> ⚠️ **This gate runs AFTER reconciliation and BEFORE any collection write.** It is the last line of defense against phantom endpoints (collection requests for endpoints that do not exist in the service being tested) and against legacy version pollution. Skipping this gate is the documented root cause of bugs like "{service-B} collection contains POST /{endpointA} when {service-B} has no /{endpointA} controller" (cross-service phantom) and "both POST /{endpoint} and POST /v5/{endpoint} generated when the UI only calls v5" (legacy version pollution).

For the service currently being processed, build two allowlists:

1. **`controllerEndpoints[]`** — every `(METHOD, PATH)` pair physically present as a `@PostMapping` / `@GetMapping` / `@RequestMapping` (or framework equivalent) in **THIS service's** controller source files. Do NOT include endpoints owned by other services. Do NOT trust the catalog or KB — read the controller files directly.
2. **`uiAllowedPaths[]`** — every endpoint path the UI actually calls. Build this by scanning `{ui-repo}/src/api/` (or equivalent) for fetch/axios calls AND by union-ing every `uiScreens[].endpoints[].endpoint` entry from the catalog. If neither source produces any path for a base path discovered in code, the endpoint is treated as `legacy` and dropped (with a row in the gap analysis).

Then, for the candidate test list assembled from prior phases:

| Candidate origin | Filter rule | If filtered out |
|---|---|---|
| Endpoint NOT in `controllerEndpoints[]` for THIS service | **DROP** — phantom endpoint | Log: `❌ PHANTOM: "{METHOD} {PATH}" not found in {service-name} controllers — dropping. (Source hint: {KB|catalog|UI|chain-map})` |
| Endpoint in `controllerEndpoints[]` but path is NOT in `uiAllowedPaths[]` (and a NEWER version of the same base path IS in `uiAllowedPaths[]`) | **DROP** — legacy version | Log: `⏭️ LEGACY: "{METHOD} {PATH}" superseded by UI-version "{newerPath}" — dropping.` |
| Endpoint in `controllerEndpoints[]` AND path appears in `uiAllowedPaths[]` | **KEEP** — generate tests | — |
| Endpoint in `controllerEndpoints[]` but base path not referenced by UI at all | **DROP** — not UI-consumed | Log: `⏭️ NOT-UI-CONSUMED: "{METHOD} {PATH}" — no UI source or uiScreens entry references it.` Listed in gap analysis. |

**Per G7, this filter has no cross-service exemption.** Every request in a service's collection MUST target an endpoint in THAT service's `controllerEndpoints[]`. When a request body field is owned by a producer in another service, the field is wired with `{{catalog.stubs.<svc>.<field>}}` (per G7) — the consumer test is still emitted as a runnable request, NOT as a skipped placeholder. The runner classifies it `data-issue` automatically when the catalog value is `TODO-PROVIDE-VALUE`.

**Display the gate result before continuing:**
```
═══════════════════════════════════════════════════════════════
PRE-GENERATION ENDPOINT GATE: {service-name}
═══════════════════════════════════════════════════════════════
  Controller endpoints (this service):  {N}
  UI-allowed versions:                  {N}
  Candidates (pre-gate):                {N}
  → Kept (passed gate):                 {N}
  → Dropped (phantom):                  {N}
  → Dropped (legacy version):           {N}
  → Cross-service consumers (skipped):  {N}
═══════════════════════════════════════════════════════════════
```

**If `Kept (passed gate)` is 0 — do NOT generate an empty collection.** Stop with: `❌ No endpoints passed the pre-generation gate for {service-name}. Verify UI source and uiScreens catalog entries, then re-run.`

**Every dropped endpoint MUST appear as a row in the gap analysis (Section 5)** with the precise drop reason — phantom, legacy, or not-UI-consumed. The user sees what was excluded and why; nothing is silently dropped.

### 3c. Test Count Budget Reconciliation (MANDATORY — emit BEFORE Section 3d Pre-Write Output Contract)

> **Why this block exists:** users have observed the same workspace producing wildly different test counts across runs (e.g., 80 vs 500). The variance is real (KB OpenAPI grows, more rules discovered, more chains added) but MUST be made visible and justifiable so it doesn't surprise reviewers or blow CI budgets.

The agent MUST emit this reconciliation in chat BEFORE the Pre-Write Output Contract:

```
═══════════════════════════════════════════════════════════════
TEST COUNT BUDGET RECONCILIATION — {service-name}
═══════════════════════════════════════════════════════════════
  Driver                              | Count | Multiplier      | Subtotal
  ────────────────────────────────────  | ───── | ──────────────  | ────────
  Endpoints (passed pre-gen gate)       | 22    | 4 (P/N/E/OWASP) | 88
  Business-rule variants (per endpoint) | 31    | 2 (P/N)         | 62
  apiChain[] step coverage              | 7     | 1 (positive)    | 7
  OWASP API1/API2/API5/API7/API9 probes | 22    | 5               | 110
  ────────────────────────────────────  | ───── | ──────────────  | ────────
  RAW TOTAL                                                      | 267
  De-duplicated (same endpoint × boundary across N test sources) | 231
  Capped by max_tests={value or 'unlimited'}                     | 231
  ─────────────────────────────────────────────────────────────  | ────────
  FINAL PLANNED TEST COUNT                                       | 231
═══════════════════════════════════════════════════════════════
```

Compare to previous run (read from `api-tests/test-results/data-ledger.json` if it exists):

```
  Previous run total:  {N}    Delta: {±N}    Reason: {OpenAPI grew by 4 endpoints, 2 new chains}
```

If `Delta > +50%` AND no KB growth justifies it: **STOP** — investigate over-generation (likely a duplicate-detection bug). If `Delta < −50%` AND no KB shrinkage: **STOP** — investigate under-generation (likely a discovery regression).
