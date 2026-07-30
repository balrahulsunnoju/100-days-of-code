# i2a-manage-spec Workflow

Semi-interactive scan-draft-review-write pipeline. Loosely adapted from BMAD v6.3.0 `bmad-create-prd` and `bmad-create-architecture` workflows, simplified for ACE use.

## Parallelization Strategy

This skill is designed for GitHub Copilot Chat. Where phases contain independent sub-tasks, use **parallel tool calls** to read and analyze multiple files simultaneously. This significantly reduces wall-clock time for the scan-heavy phases.

---

## Mode Selection

On activation, determine the mode from the user's invocation:

| Input | Mode |
|-------|------|
| `/i2a-manage-spec` or `/i2a-manage-spec generate` | `generate` |
| `/i2a-manage-spec update` | `update` |
| `/i2a-manage-spec validate` | `validate` |
| `/i2a-manage-spec delta` | `delta` |
| `/i2a-manage-spec delta update` | `delta update` |

---

## Generate / Update Mode

### Phase 1 -- Scan

Analyze the codebase to extract current state. **Use parallel tool calls** — the five inventory tasks below are independent and should run concurrently.

**Parallel batch 1** — read all source inventories simultaneously:

| Sub-task | What to read | What to extract |
|----------|-------------|-----------------|
| **Prompt inventory** | All `src/prompts/tdgs-aidlc-*.prompt.md` files | Name, functional group, target role, key capabilities, config dependencies, BMAD skill refs |
| **Skill inventory** | All `src/i2a-skills/tdgs-aidlc-*/` directories | Name, required files, capabilities, BMAD delegations |
| **Guide inventory** | All `doc/*.md` files | Name, audience, H2 structure, prompt refs, guide cross-refs |
| **Test suite inventory** | `test/test-all.js`, `test/harness.js`, `test/simulation/rules.js` | Suites, harness API, check counts, simulation categories |
| **Config + version** | `src/i2a-config.yml`, `VERSION`, `package.json`, `doc/contributing/catalog.md` | Schema, consumers, version, release workflow |

Launch all five reads in a single parallel tool call batch. Wait for all to complete before proceeding.

**Sequential step** (update mode only): After parallel reads complete, compare scan results against existing spec documents to identify sections that need refresh.

### Phase 2 -- Draft

Generate draft content for each specification document. **Use parallel tool calls** — the two specs are independent and can be drafted simultaneously.

**Parallel batch 2** — draft both specs concurrently:

| Sub-task | Template | Content |
|----------|----------|---------|
| **Functional spec** | `templates/functional-specification.tmpl.md` | Map prompts to capability-area FRs (FR-1, FR-2, ...) following BMAD step-09 pattern; each FR states WHAT capability exists; organize by area; generate selective NFRs |
| **Technical spec** | `templates/technical-specification.tmpl.md` | Map codebase to component architecture; extract patterns from test rules and prompt conventions; document data flows. Update Mermaid diagrams in Data Flow section to reflect current component counts (prompts, skills, guides, suites, checks), skill names, config consumer edges, and delivery lifecycle paths. |

**Sequential step** (after parallel drafts): Run FS↔TS cross-check on the drafted content before presenting to the ACE. Verify that both specs agree on counts, coverage, and version metadata (see Validate Mode Phase 2 for the full check list).

Flag any sections where source data is ambiguous or incomplete.

### Phase 3 -- Review

Present drafts to the ACE for review:

1. Show summary of what was scanned (file counts, version, changes detected)
2. For each major section, present the draft content
3. ACE can: **accept**, **modify** (provide corrections), or **skip** (leave section unchanged)
4. Highlight any gaps or ambiguities found during scan

### Phase 4 -- Write

Write approved content to spec files:

1. **Bump spec version:** Read the current `Spec Version` from the existing document metadata. Determine bump type:
   - `patch` — content refresh, updated counts, minor wording changes
   - `minor` — new FRs/NFRs added, new sections, new capability areas
   - `major` — document restructuring, section layout changes
   If generating for the first time (no existing document), set to `1.0.0`.
2. Update document metadata: `Spec Version` and `Date`
3. Both functional and technical specs must share the same spec version
4. Write accepted sections
5. Report summary: new spec version, sections generated, sections skipped, gaps remaining

---

## Validate Mode

