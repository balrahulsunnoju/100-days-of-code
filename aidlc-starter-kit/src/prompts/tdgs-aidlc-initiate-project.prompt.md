---
mode: agent
description: "Start a Full BMAD project from a GitHub issue with protected project and planning branches."
---

# Initiate Project

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify the docs repository directory first (the folder containing `knowledge-base/`), then run git commands within that directory.

## Input
- `issue`: GitHub Issue ID (required) — e.g., `123` or `#123`

## Syntax
```
/tdgs-aidlc-initiate-project {issue_id}
```

## Examples
```
/tdgs-aidlc-initiate-project 42
/tdgs-aidlc-initiate-project #99
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
  - Locate the docs repository by finding the folder containing `knowledge-base/README.md`
  - Common patterns: `{project}-docs`, `sim*-docs*`, or a folder matching the `{docs}` variable from config
  - All subsequent git operations must be performed **within the docs repository directory**
- Verify the docs repository is on `master` branch → BAIL if not on master
- Verify clean working tree in the docs repository → BAIL if dirty
- Verify `knowledge-base/README.md` exists → BAIL if missing
- Verify knowledge-base directories exist → BAIL if any missing:
  - `knowledge-base/api/`
  - `knowledge-base/business/`
  - `knowledge-base/project/`
  - `knowledge-base/repos/`
  - `knowledge-base/shared/`
- Log which folders were found for use in Research step

### 2b. GitHub MCP Activation (MANDATORY)

Before any GitHub issue lookup (`gh` CLI or `mcp_github*` tools):

1. Verify GitHub MCP tools are available (pattern `mcp_github`) **or** `gh` is authenticated (`gh auth status` succeeds).
2. If neither is available → **BAIL**: `❌ GitHub MCP is not activated. Enable it per doc/mcp-setup-guide.md before running this command.`
3. Do not create the project branch until issue data is successfully retrieved.

> Same pattern as `/tdgs-aidlc-reference-sync` → Prerequisites: GitHub MCP Activation.

### 3. Setup
- Parse issue ID from input (strip `#` if present)
- Create **integration branch** based on project type: `project/ghi-{issue_id}-{slug}`
  - `{issue_id}` = GitHub Issue number (e.g., 42)
  - `{slug}` = kebab-case summary derived from issue title (e.g., `new-payment-module`)
  - Example: `project/ghi-42-new-payment-module`
- Integration branch is created from `master`
- Push integration branch to origin
- **Configure branch protection** on `project/ghi-{issue_id}-{slug}` using a **repository ruleset** (preferred) or legacy branch protection:

  **Option A — Repository Ruleset (recommended):**
  ```bash
  gh api repos/{owner}/{repo}/rulesets --method POST --input - <<RULES
  {
    "name": "project-ghi-{issue_id}-protect",
    "target": "branch",
    "enforcement": "active",
    "conditions": {
      "ref_name": { "include": ["refs/heads/project/ghi-{issue_id}-{slug}"] }
    },
    "rules": [
      { "type": "pull_request", "parameters": { "required_approving_review_count": 1, "dismiss_stale_reviews_on_push": true } },
      { "type": "deletion" }
    ],
    "bypass_actors": [
      { "actor_type": "Team", "actor_id": {ade_team_id}, "bypass_mode": "always" }
    ]
  }
  RULES
  ```
  - The `bypass_actors` entry allows the ADE team to push directly for lightweight status updates
  - To find `{ade_team_id}`, first discover available team slugs, then resolve the ID:
    1. List teams: `gh api orgs/{org}/teams --jq '.[].slug'`
    2. Ask the user to select the ADE team slug from the list
    3. Resolve the ID: `gh api orgs/{org}/teams/{team-slug} --jq '.id'`
    - If no teams are returned (insufficient permissions), ask the user to provide the team slug directly
  - A **CI guard workflow** (below) restricts what files can be pushed directly without a PR

  **Option B — Legacy branch protection (fallback):**
  ```bash
  gh api repos/{owner}/{repo}/branches/project/ghi-{issue_id}-{slug}/protection \
    --method PUT \
    --field "required_pull_request_reviews[required_approving_review_count]=1" \
    --field "restrictions=null" \
    --field "enforce_admins=false" \
    --field "allow_force_pushes=false"
  ```

  - If the API call fails (insufficient permissions), **warn but continue** — the EM can configure protection manually in GitHub Settings later

