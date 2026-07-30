# Execution, Coverage Enforcement, and Reports

## Coverage Enforcement (Step 4)

After all modules are processed, verify overall coverage meets `{coverage_target}%`:

> ⚠️ **Coverage threshold drift detection (MANDATORY — run BEFORE the per-stack commands below).** The `coverage_target` parameter passed to this prompt MUST match the threshold already configured in the project's build files (set by `/tdgs-aidlc-setup-unit-tests`). Drift between the two produces silent under-enforcement (CI passes at a lower bar than the user requested) or surprise failures.
>
> Detect the configured threshold per stack:
> - **Java (Maven + JaCoCo):** read `pom.xml` → `<rule>/<limits>/<limit>/<minimum>` under the `jacoco-maven-plugin` `check` execution. Both LINE and BRANCH counters are enforced — read the LINE counter's `<minimum>` as the canonical threshold. Convert to a percent (e.g., `0.80` → `80`).
> - **React/JS / Node.js (Jest):** read `package.json` → `jest.coverageThreshold.global.lines` (or the equivalent `branches`/`functions`/`statements` keys), OR `jest.config.{js,ts,cjs,mjs}` if present.
> - **React/JS / Node.js (Vitest) (R11-UT-4):** read `vitest.config.{ts,js,mjs,cjs}` → `test.coverage.thresholds.lines` (or the equivalent `branches`/`functions`/`statements` keys). If `coverage.json` has `"runner": "vitest"`, this branch takes priority over the Jest branch even if both configs exist.
> - **Python (pytest):** read `pyproject.toml` → `[tool.coverage.report] fail_under`, OR `setup.cfg`/`pytest.ini` → `fail_under`, OR `.coveragerc` → `[report] fail_under`.
> - **C# / .NET:** read `*.csproj` → `<Threshold>` element or `coverlet.runsettings` → `<Threshold>` value.
>
> If the configured threshold ≠ runtime `coverage_target`:
> 1. **Default behavior — REFUSE with a clear message:** `"Coverage target {X}% does not match the threshold configured in {file} ({Y}%). Re-run /tdgs-aidlc-setup-unit-tests with the new target to update the build configuration, or omit the coverage_target parameter to use the existing threshold ({Y}%)."`
> 2. **Opt-in patch mode:** if the user explicitly requests `patch_threshold=true` (or confirms when prompted), update the configured threshold in-place using the same edit pattern that `/tdgs-aidlc-setup-unit-tests` uses, then proceed. Never patch silently.
>
> If no threshold is configured (the build files have no coverage rule), proceed with the runtime `coverage_target` and emit a soft warning: `⚠️ No coverage threshold configured in {file}; enforcement is local to this run only. Re-run /tdgs-aidlc-setup-unit-tests to persist the threshold.`

## Execution Commands Per Stack

**Java (Maven):**
```bash
cd {repo} && mvn clean test jacoco:report -Dmaven.test.failure.ignore=true && ec=0 || ec=$?; (mvn surefire-report:report-only 2>&1 || echo "⚠️ surefire-report skipped — non-blocking"); node scripts/generate-report.js; exit $ec
# Coverage: target/site/jacoco/index.html ; Test results: target/surefire-reports/*.xml → target/site/surefire-report.html (if generated) + test-results/test-summary.html
```
> **D1 rule (applies to ALL stacks below):** use the exit-code-preserving pattern (`cmd && ec=0 || ec=$?; <reports>; exit $ec`) between the test command and the report scripts — a test failure (or coverage-verification failure) MUST still produce the report so the dashboard can show WHY it failed, BUT the overall exit code MUST reflect the test result so CI/callers see the failure.

**Java (Gradle) (R10-D2):**
```bash
cd {repo} && ./gradlew clean test jacocoTestReport jacocoTestCoverageVerification && ec=0 || ec=$?; node scripts/generate-report.js; exit $ec
# Coverage: build/reports/jacoco/test/html/index.html (XML+CSV alongside) ; Test results: build/reports/tests/test/index.html + test-results/test-summary.html
```
> Gradle threshold detection (paired with the drift gate above): read `jacocoTestCoverageVerification > violationRules > rule > limit > minimum` from `build.gradle` / `build.gradle.kts`; convert to percent (`0.80` → `80`). Unconfigured → same soft-warning behavior as other stacks.

