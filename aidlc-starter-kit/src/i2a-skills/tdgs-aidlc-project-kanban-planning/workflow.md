````markdown
# Kanban Planning Workflow — Orchestrator

**Goal:** Orchestrate full sprint-ready planning. Detect missing prerequisites (epics, sprint-status), delegate to existing BMAD skills to fill gaps, then generate kanban planning artifacts — a continuous-flow kanban plan, project dashboard, and Harvey Ball sprint metrics. These artifacts provide dependency-aware scheduling, real-time project visibility, and per-story quality tracking.

**Your Role:** You are a Planning Orchestrator. You coordinate the full planning pipeline — from epic creation through sprint status generation to kanban artifact production — giving the EM and ADEs complete visibility into project flow, dependencies, parallelism opportunities, and quality gates.

---

## PHASE 0: INITIALIZATION

### Mode Detection

Determine the invocation mode from user input:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **New** | No args, or kanban-plan.md does not exist | Full flow (Phases 0–4) |
| **Update** | `update` arg, or phrases like "change team size", "update parameters" | Load existing params, prompt for changes, skip to Phase 3 |

If the user passes `update` or uses an update trigger phrase **and** `{kanban_file}` exists:

1. Read existing parameters from the kanban-plan.md header:
   - `Team Size: {N}` → `ade_count`
   - `Hours/Day: {N}` → `hours_per_day` (default 6 if not in header)
   - `Contingency: {N}%` → `contingency_pct` (default 20 if not in header)
2. Display current values:
   ```
   ══════════════════════════════════════════════════════════════
   CURRENT PLAN PARAMETERS
   ══════════════════════════════════════════════════════════════

     Team Size:    {ade_count} ADE(s)
     Hours/Day:    {hours_per_day}h per ADE
     Contingency:  {contingency_pct}%

   What would you like to change? (Enter new values or press Enter to keep current)
   ══════════════════════════════════════════════════════════════
   ```
3. Accept any combination of new values, then skip Phases 1–2 and jump directly to Phase 3.

If `update` is passed but `{kanban_file}` does not exist, fall through to the New mode flow.

### User Input

Prompt the user for the following inputs before proceeding. If the user provides them inline (e.g., "generate kanban plan with 5 ADEs"), extract from the message.

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `ade_count` | Conditional | 1 | Number of ADEs — required unless `target_date` is provided |
| `target_date` | Conditional | none | Target dev completion date — alternative to `ade_count` (system calculates minimum ADEs needed) |
| `hours_per_day` | No | 6 | Productive hours per ADE per working day |
| `contingency_pct` | No | 20 | Buffer percentage added to calendar projections |

### Capacity Input Mode

If `ade_count` is not provided inline, present a choice:

```
How would you like to plan capacity?

  1. Specify team size — I know how many ADEs are available
  2. Specify target date — Calculate how many ADEs are needed

Enter 1 or 2:
```

**Option 1 (Team size):** Ask for ADE count directly:

> How many ADEs will be working in parallel on this project? (Enter a number, e.g., 1, 3, 5)

**Option 2 (Target date):** Ask for the target completion date:

> What is your target dev completion date? (Enter a date, e.g., 2026-07-15)

When Option 2 is chosen:
1. Proceed through Phase 1 and Phase 3 Step 1 (epic parsing) to calculate `total_hours`
2. Calculate available working days from today to the target date (exclude weekends)
3. Calculate minimum ADEs: `required_ades = ceil(total_hours / (available_days × hours_per_day))`
4. Present the result for confirmation:
   ```
   To complete ~{total_hours}h of work by {target_date} ({available_days} working days):

     Minimum ADEs needed: {required_ades}

   Proceed with {required_ades} ADEs? [Y/n or enter a different number]:
   ```
5. Use the confirmed ADE count for the remainder of the workflow

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_name`, `user_name`
- `communication_language`, `document_output_language`
- `implementation_artifacts`
- `planning_artifacts`
- `date` as system-generated current datetime
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

### Paths

- `epics_location` = `{planning_artifacts}`
- `epics_pattern` = `*epic*.md`
- `status_file` = `{implementation_artifacts}/sprint-status.yaml`
- `kanban_file` = `{implementation_artifacts}/kanban-plan.md`
- `dashboard_file` = `{implementation_artifacts}/dashboard.md`
- `metrics_file` = `{implementation_artifacts}/sprint-metrics.md`
- `epics_skill` = `.github/skills/bmad-create-epics-and-stories/`
- `sprint_skill` = `.github/skills/bmad-sprint-planning/`

---

## PHASE 1: PREREQUISITE CHECK

Scan the workspace to determine which planning artifacts already exist and which must be generated.

### 1.1: Hard Prerequisites (must already exist)

| Artifact | Search Pattern | Required? |
|----------|---------------|-----------|
| **PRD** | `{planning_artifacts}/*prd*.md` or `{planning_artifacts}/*prd*/index.md` | **YES** — cannot proceed without |
| **Architecture** | `{planning_artifacts}/*architecture*.md` or `{planning_artifacts}/*architecture*/index.md` | **YES** — cannot proceed without |

**If either is missing**, halt and display:

```
⛔ Missing prerequisite: {missing artifact}

