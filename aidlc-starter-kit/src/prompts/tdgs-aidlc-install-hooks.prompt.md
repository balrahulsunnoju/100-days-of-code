---
mode: agent
description: "Install Gitleaks and conventional-commit pre-commit hooks across all worker repositories."
---

# Install Pre-commit Hooks

Install pre-commit and gitleaks tools, then activate git hooks for secret scanning and code quality checks in all **worker repositories** defined in `.github/i2a-config.yml`.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories (from `worker_repos` config) first, then run git and hook commands within those directories.

## Prerequisites

This prompt will **automatically detect the OS** and install any missing dependencies. No manual setup required.

> **Windows users:** The install script uses bash syntax (`uname`, `case`, `chmod`). On Windows, run this prompt from **Git Bash** or **WSL** — not from native PowerShell or cmd. Git for Windows includes Git Bash by default. The script detects Windows via `MINGW`/`MSYS`/`CYGWIN` and uses `choco` or `winget` for package installation.

## Configuration Source

Read the `worker_repos` and `common_repos` sections from `.github/i2a-config.yml` to determine which repositories need hooks installed. Merge both into a single list — all repos get hooks regardless of classification. Each entry follows the format:

```yaml
worker_repos:
  <service-key>: "<github-org>/<repo-name>"

common_repos:
  <service-key>: "<github-org>/<repo-name>"
```

Extract the `<repo-name>` from each entry to locate the local clone.

## Installation Steps

### 1. Detect Operating System and Package Manager

Determine the current OS and available package manager:

**Detection logic:**
```bash
# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin)  OS_TYPE="macos" ;;
  Linux)   OS_TYPE="linux" ;;
  MINGW*|MSYS*|CYGWIN*) OS_TYPE="windows" ;;
  *)       echo "❌ Unsupported OS: $OS"; exit 1 ;;
esac

# Detect package manager
if command -v brew &>/dev/null; then
  PKG_MGR="brew"
elif command -v pip3 &>/dev/null; then
  PKG_MGR="pip3"
elif command -v pip &>/dev/null; then
  PKG_MGR="pip"
elif command -v choco &>/dev/null; then
  PKG_MGR="choco"
elif command -v winget &>/dev/null; then
  PKG_MGR="winget"
else
  echo "❌ No supported package manager found. Install Homebrew, pip, Chocolatey, or winget first."
  exit 1
fi
```

Print detected OS and package manager before proceeding.

### 2. Check and install pre-commit

**Only install if not already present.** Check first:

```bash
if command -v pre-commit &>/dev/null; then
  echo "✅ pre-commit already installed: $(pre-commit --version)"
else
  echo "📦 Installing pre-commit..."
  case "$PKG_MGR" in
    brew)   brew install pre-commit ;;
    pip3)   pip3 install pre-commit ;;
    pip)    pip install pre-commit ;;
    choco)  choco install pre-commit -y ;;
    *)      echo "❌ Cannot install pre-commit with $PKG_MGR"; exit 1 ;;
  esac
fi
```

**Verify it worked:**
```bash
if ! command -v pre-commit &>/dev/null; then
  echo "❌ pre-commit installation failed. Please install manually."
  echo "   macOS:   brew install pre-commit"
  echo "   pip:     pip3 install pre-commit"
  exit 1
fi
```

### 3. Check and install gitleaks

**Only install if not already present.** Check first:

```bash
if command -v gitleaks &>/dev/null; then
  echo "✅ gitleaks already installed: $(gitleaks version 2>&1 | head -1)"
else
  echo "📦 Installing gitleaks..."
  case "$PKG_MGR" in
    brew)
      brew install gitleaks
      ;;
    choco)
      choco install gitleaks -y
      ;;
    winget)
      winget install gitleaks
      ;;
    *)
      # Fallback: download binary for Linux/macOS
      echo "📦 Downloading gitleaks binary..."
      GITLEAKS_VERSION="8.22.1"
      GITLEAKS_OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
      GITLEAKS_ARCH="$(uname -m)"
      case "$GITLEAKS_ARCH" in
        x86_64) GITLEAKS_ARCH="x64" ;;
        aarch64|arm64) GITLEAKS_ARCH="arm64" ;;
      esac
      curl -sL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_${GITLEAKS_OS}_${GITLEAKS_ARCH}.tar.gz" -o /tmp/gitleaks.tar.gz \
        && tar -xzf /tmp/gitleaks.tar.gz -C /tmp \
        && sudo mv /tmp/gitleaks /usr/local/bin/gitleaks \
        && sudo chmod +x /usr/local/bin/gitleaks \
        && rm -f /tmp/gitleaks.tar.gz
      ;;
  esac
fi
```

