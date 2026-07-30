---
mode: agent
description: "Sync shared service documentation from external repositories using GitHub MCP (alternative to symlinked common repos)"
---

# Reference Documentation Sync

> **When to Use This**
>
> This prompt syncs shared/common service documentation from a **remote** GitHub repository when you **cannot symlink** those repos into your workspace.
>
> **Two models exist for common repos (see FR-4 in architecture docs):**
>
> | Model | Config Key | When to Use |
> |-------|------------|-------------|
> | **Symlinked** (recommended) | `common_repos` | Repos can be cloned/symlinked locally |
> | **Reference Sync** (this prompt) | `common_services` | Cannot symlink due to network/permission constraints |
>
> **If you CAN symlink common repos**, use the Symlinked model instead — it's simpler and keeps all KB output under local version control.

---

## Pre-flight Check: Multi-Repository Workspace

Before execution, verify workspace structure:
- Confirm this is a **multi-repo workspace** or single app repo
- Check if common repos are symlinked vs. need remote sync
- Verify GitHub MCP tools are available (required for this prompt)

---

> This workflow uses **GitHub MCP** for reading remote content and **filesystem reads** for local content. Git operations are NOT required.

## Parameters

Before starting, collect the following information from the user:

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `owner/repo` | **Yes** | - | GitHub repository in format `owner/repo` (e.g., `Texas-gov-Application-Services/sim4-tx-common-services-docs`) |
| `branch` | No | `master` | Branch name where the documentation exists |
| `sync_all` | No | `false` | Override to sync ALL services, ignoring `common_services` filter |

### Configuration File

This command reads `.github/i2a-config.yml` for the `common_services` key:

```yaml
# Common Services - Shared services from the common-services repository used by this application
# Format: list of service folder names from the common-services-docs repository
common_services:
  - amountdistribution-service
  - notificationengine-service
  - pacs-service
  - paymentintegration-service
```

Only the services listed in `common_services` will be synced. This allows each application to maintain its own list of relevant shared services.

**Prompt the user:**
> "Please provide the source repository (owner/repo format) and optionally the branch name. If no branch is specified, I'll use 'master'."

**Example inputs:**
- `Texas-gov-Application-Services/sim4-tx-common-services-docs` (uses master branch)
- `Texas-gov-Application-Services/sim4-tx-common-services-docs branch:feature/initial-docs-setup`
- `MyOrg/my-shared-services-docs branch:main`

---

## Instructions

You are synchronizing **reference documentation** from an external repository. These are shared services/libraries that are **NOT** part of this application's codebase - they are maintained in separate repositories by other teams.

### Source Repository
- **Repository:** `{owner}/{repo}` (provided by user)
- **Branch:** `{branch}` (provided by user, default: `master`)
- **Path:** `knowledge-base/repos/` (standard location)

### Target Location
- **Local Path:** `{workspace}/knowledge-base/common-services/` or `{workspace}/docs/knowledge-base/common-services/`

---

## Prerequisites: GitHub MCP Activation

Before starting the sync, verify GitHub MCP tools are available:

1. **Check for GitHub MCP tools**: Search for tools matching `mcp_github` pattern
2. **If tools are NOT available**: 
   - Inform the user: "GitHub MCP is not activated. Please enable it in VS Code settings or via the MCP extension."
   - Stop execution until MCP is confirmed active
3. **Required MCP tools**: `mcp_github-mcp_get_file_contents`, `mcp_github-mcp_list_*` tools for reading repository content

> ⚠️ **This workflow requires GitHub MCP** to read from the source repository. Local file reads use standard filesystem tools.

---

## Phase 1: Service Documentation Sync

### Steps to Execute

1. **Read the local i2a-config.yml** to get the list of common services used by this application:
   - Look for `.github/i2a-config.yml` in the workspace
   - Read the `common_services` key which contains the list of service folder names
   - If `common_services` is not defined, prompt the user to either:
     a. Add the key to i2a-config.yml, OR
     b. Confirm they want to sync ALL common services (default: sync only configured services)

