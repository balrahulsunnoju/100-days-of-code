---
mode: agent
description: "Initialize unit test framework for all repositories in the workspace. Auto-detects each repo's technology stack and scaffolds or enhances unit test infrastructure with configurable coverage thresholds."
---

# Unit Test Framework Setup

Initialize unit test framework for **ALL repositories** in the workspace. This prompt auto-detects each repo's technology stack and scaffolds or enhances the appropriate unit test infrastructure with configurable coverage thresholds.

This prompt is **application-agnostic** — it discovers repos and stacks dynamically, supporting Java/Spring Boot, React/JS/TS, Node.js, Python, Angular, Vue, Lambda, and .NET projects.

## Skill Location

All implementation logic lives in `i2a-skills/tdgs-aidlc-setup-unit-tests/`. Read files on demand per the workflow below.

**Pre-flight:** Verify `i2a-skills/tdgs-aidlc-setup-unit-tests/SKILL.md` exists → BAIL if not found:
```
⛔ Skill not installed: i2a-skills/tdgs-aidlc-setup-unit-tests/

Run /tdgs-aidlc-quick-setup to install AIDLC skills, then retry.
```

## Skill Delegation

Read files in this order:

1. **`i2a-skills/tdgs-aidlc-setup-unit-tests/SKILL.md`** — Router + artifact table + key contracts
2. **`i2a-skills/tdgs-aidlc-setup-unit-tests/workflow.md`** — Step-by-step orchestrator
3. **`i2a-skills/tdgs-aidlc-setup-unit-tests/tools/guardrails.md`** — G1-G13 + constraints (read BEFORE any action)
4. **`i2a-skills/tdgs-aidlc-setup-unit-tests/tools/preflight-and-discovery.md`** — Pre-flight checks, ground-truth hierarchy, parameters, Step 1
5. **Stack-specific scaffold** (read only the one matching detected stack):
   - `tools/java-scaffold.md` — Java/Spring Boot (Maven + Gradle)
   - `tools/javascript-scaffold.md` — React/JS/TS (Jest + Vitest)
   - `tools/other-stacks.md` — Python, Angular, Vue, Lambda, .NET
6. **`i2a-skills/tdgs-aidlc-setup-unit-tests/tools/execution-and-verification.md`** — Steps 5-7 + Phase-6 report spec

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `coverage_target` | No | `80` | Minimum coverage percentage threshold |
| `repo` | No | All detected | Specific repo or `all` |

## TL;DR — Quick Start

- **What this does:** For EACH repo in the workspace, detects the stack and scaffolds the conventional unit test framework (JUnit5+Mockito+JaCoCo for Java, Jest/Vitest for JS/TS, pytest+coverage for Python, xUnit+coverlet for .NET) with configurable coverage thresholds.
- **When to run:** Once per repo. Re-run after stack change or coverage-threshold policy change.
- **Prerequisites:** Each repo has a build manifest (`pom.xml`, `package.json`, `requirements.txt`/`pyproject.toml`, `*.csproj`).
- **Outputs:** stack-appropriate test config files, coverage threshold reporting wired into the build (thresholds are monitored and reported but do NOT fail the build by default — DevOps owns deployment-gate decisions), `npm run test`/`mvn test`/etc. scripts, per-repo `TESTING.md`.
- **Most common failure:** Mixed-stack monorepo confuses detection → confirm the per-repo stack table the prompt prints before scaffolding starts.
- **Next step after this:** Run `/tdgs-aidlc-generate-unit-tests` to author hermetic unit tests targeting the threshold. Unit tests are INDEPENDENT of `/tdgs-aidlc-setup-testdata` (they MUST NOT read the catalog).

## Pipeline Position

```
[/tdgs-aidlc-setup-unit-tests ← you are here]
   → [/tdgs-aidlc-generate-unit-tests]
      → coverage reports per repo (NO catalog, NO ledger — hermetic by design)
```

## Guardrails (G10 — Sync Rule)

Mirror this file between `tdgs-aidlc-starter-kit/src/prompts/` (canonical) and `.github/prompts/`.
