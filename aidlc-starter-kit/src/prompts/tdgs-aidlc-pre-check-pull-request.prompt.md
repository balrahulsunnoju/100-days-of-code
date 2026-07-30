---
mode: agent
description: "Trigger the CI pipeline on the current dev branch and report pass/fail results."
---

# Task: Run CI Pipeline on Dev Branch

## Purpose

Run the CI pipeline on a dev branch to validate changes before creating a Pull Request. This catches build failures and test issues early. Results are displayed directly in the IDE.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify the target repository directory first, then run git commands within that directory.

## Pre-flight Check: Identify Target Repository

Before running any commands, determine which repository to operate on:

1. **Check current working directory:**
   - If already inside a git repository subdirectory, use that as the target
   - Run `git rev-parse --show-toplevel` to get the repository root

2. **If at workspace root, ask user which repository to use:**
   - Read `.github/i2a-config.yml` and list repositories from `worker_repos` and `common_repos` keys (these correspond to directory names in the workspace root; symlinked directories are valid git repos — follow symlinks)
   - **Fallback** (if no i2a-config): List subdirectories with `.git` folders, including symlinks
   - Prompt user to select or confirm the target repository

3. **Change to the target repository directory before proceeding:**
   ```bash
   cd <target-repo-directory>
   ```

**All subsequent git commands must be run from within the target repository directory.**

## Repository Context

Extract owner and repo from git remote:
- Run `git remote get-url origin` to get the remote URL
- Parse to extract: `owner` (organization/user name from the remote URL), `repo` (repository name)

## GitHub Remote Validation

> ⚠️ **CRITICAL**: AIDLC only supports GitHub repositories for git operations.

**Check if repository is on GitHub:**
- Verify the remote URL contains `github.com`
- If NOT GitHub → BAIL:
  ```
  ⚠️  ERROR: Non-GitHub repository detected — Cannot run CI pipeline
  
  Repository: {repo_name}
  Remote URL: {remote_url}
  Provider:   {provider} (e.g., TX Bitbucket, GitLab, Azure DevOps)
  
  AIDLC CI pipeline triggering only supports GitHub Actions.
  Local changes (branching, commits) are allowed, but push/CI must be done manually.
  
  Non-GitHub repos — push/CI blocked for AIDLC:
    ✗ Cannot push branches via AIDLC
    ✗ Cannot trigger CI pipelines via GitHub Actions
    ✓ Local commits are supported via /tdgs-aidlc-commit
  
  To run CI for this repository:
    1. Push your branch manually: git push -u origin {branch}
    2. Trigger the pipeline through your provider's CI/CD interface
  
  Exiting...
  ```
  STOP execution immediately.

## Process

### 1. Validate Current Branch

**Check if on allowed branch:**
- Run `git branch --show-current`
- If current branch is "main", "master", starts with "feature/", starts with "hotfix/", starts with "project/", starts with "planning/", or starts with "release/": 
  ```
  ⚠️  ERROR: Cannot run pipeline from this branch
  You are currently on: <branch-name>
  
  Pipeline pre-check should run on dev/* branches only.
  
  Please switch to your dev branch:
    git checkout dev/ghi-{issue_id}-{slug}-{username}
  
  Exiting...
  ```
  STOP execution immediately.

- If current branch starts with "dev/": Continue to next step

### 2. Get Current Branch Info

- Run `git branch --show-current` to current branch name
- Store branch name for later use
- Output: "🔍 Current branch: <branch-name>"

### 3. Check for Uncommitted Changes

**Verify working directory status:**
- Run `git status --porcelain`
- If output is not empty:
  ```
  ⚠️  WARNING: Uncommitted Changes Detected
  
  The following files have uncommitted changes:
  <list files>
  
  The pipeline will run against committed code only.
  
  Options:
  1. Commit your changes first: /tdgs-aidlc-commit
  2. Continue anyway (uncommitted changes will NOT be tested)
  
  Do you want to continue? (yes/no)
  ```
  Wait for user response. If "no", STOP execution.

### 4. Ensure Branch is Pushed to Remote

**Check if branch exists on remote:**
- Run `git rev-parse --verify origin/<current-branch> 2>/dev/null`
- Check exit code:
  - Exit code 0 → Branch exists on remote
  - Exit code non-zero → Branch does not exist on remote

