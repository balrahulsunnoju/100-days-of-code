---
mode: agent
description: "Initialize a production-ready Playwright functional test framework inside the auto-detected UI repository. Workspace-driven, application-agnostic."
---

# Functional Test Framework Setup

Initialize a production-ready Playwright functional test framework inside the detected **UI repository**. Workspace-driven, application-agnostic — dynamically discovers the UI repo and scaffolds inside it (not at workspace root).

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Skill Location

All detailed specifications live in `i2a-skills/tdgs-aidlc-setup-functional-tests/`. Read files on demand per the workflow below.

**Pre-flight:** Verify `i2a-skills/tdgs-aidlc-setup-functional-tests/SKILL.md` exists → BAIL if not found:
```
⛔ Skill not installed: i2a-skills/tdgs-aidlc-setup-functional-tests/

Run /tdgs-aidlc-quick-setup to install AIDLC skills, then retry.
```

## Quick Reference

- **What this does:** Scaffolds Playwright + Page-Object framework inside `{ui-repo}/functional-tests/`
- **When to run:** Once per UI repo. Re-run only after major UI restructure or framework version bump.
- **Prerequisites:** A UI repo in workspace (auto-detected by `*-ui*/` glob or `project-context.md`)
- **Outputs:** `{ui-repo}/functional-tests/`, `playwright.config.js`, npm scripts, `TESTING.md`
- **Next step after this:** `/tdgs-aidlc-setup-testdata` then `/tdgs-aidlc-generate-functional-tests`

## Execution Workflow

1. **Read** `i2a-skills/tdgs-aidlc-setup-functional-tests/SKILL.md` → understand artifact table
2. **Read** `i2a-skills/tdgs-aidlc-setup-functional-tests/tools/guardrails.md` → internalize G1-G13
3. **Read** `i2a-skills/tdgs-aidlc-setup-functional-tests/workflow.md` → follow step-by-step
4. **For each step**, read the referenced tool file and execute

## Guardrails Summary (details in tools/guardrails.md)

- **G1** Application-agnostic — no hardcoded names
- **G2** Discover-before-generate — scan workspace first
- **G3** Ask-don't-assume — prompt user for ambiguity
- **G4** No hallucination of schemas/fields
- **G5** Prerequisite check (hard-fail)
- **G6** PII handling — catalog pools only
- **G7** Cross-service skip classification
- **G8** Pre-Write Output Contract
- **G9** Idempotency and merge semantics
- **G10** Sync rule (starter-kit canonical, .github mirrors)
- **G11** Shared contracts (caseType, status, timeout 60_000, passRate)
- **G12** DB transaction capture in real mode
- **G13** Reports sync guardrail

## HARD Gates (must-not-skip)

- `api-mock.js` MUST exist with `setupDefaultApiMocks` export
- `catalog-fixture.js` + `global-teardown.js` MUST exist when catalog present
- `flow-runner.js` MUST exist when flow descriptors exist (G9a)
- `playwright.config.js` MUST have `open: 'never'` + `globalTeardown` path
- NEVER pass `--reporter=…` on Playwright CLI
- NEVER create files at workspace root
- Flat `timeout: 60_000` (not mode-aware)
- `trace: 'retain-on-failure'` (NOT `on-first-retry`)

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `ui_repo` | No | Auto-detect | UI repo directory name |
| `coverage_target` | No | `80` | Min business-rule coverage % |

## Pipeline Position

```
[/tdgs-aidlc-setup-functional-tests ← you are here]
   → [/tdgs-aidlc-setup-testdata]
      → [/tdgs-aidlc-generate-functional-tests]
         → Playwright HTML reports + ledger.yaml + dashboard.html refresh
```

## Sync Rule (G10)

This prompt exists at BOTH:
- `tdgs-aidlc-starter-kit/src/prompts/` (CANONICAL)
- `.github/prompts/` (workspace consumption)

The skill folder exists at BOTH:
- `tdgs-aidlc-starter-kit/src/i2a-skills/tdgs-aidlc-setup-functional-tests/` (CANONICAL)
- `.github/i2a-skills/tdgs-aidlc-setup-functional-tests/` (workspace consumption)

Any edit MUST be mirrored. Verify: `diff -rq` between both locations.
