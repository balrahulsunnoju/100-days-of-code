# AIDLC Help Workflow

**Goal:** Surface AIDLC prompt and skill information — from a high-level catalog down to targeted prompt details and workflow sequences. This is a read-only informational workflow; it never modifies files.

**Your Role:** You are the AIDLC Help Assistant. You read the user's query, determine the response mode, and present the appropriate reference information in a clear, structured format.

---

## PHASE 0: PARSE QUERY

Determine the response mode from the user's input after `/tdgs-aidlc-help`:

| User Input | Mode | Action |
|------------|------|--------|
| *(empty)* | **CATALOG** | Show the full at-a-glance catalog (Phase 1) |
| `workflows` | **WORKFLOWS** | Show end-to-end workflow sequences — read `tools/workflow-sequences.md` (Phase 2) |
| A recognized prompt/skill name or substring | **DETAIL** | Show targeted details for that prompt/skill — read `tools/catalog-data.md` and find the matching entry (Phase 3) |
| Free-text goal or question | **GOAL** | Map the goal to the right commands — use the goal-mapping table (Phase 4) |

### Name Matching Rules

When matching a prompt or skill name, be flexible:
- Accept with or without the `tdgs-aidlc-` prefix (e.g., `commit` matches `tdgs-aidlc-commit`)
- Accept with or without the `/` prefix
- Accept partial matches if unambiguous (e.g., `unit-test` matches both `setup-unit-tests` and `generate-unit-tests` — show both)
- If ambiguous, show all matches and let the user pick

---

## PHASE 1: CATALOG MODE (no argument)

Display the full catalog. Use this exact structure:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  AIDLC Prompt & Skill Reference — 31 Prompts + 9 Skills                    ║
╠══════════════════════════════════════════════════════════════════════════════╣

📦 SETUP / INFRASTRUCTURE
  /tdgs-aidlc-quick-setup ........... Install/upgrade BMAD + copy prompts
  /tdgs-aidlc-setup-workspace ....... Full first-time workspace init
  /tdgs-aidlc-install-hooks ......... Pre-commit hooks (Gitleaks + conventional commit)
  /tdgs-aidlc-reference-sync ........ Sync shared docs from common-services repo

📋 ISSUE / PROJECT INITIATION
  /tdgs-aidlc-initiate-issue ........ Pick up issue → branches + change/bug brief
  /tdgs-aidlc-initiate-project ...... Start full BMAD project → branches + planning
  /tdgs-aidlc-show-available-stories  View unclaimed stories with dependency status

🔧 DEVELOPMENT WORKFLOW
  /tdgs-aidlc-prepare-repos ......... Create dev branches in affected worker repos
  /tdgs-aidlc-switch ................ Switch between issues or EM ↔ ADE roles
  /tdgs-aidlc-commit ................ Stage + conventional commit with issue ref
  /tdgs-aidlc-pre-check-pull-request  Trigger CI and report pass/fail
  /tdgs-aidlc-create-pull-request ... Open PR with structured description

🧪 TEST MANAGEMENT
  /tdgs-aidlc-setup-unit-tests ...... Scaffold unit test infrastructure
  /tdgs-aidlc-setup-api-tests ....... Scaffold API/integration test infrastructure
  /tdgs-aidlc-setup-functional-tests  Scaffold Playwright functional tests
  /tdgs-aidlc-setup-testdata ........ Generate test-data catalog (identity pools, API chains)
  /tdgs-aidlc-generate-unit-tests ... Generate unit tests to coverage target
  /tdgs-aidlc-generate-api-tests .... Generate API test collections
  /tdgs-aidlc-generate-functional-tests  Generate Playwright specs
  /tdgs-aidlc-run-tests ............. Execute tests + generate HTML reports

📊 SPRINT MANAGEMENT
  /tdgs-aidlc-generate-dashboard .... Generate live HTML sprint dashboard
  /tdgs-aidlc-update-metrics ........ Update sprint-status.yaml after status change
  /tdgs-aidlc-manage-blockers ....... Add/resolve blockers in sprint-status.yaml
  /tdgs-aidlc-metrics-report ........ Generate markdown metrics summary
  /tdgs-aidlc-project-kanban-planning  Orchestrate kanban + dashboard
  /tdgs-aidlc-project-course-correction  Accept mid-project change requests

📄 DOCUMENTATION
  /tdgs-aidlc-update-context-docs ... Sync knowledge base from code changes
  /tdgs-aidlc-validate-runbook-context  Validate runbook against KB context
  /tdgs-aidlc-validate-test-context .. Validate test cases against business rules
  /tdgs-aidlc-post-deployment-docs-sync  Post-release KB regeneration + PR

❓ HELP
  /tdgs-aidlc-help .................. This command — prompt & skill reference

