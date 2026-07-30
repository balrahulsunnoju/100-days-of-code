---
mode: agent
description: "Synchronize context documents after worker repos merge to release or project branches."
---

# Update Context Docs

Synchronize context documents after worker repos have merged their implementation to the release branch or project branch.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories (docs repo and worker repos from config) first, then run git commands within those directories.

## Input
- `issue`: GitHub Issue ID (required) — e.g., `123` or `#123`

## Process

### 1. Load Configuration
- Read `.github/i2a-config.yml`
- Extract `worker_repos` and `common_repos` mappings for service-to-repository lookup (merge both into a single repo list)
- BAIL if `worker_repos` is missing or empty (note: `common_repos` may be absent — that’s fine)

### 2. Pre-flight Checks
- Verify on a `release/*` or `project/*` branch → BAIL if on neither
- Determine **sync mode** from branch type:
  - `release/*` → **Release sync mode** (existing behavior)
  - `project/*` → **Project sync mode** (post-merge KB update)
- Capture current branch name (`release_branch` or `project_branch`) for use in worker repo scanning
- Parse issue ID from input (strip `#` if present)

#### 2a. Branch resolution (Release sync mode)
- Find local branch matching `feature/ghi-{issue_id}-*`, `hotfix/ghi-{issue_id}-*`, or `project/ghi-{issue_id}-*`
- If found:
  - Checkout that branch
  - Verify clean working tree → BAIL if dirty
- If not found:
  - Search remote for `origin/feature/ghi-{issue_id}-*`, `origin/hotfix/ghi-{issue_id}-*`, or `origin/project/ghi-{issue_id}-*`
  - If found: checkout and track the remote branch
  - If not found → BAIL:
    ```
    ❌ No feature, hotfix, or project branch found for issue #{issue_id}
    
    Expected branch pattern: feature/ghi-{issue_id}-*, hotfix/ghi-{issue_id}-*, or project/ghi-{issue_id}-*
    
    Run /tdgs-aidlc-initiate-issue or /tdgs-aidlc-initiate-project first to create the planning branch.
    ```

#### 2b. Branch resolution (Project sync mode)
- Extract `{issue_id}` from the `project/ghi-{issue_id}-*` branch name
- Look for a KB sync planning branch — prefer `planning/ghi-{issue_id}-kb-sync` over the EM's original `planning/ghi-{issue_id}-{slug}` branch (which may contain unrelated planning artifacts)
- Find local `planning/ghi-{issue_id}-kb-sync` branch
  - If found: checkout, pull latest, verify clean working tree → BAIL if dirty
  - If not found:
    - Search remote for `origin/planning/ghi-{issue_id}-kb-sync`
    - If found: checkout and track the remote branch
    - If not found: create `planning/ghi-{issue_id}-kb-sync` from current `project/*` HEAD
- All KB updates will be committed on this `planning/*` branch
- The final PR targets the originating `project/*` branch

### 3. Verify Issue Exists
- Fetch GitHub Issue via github-mcp
- BAIL if issue not found:
  ```
  ❌ Issue #{issue_id} not found
  
  Please verify the issue ID exists in this repository.
  ```

### 4. Scan Worker Repositories

For each repository (from merged `worker_repos` + `common_repos`):

#### 4a. Release sync mode
- Search commit history on **release branch** (e.g., `release/4.0.0`) for `Refs: #{issue_id}`
- Collect all matching commits
- Get list of changed files from those commits
- Read file contents from release branch (HEAD)

#### 4b. Project sync mode (delta scan)
- Read `.kb-sync-meta.yaml` from docs repo root (on `project/*` branch):
  ```yaml
  last_sync: "2025-01-15T14:30:00Z"
  last_sync_commits:
    orderdetails-service: "abc1234"
    receipt-service: "def5678"
  synced_by: "update-context-docs"
  ```
- If `.kb-sync-meta.yaml` exists and is valid:
  - For each worker repo, scan commits on `project/*` branch **after** `last_sync_commits[repo]`
  - Collect all new commits since last sync
  - Get list of changed files from those commits
- If `.kb-sync-meta.yaml` is missing or corrupt:
  - Log: `⚠️ KB sync metadata missing or corrupt — falling back to full reconciliation`
  - Fall back to full reconciliation: scan ALL commits on the `project/*` branch (from its fork point off master)
  - Get list of all changed files