**If branch exists on remote:**
- Check if local is ahead: `git rev-list origin/<current-branch>..HEAD --count`
- If count > 0:
  - Output: "📤 Pushing new commits to origin/<current-branch>..."
  - Run `git push origin <current-branch>`
- If count = 0:
  - Output: "✓ Branch is up-to-date with remote"

**If branch does not exist on remote:**
- Output: "📤 Branch not found on remote. Pushing to origin/<current-branch>..."
- Run `git push -u origin <current-branch>`

### 4a. Fetch Remote Refs for Gitleaks Baseline (CRITICAL)

> ⚠️ **IMPORTANT**: The Gitleaks security scan requires proper git history context.
> When triggered via `workflow_dispatch` (IDE trigger), Gitleaks uses the baseline branch (master/main)
> to determine which commits to scan. Without proper remote refs, the scan may fail.

**Ensure remote refs are fetched:**
```bash
git fetch origin master:refs/remotes/origin/master 2>/dev/null || git fetch origin main:refs/remotes/origin/main 2>/dev/null || true
```

**Verify the branch has a merge-base with the default branch:**
```bash
git merge-base origin/master HEAD 2>/dev/null || git merge-base origin/main HEAD 2>/dev/null
```

- If merge-base exists: Gitleaks can determine the commit range to scan
- If merge-base fails: The branch may have been created from a shallow clone or orphan commit, which can cause Gitleaks failures

**If merge-base fails, warn the user:**
```
⚠️  WARNING: Git Baseline Issue Detected

Your branch does not have a common ancestor with the default branch (master/main).
This may cause the Gitleaks security scan to fail.

Possible causes:
1. Branch was created from a shallow clone
2. Branch history was rewritten
3. Default branch does not exist on remote

Recommended fix:
1. Fetch full history: git fetch --unshallow origin (if shallow)
2. Rebase onto the default branch: git rebase origin/master
3. Or skip Gitleaks for this run if the issue persists

Do you want to continue anyway? (yes/no)
```
Wait for user response. If "no", STOP execution.

**Error Handling:**
- If push fails:
  ```
  ⚠️  ERROR: Failed to push branch to remote
  
  Git push failed with error:
  <error-message>
  
  Please resolve the issue and try again.
  Common causes:
  - No write permissions to repository
  - Branch name conflicts
  - Network connectivity issues
  - Need to pull changes first (diverged branch)
  
  Exiting...
  ```
  STOP execution.

### 5. Trigger Pipeline Workflow

Use the MCP GitHub Actions tool to trigger the workflow:

Call `mcp_github_actions_run_workflow` with:
- `owner`: <extracted-owner>
- `repo`: <extracted-repo>
- `workflow_id`: "ci-feature.yml"
- `ref`: <current-branch>

**If trigger fails:**
```
❌ Failed to trigger pipeline workflow
Possible causes:
1. Workflow file not found: Ensure `.github/workflows/ci-feature.yml` exists
2. No permission to trigger workflows
3. Branch not found on remote
4. Invalid workflow_id or repository
Exiting...
```
STOP execution.

**On success:**
```
🚀 Pipeline Triggered Successfully
Branch: <branch-name>
Workflow: ci-feature.yml
Waiting for workflow to start...
```

### 6. Wait and Get Run ID

**⏳ Wait for GitHub to register the workflow run**

Wait at least 30 seconds for GitHub to register the run:
```bash
sleep 30
```

**First, get the numeric workflow ID:**

Call `mcp_github_actions_list_workflows` with:
- `owner`: <extracted-owner>
- `repo`: <extracted-repo>

Find the workflow named "CI Feature" (or with path `ci-feature.yml`) and extract its numeric `id`.

**Then list workflow runs:**

