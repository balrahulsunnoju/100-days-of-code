---
mode: agent
description: "Pick up a GitHub issue, create branches, and generate a change brief or bug brief."
---

# Initiate Issue

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify the docs repository directory first (the folder containing `knowledge-base/`), then run git commands within that directory.

## Input
- `issue`: GitHub Issue ID (required) — e.g., `123` or `#123`
- `type`: Issue Type (required) — `feature`, `hotfix`, `project`, or `bug`

## Syntax
```
/tdgs-aidlc-initiate-issue {issue_id} {type}
```

## Examples
```
/tdgs-aidlc-initiate-issue 123 feature
/tdgs-aidlc-initiate-issue #45 hotfix
/tdgs-aidlc-initiate-issue 42 project
/tdgs-aidlc-initiate-issue 74 bug
```

## Process

### 1. Load Configuration
- Read `.github/i2a-config.yml`
- Extract `issues.repository` setting
  - If set (e.g., `myorg/sim3-tx-ovra-docs`): use for all issue lookups
  - **If empty or missing: BAIL** — configuration required
- Extract `worker_repos` and `common_repos` mappings for service-to-repository lookup (merge both sections)
  - **If `worker_repos` is empty or all entries commented out: BAIL** — configuration required

### 2. Pre-flight Checks
- **Identify the docs repository:**
  - The workspace root may NOT be a git repository (it can be a multi-repo workspace)
  - Locate the docs repository by finding the folder containing `knowledge-base/`
  - Common patterns: `{project}-docs`, `sim*-docs*`, or a folder matching the `{docs}` variable from config
  - All subsequent git operations must be performed **within the docs repository directory**
- **If type is `feature` or `hotfix`:**
  - Verify the docs repository is on `master` branch → BAIL if not on master
- **If type is `project`:**
  - Verify the docs repository is on `master` or the `project/ghi-{issue_id}-*` branch
  - If on a `project/*` branch, verify it matches the issue ID
- **If type is `bug`:**
  - Verify the docs repository is on a `project/ghi-*` branch → BAIL if not on a project branch
  - The bug must be linked to an active project (via GitHub Issue link or label)
- Verify clean working tree in the docs repository → BAIL if dirty
- Verify the following docs repository folders exist and are non-empty → BAIL if any missing or empty:
  - `knowledge-base/`
  - `planning-artifacts/`
  - `implementation-artifacts/`
- Log which folders were found and their file counts for use in Research step

### 2b. GitHub MCP Activation (MANDATORY)

Before any GitHub issue lookup (`gh` CLI or `mcp_github*` tools):

1. Verify GitHub MCP tools are available (pattern `mcp_github`) **or** `gh` is authenticated (`gh auth status` succeeds).
2. If neither is available → **BAIL**: `❌ GitHub MCP is not activated. Enable it per doc/mcp-setup-guide.md before running this command.`
3. Do not create branches until issue data is successfully retrieved.

> Same pattern as `/tdgs-aidlc-reference-sync` → Prerequisites: GitHub MCP Activation.

### 3. Setup
- Parse issue ID from input (strip `#` if present)
- Validate issue type is `feature`, `hotfix`, `project`, or `bug` → BAIL if invalid
- **Get GitHub username:**
  - Run `gh api user --jq '.login'` to get authenticated GitHub username
  - Fallback: Run `git config user.name` and sanitize (lowercase, replace spaces with hyphens)
  - **Sanitize for branch naming**: Remove hyphens from username (e.g., `jane-doe` → `janedoe`) to ensure unambiguous branch parsing
  - Store as `{username}` for dev branch creation

#### 3a. Branch Setup — feature / hotfix
- Create **integration branch** based on issue type: `{type}/ghi-{issue_id}-{slug}`
  - `{type}` = `feature` or `hotfix` (from input)
  - `{issue_id}` = GitHub Issue number (e.g., 123)
  - `{slug}` = kebab-case summary derived from issue title (e.g., `zip-code-enhancement`)
  - Feature Example: `feature/ghi-123-zip-code-enhancement`
  - Hotfix Example: `hotfix/ghi-45-critical-payment-fix`
