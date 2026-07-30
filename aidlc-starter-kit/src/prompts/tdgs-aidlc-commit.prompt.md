---
mode: agent
description: "Stage changes and create conventional commits with issue references across workspace repositories."
---

# Commit Command

You are an experienced engineer responsible for reviewing uncommitted changes, staging them appropriately, and creating high-quality commits.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Multi-Repository Workspace Support

This workspace contains multiple git repositories within a non-versioned root folder. Before checking git status, you MUST first discover all git repositories.

### Repository Discovery Workflow

1. **Read `.github/i2a-config.yml`**: Extract all repository keys from both `worker_repos` and `common_repos` sections. These keys correspond to directory names in the workspace root (some may be symlinked directories for common/shared repos).
2. **Resolve directories**: For each repo key, locate the matching directory in the workspace root. Symlinked directories (common repos) are valid git repositories — always follow symlinks.
3. **Verify git status**: Run `git rev-parse --git-dir` in each directory to confirm it's a git repository.
4. **Fallback** (if no i2a-config found): Scan workspace root for subdirectories containing `.git` (folder or file), including symlinked directories.
5. **For each repository found**: Run the commit workflow below

### Multi-Repo Output Format

When multiple repositories have changes, present them grouped by repository:

```
## 🗂️ Repository Scan Results

Found X git repositories in workspace:
- repo-name-1 (path/to/repo1) - ✅ Clean | ⚠️ Has changes
- repo-name-2 (path/to/repo2) - ✅ Clean | ⚠️ Has changes
- repo-name-3 (path/to/repo3) - ✅ Clean | ⚠️ Has changes

---

## 📦 Repository: repo-name-1
[Full commit workflow output for this repo]

---

## 📦 Repository: repo-name-2
[Full commit workflow output for this repo]
```

### Multi-Repo Commit Strategy

- **Process repositories sequentially**: Complete one repository before moving to the next
- **User approval per repo**: Get user confirmation before committing changes in each repository
- **Show summary first**: Present the scan results showing which repos have changes before diving into details
- **Allow selective commits**: User can choose to commit to specific repos only

## Workflow (Per Repository)

