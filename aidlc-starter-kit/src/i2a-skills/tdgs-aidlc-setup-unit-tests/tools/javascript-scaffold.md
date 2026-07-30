# Setup Unit Tests — JavaScript Scaffold

Step 3 (Jest), Step 3c (compat issues), and Step 3d (Vitest) for React/JS/TS repositories.

---

## Step 3. Scaffold/Enhance Per Repo — React / JS / TS (Jest)

> **R10-D3 — Stack-detection branch (MANDATORY first step):** the workspace detection table at Step 1 lists both `Jest` and `Vitest` as valid runners for JS/TS stacks. Step 3 below covers the Jest path; Vitest is covered by Step 3d. Choose the branch by inspecting `package.json`:
> - `devDependencies.vitest` present (or `vitest.config.{js,ts}` exists at repo root) → **use Step 3d (Vitest)**, skip Step 3.
> - `devDependencies.jest` present (or `jest.config.{js,ts,cjs,mjs}` exists, or `package.json` has a `jest` block) → **use Step 3 (Jest)**.
> - Both present → prefer the runner referenced by `package.json scripts.test`. If still ambiguous, prompt the user to pick one and persist the choice in `{repo}/test-results/coverage.json` as `{ "target": N, "runner": "jest"|"vitest" }` so subsequent runs are deterministic.
> - Neither present → install Jest by default (the broader-coverage choice for React/Node).

**Check existing test infrastructure:**
- Existing test files (`*.test.js`, `*.test.jsx`, `*.test.ts`, `*.test.tsx`) — check both adjacent-to-source and `__tests__/` locations
- `jest.config.js` or jest configuration in `package.json`
- Testing dependencies (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)

**Create `src/__tests__/` directory structure** mirroring `src/`:
```
{ui-repo}/src/__tests__/
├── components/
│   ├── ComponentA.test.js     ← mirrors src/components/ComponentA.js
│   └── ComponentB.test.js
├── hooks/
│   └── useCustomHook.test.js  ← mirrors src/hooks/useCustomHook.js
├── utils/
│   └── helpers.test.js        ← mirrors src/utils/helpers.js
├── pages/
│   └── HomePage.test.js       ← mirrors src/pages/HomePage.js
└── services/
    └── api.test.js            ← mirrors src/services/api.js
```

> **Why `__tests__/` instead of adjacent?** Having all unit tests in one directory tree (`src/__tests__/`) makes them easy to track, commit selectively, review in PRs, and exclude from production builds — compared to `*.test.js` files scattered throughout `src/`.

**Add missing dependencies to `package.json`** (DO NOT overwrite existing — version-aware):

> **CRITICAL: Auto-detect existing versions first.** Read the repo's `package.json` to check which testing libraries are ALREADY installed (in `dependencies` or `devDependencies`). Do NOT add a dependency that already exists. Only add what's missing, and match versions to the detected React and existing testing library versions.

| Dependency | React 16.x | React 17.x | React 18+ |
|---|---|---|---|
| `@testing-library/react` | `^9.x` or `^11.x` (keep existing) | `^12.x` | `^14.x` |
| `@testing-library/jest-dom` | `^4.x` or `^5.x` (keep existing) | `^5.x` | `^6.x` |
| `@testing-library/user-event` | `^7.x` (keep existing) or `^13.x` | `^13.x` | `^14.x` |
| `msw` | `^1.3.0` (v1 API) | `^1.3.0` (v1 API) | `^2.0.0` (v2 API) |

**Conditional dependency — `jest-environment-jsdom` (Jest 28+):**
> Since Jest 28, `jsdom` is no longer bundled. If the repo uses Jest ≥28 **directly** (i.e., `devDependencies.jest` major ≥28 AND the project does NOT use `react-scripts`), add `jest-environment-jsdom` to `devDependencies` and set `testEnvironment: 'jsdom'` in `jest.config.*` or `package.json jest` block. Without this, DOM-related tests (`render()`, `screen.*`, `document.querySelector()`) will fail with `ReferenceError: document is not defined`.
>
> Detection: read `package.json` → if `jest` major ≥28 AND NOT using `react-scripts` → add `jest-environment-jsdom` with version matching the Jest major (e.g., Jest 28 → `^28.0.0`, Jest 29 → `^29.0.0`). **If the project uses `react-scripts` (CRA), do NOT add this dependency** — CRA manages `testEnvironment` internally regardless of the bundled Jest version.

> **`jest-junit` is intentionally NOT in this default list.** It is an optional reporter plugin that emits a JUnit XML sidecar file (`junit.xml`) on top of Jest's normal output, useful only when a CI system (Jenkins, CircleCI, GitHub Actions test reporter, etc.) needs to parse JUnit XML for its UI. No CI pipeline in this workspace consumes JUnit XML today. **Add `jest-junit: ^16.0.0` and the `--reporters=jest-junit` flag only when a real CI consumer is wired up.** Jest itself (the test runner) and `--coverage` (which produces a rich interactive HTML report at `coverage/lcov-report/index.html`) are the canonical artifacts — no plugin needed.

