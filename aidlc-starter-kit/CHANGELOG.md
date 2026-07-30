# Changelog

All notable changes to the **AIDLC Starter Kit** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning Guidelines

- **MAJOR** version: Breaking changes to prompt behavior, workflow restructuring, or incompatible updates
- **MINOR** version: New prompts, significant enhancements, new guide sections, new features
- **PATCH** version: Bug fixes, typos, clarifications, minor improvements

---

## [Unreleased]

### Added
- feat(prompts): add /tdgs-aidlc-project-kanban-planning prompt to front the kanban planning skill

### Documentation
- docs: update prompt counts from 29 to 30 across all guides, README, catalog, and specs
- docs: move kanban planning from Custom Skills to Sprint Management in prompt-reference.md

---




## [2.1.2] - 2026-07-20

### Fixed
- fix(docs): align ops-runbook docs with actual prompt contract (`738d2f5`)
- fix(prompts): use i2a-config for repo discovery in PR, switch, and pre-check commands (`abf66a5`)
- fix(commit): use i2a-config for repo discovery to include symlinked common repos (`00b3a95`)
- fix(docs): use explicit path for project-context-custom-rules.md in generate command (`fe38c9a`)
- fix: consistent pre-deployment positioning for ops-runbook across all docs (`af87082`)

### Documentation
- docs(specs): update specs to v1.7.1, fix version sync, refresh delta document (`14edc4b`)

### Other
- test: sync test suite with codebase — add generate-kb rules, fix guide cross-ref (`9a14f2c`)


## [2.1.1] - 2026-07-16

### Fixed
- fix(prompts): use i2a-config for repo discovery in commit, PR, switch, and pre-check commands (`abf66a5`, `00b3a95`)
- fix(docs): use explicit path for project-context-custom-rules.md in generate command (`fe38c9a`)
- fix(docs): add kb_generation config to setup prompts and user guides (`611ab73`)

---

## [2.1.0] - 2026-07-13

### Added
- feat(docs): add automated KB generation prompt (`8a30fb1`)
- feat(ops-runbook): align template with AC required fields (`315e85d`)
- feat(ops-runbook): add phase 2 create workflow, scripts, and sync with .github (`7b9fb7a`)
- feat(GHI-15): add project-context.md copy step to setup prompts for agent discovery (`8be9d0c`)
- feat(ghi-15): update DB change script conventions and add project-context template (`bf79242`)
- feat: add ops-runbook-update prompt, skill, workflow, and user guide (`4bf5d7b`)

### Changed
- refactor(ops-runbook): simplify Phase 1 update workflow (`e2f8c7b`)

### Fixed
- fix: address PR review comments (`cf84811`)
- fix(docs): address AIDLC 2.1 review feedback (`b2be71f`)
- fix(ops-runbook): address PR #88 review comments (`6f9ba13`)
- fix(ops-runbook): address Copilot PR review comments (`457c974`)
- fix(ops-runbook): browser close detection, anti-duplication guardrails, G31-G32 unretired (`9c40b46`)
- fix: remove stale BMAD terms from docs and add template copy step to setup prompts (`478341f`)
- fix: update commit protocol for .gitkeep file handling on dev/initial-docs-setup branch (`171781f`)
- fix: update knowledge base generation instructions to reference custom rules file (`c8ed861`)
- fix: remove stale BMAD terms from docs and add template copy step to setup prompts (`691f287`)
- fix(ghi-15): remove project-context.md copy step from setup prompts (`989b9b1`)
- fix: address Copilot review — globstar, prod regex, G-number range (`9149388`)
- fix: ops-runbook runs pre-deployment, not post-deployment (`e27859f`)
- fix(GHI-15): remove OVRA-specific project-context.md from starter kit (`95889f2`)
- fix: add free-text mode + audit fixes for ops-runbook (`ad59e79`)
- fix: address Copilot review feedback on ops-runbook integration (`19fd7f0`)
- fix: sync ops-runbook registration across all docs and tests (`606d3c3`)
- fix: address PR review comments from copilot (`2d1c25c`)

