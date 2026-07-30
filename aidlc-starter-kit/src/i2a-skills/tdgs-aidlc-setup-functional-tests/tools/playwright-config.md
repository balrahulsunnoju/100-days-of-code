# Playwright Configuration

## Step 5 — Create Playwright Configuration

Create `{ui-repo}/playwright.config.js` with all of the following:

### Reporter Array (MANDATORY exact config)

```js
reporter: [
  ['html', {
    outputFolder: './functional-tests/test-results/html-report',
    open: 'never',          // CRITICAL: never auto-open browser; chain handles reports
  }],
  ['json',  { outputFile: './functional-tests/test-results/results.json' }],
  // ['junit', { outputFile: './functional-tests/test-results/results.xml' }],  // Uncomment if a CI pipeline starts consuming JUnit XML. Not enabled today — no consumer exists.
  ['list'],                  // human-readable console output during runs
],
```

> **No JUnit by default:** no CI consumer today. Stale sidecar diverges from `results.json`. Enable only when a real consumer is wired up.
>
> **Per-run report = Playwright HTML at `html-report/index.html`.** Provides per-test steps, failure screenshot/video, trace.zip viewer. The only custom artifacts: `test-report.md` (Markdown PR summary) and cross-run `dashboard.html` (owned by `/tdgs-aidlc-setup-testdata`).

> **Verification:** after writing config, grep for `open: 'never'` AND `outputFolder:`. Both required.

### webServer Block (CONDITIONAL on `TEST_BASE_URL`)

When `process.env.TEST_BASE_URL` is set (passed by `/tdgs-aidlc-run-tests` for `test`/`stage` envs OR for `local` real-mode runs against a remote host), the `webServer` block MUST be OMITTED ENTIRELY — we are pointing at a deployed app, not a local dev server. Otherwise (TEST_BASE_URL unset, i.e., local mock-mode runs against `http://localhost:3000`), include a `webServer` block whose `command` auto-detects from the UI repo's `package.json` `scripts.start` entry. Use the spread-conditional pattern:

```js
...(process.env.TEST_BASE_URL ? {} : {
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  }
}),
```

Without this conditional, remote-env real-mode runs launch an unnecessary local dev server in parallel with the remote target.

> **CRITICAL: `webServer.command` must use the EXACT start command from `package.json`.** Read `scripts.start` and use it verbatim. Many apps use `env-cmd` or `cross-env` wrappers (e.g., `env-cmd environments/.env.serve.local react-scripts start`). If you strip these, the dev server will fail to start due to missing environment variables. Using `npm start` is usually safest because it delegates to the full `scripts.start` with all wrappers intact.

> **node-sass warning:** If the UI repo's `package.json` lists `node-sass`, the dev server may fail to start on Node 18+ / Apple Silicon. If `npm start` fails during Playwright runs, check for node-sass errors.

### Timeout (MANDATORY — flat)

```js
timeout: 60_000,
```

Flat `timeout: 60_000` for both mock and real — MAX CAP, not default wait. Playwright resolves on first match and continues; cap only fires on hangs. Production APIs respond <30s worst-case; the 60s ceiling absorbs payment + receipt + email tail latency. Same flat value for `expect.timeout: 5_000`.

### Mode-Aware baseURL

If `process.env.TEST_BASE_URL` is set (passed by `/tdgs-aidlc-run-tests` for `test`/`stage` envs), use it as `use.baseURL`. Otherwise default to the local dev server URL detected from `package.json` (`http://localhost:3000` is the React default).

### Artifact Capture (CRITICAL)

```js
use: {
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',                       // NOT 'on-first-retry' — see below
  video: { mode: 'retain-on-failure', size: { width: 1280, height: 720 } },
},
retries: process.env.CI ? 2 : 0,
```

> ⚠️ **DO NOT use `trace: 'on-first-retry'`.** With `retries: 0` no retry → no trace ever captured. Use `trace: 'retain-on-failure'` — full trace (DOM snapshots, network, console, source) for every failed test. Trace viewer is canonical; video is supplementary.
>
> **If post-failure video shows only landing page**, root cause is one of: (1) gated-route deep-linking — Check 14a bans it; (2) wrong baseURL / dead dev server — `globalSetup` below catches it; (3) `setupDefaultApiMocks` missing in `beforeEach` — Check 8 enforces; (4) Playwright video buffer trims to ~30s rolling window. **Always debug via `npx playwright show-trace <trace.zip>` first.**

### globalSetup Health-Check (MANDATORY)

Add `globalSetup: './functional-tests/support/global-setup.js'`. The script MUST: resolve `process.env.TEST_BASE_URL || 'http://localhost:3000'`; HEAD-fetch with 10s timeout; on failure `throw new Error('❌ App not reachable at ${targetUrl} — start dev server or check TEST_BASE_URL.')` (Playwright aborts the entire run before any test starts); on success log `✓ App reachable at ${targetUrl}`.

### globalTeardown (MANDATORY)

`playwright.config.js` MUST have `globalTeardown: require.resolve('./functional-tests/support/global-teardown.js')` — path is **relative to the config file's directory** (`{ui-repo}/`), NOT to `functional-tests/`. Wrong path silently resolves to non-existent file, Playwright skips teardown without erroring, all catalog/ledger writes lost. Verify: `grep -q "functional-tests/support/global-teardown" {ui-repo}/playwright.config.js || echo "❌ globalTeardown misconfigured"`.

### Parallel Execution + Deterministic Replay

```js
fullyParallel: false,  // MANDATORY for deterministic replay
workers: process.env.CI ? 1 : (process.env.RUN_SEED ? 1 : undefined),
```

Same `RUN_SEED` + serial worker = identical pass/fail counts. Multi-worker parallelism races on the catalog round-robin index → seed determinism collapses.

### Browser Projects

Multiple browser projects:
- Chromium (default)
- Firefox
- WebKit
- Mobile Chrome

Plus i18n project if i18n is detected (scan for `i18next`, `react-i18next`, `ngx-translate`, etc.).

### Visual Regression Project (OPTIONAL but recommended)

```js
{
  name: 'visual',
  testMatch: /.*\.visual\.spec\.js/,
  use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
},
```

Visual specs live at `tests/e2e/visual/<screen>.visual.spec.js`; tag with `@visual` and exclude from PR runs (`--grep-invert @visual`). Update baselines with `--update-snapshots`. **Skip this project entirely if the team does not want visual regression.**

### Environment Switching

Via `environments.js` config imported into the playwright config.

### Sensible Timeouts

- `timeout: 60_000` — flat test cap (MAX, not default wait) for both modes
- `expect.timeout: 5_000`
- `actionTimeout: 10_000`
- `navigationTimeout: 15_000`

### Other Settings

- `testDir`: `'./functional-tests/tests'`
- `outputDir`: `'./functional-tests/test-results/artifacts'`
