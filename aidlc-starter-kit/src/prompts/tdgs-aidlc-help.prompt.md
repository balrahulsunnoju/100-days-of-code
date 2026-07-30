---
mode: agent
description: "Show all AIDLC prompts, skills, and workflows with syntax, options, and examples. Query by name, goal, or workflow."
---

# /tdgs-aidlc-help

Read-only reference command. This command never modifies files.

## Pre-flight Check: Multi-Repository Workspace

> **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Syntax

```
/tdgs-aidlc-help
/tdgs-aidlc-help {prompt_or_skill}
/tdgs-aidlc-help {goal_or_question}
/tdgs-aidlc-help workflows
```

## Instructions

Determine the response mode from the user's input, then respond using the data below. **Do NOT read any other files** for catalog or goal modes — everything needed is in this prompt.

### Mode A: No argument → Show Catalog

Display this catalog directly. Model column: ⚡ = Fast model OK (GPT-4.1, Sonnet), 🧠 = Reasoning model recommended (Opus 4, o4-mini).

```
📦 SETUP / INFRASTRUCTURE
  ⚡ /tdgs-aidlc-quick-setup ............. Install/upgrade BMAD + copy prompts
  ⚡ /tdgs-aidlc-setup-workspace ........ Full first-time workspace init
  ⚡ /tdgs-aidlc-install-hooks .......... Pre-commit hooks (Gitleaks + conventional commit)
  ⚡ /tdgs-aidlc-reference-sync ......... Sync shared docs from common-services repo

📋 ISSUE / PROJECT INITIATION
  ⚡ /tdgs-aidlc-initiate-issue ......... Pick up issue → branches + change/bug brief
  🧠 /tdgs-aidlc-initiate-project ....... Start full BMAD project → branches + planning
  ⚡ /tdgs-aidlc-show-available-stories . View unclaimed stories with dependency status

🔧 DEVELOPMENT WORKFLOW
  ⚡ /tdgs-aidlc-prepare-repos .......... Create dev branches in affected worker repos
  ⚡ /tdgs-aidlc-switch ................. Switch between issues or EM ↔ ADE roles
  ⚡ /tdgs-aidlc-commit ................. Stage + conventional commit with issue ref
  ⚡ /tdgs-aidlc-pre-check-pull-request . Trigger CI and report pass/fail
  ⚡ /tdgs-aidlc-create-pull-request .... Open PR with structured description

🧪 TEST MANAGEMENT
  🧠 /tdgs-aidlc-setup-unit-tests ....... Scaffold unit test infrastructure
  🧠 /tdgs-aidlc-setup-api-tests ........ Scaffold API/integration test infrastructure
  🧠 /tdgs-aidlc-setup-functional-tests . Scaffold Playwright functional tests
  🧠 /tdgs-aidlc-setup-testdata ......... Generate test-data catalog
  🧠 /tdgs-aidlc-generate-unit-tests .... Generate unit tests to coverage target
  🧠 /tdgs-aidlc-generate-api-tests ..... Generate API test collections
  🧠 /tdgs-aidlc-generate-functional-tests  Generate Playwright specs
  ⚡ /tdgs-aidlc-run-tests .............. Execute tests + generate HTML reports

📊 SPRINT MANAGEMENT
  🧠 /tdgs-aidlc-generate-dashboard ..... Generate live HTML sprint dashboard
  ⚡ /tdgs-aidlc-update-metrics ......... Update sprint-status.yaml after status change
  ⚡ /tdgs-aidlc-manage-blockers ........ Add/resolve blockers in sprint-status.yaml
  ⚡ /tdgs-aidlc-metrics-report ......... Generate markdown metrics summary
  🧠 /tdgs-aidlc-project-kanban-planning  Orchestrate kanban + dashboard
  🧠 /tdgs-aidlc-project-course-correction  Accept mid-project change requests

📄 DOCUMENTATION
  🧠 /tdgs-aidlc-update-context-docs .... Sync knowledge base from code changes
  🧠 /tdgs-aidlc-validate-runbook-context  Validate runbook against KB context
  🧠 /tdgs-aidlc-validate-test-context .. Validate test cases against business rules
  🧠 /tdgs-aidlc-post-deployment-docs-sync  Post-release KB regeneration + PR

❓ HELP
  ⚡ /tdgs-aidlc-help ................... This command

⚡ = Fast model OK    🧠 = Reasoning model recommended
```

End with: `💡 /tdgs-aidlc-help {name}` for details | `/tdgs-aidlc-help workflows` for sequences | `/tdgs-aidlc-help how do I {goal}` for lookup

---

### Mode B: Goal or question → Map to command

Use this table to find the right command. Present the matching row(s) with syntax.

