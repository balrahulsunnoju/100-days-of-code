# Setup and Prerequisites

> **Roles:** Engineering Manager and Agentic Delivery Engineer | **Next:** [EM Guide](em-guide.md) or [ADE Guide](ade-guide.md)

This guide covers the one-time workspace setup shared by both EMs and ADEs.

## Steps at a Glance

| Step | EM | ADE | Description |
|------|:--:|:---:|-------------|
| [1. Create Workspace](#step-1-create-project-workspace) | Yes | Yes | Create project folder |
| [2. Clone Code Repos](#step-2-clone-code-repositories) | Yes | Yes | Clone all service/UI repos |
| [2b. Symlink Common Repos](#step-2b-symlink-common-repos-if-applicable) | Yes | Yes | Symlink shared services from central location |
| [3. Clone Apigee Proxy Repos](#step-3-clone-apigee-proxy-repositories-if-applicable) | Yes | Yes | Clone Apigee proxy repositories (if applicable) |
| [4. Clone Docs Repo](#step-4-clone-docs-repository-ade-only) | -- | Yes | Clone docs repo created by EM |
| [5. Add Starter Kit](#step-5-add-aidlc-starter-kit-to-workspace) | Yes | Yes | Clone or symlink tdgs-aidlc-starter-kit |
| [6. Open VS Code](#step-6-open-workspace-in-vs-code) | Yes | Yes | Open workspace folder |
| [7a. Run Setup (EM)](#step-7a-run-setup-workspace-command-em) | Yes | -- | `/tdgs-aidlc-setup-workspace em` |
| [7b. Run Setup (ADE)](#step-7b-run-setup-workspace-command-ade) | -- | Yes | `/tdgs-aidlc-setup-workspace ade` |
| [8. Install Hooks](#step-8-install-pre-commit-hooks-ade-only) | -- | Yes | Pre-commit + gitleaks hooks |
| [9. MCP Server Setup](#step-9-mcp-server-setup-optional) | Yes | Yes | GitHub MCP (auto), Splunk + DB MCP (optional) |
| [Update AIDLC Starter Kit](#update-aidlc-starter-kit-tdgs-aidlc-quick-setup) | Yes | Yes | `/tdgs-aidlc-quick-setup` (anytime) |

---

## Prerequisites

### Technical Prerequisites

Before starting, ensure you have:

| Requirement | How to Verify | Install Link |
|-------------|---------------|--------------|
| **Git** | `git --version` | [git-scm.com](https://git-scm.com/) |
| **Node.js** (v20+) | `node --version` | [nodejs.org](https://nodejs.org/) |
| **GitHub CLI** | `gh --version` | [cli.github.com](https://cli.github.com/) |
| **GitHub CLI Auth** | `gh auth status` | Run `gh auth login` |
| **VS Code** | - | [code.visualstudio.com](https://code.visualstudio.com/) |
| **GitHub Copilot Extension** | VS Code Extensions | Search "GitHub Copilot" |
| **Python** (3.10+) | `python3 --version` | [python.org](https://python.org/) |
| **uv** | `uv --version` | [docs.astral.sh/uv](https://docs.astral.sh/uv/) |

> ✅ **Automated Verification:** The `/tdgs-aidlc-setup-workspace` command automatically checks for Git, Node.js v20+, GitHub CLI, and authentication. Missing or outdated tools will be flagged with installation instructions.

> ℹ️ **Note:** The setup workflow uses `git init -b master` to initialize repositories with `master` as the default branch. This is a repo-local setting and does not require changing your global git configuration.

Additional requirements (ADE Only):
- [ ] Access to the service repositories
- [ ] Access to the docs repository (specifications)
- [ ] Access to Claude Opus 4.6 in the Agent Chat

### Documentation Prerequisites (EM Only)

> **ADE:** Skip this section and continue at [Step 1: Create Project Workspace](#step-1-create-project-workspace).

The following common context documents must be available before creating application-specific context documents:

**Approved Common / Shared Documents:**
   - Common Backend Services that are shared across TX applications
   - Shared Database components

> ⚠️ **REQUIRED:** Engineering Managers MUST ensure the above common context documents are available BEFORE creating application-specific context documents. If these documents do not yet exist, follow this guide and the steps below to generate the common context documents first.

---

## Workspace Setup Steps

> 🔔 **ONE-TIME SETUP PER APPLICATION**: The steps in this section only need to be completed **once per TX application**.
>
> - **Already set up for this application?** If you've completed Initial Setup for an application (e.g., OVRA) and are starting a new feature or hotfix for the *same* application, skip to your role-specific guide: [EM Guide](em-guide.md) or [ADE Guide](ade-guide.md).
> - **Starting a new TX application?** If you're beginning work on a *different* application (e.g., switching from OVRA to FeePay or TED/TDCJ), you'll need to complete these Initial Setup steps again for that new application workspace.

### Step 1: Create Project Workspace

> [Step 2 →](#step-2-clone-code-repositories)

Create a dedicated folder for your project. All repositories will live inside this folder.

**Windows:**
```powershell
mkdir c:\Development\projects\<project-name>
cd c:\Development\projects\<project-name>
```

**macOS / Linux:**
```bash
mkdir -p ~/Development/projects/<project-name>
cd ~/Development/projects/<project-name>
```

**Example:**

**Windows:**
```powershell
mkdir c:\Development\projects\tx-ovra
cd c:\Development\projects\tx-ovra
```

**macOS / Linux:**
```bash
mkdir -p ~/Development/projects/tx-ovra
cd ~/Development/projects/tx-ovra
```

---

### Step 2: Clone Code Repositories

> [← Step 1](#step-1-create-project-workspace) | [Step 3 →](#step-3-clone-apigee-proxy-repositories-if-applicable)

Clone all code repositories for your project into the workspace folder.

```bash
# Clone each code repository
# Replace <org> with your GitHub organization
# Replace repository names with your actual repos

git clone https://github.com/<org>/<project>-service-1.git
git clone https://github.com/<org>/<project>-service-2.git
git clone https://github.com/<org>/<project>-ui.git
# ... clone all relevant repos
```

**Example (TX-OVRA):**
```bash
git clone https://github.com/Texas-gov-Application-Services/tx-ovra-orderdetails-service.git
git clone https://github.com/Texas-gov-Application-Services/tx-ovra-verificationletter-service.git
git clone https://github.com/Texas-gov-Application-Services/tx-ovra-receipt-service.git
git clone https://github.com/Texas-gov-Application-Services/tx-ovra-ui.git
git clone https://github.com/Texas-gov-Application-Services/tx-ovra-database-test.git
```

**Your workspace should now look like:**
```
tx-ovra/
├── tx-ovra-orderdetails-service/
├── tx-ovra-verificationletter-service/
├── tx-ovra-receipt-service/
├── tx-ovra-database-test/
└── tx-ovra-ui/
```

> **Adding repos later?** If you need to add repositories after initial KB generation is complete, see [Adding Repositories to Workspace After KB Creation](#adding-repositories-to-workspace-after-kb-creation).

---

### Step 2b: Symlink Common Repos (If Applicable)

> [← Step 2](#step-2-clone-code-repositories) | [Step 3 →](#step-3-clone-apigee-proxy-repositories-if-applicable)

If your application uses **common/shared services** (services maintained centrally and used by multiple applications), symlink them into your workspace from a central location. This allows:

- **Single source of truth** — one clone, multiple workspaces
- **Direct KB generation** — Document Project scans common repos alongside app repos
- **Branch/commit/PR support** — common repos are full workers, not read-only references

#### One-Time Setup: Clone Common Repos to Central Location

If you haven't already, clone common repos to a shared location on your machine:

**Windows:**
```powershell
# Create central shared folder (one-time)
mkdir c:\Development\shared
cd c:\Development\shared

# Clone common repos
git clone https://github.com/Texas-gov-Application-Services/txgov-notificationengine-service.git notificationengine-service
git clone https://github.com/Texas-gov-Application-Services/txgov-pacs-service.git pacs-service
git clone https://github.com/Texas-gov-Application-Services/txgov-paymentintegration-service.git paymentintegration-service
git clone https://github.com/Texas-gov-Application-Services/txgov-tcas-service.git tcas-service
```

**macOS / Linux:**
```bash
# Create central shared folder (one-time)
mkdir -p ~/Development/shared
cd ~/Development/shared

# Clone common repos
git clone https://github.com/Texas-gov-Application-Services/txgov-notificationengine-service.git notificationengine-service
git clone https://github.com/Texas-gov-Application-Services/txgov-pacs-service.git pacs-service
git clone https://github.com/Texas-gov-Application-Services/txgov-paymentintegration-service.git paymentintegration-service
git clone https://github.com/Texas-gov-Application-Services/txgov-tcas-service.git tcas-service
```

#### Per Workspace: Create Symlinks

In your application workspace, create symlinks pointing to the central clones:

**Windows (PowerShell — requires Developer Mode or Admin):**
```powershell
cd c:\Development\projects\tx-ovra

# Create symlinks for common repos used by this app
New-Item -ItemType SymbolicLink -Path notificationengine-service -Target c:\Development\shared\notificationengine-service
New-Item -ItemType SymbolicLink -Path pacs-service -Target c:\Development\shared\pacs-service
New-Item -ItemType SymbolicLink -Path paymentintegration-service -Target c:\Development\shared\paymentintegration-service
New-Item -ItemType SymbolicLink -Path tcas-service -Target c:\Development\shared\tcas-service
```

**macOS / Linux:**
```bash
cd ~/Development/projects/tx-ovra

# Create symlinks for common repos
ln -s ~/Development/shared/notificationengine-service notificationengine-service
ln -s ~/Development/shared/pacs-service pacs-service
ln -s ~/Development/shared/paymentintegration-service paymentintegration-service
ln -s ~/Development/shared/tcas-service tcas-service
```

**Your workspace should now look like:**
```
tx-ovra/
├── tx-ovra-orderdetails-service/         ← Physical clone (app-specific)
├── tx-ovra-verificationletter-service/   ← Physical clone (app-specific)
├── tx-ovra-receipt-service/              ← Physical clone (app-specific)
├── tx-ovra-ui/                           ← Physical clone (app-specific)
├── notificationengine-service/           ← Symlink → c:\Development\shared\...
├── pacs-service/                         ← Symlink → c:\Development\shared\...
├── paymentintegration-service/           ← Symlink → c:\Development\shared\...
└── tcas-service/                         ← Symlink → c:\Development\shared\...
```

> **Auto-detection:** When you run `/tdgs-aidlc-setup-workspace`, symlinks are automatically detected and classified under `common_repos` in `.github/i2a-config.yml`. Their KB output goes to `knowledge-base/common-services/` instead of `knowledge-base/repos/`.

> **Updating common repos:** Pull updates in the central location — all workspaces see changes immediately:
> ```powershell
> cd c:\Development\shared
> Get-ChildItem -Directory | ForEach-Object { Push-Location $_.FullName; git pull; Pop-Location }
> ```

---

### Step 3: Clone Apigee Proxy Repositories (If Applicable)

> [← Step 2b](#step-2b-symlink-common-repos-if-applicable) | [Step 4 →](#step-4-clone-docs-repository-ade-only)

If your project uses Apigee API Gateway, you have two options depending on whether your Apigee proxies are version-controlled:

#### Option A: Git-Based Apigee Repos (Recommended)

If your Apigee proxies are stored in Git repositories, clone them into your workspace alongside the other code repositories:

**Example (TX-OVRA):**
```bash
git clone https://github.com/Texas-gov-Application-Services/tdgs-ovra-transaction-proxy.git
git clone https://github.com/Texas-gov-Application-Services/tdgs-ovra-onlinecertificate-proxy.git
git clone https://github.com/Texas-gov-Application-Services/tdgs-ovra-utility-proxy.git
```

**Your workspace should now look like:**
```
tx-ovra/
├── tx-ovra-orderdetails-service/
├── tx-ovra-verificationletter-service/
├── tx-ovra-receipt-service/
├── tx-ovra-database-test/
├── tx-ovra-ui/
├── tdgs-ovra-transaction-proxy/         ← Apigee proxy repos (Git-based)
├── tdgs-ovra-onlinecertificate-proxy/
└── tdgs-ovra-utility-proxy/
```

#### Option B: Manual Apigee Export (Legacy)

If your Apigee proxies are NOT version-controlled in Git, manually export them from the Apigee console and place them in an `apigee-exports/` folder:

1. Log in to Apigee console → **Develop** → **API Proxies**
2. For each proxy:
   - Click the proxy name → **Project** → **Download Revision**
   - Download the **currently deployed revision** (production)
3. Extract the downloaded ZIP files into `apigee-exports/{proxy-name}/`

**Your workspace should look like:**
```
tx-ovra/
├── tx-ovra-orderdetails-service/
├── tx-ovra-verificationletter-service/
├── apigee-exports/                      ← Manually exported Apigee proxies
│   ├── OVRA-REST-API-V1/
│   │   └── apiproxy/
│   ├── OvraTransaction/
│   │   └── apiproxy/
│   └── OvraUtils/
│       └── apiproxy/
└── ...
```

> **Migration note:** If you currently use `apigee-exports/` and your team migrates the proxies to Git, you can switch to Option A by cloning the new repos and removing the `apigee-exports/` folder. Also update `.github/i2a-config.yml` → `kb_generation.apigee` from `exports` to `git` (or leave as `auto` to re-detect).

---

### Step 4: Clone Docs Repository (ADE Only)

> [← Step 3](#step-3-clone-apigee-proxy-repositories-if-applicable) | [Step 5 →](#step-5-add-aidlc-starter-kit-to-workspace)

Clone the documentation repository that was set up by your Engineering Manager. This repo contains the knowledge base (including Apigee documentation if applicable), planning artifacts, and implementation artifacts.

**Windows:**
```powershell
cd c:\Development\projects\<project-name>
git clone https://github.com/<org>/<project>-docs.git
```

**macOS / Linux:**
```bash
cd ~/Development/projects/<project-name>
git clone https://github.com/<org>/<project>-docs.git
```

**Example:**

**Windows:**
```powershell
cd c:\Development\projects\tx-ovra
git clone https://github.com/Texas-gov-Application-Services/tx-ovra-docs.git
```

**macOS / Linux:**
```bash
cd ~/Development/projects/tx-ovra
git clone https://github.com/Texas-gov-Application-Services/tx-ovra-docs.git
```

**Your workspace should now look like:**
```
tx-ovra/
├── tx-ovra-docs/                     ← NEW (documentation repository)
│   ├── knowledge-base/
│   │   ├── apigee/                   ← Apigee API Gateway documentation (if applicable)
│   │   └── ...
│   ├── planning-artifacts/
│   └── implementation-artifacts/
├── tx-ovra-orderdetails-service/
├── tx-ovra-verificationletter-service/
├── tx-ovra-receipt-service/
├── tx-ovra-ui/
├── tdgs-ovra-transaction-proxy/      ← Apigee proxy repos (if applicable)
├── tdgs-ovra-onlinecertificate-proxy/
└── tdgs-ovra-utility-proxy/
```

> **Note:** The docs repository was created by your Engineering Manager during project setup. It contains the knowledge base documentation (including Apigee API Gateway documentation if applicable), and is where feature briefs and specs will be stored.

---

### Step 5: Add AIDLC Starter Kit to Workspace

> [← Step 4](#step-4-clone-docs-repository-ade-only) | [Step 6 →](#step-6-open-workspace-in-vs-code)

The AIDLC Starter Kit must appear as `tdgs-aidlc-starter-kit/` inside your workspace. Clone it (or symlink it) so the folder sits alongside your project repos:

```bash
# Option A (recommended): clone once, symlink into each workspace
git clone https://github.com/<org>/tdgs-aidlc-starter-kit.git ~/Development/tools/tdgs-aidlc-starter-kit
cd ~/Development/projects/<project-name>
ln -s ~/Development/tools/tdgs-aidlc-starter-kit tdgs-aidlc-starter-kit   # macOS/Linux

# Option B: clone directly into the workspace
cd ~/Development/projects/<project-name>
git clone https://github.com/<org>/tdgs-aidlc-starter-kit.git
```

| Option | Best For | Trade-off |
|--------|----------|-----------|
| **A — Symlink from central location (recommended)** | Multiple workspaces on one machine | Clone once, symlink everywhere; one `git pull` updates all workspaces |
| **B — Clone per workspace** | Simple, self-contained setup | Separate copy in every workspace; must `git pull` each one to update |

<details>
<summary><strong>Option A — Full platform-specific instructions (symlink)</strong></summary>

Clone the starter kit **once** to a shared location, then create a symbolic link in each workspace. This avoids duplicate copies and lets you update all workspaces with a single `git pull`.

**Prerequisites (Windows only):** Symbolic links on Windows require **Developer Mode** enabled (Settings → Privacy & Security → For developers → Developer Mode: On), **or** an **elevated (Administrator) command prompt / PowerShell**. macOS and Linux support symlinks out of the box.

**One-time: Clone to a central location**

| Platform | Command |
|----------|---------|
| Windows | `mkdir c:\Development\tools && cd c:\Development\tools && git clone https://github.com/<org>/tdgs-aidlc-starter-kit.git` |
| macOS / Linux | `mkdir -p ~/Development/tools && cd ~/Development/tools && git clone https://github.com/<org>/tdgs-aidlc-starter-kit.git` |

**Per workspace: Create a symlink**

| Platform | Command |
|----------|---------|
| Windows (PowerShell) | `New-Item -ItemType SymbolicLink -Path tdgs-aidlc-starter-kit -Target c:\Development\tools\tdgs-aidlc-starter-kit` |
| Windows (CMD) | `mklink /D tdgs-aidlc-starter-kit c:\Development\tools\tdgs-aidlc-starter-kit` |
| macOS / Linux | `ln -s ~/Development/tools/tdgs-aidlc-starter-kit tdgs-aidlc-starter-kit` |

**Updating all workspaces:** Pull in the central copy — every symlinked workspace sees the update immediately. Then run `/tdgs-aidlc-quick-setup` in each workspace.

</details>

<details>
<summary><strong>Option B — Full platform-specific instructions (clone per workspace)</strong></summary>

Clone the starter kit directly into this workspace. Simpler but requires a separate copy in every workspace.

| Platform | Command |
|----------|---------|
| Windows | `cd c:\Development\projects\<project-name> && git clone https://github.com/<org>/tdgs-aidlc-starter-kit.git` |
| macOS / Linux | `cd ~/Development/projects/<project-name> && git clone https://github.com/<org>/tdgs-aidlc-starter-kit.git` |

</details>

<details>
<summary><strong>Removing a symlink</strong></summary>

To remove a symlink without affecting the central copy:

| Platform | Command |
|----------|---------|
| Windows (PowerShell) | `Remove-Item c:\Development\projects\<project-name>\tdgs-aidlc-starter-kit` |
| Windows (CMD) | `rmdir c:\Development\projects\<project-name>\tdgs-aidlc-starter-kit` |
| macOS / Linux | `rm ~/Development/projects/<project-name>/tdgs-aidlc-starter-kit` |

> ⚠️ **Do not** use `rm -r` or `Remove-Item -Recurse` on a symlink — this can delete the contents of the target directory.

</details>

#### Expected workspace layout

Regardless of which option you chose, your workspace should now look like:
```
tx-ovra/
├── tdgs-aidlc-starter-kit/           ← NEW (cloned or symlinked — contains prompts)
│   └── src/
│       ├── prompts/
│       │   ├── tdgs-aidlc-setup-workspace.prompt.md
│       │   ├── tdgs-aidlc-commit.prompt.md
│       │   └── ...
│       └── i2a-config.yml
├── tx-ovra-docs/                     ← (ADE only — cloned in Step 4)
├── tx-ovra-orderdetails-service/     ← Physical clone (app-specific)
├── tx-ovra-verificationletter-service/
├── tx-ovra-receipt-service/
├── tx-ovra-database-test/
├── tx-ovra-ui/
├── notificationengine-service/       ← Symlink → central clone (common repo, Step 2b)
├── pacs-service/                     ← Symlink → central clone (common repo)
├── paymentintegration-service/       ← Symlink → central clone (common repo)
├── tcas-service/                     ← Symlink → central clone (common repo)
├── tdgs-ovra-transaction-proxy/      ← Apigee proxy repos (if applicable)
├── tdgs-ovra-onlinecertificate-proxy/
└── tdgs-ovra-utility-proxy/
```

---

### Step 6: Open Workspace in VS Code

> [← Step 5](#step-5-add-aidlc-starter-kit-to-workspace) | [Step 7a →](#step-7a-run-setup-workspace-command-em) or [Step 7b →](#step-7b-run-setup-workspace-command-ade)

Open the project workspace in VS Code:

**Windows:**
```powershell
code c:\Development\projects\<project-name>
```

**macOS / Linux:**
```bash
code ~/Development/projects/<project-name>
```

Or manually:
1. Open VS Code
2. File → Open Folder
3. Navigate to your project workspace folder
4. Click "Select Folder"

---

### Step 7a: Run Setup Workspace Command (EM)

> [← Step 6](#step-6-open-workspace-in-vs-code) | [Step 8 →](#step-8-install-pre-commit-hooks-ade-only)

> **ADE?** Skip to [Step 7b](#step-7b-run-setup-workspace-command-ade) below.

Open Copilot Chat (`Ctrl+Shift+I`), ensure you're in "Agent" mode, then run:

Type the following in Copilot Chat:

```
/tdgs-aidlc-setup-workspace em
```

The `em` parameter indicates you are an Engineering Manager and need the full setup including Git repository creation.

#### What Happens

The agent will guide you through:

1. **BMAD Installation** - Runs the non-interactive installer using the version specified in `tdgs-aidlc-starter-kit/src/i2a-config.yml` (`versions.bmad`)
2. **Prompts Copy** - Copies `prompts/` folder and `i2a-config.yml` to `.github/` folder, and `.vscode/` folder (including `mcp.json` for MCP GitHub Actions) to workspace root
3. **Organization Detection** - Automatically detected from your cloned repos
4. **Project Detection** - Automatically detected from folder names
5. **Docs Folder Creation** - Creates `<project>-docs` folder
6. **Configuration** - Updates BMAD configuration (`_bmad/bmm/config.yaml`)
7. **Issues Repository** - Prompts you to enter where GitHub Issues are tracked (required, may be different from docs repo)
8. **Worker Repos Detection** - Automatically detects code repos in workspace and populates `i2a-config.yml`
9. **Common Repos Classification** - Detects symlinked repos and classifies them as common/shared repos under `common_repos` in `i2a-config.yml`
10. **Docs Repository Confirmation** - Prompts you to confirm the docs repository name before creating
11. **Git Setup** - Creates remote docs repo, initializes git, creates master branch (default), creates feature branch from master, and commits initial structure

#### Interactive Prompts

During setup, you'll be prompted for the following:

**Issues Repository:**
```
══════════════════════════════════════════════════════════════
CONFIGURE ISSUES REPOSITORY (REQUIRED)
══════════════════════════════════════════════════════════════

Where are GitHub Issues for this project located?

NOTE: This is the repository where GitHub Issues are tracked.
      This may be different from the docs repository that will
      be created for documentation content.

Format: owner/repo
Example: Texas-gov-Application-Services/tx-ovra-issues

Enter issues repository: 
```

> ⚠️ **REQUIRED:** You must provide a value. This field is required and the setup will stop if left empty.

**Repository Detection and Classification:**
```
══════════════════════════════════════════════════════════════
DETECTED REPOSITORIES
══════════════════════════════════════════════════════════════

The following repositories were found in the workspace:

  Key                          Repository
  ───────────────────────────  ──────────────────────────────────────────────────
  orderdetails-service         Texas-gov-Application-Services/tx-ovra-orderdetails-service
  receipt-service              Texas-gov-Application-Services/tx-ovra-receipt-service
  ui                           Texas-gov-Application-Services/tx-ovra-ui
  amountdistribution-service   Texas-gov-Application-Services/common-amountdistribution-service
  notificationengine-service   Texas-gov-Application-Services/common-notificationengine-service

Which repositories are common/shared (used by multiple applications)?
Enter keys separated by commas, or 'none':

> amountdistribution-service, notificationengine-service

  worker_repos (app-specific):
    ✓ orderdetails-service
    ✓ receipt-service
    ✓ ui

  common_repos (shared):
    ✓ amountdistribution-service
    ✓ notificationengine-service

Continue? [Y/n]:
```

> **Detection Hint:** Symlinked repositories (pointing to `~/Development/shared/`) are pre-classified as common repos. Physical clones are defaulted as worker repos. Repos matching patterns like `common-*` or `shared-*` are suggested for classification.

Review the classification and confirm to proceed.

**Docs Repository Confirmation:**
```
══════════════════════════════════════════════════════════════
CONFIRM DOCS REPOSITORY (REQUIRED)
══════════════════════════════════════════════════════════════

A new GitHub repository will be created for documentation content.

  Local folder:    tx-ovra-docs
  Suggested repo:  Texas-gov-Application-Services/tx-ovra-docs

NOTE: This is where BMAD artifacts, planning docs, and knowledge
      base content will be stored. This is separate from the
      issues repository (Texas-gov-Application-Services/tx-ovra-issues).

Create repository: Texas-gov-Application-Services/tx-ovra-docs? [Y/n]
Or enter a different name (format: owner/repo): 
```

Confirm the suggested name or provide a different repository name.

#### Expected Output (EM)

When complete, you should see:

```
=== Setup Complete ===

📁 BMAD Installation:
   _bmad/
   └── bmm/config.yaml (BMAD paths configured)

📁 GitHub Copilot Config: .github/
   ├── prompts/ (GitHub Copilot prompts)
   ├── agents/ (BMAD agent definitions)
   └── i2a-config.yml (project configuration)

📁 VS Code Settings: .vscode/
   ├── mcp.json (MCP GitHub Actions configuration)
   └── (workspace settings)

📁 Docs Folder: tx-ovra-docs/
   ├── planning-artifacts/
   ├── implementation-artifacts/
   └── knowledge-base/

Configuration:
  ✓ issues.repository: Texas-gov-Application-Services/tx-ovra-issues (for issue tracking)
  ✓ docs.repository: Texas-gov-Application-Services/tx-ovra-docs (for documentation content)
  ✓ worker_repos: 4 repositories configured
  ✓ common_repos: 4 shared repos classified

Git Repository:
  ✓ Remote: https://github.com/Texas-gov-Application-Services/tx-ovra-docs.git
  ✓ Default branch: master (created and pushed)
  ✓ Integration branch: feature/initial-docs-setup (PR target, from master)
  ✓ Dev branch: dev/initial-docs-setup (working branch)
  ✓ Commit #1: docs(setup): initialize documentation structure

🎉 Next Step:
Continue to the [EM Guide](em-guide.md) to generate knowledge base documentation.
The PR will be created after all documentation is complete.
```

> **Note:** The issues repository and docs repository can be different:
> - **Issues repo:** Where GitHub Issues are tracked for the project
> - **Docs repo:** Where documentation content (BMAD artifacts, knowledge base) is stored

---

### Step 7b: Run Setup Workspace Command (ADE)

> [← Step 6](#step-6-open-workspace-in-vs-code) | [Step 8 →](#step-8-install-pre-commit-hooks-ade-only)

> **EM?** See [Step 7a](#step-7a-run-setup-workspace-command-em) above.

Open Copilot Chat (`Ctrl+Shift+I`), ensure you're in "Agent" mode, then run:

```
/tdgs-aidlc-setup-workspace ade
```

The `ade` parameter indicates you are an Agentic Delivery Engineer and only need local configuration (Git operations are skipped).

#### What Happens

The agent will guide you through:

1. **BMAD Installation** - Runs the non-interactive installer using the version specified in `tdgs-aidlc-starter-kit/src/i2a-config.yml` (`versions.bmad`)
2. **Prompts Copy** - Copies `prompts/` folder and `i2a-config.yml` to `.github/` folder, and `.vscode/` folder (including `mcp.json` for MCP GitHub Actions) to workspace root
3. **Organization Detection** - Automatically detected from your cloned repos
4. **Project Detection** - Automatically detected from folder names
5. **Docs Folder Detection** - Detects existing `<project>-docs` folder created by Engineering Manager
6. **Configuration** - Updates BMAD configuration (`_bmad/bmm/config.yaml`)
7. **Issues Repository** - Prompts you to confirm where GitHub Issues are tracked
8. **Worker Repos Detection** - Automatically detects code repos in workspace and populates `i2a-config.yml`
9. **Common Repos Classification** - Detects symlinked repos and classifies them as common/shared repos under `common_repos` in `i2a-config.yml`

> **Note:** Docs repository creation (Git init, initial commit, push to GitHub) is skipped in developer mode. Your Engineering Manager has already created the remote docs repository. You will still use `/tdgs-aidlc-commit` and `/tdgs-aidlc-create-pull-request` for your code changes during the normal workflow.

#### Expected Output (ADE)

When complete, you should see:

```
=== Setup Complete (Agentic Delivery Engineer) ===

📁 BMAD Installation:
   _bmad/
   └── bmm/config.yaml (BMAD paths configured)

📁 GitHub Copilot Config: .github/
   ├── prompts/ (GitHub Copilot prompts)
   ├── agents/ (BMAD agent definitions)
   └── i2a-config.yml (project configuration)

📁 VS Code Settings: .vscode/
   ├── mcp.json (MCP GitHub Actions configuration)
   └── (workspace settings)

📁 Docs Folder: {project-name}-docs/
   ├── planning-artifacts/
   ├── implementation-artifacts/
   └── knowledge-base/

Configuration:
  ✓ Issues repo: {issues_repository}
  ✓ Worker repos: {count} repositories configured
  ✓ Common repos: {count} shared repos classified

⚠️ Git Setup Skipped (Agentic Delivery Engineer Mode)
   Using existing docs folder created by Engineering Manager.
   BMAD configuration has been set up locally.
   Git operations were not performed - use your existing repository setup.

🎉 You're ready to start development!

Next Steps:
   1. Run: /tdgs-aidlc-install-hooks (one-time setup for pre-commit hooks)
   2. Get Pre-Work from EM: Issue ID and issue type (feature/hotfix/project)
   3. For feature/hotfix: Run /tdgs-aidlc-initiate-issue {issue_id} {type}
      For project: EM completes planning and provides story specs (see Project Implementation guide)
   4. Follow the workflow in the ADE Guide.
```

> 💡 **Tip**: Review the [ADE Guide](ade-guide.md) workflow overview to understand the complete development flow before starting your first feature.

> **Lost?** Type `/tdgs-aidlc-help` in Agent Chat at any time to see all available commands, get role-specific guidance, and find what to do next.

#### Verify It Works

Run `/tdgs-aidlc-help` in Agent Chat now. You should see a categorized list of available commands. This confirms prompts, skills, and config are correctly installed.

---

### Step 8: Install Pre-Commit Hooks (ADE Only)

> [← Step 7a](#step-7a-run-setup-workspace-command-em) or [Step 7b](#step-7b-run-setup-workspace-command-ade) | [Step 9 →](#step-9-mcp-server-setup-optional)

Install the pre-commit framework and gitleaks tool, then activate git hooks for automatic secret scanning and code quality checks on every commit. This is a **one-time setup** per repository.

#### Prerequisites
- Git repository initialized
- One of the following installed:
  - **macOS**: Homebrew or Python/pip
  - **Windows**: Python/pip, Chocolatey, or winget
  - **Linux**: Python/pip or Homebrew

#### Command
```
/tdgs-aidlc-install-hooks
```

#### What Happens

| Step | Action | Command |
|------|--------|---------|
| 1 | Detect operating system | System check |
| 2 | Install pre-commit framework | `brew install pre-commit` or `pip install pre-commit` |
| 3 | Install gitleaks | `brew install gitleaks` (macOS) or platform-specific |
| 4 | Activate hooks in repository | `pre-commit install` |
| 5 | Verify installation | `pre-commit run --all-files` |

#### Platform-Specific Installation

| OS | pre-commit | gitleaks |
|----|------------|----------|
| **macOS** | `brew install pre-commit` | `brew install gitleaks` |
| **Windows (pip)** | `pip install pre-commit` | `choco install gitleaks -y` or `winget install gitleaks` |
| **Linux** | `pip3 install pre-commit` | Download binary via curl |

#### Post-Installation

After installation, hooks run automatically on every `git commit`:

| Command | Description |
|---------|-------------|
| `pre-commit run --all-files` | Run all hooks manually on entire codebase |
| `git commit --no-verify` | Skip hooks for a single commit (use sparingly) |

#### Expected Outcome

- ✅ `pre-commit` installed and available in PATH
- ✅ `gitleaks` installed for secret detection
- ✅ Git hooks activated in repository
- ✅ Hooks run automatically on every commit

#### When to Run

- **First time** setting up a repository
- **After cloning** a new repository that uses pre-commit
- **Periodically** to update pre-commit and gitleaks versions

---

## Update AIDLC Starter Kit (`/tdgs-aidlc-quick-setup`)

After initial setup is complete, use `/tdgs-aidlc-quick-setup` to update BMAD and AIDLC prompts without re-running the full `/tdgs-aidlc-setup-workspace` workflow.

**When to use:**
- After pulling a new version of `tdgs-aidlc-starter-kit` to pick up BMAD or prompt updates
- When notifying your ADEs of an upgrade — they can run this command to stay in sync
- To re-sync prompts without affecting existing workspace configuration (`i2a-config.yml`, Git settings, docs repo)

> **Note:** This command does NOT modify your `i2a-config.yml` settings, Git configuration, or docs repository. It only updates BMAD and copies the latest prompts.

**Command:**
```
/tdgs-aidlc-quick-setup
```

No parameters required. This command:

| Step | Action |
|------|--------|
| 1 | Checks prerequisites (Node.js, Python, uv) |
| 2 | Installs or upgrades BMAD to the version specified in the starter kit |
| 3 | Copies latest AIDLC prompts to `.github/prompts/` |
| 4 | Copies latest VS Code settings (including `mcp.json`) |
| 5 | Copies `i2a-config.yml` template (preserves your existing config if present) |

**Expected Output:**
```
✔ Prerequisites verified (Node.js, Python, uv)
✔ BMAD installed/upgraded to version {version}
✔ Prompts copied to .github/prompts/
✔ VS Code settings updated

Quick setup complete. Your workspace is up to date.
```

> **Tip:** After running `/tdgs-aidlc-quick-setup`, instruct your ADEs to pull the latest `tdgs-aidlc-starter-kit` and run the same command to pick up the updates.

---

## Adding Repositories to Workspace After KB Creation

> **When:** A repository was missed during initial setup, a new service was created mid-project, or the workspace needs to expand to cover additional repos.

After the initial knowledge base generation is complete, all changes to the docs repo must go through a **branch + PR flow** — you cannot push directly to master.

### Steps

1. **Clone** the new repo(s) into the workspace folder:
   ```bash
   cd ~/Development/projects/<project-name>
   git clone https://github.com/<org>/<new-repo-name>.git
   ```

2. **Create a branch** in the docs repo:
   - **M&O workflow**: Create a feature branch from master:
     ```bash
     cd <docs-repo>
     git fetch origin
     git checkout master && git pull
     git checkout -b feature/ghi-{id}-add-{repo-slug}
     ```
   - **Project workflow**: Use the existing `planning/*` branch (or create from `project/*` if it doesn't exist):
     ```bash
     cd <docs-repo>
     git checkout planning/ghi-{id}-{slug}
     git pull origin planning/ghi-{id}-{slug}
     # If planning branch doesn't exist yet:
     # git checkout project/ghi-{id}-{slug}
     # git checkout -b planning/ghi-{id}-{slug}
     ```

3. **Update `.github/i2a-config.yml`** — add entries under `worker_repos` (or `common_repos` if the repo is shared across applications):
   ```yaml
   worker_repos:
     existing-service: "Texas-gov-Application-Services/txgov-tabc-existing-service"
     new-service: "Texas-gov-Application-Services/txgov-tabc-new-service"   # added
   ```

4. **Generate KB for the new repos** — see [Adding KB for New Repositories (Incremental)](knowledge-base-generation.md#adding-kb-for-new-repositories-incremental)

5. **Optionally re-run** `/bmad-generate-project-context` if the new repo introduces a different tech stack (e.g., adding a Drupal repo to a Java workspace)

6. **Commit + PR**:
   ```
   /tdgs-aidlc-commit
   /tdgs-aidlc-create-pull-request
   ```
   - **M&O**: PR targets master
   - **Project**: PR targets `project/*`

7. **After PR merges** — new repos are available to ADEs and all AIDLC tooling (`prepare-repos`, KB sync, `show-available-stories`)

---

## Optional Tools & MCP Extensions

Your workspace's MCP (Model Context Protocol) configuration lives in `.vscode/mcp.json`. This file controls which MCP servers Copilot Chat can access. The setup command pre-configures one default server:

| Server | Purpose | Setup Required |
|--------|---------|----------------|
| `github-mcp` | GitHub Issues, PRs, and Actions integration | None — authenticated via Copilot session |

Additional optional MCP servers can be configured as needed:

| Server | Purpose | Setup Required |
|--------|---------|----------------|
| `splunk-mcp-server` | Log search and monitoring | Replace `<SPLUNK_MCP_ENCRYPTED_TOKEN>` with team token |

### Splunk MCP Token Setup (Optional)

The Splunk MCP server can be configured in `.vscode/mcp.json` but requires a valid encrypted token:

1. Open `.vscode/mcp.json` in your workspace
2. Locate the `splunk-mcp-server` entry
3. Replace `<SPLUNK_MCP_ENCRYPTED_TOKEN>` with the token provided by the TX Platform Engineering team
4. Save and reload VS Code: `Cmd+Shift+P` → **Developer: Reload Window**

> ⚠️ **Contact** the TX Platform Engineering team to obtain your Splunk MCP token. Do not share or commit the token to source control.

You can extend Copilot Chat with additional MCP servers for any tool that provides an MCP interface — databases, monitoring systems, internal APIs, etc.

**How to add an optional MCP server:**

1. Open `.vscode/mcp.json` in your workspace root
2. Add or uncomment the server entry for your tool
3. Reload VS Code: `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows) → **Developer: Reload Window**

The `mcp.json` template ships with commented-out entries for the four supported database servers. These are safe to leave commented out — they cause no errors on workspaces that don't need database access.

```jsonc
// Example from .vscode/mcp.json — uncomment only after completing Step 9 setup
// "mysql-mcp": {
//   "type": "stdio",
//   "command": "/bin/zsh",
//   "args": ["${userHome}/.dbtools/mysql-mcp.sh", "<MYSQL_CONNECTION_NAME>"]
// }
```

> ⚠️ **Important:** Do not uncomment database entries until you have completed the full credential and wrapper-script setup in [Step 9](#step-9-mcp-server-setup-optional). Uncommenting without completing setup will cause MCP server startup errors.

> ⚠️ **For EMs:** You do not need to configure database MCP servers yourself. Direct ADEs to [mcp-setup-guide.md](mcp-setup-guide.md) when they are assigned database-related issues.

---

## Step 9: MCP Server Setup (Optional)

> [← Step 8](#step-8-install-pre-commit-hooks-ade-only)

> ℹ️ **Who should complete this:** GitHub MCP is pre-configured for everyone. Splunk MCP requires a team token (EM or ADE) and is optional. Database MCP is for ADEs working on database-related issues; EMs may also configure it for issue triage.

This step covers optional MCP server configuration beyond the defaults. All MCP configuration lives in `.vscode/mcp.json` in your workspace.

For full setup instructions for all MCP servers (GitHub, Splunk, Oracle, MySQL, PostgreSQL, MongoDB), see the **[MCP Setup Guide](mcp-setup-guide.md)**.

For database MCP specifically, the guide covers:
- Oracle (SQLcl native MCP)
- MySQL (`@sajithrw/mcp-mysql`)
- PostgreSQL (`@modelcontextprotocol/server-postgres`)
- MongoDB (`mongodb-mcp-server`)

**What you'll get with database MCP:**
- Direct database interaction from Copilot Chat (schema inspection, queries, data validation)
- Secure credential storage via macOS Keychain (no plaintext passwords)
- Wrapper scripts that retrieve credentials at runtime