**Rules:**
- If `@testing-library/react` is already at `^9.3.2`, do NOT upgrade it — the project may depend on v9 patterns (destructured queries from `render()`, no `screen` export)
- If `@testing-library/user-event` is already at `^7.1.2`, do NOT upgrade — the project uses the v7 synchronous API
- If `msw` is already installed at v1.x, do NOT upgrade to v2 — completely different API
- If none of these are installed, use the version matching the detected React major version
- **Always check `project-context.md`** in the workspace docs repo — if it specifies testing library versions, follow those exactly

**Configure coverage collection (informational only — NOT a build gate)** in `package.json`:

> **NOTE:** `coverageThreshold` is intentionally OMITTED. Per directive, build failure is driven by **test failures only** (Jest exits non-zero when a test fails). Coverage metrics are collected and reported but do NOT fail the build. DevOps owns deployment-gate decisions.

```json
"jest": {
  "clearMocks": true,
  "restoreMocks": true,
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.test.{js,jsx,ts,tsx}",
    "!src/**/index.{js,jsx,ts,tsx}",
    "!src/serviceWorker.*",
    "!src/reportWebVitals.*"
  ],
  "coverageReporters": ["text", "lcov", "clover", "json-summary"]
}
```

**Add npm scripts** (DO NOT overwrite existing):

> **CRITICAL: Detect `env-cmd` (or `cross-env`/`dotenv`) usage in the existing `test` script** and prepend the SAME wrapper to all new scripts — stripping it breaks env-var loading and tests fail. Use `<PREFIX>` below = `env-cmd environments/.env.test ` if present, else empty.

```json
"scripts": {
  "test:coverage":       "<PREFIX>react-scripts test --coverage --watchAll=false",
  "test:coverage:full":  "sh -c '<PREFIX>react-scripts test --coverage --watchAll=false && ec=0 || ec=$?; node scripts/generate-report.js; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'",
  "test:ci":             "<PREFIX>react-scripts test --coverage --watchAll=false --ci",
  "test:generate-report":"node scripts/generate-report.js",
  "posttest":            "node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js"
}
```

> **JUnit XML reporter intentionally omitted from `test:ci`.** When CI consumes JUnit XML, append ` --reporters=default --reporters=jest-junit` and add `jest-junit` to devDependencies. Until then, omit it.

> **`test:coverage:full`** is the primary command — it chains test execution + report generation so `test-results/test-summary.html` and `test-results/test-report.md` are always regenerated from actual test results. Use this instead of `test:coverage` alone.
>
> **CRITICAL: use exit-code-preserving chaining (NOT plain `;` or `&&`).** Reports MUST regenerate even when tests fail — `&&` short-circuits on failure and keeps stale reports; plain `;` regenerates reports but masks the test exit code. The `sh -c '...&& ec=0 || ec=$?;...;exit $ec'` pattern ensures both goals: reports always regenerate AND the npm script exits with the test command's actual exit code.

**General rule:** Mirror whatever prefix/wrapper the existing `test` script uses (`env-cmd`, `cross-env`, `dotenv`, etc.) — just append the additional flags.

> **POST-CREATION VERIFICATION (MANDATORY):** After adding scripts to `package.json`, re-read the file and verify that **every** new `test:*` script uses the same wrapper/prefix as the existing `test` script. Specifically: if the `test` script starts with `env-cmd environments/.env.test`, then `test:coverage`, `test:coverage:full`, `test:ci`, and any other new scripts MUST also start with that same prefix. If any script is missing the prefix, fix it immediately — tests WILL fail without the correct environment variables.

**Create `scripts/` directory with report generator stub:**
```
{repo}/scripts/
└── generate-report.js   ← Report generation script (reads native test output, writes test-results/test-summary.html + test-results/test-report.md)
```

Create a **working stub** so `test:coverage:full` doesn't crash before the full implementation is generated by `/tdgs-aidlc-generate-unit-tests`. The stub should:
1. Check if native test output exists (coverage JSON / surefire XML)
2. If found → write a minimal `test-results/test-summary.html` with a "Stub report — run /tdgs-aidlc-generate-unit-tests for the full dashboard" message
3. If not found → print a warning to console and exit 0 (never fail the chained command)

> The **full script implementation** (with standardized 7-section HTML dashboard) is created by `/tdgs-aidlc-generate-unit-tests`. This stub ensures `test:coverage:full` works immediately after setup.

**Create test utilities if not existing:**
- `src/test-utils/render-with-providers.js` — Custom render function wrapping components with required providers (Router, Redux, i18n, Theme, etc.)
- `src/test-utils/mock-api.js` — MSW (Mock Service Worker) handlers for API mocking — **use the MSW API matching the installed version** (v1.x: `rest.get()` / `setupServer()`; v2.x: `http.get()` / `setupServer()`)

