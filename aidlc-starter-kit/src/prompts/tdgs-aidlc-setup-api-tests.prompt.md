---
mode: agent
description: "Initialize an API test framework inside each auto-detected backend service repository. Workspace-driven, application-agnostic."
---

# API Test Framework Setup

Initialize an API test framework inside each detected backend service repository. Scaffolding logic (discovery, Insomnia collections, test runner, environments) runs in the setup-api-tests skill.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Command Usage

```
/tdgs-aidlc-setup-api-tests
/tdgs-aidlc-setup-api-tests {service}
/tdgs-aidlc-setup-api-tests {coverage_target}
/tdgs-aidlc-setup-api-tests {service} {coverage_target}
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `service` | No | All detected | Specific service repo directory name, or `all` for every detected backend service. |
| `coverage_target` | No | `80` | Minimum endpoint coverage percentage target. Stored in `api-tests/config/coverage.json` for `/tdgs-aidlc-generate-api-tests`. |

If `coverage_target` is not provided, prompt the user for a percentage or use default `80`.

## Pipeline Position

```
[/tdgs-aidlc-setup-api-tests ← you are here]
   → [/tdgs-aidlc-setup-testdata]
   → [/tdgs-aidlc-generate-api-tests]
```

## Prerequisites

- Workspace contains one or more backend service repositories (Spring Boot, Express, FastAPI, etc.)
- Optional: `*-docs*/knowledge-base/` and `project-context.md` for richer contract discovery

## Instructions

### Step 0: Locate Workspace Root

- Scan workspace subdirectories for backend service indicators (`pom.xml`, `package.json` with express/fastify/nestjs, etc.)
- Exclude `node_modules`, `_bmad*`, `tdgs-aidlc-starter-kit`, `*-docs*`, `.github`, UI/front-end repos
- If no backend services are found, BAIL with guidance to add service repos first

### Step 1: Resolve Parameters

- Parse `service` and `coverage_target` from user input
- If `coverage_target` is missing, prompt once (default `80`)

### Step 2: Delegate to Skill

Read and execute the API test setup skill workflow:

```
.github/i2a-skills/tdgs-aidlc-setup-api-tests/workflow.md
```

Pass resolved `service` and `coverage_target`. Follow all process steps in the workflow. **Copy script templates** from `.github/i2a-skills/tdgs-aidlc-setup-api-tests/templates/` (test-runner, generate-report, lint-collection, audit-coverage) — substitute `{{SERVICE_NAME}}`; read contracts from `tools/runner-contract.md`. Do not regenerate embedded JavaScript from prose.

### Step 3: Output

After scaffolding, display per-service summary:

```
✅ API test framework scaffolded!

   {service-repo}/api-tests/
     collections/   environments/   scripts/test-runner.js   config/coverage.json

   Next: /tdgs-aidlc-setup-testdata (catalog), then /tdgs-aidlc-generate-api-tests
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-setup-testdata` | Create test-data catalog for catalog token resolution |
| `/tdgs-aidlc-generate-api-tests` | Generate and execute API tests (requires this setup) |
| `/tdgs-aidlc-run-tests` | Re-run API tests without full regeneration |
