# Pre-flight Checks

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> Unit tests are generated in their standard locations per stack. Do NOT consolidate tests into a separate directory.

## Pre-flight Check: Read project-context.md (MANDATORY)

> ⚠️ **BEFORE generating any test code**, search the workspace for `project-context.md` (typically in `*-docs*/project-context.md`). If found, **read its Testing Rules section in full** and follow those conventions exactly. This file contains project-specific rules that override generic defaults — including:
> - Which `@testing-library/react` version is in use (v9 = no `screen`, v11+ = use `screen`)
> - Which `@testing-library/user-event` version (v7 = sync API, v14+ = async `setup()` API)
> - Whether to use `fireEvent` or `userEvent`
> - Mock patterns (MSW version, jest.mock, etc.)
> - Test file location conventions (`src/__tests__/` vs colocated)
> - Java test patterns (`@ExtendWith(MockitoExtension.class)` vs `@SpringBootTest`)
>
> **If project-context.md is NOT found**, fall back to auto-detection from `package.json` / `pom.xml` version numbers.

## Pre-flight Check: Ground-Truth Hierarchy (MANDATORY — Self-Sustained Spec)

> ⚠️ **Single, authoritative rule** for choosing any value placed in a fixture, mocked response, stub, or assertion-expected value produced by THIS prompt. Self-contained — do not look elsewhere.

### Workspace Sources (scan in this order)

1. **project-context.md** — `*-docs*/project-context.md`
2. **Test data catalog** — `*-docs*/test-data/test-data-catalog.yaml` — **AWARENESS ONLY. DO NOT OPEN OR READ.** Knowing this file exists tells you that runtime tokens (`{{catalog.identityPool.*}}`, `{{captured.*}}`) are reserved for API/functional tests and must NOT appear in unit-test fixtures. Importing or referencing the catalog from any unit test is a HARD FAILURE under G4 (hermeticity).
3. **Knowledge base** (MANDATORY when `*-docs*/knowledge-base/` exists) — recursively index `knowledge-base/{api,business,common-services,repos,shared}/**/*.md`
4. **UI repository** — discover the UI API client directory (try `*-ui*/src/api/`, `*-ui*/src/services/`, `*-ui*/src/client/`, `*-ui*/src/http/`, `*-ui*/src/lib/api/`; honor `project-context.md` override) + screen components. Authoritative for payload SHAPE
5. **Backend DTO/schema** — request/response classes. Authoritative for field NAMES
6. **DDL** — every `*.sql`. Authoritative for value constraints
7. **DAO layer** — bind-statement format inference. Authoritative for format

### Field-Derivation Hierarchy P0–P6

For every fixture / mocked-response field that crosses a real DTO/DDL boundary in the unit under test:

| Tier | Source | Use when |
|------|--------|----------|
| P0 | **N/A in unit tests** — catalog tokens (`{{catalog.identityPool.*}}`) are reserved for API and functional tests because no unit-test runner (JUnit, Jest, pytest, xUnit) resolves runtime tokens. Unit tests are hermetic and synthesize values inline via builders/factories. | never (kept for tier-numbering parity with API/functional prompts) |
| P1 | **N/A in unit tests** — captured tokens (`{{captured.<name>}}`) require a runtime resolver (API runner). Unit tests chain setup via direct method calls or builders, not runtime token interpolation. | never (kept for tier-numbering parity) |
| P2 | UI-emitted literal | UI sends specific value/shape in same field |
| P3 | KB-documented value | `knowledge-base/**/*.md` declares it |
| P4 | DDL/DAO-derived literal | constraint or format dictates value |
| P5 | DTO annotation literal | `@Pattern` regex sample, first enum value |
| P6 | Typed placeholder | last resort — tagged `(typed-placeholder for <field> — <reject_reason>)` |

**Mock-only exemption:** values that NEVER reach a real DTO/DDL boundary (e.g., a `Mockito.when(repo.findById(any())).thenReturn(Optional.of(...))` where the returned object is consumed only by a stub) MAY use any literal but MUST be tagged `mock-only` in the test name and excluded from the provenance table.

**PII field advisory (non-mock-only fixtures):** for fields matching the canonical PII regex defined in `/tdgs-aidlc-generate-api-tests` Pre-flight item 3, prefer a deterministic typed-placeholder or builder-emitted literal satisfying DTO/DDL constraints — NEVER use faker for PII in non-mock-only fixtures, and NEVER read the test-data catalog (unit tests are hermetic). Violations are flagged in the Per-Field Provenance Table.

