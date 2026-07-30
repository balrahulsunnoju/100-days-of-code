# Knowledge Base Generation

> **Role:** Engineering Manager | **Reading path:** [EM Guide](em-guide.md) | **Previous:** [Setup](setup.md) | **Next:** [M&O Assignment](mo-assignment.md)

This guide covers first-time knowledge base generation for a new project workspace.

---

## Generate Knowledge Base Documentation

### Step 1: Generate Knowledge Base Documentation

> [Next: Step 2 →](#step-2-generate-project-context)

> ⚠️ **IMPORTANT:** Start a **NEW Agent chat session** before proceeding with this step. This prevents context overflow from the previous setup steps and ensures optimal performance for documentation generation.

Now generate comprehensive project documentation using BMAD's **Document Project** skill. This will create a second commit on the same dev branch.

> **Prerequisite:** Ensure **Claude Opus 4.6** is selected as the model in Copilot Chat (required for optimal documentation quality).

Run the AIDLC prompt that auto-generates a customized "document this project" instruction based on your workspace configuration:

```
/tdgs-aidlc-generate-kb
```

**What happens:**

1. **Config Loading** — Reads `i2a-config.yml` (worker_repos, common_repos) and `_bmad/bmm/config.yaml` (project_name, output paths)
2. **Auto-Detection** — Scans workspace for Apigee proxies (Git repos or exports folder) and validates common service repos
3. **Prompt Assembly** — Builds a customized prompt from the template with your project-specific values
4. **Review & Invoke** — Presents the assembled prompt for your review, then invokes BMAD Document Project skill on confirmation

**Apigee detection modes:**

| Mode | Detection | Use Case |
|------|-----------|----------|
| `auto` (default) | Detects `apigee-exports/` folder OR repos with `apiproxy/` | Most projects |
| `git` | Force git-based proxy repos only | Apigee proxies migrated to Git |
| `exports` | Force exports folder only | Legacy manual exports |
| `false` | Skip Apigee section | No API gateway |

Override in `.github/i2a-config.yml` → `kb_generation` section if auto-detection doesn't match your setup:

<details>
<summary><strong>Configuration Example</strong></summary>

```yaml
# In .github/i2a-config.yml
kb_generation:
  apigee: auto          # auto | git | exports | false
  # apigee_folder: "apigee-exports"   # custom folder name (exports mode)
  # apigee_repos:                      # explicit list (git mode)
  #   - "tdgs-myapp-transaction-proxy"
  #   - "tdgs-myapp-utility-proxy"
```

</details>

> 💡 **Tip:** The prompt assembles all sections (API specs, business docs, shared docs, repo-specific docs, Apigee, common services, project docs) with proper conditional inclusion based on what's detected in your workspace.

<details>
<summary><strong>Manual Approach (Advanced)</strong></summary>

For edge cases where the automated prompt doesn't fit, you can still copy the template from `src/templates/kb-generation-prompt.md` and manually substitute variables. The template uses `{{variable}}` placeholders documented in the prompt file.

</details>

### Step 2: Generate Project Context

> [← Step 1](#step-1-generate-knowledge-base-documentation) | [Step 3 →](#step-3-review-generated-documentation)

> 🔄 **FRESH CHAT RECOMMENDED**: Start a **new Agent chat session** for this step.

Generate a `project-context.md` file that captures critical implementation rules for AI agents. This file is **auto-loaded by Quick-Dev** workflows, ensuring consistent agent behavior across all issues.

#### Purpose

`project-context.md` contains rules that AI agents must follow when investigating, specifying, and implementing code. It serves two critical functions:

1. **Test Coverage** — Controls what test types are included when Quick-Dev's planning step generates a spec's Testing Strategy, ensuring every issue gets unit, functional, and API tests planned and created automatically.
2. **Project Conventions** — Encodes recurring instructions (database script naming, knowledge-base scanning, Common Services flagging) so ADEs don't have to manually type them as Additional Instructions every time they run Quick-Dev.

**Run the command in Copilot Chat:**

```
/bmad-generate-project-context Also refer to the rules provided in .github/templates/project-context-custom-rules.md
```

#### What Happens

The prompt runs a 3-phase collaborative workflow:

**Phase 1 — Discovery.** The agent scans your existing codebase to identify:

- Package files (`package.json`, `pom.xml`, `requirements.txt`, etc.)
- Configuration files (`tsconfig.json`, `.eslintrc`, `.prettierrc`, etc.)
- Existing code patterns and naming conventions
- Architecture decisions from planning artifacts

**Phase 2 — Generation.** For each rule category below, the agent drafts rules and presents you with three options:

| Option | Action |
|--------|--------|
| **A** (Advanced Elicitation) | Deep-dive into that category — the agent asks probing questions to surface non-obvious rules |
| **P** (Party Mode) | Multi-perspective analysis — the agent examines edge cases from different viewpoints |
| **C** (Continue) | Accept the current rules and move to the next category |

The 7 rule categories covered during generation:

| # | Category | What It Captures |
|---|----------|------------------|
| 1 | Technology Stack & Versions | Exact technologies with specific versions and critical constraints |
| 2 | Language-Specific Rules | TypeScript/Java patterns, import/export conventions, error handling |
| 3 | Framework-Specific Rules | Project-specific patterns that differ from framework defaults |
| 4 | **Testing Rules** | Test file naming, testing utilities, coverage requirements (**auto-discovered only — issue-scoped rules must be pasted manually, see below**) |
| 5 | Code Quality & Style Rules | Linting/formatting config, naming conventions, file structure, documentation patterns |
| 6 | Development Workflow Rules | Branch naming, commit messages, PR requirements, deployment patterns |
| 7 | Critical Don't-Miss Rules | Anti-patterns, edge cases, security rules, performance gotchas |

**Phase 3 — Completion.** The agent saves the final `project-context.md` file to the docs folder (`{output_folder}/`).

> 💡 **Tip:** The project context focuses on *unobvious details* that LLMs need to be reminded of — rules that aren't immediately apparent from the codebase structure or standard framework documentation.

#### ⚠️ CRITICAL: Understanding How project-context.md Drives Test Generation

Before pasting rules, understand **why** this step is critical and how the rules flow through the system:

| Workflow | Step | What Happens | Limitation |
|----------|------|--------------|------------|
| Planning (Quick-Dev) | Step 02 (Plan) — Understand | **Skims** project-context.md for patterns | Skim only — testing rules may not be fully parsed |
| Planning (Quick-Dev) | Step 02 (Plan) — Investigate | **Full load** of project-context.md if not loaded earlier | Full load, but may fall out of LLM context by generation phase |
| Planning (Quick-Dev) | Step 02 (Plan) — Generate | Produces Testing Strategy section | **Does NOT re-read project-context.md** — relies on context from earlier phases still being in memory |
| Implementation (Quick-Dev) | Step 1 (Clarify & Route) | Loads project-context.md as foundational reference | Good — loaded fresh at start |
| Implementation (Quick-Dev) | Step 3 (Implement) | Follows tasks from spec | Only implements what the spec includes |
| Implementation (Quick-Dev) | Step 4 (Review) | Verifies project-context rules followed | 3-layer adversarial review checks compliance |

> ⚠️ **Key limitation:** Quick-Dev's planning step (step-02) — the step that decides which tests to include in the spec — does **not** re-read `project-context.md` during generation. It relies on whatever was loaded during the understand and investigate phases. The BMAD framework's Testing Strategy section only says "Unit tests needed, Integration tests needed, Manual testing steps" — it has NO mention of Functional (Playwright) or API tests. **The ONLY way functional and API tests get included is through your project-context.md testing rules.**
>
> This means: if the testing rules fall out of LLM context by Step 3, the spec will include unit tests (BMAD default) but **silently omit** Functional and API tests. This is the root cause of the issue where "unit tests generate but functional tests don't."
>
> **Why the rules in `project-context-custom-rules.md` are structured the way they are:** The enforcement table is placed FIRST (highest LLM attention), rules use 🔴 markers and ALL-CAPS headings (survive context window attrition), and test tasks are required in the Implementation Plan (not just Testing Strategy, which is the last section LLMs fill in).

#### ⚠️ Custom Project Rules (Automatically Loaded)

The `/bmad-generate-project-context` prompt auto-discovers codebase rules (tech stack, naming conventions, file structure, test frameworks), but it **cannot** discover project-specific workflow rules — these are team conventions, not codebase patterns. The auto-discovery will find your test frameworks (JUnit 5, Jest, Playwright) and file naming patterns, but it will **NOT** generate:

- Issue-scoped test generation workflow (layer detection, enforcement tables, self-review gates)
- Test infrastructure pre-check requirements
- Spec self-review gate artifacts (Traceability Table, Enforcement Cross-Check)
- Post-implementation validation commands with report flags
- Post-test execution summary (test-results-{issue-number}.md)
- Database change script naming conventions
- Knowledge-base scanning requirements
- Common Services impact assessment

These rules are maintained in a single reference file: **`project-context-custom-rules.md`** (source: `src/templates/project-context-custom-rules.md` in the starter kit, deployed to `.github/templates/project-context-custom-rules.md` in your workspace).

Because the `/bmad-generate-project-context` command above includes `Also refer to the rules provided in .github/templates/project-context-custom-rules.md`, the agent will automatically load and incorporate these custom rules during generation — **no manual pasting is required**.

> **WARNING:** Every run of `/bmad-generate-project-context` (including the first) generates `project-context.md` from scratch. Custom rules are NOT preserved between runs — the command's reference to `project-context-custom-rules.md` ensures they are re-applied automatically each time.

#### Reviewing Custom Rules

The custom rules in `project-context-custom-rules.md` cover two main categories:

**Testing Rules (Category 4)** — Issue-scoped test generation workflow including:
- Test enforcement table (layer detection matrix)
- Test task requirements (file path + Given/When/Then + CREATE/UPDATE)
- Test scenario discovery (KB + Code scan)
- Test infrastructure pre-check (per-type checklists with Task 0 scaffolding)
- Spec self-review gate (Traceability Table + Enforcement Cross-Check)
- Post-implementation validation (selective run commands with report/coverage flags)
- Post-test execution summary (test-results-{issue-number}.md template)

**Critical Don't-Miss Rules (Category 7)** — Project-specific workflow rules including:
- Database change scripts (DBCR naming pattern + rollback)
- Knowledge-base scanning (all subdirectories listed)
- Common Services impact assessment (flag + coordination note)

> 💡 **Tip:** To modify any of these rules, edit the `project-context-custom-rules.md` template directly. Changes will take effect on the next `/bmad-generate-project-context` run.

---

#### Output

- **File:** `{project-root}/{output_folder}/project-context.md` (docs folder)

> See the [Test Management Guide](test-management.md) for detailed test directory conventions, framework details, and how issue-scoped tests compare to full workspace scan prompts.


> 💡 **Tip:** The project context focuses on **unobvious details** that LLMs need to be reminded of—rules that aren't immediately apparent from the codebase structure or standard framework documentation.

> ⚠️ **IMPORTANT: Verify Custom Rules Were Applied**
>
> After generating `project-context.md`, you **MUST** open the file and verify that ALL custom rules from `project-context-custom-rules.md` are present. If any are missing (e.g., the agent truncated them or failed to load the file), manually add them to the appropriate section before pushing to master.
>
> **Testing Rules section** — verify these subsections exist:
> - 🔴 TEST ENFORCEMENT TABLE (layer detection matrix)
> - 🔴 TEST TASK REQUIREMENTS (file path + Given/When/Then + CREATE/UPDATE)
> - 🔴 TEST SCENARIO DISCOVERY (KB + Code scan table)
> - TEST INFRASTRUCTURE PRE-CHECK (per-type checklists with Task 0 scaffolding)
> - 🔴 SPEC SELF-REVIEW GATE (Artifact A — Traceability Table, Artifact B — Enforcement Cross-Check)
> - 🔴 POST-IMPLEMENTATION VALIDATION (selective run commands with report/coverage flags)
> - 🔴 POST-TEST EXECUTION SUMMARY (test-results-{issue-number}.md template)
>
> **Critical Don't-Miss Rules section** — verify these subsections exist:
> - Database Change Scripts (DBCR naming pattern + rollback)
> - Knowledge-Base Scanning (all subdirectories listed)
> - Common Services Impact Assessment (flag + coordination note)
>
> If any subsection is missing, the issue-scoped Quick-Dev workflow will silently skip that behavior. This is the most common cause of tests not generating during the initiate-issue → quick-dev → quick-dev flow.
>
> All custom rules are sourced from `project-context-custom-rules.md` — edit that file to modify rules for future runs.

---

### Step 3: Review Generated Documentation

> [← Step 2](#step-2-generate-project-context) | [Step 4 →](#step-4-validate-test-context)

After the documentation is generated and project context is created, review the following:

1. **API Specifications** - Verify OpenAPI specs match the actual code
2. **Business Documentation** - Ensure business rules are accurately captured
3. **Shared Documentation** - Check architecture diagrams and data models
4. **Repository Documentation** - Verify each repo has proper docs
5. **Apigee Documentation** - Verify API Gateway documentation accurately reflects the exported Apigee packages
6. **Common Services Documentation** - Verify `knowledge-base/common-services/` was generated for all symlinked common repos
7. **Project Context** - Verify `project-context.md` contains ALL custom rules from `project-context-custom-rules.md` using the verification checklist in Step 2. If any subsection is missing, the Quick-Dev workflow will silently omit that behavior

### Step 4: Validate Test Context

> [← Step 3](#step-3-review-generated-documentation) | [Step 5 →](#step-5-commit-the-documentation)

After reviewing the generated documentation, validate that test cases align with the documented business rules. This critical step identifies discrepancies between test case expectations and context documents.

**Run the command in Copilot Chat:**

```
/tdgs-aidlc-validate-test-context
```

**What This Does:**

1. **Pre-flight checks** - Verifies required context documents exist:
   - `shared/data-models.md`
   - `shared/database-schema.md`
   - `business/business-rules-catalog.md`
   - `business/process-flows.md`
   - `test-management/manual/TC-*.md` test case files

2. **Loads context documents** - Extracts reference data including:
   - Fee rules from business rules catalog
   - Data model field definitions
   - Process flow sequences

3. **Parses test cases** - Extracts payment calculations, quantities, and expected values from each test case

4. **Performs validation comparisons**:
   - Certificate/letter fee validation against documented rules
   - Total calculation validation
   - Quantity/copy limit validation
   - Data model field validation
   - Workflow step validation

5. **Generates validation report** - Creates `workspace/test-validation-report.md` with:
   - Executive summary of discrepancies
   - Detailed comparison tables
   - Coverage gaps
   - Resolution recommendations

**Example Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Test Context Validation Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Cases Analyzed: 15

Validation Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 Fee Discrepancies:   3
  🟡 Calculation Issues:  1
  🔵 Coverage Gaps:       2
  ✅ Matching Cases:      9

Report saved to: workspace/test-validation-report.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> ⚠️ **IMPORTANT:** This validation identifies **discrepancies** — it does not assume which source is correct. The team must verify actual system behavior to determine whether to update the test cases OR the context documents. Re-run validation after making updates to confirm alignment.

### Step 5: Commit the Documentation

> [← Step 4](#step-4-validate-test-context) | [Step 6 →](#step-6-create-pull-request)

Once satisfied with the generated documentation, commit the changes to the same feature branch:

```
/tdgs-aidlc-commit
```

This creates **Commit #2** on the `dev/initial-docs-setup` branch.

---

### Step 6: Create Pull Request

> [← Step 5](#step-5-commit-the-documentation) | [Step 7 →](#step-7-review-the-pr)

Now create a PR targeting the integration branch that contains both commits (initial structure + knowledge base documentation):

```
/tdgs-aidlc-create-pull-request
```

> **Note:** The PR will target `feature/initial-docs-setup` (integration branch). After the PR is approved and merged, the integration branch can then be merged to master.

The PR will include:
- **Commit #1:** `docs(setup): initialize documentation structure`
- **Commit #2:** `docs(knowledge-base): add comprehensive project documentation`

---

### Step 7: Review the PR

> [← Step 6](#step-6-create-pull-request)

#### 7.1: Copilot Review

If GitHub Copilot code review is enabled for your organization, you can request a review from Copilot.

> **Note:** Copilot does not automatically start the review when a PR is opened. You must manually click the **"Request"** link next to the Copilot reviewer in the **Reviewers** section of the PR sidebar.

Review the Copilot suggestions and address any findings.

#### 7.2: Manual Review

1. Go to the PR link shown in the output
2. Assign reviewers from your team
3. Review all documentation for accuracy:
   - API Specifications match the actual code
   - Business rules are accurately captured
   - Architecture diagrams are correct
   - Data models reflect the database schema
   - Apigee API Gateway documentation reflects the exported proxy configurations

---

## Final Workspace Structure

After completing all steps, your workspace will look like:

```
tx-ovra/
├── .github/                              # GitHub Copilot prompts (copied from starter)
│   ├── agents/
│   │   └── ... (BMAD agent definitions)
│   ├── prompts/
│   │   ├── tdgs-aidlc-commit.prompt.md
│   │   ├── tdgs-aidlc-create-pull-request.prompt.md
│   │   ├── tdgs-aidlc-install-hooks.prompt.md
│   │   ├── tdgs-aidlc-pre-check-pull-request.prompt.md
│   │   ├── tdgs-aidlc-setup-workspace.prompt.md
│   │   └── ...
│   └── i2a-config.yml                  # Project configuration
├── .vscode/                              # VS Code workspace settings
│   ├── mcp.json                          # MCP GitHub Actions configuration
│   └── ...                               # (copied from starter)
├── _bmad/                              # BMAD installation
│   ├── bmm/
│   │   └── config.yaml                   # Project-specific config
│   └── core/
├── tdgs-aidlc-starter-kit/             # Can be deleted after setup
├── tx-ovra-docs/                       # Documentation repository
│   ├── .git/
│   ├── project-context.md              # AI agent rules (mandatory — generated in Step 2)
│   ├── knowledge-base/                 # Generated documentation (from BMAD)
│   │   ├── api/                        # OpenAPI specifications
│   │   ├── apigee/                     # Apigee API Gateway documentation
│   │   ├── business/                   # Business documentation
│   │   ├── common-services/            # Common/shared repo docs (from Document Project for symlinked common repos)
│   │   ├── shared/                     # Shared architecture docs
│   │   ├── repos/                      # Repository-specific docs
│   │   ├── project/                    # Project documentation
│   │   ├── master-index.md
│   │   ├── quick-reference.md
│   │   ├── reading-order.md
│   │   └── README.md
│   ├── planning-artifacts/             # BMAD planning outputs
│   └── implementation-artifacts/       # Technical specs
├── tx-ovra-orderdetails-service/       # Code repositories
├── tx-ovra-verificationletter-service/
├── tx-ovra-receipt-service/
├── tx-ovra-ui/
│
│   # Apigee sources (ONE of the following):
│
│   # Option A: Git-based Apigee repos
├── tdgs-ovra-transaction-proxy/        # Apigee proxy Git repositories
├── tdgs-ovra-onlinecertificate-proxy/
├── tdgs-ovra-utility-proxy/
│
│   # OR Option B: Manual export folder
├── apigee-exports/                     # Manually exported Apigee proxies
│   ├── OVRA-REST-API-V1/
│   ├── OvraTransaction/
│   └── OvraUtils/
└── ...
```

**Note:** After setup is complete, you can optionally delete the `tdgs-aidlc-starter-kit/` folder since the prompts have been copied to `.github/`.

---

## Adding KB for New Repositories (Incremental)

> **When:** One or more repositories have been added to the workspace and `i2a-config.yml` after the initial KB generation is already complete. You need to generate KB documentation for just the new repos without re-running the full Document Project workflow.

### Prerequisites

- New repo(s) are cloned into the workspace
- `.github/i2a-config.yml` has been updated with the new repo entries
- You are on the appropriate branch in the docs repo (feature/* for M&O, planning/* for project)

### Process

1. **Start a new Agent chat session** (fresh context for KB generation)

2. **Run BMAD Document Project scoped to the new repo(s)** — use the prompt template below, customized for your project:

   > *document this project*
   >
   > *I have added a new repository to my workspace: `{new-repo-name}`. The existing knowledge-base in `{docs-folder}/knowledge-base/` covers other repos already. Scan ONLY `{new-repo-name}/` and create documentation following the same structure as existing repo docs.*
   >
   > *Create the following in `{docs-folder}/knowledge-base/repos/{new-repo-name}/`:*
   > - *`architecture.md` — service architecture, module structure, dependencies*
   > - *`README.md` — overview, purpose, tech stack*
   > - *`ui-components.md` (only if this is a UI/frontend repo)*
   >
   > *Also update:*
   > - *`{docs-folder}/knowledge-base/api/{new-repo-name}-openapi.yaml` — OpenAPI 3.0.3 spec (if backend service)*
   > - *`{docs-folder}/knowledge-base/shared/technology-stack.md` — add new tech if applicable*
   > - *`{docs-folder}/knowledge-base/shared/system-architecture.md` — add new service to the system diagram*
   > - *`{docs-folder}/knowledge-base/master-index.md` — add entries for new docs*
   >
   > *Use Exhaustive Scan. No assumptions — source code is truth.*

3. **If the new repo introduces a different technology** (e.g., adding a Drupal repo to a Java-only workspace, or a Python service to a Java workspace):
   - Re-run `/bmad-generate-project-context` with the custom rules pasted (see [Step 2: Generate Project Context](#step-2-generate-project-context))
   - This ensures the project context reflects the expanded tech stack

4. **Review the generated KB** — verify accuracy against the actual codebase

5. **Commit and create PR**:
   ```
   /tdgs-aidlc-commit
   /tdgs-aidlc-create-pull-request
   ```

### Multiple Repos at Once

If adding multiple repos simultaneously, you can scope the Document Project prompt to cover all of them in one pass:

> *...I have added two new repositories: `{repo-1}` and `{repo-2}`. Scan both and create documentation...*

### After PR Merges

- ADEs running `/tdgs-aidlc-prepare-repos` will find the new repos in config
- The new repos get their own `knowledge-base/repos/{repo-name}/` section
- Future `/tdgs-aidlc-update-context-docs` runs will **maintain** the new repo's KB from code deltas — but they do NOT substitute for this initial incremental generation step (sync only updates existing docs, it doesn't bootstrap them)

---