- Integration branch is created from `master`
- Create **dev branch** for personal work: `dev/ghi-{issue_id}-{slug}-{username}`
  - Example: `dev/ghi-123-zip-code-enhancement-johndoe`
- Dev branch is created from the integration branch
- Push both branches to origin
- Checkout dev branch for work

#### 3b. Branch Setup — project
> For `project` type, the EM has already created the `project/*` integration branch via `/tdgs-aidlc-initiate-project` and merged planning artifacts into it from the `planning/*` branch via PR. The `project/*` branch is **protected** — no direct pushes allowed. This step fetches that branch and checks it out. The docs repo stays on the `project/*` branch throughout development — story-scoped dev branches are only created in worker repos by `/tdgs-aidlc-prepare-repos`.

- **Fetch and validate integration branch:**
  - Run `git fetch origin`
  - Look for remote branch matching `project/ghi-{issue_id}-*` pattern
  - → **BAIL** if no matching `project/ghi-{issue_id}-*` branch found:
    ```
    ❌ Project integration branch not found

    No remote branch matching project/ghi-{issue_id}-* exists.

    The EM must run /tdgs-aidlc-initiate-project {issue_id} first
    to create the project integration branch and planning artifacts.

    Contact your EM to initiate the project.
    ```
  - → **BAIL** if **multiple** matching branches found:
    ```
    ❌ Ambiguous project branch

    Multiple remote branches match project/ghi-{issue_id}-*:
      - project/ghi-{issue_id}-{slug1}
      - project/ghi-{issue_id}-{slug2}

    This is unexpected — each issue should have exactly one project branch.
    Please verify with your EM which branch to use, then check it out manually:
      git checkout project/ghi-{issue_id}-{correct-slug}
    ```
  - Extract `{slug}` from the discovered branch name
  - Checkout the project branch: `git checkout project/ghi-{issue_id}-{slug}`
  - Pull latest: `git pull origin project/ghi-{issue_id}-{slug}`

#### 3c. Branch Setup — bug

> For `bug` type, the docs repo must already be on a `project/*` branch. Bugs branch from the project/epic context — NOT from master. No new integration branch is created; the existing project infrastructure is used.
>
> **The docs repo stays on the `project/*` branch** (same as project type). Bug dev branches are created in worker repos by `/tdgs-aidlc-prepare-repos` — NOT during this step. This step only validates and generates the bug-brief.

- **Validate current docs branch:**
  - Must be on `project/ghi-{pid}-*` where `{pid}` is the **parent project** issue ID
  - Parse `{pid}` and project `{slug}` from the current branch name
- **Fetch the bug issue and identify parent project:**
  - The bug issue body/comments/labels must reference the parent project issue ID
  - If no project link found → BAIL: "Bug must be linked to a project issue"
- **Determine bug branch scope** from the bug issue:
  - If bug references a specific epic (`e{N}`) → scope is epic-level
  - If bug references a specific story (`e{N}-s{S}`) → scope is story-level
  - If bug is cross-cutting (no specific epic/story) → scope is project-level
- **Determine planned dev branch name** (created later by `prepare-repos`):
  - **Project-level** (cross-epic): `dev/ghi-{bug_id}-bug-{slug}-{username}`
    - Will be created FROM `project/ghi-{pid}-*` in worker repos
  - **Epic-level**: `dev/ghi-{bug_id}-bug-e{N}-{slug}-{username}`
    - Will be created FROM `feature/ghi-{pid}-epic-{N}-*` in worker repos
  - **Story-level**: `dev/ghi-{bug_id}-bug-e{N}-s{S}-{slug}-{username}`
    - Will be created FROM `feature/ghi-{pid}-epic-{N}-*` in worker repos
  - `{slug}` = kebab-case summary from bug issue title (capped at 50 chars, truncate at word boundary)
  - **Length limit**: Total branch name max 100 chars
- **Docs repo action**: Stay on `project/*` branch (no branch change)

**Scope prefix (`{scope_prefix}`) definition:**
| Bug Scope | `{scope_prefix}` | Resulting branch pattern |
|-----------|-------------------|--------------------------|
| Project (cross-epic) | _(empty)_ | `dev/ghi-{bug_id}-bug-{slug}-{username}` |
| Epic | `e{N}-` | `dev/ghi-{bug_id}-bug-e{N}-{slug}-{username}` |
| Story | `e{N}-s{S}-` | `dev/ghi-{bug_id}-bug-e{N}-s{S}-{slug}-{username}` |