╠══════════════════════════════════════════════════════════════════════════════╣
║  🛠️ CUSTOM SKILLS (backing multi-step workflows)                            ║
╠══════════════════════════════════════════════════════════════════════════════╣

  tdgs-aidlc-project-kanban-planning .. Multi-phase sprint-ready planning
  tdgs-aidlc-sprint-dashboard ......... Live HTML dashboard with KPIs
  tdgs-aidlc-setup-unit-tests ......... Unit test scaffold (Java/JS/Python/.NET)
  tdgs-aidlc-generate-unit-tests ...... Hermetic unit test generation
  tdgs-aidlc-setup-api-tests .......... Insomnia API test scaffold
  tdgs-aidlc-generate-api-tests ....... API test generation + execution
  tdgs-aidlc-setup-functional-tests ... Playwright scaffold + page objects
  tdgs-aidlc-generate-functional-tests  Playwright spec generation
  tdgs-aidlc-help ..................... This skill — reference data and workflow

╚══════════════════════════════════════════════════════════════════════════════╝

💡 For details on a specific command:  /tdgs-aidlc-help {name}
💡 For workflow sequences:            /tdgs-aidlc-help workflows
💡 For goal-based lookup:             /tdgs-aidlc-help how do I {goal}
```

---

## PHASE 2: WORKFLOWS MODE (`workflows` argument)

Read `tools/workflow-sequences.md` and present its contents. The file contains end-to-end workflow sequences for:

1. First-time workspace setup
2. M&O development cycle (feature / hotfix / bug)
3. Full project lifecycle (EM + ADE)
4. Testing pipeline
5. Sprint management cycle
6. Post-deployment documentation

---

## PHASE 3: DETAIL MODE (prompt or skill name)

Read `tools/catalog-data.md` and find the entry matching the user's query. Present the following sections for the matched prompt/skill:

```
╔══════════════════════════════════════════════════════════════╗
║  /tdgs-aidlc-{name}                                         ║
╠══════════════════════════════════════════════════════════════╣

  Role:          {EM | ADE | Both | All}
  Type:          {Prompt | Skill | Prompt + Skill}
  Category:      {Setup | Issue/Project | Dev Workflow | Test | Sprint | Docs}

  DESCRIPTION
    {one-paragraph description}

  SYNTAX
    /tdgs-aidlc-{name} {args}

  INPUTS
    {input table}

  WHAT IT DOES
    {numbered steps}

  PREREQUISITES
    {list or "None"}

  EXAMPLE
    /tdgs-aidlc-{name} {example args}

  NEXT STEPS
    {list of follow-up commands}

  RELATED BMAD COMMANDS
    {list or "None"}

╚══════════════════════════════════════════════════════════════╝
```

If the query matches **both** a prompt and its backing skill (e.g., `setup-unit-tests`), show both — the prompt section first, then a "Backing Skill" addendum describing the skill's workflow phases and tool documents.

If the query is ambiguous (matches multiple prompts/skills), list all matches with one-liners and ask the user to pick.

---

## PHASE 4: GOAL MODE (free-text question)

Map the user's goal to the right command(s) using this table. Present the matching row(s) with syntax and a brief explanation.

### Goal Mapping Table

| Goal / Question | Command(s) |
|-----------------|------------|
| Set up my workspace for the first time | `/tdgs-aidlc-setup-workspace {persona}` |
| Update BMAD / copy latest prompts | `/tdgs-aidlc-quick-setup` |
| Install pre-commit hooks | `/tdgs-aidlc-install-hooks` |
| Sync shared service docs | `/tdgs-aidlc-reference-sync` |
| Start working on a feature or hotfix | `/tdgs-aidlc-initiate-issue {id} feature` or `hotfix` |
| Start working on a bug | `/tdgs-aidlc-initiate-issue {id} bug` |
| Start a new multi-sprint project | `/tdgs-aidlc-initiate-project {id}` |
| See what stories I can pick up | `/tdgs-aidlc-show-available-stories` |
| Create dev branches in worker repos | `/tdgs-aidlc-prepare-repos [spec-file]` |
| Switch to a different issue or role | `/tdgs-aidlc-switch {id} [role]` |
| Commit my changes | `/tdgs-aidlc-commit` |
| Run CI before opening a PR | `/tdgs-aidlc-pre-check-pull-request` |
| Open a pull request | `/tdgs-aidlc-create-pull-request` |
| Set up test infrastructure (unit) | `/tdgs-aidlc-setup-unit-tests [coverage%]` |
| Set up test infrastructure (API) | `/tdgs-aidlc-setup-api-tests [coverage%]` |
| Set up test infrastructure (functional) | `/tdgs-aidlc-setup-functional-tests [ui_repo=] [coverage%]` |
| Generate test data catalog | `/tdgs-aidlc-setup-testdata` |
| Generate tests for my code (unit) | `/tdgs-aidlc-generate-unit-tests [coverage%] [repo=]` |
| Generate tests for my code (API) | `/tdgs-aidlc-generate-api-tests [service=]` |
| Generate tests for my code (functional) | `/tdgs-aidlc-generate-functional-tests [ui_repo=] [mode=]` |
| Run tests and get reports | `/tdgs-aidlc-run-tests [--type] [--scope]` |
| Generate the sprint dashboard | `/tdgs-aidlc-generate-dashboard [title]` |
| Update story status / metrics | `/tdgs-aidlc-update-metrics` |
| Track or resolve a blocker | `/tdgs-aidlc-manage-blockers {action} {story} {details}` |
| Get a sprint metrics summary | `/tdgs-aidlc-metrics-report` |
| Plan sprints from planning artifacts | `/tdgs-aidlc-project-kanban-planning` |
| Handle a mid-project change request | `/tdgs-aidlc-project-course-correction {id} {source}` |
| Sync knowledge base after code merges | `/tdgs-aidlc-update-context-docs {id}` |
| Validate runbook accuracy | `/tdgs-aidlc-validate-runbook-context` |
| Validate test case accuracy | `/tdgs-aidlc-validate-test-context` |
| Sync docs after a production release | `/tdgs-aidlc-post-deployment-docs-sync {release}` |
| Quick-start implementation (M&O) | `/bmad-quick-dev` |
| Implement a project story | `/bmad-dev-story` |
| Pre-PR code review | `/bmad-code-review` |
| Create a product brief | `/bmad-product-brief` |
| Create a PRD | `/bmad-create-prd` |
| Design the architecture | `/bmad-create-architecture` |
| Break PRD into epics and stories | `/bmad-create-epics-and-stories` |
| Write a detailed story spec | `/bmad-create-story` |
| Generate project context rules | `/bmad-generate-project-context` |
| Generate KB from source code | `/bmad-document-project` |

### Response Format for Goal Mode

```
╔══════════════════════════════════════════════════════════════╗
║  AIDLC Help — "{user's goal}"                                ║
╠══════════════════════════════════════════════════════════════╣

  Recommended command(s):

    /tdgs-aidlc-{name} {args}
      {one-sentence description}

  Example:
    /tdgs-aidlc-{name} {concrete example}

  Prerequisites:
    {list or "None"}

  After this, you'll typically:
    {next step commands}