**React/JS** (cascading detection — use the first script that exists in `package.json`):
```bash
# Preferred (created by /tdgs-aidlc-setup-unit-tests — already exit-code-preserving internally):
cd {repo} && npm run test:coverage:full
# Fallback if test:coverage:full doesn't exist:
cd {repo} && npm run test:coverage && ec=0 || ec=$?; node scripts/generate-report.js; exit $ec
# Last resort if no coverage script exists:
cd {repo} && npm test -- --watchAll=false --coverage && ec=0 || ec=$?; node scripts/generate-report.js; exit $ec
# Coverage: coverage/lcov-report/index.html
```
> **NEVER call `react-scripts test` directly** — always go through `npm` so `env-cmd` / `cross-env` wrappers in the `test` script are inherited.

**React/JS (Vitest) (R11-UT-4):**
> Use this branch when `coverage.json` has `"runner": "vitest"`, or `vitest.config.{ts,js,mjs,cjs}` exists AND no `jest.config.*` is present. If both exist and `coverage.json` has no `runner` field, prompt the user.
```bash
# Preferred (created by /tdgs-aidlc-setup-unit-tests Step 3d — already exit-code-preserving internally):
cd {repo} && npm run test:coverage:full
# Fallback if test:coverage:full doesn't exist:
cd {repo} && npx vitest run --coverage && ec=0 || ec=$?; node scripts/generate-report.js; exit $ec
# Coverage: coverage/lcov-report/index.html (or coverage/ per @vitest/coverage-v8 config)
```
> Vitest threshold detection (paired with the drift gate above): read `vitest.config.{ts,js,mjs,cjs}` → `test.coverage.thresholds.lines` (or `.branches`/`.functions`/`.statements`); convert to integer percent. Unconfigured → same soft-warning behavior as other stacks.

**Python:**
```bash
cd {repo} && pytest --cov --cov-report=html --cov-report=xml --cov-fail-under={coverage_target} && ec=0 || ec=$?; python scripts/generate_report.py; exit $ec
# Coverage HTML: htmlcov/index.html ; coverage.xml at repo root (consumed by generate_report.py and the user-guide §9 source-of-truth contract).
```

**Node.js (backend / Lambda):**
```bash
cd {repo} && npm run test:coverage
# Or: npx jest --coverage --coverageThreshold='{"global":{"lines":{coverage_target}}}'
```

**C# / .NET:**
```bash
# Threshold is enforced via coverlet.runsettings (created by /tdgs-aidlc-setup-unit-tests Step 4b). The /p:Threshold MSBuild property is silently ignored by the XPlat Code Coverage data collector — do NOT use it.
cd {repo} && dotnet test --collect:"XPlat Code Coverage" --settings coverlet.runsettings --logger "trx" ; node scripts/generate-report.js
# Coverage (Cobertura): TestResults/{guid}/coverage.cobertura.xml ; TRX results: TestResults/*.trx
```

If overall coverage is below target after all modules:
1. Identify the top uncovered files/lines
2. Generate additional tests for those specific gaps
3. Re-run coverage to verify improvement

## Report Generation (Step 5)

> ⚠️ **CRITICAL: NEVER write static/hardcoded report files.** All custom reports (HTML dashboard + Markdown summary) MUST be generated programmatically by a script that reads the native test output (surefire XML, Jest JSON, pytest results). This is the #1 root cause of report inconsistency — manually authored HTML/MD files with hardcoded counts, pass rates, and durations that drift out of sync with actual test results.

> **Unit-test ledger schema policy.** Unlike API tests (`/tdgs-aidlc-generate-api-tests` produces a canonical `results.json` + `data-ledger.json`) and functional tests (which mirror it via Playwright `globalTeardown`), **unit tests deliberately do NOT produce a consolidated `results.json` schema.** Each stack's native output IS the source of truth: surefire XML for Java, Jest JSON for React/JS, pytest JSON for Python. The per-repo `generate-report.js` reads those native files directly to produce `test-summary.html` + `test-report.md`. Do NOT invent a custom JSON intermediate — it would duplicate the native data and risk drift. Cross-app aggregation for unit tests reads `test-report.md` summaries (or the native coverage CSV/JSON), NOT a synthetic ledger.

For each repo, generate:

