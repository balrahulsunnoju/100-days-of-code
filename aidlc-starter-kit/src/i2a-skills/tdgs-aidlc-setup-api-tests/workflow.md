````markdown
# API Test Framework Setup Workflow — Orchestrator

**Goal:** Discover backend services in the workspace and scaffold an independent api-tests framework per service (collections, runner, environments, coverage config).

**Your Role:** You are the API Test Scaffold Orchestrator. You scan the workspace, discover API contracts from source and KB, and generate Insomnia collections plus Node.js test-runner infrastructure in each target service repo.

---

# API Test Framework Setup

Initialize an API test framework inside **each detected backend service repository**. Each service gets its own independent `api-tests/` directory with collections, environments, test data, and a test runner.

This prompt is **application-agnostic** — it dynamically discovers backend services and their API contracts, then scaffolds a test framework per service.

## Guardrails (Non-Negotiable, Read First)

These guardrails apply to every step of this prompt. Violating any of them is a defect, not a stylistic choice. Each `Gn` rule below is referenced by ID throughout the rest of this prompt.

### G1 — Application-agnostic
This prompt MUST NOT contain or generate any reference to a specific application name, vendor brand, payment provider, service name, endpoint path, port, hostname, field name, or business term that is not discovered from the workspace at runtime. If you find a literal app/vendor name (e.g. an actual company brand, a literal service path like `/v1/<your-app>/...`, or a domain field like `OrderNumber`/`TraceNumber`/`ReceiptUrl`) hard-coded inside this prompt while reading it, treat it as a defect to flag — do NOT propagate it into generated artifacts.

### G2 — Discover-before-generate
Before authoring any file, scan the workspace and knowledge base for ground truth. Sources, in order of precedence:
1. `*-docs*/project-context.md` (workspace overrides — always wins)
2. `*-docs*/knowledge-base/` (architecture, business rules, API specs, test-management)
3. Source code in service/UI repos (controllers, routes, models, validators, config)
4. Existing test artifacts (`test-data-catalog.yaml`, `ledger.yaml`, prior test files)
If the source-of-truth for a value is not found, STOP and ask the user — do NOT invent.

### G3 — Ask-don't-assume
When a required input is ambiguous or missing, ASK the user with a concrete options list. Never silently default. The only acceptable defaults are those explicitly documented in this prompt as "default if user is silent."

### G4 — No hallucination of schemas, response shapes, or field names
Never invent JSON response shapes, response envelopes (`data.*`, `result.*`, `payload.*`), database column names, or API field names. If the shape is unknown, emit the artifact with `recordArtifact: null` and a `⚠️ unknown shape — needs real response inspection` log line, and tag the dependent test with `@quarantine` so it is excluded from pass-rate math until grounded.

### G5 — Prerequisite check (hard-fail)
At the start of execution, verify the prerequisites named in this prompt's **Prerequisites** line. If a prerequisite artifact does not exist, STOP and instruct the user to run the upstream prompt.

### G6 — PII handling
Never apply Faker / random / synthetic generators to PII fields. The canonical PII regex is defined ONCE in `/tdgs-aidlc-generate-api-tests` Pre-flight item 3 (single source of truth) — referenced here, never duplicated. PII pattern (case-insensitive substring match on field name): `ssn`, `socialsecurity`, `dateofbirth`, `dob`, `driverlicense`, `dl`, `firstname`, `lastname`, `fullname`, `email`, `phone`, `mobile`, `nationalid`, `passport`. **Address fields (`address`, `street`, `city`, `state`, `zip`, `postalcode`, `country`) are explicitly NOT PII** — Faker is allowed for these when no identity pool exposes the field. PII field values MUST come from the test data catalog's `identityPools[]`. If the catalog has no record for a required PII field, mark the test `data-issue` (NOT a failure).

### G7 — Cross-service / external dependency
If a test step requires a value owned by another service or an external system this framework cannot legitimately call (per `project-context.md` constraints), classify the test as **`skipped` with reason `cross-service-dependency: <missing-prereq>`**. This is a distinct dashboard category — NOT a pass and NOT a failure. Document the missing prerequisite explicitly in the test's metadata. The user MAY override by providing a static stub value in the catalog under `stubs:` (then the test runs against the stub).

### G8 — Pre-Write Output Contract
Before any `create_file` or `replace_string_in_file`, emit a **Pre-Write Output Contract** block listing every file that will be written, with absolute path, byte estimate, purpose, and the source-of-truth reference for any non-trivial value in it.

### G9 — Idempotency and merge semantics
Re-running this prompt MUST merge, not overwrite. Existing config, identity records, and ledger entries MUST be preserved. Conflicts MUST be flagged, not auto-resolved.

### G10 — Sync rule
This prompt file exists at BOTH `tdgs-aidlc-starter-kit/docs-github-starter/prompts/` (canonical) AND `.github/prompts/` (workspace consumption). Any edit MUST be mirrored.