Kanban planning requires a PRD and Architecture document.
Please run these BMAD skills first:
  1. /bmad-create-prd        → creates PRD
  2. /bmad-create-architecture → creates Architecture

Then re-run /tdgs-aidlc-project-kanban-planning.
```

### 1.2: Soft Prerequisites (can be generated)

| Artifact | Search Pattern | Present? | Action if Missing |
|----------|---------------|----------|-------------------|
| **Epics** | `{planning_artifacts}/*epic*.md` or `{planning_artifacts}/*epic*/index.md` | Check | → Phase 2A: Delegate to `bmad-create-epics-and-stories` |
| **Sprint Status** | `{implementation_artifacts}/sprint-status.yaml` | Check | → Phase 2B: Delegate to `bmad-sprint-planning` |

### 1.3: Report Findings

Display the prerequisite scan results to `{user_name}`:

```
📋 Prerequisite Scan — {project_name}

  ✅ PRD .......................... found at {path}
  ✅ Architecture ................. found at {path}
  {✅|❌} Epics ................... {found at {path} | MISSING — will generate}
  {✅|❌} Sprint Status ........... {found at {path} | MISSING — will generate}

{If all found:}
  All prerequisites met. Proceeding to kanban artifact generation (Phase 3).

{If gaps detected:}
  Missing artifacts detected. Starting prerequisite generation (Phase 2).
