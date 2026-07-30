# Setup Unit Tests — Execution & Verification

Steps 5-7 (execution scripts, verification, documentation) + Phase-6 augmentations.

---

## Step 5. Add Execution Scripts Per Repo

Add or update scripts/commands for each repo. **Per G13, every script MUST use the exit-code-preserving chaining pattern:** `sh -c '<test-cmd> && ec=0 || ec=$?; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'`.

- **Java (Maven):** `sh -c 'mvn clean test jacoco:report -Dmaven.test.failure.ignore=true && ec=0 || ec=$?; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'`
- **Java (Gradle):** `sh -c './gradlew test jacocoTestReport && ec=0 || ec=$?; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'`
- **React/JS/TS:** dashboard suffix already wired into `test:coverage:full` (Step 3 / 3d) — verify present; ALSO add `"posttest": "node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js"` so plain `npm test` refreshes.
- **Python:** wrap in a Make target / shell alias `sh -c 'pytest && ec=0 || ec=$?; python scripts/generate_report.py; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'`.
- **.NET:** `sh -c 'dotnet test --collect:"XPlat Code Coverage" --settings coverlet.runsettings && ec=0 || ec=$?; node scripts/generate-report.js; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'`.

**General:** Ensure each repo can run tests independently with a single command. Idempotent merge — do NOT overwrite existing scripts; if dashboard suffix is missing, append it. If `{RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js` does not exist, STOP and instruct user to run `/tdgs-aidlc-setup-testdata` first.

---

## Step 6. Verify Framework Per Repo

For each repo, run the verification command appropriate to the detected build system:
- **Java (Maven):** `cd {repo} && mvn clean test` — verify tests compile and JaCoCo report generates
- **Java (Gradle):** `cd {repo} && ./gradlew test jacocoTestReport` — verify tests compile and JaCoCo report generates
- **React/JS (Jest):** `cd {repo} && npm test -- --watchAll=false` — verify Jest runs (always invoke through `npm test --`, never `react-scripts test` directly)
- **React/JS (Vitest):** `cd {repo} && npm test` — verify Vitest runs (the `test` script already maps to `vitest run`; do NOT pass `--watchAll`, that flag is Jest-only)
- **Angular (Karma):** `cd {repo} && ng test --watch=false --browsers=ChromeHeadless` — verify Karma discovers specs
- **Angular (Jest):** `cd {repo} && npm test -- --watchAll=false` — verify Jest runs with Angular preset
- **Vue (Vitest):** `cd {repo} && npm test` — verify Vitest runs with Vue plugin
- **Vue (Jest):** `cd {repo} && npm test -- --watchAll=false` — verify Jest runs with vue-jest transform
- **Lambda (Node.js):** `cd {repo} && npx jest --listTests` — verify Jest discovers handler tests
- **Lambda (Python):** `cd {repo} && pytest --co` — verify pytest collects Lambda handler tests
- **Python:** `cd {repo} && pytest --co` — verify test collection works
- **.NET:** `cd {repo} && dotnet test --no-build --list-tests` — verify the test runner discovers tests

Report verification status per repo:
```
══════════════════════════════════════════════════════════════
FRAMEWORK VERIFICATION
══════════════════════════════════════════════════════════════

  Repo                   Status    Tests Found    Coverage Config
  ─────────────────────  ────────  ─────────────  ──────────────
  {repo-1}/             ✅ Ready   {N} tests      JaCoCo @ {target}%
  {repo-2}/             ✅ Ready   {N} tests      JaCoCo @ {target}%
  {repo-3}/             ✅ Ready   {N} tests      Jest @ {target}%

══════════════════════════════════════════════════════════════
```

---

## Step 7. Document Per Repo

Update each repo's test documentation (e.g., `TESTING.md` or `README.md` testing section):
- How to run unit tests
- How to view coverage reports
- Coverage target and enforcement
- How to add new tests
- Mock patterns and test utilities available

---

## Phase-6 Augmentations — Report Spec

### A6-1 — `scripts/generate-report.js` per repo

The scaffolded per-repo `scripts/generate-report.js` MUST produce `test-results/test-report.md` with the following sections (idempotent, deterministic):

1. **Header** — Repo name, stack detected, coverage tool, report timestamp.
2. **Summary tiles** — `Tests: T | Passed: P | Failed: F | Disabled: D | Pass rate: P% (G11 formula)`.
3. **Coverage** — `Lines: L% | Branches: B% | Methods: M% | Threshold: T% | Verdict: PASS/FAIL`.
4. **Failing tests** (omit when zero) — table of `Test name | File | Error (first line, 150 chars)`.
5. **Coverage gaps** — top-10 source files by uncovered lines, with line counts and links.
6. **Run command** — the exact command that produced this report.

The report MUST read its data from the stack's native coverage report file (e.g. `target/site/jacoco/jacoco.xml` for JaCoCo, `coverage/coverage-summary.json` for Jest, `coverage.xml` for pytest-cov). NEVER hardcode counts.

---

## Execution Context

This prompt sets up the framework only. After this completes, use `/tdgs-aidlc-generate-unit-tests` to generate comprehensive unit tests targeting the configured coverage threshold.
