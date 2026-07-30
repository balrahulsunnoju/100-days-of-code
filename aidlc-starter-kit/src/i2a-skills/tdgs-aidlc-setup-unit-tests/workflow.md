# Setup Unit Tests — Workflow

Step-by-step orchestrator for initializing unit test framework across all workspace repositories.

---

## Execution Flow

### Phase 0: Pre-flight & Discovery

1. Read `tools/guardrails.md` — internalize G1-G13 before any action
2. Read `tools/preflight-and-discovery.md` — execute pre-flight checks:
   - Confirm workspace is multi-repo (git repos in subdirectories, NOT workspace root)
   - Scan for build manifests in all subdirectories
   - Classify each repo by stack (see detection table)
   - Resolve `coverage_target` parameter (prompt user if not provided)
   - Display detected repos table for user confirmation

### Phase 1: Scaffold Per Repo (Stack-Specific)

For EACH detected repo, apply the appropriate scaffold:

| Stack Detected | Tool File to Read |
|----------------|-------------------|
| Java / Spring Boot (Maven) | `tools/java-scaffold.md` — Step 2 |
| Java / Spring Boot (Gradle) | `tools/java-scaffold.md` — Step 2b |
| React / JS / TS (Jest) | `tools/javascript-scaffold.md` — Step 3 |
| React / JS / TS (Vitest) | `tools/javascript-scaffold.md` — Step 3d |
| Python (pytest) | `tools/other-stacks.md` — Step 4 |
| Angular (Karma/Jest) | `tools/other-stacks.md` — Step 4a |
| Vue (Vitest/Jest) | `tools/other-stacks.md` — Step 4a-2 |
| AWS Lambda | `tools/other-stacks.md` — Step 4a-3 |
| C# / .NET (xUnit/NUnit) | `tools/other-stacks.md` — Step 4b |

**Per-repo scaffold checklist (ALL stacks):**
- [ ] Check existing test infrastructure — DO NOT overwrite
- [ ] Add missing dependencies (version-aware, idempotent)
- [ ] Configure coverage tool with `{coverage_target}`
- [ ] Create `scripts/generate-report.js` (or `.py`) stub
- [ ] Create test utility files if not existing
- [ ] Write `{repo}/test-results/coverage.json` with `{ "target": N }`

### Phase 2: Execution Scripts

Read `tools/execution-and-verification.md` — Step 5:
- Wire test commands per repo
- Ensure G13 dashboard refresh is chained into every script
- If docs-repo dashboard script missing → STOP, instruct user to run `/tdgs-aidlc-setup-testdata`

### Phase 3: Verification

Read `tools/execution-and-verification.md` — Step 6:
- Run verification command per repo (test collection / compile check)
- Report verification status table

### Phase 4: Documentation

Read `tools/execution-and-verification.md` — Step 7:
- Create/update `TESTING.md` per repo
- Document run commands, coverage target, mock patterns, test utilities

---

## Pre-Write Output Contract (G8)

Before writing files for ANY repo, emit a per-repo plan:
```
══════════════════════════════════════════════════════════════
PLAN: {repo-name}/
══════════════════════════════════════════════════════════════
  Stack:          {detected stack}
  Framework:      {test framework + coverage tool}
  Coverage:       {coverage_target}%
  Files to create/modify:
    - {file path} — {purpose}
    - ...
  Build command:  {test execution command}
══════════════════════════════════════════════════════════════
```

## Post-Completion Checklist

- [ ] All repos have test framework wired
- [ ] All repos have `scripts/generate-report.js` (or `.py`) stub
- [ ] All repos have `test-results/coverage.json` with target persisted
- [ ] G13 dashboard refresh chained into ALL test scripts
- [ ] Verification passed for all repos
- [ ] `TESTING.md` created/updated per repo
