# i2a-manage-review Workflow

Adversarial and persona-based review pipeline. Adapted from BMAD v6.3.0 adversarial review and party mode patterns.

## Parallelization Strategy

This skill is designed for GitHub Copilot Chat. The biggest parallelization opportunity is in **Phase 2** where all 6 review personas are independent of each other and can analyze the codebase concurrently. Phase 1 (context loading) also benefits from parallel file reads.

---

## Mode Selection

On activation, determine the mode from the user's invocation:

| Input | Mode |
|-------|------|
| `/i2a-manage-review` or `/i2a-manage-review review` | `review` (all personas) |
| `/i2a-manage-review review --persona architect,qa` | `review` (selected personas only) |
| `/i2a-manage-review fix` | `fix` |
| `/i2a-manage-review report` | `report` |

---

## Review Mode

### Phase 1 -- Load Context

Load the full codebase into review context. **Use parallel tool calls** — all file reads are independent.

**Parallel batch 1** — read all codebase content simultaneously:

| Sub-task | What to read |
|----------|-------------|
| **Prompts** | All files in `src/prompts/` |
| **Skills** | All files in `src/i2a-skills/` |
| **Guides** | All files in `doc/` |
| **ACE docs** | All files in `doc/contributing/` (including specs if they exist) |
| **Test suite** | `test/test-all.js`, `test/harness.js`, `test/test-prompt-structure.js`, `test/test-guide-structure.js`, `test/simulation/rules.js` |
| **Infrastructure** | `README.md`, `package.json`, `VERSION`, `NEXT_VERSION`, `src/i2a-config.yml`, `.github/workflows/release.yml` |

Launch all reads in a single parallel batch. Note the current version and any existing `review-report.md`.

**Large-file handling:** For any file exceeding 200 lines (common: `test-prompt-structure.js`, `simulation/rules.js`, `mo-workflow.md`, `prompt-reference.md`), you MUST read the **entire** file — not just the first 200 lines. Use multiple sequential reads if necessary, or use terminal commands (`wc -l`, `grep -c`) to confirm structural claims before assuming content is absent. Partial reads are the #1 source of false-positive findings.

### Phase 2 -- Persona Reviews (Parallel, Adversarial)

This is the highest-impact parallelization point. All persona reviews are completely independent — they analyze the same codebase but through different lenses.

**Parallel batch 2** — launch ALL active persona reviews concurrently:

| Persona | Persona file | Review focus |
|---------|-------------|-------------|
| Architect | `personas/architect.md` | Structure, boundaries, data flow, naming, integration |
| PM | `personas/pm.md` | Feature completeness, user value, workflow coverage, role parity |
| Dev | `personas/dev.md` | Prompt clarity for AI agents, BAIL conditions, DX, error paths |
| QA | `personas/qa.md` | Test coverage, quality gates, edge cases, simulation gaps |
| BA | `personas/ba.md` | Requirements traceability, terminology, catalog accuracy |
| UX | `personas/ux.md` | Workflow ergonomics, doc navigability, onboarding, error experience |

For each persona (executing in parallel):

1. Read the persona definition from `personas/{name}.md`
2. Adopt the persona's professional lens and review scope
3. Analyze the codebase through that lens using the persona's question set
4. **Adversarial mandate:** You MUST produce findings. Zero findings means re-analyze more deeply. Look for what's missing, not just what's wrong.
5. For each finding, produce a structured JSON entry:

```json
{
  "persona": "architect",
  "severity": "High",
  "location": "src/prompts/tdgs-aidlc-commit.prompt.md:## Security",
  "title": "Missing file sensitivity check for .env.local",
  "description": "The sensitivity checklist covers .env and .pem but not .env.local, which is commonly used in Next.js projects.",
  "impact": "AI agents may commit .env.local files containing secrets.",
  "resolution": "Add .env.local, .env.*.local to the sensitivity checklist in the Security section."
}
```

6. Return findings as a complete JSON array for this persona

Wait for all parallel persona reviews to complete before proceeding to Phase 2.5.

### Phase 2.5 -- Fact-Check Claims

Before consolidation, verify the factual basis of each finding. This phase eliminates false positives caused by partial file reads, stale assumptions, or incorrect counts.

For each finding, apply the appropriate verification:

| Claim Type | Verification Method |
|------------|--------------------|
| "X is missing from file Y" | `grep -c 'pattern' file` or full-file read to confirm absence |
| "Only N of M entries exist" | Count actual instances: `grep -c "^  'tdgs-aidlc-" file` |
| "File lacks section Z" | `grep -i 'heading' file` to confirm heading is truly absent |
| "Pattern not found" | Search the FULL file (not a partial read) for the pattern |
| "Inconsistency between A and B" | Read both locations and confirm the discrepancy still exists |

