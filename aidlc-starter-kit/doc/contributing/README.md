# Contributing to the AIDLC Starter Kit

Development and testing guide for the starter kit ACE team.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Specification Documents](#specification-documents)
- [ACE (Agentic Capability Engineer) Skills](#ace-agentic-capability-engineer-skills)
- [Repository Structure](#repository-structure)
- [Development Workflow](#development-workflow)
- [Test Suite](#test-suite)
  - [Running Tests](#running-tests)
  - [Test Suites Overview](#test-suites-overview)
  - [Writing New Tests](#writing-new-tests)
- [Version Management](#version-management)
- [Adding or Modifying Prompts](#adding-or-modifying-prompts)
- [Adding or Modifying Guides](#adding-or-modifying-guides)
- [Configuration Changes](#configuration-changes)
- [Release Process](#release-process)

---

## Prerequisites

- **Node.js** v20+ (no additional dependencies required — the test suite uses built-ins only)
- **Git** with conventional commit conventions

Verify your setup:

```bash
node --version   # v20+
npm test         # should report "All N checks passed"
```

---

## Specification Documents

The starter kit has formal specification documents that serve as the authoritative contract for capabilities and architecture:

| Document | Purpose |
|----------|---------|
| [Functional Specification](functional-specification.md) | WHAT the kit does — capability contract organized by functional area |
| [Technical Specification](technical-specification.md) | HOW the kit is built — architecture, patterns, extension guide |

These specs complement (not duplicate) this contributing guide and the [project context](project-context.md). The contributing guide covers *how to work on* the kit; the specs cover *what it is and how it's structured*.

---

## ACE (Agentic Capability Engineer) Skills

Three ACE-only skills live in `doc/contributing/skills/` (not distributed to user workspaces). These automate common maintenance tasks:

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| [i2a-manage-spec](skills/i2a-manage-spec/SKILL.md) | `/i2a-manage-spec` | Generate/update specification documents; produce release capability delta for user training |
| [i2a-manage-test](skills/i2a-manage-test/SKILL.md) | `/i2a-manage-test` | Detect test gaps, create/update/delete tests, execute test suite |
| [i2a-manage-review](skills/i2a-manage-review/SKILL.md) | `/i2a-manage-review` | Adversarial persona-based review (Architect, PM, Dev, QA, BA, UX) with auto-fix |

### Recommended Workflow

After making codebase changes:

1. `/i2a-manage-spec update` — refresh specification documents
2. `/i2a-manage-test sync` — sync tests with codebase and verify they pass
3. `/i2a-manage-review` — adversarial review across all 6 personas
4. `/i2a-manage-review fix` — auto-fix Blocker/Critical/High findings
5. `/i2a-manage-test sync` — re-validate after fixes

Before a release, run `/i2a-manage-spec delta` to generate the Release Capability Delta document for user training.

---

## Repository Structure

```
tdgs-aidlc-starter-kit/
├── README.md
├── CONTRIBUTING.md              # Pointer to doc/contributing/README.md
├── CHANGELOG.md
├── VERSION
├── NEXT_VERSION                 # Override file for next release version
├── package.json
│
├── .github/
│   └── pull_request_template.md # PR description template
│
├── src/                         # Distributable starter files
│   ├── i2a-config.yml
│   ├── .vscode/                 # VS Code settings + MCP config (copied to workspace)
│   ├── i2a-skills/              # 11 custom skills
│   ├── prompts/                 # 33 prompt files (tdgs-aidlc-*.prompt.md)
│   └── templates/               # Copied to .github/templates/ on setup
│       ├── project-context-custom-rules.md
│       └── kb-generation-prompt.md
│
├── doc/                         # User-facing documentation (14 guides)
│   ├── em-guide.md              # EM entry point
│   ├── ade-guide.md             # ADE entry point
│   ├── setup.md                 # Shared setup
│   ├── knowledge-base-generation.md
│   ├── mo-assignment.md
│   ├── mo-workflow.md
│   ├── project-planning.md
│   ├── project-implementation.md
│   ├── post-deployment.md
│   ├── ops-runbook-update.md    # Operational runbook update/create
│   ├── test-management.md
│   ├── reference.md
│   ├── mcp-setup-guide.md       # MCP server configuration
│   ├── prompt-reference.md      # Full command reference (all prompts + skills)
│   └── contributing/
│       ├── README.md            # This file
│       ├── catalog.md           # ACE dependency map
│       ├── project-context.md
│       ├── functional-specification.md   # Capability contract
│       ├── technical-specification.md    # Architecture contract
│       ├── release-capability-delta.md   # Training: changes since last release
│       ├── review-report.md              # Adversarial review findings
│       └── skills/                       # ACE-only skills
│           ├── i2a-manage-spec/
│           ├── i2a-manage-test/
│           └── i2a-manage-review/
│
└── test/                        # Automated validation suite
    ├── harness.js
    ├── test-all.js
    ├── simulation/              # Deterministic behavior simulation rules
    │   └── rules.js
    └── ...
```

### Prompt-to-Skill Mapping

Most prompts map 1:1 to a same-named skill. The exceptions are documented below:

| Prompt | Delegates To Skill | Notes |
|--------|-------------------|-------|
| `generate-dashboard` | `sprint-dashboard` | Dashboard HTML generation sub-workflow |
| `update-metrics` | `sprint-dashboard` | Metrics update sub-workflow |
| `manage-blockers` | `sprint-dashboard` | Blocker management sub-workflow |
| `metrics-report` | `sprint-dashboard` | Report generation sub-workflow |
| All other prompts with skills | Same name (`tdgs-aidlc-{name}`) | 1:1 mapping |

---

## Development Workflow

1. **Create a branch** from `master` using the convention `dev/{issue-number}-short-description`.
2. **Make changes** to prompts, guides, or configuration.
3. **Run the test suite** before committing — it catches broken links, missing sections, stale terminology, and structural regressions.
4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` — new prompts, new guide sections, new capabilities
   - `fix:` — broken links, typos, incorrect instructions
   - `docs:` — documentation-only updates (clarifications, formatting)
   - `test:` — changes to the test suite itself
   - `chore:` — version bumps, config changes, maintenance
5. **Open a pull request** and ensure all tests pass.

---

## Test Suite

The test suite is a zero-dependency Node.js validation framework that checks the entire starter kit for structural correctness, cross-reference integrity, and content quality. It uses only `node:fs` and `node:path` — no npm install required.

### Running Tests

```bash
# Run all tests (failures + summary)
npm test

# Run all tests with verbose output (includes passing checks)
npm run test:verbose

# Run a single suite
npm run test:inventory
npm run test:cross-refs
npm run test:prompts
npm run test:guides
npm run test:versions
npm run test:workflow
npm run test:quality
npm run test:simulation


# Run specific suite(s) via CLI
node test/test-all.js guides versions
```

**Exit codes:** `0` = all pass, `1` = failures found, `2` = unknown suite name.

### Test Suites Overview

| Suite | Script | What It Validates |
|-------|--------|-------------------|
| **Inventory** | `test:inventory` | All 33 prompt files, 14 guides, config file, supporting files exist with valid frontmatter; config schema depth; release workflow structure |
| **Cross-References** | `test:cross-refs` | Internal anchor links, relative file links, prompt invocation references (`/tdgs-aidlc-*`), BMAD skill references |
| **Prompt Structure** | `test:prompts` | Per-prompt required sections, behavioral content (coverage targets, two-phase discovery, MCP prereqs, sensitivity lists, branch protection, output files), global conventions (no TODO/FIXME, pre-flight checks, no empty code blocks) |
| **Guide Structure** | `test:guides` | Required H2 sections, heading hierarchy (no 3+ level jumps), prerequisite mentions, Mermaid diagrams, cross-guide references, content depth (EM sections 5–6, TMG report locations, coverage targets) |
| **Version Consistency** | `test:versions` | `VERSION` file, `package.json`, `README.md` badge, `i2a-config.yml`, and `CHANGELOG.md` all agree on version numbers |
| **Workflow Completeness** | `test:workflow` | ADE/TMG step sequences documented, prompt workflow chains complete, branch naming conventions, security patterns |
| **Content Quality** | `test:quality` | No stale BMAD terminology, consistent abbreviation usage, no empty sections (code-block-aware), no placeholders, no hardcoded paths, valid table formatting, no deprecated agent references, package.json script validity, CONTRIBUTING.md accuracy |
| **Simulation** | `test:simulation` | Behavioral decision logic: branch validation, PR source/target resolution, input parsing, config validation, workflow prerequisites, file sensitivity, stack detection, coverage targets, conventional commits, project branch operations, course correction, test generation |

### Writing New Tests

Tests follow a consistent pattern using the shared harness (`test/harness.js`):

```js
'use strict';

const h = require('./harness');

function run() {
  // Group related checks under a section header
  h.section('My New Checks');

  // Pass/fail with a unique test ID and message
  if (someCondition) {
    h.pass('MY-CHECK', 'Description of what passed');
  } else {
    h.fail('MY-CHECK', 'Description of what failed', 'optional detail');
  }
}

module.exports = { run };
```

To register a new suite, add it to the `SUITES` object in `test/test-all.js` and add a corresponding npm script in `package.json`.

**Key harness utilities:**

| Function | Purpose |
|----------|---------|
| `h.pass(id, msg)` | Record a passing check |
| `h.fail(id, msg, detail?)` | Record a failing check |
| `h.skip(id, msg)` | Record a skipped check |
| `h.section(name)` | Print a section header |
| `h.collectFiles(dirs)` | Scan directories for `{fullPath, relPath}` objects |
| `h.searchFiles(files, regex)` | Search files for pattern matches |
| `h.formatHits(hits)` | Format search hits for failure detail output |
| `h.readContent(filePath)` | Read file contents (cached) |
| `h.printSummary(label)` | Print final pass/fail summary; returns fail count |
| `h.ROOT` | Absolute path to the starter kit root |
| `h.VERBOSE` | Whether `--verbose` was passed |

**Code-block awareness:** When scanning markdown for headings or links, always track fenced code blocks (```` ``` ````) so that comments and example links inside code blocks are not treated as real headings or active links. See `test-guide-structure.js` and `test-cross-references.js` for examples.

---

## Version Management

The starter kit version appears in **four files** that must stay in sync (validated by the `versions` test suite):

| File | Location |
|------|----------|
| `VERSION` | Single-line file at repo root — the source of truth |
| `package.json` | `"version"` field |
| `README.md` | Badge URL: `https://img.shields.io/badge/version-X.Y.Z-blue` |
| `CHANGELOG.md` | Latest `## [X.Y.Z]` entry |

> The release workflow updates all four automatically on every release. Optionally write a greater semver into `NEXT_VERSION` before merge to override the auto-incremented value once (the file is cleared after the release commit).

The BMAD framework version is tracked in `src/i2a-config.yml` under `versions.bmad` and validated against references in guide documentation.

### Automated Releases (GitHub Actions)

Version bumping, changelog generation, tagging, and GitHub Releases are handled automatically by the **Release** workflow (`.github/workflows/release.yml`). You should **not** update `VERSION`, the README badge, or `CHANGELOG.md` manually in most cases.

**How it works:**

| Trigger | Behavior |
|---------|----------|
| Push to `master` | Auto-detects bump type from conventional commit prefixes (`feat:` → minor, `fix:` → patch, `BREAKING CHANGE` → major) |
| Manual dispatch | Choose `patch`, `minor`, or `major` from the Actions UI |

The workflow:

1. Reads the current version from `VERSION`.
2. Calculates the new version based on commit messages or manual selection.
3. Generates categorized release notes from commits (Added, Changed, Fixed, Documentation).
4. Updates `VERSION`, the `README.md` badge, and `CHANGELOG.md` automatically.
5. Commits, tags (`vX.Y.Z`), and pushes to `master`.
6. Creates a GitHub Release with the generated notes.

> **Note:** The workflow requires a `RELEASE_PAT` repository secret (a PAT with `repo` scope from a user in the branch protection bypass list).

### Manual Version Override

If you need to set a specific version outside the normal flow (e.g., initial setup or correcting a mistake):

1. Update `VERSION`, `package.json`, and the `README.md` badge.
2. Run `npm test` to confirm version consistency passes.
3. Commit with `chore(release): set version to X.Y.Z`.

---

## Adding or Modifying Prompts

Prompt files live in `src/prompts/` and follow the naming convention `tdgs-aidlc-{name}.prompt.md`.

**When adding a new prompt:**

1. Create the file following the established structure (Mode, Context, Steps, Output sections).
2. Update the prompt count in `test/test-inventory.js` (the `EXPECTED_PROMPTS` array).
3. Add per-prompt rules in `test/test-prompt-structure.js` if the prompt has specific structural requirements.
4. Add workflow references in `test/test-workflow-completeness.js` if the prompt participates in a workflow chain.
5. Reference the prompt from the appropriate guide(s).
6. Run `npm test` to validate everything links up.

**When modifying an existing prompt:**

1. Ensure heading changes don't break internal anchor links (caught by `cross-refs` suite).
2. Don't introduce TODO/FIXME markers or empty code blocks (caught by `prompts` suite).
3. Verify prompt invocation references remain consistent across guides.

---

## Adding or Modifying Guides

User guides live in `doc/` and have structural rules defined in `test/test-guide-structure.js`.

**Key structural requirements:**

- Each guide has required H2 sections (e.g., prerequisites, overview).
- Heading hierarchy must not skip more than 2 levels (H2 → H4 is fine; H1 → H4 is not).
- Guides must reference specific prompts defined in their `mustContainPrompts` rule.
- Headings inside fenced code blocks are ignored during hierarchy checks.

**When adding a new guide:**

1. Add the file to `doc/`.
2. Register it in the `GUIDE_RULES` object in `test/test-guide-structure.js`.
3. Add it to `test/test-inventory.js`.
4. Link it from `README.md`.
5. Run `npm test`.

---

## Configuration Changes

The `src/i2a-config.yml` file controls:

| Key | Purpose |
|-----|---------|
| `versions.bmad` | BMAD framework version used by workspace setup |
| `issues.repository` | GitHub issue tracker location |
| `worker_repos` | App-specific service repositories (populated by setup prompt) |
| `common_repos` | Symlinked shared/common repos (recommended); merged with `worker_repos` at runtime; KB → `knowledge-base/common-services/` |
| `common_services` | Legacy remote-sync fallback for `/tdgs-aidlc-reference-sync` when symlinks are not possible |
| `kb_generation` | Optional Apigee/mode overrides for `/tdgs-aidlc-generate-kb` (`apigee: auto\|git\|exports\|false`) |

Changes to `versions.bmad` trigger version consistency checks across all guides. For the full consumer map, see [catalog.md](catalog.md).

---

## Release Process

Releases are automated via the GitHub Actions **Release** workflow.

**Standard release (push-triggered):**

1. Merge your PR to `master`.
2. The workflow auto-detects the bump type from commit messages and handles everything: version bump, changelog, tag, and GitHub Release.

**Manual release:**

1. Go to **Actions → Release → Run workflow**.
2. Select the bump type (`patch`, `minor`, or `major`).
3. The workflow handles the rest.

**Pre-merge checklist:**

- All tests pass: `npm test`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
- Breaking changes include `BREAKING CHANGE` in the commit body or `!:` in the type