- **Create CI guard workflow** (if not already present) at `.github/workflows/project-branch-guard.yml`:
  ```yaml
  name: Project Branch Guard
  on:
    push:
      branches: ['project/**']

  jobs:
    validate-direct-push:
      if: github.event.head_commit != null
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with:
            fetch-depth: 2
        - name: Check allowed files for direct push
          run: |
            CHANGED=$(git diff --name-only HEAD~1 HEAD)
            ALLOWED_PATTERN="^(implementation-artifacts/sprint-status\.yaml|planning-artifacts/bug-brief-.*\.md)$"
            DISALLOWED=""
            while IFS= read -r file; do
              if ! echo "$file" | grep -qE "$ALLOWED_PATTERN"; then
                DISALLOWED="$DISALLOWED\n  - $file"
              fi
            done <<< "$CHANGED"
            if [ -n "$DISALLOWED" ]; then
              echo "::error::Direct push to project/* contains non-status files. Use a PR instead."
              echo "Disallowed files:$DISALLOWED"
              exit 1
            fi
            echo "✓ Direct push contains only allowed status files"
  ```
  This workflow allows direct pushes that ONLY modify `sprint-status.yaml` or `bug-brief-*.md`. Any other file change on a direct push fails the check — those must go through a PR.
- Create **planning branch** from the integration branch: `planning/ghi-{issue_id}-{slug}`
  - Example: `planning/ghi-42-new-payment-module`
- Push planning branch to origin
- Checkout planning branch for work