**Branch naming validation regex:**
```regex
^dev\/ghi-\d+-bug-(e\d+(-s\d+)?-)?[a-z0-9]([a-z0-9-]*[a-z0-9])?-[a-z0-9]+$
```

### 4. Fetch Issue Details
- Fetch GitHub Issue via github-mcp:
  - If `issues.repository` configured: `gh issue view {issue_id} --repo {repository}`
  - Otherwise: `gh issue view {issue_id}` (uses current repo)
- Get full issue body (description)
- Get all issue comments
- **VALIDATE:** Must have substantial guidance → BAIL if:
  - Issue not found
  - Issue body is empty or just placeholder text
  - No clear requirements or acceptance criteria

### 5. Fetch Attachments

> **If type is `project` or `bug`:** SKIP this step. For `project`, the EM already fetched attachments during `/tdgs-aidlc-initiate-project`. For `bug`, attachments are not required — the bug-brief captures all context from the issue. Proceed to Step 6.

- Identify all GitHub user-attachment URLs in issue body and comments
  - These are files uploaded via drag-drop or paste (URLs like `github.com/user-attachments/assets/...`)
- For each attachment:
  - Extract the original filename from the URL
  - Determine if it represents **approved copy** (final content to be implemented) based on filename and surrounding context
- Check for naming collisions → BAIL if multiple attachments share the same filename
- Create `{docs}/planning-artifacts/attachments/` directory if it doesn't exist
- Attempt to download each attachment to `{docs}/planning-artifacts/attachments/{filename}`
- On any download failure:
  - Complete all other download attempts first
  - Report successes and failures
  - **STOP HERE** — BAIL with manual download instructions, do NOT proceed to step 6
- On re-run after manual downloads:
  - Verify all expected attachments exist in `{docs}/planning-artifacts/attachments/`
  - Verify files have non-zero size
  - Continue if all present, BAIL if any missing/empty

### 6. Generate Change Brief / Bug Brief

> **If type is `project`:** SKIP this step — the EM already generated the change brief during `/tdgs-aidlc-initiate-project`. Instead, proceed to **Step 6b: Verify EM Artifacts**.
>
> **If type is `bug`:** SKIP Step 6a and instead proceed to **Step 6c: Generate Bug Brief**.

#### 6a. Generate Change Brief (feature / hotfix)

Create `{docs}/planning-artifacts/change-brief-{issue_id}.md` with the following structure:

```markdown
---
source: github-issue
issue_id: {issue_id}
issue_url: {full GitHub issue URL}
repository: {repository}
issue_type: {type}  # feature or hotfix
integration_branch: {type}/ghi-{issue_id}-{slug}  # e.g., feature/ghi-123-zip-enhancement
dev_branch: dev/ghi-{issue_id}-{slug}-{username}  # e.g., dev/ghi-123-zip-enhancement-johndoe
created: {current datetime}
---

# {issue_title}

## Change Type

**Issue Type:** {type} (feature/hotfix)  
**Integration Branch:** {integration_branch}  
**Dev Branch:** {dev_branch}

## Issue Description

{full issue body - preserve all formatting, links, and markdown}

## Comments

{For each comment, in chronological order:}

### Comment by @{username} on {date}

{full comment body - preserve all formatting}

---

{end for each}

## Attachments

{If attachments exist:}
| Filename | Type | Local Path |
|----------|------|------------|
| {filename} | {approved copy / reference} | {docs}/planning-artifacts/attachments/{filename} |

{If no attachments:}
No attachments.

## Labels

{comma-separated list of issue labels, or "None"}

## Metadata

- **Author:** @{issue_author}
- **Created:** {issue_created_date}
- **Status:** {open/closed}
- **Milestone:** {milestone or "None"}
- **Assignees:** {comma-separated list or "Unassigned"}
```

#### 6b. Verify EM Artifacts (project only)

For `project` type, verify the EM has completed planning. Check that the following artifacts exist:

