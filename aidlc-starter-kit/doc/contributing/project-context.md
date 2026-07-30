# Project Context for AI Agents

> This file provides critical implementation context for AI agents working on the AIDLC Starter Kit codebase. Load this file before making any changes.

## Project Overview

The AIDLC (AI-Assisted Development Lifecycle) Starter Kit provides prompts, configurations, and guides for implementing AI-assisted development workflows using GitHub Copilot and BMAD methodology. It is maintained by the Texas.gov Digital Government Services I2A Team.

- **Target users:** Engineering Managers (EM), Agentic Delivery Engineers (ADE)
- **BMAD dependency:** Pinned to version 6.3.0 in `src/i2a-config.yml`
- **Key constraint:** Zero npm dependencies in the test suite (Node.js built-ins only)

## Technology Stack

- **Runtime:** Node.js v20+ (test suite only)
- **Documentation:** Markdown files
- **Configuration:** YAML (`src/i2a-config.yml`)
- **CI/CD:** GitHub Actions (`.github/workflows/release.yml`)
- **Version tracking:** `VERSION`, `package.json`, and `README.md` badge must stay in sync; `NEXT_VERSION` is an optional one-shot release override

## Directory Structure

- `src/` — Distributable starter files (prompts, skills, config, templates, .vscode settings)
  - `src/prompts/` — 33 prompt files following `tdgs-aidlc-{name}.prompt.md` naming
  - `src/i2a-skills/` — 11 custom skills following `tdgs-aidlc-{name}/` naming with SKILL.md + workflow.md (includes `ops-runbook`)
  - `src/i2a-config.yml` — Template config (BMAD version pin, repo maps, KB generation overrides)
  - `src/templates/` — Deployed to `.github/templates/` on setup (`project-context-custom-rules.md`, `kb-generation-prompt.md`)
- `doc/` — User-facing documentation (14 topic guides; role entry points avoid duplication)
  - `doc/em-guide.md` / `doc/ade-guide.md` — Role entry points (reading maps, not content)
  - `doc/setup.md` — Shared setup guide
  - `doc/ops-runbook-update.md` — Operational runbook update/create (backs `/tdgs-aidlc-ops-runbook`)
  - `doc/contributing/` — ACE docs, catalog, specs, this file
- `test/` — Zero-dependency validation suite (8 suites)

## Configuration Schema (`src/i2a-config.yml`)

| Key | Purpose |
|-----|---------|
| `versions.bmad` | Pinned BMAD install version (currently `6.3.0`) |
| `issues.repository` | GitHub issues owner/repo (empty = current repo) |
| `worker_repos` | App-owned service repos (`key: org/repo`); KB → `knowledge-base/repos/{key}/` |
| `common_repos` | Symlinked shared/common repos (recommended); merged with `worker_repos` at runtime for branch/commit/PR/hooks/KB; KB → `knowledge-base/common-services/{key}/`; PRs get shared-code warnings |
| `common_services` | Legacy remote-sync fallback for `/tdgs-aidlc-reference-sync` when symlinks are not possible — prefer `common_repos` |
| `kb_generation` | Optional overrides for `/tdgs-aidlc-generate-kb` (`apigee: auto\|git\|exports\|false`, optional `apigee_folder` / `apigee_repos`) |

Notable newer prompts: `/tdgs-aidlc-generate-kb` (assemble Document Project prompt; Apigee auto-detect), `/tdgs-aidlc-ops-runbook` (update/create operational runbooks).

## Critical Implementation Rules

