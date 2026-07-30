---
mode: agent
description: "Synchronize knowledge base documentation after a production release."
---

# Post-Deployment Docs Sync

Update application documentation after a release has been deployed to production. This workflow is typically run by the **Engineering Manager** after confirming a successful production deployment. A release may contain both features and hotfixes.

This workflow leverages **BMAD's Document Project** capability for intelligent code scanning and documentation generation, rather than custom file pattern matching.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify the docs repository directory first, then run git commands within that directory.

## Input
- `release`: Release version (required) — e.g., `release/4.0.0` or `4.0.0`

## Process

### 1. Pre-flight Checks
- Parse release version from input (normalize `release/X.X.X` → `X.X.X`)
- Verify docs repo is on `master` branch
- Verify clean working tree → BAIL if dirty
- Fetch latest from origin

### 2. Identify Deployed Changes

#### 2a. Find Release Tag or Branch
- Look for git tag matching `v{release}` or `{release}`
- Or find branch `release/{release}`
- BAIL if neither found

#### 2b. Find Merged Issues for This Release
- Query GitHub for merged PRs targeting `master` from `release/{release}`
- Include PRs from `feature/ghi-*`, `hotfix/ghi-*`, `planning/ghi-*`, and `project/ghi-*` branches
- Extract GitHub Issue IDs from PR titles and commit messages (`Refs: #<id>`)
- Collect list of unique issue IDs for the deployment summary

### 3. Update Non-Version-Controlled Sources (if applicable)

Before running BMAD Document Project, ensure non-version-controlled sources are updated:

#### 3a. Apigee API Proxies
If your project uses Apigee API Gateway, update proxy sources based on your setup:

**Option A: Git-Based Apigee Repos (Recommended)**

If your Apigee proxies are in Git repositories, pull the latest changes:

```bash
cd tdgs-ovra-transaction-proxy && git pull && cd ..
cd tdgs-ovra-onlinecertificate-proxy && git pull && cd ..
cd tdgs-ovra-utility-proxy && git pull && cd ..
```

```
✅  Confirm: Have you pulled the latest from all Apigee proxy repos? [Y/n]
```

**Option B: Manual Apigee Export (Legacy)**

If your Apigee proxies are NOT in Git, manually export the production-deployed revisions:

```
⚠️  MANUAL STEP REQUIRED

Before continuing, update the apigee-exports/ folder with the 
latest production-deployed Apigee proxy bundles.

1. Log in to Apigee console → Develop → API Proxies
2. For each proxy that changed in this release:
   - Click the proxy name → Project → Download Revision
   - Download the currently deployed revision (production)
3. Extract and replace files in apigee-exports/

Current apigee-exports/ contents:
  - {api-proxy-name}/ (last modified: {date})
  - {api-proxy-name}/ (last modified: {date})
  - {api-proxy-name}/ (last modified: {date})

Have you updated the Apigee exports? [Y/n]
```

#### 3b. Other Non-Version-Controlled Sources
Prompt for any other sources that need manual refresh:
- External API documentation
- Database schema exports
- Configuration snapshots

### 4. Create Documentation Branch
- Create branch: `docs/post-deploy-{release}-{date}`
- This branch will hold all documentation updates

### 5. Run BMAD Document Project (Update Mode)

> **Note:** Common/shared service repos (listed in `common_repos` in `.github/i2a-config.yml`) are scanned directly by Document Project alongside app repos. No separate sync step is needed — Document Project routes their KB output to `knowledge-base/common-services/{key}/`.

Invoke BMAD's Document Project to scan the codebase and update existing documentation.

#### 5a. Activate BMAD Document Project Skill
1. Open a **new Agent chat session** (prevents context overflow)
2. Select **"Claude Opus 4.6"** for the model
3. BMAD 6.3.0+ is skills-based — invoke skills directly via slash commands (no agent selection required)

#### 5b. Run Document Project with Update Instructions

Use the following prompt template (customize for your project):

---

<blockquote>
<small>

*I need to **UPDATE** the existing documentation in `{project}-docs/knowledge-base` folder after deploying release `{release}` to production. The release included issues: #{id1}, #{id2}, #{id3}.*

*Please use **Document Project** option to:*

1. *Scan ALL code repositories in the workspace for changes*
2. *Scan the Apigee proxy sources for updated proxy configurations:*
   - *If Git-based: scan proxy repositories (e.g., `tdgs-ovra-transaction-proxy/`, `tdgs-ovra-onlinecertificate-proxy/`, `tdgs-ovra-utility-proxy/`)*
   - *If legacy: scan the `apigee-exports/` folder for exported Apigee packages*
3. *Compare current code with existing documentation*
4. *Update ONLY the sections that have changed — do not regenerate unchanged documentation*

