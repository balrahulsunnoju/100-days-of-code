# Setup Test Data — Skill Router

Set up and refresh test data for an application. Application-agnostic — every name, endpoint, field, screen, and identifier is discovered from the workspace at runtime.

## Artifact Table (read on demand)

| File | Purpose | When to Read |
|------|---------|--------------|
| `workflow.md` | Step-by-step orchestrator | Always — first file after SKILL.md |
| `tools/guardrails.md` | G1-G13 constraints | Always — read before any action |
| `tools/ground-truth-hierarchy.md` | Field derivation hierarchy P0-P6, provenance table, self-validation gate | Step 0 + Pre-flight |
| `tools/discovery.md` | Steps 1a-1e: endpoint, chain, screen, pool discovery | Step 1 |
| `tools/data-collection.md` | Steps 2 + 2a: interactive data prompts, workbook import | Step 2 |
| `tools/catalog-generation.md` | Step 3: catalog YAML schema + status semantics | Step 3 |
| `tools/dashboard-generation.md` | Step 4: dashboard script spec + section layout | Step 4 |
| `tools/ledger-and-schemas.md` | Ledger format + JSON Schema contracts | Step 4 (schemas) |
| `tools/hard-rules.md` | Hard rules 1-20 + Phase-7 augmentations | Always — reference during all steps |

## Key Contracts

- Application-agnostic (G1): every value discovered at runtime
- Discover-before-generate (G2): scan UI/backend/KB before writing anything
- Ask-don't-assume (G3): never invent identity values — prompt user
- Idempotent merge (G9): re-runs merge, never overwrite
- PII safety (G6): catalog is gitignored, values rendered plain text
- Cross-service stubs (G7/G7a): canonical `stubs:` block for inter-service dependencies
- Pre-Write Output Contract (G8): emit file list + diff summary before writing
- Shared math (G11): `computePassRate` from `scripts/lib/math.js`

## Pipeline Position

```
[/tdgs-aidlc-setup-{api,functional,unit}-tests]
   → [/tdgs-aidlc-setup-testdata ← this]
      → [/tdgs-aidlc-generate-{api,functional}-tests]
         (unit-tests do NOT consume the catalog — they are hermetic)
```
