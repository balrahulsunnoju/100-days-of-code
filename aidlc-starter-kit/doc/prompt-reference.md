# Prompt & Skill Reference

> For ACE dependency maps and upgrade impact, see [Catalog](contributing/catalog.md).
>
> **Single-source-of-truth note:** This file is the canonical reference. The help skill's `catalog-data.md` mirrors this content for runtime use. When updating entries, update this file first and then sync changes to `src/i2a-skills/tdgs-aidlc-help/tools/catalog-data.md`.

This document is the quick-reference for every AIDLC prompt and custom skill. Each entry describes when to use the command, what inputs it expects, what it does, and what comes next. For full edge-case behaviour, consult the prompt source files in `.github/prompts/`.

---

## Recommended Model Guidance

GitHub Copilot Chat does not support per-prompt model pinning — the active model is selected in the chat UI. The **Model** column below is an advisory recommendation based on each prompt's complexity.

| Tier | When to use | Example models |
|------|-------------|----------------|
| ⚡ Fast | Well-constrained, sequential tasks with little reasoning — optimise for speed | GPT-4.1, Claude Sonnet |
| 🧠 Reasoning | Multi-phase workflows, code generation, cross-document analysis, planning | Claude Opus 4, o4-mini |

> **Tip:** Switch models in the Copilot Chat dropdown before invoking a prompt. Fast-tier prompts are safe to run on any model; reasoning-tier prompts may produce incomplete or lower-quality output on fast models.

---

## At a Glance (All 33 Prompts + 11 Skills)

| Command | Role | Model | One-Liner |
|---------|------|-------|-----------|
| `/tdgs-aidlc-quick-setup` | All | ⚡ Fast | Install/upgrade BMAD + copy prompts |
| `/tdgs-aidlc-setup-workspace` | All | ⚡ Fast | Full first-time workspace init |
| `/tdgs-aidlc-install-hooks` | All | ⚡ Fast | Pre-commit hooks (Gitleaks + conventional commit) |
| `/tdgs-aidlc-reference-sync` | Both | ⚡ Fast | Sync shared docs from common-services repo |
| `/tdgs-aidlc-initiate-issue` | ADE | ⚡ Fast | Pick up issue → branches + change/bug brief |
| `/tdgs-aidlc-initiate-project` | EM | 🧠 Reasoning | Start Full BMAD project → branches + planning |
| `/tdgs-aidlc-show-available-stories` | ADE | ⚡ Fast | View unclaimed stories with dependency status |
| `/tdgs-aidlc-prepare-repos` | ADE | ⚡ Fast | Create dev branches in affected worker repos |
| `/tdgs-aidlc-switch` | Both | ⚡ Fast | Switch between issues or EM ↔ ADE roles |
| `/tdgs-aidlc-commit` | All | ⚡ Fast | Stage + conventional commit with issue ref |
| `/tdgs-aidlc-pre-check-pull-request` | ADE | ⚡ Fast | Trigger CI and report pass/fail |
| `/tdgs-aidlc-create-pull-request` | Both | ⚡ Fast | Open PR with structured description |
| `/tdgs-aidlc-setup-unit-tests` | ADE | 🧠 Reasoning | Scaffold unit test infrastructure |
| `/tdgs-aidlc-setup-api-tests` | ADE | 🧠 Reasoning | Scaffold API/integration test infrastructure |
| `/tdgs-aidlc-setup-functional-tests` | ADE | 🧠 Reasoning | Scaffold Playwright functional tests |
| `/tdgs-aidlc-setup-testdata` | ADE | 🧠 Reasoning | Generate test-data catalog (identity pools, API chains) |
| `/tdgs-aidlc-generate-unit-tests` | ADE | 🧠 Reasoning | Generate unit tests to coverage target |
| `/tdgs-aidlc-generate-api-tests` | ADE | 🧠 Reasoning | Generate API test collections (requires testdata) |
| `/tdgs-aidlc-generate-functional-tests` | ADE | 🧠 Reasoning | Generate Playwright specs (requires testdata) |
| `/tdgs-aidlc-run-tests` | ADE | ⚡ Fast | Execute tests + generate HTML reports |
| `/tdgs-aidlc-generate-dashboard` | EM | 🧠 Reasoning | Generate live HTML sprint dashboard |
| `/tdgs-aidlc-update-metrics` | Both | ⚡ Fast | Update sprint-status.yaml after status change |
| `/tdgs-aidlc-manage-blockers` | EM | ⚡ Fast | Add/resolve blockers in sprint-status.yaml |
| `/tdgs-aidlc-metrics-report` | EM | ⚡ Fast | Generate markdown metrics summary |
| `/tdgs-aidlc-project-course-correction` | EM | 🧠 Reasoning | Accept mid-project change requests |
| `/tdgs-aidlc-update-context-docs` | EM | 🧠 Reasoning | Sync knowledge base from code changes |
| `/tdgs-aidlc-validate-runbook-context` | EM | 🧠 Reasoning | Validate runbook against KB context |
| `/tdgs-aidlc-validate-test-context` | EM | 🧠 Reasoning | Validate test cases against business rules |
| `/tdgs-aidlc-post-deployment-docs-sync` | EM | 🧠 Reasoning | Post-release KB regeneration + PR |
| `/tdgs-aidlc-ops-runbook` | EM | 🧠 Reasoning | Update .docx runbook from KB + code |
| `/tdgs-aidlc-project-kanban-planning` | EM | 🧠 Reasoning | Orchestrate kanban + dashboard (delegates to skill) |
| `/tdgs-aidlc-sprint-dashboard` | EM | 🧠 Reasoning | *(skill)* Generate HTML dashboard with KPIs |
| `/tdgs-aidlc-help` | Both | ⚡ Fast | Show prompts, skills, workflows with syntax & examples |

---

## What Do You Want to Do?