*Focus on updating:*
- *API Specifications (`api/`) — sync with actual controller endpoints and models*
- *Business Rules (`business/business-rules-catalog.md`) — if validation or business logic changed*
- *Data Models (`shared/data-models.md`) — if entities or DTOs changed*
- *Repository Architecture (`repos/{service}/architecture.md`) — if service structure changed*
- *Apigee Documentation (`apigee/`) — if proxy configurations changed*

*For each update, add a sync marker:*
```markdown
<!-- Updated: {release} - {date} -->
```

*After updates, provide a summary of what changed.*

</small>
</blockquote>

---

### 7. Generate Deployment Summary

Create/update `knowledge-base/project/deployment-history.md`:

```markdown
## Release {release} - {date}

### Deployed Issues
| Issue | Title | Type | Repositories |
|-------|-------|------|--------------|
| #{id} | {title} | feature/hotfix | service-a, service-b |

### Documentation Updates
- `shared/data-models.md`: {summary of changes}
- `repos/{service}/architecture.md`: {summary of changes}
- `api/{service}-openapi.yaml`: {summary of changes}
- `apigee/`: {summary of changes}

### Common Services Synced (if applicable)
- {service-name}: Updated from {common-services-repo}

### Notes
- {any notable changes or breaking changes}
```

### 8. Commit and Create PR

1. Stage all documentation changes
2. Create commit:
   ```
   docs(sync): update knowledge base for release {release}
   
   Updated documentation after production deployment:
   - Ran BMAD Document Project update
   - Synced common services (if applicable)
   - Added deployment history entry
   
   Issues: #{id1}, #{id2}, ...
   ```
3. Push branch and create PR targeting `master`

### 9. Output

```
═══════════════════════════════════════════════════════════════════════
✓ POST-DEPLOYMENT DOCUMENTATION SYNC COMPLETE
═══════════════════════════════════════════════════════════════════════

Release: {release}
Date: {date}

Issues Included in Release:
  #{id1} - {title} (feature)
  #{id2} - {title} (hotfix)
  ...

Pre-Sync Steps Completed:
  ✓ Apigee proxy repos pulled (git pull)
  ✓ Common services synced: 4 services

BMAD Document Project Results:
  ✓ API specs updated: 3 files
  ✓ Business rules updated: 5 rules modified
  ✓ Data models updated: 2 entities added
  ✓ Repository docs updated: 2 services
  ✓ Apigee docs updated: 1 proxy modified

Deployment History:
  ✓ project/deployment-history.md — release entry added

Branch Created: docs/post-deploy-{release}-{date}
Commit: {hash}

Next Steps:
  1. Review all documentation changes
  2. Use /tdgs-aidlc-create-pull-request to open PR for review
  3. After merge, notify team of documentation updates
═══════════════════════════════════════════════════════════════════════
```

## Edge Cases

### No Issues Found for Release
```
⚠️  No GitHub Issues found for release {release}

The release branch/tag exists but no merged PRs with issue references found.

Options:
  1. Manually specify issue IDs: /tdgs-aidlc-post-deployment-docs-sync {release} issues:123,456
  2. Continue without issue tracking (documentation will still be updated)
```

### Apigee Proxy Repos Behind Remote
```
⚠️  Apigee proxy repos may not be up to date

One or more proxy repos could not be confirmed as up to date.

Please run:
  cd tdgs-ovra-transaction-proxy && git pull && cd ..
  cd tdgs-ovra-onlinecertificate-proxy && git pull && cd ..
  cd tdgs-ovra-utility-proxy && git pull && cd ..

Options:
  1. Continue anyway (Apigee docs may be outdated)
  2. Abort and pull latest proxy repos first
```

### Dirty Working Tree
```
❌ Working tree has uncommitted changes

Please commit or stash your changes first:
  git status              # Review changes
  git add . && git commit # Commit them
  git stash              # Or stash them
```

## Options

| Option | Description | Example |
|--------|-------------|---------|
| `release` | Release version (required) | `4.0.0`, `release/4.0.0` |
| `issues` | Manual issue IDs (comma-separated) | `issues:123,456,789` |
| `--force` | Force re-sync even if already synced | `--force` |
| `--dry-run` | Preview changes without applying | `--dry-run` |

| `--skip-apigee` | Skip Apigee export check | `--skip-apigee` |

## Examples

### Standard Release
```
/tdgs-aidlc-post-deployment-docs-sync 4.0.0
```

### With Manual Issue IDs
```
/tdgs-aidlc-post-deployment-docs-sync 4.0.0 issues:123,456,789
```

### Preview Changes Only
```
/tdgs-aidlc-post-deployment-docs-sync 4.0.0 --dry-run
```

### Skip Apigee Check (no Apigee in project)
```
/tdgs-aidlc-post-deployment-docs-sync 4.0.0 --skip-apigee
```
