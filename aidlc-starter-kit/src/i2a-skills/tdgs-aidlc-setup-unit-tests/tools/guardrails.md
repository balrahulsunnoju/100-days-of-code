# Setup Unit Tests — Guardrails

Non-negotiable rules. Read BEFORE any action.

---

## G1 — Application-agnostic
No specific app/vendor/service/field names. Discover everything from `package.json`, `pom.xml`, `requirements.txt`/`pyproject.toml`, `*.csproj` at runtime.

## G2 — Discover-before-generate
Ground every detection in build manifests + source files. Do not assume frameworks present in one repo are present in another.

## G3 — Ask-don't-assume
If coverage threshold, target stack version, or test runner choice is ambiguous, ask the user.

## G4 — Hermeticity is absolute
Unit tests MUST NOT read `test-data-catalog.yaml`, MUST NOT hit real DB or HTTP, MUST NOT depend on filesystem state outside the repo. The catalog is for functional/API tests only. Repository-layer tests using `@DataJpaTest`/TestContainers/H2-in-memory ARE allowed and still count as unit tests; the no-network rule does NOT prohibit embedded DBs.

## G5 — Prerequisite check
Verify each repo has a build manifest before scaffolding. Skip repos lacking one with a clear notice.

## G6 — Test runner fallback
Language runner discovery in priority order:
- Python: `pytest` → `unittest` (stdlib) → `nose2`. If none declared, ask the user which to scaffold. Coverage tool is `coverage.py` (invoked via the `pytest-cov` plugin when pytest is selected).
- JS/TS: `jest` → `vitest`. Honor whatever is declared in `package.json`; do not switch frameworks silently.
- Java: `surefire` + `JUnit5` + `Mockito` + `JaCoCo`. For Kotlin add `kotest` if present.
- .NET: `xunit` OR `nunit` + `coverlet`. Honor whichever framework the existing `*.csproj` already declares (`xunit` / `xunit.runner.visualstudio` → xUnit; `nunit` / `NUnit3TestAdapter` → NUnit). If neither is present, default to xUnit.

## G7 — Stack isolation
When scaffolding a multi-stack monorepo (a single repo containing both `pom.xml` AND `package.json`, etc.), treat each manifest's directory subtree as an independent scaffolding target. Print the per-manifest plan and ask the user to confirm before scaffolding more than one stack into the same repo.

## G8 — Pre-Write Output Contract
Before writing files, emit a per-repo plan: stack detected, files to create, threshold to set, build command to wire.

## G9 — Idempotency
Merge into existing test config; never overwrite user-customized thresholds without confirmation.

## G10 — Sync rule
Mirror this file between `tdgs-aidlc-starter-kit/src/prompts/` (canonical) and `.github/prompts/`.

## G11 — Shared contracts
- **`passRate` formula** (for unit-test report): `passed / (passed + failed)` — unit tests have no `dataIssue`/`infra`/`skipped` categories normally; if a test is `@Disabled` it is excluded from the denominator. `0.0` when denominator is 0.
- **Status enum:** `pass | fail | disabled`. Maps to workspace-level: `passed | failed | skipped`.
- **coverage.json schema (MANDATORY):** the file MUST conform to a strict shape: `{ "target": <integer 0..100>, "runner": "jest"|"vitest" (OPTIONAL — only when both runners are present) }`. `/tdgs-aidlc-generate-unit-tests` AJV-validates this shape against an inline schema before reading. On parse failure or shape mismatch, generate-unit-tests STOPS with `❌ {repo}/test-results/coverage.json invalid: <error>. Re-run /tdgs-aidlc-setup-unit-tests.` Never coerce, never default-to-80 silently.

## G12 — Reports sync guardrail
> Every per-repo `generate-report.js` / `generate_report.py` MUST build ONE in-memory results object, then render ALL formats (`test-summary.html`, `test-report.md`, `coverage.json` summary) from that SAME object in ONE pass. After writing: assert totals (`tests`, `passed`, `failed`, `coverage.lines`) match across all formats. Mirrors api-tests G14 / functional-tests G13.

## G13 — Cross-app dashboard refresh (MANDATORY after EVERY test run)
> Workspace-level dashboard at `{docs-repo}/test-data/dashboard.html` MUST refresh after every `npm test` / `mvn test` / `pytest` / `dotnet test` invocation. Setup wires this idempotently: every `test:coverage:full` / `test:ci` npm script (Step 3 / 3d / 4a / 4a-2 / 4a-3) AND every Maven/Gradle/Python/.NET execution script (Step 5) MUST use the exit-code-preserving chaining pattern: `sh -c '<test-cmd> && ec=0 || ec=$?; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'`. This ensures: (a) the dashboard always refreshes even on test failure, and (b) the test command's exit code propagates to CI/npm callers so failures are not masked. For Node-script repos, ALSO add `"posttest": "node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js"` to `package.json scripts` so plain `npm test` also refreshes. `{RELATIVE_PATH_TO_DOCS_REPO}` = walk up from `{repo}/` to `*-docs*/test-data/scripts/generate-workspace-dashboard.js`. If missing, STOP and instruct user to run `/tdgs-aidlc-setup-testdata` first. (Canonical owner: `/tdgs-aidlc-setup-api-tests` line 1582; mirrors functional-tests Step 4 line 302.)

---

## Constraints (HARD FAILURE on violation)

- **Unit tests MUST NOT read, reference, import, or depend on `test-data/test-data-catalog.yaml`, `test-data/ledger.yaml`, or any identity pool / business constants from the workspace test-data directory.** All external dependencies (DB, network, filesystem, clock, identity, auth, env) MUST be mocked or faked inline using the framework's mocking primitives (`@MockBean`, `@Mock`, `jest.mock`, `pytest.fixture`, `Moq`). The test-data catalog is exclusively for **API tests** (`/tdgs-aidlc-setup-api-tests`, `/tdgs-aidlc-generate-api-tests`) and **functional tests** (`/tdgs-aidlc-setup-functional-tests`, `/tdgs-aidlc-generate-functional-tests`). Bringing it into a unit test couples the test to network/disk and breaks hermeticity — violation is a HARD FAILURE in code review.
- **Do NOT modify production source code.** Only modify test infrastructure files (`pom.xml` build section, `package.json` devDeps/scripts/jest config, test utility files).
- **Preserve existing tests.** Do NOT delete, rename, or replace existing test files. Only add missing dependencies and configurations.
- **Unit tests stay in standard locations per stack:**
  - Java: `{repo}/src/test/java/`
  - JS/TS: `{repo}/src/__tests__/{mirror-path}/` — mirrors `src/` directory structure for easy tracking and selective commits
  - Python: `{repo}/tests/`
- **Coverage target must be applied to the correct tool** for each stack (JaCoCo, Jest, pytest-cov, etc.).
- **Do NOT add test dependencies that conflict** with existing dependency versions. Check existing versions first.
