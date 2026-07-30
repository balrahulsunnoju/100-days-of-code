---
mode: agent
description: "Install or upgrade BMAD and copy AIDLC prompts, skills, and configuration into the workspace."
---

# Quick Setup — BMAD + AIDLC Prompts

You are helping a user perform a lightweight workspace setup that installs (or upgrades) BMAD and copies the latest AIDLC prompts. This command is persona-agnostic — it works the same way for Engineering Managers and Agentic Delivery Engineers.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Command Usage

```
/tdgs-aidlc-quick-setup
/tdgs-aidlc-quick-setup update-workspace
```

### Default mode (no arguments)

This command:
1. Checks prerequisites (Node.js, Python, uv)
2. Installs or upgrades BMAD to the version specified in the starter kit
3. Copies AIDLC prompts, i2a-skills, i2a-config template, and VS Code settings to the workspace

**When to use:**
- First-time workspace setup (before running `/tdgs-aidlc-setup-workspace`)
- After pulling a new version of `tdgs-aidlc-starter-kit` to pick up prompt and BMAD updates
- To re-sync prompts without re-running the full setup workflow

### `update-workspace` mode

Re-scans the workspace for repositories and updates `.github/i2a-config.yml` with any new repos that have been cloned since the initial setup.

**When to use:**
- After cloning a new worker repository into the workspace
- After removing a repository from the workspace
- To verify the workspace configuration matches the actual repos on disk

---

## Instructions

### Mode Routing

