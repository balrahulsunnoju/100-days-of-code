---
name: tdgs-aidlc-generate-unit-tests
description: 'Generate comprehensive unit tests for all repositories targeting the configured coverage threshold. Discovers testable units from source analysis and covers happy paths, edge cases, and error handling. Use when the user says "generate unit tests", "run unit tests", or runs /tdgs-aidlc-generate-unit-tests'
---

Follow the instructions in ./workflow.md.

## Reference artifacts (read on demand — do not regenerate from memory)

| Artifact | Path |
|----------|------|
| Guardrails G1–G18 + Failure Modes FM-1–FM-4 | `tools/guardrails.md` |
| Pre-flight checks (workspace, repo scan, project-context, ground-truth) | `tools/preflight-checks.md` |
| Discovery (KB phase, source code phase, test count budget) | `tools/discovery.md` |
| Pre-write contract (Blocks U1–U3, hermeticity plan, boundary inventory) | `tools/pre-write-contract.md` |
| Generation rules (per-module, per-stack, mocking, naming) | `tools/generation-rules.md` |
| Post-generation validation gate (Checks 1–8, G14/G15/G16/G17) | `tools/post-generation-checks.md` |
| Execution, coverage enforcement, and reports | `tools/execution-and-reports.md` |
| Constraints and Phase-6 augmentations | `tools/constraints-and-augmentations.md` |
| Runner output contract / framework conventions | `../tdgs-aidlc-setup-unit-tests/` |

## Prerequisites

- `/tdgs-aidlc-setup-unit-tests` must have scaffolded the per-repo unit test framework (config, runner, coverage gates)
- Coverage threshold known (from parameter, `coverage.json`, or user prompt)

## Parameters (passed from prompt)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `coverage_target` | `80` | Minimum coverage percentage threshold (e.g., 60, 80, 90) |
| `repo` | All detected | Specific repo directory name, or `all` for every detected repo |
| `skip_completed` | None | Comma-separated list of already-completed modules/packages to skip |
| `max_tests_per_module` | `unlimited` | Upper bound on generated tests per module |
| `patch_threshold` | `false` | If `true`, update build-file threshold to match `coverage_target` |
