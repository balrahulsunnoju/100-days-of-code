# Setup Test Data — Workflow

Step-by-step orchestrator. Read `tools/guardrails.md` BEFORE starting any step.

---

## Step 0 — Read `project-context.md` (MANDATORY)

1. Find `project-context.md` (typically `*-docs*/project-context.md`).
2. If missing, STOP and tell the user to run `/bmad-generate-project-context` first.
3. Extract: tech stack, UI framework, backend framework, auth mechanism. Use these at runtime — never hardcode versions.

---

## Step 1 — Discover

**Read:** `tools/ground-truth-hierarchy.md` (field derivation rules) + `tools/discovery.md` (scan procedures)

Run all four discoveries and display a short status line per discovery (`✅ Found N` / `❌ None`):
1. Find docs repo, UI repo, and backend service repos (1a)
2. Discover actively-consumed endpoint set from UI (1b)
3. Discover API chains from `.then()`/`await` order (1c)
4. Build per-screen API call list with single-owner attribution (1d)
5. Classify identity pools: `external-required` / `upstream-generated` / `derivable-from-ui` (1e)

Display classified pools to the user before proceeding.

---

## Step 2 — Ask for test data (INTERACTIVE)

**Read:** `tools/data-collection.md`

🛑 **This step is interactive and blocking. Do not skip.**

- Prompt for each `external-required` pool with zero records
- Handle `file <path>` imports via Step 2a (workbook import)
- Enforce the Step 2 Exit Gate before advancing

---

## Step 3 — Write the catalog

**Read:** `tools/catalog-generation.md`

- Pre-condition: Step 2 Exit Gate satisfied
- Write `{docs-repo}/test-data/test-data-catalog.yaml`
- Single YAML document, overwrite-in-place with merge semantics
- Validate against schema before and after write

---

## Step 4 — Generate the dashboard

**Read:** `tools/dashboard-generation.md` + `tools/ledger-and-schemas.md`

- Write `{docs-repo}/test-data/scripts/generate-workspace-dashboard.js`
- Invoke with `--setup-only` flag
- Write all three `*.schema.json` files
- Run schema-regeneration freshness gate

---

## Step 5 — Summary

Render a `SETUP COMPLETE` banner block listing:
- (a) catalog path with `{N} screens / {N} API chains / {N} pools / {N} records`
- (b) dashboard path with section list
- (c) per-class pool counts with ⚠️ for empty/PLACEHOLDER `external-required` pools
- (d) NEXT line: re-run anytime to add/release records

---

## Re-run Behavior

On re-run, read `tools/hard-rules.md` Rule 19 (re-run idempotency). Display a `RE-RUN MERGE SUMMARY` banner with per-section counts.
