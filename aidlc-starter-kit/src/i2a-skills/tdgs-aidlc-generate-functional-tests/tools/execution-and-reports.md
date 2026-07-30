# Execution & Reports (Sections 6–7)

## 6. Execute Tests and Generate Reports

Run full suite with auto report:
```bash
cd {ui-repo} && npx playwright test ; node functional-tests/scripts/generate-report.js
```
Use `;` (not `&&`) so report regenerates even when tests fail. Or via npm script (which MUST also use `;`):
```bash
cd {ui-repo} && npm run test:e2e:full
```

> ⚠️ ALWAYS chain `generate-report.js` after `npx playwright test`. HTML report at `html-report/index.html` regens by Playwright; the Markdown summary is the only thing that goes stale.

- Dev server not running + `webServer` configured → Playwright auto-starts. Else instruct user.
- Capture all output (failures/screenshots/traces). `generate-report.js` runs auto.
- Failures: test defect (selector/timing) → fix test. App defect → document, do NOT modify production. Re-run with full chained command.

**Output:**
```
══════════════════════════════════════════════════════════════
FUNCTIONAL TEST EXECUTION RESULTS
══════════════════════════════════════════════════════════════
Total: {N}  Passed: {N} ✅  Failed: {N} ❌  Skipped: {N} ⚠️  Duration: {time}
Per-run: HTML html-report/index.html | JSON results.json | Markdown test-report.md
Cross-run trend: {docs-repo}/test-data/dashboard.html (refreshed by /tdgs-aidlc-setup-testdata)
══════════════════════════════════════════════════════════════
```

## 7. Generate the Per-Run Markdown Summary (Auto-Chained — No Manual Step)

> ⚠️ Canonical per-run report IS Playwright's built-in HTML at `test-results/html-report/index.html` (per-test steps, embedded failure screenshot/video, trace.zip viewer, request/response, search/filter). **Do NOT scaffold a custom HTML dashboard** — single largest source of report drift in this codebase's history.

ONLY custom per-run artifact: short Markdown summary (`test-report.md`) for PR descriptions, CI logs, chat/email. Cross-run trend (`{docs-repo}/test-data/dashboard.html`) owned by `/tdgs-aidlc-setup-testdata` — NOT generated here.

### Markdown Summary Generation Script

Create (or overwrite) `{ui-repo}/functional-tests/scripts/generate-report.js` that:

1. **Reads `test-results/results.json`** as single source of truth (Playwright JSON reporter — counts/durations/failures/attachments).
2. **Reads `test-results/data-ledger.json`** as secondary (executionMode, capturedValues[], dbRecordsCreated[], identityPoolUsage). Tolerate missing/stale — degrade to `{}`, render MOCK badge.
3. **Asserts** `stats.expected + stats.unexpected + stats.flaky + stats.skipped === stats.total`. Mismatch → prepend `⚠️ Stats invariant mismatch` banner.
4. **Writes** `test-results/test-report.md` per format below — runtime-computed, never hardcoded.
5. **Path resolution via `path.resolve(__dirname, '..')`** — never `process.cwd()`.
6. **Standalone:** `node functional-tests/scripts/generate-report.js`.
7. **Degrades gracefully** — missing `results.json` → exit 0 with stub `# Functional Test Report\n\n_No results.json found._`

### Markdown Summary Format (MANDATORY — Same for Every App)

