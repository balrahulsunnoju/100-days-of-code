# Pre-flight — Ground-Truth Hierarchy (Self-Sustained Spec)

> ⚠️ **Single, authoritative rule** for choosing any value placed in a Playwright form-fill, factory output, fixture, or assertion produced by THIS prompt. Self-contained — do not look elsewhere. Applies to every positive-test artifact.

## Workspace Sources (scan in this order, before generating anything)

1. **project-context.md** — `*-docs*/project-context.md`
2. **Test data catalog** — `*-docs*/test-data/test-data-catalog.yaml`
3. **Knowledge base** (MANDATORY when `*-docs*/knowledge-base/` exists) — recursively index `knowledge-base/{api,business,common-services,repos,shared}/**/*.md`
4. **UI repository** — discover the UI API client directory (try in order: `*-ui*/src/api/`, `*-ui*/src/services/`, `*-ui*/src/client/`, `*-ui*/src/http/`, `*-ui*/src/lib/api/`; honor any explicit override in `project-context.md`). Then add screen components, Yup/Zod schemas, dropdown sources, date validators. **Authoritative for FORM SHAPE**: field labels, allowed enum literals, conditional visibility, validation regex
5. **Backend DTO/schema** — request/response classes. Authoritative for field NAMES the API will accept after the form submits
6. **DDL** — every `*.sql`. Authoritative for value constraints
7. **DAO layer** — bind-statement format inference. Authoritative for format

## Field-Derivation Hierarchy P0–P6 (apply per-form-field, no silent skipping)

| Tier | Source | Use when |
|------|--------|----------|
| P0 | `{{catalog.identityPool.<pool>.<field>}}` | external-required pool exposes the field AND its stored format matches the UI input. **Skip pools whose `class !== 'external-required'`** — `derivable-from-ui` pools have empty `records[]` by design (see `/tdgs-aidlc-setup-testdata` Hard Rule #17) and tokens against them would fail the runner's unresolved-token guard. |
| P1 | `{{captured.<name>}}` | a prior screen step's API response provided it (e.g., `{businessId}` rendered into next page) |
| P2 | UI Yup/Zod schema example | UI source declares allowed values/shape (regex example, dropdown first option, etc.) |
| P3 | KB-documented value | `knowledge-base/**/*.md` declares it |
| P4 | DDL/DAO-derived literal | constraint or format dictates value (e.g., `CHAR(1)` flag → `"Y"`/`"N"`) |
| P5 | DTO annotation literal | `@Pattern` regex sample, first declared enum value |
| P6 | Typed placeholder | last resort — deterministic literal in UI input format AND test description tagged `(typed-placeholder for <field> — <reject_reason>)` |

**No-skip rule:** if a higher tier applies but is rejected, record `reject_reason` and fall through. Skipping silently = generation bug.

**Allowed runtime tokens in factory output**: `{{catalog.identityPool.*}}`, `{{captured.*}}`, Playwright builtins, closed faker list. Any other = generation bug.

## Per-Field Provenance Table (MANDATORY in Pre-Write Contract)

For each spec / factory positive scenario, emit BEFORE writing:

```
| field path (form locator)   | tier | source ref                              | value/token                                            | reject_reason (P6 only) |
|-----------------------------|------|-----------------------------------------|--------------------------------------------------------|--------------------------|
| input[name=firstName]       | P0   | identityPools.identity-{persona}        | {{catalog.identityPool.identity-{persona}.firstName}}  |                          |
| input[name=dateOfBirth]     | P2   | ui-repo/src/screens/{Screen}.jsx Yup    | "06/01/1977" (MM/DD/YYYY)                              |                          |
| select[name=deliveryType]   | P2   | ui-repo/src/api/{module}.js dropdown    | "Express"                                              |                          |
```

A contract with un-explained P6s is **rejected at the gate**.

## Generation-Time Self-Validation Gate

(1) Parse spec/factory as valid TS/JS, (2) every form-fill value resolves to allowed set / valid literal, (3) every form field locator corresponds to a real selector found in the UI source, (4) every literal complies with the UI's Yup/Zod schema, (5) every persisted format field matches DAO format. Any failure → STOP.

## Catalog-Gaps Feedback Loop (MANDATORY emit)

When any form-fill value falls to P6 due to missing/mismatched catalog data, append to `*-docs*/test-data/catalog-gaps.yaml`:

```yaml
gaps:
  - poolType: "<pool|null>"
    field: "<suggested catalog field name>"
    requiredFormat: "<UI/DTO-required format>"
    requestedBy: ["<screen-or-spec path>"]
    reason: "<why P0 rejected>"
    suggestedValue: "<example>"
```

The next run of `/tdgs-aidlc-setup-testdata` reads this file and prompts the user to populate the missing fields/formats.

## Role of THIS prompt in the Hierarchy

**You are a CONSUMER.** For every positive scenario in a generated spec: (1) emit the Per-Field Provenance Table per scenario in the Pre-Write Contract, (2) run the Self-Validation Gate before writing each `*.spec.js`, (3) append catalog-gaps.yaml entries when any form-fill falls to P6, (4) annotate each scenario with `(uses typed-placeholder for <fields>)` so the generated report classifies the result correctly.