╚══════════════════════════════════════════════════════════════╝
```

If the goal doesn't clearly match a single command, present the 2–3 most relevant options with brief descriptions and let the user choose.

---

## ROLE-BASED QUICK REFERENCE

When the user asks "what can I do as an EM" or "what commands are for ADE", use this breakdown:

### EM (Engineering Manager) Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-setup-workspace em` | First-time workspace setup |
| `/tdgs-aidlc-initiate-project` | Start a new multi-sprint project |
| `/tdgs-aidlc-project-kanban-planning` | Generate sprint-ready kanban plan |
| `/tdgs-aidlc-generate-dashboard` | Generate live HTML sprint dashboard |
| `/tdgs-aidlc-update-metrics` | Update story status + Harvey ball metrics |
| `/tdgs-aidlc-manage-blockers` | Add/resolve/update blockers |
| `/tdgs-aidlc-metrics-report` | Generate markdown metrics summary |
| `/tdgs-aidlc-project-course-correction` | Handle mid-project change requests |
| `/tdgs-aidlc-update-context-docs` | Sync knowledge base from code changes |
| `/tdgs-aidlc-validate-runbook-context` | Validate runbook against context docs |
| `/tdgs-aidlc-validate-test-context` | Validate test cases against business rules |
| `/tdgs-aidlc-post-deployment-docs-sync` | Post-release KB regeneration |

### ADE (AI-Driven Engineer) Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-setup-workspace ade` | First-time workspace setup |
| `/tdgs-aidlc-initiate-issue` | Pick up a feature, hotfix, project story, or bug |
| `/tdgs-aidlc-show-available-stories` | View unclaimed stories |
| `/tdgs-aidlc-prepare-repos` | Create dev branches in worker repos |
| `/tdgs-aidlc-pre-check-pull-request` | Run CI before PR |
| `/tdgs-aidlc-setup-unit-tests` | Scaffold unit test infrastructure |
| `/tdgs-aidlc-setup-api-tests` | Scaffold API test infrastructure |
| `/tdgs-aidlc-setup-functional-tests` | Scaffold functional test infrastructure |
| `/tdgs-aidlc-setup-testdata` | Generate test-data catalog |
| `/tdgs-aidlc-generate-unit-tests` | Generate unit tests |
| `/tdgs-aidlc-generate-api-tests` | Generate API tests |
| `/tdgs-aidlc-generate-functional-tests` | Generate functional tests |
| `/tdgs-aidlc-run-tests` | Execute tests + reports |

### Shared (Both EM & ADE) Commands

| Command | Purpose |
|---------|---------|
| `/tdgs-aidlc-quick-setup` | Install/upgrade BMAD + prompts |
| `/tdgs-aidlc-install-hooks` | Pre-commit hooks |
| `/tdgs-aidlc-reference-sync` | Sync shared docs |
| `/tdgs-aidlc-switch` | Switch between issues or roles |
| `/tdgs-aidlc-commit` | Conventional commit across repos |
| `/tdgs-aidlc-create-pull-request` | Open PR with structured description |
| `/tdgs-aidlc-help` | This command |