### G11 — Shared contracts (cross-prompt)
- **`caseType` enum:** `positive | negative-validation | boundary | negative-business-rule`.
- **Per-request HTTP timeout (flat, mock + real):** `60_000` ms — MAX CAP, not default wait. axios/inso resolve as soon as the response arrives and the runner moves to the next request immediately; the cap only fires on hang. Production APIs (incl. payment sandbox) respond <30s worst-case; the 60s ceiling absorbs DB + downstream tail latency on chained workflows without masking real defects (DB hang, unresolved DNS, gateway 502). Same flat value as functional-tests (`/tdgs-aidlc-setup-functional-tests` Section 7d.1 rule #1). DO NOT use `isReal ? 180_000 : 30_000`.
- **`passRate` formula:** `passed / (passed + failed + dataIssue + infra)` — `skipped` excluded. `0.0` when denominator is 0.
- **Status enum (per-service data-ledger):** `pass | fail | skip | data-issue | infra | generation-bug | unresolved-token`. Workspace `ledger.yaml` uses camelCase: `passed | failed | skipped | dataIssue | infra`. Dashboard maps between them.
- **Skip category:** `cross-service-dependency: <reason>` is a first-class status.

### G12 — Inso CLI vs Node fallback (this prompt only)
The Insomnia CLI (`inso run test`) is the **PRIMARY** runner. The Node/axios mini-chai runner is the **FALLBACK** triggered by the following 5-rule order (first match wins — evaluated by `test-runner.js` at startup BEFORE any HTTP call):

1. **`inso` is not installed or not on `PATH`** — runner falls back automatically and logs `ℹ️ inso not on PATH — using Node fallback runner`.
2. **The collection requires a feature the installed `inso` version does not support** — multipart, conditional skip, custom assertion, JSONPath beyond Inso's grammar, or any Insomnia v5+ feature the installed v4 binary rejects. Detection: parse the collection's `unit_test[]` `code` blocks before launching `inso`; on any forbidden token, fall back and log `ℹ️ collection uses <feature> — Node fallback required`.
3. **The user explicitly passes `--runner=node` to the test-runner script** (CLI flag wins over auto-detect; environment variables are NOT consulted to avoid silent env-vs-CLI conflicts).
4. **The catalog declares `apiChain[]` steps that mutate captured state** — when ANY chain step uses `capture[].as` AND a downstream step injects via `{{captured.<name>}}`, force the Node runner. Inso's `unit_test` model does not propagate captured values across requests reliably across all v4 versions; the Node runner owns capture/inject deterministically and is the canonical implementation for chained flows.
5. **Cross-service chaining (`{{<other-service>_base_url}}` references in this collection)** — same reasoning as rule 4: cross-service capture/inject + per-service env merging is owned by the Node runner.

The fallback runner MUST produce the same `results.json` schema as `inso run test` so downstream report generators (`generate-report.js`, the workspace dashboard generator) are runner-agnostic. The runner MUST log which path it took at startup (`📋 runner=inso` or `📋 runner=node (reason: <rule-N>)`) so reviewers can audit fallback selection without reading the runner's source.

### G13 — DB transaction capture (MCP SQL Developer integration)
> The test-runner MUST populate `dbRecordsCreated[]` in `data-ledger.json` with plain-text field values from EVERY write-endpoint response (POST/PUT/PATCH/DELETE regardless of HTTP status). These feed the dashboard's DB Transactions section for MCP SQL Developer.

> **Per-run snapshot (MANDATORY).** After atomic-writing `results.json` + `data-ledger.json`, the runner MUST also `mkdirSync(test-results/runs/<runId>, { recursive: true })` and `copyFileSync` BOTH files into that directory. Rationale: the next run overwrites `test-results/results.json` — without snapshots, prior-run detail is lost (cannot reconstruct what changed when a regression appears). Wrap in `try/catch` with `console.warn` only — snapshot failure must NOT fail the run.

> **Seeded PRNG via `RUN_SEED` env var (MANDATORY).** Faker / random data sources MUST seed from `parseInt(process.env.RUN_SEED || '0', 10)` and use a `mulberry32` PRNG (NOT `Math.random`). Same `RUN_SEED` + same catalog → identical request bodies → identical pass/fail counts. Required for cross-service determinism (functional-tests fixture mirrors this seed; see `/tdgs-aidlc-setup-functional-tests` deterministic-replay block).

- **Extract business identifiers** from response bodies: catalog `apiChain[].capture[].field` first, then regex fallback `/(id|number|code|reference|guid|uuid|key|token|trace|order|confirmation|receipt|tracking)$/i`.
- **Never leave `key`/`value` as empty strings** — if nothing extractable, omit the entry entirely.
- **Record HTTP status** in `responseStatus` and classify: `created` (2xx), `attempted-failed` (4xx), `attempted-server-error` (5xx).
- **Lambda/Proxy transparent:** capture from the FINAL response received. Intermediaries are invisible to the runner.

### G14 — Reports sync guardrail
> Every report script MUST build ONE in-memory results object, then render ALL formats (.json, .md, .html) from that SAME object in ONE pass. After writing: assert `json.total === md.total === html.total`.

### G15 — Frozen Assertion Contract (allow-list)
> The runner's mini-chai surface and the generator's emitted assertion vocabulary MUST be the same closed set. SETUP writes `{service-repo}/api-tests/config/assertion-contract.json` (canonical source of truth) and the runner's `buildExpect()` MUST implement EXACTLY the methods in this list — no more, no less. `/tdgs-aidlc-generate-api-tests` G18 forbids emitting any assertion outside this list. If the file already exists, do not overwrite it; verify the runner implements every entry.
>
> Canonical content (write verbatim):
> ```json
> {
>   "version": "1.0",
>   "methods": [
>     "to.equal", "to.not.equal",
>     "to.contain", "to.include", "to.not.contain",
>     "to.have.property", "to.have.lengthOf",
>     "to.be.oneOf", "to.be.a", "to.be.an",
>     "to.be.above", "to.be.greaterThan",
>     "to.be.below", "to.be.lessThan",
>     "to.be.within",
>     "to.match",
>     "to.be.true", "to.be.false", "to.be.null", "to.be.ok", "to.exist"
>   ]
> }
> ```
> The runner's `buildExpect()` MUST add `to.be.within(min,max)` (inclusive), `to.not.equal(x)`, and `to.match(regex)` if missing. Drift detected by the existing schema-drift heal check (Section 5 item 7 below) — patch the file in place.

### G16 — Mandatory post-write linter (`lint-collection.js`)
> SETUP writes `{service-repo}/api-tests/scripts/lint-collection.js` and adds a `pretest` npm script. The linter MUST refuse to write/run when ANY of the following is true for ANY request or `unit_test` in the collection. Each check is mechanical (no prose, no LLM):
>
> - **LINT-1 (assertions):** every assertion in `unit_test.code` must call only methods listed in `config/assertion-contract.json`. Reject unknown method calls with the test name and offending line.
> - **LINT-2 (token namespace):** every `{{...}}` substring in any request `url`, header `value`, or body `text` must match exactly one of: `{{catalog.identityPool.<pool>.<field>}}`, `{{catalog.stubs.<svc>.<field>}}`, `{{captured.<name>}}`, `{{$<builtin>}}` (where builtin is in the runner's faker list), or `{{ <env_var> }}` (where env_var is a key in `environments/local.json` data block). Reject any other shape.
> - **LINT-3 (pool/field existence):** for every `{{catalog.identityPool.<pool>.<field>}}` token, load the catalog and verify (a) `<pool>` exists in `identityPools[]`, (b) `<field>` is in that pool's `fields[]`, AND (c) `record[0].fields[<field>]` is non-null. Reject with `pool '<pool>' has no field '<field>' (available: [...])`.
> - **LINT-4 (JSON parseability after substitution):** for every request body whose `mimeType` is `application/json`, substitute every `{{captured.<X>}}` with the literal `"PLACEHOLDER"` and every other `{{...}}` with the empty string, then `JSON.parse` the result. Reject with the parse error if it throws. Catches unquoted captured tokens emitted into JSON string positions (e.g. `"orderNumber":{{captured.orderNumber}}` — must be `"{{captured.orderNumber}}"` for string fields).
> - **LINT-5 (no literal stub bypass):** for every literal string value in a positive-suite request body, if any `stubs.<svc>.<field>` in the catalog has a value equal to that literal, reject with `literal '<value>' bypasses stub path stubs.<svc>.<field> — replace with token`.
> - **LINT-6 (no `_skipReason`):** the field `_skipReason` is forbidden anywhere in the collection JSON. Reject with `_skipReason is deprecated — runner does not honor it; use {{catalog.stubs.<svc>.<field>}} (auto-classifies data-issue when value is TODO-PROVIDE-VALUE)`.
> - **LINT-7 (positive bodies free of attack/junk payloads):** scan every literal string in every positive-suite request body (folder name `Positive` OR `unit_test.metadata.caseType === 'positive'`). Reject the value if it matches ANY of the following regexes (case-insensitive). These payloads belong ONLY in `Negative/Security/` tests, never in positive bodies:
>   - SQL injection: `/('\s*OR\s*'1'\s*=\s*'1|--\s*$|;\s*DROP\s+TABLE|UNION\s+SELECT|;\s*DELETE\s+FROM)/i`
>   - XSS / script injection: `/<\s*script|<\s*img[^>]*onerror|javascript:|on(load|error|click)\s*=|<\s*iframe/i`
>   - Path traversal: `/\.\.\/|\.\.\\\\/`
>   - Control / non-printable: `/[\x00-\x08\x0B\x0C\x0E-\x1F]/`
>   - Generic placeholder junk that escaped the resolver: `/^(TEST|FOO|BAR|XXX|TODO|PLACEHOLDER|UNDEFINED|NULL|NaN|\?\?\?)$/i`
>   - HTML/script tag fragments anywhere: `/<\/?[a-z][\s\S]*?>/i` (positive bodies are JSON, never HTML)
>   Rejection message: `LINT-7 violation in positive body — '{value}' matches {pattern_name}; positive tests MUST use catalog values or G19 placeholder allow-list. Move attack payloads to Negative/Security folder.`
> - **LINT-8 (positive bodies free of empty-string PII on REQUIRED fields):** for every leaf string field whose name matches the PII regex from G17 AND whose DTO declaration carries `@NotBlank` / `@NotEmpty` / `@NotNull` (Java) OR `required: true` (OpenAPI schema), reject if the value is `""`, `" "`, or whitespace-only. Optional PII fields MAY be `""` (e.g., `middleName`). The DTO required-flag map MUST be emitted by GENERATE to `api-tests/config/field-required-map.json` (per G19); LINT-8 reads it.
> - **LINT-9 (positive bodies free of literal English-name PII):** for every leaf string field whose name matches `firstName|fName|givenName|lastName|lName|surname|familyName|fullName`, reject if the value matches the regex `/^(JOHN|JANE|JOHNNY|JOHNATHAN|JANEY|DOE|DOES|SMITH|JONES|BROWN|TEST|TESTUSER|USER|BABY|DECEDENT|NAME|FIRSTNAME|LASTNAME)$/i`. These are common hardcoded placeholders that bypass the catalog. Resolution: replace with `{{catalog.identityPool.<pool>.<field>}}` token (G20 cross-pool lookup) or G19 allow-list value (`Jane`/`Doe`).
> - **LINT-10 (date format consistency per endpoint):** for every endpoint, all positive-body literal date values for the SAME field name MUST share one format. Detect format by regex (`^\d{2}-[A-Za-z]{3}-\d{4}$` = dd-MMM-yyyy, `^\d{2}/\d{2}/\d{4}$` = MM/dd/yyyy, `^\d{4}-\d{2}-\d{2}$` = ISO yyyy-MM-dd). Reject mixed formats with `endpoint <X> field <Y>: mixed date formats {fmt1, fmt2} — choose one per controller @JsonFormat / @DateTimeFormat / OpenAPI 'format' annotation`. The chosen format MUST be recorded in `api-tests/config/field-format-map.json` (already emitted; LINT-10 verifies).
> - **LINT-11 (catalog-coverage completeness):** for every leaf string field in every positive-body whose field name (case-insensitive) matches the `fields[]` of any pool in `catalog.identityPools[]`, the value MUST be `{{catalog.identityPool.<pool>.<field>}}` — NOT a hardcoded literal. Algorithm: for each (request, leaf-string-field), if `pool := find(p in identityPools where field IN p.fields)` returns a pool AND value does not equal `{{catalog.identityPool.<pool.poolType>.<field>}}`, reject with `field '<field>' is covered by pool '<pool.poolType>' — use the catalog token, not literal '<value>'`. This is the gate that catches services like receipt where the agent emitted ZERO catalog tokens despite `email`, `orderNumber`, etc. being pool-covered.
> - **LINT-12 (attack payloads only in `Negative/Security/`):** the regexes from LINT-7 (SQLi, XSS, path traversal, control chars, HTML tags) are PERMITTED only when the request lives under a folder path matching `<Endpoint>/Negative/Security/`. Reject attack payloads in any other folder (Positive, Negative root, Edge-Case, etc.) with `attack payload in '<folder>' — move to <Endpoint>/Negative/Security/`. Setup MUST scaffold the `<Endpoint>/Negative/Security/` folder convention; GENERATE writes attack tests there.

> The linter's `package.json` wiring:
> ```json
> { "scripts": { "pretest": "node scripts/lint-collection.js collections/*.json", "test": "node scripts/test-runner.js", ... } }
> ```
> Non-zero exit aborts the test run. The linter is the single mechanical enforcement point for what was previously emitted as English "Check N" rules in `/tdgs-aidlc-generate-api-tests`.

### G16b — Mandatory coverage auditor (`audit-coverage.js`) — MECHANICAL HARD GATE

> SETUP writes `{service-repo}/api-tests/scripts/audit-coverage.js` AND `{service-repo}/api-tests/config/audit-config.json`. Wire it into `package.json` as `posttest` (or extend the existing `pretest` chain) so non-zero exit aborts the run.
>
> **Why this exists.** The generate prompt previously enforced variant coverage, discriminator-branch coverage, and endpoint-surface filtering through long prose callouts ("🛑 DOCUMENTED FAILURE MODE #1/#2/#3"). The agent ignored them anyway — every regression cycle proved prose alone does not enforce. `audit-coverage.js` runs the SAME greps the agent was supposed to run by hand, exits non-zero on any gap, and replaces those callouts with a single mechanical contract.
>
> **Generic by design.** Setup detects the framework (Spring / FastAPI / Express / NestJS / .NET / Lambda) and writes default config patterns. No hard-coded service names, no hard-coded field names. Same script, same exit-code contract, every project. User may override `audit-config.json` patterns post-setup.
>
> **AUDIT-N checks (each exits non-zero on violation, with the offending endpoint/path/value cited):**
>
> - **AUDIT-1 (controller-coverage):** For each endpoint discovered by walking files matching `controllerGlobs[]` and applying `httpMappingPattern`, the collection MUST contain ≥ 1 request whose URL matches that path — UNLESS the endpoint is filtered out by the API-surface intersection rule (AUDIT-5). Reject with `endpoint <METHOD> <path> declared by <Controller> has 0 requests in <collection.json>`.
> - **AUDIT-2 (no phantom URLs):** Every URL in the collection MUST resolve to a path in the controller-discovered set for THIS service. Reject with `request '<name>' targets phantom path <path> — not declared by any controller in <controllerGlobs>`.
> - **AUDIT-3 (List<*> variant coverage — replaces deleted callout #2):** For each `@RequestBody` DTO matching `requestBodyDtoGlobs[]`, run `listFieldPattern` to enumerate every `private List<X> fieldName;` in the parent DTO. The collection MUST contain ≥ 1 positive request whose body JSON contains a non-empty array under each `fieldName`. Reject with `endpoint <path>: parent DTO <Dto> declares List<*> fields [a, b, c, d] but positive bodies cover only [a, b] — missing variants: [c, d]`.
> - **AUDIT-4 (discriminator-branch coverage — replaces deleted callout #3):** For each service-impl file matching `serviceImplGlobs[]`, run `discriminatorBranchPattern` to enumerate every `if (req.X.equals("V"))` / `case "V":` / `if (req.isFlag())` branch keyed off a request-body field. The collection MUST contain ≥ 1 positive request per discriminator value, UNLESS the request `name` field contains the literal substring `(variant coverage inherited from <upstreamEndpoint>)` AND `<upstreamEndpoint>` exists in `apiChain[]` of `test-data-catalog.yaml`. Reject with `endpoint <path>: service-impl <ServiceImpl>.java branches on <field> with values [V1, V2, V3, V4] but positive bodies cover only [V1, V2] — missing values: [V3, V4]. If carve-out applies, add ' (variant coverage inherited from <upstream>)' to request name.`
> - **AUDIT-5 (API-surface intersection — when configured):** If `apigeeBundleGlobs[]` and/or `uiCallerGlobs[]` are configured, classify each controller endpoint:
>   - **gateway-exposed** = path appears in any Apigee proxy bundle (unzip and grep `<BasePath>` + `<Flow>` `<Condition>` paths)
>   - **consumer-called** = path appears verbatim in any file matching `uiCallerGlobs[]`
>   - Endpoint is API-surface ⇔ gateway-exposed AND consumer-called.
>   - Endpoints that are NEITHER are classified `not-API-surface` and AUDIT-1 does NOT require coverage for them. Warn (not error) if tests EXIST for `not-API-surface` endpoints with `test exists for not-API-surface endpoint <path> — confirm intent`.
>   - This rule would have prevented the false "5 missing endpoints" alarm where `/AmountDistribution` v1, `/CreateTransaction`, `/UpdateTransactionStatus`, `/RetrievePacs`, `/v5/RetrievePacs` were flagged as gaps despite being dead code (not gateway-exposed and/or not UI-called).
>
> **Per-service `audit-config.json` schema (setup writes defaults, user may override):**
> ```json
> {
>   "controllerGlobs":          ["src/main/java/**/*Controller.java"],
>   "requestBodyDtoGlobs":      ["src/main/java/**/model/**/*.java", "src/main/java/**/dto/**/*.java"],
>   "serviceImplGlobs":         ["src/main/java/**/service/impl/*.java", "src/main/java/**/service/*ServiceImpl.java"],
>   "constantsGlobs":           ["src/main/java/**/utils/*Constants.java", "src/main/java/**/constants/*.java"],
>   "httpMappingPattern":       "@(Get|Post|Put|Delete|Patch)Mapping\\s*\\(.*?(?:path|value)\\s*=\\s*\"([^\"]+)\"",
>   "listFieldPattern":         "private\\s+List<(\\w+)>\\s+(\\w+)\\s*;",
>   "discriminatorBranchPattern": "(?:if\\s*\\(.*?\\.(?:equals|contains|startsWith)\\(\"([^\"]+)\"\\)|case\\s+\"([^\"]+)\"\\s*:|\\.is(\\w+)\\(\\))",
>   "apigeeBundleGlobs":        ["../apigee-exports/*.zip"],
>   "uiCallerGlobs":            ["../*-ui*/src/api/**/*.{js,ts,jsx,tsx}", "../*-client*/src/**/*.{js,ts}"],
>   "externalCallers":          [],
>   "carveOutAnnotation":       "(variant coverage inherited from"
> }
> ```
>
> **`externalCallers[]`** — ServiceImpl class basenames (no `.java`) whose endpoints invoke a real third-party dependency (payment gateway, identity verification, external mail provider). Used by `/tdgs-aidlc-generate-api-tests` to append the `'external-integration'` tag to every `unit_test.metadata.tags[]` for those endpoints (v3 slice taxonomy). User seeds per service after setup (e.g., orderdetails: `["RetrievePacsServiceImpl","RetrievePacsServiceImplV5"]`; receipt: `["SendEmailServiceImpl"]`; verificationletter: `[]`). Empty default is correct — over-tagging is worse than under-tagging.
>
> **Framework-specific defaults (setup auto-detects):**
> - **FastAPI / Python:** `controllerGlobs: ["app/api/**/*.py", "app/routers/**/*.py"]`; `httpMappingPattern: "@(?:router|app)\\.(get|post|put|delete|patch)\\(\\s*[\"']([^\"']+)[\"']"`; `listFieldPattern: "(\\w+):\\s*List\\[(\\w+)\\]"`.
> - **Express / NestJS:** `controllerGlobs: ["src/**/*.controller.ts", "src/routes/**/*.{js,ts}"]`; `httpMappingPattern: "@(Get|Post|Put|Delete|Patch)\\(\\s*[\"']([^\"']+)[\"']|(?:router|app)\\.(get|post|put|delete|patch)\\(\\s*[\"']([^\"']+)[\"']"`.
> - **.NET:** `controllerGlobs: ["**/Controllers/*.cs"]`; `httpMappingPattern: "\\[Http(Get|Post|Put|Delete|Patch)\\(\"([^\"]+)\"\\)\\]"`.
> - **Lambda:** `controllerGlobs: ["src/handlers/**/*.{js,ts,py}"]`; require user to declare event source paths in `apigeeBundleGlobs` (API Gateway export).
>
> **Setup post-flight checklist additions:**
> 1. `audit-coverage.js` exists and is executable
> 2. `audit-config.json` exists with at minimum `controllerGlobs` + `httpMappingPattern` populated for the detected framework
> 3. `package.json` `posttest` chains: `node scripts/audit-coverage.js collections/*.json && node scripts/generate-report.js && node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js` — dashboard refresh is mandatory on every run (same contract as `/tdgs-aidlc-setup-unit-tests`)
> 4. Dry-run on the empty starter collection prints `AUDIT-1 ... AUDIT-N: PASS (0 endpoints discovered or 0 carve-outs needed for empty collection)` — confirms the script loads and parses config without crashing
>
> **The single source of truth.** Once shipped, `audit-coverage.js` is the only place where variant-coverage and endpoint-surface rules live. The generate prompt's G25 invokes it; AGENTS that pass G25 are done. AGENTS that try to substitute prose audits ("I checked all 8 variants") for the script's exit code are violating G25 + G16b.

### G17 — PII pool-coverage pre-flight (HARD STOP)
> At SETUP time (and on every re-run), scan every controller's `@RequestBody` DTO (recursively, including nested DTOs and `List<*>` element types) for field NAMES matching the canonical PII regex defined in `/tdgs-aidlc-generate-api-tests` Pre-flight item 3. For each unique PII field name found in the codebase, verify it appears in `fields[]` of at least one pool in `*-docs*/test-data/test-data-catalog.yaml` `identityPools[]`. If ANY PII field has no covering pool, STOP with:
>
> ```
> ❌ PII pool gap — controller(s) consume the following PII field(s) that no identity pool exposes:
>     - <fieldName>  used by  <Controller>.<endpoint>  (DTO: <DtoClass>.<path>)
> Fix: extend the appropriate pool in test-data-catalog.yaml fields[] AND add real values to records[].fields, OR remap the DTO to a non-PII column. Then re-run /tdgs-aidlc-setup-api-tests.
> ```
>
> Rationale: this kills at SETUP time the recurring class of bugs where `/tdgs-aidlc-generate-api-tests` invents a token like `{{catalog.identityPool.identity-instate.firstName}}` against a pool that has no `firstName` field — causing every positive write test to classify `data-issue` at runtime. Catching it here is non-negotiable.

---

## TL;DR — Quick Start

- **What this does:** For EACH backend service repo, scaffolds `api-tests/` with empty Insomnia collection skeleton, env files (`local`/`test`/`stage`), `scripts/test-runner.js` (Insomnia CLI + Node/axios fallback with mini-chai), `scripts/generate-report.js`, npm scripts, and `TESTING.md`.
- **When to run:** Once per backend service repo. Re-run after major service refactor or runner contract change.
- **Prerequisites:** A backend service repo in the workspace (Java/Spring Boot, Node/Express/Fastify/NestJS, Python/FastAPI/Flask/Django, C#/.NET, AWS Lambda).
- **Outputs:** `{service-repo}/api-tests/` (collections/, environments/, config/coverage.json, config/field-format-map.json, scripts/, data/, fixtures/), updated `package.json`, `.gitignore` entries, `TESTING.md`.
- **Most common failure:** `context_path` not auto-detected → service runs at `/api/v1/...` but tests hit `/...` → 404. Verify `application.properties`/`application.yml` was scanned.
- **Next step after this:** Run `/tdgs-aidlc-setup-testdata` (creates the catalog the runner needs for token resolution), then `/tdgs-aidlc-generate-api-tests` to author tests.

## Pipeline Position

```
[/tdgs-aidlc-setup-api-tests ← you are here]
   → [/tdgs-aidlc-setup-testdata]
      → [/tdgs-aidlc-generate-api-tests]
         → results.json + test-summary.html + data-ledger.json + dashboard.html refresh
```


## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **DO NOT** create a monolith `api-tests/` directory at the workspace root. Each backend service gets its own `api-tests/` directory inside its repository.

## Pre-flight Check: Ground-Truth Hierarchy (MANDATORY — Self-Sustained Spec)

> ⚠️ **Single, authoritative rule** for choosing any value placed in a request body, environment file, runner default, or assertion produced by this prompt's scaffolding or by `/tdgs-aidlc-generate-api-tests`. Self-contained — do not look elsewhere.

### Workspace Sources (scan in this order)

1. **project-context.md** — `*-docs*/project-context.md`
2. **Test data catalog** — `*-docs*/test-data/test-data-catalog.yaml` (top-level `apiChain[]`, `uiScreens[]`, `identityPools[]`)
3. **Knowledge base** (MANDATORY when `*-docs*/knowledge-base/` exists) — recursively index `knowledge-base/{api,business,common-services,repos,shared}/**/*.md`
4. **UI repository** — discover the UI API client directory (try `*-ui*/src/api/`, `*-ui*/src/services/`, `*-ui*/src/client/`, `*-ui*/src/http/`, `*-ui*/src/lib/api/`; honor `project-context.md` override) + screen components. Authoritative for payload SHAPE
5. **Backend DTO/schema** — `@JsonProperty`, `@Pattern`, `@Size`, `@NotNull`, enums. Authoritative for field NAMES
6. **DDL** — every `*.sql`. Authoritative for value constraints
7. **DAO layer** — bind-statement format inference. Authoritative for format

### Field-Derivation Hierarchy P0–P6

> **Abbreviated version.** See `/tdgs-aidlc-generate-api-tests` §Pre-flight for the full specification including PII regex, format-mismatch rules, and provenance table requirements.

| Tier | Source | Use when |
|------|--------|----------|
| P0 | `{{catalog.identityPool.<pool>.<field>}}` | external-required pool exposes field AND format matches |
| P1 | `{{captured.<name>}}` | upstream `apiChain[]` step provides it (capture/inject) |
| P2 | UI-emitted literal | UI sends specific value/shape in same field |
| P3 | KB-documented value | `knowledge-base/**/*.md` declares it |
| P4 | DDL/DAO-derived literal | constraint or format dictates value (e.g., `CHAR(1)` → `"Y"`/`"N"`; Oracle NLS default → `DD-MON-YYYY`) |
| P5 | DTO annotation literal | `@Pattern` regex sample, first enum value |
| P6 | Typed placeholder | last resort — tagged `(typed-placeholder for <field> — <reject_reason>)` |

**No-skip rule:** record `reject_reason` and fall through. Skipping silently = generation bug.

**Allowed runtime `{{...}}` tokens**: `{{catalog.identityPool.*}}`, `{{captured.*}}`, runner builtins (`{{$timestamp}}`, `{{$randomUUID}}`, `{{$randomInt}}`, `{{$isoTimestamp}}`), closed faker list. Any other = generation bug.

### Per-Field Provenance Table (MANDATORY in Pre-Write Contract of consumer prompt)

Emit BEFORE writing for every positive request body:

```
| field path | tier | source ref | value/token | reject_reason (P6 only) |
```

Un-explained P6s = contract rejected.

### Generation-Time Self-Validation Gate

(1) Parse JSON, (2) all `{{...}}` in allowed set, (3) keys match DTO schema case-sensitive (Jackson silently drops mismatches), (4) literals comply with DDL constraints, (5) every field value verified against the target service's DAO/parser/DB format expectations per the Per-Field Value Verification Procedure in `/tdgs-aidlc-generate-api-tests`. Any failure → STOP.

### Catalog-Gaps Feedback Loop

When any field falls to P6 due to missing/mismatched catalog data, append to `*-docs*/test-data/catalog-gaps.yaml`:

```yaml
gaps:
  - poolType: "<pool|null>"
    field: "<field name>"
    catalogFormat: "<format stored in catalog>"
    requiredFormat: "<DTO/DDL/DAO-required format>"
    requestedBy: ["<endpoint>"]
    reason: "<why P0 rejected>"
    suggestedValue: "<example in required format>"
    detectedAt: "<code location where format was determined>"
```

### Role of THIS prompt in the Hierarchy

 **You are SCAFFOLDING the API-test framework consumed by `/tdgs-aidlc-generate-api-tests`.** Generated `test-runner.js` MUST: (1) resolve every `{{catalog.identityPool.*}}` token by reading top-level `catalog.identityPools` and `record.fields[fieldName]` (with `record[fieldName]` fallback), (2) reject unresolved `{{...}}` at runtime by throwing `TokenResolutionError` BEFORE HTTP send, (3) classify `data-issue` (not `fail`) when `external-required` pool exhausted, (4) **format-aware coerce** values via `fieldFormatMap` config (below), (5) APPEND to `*-docs*/test-data/catalog-gaps.yaml` whenever a request body shipped a P6 placeholder.

> **`fieldFormatMap` — runtime format coercion (MANDATORY in generated runner):**
>
> Catalog stores each field in ONE canonical format (e.g., `dateOfBirth: "01/19/1961"` MM/DD/YYYY). Different services may need different formats (Oracle DAO needs DD-Mon-YYYY, others use ISO-8601). `/tdgs-aidlc-generate-api-tests` picks P4 literals when formats mismatch; when a catalog token IS emitted (generator confirmed runner can coerce), the runner needs the coercion config.
>
> **Location:** SINGLE centralized file per service at `{service-repo}/api-tests/config/field-format-map.json` — NOT per-environment (DAO/parser format is service-specific). Loaded once at startup.
>
> **PRE-POPULATION (MANDATORY during setup):** scan DAO/Repository/ServiceImpl for date patterns:
> - Fields bound to Oracle `DATE` without `TO_DATE()` wrapper → `{ "from": "MM/DD/YYYY", "to": "DD-Mon-YYYY" }`
> - Fields with `@JsonFormat(pattern=...)` → use declared pattern as `to`
> - `CHAR(1)` columns → note (Y/N flags, handled by step 7a in generate)
> - Phone bound to `VARCHAR2(10)` → note digits-only
>
> If NO date/format patterns found, write `{}` — RARE for Oracle-backed services.
>
> ```json
> // {service-repo}/api-tests/config/field-format-map.json
> {
>   "dateOfBirth":   { "from": "MM/DD/YYYY", "to": "DD-Mon-YYYY" },
>   "birthDate":     { "from": "MM/DD/YYYY", "to": "DD-Mon-YYYY" },
>   "effectiveDate": { "from": "MM/DD/YYYY", "to": "DD-Mon-YYYY" }
> }
> ```
>
> **Fallback:** runner also checks `envData.fieldFormatMap` (back-compat / per-env overrides). Centralized config is default.
>
> When present + catalog token matches `from` pattern, runner converts to `to` format BEFORE inserting. Required coercions:
> - `MM/DD/YYYY` ↔ `DD-Mon-YYYY` (`01/19/1961` → `19-Jan-1961`)
> - `MM/DD/YYYY` ↔ `YYYY-MM-DD` (ISO-8601)
> - `MMDDYYYY` ↔ `MM/DD/YYYY`
>
> Absent/empty → no coercion (back-compat). Populated by `/tdgs-aidlc-generate-api-tests` when it detects format mismatches during Per-Field Value Verification.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `service` | No | All detected | Specific service repo directory name to scaffold, or `all` for every detected backend service. |
| `coverage_target` | No | `80` | Minimum endpoint coverage percentage target. Stored in framework config for use by `/tdgs-aidlc-generate-api-tests`. |

### Coverage Target Behavior

1. **If parameter provided:** Use it (e.g., `/tdgs-aidlc-setup-api-tests 90`)
2. **If NOT provided:** Prompt the user:
   ```
   📊 Coverage target not specified.
   
   What minimum API endpoint coverage percentage should tests target?
   Enter a number (e.g., 60, 80, 90) or press Enter for default (80%):
   > _
   ```
3. **If user presses Enter / skips:** Use default `80%`
4. **Coverage target is stored in** `{service-repo}/api-tests/config/coverage.json` per service for use by the generate prompt.

---

## Process

### 1. Auto-Detect All Backend Service Repositories

Scan the workspace root for all subdirectories. For each, check for backend service indicators:

| Indicator | Stack |
|-----------|-------|
| `pom.xml` with Spring Boot parent | Java / Spring Boot |
| `build.gradle` with Spring Boot plugin | Java / Spring Boot (Gradle) |
| `requirements.txt` or `pyproject.toml` with Flask/FastAPI/Django | Python |
| `*.csproj` with ASP.NET references | C# / .NET |
| `package.json` with `express`, `fastify`, `nestjs`, `koa` | Node.js |
| `template.yaml` with AWS::Serverless::Function (SAM) | AWS Lambda |
| `serverless.yml` with `functions:` | Serverless Framework |

**Exclusions:** Skip folders named `node_modules`, `_bmad*`, `tdgs-aidlc-starter-kit`, `*-docs*`, `.github`, `scripts`, `_bmad-output`, `apigee-exports`, and any detected frontend/UI repos.

Display detected services:
```
══════════════════════════════════════════════════════════════
DETECTED BACKEND SERVICES
══════════════════════════════════════════════════════════════

  #  Service Repo                    Stack               Port
  ─  ──────────────────────────────  ──────────────────   ────
  1  {service-repo-1}/              Java/Spring Boot     {port}
  2  {service-repo-2}/              Java/Spring Boot     {port}
  3  {service-repo-3}/              Node.js/Express      {port}

══════════════════════════════════════════════════════════════
```

**Port auto-detection:**
- Java/Spring Boot: `application.properties` or `application.yml` → `server.port`
- Node.js: `package.json` scripts or environment config
- Python (Flask): `app.run(port=)` or env var; default 5000
- Python (FastAPI): `uvicorn` config; default 8000
- C#/.NET: `launchSettings.json` → `applicationUrl`; default 5000/5001
- Lambda (SAM): `sam local start-api` default 3000
- Default fallback: 8080 for the first service, increment by 1 for each additional service

**Port collision handling (MANDATORY):** when two detected services advertise the same port (e.g., two Spring Boot services both default to `8080`), do NOT silently let one win. Resolve as follows: (1) keep the explicitly-configured port for the service whose `application.properties`/`application.yml`/`launchSettings.json`/`package.json` declares it; (2) for the colliding sibling whose port came from the "default fallback" rule, increment until a free port is found (skip ports already assigned to another detected service AND ports listed by `lsof -i -P -n | grep LISTEN` if available); (3) record the assignment in `api-tests/config/local.json` and surface a one-line note in the discovery summary: `ℹ️ {service-repo}: port {N} collided with {other-repo}, reassigned to {M}`. Never quietly point two service base URLs at the same port — that masks real failures behind the wrong service's responses.

### 2. Discover API Contracts Per Service

For each backend service, scan for API endpoints:

**Java/Spring Boot:**
- `@RestController`, `@Controller` classes
- `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`, `@RequestMapping` annotations
- Request/response DTOs and validation annotations (`@NotNull`, `@Size`, `@Min`, `@Max`, `@Pattern`, `@Email`, `@Valid`)
- `@PathVariable`, `@RequestParam`, `@RequestBody` parameters
- OpenAPI/Swagger spec if available (`openapi.yml`, `swagger.json`)

**Node.js:**
- Express/Fastify route definitions (`router.get`, `app.post`, etc.)
- Request body validation (Joi, Yup, Zod, express-validator)
- OpenAPI spec if available

**General:**
- `application.properties` / `application.yml` — context path, port
- Security configuration — auth requirements, role restrictions
- Error handler mappings — custom exception handlers

Display per-service discovery:
```
Service: {service-repo}/
  Endpoints:      {count}
  Request Models: {count}
  Validations:    {count}
  Error Handlers: {count}
```

### 3. Scaffold API Test Directory Per Service

For **each** detected backend service, create:

```
{service-repo}/
└── api-tests/
    ├── package.json                          ← Independent Node.js project
    ├── config/
    │   ├── coverage.json                     ← Coverage target config (stored by setup, read by generate)
    │   └── field-format-map.json             ← Field format coercion rules (MUST be pre-populated by setup via DAO/DDL scan — see Section 4)
    ├── collections/
    │   └── {service-name}.json               ← Insomnia collection (importable)
    ├── environments/
    │   ├── local.json                        ← localhost:{detected-port}
    │   ├── test.json                         ← test environment URL placeholder
    │   └── stage.json                        ← stage environment URL placeholder
    ├── data/                                    ← Reference payload templates (used by /tdgs-aidlc-generate-api-tests)
    │   ├── valid-payloads.json               ← Valid request payloads per endpoint (populated during generate)
    │   ├── invalid-payloads.json             ← Invalid payloads for validation testing (populated during generate)
    │   ├── boundary-payloads.json            ← Boundary values: min, max, empty, overflow (populated during generate)
    │   └── injection-payloads.json           ← Security payloads: XSS, SQL injection, path traversal (populated during generate)
    ├── fixtures/                                ← Sample files for multipart/form-data tests
    │   ├── sample.pdf                        ← Small fixed-content PDF (1-page placeholder)
    │   ├── sample.png                        ← Small fixed-content PNG (1x1 pixel)
    │   ├── sample.csv                        ← Small fixed-content CSV (header + 1 row)
    │   └── sample.txt                        ← Small fixed-content text file
    ├── scripts/
    │   ├── test-runner.js                    ← Node.js test executor
    │   └── generate-report.js                ← Report generation script (reads results.json → produces test-summary.html + test-report.md)
    ├── test-results/                         ← Test output (gitignored)
    │   ├── results.json
    │   ├── test-summary.html
    │   └── test-report.md
    └── README.md                             ← Framework documentation
```

### 4. Create Insomnia Collection Per Service

Generate an Insomnia v4-compatible JSON collection for each service. The collection **MUST** include `unit_test_suite` and `unit_test` resources — these are what `inso run test` looks for. Without them, `inso` will report "no test suites found" and fail.

#### Collection Structure (Insomnia Export v4 Format) — Schema Contract

The collection JSON MUST conform to the Insomnia export v4 schema. The shape is fully specified by the resource-type contract table below — Copilot generates the JSON dynamically from the discovered endpoints; do NOT copy a literal template.

**Top-level envelope (mandatory fields):**
- `_type: "export"`
- `__export_format: 4`
- `resources: []` — array containing the resources defined in the table below

**Resource-type contract** — every resource MUST carry a `_type`, `_id`, and (where applicable) `parentId` linking it to its container. ID prefixes are conventional (`wrk_`, `fld_`, `req_`, `uts_`, `ut_`, `env_`) and used by `inso` for discovery; keep them stable.

#### Critical `inso` CLI Requirements

| Resource Type | Required? | Purpose |
|---|---|---|
| `workspace` | Yes | Top-level container — `inso run test` targets this by name |
| `request` | Yes | HTTP request definitions — endpoints with method, URL, headers, body |
| `request_group` | Yes | Folders organizing requests (Positive, Negative, Edge-Case) |
| `unit_test_suite` | **MANDATORY** | Test suite container — `inso run test` discovers these |
| `unit_test` | **MANDATORY** | Individual test cases with `code` field using `insomnia.send()` + chai `expect()` |
| `environment` | Yes | Variable sets for local/test/stage |

#### Test Code Syntax (Insomnia Unit Tests)

**Use Insomnia's test API — NOT Postman's `pm.*` scripting:**

```javascript
// ✅ CORRECT — Insomnia unit test syntax
const resp = await insomnia.send();
expect(resp.status).to.equal(200);

const body = JSON.parse(resp.data);
expect(body).to.have.property('id');
expect(resp.headers['content-type']).to.contain('application/json');
```

```javascript
// ❌ WRONG — Postman scripting (will NOT work with inso CLI)
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});
```

**Every `unit_test` resource must:**
- Reference a `requestId` pointing to a `request` resource in the collection
- Have a `code` field that calls `await insomnia.send()` to execute the request
- Use chai assertions (`expect()`) on the response — NOT `pm.*` methods
- Be parented to a `unit_test_suite` resource

#### Additional Collection Requirements

- **Every discovered endpoint** gets request entries for: valid, invalid, boundary, injection payloads
- **Environment variables** for base URL, auth tokens, content type
- **Request chaining** — use response values from one request as input to another (e.g., create → get → update → delete)
- **Collection must be directly importable** into Insomnia Desktop for manual testing
- **Pre-request scripts** for dynamic values (timestamps, UUIDs)

### 5.0 Output Contract

Pinned CI/CD interfaces: see **tools/runner-contract.md** (do not duplicate in agent context — read on demand).

### 5. Create Test Runner

Copy the canonical reference implementation — do **not** regenerate runner logic from prose.

1. **Source template:** `.github/i2a-skills/tdgs-aidlc-setup-api-tests/templates/test-runner.js.template`
2. **Destination:** `{service-repo}/api-tests/scripts/test-runner.js`
3. **Substitute:** replace `{{SERVICE_NAME}}` with the detected service directory name (never hardcode a vendor app name).
4. **Complete implementation included:** collection loader, inso CLI primary path, Node/axios fallback executor, mini-chai assertions, catalog resolution, pre-send guards, error classification, and catalog write-back — no extension needed for standard use.

**Schema-drift heal check (MANDATORY before overwrite):** If `test-runner.js` already exists with `resolveCatalogTokens` / `loadCatalogPools`, run the 10-item heal checklist from G16 post-flight (Section 5 guard block in prior revisions) — patch surgically, do NOT blind overwrite.

**Executor order:** try `inso` CLI first; on install/known CLI errors fall back to Node.js + axios (see tools/runner-contract.md). Log `[EXECUTOR]` line.

**Insomnia unit test syntax for collections:** tools/insomnia-unit-test-examples.md

### 5b. Create Report Generator

1. **Source template:** `templates/generate-report.js.template`
2. **Destination:** `{service-repo}/api-tests/scripts/generate-report.js`
3. **Substitute:** `{{SERVICE_NAME}}` in header comment only.
4. Implement HTML sections 1–10 per workflow summary below — contract details in tools/runner-contract.md. **MANDATORY:** `esc()` on all dynamic HTML; service-scoped paths via `__dirname`; math invariant before render.

**Report sections (checklist):** Header banner | Pass rate gauge + cards | Last run vs this run (if results.previous.json) | Endpoint coverage | Category breakdown | Business rules matrix (if rule IDs in titles) | Catalog tokens table | Data ledger | Failed details | Cross-service skips | Gap analysis | Footer.

### 5c. Create Linter & Coverage Auditor

1. **lint-collection.js** — copy `templates/lint-collection.js.template` → `api-tests/scripts/lint-collection.js`. Wire `pretest` in package.json (G16).
2. **audit-coverage.js** — copy `templates/audit-coverage.js.template` → `api-tests/scripts/audit-coverage.js`.
3. **audit-config.json** — copy `templates/audit-config.json.template` → `api-tests/config/audit-config.json`, then tune globs for detected framework (G16b defaults table).


### 6. Create Package.json Per Service

> ⚠️ **CRITICAL — DO NOT USE JEST.** API tests use a custom Node.js runner (`scripts/test-runner.js`) that parses Insomnia collections and executes via `inso` CLI with axios fallback. Jest is NOT used for API tests. If you generate a `package.json` with `jest` in scripts or devDependencies, you have made an error.

> **Output Contract (CI/CD-stable — DO NOT change without bumping schemaVersion):** The npm script names below are pinned per Section 5.0. CI workflows (GitHub Actions) invoke them by name. Renaming any of them is a breaking change requiring coordinated updates across consuming workflows.

Create `{service-repo}/api-tests/package.json`:

```json
{
  "name": "{service-name}-api-tests",
  "version": "1.0.0",
  "private": true,
  "description": "API tests for {service-name}",
  "scripts": {
    "pretest": "node scripts/lint-collection.js collections/*.json",
    "test": "node scripts/test-runner.js --env local",
    "test:full": "node scripts/test-runner.js --env local; node scripts/generate-report.js; node scripts/audit-coverage.js",
    "test:test": "node scripts/test-runner.js --env test; node scripts/generate-report.js; node scripts/audit-coverage.js",
    "test:stage": "node scripts/test-runner.js --env stage; node scripts/generate-report.js; node scripts/audit-coverage.js",
    "test:report": "node scripts/generate-report.js",
    "test:inso": "npx inso run test \"{service-name} API Tests\" --env \"Local\" --src collections/{service-name}.json",
    "test:verbose": "node scripts/test-runner.js --env local --verbose",
    "test:dry-run": "node scripts/test-runner.js --env local --dry-run",
    "test:collection": "node scripts/test-runner.js --env local --collection"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "ajv": "^8.0.0",
    "ajv-formats": "^3.0.0",
    "chalk": "^4.1.2",
    "form-data": "^4.0.0",
    "js-yaml": "^4.1.0"
  },
  "optionalDependencies": {
    "insomnia-inso": "^3.6.0"
  }
}
```

> **Checklist before moving on:** Verify your generated `package.json` has:
> - [ ] `"pretest"` runs `node scripts/lint-collection.js collections/*.json`
> - [ ] `"test"` uses `node scripts/test-runner.js` (NOT `jest`)
> - [ ] `"test:full"` chains `test-runner.js; generate-report.js; audit-coverage.js` (semicolon ensures reports always generate even when tests fail)
> - [ ] `"test:report"` uses `node scripts/generate-report.js`
> - [ ] `"test:inso"` uses `npx inso run test`
> - [ ] `optionalDependencies` has `insomnia-inso` (NOT `jest`) — optional because `node-libcurl` native compilation fails on macOS; G12 fallback handles missing `inso`
> - [ ] No reference to `jest`, `jest.config.js`, or `@jest` anywhere

### 7. Create Environment Files

> **Output Contract (CI/CD-stable — DO NOT change without bumping schemaVersion):** The env-file field names (`base_url`, `context_path`, `auth_token`, `content_type`) are pinned. The test-runner composes the request URL as `base_url + context_path`. Renaming any field is a breaking change for every collection that resolves `{{ base_url }}` / `{{ context_path }}` template variables.

For each service, create environment files with auto-detected values:

> ⚠️ **CRITICAL — `context_path` MUST be auto-detected and included.** Many services run behind a context path (e.g., `/api/v1`, `/service-name`). Without it, all API calls will hit 404.
>
> **Auto-detection:** Read the service's `application.properties`/`application.yml` for `server.servlet.context-path`. If not found, check `@PropertySource` config classes for custom property files (e.g., `{app}-{service}-application.properties`). Default to `""` only if no context path is configured.
>
> **The test-runner.js MUST compose the full URL as:** `config.base_url + config.context_path`

**`local.json`:**
```json
{
  "base_url": "http://localhost:{detected-port}",
  "context_path": "{detected-context-path}",
  "auth_token": "",
  "content_type": "application/json"
}
```

**`test.json`:**
```json
{
  "base_url": "https://test.example.com",
  "context_path": "{detected-context-path}",
  "auth_token": "${AUTH_TOKEN}",
  "content_type": "application/json"
}
```

**`stage.json`:**
```json
{
  "base_url": "https://stage.example.com",
  "context_path": "{detected-context-path}",
  "auth_token": "${AUTH_TOKEN}",
  "content_type": "application/json"
}
```

> ⚠️ **Production environment is intentionally excluded.** Only `local`, `test`, and `stage` are supported. Tests should never run against production.

#### `auth_token` Resolution (MANDATORY — applies to test/stage/CI runs)

> ⚠️ **`auth_token` placeholder `${AUTH_TOKEN}` is resolved at runtime by `test-runner.js` from OS env — NOT literal.** If unset on `test`/`stage`, every protected endpoint returns 401 and suite is misclassified as `fail` instead of `infra`.
>
> **Resolution algorithm:**
> 1. Read env file (`local.json`/`test.json`/`stage.json` per `--env`).
> 2. For values matching regex `^\$\{([A-Z_][A-Z0-9_]*)\}$`, look up `process.env[name]`.
> 3. If set + non-empty → substitute.
> 4. If unset/empty:
>    - `local` → leave as `""`.
>    - `test`/`stage` → ABORT exit code 2 with: `❌ AUTH_TOKEN env var is required for env={test|stage} but is unset. Export it before running: export AUTH_TOKEN="<your-token>". Or set it in your CI secrets store as AUTH_TOKEN. Suite will NOT run with empty auth_token to prevent 401-cascade misclassification.`
> 5. NEVER log resolved token. MAY log `AUTH_TOKEN=*** (resolved, length=N)`.
>
> **Per-service token override:** for multi-service workspaces with different auth realms, support `${<SERVICE_PREFIX>_AUTH_TOKEN}` (prefix derived from service repo dir minus project prefix and `-service*` suffix — matches `generate-api-tests` Cross-Service Chaining convention).
>
> **Document in TESTING.md** (Step 9): "Running against test/stage" listing required env vars (`AUTH_TOKEN` + cross-service `<PREFIX>_AUTH_TOKEN`/`<PREFIX>_base_url`) with one-line export examples.
>
> **CI integration:** GitHub Actions/GitLab CI/Jenkins MUST inject `AUTH_TOKEN` (and per-service variants) from secrets store — NEVER commit token values. Empty defaults exist solely for JSON schema validation.

### 8. Verify Framework Setup

For each service:
1. `cd {service-repo}/api-tests && npm install --ignore-scripts` (use `--ignore-scripts` because `insomnia-inso` has native deps that may fail on macOS; G12 fallback handles missing `inso` binary)
2. `npm test -- --dry-run` (verify test runner loads without executing)
3. Verify Insomnia collection is valid JSON and importable
4. **Update `.gitignore`** — Append these entries to `{service-repo}/.gitignore` if not already present:
   ```
   # API test output
   api-tests/test-results/
   api-tests/node_modules/
   ```

Report verification status per service.

### 9. Document Framework

**9a. Per-service `api-tests/README.md`** — Create `{service-repo}/api-tests/README.md` per service covering:
- Directory layout explanation
- How to run tests (local, test, stage, verbose)
- How to import collection into Insomnia Desktop
- How to add new test cases
- Environment configuration
- Troubleshooting (`inso` CLI issues, port conflicts)

**9b. Append `## API Tests` section to root `{service-repo}/TESTING.md` (R10-C7 — MANDATORY when the file already exists):**

If `{service-repo}/TESTING.md` exists (created by an earlier setup phase, e.g. `/tdgs-aidlc-setup-unit-tests`), append — do NOT overwrite — a new `## API Tests` section pointing readers to the api-tests/ subtree:

```markdown
## API Tests

API tests for this service live under `api-tests/` and are executed via the standalone `node scripts/test-runner.js` runner (NOT Jest — see `api-tests/README.md` for the rationale).

Quick start (from `{service-repo}/`):

```bash
cd api-tests
npm install --ignore-scripts
npm test                # local env, no report
npm run test:full       # local env + HTML/Markdown report
npm run test:test       # test env (requires AUTH_TOKEN export)
npm run test:stage      # stage env (requires AUTH_TOKEN export)
```

Reports: `api-tests/test-results/test-summary.html` (rich) + `api-tests/test-results/test-report.md` (PR-friendly). The cross-app dashboard at `{docs-repo}/test-data/dashboard.html` aggregates this service's results alongside every other service after `/tdgs-aidlc-run-tests` runs.

See `api-tests/README.md` for full configuration, env-var requirements, and troubleshooting.
```

Detection rule: if `TESTING.md` already contains `## API Tests`, replace its body in place (idempotent re-run); else append. NEVER duplicate. Makes the repo's top-level TESTING.md a single landing page for unit + API tests.

---

## Constraints

- **Create `api-tests/` INSIDE each service repo** — NOT at the workspace root. Each service is independent.
- **Do NOT create a monolith `api-tests/` at workspace root.** The old structure (single api-tests folder for all services) is exactly what we're replacing.
- **Do NOT modify any production source code,** application configs, or deployment files.
- **Collections must remain Insomnia Desktop importable** — valid Insomnia v4 format JSON.
- **Each service gets its own independent `package.json`** — no shared dependencies across services.
- **Environment files must NOT contain secrets.** Use `${VARIABLE}` placeholders for tokens and credentials.
- **`inso` CLI is preferred** but include the Node.js fallback for known macOS `node-libcurl` compilation issues.
- **NEVER hardcode application-specific values** (app names, agency IDs, business constants, city/state values) in the generated test-runner, report generator, or environment files. All values must be dynamically discovered from the workspace (application.properties, project-context.md, catalog YAML, reference data files) at runtime. These prompts are an enterprise-level common framework used across multiple applications.

## Anti-Hallucination Guardrails

> ⚠️ **These guardrails apply to every file generated by this prompt. Violation of any guardrail is a HARD FAILURE.**

1. **NEVER generate a port number without reading it from `application.properties`, `application.yml`, or `package.json`.** If the port cannot be detected, use the default for the stack (8080 for Java, 3000 for Node.js, 5000 for Python) and log a warning.
2. **NEVER generate a context path without reading it from `server.servlet.context-path` or equivalent.** Default to `""` (empty) only if the config file has no context path.
3. **NEVER generate endpoint paths, method names, or response fields without verifying them in actual controller/route source code.** If you cannot find the source file, do NOT guess — log a warning and skip.
4. **NEVER generate Insomnia collection requests for endpoints that do not exist in the codebase.** Every request in the collection MUST trace back to a real controller method.
5. **NEVER copy field names from the catalog into request payloads without verifying they exist in the `@RequestBody` model class.** Catalog field names and model field names may differ.
6. **NEVER hardcode service names, application IDs, agency IDs, or business constants.** All must come from workspace scanning or the test-data catalog.
7. **NEVER generate report files with static/hardcoded counts.** All reports MUST be generated programmatically by reading `results.json`.

## Phase-5 Augmentations — Runner Contract Implementation

These rules implement the contracts declared in the Guardrails section (G7, G11, G12). The scaffolded `scripts/test-runner.js` MUST honor every clause below.

### A5-1 — Inso CLI vs Node fallback selection (G12)

`scripts/test-runner.js` MUST select the runner using this exact decision tree, in order:
1. If `process.env.RUNNER === 'node'` → use Node/axios fallback runner.
2. If `which inso` (cross-platform: `command -v inso` on POSIX, `where inso` on Windows) returns no path → use Node fallback. Log: `inso CLI not on PATH — using Node fallback runner`.
3. If the loaded collection contains ANY request with `body.mimeType === 'multipart/form-data'` AND the installed `inso --version` is `< 8.0.0` → use Node fallback. Log: `inso < 8.0.0 does not support multipart — using Node fallback`.
4. If the collection contains ANY conditional skip directive (test marked `skipped: cross-service-dependency`) → use Node fallback. Log: `conditional-skip directives not supported by inso — using Node fallback`.
5. Otherwise → use `inso run test`.

Both runners MUST emit `test-results/results.json` with the SAME schema. Document this schema in `TESTING.md`.

### A5-2 — Multipart/form-data support

When the discovered endpoint accepts `@RequestPart` (Spring) or has `consumes: multipart/form-data` (OpenAPI), the request body in the collection MUST be a multipart envelope. The Node fallback MUST use `form-data` (npm package) to encode. Add `form-data` to `dependencies`. The framework MUST scaffold `api-tests/fixtures/sample.{pdf,png,csv,txt}` (small fixed-content files) for use in multipart tests.

### A5-3 — `fieldFormatMap` schema and runtime coercion

`test-data-catalog.yaml.identityPools[].fieldFormats` is an OPTIONAL object: `{ <fieldName>: <format-string> }`. Supported `<format-string>` values:
- `MM/DD/YYYY` — reformat from any ISO/parseable date input
- `YYYY-MM-DD` — reformat from any ISO/parseable date input
- `NNNNNNNNN` — strip non-digits (e.g. SSN "123-45-6789" → "123456789")
- `XXX-XX-XXXX` — add SSN-style separators
- `printf:<spec>` — raw printf-style formatter applied via Node `util.format`
- `regex-extract:<pattern>` — extract first regex match from the source value

`scripts/test-runner.js` MUST read `fieldFormatMap` and apply the coercion at value-injection time, BEFORE the value is substituted into the request payload. Unknown format strings MUST log `⚠️ unknown fieldFormat <format> for <field> — passing raw value` and pass through.

### A5-4 — Cross-service / external dependency runtime classification (G7)

When the runner attempts to inject a value whose source is a chain step marked `kind: cross-service-dependency` (in catalog), the runner MUST:
1. Check for a static stub override in `test-data-catalog.yaml.stubs.<endpointSlug>.<fieldName>`. If present, inject the stub value and log `ℹ️ using stub for <field>: <value>`. The test runs normally.
2. If no stub: classify the test result as `status: skipped` with `reason: cross-service-dependency: <missingPrereq>`. Increment a separate `skipped.crossServiceDependency` counter in `results.json`.
3. The dashboard renders these as their own swimlane (NOT mixed with `failed` or `skipped: other`).

### A5-5 — No silent test count

The runner MUST `console.log` a final line: `✅ N passed | ❌ F failed | ⏭️ S skipped (CD: C, other: O) | 🔴 D data-issue | 🆚 I infra | total: T` where the math `passed + failed + skipped + dataIssue + infra === total` MUST hold (assert before exit; if false, log a `⚠️ counter drift` warning).

---

## Execution Context

This prompt sets up the framework only. After this completes:

1. **Recommended next step:** Run `/tdgs-aidlc-setup-testdata` to create the test data catalog and upgrade the test-runner with full catalog token resolution (identity pool rotation, consumption tracking, chaining support).
2. Then run `/tdgs-aidlc-generate-api-tests` to generate and execute the actual API test cases with comprehensive endpoint coverage.
````
