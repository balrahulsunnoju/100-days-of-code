# i2a-manage-test

ACE-only skill for keeping the AIDLC Starter Kit test suite in sync with the codebase. Detects gaps between what exists in the codebase and what the tests validate, then creates, updates, or deletes test code as needed.

## Audience

ACEs only. This skill is **not** distributed to user workspaces.

## Invocation

```
/i2a-manage-test
/i2a-manage-test audit
/i2a-manage-test sync
/i2a-manage-test execute
```

## Modes

| Mode | Description | Modifies Files? |
|------|-------------|----------------|
| `audit` | Scan codebase vs. test expectations; report gaps | No (read-only) |
| `sync` | Detect gaps, create/update/delete tests with ACE approval, then execute | Yes |
| `execute` | Run `npm test` and report results | No |

Default mode (no argument): `audit`.

## Gap Categories

The test suite uses hardcoded inventories and per-item rule objects that must stay in sync with the codebase. Gaps occur when the codebase evolves but these structures don't.

### Inventory Gaps

**File:** `test/test-inventory.js`

| Gap Type | Detection | Fix |
|----------|-----------|-----|
| New prompt not in `EXPECTED_PROMPTS` | Prompt file exists in `src/prompts/` but not listed | Add to array |
| Deleted prompt still in `EXPECTED_PROMPTS` | Listed but file missing | Remove from array |
| New guide not in `EXPECTED_GUIDES` | Guide file exists in `doc/` but not listed | Add to array |
| Deleted guide still in `EXPECTED_GUIDES` | Listed but file missing | Remove from array |
| New skill not in `EXPECTED_SKILLS` | Skill dir exists in `src/i2a-skills/` but not listed | Add entry with `requiredFiles` |
| Deleted skill still in `EXPECTED_SKILLS` | Listed but directory missing | Remove entry |

### Structural Rule Gaps

**File:** `test/test-prompt-structure.js`

| Gap Type | Detection | Fix |
|----------|-----------|-----|
| New prompt without `PROMPT_RULES` entry | Prompt exists but no matching key in `PROMPT_RULES` | Analyze prompt headings, config usage, and behavioral patterns; generate rule entry |
| Stale `mustHaveSection` patterns | Prompt headings changed but patterns don't match | Update patterns to match current headings |
| Wrong `mustReferenceConfig` flag | Prompt now reads/stopped reading `i2a-config.yml` | Toggle flag |
| Missing `behavioralChecks` | New behavioral pattern in prompt without matching check | Add behavioral check entry |

**File:** `test/test-guide-structure.js`

| Gap Type | Detection | Fix |
|----------|-----------|-----|
| New guide without `GUIDE_RULES` entry | Guide exists but no matching key in `GUIDE_RULES` | Analyze guide H2 sections, prompt refs, guide cross-refs; generate rule entry |
| Stale `requiredH2` patterns | Guide H2 sections changed | Update patterns |
| Stale `mustContainPrompts` | Guide now references different prompts | Update array |
| Stale `mustReferenceGuides` | Guide cross-references changed | Update array |

### Simulation Rule Gaps

**Files:** `test/simulation/rules.js`, `test/test-simulation.js`

| Gap Type | Detection | Fix |
|----------|-----------|-----|
| New deterministic decision branch | Prompt contains decision logic not covered by any rule function | Add rule function and test cases |
| Diverged rule behavior | Rule function output doesn't match prompt's documented behavior | Update rule function |
| Missing workflow chain tests | New workflow prerequisite not tested | Add prerequisite test cases |

### Release Workflow Gaps

**File:** `test/test-inventory.js` (Release Workflow Validation section)

| Gap Type | Detection | Fix |
|----------|-----------|-----|
| Missing NEXT_VERSION support checks | `release.yml` references NEXT_VERSION but inventory tests don't verify it | Add `INV-WF:next-version*` checks |
| Stale release step patterns | Workflow steps changed but `requiredSteps` patterns don't match | Update patterns |
| Missing NEXT_VERSION format validation | `NEXT_VERSION` file exists but `test-version-consistency.js` doesn't validate it | Add `VER-NV-*` checks |

### Infrastructure Gaps

**Files:** `test/test-all.js`, `package.json`

| Gap Type | Detection | Fix |
|----------|-----------|-----|
| New test suite without `SUITES` entry | Test file exists but not registered | Add to `SUITES` object |
| New test suite without npm script | Suite registered but no `test:{name}` script | Add npm script |

## Scan Sources

| Test File | Validates Against |
|-----------|-------------------|
| `test/test-inventory.js` | `src/prompts/`, `doc/`, `src/i2a-skills/`, `src/i2a-config.yml` |
| `test/test-prompt-structure.js` | `src/prompts/` (headings, config refs, behavioral patterns) |
| `test/test-guide-structure.js` | `doc/` (H2 sections, prompt refs, guide cross-refs) |
| `test/test-cross-references.js` | All `.md` files (anchors, file links, prompt refs, BMAD skill refs) |
| `test/test-simulation.js` | `test/simulation/rules.js` vs. prompt decision logic |
| `test/test-version-consistency.js` | `VERSION`, `NEXT_VERSION`, `package.json`, `README.md`, `CHANGELOG.md`, `src/i2a-config.yml` |
| `test/test-all.js` | `package.json` scripts |

## Execution Model

This skill is designed for **GitHub Copilot Chat** and uses **parallel tool calls** wherever sub-tasks are independent:

- **Phase 1 (Scan):** Codebase reads (prompts, guides, skills, config) and test file reads run in a single parallel batch
- **Phase 2 (Compare):** All five gap checks (inventory, prompt rules, guide rules, simulation, infrastructure) run concurrently

See `workflow.md` for the specific parallel batch definitions.

## Workflow

Read and follow: `./workflow.md`