```markdown
# {Project Name} — Functional Test Report

**Date:** {timestamp} | **Browser:** {browser} | **Framework:** Playwright {version} | **Mode:** {🟢 REAL | 🟡 MOCK}

> 📊 **Full interactive report (recommended):** [`html-report/index.html`](./html-report/index.html) — per-test steps, screenshot, video, trace viewer, request/response.

> **Mode badge rule (MANDATORY):** read `data-ledger.json.executionMode`. If `"real"` → render `🟢 REAL` and include the **Real-Mode Artifacts** section below. If `"mock"` (or ledger missing) → render `🟡 MOCK` and OMIT the Real-Mode Artifacts section. The badge tells the reader at a glance whether downstream DB rows / payment tokens / receipts were actually written.

## Summary
| Metric | Value |
|--------|-------|
| Total      | {n}   |
| Passed     | {n} ✅|
| Failed     | {n} ❌|
| Skipped    | {n} ⚠️|
| Pass Rate  | {n}%  |
| Duration   | {n}s  |

> **passRate LOCKED FORMULA (G11):** `passed / (passed + failed + dataIssue + infra)`. Skipped EXCLUDED from denominator. `0.0` when denominator is 0 — NEVER divide by zero. This formula MUST be identical across ALL prompts (setup-testdata, setup-api-tests, generate-api-tests, run-tests, and this one).

> **Playwright stats → ledger field mapping:** `results.json` produced by `generate-report.js` maps Playwright's native outcome strings to ledger counters: `passed` → `passed`, `failed` → `failed`, `skipped` / `fixme` → `skipped`, `timedOut` → `infra`, `interrupted` → `infra`. Tests that hit the catalog placeholder guard or unresolved-token guard → `dataIssue`. The report script MUST assert `passed + failed + skipped + dataIssue + infra == total` before writing.

## Real-Mode Artifacts (omitted when mode = MOCK)
> Proof of real backend transactions written to downstream services during this run. Sourced from `data-ledger.json.dbRecordsCreated[]` (legacy-tool-parity surface). When this section is empty in real mode, NO real downstream rows were created — investigate the failed tests below. **Artifact-key column values are workspace-specific; the keys shown below are placeholders — the actual keys are whatever the discovered DTOs return.**

| Test | Artifact Key | Value | Endpoint | Timestamp |
|------|--------------|-------|----------|-----------|
| {testId} | <discoveredKey-1> | <captured-value> | <METHOD endpoint-path> | {iso} |
| {testId} | <discoveredKey-2> | <captured-value> | <METHOD endpoint-path> | {iso} |
| {testId} | <discoveredKey-3> | <captured-value> | <METHOD endpoint-path> | {iso} |
| {testId} | <discoveredKey-4> | <captured-value> | <METHOD endpoint-path> | {iso} |

## Failed Tests (omitted if zero failures)
> Each failed test row MUST include direct links to its trace, video, and screenshot — these are the three artifacts Playwright writes via `retain-on-failure` (configured in `playwright.config.js`). Resolve attachment paths from `results.json` per-test `attachments[]` (look for `name === 'trace'`, `name === 'video'`, `name === 'screenshot'`); paths are absolute on disk — convert to repo-relative for the Markdown link target. If an artifact is missing for a given test, render `—` in that cell (do NOT emit a broken link).

| Test | Spec File | Error (first line) | Trace | Video | Screenshot |
|------|-----------|--------------------|-------|-------|------------|
| {test title} | {relative spec path}:{line} | {error.message first line, truncated 120ch} | [trace](./artifacts/.../trace.zip) | [video](./artifacts/.../video.webm) | [screenshot](./artifacts/.../test-failed-1.png) |

## Skipped Tests — Cross-Service Blocked (omitted if zero)
> Sourced from `data-ledger.json.skippedCrossService[]` (G9b structured SKIPs). These are NOT failures — they are test paths blocked because upstream-service data was not available in the catalog at run time. The `resolution` column tells the reader exactly which prompt to run to unblock.

| Test | From Service | To Service | Business Rule | Required Input | Resolution |
|------|--------------|------------|---------------|----------------|------------|
| {testId} | {fromService} | {toService} | {rule} | {input} | {resolution} |

---
_Generated from `results.json` + `data-ledger.json` — {timestamp}. Open the HTML report above for full debugging context._
```

That is the entire spec. No HTML dashboard. No 10-section layout. No screen→API matrix duplication (already in spec's `setupDefaultApiMocks` + trace). No per-field source breakdown duplication (workspace `dashboard.html`'s job).

### Report Generation Workflow

```
A: Playwright runs → emits html-report/, results.json
B: node functional-tests/scripts/generate-report.js → emits test-report.md
C: /tdgs-aidlc-setup-testdata refreshes {docs-repo}/test-data/dashboard.html (cross-run trend)
```

> ⚠️ Always chain with `;` not `&&`: `npx playwright test; node functional-tests/scripts/generate-report.js`. With `&&` failed test skips report — stale on-disk artifacts.
