---
name: tdgs-aidlc-generate-api-tests
description: 'Generate and execute comprehensive API test suites per backend service with two-phase discovery (KB then code), chain wiring, and HTML/MD reports. Use when the user says "generate API tests", "run API tests", or runs /tdgs-aidlc-generate-api-tests'
---

Follow the instructions in ./workflow.md.

## Reference artifacts (read on demand — do not regenerate from memory)

| Artifact | Path |
|----------|------|
| Guardrails G1–G25 | `tools/guardrails.md` |
| Catalog pre-flight | `tools/preflight-catalog.md` |
| Ground-truth hierarchy | `tools/preflight-ground-truth.md` |
| Discovery (Phases 0–2, gates) | `tools/discovery.md` |
| Pre-write contract (Blocks 1–9) | `tools/pre-write-contract.md` |
| Generation (payloads, chaining) | `tools/generation-rules.md` |
| Execution and reports | `tools/execution-and-reports.md` |
| Post-generation gate (Checks 1–20) | `tools/post-generation-checks.md` |
| Constraints and Phase-5 | `tools/constraints-and-phase5.md` |
| Field derivation hierarchy (P0–P6) | `tools/field-derivation-hierarchy.md` |
| Unit test code + assertion rules | `tools/unit-test-code-patterns.md` |
| Insomnia `unit_test` resource shape | `templates/insomnia-unit-test-resources.json.template` |
| `results.json` shape example | `templates/results-json-shape.example.json` |
| Runner output contract (authoritative) | `../tdgs-aidlc-setup-api-tests/tools/runner-contract.md` |
| Insomnia syntax examples | `../tdgs-aidlc-setup-api-tests/tools/insomnia-unit-test-examples.md` |
| Mechanical gate script | `scripts/post-generation-gate.mjs` |

After writing collections, run:

```bash
node .github/i2a-skills/tdgs-aidlc-generate-api-tests/scripts/post-generation-gate.mjs {service}/api-tests/collections/
```

Mechanical coverage: Checks 11 (token leak), 15 (`{{captured.*}}` in negative/edge), 17 (AJV response-schema validation), 20 (positive-status strictness, security-test status, `data/*.json` non-empty), unit-test-code-patterns.md rule #5 (positive `resp.elapsedTime` SLA), Postman `pm.*` anti-pattern.

Documented escape hatches (use only with carve-out reason recorded in the generation report):

```bash
SKIP_AJV=1            node ... # no KB OpenAPI for these endpoints, or non-JSON response
SKIP_ELAPSED_TIME=1   node ... # async/long-running endpoint, SLA enforced upstream
```

Then complete the remaining semantic checks from `tools/post-generation-checks.md` (Checks 1–10, 12–14, 16, 18, 19 — agent-driven).

## Prerequisites

- `/tdgs-aidlc-setup-api-tests` must have created `{service}/api-tests/scripts/test-runner.js` with `resolveCatalogTokens` and `loadCatalogPools`
- `/tdgs-aidlc-setup-testdata` recommended for catalog token resolution

## Parameters (passed from prompt)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `service` | All confirmed | Specific service repo or `all` |
| `coverage_target` | From `coverage.json` or `80` | Minimum endpoint coverage % |
| `max_tests` | unlimited | Optional upper bound on generated test count |