1. **Native coverage report** — JaCoCo HTML (`target/site/jacoco/`), Jest lcov (`coverage/lcov-report/`), pytest HTML (`htmlcov/`) — auto-generated by test frameworks
2. **Native test results** — Surefire HTML (`target/site/surefire-report.html`), Jest console, pytest console — auto-generated by test frameworks
3. **Standalone HTML Dashboard** — `{repo}/test-results/test-summary.html` — **generated by script** (see below)
4. **Markdown Coverage Report** — `{repo}/test-results/test-report.md` — **generated by script** (see below)

### Report Generation Script (MANDATORY)

Create a **report generation script** per repo at a stack-appropriate location that:

| Stack | Script Location | Reads From |
|-------|----------------|------------|
| Java / Spring Boot (Maven) | `{repo}/scripts/generate-report.js` | `target/surefire-reports/*.xml` + `target/site/jacoco/jacoco.csv` |
| Java / Spring Boot (Gradle) | `{repo}/scripts/generate-report.js` | `build/test-results/test/*.xml` + `build/reports/jacoco/test/jacocoTestReport.csv` |
| React / JS (Jest or Vitest) | `{repo}/scripts/generate-report.js` | `coverage/coverage-summary.json` (both Jest `--coverage` and Vitest `--coverage` with the `json-summary` reporter emit this Istanbul shape). Test results: Jest stdout JUnit-equivalent OR Vitest `--reporter=json` output if enabled. |
| Python | `{repo}/scripts/generate_report.py` | `coverage.xml` (canonical — user guide §9 source of truth) + pytest JSON (`--json-report`) when available |
| C# / .NET | `{repo}/scripts/generate-report.js` | `TestResults/{guid}/coverage.cobertura.xml` + `TestResults/*.trx` |