---

## Step 3c. Known Compatibility Issues — React / JS / TS

**Check for `node-sass` in `package.json`:**
- `node-sass` (libsass) is deprecated and fails to compile on newer Node.js versions (v18+) and Apple Silicon (arm64)
- If detected, display a **warning** (do NOT auto-migrate — this is a production dependency change):
  ```
  ⚠️  node-sass detected in {repo}/package.json.
  
  node-sass is deprecated and may fail on Node 18+ / Apple Silicon.
  Consider migrating to 'sass' (Dart Sass): npm uninstall node-sass && npm install sass
  
  This is a production change — do NOT auto-migrate during test setup.
  If npm install or npm test fails with node-sass errors, the workaround is:
    1. Use Node 16 (nvm use 16), OR
    2. Migrate to sass: npm uninstall node-sass && npm install sass
  ```
- **Do NOT let node-sass failures block test framework setup.** If `npm install` fails due to node-sass, the test framework dependencies were still added to `package.json` — the user can resolve the node-sass issue separately.

---

## Step 3d. Scaffold/Enhance Per Repo — React / JS / TS (Vitest)

When stack-detection (Step 3 first paragraph) selects Vitest, scaffold using Vitest's native config + `@vitest/coverage-v8` (NOT Jest). Vitest is API-compatible with Jest's `expect` / `describe` / `it`, but its config file, coverage provider, and CLI are different — using Jest scaffolding against a Vitest repo silently no-ops `coverageThreshold` and disables enforcement.

**Add missing dependencies (`package.json devDependencies`):**
```jsonc
{
  "vitest": "^2.0.0",
  "@vitest/coverage-v8": "^2.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "@testing-library/user-event": "^14.0.0",
  "jsdom": "^25.0.0"
}
```

**Create `vitest.config.ts` (or `.js`) at repo root:**
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,                                  // enables describe/it/expect without imports (Jest-parity)
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',                               // v8 is faster + zero native deps; istanbul also OK
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines:      {coverage_target},              // integer percent — same compute rule as Jest
        statements: {coverage_target},
        functions:  {coverage_target},
        branches:   {coverage_target},
      },
      exclude: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*', '**/node_modules/**', '**/dist/**'],
    },
  },
});
```

**Update `package.json scripts`:**
```jsonc
{
  "test":               "vitest run",
  "test:watch":         "vitest",
  "test:coverage":      "vitest run --coverage",
  "test:coverage:full": "sh -c 'vitest run --coverage && ec=0 || ec=$?; node scripts/generate-report.js; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'"
}
```
> **CRITICAL: use exit-code-preserving chaining (NOT plain `;` or `&&`).** Reports MUST regenerate even when tests fail — `&&` short-circuits on failure and keeps stale reports; plain `;` regenerates reports but masks the test exit code. The `sh -c '...&& ec=0 || ec=$?;...;exit $ec'` pattern ensures both goals: reports always regenerate AND the npm script exits with the test command's actual exit code.

**Vitest report locations after `npm run test:coverage`:**
| Report | Path | Content |
|--------|------|---------|
| Coverage HTML | `coverage/index.html` | Line/branch/function/statement coverage |
| Coverage JSON-summary | `coverage/coverage-summary.json` | Machine-readable totals — `generate-report.js` consumes this (NOT lcov.info) |
| Test results | `coverage/tests/index.html` (when `--reporter=html` is added to the run) | Pass/fail per spec |

**generate-report.js stub MUST detect the runner:**
- Jest:   read `coverage/coverage-summary.json` (Jest emits this when `--coverage` is set)
- Vitest: read `coverage/coverage-summary.json` (same path — both emit the same Istanbul-summary schema, so the stub can branch on `package.json` `vitest` vs `jest` presence and use the same parser).

**Vitest threshold detection** (paired with `/tdgs-aidlc-generate-unit-tests` Section 4 drift gate): read `vitest.config.{ts,js,mjs,cjs}` → `test.coverage.thresholds.lines` (or `branches`/`functions`/`statements`). If the file uses `defineConfig`-wrapped object, walk the AST or eval the export to extract the value — do not regex-match (false positives on commented-out blocks).

**Why not just use Jest scaffolding for Vitest repos?** Vitest reads `vitest.config.*` (NOT `jest.config.*`), uses `test.coverage.thresholds.*` (NOT `coverageThreshold.global.*`), and ships its own coverage providers (`v8`/`istanbul`) instead of `jest --coverage`. A Jest-shaped `package.json` against a Vitest test runner produces "tests passed" with ZERO coverage enforcement — silent under-enforcement, exactly what `/tdgs-aidlc-generate-unit-tests` Section 4 drift gate exists to prevent.