| Artifact | Location | Required |
|----------|----------|----------|
| Change brief | `{docs}/planning-artifacts/change-brief-{issue_id}.md` | Yes |
| Product brief | `{docs}/planning-artifacts/product-brief-*.md` | Yes |
| PRD | `{docs}/planning-artifacts/prd.md` | Yes |
| Architecture | `{docs}/planning-artifacts/architecture.md` | Yes |
| Epics | `{docs}/planning-artifacts/epics.md` | Yes |
| Sprint status | `{docs}/implementation-artifacts/sprint-status.yaml` | Yes |
| Story spec(s) | `{docs}/implementation-artifacts/{epic}-{story}-{slug}.md` | At least one |

For each artifact:
- Check if file exists
- Log ✓ (found) or ✗ (missing)

**If any required artifact is missing → BAIL:**
```
❌ Missing EM planning artifacts

The following required artifacts were not found:
  ✗ {artifact_name} — {expected_location}

The EM must complete the Full BMAD planning workflow before
you can begin implementation.

Found artifacts:
  ✓ {artifact_name} — {location}

Contact your EM to complete planning.
See EM Guide §6: Project Planning Workflow.
```

**If all artifacts found**, count story specs and list them:
```
✓ Verified {count} EM planning artifacts
✓ Found {story_count} story spec(s):
  - {epic}-{story}-{slug}.md
  - {epic}-{story}-{slug}.md
  ...
```

#### 6c. Generate Bug Brief (bug only)

Create `{docs}/planning-artifacts/bug-brief-{bug_id}.md` with the following structure:

```markdown
---
source: github-issue
issue_id: {bug_id}
issue_url: {full GitHub issue URL}
repository: {issues_repository}
issue_type: bug
parent_project: {pid}
project_branch: project/ghi-{pid}-{project_slug}
bug_scope: {project|epic|story}
epic_number: {N or null}
story_number: {S or null}
dev_branch: dev/ghi-{bug_id}-bug-{scope_prefix}{slug}-{username}
created: {current datetime}
---

# Bug: {issue_title}

## Bug Context

**Issue Type:** bug
**Parent Project:** #{pid}
**Project Branch:** `project/ghi-{pid}-{project_slug}`
**Bug Scope:** {project|epic|story} level
**Dev Branch:** `{dev_branch}`

## Bug Description

{full issue body - preserve all formatting, links, and markdown}

## Comments

{For each comment, in chronological order:}

### Comment by @{username} on {date}

{full comment body - preserve all formatting}

---

{end for each}

## Reproduction Steps

{Extract from issue body if present, otherwise "See issue description"}

## Expected vs Actual Behavior

{Extract from issue body if present, otherwise "See issue description"}

## Labels

{comma-separated list of issue labels, or "None"}

## Metadata

- **Author:** @{issue_author}
- **Created:** {issue_created_date}
- **Status:** {open/closed}
- **Linked Project Issue:** #{pid}
- **Assignees:** {comma-separated list or "Unassigned"}
```

### 7. Output

