# Pre-Write Output Contract (emit in chat before any collection write)

## Overview


> ⚠️ **This is the single most important enforcement gate in the prompt. Without this contract, the agent has historically generated collections with missing required fields, faker tokens on PII, wrong endpoint versions, and unwired chains — all silently. The contract makes the agent's reasoning visible to the user BEFORE any file is written, so violations are caught at chat time, not at runtime.**
>
> **For EACH service to be processed, the agent MUST emit ALL of the following tables/blocks IN CHAT, in this order, before writing the collection JSON file. The agent MUST NOT call any file-write tool for the service's collection until every block below has been emitted with concrete (non-placeholder) values.**
>
> If any block is missing, incomplete, or contains a TBD/placeholder, **STOP. Do not write the collection.** Re-do the discovery for that service and re-emit the blocks.

#### Block 1 — Schema Source Inventory

Per Phase 1.5 precedence, ONE row per endpoint that will get tests. Columns: `Endpoint | Schema Source (kb-openapi | code-fallback | typed-placeholder | n/a (no body)) | DTO/Schema Ref | Drift? (none | ⚠️ field-count drift (KB=N, code=M) — using code superset | ⚠️ DTO drift {kbDto}→{codeDto} | n/a)`.

#### Block 2 — UI Endpoint-Version Filter Result

Header: `UI source files scanned: N | Catalog uiScreens entries: N | uiCalledPaths[] size: N`. Rows columns: `Endpoint | UI Called? (✅ / ❌ / n/a internal) | UI File / Screen Source | Decision (KEEP | DROP — legacy | DROP — not-UI-consumed | KEEP — internal)`.

#### Block 3 — Per-Endpoint Required/Optional Field Inventory

ONE table per endpoint with a request body. **Field count MUST equal `count(DTO leaf fields, including every nested DTO recursively, including every `@JsonProperty`-aliased name)`.** The agent MUST open the parent DTO source file AND every nested DTO source file (do not infer from KB OpenAPI alone for nested objects — see line 293 nested-object recursion rule) and emit one row per leaf field.

Required columns (in this exact order — additional columns allowed):

| JSON Path (dot-notation) | DTO Source (file:line) | Java Type | Required? | Source (P0–P6) | Wire Value (preview) |

- **JSON Path**: full dot-path including nested-object names exactly as they appear on the wire (`requestorInfo.firstName`, `currentAddress.addressLine1`, `previousAddress.Zipext` — preserve `@JsonProperty` casing verbatim, including unusual capitalization like `Zipext`). For `List<T>`, use `field[0].leaf`.
- **DTO Source**: relative path + line number where the field is declared (`src/.../model/RequestorInfo.java:14`). This forces the agent to physically open every nested DTO file.
- **Java Type**: declared type (`String`, `Long`, `BigDecimal`, `LocalDate`, `Boolean`, nested DTO class name, `List<X>`).
- **Required?**: `Y` if `@NotNull`/`@NotBlank`/`@NotEmpty`; otherwise `N`. (Nested DTO declared without `@NotNull` is still listed; per Check 14 Part A its leaves must still appear in every non-minimal positive body.)
- **Source**: which P-tier resolves the value (P0 catalog → P1 captured → P2 UI literal → P3 KB → P4 DDL/DAO → P5 DTO annotation → P6 typed-placeholder).
- **Wire Value (preview)**: the literal or token that will appear in the generated body (`"{{catalog.identityPool.identity-in-state.firstName}}"`, `""` for optional empty string, `null`, `5550100000`, etc.).