**Rules:**
- Any finding whose factual claim cannot be confirmed is marked `false-positive` and excluded from the report.
- Prefer terminal commands (`grep`, `wc -l`) over file reads for verification — they're faster and cover the full file.
- If a finding is about a count mismatch, the verification MUST produce the actual count.
- Document the verification result in the finding's internal notes (not in the final report).

### Phase 3 -- Consolidate and Deduplicate

Merge findings from all personas:

1. **Deduplicate:** If multiple personas flagged the same issue (same file + same section + similar description), merge into a single finding. Keep the highest severity. Record all personas that raised it.
2. **Cross-cutting bump:** Findings raised by 3+ personas get severity bumped one level (Medium → High, High → Critical). Blockers stay Blocker.
3. **Assign IDs:** Number findings sequentially by severity: `RV-B001`, `RV-B002`, `RV-C001`, etc.
4. **Sort:** Blocker → Critical → High → Medium → Low

### Phase 4 -- Generate Review Report

Write `doc/contributing/review-report.md` following the structure below:

```markdown
# AIDLC Starter Kit -- Review Report

**Generated:** {date}
**Version:** {kit_version}
**Personas:** {comma-separated list of active personas}
**Findings:** {B} Blocker, {C} Critical, {H} High, {M} Medium, {L} Low

## Summary

{2-3 sentence executive summary: overall health, most critical issues, key themes}

## Blocker Findings

### [RV-B001] {title}
- **Severity:** Blocker
- **Personas:** {list}
- **Location:** `{file}:{section}`
- **Description:** {what's wrong}
- **Impact:** {why it matters}
- **Resolution:** {specific fix approach}
- **Status:** OPEN

## Critical Findings
{same structure as Blocker}

## High Findings
{same structure as Blocker}

## Medium Findings

### [RV-M001] {title}
- **Severity:** Medium
- **Personas:** {list}
- **Location:** `{file}:{section}`
- **Description:** {what's wrong}
- **Resolution:** {suggested improvement}

## Low Findings

### [RV-L001] {title}
- **Location:** `{file}:{section}`
- **Description:** {observation}

## Review Metadata

- Personas used: {list}
- Files analyzed: {count}
- Findings before dedup: {count}
- Unique findings after dedup: {count}
```

### Phase 5 -- Present to ACE

Show the review summary:
- Total findings by severity
- Top 3 most critical issues
- Cross-cutting themes (issues raised by multiple personas)
- Ask if the ACE wants to proceed to fix mode

---

## Fix Mode

Re-read `doc/contributing/review-report.md` and process fixable findings.

### Invocation Variants

| Input | Behavior |
|-------|----------|
| `/i2a-manage-review fix` | Process ALL open Blocker/Critical/High findings sequentially |
| `/i2a-manage-review fix RV-C001` | Process a single finding by ID |
| `/i2a-manage-review fix RV-C001 RV-H003` | Process specific findings in order |

### Phase 1 -- Load Findings

Read the existing review report. Filter to OPEN findings with severity Blocker, Critical, or High. If specific finding IDs were provided, further filter to only those IDs.

### Phase 2 -- Apply Fixes (Semi-Interactive)

For each fixable finding, ordered by severity (Blocker first):

1. **Fact-check first:** Before proposing a fix, verify the finding's factual claim still holds (same rules as Phase 2.5 in review mode). If the claim is false, mark the finding as `RESOLVED (false positive)` and skip to the next finding.
2. Show the finding: ID, severity, location, description, resolution approach
3. Show the proposed change (specific file edits, additions, or deletions)
4. ACE can:
   - **Accept** -- apply the fix
   - **Modify** -- provide alternative fix; apply that instead
   - **Skip** -- leave the finding OPEN
   - **Dismiss** -- mark as false positive with reason; sets status to `RESOLVED (false positive)`

### Phase 3 -- Post-Fix Validation

After all fixes are applied:

1. Run `npm test` to verify no regressions
2. If tests fail: present failures and offer to fix test issues (may trigger `/i2a-manage-test sync` logic)
3. If tests pass: report success

### Phase 4 -- Update Report

Update `doc/contributing/review-report.md`:
- Mark fixed findings as `**Status:** RESOLVED`
- Add resolution note: what was changed and when
- Update the summary section with post-fix counts

---

## Report Mode

Regenerate the review report from the last review's findings without re-analyzing the codebase. Useful for reformatting or after manual fixes.

1. Read existing `doc/contributing/review-report.md`
2. Re-render with current template and formatting
3. Update metadata timestamp

---

## Pairing with Other Skills

Recommended full maintenance workflow:

1. `/i2a-manage-spec update` -- refresh specification documents
2. `/i2a-manage-test sync` -- update tests and verify they pass
3. `/i2a-manage-review` -- adversarial review across all personas
4. `/i2a-manage-review fix` -- auto-fix Blocker/Critical/High findings
5. `/i2a-manage-test sync` -- re-validate after fixes

The review skill reads specification documents (if present) as additional input for the BA and PM personas, making reviews more thorough when specs are current.