2. **Identify the local knowledge-base location** by searching for:
   - `knowledge-base/` folder
   - `docs/knowledge-base/` folder
   - Create `common-services/` subfolder if it doesn't exist

3. **Connect to GitHub MCP** and read the Common Services repository structure:
   - Read `knowledge-base/repos/` to get all available services
   - Read `knowledge-base/README.md` to get the service catalog and endpoint counts
   - Read `knowledge-base/api/` to identify OpenAPI specs

4. **Filter services to sync**:
   - If `common_services` is defined in i2a-config.yml, only sync those services listed
   - Display which services will be synced vs. skipped
   - Example output:
     ```
     Services to sync (from i2a-config.yml common_services):
     ✅ amountdistribution-service
     ✅ notificationengine-service
     ✅ pacs-service
     ✅ paymentintegration-service
     
     Services skipped (not in common_services):
     ⏭️ other-service-1
     ⏭️ other-service-2
     ```

5. **For each service to sync**, read:
   - `repos/{service-name}/README.md`
   - `repos/{service-name}/architecture.md`

6. **Compare with local files** in the local `common-services/` folder:
   - Identify new services not yet documented locally
   - Identify services that may need updates

7. **Create or update documentation** for each service:
   - Create new `.md` files for any new services
   - Update existing files if the remote documentation has changed
   - Always include the **REFERENCE ONLY** notice at the top (see below)

8. **Update index files**:
   - Update `common-services/README.md` with the full service catalog
   - Update `master-index.md` Common Services section (if exists)
   - Update `quick-reference.md` External Integrations table (if exists)

---

## Phase 2: Gap Analysis

After syncing service documentation, analyze gaps between the **source repository** documentation and the **local application** documentation.

### Important: Workspace Structure

The workspace may be a **parent folder containing multiple git repositories**, not a single git repo. 

- **Do NOT run git commands** (e.g., `git branch`, `git log`, `git diff`) on the workspace root
- Gap analysis does NOT require git operations - read source docs via GitHub MCP and local docs via filesystem
- If you need to identify actual git repos, look for `.git/` folders in subdirectories

> ⚠️ **Git commands will fail** if run on a non-git container folder. Use MCP tools for GitHub content and file reads for local content.

### Gap Analysis Steps

1. **Read source repository business documentation** from GitHub:
   - `knowledge-base/business/business-glossary.md` - Terms and definitions
   - `knowledge-base/business/business-rules-catalog.md` - Validation, workflow, compliance rules
   - `knowledge-base/shared/external-services.md` - External provider integrations

2. **Read local application documentation**:
   - `{workspace}/knowledge-base/business/business-glossary.md`
   - `{workspace}/knowledge-base/business/business-rules-catalog.md`
   - `{workspace}/knowledge-base/shared/external-services.md`

3. **Identify gaps in these categories**:

#### A. Glossary Terms (business-glossary.md)
Compare source repo glossary with local glossary. Check for:
- [ ] Service-specific terms defined in source but missing locally
- [ ] Acronyms and abbreviations used by the shared services
- [ ] Integration-related terms (authentication, tokens, etc.)
- [ ] External provider terms (third-party services used)

#### B. Business Rules (business-rules-catalog.md)
Compare source repo rules with local rules. Check for:
- [ ] Validation rules that affect how local app calls the service
- [ ] Workflow rules (required sequences, prerequisites)
- [ ] Compliance rules (security, data handling)
- [ ] Error handling rules (retry policies, fallbacks)

#### C. External Services (shared/external-services.md)
Check if local external services includes:
- [ ] Cross-reference to reference documentation folder
- [ ] Table of shared services with links to detailed docs
- [ ] External providers used by the shared services
- [ ] Integration patterns and authentication methods

### Gap Analysis Output

Provide a table of identified gaps:

