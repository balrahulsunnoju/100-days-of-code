---
mode: agent
description: "Full first-time workspace setup with BMAD installation, docs repo structure, and configuration."
---

# Setup BMAD Docs

You are helping a user set up a complete BMAD documentation environment for a new project.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.
>
> **For this workflow**: Git operations are performed on the docs repository, not the workspace root.

## Command Usage

```
/tdgs-aidlc-setup-workspace <persona>
```

| Persona | Description | Git Setup |
|---------|-------------|------------|
| `em` | Engineering Manager - Full setup including Git repository creation | ✓ Included |
| `ade` | Agentic Delivery Engineer - Setup without Git operations (uses existing repos) | ✗ Skipped |

**Examples:**
- `/tdgs-aidlc-setup-workspace em` — Full setup for Engineering Managers (creates remote repo, branches, commits)
- `/tdgs-aidlc-setup-workspace ade` — Agentic Delivery Engineer setup (skips Git operations, assumes repos already exist)

**⚠️ REQUIRED:** The persona parameter is mandatory. If not provided, the process will stop.

### Persona Validation (First Step)

Before any other steps, validate the persona parameter:

**If no persona provided or invalid value:**
```
❌ ERROR: Persona parameter is required.

Usage: /tdgs-aidlc-setup-workspace <persona>

Valid personas:
  em   — Engineering Manager (full setup with Git operations)
  ade  — Agentic Delivery Engineer (local setup only, no Git operations)

Examples:
  /tdgs-aidlc-setup-workspace em
  /tdgs-aidlc-setup-workspace ade

Please re-run the command with a valid persona.
```
**STOP execution immediately.**

**If valid persona provided:** Store the persona value and proceed to Step 0 (Prerequisite Check).

### Step 0: Prerequisite Check (Automated)

Before proceeding with setup, verify that required tools are installed and configured. This check runs automatically for both `em` and `ade` personas.

#### Required Tools

