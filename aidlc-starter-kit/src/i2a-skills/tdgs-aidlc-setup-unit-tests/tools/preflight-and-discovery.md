# Setup Unit Tests — Pre-flight & Discovery

Pre-flight checks, ground-truth hierarchy, parameters, and Step 1 (auto-detection).

---

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> Unit tests live in their standard locations per stack:
> - **Java:** `src/test/java/` (standard Maven layout)
> - **JS/TS:** `src/__tests__/` with mirrored directory structure (e.g., `src/components/Foo.js` → `src/__tests__/components/Foo.test.js`). This keeps all UI unit tests in one trackable directory for easy commits and code review, rather than scattering `*.test.js` files throughout `src/`.
> - **Python:** `tests/`

## Pre-flight Check: Ground-Truth Hierarchy (MANDATORY — Self-Sustained Spec)

> ⚠️ **Single, authoritative rule** for choosing any value placed in a fixture, mock, stubbed response, or assertion-expected value produced by this prompt's scaffolding or by `/tdgs-aidlc-generate-unit-tests`. Self-contained — do not look elsewhere.

### Workspace Sources (scan in this order)

1. **project-context.md** — `*-docs*/project-context.md`
2. **Test data catalog** — `*-docs*/test-data/test-data-catalog.yaml` — **AWARENESS ONLY. DO NOT OPEN OR READ.** Knowing this file exists tells you that runtime tokens (`{{catalog.identityPool.*}}`, `{{captured.*}}`) are reserved for API/functional tests and must NOT appear in unit-test fixtures (G4 hermeticity). Do not import its contents into unit tests under any circumstance.
3. **Knowledge base** (MANDATORY when `*-docs*/knowledge-base/` exists) — recursively index `knowledge-base/{api,business,common-services,repos,shared}/**/*.md`
4. **UI repository** — `*-ui*/src/api/*` + screen components. Authoritative for payload SHAPE
5. **Backend DTO/schema** — request/response classes with `@JsonProperty`, `@Pattern`, `@Size`, `@NotNull`, enums. Authoritative for field NAMES
6. **DDL** — every `*.sql`. Authoritative for value constraints
7. **DAO layer** — bind-statement format inference. Authoritative for format

### Field-Derivation Hierarchy P0–P6

> **Abbreviated version.** See `/tdgs-aidlc-generate-unit-tests` Field-Derivation Hierarchy for the full specification including PII regex advisory, mock-only exemption, and provenance table requirements.

| Tier | Source | Use when |
|------|--------|----------|
| P0 | **N/A in unit tests** — catalog tokens (`{{catalog.identityPool.*}}`) are reserved for API and functional tests because no unit-test runner (JUnit, Jest, pytest, xUnit) resolves runtime tokens. Unit tests are hermetic and synthesize values inline via builders/factories. | never (kept for tier-numbering parity with API/functional prompts) |
| P1 | **N/A in unit tests** — captured tokens (`{{captured.<name>}}`) require a runtime resolver (API runner). Unit tests chain setup via direct method calls or builders, not runtime token interpolation. | never (kept for tier-numbering parity) |
| P2 | UI-emitted literal | UI sends specific value/shape in same field |
| P3 | KB-documented value | `knowledge-base/**/*.md` declares it |
| P4 | DDL/DAO-derived literal | constraint or format dictates value |
| P5 | DTO annotation literal | `@Pattern` regex sample, first enum value |
| P6 | Typed placeholder | last resort — tagged `(typed-placeholder for <field> — <reject_reason>)` |

**No-skip rule:** record `reject_reason` and fall through if higher tier rejected.

**Allowed runtime `{{...}}` tokens**: unit tests have no runtime token resolver. Any `{{...}}` token in a unit-test fixture is a generation bug — the literal would appear unresolved in assertions and fail visibly. Use plain literals from the builder/factory.

### Per-Field Provenance Table (MANDATORY in Pre-Write Contract of consumer prompt)

Emit BEFORE writing for every fixture / stubbed response containing model fields:

```
| field path | tier | source ref | value/token | reject_reason (P6 only) |
```

Un-explained P6s = contract rejected at the gate.

### Generation-Time Self-Validation Gate

(1) Parse fixture, (2) all `{{...}}` tokens in allowed set, (3) keys match DTO schema case-sensitive, (4) literals comply with DDL, (5) format fields match DAO. Any failure → STOP, ask user.

