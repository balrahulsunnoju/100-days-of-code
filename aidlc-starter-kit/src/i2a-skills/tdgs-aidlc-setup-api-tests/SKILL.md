---
name: tdgs-aidlc-setup-api-tests
description: 'Scaffold an API test framework (Insomnia collections, test runner, environments) in each auto-detected backend service repository. Use when the user says "setup API tests", "scaffold API tests", "initialize API test framework", or runs /tdgs-aidlc-setup-api-tests'
---

Follow the instructions in ./workflow.md.

## Reference artifacts (copy — do not regenerate from memory)

| Artifact | Template |
|----------|----------|
| test-runner.js | `templates/test-runner.js.template` |
| generate-report.js | `templates/generate-report.js.template` |
| lint-collection.js | `templates/lint-collection.js.template` |
| audit-coverage.js | `templates/audit-coverage.js.template` |
| audit-config.json | `templates/audit-config.json.template` |
| Output contract | `tools/runner-contract.md` |
| Insomnia test syntax | `tools/insomnia-unit-test-examples.md` |

## Pipeline

| Step | Command |
|------|---------|
| Before generate | `/tdgs-aidlc-setup-testdata` (catalog for runner token resolution) |
| After setup | `/tdgs-aidlc-generate-api-tests` |

## Parameters (passed from prompt)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `service` | All detected | Specific service repo name or `all` |
| `coverage_target` | `80` | Endpoint coverage % stored in `api-tests/config/coverage.json` |