| Tool | Verify Command | Minimum Version | Install Guide |
|------|----------------|-----------------|---------------|
| Git | `git --version` | Any | https://git-scm.com |
| Node.js | `node --version` | v20.0.0+ | https://nodejs.org |
| Python | `python3 --version` | 3.10+ | [python.org](https://python.org/) |
| uv | `uv --version` | Any | [docs.astral.sh/uv](https://docs.astral.sh/uv/) |
| GitHub CLI | `gh --version` | Any | https://cli.github.com |
| GitHub CLI Auth | `gh auth status` | N/A (must be authenticated) | Run `gh auth login` |

#### Check Procedure

Run each verification command and collect results:

```
==============================================================
PREREQUISITE CHECK
==============================================================

Checking required tools...

  Tool          Status    Version/Details
  ------------  --------  ----------------------------------
  Git           ✓         2.43.0
  Node.js       ✓         v22.12.0
  Python        ✓         3.12.0
  uv            ✓         0.6.0
  GitHub CLI    ✓         2.45.0
  GitHub Auth   ✓         Logged in to github.com as user
```

#### Handling Missing or Outdated Tools

**If any tool is missing or fails the check**, display the error with installation instructions:

```
==============================================================
PREREQUISITE CHECK FAILED
==============================================================

The following tools are missing or need attention:

❌ Git - NOT FOUND
   Install: https://git-scm.com/downloads
   
   Windows:  winget install Git.Git
   macOS:    brew install git
   Linux:    sudo apt install git  (Debian/Ubuntu)
             sudo dnf install git  (Fedora/RHEL)

❌ Node.js - VERSION TOO OLD (v18.17.0 - requires v20+)
   Install: https://nodejs.org/en/download
   
   Windows:  winget install OpenJS.NodeJS.LTS
   macOS:    brew install node@20
   Linux:    Use nvm: https://github.com/nvm-sh/nvm
             nvm install 20
             nvm use 20

❌ GitHub CLI - NOT FOUND
   Install: https://cli.github.com
   
   Windows:  winget install GitHub.cli
   macOS:    brew install gh
   Linux:    See https://github.com/cli/cli/blob/trunk/docs/install_linux.md

❌ Python - NOT FOUND (or VERSION TOO OLD)
   Minimum required: 3.10+
   Install: https://python.org/downloads
   Windows:  winget install Python.Python.3.12
   macOS:    brew install python@3.12
   Linux:    sudo apt install python3

❌ uv - NOT FOUND
   Install: https://docs.astral.sh/uv/getting-started/installation/
   Windows:  irm https://astral.sh/uv/install.ps1 | iex
   macOS:    curl -LsSf https://astral.sh/uv/install.sh | sh
   Linux:    curl -LsSf https://astral.sh/uv/install.sh | sh

❌ GitHub CLI Auth - NOT AUTHENTICATED
   Run: gh auth login
   
   Follow the prompts to authenticate with GitHub.
   Select "GitHub.com" and your preferred authentication method.

--------------------------------------------------------------
Please install/configure the missing tools and re-run:

  /tdgs-aidlc-setup-workspace {persona}
--------------------------------------------------------------
```

**STOP execution immediately if any prerequisite fails.**

#### Node.js Version Parsing

When checking Node.js version:
1. Run `node --version` (returns format: `v20.11.0`)
2. Parse the major version number (e.g., `20` from `v20.11.0`)
3. Compare against minimum required version (20)
4. If major version < 20, mark as FAILED with upgrade instructions

#### Python Version Parsing

When checking Python version:
1. Run `python3 --version` (returns format: `Python 3.12.0`)
2. Parse the major.minor version (e.g., `3.12` from `Python 3.12.0`)
3. Compare against minimum required version (3.10)
4. If version < 3.10, mark as FAILED with upgrade instructions

#### All Prerequisites Passed

If all checks pass, display summary and proceed:

```
==============================================================
PREREQUISITE CHECK PASSED
==============================================================

All required tools are installed and configured:

  ✓ Git 2.43.0
  ✓ Node.js v22.12.0 (meets v20+ requirement)
  ✓ Python 3.12.0 (meets 3.10+ requirement)
  ✓ uv 0.6.0
  ✓ GitHub CLI 2.45.0
  ✓ GitHub authenticated as: username

Proceeding with setup...
```

Continue to Step 1.

---

## Context

This workflow runs AFTER:
1. Code repositories are cloned into a project workspace folder
2. GitHub Copilot Starter repository is cloned into the same workspace folder

**Note:** This prompt file (`/tdgs-aidlc-setup-workspace`) lives inside the `tdgs-aidlc-starter-kit` repo. The user runs this command directly from that repo.

This script will:
1. Install BMAD in the workspace root (with GitHub Copilot IDE selected)
2. Copy prompts from `tdgs-aidlc-starter-kit/src/` to `.github/` (workspace root)
3. Create the docs folder structure
4. Configure BMAD paths
5. **[EM only]** Initialize git, commit initial structure, and push to feature branch (PR created later)

**BMAD Installation Structure:**
BMAD installer creates 3 folders at workspace root:
- `_bmad/` — Module configuration files and manifests (skills are installed to `.github/skills/` instead)
- `_bmad-output/` — Generated artifacts output folder
- `.github/` — GitHub Copilot prompts, skills, and configuration (this is where prompts/i2a-config go)

## Pre-requisites

**Workspace Setup (Manual):**
- Code repositories already cloned into workspace folder
- `tdgs-aidlc-starter-kit` repository available in the workspace folder (cloned or symlinked)
- Internet access for npm and GitHub

**Required Tools (Checked Automatically in Step 0):**
- Git — [git-scm.com](https://git-scm.com)
- Node.js v20+ — [nodejs.org](https://nodejs.org)
- Python 3.10+ — [python.org](https://python.org/)
- uv — [docs.astral.sh/uv](https://docs.astral.sh/uv/)
- GitHub CLI (`gh`) — [cli.github.com](https://cli.github.com)
- GitHub CLI authenticated — Run `gh auth login`
- VS Code with GitHub Copilot extension

> **Note:** Step 0 automatically verifies Git, Node.js, Python, uv, GitHub CLI, and authentication. Missing tools will be flagged with installation instructions.

## Manual Setup (Before Running This Command)

The user must complete these steps manually before `/tdgs-aidlc-setup-workspace` can run:

```powershell
# 1. Create workspace and clone code repos
mkdir c:\Development\projects\my-project
cd c:\Development\projects\my-project
git clone https://github.com/{org}/my-project-service.git
git clone https://github.com/{org}/my-project-ui.git

# 2. Add AIDLC Starter Kit (symlink recommended, or clone)
# Option A — Symlink from central location:
ln -s ~/Development/tools/tdgs-aidlc-starter-kit tdgs-aidlc-starter-kit
# Option B — Clone directly:
git clone https://github.com/{org}/tdgs-aidlc-starter-kit.git

# 3. Open workspace in VS Code and run /tdgs-aidlc-setup-workspace
```

## Instructions

### Step 1: Verify AIDLC Starter Kit Exists

Check if `{workspace-root}/tdgs-aidlc-starter-kit/src/prompts/` exists.

**If not found:**
```
❌ AIDLC Starter Kit not found.

Please add tdgs-aidlc-starter-kit to your workspace:

  Option A (recommended) — Symlink from central location:
    ln -s ~/Development/tools/tdgs-aidlc-starter-kit tdgs-aidlc-starter-kit

  Option B — Clone directly:
    git clone https://github.com/{org}/tdgs-aidlc-starter-kit.git

Ensure the src/ folder exists with prompts.

Then re-run /tdgs-aidlc-setup-workspace
```
**STOP execution.**

**If exists:** Proceed to Step 2.

### Step 2: Read Target BMAD Version

Read the target BMAD version from the starter kit configuration:

```
tdgs-aidlc-starter-kit/src/i2a-config.yml
```

Extract `versions.bmad` value and store as `{bmad_version}` for use in subsequent steps.

**If `versions.bmad` is missing or empty:** BAIL with error:
```
❌ BMAD version not configured

The versions.bmad setting in tdgs-aidlc-starter-kit/src/i2a-config.yml is missing.

Please add the version configuration:
  versions:
    bmad: "6.3.0"
```

### Step 3: Check for Existing BMAD Installation

Check if `{workspace-root}/_bmad/` already exists.

**If not exists:**
Proceed to Step 4 (Fresh Install).

**If exists:**
Check the installed BMAD version by reading `_bmad/_config/manifest.yaml`:

```yaml
# Example manifest.yaml structure
installation:
  version: 6.3.0
  installDate: 2026-03-24T23:21:43.851Z
  ...
```

Extract the version from `installation.version` field.

**Compare versions:**

- **If installed version matches target (`{bmad_version}`):**
  ```
  Found existing BMAD installation at _bmad/
  Installed version: {bmad_version} ✓ (matches target)
  Skipping BMAD installation...
  ```
  Proceed to Step 5.

- **If installed version differs from target:**
  ```
  Found existing BMAD installation at _bmad/
  Installed version: {installed_version}
  Target version: {bmad_version}
  Version mismatch detected — updating BMAD...
  ```
  Proceed to Step 4 (Update).

### Step 4: Install or Update BMAD

#### 4.1: Fresh Install (BMAD not found)

Run the BMAD non-interactive installer using the version from config:

```powershell
npx bmad-method@{bmad_version} install --directory . --modules bmm --tools github-copilot --yes
```

#### 4.2: Update (BMAD exists but version mismatch)

Run the BMAD installer with `--action update`:

```powershell
npx bmad-method@{bmad_version} install --directory . --modules bmm --tools github-copilot --yes --action update
```

**IMPORTANT:** The `{bmad_version}` is read from `tdgs-aidlc-starter-kit/src/i2a-config.yml` (versions.bmad).

This command will:
- Install/update BMAD in the workspace root (`--directory .`)
- Select the BMM module (`--modules bmm`)
- Configure for GitHub Copilot (`--tools github-copilot`)
- Skip confirmation prompts (`--yes`)
- For updates: Use `--action update` to update existing installation

Verify installation:
```
✓ BMAD installed at: _bmad/
✓ BMAD output folder: _bmad-output/
✓ Config file: _bmad/bmm/config.yaml
✓ .github folder: .github/ (at workspace root)
```

### Step 5: Copy Prompts and VS Code Settings

Copy files from `tdgs-aidlc-starter-kit/src/` to their respective destinations.

#### 5.1: Remove Legacy Prompts (Cleanup)

Before copying new prompts, delete legacy prompt files that do NOT have the `tdgs-aidlc-` prefix. These are older versions that have been renamed/replaced.

**Cleanup procedure:**
1. List all files in `.github/prompts/`
2. Identify files that do NOT start with `tdgs-aidlc-`
3. Delete those legacy files

**Example legacy files to delete:**

*Original unprefixed prompts:*
- `commit.prompt.md` (replaced by `tdgs-aidlc-commit.prompt.md`)
- `create-pull-request.prompt.md` (replaced by `tdgs-aidlc-create-pull-request.prompt.md`)
- `initiate-issue.prompt.md` (replaced by `tdgs-aidlc-initiate-issue.prompt.md`)
- `install-hooks.prompt.md` (replaced by `tdgs-aidlc-install-hooks.prompt.md`)
- `post-deployment-docs-sync.prompt.md` (replaced by `tdgs-aidlc-post-deployment-docs-sync.prompt.md`)
- `pre-check-pull-request.prompt.md` (replaced by `tdgs-aidlc-pre-check-pull-request.prompt.md`)
- `prepare-repos.prompt.md` (replaced by `tdgs-aidlc-prepare-repos.prompt.md`)
- `reference-sync.prompt.md` (replaced by `tdgs-aidlc-reference-sync.prompt.md`)
- `setup-bmad-docs.prompt.md` (replaced by `tdgs-aidlc-setup-workspace.prompt.md`)
- `update-context-docs.prompt.md` (replaced by `tdgs-aidlc-update-context-docs.prompt.md`)
- `validate-runbook-context.prompt.md` (replaced by `tdgs-aidlc-validate-runbook-context.prompt.md`)
- `validate-test-context.prompt.md` (replaced by `tdgs-aidlc-validate-test-context.prompt.md`)

*Old `txgov-aidlc-` prefixed prompts (renamed to `tdgs-aidlc-`):*
- `txgov-aidlc-commit.prompt.md` (replaced by `tdgs-aidlc-commit.prompt.md`)
- `txgov-aidlc-create-pull-request.prompt.md` (replaced by `tdgs-aidlc-create-pull-request.prompt.md`)
- `txgov-aidlc-initiate-issue.prompt.md` (replaced by `tdgs-aidlc-initiate-issue.prompt.md`)
- `txgov-aidlc-install-hooks.prompt.md` (replaced by `tdgs-aidlc-install-hooks.prompt.md`)
- `txgov-aidlc-setup-workspace.prompt.md` (replaced by `tdgs-aidlc-setup-workspace.prompt.md`)
- Any other `txgov-aidlc-*.prompt.md` files

**Output:**
```
Cleaning up legacy prompts in .github/prompts/...
  ✓ Deleted: commit.prompt.md
  ✓ Deleted: create-pull-request.prompt.md
  ✓ Deleted: initiate-issue.prompt.md
  ... (list all deleted files)
Legacy cleanup complete: {count} files removed
```

**If no legacy files found:**
```
No legacy prompts found — skipping cleanup
```

#### 5.2: Copy New Files

**File Operations (use workspace file tools, not terminal commands):**

| Source | Destination | Action |
|--------|-------------|--------|
| `tdgs-aidlc-starter-kit/src/prompts/*` | `.github/prompts/` | Copy recursively (overwrite existing) |
| `tdgs-aidlc-starter-kit/src/i2a-config.yml` | `.github/i2a-config.yml` | Copy file (only if `.github/i2a-config.yml` does NOT already exist — preserves user configuration) |
| `tdgs-aidlc-starter-kit/src/.vscode/*` | `.vscode/` | Copy recursively (if source exists) |
| `tdgs-aidlc-starter-kit/src/agents/*` | `.github/agents/` | Copy recursively (if source exists — BMAD 6.3.0 installs skills to `.github/skills/`; this copies any custom agent overrides only) |
| `tdgs-aidlc-starter-kit/src/i2a-skills/*` | `.github/i2a-skills/` | Copy recursively (overwrite existing — custom AIDLC skills kept separate from BMAD skills in `.github/skills/`) |
| `tdgs-aidlc-starter-kit/src/templates/project-context-custom-rules.md` | `.github/templates/project-context-custom-rules.md` | Copy file (overwrite existing — provides DB Enhancement custom-rules template for project-context generation) |
| `tdgs-aidlc-starter-kit/src/templates/kb-generation-prompt.md` | `.github/templates/kb-generation-prompt.md` | Copy file (overwrite existing — provides KB generation prompt template for `/tdgs-aidlc-generate-kb`) |

**IMPORTANT — Preserving i2a-config.yml:**
The `i2a-config.yml` file contains user-specific configuration (issues repository, worker repos, common services) that is populated later in this workflow. If `.github/i2a-config.yml` already exists, do NOT overwrite it — the user's configured values must be preserved.

**Instructions:**
- Create destination directories if they don't exist
- Overwrite existing files (force) — except `i2a-config.yml` when it already exists
- Use IDE file operations or cross-platform tools—avoid OS-specific shell commands

Verify:
```
✓ .github/prompts/ exists
✓ .github/i2a-config.yml exists
✓ .vscode/ exists (at workspace root)
```

**Note:** The `tdgs-aidlc-starter-kit/` folder can be deleted after setup is complete (optional).

### Step 6: Detect GitHub Organization

Scan workspace folders for git repositories with remotes:
```powershell
# In each code repo folder (e.g., tx-ovra-orderdetails-service)
git remote -v
```

Extract organization from remote URL:
- `https://github.com/Texas-gov-Application-Services/tx-ovra-ui.git` → `Texas-gov-Application-Services`
- `git@github.com:Texas-gov-Application-Services/tx-ovra-ui.git` → `Texas-gov-Application-Services`

**If no remotes found:** Ask user for the organization name.

Store the detected `{org}` for use in subsequent steps.

### Step 7: Detect Project Name from Code Repos

Scan the workspace root for cloned git repositories. Extract the common project prefix:

Examples:
- `tx-ovra-orderdetails-service` → `tx-ovra`
- `tx-ovra-verificationletter-service` → `tx-ovra`
- `tx-ovra-ui` → `tx-ovra`

Pattern: Find the longest common prefix ending before the last hyphen-separated segment.

**If ambiguous or no repos found:** Ask the user for the project name.

### Step 8: Find or Create Docs Folder

Check if a docs folder exists matching `{project-name}-docs`:

**If exists:**
```
Found existing docs folder: tx-ovra-docs

Status:
  - knowledge-base/        [exists, X files]
  - planning-artifacts/    [missing]
  - implementation-artifacts/    [missing]

Proceeding with setup...
```

**If not exists AND `persona=ade`:**
```
❌ ERROR: Docs folder not found.

Expected folder: {project-name}-docs

As an Agentic Delivery Engineer, you must clone the docs repository that was
created by your Engineering Manager before running setup.

Steps to fix:
  1. Clone the docs repo:
     git clone https://github.com/{org}/{project-name}-docs.git

  2. Re-run the setup command:
     /tdgs-aidlc-setup-workspace ade

If the docs repository doesn't exist yet, ask your Engineering
Manager to run: /tdgs-aidlc-setup-workspace em
```
**STOP execution immediately.**

**If not exists AND `persona=em`:**
```
📁 Creating docs folder: {project-name}-docs

This folder will contain:
  - knowledge-base/ (project documentation)
  - planning-artifacts/ (BMAD planning outputs)
  - implementation-artifacts/ (technical specs, etc.)
```
Create the folder.

### Step 9: Create Folder Structure

Ensure these subdirectories exist in the docs folder:
- `planning-artifacts/`
- `implementation-artifacts/`
- `knowledge-base/`

Create any missing directories.

### Step 10: Add .gitkeep Files

For each subdirectory, if empty (no files), create an empty `.gitkeep` file:

| Folder | Action |
|--------|--------|
| `{project-name}-docs/planning-artifacts/` | Create `.gitkeep` if folder is empty |
| `{project-name}-docs/implementation-artifacts/` | Create `.gitkeep` if folder is empty |
| `{project-name}-docs/knowledge-base/` | Create `.gitkeep` if folder is empty |

**Instructions:**
- Use workspace file tools to check folder contents and create files
- `.gitkeep` files should be empty (0 bytes)

### Step 11: Update BMAD Configuration

Read `_bmad/bmm/config.yaml` and update these values:

```yaml
project_name: tx-ovra
planning_artifacts: tx-ovra-docs/planning-artifacts
implementation_artifacts: tx-ovra-docs/implementation-artifacts
project_knowledge: tx-ovra-docs/knowledge-base
output_folder: tx-ovra-docs
```

Use relative paths from workspace root. Preserve other existing values (user_name, communication_language, etc.).

### Step 12: Cleanup Unused BMAD Folders

Delete the following folders from the workspace root (these are default BMAD output folders that are not used in this project configuration):

| Folder | Action |
|--------|--------|
| `{workspace-root}/_bmad-output/` | Delete recursively (if exists) |
| `{workspace-root}/docs/` | Delete recursively (if exists) |

**Instructions:**
- Silently skip if folders don't exist
- Use workspace file tools or cross-platform delete operations

**Note:** These folders are created by BMAD installer but are not used since this project stores artifacts in `{project-name}-docs/` instead. This cleanup is performed automatically without user notification.

### Step 13: Update i2a-config.yml

#### 13.1: Prompt for Issues Repository (REQUIRED)

The issues.repository field specifies where GitHub issues are located for this project. This is a **required** field.

**IMPORTANT:** The issues repository is where GitHub Issues are tracked for this project. This may be a **different** repository than the docs repository being created. For example:
- Issues repository: `org/project-issues` (existing repo for issue tracking)
- Docs repository: `org/project-docs` (new repo for documentation content)

**Display prompt to user:**
```
==============================================================
CONFIGURE ISSUES REPOSITORY (REQUIRED)
==============================================================

Where are GitHub Issues for this project located?

NOTE: This is the repository where GitHub Issues are tracked.
      This may be different from the docs repository that will
      be created for documentation content.

Format: owner/repo
Example: Texas-gov-Application-Services/tx-ovra-issues

Enter issues repository: 
```

- If user provides a value → use that value
- If user presses Enter (empty) → **BAIL** with error:

```
✗ Issues repository is required.

Please provide the GitHub repository where issues are tracked.
Format: owner/repo (e.g., Texas-gov-Application-Services/tx-ovra-issues)

Re-run /tdgs-aidlc-setup-workspace and provide the issues repository when prompted.
```

**STOP execution if no value provided.**

Store the user's response as `{issues_repository}`.

#### 13.2: Detect Worker Repositories

Scan the workspace root for code repositories.

**Primary Approach (Preferred):**
Use workspace file tools and terminal commands:
1. Use `list_dir` to list all directories in workspace root
2. For each directory, check if `.git` subfolder exists (use `list_dir` on the directory)
3. For directories with `.git`, run `git remote -v` in terminal to get remote URL
4. Parse the remote URL to identify the provider and extract repository info:
   - **GitHub**: Extract `org/repo` from URL (e.g., `github.com:org/repo.git` → `org/repo`)
   - **TX Bitbucket**: Extract project and repo from SCM path (e.g., `/scm/ovra/tx-ovra-ui.git` → project: `OVRA`, repo: `tx-ovra-ui`)

**Fallback Approach (If Primary Fails):**
If the primary approach encounters errors (e.g., terminal commands fail, permission issues):
1. Check if `.vscode/mcp.json` exists in the workspace
2. If MCP is configured, activate the GitHub MCP server
3. Use MCP tools (`mcp_github-mcp_get_file_contents`, etc.) to query repository information
4. Note: MCP fallback only works for GitHub repos; Bitbucket repos still require terminal commands

Filter to include only folders that:
1. Are git repositories (have `.git` folder)
2. Are NOT the docs folder (`{project-name}-docs`)
3. Are NOT the `tdgs-aidlc-starter-kit` folder
4. Are NOT BMAD folders (`_bmad`, `_bmad-output`)

**Detect repository provider from remote URL:**
- `github.com` → GitHub (use `owner/repo` format)
- `txgscmp.ad.portal.texas.gov` → TX Bitbucket Server (use full browse URL)

**URL Format by Provider:**
| Provider | Example Remote URL | Config Format |
|----------|-------------------|---------------|
| GitHub | `git@github.com:org/repo.git` | `org/repo` |
| GitHub | `https://github.com/org/repo.git` | `org/repo` |
| TX Bitbucket | `https://txgscmp.ad.portal.texas.gov/scm/ovra/tx-ovra-ui.git` | `https://txgscmp.ad.portal.texas.gov/projects/OVRA/repos/tx-ovra-ui/browse` |
| TX Bitbucket | `ssh://git@txgscmp.ad.portal.texas.gov/ovra/tx-ovra-ui.git` | `https://txgscmp.ad.portal.texas.gov/projects/OVRA/repos/tx-ovra-ui/browse` |

**TX Bitbucket URL Conversion:**
- Extract project key from remote path (e.g., `/scm/ovra/` → `OVRA` uppercase)
- Extract repo name from remote path (e.g., `tx-ovra-ui.git` → `tx-ovra-ui`)
- Construct browse URL: `https://txgscmp.ad.portal.texas.gov/projects/{PROJECT}/repos/{repo}/browse`

For each detected repository, derive a service key:
- `tx-ovra-orderdetails-service` → key: `orderdetails-service`
- `tx-ovra-receipt-service` → key: `receipt-service`  
- `tx-ovra-verificationletter-service` → key: `verificationletter-service`
- `tx-ovra-ui` → key: `ui`
- `tx-ovra-database` → key: `database`

Pattern: Remove the `{project-name}-` prefix to get the service key.

#### 13.3: Display Detected Repositories for Confirmation

```
==============================================================
DETECTED WORKER REPOSITORIES
==============================================================

The following repositories were found in the workspace:

  Key                          Provider       Repository
  ---------------------------  -------------  -----------------------------------------
  orderdetails-service         GitHub         {org}/tx-ovra-orderdetails-service
  receipt-service              GitHub         {org}/tx-ovra-receipt-service
  verificationletter-service   TX Bitbucket   https://txgscmp.ad.portal.texas.gov/projects/OVRA/repos/tx-ovra-verificationletter/browse  ⚠️ PUSH BLOCKED
  ui                           GitHub         {org}/tx-ovra-ui
  database                     TX Bitbucket   https://txgscmp.ad.portal.texas.gov/projects/OVRA/repos/tx-ovra-database/browse  ⚠️ PUSH BLOCKED

⚠️  NON-GITHUB REPOSITORIES DETECTED

  The following repositories use TX Bitbucket (not GitHub):
    - verificationletter-service
    - database

  These repos can be modified locally (branch, commit) but push/PR is blocked for AIDLC:
    ✓ Can create local branches via /tdgs-aidlc-prepare-repos
    ✓ Can commit changes locally via /tdgs-aidlc-commit
    ✗ Cannot push branches via AIDLC
    ✗ Cannot create PRs via /tdgs-aidlc-create-pull-request

  To push and create PRs, follow your team's standard Bitbucket workflow.
  These repos will still be included in KB generation and context.

These will be added to .github/i2a-config.yml

Continue? [Y/n]: 
```

- If user confirms → proceed
- If user declines → allow manual editing later

#### 13.4: Classify Common/Shared Repos

After detecting all repositories in Step 13.3, classify which are common/shared repos vs. app-specific repos.

**Auto-Detection Hints:**
Repos matching these patterns should be pre-classified as common and presented for confirmation:
- Directory is a symlink (Windows: `Get-Item` shows `ReparsePoint` attribute with `SymbolicLink` LinkType)
- Repo name matches patterns like `common-*`, `shared-*`, or `sim4-*`

**Classification Prompt:**
If any repos match auto-detection hints, present them for classification:
```
══════════════════════════════════════════════════════════════
REPOSITORY CLASSIFICATION
══════════════════════════════════════════════════════════════

The following repositories appear to be common/shared services
(detected via symlink or naming pattern):

  - notificationengine-service
  - pacs-service
  - paymentintegration-service
  - tcas-service

These will be added to `common_repos` in .github/i2a-config.yml.
All other repos will go under `worker_repos` (app-specific).

Confirm classification? [Y/n]:
```

- If user confirms → store the classified lists
- If user declines → allow manual editing later

Store the detected common repos as `{common_repos_list}` and app repos as `{worker_repos_list}`.

#### 13.5: Write i2a-config.yml

Update `.github/i2a-config.yml` with collected values.

**For `persona=em` (no common repos detected):**

```yaml
# Prompt Configuration for GitHub Copilot

# Issue Tracking - Where GitHub issues are located for this project
# Format: owner/repo (leave empty to use current repository)
issues:
  repository: "{issues_repository}"

# App-specific repos — owned by this application team
# Used by: all AIDLC prompts (branch, commit, PR, KB generation)
# KB output: knowledge-base/repos/{key}/
# Format: 
#   GitHub repos:       <service-key>: "<github-org>/<repo-name>"
#   TX Bitbucket repos: <service-key>: "https://txgscmp.ad.portal.texas.gov/projects/<PROJECT>/repos/<repo>/browse"
worker_repos:
  orderdetails-service: "{org}/tx-ovra-orderdetails-service"
  receipt-service: "{org}/tx-ovra-receipt-service"
  verificationletter-service: "https://txgscmp.ad.portal.texas.gov/projects/OVRA/repos/tx-ovra-verificationletter/browse"
  ui: "{org}/tx-ovra-ui"
  database: "https://txgscmp.ad.portal.texas.gov/projects/OVRA/repos/tx-ovra-database/browse"

# Common/shared repos — used by multiple applications, any app team can modify
# Same format as worker_repos. Merged with worker_repos at runtime for all operations.
# KB output: knowledge-base/common-services/{key}/
# PRs: flagged with shared-code impact warning
# common_repos:
  # notificationengine-service: "<github-org>/<repo-name>"
  # pacs-service: "<github-org>/<repo-name>"

# Knowledge Base Generation settings (optional)
# Used by: /tdgs-aidlc-generate-kb
# Auto-detection handles most cases; uncomment to override
kb_generation:
  # apigee: auto | git | exports | false (default: auto)
  apigee: auto
  # apigee_folder: "apigee-exports"  # custom folder name for exports mode
  # apigee_repos:                     # explicit proxy repo list for git mode
  #   - "tdgs-myapp-transaction-proxy"
```

**For workspaces with common repos classified (from Step 13.4):**

```yaml
# Prompt Configuration for GitHub Copilot

# Issue Tracking - Where GitHub issues are located for this project
# Format: owner/repo (leave empty to use current repository)
issues:
  repository: "{issues_repository}"

# App-specific repos — owned by this application team
# Used by: all AIDLC prompts (branch, commit, PR, KB generation)
# KB output: knowledge-base/repos/{key}/
# Format: 
#   GitHub repos:       <service-key>: "<github-org>/<repo-name>"
#   TX Bitbucket repos: <service-key>: "https://txgscmp.ad.portal.texas.gov/projects/<PROJECT>/repos/<repo>/browse"
worker_repos:
  orderdetails-service: "{org}/tx-ovra-orderdetails-service"
  receipt-service: "{org}/tx-ovra-receipt-service"
  verificationletter-service: "https://txgscmp.ad.portal.texas.gov/projects/OVRA/repos/tx-ovra-verificationletter/browse"
  ui: "{org}/tx-ovra-ui"
  database: "https://txgscmp.ad.portal.texas.gov/projects/OVRA/repos/tx-ovra-database/browse"

# Common/shared repos — used by multiple applications, any app team can modify
# Same format as worker_repos. Merged with worker_repos at runtime for all operations.
# KB output: knowledge-base/common-services/{key}/
# PRs: flagged with shared-code impact warning
common_repos:
  notificationengine-service: "{org}/txgov-notificationengine-service"
  pacs-service: "{org}/txgov-pacs-service"
  paymentintegration-service: "{org}/txgov-paymentintegration-service"
  tcas-service: "{org}/txgov-tcas-service"

# Knowledge Base Generation settings (optional)
# Used by: /tdgs-aidlc-generate-kb
# Auto-detection handles most cases; uncomment to override
kb_generation:
  # apigee: auto | git | exports | false (default: auto)
  apigee: auto
  # apigee_folder: "apigee-exports"  # custom folder name for exports mode
  # apigee_repos:                     # explicit proxy repo list for git mode
  #   - "tdgs-myapp-transaction-proxy"
```

**Note:** The `common_repos` section should be populated with the repos classified as common/shared in Step 13.4. If no common repos were detected, the section should be commented out like the first example.

### Step 14: Validate Setup

Display validation results:
```
=== Validation ===

BMAD Installation:
  ✓ _bmad/ exists
  ✓ _bmad-output/ exists
  ✓ _bmad/bmm/config.yaml configured
  ✓ .github/prompts/ exists
  ✓ .github/i2a-config.yml exists

Docs Structure:
  ✓ tx-ovra-docs/planning-artifacts exists
  ✓ tx-ovra-docs/implementation-artifacts exists
  ✓ tx-ovra-docs/knowledge-base exists

Configuration:
  ✓ project_name: tx-ovra
  ✓ output_folder: tx-ovra-docs
  ✓ issues.repository: {issues_repository}
  ✓ worker_repos: {count} repositories configured
```

**Additional validation for common repos (if classified):**
```
Common Repos:
  ✓ common_repos: {count} repositories configured
    - notificationengine-service
    - pacs-service
    - paymentintegration-service
    - tcas-service
```

If no common repos were detected, display:
```
Common Repos:
  ⚠ common_repos: No common/shared repos detected (no symlinks found)
```

### Step 15: Git Initialization & Push

> **PERSONA CHECK:** This step is ONLY executed when `persona=em` (Engineering Manager).
> If `persona=ade`, **SKIP this entire step** and proceed to Step 16.

#### 15.1: Initialize Git with Master Branch

When initializing the docs repository, explicitly specify `master` as the default branch using the `-b` flag. This avoids modifying global git configuration.

**Initialize with explicit branch name:**
```bash
git init -b master
```

This approach:
- Sets `master` as the initial branch for this repo only
- Does not affect global git configuration
- Does not affect other repositories
- Works on all platforms (Windows, Mac, Linux)

Proceed to Step 15.2.

#### 15.2: Confirm Docs Repository Name (REQUIRED)

Before creating the remote repository, confirm the docs repository name with the user.

**IMPORTANT:** The docs repository is where documentation content will be stored. This is typically **different** from the issues repository configured in Step 11.

**Display prompt to user:**
```
==============================================================
CONFIRM DOCS REPOSITORY (REQUIRED)
==============================================================

A new GitHub repository will be created for documentation content.

  Local folder:    {project-name}-docs
  Suggested repo:  {org}/{project-name}-docs

NOTE: This is where BMAD artifacts, planning docs, and knowledge
      base content will be stored. This is separate from the
      issues repository ({issues_repository}).

Create repository: {org}/{project-name}-docs? [Y/n]
Or enter a different name (format: owner/repo): 
```

- If user confirms (Y/Enter) → use `{org}/{project-name}-docs`
- If user provides a different value → use that value
- If user declines (n) → **STOP** and let user manually configure later

Store the confirmed value as `{docs_repository}`.

#### 15.3: Check/Create Remote Repository

```powershell
gh repo view {docs_repository} --json name 2>$null
```

**If not exists:** Create it:
```powershell
# Check visibility of existing repos to match
gh repo view {org}/{first-code-repo} --json visibility --jq '.visibility'

# Create with matching visibility (typically private)
gh repo create {docs_repository} --private --description "Documentation for {project-name} project"
```

#### 15.4: Initialize Local Git & Create Branches

**Branch Strategy (mirrors /tdgs-aidlc-initiate-issue pattern):**
- **Integration branch:** `feature/initial-docs-setup` — target for PRs, no direct commits
- **Dev branch:** `dev/initial-docs-setup` — working branch for commits

```bash
cd {project-name}-docs

# Initialize git with master as default branch (repo-local, no global config change)
git init -b master

# Create an initial empty commit on master branch
# This establishes master as the default/base branch
git commit --allow-empty -m "chore: initialize repository"

# Add remote origin
git remote add origin https://github.com/{docs_repository}.git

# Push master branch to remote (establishes as default branch)
git push -u origin master

# Create integration branch from master (no direct commits to this branch)
git checkout -b feature/initial-docs-setup

# Push integration branch to remote
git push -u origin feature/initial-docs-setup

# Create dev branch from integration branch for actual work
git checkout -b dev/initial-docs-setup

# Stage all files
git add .
```

#### 15.5: Commit with Conventional Format

Create a sensible commit for initial setup (no GitHub issue required):

```powershell
git commit -m "docs(setup): initialize documentation structure" -m "- Create planning-artifacts directory
- Create implementation-artifacts directory
- Create knowledge-base directory
- Add .gitkeep files for empty folder tracking

Initial documentation structure for {project-name} project."
```

#### 15.6: Push Dev Branch to Remote

```powershell
# Push dev branch (integration branch already pushed in Step 15.4)
git push -u origin dev/initial-docs-setup
```

**Note:** Do NOT create the PR yet. The PR will be created after the knowledge base documentation is generated and committed (see Step 16 "Next Steps"). The PR will target `feature/initial-docs-setup` (integration branch).

### Step 16: Display Summary & Next Steps

**For `persona=em` (Engineering Manager):**

```
=== Setup Complete (Engineering Manager) ===

📁 BMAD Installation:
   _bmad/
   └── bmm/config.yaml (BMAD paths configured)

📁 GitHub Copilot Config: .github/
   ├── prompts/ (GitHub Copilot prompts)
   ├── skills/ (BMAD skills — 41 installed)
   └── i2a-config.yml (project configuration)

📁 VS Code Settings: .vscode/
   └── (workspace settings)

📁 Docs Folder: {project-name}-docs/
   ├── planning-artifacts/
   ├── implementation-artifacts/
   └── knowledge-base/

Git Repository:
  ✓ Issues repo: {issues_repository} (for issue tracking)
  ✓ Docs repo: {docs_repository} (for documentation content)
  ✓ Remote: https://github.com/{docs_repository}.git
  ✓ Default branch: master (created and pushed)
  ✓ Integration branch: feature/initial-docs-setup (PR target, from master)
  ✓ Dev branch: dev/initial-docs-setup (working branch)
  ✓ Commit #1: docs(setup): initialize documentation structure

🎉 Next Steps:
   1. Run: /tdgs-aidlc-install-hooks (one-time setup for pre-commit hooks)
   2. ⚠️ IMPORTANT: Start a NEW Agent chat session before proceeding to avoid context overflow.
   3. Follow the Knowledge Base Generation guide (doc/knowledge-base-generation.md in the starter kit) to generate knowledge base documentation.

The PR will be created after all documentation is complete.
  → PR will target: feature/initial-docs-setup (integration branch)
  → Then merge integration branch to master
```

**For `persona=ade` (Agentic Delivery Engineer):**

```
=== Setup Complete (Agentic Delivery Engineer) ===

📁 BMAD Installation:
   _bmad/
   └── bmm/config.yaml (BMAD paths configured)

📁 GitHub Copilot Config: .github/
   ├── prompts/ (GitHub Copilot prompts)
   ├── skills/ (BMAD skills — 41 installed)
   └── i2a-config.yml (project configuration)

📁 VS Code Settings: .vscode/
   └── (workspace settings)

📁 Docs Folder: {project-name}-docs/
   ├── planning-artifacts/
   ├── implementation-artifacts/
   └── knowledge-base/

Configuration:
  ✓ Issues repo: {issues_repository} (for issue tracking)
  ✓ Worker repos: {count} repositories configured

⚠️ Git Setup Skipped (Agentic Delivery Engineer Mode)
   Using existing docs folder created by Engineering Manager.
   BMAD configuration has been set up locally.
   Git operations were not performed - use your existing repository setup.

🎉 You're ready to start development!

Next Steps:
   1. Run: /tdgs-aidlc-install-hooks (one-time setup for pre-commit hooks)
   2. Get Pre-Work from EM: Issue ID and issue type (feature/hotfix)
   3. Run: /tdgs-aidlc-initiate-issue {issue_id} {type}
   4. Follow the workflow: /bmad-quick-dev (spec) → Prepare-Repos → /bmad-quick-dev (implement) → Commit → /bmad-code-review (3-layer adversarial review) → PR
```

**Important:** For EM persona, the user should start a new Agent chat session to avoid context overflow, then proceed to generate knowledge base documentation using BMAD's Document Project feature. After that documentation is committed to the dev branch, create a PR targeting the integration branch (`feature/initial-docs-setup`). Once the PR is approved and merged, the integration branch can then be merged to master.

## Example Session

User runs: `/tdgs-aidlc-setup-workspace em`

```
0. ✓ Persona: em (Engineering Manager) - Full setup including Git operations
1. ✓ Found tdgs-aidlc-starter-kit/src/prompts/
2. ✓ No existing BMAD installation found
3. ✓ Installing BMAD...
   ✓ BMAD installed at: _bmad/
4. ✓ Copied prompts from tdgs-aidlc-starter-kit/src/ to .github/
5. ✓ Detected org: Texas-gov-Application-Services (from tx-ovra-ui remote)
6. ✓ Detected project: tx-ovra (from tx-ovra-orderdetails-service, tx-ovra-ui)
7. ✓ Created docs folder: tx-ovra-docs
8. ✓ Created subdirectories: planning-artifacts, implementation-artifacts, knowledge-base
9. ✓ Added .gitkeep to empty folders
10. ✓ Updated _bmad/bmm/config.yaml

11. Configure i2a-config.yml:

    ==============================================================
    CONFIGURE ISSUES REPOSITORY (REQUIRED)
    ==============================================================
    
    Where are GitHub Issues for this project located?
    
    NOTE: This is the repository where GitHub Issues are tracked.
          This may be different from the docs repository that will
          be created for documentation content.
    
    Format: owner/repo
    Example: Texas-gov-Application-Services/tx-ovra-issues
    
    Enter issues repository: Texas-gov-Application-Services/tx-ovra-issues
    
    ==============================================================
    DETECTED WORKER REPOSITORIES
    ==============================================================
    
    The following code repositories were found in the workspace:
    
      Key                          Repository
      ---------------------------  -----------------------------------------
      orderdetails-service         Texas-gov-Application-Services/tx-ovra-orderdetails-service
      receipt-service              Texas-gov-Application-Services/tx-ovra-receipt-service
      verificationletter-service   Texas-gov-Application-Services/tx-ovra-verificationletter-service
      ui                           Texas-gov-Application-Services/tx-ovra-ui
    
    These will be added to .github/i2a-config.yml
    
    Continue? [Y/n]: Y
    
    ✓ Updated .github/i2a-config.yml

12. ✓ Validation passed

13. Git setup:

    ==============================================================
    CONFIRM DOCS REPOSITORY (REQUIRED)
    ==============================================================
    
    A new GitHub repository will be created for documentation content.
    
      Local folder:    tx-ovra-docs
      Suggested repo:  Texas-gov-Application-Services/tx-ovra-docs
    
    NOTE: This is where BMAD artifacts, planning docs, and knowledge
          base content will be stored. This is separate from the
          issues repository (Texas-gov-Application-Services/tx-ovra-issues).
    
    Create repository: Texas-gov-Application-Services/tx-ovra-docs? [Y/n]: Y
    
    ✓ Created remote repo: tx-ovra-docs (private)
    ✓ Initialized git with master branch (git init -b master)
    ✓ Created initial empty commit on master
    ✓ Pushed master branch to remote (default branch)
    ✓ Created integration branch: feature/initial-docs-setup (from master)
    ✓ Pushed integration branch to remote
    ✓ Created dev branch: dev/initial-docs-setup (from integration)
    ✓ Commit #1: docs(setup): initialize documentation structure
    ✓ Pushed dev branch to remote

14. ✓ Initial setup complete!

    Issues repo:        Texas-gov-Application-Services/tx-ovra-issues
    Docs repo:          Texas-gov-Application-Services/tx-ovra-docs
    Integration branch: feature/initial-docs-setup
    Dev branch:         dev/initial-docs-setup (current)

⚠️ IMPORTANT: Start a NEW Agent chat session before proceeding.

Next: Follow the Knowledge Base Generation guide (doc/knowledge-base-generation.md in the starter kit) to generate knowledge base documentation.

Optional: Delete tdgs-aidlc-starter-kit/ folder after entire setup is complete (prompts are now in .github/)
```
