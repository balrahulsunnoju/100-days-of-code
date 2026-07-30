# Setup Test Data — Guardrails

## Guardrails (Non-Negotiable, Read First)

### G1 — Application-agnostic
No specific app/vendor/service/field names. Every endpoint, screen, identifier, and field name is discovered from the workspace and knowledge base.

### G2 — Discover-before-generate
Discovery sources in priority order:
1. `*-docs*/project-context.md`
2. `*-docs*/knowledge-base/` (api/, business/, repos/, common-services/, apigee/)
3. Service repo controllers / models / validators
4. UI repo routes / forms
5. Existing `test-data-catalog.yaml` (preserve)

### G3 — Ask-don't-assume
Never invent identity record values (DOB, SSN, DL, names). Always ask the user to populate them. Records may be filled with `PLACEHOLDER_*` sentinels initially; tests that consume them are then classified `data-issue`.

### G4 — No hallucinated dashboard groupings
Dashboard grouping/correlation MUST be DERIVED from the catalog at runtime, not hard-coded. Specifically: read all `apiChain[].capture[].as` field names, rank by frequency, and use the most-captured field as the cross-service correlation key. Do NOT hard-code a 5-field lookup chain assuming any specific app's schema.

### G6 — PII safety
Identity pool records may contain realistic PII-shaped values (DL/DOB/SSN) sourced from non-prod fixtures. The catalog file MUST be added to `.gitignore` if not already (it is local-only, never committed). ALL fields — including PII and payment-card PAN — are rendered **plain text** in the dashboard / reports / logs / db-transactions.json. No masking, no redaction, no obfuscation. Operators viewing the dashboard need exact values to: (a) triage which catalog row a test consumed, (b) copy-paste into SQL Developer MCP queries (`WHERE ssn = '123456789'`), (c) reset records when needed. Since all artifacts are local-only and gitignored, masking would only obscure debugging without adding protection. The catalog itself is the single source of truth and is never echoed to remote logs / CI artifacts / chat surfaces.

### G7 — Cross-service / external dependency
When `apiChain[]` declares a step that depends on a cross-service or external call this framework cannot make, mark the chain step `kind: cross-service-dependency` with `missingPrereq: <description>`. Downstream consumers (api-tests, functional-tests) read this and classify the test as `skipped` (G7 in those prompts) ONLY when no stub value can be supplied; otherwise the consumer test is wired to the canonical `stubs:` block (see G7a below) and runs normally.

**G7a — Cross-service `stubs:` block (CANONICAL — single source of truth for backend-direct API tests):**
Backend API tests target the consumer service DIRECTLY (no Apigee, no Lambda, no producer service execution). Any field whose value would normally come from another service in production MUST be supplied as test data via the catalog's top-level `stubs:` block. Schema:
```yaml
stubs:
  <consumerServiceShortName>:    # MUST match apiChain[].steps[].serviceOwner short form (e.g. "receipt", "verificationletter", "orderdetails")
    <fieldName>: "<value>"       # camelCase request-body field name; literal value the runner will inject
    # Runtime override env var: CATALOG_STUB_<UPPER_SVC>_<UPPER_FIELD>
    # Sentinel "TODO-PROVIDE-VALUE" = generator detected the dependency but the user has not supplied a real value yet → tests classify as data-issue at runtime.
```
This prompt MUST initialize the `stubs:` block (with `{}` if no cross-service dependencies are inferred) so `/tdgs-aidlc-generate-api-tests` can append entries via its G7.3 auto-register path. NEVER nest stubs by endpoint or HTTP verb. NEVER move PII or identity values into `stubs:` — those belong in `identityPools[]` only. The `stubs:` block is exclusively for cross-service business identifiers (orderNumber, transactionId, traceNumber, confirmationNumber, etc.).

**G7b — `apiChain[].steps[].serviceOwner` (RECOMMENDED — required for cross-service detection to work):**
Each `apiChain[].steps[]` SHOULD carry `serviceOwner: "<short-name>"` (the kebab-case short form of the producing service, e.g. `orderdetails`, `receipt`, `verificationletter`). When absent, the generator infers it from the step's URL prefix or `base_url` env-var name — but explicit `serviceOwner` is more reliable. The generator's Check 19 uses this field to classify each downstream consumer field as intra-service (use `{{captured.*}}`) vs cross-service (use `{{catalog.stubs.<consumerSvc>.<field>}}`).