If the user provided `update-workspace` as an argument, skip to **[Update Workspace Mode](#update-workspace-mode)** below.

Otherwise, continue with the default setup flow (Step 1).

### Step 1: Prerequisite Check (Automated)

Before proceeding, verify that required tools are installed and configured.

#### Required Tools

| Tool | Verify Command | Minimum Version | Install Guide |
|------|----------------|-----------------|---------------|
| Node.js | `node --version` | v20.0.0+ | https://nodejs.org |
| Python | `python3 --version` | 3.10+ | [python.org](https://python.org/) |
| uv | `uv --version` | Any | [docs.astral.sh/uv](https://docs.astral.sh/uv/) |

#### Check Procedure

Run each verification command and collect results:

```
==============================================================
PREREQUISITE CHECK
==============================================================

Checking required tools...

  Tool          Status    Version/Details
  ------------  --------  ----------------------------------
  Node.js       ✓         v22.12.0
  Python        ✓         3.12.0
  uv            ✓         0.6.0
```

#### Handling Missing or Outdated Tools

**If any tool is missing or fails the check**, display the error with installation instructions:

```
==============================================================
PREREQUISITE CHECK FAILED
==============================================================

The following tools are missing or need attention:

❌ Node.js - VERSION TOO OLD (v18.17.0 - requires v20+)
   Install: https://nodejs.org/en/download
   
   Windows:  winget install OpenJS.NodeJS.LTS
   macOS:    brew install node@20
   Linux:    Use nvm: https://github.com/nvm-sh/nvm
             nvm install 20
             nvm use 20

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

--------------------------------------------------------------
Please install/configure the missing tools and re-run:

  /tdgs-aidlc-quick-setup
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

  ✓ Node.js v22.12.0 (meets v20+ requirement)
  ✓ Python 3.12.0 (meets 3.10+ requirement)
  ✓ uv 0.6.0

Proceeding with setup...
```

Continue to Step 2.

---

### Step 2: Verify AIDLC Starter Kit Exists

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

Then re-run /tdgs-aidlc-quick-setup
```
**STOP execution.**

**If exists:** Proceed to Step 3.

### Step 3: Read Target BMAD Version

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

### Step 4: Check for Existing BMAD Installation

Check if `{workspace-root}/_bmad/` already exists.

**If not exists:**
Proceed to Step 5 (Fresh Install).

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

**Compare versions** using semver comparison (major.minor.patch):

- **If installed version matches target (`{bmad_version}`):**
  ```
  Found existing BMAD installation at _bmad/
  Installed version: {bmad_version} ✓ (matches target)
  Skipping BMAD installation...
  ```
  Proceed to Step 6.

- **If installed version is older than target (upgrade):**
  ```
  Found existing BMAD installation at _bmad/
  Installed version: {installed_version}
  Target version: {bmad_version}
  Version mismatch detected — upgrading BMAD...
  ```
  Proceed to Step 5 (Update).

- **If installed version is newer than target (downgrade):**
  Display a warning and ask for confirmation before proceeding:
  ```
  ⚠️  DOWNGRADE DETECTED

  Found existing BMAD installation at _bmad/
  Installed version: {installed_version}
  Target version:    {bmad_version}

  The starter kit targets an OLDER version of BMAD than what is currently
  installed. This typically means the starter kit branch is behind the
  workspace. Downgrading may cause compatibility issues with existing
  planning artifacts, sprint-status files, or skill workflows.

  Common causes:
    • The starter kit branch has not been updated to the latest tag
    • You switched to an older starter kit branch for testing
    • A version pin was rolled back intentionally

  Options:
    [1] Proceed with downgrade — install BMAD {bmad_version} (replaces {installed_version})
    [2] Abort — keep current BMAD {installed_version} and skip BMAD installation
  ```

  - **If user selects [1]:** Proceed to Step 5 (Update) with the older version.
  - **If user selects [2]:** Skip BMAD installation and proceed directly to Step 6 (Copy Prompts).

### Step 5: Install or Update BMAD

#### 5.1: Fresh Install (BMAD not found)

Run the BMAD non-interactive installer using the version from config:

```powershell
npx bmad-method@{bmad_version} install --directory . --modules bmm --tools github-copilot --yes
```

#### 5.2: Update (BMAD exists but version mismatch)

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

### Step 6: Copy Prompts and VS Code Settings

Copy files from `tdgs-aidlc-starter-kit/src/` to their respective destinations.

#### 6.1: Remove Legacy Prompts (Cleanup)

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
  ... (list all deleted files)
Legacy cleanup complete: {count} files removed
```

**If no legacy files found:**
```
No legacy prompts found — skipping cleanup
```

#### 6.2: Copy New Files

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
The `i2a-config.yml` file contains user-specific configuration (issues repository, worker repos, common services) that is populated by `/tdgs-aidlc-setup-workspace`. If `.github/i2a-config.yml` already exists, do NOT overwrite it — the user's configured values must be preserved.

**Instructions:**
- Create destination directories if they don't exist
- Overwrite existing prompt files (force)
- Do NOT overwrite an existing `.github/i2a-config.yml`
- Use IDE file operations or cross-platform tools — avoid OS-specific shell commands

Verify:
```
✓ .github/prompts/ — {count} prompt files copied
✓ .github/i2a-config.yml — {exists: copied / skipped (already exists)}
✓ .vscode/ — copied (if source existed)
```

---

### Step 7: Cleanup Unused BMAD Folders

Delete the following folders from the workspace root (these are default BMAD output folders that are not used in this project configuration):

| Folder | Action |
|--------|--------|
| `{workspace-root}/_bmad-output/` | Delete recursively (if exists) |
| `{workspace-root}/docs/` | Delete recursively (if exists) |

**Instructions:**
- Silently skip if folders don't exist
- Use workspace file tools or cross-platform delete operations

**Note:** These folders are created by BMAD installer but are not used since this project stores artifacts in `{project-name}-docs/` instead. This cleanup is performed automatically without user notification.

---

### Step 8: Display Summary

```
==============================================================
QUICK SETUP COMPLETE
==============================================================

BMAD:
  ✓ Version: {bmad_version} ({installed / updated / already current})
  ✓ Location: _bmad/

Prompts:
  ✓ .github/prompts/ — {count} prompt files
  ✓ .github/i2a-config.yml — {copied / preserved existing}
  ✓ .vscode/ — {copied / skipped}

--------------------------------------------------------------
If this is a first-time setup, run next:

  /tdgs-aidlc-setup-workspace <persona>

  em  — Engineering Manager (full setup with Git operations)
  ade — Agentic Delivery Engineer (local setup only)
--------------------------------------------------------------
```

---

## Update Workspace Mode

This mode re-scans the workspace and updates `.github/i2a-config.yml` with the current set of repositories.

### UW Step 1: Verify Configuration Exists

Check that `.github/i2a-config.yml` exists. If not, BAIL:
```
❌ No workspace configuration found.

Run /tdgs-aidlc-setup-workspace first to initialize the workspace.
```

### UW Step 2: Load Current Configuration

Read `.github/i2a-config.yml` and extract the current `worker_repos` and `common_repos` lists.

### UW Step 3: Scan Workspace for Repositories

Scan the workspace root for directories containing a `.git` folder:
1. Use `list_dir` to list all directories in workspace root
2. For each directory, check if `.git` subfolder exists
3. For directories with `.git`, run `git remote -v` to get remote URL
4. Parse remote URLs to extract repository identifiers (org/repo for GitHub, project/repo for Bitbucket)

Exclude:
- `_bmad/`, `_bmad-output/`, `.github/`, `.vscode/`, `tdgs-aidlc-starter-kit/`, `txgov-aidlc-starter-kit/`
- The docs repository (already tracked under `docs_repo` in config)
- Any directory without a `.git` folder

### UW Step 4: Compare and Identify Changes

Compare scanned repos against the current `worker_repos` and `common_repos` in config:
- **New repos**: Present in workspace but not in either config section
- **Removed repos**: Present in config but no longer in workspace
- **Unchanged repos**: Present in both

### UW Step 5: Present Results

Display the comparison:
```
==============================================================
WORKSPACE SCAN RESULTS
==============================================================

Current worker_repos: {count}
Current common_repos: {count}
Repos found on disk: {count}

  New (will be added):
    + {org}/{repo-name}

  Removed (will be deleted from config):
    - {org}/{repo-name}

  Unchanged:
    ✓ {org}/{repo-name} (worker)
    ✓ {org}/{repo-name} (common)
```

If no changes detected:
```
✓ Workspace configuration is up to date. No changes needed.
```
And STOP.

### UW Step 6: Update Configuration

If changes were detected, ask for confirmation:
```
Apply these changes to .github/i2a-config.yml? (yes/no)
```

On confirmation, update `.github/i2a-config.yml`:
- For new repos, classify them: if the repo directory is a symlink OR the repo name matches patterns like `common-*`, `shared-*`, or `sim4-*`, prompt the user:
  ```
  New repo detected: {repo-name}
  Is this a common/shared repo (used by multiple applications)? (yes/no)
  ```
  - If yes → add to `common_repos` section
  - If no → add to `worker_repos` section
- Remove repos no longer present from whichever section they were in
- Preserve all other configuration (issues, versions, etc.)
- **Backfill `kb_generation` section** if not present — append the following after `common_repos` (or `common_services`):
  ```yaml
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

### UW Step 7: Confirm

```
==============================================================
WORKSPACE UPDATED
==============================================================

  ✓ Added {count} repo(s): {repo-names}
  ✓ Removed {count} repo(s): {repo-names}
  ✓ Total worker_repos: {count}
  ✓ Total common_repos: {count}
==============================================================
```

---

## Example Session

```
User runs: /tdgs-aidlc-quick-setup

==============================================================
PREREQUISITE CHECK PASSED
==============================================================

  ✓ Node.js v22.12.0 (meets v20+ requirement)
  ✓ Python 3.12.0 (meets 3.10+ requirement)
  ✓ uv 0.6.0

✓ Found tdgs-aidlc-starter-kit/src/prompts/
✓ Target BMAD version: 6.3.0

Found existing BMAD installation at _bmad/
Installed version: 6.2.0
Target version: 6.3.0
Version mismatch detected — updating BMAD...

✓ BMAD updated to 6.3.0

Cleaning up legacy prompts in .github/prompts/...
  No legacy prompts found — skipping cleanup

Copying prompts...
  ✓ .github/prompts/ — 30 prompt files copied
  ✓ .github/i2a-config.yml — skipped (already exists)
  ✓ .vscode/ — copied

Cleaning up unused BMAD folders...
  ✓ Deleted: _bmad-output/
  ✓ Deleted: docs/

==============================================================
QUICK SETUP COMPLETE
==============================================================

BMAD:
  ✓ Version: 6.3.0 (updated from 6.2.0)
  ✓ Location: _bmad/

Prompts:
  ✓ .github/prompts/ — 30 prompt files
  ✓ .github/i2a-config.yml — preserved existing
  ✓ .vscode/ — copied
```