> **Note:** No dev branch is created. The `project/*` branch is **protected** — PRs are required for code changes. The ADE team is added as a **bypass actor** in the ruleset, allowing them to push lightweight status updates directly. A **CI guard workflow** (`project-branch-guard.yml`) enforces that direct pushes may only modify `sprint-status.yaml` or `bug-brief-*.md` — any other files fail the check and require a PR.
>
> The EM works on the `planning/*` branch during planning, and creates a PR targeting the `project/*` branch when planning is complete. ADEs will create their own `dev/*` branches from the project integration branch when they begin implementing stories.
>
> **If no bypass actors are configured**, `prepare-repos` and `initiate-issue` (bug type) will fail to push status updates. This is non-fatal — the status update is a convenience, not a gate. See [Troubleshooting: Push rejected to project/* branch](../doc/reference.md#push-rejected-to-project-branch-branch-protection) for alternatives.

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

### 6. Scaffold Project Docs Structure

Ensure the following directories exist for Full BMAD workflow artifacts:

```
{docs}/
├── knowledge-base/           (should already exist)
├── implementation-artifacts/
│   └── (story specs will go here)
└── planning-artifacts/
    ├── attachments/          (created in step 5)
    └── (Product Brief, PRD, Architecture, Epics, Sprint Plans will go here)
```

Create any missing directories.

### 7. Generate Change Brief

Create `{docs}/planning-artifacts/change-brief-{issue_id}.md` with the following structure:

```markdown
---
source: github-issue
issue_id: {issue_id}
issue_url: {full GitHub issue URL}
repository: {repository}
issue_type: project
integration_branch: project/ghi-{issue_id}-{slug}
planning_branch: planning/ghi-{issue_id}-{slug}
workflow: full-bmad
created: {current datetime}
---

# {issue_title}

## Change Type

**Issue Type:** project (Full BMAD Workflow)  
**Integration Branch:** project/ghi-{issue_id}-{slug}  
**Planning Branch:** planning/ghi-{issue_id}-{slug}

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

### 8. Output
```
✓ Pre-flight checks passed (on master branch)
✓ Created integration branch: project/ghi-{issue_id}-{slug} (protected)
✓ Created planning branch: planning/ghi-{issue_id}-{slug}
✓ Fetched GitHub Issue #{issue_id}
✓ Downloaded attachments to {docs}/planning-artifacts/attachments/ ({count} files)
✓ Scaffolded project docs structure
✓ Created change brief: {docs}/planning-artifacts/change-brief-{issue_id}.md

GitHub Issue: #{issue_id} - {issue_title}
Issue Type: project (Full BMAD Workflow)
Integration Branch: project/ghi-{issue_id}-{slug} (protected — no direct push)
Planning Branch: planning/ghi-{issue_id}-{slug}
Current Branch: planning/ghi-{issue_id}-{slug}

Attachments:
  ✓ {filename} — approved copy
  ✓ {filename} — reference
  (or "No attachments" if none)

⚠️  Changes prepared but NOT committed

═══════════════════════════════════════════════════════════
NEXT STEPS — Full BMAD Planning Workflow (EM)
═══════════════════════════════════════════════════════════

🔄 RECOMMENDED: Start each step below in a fresh Agent chat session for best results.

You are on the planning branch. Now follow the Full BMAD planning workflow:

  ── EM Planning Phase (on planning/* branch) ──────────────────

  1. /tdgs-aidlc-reference-sync   — Sync reference docs from shared services
     💡 Fresh chat recommended
     Syncs documentation from common-services repo and analyzes gaps
     Example: /tdgs-aidlc-reference-sync {owner}/{common-services-docs-repo}

  2. /bmad-product-brief           — Create product brief
     💡 Fresh chat recommended
     Input: {docs}/planning-artifacts/change-brief-{issue_id}.md
     Output: {docs}/planning-artifacts/product-brief-{project-name}.md

  3. /bmad-create-prd              — Create Product Requirements Document
     💡 Fresh chat recommended
     Input: Product Brief + Change Brief
     Output: {docs}/planning-artifacts/prd.md

  4. /bmad-create-architecture     — Create architecture/solution design
     💡 Fresh chat recommended
     Input: PRD
     Output: {docs}/planning-artifacts/architecture.md

  5. /bmad-create-epics-and-stories — Define epics and stories
     💡 Fresh chat recommended
     Input: PRD + Architecture
     Output: {docs}/planning-artifacts/epics.md

  6. /bmad-sprint-planning         — Plan sprints
     💡 Fresh chat recommended
     Input: Epics
     Output: {docs}/implementation-artifacts/sprint-status.yaml

  7. /tdgs-aidlc-project-kanban-planning — Create project kanban board
     💡 Fresh chat recommended
     Input: Sprint Status + Epics
     Output: GitHub Project board with issues

  8. /bmad-create-story            — Create implementation-ready story spec
     💡 Fresh chat recommended (per story)
     Input: Sprint Status + Epics
     Output: {docs}/implementation-artifacts/{epic}-{story}-{slug}.md

  9. Use /tdgs-aidlc-commit to commit all planning artifacts
     Then push: git push origin planning/ghi-{issue_id}-{slug}

  10. Create PR from planning/* → project/* to merge planning artifacts
     Use /tdgs-aidlc-create-pull-request (targets project/ghi-{issue_id}-{slug})

  ── Hand Off to ADE ──────────────────────────────────────────

  11. Notify ADEs with issue ID, branch name, and story spec locations
      ADEs follow ADE Guide §5: Project Implementation Steps
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
- Not on master branch: BAIL with message:
  ```
  ❌ Not on master branch
  
  Docs repository: {docs_repo_path}
  Current branch: {current_branch}
  
  You must be on the master branch before initiating a project.
  The /tdgs-aidlc-initiate-project command will create the integration branch from master.
  
  To switch to master:
    cd {docs_repo_path}
    git checkout master
    git pull origin master
  
  Then re-run /tdgs-aidlc-initiate-project.
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
- Missing context docs: BAIL with message:
  ```
  ❌ Missing context documents
  
  The shared/ directory is missing.
  Context documents are required to create informed specifications.
  
  Please run the documentation generation process first:
    See: Engineering Manager Guide → Step 3.7: Generate Knowledge Base Documentation
  ```
- Insufficient context: BAIL with message:
  ```
  ❌ Insufficient guidance to proceed
  
  The issue lacks sufficient detail:
  - Issue body is empty or placeholder text
  - No clear requirements or acceptance criteria
  
  Please update the issue with:
  - Detailed description of the project/feature
  - Acceptance criteria
  - Expected behavior or requirements
  - Scope definition (in/out of scope)
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
  
  Successfully downloaded to workspace/attachments/:
    - {filename}
    - {filename}
  
  Please manually download the failed file(s) to workspace/attachments/
  Then re-run this prompt to continue.
  ```
- Missing attachments on re-run: BAIL with message:
  ```
  ❌ Missing attachments
  
  Expected files not found in workspace/attachments/:
    - {filename}
  
  Please ensure all attachments are downloaded to workspace/attachments/
  Then re-run this prompt.
  ```