**No-skip rule:** record `reject_reason` and fall through. Skipping silently = generation bug.

**Allowed runtime `{{...}}` tokens** in fixture loaders: unit tests have no runtime token resolver. Any `{{...}}` token in a unit-test fixture is a generation bug — it would appear unresolved in assertions and fail visibly. Use plain literals from the builder/factory.

### Per-Field Provenance Table (MANDATORY in Pre-Write Contract)

For each non-mock-only fixture / response stub, emit BEFORE writing:

```
| field path | tier | source ref | value/token | reject_reason (P6 only) |
```

Un-explained P6s = contract rejected at the gate.

### Generation-Time Self-Validation Gate

(1) Parse fixture, (2) confirm NO `{{...}}` tokens are present (unit tests have no runtime resolver), (3) keys match DTO schema case-sensitive (Jackson silently drops mismatches), (4) literals comply with DDL constraints, (5) format fields match DAO format. Any failure → STOP.

### Catalog-Gaps Feedback Loop

Not applicable to unit tests. The catalog and `catalog-gaps.yaml` are consumed exclusively by API and functional tests. If a non-mock-only unit-test fixture field falls to P6, document the `reject_reason` inline in the test (Per-Field Provenance Table + comment) and use a deterministic typed-placeholder that satisfies DTO/DDL constraints — do NOT write to `*-docs*/test-data/catalog-gaps.yaml`.

### Role of THIS prompt in the Hierarchy

**You are a CONSUMER for fixtures and stub responses.** For every fixture or mock response object containing model fields: (1) emit the Per-Field Provenance Table in the Pre-Write Contract (one table per fixture, mock-only fields excluded), (2) run the Self-Validation Gate against the DTO/POJO under test, (3) document any non-mock-only P6 fall-through inline. Mock-only stubs that never reach a real DTO/DDL boundary are exempt — tag the test description `(mock-only fixture)`.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `coverage_target` | No | `80` | Minimum coverage percentage threshold (e.g., 60, 80, 90). |
| `repo` | No | All detected | Specific repo directory name, or `all` for every detected repo. |
| `skip_completed` | No | None | Comma-separated list of already-completed modules/packages to skip (for resumption). |

> ⚠️ **`coverage_target` is LINE/BRANCH coverage, not a TEST-COUNT budget.** It is enforced by JaCoCo `<minimum>`, Jest `coverageThreshold`, pytest `--cov-fail-under`, and Coverlet thresholds — meaning ≥80% of production lines/branches MUST be exercised by tests. The TOTAL number of generated test cases is independently driven by:
> - Number of testable units (classes / functions / components / hooks)
> - Number of branches per unit (if/else, switch, try/catch, ternaries)
> - Number of input boundary classes per parameter
>
> Two runs of the same workspace can legitimately produce 200 vs 2000 unit tests if production code grew between runs. To make this variance explicit, the agent MUST emit the **Test Count Budget Reconciliation** block (see Discovery) BEFORE generating any test file. To set an upper bound, pass `max_tests_per_module=<int>` (default `unlimited`) — the generator will then prioritize highest-complexity branches up to the bound and report which ones were deferred.

### Coverage Target Behavior

1. **If parameter provided:** Use it (e.g., `/tdgs-aidlc-generate-unit-tests 90`)
2. **If NOT provided:** Check if `{repo}/test-results/coverage.json` exists (created by `/tdgs-aidlc-setup-unit-tests`). If found, **AJV-validate inline (R10-D4)** against the canonical schema BEFORE reading any field:
   ```js
   const schema = {
     type: 'object',
     additionalProperties: false,
     required: ['target'],
     properties: {
       target: { type: 'integer', minimum: 0, maximum: 100 },
       runner: { type: 'string', enum: ['jest', 'vitest'] }  // optional — only present when both runners exist
     }
   };
   const v = ajv.compile(schema);
   if (!v(data)) {
     console.error(`❌ {repo}/test-results/coverage.json invalid — ${ajv.errorsText(v.errors)}. Re-run /tdgs-aidlc-setup-unit-tests to regenerate, or pass coverage_target= explicitly.`);
     process.exit(2); // STOP — never proceed with a malformed coverage contract
   }
   ```
   If valid, read `{ "target": N }` and use that value. If a `runner` field is present, use it to select the test runner (Jest vs Vitest). If file is malformed (unexpected properties, missing target, target not an integer in `[0, 100]`), HARD STOP — never silently fall back to default `80`. Silent fallback masks setup-script bugs and produces tests calibrated to the wrong threshold.
