# Setup Unit Tests — Skill Router

Initialize unit test framework for **ALL repositories** in the workspace. Auto-detects each repo's technology stack and scaffolds or enhances unit test infrastructure with configurable coverage thresholds.

## Artifact Table (read on demand)

| File | Purpose | When to Read |
|------|---------|--------------|
| `workflow.md` | Step-by-step orchestrator | Always — first file after SKILL.md |
| `tools/guardrails.md` | G1-G13 + constraints | Always — read before any action |
| `tools/preflight-and-discovery.md` | Pre-flight checks, ground-truth hierarchy, params, Step 1 | Step 0-1 (detection phase) |
| `tools/java-scaffold.md` | Step 2 (Maven) + Step 2b (Gradle) | Java/Spring Boot repos |
| `tools/javascript-scaffold.md` | Step 3 (Jest) + Step 3c (compat) + Step 3d (Vitest) | React/JS/TS repos |
| `tools/other-stacks.md` | Step 4 (Python) + Step 4a (Angular) + Step 4a-2 (Vue) + Step 4a-3 (Lambda) + Step 4b (.NET) | Non-Java/JS repos |
| `tools/execution-and-verification.md` | Steps 5-7 (execution scripts, verify, document) + Phase-6 augmentations | Final steps |

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `coverage_target` | No | `80` | Min coverage % |
| `repo` | No | All detected | Specific repo or `all` |

## Key Contracts

- Supports Java/Spring Boot, React/JS/TS, Node.js, Python, Angular, Vue, Lambda, .NET
- Unit tests MUST be hermetic — NEVER read test-data-catalog (G4 HARD FAILURE)
- Coverage thresholds are monitored/reported but do NOT fail the build (DevOps owns gates)
- `scripts/generate-report.js` stub is MANDATORY for every repo (chain safety)
- Cross-app dashboard refresh wired into every test script (G13)

## Pipeline Position

```
[/tdgs-aidlc-setup-unit-tests ← this]
   → [/tdgs-aidlc-generate-unit-tests]
      → coverage reports per repo (NO catalog, NO ledger — hermetic by design)
```