### Documentation
- docs: make Apigee workflow backward compatible for Git repos and legacy exports (`a719c66`)
- docs: replace Apigee manual export workflow with Git repo clones (`e598616`)
- docs: replace Apigee manual export workflow with Git repo clones (`a4ebdf9`)
- docs(prompts): update non-GitHub repository handling for local commits and push restrictions (`a5bec0e`)
- docs(prompts): add non-GitHub repo validation to prevent accidental commits (`21f966c`)
- docs(workflow): add Common Services symlink workflow and documentation updates (`b5b0e92`)
- docs: add Oracle 19c DB Enhancement AIDLC conventions (GHI-15) (`093e1a9`)
- docs: integrate ops-runbook prompt into ecosystem documentation (`6c66d3b`)

### Other
- chore: remove release capability delta docs (stale snapshots) (`e0e1319`)
- chore: remove training HTML files from contributing docs (`a920f99`)
- chore: update component counts, exclude rom-estimate from tests, add release artifacts (`1e408c4`)
- chore: update prompt counts and add generate-kb to inventory (`ce44c63`)
- chore: remove unused bmad-prfaq references (`969fbf2`)
- merge: integrate release/aidlc-2.1-changes with Common Services symlink workflow (`86c34fd`)
- Merge remote-tracking branch 'origin/feature/6.3.0-runbook-update' into dev/tst-management-refactor (`afd12f0`)


## [2.0.0] - 2026-06-10