Call `mcp_github_actions_list_workflow_runs` with:
- `owner`: <extracted-owner>
- `repo`: <extracted-repo>
- `workflow_id`: <numeric-workflow-id> (as a string, e.g., "216753)
- `branch`: <current-branch>
- `per_page`: 1

Extract the `id` from the first workflow run result - this is the workflow run ID.

Output: "📋 Run ID: <run-id>"

### 7. Monitor Workflow Progress

**📊 Poll workflow status using MCP with exponential backoff:**

Repeatedly call `mcp_github_actions_get_workflow_run` with:
- `owner`: <extracted-owner>
- `repo`: <extracted-repo>
- `run_id`: <run-id> (as a string, e.g., "20344704507")

Check the `status` and `conclusion` fields:
- `status: "queued"` → "⏳ Workflow queued..."
- `status: "in_progress"` → "🔄 Workflow running..."
- `status: "completed"` → Check `conclusion`

**Polling with exponential backoff (max 10 minutes):**
- Start with 30 second delay
- Increase delay each poll: 30s → 45s → 60s → 90s → 90s → 90s...
- Cap at 90 seconds per poll
- Max total polling time: 10 minutes
- If not completed after 10 minutes, show current status and provide manual check instructions

**When completed, check conclusion:**
- `conclusion: "success"`- `conclusion: "failure"` → "❌ Pipeline failed" - **Proceed to Step 8 for failure analysis**
- `conclusion: "cancelled"` → "⚠️ Pipeline cancelled"

### 8. Get Job Details and Failure Analysis

**📥 Get jobs using MCP:**

**List workflow jobs:**

Call `mcp_github_actions_list_workflow_run_jobs` with:
- `owner`: <extracted-owner>
- `repo`: <extracted-repo>
- `run_id`: <run-id> (as a string)

**For successful runs, display job summary:**
```
📋 Job Results:
  - build: ✅ success (2m 15s)
  - test: ✅ success (1m 45s)
  - gitleaks: ✅ success (30s)
  - veracode: ✅ success (3m 20s)
```

**For failed runs, display failure summary with details:**

1. **Identify all failed jobs** from the job list (where `conclusion: "failure"`)
2. **Get logs for each failed job** using `gh run view <run-id> --log-failed` command
3. **Parse and display the failure output** in the IDE

**Display format for failures:**
```
❌ Pipeline FAILED

📋 Job Results:
  - setup: ✅ success (15s)
  - checkout: ✅ success (45s)
  - test: ⏭️ skipped
  - security: ⏭️ skipped

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 FAILURE DETAILS: build
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<Extract and display the last 50-100 lines of the failed job log>

Example output:
[ERROR] COMPILATION ERROR :
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Failure type detection and suggestions:**

| Failure Type | Description | Suggested Action |
|---|---|---|
| build/compilation | Compilation error | Check syntax, missing imports, or dependency issues |
| test | Test assertion failed | Run tests locally: `mvn test` and fix failing tests |
| security/gitleaks | Secrets detected | Remove hardcoded secrets, use env variables |
| veracode | Security vulnerability | Review Veracode dashboard, update dependencies |
| checkout | Git/permission issue | Check branch exists, verify credentials |
| setup | Runner/infra issue | Re-run pipeline, may be transient |

**To get detailed logs, run:**
```bash
GH_PAGER= gh run view <run-id> --log-failed --repo <owner>/<repo> 2>&1 | tail -100
```

**To download full logs for deeper analysis:**

```bash
gh run download <run-id> --repo <owner>/<repo> --dir /tmp/workflow-logs
```

Note: This downloads ALL logs as separate files. Parse the relevant job log files for debugging.

### 9. Check Security Scan Results

**Review Gitleaks and Veracode job results from step 8.**

**If Gitleaks failed:**
```
🔐 Gitleaks Scan FAILED
```

**First, determine the failure type by checking the logs:**

**Type A - Secrets Detected (actual finding):**
```
Secrets or sensitive data detected in your code.

Common issues:
- Hardcoded API keys or tokens
- Passwords in configuration files
- AWS/Azure credentials committed

Actions:
1. Review the Gitleaks job logs for file paths and line numbers
2. Remove or rotate any exposed secrets
3. Add secrets to .gitignore or use environment variables
4. Consider using git-filter-repo to remove from history if already pushed
```

**Type B - Git History/Baseline Error (workflow_dispatch trigger issue):**

If the error log contains messages like:
- `fatal: bad revision`
- `could not determine log options`
- `no commits to scan`
- `failed to get commits`

This indicates a **baseline scanning issue** specific to `workflow_dispatch` triggers (IDE-triggered pipelines).

```
⚠️  Gitleaks Baseline Error Detected

This failure is NOT due to secrets in your code. It's caused by the workflow_dispatch 
trigger not having the same commit context as a push event.

Root cause: When triggered from IDE, Gitleaks cannot determine the proper commit range 
to scan because workflow_dispatch events lack the push event's before/after commit refs.

Workarounds:
1. Push your changes directly to trigger a push event (recommended):
   git push origin <branch-name>
   
2. If the pipeline passes on direct push but fails on IDE trigger, 
   you can safely proceed with your PR - this is a known limitation.

3. If you need IDE-triggered pipeline validation to work:
   - Ensure your branch has a merge-base with master/main
   - Run: git fetch origin master && git rebase origin/master
   - Then re-trigger the pipeline
```

**If Veracode failed:**
```
🛡️ Veracode Scan FAILED
Security vulnerabilities detected in your code.

Actions:
1. Review the Veracode job lor dashboard for vulnerability details
2. Fix CRITICAL and HIGH severity issues before merging
3. For dependency vulnerabilities, update the affected packages
4. For code vulnerabilities, follow Veracode remediation guidance
```

**If both security scans passed:**
```
✅ Security Scans Passed
- Gitleaks: No secrets detected
- Veracode: No critical vulnerabilities
```

## MCP Tool Reference

| Action | MCP Tool | Key Parameters |
|--------|----------|----------------|
| Trigger workflow | `mcp_github_actions_run_workflow` | owner, repo, workflow_id, ref |
| List workflows | `mcp_github_actions_list_workflows` | owner, repo |
| List workflow runs | `mcp_github_actions_list_workflow_runs` | owner, repo, workflow_id, branch, per_page |
| Get run status | `mcp_github_actions_get_workflow_run` | owner, repo, run_id |
| List jobs | `mcp_github_actions_list_workflow_run_jobs` | owner, repo, run_id |
| Download logs | `mcp_github_actions_download_workflow_run_logs` | owner, repo, run_id |

**Note:** All `run_id` and `workflow_id` parameters must be passed as **strings**, not numbers.

## GitHub CLI (Fallback)

| Action | Command |
|--------|---------||
| Get failed logs | `GH_PAGER= gh run view <run-id> --log-failed --repo <owner>/<repo> 2>&1 \| tail -100` |
| Download all logs | `gh run download <run-id> --repo <owner>/<repo> --dir /tmp/workflow-logs` |

## Failure Analysis

**For test failures:**

Use `mcp_github_actions_download_workflow_run_logs` to get all logs, or fall back to `gh run view <run-id> --log-failed` for quick failed job output.

**Suggested Actions:**
1. Run tests locally: `mvn test` or `./run-tests.sh`
2. Review the failing test output from logs
3. Fix and commit changes: `/tdgs-aidlc-commit`
4. Re-run pipeline: `/run-pipeline`

## Edge Cases

| Situation | Error Message |
|-----------|---------------|
| On main/master branch | `Error: Cannot run pipeline from main/master branch.` |
| No commits | `Error: No commits on this branch.` |
| Workflow missing | `Error: Workflow ci-feature.yml not found` |
| No permission | `Error: No permission to trigger workflows` |
| Run not found | `Error: Could not find workflow run` |
| Gitleaks baseline error | `Warning: Gitleaks failed due to workflow_dispatch context. Push directly to validate.` |
| No merge-base with default | `Warning: Branch has no common ancestor with master/main. Rebase recommended.` |

## Don'ts

- Don't run pipeline from main/master branch
- Don't run pipeline without pushing branch first
- Don't run pipeline with uncommitted changes without warning
- Don't leave user waiting without progress updates
- Don't fail silently - always provide clear error messages

## Remember

- **Safety first**: Never run from main/master branch
- **User awareness**: Warn about uncommitted changes
- **Auto-push**: Push branch automatically if needed
- **Use MCP tools**: MCP GitHub Actions tools are the primary method for triggering and monitoring workflows
- **Fallback to `gh` CLI**: Use `gh` CLI for failed logs (`--log-failed`) when MCP doesn't provide enough detail
- **String IDs**: Always pass `run_id` and `workflow_id` as strings to MCP tools
- **Polling**: Use exponential backoff (30s → 45s → 60s → 90s, cap 90s, max 10 minClear results**: Provide pass/fail summary with next steps
- **Actionable errors**: Tell user exactly how to fix issues