#### 4c. Record Results
- Track per repo:
  - Number of commits found
  - List of changed files

### 5. Aggregate and Validate
- Combine changed files from all repos

#### Release sync mode — BAIL if no changes:
  ```
  ⏸️  No implementation found on worker release branches
  
  No commits with 'Refs: #{issue_id}' found on {release_branch} in:
  - orderdetails-service
  - receipt-service
  - verificationletter-service
  - {ui-name}
  
  Ensure worker repos have:
  1. Merged their feature/hotfix branches to the release branch ({release_branch})
  2. All commits include 'Refs: #{issue_id}' in commit messages
  ```

#### Project sync mode — BAIL if no changes:
  ```
  ⏸️  No new changes since last KB sync
  
  No new commits found on {project_branch} since last sync ({last_sync_timestamp}).
  
  Knowledge base is up to date. No sync required.
  ```

### 6. Categorize Changes

Map changed files to context documents:

| File Pattern | Context Document |
|--------------|------------------|
| `*/model/*.java`, `*/dto/*.java`, `*/entity/*.java` | `shared/data-models.md` |
| `*Entity.java`, `*Repository.java`, `*DAO.java`, `@Table` | `shared/database-schema.md` |
| `*/controller/*.java`, `*/resource/*.java` | `api/{service}-openapi.yaml`, `{service}/architecture.md` |
| `*/service/*.java` | `{service}/architecture.md` |
| `*/components/*.jsx`, `*/components/*.tsx`, `*/components/*.js` | `{ui-name}/ui-components.md` |
| `*/pages/*.jsx`, `*/pages/*.tsx`, `*/pages/*.js` | `{ui-name}/architecture.md` |
| texkit-ui imports (`TxButton`, `TxAlert`, etc.) | `{ui-name}/ui-components.md` (document which TX* components are used) |
| `application.properties`, `application.yml` | `shared/deployment-configuration.md` |
| `pom.xml`, `package.json` | `shared/technology-stack.md` |
| `*/integration/*.java`, `*/client/*.java` | `shared/integration-architecture.md` |
| `apiproxy/**`, `proxies.xml`, `policies/*.xml` | `apigee/architecture.md`, `apigee/policies.md`, `apigee/proxy-catalog.md` |
| `apiproxy/targets/*.xml` | `apigee/target-endpoints.md` |
| `apiproxy/resources/jsc/*.js` | `apigee/policies.md` (JavaScript callouts) |
| `apiproxy/policies/*OAuth*.xml`, `apiproxy/policies/*APIKey*.xml` | `apigee/security-config.md` |

### 7. Read Implementation Code (BMAD-Quality Regeneration)

In **project sync mode**, this step performs exhaustive source scanning — not superficial file-path mapping. For each affected KB section, read ALL relevant source files (not just the delta files) to produce a complete, accurate regeneration of that section.

| Changed Files (delta) | KB Regeneration Action |
|---|---|
| `*/model/*.java`, `*/dto/*.java` | Scan ALL model/DTO classes in repo → regenerate data-models section from actual code |
| `*/controller/*.java` | Scan ALL controllers → regenerate API endpoint documentation |
| `*/service/*.java` | Scan ALL services → update `architecture.md` + `business-rules-catalog.md` |
| `*/components/*.jsx/tsx` | Scan ALL components → regenerate `ui-components.md` |
| Config files (`pom.xml`, `package.json`) | Read ALL config → update `technology-stack.md`, `deployment-configuration.md` |
| `*Repository.java`, `*DAO.java` | Scan ALL repository/DAO classes → update `database-schema.md` |

> In **release sync mode**, the existing targeted-update behavior applies (below).

For each categorized file:
- Fetch current file content from worker repo (project branch HEAD in project sync mode, release branch HEAD in release sync mode)
- Extract relevant information:
  - **Models/DTOs:** Class name, fields, types, annotations, validation rules
  - **Entities:** Table name, columns, relationships, constraints
  - **Controllers:** Endpoints, request/response types, HTTP methods
  - **Services:** Public methods, dependencies, business logic summary
  - **UI Components:** Component name, props, state, key behaviors, texkit-ui components used (TxButton, TxAlert, TxInput, etc.)
  - **Config:** Property keys, values, environment variations
  - **Apigee Proxies:** Proxy name, base path, target endpoints, virtual hosts
  - **Apigee Policies:** Policy type, name, configuration, attached flows (PreFlow, PostFlow, conditional)
  - **Apigee Targets:** Target server name, URL, load balancing, SSL configuration
  - **Apigee Security:** OAuth scopes, API key validation, threat protection policies