**Verify it worked:**
```bash
if ! command -v gitleaks &>/dev/null; then
  echo "❌ gitleaks installation failed. Please install manually."
  echo "   macOS:   brew install gitleaks"
  echo "   Linux:   Download from https://github.com/gitleaks/gitleaks/releases"
  exit 1
fi
```

### 4. Parse worker repos from config

Read `.github/i2a-config.yml` and extract the repo names from `worker_repos` and `common_repos` (merge both sections). The local clones are expected to be **sibling directories** of this docs repo (i.e., at the same parent folder level).

For example, if this docs repo is at:
```
/path/to/projects/tx-ovra
```

Then worker repos are expected at:
```
/path/to/projects/tx-ovra-orderdetails-service
/path/to/projects/tx-ovra-receipt-service
/path/to/projects/tx-ovra-verificationletter-service
/path/to/projects/tx-ovra-ui
/path/to/projects/tx-ovra-database-test
```

### 5. Install hooks in each worker repo

For **each** worker repo found locally:

1. Verify the directory exists and is a git repository.
2. Verify a `.pre-commit-config.yaml` file exists at the repo root.
3. Run `pre-commit install` to activate the hooks.
4. Report the result (success, skipped, or failed).

```bash
cd /path/to/worker-repo
pre-commit install
```

**Skip** any repo that:
- Is not cloned locally
- Is not a git repository
- Does not have a `.pre-commit-config.yaml`

### 6. Verify installation (optional)

Run all hooks in a worker repo to validate the setup:

```bash
cd /path/to/worker-repo
pre-commit run --all-files
```

### 7. Print summary

After processing all worker repos, display a summary:

```
============================================
 Environment
============================================
  OS:              macOS / linux / windows
  Package Manager: brew / pip3 / choco / winget
  pre-commit:      ✅ installed (x.x.x)
  gitleaks:        ✅ installed (x.x.x)

============================================
 Worker Repos
============================================
  ✅ Installed:  <count>
     - repo-name-1
     - repo-name-2
  ⚠️  Skipped:   <count>
     - repo-name-3 (no .pre-commit-config.yaml)
  ❌ Failed:     <count>
     - repo-name-4 (error message)
```

## Expected Outcome

- OS and package manager are **auto-detected**
- `pre-commit` and `gitleaks` are **installed if missing** (skipped if already present)
- Git hooks are activated in **all worker repositories** listed in `i2a-config.yml`
- Hooks will run automatically on every `git commit` inside each worker repo
- Developers are protected from accidentally committing secrets
- Clear **error messages** if any tool fails to install

## Troubleshooting

If installation fails:

| Issue | Fix |
|---|---|
| `brew` not found on macOS | Install Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| `pip3` not found | Install Python 3: `brew install python3` (macOS) or `sudo apt install python3-pip` (Linux) |
| Permission denied on Linux binary install | Run with `sudo` or install to `~/.local/bin` instead |
| `pre-commit install` fails | Ensure you're in a git repo root with a `.pre-commit-config.yaml` |
| Hooks not triggering on commit | Run `pre-commit install` again; check `.git/hooks/pre-commit` exists |

## Manual Commands

- **Run hooks manually**: `cd <worker-repo> && pre-commit run --all-files`
- **Skip hooks (not recommended)**: `git commit --no-verify`
- **Update hooks**: `cd <worker-repo> && pre-commit autoupdate`
- **Reinstall hooks**: `cd <worker-repo> && pre-commit install --overwrite`