| Goal | Command |
|------|---------|
| Set up workspace first time | `/tdgs-aidlc-setup-workspace {em\|ade}` |
| Update BMAD / prompts | `/tdgs-aidlc-quick-setup` |
| Install pre-commit hooks | `/tdgs-aidlc-install-hooks` |
| Sync shared service docs | `/tdgs-aidlc-reference-sync` |
| Start a feature or hotfix | `/tdgs-aidlc-initiate-issue {id} feature` |
| Start working on a bug | `/tdgs-aidlc-initiate-issue {id} bug` |
| Start a multi-sprint project | `/tdgs-aidlc-initiate-project {id}` |
| See available stories | `/tdgs-aidlc-show-available-stories` |
| Create dev branches | `/tdgs-aidlc-prepare-repos [spec-file]` |
| Switch issue or role | `/tdgs-aidlc-switch {id} [role]` |
| Commit changes | `/tdgs-aidlc-commit` |
| Run CI before PR | `/tdgs-aidlc-pre-check-pull-request` |
| Open a pull request | `/tdgs-aidlc-create-pull-request` |
| Set up unit tests | `/tdgs-aidlc-setup-unit-tests [coverage%]` |
| Set up API tests | `/tdgs-aidlc-setup-api-tests [coverage%]` |
| Set up functional tests | `/tdgs-aidlc-setup-functional-tests` |
| Generate test data | `/tdgs-aidlc-setup-testdata` |
| Generate unit tests | `/tdgs-aidlc-generate-unit-tests [coverage%]` |
| Generate API tests | `/tdgs-aidlc-generate-api-tests [service=]` |
| Generate functional tests | `/tdgs-aidlc-generate-functional-tests` |
| Run tests / get reports | `/tdgs-aidlc-run-tests [--type] [--scope]` |
| Generate sprint dashboard | `/tdgs-aidlc-generate-dashboard [title]` |
| Update story status | `/tdgs-aidlc-update-metrics` |
| Track / resolve blocker | `/tdgs-aidlc-manage-blockers {action} {story}` |
| Sprint metrics summary | `/tdgs-aidlc-metrics-report` |
| Plan sprints (kanban) | `/tdgs-aidlc-project-kanban-planning` |
| Handle change request | `/tdgs-aidlc-project-course-correction {id} {source}` |
| Sync KB after merges | `/tdgs-aidlc-update-context-docs {id}` |
| Validate runbook | `/tdgs-aidlc-validate-runbook-context` |
| Validate test cases | `/tdgs-aidlc-validate-test-context` |
| Post-release docs sync | `/tdgs-aidlc-post-deployment-docs-sync {release}` |
| Begin implementation (M&O) | `/bmad-quick-dev` |
| Implement project story | `/bmad-dev-story` |
| Pre-PR code review | `/bmad-code-review` |
| Create product brief | `/bmad-product-brief` |
| Create PRD | `/bmad-create-prd` |
| Design architecture | `/bmad-create-architecture` |
| Break PRD into stories | `/bmad-create-epics-and-stories` |
| Write story spec | `/bmad-create-story` |
| What can EM do | Show EM commands table below |
| What can ADE do | Show ADE commands table below |

#### EM Commands

`setup-workspace em`, `initiate-project`, `project-kanban-planning`, `generate-dashboard`, `manage-blockers`, `metrics-report`, `project-course-correction`, `update-context-docs`, `validate-runbook-context`, `validate-test-context`, `post-deployment-docs-sync`

#### ADE Commands

`setup-workspace ade`, `initiate-issue`, `show-available-stories`, `prepare-repos`, `pre-check-pull-request`, `setup-unit-tests`, `setup-api-tests`, `setup-functional-tests`, `setup-testdata`, `generate-unit-tests`, `generate-api-tests`, `generate-functional-tests`, `run-tests`

#### Shared Commands

`quick-setup`, `install-hooks`, `reference-sync`, `switch`, `commit`, `create-pull-request`, `update-metrics`, `help`

---

### Mode C: Prompt or skill name → Targeted details

Accept with or without the `tdgs-aidlc-` prefix. If ambiguous, show all matches.

Read the detailed entry from:

```
.github/i2a-skills/tdgs-aidlc-help/tools/catalog-data.md
```

If that file does not exist → BAIL: `❌ Help skill not installed. Run /tdgs-aidlc-quick-setup first.`

Find the matching `### /tdgs-aidlc-{name}` section and present its details (syntax, inputs, what it does, prerequisites, example, next steps).

---

### Mode D: `workflows` → Workflow sequences

Read end-to-end sequences from:

```
.github/i2a-skills/tdgs-aidlc-help/tools/workflow-sequences.md
```

If that file does not exist → BAIL: `❌ Help skill not installed. Run /tdgs-aidlc-quick-setup first.`

Present the contents of that file.