### Commits
- Conventional Commits required on every commit (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
- `npm test` MUST pass before pushing

### Documentation Quality
- No TODO/FIXME markers in guides or prompts
- No stale BMAD terminology, removed-skill names, or outdated BMAD version references in user-facing docs
- Guide heading hierarchy: no 3+ level jumps (H2→H4 OK, H1→H4 NOT OK)
- All cross-references must resolve: anchors, file links, prompt invocations (`/tdgs-aidlc-*`), BMAD skill refs (`/bmad-*`)
- No empty sections (heading followed immediately by same-or-higher-level heading with no content between)
- No hardcoded absolute paths (`/Users/`, `C:\Users\`, `/home/`)
- Prompt files must have frontmatter or top-level heading, minimum 50 lines

### Prompt Files
- Naming: `tdgs-aidlc-{name}.prompt.md`
- Location: `src/prompts/`
- Required structure: Mode, Context, Steps, Output sections
- Must reference other prompts by invocation name (`/tdgs-aidlc-*`)

### Version Management
- Version appears in: `VERSION` (source of truth), `package.json`, `README.md` badge, `CHANGELOG.md`
- Optional override: `NEXT_VERSION` (consumed once by release workflow when greater than auto-increment)
- BMAD version in: `src/i2a-config.yml` under `versions.bmad`
- Kit version files must stay in sync (validated by `versions` test suite)

## How to Add a New Prompt

1. Create `src/prompts/tdgs-aidlc-{name}.prompt.md`
2. Add to `EXPECTED_PROMPTS` array in `test/test-inventory.js`
3. Add per-prompt rules in `test/test-prompt-structure.js` if needed
4. Add workflow chain references in `test/test-workflow-completeness.js`
5. Reference from appropriate guide file(s) in `doc/`
6. Update `doc/contributing/catalog.md`
7. Run `npm test`

## How to Add or Modify Guide Files

1. Create/edit file in `doc/`
2. Register in `GUIDE_RULES` in `test/test-guide-structure.js`
3. Add to `EXPECTED_GUIDES` in `test/test-inventory.js`
4. Update entry-point files (`doc/em-guide.md` or `doc/ade-guide.md`)
5. Update cross-references in related docs
6. Run `npm test`

## Release Process

- Automated via `.github/workflows/release.yml`
- Push to `master` auto-detects bump type: `feat:` → minor, `fix:` → patch, `BREAKING CHANGE` → major
- Manual dispatch available via Actions UI (patch/minor/major)
- Workflow updates: VERSION, package.json, README badge, CHANGELOG.md; clears `NEXT_VERSION` after use
- Creates git tag and GitHub Release
- Requires `RELEASE_PAT` repository secret

## Test Suite

8 suites in `test/`, orchestrated by `test/test-all.js`:

| Suite | File | Validates |
|-------|------|-----------|
| inventory | test-inventory.js | All 33 prompts, 14 guides, config, supporting files exist |
| cross-refs | test-cross-references.js | Anchor links, file links, prompt refs, BMAD skill refs |
| prompts | test-prompt-structure.js | Per-prompt required sections, behavioral content |
| guides | test-guide-structure.js | Required H2 sections, heading hierarchy, prerequisites |
| versions | test-version-consistency.js | VERSION/README/config/changelog alignment |
| workflow | test-workflow-completeness.js | Step sequences, prompt chains, branch conventions |
| quality | test-content-quality.js | Forbidden patterns, terminology, placeholders, tables |
| simulation | test-simulation.js | Behavioral decision rules |

### Harness API (test/harness.js)
- `h.pass(id, msg)` / `h.fail(id, msg, detail?)` / `h.skip(id, msg)`
- `h.section(name)` — print section header
- `h.collectFiles(dirs)` — scan directories for files
- `h.searchFiles(files, regex)` — search files for pattern
- `h.readContent(filePath)` — read file (cached)
- `h.ROOT` — absolute path to starter kit root

### Adding a New Test Suite
1. Create `test/test-{name}.js` with `module.exports = { run }`
2. Add to `SUITES` in `test/test-all.js`
3. Add npm script in `package.json`

## DB Enhancement AIDLC Process

The AIDLC workflow supports database-only and full-stack enhancements via `project-context.md` rules and the `project-context-custom-rules.md` template. Key conventions:

### Oracle 19c Database-as-Code Naming

| Artifact | Pattern | Example |
|----------|---------|---------|
| Forward migration | `V<major>.<minor>.<patch>_<seq>_<description>.sql` | `V1.0.1_002_add_order_tracking_number.sql` |
| Rollback script | `U<major>.<minor>.<patch>_<seq>_<description>.sql` | `U1.0.1_002_remove_order_tracking_number.sql` |
| Legacy (non-Oracle) | `DBCR-TX-<APP>-<ISSUE>.sql` / `..._ROLLBACK.sql` | `DBCR-TX-OVRA-GHI-15.sql` |

### DB Enhancement Workflow Rules (enforced via `project-context.md`)

- Every DDL change to a distinct table is its own migration script (enables independent rollback)
- All scripts MUST use the PL/SQL idempotency wrapper with `SCHEMA_VERSION_HISTORY` check
- `master_deploy.sql` manifest MUST be updated with new migration entries
- `db/drift/drift_check.sql` MUST pass before deployment
- **Baseline Sync:** Append DDL changes to `db/baseline/OVRA_METADATA.sql` as a commented block with GHI issue reference, description, applied date, and the equivalent DDL
- Database-only issues skip app-layer tests — verification is via SQL commands
- The `project-context-custom-rules.md` template (`src/templates/`) documents these conventions for generated `project-context.md` files

### Related Files

- `src/templates/project-context-custom-rules.md` — Template rules for DB change scripts, KB scanning, and Common Services Impact Assessment (`common_repos`)
- `src/templates/kb-generation-prompt.md` — Template assembled by `/tdgs-aidlc-generate-kb`
- `.github/project-context.md` — Example generated project-context (OVRA workspace)
- `doc/mo-workflow.md` — M&O workflow referencing DB enhancement instructions

## BMAD Dependency Rules

- AIDLC prompts reference BMAD skills by slash-command name (e.g., `/bmad-quick-dev`)
- Skills are installed at `.github/skills/{skill-name}/` in user workspaces
- BMAD version pinned in `src/i2a-config.yml` (`versions.bmad: "6.3.0"`)
- When upgrading BMAD: update config, run `npm test`, check `doc/contributing/catalog.md` for impact
- Removed legacy planning/bootstrap BMAD skills must NEVER reappear in prompts or docs
