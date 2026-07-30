# Field-Derivation Hierarchy P0–P6

### Field-Derivation Hierarchy P0–P6 (apply per-field, no silent skipping)

> **NOTE — relationship to the 9-step Field Value Resolution Chain (Pre-flight item 3):**
> P0–P6 is the **provenance summary** view (used in the Per-Field Provenance Table for human readability and audit). The 9-step chain is the **algorithm** — it is what the agent walks at generation time. Both views describe the SAME decision; P0–P6 collapses related sources into coarser tiers. **Always use the 9-step chain to RESOLVE values; record the resulting tier in the provenance table using the mapping below.**
>
> | Provenance Tier (P0–P6) | 9-step Chain Steps | Tag(s) used in test name |
> |---|---|---|
> | P0 — Catalog | step 1 | `catalog` |
> | P1 — Captured | step 2 | `chain-capture` |
> | P2 — UI literal | step 6 | `ui-default` |
> | P3 — KB-documented | steps 3, 4, 5 | `kb-openapi-example`, `kb-business-rule`, `kb-data-dictionary` |
> | P4 — DDL/DAO-derived | step 7 (constraint-aware where the source is a DDL `CHECK` or DAO bind format) | `constraint-aware` |
> | P5 — DTO annotation | step 7 (constraint-aware where the source is `@Pattern`/`@Size`/`@Email`/enum) | `constraint-aware` |
> | P6 — Typed placeholder | steps 8 (faker, non-PII only) and 9 (type-literal) | `faker`, `type-literal` |
>
> The Per-Field Provenance Table SHOULD include both the tier (P0–P6) and the 9-step tag in the `source ref` column for full traceability.

For EVERY field in EVERY positive-test request body:

| Tier | Source | Use when |
|------|--------|----------|
| P0 | `{{catalog.identityPool.<pool>.<field>}}` | external-required pool exposes the field AND the Per-Field Value Verification Procedure (above) confirms the catalog's stored format matches the target service's accepted format. If formats mismatch, P0 is rejected — record `reject_reason` and fall through |
| P1 | `{{captured.<name>}}` | upstream `apiChain[]` step's response provides it (emit `capture` on producer + `inject` on consumer) |
| P2 | UI-emitted literal | UI sends a specific value/shape in this same field on the same flow |
| P3 | KB-documented value | `knowledge-base/**/*.md` declares an allowed value or example payload |
| P4 | DDL/DAO-derived literal | constraint or format dictates value (e.g., `CHAR(1)` Y/N flag → `"Y"`/`"N"`; Oracle `NLS_DATE_FORMAT` default → `DD-MON-YYYY`) |
| P5 | DTO annotation literal | `@Pattern` regex sample, first declared enum value, etc. |
| P6 | Typed placeholder | last resort — deterministic literal in DTO's expected type/format AND the test description tagged `(typed-placeholder for <field> — <reject_reason>)` |

**No-skip rule:** if a higher tier applies but is rejected (e.g., format mismatch, pool exhausted), record `reject_reason` in the provenance table and fall through. Skipping a higher tier silently is a generation bug.

**Allowed runtime `{{...}}` tokens** (any other = generation bug): `{{catalog.identityPool.<pool>.<field>}}`, `{{captured.<name>}}`, runner builtins (`{{$timestamp}}`, `{{$randomUUID}}`, `{{$randomInt}}`, `{{$isoTimestamp}}`), and the closed faker token list defined in the test-runner.