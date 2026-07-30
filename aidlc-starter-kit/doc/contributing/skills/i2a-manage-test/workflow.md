# i2a-manage-test Workflow

Semi-interactive scan-detect-fix-execute pipeline for keeping the AIDLC Starter Kit test suite synchronized with the codebase.

## Parallelization Strategy

This skill is designed for GitHub Copilot Chat. Use **parallel tool calls** wherever sub-tasks are independent — especially during the scan and compare phases where many files must be read simultaneously.

---

## Mode Selection

On activation, determine the mode from the user's invocation:

| Input | Mode |
|-------|------|
| `/i2a-manage-test` or `/i2a-manage-test audit` | `audit` |
| `/i2a-manage-test sync` | `sync` |
| `/i2a-manage-test execute` | `execute` |

---

## Audit Mode (Read-Only)

### Phase 1 -- Scan Codebase

Collect the current state of all components the test suite validates. **Use parallel tool calls** — all five sub-tasks are independent.

**Parallel batch 1** — read codebase and test files simultaneously:

| Sub-task | What to read | What to extract |
|----------|-------------|-----------------|
| **Prompts** | All `src/prompts/tdgs-aidlc-*.prompt.md` | Filename, H2/H3 headings, config references, BAIL conditions, decision branches |
| **Guides** | All `doc/*.md` (excluding `plan/`, `adr/`, `contributing/`) | Filename, H2 headings, prompt invocations, BMAD skill refs, guide cross-refs |
| **Skills** | All `src/i2a-skills/tdgs-aidlc-*/` | Directory name, files present |
| **Config** | `src/i2a-config.yml` | Top-level keys |
| **Test files** | `test/test-inventory.js`, `test/test-prompt-structure.js`, `test/test-guide-structure.js`, `test/simulation/rules.js`, `test/test-all.js`, `package.json` | Current expectations (arrays, rules, SUITES, scripts) |

Launch all reads in a single parallel batch. This is the most time-intensive phase — parallelization provides the biggest speedup here.

### Phase 2 -- Compare Against Tests

After Phase 1 completes, run all five comparison checks. **Use parallel tool calls** — each check operates on different data and they are independent of each other.

**Parallel batch 2** — run all gap checks concurrently:

| Sub-task | Test file | Comparison |
|----------|-----------|------------|
| **Inventory check** | `test/test-inventory.js` | Diff `EXPECTED_PROMPTS` vs actual prompts; `EXPECTED_GUIDES` vs actual guides; `EXPECTED_SKILLS` vs actual skills |
| **Prompt structure check** | `test/test-prompt-structure.js` | For each prompt: does `PROMPT_RULES` entry exist? Are `mustHaveSection` patterns current? Is `mustReferenceConfig` accurate? Are `behavioralChecks` complete? |
| **Guide structure check** | `test/test-guide-structure.js` | For each guide: does `GUIDE_RULES` entry exist? Are `requiredH2` patterns current? Are `mustContainPrompts` and `mustReferenceGuides` accurate? |
| **Simulation check** | `test/simulation/rules.js` + `test/test-simulation.js` | Identify decision branches in prompts not covered by rule functions or test cases |
| **Infrastructure check** | `test/test-all.js` + `package.json` | All test files registered in SUITES? All SUITES have npm scripts? |

### Phase 3 -- Report

Present gap analysis categorized by type and priority:

```
=== AIDLC Test Gap Analysis ===

MISSING (test needs to be added):
  [INV] New prompt "tdgs-aidlc-foo.prompt.md" not in EXPECTED_PROMPTS
  [RULE] No PROMPT_RULES entry for "tdgs-aidlc-foo"
  ...

STALE (test needs to be updated):
  [RULE] PROMPT_RULES["tdgs-aidlc-bar"].mustHaveSection pattern outdated
  [GUIDE] GUIDE_RULES["setup.md"].mustContainPrompts missing a newly added prompt
  ...

ORPHAN (test should be removed):
  [INV] EXPECTED_PROMPTS lists "tdgs-aidlc-old.prompt.md" but file doesn't exist
  ...

Summary: X missing, Y stale, Z orphan
```

---

## Sync Mode

Runs all audit phases, then adds:

### Phase 4 -- Fix

For each gap found, present the proposed change to the ACE:

**For MISSING gaps:**
- Show the new array entry, rule object, or function to be added
- Show the target file and insertion point
- ACE approves or modifies

**For STALE gaps:**
- Show the current value and proposed replacement
- ACE approves or modifies

**For ORPHAN gaps:**
- Show the entry to be removed
- ACE approves or skips

Apply all approved changes to the test files.

### Phase 5 -- Execute

Run the full test suite:

```bash
npm test
```

Report results:

- If all pass: report summary and mark sync as complete
- If failures: present each failure with context, suggest fixes, and offer to re-run after corrections

---

## Execute Mode

Convenience wrapper. Run:

```bash
npm run test:verbose
```

Report structured results: total checks, passed, failed, skipped. For any failures, show the test ID, message, and detail.

---

## Pairing with i2a-manage-spec

After running `/i2a-manage-spec` to update specification documents, run `/i2a-manage-test sync` to ensure tests reflect the current codebase. The two skills are independent but complementary.

Recommended sequence:

1. `/i2a-manage-spec update` -- refresh specs
2. `/i2a-manage-test sync` -- sync tests and verify