The script MUST:
1. **Read** native test output files as the **single source of truth**
2. **Generate** both `test-results/test-summary.html` and `test-results/test-report.md` programmatically (create `test-results/` dir if it doesn't exist)
3. **Never hardcode** test counts, pass rates, coverage percentages, or any metric — ALL values MUST be computed from the native output at runtime
4. **Be runnable standalone:** `node scripts/generate-report.js` (or `python scripts/generate_report.py`)
5. **Produce identical layout** regardless of which repo it runs against — the format is standardized, only the data changes

### Auto-Chained Execution (MANDATORY)

Test execution and report generation MUST be chained so reports are always in sync:

**Java:**
```bash
cd {repo} && ( set -o pipefail; mvn clean test jacoco:report -Dmaven.test.failure.ignore=true; rc=$?; (mvn surefire-report:report-only 2>&1 || echo "⚠️ surefire-report skipped (non-blocking)"); node scripts/generate-report.js; exit $rc )
```

**React/JS:**
```bash
cd {repo} && ( npm run test:coverage; rc=$?; node scripts/generate-report.js; exit $rc )
```

**Python:**
```bash
cd {repo} && ( pytest --cov --cov-report=html; rc=$?; python scripts/generate_report.py; exit $rc )
```

> ⚠️ **NEVER run tests without chaining the report generation script.** If reports are not regenerated after every test run, they will be stale and out of sync with actual results.

### Standardized HTML Dashboard Format (MANDATORY — Same for Every App)

The `test-results/test-summary.html` MUST follow this exact standardized layout (non-negotiable; identical across repos, only data changes). Self-contained HTML with embedded CSS/JS, openable directly in any browser. ALL values extracted from native test output — NEVER hardcoded.

| # | Section | Required content |
|---|---------|-------------------|
| 1 | Header banner | Gradient banner with auto-detected repo name; subtitle "Unit Test Coverage — Automated Quality Dashboard"; metadata row (date/time, framework, coverage tool). |
| 2 | Coverage gauge & summary cards | Visual gauge color-coded (green ≥ target, yellow ≥ target−10%, red < target−10%); cards: Total Tests \| Passed \| Failed \| Skipped/Disabled \| Coverage % \| Target %. Skipped count = `@Disabled` (Java) / `test.skip` (JS) tests (G13 defect-revealing tests). |
| 3 | Coverage metrics table | Columns: Metric \| Target \| Actual \| Status \| Progress Bar; rows: Lines \| Branches \| Functions \| Statements; status badges ✅/⚠️/❌. |
| 4 | Module breakdown (expandable) | Columns: Module/Package \| Test Files \| Tests \| Coverage \| Status. Each row clickable; expanded sub-rows show test name \| pass/fail badge \| duration; toggle icon (▶/▼). |
| 5 | Uncovered areas (conditional) | Columns: File \| Uncovered Lines \| Coverage % \| Priority (High/Medium/Low). Omit entirely at 100%. |
| 5b | Failed test details (conditional) | One error card per failure: header (test name, class/file, module), failure context (method, inputs, expected vs actual), collapsible error panel (default expanded for first 3, collapsed after). Red border for assertion failures, orange for unexpected exceptions. Omit entirely at zero failures. |
| 6 | Test infrastructure info | Table: Framework \| Coverage Tool \| Target \| Node/Java/Python Version (auto-detected from project config). |
| 7 | Footer | "Generated from native test output" with timestamp; link to native coverage report (JaCoCo/LCOV/htmlcov). |

**CSS requirements:** clean modern design (flexbox/grid, soft shadows, rounded cards, monospace counts); responsive (desktop+tablet); ALL CSS inline/embedded (zero external deps); consistent professional palette (not random colors per generation); hover effects on cards/rows; print-friendly.

### Standardized Markdown Report Format (MANDATORY — Same for Every App)

The `test-report.md` MUST mirror the HTML dashboard data exactly. All values computed from native test output — never hardcoded.

Markdown coverage report template (`{repo}/test-results/test-report.md`):

```markdown
# Unit Test Coverage Report — {repo-name}

**Date:** {timestamp} | **Coverage Target:** {coverage_target}% | **Overall Coverage:** {actual}% | **Status:** {✅ PASS | ❌ BELOW TARGET}

## Summary
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Lines | {target}% | {actual}% | {status} |
| Branches | {target}% | {actual}% | {status} |
| Functions | {target}% | {actual}% | {status} |

## Test Execution
| Metric | Count |
|--------|-------|
| Total | {total} |
| Passed | {passed} |
| Failed | {failed} |
| Skipped (@Disabled) | {skipped} |

## Defects Found (from failing enabled tests)
| # | Test Name | Class | Defect Description |
|---|-----------|-------|-------------------|
| 1 | {test-name} | {class} | {defect description from failing assertion message} |

## Module Breakdown
| Module/Package | Files | Tests | Coverage | Status |
|----------------|-------|-------|----------|--------|
| {module-1} | {N} | {M} | {X}% | ✅ |

## Uncovered Areas
| File | Uncovered Lines | Reason |
|------|-----------------|--------|
| {file} | {lines} | {explanation} |
```

### Cross-Report Consistency Validation (MANDATORY)

After running the report generation script, verify consistency across all outputs:

| Check | HTML Dashboard | Native Coverage (JaCoCo/LCOV) | Markdown | Native Results (Surefire/Jest) |
|-------|---------------|-------------------------------|----------|-------------------------------|
| Total test count | ✅ must match | — | ✅ must match | ✅ must match |
| Passed count | ✅ must match | — | ✅ must match | ✅ must match |
| Failed count | ✅ must match | — | ✅ must match | ✅ must match |
| Skipped/Disabled count | ✅ must match | — | ✅ must match | ✅ must match |
| Line coverage % | ✅ must match | ✅ must match | ✅ must match | — |
| Branch coverage % | ✅ must match | ✅ must match | ✅ must match | — |
| Per-module coverage | ✅ must match | ✅ must match | ✅ must match | — |

> ⚠️ **If ANY discrepancy is found, re-run the report generation script — never manually edit report files.**

## Workspace-Level Summary (Step 6)

After all repos complete, generate a workspace summary.

> **CRITICAL — Do NOT create files at the workspace root** (it is not a git repo). Place workspace-level outputs in the docs repo discovered in Step 1 (the one containing `test-data/` or `knowledge-base/`):
> - `{docs-repo}/test-data/workspace-test-report.md`
> - `{docs-repo}/test-data/workspace-test-summary.html`
> - `{docs-repo}/test-data/scripts/generate-workspace-report.py` (if needed)

```
══════════════════════════════════════════════════════════════
UNIT TEST COVERAGE — ALL REPOS
══════════════════════════════════════════════════════════════

  Coverage Target: {coverage_target}%

  Repo                   Tests    Coverage    Status
  ─────────────────────  ───────  ──────────  ──────
  {repo-1}/             {N}      {X}%        ✅
  {repo-2}/             {N}      {X}%        ✅
  {repo-3}/             {N}      {X}%        ⚠️

  OVERALL: {total-tests} tests, {avg-coverage}% average coverage

══════════════════════════════════════════════════════════════
```