### 8. Update Context Documents

For each affected context document:

#### 8a. Read Current Content
- Load existing document from docs repo

#### 8b. Generate Targeted Updates
- Compare extracted code information with current documentation
- Identify:
  - **New:** Elements in code but not in docs
  - **Modified:** Elements that differ between code and docs
  - **Removed:** Elements in docs but not in code (flag for review)
- Generate updates that:
  - Add new sections/entries for new elements
  - Update existing sections for modified elements
  - Add "⚠️ Verify removal" comments for potentially removed elements

#### 8c. Apply Updates
- Edit context document with changes
- Add sync marker comment at top of changed sections:
  ```markdown
  <!-- Synced: #{issue_id} - {date} -->
  ```

### 9. Update API Specs (if needed)

If controller changes detected:
- Compare actual endpoints with `api/{service}-openapi.yaml`
- Update spec to match implementation
- Flag any spec-vs-implementation mismatches for review

### 9a. Update Apigee Documentation (if needed)

If Apigee proxy changes detected:
- Update `apigee/proxy-catalog.md` with new/modified proxies
- Update `apigee/policies.md` with new/modified policies
- Update `apigee/target-endpoints.md` with backend routing changes
- Update `apigee/security-config.md` with security policy changes
- Update `apigee/architecture.md` if proxy flow structure changed
- Correlate proxy-to-backend service mapping with `repos/{service}/architecture.md`

### 10. Update Project Context (Project Sync Mode Only)

> Skip this step in release sync mode.

Conditionally update `project-context.md` — only when architecture or testing patterns have changed:

| Delta Contains | Update project-context.md? |
|---|---|
| Config files (`pom.xml`, `package.json`, `build.gradle`) | ✅ Yes — dependency/build changes |
| New modules/packages (new directories under `src/`) | ✅ Yes — structural changes |
| Test framework config (`jest.config.*`, `pytest.ini`, `tsconfig.spec.json`) | ✅ Yes — testing pattern changes |
| CI/CD configs (`.github/workflows/*`, `Dockerfile`) | ✅ Yes — deployment pipeline changes |
| Only source code (services, controllers, models, UI) | ❌ No — architecture unchanged |

If update is needed:
- Read the current `project-context.md`
- Re-scan project structure from worker repos
- Update only the affected sections (dependencies, module structure, testing patterns, deployment)
- Preserve all other sections unchanged

### 11. Write KB Sync Metadata (Project Sync Mode Only)

> Skip this step in release sync mode.

After all KB documents are updated, write `.kb-sync-meta.yaml` in the docs repo root (on the `planning/*` branch):

```yaml
last_sync: "2025-01-15T14:30:00Z"
last_sync_commits:
  orderdetails-service: "abc1234"
  receipt-service: "def5678"
  ui-app: "ghi9012"
synced_by: "update-context-docs"
```

- `last_sync`: ISO 8601 timestamp of this sync run
- `last_sync_commits`: map of repo name → latest commit SHA processed on `project/*` branch
- `synced_by`: always `"update-context-docs"`

### 12. Output

#### Release sync mode output

```
✓ Issue #{issue_id} validated
✓ On branch: {feature|hotfix|project}/ghi-{issue_id}-{slug}
✓ Release branch: {release_branch}

Worker Repositories Scanned (on {release_branch}):
  ✓ orderdetails-service: branch {feature|hotfix|project}/ghi-{issue_id}-{slug} (merged to {release_branch}, 5 commits)
  ✓ receipt-service: no changes for this issue
  ✓ verificationletter-service: 3 commits with Refs: #123
  ✓ {ui-name}: 8 commits with Refs: #123

Files Analyzed: 27
  - Models/DTOs: 4
  - Entities: 2
  - Controllers: 3
  - Services: 6
  - UI Components: 8
  - Apigee Configs: 4

Context Documents Updated:
  ✓ shared/data-models.md — 3 models added, 1 modified
  ✓ shared/database-schema.md — 2 columns added
  ✓ orderdetails-service/architecture.md — 2 endpoints documented
  ✓ {ui-name}/ui-components.md — 4 components added
  ✓ apigee/proxy-catalog.md — 1 proxy updated
  ✓ apigee/policies.md — 2 policies added

API Specs Updated:
  ✓ api/orderdetails-service-openapi.yaml — 2 endpoints synced

⚠️  Review Required:
  - shared/data-models.md: OrderLegacyDto appears removed from code (line 145)

Next Steps:
  1. Review all changes in the editor
  2. Verify flagged items (removals, mismatches)
  3. Use /tdgs-aidlc-commit to create conventional commit
  4. Use /tdgs-aidlc-create-pull-request to open PR for review
```