3. **If no parameter AND no coverage.json:** Prompt the user:
   ```
   📊 Coverage target not specified.
   
   What minimum coverage percentage should tests target?
   Enter a number (e.g., 60, 80, 90) or press Enter for default (80%):
   > _
   ```
4. **If user presses Enter / skips:** Use default `80%`
5. **Coverage target appears in:** JaCoCo `<minimum>`, Jest `coverageThreshold`, pytest `--cov-fail-under`, and all generated reports.

### Resumption Support

If `skip_completed` is provided (e.g., `skip_completed=module-a,module-b`):
- **Skip** those modules/packages entirely — do NOT regenerate or re-run their tests
- **Only generate** tests for remaining uncovered modules
- **Final report includes ALL modules** (completed + newly generated) for a complete picture

## Workspace Scan & Repository Confirmation (Step 0)

Before generating any tests, scan the workspace and confirm with the user which repositories to include:

1. **Scan workspace root** for all subdirectories
2. **Classify each repo** — identify stack type (Java/Spring Boot, React/JS, Python, etc.)
3. **Display discovered repos** in a numbered table:
   ```
   ══════════════════════════════════════════════════════════════
   WORKSPACE REPOSITORY SCAN
   ══════════════════════════════════════════════════════════════

     #  Repo                           Stack               Existing Tests?  Include?
     ─  ─────────────────────────────   ──────────────────   ──────────────   ────────
     1  {repo-1}/                      Java/Spring Boot     ✅ {N} files     ✅
     2  {repo-2}/                      Java/Spring Boot     ✅ {N} files     ✅
     3  {repo-3}/                      React/JS             ✅ {N} files     ✅
     4  {repo-4}/                      Node.js              ❌ None          ✅

   Coverage Target: {coverage_target}%

   ══════════════════════════════════════════════════════════════
   ```
4. **Ask user to confirm:**
   ```
   The repos marked ✅ will have unit tests generated.
   We can't run all repos every time — please confirm.

   Confirm repos to include? (Enter to accept all, or specify numbers to exclude, e.g., "exclude 4"):
   > _
   ```
5. **Only process confirmed repos** in subsequent steps.

## Pre-checks Per Repo (Step 1)

1. **Auto-detect all repos and stack types** — same logic as `/tdgs-aidlc-setup-unit-tests`.
2. **Verify test framework exists** per repo:
   - Java (Maven): `spring-boot-starter-test` in `pom.xml`, JaCoCo plugin configured
   - Java (Gradle): `spring-boot-starter-test` in `build.gradle`/`build.gradle.kts`, `jacoco` plugin applied with `jacocoTestCoverageVerification` rule
   - React/JS (Jest): `@testing-library/*` in `package.json`, `jest.coverageThreshold` configured
   - React/JS (Vitest): `vitest` + `@vitest/coverage-v8` in `package.json`, `test.coverage.thresholds` configured in `vitest.config.*`
   - Python: `pytest` and `pytest-cov` installed; coverage configured via `pyproject.toml` `[tool.pytest.ini_options]` or `pytest.ini` `[pytest]`
   - Angular (Karma): `karma.conf.js` exists with `coverageReporter.check.global` configured; OR Angular (Jest): `jest-preset-angular` + `jest.coverageThreshold` configured
   - Vue (Vitest): `@vue/test-utils` + `vitest` + `@vitest/coverage-v8` with `test.coverage.thresholds`; OR Vue (Jest): `@vue/test-utils` + `jest.coverageThreshold`
   - Lambda (Node.js): `@aws-sdk/client-mock` in devDeps, `jest.config.*` with `testEnvironment: 'node'` and `coverageThreshold`
   - Lambda (Python): `moto` + `pytest` + `pytest-cov` installed; coverage configured
   - C# / .NET: `Microsoft.NET.Test.Sdk`, `xunit` or `NUnit`, and `coverlet.collector` in the test `*.csproj`; `coverlet.runsettings` with `<Threshold>` present
   - If missing → **HALT** and instruct the user to run `/tdgs-aidlc-setup-unit-tests` first; do NOT attempt to scaffold from this prompt (Copilot prompts cannot programmatically invoke other prompts; inlining setup logic here would duplicate scaffolding and drift)
3. **Inventory existing tests** — count existing test files per repo, identify tested vs untested modules
4. **Check `skip_completed` list** — validate and exclude those modules
