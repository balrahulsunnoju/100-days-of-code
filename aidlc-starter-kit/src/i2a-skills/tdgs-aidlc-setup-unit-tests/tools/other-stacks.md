# Setup Unit Tests — Other Stacks

Step 4 (Python), Step 4a (Angular), Step 4a-2 (Vue), Step 4a-3 (AWS Lambda), Step 4b (.NET).

---

## Step 4. Scaffold/Enhance Per Repo — Python (pytest)

**Add missing test dependencies:**
```
pytest>=8.0.0
pytest-cov>=5.0.0
pytest-mock>=3.14.0
```

**Add conditional dependencies** (only when the repo uses the corresponding feature):
```
# ADD if any source file uses async def in route handlers / service layer (FastAPI, aiohttp, async Django)
pytest-asyncio>=0.23.0

# ADD if FastAPI is in requirements — its TestClient uses httpx under the hood
httpx>=0.27.0
```

> **Detection rules:** Grep `src/` (or the main package directory) for `async def` in files that import FastAPI/aiohttp/Django async views → add `pytest-asyncio`. Grep `requirements.txt`/`pyproject.toml` for `fastapi` → add `httpx` (FastAPI's `TestClient` requires it). Do NOT add either blindly.

**Configure coverage** — choose ONE file based on what the repo already uses. The two snippets are NOT interchangeable; the section header (`[tool.pytest.ini_options]` vs `[pytest]`) differs.

If the repo has `pyproject.toml` (preferred for new projects):
```toml
[tool.pytest.ini_options]
addopts = "--cov --cov-report=html --cov-report=xml --cov-report=term --cov-fail-under={coverage_target}"
```

If the repo has only `pytest.ini`:
```ini
[pytest]
addopts = --cov --cov-report=html --cov-report=xml --cov-report=term --cov-fail-under={coverage_target}
```

> Always emit `--cov-report=xml` so the framework's `generate_report.py` script and downstream dashboard can read `coverage.xml` (the user guide §9 source-of-truth for Python unit tests). HTML alone is human-only.

**Create `scripts/generate_report.py` stub (MANDATORY):**

The `generate-unit-tests` prompt chains `python scripts/generate_report.py` after `pytest`. If the script doesn't exist, the chain fails. Create a **working stub** at `{repo}/scripts/generate_report.py` so the chain is safe immediately after setup. The stub should:
1. Look for `coverage.xml` and `htmlcov/` in the repo root
2. If found → write a minimal `test-results/test-summary.html` with a "Stub report — run /tdgs-aidlc-generate-unit-tests for the full dashboard" message and basic coverage % parsed from `coverage.xml`
3. If not found → print a warning to console and `sys.exit(0)` (never fail the chained command)
4. Always create the `test-results/` directory if missing

> The **full script implementation** (with standardized 7-section HTML dashboard) is created by `/tdgs-aidlc-generate-unit-tests`. This stub only ensures the chain doesn't crash between setup and full generation.

---

## Step 4a. Scaffold/Enhance Per Repo — Angular (Karma + Jasmine OR Jest)

When `package.json` has `@angular/core` in dependencies, scaffold the Angular test infrastructure.

**Detect existing test runner:**
- If `karma.conf.js` / `karma.conf.ts` exists → **Karma + Jasmine** (Angular CLI default)
- If `jest.config.*` exists AND `@angular-builders/jest` in devDeps → **Jest** (community migration)
- If neither → scaffold Karma + Jasmine (the Angular CLI default)

**Karma + Jasmine path (default):**

Angular CLI (`ng new`) pre-configures Karma + Jasmine. Typically the scaffolding already exists. Verify and add missing pieces:

```bash
# Verify these exist — Angular CLI creates them on `ng new`:
# - karma.conf.js
# - src/test.ts (test entry point)
# - tsconfig.spec.json
```

**Add missing devDependencies** (only if not already present):
```json
{
  "karma": "^6.4.0",
  "karma-chrome-launcher": "^3.2.0",
  "karma-coverage": "^2.2.0",
  "karma-jasmine": "^5.1.0",
  "karma-jasmine-html-reporter": "^2.1.0",
  "@types/jasmine": "^5.1.0",
  "jasmine-core": "^5.1.0"
}
```

**Configure coverage in `karma.conf.js`** (add `coverageReporter` block if missing):
```js
coverageReporter: {
  dir: require('path').join(__dirname, './coverage'),
  subdir: '.',
  reporters: [
    { type: 'html' },
    { type: 'text-summary' },
    { type: 'lcovonly' },
    { type: 'json-summary' }    // generate-report.js reads this
  ],
  check: {
    global: {
      statements: {coverage_target},
      branches: {coverage_target},
      functions: {coverage_target},
      lines: {coverage_target}
    }
  }
}
```

**Add npm scripts** (DO NOT overwrite existing):
```json
"scripts": {
  "test": "ng test --watch=false",
  "test:coverage": "ng test --watch=false --code-coverage",
  "test:coverage:full": "sh -c 'ng test --watch=false --code-coverage && ec=0 || ec=$?; node scripts/generate-report.js; node {RELATIVE_PATH_TO_DOCS_REPO}/test-data/scripts/generate-workspace-dashboard.js; exit $ec'",
  "test:ci": "ng test --watch=false --code-coverage --browsers=ChromeHeadless"
}
```

**Angular Jest path** (when `@angular-builders/jest` is detected):
Follow the same pattern as Step 3 (Jest) but with Angular-specific config. The `jest.config.ts` MUST include `preset: 'jest-preset-angular'` and `setupFilesAfterFramework: ['jest-preset-angular/setup-jest']`.

**Angular coverage report locations:**
| Report | Path | Content |
|--------|------|---------|
| Coverage HTML | `coverage/index.html` | Line/branch/function/statement coverage |
| Coverage JSON-summary | `coverage/coverage-summary.json` | Machine-readable (same Istanbul schema as Jest) |
| Test Results | Karma console + `coverage/` HTML | Pass/fail per spec |

**Create `scripts/generate-report.js` stub** following the same contract as React/JS.

---

## Step 4a-2. Scaffold/Enhance Per Repo — Vue (Vitest OR Jest)

When `package.json` has `vue` in dependencies, scaffold the Vue test infrastructure.

**Detect existing test runner:**
- If `vitest.config.*` exists OR `@vue/test-utils` + `vitest` in devDeps → **Vitest** (Vue 3 default via `create-vue`)
- If `jest.config.*` exists OR `@vue/cli-plugin-unit-jest` in devDeps → **Jest** (Vue CLI legacy)
- If neither → scaffold Vitest for Vue 3, Jest for Vue 2

**Vitest path (Vue 3 default):**

Follow Step 3d (Vitest) with Vue-specific additions:
```json
{
  "@vue/test-utils": "^2.4.0",
  "vitest": "^2.0.0",
  "@vitest/coverage-v8": "^2.0.0",
  "jsdom": "^25.0.0"
}
```

`vitest.config.ts` MUST include:
```ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    // ... same coverage config as Step 3d
  },
});
```

**Jest path (Vue 2 / Vue CLI):**

Follow Step 3 (Jest) with Vue-specific additions:
```json
{
  "@vue/test-utils": "^1.3.0",
  "@vue/vue2-jest": "^29.0.0",
  "vue-jest": "^3.0.0"
}
```

**Add npm scripts** — same pattern as Step 3/3d (use exit-code-preserving chaining).

**Create `scripts/generate-report.js` stub** following the same contract as React/JS.

---

## Step 4a-3. Scaffold/Enhance Per Repo — AWS Lambda (Node.js / Python)

When the repo contains `template.yaml` / `serverless.yml` / `sam.yaml` with Lambda function definitions, scaffold Lambda-specific test infrastructure.

**Detect Lambda runtime:**
- If `template.yaml` → read `Runtime` property (e.g., `nodejs20.x`, `python3.12`)
- If `serverless.yml` → read `provider.runtime`
- If `package.json` exists alongside → Node.js Lambda
- If `requirements.txt` / `pyproject.toml` exists alongside → Python Lambda

**Node.js Lambda — add devDependencies:**
```json
{
  "jest": "^29.7.0",
  "@aws-sdk/client-mock": "^4.0.0",
  "aws-sdk-client-mock-jest": "^4.0.0"
}
```

> `@aws-sdk/client-mock` provides type-safe mocking of AWS SDK v3 clients (`DynamoDBClient`, `S3Client`, `SQSClient`, etc.) without hitting real AWS services. It is the AWS-recommended testing approach for SDK v3.

**Configure Jest for Lambda** (`jest.config.js`):
```js
module.exports = {
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: {coverage_target},
      functions: {coverage_target},
      lines: {coverage_target},
      statements: {coverage_target}
    }
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!node_modules/**'
  ]
};
```

**Python Lambda — add test dependencies:**
```
pytest>=8.0.0
pytest-cov>=5.0.0
pytest-mock>=3.14.0
moto>=5.0.0
```

> `moto` provides in-memory mocking of ALL AWS services (DynamoDB, S3, SQS, SNS, etc.) — the Python equivalent of `@aws-sdk/client-mock`. It intercepts boto3 calls and returns realistic responses without hitting real AWS.

**Add npm/pytest scripts** — same pattern as Node.js/Python sections above.

**Lambda test directory structure:**
```
{lambda-repo}/
├── src/
│   └── handlers/
│       ├── handler-a.{js,ts,py}
│       └── handler-b.{js,ts,py}
├── tests/                          # Python
│   └── unit/
│       ├── test_handler_a.py
│       └── test_handler_b.py
├── src/__tests__/                  # Node.js (same mirror structure)
│   └── handlers/
│       ├── handler-a.test.ts
│       └── handler-b.test.ts
└── events/                         # Sample event JSONs for local testing
    ├── api-gateway-event.json
    └── sqs-event.json
```

**Create sample event fixtures** (if `events/` directory doesn't exist) — stub JSON files representing common Lambda trigger events (API Gateway proxy, SQS, S3, DynamoDB Stream). These are NOT test-data-catalog entries — they are infrastructure fixtures representing the AWS event shape.

**Create `scripts/generate-report.js` (Node.js) or `scripts/generate_report.py` (Python) stub** following the same contract as other stacks.

---

## Step 4b. Scaffold/Enhance Per Repo — C# / .NET (xUnit OR NUnit + Coverlet)

When the repo contains `*.csproj`, scaffold the .NET test-project pattern. .NET test projects are SEPARATE projects (not a `test/` folder inside the production project) — typically named `{Project}.Tests.csproj`.

**Detect the existing test framework** by reading every `*.csproj` for one of:
- `<PackageReference Include="xunit" />` → xUnit
- `<PackageReference Include="NUnit" />` → NUnit
- Neither → default to xUnit

**Add missing packages to the test `*.csproj`** (idempotent; do NOT downgrade pinned versions):
```xml
<ItemGroup>
  <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.10.0" />
  <!-- xUnit path -->
  <PackageReference Include="xunit" Version="2.9.0" />
  <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
  <!-- OR NUnit path -->
  <!-- <PackageReference Include="NUnit" Version="4.1.0" /> -->
  <!-- <PackageReference Include="NUnit3TestAdapter" Version="4.5.0" /> -->
  <PackageReference Include="Moq" Version="4.20.70" />
  <PackageReference Include="coverlet.collector" Version="6.0.2" />
</ItemGroup>
```

**Create `coverlet.runsettings` in the test project root** to enforce the threshold (Coverlet's `/p:Threshold=` MSBuild property is silently ignored for the `--collect:"XPlat Code Coverage"` data collector path):
```xml
<?xml version="1.0" encoding="utf-8"?>
<RunSettings>
  <DataCollectionRunSettings>
    <DataCollectors>
      <DataCollector friendlyName="XPlat code coverage">
        <Configuration>
          <Format>cobertura,opencover</Format>
          <Threshold>{coverage_target}</Threshold>
          <ThresholdType>line,branch,method</ThresholdType>
          <ThresholdStat>total</ThresholdStat>
          <Exclude>[xunit.*]*,[*.Tests]*</Exclude>
        </Configuration>
      </DataCollector>
    </DataCollectors>
  </DataCollectionRunSettings>
</RunSettings>
```

**.NET HTML report locations after `dotnet test --collect:"XPlat Code Coverage" --settings coverlet.runsettings`:**
| Report | Path | Content |
|--------|------|---------|
| Coverage (Cobertura XML) | `TestResults/{guid}/coverage.cobertura.xml` | Machine-readable totals — `generate-report.js` consumes this |
| Coverage (HTML, optional) | `TestResults/coverage/index.html` | Generated by `reportgenerator` (`dotnet tool install -g dotnet-reportgenerator-globaltool`) |
| Test Results (TRX) | `TestResults/*.trx` | Pass/fail/skip per test — emit with `--logger "trx"` |

**Create `scripts/generate-report.js` stub** following the same contract as Java/JS (parse Cobertura XML + TRX, emit `test-results/test-summary.html` + `test-results/test-report.md`).