```

**If all soft prerequisites exist** → Skip Phase 2, jump directly to Phase 3.

---

## PHASE 2: DELEGATE — Fill Prerequisites

Execute only the sub-phases for missing artifacts, in order.

### Phase 2A: Generate Epics (if `epics.md` missing)

**Delegation target:** `bmad-create-epics-and-stories` skill

**Delegation mechanism:**

1. Verify the skill exists at `{epics_skill}`. If not found, display:
   ```
   ⚠️ Skill bmad-create-epics-and-stories not found at {epics_skill}.
   This BMAD skill must be installed. Run BMAD setup or install it manually.
   Cannot generate epics without it — halting.
   ```

2. If found, announce to the user:
   ```
   🔄 Phase 2A: Generating Epics

   Epics document not found. Delegating to bmad-create-epics-and-stories to create
   epics and user stories from your PRD and Architecture.

   This is an interactive process — you'll collaborate on epic design and story creation.
   When complete, we'll return here to continue with sprint status and kanban artifacts.

   --- Starting Epic & Story Creation ---
   ```

3. **Read and execute** the skill's workflow:
   - Read `{epics_skill}/workflow.md` completely
   - Follow its activation instructions (load config, greet user)
   - Execute its step-file architecture sequentially:
     - `{epics_skill}/steps/step-01-validate-prerequisites.md` — extract requirements
     - `{epics_skill}/steps/step-02-design-epics.md` — design epic list (user approves)
     - `{epics_skill}/steps/step-03-create-stories.md` — generate stories per epic (user reviews)
     - `{epics_skill}/steps/step-04-final-validation.md` — validate coverage
   - **CRITICAL**: Follow ALL rules from that skill — micro-file design, sequential enforcement, halt at menus, wait for user input
   - The skill will produce `{planning_artifacts}/epics.md`

4. **Return checkpoint** — after Step 4 completes, announce:
   ```
   ✅ Phase 2A Complete — Epics generated at {planning_artifacts}/epics.md

   Resuming kanban planning orchestration...
   ```

5. **Verify**: Confirm `{planning_artifacts}/*epic*.md` now exists. If not, halt with error.

### Phase 2B: Generate Sprint Status (if `sprint-status.yaml` missing)

**Delegation target:** `bmad-sprint-planning` skill

**Delegation mechanism:**

1. Verify the skill exists at `{sprint_skill}`. If not found, display:
   ```
   ⚠️ Skill bmad-sprint-planning not found at {sprint_skill}.
   This BMAD skill must be installed. Run BMAD setup or install it manually.
   Cannot generate sprint status without it — halting.
   ```

2. If found, announce to the user:
   ```
   🔄 Phase 2B: Generating Sprint Status

   Sprint status file not found. Delegating to bmad-sprint-planning to parse epics
   and generate sprint-status.yaml.

   This runs autonomously — no input needed from you.

   --- Starting Sprint Status Generation ---
   ```

3. **Read and execute** the skill's workflow:
   - Read `{sprint_skill}/workflow.md` completely
   - Follow its initialization (load config, resolve paths)
   - Execute its 5-step workflow:
     - Step 1: Parse epic files, extract all work items
     - Step 2: Build sprint status structure
     - Step 3: Apply intelligent status detection
     - Step 4: Generate sprint status file
     - Step 5: Validate and report
   - This is **fully autonomous** — no user interaction required
   - The skill will produce `{implementation_artifacts}/sprint-status.yaml`

4. **Return checkpoint** — after Step 5 completes, announce:
   ```
   ✅ Phase 2B Complete — Sprint status generated at {status_file}

   All prerequisites met. Proceeding to kanban artifact generation (Phase 3).
   ```

5. **Verify**: Confirm `{status_file}` now exists. If not, halt with error.

---

## PHASE 3: GENERATE — Kanban Artifacts

All prerequisites are now confirmed to exist. Load input files and generate the three kanban planning artifacts.

### Input Files

| Input | Path | Load Strategy |
|-------|------|---------------|
| Epics | `{planning_artifacts}/*epic*.md` (whole) or `{planning_artifacts}/*epic*/*.md` (sharded) | FULL_LOAD |
| Sprint Status | `{implementation_artifacts}/sprint-status.yaml` | FULL_LOAD |
| Architecture | `{planning_artifacts}/architecture.md` | FULL_LOAD (if exists — used for risk analysis) |
| Project Context | `**/project-context.md` | FULL_LOAD (if exists) |
| Story Files | `{implementation_artifacts}/*.md` | SCAN for existence and front-matter status |

### Epic Discovery

Follow the same discovery process as the sprint-planning skill:

1. **Search for whole document first** — `epics.md`, `bmm-epics.md`, or any `*epic*.md`
2. **Check for sharded version** — `epics/index.md` with section files
3. **Priority**: Whole document over sharded if both exist
4. **Fuzzy matching**: Be flexible with document names

---

### Generation Workflow

<workflow>

<step n="1" goal="Parse epics, extract stories, dependencies, and parallelism maps">

<action>Load all input files per the Input Files table above.</action>
<action>Communicate in {communication_language} with {user_name}.</action>

**For each epic, extract:**

- Epic number, title, and description
- All stories with IDs, titles, and acceptance criteria summaries
- **ADE Parallelism Maps** — look for tables or sections titled `ADE Parallelism Map`, `### ADE Parallelism Map`, or similar within each epic. These define which stories can run in parallel and which are integration gates.
- **Story dependencies** — extract from parallelism maps, story descriptions, or explicit "needs: X" references
- **FRs/ARs covered** — extract from story footers (e.g., `*Covers: FR1, FR2, AR1*`)

**For each story, classify complexity:**

Use heuristics based on acceptance criteria count, dependency fan-in, and story description:

| Complexity | T-Shirt | Heuristics | Default Dev Time |
|------------|:-------:|-----------|-----------------|
| Trivial | XS | ≤2 ACs, no dependencies on other stories, config-only or stub | 20–30 min |
| Simple | S | 2–4 ACs, ≤1 dependency, single service layer (DTO, exception, config) | 30–60 min |
| Medium | M | 3–6 ACs, 1–2 dependencies, repository + service pattern, moderate testing | 1–2h |
| Large | L | 7+ ACs or explicitly large scope (migration, proxy bundle, multi-file config) | 2–3h |
| Complex | XL | 5+ ACs, 2+ dependencies, integration/orchestration, concurrency, multi-layer | 3–6h |

If the epics document contains explicit complexity or estimate tags, use those instead of heuristics.

**Build the dependency graph:**

For each story, record:
- `depends_on`: list of story IDs that must complete first
- `unlocks`: list of story IDs that become pullable when this completes
- `is_integration`: true if this story integrates multiple predecessor stories (fan-in > 2)
- `parallel_group`: which stories can run simultaneously (from parallelism maps)

**Identify the critical path:**

The critical path is the longest chain of dependent stories through the project. Mark stories on the critical path with ⚡.

</step>

<step n="2" goal="Load current sprint status and detect story states">

<action>Read {status_file} and extract current status for every epic, story, and retrospective.</action>

**For each story, also check:**
- Does the story file exist in `{implementation_artifacts}/{story-key}.md`?
- If the story file exists, scan for front-matter `Status:` field or task checkbox completion ratio
- Calculate `impl` score: `floor(completed_tasks / total_tasks × 4)` from `- [x]` vs `- [ ]` counts

**Compute aggregate metrics:**
- Total stories, completed, in-progress, in-review, ready-for-dev, backlog
- Total epics, completed, in-progress
- Hours burned estimate (sum dev time estimates for stories at `done` or `review` status)

</step>

<step n="3" goal="Generate kanban-plan.md">

<action>Create or update {kanban_file} with the following sections:</action>

### 3.1: Header & Metadata

```markdown
# Kanban Plan — {project_name}

**Project:** {project_name}
**Date:** {date}
**Team Size:** {ade_count} ADE(s) (AI-assisted)
**Method:** Continuous flow — no fixed sprint duration. Pull next item when current item is done and dependencies are met.
```

### 3.2: Velocity Baseline

Generate a complexity-to-time mapping table:

```markdown
## Velocity Baseline

| Complexity | T-Shirt | Examples | Dev Time | + Workflow Overhead | Total per Story |
|------------|:-------:|----------|----------|--------------------:|----------------:|
| Trivial | XS | {examples from parsed stories} | ~20–30 min | +15 min | ~0.7h |
| Simple | S | {examples} | ~30–60 min | +20 min | ~1h |
| Medium | M | {examples} | ~1–2h | +30 min | ~2h |
| Large | L | {examples} | ~2–3h | +30 min | ~3.5h |
| Complex | XL | {examples} | ~3–6h | +45 min | ~6h |
```

**Working assumptions:** `~{hours_per_day} productive hours/day/ADE.`

### 3.3: Engineering Workflow Overhead

Generate per-story overhead table:

```markdown
## Engineering Workflow Overhead

### Per-Story Workflow (added to every story)

| Step | Who | Time | Concurrent? |
|------|-----|------|-------------|
| Create feature branch + develop + commit(s) | ADE | (included in dev time) | — |
| Create PR with description | ADE | ~5 min | No |
| CI runs (build, test, lint) | CI | ~5–15 min | Yes — ADE starts next story |
| Copilot automated review | CI | ~3–5 min | Yes — runs alongside CI |
| Read & triage Copilot findings | ADE | ~5 min | No |
| Manual code review | Reviewer | ~10–20 min | Partially |
| Address review feedback (if any) | ADE | ~5–15 min | No |
| Merge PR + verify CI passes | ADE | ~5 min | No |

**Blended per-story overhead: ~25 min average**
```

### 3.4: Overhead Summary

Calculate total hours:

```markdown
### Overhead Summary

| Category | Hours |
|----------|------:|
| Pure dev ({story_count} stories) | {sum_dev_hours}h |
| Per-story workflow overhead (~25 min × {story_count}) | {overhead_hours}h |
| Story spec creation (~15 min × {stories_needing_specs} stories) | {spec_hours}h |
| Periodic overhead (build verify, integration test, rebasing) | {periodic_hours}h |
| **Total person-hours** | **~{total_hours}h** |
```

**Story spec creation:** Count only stories that do not yet have a story file in `{implementation_artifacts}/`. Each spec takes ~15 min to generate via `/bmad-quick-dev` in spec mode. Stories that already have spec files (status beyond `backlog`) are excluded from this count.

### 3.5: Dependency Graph

Render the full dependency graph using ASCII art:

```markdown
## Dependency Graph

(ASCII art showing epic → story dependencies, parallel groups, and critical path markers ⚡)
```

Include: `**Critical path:** {critical_path_description}`

### 3.6: Per-Epic Estimates

```markdown
## Per-Epic Estimates (with overhead)

| Epic | Stories | Size Breakdown | Dev | Workflow Overhead | Spec Creation | Build Verify | Total |
|------|--------:|----------------|----:|------------------:|--------------:|-------------:|------:|
| {for each epic} | | {XS:n, S:n, M:n, L:n, XL:n} | | | | | |
| **Total** | **{story_count}** | | **~{sum}h** | **~{sum}h** | **~{sum}h** | **~{sum}h** | **~{total}h** |
```

### 3.7: Continuous Flow Timeline

Generate TWO timelines:

**A) Sequential (1 ADE):**
ASCII Gantt chart showing stories in pull order, with cumulative hours.

**B) Parallel ({ade_count} ADEs):**
ASCII Gantt chart showing ADE assignments based on parallelism maps and dependency gates. Each ADE gets a column. Integration stories (fan-in) are assigned to a single "critical path ADE" to maintain context.

Rules for parallel assignment:
- Stories in the same parallel group are distributed across ADEs
- Integration stories are assigned to ADE-A (critical path owner)
- No ADE starts a story whose dependencies aren't complete
- When an ADE finishes all assigned parallel stories, they pull the next available from the priority queue
- If an ADE would be idle (blocked on dependencies), assign productive blocked-period activities: PR reviews, story file creation, integration test prep

### 3.8: Pull Sequence

```markdown
## Pull Sequence — Single ADE

| # | Story | Epic | Size | Total Est. | Cumulative | Dependency Gate |
|---|-------|------|:----:|----------:|----------:|-----------------|
| {ordered by dependency-aware priority} | | | {XS/S/M/L/XL} | | | |
```

For multi-ADE, generate per-ADE pull sequences.

### 3.9: Key Milestones

```markdown
## Key Milestones

| Milestone | Sequential Hour | Multi-ADE Hour | What Unlocks | Integration Check? |
|-----------|----------------:|---------------:|--------------|--------------------|
| {for each epic completion and major unlock point} |
```

### 3.10: Calendar Projection

Calculate working days from total hours ÷ ({ade_count} × {hours_per_day}):

```markdown
## Calendar Projection

| | Sequential (1 ADE) | Parallel ({ade_count} ADEs) |
|--|--------------------|--------------------|
| **Working days remaining** | ~{days} days | ~{days} days |
| **With {contingency_pct}% buffer** | ~{days} days | ~{days} days |
```

### 3.11: WIP Limits & Pull Rules

```markdown
## WIP Limits & Pull Rules

| Rule | Detail |
|------|--------|
| **WIP limit (single ADE)** | 1 story in dev + up to 1 PR awaiting review |
| **WIP limit (multi-ADE)** | 1 story per ADE + up to 2 PRs awaiting review per ADE |
| **Pull trigger** | Finish story → pull next with met dependencies |
| **Priority order** | Critical path first, then items that unblock the most downstream work |
| **Story order within epic** | Follow parallelism map; integration stories last |
| **Review SLA** | Review within 1 hour of PR creation |
| **Blocked protocol** | Review PRs → create story files → integration test prep → update dashboard |
| **Handoff** | On epic completion: update sprint-status.yaml, run build verification |
```

### 3.12: Utilization Analysis

Calculate per-ADE utilization — productive hours vs idle/wait hours:

```markdown
## Utilization Analysis

| ADE | Dev + Workflow | Idle/Wait | Total | Utilization |
|-----|---------------|-----------|-------|-------------|
| {for each ADE} |
| **Combined** | **{sum}h** | **{sum}h** | **{sum}h** | **{pct}%** |
```

Goal: 0% dead wait by filling blocked periods with productive activities.

### 3.13: Risks & Mitigations

Derive risks from:
- Critical path bottlenecks (single-story gates)
- Complex stories (highest estimate variance)
- External dependencies (PIS, database grants, etc. — from architecture.md)
- Parallel ADE merge conflicts

```markdown
## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| {derived from analysis} |
```

### 3.14: Timeline Comparison

```markdown
## Timeline Comparison

| Metric | Sequential (1 ADE) | Parallel ({ade_count} ADEs) |
|--------|--------------------|--------------------|
| Person-hours | ~{h}h | ~{h}h |
| Wall-clock hours | ~{h}h | ~{h}h |
| Working days (raw) | ~{d} days | ~{d} days |
| Working days (with buffer) | ~{d} days | ~{d} days |
| Calendar weeks | ~{w} wk | ~{w} wk |
```

### 3.15: Footer

```markdown
---
*Kanban plan created: {date} | Source: epics.md, sprint-status.yaml, architecture.md*
```

</step>

<step n="4" goal="Generate dashboard.md">

<action>Create or update {dashboard_file} with the following sections:</action>

### 4.1: Header & Overall Progress

```markdown
# Project Dashboard — {project_name}

**Project:** {project_name} | **Date:** {date} | **Team:** {ade_count} ADE(s) (AI-assisted)

---

## Overall Progress

(ASCII progress bars — 30 chars wide, filled proportionally)

Stories Completed:  {bar}  {done} / {total}  ({pct}%)
Dev Hours Burned:   {bar}  ~{burned}h / ~{total}h  ({pct}%)
Epics Completed:    {bar}  {done} / {total}  ({pct}%)

| Metric | Value |
|--------|-------|
| **Total Stories** | {total} |
| **Completed** | {done} ({pct}%) |
| **In Review** | {review} ({pct}%) |
| **In Progress** | {in_progress} ({pct}%) |
| **Ready for Dev** | {ready} ({pct}%) |
| **Backlog** | {backlog} ({pct}%) |
```

### 4.2: Story Status Breakdown

ASCII horizontal bar chart showing count per status category.

### 4.3: Epic Status Overview

```markdown
## Epic Status Overview

| # | Epic | Status | Stories | Done | Progress | Est. Hours | ADE Parallelism |
|---|------|--------|--------:|-----:|---------:|-----------:|-----------------|
```

**Status indicators use Harvey Ball symbols:**
- ○ Backlog (0% stories done)
- ◔ In Progress (<25% stories done)
- ◑ In Progress (25–50% stories done)
- ◕ In Progress (50–75% stories done)
- ● Done (100% stories done)

**Progress column** uses a 30-char ASCII bar: `██████░░░░░░░░░░░░░░░░░░░░░░░░`

### 4.4: Current Work & Immediate Actions

**Needs Attention Now:** List stories in `review` or `in-progress` status with any blockers.

**Ready to Pull:** Ordered list of stories whose dependencies are met, showing priority, complexity, and assigned ADE suggestion.

### 4.5: Critical Path Visualization

```markdown
## Critical Path

{ASCII diagram showing critical path stories with current status percentages and ⚡ markers}

**Bottleneck:** {identify the current blocking story/dependency}
```

### 4.6: Dependency Unlock Map

```markdown
## Dependency Unlock Map

| When This Completes | These Unlock |
|---------------------|-------------|
| {for each story that unlocks others} |
```

### 4.7: Timeline Tracker

```markdown
## Timeline Tracker

### Kanban Plan (continuous flow)

| Milestone | Planned Hour (Sequential) | Planned Hour ({ade_count} ADEs) | Actual Hour | Status |
|-----------|-------------------------:|----------------------:|-------------|--------|
| {for each milestone from kanban-plan.md} |
```

### 4.8: Calendar Projection

Same format as kanban-plan.md section 3.10, with target dates calculated from current date.

### 4.9: Story Files Created vs Needed

```markdown
## Story Files Created vs. Needed

| Epic | Stories | Files Created | Status |
|------|--------:|:-------------:|--------|
| {for each epic, count story files that exist} |
```

### 4.10: Risk Register

```markdown
## Risk Register

| # | Risk | Likelihood | Impact | Status |
|---|------|:----------:|:------:|--------|
| {from kanban-plan risks, with status indicators: ⚪ Not encountered, 🟡 Active, 🔴 Realized} |
```

### 4.11: DevOps Readiness

```markdown
## DevOps Readiness

| Item | Status | Notes |
|------|--------|-------|
| {Git repo, CI/CD, branch protection, PR template, deployment pipeline} |
```

Derive items from architecture.md and project-context.md if available.

### 4.12: Velocity & Capacity

```markdown
## Velocity & Capacity

| Metric | Observed | Projected |
|--------|----------|-----------|
| **Stories/day (1 ADE)** | {from completed stories or estimate} | — |
| **Hours/story (avg)** | {blended average} | — |
| **Daily capacity ({ade_count} ADEs)** | ~{hours} productive hours | — |
| **Remaining work** | — | ~{hours}h ({stories} stories + overhead) |
| **Days to complete** | — | ~{d} raw / ~{d} buffered |
```

### 4.13: Next Steps

```markdown
## Next Steps (Recommended Actions)

1. {prioritized actionable items based on current state}
```

### 4.14: Footer

```markdown
---
*Dashboard created: {date} | Source: sprint-status.yaml, kanban-plan.md, epics.md*
```

</step>

<step n="5" goal="Generate sprint-metrics.md">

<action>Create or update {metrics_file} with the following sections:</action>

### 5.1: Header & Methodology

```markdown
# Sprint Metrics — Harvey Ball Quality Report

**Project:** {project_name}
**Generated:** {date}
**Last Updated:** {date}
**Methodology:** Harvey Ball scale (0–4) across 7 quality dimensions per story
```

### 5.2: Harvey Ball Legend

```markdown
## Harvey Ball Legend

| Symbol | Score | Meaning |
|:------:|:-----:|---------|
| ○ | 0 | Not started / N/A |
| ◔ | 1 | Minimal / Major issues |
| ◑ | 2 | Partial / Moderate issues |
| ◕ | 3 | Mostly complete / Minor issues |
| ● | 4 | Complete / Fully compliant |
```

### 5.3: Metric Definitions

```markdown
## Metric Definitions

| Metric | What It Measures |
|--------|-----------------|
| **impl** | Task/subtask completion ratio: `floor(completedTasks / totalTasks × 4)` |
| **test** | Test coverage & pass rate (4=80%+, 3=60–79%, 2=40–59%, 1=20–39%, 0=<20%) |
| **review** | Code review status (4=approved no issues, 3=minor, 2=changes requested, 1=major, 0=not reviewed) |
| **docs** | Documentation completeness — sections present: Dev Notes, File List, Change Log |
| **arch** | Architecture compliance (4=fully compliant, 3=minor drift, 2=partial, 1=deviations, 0=not following) |
| **qa** | QA gate status (4=passed, 3=passed with notes, 2=concerns, 1=failed, 0=not assessed) |
| **a11y** | Accessibility (4=WCAG AA, 3=minor issues, 2=moderate, 1=major, 0=N/A for non-UI/API stories) |
```

**Composite score calculation:**
- For non-UI/API stories where `a11y = 0 (N/A)`: average the 6 non-a11y metrics
- For UI stories: average all 7 metrics including a11y

### 5.4: Story Metrics Summary Table

```markdown
## Story Metrics Summary

| Story | Status | impl | test | review | docs | arch | qa | a11y | Composite |
|-------|--------|:----:|:----:|:------:|:----:|:----:|:--:|:----:|:---------:|
| {for each story across all epics} |
```

**Scoring rules per story:**

For stories with status `backlog` or `ready-for-dev` (no work started):
- All metrics = `○ 0`, Composite = `0.0`

For stories with status `in-progress`, `review`, or `done`:
- **impl**: Read the story file, count `- [x]` (completed) vs `- [ ]` (incomplete) task checkboxes. Score = `floor(completed / total × 4)`.
- **test**: Check if story file mentions test results, coverage, or test counts. Score based on described coverage level. Default `○ 0` if no test information found.
- **review**: Check story status field. `review` = `◑ 2` minimum, `done` with review notes = `◕ 3` or `● 4`. Look for review-related sections in story file.
- **docs**: Check for presence of `## Dev Notes`, `## File List` or file listings, `## Change Log` or changelog sections. Score 1 per section found, max 4 if additional docs present.
- **arch**: Default `◕ 3` for in-progress stories (assume following architecture). Upgrade to `● 4` if story file explicitly confirms architecture compliance. Downgrade if drift noted.
- **qa**: `○ 0` for in-progress, `◑ 2` for review (not yet passed), `◕ 3` or `● 4` for done with QA notes.
- **a11y**: `○ 0` for API/backend stories (N/A). Score 1–4 for UI stories based on a11y notes.

### 5.5: Per-Story Rationale

For each story that has been scored above `0.0` (i.e., work has started), generate:

```markdown
### Story {id} — {title} ({status})

| Metric | Score | Rationale |
|--------|:-----:|-----------|
| impl | {score} | {explanation based on task completion} |
| test | {score} | {explanation} |
| review | {score} | {explanation} |
| docs | {score} | {explanation} |
| arch | {score} | {explanation} |
| qa | {score} | {explanation} |
| a11y | {score} | {explanation} |
```

### 5.6: Aggregate Metrics

**By Epic:**

```markdown
## Aggregate Metrics

### By Epic

| Epic | Stories | Avg Composite | Min | Max | Stories ≥ 3.0 |
|------|--------:|--------------:|----:|----:|--------------:|
| {for each epic} |
```

**By Metric:**

```markdown
### By Metric (across all stories)

| Metric | Avg Score | Stories at 4 | Stories at 0 |
|--------|----------:|-------------:|-------------:|
| {for each of the 7 metrics} |
```

### 5.7: Quality Trends

```markdown
## Quality Trends

| Checkpoint | Date | Stories Done | Avg Composite | Notes |
|------------|------|------------:|:-------------:|-------|
| {current checkpoint — add row each time metrics are regenerated} |
```

Preserve existing rows if the metrics file already exists. Append the current checkpoint.

### 5.8: Quality Gaps

Scan the Story Metrics Summary table from 5.4 and identify any non-backlog story where a metric scores ≤1. Group by metric to produce actionable gap entries.

```markdown
### Quality Gaps

| Priority | Gap | Stories | Action |
|----------|-----|---------|--------|
| {for each metric with avg ≤ 1.5 or any story scoring 0–1} |
```

**Priority assignment:**
- **HIGH** — any metric at 0 for an in-progress or review story, or avg ≤ 1.0 across all stories
- **MEDIUM** — any metric at 1 for an in-progress or review story, or avg ≤ 2.0 across all stories
- **LOW** — any metric at 1 for a ready-for-dev story (gap exists but work hasn't started)

If no gaps are found (e.g., all stories are still in backlog), output:

```markdown
### Quality Gaps

No quality gaps identified — all stories are in backlog or all metrics meet thresholds.
```

### 5.9: Quality Gates

```markdown
## Quality Gates

### Minimum Quality Thresholds

| Gate | Threshold | Enforcement |
|------|-----------|------------|
| **Story completion** | Composite ≥ 3.0 | Story cannot be marked done below threshold |
| **Epic completion** | All stories ≥ 3.0, avg ≥ 3.5 | Epic cannot close below threshold |
| **Production readiness** | All stories ≥ 3.0, no metric at 0 (except a11y for API stories) | No deployment below threshold |

### Current Status vs. Gates

| Gate | Status | Met? |
|------|--------|:----:|
| {evaluate each gate against current metrics} |
```

### 5.10: Footer

```markdown
---
*Metrics generated: {date} | Source: sprint-status.yaml, story files*
*Next update: {suggest when — e.g., "After Story X.Y review closes"}*
```

</step>

<step n="6" goal="Validate and report">

<action>Perform validation checks:</action>

- [ ] `kanban-plan.md` — all stories from epics appear in pull sequence
- [ ] `kanban-plan.md` — critical path identified and marked
- [ ] `kanban-plan.md` — dependency graph matches parallelism maps from epics
- [ ] `kanban-plan.md` — both sequential and parallel timelines generated
- [ ] `kanban-plan.md` — total hours consistent across sections (summary, per-epic, timeline)
- [ ] `dashboard.md` — story counts match sprint-status.yaml
- [ ] `dashboard.md` — epic statuses match sprint-status.yaml
- [ ] `dashboard.md` — ready-to-pull queue matches dependency analysis
- [ ] `sprint-metrics.md` — all stories from sprint-status.yaml appear in metrics table
- [ ] `sprint-metrics.md` — composite scores calculated correctly
- [ ] `sprint-metrics.md` — quality gate evaluation matches current scores

<action>Display completion summary:</action>

```
Kanban Planning Artifacts Generated Successfully

  ✅ {kanban_file}
     - {story_count} stories across {epic_count} epics
     - Critical path: {critical_path_summary}
     - Sequential: ~{seq_hours}h ({seq_days} days) | Parallel ({ade_count} ADEs): ~{par_hours}h ({par_days} days)

  ✅ {dashboard_file}
     - Progress: {done}/{total} stories ({pct}%)
     - Ready to pull: {ready_count} stories
     - Target date: {target_date} (with {contingency_pct}% buffer)

  ✅ {metrics_file}
     - {scored_count}/{total} stories scored
     - Avg composite: {avg_composite}/4.0
     - Quality gate: {met/not met}
```

</step>

<step n="7" goal="Generate live sprint dashboard HTML">

<action>Generate the live HTML sprint dashboard by delegating to the sprint dashboard skill.</action>

**Delegation target:** `tdgs-aidlc-sprint-dashboard` skill

1. Verify the skill exists at `.github/i2a-skills/tdgs-aidlc-sprint-dashboard/workflow.md`. If not found, skip this step and display:
   ```
   ⚠️ Sprint dashboard skill not found. Run /tdgs-aidlc-generate-dashboard manually.
   ```

2. If found, read and execute `.github/i2a-skills/tdgs-aidlc-sprint-dashboard/workflow.md`:
   - The skill will discover epics, parse the kanban-plan.md just generated (for milestones, risks, complexity, critical path, velocity), and produce `{implementation_artifacts}/sprint-dashboard.html`
   - Pass the same `ade_count` used in this workflow

3. After generation, include in the completion summary:
   ```
   ✅ {implementation_artifacts}/sprint-dashboard.html
      - Live auto-refreshing dashboard (reads sprint-status.yaml + sprint-metrics.md)
      - View: cd {implementation_artifacts} && python3 -m http.server 8080
   ```

<action>Display final summary with next steps:</action>

```
Next Steps:
  1. Review the generated artifacts
  2. View live dashboard: cd {implementation_artifacts} && python3 -m http.server 8080
  3. ADEs begin pulling from the "Ready to Pull" queue
  4. Re-run this workflow to refresh metrics and dashboard as stories progress
```

</step>

</workflow>

## Additional Documentation

### Orchestrator Behavior Summary

This skill operates as an **orchestrator** that delegates to existing BMAD skills when prerequisites are missing:

```
/tdgs-aidlc-project-kanban-planning [update]
  │
  ├─ Phase 0: Detect mode (new vs update), load config
  │    ├─ Capacity input: ADE count OR target date
  │    └─ Update mode: load existing params → prompt for changes → skip to Phase 3
  │
  ├─ Phase 1: Scan for PRD ✔, Architecture ✔, Epics ?, Sprint Status ?
  │
  ├─ Phase 2A (if epics missing):
  │    └─ Delegate to bmad-create-epics-and-stories
  │       → Interactive 4-step flow (user approves epics & stories)
  │       → Produces: epics.md
  │
  ├─ Phase 2B (if sprint-status missing):
  │    └─ Delegate to bmad-sprint-planning
  │       → Autonomous 5-step flow (no user input needed)
  │       → Produces: sprint-status.yaml
  │
  ├─ Phase 3: Generate kanban artifacts
  │    → kanban-plan.md, dashboard.md, sprint-metrics.md
  │
  └─ Phase 4: Generate live sprint dashboard
       └─ Delegate to tdgs-aidlc-sprint-dashboard
          → Produces: sprint-dashboard.html (auto-refreshing HTML)
```

### Skip / Refresh Modes

| Scenario | What Happens |
|---|---|
| Fresh project (no epics, no status) | Full flow: Phase 2A → 2B → 3 |
| Epics exist, no status | Skip 2A → Phase 2B → 3 |
| Both exist | Skip Phase 2 entirely → Phase 3 (refresh mode) |
| Kanban artifacts already exist | Phase 3 overwrites with fresh data |
| `update` mode with existing kanban-plan.md | Load params → prompt for changes → skip to Phase 3 |
| `update` mode without kanban-plan.md | Falls through to New mode (full flow) |
| Target date provided (Option 2) | Parse epics first to calculate total hours, then derive ADE count |

### Delegated Skill Dependencies

This orchestrator reads and executes the step files from these installed BMAD skills:

| Skill | Location | Installed By | Interaction |
|-------|----------|-------------|-------------|
| `bmad-create-epics-and-stories` | `.github/skills/bmad-create-epics-and-stories/` | BMAD installer | Interactive (user approves) |
| `bmad-sprint-planning` | `.github/skills/bmad-sprint-planning/` | BMAD installer | Autonomous |

If BMAD upgrades these skills, the orchestrator automatically uses the new versions since it reads their files at runtime — no duplication of logic.

This skill does NOT modify `sprint-status.yaml` during Phase 3 — it only reads it. Phase 2B delegates to `bmad-sprint-planning` which creates it.

### When to Re-Run

Re-run this workflow to refresh all three kanban artifacts when:
- Stories change status (new completions, new in-progress)
- Team size changes (use `update` mode to change `ade_count`)
- Epics are modified (stories added/removed/re-scoped)
- After each epic completion (milestone checkpoint)
- Capacity assumptions change (hours/day, contingency, target date)

On re-run, Phase 1 will detect that epics and sprint-status already exist and skip directly to Phase 3 (refresh mode). Use the `update` argument to change plan parameters without re-running prerequisite checks.

### Complexity Classification Reference

When the epics document doesn't contain explicit complexity tags, use these classification heuristics:

| Signal | Complexity (T-Shirt) |
|--------|---------------------|
| Config-only, stub, or boilerplate | Trivial (XS) |
| Single DTO, exception class, or constant file | Simple (S) |
| Repository + Service interface + impl, moderate test suite | Medium (M) |
| Multi-file config (Apigee proxy), large migration, cross-cutting concern | Large (L) |
| Orchestration of 3+ components, concurrency, external integration | Complex (XL) |

### Harvey Ball Scoring Quick Reference

| Metric | Score 0 | Score 1 | Score 2 | Score 3 | Score 4 |
|--------|---------|---------|---------|---------|---------|
| impl | 0% tasks | 1–25% | 26–50% | 51–75% | 76–100% |
| test | <20% coverage | 20–39% | 40–59% | 60–79% | 80%+ |
| review | Not reviewed | Major issues | Changes requested | Minor issues | Approved clean |
| docs | None | 1 section | 2 sections | 3 sections | Complete + extra |
| arch | Not following | Deviations | Partial | Minor drift | Fully compliant |
| qa | Not assessed | Failed | Concerns | Passed w/ notes | Passed clean |
| a11y | N/A (API) | Major issues | Moderate | Minor issues | WCAG AA |

````
