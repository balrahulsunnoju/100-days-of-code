---
mode: agent
description: "Create GitHub pull requests with structured descriptions, auto-targeted branches, and Copilot reviewer."
---

# Task: Create Pull Request

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Input
- Target branch (optional): ${input:target} - The integration branch (e.g., "feature/ghi-123-add-login")
- Draft status (optional): ${input:draft} - "draft" or "ready"

## Branch Targeting Rules

**IMPORTANT**: This command is for PRs from dev/* branches to their integration branch.

### Supported Branch Patterns

| Dev Branch Pattern | Integration Branch Target | Use Case |
|--------------------|---------------------------|----------|
| `dev/ghi-{id}-{slug}-{username}` | `feature/ghi-{id}-{slug}` or `hotfix/ghi-{id}-{slug}` | Feature/Hotfix workflow |
| `dev/ghi-{id}-{N}-{S}-{slug}-{username}` | `feature/ghi-{id}-epic-{N}-{epic_slug}` | Project workflow (3-tier) |
| `dev/ghi-{id}-bug-{slug}-{username}` | `project/ghi-{pid}-*` (resolve from bug-brief) | Bug fix (project-level) |
| `dev/ghi-{id}-bug-e{N}-{slug}-{username}` | `feature/ghi-{pid}-epic-{N}-*` (resolve from remote) | Bug fix (epic-level) |
| `dev/ghi-{id}-bug-e{N}-s{S}-{slug}-{username}` | `feature/ghi-{pid}-epic-{N}-*` (resolve from remote) | Bug fix (story-level) |
| `planning/ghi-{id}-{slug}` | `project/ghi-{id}-{slug}` | EM planning → project integration |
| `dev/initial-docs-setup` | `feature/initial-docs-setup` | EM initial docs setup |

### Rules
- Dev branches → Target: Their corresponding integration branch (see table above)
- Planning branches → Target: Their corresponding project branch
- Integration to release branches → Handled manually by EM outside AIDLC automation
- Never target `master` or `release/*` directly from dev or planning branches
- `project/*` branches are protected integration branches — never create PRs FROM them

## Process

### 1. Detect Git Repositories (Multi-Repo Workspace Support)

**Check if current directory is a git repository:**
- Run `git rev-parse --git-dir` to check if in a git repo
- Check exit code:
  - Exit code 0 → Current directory IS a git repository → proceed to Step 2
  - Exit code non-zero → Current directory is NOT a git repository → scan for repos

**If NOT in a git repository, scan for repositories:**
- **Read `.github/i2a-config.yml`**: Extract all repository keys from both `worker_repos` and `common_repos` sections. These keys correspond to directory names in the workspace root (some may be symlinked directories for common/shared repos).
- For each repo key, locate the matching directory in the workspace root. Symlinked directories (common repos) are valid git repositories — always follow symlinks.
- For each directory, verify it's a git repository: run `git rev-parse --git-dir` from within
- **Fallback** (if no i2a-config found): List top-level subdirectories and check each for `.git` (folder or file), including symlinked directories
- For each git repository found:
  1. Get current branch: `git branch --show-current`
  2. Only process dev or planning branches matching supported patterns:
     - `dev/ghi-*` (standard ADE workflow)
     - `dev/initial-docs-setup` (EM initial setup)
     - `planning/ghi-*` (EM planning workflow)
  3. Fetch from remote: `git fetch origin`
  4. Determine integration branch from branch name:
     - `dev/ghi-{id}-bug-e{N}-*` → `feature/ghi-{pid}-epic-{N}-*` (bug fix, epic/story-level; resolve `{pid}` from bug-brief in docs repo)
     - `dev/ghi-{id}-bug-{slug}-{user}` → `project/ghi-{pid}-*` (bug fix, project-level; resolve `{pid}` from bug-brief)
     - `dev/ghi-{id}-{N}-{S}-{slug}-{user}` → `feature/ghi-{id}-epic-{N}-{epic_slug}` (project 3-tier; find epic branch on remote)
     - `dev/ghi-{id}-{slug}-{user}` → `{type}/ghi-{id}-{slug}` (check change-brief for type: feature or hotfix)
     - `dev/initial-docs-setup` → `feature/initial-docs-setup`
     - `planning/ghi-{id}-{slug}` → `project/ghi-{id}-{slug}` (EM planning targets project branch)
  5. Count commits ahead: `git rev-list origin/<integration-branch>..HEAD --count`
  6. If commits > 0, get commit list: `git log origin/<integration-branch>..HEAD --pretty=format:"%h %s" --no-merges`

**Collect results for each repo with pending changes:**
- Repository name
- Current branch → target integration branch
- Number of commits ahead
- List of commit summaries

**Present repository summary to user:**
```
📋 Git Repositories with Pending Changes

The following repositories have branches with commits ready for PR:

<list from scan above>

Options:
1. Enter repository name(s) to create PR (comma-separated, e.g., "tx-ovra-docs, tx-ovra-receipt-service")
2. Enter "all" to create PRs for all repositories with pending changes
3. Enter "cancel" to exit

Which repositories should I create PRs for?
```
Wait for user response.

**If user selects repositories:**
- Parse the comma-separated list or handle "all"
- For EACH selected repository:
  - Change directory to that repository
  - Execute Steps 2-12 (the full PR creation workflow)
  - Return to parent directory
  - Continue with next repository
- After all repositories processed, show final summary

**If no repositories found with pending changes:**
```
ℹ️  No Pending Changes Found

Scanned all subdirectories but found no repositories with:
- Dev branches (dev/ghi-* or dev/initial-docs-setup)
- Commits ahead of the integration branch

All repositories appear to be up-to-date or on a non-dev branch.
```
STOP execution.

### 2. Determine Repository Owner and Validate Provider
- Run `git remote -v` to get the origin URL
- **Validate GitHub provider:**
  - Check if URL contains `github.com`
  - If NOT GitHub → BAIL:
    ```
    ⚠️  ERROR: Non-GitHub repository detected — Cannot push or create PR
    
    Repository: {repo_name}
    Remote URL: {remote_url}
    Provider:   {provider} (e.g., TX Bitbucket, GitLab, Azure DevOps)
    
    AIDLC push and PR creation only support GitHub repositories.
    Local changes (branching, commits) are allowed, but push must be done manually.
    
    Non-GitHub repos — push/PR blocked for AIDLC:
      ✗ Cannot push branches via AIDLC
      ✗ Cannot create PRs via GitHub MCP
      ✓ Local commits are supported via /tdgs-aidlc-commit
    
    To push and create a PR for this repository:
      1. Push your branch manually: git push -u origin {branch}
      2. Create PR through the provider's web interface:
         - TX Bitbucket: https://txgscmp.ad.portal.texas.gov/projects/{PROJECT}/repos/{repo}/pull-requests
         - Bitbucket Cloud: https://bitbucket.org/{workspace}/{repo}/pull-requests
         - GitLab: https://gitlab.com/{group}/{repo}/-/merge_requests
    
    Skipping this repository...
    ```
    **Skip this repository and continue with the next one.**
- Parse owner and repo name from URL:
  - HTTPS format: `https://github.com/{owner}/{repo}.git`
  - SSH format: `git@github.com:{owner}/{repo}.git`
- Store `{owner}` and `{repo}` for use in all GitHub MCP calls

### 3. Validate Current Branch

**Check current branch is a dev branch:**
- Run `git branch --show-current`
- Branch MUST match one of these patterns:
  - `dev/ghi-*` (standard ADE workflow)
  - `dev/initial-docs-setup` (EM initial setup)
  - `planning/ghi-*` (EM planning workflow)
- If current branch is "master", "release/*", "feature/*", "hotfix/*", or "project/*":
  ```
  ⚠️  ERROR: Cannot create PR from this branch
  
  Current branch: {branch_name}
  
  Pull requests should be created from dev or planning branches:
    - dev/ghi-{issue_id}-{slug}-{username} (feature/hotfix)
    - dev/ghi-{issue_id}-{N}-{S}-{slug}-{username} (project)
    - dev/ghi-{issue_id}-bug-{slug}-{username} (bug fix)
    - planning/ghi-{issue_id}-{slug} (EM planning → project)
  
  Please switch to your dev or planning branch first:
    git checkout dev/ghi-{issue_id}-...
    git checkout planning/ghi-{issue_id}-...
  
  Exiting...
  ```
  STOP execution immediately.

### 4. Get Current Branch Info

- Run `git branch --show-current` to get current branch name
- **Determine branch type and integration branch:**

  > **Pattern matching order**: Bug branches (`-bug-` literal) MUST be matched BEFORE generic story/M&O patterns to avoid false matches. Check for `-bug-` in the branch name first.

  **For `dev/ghi-{id}-bug-e{N}-s{S}-*` or `dev/ghi-{id}-bug-e{N}-*` branches (bug fix, epic/story-level):**
  - Parse: `dev/ghi-{bug_id}-bug-e{N}(-s{S})?-{slug}-{username}`
  - Resolve `{pid}` (parent project ID) from bug-brief in docs repo: `planning-artifacts/bug-brief-{bug_id}.md` → `parent_project` field
  - **If bug-brief not found:** Extract `{pid}` from the docs repo's current `project/ghi-{pid}-*` branch. If not on a project branch, prompt ADE to specify target.
  - Integration branch: `feature/ghi-{pid}-epic-{N}-{epic_slug}`
    - Discover by matching remote branch: `git branch -r | grep "origin/feature/ghi-{pid}-epic-{N}-"` (or `Select-String` on Windows PowerShell)
  - Extract bug ID from branch name

  **For `dev/ghi-{id}-bug-{slug}-{username}` branches (bug fix, project-level):**
  - Parse: `dev/ghi-{bug_id}-bug-{slug}-{username}` (no `e{N}` component)
  - Resolve `{pid}` from bug-brief in docs repo: `planning-artifacts/bug-brief-{bug_id}.md` → `parent_project` field
  - **If bug-brief not found:** Check the docs repo's current branch — if on `project/ghi-{pid}-*`, use that as the target. Otherwise, prompt ADE to specify the target branch explicitly.
  - Integration branch: `project/ghi-{pid}-{project_slug}`
    - Discover by matching remote: `git branch -r | grep "origin/project/ghi-{pid}-"` (or `Select-String` on Windows PowerShell)
  - If target not found on remote → prompt ADE to verify or specify manually
  - Extract bug ID from branch name

  **For `dev/ghi-{id}-{N}-{S}-*` branches (project 3-tier workflow):**
  - Parse: `dev/ghi-{issue_id}-{N}-{S}-{story_slug}-{username}`
  - Integration branch: `feature/ghi-{issue_id}-epic-{N}-{epic_slug}`
    - Discover by matching remote branch: `git branch -r | grep "origin/feature/ghi-{issue_id}-epic-{N}-"` (or `Select-String` on Windows PowerShell)
  - Extract issue ID, epic number {N}, and story number {S} from branch name

  **For `dev/ghi-{id}-{slug}-{username}` branches (feature/hotfix workflow):**
  - Parse: `dev/ghi-{issue_id}-{slug}-{username}`
  - Check change-brief for issue type (`feature` or `hotfix`)
  - Integration branch: `feature/ghi-{issue_id}-{slug}` or `hotfix/ghi-{issue_id}-{slug}`
  - Extract issue ID from branch name pattern

  **For `dev/initial-docs-setup` branch (EM initial setup):**
  - Integration branch: `feature/initial-docs-setup`
  - No issue ID (initial setup has no GitHub issue)

  **For `planning/ghi-{id}-{slug}` branches (EM planning workflow):**
  - Parse: `planning/ghi-{issue_id}-{slug}`
  - Integration branch: `project/ghi-{issue_id}-{slug}`
  - Extract issue ID from branch name pattern

- Store branch name, issue ID (if applicable), and integration branch for later use

### 5. Determine Target Integration Branch

**Determine target branch (must be an integration branch):**

**For `dev/ghi-{id}-bug-e{N}-*` branches (bug fix, epic/story-level):**
- Resolve `{pid}` from bug-brief in docs repo
- Integration branch: `feature/ghi-{pid}-epic-{N}-{epic_slug}`
- Discover epic branch on remote: `git branch -r | grep "origin/feature/ghi-{pid}-epic-{N}-"` (or `Select-String` on Windows PowerShell)

**For `dev/ghi-{id}-bug-{slug}-{username}` branches (bug fix, project-level — no `e{N}`):**
- Resolve `{pid}` from bug-brief in docs repo
- Integration branch: `project/ghi-{pid}-{project_slug}`
- Discover on remote: `git branch -r | grep "origin/project/ghi-{pid}-"` (or `Select-String` on Windows PowerShell)
- If not found → require explicit target from ADE

**For `dev/ghi-{id}-{N}-{S}-*` branches (project 3-tier):**
- Parse: `dev/ghi-{issue_id}-{N}-{S}-{story_slug}-{username}`
- Integration branch: `feature/ghi-{issue_id}-epic-{N}-{epic_slug}`
- Discover epic branch on remote: `git branch -r | grep "origin/feature/ghi-{issue_id}-epic-{N}-"` (or `Select-String` on Windows PowerShell)

**For `dev/ghi-{id}-{slug}-{username}` branches (feature/hotfix):**
- Parse integration branch: `dev/ghi-{issue_id}-{slug}-{username}` → `{type}/ghi-{issue_id}-{slug}`
- Check change-brief for issue type (`feature` or `hotfix`) to determine prefix

**For `dev/initial-docs-setup` branch:**
- Integration branch is always: `feature/initial-docs-setup`

**For `planning/ghi-{id}-{slug}` branches (EM planning):**
- Integration branch: `project/ghi-{issue_id}-{slug}`
- Verify project branch exists on remote: `git branch -r | grep "origin/project/ghi-{issue_id}-{slug}"` (or `Select-String` on Windows PowerShell)

- Run `git branch -r` to verify integration branch exists on remote

**If ${input:target} provided:**
- Validate it matches `feature/ghi-*`, `hotfix/ghi-*`, `project/ghi-*`, or `feature/initial-docs-setup` pattern
- If valid: use specified target
- If invalid (e.g., "master" or "release/*"): BAIL with error:
  ```
  ⚠️  ERROR: Invalid target branch
  
  Specified target: {input:target}
  
  Dev branches must target their integration branch.
  PRs to master or release are not allowed from dev branches.
  
  Expected target: {integration_branch}
  
  Exiting...
  ```

**If ${input:target} NOT provided:**
- Auto-detect integration branch from dev branch name
- Verify it exists on remote:
  - Run `git branch -r | grep "origin/{integration_branch}"` (or `Select-String` on Windows PowerShell)
  - If exists: use it
  - If does not exist: BAIL with error:
    ```
    ⚠️  ERROR: Integration branch not found
    
    Expected: {integration_branch}
    
    The integration branch must exist before creating a PR from a dev branch.
    This usually means /tdgs-aidlc-prepare-repos was not run or the branch was deleted.
    
    For feature/hotfix workflow:
      git checkout master
      git pull origin master
      git checkout -b {type}/ghi-{issue_id}-{slug}
      git push -u origin {type}/ghi-{issue_id}-{slug}
    
    For project 3-tier workflow:
      The epic branch (feature/ghi-{issue_id}-epic-{N}-{epic_slug}) must be
      created via /tdgs-aidlc-prepare-repos from the project branch.
    
    Exiting...
  ```

### 6. Get Commit History

**Fetch commits for PR:**
- Run `git fetch origin <target-branch>` to ensure up-to-date
- Run `git log origin/<target-branch>..HEAD --pretty=format:"%h|%s|%b" --no-merges`
- Parse commits to extract:
  - Commit hashes
  - Commit subjects (titles)
  - Commit bodies (if any)

**If no commits found:**
```
⚠️  ERROR: No commits to create PR
Current branch has no commits ahead of <target-branch>.

Please:
1. Make your changes
2. Commit them: /tdgs-aidlc-commit
3. Then create PR: /tdgs-aidlc-create-pull-request

Exiting...
```
STOP execution.

### 7. Generate PR Title

**Title Generation Strategy:**
- Analyze commit messages and branch name
- Extract common themes and changes
- Follow Conventional Commits format when applicable
- Use branch type prefix if applicable

**Format:**
```
<type>: <concise description>
```

**Type mapping:**
- Branch prefix `ft/` → "feat"
- Branch prefix `hf/` → "fix"
- Branch prefix `ds/` → "chore"
- If commits predominantly one type → use that type
- Default → "feat" or most common commit type

**Guidelines:**
- 50-72 characters maximum
- Imperative mood ("add feature" not "added feature")
- Capitalize first letter
- No period at end
- Be specific but concise
- Reflect the main purpose of the PR

**Examples:**
- `feat: Add OAuth2 authentication flow`
- `fix: Resolve race condition in data fetching`
- `chore: Bump dependency versions for security patches`
- `feat: Implement user profile management`

### 8. Generate PR Description

**Description Structure:**
```markdown
## Summary
[High-level overview of what this PR does - 2-3 sentences]

## Changes
[Bullet list of key changes derived from commit messages]
- Change 1
- Change 2
- Change 3

## Commits
[Auto-generated list of commits with messages]
- <hash>: <commit subject>

## Testing
[If test-related commits exist, mention them; else generic statement]

## Notes
[Any additional context from commit bodies or notable patterns]
```

**Description Generation Guidelines:**
- **Summary**: Synthesize the overall purpose from all commits
- **Changes**: Extract distinct changes from commit subjects
  - Group related commits
  - Deduplicate similar changes
  - Use clear, action-oriented language
- **Commits**: List all commits for traceability
- **Testing**: Note if tests were added/updated based on commit messages
- **Notes**: Include important details from commit bodies
  - Breaking changes (BREAKING CHANGE: footer)
  - Migration steps
  - Known issues or follow-ups
  - References to issues/tickets if mentioned

**Quality Standards:**
- Be concise but complete
- Use proper markdown formatting
- Maintain professional tone
- Highlight impact and benefits
- Note any breaking changes prominently

**Shared Code Warning (Common Repos Only):**
If the repository being PR'd is listed under `common_repos` in `.github/i2a-config.yml` (check by reading the config and matching the current repo name against `common_repos` keys), prepend the following to the PR body:
```markdown
> ⚠️ **Shared code — may affect other applications**
> This repository is a common/shared service used by multiple applications. Please ensure changes are backward-compatible.
```

### 9. Determine Draft Status

**If ${input:draft} provided:**
- "draft" → Create as draft PR
- "ready" → Create as ready for review
- Invalid value → Ask user

**If ${input:draft} not provided:**
- Ask user:
  ```
  📋 PR Status
  
  Should this PR be created as:
  1. draft - Work in progress, not ready for review
  2. ready - Ready for review now
  
  Please respond: "draft" or "ready"
  ```
  Wait for user response.

### 10. Ensure Branch is Pushed to Remote

**Check if branch exists on remote:**
- Run `git rev-parse --verify origin/<current-branch>`
- Check exit code:
  - Exit code 0 → Branch exists on remote
  - Exit code non-zero → Branch does not exist on remote

**If branch exists on remote:**
- Check if local is ahead: `git rev-list origin/<current-branch>..HEAD --count`
- If count > 0 (commits ahead):
  - Output: "📤 Pushing new commits to origin/<current-branch>..."
  - Run `git push origin <current-branch>`
- If count = 0:
  - Output: "✓ Branch is up-to-date with remote"

**If branch does not exist on remote:**
- Output: "📤 Branch not found on remote. Pushing to origin/<current-branch>..."
- Run `git push -u origin <current-branch>`

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

### 11. Create Pull Request

**Execute PR creation:**
- Use GitHub CLI to create PR:
  ```
  gh pr create --repo {owner}/{repo} --base <target-branch> --head <current-branch> --title "<title>" --body "<description>" [--draft]
  ```
  - Add `--draft` flag if draft status is true
  - The command will output the PR URL

**Error Handling:**
- If PR creation fails:
  - Check if PR already exists for this branch
  - Verify GitHub authentication
  - Provide clear error message with remediation steps

### 12. Request Copilot Review

**Request review from GitHub Copilot bot:**
- Use GitHub CLI to request Copilot review:
  ```
  gh pr edit <pr-number> --repo {owner}/{repo} --add-reviewer "copilot"
  ```

**Error Handling:**
- If review request fails:
  - Verify GitHub authentication
  - Provide clear error message with remediation steps

### 13. Comment on Associated GitHub Issue

**Post a comment on the GitHub Issue linking the newly created PR.**

**Determine issue ID:**
- Extract `{issue_id}` from the dev branch name (parsed in Step 4)
- If no issue ID available (e.g., `dev/initial-docs-setup`): **SKIP this step**

**Determine issues repository:**
- Read `.github/i2a-config.yml` from the workspace root
- Extract `issues.repository` setting
- If not configured: use the current repository (`{owner}/{repo}`)

**Post the comment:**
```
gh issue comment {issue_id} --repo {issues_repository} --body "🔗 **Pull Request Created:** #{pr_number}

**Repository:** {owner}/{repo}
**Branch:** `{current-branch}` → `{target-branch}`
**PR:** {pr_url}"
```

**Error Handling:**
- If comment fails (e.g., auth issue, issue not found, repo mismatch):
  ```
  ⚠ Failed to comment on issue #{issue_id}
    PR was created successfully — review the PR at the URL above.
    Issue comment will need to be added manually.
  ```
  This is non-fatal — the PR creation already succeeded.

### 14. Output Confirmation

**On Success:**
```
✅ Pull Request Created Successfully!

Title: <PR title>
Branch: <current-branch> → <target-branch>
Status: <draft/ready>
Reviewer: @copilot

🔗 PR URL: <github-pr-url>
💬 Issue comment: Added to #{issue_id}

Next steps:
- Review the PR description and make any manual edits if needed
- Add additional reviewers if required
- Add labels if applicable
<if draft>- Mark as "Ready for review" when complete</if>
```

### 15. Update Sprint Status (Project Workflow Only)

**Applies when:** The dev branch matches a project workflow pattern (`dev/ghi-{id}-{N}-{S}-{slug}-{username}`) and the docs repo is on a `project/*` branch.

After successful PR creation, update `sprint-status.yaml` in the docs repo:

1. Navigate to the docs repository in the workspace
2. Ensure on the `project/*` branch
3. In `implementation-artifacts/sprint-status.yaml`, change the story status from `in-progress` to `review`
4. Update `last_updated` to today's date
5. Commit and push the change

```bash
cd {docs_repo_path}
git pull origin project/ghi-{issue_id}-{slug}

# Update sprint-status.yaml — set story to review
# Change: {N}-{S}-{story_slug}: in-progress → {N}-{S}-{story_slug}: review
# Also update: last_updated: {today's date}

git add implementation-artifacts/sprint-status.yaml
git commit -m "chore: mark story {N}-{S} as review (PR created)"
git push origin project/ghi-{issue_id}-{slug}
echo "✓ Updated sprint-status.yaml — story {N}-{S} now in review"
```

**If sprint-status update fails** (e.g., merge conflict):
```
⚠ Failed to update sprint-status.yaml
  PR was created successfully — review the PR at the URL above.
  Sprint status will need manual sync.
```
This is non-fatal — the PR creation (the important action) already succeeded.

**Skip this step if:**
- Not on a project branch (M&O workflow — no sprint-status tracking)
- Current branch is a bug fix branch (`dev/ghi-*-bug-*`) — bugs are NOT tracked in sprint-status
- Docs repo not found in workspace
- `sprint-status.yaml` does not exist

## Edge Cases

### Already on master branch:
```
Error: Cannot create PR from master branch.
Current branch: {branch_name}

Switch to a dev branch first:
  git checkout dev/ghi-{issue_id}-{slug}-{username}
```

> **Note:** Integration branches (feature/*, hotfix/*) and release branches are also not valid source branches for PRs from this command. Integration → release merges are handled manually by EM.

### No commits ahead of target:
```
Error: No commits to create PR.
Current branch is up-to-date with <target-branch>.
```

### PR already exists for branch:
```
Error: PR already exists for this branch.
🔗 Existing PR: <github-pr-url>

Would you like to update the existing PR instead? (not implemented yet)
```

### GitHub authentication failure:
```
Error: Unable to authenticate with GitHub.
Please check your GitHub credentials/token and try again.
```

### Target branch does not exist:
```
Error: Target branch "<target>" not found.
Available branches: <list-of-branches>
```

### Invalid draft status:
```
Error: Invalid draft status: "<input>"
Please specify "draft" or "ready"
```

## Don'ts

- Don't create PR if on protected branch (master, release/*, feature/*, hotfix/*, project/*)
- Don't create PR without commits
- Don't ask questions that can be auto-detected
- Don't create PR without user confirmation for draft status (unless provided)
- Don't target master or release/* directly from dev or planning branches
- Don't include sensitive information in PR description
- Don't create overly long titles (>72 chars)
- Don't use vague descriptions like "updates" or "changes"

## Quality Checks

Before creating PR:
1. ✓ On dev/ghi-* or planning/ghi-* branch (not master/release/feature/hotfix/project)
2. ✓ Have commits to include
3. ✓ Branch is pushed to remote (auto-pushed if needed)
4. ✓ Target branch is a valid integration branch (feature/ghi-*, hotfix/ghi-*, or project/ghi-*)
5. ✓ Title follows best practices
6. ✓ Description is clear and complete
7. ✓ Draft status is determined
8. ✓ User has confirmed interactive choices (if any)

## Remember

- **Safety first**: Never create PR from protected branches (master/release/feature/hotfix/project)
- **Integration targeting**: Dev branches target their integration branch; planning branches target their project branch. Never target master or release directly.
- **User choice**: Ask for draft status when not specified
- **Quality content**: Generate excellent titles and descriptions from commit history
- **Auto-reviewer**: Always add copilot as initial reviewer
- **Clear output**: Provide PR URL and next steps
- **Graceful errors**: Handle all edge cases with helpful messages
- **Multi-repo support**: When run from workspace root, scan all subdirectories for git repos with pending changes