**G7c — `apiChain[].steps[].via[]` (proxy/lambda hop annotation):**
Each `apiChain[].steps[]` MAY carry `via: [<hop>, ...]` where each hop is one of `apigee | lambda | other:<name>`. Documents the production network path; feeds the dashboard's Chain Contract Mismatches `proxyHop`. INFORMATIONAL ONLY for backend-direct API tests (test bypasses proxy); authoritative for functional-tests. Discovery rule: scan UI `base_url` env vars (`*.execute-api.*.amazonaws.com` → `lambda`; `*-api.apigee.net` → `apigee`) and controller `@Forwarded`/proxy headers. Indeterminate → omit (defaults to `direct`). Intra-service steps MUST have empty/omitted `via[]` — Check 19 warns otherwise.

**Chain captures are emitted as best-effort placeholders.** Generator wires every `capture[]` JSONPath inferable from the producer's KB OpenAPI/DTO/response example. Runtime shape mismatch → runner auto-classifies dependent downstream test as `data-issue` (JSONPath miss) or `infra` (producer 4xx/5xx) — NEVER `fail`. **Status enum is closed (7 values, see `/tdgs-aidlc-setup-api-tests` Section 5.0); never invent a new status — the math invariant would shatter.** When `data-issue` cause is chain capture miss, runner attaches a `chainBreak` block (8 fields per the canonical contract at `/tdgs-aidlc-setup-api-tests` line 715: `producerEndpoint`, `consumerEndpoint`, `inferredPath`, `observedShape`, `proxyHop`, `suggestedFix`, `collectionFile`, `collectionLineHint`). Per-service `test-report.md` Chain Contract Mismatches sub-panel renders one row per `chainBreak` with a Quick Action linking `{collectionFile}:{collectionLineHint}`. Workspace dashboard rolls up `Data Issue`/`Infra` counts only — chain-break detail lives in per-service report. Runtime classification IS the signal — no catalog flag, no two-phase confirm.

### G8 — Pre-Write Output Contract
Before writing/merging the catalog, ledger, dashboard, or schemas, emit the file list with absolute paths, byte estimates, and a diff summary against the existing copy.

### G9 — Idempotency (CRITICAL for this prompt)
Merge semantics:
- `identityPools[*].records[]` — preserve existing; ADD new placeholders if endpoints reference unmapped pools.
- `apiChain[]` — preserve user-edited `capture`/`inject` wiring; ADD new chain steps as endpoints are discovered. Preserve `serviceOwner` and `via[]` annotations once set.
- `stubs:` — preserve ALL existing keys and values, including user-supplied real values that override `"TODO-PROVIDE-VALUE"` placeholders. Re-runs MAY add new `stubs.<svc>.<field>` keys (per G7a) but MUST NEVER overwrite or remove existing values.
- `ledger.yaml.runs[]` — append, never overwrite. Cap at 200 entries; pruned entries archived to `ledger-archive/ledger-YYYYMMDD.yaml`.
- `dashboard.html` — fully regenerated each run from `ledger.yaml` (deterministic).

### G10 — Sync rule
Mirror this file between starter-kit (canonical) and `.github/prompts/`.

### G11 — Shared contracts
- **`caseType` enum:** `positive | negative-validation | boundary | negative-business-rule`.
- **`passRate` formula:** `passed / (passed + failed + dataIssue + infra)` — `skipped` (incl. `cross-service-dependency`) EXCLUDED. `0.0` when denominator is 0. A shared utility `scripts/lib/math.js` exporting `computePassRate(counts)` MUST be created and used by every writer.
- **Status enum (per-service data-ledger):** `pass | fail | skip | data-issue | infra | generation-bug | unresolved-token`. Workspace `ledger.yaml` uses camelCase: `passed | failed | skipped | dataIssue | infra`. Dashboard maps between them.
- **Ledger ownership:** Per-service runners write `data-ledger.json`. ONLY this prompt's re-aggregation pass writes `ledger.yaml.runs[]`. `run-tests` READS `ledger.yaml` and may TRIGGER a re-aggregation, but does NOT itself append entries.

### G12 — DB transaction capture for MCP SQL Developer (CRITICAL)
> The dashboard's **DB Records Created** section is the PRIMARY interface between the test framework and MCP SQL Developer. It MUST show plain-text field values that QA can copy-paste into SQL queries.

- **`db-transactions.json`** MUST be emitted alongside `dashboard.html` every time the dashboard is regenerated. It contains ALL captured business identifiers from the last run in machine-readable JSON.
- **Never mask values** — these are test environment identifiers (gitignored). QA needs exact values for `WHERE field = 'value'` queries.
- **Include ALL HTTP statuses** — 2xx (confirmed created), 4xx (attempted-failed, may have partial DB write), 5xx (attempted-server-error, record may exist).
- **Include consumed test data** — which identity pool records were used, so QA can trace input→output in the database.

### G13 — Reports sync guardrail
> Every report script MUST build ONE in-memory results object, then render ALL formats (.json, .md, .html) from that SAME object in ONE pass. Never re-read source data between format renders. After writing: assert `json.total === md.total === html.total`.

---