### Added
- feat: add help command and BMAD downgrade guard (`cb2dbfa`)
- feat(release): add NEXT_VERSION override for user-controlled version bumps (`681118f`)
- feat: add maintainer skills and sync test suite (`b2c4bb0`)
- feat: add bug remediation process and prompt reference documentation (`a7602e1`)
- feat(docs): add new-repo-during-development and EM workspace management flows (`5559bc6`)
- feat: add post-merge KB sync for project/* branches (`1d1bf61`)
- feat(dashboard,switch): role-aware switch command, dashboard UX improvements (`347bb65`)
- feat(kanban): add update mode, dual-capacity model, T-shirt sizing, and story spec overhead (`30a45de`)
- feat: restructure repo with src/, doc/ layout and split guides (#586) (`fa42d35`)
- feat: test categorization & slicing rollout (P1-P8) (`044337d`)
- feat(prompts): add sprint course correction workflow (`3052790`)
- feat(branching): add planning/* branch tier for protected project/* workflow (`a5c52bf`)
- feat(kanban-planning): auto-generate sprint dashboard after kanban artifacts (`a516d5e`)
- feat(create-pr): add GitHub issue comment after PR creation (`5482139`)
- feat(sprint-dashboard): add live sprint dashboard module as i2a-skill (`fb52ea8`)
- feat(starter-kit): add unit test generation and setup prompts (`280f12d`)
- feat(setup-unit-tests): scope guard, transitive Mockito clarification, JaCoCo excludes (`b476ec4`)
- feat(database-mcp): add Database MCP Server Setup Guide (`072d328`)
- feat: add G13 defect-revealing tests guardrail to unit test prompt (`35f9d03`)
- feat(aidlc): enhance api-tests, setup-testdata, and run-tests prompts (`09493d5`)
- feat(prompts): enhance generate-api-tests prompt with deep discovery, date format, and polymorphic endpoint coverage (`f999a83`)
- feat: update AIDLC prompts and test management user guide (`8b83767`)
- feat: update aidlc prompts and test management user guide (`5f1ae1a`)
- feat(test-mgmt): integrate run-tests & setup-testdata prompts, align BMAD 6.3.0 (`f1ecf22`)
- feat(aidlc): update and add test management prompts (`35ddd62`)

### Changed
- refactor: rename maintainer role to ACE, add Mermaid diagrams and FS↔TS cross-validation (`5d0edbc`)
- refactor: decompose test prompts into layered skill architecture (`1a3d3b3`)
- refactor: sync test management prompts and skills (`52f9aab`)
- style(test-management): align formatting with restructured docs (`efe5bfc`)
- refactor: rename sprint-course-correction to project-course-correction (`9f9eb28`)

### Fixed
- fix: address Copilot PR review comments (`53c2d39`)
- fix: resolve 38 review findings (10 High, 20 Medium, 8 Low) (`bf4398d`)
- fix: resolve critical findings RV-C001 and RV-C002 from v2 review (`7b68f24`)
- fix: resolve blocker findings from v2 adversarial review (`a72e775`)
- fix: use semver comparison for BMAD version skip check (`203045b`)
- fix: align passRate contract with runner implementation (integer 0–100) (`369e8bd`)
- fix: add YAML frontmatter to all prompts, sync specs and delta to v1.4.1 (`2dbe271`)
- fix: resolve 11 adversarial review findings (3 Blocker, 2 Critical, 5 High, 1 dismissed) (`f161526`)
- fix: align Step 5 and Angular/Vitest scripts to G13 exit-code-preserving pattern, add Windows path normalization to minimatch (`5ce092c`)
- fix(docs): use version-agnostic label in system context diagram (`37582ad`)
- fix: resolve PR #57 review comments, sync specs, and regenerate delta (`4e630b1`)
- fix(docs): sync specs with codebase, add delta update mode (`c09bdbf`)
- fix: resolve all review findings (High, Medium, Low) (`6eb6275`)
- fix: address PR #56 review comments (`9871d69`)
- fix: address PR #49 review comments (`63b17b7`)
- fix: use ruleset bypass + CI guard for project branch protection (`98cc5ae`)
- fix(prompts): add Maven test-failure-ignore and env-cmd guardrails for unit tests (`d27d86b`)
- fix: resolve PR#53 Copilot review — align remaining exit-code and TL;DR wording (`1a79868`)
- fix: resolve Copilot review comments — align internal contradictions (`602775e`)
- fix: resolve PR-51 Copilot review comments (`706a333`)
- fix(tests): update validation suite for new prompts and legitimate content patterns (`c2d3d05`)
- fix(review): address PR #47 review comments for GHI-40 (`e48c09c`)
- fix: test files from phase-2 branch (discard local additions) (`42b3578`)
- fix: normalize cross-platform commands across docs and prompts (`ccc5432`)
- fix: resolve adversarial review findings — stale comments, PS→bash, formatting (`bb039c2`)
- fix: polish guides — step numbering, heading hierarchy, navigation links, catalog accuracy (`a7a10df`)
- fix: resolve Copilot PR review comments (round 2) (`edae976`)
- fix: resolve adversarial review findings across prompts, dashboard, guides, and tests (`d0fc36b`)
- fix: resolve Copilot PR review comments (`656a513`)
- fix: address Copilot PR review comments (`a1e0fb8`)
- fix(release): auto-sync package.json version during release workflow (`8336970`)
- fix(review): address code review findings from GHI-40 (`23a0a3d`)
- fix: rename txgov→tdgs prompts, update tests for new run-tests/setup-testdata prompts (`a398179`)
- fix: functional test prompt corrections from real-mode validation (`0f94010`)
- fix(setup-testdata): replace branch-based formatRecord spec with show-all-fields rule (`caa0f22`)
- fix: close gaps in unit/api/functional test prompts (`a28f62f`)
- fix: align user guides with test prompt interactive flow (`fd99928`)

### Documentation
- docs: sync specs to v1.6.0 — add setup-testdata skill and update counts (`10fccb3`)
- docs: sync specs to v1.5.0 — add help capability and update counts (`85f0771`)
- docs: update project flow guides and add kanban planning step (`7b1047e`)
- docs(skills): update dashboard contract, fixtures, and guardrails (`05db06b`)
- docs(test-management): add workflow diagram, fix broken link, clean up intro (`b1ded85`)
- docs(setup): add symlink option for starter kit installation (`a76856b`)
- docs(em-guide): reorder kanban planning before story creation (`ae2018b`)
- docs: sync prompt guardrails — timeout 60s cap, audit-coverage enforcement, reports sync (`11b7b0e`)

### Other
- merge: release/aidlc-project-flow-phase-2 into feature/aidlc-help (`e89cce9`)
- Updating mcp.json to make Splunk as Optional as not everyone has a Splunk Encrypted Token. The process clearly defines how to get the token but without it the Splunk MCP Server fails to start. (`06e6bca`)
- Merge remote-tracking branch 'origin/feature/review-and-refactor' into dev/tst-management-refactor (`055ed0c`)
- merge: feature/review-and-refactor into dev/tst-management-refactor (`a57d1ce`)
- chore: update PR template with structured format (`9aeb431`)
- Merge remote-tracking branch 'origin/release/aidlc-project-flow-phase-2' into feature/bug-mgmt-kb-update-new-repo (`020178a`)
- revert: restore quick-setup and setup-workspace prompts from target branch (not part of test-management changes) (`55ff124`)
- Merge remote-tracking branch 'origin/feature/tst-management-aidlc-project-flow-phase-2' into dev/6.3.0-tst-management (`2b6769b`)
- merge: bring release/aidlc-project-flow-phase-2 into dev/ghi-40 (`ddad5a3`)
- Merge remote-tracking branch 'origin/feature/tst-management-aidlc-project-flow-phase-2' into dev/6.3.0-tst-management (`84a6b42`)
- refactor!: remove /tdgs-aidlc-switch-issue, resolve PR review comments (`33380f7`)
- chore: remove stray Untitled file (`95b269a`)
- Merge remote-tracking branch 'origin/release/aidlc-project-flow-phase-2' into feature/tdgs-aidlc-phase2-enhancements (`f80b2b0`)
- chore: consolidate internal docs under docs/ and update gitignore (`11142b5`)
- audit: sync setup + generate prompts with industry-standard fixes (`a7fe683`)
- merge: pull origin/master into dev/6.3.0-tst-management, resolve conflicts (keep ours for 5 test prompts with txgov→tdgs rename, accept master for docs/tests/config) (`cad75f5`)
- chore: update generate-functional-tests prompt with category coverage enforcement (`e4690b7`)
- refine api-tests and functional-tests prompt rules for DTO variant coverage and discriminator workflows (`a5fc669`)
- refine aidlc prompt instructions for api, functional, testdata, and run-tests (`bf8b77e`)
- chore: update aidlc prompts for api-tests, functional-tests, and setup-api-tests (`5cf7d00`)
- prompts(setup-testdata): require Chain-Field Auto-Derivation at catalog-build time (`2430ea5`)
- prompts(api-tests): harden generation gates for high-volume regen (`bfab433`)
- chore: sync aidlc prompt updates for generate-api-tests and setup-testdata (`0d34af5`)


## [1.6.0] - 2026-05-14

### Added
- feat(kanban-planning): add dependency graph output to sprint-status.yaml (`1342384`)
- feat(prompts): add /txgov-aidlc-switch-issue command (`29428fb`)
- feat: implement ADE self-service story pickup (`5b7620a`)
- feat(project-workflow): implement 3-tier branching for project type (`48830fb`)
- feat(prompts): add quick-setup command and simplify preflight checks (`20fab92`)
- feat: add project branch support and update guides (`4951447`)

### Changed
- refactor: rename kanban skill, move planning artifacts paths, add update-workspace mode (`75466d5`)
- refactor: rename txgov-aidlc prefix to tdgs-aidlc across starter kit (`1d1fc2d`)

### Fixed
- fix(skill): remove code fence wrapper from kanban planning SKILL.md (`6e074be`)
- fix: project workflow branch consistency and test hardening (`ac91a79`)
- fix: address PR review feedback for project workflow accuracy (`f2a64f6`)
- fix: restore missing Splunk MCP and quick-setup sections, fix attachment paths (`29e37e6`)

### Documentation
- docs(guide): add EM branch handoff as pre-work step for project workflow (`ffdd121`)
- docs(guide): restore Step 2.9 quick-setup section from PR #38 (`11a8e1f`)
- docs(ade-guide): restore Step 4.2 stop-after-approval instruction (`4bb2b0c`)
- docs: add kanban board to EM Delivers to ADEs table (`1169588`)
- docs: fix TOC to include kanban planning step 6.9 and renumber 6.10 (`9a99192`)
- docs: add /bmad-kanban-planning step to project planning workflow (`e26eea6`)
- docs(guides): add BMAD step details and fix self-service flow references (`074b66f`)
- docs(ade-guide): separate pre-work requirements by workflow type (`f9d3ed1`)

### Other
- test: update and expand test suite for 22-prompt kit (`e25f70e`)


## [1.5.0] - 2026-04-30

### Added
- feat: add .gitignore with .DS_Store; fix step-4.2 Quick-Dev workflow for BMAD 6.3.0 (`9bd453e`)
- feat(mcp): add Splunk MCP server configuration and ADE guide documentation (`65ef300`)
- feat(prompts): add quick-setup command and simplify preflight checks (`1cf684d`)
- feat: add comprehensive automated test suite and contributing guide (`69e5c2a`)

### Fixed
- fix: add quick-setup test coverage, remove plan from tracking, clean changelog (`ffd1258`)
- fix: standardize branch naming to ghi-{issue-id} across all documents (`ac105e3`)
- fix: resolve 25 adversarial review findings across guides, prompts, and tests (`0462fe3`)

### Documentation
- docs(guide): update Step 4.2 quick-dev command to prevent auto-implementation (`255d0a2`)
- docs(plan): add VS Code multi-root workspace support plan (`42fa595`)
- docs: align starter kit with BMAD v6.3.0 upgrade (`0d0a23d`)

### Other
- test: add behavioral simulation suite with 376 deterministic rule tests (`cd82b4f`)


## [1.4.0] - 2026-04-10

### Added
- feat(setup-workspace): add legacy prompt cleanup step (`87f5ecf`)
- feat(setup): add automated prerequisite check for required tools (`7428b06`)
- feat: auto-scaffold test infrastructure and issue-scoped pre-checks (`9f57890`)

### Changed
- refactor(prompts): add tdgs-aidlc- prefix to all custom commands (`c6516ed`)
- refactor(setup): rename /setup-bmad-docs to /setup-workspace (`7ab4b3e`)

### Fixed
- fix(test-prompts): pre-ship review fixes for test management suite (`c502eca`)
- fix: optimize testing rules for LLM context survival and fix 27 broken links (`1ba161a`)
- fix: align docs with mandatory project-context.md requirement (`d0542d0`)
- fix: address lead review comments in delivery engineer guide (`4d4ec51`)
- fix: update anchor links and section numbering in agentic user guides (`4f8a439`)

### Documentation
- docs(prompts): add cross-repo issue linking and initial-docs-setup branch support (`e4ae6fa`)
- docs(changelog): add unreleased section for PR review fixes (`73a512b`)
- docs: fix prompt file path references in EM guide custom rules block (`f49d0ab`)
- docs(guides): update user guides and prompts for BMAD 6.2.0 consistency (`60bcec3`)
- docs(guide): document common services detection in ADE setup (`261e1d8`)
- docs(setup): add common services detection for ADE persona (`c2c60f8`)
- docs: add Test Management User Guide to README table of contents (`2602848`)
- docs: migrate BMAD commands from quick-flow-solo-dev to standalone skills (`8d3b764`)

### Other
- Update agentic user guide docs (`15de705`)
- chore: update project-context.md output path to use {output_folder} config variable (`b713677`)
- Resolved merge conflicts and updated prject context refernces with test management rules (`b4dd14c`)


## [1.3.4] - 2026-03-26

### Changed
- refactor(setup): externalize BMAD version to i2a-config.yml (`48b5d0e`)

#### Test Management Prompts (6 new prompts)
- `tdgs-aidlc-setup-functional-tests.prompt.md` — Scaffold Playwright functional test framework inside UI repo (auto-detects UI repo, installs devDeps, creates config, fixtures, page objects)
- `tdgs-aidlc-generate-functional-tests.prompt.md` — Generate and execute Playwright functional tests (positive/negative/edge-case) with business rule discovery across all repos
- `tdgs-aidlc-setup-api-tests.prompt.md` — Scaffold API test framework per backend service repo (Insomnia collections, environments, test data, Node.js test runner with `inso` CLI fallback)
- `tdgs-aidlc-generate-api-tests.prompt.md` — Generate and execute API tests per service with auto-start of backend services, defect categorization, and gap analysis
- `tdgs-aidlc-setup-unit-tests.prompt.md` — Scaffold unit test infrastructure for all repos with configurable coverage target (JaCoCo/Jest/pytest, default 80%)
- `tdgs-aidlc-generate-unit-tests.prompt.md` — Generate unit tests with per-module coverage gates, resumption support (`skip_completed`), and multi-stack support


### Documentation
- docs(initiate-issue): add /tdgs-aidlc-reference-sync as next step after initiate-issue (`c50b79d`)
- docs(setup): add BMAD version detection and update support (`1f74924`)


## [1.3.3] - 2026-03-26
#### Test Management Documentation
- `agentic-user-guide/test-management-user-guide.md` — Developer guide covering all test management prompts, directory structure, report locations, execution methods, and troubleshooting

### Documentation
- docs: add note for custom project rules in project-context step (`3a4466e`)
- docs: add step 3.7.3 for Generate Project Context workflow (`70403a6`)

### Other
- Removed the unnecessary file from commit (`c49417b`)
- Draft for M&O and Projects Co-existence (`d7689fc`)


## [1.3.2] - 2026-03-23

### Fixed
- fix(prompts): update tdgs-aidlc-commit.prompt.md to use dev/* branch pattern (`e97e28b`)


## [1.3.1] - 2026-03-23

### Fixed
- fix(prompts): update `tdgs-aidlc-commit.prompt.md` to use `dev/*` branch pattern to align with v1.2.0 branching model
  - Changed required branch from `feature/*` or `hotfix/*` to `dev/*`
  - Added `feature/*` and `hotfix/*` to protected branches list (these are now integration branches)
  - Updated branch examples to `dev/ghi-{id}-{slug}-{username}` format
  - Updated issue ID extraction pattern for dev branch format

---


## [1.3.0] - 2026-03-13

### Added
- feat(branching): add integration and dev branch support to AIDLC workflow (`d70fe6d`)

### Other
- Potential fix for pull request finding (`e60d923`)
- Potential fix for pull request finding (`16c27b2`)
- chore: resolve merge conflict with master, bump to v1.2.0 (`acc842c`)


## [1.2.0] - 2026-03-13

### Changed

#### M&O Branching Model (Workflow Change)
- **New branch flow**: `master → integration branch → dev branch → PR → (EM manually creates release)`
- **Integration branches**: `feature/ghi-{id}-{slug}` or `hotfix/ghi-{id}-{slug}` created from `master`
- **Dev branches**: `dev/ghi-{id}-{slug}-{username}` created from integration branch
- **Release branches**: Created manually by EM after Test Env validation (outside AIDLC automation)

#### Workflow Step Reordering
- **Step 4.0**: Now `/tdgs-aidlc-initiate-issue` (was reference-sync) — First command ADE runs
- **Step 4.1**: Now `/tdgs-aidlc-reference-sync` (was initiate-issue) — Runs on dev branch after branch creation
- Reference sync changes now flow through PR process with change brief and tech spec

#### Prompts Updated for New Model
- `tdgs-aidlc-initiate-issue.prompt.md` — Creates integration + dev branches from `master`
- `tdgs-aidlc-prepare-repos.prompt.md` — Creates integration + dev branches in worker repos from `master`; Next Steps now directs to notify EM
- `tdgs-aidlc-create-pull-request.prompt.md` — PRs target integration branches; integration→release merges noted as manual EM task
- `tdgs-aidlc-pre-check-pull-request.prompt.md` — Now requires `dev/*` branch (blocks master, feature/*, hotfix/*, release/*)
- `tdgs-aidlc-setup-workspace.prompt.md` — Updated Next Steps messaging

#### User Guides (`agentic-user-guide/`)
- `agentic-delivery-engineer-guide.md`:
  - **Workflow reordering**: Initiate Issue (4.0) → Reference Sync (4.1) → Quick-Spec (4.2)
  - **Updated Mermaid diagram** to reflect new step order
  - **Updated prerequisites** throughout to reference correct step numbers and dev branch requirements
  - **Branch terminology** updated: "feature/hotfix branches" → "integration + dev branches" where appropriate
  - **Pre-check PR** section updated to correctly require dev/* branches
- `engineering-manager-user-guide.md`:
  - Added Section 5 "Assigning Work to ADEs" with old/new model comparison
  - EM now creates release branches manually outside AIDLC
  - Simplified ADE assignment: just issue ID + type (no release branch info needed)

---

## [1.1.0] - 2026-03-10

### Added
- feat: add validate-runbook-context prompt (`e4458e6`)


## [1.0.3] - 2026-03-10

### Fixed
- fix(prompts): add Gitleaks baseline checks for workflow_dispatch triggers (`6822073`)

### Documentation
- docs(guide): add Gitleaks baseline error troubleshooting (`9b3016f`)


## [1.0.2] - 2026-02-26

### Fixed
- fix(readme): use static version badge for private repository (`9528b04`)


## [1.0.1] - 2026-02-26

### Added
- feat(release): add automated versioning and release notes (`c54c013`)
- feat: add post-deployment documentation sync workflow for Engineering Managers (`863390a`)

### Changed
- style(prompts): standardize prompt section dividers for improved readability (`e522df6`)
- refactor(prompts): make prompts platform-agnostic and multi-provider (`e19ed4f`)

### Fixed
- fix(release): require RELEASE_PAT and configure git remote with PAT (`0f74111`)
- fix(release): exclude merge commits from release notes (`89b1f48`)
- fix: address PR review comments (`e88dad3`)

### Documentation
- docs(readme): simplify README with table of contents linking to documentation (`ef6f5fe`)
- docs(prompts): remove pre-commit hooks installation step and update next steps for clarity (`fc2ca71`)
- docs(prompts): add critical pre-flight checks for multi-repository workspace in various prompts (`a543976`)
- docs(prompts): add prerequisites for GitHub MCP activation and clarify workspace structure (`d4a49fc`)
- docs: Remove reference to generated artifacts in BMAD installation section (`b9c6f14`)
- docs: Cleanup unused BMAD folders and update step numbering in setup instructions (`9eacd37`)
- docs: Update sync instructions in the delivery engineer guide to remove master branch requirement (`f8da78f`)
- docs: Update instructions for syncing docs repository to include fetching all remote branches (`b7526c5`)
- docs: Remove Git default branch requirement from prerequisites in the delivery engineer guide (`4df66e6`)
- docs: Update BMAD configuration references in user guides to include .github/copilot-instructions.md (`3d9c74b`)
- docs: Remove references to _bmad-output in user guides and update BMAD configuration instructions (`43f006a`)
- docs: Update commit and PR workflows to clarify branch restrictions and add cleanup step for unused BMAD folders (`ac0ccd7`)
- docs: add workflow overview diagram to engineering manager guide (`a818460`)
- docs: add Apigee export step to delivery engineer guide (`4a47c4a`)
- docs: add Apigee exports awareness to delivery engineer guide (`62788da`)
- docs: remove redundant powershell commands from Apigee export section (`ba247a5`)
- docs: add Apigee API proxy export workflow to document generation (`c10e84f`)
- docs: Enhance multi-repository support in commit and PR workflows (`b665655`)
- docs: Clarify Git default branch requirement in developer user guide (`d327fdc`)
- docs: Add validation for Git default branch configuration in setup instructions (`58dc304`)

### Other
- chore(release): use devopstexasgov as git user for release commits (`c7d6bd7`)
- update the documentaiton (`f347b26`)
- update the script (`fa44531`)
- update the docs as well as  pre-check cmd and pre-commit with gitleak libs (`7049150`)
- Refactor code structure for improved readability and maintainability (`c9a01be`)
- Update engineering-manager-user-guide.md (`f0606ed`)
- Updating documentation for Additional instructions (`82ca96a`)


## [1.0.0] - 2026-02-26

### Added
- Initial release of AIDLC Starter Kit
- Agentic Delivery Engineer Guide (`agentic-user-guide/agentic-delivery-engineer-guide.md`)
- Engineering Manager User Guide (`agentic-user-guide/engineering-manager-user-guide.md`)
- GitHub Copilot prompts for AI-assisted development workflow:
  - `/tdgs-aidlc-setup-workspace` - BMAD installation and configuration
  - `/tdgs-aidlc-install-hooks` - Pre-commit hooks setup
  - `/tdgs-aidlc-reference-sync` - Shared service documentation sync
  - `/tdgs-aidlc-initiate-issue` - Issue branch and change brief creation
  - `/tdgs-aidlc-prepare-repos` - Worker repository branch preparation
  - `/tdgs-aidlc-commit` - Conventional commit creation
  - `/tdgs-aidlc-pre-check-pull-request` - CI pipeline validation
  - `/tdgs-aidlc-create-pull-request` - PR creation with auto-generated description
- BMAD Quick Flow integration (`[QS]`, `[QD]`, `[CR]` commands)
- MCP GitHub Actions configuration for VS Code (`docs-github-starter/.vscode/mcp.json`)
- Project configuration template (`docs-github-starter/i2a-config.yml`)
- Automated release workflow with version management (`.github/workflows/release.yml`)
- Release notes automation via CHANGELOG.md

[Unreleased]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v2.1.2...HEAD
[2.1.2]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v2.1.1...v2.1.2
[2.1.0]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.6.0...v2.0.0
[1.6.0]: https://github.com/Texas-gov-Application-Services/txgov-aidlc-starter-kit/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.3.4...v1.4.0
[1.3.4]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.3.1...v1.3.2
[1.3.0]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Texas-gov-Application-Services/tdgs-aidlc-starter-kit/releases/tag/v1.0.0