| Gap Category | Gap Description | Source Location | Recommended Local Location | Priority |
|--------------|-----------------|-----------------|---------------------------|----------|
| Glossary | Missing {term} definition | business-glossary.md | business/business-glossary.md | High |
| Rules | Missing {rule type} rules | business-rules-catalog.md | business/business-rules-catalog.md | High |
| etc. | | | | |

### Recommended Updates

For each identified gap, recommend whether to:
- **Add** - New content needs to be added to local docs
- **Update** - Existing content needs enhancement
- **Cross-reference** - Add link to reference docs

---

## Phase 3: Apply Gap Updates (if requested)

If user requests to apply gap fixes, update the local documentation:

### Glossary Updates
Add missing terms to `business/business-glossary.md`:
- Add new section for terms from the source repository (e.g., "Shared Services Terms")
- Add links from existing terms to reference documentation
- Update Abbreviations table with new acronyms from source

### Rules Catalog Updates
Add missing rules to `business/business-rules-catalog.md`:
- Add "Shared Services Rules" section (or appropriate name based on source)
- Include validation rules that affect local integration
- Include workflow rules (required sequences)
- Include compliance rules from source
- Mark all shared rules with reference notice pointing to source

### External Services Updates
Update `shared/external-services.md`:
- Add shared services summary table at top
- Add cross-reference link to reference documentation folder
- Document external providers used by shared services

---

## Required Notice for All Reference Files

Every reference documentation file MUST include this notice at the top. **Do NOT mention any specific application name** - keep it generic:

```markdown
> ⚠️ **REFERENCE ONLY**: This is a shared service maintained in a separate repository (`{owner}/{repo}`). This codebase is owned by another team. Any changes to this service must be coordinated with them. This documentation is provided as a reference for developers integrating with this service.
```

---

## File Template

Use this template for each service documentation file:

```markdown
# {Service Name}

> ⚠️ **REFERENCE ONLY**: This is a shared service maintained in a separate repository. This codebase is owned by another team. Any changes to this service must be coordinated with them. This documentation is provided as a reference for developers integrating with this service.

## Overview

{Brief description from the remote README}

> **📚 Full Documentation:** See the [{Service Name} Documentation](https://github.com/{owner}/{repo}/tree/{branch}/knowledge-base/repos/{service-folder}) in the source repository.

---

## Usage

### Common Use Cases

| Use Case | Description |
|----------|-------------|
| {use case 1} | {description} |

### Integration Points

| Consumer Service | Function |
|------------------|----------|
| {service} | {function} |

---

## API Quick Reference

{Key endpoints from the service}

---

## Error Handling

{Common errors and recommended actions}

---

## Configuration

{Environment variables and configuration needed}

---

## Related Documentation

- [Common Services Overview](./README.md)
- {Related service links}
```

---

## Output Summary

After completion, provide a summary including:

### Sync Summary
- Number of services synchronized
- New services added
- Services updated
- Total endpoint count
- Any services that couldn't be synced (with reasons)
- Local path where files were created/updated

### Gap Analysis Summary
- Number of gaps identified
- Gaps by category (Glossary, Rules, External Services)
- High priority gaps
- Gaps that were auto-fixed

### Files Modified
List all files that were created or updated.

---

## Important Reminders

1. **Never modify source repository code** - only update local reference docs
2. **Always preserve the REFERENCE ONLY notice** - this is critical for developers
3. **Keep notices generic** - do NOT mention specific application names in reference notices
4. **Link to source repo** - always include links to the full documentation using `{owner}/{repo}` URL
5. **Focus on integration** - document how the service can be used
6. **Update all index files** - keep navigation files in sync
7. **Portable command** - this command works with any GitHub repository
8. **Gap analysis is mandatory** - always perform gap analysis after sync
9. **Cross-reference** - ensure local docs link to the reference docs folder
10. **Ask before applying gap fixes** - show gaps first, then ask if user wants to apply updates
11. **Filter by common_services** - only sync services listed in `i2a-config.yml` unless user explicitly requests all services
12. **Workspace may contain multiple repos** - never assume workspace root is a git repo; check for `.git/` folder first and use content comparison instead of git operations