#### 7a. Output (feature / hotfix)
```
✓ Pre-flight checks passed (on master branch)
✓ Created integration branch: {type}/ghi-{issue_id}-{slug}
✓ Created dev branch: dev/ghi-{issue_id}-{slug}-{username}
✓ Fetched GitHub Issue #{issue_id}
✓ Downloaded attachments to {docs}/planning-artifacts/attachments/ ({count} files)
✓ Created change brief: {docs}/planning-artifacts/change-brief-{issue_id}.md

GitHub Issue: #{issue_id} - {issue_title}
Issue Type: {type}
Integration Branch: {type}/ghi-{issue_id}-{slug}
Dev Branch: dev/ghi-{issue_id}-{slug}-{username}
GitHub Username: {username}

Attachments:
  ✓ {filename} — approved copy
  ✓ {filename} — reference
  (or "No attachments" if none)

⚠️  Changes prepared but NOT committed

═══════════════════════════════════════════════════════════
NEXT STEPS — BMAD Skills
═══════════════════════════════════════════════════════════

🔄 RECOMMENDED: Start each step below in a fresh Agent chat session for best results.

Your dev branch is ready. Now use BMAD skills:

  1. /tdgs-aidlc-reference-sync   — Sync reference docs from shared services
     💡 Fresh chat recommended
     Syncs documentation from common-services repo and analyzes gaps
     Example: /tdgs-aidlc-reference-sync {owner}/{common-services-docs-repo}

  2. /bmad-quick-dev     — Create spec (stops at planning checkpoint)
     💡 Fresh chat recommended
     Input: {docs}/planning-artifacts/change-brief-{issue_id}.md
     Output: {docs}/implementation-artifacts/spec-{slug}.md
     ℹ️  M&O uses /bmad-quick-dev (streamlined for smaller, self-contained changes).
        Project workflow uses /bmad-dev-story (designed for EM-authored story specs
        with full epic context). Use /bmad-quick-dev here because M&O issues have
        no separate planning phase — the agent generates the spec inline.
     
  3. /tdgs-aidlc-prepare-repos    — Create dev branches in affected worker repos
     💡 Fresh chat recommended
     Reads spec, identifies affected repos, creates branches
     
  4. /bmad-quick-dev    — Implement story specs with planning-aware context loading
     💡 Fresh chat recommended per worker repository
  
  5. /bmad-code-review  — 3-layer adversarial code review (Blind Hunter, Edge Case Hunter, Acceptance Auditor)
     💡 Fresh chat recommended (use different LLM if available)

After BMAD flow completes:
  6. Use /tdgs-aidlc-commit to create conventional commit
  7. Use /tdgs-aidlc-create-pull-request to open PR (targets integration branch)

After PR merged to integration:
  8. Notify EM for Test Env deployment and release coordination
```

#### 7b. Output (project)
```
✓ Pre-flight checks passed
✓ Fetched existing integration branch: project/ghi-{issue_id}-{slug}
✓ Checked out project branch
✓ Fetched GitHub Issue #{issue_id} (for context)
✓ Verified EM planning artifacts ({artifact_count} found)
✓ Found {story_count} story spec(s)

GitHub Issue: #{issue_id} - {issue_title}
Issue Type: project (Full BMAD Workflow)
Project Branch: project/ghi-{issue_id}-{slug}
GitHub Username: {username}

Story Specs:
  - {epic}-{story}-{slug}.md
  - {epic}-{story}-{slug}.md
  ...

═══════════════════════════════════════════════════════════
NEXT STEPS — Project Implementation
═══════════════════════════════════════════════════════════

🔄 RECOMMENDED: Start each step below in a fresh Agent chat session for best results.

Your dev branch is ready. EM planning is verified.
Follow the ADE project implementation workflow:

  1. /tdgs-aidlc-reference-sync   — (Optional) Re-sync reference docs for freshness
     💡 Fresh chat recommended

  2. /tdgs-aidlc-prepare-repos    — Create dev branches in affected worker repos
     💡 Fresh chat recommended
     Reads story spec, identifies affected repos, creates branches

  3. /bmad-dev-story               — Implement the story
     💡 Fresh chat recommended per worker repository
     Story: {docs}/implementation-artifacts/{story-spec-file}

  4. /bmad-code-review             — Comprehensive code review
     💡 Fresh chat recommended (use different LLM if available)

After implementation:
  5. Use /tdgs-aidlc-commit to create conventional commit
  6. Use /tdgs-aidlc-pre-check-pull-request to validate PR readiness
  7. Use /tdgs-aidlc-create-pull-request to open PR
     ⚠️  PR targets the EPIC branch: feature/ghi-{issue_id}-epic-{N}-{epic_slug}

After PR merged to epic branch:
  8. Next story → repeat from /tdgs-aidlc-prepare-repos
  9. After all stories in epic merged → EM merges epic branch to project/ghi-* branch

See ADE Guide §5 for full details.
```