#### Project sync mode output

```
✓ Project #{issue_id} KB sync
✓ Source branch: {project_branch}
✓ Working branch: {planning_branch}
✓ Sync mode: {delta|full reconciliation}

Worker Repositories Scanned (on {project_branch}):
  ✓ orderdetails-service: 12 new commits since last sync
  ✓ receipt-service: 3 new commits since last sync
  ✓ {ui-name}: 8 new commits since last sync

Files Analyzed: 35
  - Models/DTOs: 6
  - Controllers: 4
  - Services: 8
  - UI Components: 12
  - Config: 3
  - Tests: 2 (architecture-relevant)

KB Documents Regenerated (BMAD-quality):
  ✓ shared/data-models.md — 4 models regenerated
  ✓ shared/database-schema.md — full schema re-synced
  ✓ orderdetails-service/architecture.md — 3 endpoints updated
  ✓ {ui-name}/ui-components.md — 6 components regenerated

Project Context: {Updated — new module detected | No update needed}

Sync Metadata:
  ✓ .kb-sync-meta.yaml updated (last_sync: {timestamp})

⚠️  Review Required:
  - shared/data-models.md: LegacyOrderDto may have been removed (verify)

Next Steps:
  1. Review all changes on {planning_branch}
  2. Use /tdgs-aidlc-commit to create conventional commit
  3. Use /tdgs-aidlc-create-pull-request to open PR: {planning_branch} → {project_branch}
```

## Edge Cases

- **No commits found on worker release branches:**
  ```
  ⏸️  No implementation found on worker release branches
  
  No commits with 'Refs: #{issue_id}' found on {release_branch}.
  
  Ensure worker repos have:
  1. Merged their feature/hotfix branches to the release branch ({release_branch})
  2. All commits include 'Refs: #{issue_id}' in commit messages
  ```

- **Partial implementation (some repos have no commits):**
  ```
  ⚠️  Partial implementation detected
  
  Found commits on {release_branch}:
    ✓ orderdetails-service: 12 commits with Refs: #123
    ✓ {ui-name}: 8 commits with Refs: #123
  
  No commits found:
    ○ receipt-service
    ○ verificationletter-service
  
  Options:
    1. Continue with partial sync (type 'continue')
    2. Wait for all repos to merge (type 'wait')
  ```

- **MCP access failure:**
  ```
  ❌ Cannot access worker repository
  
  Failed to access: sim3-tx-ovra-orderdetails-service
  Error: {error message}
  
  Verify:
  - github-mcp is configured
  - Repository access is granted
  - Repository exists at expected location
  ```

- **Feature/hotfix branch has uncommitted changes:**
  ```
  ❌ Working tree has uncommitted changes
  
  Current branch: {feature|hotfix}/ghi-123-zip-enhancement
  
  Please commit or stash your changes first:
    git status              # Review changes
    git add . && git commit # Commit them
    git stash              # Or stash them
  ```

- **No context docs to update:**
  ```
  ℹ️  No context document updates needed
  
  Changes detected in worker repos:
    - README.md updates
    - Test files
    - Build configuration
  
  These changes don't map to context documents.
  No sync required.
  ```

- **KB sync metadata missing/corrupt (project sync mode):**
  ```
  ⚠️  KB sync metadata missing or corrupt — falling back to full reconciliation
  
  .kb-sync-meta.yaml not found or could not be parsed.
  Scanning all commits on {project_branch} since fork from master.
  
  This may take longer than a delta sync. A new .kb-sync-meta.yaml will be
  created after this sync completes.
  ```

- **Not on release or project branch:**
  ```
  ❌ Must be on a release/* or project/* branch
  
  Current branch: {current_branch}
  
  This command syncs KB docs from either:
    - release/* branches (post-merge to release)
    - project/* branches (post-merge to project)
  
  Switch to the appropriate branch and re-run.
  ```