### Catalog-Gaps Feedback Loop

Not applicable to unit tests. The catalog and `catalog-gaps.yaml` are exclusively consumed by API and functional tests. If a unit-test fixture cannot derive a constraint-compliant literal from P2–P5, fall through to P6 (typed placeholder) and document the `reject_reason` inline in the test — do NOT write to `*-docs*/test-data/catalog-gaps.yaml`.

### Role of THIS prompt in the Hierarchy

**You are SCAFFOLDING the unit-test framework consumed by `/tdgs-aidlc-generate-unit-tests`.** The generated test-fixtures helpers MUST: (1) build POJO/DTO instances that comply with `@Pattern` / `@Size` / DDL constraints sourced from P2–P5, (2) for fields representing real PII, prefer deterministic-but-realistic literals from inline builders — NEVER read from the test data catalog (unit tests are hermetic; see Constraints), (3) expose a clear `markMockOnly(value)` helper so pure mock values that never touch a real DTO/DDL boundary are exempt from P2–P5 and provenance — tag them `mock-only` in the test description.

---

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `coverage_target` | No | `80` | Minimum coverage percentage threshold (e.g., 60, 80, 90). |
| `repo` | No | All detected | Specific repo directory name to scaffold, or `all` for every detected repo. |

### Coverage Target Behavior

1. **If parameter provided:** Use it (e.g., `/tdgs-aidlc-setup-unit-tests 90`)
2. **If NOT provided:** Prompt the user:
   ```
   📊 Coverage target not specified.
   
   What minimum coverage percentage should tests target?
   Enter a number (e.g., 60, 80, 90) or press Enter for default (80%):
   > _
   ```
3. **If user presses Enter / skips:** Use default `80%`
4. **Persist the resolved target:** After determining the final coverage target value, write `{repo}/test-results/coverage.json` (create directory if needed) with `{ "target": N }` where N is the integer percentage. This enables `/tdgs-aidlc-generate-unit-tests` to read the target without re-prompting — matching the behavior of `/tdgs-aidlc-setup-api-tests` and `/tdgs-aidlc-setup-functional-tests`.

---

## Step 1 — Auto-Detect All Repositories and Stack Types

Scan the workspace root for all subdirectories. Classify each:

| Indicator | Stack | Test Framework | Coverage Tool |
|-----------|-------|----------------|---------------|
| `pom.xml` with Spring Boot | Java / Spring Boot | JUnit 5 + Mockito | JaCoCo |
| `build.gradle` with Spring Boot | Java / Spring Boot (Gradle) | JUnit 5 + Mockito | JaCoCo |
| `package.json` with `react` | React / JS | Jest + React Testing Library | Jest coverage (Istanbul) |
| `package.json` with `express`/`fastify`/`nestjs` | Node.js | Jest or Vitest | Jest/Vitest coverage |
| `package.json` with `angular` | Angular / TS | Karma + Jasmine or Jest | Istanbul |
| `package.json` with `vue` | Vue / JS/TS | Vitest or Jest | Vitest/Istanbul |
| `template.yaml` / `serverless.yml` with Lambda | AWS Lambda (Node.js/Python) | Jest / pytest | Stack-specific |
| `requirements.txt` / `pyproject.toml` | Python | pytest | coverage.py (via `pytest-cov`) |
| `*.csproj` | C# / .NET | xUnit OR NUnit (whichever is declared) | Coverlet |

**Exclusions:** Skip folders named `node_modules`, `_bmad*`, `tdgs-aidlc-starter-kit`, `*-docs`, `.github`, `scripts`, `_bmad-output`, `apigee-exports`.

Display detected repos:
```
══════════════════════════════════════════════════════════════
DETECTED REPOSITORIES
══════════════════════════════════════════════════════════════

  #  Repo                           Stack               Test Framework       Existing Tests?
  ─  ─────────────────────────────   ──────────────────   ──────────────────   ──────────────
  1  {repo-1}/                      Java/Spring Boot     JUnit 5 + Mockito    ✅ {N} files
  2  {repo-2}/                      Java/Spring Boot     JUnit 5 + Mockito    ✅ {N} files
  3  {repo-3}/                      React/JS             Jest + RTL           ✅ {N} files
  4  {repo-4}/                      Node.js              Jest                 ❌ None

  Coverage Target: {coverage_target}%

══════════════════════════════════════════════════════════════
```