#### 7c. Output (bug)
```
✓ Pre-flight checks passed (on project/* branch)
✓ Fetched GitHub Issue #{bug_id} (bug)
✓ Identified parent project: #{pid} (project/ghi-{pid}-{project_slug})
✓ Bug scope: {project|epic|story} level
✓ Created bug-brief: {docs}/planning-artifacts/bug-brief-{bug_id}.md

GitHub Issue: #{bug_id} - {issue_title}
Issue Type: bug
Parent Project: #{pid}
Project Branch: project/ghi-{pid}-{project_slug}
Bug Scope: {scope} level
Planned Dev Branch: dev/ghi-{bug_id}-bug-{scope_prefix}{slug}-{username}
  (created by /tdgs-aidlc-prepare-repos in worker repos)
GitHub Username: {username}

⚠️  Changes prepared but NOT committed

═══════════════════════════════════════════════════════════
NEXT STEPS — Bug Remediation
═══════════════════════════════════════════════════════════

🔄 RECOMMENDED: Start each step below in a fresh Agent chat session for best results.

Bug brief generated. Now follow the M&O-like flow:

  1. /bmad-quick-dev     — Create focused fix spec (stops at planning checkpoint)
     💡 Fresh chat recommended
     Context: Bug fix for #{bug_id}. Read bug-brief at planning-artifacts/bug-brief-{bug_id}.md.
     Produce: root cause, affected repos/files, parent branch, fix approach.

  2. /tdgs-aidlc-prepare-repos    — Create dev branches in affected worker repos
     💡 Fresh chat recommended
     Reads fix spec, identifies affected repos, branches from parent (project/epic)

  3. /bmad-quick-dev    — Implement the fix
     💡 Fresh chat recommended per worker repository

  4. /bmad-code-review  — 3-layer adversarial code review
     💡 Fresh chat recommended (use different LLM if available)

After fix completes:
  5. Use /tdgs-aidlc-commit to create conventional commit
  6. Use /tdgs-aidlc-create-pull-request to open PR
     ⚠️  PR target depends on bug scope:
       - Epic-level: feature/ghi-{pid}-epic-{N}-* (epic branch)
       - Project-level: project/ghi-{pid}-* (project branch)
```

## Edge Cases
- Issues repository not configured: BAIL with message:
  ```
  ❌ Issues repository not configured
  
  The `issues.repository` setting in .github/i2a-config.yml is empty.
  
  This setting specifies which GitHub repository contains your project issues.
  
  To configure:
  1. Open .github/i2a-config.yml
  2. Set issues.repository to your issues repo (e.g., "myorg/my-project-docs")
  
  For setup guidance, follow the Engineering Manager guide and use the
  /tdgs-aidlc-setup-workspace prompt to complete initial configuration.
  ```
- Worker repos not configured: BAIL with message:
  ```
  ❌ Worker repositories not configured
  
  The `worker_repos` mapping in .github/i2a-config.yml is empty or all entries
  are commented out.
  
  Worker repos define the service repositories associated with this docs repo.
  They are required to locate and update service-specific code.
  
  To configure:
  1. Open .github/i2a-config.yml
  2. Add your service repos under worker_repos, e.g.:
     worker_repos:
       orderdetails-service: "myorg/tx-ovra-orderdetails-service"
       receipt-service: "myorg/tx-ovra-receipt-service"
       ovra-ui: "myorg/tx-ovra-ui"
  
  For setup guidance, follow the Engineering Manager guide and use the
  /tdgs-aidlc-setup-workspace prompt to complete initial configuration.
  ```
- Issue not found: BAIL with message:
  ```
  ❌ Issue #{issue_id} not found
  
  Repository: {configured repo}
  
  Please verify:
  - The issue ID is correct
  - The issue exists in the configured repository
  - You have access to the repository
  
  Configuration: .github/i2a-config.yml
  ```
- Invalid issue type: BAIL with message:
  ```
  ❌ Invalid issue type: {provided_type}
  
  Issue type must be one of:
    - feature  — for new features or enhancements
    - hotfix   — for critical bug fixes
    - project  — for joining an EM-initiated Full BMAD project
    - bug      — for defects found during testing (requires active project)
  
  Usage: /tdgs-aidlc-initiate-issue {issue_id} {type}
  Example: /tdgs-aidlc-initiate-issue 123 feature
  Example: /tdgs-aidlc-initiate-issue 42 project
  Example: /tdgs-aidlc-initiate-issue 74 bug
  ```
