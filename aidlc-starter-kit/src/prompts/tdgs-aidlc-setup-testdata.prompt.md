---
mode: agent
description: "Set up and refresh test data for an application. Application-agnostic — every name, endpoint, field, screen, and identifier is discovered from the workspace at runtime."
---

# Test Data Setup

Set up and refresh test data for an application. Application-agnostic — every name, endpoint, field, screen, and identifier is discovered from the workspace at runtime. No hardcoded app values.

## Pre-flight Check: Multi-Repository Workspace

> **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Skill Delegation

All implementation logic lives in the skill folder. Read files in this order:

1. **`i2a-skills/tdgs-aidlc-setup-testdata/SKILL.md`** — Router + artifact table + key contracts
2. **`i2a-skills/tdgs-aidlc-setup-testdata/workflow.md`** — Step-by-step orchestrator
3. **`i2a-skills/tdgs-aidlc-setup-testdata/tools/guardrails.md`** — G1-G13 constraints (read BEFORE any action)
4. **`i2a-skills/tdgs-aidlc-setup-testdata/tools/ground-truth-hierarchy.md`** — Field derivation P0-P6, provenance table, validation gate
5. **`i2a-skills/tdgs-aidlc-setup-testdata/tools/discovery.md`** — Step 1: endpoint, chain, screen, pool discovery
6. **`i2a-skills/tdgs-aidlc-setup-testdata/tools/data-collection.md`** — Step 2 + 2a: interactive data prompts, workbook import
7. **`i2a-skills/tdgs-aidlc-setup-testdata/tools/catalog-generation.md`** — Step 3: catalog YAML schema + write rules
8. **`i2a-skills/tdgs-aidlc-setup-testdata/tools/dashboard-generation.md`** — Step 4: dashboard script spec + section layout
9. **`i2a-skills/tdgs-aidlc-setup-testdata/tools/ledger-and-schemas.md`** — Ledger format + JSON Schema contracts + Phase-7 augmentations
10. **`i2a-skills/tdgs-aidlc-setup-testdata/tools/hard-rules.md`** — Hard rules 1-19 (reference during all steps)

## TL;DR — Quick Start

- **What this does:** Scans the workspace (controllers, UI, KB) to discover endpoints/screens/identity needs, then writes/updates `test-data-catalog.yaml`, `dashboard.html`, `db-transactions.json`, `ledger.yaml`, and reference docs in the docs repo's `test-data/` directory.
- **When to run:** ONCE after `setup-*-tests`, then re-run whenever (a) endpoints change, (b) UI screens change, (c) identity pool records need to be added/refreshed, or (d) a `catalog-gaps.yaml` is produced by `/tdgs-aidlc-generate-api-tests`.
- **Prerequisites:** `*-docs*/` directory in the workspace (or one will be created at the user's choice). At least one backend service repo with controllers; UI repo recommended.
- **Outputs:** `{docs-repo}/test-data/test-data-catalog.yaml`, `dashboard.html`, `db-transactions.json`, `ledger.yaml`, three `*.schema.json` files, and `scripts/generate-workspace-dashboard.js`.
- **Idempotency:** Re-running MERGES (not overwrites) — existing identity records are preserved, ledger entries are de-duplicated by `runId`.
- **Next step:** Run any `/tdgs-aidlc-generate-*` prompt — they all consume the catalog at runtime.

## Pipeline Position

```
[/tdgs-aidlc-setup-{api,functional,unit}-tests]
   → [/tdgs-aidlc-setup-testdata ← you are here]
      → [/tdgs-aidlc-generate-{api,functional}-tests]
         (unit-tests do NOT consume the catalog — they are hermetic)
```

## Key Contracts (enforced by skill guardrails)

- **PII safety (G6):** Catalog added to `.gitignore` — local-only, never committed. All PII values rendered plain text for debugging.
- **Cross-service stubs: (G7a):** Canonical `stubs:` block for inter-service dependencies. NEVER nest by endpoint or verb.
- **PLACEHOLDER_* sentinels (G3):** Records filled with `PLACEHOLDER_*` values classify dependent tests as `data-issue` until replaced with real values.
- **Idempotent merge (G9):** Re-runs merge existing records and chains — never overwrite. Safe to run repeatedly.

The prompt does FOUR things and only four:

1. **Discover** — from the **UI source code** — the active API endpoints, the API call chains, and the screen-by-screen API call list.
2. **Ask the user only for pools that cannot be derived** (identity verification, payment cards, login credentials).
3. **Track consumption** of every record (`consumedCount`, `failureCount`, `consecutiveFailureCount`). Quarantine after **5 consecutive** failures.
4. **Generate the dashboard** (`dashboard.html`) with the canonical section layout.

## Guardrails (G10 — Sync Rule)

Mirror this file between `tdgs-aidlc-starter-kit/src/prompts/` (canonical) and `.github/prompts/`.