Read-only drift detection. Reports two categories of drift: **codebase drift** (specs vs source files) and **FS↔TS drift** (functional spec vs technical spec).

### Phase 1 -- Codebase Drift

1. Run Phase 1 (Scan) as described in Generate/Update Mode
2. Compare scan results against existing spec documents
3. Report mismatches by section:
   - Prompt count mismatch (spec says N, codebase has M)
   - Missing capability areas (new prompts not covered in FRs)
   - Stale technical descriptions (changed test suites, new skills)
   - Stale diagrams (component counts or edges in Mermaid diagrams don't match scan results)
   - Version mismatch

### Phase 2 -- FS↔TS Cross-Check

Compare the Functional Specification against the Technical Specification for internal consistency:

| Check | FS Source | TS Source |
|-------|-----------|-----------|
| Prompt count | Scope section ("N Copilot prompt files") | Prompt System section ("N prompts") and Functional Groups table (sum of group counts) |
| Skill count | Capability Area 7 header ("N skills") | Custom Skills System (count of Official Skills entries) |
| Guide count | (implicit — not stated in FS) | Documentation System ("N user-facing guides") |
| Config consumer count | FR-6 ("Fourteen of the thirty prompts...") | Config Consumers table (row count) |
| Capability area prompts | Each area header lists its prompts | Functional Groups table lists prompts per group — sets must match |
| FR → TS coverage | Each FR describes a capability | The corresponding TS section (Prompt System, Custom Skills, Config, Test Framework, etc.) should document the component that implements it |
| NFR → TS coverage | Each NFR states a quality attribute | Hard Constraints table + relevant TS sections should enforce it |
| Spec version match | Metadata table `Spec Version` | Metadata table `Spec Version` — must be identical |
| Date match | Metadata table `Date` | Metadata table `Date` — must be identical |
| Diagram accuracy | N/A | Mermaid diagram node counts and labels should match scan results (e.g., "30 Prompts" in System Context diagram matches actual prompt count) |

### Reporting

4. Report all findings grouped by category:
   - **Codebase drift** — spec content disagrees with source files
   - **FS↔TS drift** — functional spec disagrees with technical spec
   - **Diagram drift** — Mermaid diagram labels disagree with scan results
5. Do not modify any files

---

## Delta Mode

Compare current branch against `master` to produce a training-focused capability delta:

### Phase 1 -- Diff and Baseline

**Parallel batch** — read both branch states simultaneously:

| Sub-task | How | What to extract |
|----------|-----|-----------------|
| **Git diff** | `git diff --name-status master...HEAD` | All changed files categorized by type |
| **Master prompt content** | `git show master:{path}` for each prompt on master | Capability baseline — what each prompt could DO |
| **Master skill/guide content** | `git show master:{path}` for skills and guides | Full master capability inventory |
| **Current prompt content** | Read `src/prompts/` | Current capability inventory |
| **Current skill/guide content** | Read `src/i2a-skills/`, `doc/` | Current non-prompt capabilities |

All reads are independent — launch as a single parallel batch. Do NOT just compare file names; read the ACTUAL CONTENT to understand capability-level differences.

### Phase 2 -- Analyze Capability Impact

For each changed component, compare the content (not just file status) to determine capability-level impact:

- **New prompt:** read its full content; extract capabilities from headings, steps, and behavioral rules; classify role (EM/ADE/Both)
- **Modified prompt:** read BOTH the master version (`git show master:{path}`) and current version; summarize what the user can do NOW that they couldn't do BEFORE
- **Deleted prompt:** read the master version to understand what it did; identify what replaces it
- **Modified guide:** read both versions; identify what workflow knowledge changed
- **Config change:** diff both versions; note user action required
- **New/modified skill:** read full skill content; summarize capability additions

### Phase 3 -- Draft Delta Document

Follow the structure in `templates/release-capability-delta.tmpl.md`. The output MUST have exactly 5 parts:

**Part 1 — Capability Baseline (Master):**
- Enumerate ALL capabilities from master, not just changed ones
- Organize by role: EM, ADE, Test Management, Documentation, Quality Infrastructure
- Use table format: `# | Capability | Component | Details`
- Read actual prompt content from master (`git show master:{path}`) to describe capabilities accurately — do not guess from file names

**Part 2 — New Capabilities (Current Branch):**
- Only include capabilities that DO NOT EXIST on master (new prompts, new skills, new guides)
- Group by functional area (e.g., "Sprint Management", "Test Data", "Documentation")
- Same table format as Part 1 with detailed descriptions
- For new guides, use: `# | Guide | Who | What It Covers`

**Part 3 — Enhanced Capabilities (Existed on Master, Changed Behavior):**
- For each modified prompt/skill, create a before/after comparison table
- Use format: `Aspect | Master | Current`
- Only include aspects that ACTUALLY CHANGED — read both versions to compare
- Do not describe unchanged functionality

**Part 4 — Removed Capabilities:**
- Table format: `Removed | Replacement | Notes`
- Include migration notes (renamed, merged, split, deprecated)

**Part 5 — Training Recommendations:**
- Organize by role: Engineering Managers, Agentic Delivery Engineers, ACEs
- Within each role, use three priority tiers:
  - **Critical** (changes daily workflow): table with `# | Capability | Action | Impact`
  - **Important** (new capabilities to adopt): table with `# | Capability | Action | Impact`
  - **Informational** (be aware of): table with `# | Capability | What Changed`
- Critical tier = things that break if not learned; Important = new value available; Informational = context only

**Metadata header:**
- Use a table (not YAML frontmatter) with From/To fields that include component counts (e.g., "master (22 prompts, 1 skill, 3 guides)"), not just version numbers

### Phase 4 -- Review and Write

Present delta to ACE for review, then write `doc/contributing/release-capability-delta.md`.

---

## Delta Update Mode

Incremental refresh of an existing delta document. Use when the delta was previously generated but subsequent commits have added capabilities that need documenting. Faster than full regeneration because it preserves Part 1 (baseline) and Part 5 (training) structure, only adding newly-discovered content.

### Phase 1 -- Identify New Changes

1. Read the existing `doc/contributing/release-capability-delta.md`
2. Extract the `Generated` date from the metadata header
3. Run `git log --after={generated_date} --name-status` to find commits since the delta was last generated
4. Run `git diff --name-status {merge_base}...HEAD` to get the full diff against master
5. Compare the full diff against what is already documented in Parts 2, 3, and 4

**Identify gaps:**

| Gap Type | Detection Method |
|----------|-----------------|
| New skill not in Part 2 | `src/i2a-skills/tdgs-aidlc-*/SKILL.md` exists in diff as "A" but skill is not listed in Part 2's skill table |
| New prompt not in Part 2 | `src/prompts/tdgs-aidlc-*.prompt.md` exists in diff as "A" but prompt is not listed in Part 2 |
| Modified prompt not in Part 3 | Prompt marked "M" in diff but not listed in Part 3's enhancement tables |
| New guide not in Part 2 | `doc/*.md` marked "A" in diff but not listed in Part 2's guide table |
| Stale metadata | Branch name, component counts, date, or cross-references to spec versions are outdated |

### Phase 2 -- Draft Additions

For each gap identified:

- **New skill:** Read the skill's `SKILL.md` and `workflow.md`; extract capability summary, file inventory, tools, and templates. Draft a table row for Part 2's skill section.
- **New prompt:** Read the prompt content; extract capability, role, and key behavioral rules. Draft a table row for Part 2's appropriate functional-area section.
- **Modified prompt/skill:** Read BOTH the master version (`git show master:{path}`) and current version; identify aspects that changed. Draft a before/after row for Part 3.
- **Metadata fixes:** Update `To` branch name, `Generated` date, component counts, and any cross-references to spec versions or line counts that have drifted.

### Phase 3 -- Merge Into Existing Document

Apply changes surgically:

1. **Update metadata header** — Branch name, date, component counts
2. **Insert new Part 2 rows** — Add to appropriate sub-section tables; renumber rows if needed
3. **Insert new Part 3 entries** — Add new enhancement tables or rows to existing tables
4. **Update Part 5 references** — If new capabilities are Critical or Important for a role, add training rows; update any stale cross-reference numbers (sim line counts, spec versions)
5. Do NOT regenerate unchanged sections. Preserve existing prose and table content exactly.

### Phase 4 -- Review and Write

Present the incremental changes to the ACE for approval:

1. Show a summary of what was added/changed (gap count, new rows, metadata fixes)
2. For each new entry, present the drafted content
3. ACE can: **accept**, **modify**, or **skip**
4. Write approved changes to `doc/contributing/release-capability-delta.md`
