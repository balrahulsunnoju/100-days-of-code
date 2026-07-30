# i2a-manage-spec

ACE-only skill for generating and maintaining the AIDLC Starter Kit specification documents.

## Audience

ACEs only. This skill is **not** distributed to user workspaces.

## Invocation

```
/i2a-manage-spec
/i2a-manage-spec generate
/i2a-manage-spec update
/i2a-manage-spec validate
/i2a-manage-spec delta
/i2a-manage-spec delta update
```

## Modes

| Mode | Description | Output |
|------|-------------|--------|
| `generate` | Full codebase scan; produce both specification documents from scratch | `functional-specification.md`, `technical-specification.md` |
| `update` | Incremental update of specific sections after codebase changes | Same files, targeted sections |
| `validate` | Read-only drift detection; report where specs diverge from codebase | Console report only |
| `delta` | Compare current branch against `master`; produce training-focused capability delta from scratch | `release-capability-delta.md` |
| `delta update` | Incremental refresh of existing delta document; adds newly-discovered capabilities and fixes stale metadata without regenerating baseline or training sections | Same file, targeted sections |

Default mode (no argument): `generate`.

## Output Files

| Document | Path | Purpose |
|----------|------|---------|
| Functional Specification | `doc/contributing/functional-specification.md` | Capability contract -- WHAT the kit does |
| Technical Specification | `doc/contributing/technical-specification.md` | Architecture contract -- HOW it is built |
| Release Capability Delta | `doc/contributing/release-capability-delta.md` | Training document -- what changed since last release |

## Scan Sources

The skill analyzes these codebase locations to extract current state:

| Location | What Is Extracted |
|----------|-------------------|
| `src/prompts/` | Prompt inventory, capability groups, behavioral patterns |
| `src/i2a-skills/` | Custom skill structure and workflows |
| `src/i2a-config.yml` | Configuration schema and consumer map |
| `doc/` | User-facing guides, role definitions, workflows |
| `doc/contributing/` | ACE docs, catalog, project context |
| `test/` | Test suite structure, harness API, rule definitions |
| `package.json` | Version, npm scripts |
| `VERSION` | Current release version |
| `NEXT_VERSION` | Optional version override for next release |
| `.github/workflows/` | CI/CD pipeline structure (including NEXT_VERSION handling) |
| `README.md` | Product overview, prerequisites |

## Spec Versioning

Specification documents have their own version number, independent of the starter kit release version (`VERSION`). Both specs share the same spec version and are bumped together.

| Rule | Detail |
|------|--------|
| Initial version | 1.0.0 |
| Bump on every `/i2a-manage-spec generate` or `/i2a-manage-spec update` run | Yes |
| Bump type | `patch` for content refresh with no structural changes; `minor` for new sections, new capability areas, or new FRs/NFRs; `major` for document restructuring or breaking changes to section layout |
| Where tracked | `Spec Version` field in each document's metadata table |

When running the skill, read the current `Spec Version` from the existing document, determine the appropriate bump, and update both specs to the same new version.

## Conventions

- Specs cross-reference (not duplicate) existing docs like `catalog.md`, `project-context.md`, and `contributing/README.md`
- Functional spec organizes requirements by capability area (BMAD PRD pattern), not by file or technology
- Technical spec follows BMAD architecture document patterns (context, patterns, structure, boundaries)
- Technical spec Data Flow section includes Mermaid diagrams (system context, component interaction, delivery lifecycle, config flow, installation flow, BMAD integration); update diagrams when component relationships, counts, or delivery paths change
- Functional and technical specs must agree on counts (prompts, skills, guides, config consumers) and capability coverage; validate mode checks FS↔TS consistency
- Delta document is written for users/trainers, not ACEs; explains impact on daily workflows
- All output follows existing guide structure rules: no heading jumps > 2 levels, no empty sections, no hardcoded paths

## Execution Model

This skill is designed for **GitHub Copilot Chat** and uses **parallel tool calls** wherever sub-tasks are independent:

- **Phase 1 (Scan):** All five inventory reads (prompts, skills, guides, tests, config) run in parallel
- **Phase 2 (Draft):** Functional spec and technical spec are drafted concurrently
- **Delta mode:** Master-branch and current-branch content reads run in parallel

See `workflow.md` for the specific parallel batch definitions.

## Workflow

Read and follow: `./workflow.md`