**Per-test variant declaration (REQUIRED — guards Check 14 Part A's minimal-positive exemption):** below the field table, list every positive test for the endpoint with its variant kind:

| Test Name | Variant Kind | metadata.variant | Field Count vs DTO |
|---|---|---|---|
| `req_endpoint_default_positive` | `default` (must include EVERY leaf field) | `"default"` | `13/13` ✅ |
| `req_endpoint_minimal_positive` | `minimal` (may omit optional leaves) | `"minimal"` | `5/13` (8 optional omitted) ✅ |
| `req_endpoint_out_of_state` | `default` (out-of-state pool, still EVERY leaf) | `"default"` | `13/13` ✅ |

At MOST ONE positive test per endpoint may declare `metadata.variant: "minimal"`. Every other positive (including chain-step setup payloads) MUST be `"default"` and MUST list `Field Count vs DTO` as `N/N` ✅. **If any non-minimal positive shows `Field Count vs DTO` < `N/N`, STOP. Do not write.** This is the gate that catches the regression where positive payloads silently drop optional sub-DTOs (`previousAddress`, `matchingInfo`, `phoneExt`, `shipPhone`, etc.) and ship a body the backend's DAO will dereference into an NPE → 500.

**Audit-mode rule (G9.1):** when re-running on a pre-existing collection, Block 3 MUST be emitted for the EXISTING request bodies first (showing their current Field Count vs DTO), then re-emitted with the post-fix wire values. This makes the drift visible in chat before any write.

#### Block 4 — Catalog Token Mapping

Per service, ONE table listing every `{{catalog.identityPool.*}}` token that will appear in any request body, with columns: `Endpoint | Model Field | Catalog Token | Format OK? (✅ / ❌ / n/a)`. For unmatched fields, use `n/a` and note the typed-placeholder in parentheses.

#### Block 5 — Chain Wiring Plan

Per service, ONE table listing every chain capture/inject pair (derived from `apiChain[]` walks). Columns: `Producer | Capture Path (e.g., $.referenceId) | Captured As | Consumer | Inject Field | JSON Quoting (quoted (String) | unquoted (Long/Number/Boolean))`.

> **Block 5 is INTRA-service only.** Per G7, no row may have a Producer in a different service. Cross-service consumer endpoints are listed in Block 7 (SKIP Plan) — never wired here.

#### Block 7 — Cross-Service SKIP Plan (G9b HARD GATE)

> One row per CONSUMER endpoint in this service that depends on a producer in a DIFFERENT service. Sources: (a) any `apiChain[]` step where the producer endpoint's owning service ≠ this service, AND (b) any endpoint flagged in Block 8 with Justification `DEFERRED — negative tests blocked by upstream {svc}`. Per G7, the consumer test is generated as a RUNNABLE request whose cross-service field uses `{{catalog.stubs.<currentServiceShortName>.<fieldName>}}`. When the catalog has no stub value, write `TODO-PROVIDE-VALUE` AND append `{ consumerService, consumerEndpoint, field, producerService, producerEndpoint }` to `catalog-gaps.yaml` `requiredStubs:`. The runner auto-classifies the test `data-issue` (per `/tdgs-aidlc-setup-api-tests` Section 5 item 6). Do NOT emit `_skipReason` — the linter LINT-6 rejects it.

Columns: `Consumer endpoint | Upstream (toService) | businessRule | requiredInput ({captured-key} from {producer-svc} POST /...) | resolution (e.g., "Run /tdgs-aidlc-setup-testdata, choose update on ...")`. Footer: `Total cross-service consumer endpoints: N`. For each row, the generated collection MUST wire the cross-service field with `{{catalog.stubs.<currentServiceShortName>.<fieldName>}}` (per G7) and ensure `catalog-gaps.yaml` `requiredStubs:` carries the 5-tuple for any path still `TODO-PROVIDE-VALUE`. The runner classifies `data-issue` automatically. Do NOT emit `_skipReason` — LINT-6 rejects it.

**HARD failure cases** — STOP and re-do this block when:
- Any row has a placeholder/TBD field — every cell MUST be concrete
- A consumer endpoint depends on a cross-service producer but is missing from this table — cross-reference Block 5 to find it
- The same `(consumerEndpoint, toService)` pair appears twice with different `businessRule` text — pick one canonical phrasing and reuse

#### Block 8 — Per-Endpoint Case Matrix (G9 HARD GATE — fixes "per-endpoint test count drift")

> Pre-declares the exact case mix per endpoint so reviewers can spot under-coverage BEFORE the collection is written. This is the API-side analogue of the functional Test Count Budget Reconciliation but at endpoint granularity. Without this matrix, generation can produce 12 positive-only tests for a write endpoint and the dashboard cannot tell whether negative coverage is missing on purpose or by mistake.

Columns (closed enum, in this order): `Endpoint | Pos | Neg | Edge | Sec | Min-Required-Fields | Boundary | Auth | Total | Justification`. Footer: `GRAND TOTAL: {N} tests across {M} endpoints`.

**Case category definitions:**
- **Pos** — default positive (all DTO fields filled, expects 2xx)
- **Neg** — validation/business-rule failure (expects 4xx, NOT 5xx) — wrong enum, pattern violation, FK to non-existent ID
- **Edge** — boundary or unusual but valid request (max-length string, unicode, leap-year date, deeply-nested optional object)
- **Sec** — OWASP-aligned (XSS body, SQLi in query param, path traversal, oversized payload, unauth header)
- **Min-Required-Fields** — ONE positive variant with ONLY required fields, optionals omitted (proves the contract's minimum)
- **Boundary** — explicit min/max for every numeric/string-length field (`@Size`, `@Min`, `@Max`, `CHECK` constraint)
- **Auth** — missing token + invalid token + expired token (when endpoint declares any auth)

**HARD rules:**
- Every WRITE endpoint (`POST`/`PUT`/`PATCH`/`DELETE`) MUST have `Pos ≥ 1` AND `Neg ≥ 1` AND `Min-Required-Fields = 1`. Pos-only is HARD FAILURE unless `Justification` says `DEFERRED — negative tests blocked by upstream {svc} (see Block 7)`.
- Every endpoint with `@Pattern`, `@Email`, `@Min`, `@Max`, `@Size`, or `CHECK` MUST have `Boundary ≥ number-of-constraints`. Under-counting = HARD FAILURE.
- Every endpoint declaring auth (`@PreAuthorize`, `@RolesAllowed`, security filter) MUST have `Auth ≥ 2`. Missing = HARD FAILURE.
- READ endpoints (`GET`/`HEAD`/`OPTIONS`) are exempt from `Min-Required-Fields` and `Boundary` (no body to vary).
- The matrix's `GRAND TOTAL` MUST equal Test Count Budget Reconciliation `FINAL PLANNED TEST COUNT` (Section 3c) ± 5%. Drift = STOP and reconcile.

#### Block 6 — Pre-Write Self-Audit (Checks 1–16 dry-run)

Before writing, the agent MUST self-audit by walking Checks 1–16 against its in-memory generated payloads and emit a status line per check (✅ / ❌ + brief evidence) for: Check 1 Model compliance; Check 2 Catalog compliance; Check 10b G12 variant coverage; Check 11 No literal {{...}} tokens leaked; Check 12 Catalog override compliance; Check 13 Cross-service env-var definitions; Check 14a Positive payload realism; Check 14b PII safety; Check 15 Chain-independent negative/edge tests; Check 16 Positive chain integrity; Check 8 Cross-service stub registry (no `_skipReason`); Check 18 Per-endpoint case-matrix conformance; Check 19 OpenAPI contract alignment.

**Any ❌ in Block 6 = STOP. Do not write.** Fix the in-memory payload, re-run the dry-run, and re-emit Block 6 until all checks pass.

#### Block 9 — OpenAPI Contract Alignment (industry-standard schema gate, MANDATORY when KB OpenAPI exists)

> Harness-green ≠ test-correct. The Pre-Write Contract verifies the GENERATED collection against itself; this block verifies it against the canonical service contract (the KB OpenAPI document). It catches the silent class of defects where a generated test passes locally but ships a request body that violates the published schema (extra fields, missing required, wrong type, wrong enum value, wrong response status assertion). Industry-standard practice (REST Assured, Postman contract testing, Pact consumer-driven contracts, Spring REST Docs): every request and response is schema-validated against the OpenAPI spec at generation time.

**Source of truth:** the KB OpenAPI document(s) under `*-docs*/knowledge-base/api/**/*.{yaml,yml,json}` matching `openapi:` or `swagger:` at the root. If MULTIPLE OpenAPI files exist for the service, merge by `paths.<endpoint>` key — most-specific wins (e.g. `v2` over `v1`). If NO OpenAPI file exists for a given endpoint, this block emits `⚠️ Check 19 SKIPPED — no KB OpenAPI declared for {endpoint}` (per-endpoint, not global) and continues; it does NOT block generation. Skipped endpoints surface in the dashboard's data-issue tile per their existing rules.

**Per-endpoint contract checks (run BEFORE Block 6 self-audit emits ✅ on Check 19):**

For every request body in the generated collection (one per `unit_test` resource):

1. **Request body shape:** `ajv.validate(openapi.paths[endpoint][method].requestBody.content['application/json'].schema, generatedRequestBody)`. ❌ on any AJV error. Reference impl: resolve `$ref` against the OpenAPI's `components.schemas` map; pass `{strict: false, allErrors: true}` (OpenAPI uses some non-JSON-Schema keywords like `nullable`, `discriminator` — strict mode false-positives on these).
2. **Required-field coverage:** `openapi.paths[endpoint][method].requestBody.content['application/json'].schema.required` MUST be a SUBSET of `Object.keys(generatedRequestBody)`. A required field absent from the body is ❌.
3. **No extra-fields drift (positive tests only):** when the OpenAPI schema declares `additionalProperties: false`, `Object.keys(generatedRequestBody)` MUST be a SUBSET of `Object.keys(schema.properties)`. Extra fields = ❌. (Negative-validation tests are EXEMPT — they intentionally inject extra/wrong fields.)
4. **Enum value compliance:** for every property in the body whose schema declares `enum`, the generated value MUST be in the enum list. Wrong enum = ❌. (Negative-validation tests intentionally violating enums are EXEMPT — they emit `caseType: 'negative-validation'` which the dashboard groups separately.)
5. **Format compliance (positive only):** schema-declared `format: date-time|date|email|uuid|uri` is validated by AJV's format add-ons (`require('ajv-formats')(ajv)`). Wrong format = ❌.

For every assertion in every `unit_test.code` block:

6. **Response status assertion compliance:** the asserted status code (typically `expect(response.status).to.equal(<N>)`) MUST exist as a key under `openapi.paths[endpoint][method].responses`. Asserting `expect(...).to.equal(201)` against an OpenAPI that only declares `200`/`400`/`500` = ❌. (Negative-validation tests asserting 4xx are EXEMPT IF the asserted code matches an OpenAPI-declared 4xx response.)
7. **Response body shape (when assertion includes a body match):** `ajv.validate(openapi.paths[endpoint][method].responses[<assertedStatus>].content['application/json'].schema, exampleResponseBody)` where `exampleResponseBody` is either (a) the OpenAPI `example`/`examples` if present, or (b) the captured-shape from a prior chain step. ❌ on shape mismatch (means the assertion expects fields the API does not return).

**Block 9 emit format** (between Block 8 and Block 6 in the Pre-Write Contract): list KB OpenAPI source(s), `Endpoints with OpenAPI contract: N/M ✅`, `Endpoints without contract: N/M`, then per-endpoint × case-type rows showing each of the 7 checks above as ✅ / ❌ / exempt-reason, ending with `TOTAL CHECKS: 7 × N cases = M; PASSED: N; FAILED: N; SKIPPED-NO-CONTRACT: N`.

**Any ❌ in Block 9 = STOP. Do not write.** Fix the generated payload (NOT the OpenAPI schema — the schema is the contract; the test is the consumer). Re-run Block 9 until all checks pass.

**Note on Insomnia v4 + ajv resolution:** the Pre-Write Contract runs in the agent's reasoning, not in a runtime process — the AJV validation is conceptual (the agent walks the OpenAPI schema and the in-memory payload, matching field-by-field, and reports the verdict). The agent MUST NOT scaffold any runtime `ajv` integration into Insomnia collections themselves — keep collections free of runtime schema-validation code (collections are consumed by `inso` v4 + the Node fallback runner per `/tdgs-aidlc-setup-api-tests`, which already handle response-status assertions). Block 9 is a GENERATION-TIME gate.

#### Hard rule

> The agent MUST NOT call `create_file`, `replace_string_in_file`, or any other write tool against `{service-repo}/api-tests/collections/*.json` until ALL nine blocks above (1–5, 7, 8, 9 — then 6 last per the audit ordering) have been emitted in chat with concrete data and Block 6 shows ✅ on every check (including Check 19 from Block 9).
>
> If the agent attempts to write without emitting these blocks, the user is instructed to reply `STOP — emit Pre-Write Output Contract first` and the agent must comply on the next turn.
>
> **Why this is non-negotiable:** the previous generation runs silently skipped the field-by-field DTO walk (Check 1), the catalog override check (Check 12), and the PII safety check (Check 14b). Making the reasoning visible BEFORE the write means the user catches violations at chat time — not after running broken tests against a real backend.