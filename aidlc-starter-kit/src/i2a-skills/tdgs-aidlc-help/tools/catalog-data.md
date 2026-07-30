# AIDLC Prompt & Skill Catalog Data

> **Single-source-of-truth note:** The canonical user-facing reference is [`doc/prompt-reference.md`](../../../../doc/prompt-reference.md). This file mirrors that content in a skill-consumable format. When updating prompt/skill entries, update `prompt-reference.md` first and then sync changes here.

On-demand reference for Phase 3 (DETAIL mode). Each entry provides the structured detail block for one prompt or skill.

---

## Setup / Infrastructure

### /tdgs-aidlc-quick-setup

- **Role:** Both
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Setup
- **Description:** Install or upgrade BMAD and AIDLC prompts in the current workspace. Verifies prerequisites (Node v20+, Python 3.10+, uv), reads the BMAD version from the starter kit, installs/upgrades BMAD, and copies prompts, skills, and config into `.github/`.
- **Syntax:**
  ```
  /tdgs-aidlc-quick-setup
  /tdgs-aidlc-quick-setup update-workspace
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | mode | CLI argument (`update-workspace`) | No |
  | i2a-config | `.github/i2a-config/*.yaml` | Only for `update-workspace` mode |
- **Prerequisites:** Node v20+, Python 3.10+, uv
- **Example:** `/tdgs-aidlc-quick-setup`
- **Next Steps:** `/tdgs-aidlc-setup-workspace`, `/tdgs-aidlc-install-hooks`

---

### /tdgs-aidlc-setup-workspace

- **Role:** Both
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Setup
- **Description:** First-time full workspace initialization. Validates the full toolchain (Git, Node, Python, uv, gh CLI, gh auth), installs BMAD, creates docs repo with standard folder structure, and writes `i2a-config`.
- **Syntax:**
  ```
  /tdgs-aidlc-setup-workspace {persona}
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | persona | CLI argument (`em` or `ade`) | Yes |
  | toolchain | Runtime checks | Yes (auto-validated) |
- **Prerequisites:** Git, Node v20+, Python 3.10+, uv, gh CLI with auth
- **Example:** `/tdgs-aidlc-setup-workspace ade`
- **Next Steps:** `/tdgs-aidlc-install-hooks`, start workflow prompts for your role

---

### /tdgs-aidlc-install-hooks

- **Role:** All
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Setup
- **Description:** Install pre-commit hooks (Gitleaks + conventional commit) across worker repos. Detects OS and package manager, installs `pre-commit` and `gitleaks` if needed, and runs `pre-commit install` in each applicable repo.
- **Syntax:**
  ```
  /tdgs-aidlc-install-hooks
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | worker_repos | `i2a-config` | Yes (auto-read) |
- **Prerequisites:** `/tdgs-aidlc-setup-workspace` or `/tdgs-aidlc-quick-setup`
- **Example:** `/tdgs-aidlc-install-hooks`
- **Next Steps:** `/tdgs-aidlc-initiate-issue`, `/tdgs-aidlc-switch`

---

### /tdgs-aidlc-reference-sync

- **Role:** Both
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Setup
- **Description:** Sync shared service documentation from an external repository into the local knowledge base. Uses GitHub MCP to read docs, filters by `common_services` config, and runs gap analysis.
- **Syntax:**
  ```
  /tdgs-aidlc-reference-sync
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | owner/repo | Prompted at runtime | Yes |
  | branch | Prompted (default: `master`) | No |
  | common_services | `i2a-config` | Yes (auto-read) |
- **Prerequisites:** GitHub MCP or `gh` CLI authenticated
- **Example:** `/tdgs-aidlc-reference-sync`
- **Next Steps:** `/tdgs-aidlc-initiate-issue`

---

## Issue / Project Initiation

### /tdgs-aidlc-initiate-issue

- **Role:** ADE
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Issue/Project
- **Description:** Start work on a new feature, hotfix, project story, or bug. Creates branches in the docs repo, fetches issue details from GitHub, and generates a change-brief or bug-brief.
- **Syntax:**
  ```
  /tdgs-aidlc-initiate-issue {issue_id} {type}
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | issue_id | CLI argument | Yes |
  | type | CLI argument (`feature`, `hotfix`, `project`, `bug`) | Yes |
  | i2a-config | `.github/i2a-config/*.yaml` | Yes (auto-read) |
- **Prerequisites:** Clean working tree, workspace set up
- **Example:** `/tdgs-aidlc-initiate-issue 42 feature`
- **Next Steps:** `/tdgs-aidlc-reference-sync`, `/bmad-quick-dev`, `/tdgs-aidlc-prepare-repos`
- **Related BMAD:** `/bmad-quick-dev`, `/bmad-dev-story`, `/bmad-code-review` (recommended)

---

### /tdgs-aidlc-initiate-project

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Category:** Issue/Project
- **Description:** Start full BMAD project planning for a multi-sprint initiative. Creates `project/` and `planning/` branches in the docs repo, scaffolds docs directory structure, and generates the project change brief.
- **Syntax:**
  ```
  /tdgs-aidlc-initiate-project {issue_id}
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | issue_id | CLI argument | Yes |
  | i2a-config | `.github/i2a-config/*.yaml` | Yes (auto-read) |
- **Prerequisites:** Docs repo on master branch
- **Example:** `/tdgs-aidlc-initiate-project 100`
- **Next Steps:** `/tdgs-aidlc-reference-sync`, `/bmad-product-brief`, `/bmad-create-prd`
- **Related BMAD:** `/bmad-product-brief`, `/bmad-create-prd`, `/bmad-create-architecture`, `/bmad-create-epics-and-stories`, `/bmad-sprint-planning`, `/bmad-create-story` (recommended)

---

### /tdgs-aidlc-show-available-stories

- **Role:** ADE
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Issue/Project
- **Description:** Read-only discovery — view which stories are available for pickup from the current project. Evaluates dependency status and branch-based claim detection.
- **Syntax:**
  ```
  /tdgs-aidlc-show-available-stories [--epic {N}]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | --epic N | CLI flag | No |
  | sprint-status.yaml | Docs repo | Yes (auto-read) |
  | worker_repos | `i2a-config` | Yes (auto-read) |
- **Prerequisites:** Docs repo on `project/*` or `planning/*` branch, `sprint-status.yaml` exists
- **Example:** `/tdgs-aidlc-show-available-stories --epic 2`
- **Next Steps:** `/tdgs-aidlc-prepare-repos {spec-path}`

---

## Development Workflow

### /tdgs-aidlc-prepare-repos

- **Role:** ADE
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Dev Workflow
- **Description:** Create dev branches in worker repos before starting implementation. Detects workflow type, parses spec for affected repos, and creates tiered branches.
- **Syntax:**
  ```
  /tdgs-aidlc-prepare-repos [spec-file]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | spec-file | CLI argument or auto-detected | No |
  | worker_repos | `i2a-config` | Yes (auto-read) |
  | change-brief / bug-brief | Docs repo | Yes (auto-read) |
- **Prerequisites:** `/tdgs-aidlc-initiate-issue` completed
- **Example:** `/tdgs-aidlc-prepare-repos specs/1-2-auth-service.md`
- **Next Steps:** `/bmad-quick-dev` or `/bmad-dev-story`, `/tdgs-aidlc-commit`, `/tdgs-aidlc-create-pull-request`

---

### /tdgs-aidlc-switch

- **Role:** Both
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Dev Workflow
- **Description:** Switch the workspace to a different issue or role (EM ↔ ADE). Checks all repos for uncommitted changes, resolves target branches by issue ID and role, and checks out correct branches.
- **Syntax:**
  ```
  /tdgs-aidlc-switch {issue_id} [role] [spec_path]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | issue_id | CLI argument | Yes |
  | role | CLI argument (`em` or `ade`) | No |
  | spec_path | CLI argument | No |
  | worker_repos | `i2a-config` | Yes (auto-read) |
- **Prerequisites:** Clean working tree (no uncommitted changes)
- **Example:** `/tdgs-aidlc-switch 42 ade`
- **Next Steps:** Continue with workflow for the target issue

---

### /tdgs-aidlc-commit

- **Role:** Both
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Dev Workflow
- **Description:** Stage and commit changes across workspace repos with conventional commit format and `Refs` footer. Scans all repos, validates branch is not protected, reviews diffs for secrets, and generates commit message.
- **Syntax:**
  ```
  /tdgs-aidlc-commit
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | uncommitted changes | Git working tree | Yes |
  | branch name | Current branch | Yes (auto-read) |
- **Prerequisites:** Uncommitted changes in at least one repo
- **Example:** `/tdgs-aidlc-commit`
- **Next Steps:** `/tdgs-aidlc-pre-check-pull-request`, `/tdgs-aidlc-create-pull-request`

---

### /tdgs-aidlc-pre-check-pull-request

- **Role:** ADE
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Dev Workflow
- **Description:** Run CI pipeline locally before creating a PR. Validates current branch is `dev/*`, pushes uncommitted changes, triggers `ci-feature.yml` via GitHub Actions, and reports results.
- **Syntax:**
  ```
  /tdgs-aidlc-pre-check-pull-request
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | target repo | Current directory on `dev/*` branch | Yes |
  | GitHub Actions MCP | MCP connection | Yes |
- **Prerequisites:** On a `dev/*` branch with committed changes
- **Example:** `/tdgs-aidlc-pre-check-pull-request`
- **Next Steps:** `/tdgs-aidlc-create-pull-request` (if CI passed)

---

### /tdgs-aidlc-create-pull-request

- **Role:** Both
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Dev Workflow
- **Description:** Create a GitHub PR from a dev or planning branch. Auto-resolves integration branch, generates PR description from commits, pushes branch, creates PR via `gh`, requests `@copilot` review, and comments on linked issue.
- **Syntax:**
  ```
  /tdgs-aidlc-create-pull-request
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | repos with commits ahead | Git state | Yes (auto-detected) |
  | target override | Prompted if ambiguous | No |
  | draft flag | Prompted | No |
- **Prerequisites:** Committed changes on a dev/planning branch
- **Example:** `/tdgs-aidlc-create-pull-request`
- **Next Steps:** Notify EM for review, pick up next story

---

## Test Management

### /tdgs-aidlc-setup-unit-tests

- **Role:** ADE
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Type:** Prompt + Skill
- **Category:** Test
- **Description:** Auto-detect project stack (Java/Maven/Gradle, JS/TS with Jest/Vitest, Python/pytest, .NET/xUnit) and scaffold per-repository unit test infrastructure with coverage tooling, report stubs, and documentation. Delegates to the `tdgs-aidlc-setup-unit-tests` skill.
- **Syntax:**
  ```
  /tdgs-aidlc-setup-unit-tests [coverage%]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | coverage_target | CLI argument (default: `80`) | No |
  | repos | Auto-detected | Yes |
- **Prerequisites:** Workspace set up with worker repos
- **Example:** `/tdgs-aidlc-setup-unit-tests 90`
- **Next Steps:** `/tdgs-aidlc-generate-unit-tests`
- **Skill:** `src/i2a-skills/tdgs-aidlc-setup-unit-tests/` — `SKILL.md`, `workflow.md`, `tools/` (java-scaffold, javascript-scaffold, guardrails, preflight-and-discovery, other-stacks, verification)

---

### /tdgs-aidlc-setup-api-tests

- **Role:** ADE
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Type:** Prompt + Skill
- **Category:** Test
- **Description:** Scaffold API test framework (Insomnia collections, test runner, environments) per auto-detected backend service. Delegates to the `tdgs-aidlc-setup-api-tests` skill.
- **Syntax:**
  ```
  /tdgs-aidlc-setup-api-tests [coverage%]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | coverage_target | CLI argument | No |
  | backend repos | Auto-detected | Yes |
- **Prerequisites:** Workspace set up with backend worker repos
- **Example:** `/tdgs-aidlc-setup-api-tests 85`
- **Next Steps:** `/tdgs-aidlc-setup-testdata`, `/tdgs-aidlc-generate-api-tests`
- **Skill:** `src/i2a-skills/tdgs-aidlc-setup-api-tests/` — `SKILL.md`, `workflow.md`, `templates/`, `tools/` (runner-contract, insomnia-unit-test-examples)

---

### /tdgs-aidlc-setup-functional-tests

- **Role:** ADE
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Type:** Prompt + Skill
- **Category:** Test
- **Description:** Scaffold Playwright-based functional test infrastructure in UI repos with page-object models, fixtures, component detection helpers, and flow descriptors. Delegates to the `tdgs-aidlc-setup-functional-tests` skill.
- **Syntax:**
  ```
  /tdgs-aidlc-setup-functional-tests [ui_repo={name}] [coverage%]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | ui_repo | CLI argument | No (auto-detected) |
  | coverage_target | CLI argument | No |
- **Prerequisites:** Workspace set up with UI worker repo
- **Example:** `/tdgs-aidlc-setup-functional-tests ui_repo=tabc-ui 80`
- **Next Steps:** `/tdgs-aidlc-setup-testdata`, `/tdgs-aidlc-generate-functional-tests`
- **Skill:** `src/i2a-skills/tdgs-aidlc-setup-functional-tests/` — `SKILL.md`, `workflow.md`, `tools/` (scaffold-structure, component-detection, fixtures-and-helpers, flow-descriptors, preflight-and-discovery, verification-and-docs)

---

### /tdgs-aidlc-setup-testdata

- **Role:** ADE
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Category:** Test
- **Description:** Generate test-data catalog (identity pools, API chains, UI screens) from knowledge base and source code. Creates `test-data-catalog.yaml` with placeholder sentinels — user must populate with real test values.
- **Syntax:**
  ```
  /tdgs-aidlc-setup-testdata
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | knowledge-base | Docs repo | Yes (auto-discovered) |
  | project-context.md | Docs repo | Yes |
  | service controllers/models | Worker repos | Yes |
  | UI routes/forms | UI worker repo | No |
- **Prerequisites:** Knowledge base populated, worker repos cloned
- **Example:** `/tdgs-aidlc-setup-testdata`
- **Next Steps:** `/tdgs-aidlc-generate-api-tests`, `/tdgs-aidlc-generate-functional-tests`

---

### /tdgs-aidlc-generate-unit-tests

- **Role:** ADE
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Type:** Prompt + Skill
- **Category:** Test
- **Description:** Generate hermetic unit tests per-module with coverage gates, pre-write contract, guardrails (hermeticity, exception paths, exact assertions), and post-generation checks. Delegates to the `tdgs-aidlc-generate-unit-tests` skill.
- **Syntax:**
  ```
  /tdgs-aidlc-generate-unit-tests [coverage%] [repo=] [skip_completed=]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | coverage_target | CLI argument or config | No |
  | repo | CLI argument (filter to one repo) | No |
  | skip_completed | CLI argument | No |
- **Prerequisites:** `/tdgs-aidlc-setup-unit-tests` completed
- **Example:** `/tdgs-aidlc-generate-unit-tests 90 repo=tabc-api`
- **Next Steps:** `/tdgs-aidlc-commit`
- **Skill:** `src/i2a-skills/tdgs-aidlc-generate-unit-tests/` — `SKILL.md`, `workflow.md`, `tools/` (discovery, generation-rules, guardrails, pre-write-contract, post-generation-checks, constraints-and-augmentations, preflight-checks, execution-and-reports)

---

### /tdgs-aidlc-generate-api-tests

- **Role:** ADE
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Type:** Prompt + Skill
- **Category:** Test
- **Description:** Generate and execute API test suites with two-phase discovery, chain wiring, and HTML/MD reports. Delegates to the `tdgs-aidlc-generate-api-tests` skill.
- **Syntax:**
  ```
  /tdgs-aidlc-generate-api-tests [service=] [coverage_target=]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | service | CLI argument | No |
  | coverage_target | CLI argument | No |
  | test-data-catalog | Docs repo | Yes (must exist) |
- **Prerequisites:** `/tdgs-aidlc-setup-api-tests`, `/tdgs-aidlc-setup-testdata`
- **Example:** `/tdgs-aidlc-generate-api-tests service=tabc-api coverage_target=85`
- **Next Steps:** `/tdgs-aidlc-commit`
- **Skill:** `src/i2a-skills/tdgs-aidlc-generate-api-tests/` — `workflow.md`, `tools/` (guardrails, discovery, generation-rules, post-generation-checks), `scripts/post-generation-gate.mjs`

---

### /tdgs-aidlc-generate-functional-tests

- **Role:** ADE
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Type:** Prompt + Skill
- **Category:** Test
- **Description:** Generate Playwright functional tests through multi-phase discovery, pre-write contract, gap analysis, post-generation checks, and execution with mock/real modes. Delegates to the `tdgs-aidlc-generate-functional-tests` skill.
- **Syntax:**
  ```
  /tdgs-aidlc-generate-functional-tests [ui_repo=] [mode=] [flows=] [coverage_target=]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | ui_repo | CLI argument | No (auto-detected) |
  | mode | CLI argument (`mock` or `real`) | No |
  | flows | CLI argument (comma-separated) | No |
  | coverage_target | CLI argument | No |
  | test-data-catalog | Docs repo | Yes (must exist) |
- **Prerequisites:** `/tdgs-aidlc-setup-functional-tests`; recommended: `/tdgs-aidlc-setup-testdata`
- **Example:** `/tdgs-aidlc-generate-functional-tests ui_repo=tabc-ui mode=mock coverage_target=80`
- **Next Steps:** `/tdgs-aidlc-commit`
- **Skill:** `src/i2a-skills/tdgs-aidlc-generate-functional-tests/` — `SKILL.md`, `workflow.md`, `tools/` (discovery, gap-analysis, guardrails, pre-write-contract, post-generation-checks, preflight-checks, preflight-ground-truth, execution-and-reports, phase-4-augmentations)

---

### /tdgs-aidlc-run-tests

- **Role:** ADE
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Test
- **Description:** Execute existing tests across the workspace (unit, API, functional) — full-suite or issue-scoped. Discovers repos with test infrastructure, runs tests per type, generates HTML dashboard and markdown summary.
- **Syntax:**
  ```
  /tdgs-aidlc-run-tests
  /tdgs-aidlc-run-tests --scope issue
  /tdgs-aidlc-run-tests --type unit
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | scope | User (`full` or `issue`) | No (prompted) |
  | type | User (`unit`, `api`, `functional`, or `all`) | No (prompted) |
  | mode | User (`mock` or `real`) | No (API/functional only) |
- **Prerequisites:** Test infrastructure scaffolded for at least one type
- **Example:** `/tdgs-aidlc-run-tests --type api --scope full`
- **Next Steps:** `/tdgs-aidlc-commit`, review failures

---

## Sprint Management

### /tdgs-aidlc-generate-dashboard

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Type:** Prompt + Skill
- **Category:** Sprint
- **Description:** Generate or regenerate a live HTML sprint dashboard that reads `sprint-status.yaml` and auto-refreshes every 5 seconds. Delegates to the `tdgs-aidlc-sprint-dashboard` skill.
- **Syntax:**
  ```
  /tdgs-aidlc-generate-dashboard [{title}]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | title | CLI argument | No (auto-resolved from branch or config) |
  | epics | Docs repo | Yes |
  | sprint-status.yaml | Docs repo | Yes |
- **Prerequisites:** Epics created (`/bmad-create-epics-and-stories`), sprint-status created (`/bmad-sprint-planning`)
- **Example:** `/tdgs-aidlc-generate-dashboard "TABC Portal - Sprint 3"`
- **Next Steps:** Serve with `python3 -m http.server 8080`
- **Skill:** `src/i2a-skills/tdgs-aidlc-sprint-dashboard/`

---

### /tdgs-aidlc-update-metrics

- **Role:** Both
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Sprint
- **Description:** Update sprint metrics after a story status change. Validates transition, calculates UTC timestamps and Harvey ball metrics (0–4 scale), updates `sprint-status.yaml`.
- **Syntax:**
  ```
  /tdgs-aidlc-update-metrics
  ```
  Or inline: `1-1-story -> in-progress`
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | story key | Interactive or inline | Yes |
  | new status | Interactive or inline | Yes |
- **Prerequisites:** `sprint-status.yaml` exists
- **Example:** `/tdgs-aidlc-update-metrics` then enter `1-2-auth-service` → `in-progress`
- **Next Steps:** `/tdgs-aidlc-generate-dashboard` (if structure changed)

---

### /tdgs-aidlc-manage-blockers

- **Role:** EM
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Sprint
- **Description:** Add, resolve, or update blockers on stories in `sprint-status.yaml`.
- **Syntax:**
  ```
  /tdgs-aidlc-manage-blockers {action} {story_key} {details}
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | action | CLI argument (`add`, `resolve`, `update`) | Yes |
  | story_key | CLI argument | Yes |
  | summary/impact | CLI argument (for `add`) | Yes (for `add`) |
  | resolution | CLI argument (for `resolve`) | Yes (for `resolve`) |
- **Prerequisites:** `sprint-status.yaml` exists
- **Example:** `/tdgs-aidlc-manage-blockers add 1-2-auth-service "Waiting on SSO cert from infra team"`
- **Next Steps:** `/tdgs-aidlc-generate-dashboard`

---

### /tdgs-aidlc-metrics-report

- **Role:** EM
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Sprint
- **Description:** Generate a markdown metrics summary with velocity, completion rate, Harvey ball scores, and stories needing attention.
- **Syntax:**
  ```
  /tdgs-aidlc-metrics-report
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | sprint-status.yaml | Docs repo | Yes |
- **Prerequisites:** `sprint-status.yaml` with story data
- **Example:** `/tdgs-aidlc-metrics-report`
- **Next Steps:** Share with stakeholders

---

### /tdgs-aidlc-project-kanban-planning

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Type:** Prompt + Skill
- **Category:** Sprint
- **Description:** Generate a sprint-ready kanban plan from planning artifacts. Validates prerequisites, collects capacity inputs, parses epics, and generates kanban plan + dashboard + sprint metrics. Delegates to the `tdgs-aidlc-project-kanban-planning` skill.
- **Syntax:**
  ```
  /tdgs-aidlc-project-kanban-planning
  /tdgs-aidlc-project-kanban-planning update
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | mode | CLI argument (`update` for reload) | No |
  | PRD | Docs repo on planning branch | Yes |
  | architecture docs | Docs repo on planning branch | Yes |
- **Prerequisites:** PRD and architecture docs exist (from BMAD planning steps)
- **Example:** `/tdgs-aidlc-project-kanban-planning`
- **Next Steps:** `/tdgs-aidlc-show-available-stories`
- **Related BMAD:** `/bmad-create-epics-and-stories` (invoked), `/bmad-sprint-planning` (invoked)
- **Skill:** `src/i2a-skills/tdgs-aidlc-project-kanban-planning/`

---

### /tdgs-aidlc-project-course-correction

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Category:** Sprint
- **Description:** Apply a mid-project change request to planning artifacts. Gathers CR details, generates CR brief, delegates impact analysis to `/bmad-correct-course`, and applies approved changes to specs and stories.
- **Syntax:**
  ```
  /tdgs-aidlc-project-course-correction {issue_id} {source}
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | issue_id | CLI argument | Yes |
  | source | CLI argument (`comment`, `sub-issue:{id}`, `document:{path}`, `url:{url}`, `inline`) | Yes |
  | i2a-config | `.github/i2a-config/*.yaml` | Yes (auto-read) |
- **Prerequisites:** Planning artifacts on `planning/*` branch, `sprint-status.yaml`
- **Example:** `/tdgs-aidlc-project-course-correction 100 sub-issue:105`
- **Next Steps:** Notify ADEs, `/tdgs-aidlc-show-available-stories`
- **Related BMAD:** `/bmad-correct-course` (invoked)

---

## Documentation

### /tdgs-aidlc-update-context-docs

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Category:** Docs
- **Description:** Sync knowledge base docs after merges to a release or project branch. Scans worker repo commits, maps code changes to KB documents, and regenerates affected sections.
- **Syntax:**
  ```
  /tdgs-aidlc-update-context-docs {issue_id}
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | issue_id | CLI argument | Yes |
  | worker_repos | `i2a-config` | Yes (auto-read) |
  | current branch | Must be `release/*` or `project/*` | Yes |
- **Prerequisites:** On a `release/*` or `project/*` branch with merged code changes
- **Example:** `/tdgs-aidlc-update-context-docs 42`
- **Next Steps:** `/tdgs-aidlc-commit`, `/tdgs-aidlc-create-pull-request`

---

### /tdgs-aidlc-validate-runbook-context

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Category:** Docs
- **Description:** Validate runbook content against knowledge base context docs for accuracy. Extracts operational data, compares across 10 categories, and generates a deterministic validation report.
- **Syntax:**
  ```
  /tdgs-aidlc-validate-runbook-context
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | runbook files | `runbook/*.md` | Yes |
  | context docs | Knowledge base | Yes |
- **Prerequisites:** Runbook and knowledge base populated
- **Example:** `/tdgs-aidlc-validate-runbook-context`
- **Next Steps:** Review and fix discrepancies

---

### /tdgs-aidlc-validate-test-context

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Category:** Docs
- **Description:** Validate manual test cases against context docs for correctness. Extracts business rules, compares test case values, and generates a severity-categorized report.
- **Syntax:**
  ```
  /tdgs-aidlc-validate-test-context
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | test cases | `test-management/manual/*.md` | Yes |
  | context docs | Knowledge base | Yes |
- **Prerequisites:** Test cases and knowledge base populated
- **Example:** `/tdgs-aidlc-validate-test-context`
- **Next Steps:** Review and fix discrepancies

---

### /tdgs-aidlc-post-deployment-docs-sync

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus 4, o4-mini)
- **Category:** Docs
- **Description:** Update the knowledge base after a production release. Validates release tag, finds merged issues, creates docs branch, invokes BMAD Document Project, and adds deployment history entry.
- **Syntax:**
  ```
  /tdgs-aidlc-post-deployment-docs-sync {release} [issues:N,M] [--flags]
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | release | CLI argument (version string) | Yes |
  | issues | CLI argument (comma-separated) | No (auto-detected) |
  | --dry-run | Flag | No |
  | --force | Flag | No |
  | --skip-apigee | Flag | No |
  | --sync-common-services | Flag | No |
- **Prerequisites:** Release tag exists in worker repos
- **Example:** `/tdgs-aidlc-post-deployment-docs-sync v2.4.0 issues:42,43 --skip-apigee`
- **Next Steps:** Review PR and merge to master

### /tdgs-aidlc-ops-runbook

- **Role:** EM
- **Model:** 🧠 Reasoning (Claude Opus, o3)
- **Category:** Documentation
- **Description:** Update an operational runbook (`.docx` or `.md`) by exhaustively scanning the knowledge base and source code, or create a new `.md` runbook from the Texas.gov template. Applies evidence-based edits with formatting preservation and rollback safety.
- **Syntax:**
  ```
  /tdgs-aidlc-ops-runbook {runbook_path} {release_source}
  /tdgs-aidlc-ops-runbook {runbook_path} "repo1=2.2.0, repo2=1.14.0"
  /tdgs-aidlc-ops-runbook create
  ```
- **Inputs:**
  | Input | Source | Required |
  |-------|--------|----------|
  | runbook_path | CLI argument (path to .docx or .md) | Yes (Update mode) |
  | release_source | CLI argument (implementation plan path or `repo=version` pairs) | Yes (Update mode) |
  | mode | CLI argument (`create` to skip intake question) | No (Create mode) |
- **Prerequisites:** Python 3.9+ with python-docx (for .docx update); `mmdc` mermaid-cli (for create mode); knowledge base generated (run `/bmad-document-project` during initial setup; refreshed by `/tdgs-aidlc-post-deployment-docs-sync` after subsequent releases)
- **Example:** `/tdgs-aidlc-ops-runbook ~/runbooks/MyApp_Runbook.docx implementation-plan.md`
- **Next Steps:** Review diff, commit updated runbook, optionally run `/tdgs-aidlc-validate-runbook-context`

---

## Help

### /tdgs-aidlc-help

- **Role:** Both
- **Model:** ⚡ Fast (GPT-4.1, Claude Sonnet)
- **Category:** Help
- **Description:** This command. Show all AIDLC prompts, skills, and workflows with syntax, options, and examples. Query by name, goal, or workflow.
- **Syntax:**
  ```
  /tdgs-aidlc-help
  /tdgs-aidlc-help {prompt_or_skill}
  /tdgs-aidlc-help {goal_or_question}
  /tdgs-aidlc-help workflows
  ```
- **Prerequisites:** Help skill installed via `/tdgs-aidlc-quick-setup`
- **Example:** `/tdgs-aidlc-help commit`
- **Next Steps:** Run the suggested command
