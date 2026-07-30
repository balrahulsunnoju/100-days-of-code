# Setup Test Data — Ground-Truth Hierarchy

## Pre-flight

> The workspace root is NOT a git repository. Git repos live in subdirectories. Do **not** run `git` at workspace root. All artifacts created by this prompt go into the **docs repo's** `test-data/` directory — never workspace root, never service repos.

---

## Step 0 — Read `project-context.md` (MANDATORY)

1. Find `project-context.md` (typically `*-docs*/project-context.md`).
2. If missing, STOP and tell the user to run `/bmad-generate-project-context` first.
3. Extract: tech stack, UI framework, backend framework, auth mechanism. Use these at runtime — never hardcode versions.

---

## Pre-flight Check: Ground-Truth Hierarchy (MANDATORY — Self-Sustained Spec)

> ⚠️ **This section is the single, authoritative rule** for choosing any value placed in a payload, fixture, mock, or form-fill produced by this prompt or by any prompt that consumes the catalog this prompt produces. Self-contained — do not look elsewhere.

### Workspace Sources (scan in this order, before generating anything)

1. **project-context.md** — `*-docs*/project-context.md`
2. **Test data catalog** — `*-docs*/test-data/test-data-catalog.yaml` (top-level `apiChain[]`, `uiScreens[]`, `identityPools[]`)
3. **Knowledge base** (MANDATORY when `*-docs*/knowledge-base/` exists) — recursively index `knowledge-base/{api,business,common-services,repos,shared}/**/*.md` for example payloads, allowed enums, header rules, status-code semantics
4. **UI repository** — discover the UI API client directory (try in order: `*-ui*/src/api/`, `*-ui*/src/services/`, `*-ui*/src/client/`, `*-ui*/src/http/`, `*-ui*/src/lib/api/`; honor `project-context.md` override) + screen components that build payloads. **Authoritative for payload SHAPE**: JSON key casing, value prefixes, enum literal casing, conditional field presence. If NO UI repo is detected (backend-only workspace), skip UI sources and rely on backend DTO + DDL + KB only.
5. **Backend DTO/schema** — request/response classes with `@JsonProperty`, `@Pattern`, `@Size`, `@NotNull`, enums. **Authoritative for field NAMES** the deserializer accepts
6. **DDL** — every `*.sql` in the workspace. Index `VARCHAR2(N)`, `CHAR(N)`, `NUMBER(p,s)`, `CHECK (col IN (…))`, `NOT NULL`. **Authoritative for value constraints** at the persistence boundary
7. **DAO layer** — for every persisted field, inspect the bind statement. If a String is bound without a wrapping conversion (e.g., `TO_DATE(?, 'fmt')`, `TO_NUMBER(?)`, `TO_TIMESTAMP_TZ(?, 'fmt')`), the input must already be in the DB session's default format. **Authoritative for format**

### Field-Derivation Hierarchy P0–P6 (apply per-field, no silent skipping)

For EVERY field in EVERY positive-test payload/fixture/form-fill produced downstream:

| Tier | Source | Use when |
|------|--------|----------|
| P0 | `{{catalog.identityPool.<pool>.<field>}}` | external-required pool exposes the field AND its stored format matches the DTO's expected format. **Skip pools whose `class === 'derivable-from-ui'`** — their `records[]` is empty by design (the runner derives values from UI source files at fill time, not from the catalog), so a `{{catalog.identityPool.*}}` token against them would resolve to literal text and fail the runner's unresolved-token guard. |
| P1 | `{{captured.<name>}}` | upstream `apiChain[]` step's response provides it (emit `capture` on producer + `inject` on consumer) |
| P2 | UI-emitted literal | UI sends a specific value/shape in this same field on the same flow |
| P3 | KB-documented value | `knowledge-base/**/*.md` declares an allowed value or example payload |
| P4 | DDL/DAO-derived literal | constraint or format dictates the value (e.g., `CHAR(1)` Y/N flag → `"Y"`/`"N"`; Oracle `NLS_DATE_FORMAT` default → `DD-MON-YYYY`) |
| P5 | DTO annotation literal | `@Pattern` regex sample, first declared enum value, etc. |
| P6 | Typed placeholder | last resort — deterministic literal in DTO's expected type/format AND the test description tagged `(typed-placeholder for <field> — <reject_reason>)` |

**No-skip rule:** if a higher tier applies but is rejected (e.g., format mismatch, pool exhausted), record `reject_reason` in the provenance table and fall through. Skipping a higher tier silently is a generation bug.

**Allowed runtime `{{...}}` tokens** (any other = generation bug): `{{catalog.identityPool.<pool>.<field>}}`, `{{captured.<name>}}`, runner builtins (`{{$timestamp}}`, `{{$randomUUID}}`, `{{$randomInt}}`, `{{$isoTimestamp}}`), and the closed faker token list defined in the test-runner.

### Per-Field Provenance Table (MANDATORY in Pre-Write Contract of consumer prompts)

For each positive request body / fixture, the consumer prompt MUST emit BEFORE writing files:

```
| field path                  | tier | source ref                              | value/token                                            | reject_reason (P6 only) |
|-----------------------------|------|-----------------------------------------|--------------------------------------------------------|--------------------------|
| applicant.firstName         | P0   | identityPools.{pool-type}               | {{catalog.identityPool.{pool-type}.firstName}}         |                          |
| applicant.dateOfBirth       | P4   | DAO bind w/o TO_DATE → NLS DD-MON-YYYY  | "01-JUN-1977"                                          |                          |
| verification.licenseFlag    | P2   | {ui-repo}/src/screens/{Screen}.jsx      | "Y"                                                    |                          |
| deliveryFee                 | P6   | —                                       | "0"                                                    | UI sets at later step    |
```

A contract with un-explained P6s is **rejected at the gate**.

### Generation-Time Self-Validation Gate (MANDATORY before any write)

For every positive artifact about to be written: (1) parse as JSON / valid syntax, (2) every `{{...}}` token is in the allowed set, (3) every key appears in the DTO's accepted JSON schema (case-sensitive — Jackson silently drops mismatched keys), (4) every literal complies with DDL constraints, (5) every field value has been verified against the target service's DAO/parser/DB format expectations per the Per-Field Value Verification Procedure in `/tdgs-aidlc-generate-api-tests`. Any failure → STOP, do not write, ask user.

### Catalog-Gaps Feedback Loop

Downstream generators (api/functional/unit) append to `*-docs*/test-data/catalog-gaps.yaml` whenever a field falls to P6:

```yaml
gaps:
  - poolType: "{pool-type}"                  # null if a brand-new pool is needed
    field: "dateOfBirth"
    catalogFormat: "MM/DD/YYYY"              # what the catalog currently stores
    requiredFormat: "DD-Mon-YYYY"            # what the target service's DAO/parser needs
    requestedBy: ["POST /v1/.../CreateRecord"]
    reason: "catalog stores MM/DD/YYYY; DAO binds as raw String without TO_DATE() → Oracle NLS DD-MON-RR"
    suggestedValue: "19-Jan-1961"
    detectedAt: "{DaoImpl}.java:{line}"      # code location where format was determined
```

### Role of THIS prompt in the Hierarchy

**You are the PRODUCER of the catalog.** At the start of Step 2 (Ask for test data ONLY when needed), READ `*-docs*/test-data/catalog-gaps.yaml` if it exists. For each gap entry: ASK the user to provide a value in the required format, MERGE it into the appropriate identityPool record (or create a new pool if `poolType: null`), DELETE resolved entries, PRESERVE unresolved ones. This closes the feedback loop with downstream generation runs.

> **Field format metadata (MANDATORY):** The catalog is consumed by multiple downstream prompts that each generate collections for different services. Those services may require different formats for the same field (e.g., one service's Oracle DAO needs `DD-Mon-YYYY`, another service's parser uses `M/d/yyyy`). The catalog stores values in a SINGLE canonical format (the user-pasted format). It is the **downstream generator's responsibility** (not the catalog's) to detect format mismatches per-service by running the Per-Field Value Verification Procedure (see `/tdgs-aidlc-generate-api-tests`). However, this prompt MUST record the stored format for each field in a `fieldFormats` block on each pool so consumers can detect mismatches without parsing every value:
> ```yaml
> fieldFormats:
>   dateOfBirth: "MM/DD/YYYY"   # inferred from the stored value pattern
>   ssnLast4: "NNNN"            # 4-digit numeric string
>   ssn: "NNNNNNNNN"            # 9-digit numeric string
> ```
> Infer the format from the first non-placeholder record's value. If the user pastes values in an unexpected format, note the detected format.

> **YAML scalar typing for record values (MANDATORY — symmetric with `/tdgs-aidlc-generate-api-tests` Check 4 catalog-token-quoting rule):** When writing a record's `fields[]` to the catalog YAML, infer the JSON type the consumer's `@RequestBody` model expects (Phase 1 model discovery; with multiple consumers, prefer most-restrictive type — `Long` over `String`). Author the YAML scalar accordingly:
> - Numeric model field (`Integer`/`Long`/`Double`/`BigDecimal`, Python `int`/`float`, TS `number`) → unquoted: `accountId: 12345`. Quoted scalars become JS strings; unquoted numerics become JS numbers — downstream emitter cannot recover intent.
> - Boolean → `active: true` / `false` (no quotes).
> - String model field (including digit-only IDs declared as `String` — SSN, license, phone) → quote to prevent js-yaml stripping leading zeros: `ssn: "012345678"`.
> - Date / temporal (`LocalDate`/`Instant`) → quote (string in JSON): `dateOfBirth: "01/19/1961"`.
> - **Model type unknown** (setup-testdata runs before setup-api-tests for any service): PRESERVE user-pasted form verbatim; do NOT coerce. Emit one-line warning: `⚠️ identity-{pool}.{field}: model unknown — preserved as user-pasted ({yaml-form}). Re-run after /tdgs-aidlc-setup-api-tests to enable type-aware authoring.`
> Display a one-line note per pool when this rule changes a value's quoting (e.g., `ℹ️ identity-{pool}.ssn: re-quoted to string (model declares String — leading-zero preservation)`).

---