| Goal | Command |
|------|---------|
| **Set up my workspace for the first time** | [`/tdgs-aidlc-setup-workspace`](#tdgs-aidlc-setup-workspace) |
| **Update BMAD / copy latest prompts** | [`/tdgs-aidlc-quick-setup`](#tdgs-aidlc-quick-setup) |
| **Start working on a feature or hotfix** | [`/tdgs-aidlc-initiate-issue`](#tdgs-aidlc-initiate-issue) |
| **Start a new multi-sprint project** | [`/tdgs-aidlc-initiate-project`](#tdgs-aidlc-initiate-project) |
| **See what stories I can pick up** | [`/tdgs-aidlc-show-available-stories`](#tdgs-aidlc-show-available-stories) |
| **Create dev branches in worker repos** | [`/tdgs-aidlc-prepare-repos`](#tdgs-aidlc-prepare-repos) |
| **Switch to a different issue or role** | [`/tdgs-aidlc-switch`](#tdgs-aidlc-switch) |
| **Commit my changes** | [`/tdgs-aidlc-commit`](#tdgs-aidlc-commit) |
| **Run CI before opening a PR** | [`/tdgs-aidlc-pre-check-pull-request`](#tdgs-aidlc-pre-check-pull-request) |
| **Open a pull request** | [`/tdgs-aidlc-create-pull-request`](#tdgs-aidlc-create-pull-request) |
| **Set up test infrastructure** | [`/tdgs-aidlc-setup-unit-tests`](#tdgs-aidlc-setup-unit-tests), [`setup-api-tests`](#tdgs-aidlc-setup-api-tests), [`setup-functional-tests`](#tdgs-aidlc-setup-functional-tests) |
| **Generate test data catalog** | [`/tdgs-aidlc-setup-testdata`](#tdgs-aidlc-setup-testdata) |
| **Generate tests for my code** | [`/tdgs-aidlc-generate-unit-tests`](#tdgs-aidlc-generate-unit-tests), [`generate-api-tests`](#tdgs-aidlc-generate-api-tests), [`generate-functional-tests`](#tdgs-aidlc-generate-functional-tests) |
| **Run tests and get reports** | [`/tdgs-aidlc-run-tests`](#tdgs-aidlc-run-tests) |
| **Generate the sprint dashboard** | [`/tdgs-aidlc-generate-dashboard`](#tdgs-aidlc-generate-dashboard) |
| **Update story status / metrics** | [`/tdgs-aidlc-update-metrics`](#tdgs-aidlc-update-metrics) |
| **Track or resolve a blocker** | [`/tdgs-aidlc-manage-blockers`](#tdgs-aidlc-manage-blockers) |
| **Get a sprint metrics summary** | [`/tdgs-aidlc-metrics-report`](#tdgs-aidlc-metrics-report) |
| **Handle a mid-project change request** | [`/tdgs-aidlc-project-course-correction`](#tdgs-aidlc-project-course-correction) |
| **Sync knowledge base after code merges** | [`/tdgs-aidlc-update-context-docs`](#tdgs-aidlc-update-context-docs) |
| **Sync docs after a production release** | [`/tdgs-aidlc-post-deployment-docs-sync`](#tdgs-aidlc-post-deployment-docs-sync) |
| **Update operational runbook** | [`/tdgs-aidlc-ops-runbook`](#tdgs-aidlc-ops-runbook) |
| **See all available prompts and skills** | [`/tdgs-aidlc-help`](#tdgs-aidlc-help) |
| **Find the right command for a task** | [`/tdgs-aidlc-help {goal}`](#tdgs-aidlc-help) |
| **View common workflow sequences** | [`/tdgs-aidlc-help workflows`](#tdgs-aidlc-help) |

---

## Table of Contents

- [Setup / Infrastructure](#setup--infrastructure)
  - [/tdgs-aidlc-quick-setup](#tdgs-aidlc-quick-setup)
  - [/tdgs-aidlc-setup-workspace](#tdgs-aidlc-setup-workspace)
  - [/tdgs-aidlc-install-hooks](#tdgs-aidlc-install-hooks)
  - [/tdgs-aidlc-reference-sync](#tdgs-aidlc-reference-sync)
- [Issue / Project Initiation](#issue--project-initiation)
  - [/tdgs-aidlc-initiate-issue](#tdgs-aidlc-initiate-issue)
  - [/tdgs-aidlc-initiate-project](#tdgs-aidlc-initiate-project)
  - [/tdgs-aidlc-show-available-stories](#tdgs-aidlc-show-available-stories)
- [Development Workflow](#development-workflow)
  - [/tdgs-aidlc-prepare-repos](#tdgs-aidlc-prepare-repos)
  - [/tdgs-aidlc-switch](#tdgs-aidlc-switch)
  - [/tdgs-aidlc-commit](#tdgs-aidlc-commit)
  - [/tdgs-aidlc-pre-check-pull-request](#tdgs-aidlc-pre-check-pull-request)
  - [/tdgs-aidlc-create-pull-request](#tdgs-aidlc-create-pull-request)
- [Test Management](#test-management)
  - [/tdgs-aidlc-setup-unit-tests](#tdgs-aidlc-setup-unit-tests)
  - [/tdgs-aidlc-setup-api-tests](#tdgs-aidlc-setup-api-tests)
  - [/tdgs-aidlc-setup-functional-tests](#tdgs-aidlc-setup-functional-tests)
  - [/tdgs-aidlc-generate-unit-tests](#tdgs-aidlc-generate-unit-tests)
  - [/tdgs-aidlc-generate-api-tests](#tdgs-aidlc-generate-api-tests)
  - [/tdgs-aidlc-generate-functional-tests](#tdgs-aidlc-generate-functional-tests)
  - [/tdgs-aidlc-setup-testdata](#tdgs-aidlc-setup-testdata)
  - [/tdgs-aidlc-run-tests](#tdgs-aidlc-run-tests)
- [Sprint Management](#sprint-management)
  - [/tdgs-aidlc-generate-dashboard](#tdgs-aidlc-generate-dashboard)
  - [/tdgs-aidlc-update-metrics](#tdgs-aidlc-update-metrics)
  - [/tdgs-aidlc-manage-blockers](#tdgs-aidlc-manage-blockers)
  - [/tdgs-aidlc-metrics-report](#tdgs-aidlc-metrics-report)
  - [/tdgs-aidlc-project-kanban-planning](#tdgs-aidlc-project-kanban-planning)
  - [/tdgs-aidlc-project-course-correction](#tdgs-aidlc-project-course-correction)
- [Documentation](#documentation)
  - [/tdgs-aidlc-update-context-docs](#tdgs-aidlc-update-context-docs)
  - [/tdgs-aidlc-validate-runbook-context](#tdgs-aidlc-validate-runbook-context)
  - [/tdgs-aidlc-validate-test-context](#tdgs-aidlc-validate-test-context)
  - [/tdgs-aidlc-post-deployment-docs-sync](#tdgs-aidlc-post-deployment-docs-sync)
  - [/tdgs-aidlc-ops-runbook](#tdgs-aidlc-ops-runbook)
- [Help](#help)
  - [/tdgs-aidlc-help](#tdgs-aidlc-help)
- [Custom Skills](#custom-skills)
  - [/tdgs-aidlc-project-kanban-planning (skill)](#tdgs-aidlc-project-kanban-planning-skill)
  - [/tdgs-aidlc-setup-api-tests (skill)](#tdgs-aidlc-setup-api-tests-skill)
  - [/tdgs-aidlc-generate-api-tests (skill)](#tdgs-aidlc-generate-api-tests-skill)
  - [/tdgs-aidlc-sprint-dashboard (skill)](#tdgs-aidlc-sprint-dashboard-skill)
  - [/tdgs-aidlc-setup-unit-tests (skill)](#tdgs-aidlc-setup-unit-tests-skill)
  - [/tdgs-aidlc-generate-unit-tests (skill)](#tdgs-aidlc-generate-unit-tests-skill)
  - [/tdgs-aidlc-setup-functional-tests (skill)](#tdgs-aidlc-setup-functional-tests-skill)
  - [/tdgs-aidlc-generate-functional-tests (skill)](#tdgs-aidlc-generate-functional-tests-skill)
  - [/tdgs-aidlc-ops-runbook (skill)](#tdgs-aidlc-ops-runbook-skill)
  - [/tdgs-aidlc-help (skill)](#tdgs-aidlc-help-skill)

---

## Setup / Infrastructure

### /tdgs-aidlc-quick-setup

**Role:** Both
**When to use:** Install or upgrade BMAD and AIDLC prompts in the current workspace.

#### Syntax

```
/tdgs-aidlc-quick-setup
/tdgs-aidlc-quick-setup update-workspace
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| mode | CLI argument (`update-workspace`) | No |
| i2a-config | `.github/i2a-config/*.yaml` | Only for `update-workspace` mode |

#### What It Does

1. Verifies prerequisites (Node v20+, Python 3.10+, uv).
2. Reads the BMAD version from the starter kit and installs or upgrades BMAD.
3. Copies prompts, skills, and config into `.github/`; removes legacy prompts.
4. In `update-workspace` mode, scans repos and updates `worker_repos` in config.

#### Output

BMAD installed at the required version. Prompts in `.github/prompts/`, skills in `.github/i2a-skills/`.

#### Example

```
/tdgs-aidlc-quick-setup
```

#### Next Steps

- `/tdgs-aidlc-setup-workspace` -- first-time workspace setup
- `/tdgs-aidlc-install-hooks` -- install pre-commit hooks

---

### /tdgs-aidlc-setup-workspace

**Role:** Both
**When to use:** First-time full workspace setup for a new project.

#### Syntax

```
/tdgs-aidlc-setup-workspace {persona}
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| persona | CLI argument (`em` or `ade`) | Yes |
| toolchain | Runtime checks (Git, Node, Python, uv, gh, gh auth) | Yes (auto-validated) |

#### What It Does

1. Validates the full toolchain (Git, Node, Python, uv, gh CLI, gh auth).
2. Installs BMAD, creates or locates the docs repo with standard folder structure.
3. Writes `i2a-config` with issues repo, worker repos, and common services.
4. For EM persona, creates the GitHub **docs repo** and default branches (`master`, `feature/initial-docs-setup`, `dev/initial-docs-setup`).

#### Output

Docs repo folder structure, `.github/` config files, BMAD config. EM persona also gets the docs git repo and initial branches.

#### Example

```
/tdgs-aidlc-setup-workspace ade
```

#### Next Steps

- `/tdgs-aidlc-install-hooks` -- install pre-commit hooks
- Start workflow prompts for your role

---

### /tdgs-aidlc-install-hooks

**Role:** All
**When to use:** After workspace setup, install pre-commit hooks across worker repos.

#### Syntax

```
/tdgs-aidlc-install-hooks
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| worker_repos | `i2a-config` | Yes (auto-read) |

#### What It Does

1. Detects OS and package manager.
2. Installs `pre-commit` and `gitleaks` if not already present.
3. Runs `pre-commit install` in each worker repo that has a `.pre-commit-config.yaml`.

#### Output

Git hooks active in all applicable worker repos.

#### Example

```
/tdgs-aidlc-install-hooks
```

#### Next Steps

- Start the development workflow (`/tdgs-aidlc-initiate-issue`, `/tdgs-aidlc-switch`)

---

### /tdgs-aidlc-reference-sync

> **⚠️ DEPRECATED** — This prompt has been replaced by the Symlinked Common Repos model. Common repos are now symlinked into the workspace and scanned directly by Document Project. See `common_repos` in `i2a-config.yml`.

**Role:** Both
**When to use:** ~~Sync shared service documentation from an external repository into the local knowledge base.~~ No longer needed.

*The original prompt content is preserved below for historical reference only.*

#### Syntax

```
/tdgs-aidlc-reference-sync
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| owner/repo | Prompted at runtime | Yes |
| branch | Prompted (default: `master`) | No |
| common_services | `i2a-config` | Yes (auto-read) |

#### What It Does

1. Uses GitHub MCP to read the external repo's documentation.
2. Filters by the `common_services` config for relevant services.
3. Syncs per-service README and architecture docs to `knowledge-base/common-services/`.
4. Updates indexes and runs a gap analysis report.

#### Output

Reference docs in `knowledge-base/common-services/`, gap analysis report.

#### Example

```
/tdgs-aidlc-reference-sync
```

#### Next Steps

- Continue with the issue workflow (`/tdgs-aidlc-initiate-issue`)

---

## Issue / Project Initiation

### /tdgs-aidlc-initiate-issue

**Role:** ADE
**When to use:** Start work on a new feature, hotfix, project story, or bug.

#### Syntax

```
/tdgs-aidlc-initiate-issue {issue_id} {type}
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| issue_id | CLI argument | Yes |
| type | CLI argument (`feature`, `hotfix`, `project`, `bug`) | Yes |
| i2a-config | `.github/i2a-config/*.yaml` (issues.repository, worker_repos) | Yes (auto-read) |

#### What It Does

1. Pre-flight checks: validates branch state, clean working tree, required folders.
2. Creates branches by type -- feature/hotfix get integration + dev branches **in the docs repo** from master; project checks out existing `project/*` in docs repo; bug stays on `project/*` in docs repo and generates a bug-brief.
3. Fetches issue details from GitHub and generates a change-brief (or bug-brief).

#### Output

Branches created **in docs repo** (feature/hotfix), change-brief or bug-brief written to docs, next-step guidance displayed. Worker repo branches are created later by `/tdgs-aidlc-prepare-repos`.

#### Example

```
/tdgs-aidlc-initiate-issue 42 feature
```

#### Next Steps

- `/tdgs-aidlc-reference-sync` -- sync upstream docs if needed
- `/bmad-quick-dev` -- begin implementation
- `/tdgs-aidlc-prepare-repos` -- create dev branches in worker repos

---

### /tdgs-aidlc-initiate-project

**Role:** EM
**When to use:** Start full BMAD project planning for a multi-sprint initiative.

#### Syntax

```
/tdgs-aidlc-initiate-project {issue_id}
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| issue_id | CLI argument | Yes |
| i2a-config | `.github/i2a-config/*.yaml` | Yes (auto-read) |

#### What It Does

1. Validates the docs repo is on master.
2. Creates `project/ghi-{id}-{slug}` (protected) and `planning/ghi-{id}-{slug}` branches **in the docs repo**.
3. Scaffolds docs directory structure and fetches the issue with attachments.
4. Generates the project change brief.

#### Output

Project and planning branches **in docs repo**, change-brief, docs directory structure. Worker repo branches are created later by `/tdgs-aidlc-prepare-repos`.

#### Example

```
/tdgs-aidlc-initiate-project 100
```

#### Next Steps

- `/tdgs-aidlc-reference-sync` -- sync shared service docs
- `/bmad-product-brief` -- begin product brief
- `/bmad-create-prd` -- create product requirements document

---

### /tdgs-aidlc-show-available-stories

**Role:** ADE
**When to use:** See which stories are available for pickup in a project workflow.

#### Syntax

```
/tdgs-aidlc-show-available-stories [--epic {N}]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| --epic N | CLI flag (filter to specific epic) | No |
| sprint-status.yaml | Docs repo on `project/*` branch | Yes (auto-read) |
| worker_repos | `i2a-config` | Yes (auto-read) |

#### What It Does

1. Reads `sprint-status.yaml` for current story statuses.
2. Scans worker repos for existing `dev/*` branch claims.
3. Evaluates story dependencies and categorises each story.
4. Displays a board with AVAILABLE, BLOCKED, CLAIMED, and DONE columns.

#### Output

Read-only story board displayed in the IDE.

#### Example

```
/tdgs-aidlc-show-available-stories --epic 2
```

#### Next Steps

- `/tdgs-aidlc-prepare-repos {spec-path}` -- pick up an available story

---

## Development Workflow

### /tdgs-aidlc-prepare-repos

**Role:** ADE
**When to use:** Create dev branches in worker repos before starting implementation.

#### Syntax

```
/tdgs-aidlc-prepare-repos [spec-file]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| spec-file | CLI argument or auto-detected from change-brief | No |
| worker_repos | `i2a-config` | Yes (auto-read) |
| change-brief / bug-brief | Docs repo | Yes (auto-read) |

#### What It Does

1. Detects workflow type (M&O, project, or bug) from the docs repo branch.
2. Parses the spec file for affected repos and validates against config.
3. Displays a branch creation plan and asks for confirmation.
4. Creates tiered branches **in each affected worker repo** (2-tier M&O, 3-tier project, 1-tier bug from parent).

#### Output

Remote branches created **in worker repos** (not docs repo). Sprint-status updated in docs repo (project workflow only).

#### Example

```
/tdgs-aidlc-prepare-repos specs/1-2-auth-service.md
```

#### Next Steps

- `/bmad-quick-dev` or `/bmad-dev-story` -- begin implementation
- `/tdgs-aidlc-commit` -- commit changes
- `/tdgs-aidlc-create-pull-request` -- open a PR

---

### /tdgs-aidlc-switch

**Role:** Both
**When to use:** Switch the workspace to a different issue or role.

#### Syntax

```
/tdgs-aidlc-switch {issue_id} [role] [spec_path]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| issue_id | CLI argument | Yes |
| role | CLI argument (`em` or `ade`) | No |
| spec_path | CLI argument | No |
| worker_repos | `i2a-config` | Yes (auto-read) |

#### What It Does

1. Checks all repos (docs + workers) for uncommitted changes and blocks if any are dirty.
2. Resolves target branches by issue ID and role.
3. Displays the branch checkout plan for confirmation.
4. Checks out the correct branches in **docs repo** and matching **worker repos**.

#### Output

All workspace repos (docs + workers) switched to the branches for the target issue.

#### Example

```
/tdgs-aidlc-switch 42 ade
```

#### Next Steps

- Continue with the workflow for the target issue

---

### /tdgs-aidlc-commit

**Role:** Both
**When to use:** Commit changes across workspace repos with conventional commit format.

#### Syntax

```
/tdgs-aidlc-commit
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| uncommitted changes | Git working tree across repos | Yes |
| branch name | Current branch (used for issue ID in `Refs` footer) | Yes (auto-read) |

#### What It Does

1. Scans all git repos for uncommitted changes.
2. Validates the current branch is not protected.
3. Reviews diffs and flags potential secrets or unintended deletions.
4. Generates a conventional commit message with a `Refs` footer, processes repos sequentially with user approval.

#### Output

Git commits in approved repos.

#### Example

```
/tdgs-aidlc-commit
```

#### Next Steps

- `/tdgs-aidlc-pre-check-pull-request` -- run CI before opening a PR
- `/tdgs-aidlc-create-pull-request` -- open a PR

---

### /tdgs-aidlc-pre-check-pull-request

**Role:** ADE
**When to use:** Run the CI pipeline locally before creating a pull request.

#### Syntax

```
/tdgs-aidlc-pre-check-pull-request
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| target repo | Current directory on a `dev/*` branch | Yes |
| GitHub Actions MCP | MCP connection | Yes |

#### What It Does

1. Validates the current branch is a `dev/*` branch.
2. Pushes uncommitted changes if needed.
3. Triggers `ci-feature.yml` via GitHub Actions and polls status with backoff (max 10 min).
4. Reports pass/fail with failure analysis.

#### Output

CI run results displayed in the IDE.

#### Example

```
/tdgs-aidlc-pre-check-pull-request
```

#### Next Steps

- `/tdgs-aidlc-create-pull-request` -- create the PR (if CI passed)

---

### /tdgs-aidlc-create-pull-request

**Role:** Both
**When to use:** Create a GitHub PR from a dev or planning branch.

#### Syntax

```
/tdgs-aidlc-create-pull-request
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| repos with commits ahead | Git state across workspace | Yes (auto-detected) |
| target override | Prompted if ambiguous | No |
| draft flag | Prompted | No |

#### What It Does

1. Scans the workspace for **worker repos** (and docs repo) with commits ahead of the integration branch.
2. Auto-resolves the integration branch target from the dev branch pattern.
3. Generates PR title and description from commit messages.
4. Pushes the branch, creates the PR via `gh`, requests `@copilot` review, and comments on the linked issue.
5. Updates `sprint-status.yaml` in docs repo (project workflow only).

#### Output

GitHub PR(s) created in worker repos (and/or docs repo), Copilot review requested, issue comment posted.

#### Example

```
/tdgs-aidlc-create-pull-request
```

#### Next Steps

- Notify the EM for review
- Pick up the next story

---

## Test Management

### /tdgs-aidlc-setup-unit-tests

**Role:** ADE
**When to use:** Scaffold the unit test framework and coverage tooling for worker repos.

#### Syntax

```
/tdgs-aidlc-setup-unit-tests [coverage%]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| coverage_target | CLI argument (default: `80`) | No |
| repos | Auto-detected from workspace | Yes (auto-detected) |

#### What It Does

1. Scans repos and auto-detects the stack (Java, JS/TS, Python, .NET).
2. Scaffolds test config and tooling (JaCoCo, Jest, Vitest, pytest, Coverlet).
3. Creates test utilities and wires coverage scripts.

#### Output

Test framework configured in each repo, `coverage.json` config, `TESTING.md`.

#### Example

```
/tdgs-aidlc-setup-unit-tests 90
```

#### Next Steps

- `/tdgs-aidlc-generate-unit-tests` -- generate tests to meet the coverage target

---

### /tdgs-aidlc-setup-api-tests

**Role:** ADE
**When to use:** Scaffold the API test framework for backend service repos. Delegates to the `setup-api-tests` skill (`src/i2a-skills/tdgs-aidlc-setup-api-tests/workflow.md`).

#### Syntax

```
/tdgs-aidlc-setup-api-tests [coverage%]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| coverage_target | CLI argument | No |
| backend repos | Auto-detected from workspace | Yes (auto-detected) |

#### What It Does

1. Detects backend service repos in the workspace.
2. Creates `{service}/api-tests/` with Insomnia collection skeletons, environment files, and runner/report scripts.
3. Wires coverage config for the API layer.

**Skill artifacts:** Copy from `.github/i2a-skills/tdgs-aidlc-setup-api-tests/templates/` (substitute `{{SERVICE_NAME}}`); read `tools/runner-contract.md` and `tools/insomnia-unit-test-examples.md` on demand. Do not regenerate embedded JavaScript from memory.

#### Output

`api-tests/` directory scaffolded in each backend service repo.

#### Example

```
/tdgs-aidlc-setup-api-tests 85
```

#### Next Steps

- `/tdgs-aidlc-setup-testdata` -- set up test data catalog
- `/tdgs-aidlc-generate-api-tests` -- generate API tests

---

### /tdgs-aidlc-setup-functional-tests

**Role:** ADE
**When to use:** Scaffold the Playwright functional test framework for the UI repo.

#### Syntax

```
/tdgs-aidlc-setup-functional-tests [ui_repo={name}] [coverage%]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| ui_repo | CLI argument | No (auto-detected) |
| coverage_target | CLI argument | No |

#### What It Does

1. Detects the UI repo in the workspace.
2. Scaffolds Playwright + Page Object framework in `{ui-repo}/functional-tests/`.
3. Creates page objects from source, flow descriptors, and fixtures.

#### Output

`functional-tests/` directory in the UI repo with Playwright config, page objects, and flow descriptors.

#### Example

```
/tdgs-aidlc-setup-functional-tests ui_repo=tabc-ui 80
```

#### Next Steps

- `/tdgs-aidlc-setup-testdata` -- set up test data catalog
- `/tdgs-aidlc-generate-functional-tests` -- generate functional tests

---

### /tdgs-aidlc-generate-unit-tests

**Role:** ADE
**When to use:** Generate unit tests to reach the coverage threshold.

#### Syntax

```
/tdgs-aidlc-generate-unit-tests [coverage%] [repo=] [skip_completed=]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| coverage_target | CLI argument, config, or prompted | No (default from config) |
| repo | CLI argument (filter to one repo) | No |
| skip_completed | CLI argument | No |

#### What It Does

1. Discovers testable units from source code.
2. Generates hermetic tests (no catalog/network dependencies) with hard gates for exception paths, thread-safety, and exact assertions.
3. Runs tests per-module until the threshold is met.
4. Performs post-generation validation.

#### Output

Test files, coverage reports, HTML coverage dashboard.

#### Example

```
/tdgs-aidlc-generate-unit-tests 90 repo=tabc-api
```

#### Next Steps

- `/tdgs-aidlc-commit` -- commit the generated tests

---

### /tdgs-aidlc-generate-api-tests

**Role:** ADE
**When to use:** Generate API tests for backend services. Delegates to the `generate-api-tests` skill (`src/i2a-skills/tdgs-aidlc-generate-api-tests/workflow.md`).

#### Syntax

```
/tdgs-aidlc-generate-api-tests [service=] [coverage_target=]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| service | CLI argument (filter to one service) | No |
| coverage_target | CLI argument | No |
| test-data-catalog | Docs repo | Yes (must exist) |

#### What It Does

1. Discovers API endpoints from the target service.
2. Writes Insomnia collections with catalog tokens.
3. Runs lint, audit, and executes tests.
4. Generates coverage and result reports.

**Skill artifacts:** Follow orchestrator `workflow.md`; read `tools/` on demand (guardrails, discovery, generation-rules, post-generation-checks). After generation, run `scripts/post-generation-gate.mjs` on collections, then complete semantic checks. Reuse `tdgs-aidlc-setup-api-tests/tools/runner-contract.md` for `results.json`.

#### Output

Insomnia collections, test results, coverage reports.

#### Example

```
/tdgs-aidlc-generate-api-tests service=tabc-api coverage_target=85
```

#### Next Steps

- `/tdgs-aidlc-commit` -- commit the generated tests

---

### /tdgs-aidlc-generate-functional-tests

**Role:** ADE
**When to use:** Generate Playwright functional tests for the UI.

#### Syntax

```
/tdgs-aidlc-generate-functional-tests [ui_repo=] [mode=] [flows=] [coverage_target=]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| ui_repo | CLI argument | No (auto-detected) |
| mode | CLI argument (`mock` or `real`) | No |
| flows | CLI argument (comma-separated flow names) | No |
| coverage_target | CLI argument | No |
| test-data-catalog | Docs repo | Yes (must exist) |

#### What It Does

1. Enumerates UI flows from flow descriptors.
2. Generates Playwright spec files via flow descriptors.
3. Executes Playwright and validates results.

#### Output

Spec files, flow descriptors, test results, coverage reports.

#### Example

```
/tdgs-aidlc-generate-functional-tests ui_repo=tabc-ui mode=mock coverage_target=80
```

#### Next Steps

- `/tdgs-aidlc-commit` -- commit the generated tests

---

### /tdgs-aidlc-setup-testdata

**Role:** ADE
**When to use:** Set up test data catalog and identity pools before generating API or functional tests.

#### Syntax

```
/tdgs-aidlc-setup-testdata
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| knowledge-base | Docs repo (`api/`, `business/`, `repos/`) | Yes (auto-discovered) |
| project-context.md | Docs repo | Yes (auto-discovered) |
| service controllers/models | Worker repos | Yes (auto-discovered) |
| UI routes/forms | UI worker repo | No (functional test data) |

#### What It Does

1. Discovers API chains, identity fields, and UI screens from KB and source code.
2. Generates `test-data-catalog.yaml` with `apiChain[]`, `identityPools[]`, `uiScreens[]`, and cross-service `stubs:` block.
3. Creates workspace dashboard (`test-data/dashboard.html`) and aggregation scripts.
4. Identity pool records are initialized with `PLACEHOLDER_*` sentinels — user must populate with real test values.

#### Output

`test-data-catalog.yaml`, `test-data/dashboard.html`, `test-data/db-transactions.json`, aggregation scripts. Catalog file is added to `.gitignore` (contains PII-shaped test data).

#### Example

```
/tdgs-aidlc-setup-testdata
```

#### Next Steps

- `/tdgs-aidlc-generate-api-tests` -- generate API tests using the catalog
- `/tdgs-aidlc-generate-functional-tests` -- generate functional tests using the catalog

---

### /tdgs-aidlc-run-tests

**Role:** ADE
**When to use:** Execute existing tests across the workspace (unit, API, functional) — full-suite or issue-scoped.

#### Syntax

```
/tdgs-aidlc-run-tests
/tdgs-aidlc-run-tests --scope issue
/tdgs-aidlc-run-tests --type unit
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| scope | User (`full` or `issue`) | No (prompted if ambiguous) |
| type | User (`unit`, `api`, `functional`, or `all`) | No (prompted if ambiguous) |
| mode | User (`mock` or `real`) | No (API/functional only) |
| test frameworks | Auto-detected from repos | Yes (BAIL if not scaffolded) |

#### What It Does

1. Discovers repos with test infrastructure (Jest/JUnit/pytest, Insomnia, Playwright).
2. Runs tests per type — full-suite or scoped to the current issue's changed files.
3. Generates reports (HTML dashboard, markdown summary, `results.json`), refreshes workspace dashboard.
4. Classifies results: pass, fail, skip, data-issue, infra — `passRate` excludes skipped.

#### Output

Test results in each repo's `test-results/` directory, workspace summary in docs repo, HTML reports.

#### Example

```
/tdgs-aidlc-run-tests --type api --scope full
```

#### Next Steps

- `/tdgs-aidlc-commit` -- commit any test-related changes
- Review failures and fix code or test data

---

## Sprint Management

### /tdgs-aidlc-generate-dashboard

**Role:** EM
**When to use:** Generate or regenerate the live HTML sprint dashboard.

#### Syntax

```
/tdgs-aidlc-generate-dashboard [{title}]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| title | CLI argument | No (auto-resolved from config) |
| epics | Docs repo | Yes (must exist) |
| sprint-status.yaml | Docs repo | Yes (must exist) |

#### What It Does

1. Loads config and validates prerequisites (epics, sprint-status).
2. Resolves the dashboard title from the argument or config.
3. Delegates to the `sprint-dashboard` skill to generate live HTML.
4. Dashboard auto-refreshes from YAML every 5 seconds at runtime.

#### Output

`sprint-dashboard.html` in the implementation-artifacts directory.

#### Example

```
/tdgs-aidlc-generate-dashboard "TABC Portal - Sprint 3"
```

#### Next Steps

- Serve with `python3 -m http.server 8080` and open `http://localhost:8080/sprint-dashboard.html`

---

### /tdgs-aidlc-update-metrics

**Role:** Both
**When to use:** Update sprint metrics after a story status change.

#### Syntax

```
/tdgs-aidlc-update-metrics
```

Or inline:

```
1-1-story -> in-progress
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| story key | Interactive prompt or inline | Yes |
| new status | Interactive prompt or inline | Yes |

#### What It Does

1. Validates the status transition is allowed.
2. Calculates UTC timestamps and Harvey ball metrics (0-4 scale).
3. Updates `sprint-status.yaml` with the new status and metrics.

#### Output

Updated `sprint-status.yaml`.

#### Example

```
/tdgs-aidlc-update-metrics
> Enter story key: 1-2-auth-service
> New status: in-progress
```

#### Next Steps

- `/tdgs-aidlc-generate-dashboard` -- regenerate dashboard if structure changed

---

### /tdgs-aidlc-manage-blockers

**Role:** EM
**When to use:** Add, resolve, or update blockers on stories.

#### Syntax

```
/tdgs-aidlc-manage-blockers {action} {story_key} {details}
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| action | CLI argument (`add`, `resolve`, `update`) | Yes |
| story_key | CLI argument | Yes |
| summary / impact | CLI argument (for `add`) | Yes (for `add`) |
| resolution | CLI argument (for `resolve`) | Yes (for `resolve`) |
| fields | CLI argument (for `update`) | Yes (for `update`) |

#### What It Does

1. Locates the story in `sprint-status.yaml`.
2. Modifies the blockers array based on the action (add, resolve, or update).
3. Writes the updated YAML.

#### Output

Updated `sprint-status.yaml` with blocker changes.

#### Example

```
/tdgs-aidlc-manage-blockers add 1-2-auth-service "Waiting on SSO cert from infra team"
```

#### Next Steps

- `/tdgs-aidlc-generate-dashboard` -- refresh dashboard to show blocker status

---

### /tdgs-aidlc-metrics-report

**Role:** EM
**When to use:** Generate a markdown metrics summary for stakeholder reporting.

#### Syntax

```
/tdgs-aidlc-metrics-report
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| sprint-status.yaml | Docs repo | Yes (must have stories) |

#### What It Does

1. Parses `sprint-status.yaml` for all story statuses and metrics.
2. Calculates aggregate statistics and identifies attention items.
3. Generates a formatted report from the metrics template.

#### Output

`sprint-metrics-report.md` in the docs repo.

#### Example

```
/tdgs-aidlc-metrics-report
```

#### Next Steps

- Share with stakeholders

---

### /tdgs-aidlc-project-kanban-planning

**Role:** EM
**When to use:** Generate a sprint-ready kanban plan from planning artifacts. Delegates to the `project-kanban-planning` skill.

#### Syntax

```
/tdgs-aidlc-project-kanban-planning
/tdgs-aidlc-project-kanban-planning update
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| mode | CLI argument (`update` for reload mode) | No |
| PRD | Docs repo on planning branch | Yes |
| architecture docs | Docs repo on planning branch | Yes |

#### What It Does

1. Locates the project root and loads configuration.
2. Validates hard prerequisites (PRD, architecture docs); bails if missing.
3. Delegates to the `project-kanban-planning` skill workflow, which:
   - Checks soft prerequisites (epics, sprint-status); delegates to BMAD skills if missing.
   - Prompts for capacity inputs (ADE count or target date).
   - Parses epics for dependencies and complexity estimates.
   - Generates kanban plan, dashboard config, and sprint metrics.
   - Delegates HTML generation to the `sprint-dashboard` skill.
4. In `update` mode, reloads parameters and skips directly to the planning phase.

#### Output

`kanban-plan.md`, `dashboard.md`, `sprint-metrics.md`, `sprint-dashboard.html`.

#### Example

```
/tdgs-aidlc-project-kanban-planning
```

#### Next Steps

- Hand off stories to ADEs via `/tdgs-aidlc-show-available-stories`

---

### /tdgs-aidlc-project-course-correction

**Role:** EM
**When to use:** Apply a mid-project change request to planning artifacts.

#### Syntax

```
/tdgs-aidlc-project-course-correction {issue_id} {source}
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| issue_id | CLI argument | Yes |
| source | CLI argument (`comment`, `sub-issue:{id}`, `document:{path}`, `url:{url}`, `inline`) | Yes |
| i2a-config | `.github/i2a-config/*.yaml` | Yes (auto-read) |
| planning artifacts | Docs repo on planning branch | Yes (auto-read) |
| sprint-status.yaml | Docs repo | Yes (auto-read) |

#### What It Does

1. Gathers change request details from the specified source.
2. Generates a CR brief on the `planning/*` branch.
3. Delegates to `bmad-correct-course` for impact analysis.
4. EM approves, defers, or rejects the change.
5. Applies approved changes to specs, stories, and kanban; commits and creates a PR.

#### Output

CR brief, sprint change proposal, updated planning artifacts, PR from `planning/*` to `project/*`.

#### Example

```
/tdgs-aidlc-project-course-correction 100 sub-issue:105
```

#### Next Steps

- Notify ADEs of scope changes
- `/tdgs-aidlc-show-available-stories` -- review updated story board

---

## Documentation

### /tdgs-aidlc-update-context-docs

**Role:** EM
**When to use:** Sync knowledge base docs after merges to a release or project branch.

#### Syntax

```
/tdgs-aidlc-update-context-docs {issue_id}
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| issue_id | CLI argument | Yes |
| worker_repos | `i2a-config` | Yes (auto-read) |
| current branch | Must be on `release/*` or `project/*` | Yes |

#### What It Does

1. Determines mode (release vs. project) from the current branch.
2. Scans worker repo commits for changes since last sync.
3. Maps code changes to knowledge base documents.
4. Performs BMAD-quality regeneration of affected sections.
5. Writes `.kb-sync-meta.yaml` (project mode).

#### Output

Updated knowledge base docs, `.kb-sync-meta.yaml` (project mode only).

#### Example

```
/tdgs-aidlc-update-context-docs 42
```

#### Next Steps

- `/tdgs-aidlc-commit` -- commit the updated docs
- `/tdgs-aidlc-create-pull-request` -- open a PR for the KB changes

---

### /tdgs-aidlc-validate-runbook-context

**Role:** EM
**When to use:** Validate runbook content against context docs for accuracy.

#### Syntax

```
/tdgs-aidlc-validate-runbook-context
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| runbook files | `runbook/*.md` in docs repo | Yes |
| context docs | Knowledge base | Yes |

#### What It Does

1. Extracts operational data from runbook markdown files.
2. Compares extracted data against context docs across 10 categories.
3. Generates a deterministic validation report with findings.

#### Output

`runbook-validation-report.md` with categorized discrepancies.

#### Example

```
/tdgs-aidlc-validate-runbook-context
```

#### Next Steps

- Review and fix discrepancies in runbooks or context docs

---

### /tdgs-aidlc-validate-test-context

**Role:** EM
**When to use:** Validate manual test cases against context docs for correctness.

#### Syntax

```
/tdgs-aidlc-validate-test-context
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| test cases | `test-management/manual/*.md` | Yes |
| context docs | Knowledge base | Yes |

#### What It Does

1. Extracts business rules from context docs.
2. Parses manual test cases and expected values.
3. Compares test case values against context-doc business rules.
4. Generates a severity-categorized validation report.

#### Output

`test-validation-report.md` with severity-categorized findings.

#### Example

```
/tdgs-aidlc-validate-test-context
```

#### Next Steps

- Review and fix discrepancies in test cases or context docs

---

### /tdgs-aidlc-post-deployment-docs-sync

**Role:** EM
**When to use:** Update the knowledge base after a production release.

#### Syntax

```
/tdgs-aidlc-post-deployment-docs-sync {release} [issues:N,M] [--flags]
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| release | CLI argument (version string) | Yes |
| issues | CLI argument (comma-separated issue IDs) | No (auto-detected) |
| --dry-run | Flag | No |
| --force | Flag | No |
| --skip-apigee | Flag | No |
| --sync-common-services | Flag | No |

#### What It Does

1. Validates the release tag exists and finds merged issues.
2. Prompts for Apigee documentation updates if applicable.
3. Creates a `docs/post-deploy-{release}-{date}` branch **in the docs repo**.
4. Invokes BMAD Document Project in update mode (reads worker repos, writes to docs repo).
5. Adds a deployment history entry.

#### Output

Updated KB docs on the `docs/post-deploy-{release}-{date}` branch **in docs repo**, `deployment-history.md` entry, PR to master.

#### Example

```
/tdgs-aidlc-post-deployment-docs-sync v2.4.0 issues:42,43 --skip-apigee
```

#### Next Steps

- Review the PR and merge to master

---

### /tdgs-aidlc-ops-runbook

**Role:** EM
**When to use:** Before production deployment (or any significant operational change), update the operational runbook (`.docx` or `.md`) to reflect what production WILL look like after the release — new endpoints, changed configurations, or revised procedures. Or create a new `.md` runbook from the Texas.gov template.

#### Syntax

**Update mode:**
```
/tdgs-aidlc-ops-runbook {runbook_path} {release_source}
/tdgs-aidlc-ops-runbook {runbook_path} "repo1=2.2.0, repo2=1.14.0"
```

**Create mode:**
```
/tdgs-aidlc-ops-runbook
/tdgs-aidlc-ops-runbook create
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| `runbook_path` | CLI argument — path to existing `.docx` or `.md` file | Yes (Update mode) |
| `release_source` | CLI argument — path to implementation plan `.md` file, OR manual `repo=version` pairs | Yes (Update mode) |
| `mode` | CLI argument — pass `create` to skip intake question | No (Create mode) |

#### What It Does

**Update mode:**
1. **Exhaustive scanning** — reads ALL relevant knowledge base docs and source code for release-scoped repos to identify what changed operationally.
2. **Evidence table** — builds a structured evidence table mapping each change to the affected runbook section, with source references (HARD GATE: no evidence = no write).
3. **Edit planning** — plans precise insertions and replacements in the runbook, preserving existing formatting and voice (existing content is never deleted per G22).
4. **Execution** — applies edits via `python-docx` (`.docx`) or direct markdown editing (`.md`) with rollback safety (`.bak` created before any write).
5. **Validation** — post-save verification confirms no corruption, no orphaned cross-references, and consistent heading hierarchy.

**Create mode:**
1. Preflight and workspace discovery (KB, source code, services)
2. Mermaid diagram generation (architecture, sequence, integration flows)
3. Template-driven section fill with operational voice
4. Post-generation verification checks
5. Optional screenshot capture via Playwright

#### Output

- **Update:** Updated `.docx` or `.md` runbook file (original backed up as `.bak`), console summary, evidence table
- **Create:** New `.md` runbook in `{docs-repo}/knowledge-base/runbook/`, rendered `.svg` diagrams, diagram manifest

#### Example

```
/tdgs-aidlc-ops-runbook ~/runbooks/MyApp_Runbook_06102026.docx implementation-plan.md
/tdgs-aidlc-ops-runbook ~/runbooks/MyApp_Runbook.md "orderdetails-service=2.2.0, receipt-service=1.14.0"
/tdgs-aidlc-ops-runbook create
```

#### Prerequisites

- Python 3.9+ with `python-docx` installed for `.docx` update mode (`pip3 install python-docx`)
- `mmdc` (mermaid-cli) installed for create mode (`npm install -g @mermaid-js/mermaid-cli`)
- Knowledge base generated (run `/bmad-document-project` during initial setup; refreshed by `/tdgs-aidlc-post-deployment-docs-sync` after subsequent releases)
- The runbook file (`.docx` or `.md`) accessible at the specified path (Update mode)

#### Next Steps

- Review the diff (compare `.bak` vs updated file)
- Commit the updated runbook and create a PR
- Optionally run `/tdgs-aidlc-validate-runbook-context` to verify consistency

---

## Help

### /tdgs-aidlc-help

**Role:** Both
**When to use:** Get a quick reference of all AIDLC prompts, skills, and workflows. Query by name for targeted details, by goal to find the right command, or use `workflows` to see end-to-end sequences.

#### Syntax

```
/tdgs-aidlc-help
/tdgs-aidlc-help {prompt_or_skill}
/tdgs-aidlc-help {goal_or_question}
/tdgs-aidlc-help workflows
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| query | CLI argument (prompt name, skill name, goal, or `workflows`) | No |

#### What It Does

1. **No argument** — shows the full at-a-glance catalog of all 32 prompts + 11 skills grouped by functional area.
2. **Prompt or skill name** (e.g., `commit`, `setup-unit-tests`, `sprint-dashboard`) — shows targeted details: syntax, inputs, what it does, examples, prerequisites, and next steps.
3. **Goal or question** (e.g., `how do I start a new feature`, `run tests`) — maps the goal to the right command(s) with usage guidance.
4. **`workflows`** — shows common end-to-end workflow sequences (first-time setup, M&O dev cycle, project lifecycle, testing pipeline, sprint management).

#### Output

Read-only reference information displayed in the IDE. This command never modifies files.

#### Example

```
/tdgs-aidlc-help                          # Full catalog
/tdgs-aidlc-help commit                   # Details for /tdgs-aidlc-commit
/tdgs-aidlc-help how do I start a feature # Goal-based lookup
/tdgs-aidlc-help workflows               # All workflow sequences
```

#### Next Steps

- Run the suggested command from the help output

---

## Custom Skills

Eleven custom skills provide multi-step workflows that back their associated prompts. Each skill lives in `src/i2a-skills/` and is copied to `.github/i2a-skills/` during setup.

### /tdgs-aidlc-project-kanban-planning (skill)

**Role:** EM (skill)
**When to use:** Backing skill for [`/tdgs-aidlc-project-kanban-planning`](#tdgs-aidlc-project-kanban-planning) — multi-phase planning workflow including capacity estimation, dependency resolution, sprint allocation, and dashboard generation.

#### Syntax

Invoked via `/tdgs-aidlc-project-kanban-planning` (orchestrator prompt delegates here).

#### What It Does

Orchestrator `workflow.md`: validates prerequisites (PRD, architecture), collects capacity inputs, parses epics for dependencies and complexity, generates kanban-plan.md, sprint-status.yaml, sprint-metrics.md, and delegates to the `sprint-dashboard` skill for HTML generation.

---

### /tdgs-aidlc-setup-api-tests (skill)

**Role:** ADE (skill)
**When to use:** Backing skill for [`/tdgs-aidlc-setup-api-tests`](#tdgs-aidlc-setup-api-tests) — full scaffold workflow (discovery, Insomnia collections, test runner, environments).

#### Syntax

Invoked via `/tdgs-aidlc-setup-api-tests` (thin prompt delegates here).

#### What It Does

Runs the multi-step scaffold in `workflow.md`: auto-detect backend services, discover API contracts, create `api-tests/` per service. **Copy** `templates/*.template` into each service; read contracts from `tools/`.

---

### /tdgs-aidlc-generate-api-tests (skill)

**Role:** ADE (skill)
**When to use:** Backing skill for [`/tdgs-aidlc-generate-api-tests`](#tdgs-aidlc-generate-api-tests) — two-phase discovery, test generation, execution, and reporting.

#### Syntax

Invoked via `/tdgs-aidlc-generate-api-tests` (thin prompt delegates here).

#### What It Does

Orchestrator `workflow.md` plus on-demand `tools/` (see `SKILL.md` table). Post-gen: `scripts/post-generation-gate.mjs` + `tools/post-generation-checks.md` (Checks 1–20).

---

### /tdgs-aidlc-sprint-dashboard (skill)

**Role:** EM (skill)
**When to use:** Generate the live HTML sprint dashboard (backing skill for [`/tdgs-aidlc-generate-dashboard`](#tdgs-aidlc-generate-dashboard)).

#### Syntax

```
/tdgs-aidlc-sprint-dashboard
```

#### Inputs

| Input | Source | Required |
|-------|--------|----------|
| epics | Docs repo | Yes |
| kanban-plan.md | Docs repo | Yes |
| sprint-status.yaml | Docs repo | Yes |
| sprint-metrics.md | Docs repo | Yes |

#### What It Does

1. Parses epics, kanban plan, sprint-status, and metrics files.
2. Builds a JavaScript config from the parsed data.
3. Generates an HTML dashboard with KPIs, charts, Harvey ball indicators, blockers, and critical path view.
4. Dashboard auto-refreshes from YAML at runtime (5-second interval).

Sub-workflows provided: `update-sprint-metrics` (backs `/tdgs-aidlc-update-metrics`), `manage-blockers` (backs `/tdgs-aidlc-manage-blockers`), `sprint-metrics-report` (backs `/tdgs-aidlc-metrics-report`).

#### Output

`sprint-dashboard.html`. Regenerate only when structure changes; daily status is read from YAML live.

#### Example

```
/tdgs-aidlc-sprint-dashboard
```

#### Next Steps

- Serve with `python3 -m http.server 8080` to view the dashboard
- `/tdgs-aidlc-update-metrics` -- update story statuses

---

### /tdgs-aidlc-setup-unit-tests (skill)

**Role:** Both (skill)
**When to use:** Scaffold unit test infrastructure in a worker repository (backing skill for [`/tdgs-aidlc-setup-unit-tests`](#tdgs-aidlc-setup-unit-tests)).

#### Syntax

```
/tdgs-aidlc-setup-unit-tests
```

#### What It Does

1. Auto-detects the project's technology stack (Java/Maven/Gradle, JavaScript/TypeScript with Jest/Vitest, Python/pytest, .NET/xUnit, Angular, Vue, Lambda).
2. Scaffolds per-repository unit test infrastructure with appropriate coverage tooling.
3. Generates `generate-report.js` stubs, `coverage.json` configuration, and `TESTING.md` documentation.

Six tool documents govern stack-specific scaffolding (Java, JavaScript, other stacks), preflight discovery, guardrails, and execution verification.

#### Output

Unit test scaffold in the target repository. Hermetic by design — no test-data catalog dependency.

#### Next Steps

- [`/tdgs-aidlc-generate-unit-tests`](#tdgs-aidlc-generate-unit-tests) -- generate unit tests targeting coverage threshold

---

### /tdgs-aidlc-generate-unit-tests (skill)

**Role:** Both (skill)
**When to use:** Generate unit tests for implementation code (backing skill for [`/tdgs-aidlc-generate-unit-tests`](#tdgs-aidlc-generate-unit-tests)).
**Prerequisite:** [`/tdgs-aidlc-setup-unit-tests`](#tdgs-aidlc-setup-unit-tests)

#### Syntax

```
/tdgs-aidlc-generate-unit-tests
```

#### What It Does

1. Performs knowledge-base and source-code discovery.
2. Applies pre-write output contract (U1–U3) validation.
3. Generates hermetic tests per-module with 8 guardrails (hermeticity, exception paths, exact assertions).
4. Runs 8 post-generation mechanical checks.
5. Supports JaCoCo, Jest, Vitest, pytest, and Coverlet reporting frameworks.

Eight tool documents cover discovery, generation rules, guardrails, pre/post-write contracts, constraints, and execution.

#### Output

Generated unit test files with coverage report. Tests are generated per-module until the specified coverage threshold is met.

#### Next Steps

- [`/tdgs-aidlc-run-tests`](#tdgs-aidlc-run-tests) -- execute tests and generate reports

---

### /tdgs-aidlc-setup-functional-tests (skill)

**Role:** Both (skill)
**When to use:** Scaffold Playwright functional test infrastructure in UI repositories (backing skill for [`/tdgs-aidlc-setup-functional-tests`](#tdgs-aidlc-setup-functional-tests)).

#### Syntax

```
/tdgs-aidlc-setup-functional-tests
```

#### What It Does

1. Scaffolds Playwright configuration (`playwright.config.js`), page-object models, and fixtures (`api-mock.js`, catalog fixture, flow-runner).
2. Sets up component detection helpers (react-select, datepicker, wizard).
3. Generates flow descriptors and `generate-report.js` stubs.

Six tool documents cover scaffold structure, component detection, fixtures, flow descriptors, preflight discovery, and verification. Scaffolds are idempotent and safe to re-run.

#### Output

Playwright test infrastructure in the target UI repository.

#### Next Steps

- [`/tdgs-aidlc-setup-testdata`](#tdgs-aidlc-setup-testdata) -- generate test-data catalog (recommended before generation)
- [`/tdgs-aidlc-generate-functional-tests`](#tdgs-aidlc-generate-functional-tests) -- generate functional tests

---

### /tdgs-aidlc-generate-functional-tests (skill)

**Role:** Both (skill)
**When to use:** Generate Playwright functional tests (backing skill for [`/tdgs-aidlc-generate-functional-tests`](#tdgs-aidlc-generate-functional-tests)).
**Prerequisites:** [`/tdgs-aidlc-setup-functional-tests`](#tdgs-aidlc-setup-functional-tests); recommended: [`/tdgs-aidlc-setup-testdata`](#tdgs-aidlc-setup-testdata)

#### Syntax

```
/tdgs-aidlc-generate-functional-tests
```

#### What It Does

1. Multi-phase discovery from flow descriptors, knowledge base, and source code.
2. Applies pre-write contract (F1–F6) and gap analysis.
3. Generates Playwright spec files organized by flow, test-case, and persona matrix.
4. Runs 14+ post-generation checks plus a Standards Audit Script.
5. Supports both mock and real execution modes.

Ten tool documents cover discovery, gap analysis, guardrails, pre/post-write contracts, preflight checks, and execution.

#### Output

Generated Playwright spec files with HTML reports, markdown summaries, and data ledgers.

#### Next Steps

- [`/tdgs-aidlc-run-tests`](#tdgs-aidlc-run-tests) -- execute tests across all layers

---

### /tdgs-aidlc-ops-runbook (skill)

**Role:** EM (skill)
**When to use:** Backing skill for [`/tdgs-aidlc-ops-runbook`](#tdgs-aidlc-ops-runbook) — multi-phase .docx runbook update workflow with evidence-based edits, formatting preservation, and rollback safety.

#### Syntax

Invoked via `/tdgs-aidlc-ops-runbook {runbook_path}` (prompt delegates here).

#### What It Does

Workflow `workflow.md`: 7-phase execution — exhaustive KB + code scanning, evidence table construction, edit planning, python-docx execution (reverse-order insertion, deep-copy XML properties), post-save validation, and rollback on failure. Enforces guardrails (G1–G24) plus PLACE-GATE, STYLE-GATE, VOICE-GATE, and HIST-GATE hard gates.

#### Output

Updated `.docx` with `.bak` backup, console summary, and evidence table.

---

### /tdgs-aidlc-help (skill)

**Role:** Both (skill)
**When to use:** Backing skill for [`/tdgs-aidlc-help`](#tdgs-aidlc-help) — reference data and response logic for catalog, detail, goal-mapping, and workflow-sequence modes.

#### Syntax

Invoked via `/tdgs-aidlc-help` (prompt delegates here).

#### What It Does

Workflow `workflow.md`: parses the user's query, determines response mode (catalog / detail / goal / workflows), reads the appropriate tools file (`tools/catalog-data.md` or `tools/workflow-sequences.md`), and formats the output.

Two tool documents:
- `tools/catalog-data.md` — full per-prompt reference (syntax, inputs, examples, prerequisites, next steps)
- `tools/workflow-sequences.md` — end-to-end workflow sequences for 7 common scenarios

---

## BMAD Commands Used by AIDLC

AIDLC workflows invoke or recommend ~12 BMAD skills. This section provides a quick-reference so users don't need to switch between AIDLC and BMAD documentation.

| BMAD Command | When to Use | Invoked By |
|--------------|-------------|------------|
| `/bmad-generate-project-context` | Generate `project-context.md` AI agent rules (after setup) | EM guide (manual) |
| `/bmad-document-project` | Generate knowledge-base documentation from source code | EM guide (manual) |
| `/bmad-product-brief` | Create product brief during project planning | EM (planning step 3) |
| `/bmad-create-prd` | Create PRD during project planning | EM (planning step 4) |
| `/bmad-create-architecture` | Create solution design during project planning | EM (planning step 5) |
| `/bmad-create-epics-and-stories` | Break PRD into epics and stories | `project-kanban-planning` skill |
| `/bmad-sprint-planning` | Generate sprint-status.yaml for sprint allocation | `project-kanban-planning` skill |
| `/bmad-create-story` | Write detailed story spec for ADE handoff | EM (planning step 9) |
| `/bmad-quick-dev` | ADE: streamlined M&O implementation workflow | `initiate-issue` (recommends) |
| `/bmad-dev-story` | ADE: project story implementation workflow | `initiate-issue` (recommends) |
| `/bmad-code-review` | ADE: pre-PR code review | `initiate-issue` (recommends) |
| `/bmad-correct-course` | Mid-project change request processing | `project-course-correction` (invokes) |

> For the full BMAD skill catalog and upgrade impact analysis, see [Catalog](contributing/catalog.md).