- Not on master branch: BAIL with message:
  ```
  ❌ Not on master branch
  
  Docs repository: {docs_repo_path}
  Current branch: {current_branch}
  
  You must be on the master branch before initiating an issue.
  The /tdgs-aidlc-initiate-issue command will create integration and dev branches from master.
  (For project type, you may also be on the project/* branch.)
  
  To switch to master:
    cd {docs_repo_path}
    git checkout master
    git pull origin master
  
  Then re-run /tdgs-aidlc-initiate-issue.
  ```
- Dirty tree: BAIL with message:
  ```
  ❌ Working tree has uncommitted changes
  
  Please commit or stash your changes first:
    git status              # Review changes
    git add . && git commit # Commit them
    git stash              # Or stash them
    git stash list         # View stashed changes
  ```
- Missing or empty docs folders: BAIL with message:
  ```
  ❌ Missing or empty documentation folders
  
  The following folders in the docs repository are missing or empty:
    - {folder_name}/
  
  All three folders must exist and contain files:
    - knowledge-base/
    - planning-artifacts/
    - implementation-artifacts/
  
  Please ensure the docs repository has been set up and populated.
  Run /tdgs-aidlc-setup-workspace if initial setup has not been completed.
  ```
- Insufficient context: BAIL with message:
  ```
  ❌ Insufficient guidance to proceed
  
  The issue lacks sufficient detail:
  - Issue body is empty or placeholder text
  - No clear requirements or acceptance criteria
  
  Please update the issue with:
  - Detailed description of the feature/fix
  - Acceptance criteria
  - Expected behavior or requirements
  ```
- Attachment naming collision: BAIL with message:
  ```
  ❌ Attachment naming conflict
  
  Multiple attachments have the same filename:
    - {filename} (from issue body)
    - {filename} (from comment by @{user} on {date})
  
  Please rename one of the attachments in the GitHub issue, then re-run.
  ```
- Attachment download failure: BAIL with message:
  ```
  ⏸️  Manual download required
  
  Failed to download:
    - {filename} ({error reason})
  
  Successfully downloaded to planning-artifacts/attachments/:
    - {filename}
    - {filename}
  
  Please manually download the failed file(s) to planning-artifacts/attachments/
  Then re-run this prompt to continue.
  ```
- Missing attachments on re-run: BAIL with message:
  ```
  ❌ Missing attachments
  
  Expected files not found in planning-artifacts/attachments/:
    - {filename}
  
  Please ensure all attachments are downloaded to planning-artifacts/attachments/
  Then re-run this prompt.
  ```
- Bug not linked to project: BAIL with message:
  ```
  ❌ Bug must be linked to a project issue
  
  Issue #{bug_id} does not reference a parent project issue.
  
  A bug must be linked to an active project to determine the correct
  parent branch for the fix.
  
  To fix:
  1. Open the bug issue on GitHub
  2. Add a reference to the parent project issue (e.g., "Related to #42")
  3. Or add a label like "project:42" to indicate the parent
  4. Re-run: /tdgs-aidlc-initiate-issue {bug_id} bug
  ```
- Not on project branch (bug type): BAIL with message:
  ```
  ❌ Not on a project branch
  
  Docs repository: {docs_repo_path}
  Current branch: {current_branch}
  
  Bug type requires the docs repository to be on a project/* branch.
  Bugs are fixed within the context of an active project.
  
  To fix:
    cd {docs_repo_path}
    git checkout project/ghi-{pid}-{slug}
    git pull origin project/ghi-{pid}-{slug}
  
  Then re-run: /tdgs-aidlc-initiate-issue {bug_id} bug
  ```

## Recovery — Cleaning Up After Partial Failure

If this prompt fails midway after branches have already been created (e.g., attachment download failure, network error):

**To remove branches created by this prompt (feature/hotfix only):**

```bash
# Delete local branches
git branch -D {type}/ghi-{issue_id}-{slug}
git branch -D dev/ghi-{issue_id}-{slug}-{username}

# Delete remote branches (if pushed)
git push origin --delete {type}/ghi-{issue_id}-{slug}
git push origin --delete dev/ghi-{issue_id}-{slug}-{username}

# Return to master
git checkout master
```

**To resume after manual attachment download:**

Re-run `/tdgs-aidlc-initiate-issue {issue_id} {type}`. The prompt handles "branch already exists" gracefully.
