# Pre-flight: Ground-Truth Hierarchy

## Pre-flight Check: Ground-Truth Hierarchy (MANDATORY — Self-Sustained Spec)

> ⚠️ **This section is the single, authoritative rule** for choosing any value placed in a request body, environment file, or assertion produced by THIS prompt. It is intentionally self-contained — do not look elsewhere. Applies to every positive-test artifact.

### Workspace Sources (scan in this order, before generating anything)

1. **project-context.md** — `*-docs*/project-context.md`
2. **Test data catalog** — `*-docs*/test-data/test-data-catalog.yaml` (top-level `apiChain[]`, `uiScreens[]`, `identityPools[]`)
3. **Knowledge base** (MANDATORY when `*-docs*/knowledge-base/` exists) — recursively index `knowledge-base/{api,business,common-services,repos,shared}/**/*.md` for example payloads, allowed enums, header rules, status-code semantics
4. **Client app — caller-side payload construction (HIGHEST FIDELITY for VALUES; AUTHORITATIVE for SHAPE)** — discover the client transport wrapper directory (try in order: `*-ui*/src/api/`, `*-ui*/src/services/`, `*-ui*/src/client/`, `*-ui*/src/http/`, `*-ui*/src/lib/api/`; honor any explicit override in `project-context.md`). Apigee or any reverse proxy in front of the backend is IRRELEVANT here — we are validating the backend API, and the client is the closest live witness to the wire contract the backend actually receives in production.
   **Critical procedure (apply per endpoint, no exceptions):**
   a. Open the client wrapper file for the endpoint (e.g., `src/api/<EndpointName>.{js,ts,tsx}`). If its body is a **transport pass-through** — detected by any of: `requestObject\s*=\s*props`, `body:\s*\w+\s*[,}]`, `data:\s*\w+\s*[,}]`, function arg forwarded directly to a generic POST/GET helper, no inline object literal — then the wrapper holds NO field values; it only holds the URL/method.
   b. **Trace ALL callers of that wrapper** with a recursive grep across the client repo: `grep -rn --include='*.{js,ts,jsx,tsx,vue,svelte}' -e 'import .*<WrapperName>' -e '<WrapperName>(' {client-repo}/src` and open EVERY caller. The literal payload — including agency/tenant/application IDs, enum string values (e.g., shipping `type`), single-character flag conventions (e.g., `"Y"`/`"N"`), empty-string vs zero-padded conventions, address sub-object keys with their exact casing, fee/amount semantics (flag char vs dollar string vs number) — lives in those caller files, NOT in the wrapper.
   c. When multiple callers exist, treat the union of their literals as the canonical shape; differences across callers indicate workflow variants and MUST be enumerated in Block 8 (Per-Endpoint Case Matrix) — at least one positive test per distinct caller-shape.
   c-bis. **Intra-caller variant enumeration (MANDATORY — a single caller is rarely a single variant).** For EACH caller file, scan its body for:
      - **Discriminator-field branching**: any `if`/`switch`/ternary/early-return whose condition tests a string field name that looks discriminator-like (regex anchor: `(record|certificate|product|order|document|transaction|account|case|application|service|request|message|event|notification)Type`, plus any field name ending in `Type`, `Kind`, `Category`, `Reason`, `Status`, `Code`, `Subtype`, `Variant`, `Mode`, `Action`, `Operation`, `Method`, `Channel`). Capture every literal string assigned to or compared against that field across all branches.
      - **Literal-array enumeration**: arrays of objects (e.g., `[{recordType: "X", ...}, {recordType: "Y", ...}]`) where each entry assigns a different value to the same key — each entry is a variant.
      - **Late mutation**: assignments like `obj.recordType = "Z"` AFTER the initial literal (rewrite/normalization shims). Each end-state value is a variant.
      - **Cross-file casing collisions**: when two callers use the same logical field with different key casing (e.g., `recordType` vs `RecordType`) or different value casing (e.g., `"Birth"` vs `"BIRTH"` vs `"Birth Verification"`), each casing is a distinct variant the backend must accept (or reject — verify against DTO `@JsonProperty` and any `@JsonAlias`).
      The output of this scan is a `variantMatrix[]` per endpoint: `{discriminatorField, value, callerFile:line, sharedFieldOverrides}`. Every row becomes a positive test (Gate #7).
   c-ter. **Sibling-page variant discovery.** Endpoints commonly have one caller per record-type family living in sibling directories (e.g., `pages/birthRecord/`, `pages/deathRecord/`, `pages/divorceRecord/`, `pages/marriageRecord/`). After step b, ALSO run `find {client-repo}/src -type d -name '*Record' -o -name '*Application' -o -name '*Request' -o -name '*Form'` and grep each sibling directory for the same wrapper. Missing sibling = missing variant in the test collection.
   d. When multiple callers exist, treat the union of their literals as the canonical shape; differences across callers indicate workflow variants and MUST be enumerated in Block 8 (Per-Endpoint Case Matrix) — at least one positive test per distinct caller-shape.
   e. If the client repo is missing OR an endpoint has zero callers (server-to-server endpoint), look for committed Apigee proxy bundles, OpenAPI `examples`, or integration tests; if none exist, that field set goes to STOP — ask the user (do NOT infer from DTO names).
   **Authoritative for payload SHAPE AND VALUES**: JSON key casing (e.g., `zipExt` vs `Zipext` — caller dictates), enum literal casing (e.g., `"Express"` vs `"REGULAR"`), single-char flag conventions, empty-string conventions, optional-field presence, and every literal constant.
5. **Backend DTO/schema** — request/response classes with `@JsonProperty`, `@Pattern`, `@Size`, `@NotNull`, enums. **Authoritative for field NAMES and NESTING STRUCTURE** the deserializer accepts. For nested DTOs, open each nested type's source file to extract its actual field names — never trust KB OpenAPI alone for nested object structure (OpenAPI specs commonly flatten, rename, or omit nested fields). **DTO source is for STRUCTURE ONLY, NEVER for VALUES.** Inferring a value from a DTO field name (e.g., guessing `homeVisitDonation` is a dollar amount because it sounds like one when the caller actually sends `"Y"`/`"N"`; or guessing `agencyId` should equal the application code when the caller sends a department code; or guessing a date format from a `LocalDate` type when the DAO uses raw String bind) is a **HARD FAILURE** of this prompt. If Source #4 produced no value for a required field, the resolution chain falls through to lower tiers (KB → DDL → constraint-aware) but NEVER back-fills from the DTO field name.
6. **DDL** — every `*.sql` in the workspace. Index `VARCHAR2(N)`, `CHAR(N)`, `NUMBER(p,s)`, `CHECK (col IN (…))`, `NOT NULL`. **Authoritative for value constraints** at the persistence boundary
7. **DAO layer** — for every persisted field, inspect the bind statement. If a String is bound without a wrapping conversion (e.g., `TO_DATE(?, 'fmt')`, `TO_NUMBER(?)`, `TO_TIMESTAMP_TZ(?, 'fmt')`), the input must already be in the DB session's default format. **Authoritative for format.** This is the key input to the Per-Field Value Verification Procedure — every field that reaches the DAO must have its bind format checked before a value/token is chosen.

### Field-Derivation Hierarchy P0–P6

Full rules: **tools/field-derivation-hierarchy.md**. Per-field provenance table columns below are unchanged.



### Per-Field Provenance Table (MANDATORY in Pre-Write Contract)

For each positive request body, emit BEFORE writing files. The `tier` column uses P0–P6 (provenance summary); the `9-step tag` column uses the resolution-chain tag (algorithmic source). Both MUST be present so the table doubles as the audit log:

```
| field path                  | tier | 9-step tag           | source ref                              | value/token                                            | reject_reason (if higher tier rejected) |
|-----------------------------|------|----------------------|-----------------------------------------|--------------------------------------------------------|------------------------------------------|
| applicant.firstName         | P0   | catalog              | identityPools.{pool-type}               | {{catalog.identityPool.{pool-type}.firstName}}         |                                          |
| applicant.dateOfBirth       | P4   | constraint-aware     | {DaoImpl}.java:{line} raw bind :DATE_FIELD → NLS DD-Mon-YYYY | "01-Jun-1977"                          | P0 rejected: catalog stores MM/DD/YYYY, service DAO needs DD-Mon-YYYY |
| verification.licenseFlag    | P2   | ui-default           | {ui-repo}/src/screens/{Screen}.jsx      | "Y"                                                    |                                          |
| deliveryFee                 | P6   | type-literal         | —                                       | "0"                                                    | UI sets at later step                    |
```

A contract with un-explained P6s is **rejected at the gate** — return to workspace sources and re-derive. **A P4 without a `source ref` showing the DAO/DDL/annotation location is also rejected** — you must show WHERE you found the format requirement.

### Typed-Placeholder Fallback Rule

> ⚠️ **This is the canonical "last-resort literal" rule referenced throughout the prompt.** It is a NAMED ALIAS for steps 7, 8, and 9 of the Field Value Resolution Chain (Pre-flight item 3) and tier P6 of the Field-Derivation Hierarchy. When a field has NO catalog source, NO upstream chain producer, NO KB documentation, NO UI default, and NO constraint annotation that pins a value, the agent MUST emit a deterministic typed literal in the DTO's expected wire format AND tag the test name `(uses typed-placeholder for <field>)` so the report classifier counts it correctly.

**Default typed literals by JSON/Java/Python/TS/C# type (memorize this table — it is the SINGLE source of fallback values):**

| Type | Literal | Notes |
|---|---|---|
| `String` (no `@Pattern`/`@Email`) | `"placeholder-string"` | Length-safe; alphanumeric only |
| `String` with `@Email` | `"noreply@example.com"` | RFC 2606 reserved domain — NEVER `*.test` (some validators reject) |
| `String` with `@Pattern("^[A-Z]{2}$")` (state code) | `"XX"` or first known enum member | NEVER `"placeholder-string"` (regex fail) |
| `String` with `@Size(min=N,max=N)` numeric | `"5"` repeated N times (e.g., `"5550100000"`) | Length-exact |
| `Integer` / `int` / `Long` / `long` / `Short` | `0` (or `1` if controller has `if (x == 0) throw ...` guard) | JSON number, no quotes |
| `Double` / `Float` / `BigDecimal` | `0.0` | JSON number |
| `Boolean` / `boolean` | `false` | JSON `false`, no quotes |
| `LocalDate` | `"2026-01-01"` | ISO-8601 unless DAO/`@JsonFormat` overrides |
| `LocalDateTime` / `Instant` | `"2026-01-01T00:00:00Z"` | ISO-8601 with offset |
| `Date` (Oracle raw bind without `TO_DATE()`) | `"01-Jan-2000"` | `DD-Mon-YYYY` (Oracle `NLS_DATE_FORMAT` default) |
| `Date` with `@JsonFormat(pattern="dd-MMM-yyyy")` | `"01-Jan-2000"` | Match the declared format exactly |
| `String` phone | `"555-0100"` | NANP reserved 555-01XX block (never reaches a real number) |
| `UUID` / `Guid` | `"00000000-0000-0000-0000-000000000000"` | Nil UUID |
| `Enum` | first declared value | Read source order |
| Optional/nullable field with no signal (negative/minimal test) | `null` (omit key) | Use ONLY in the "minimal positive" variant and negative tests. NEVER in the default positive test. |
| Optional/nullable field with no signal (default positive test) | `""` (empty string) or typed-placeholder per type | The DEFAULT positive body MUST include ALL optional fields — use `""` for String unless `@Size(min=1)` exists (then use a 1-char placeholder). This rule is NON-NEGOTIABLE for positive tests — it overrides the null/omit-key row above. |
| `List<T>` / array (required, non-empty) | `[ <one entry of T's typed literal> ]` | Recurse on T |
| Nested DTO (required) | recursively populate every leaf with its typed literal | NEVER `{}` for `@NotNull` nested object |

**Faker tokens (step 8) are allowed ONLY for non-PII filler** (city, state, zip, street, country, generic free-text, generic UUIDs, timestamps). Faker on PII fields (`firstName`, `lastName`, `email`, `phone`, `dob`, `ssn`, government IDs) is a HARD FAILURE — see Check 14 Part B and the canonical PII regex in Pre-flight item 3.

**Test-name tagging is MANDATORY:** any positive test that uses a typed-placeholder literal for one or more fields MUST include the suffix `(uses typed-placeholder for <fieldA>, <fieldB>)` in its `name`. This is what the report classifier reads to differentiate "real positive coverage" from "structural smoke test".

### Generation-Time Self-Validation Gate (MANDATORY before any write)

For every positive request body about to be written:

1. Parse it (must succeed as JSON)
2. Every `{{...}}` token is in the allowed set. Otherwise → STOP
3. Every key appears in the DTO's accepted JSON schema (case-sensitive). Mismatched → STOP (Jackson silently drops mismatched keys → false positives)
4. Every literal complies with DDL constraints (length, CHECK, NOT NULL). Violation → STOP
5. Every field value passed the Per-Field Value Verification Procedure — no format mismatch between the emitted value and the service's DAO/parser/DB expectation. Mismatch → STOP
6. **Caller-Provenance Gate (HARD GATE):** every NON-token literal value (i.e., not a `{{catalog.*}}`, `{{captured.*}}`, or runner builtin) MUST cite a concrete `file:line` reference in the Per-Field Provenance Table pointing at a caller-side payload literal (Source #4) OR a catalog-gaps entry OR a constraint-aware derivation (DDL CHECK / DAO bind format / `@Pattern` / explicit enum). A literal value whose `source ref` column says only "DTO field type" or "DTO field name" or "inferred" → STOP. This gate exists because DTO-name inference is the dominant root cause of incorrect positive bodies (wrong enum values, wrong flag semantics, wrong agency/tenant IDs, wrong date formats, wrong empty-string conventions).
7. **Workflow-Variant Coverage Gate:** the union of (distinct caller-shapes from Source #4 step b) + (intra-caller `variantMatrix[]` rows from Source #4 step c-bis) + (sibling-page variants from step c-ter) defines the REQUIRED positive-test count for the endpoint. Let that union have V rows. The generated collection MUST contain at least V positive tests, each named with the variant tag (e.g., `[positive][variant=recordType:Birth_Verification_Online]`, `[positive][variant=recordType:Death_Certificate]`, `[positive][variant=keyCasing:RecordType-uppercase]`). Coverage of fewer than V variants → STOP. The discriminator field, the variant value, and the caller `file:line` MUST appear in the per-endpoint provenance block so the gap is auditable.

If any check fails: do NOT write the file; report the violation; ask the user.

### Catalog-Gaps Feedback Loop (MANDATORY emit)

When ANY field falls to P6 because the catalog lacked it OR its format didn't match, append to `*-docs*/test-data/catalog-gaps.yaml`:

```yaml
gaps:
  - poolType: "{pool-type}"                  # null if a brand-new pool is needed
    field: "dateOfBirth"
    catalogFormat: "MM/DD/YYYY"              # what the catalog currently stores
    requiredFormat: "DD-Mon-YYYY"            # what the target service's DAO/parser needs
    requestedBy: ["POST /v1/.../{producer-endpoint}"]
    reason: "catalog stores MM/DD/YYYY; DAO binds as raw String without TO_DATE() → Oracle NLS DD-MON-RR"
    suggestedValue: "19-Jan-1961"
    detectedAt: "{DaoImpl}.java:{line}"      # code location where format was determined
```

The next run of `/tdgs-aidlc-setup-testdata` reads this file and prompts the user to populate the missing fields/formats — closing the loop generically, app-agnostically.

### Role of THIS prompt in the Hierarchy

**You are a CONSUMER.** For every positive request body in a generated collection: (1) emit the Per-Field Provenance Table in the Pre-Write Contract (one table per request), (2) run the Self-Validation Gate before writing the collection JSON, (3) append catalog-gaps.yaml entries when any field falls to P6, (4) annotate each test name with `(uses typed-placeholder for <fields>)` whenever P6 is used so the generated report classifies the test correctly.