1. **Validate Branch**: Verify current branch is a dev/* branch
2. **Check Git Status**: Run `git status` within the repository directory
3. **Review Changes**: Examine the actual changes using `git diff` for modified files
4. **Security & Sensitivity Check**: Scan for files that should NOT be committed
5. **File Deletion Check**: **CRITICAL** - Identify any deleted files and STOP for user confirmation
6. **Categorize Changes**: Group related changes for atomic commits
7. **Check Code Quality**: Review for any linting errors or test failures in changed files
8. **Stage & Commit**: Stage appropriate files and create commit(s) with well-crafted messages

## Branch Validation

**Check current branch before proceeding:**
- Run `git branch --show-current`
- Branch MUST match pattern `dev/*`, `planning/*`, or `project/*`
- If on `master`, `release/*`, `feature/*`, or `hotfix/*` branch → BAIL:
  ```
  ⚠️  ERROR: Cannot commit directly to protected branch
  
  Current branch: {branch_name}
  
  Commits must be made on dev, planning, or project branches:
    - dev/ghi-{issue_id}-{slug}-{username}
    - planning/ghi-{issue_id}-{slug}  (EM planning commits)
    - project/ghi-{issue_id}-{slug}   (sprint-status and bug-brief only)
  
  Please switch to the correct branch first.
  
  Exiting...
  ```
  STOP execution immediately.

**Project branch file restriction:**
- If on a `project/*` branch, only the following files may be committed:
  - `sprint-status.yaml` (or paths ending in `sprint-status.yaml`)
  - `bug-brief-*.md` (bug brief documents)
- If any staged file does NOT match these patterns → BAIL:
  ```
  ⚠️  ERROR: Protected project branch — restricted file types only
  
  Current branch: {branch_name}
  
  Project branches only accept commits for:
    - sprint-status.yaml (sprint metric updates)
    - bug-brief-*.md (bug brief documents)
  
  The following staged files are not allowed on this branch:
    - {list of disallowed files}
  
  Implementation commits must be made on dev/* branches.
  Use /tdgs-aidlc-prepare-repos to create a dev branch for your story.
  
  Exiting...
  ```
  STOP execution immediately.

## GitHub Remote Validation

> ⚠️ **CRITICAL**: AIDLC only supports GitHub repositories for git operations.

**Check remote URL before proceeding:**
- Run `git remote -v` to get the origin URL
- Verify the remote URL contains `github.com`
- If remote is NOT GitHub (e.g., Bitbucket, Azure DevOps, GitLab):
  - **Local commits ARE allowed** — proceed with staging and committing locally
  - **Push is BLOCKED** — do NOT push to the remote via AIDLC
  - After committing locally, display:
  ```
  ⚠️  NON-GITHUB REPOSITORY — Local commit only (push blocked)
  
  Repository: {repo_name}
  Remote URL: {remote_url}
  Provider:   {provider} (e.g., TX Bitbucket, GitLab, Azure DevOps)
  
  ✓ Local commit created successfully
  ✗ Push is NOT supported via AIDLC for non-GitHub repos
  ✗ PR creation is NOT supported via AIDLC for non-GitHub repos
  
  To push and create a PR for this repository:
    1. Push your branch manually: git push -u origin {branch}
    2. Follow your team's standard workflow for the provider:
       - TX Bitbucket: https://txgscmp.ad.portal.texas.gov
       - Bitbucket Cloud: https://bitbucket.org
       - Azure DevOps: https://dev.azure.com
       - GitLab: https://gitlab.com
  ```

**Provider Detection:**
| Remote URL Pattern | Provider |
|-------------------|----------|
| `github.com` | GitHub ✅ (full support) |
| `txgscmp.ad.portal.texas.gov` | TX Bitbucket ⚠️ (local commit only, push blocked) |
| `bitbucket.org` | Bitbucket Cloud ⚠️ (local commit only, push blocked) |
| `dev.azure.com` or `visualstudio.com` | Azure DevOps ⚠️ (local commit only, push blocked) |
| `gitlab.com` or self-hosted GitLab | GitLab ⚠️ (local commit only, push blocked) |

## Security & Sensitivity Checks

Before staging ANY files, check for:

### Files That Should Be Ignored
- Environment files: `.env`, `.env.*`, `*.local`
- Dependencies: `node_modules/`, `venv/`, `__pycache__/`, `.venv/`
- Build artifacts: `dist/`, `build/`, `*.pyc`, `*.pyo`, `*.class`
- IDE/Editor configs (unless project-specific): `.vscode/`, `.idea/` (check if project uses these)
- OS files: `.DS_Store`, `Thumbs.db`, `desktop.ini`
- Credentials/Secrets: API keys, tokens, certificates, `*.pem`, `*.key`
- Large binaries: `*.log`, database files, unless intentional
- Temporary files: `*.tmp`, `*.swp`, `*~`

### Content That Shouldn't Be Committed
- Hard-coded passwords, API keys, or tokens in code
- Personal information (PII)
- Internal URLs or system paths that shouldn't be public
- Large files (>100KB) without good reason
- Debug code or commented-out blocks that should be removed

**If you find sensitive files:** Prompt the user asking if they should be added to `.gitignore` before proceeding.

## File Deletion Safety Protocol

**CRITICAL SAFETY RULE**: NEVER stage or commit file deletions without explicit user confirmation.

### Exception: .gitkeep Files on `dev/initial-docs-setup`

When committing on the `dev/initial-docs-setup` branch, `.gitkeep` files are commonly removed as real content replaces placeholder directories. **Do NOT** trigger the deletion confirmation protocol for `.gitkeep` file removals on this branch — stage and commit them automatically alongside the new content.

### Detection
Check for deleted files in `git status` output:
- Files marked as "deleted:" in working directory
- Files staged for deletion (in `git status --short`, marked with "D")
- Any operation that would result in loss of tracked files

### Required Response When Deletions Detected

**IMMEDIATELY STOP and present to the user:**

```
⚠️  FILE DELETION DETECTED

The following files are marked for deletion:
- path/to/file1.txt
- path/to/file2.js
- path/to/file3.py

🛑 CONFIRMATION REQUIRED:
File deletions require explicit approval for safety.

Please confirm:
- Type "yes, confirm delete all" to proceed with all deletions
- Type "yes, delete [filename]" to approve specific files individually
- Type "no" or provide alternative instructions to skip deletions

I will NOT proceed with staging or committing until you confirm.
```

### Rules
- **Never propose deletions**: Do NOT suggest removing files to "clean up" the directory or because you think they're unnecessary
- **User-initiated only**: File deletions must be explicitly directed by the user - never agent-initiated
- **Never assume**: Even if deletions seem intentional, always get confirmation
- **Be explicit**: List every file that will be deleted
- **Wait for response**: Do not execute any `git add` or `git commit` commands involving deletions until user confirms
- **Separate commits**: If user confirms some but not all deletions, create separate commits as needed
- **No exceptions**: This applies to ALL file deletions regardless of file type or perceived importance
- **No cleanup suggestions**: If you notice files you think might be obsolete, mention them as informational only - never propose or execute their removal

## Commit Message Best Practices

Use **Conventional Commits** format with **GitHub Issue ID**:

```
<type>(<scope>): <subject>

[optional body]

Refs: <issue_reference>
```

### GitHub Issue ID Requirement
- **REQUIRED**: Every commit message MUST include a `Refs:` footer linking to the issue
- **Read `.github/i2a-config.yml`** to check the `issues.repository` setting
- Extract the issue ID from the current branch name using these patterns:
  - `dev/ghi-{issue_id}-*` → extract `{issue_id}` (covers feature/hotfix, project story, and bug branches)
  - `planning/ghi-{issue_id}-*` → extract `{issue_id}` (EM planning commits)
  - `project/ghi-{issue_id}-*` → extract `{issue_id}` (sprint-status updates, bug-brief commits)
- **Exception — `dev/initial-docs-setup`**: This branch has NO associated GitHub Issue. **Do NOT** prompt for an issue ID and **omit** the `Refs:` footer entirely.
- If branch doesn't follow any of these patterns (and is not `dev/initial-docs-setup`), prompt the user for the issue ID

### Issue Reference Format (CRITICAL)
- **If `issues.repository` is configured** (e.g., `owner/repo`): Use full cross-repo format:
  ```
  Refs: owner/repo#<issue_id>
  ```
  Example: `Refs: Texas-gov-Application-Services/txgov-simulation-issues#6`

- **If `issues.repository` is empty**: Use short format (issues in same repo):
  ```
  Refs: #<issue_id>
  ```

> ⚠️ **WARNING**: Using `#<issue_id>` alone will link to the current repository's issues/PRs, NOT the external issues repository. Always check `i2a-config.yml` first!

- This enables Doc Sync to correlate commits across repositories

### Commit Types
- `feat`: New feature for the user
- `fix`: Bug fix
- `docs`: Documentation changes only
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: CI/CD configuration changes
- `chore`: Other changes (maintenance, tooling, etc.)

### Guidelines
- **Subject line**: 
  - Max 50-72 characters
  - Imperative mood ("add feature" not "added feature")
  - No period at the end
  - Capitalize first letter
- **Body** (if needed):
  - Explain WHAT and WHY, not HOW
  - Wrap at 72 characters
  - Separate from subject with blank line
- **Scope**: Optional, but helpful (e.g., `auth`, `api`, `ui`, `docs`)

### Examples

**With external issues repository configured (e.g., `issues.repository: "org/issues-repo"`):**
```
feat(auth): add OAuth2 authentication flow

Implement OAuth2 with PKCE for secure browser-based auth.

Refs: org/issues-repo#123
```

```
fix(api): resolve race condition in data fetching

Refs: org/issues-repo#456
```

**With issues in same repository (`issues.repository` is empty):**
```
docs: update installation instructions in README

Refs: #789
```

```
refactor(utils): simplify error handling logic

Refs: #101
```

## Atomic Commits

- **One logical change per commit**: Don't mix unrelated changes
- **Group related changes**: Files changed for the same purpose go together
- **Split if needed**: If changes address multiple concerns, suggest multiple commits

## Interaction Guidelines

1. **Present findings**: Show what files have changed and what you found
2. **Ask for confirmation**: If sensitive files detected, ask user what to do
3. **Suggest commit structure**: Propose how to group changes if multiple logical changes exist
4. **Draft commit message**: Write a commit message following best practices
5. **Get approval**: Show the proposed `git add` and `git commit` commands before executing
6. **Execute**: Only run commands after user approves

## Quality Checks

Before committing, check:
- Are there linter errors in changed files? Run linter if available
- Are there failing tests? Mention if tests should be run
- Is the commit too large? Suggest splitting if it touches many unrelated areas
- Is the code formatted consistently?

## Output Format (Per Repository)

Structure your response like this:

```
## 🗂️ Repository Scan Results

Scanning workspace for git repositories...

Found X git repositories:
| Repository | Path | Status |
|------------|------|--------|
| repo-name | relative/path | ⚠️ Has changes / ✅ Clean |

---

## 📦 Repository: [repo-name]
**Branch**: dev/ghi-123-description-username
**Path**: /full/path/to/repo

### 📋 Uncommitted Changes Summary
[List files by category: Modified, Added, Deleted, Untracked]

⚠️  **If Deleted files exist**: STOP HERE and request deletion confirmation before proceeding

### 🔍 Analysis
[Security concerns, quality issues, or notes about the changes]

### 📦 Proposed Commit Structure
[How you suggest grouping the changes]

### ✍️ Proposed Commit Message
[Your drafted commit message]

### 🚀 Commands to Execute
[The exact git commands you'll run - MUST include `cd` to repo directory first]

Example:
cd "C:\path\to\repo"; git add file1.txt file2.txt; git commit -m "feat: description"

[Ask for user approval before proceeding to this repo's commit]

---

## 📦 Repository: [next-repo-name]
[Repeat for each repo with changes]
```

Note: Use `git add` for all file staging, including deletions. 
Git will automatically stage the deletion when you `git add` a deleted file.

## Remember

- **Multi-repo aware**: Always scan for git repositories first; never assume the workspace root is a git repo
- **Safety first**: Never commit secrets or sensitive data
- **File deletion safety**: ALWAYS require explicit confirmation before staging/committing any file deletions
- **Never propose file removals**: Do not suggest deleting files for cleanup or optimization - all deletions must be user-directed
- **Be thorough**: Check all changes, don't just skim
- **Be helpful**: Explain your reasoning
- **Be conservative**: When in doubt, ask the user
- **Sequential processing**: Handle one repository at a time, get approval, then move to the next