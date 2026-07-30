# M&O Issue Assignment

> **Role:** Engineering Manager | **Reading path:** [EM Guide](em-guide.md) | **Previous:** [Knowledge Base Generation](knowledge-base-generation.md) | **Next:** [Project Planning](project-planning.md)

This guide covers the EM's role in M&O (feature/hotfix) work: assigning issues to ADEs and managing releases.

---

## What's Changed

| Old Model | New Model |
|-----------|-----------|
| EM creates `release/X.X.X` branch | EM assigns GitHub Issue only |
| EM tells ADE: release branch + issue ID + type | EM tells ADE: issue ID + type only |
| ADE creates feature/hotfix branch from release | ADE creates integration + dev branches from master |
| PRs target release branch | PRs target integration branch |
| - | EM creates release branches manually after Test Env |

## Issue Types

| Type | Use Case | Workflow | Branch Prefix | Command |
|------|----------|----------|---------------|---------|
| `feature` | New features, enhancements (M&O) | BMAD Quick-Flow | `feature/ghi-*` | `/tdgs-aidlc-initiate-issue {id} feature` |
| `hotfix` | Critical bug fixes (M&O) | BMAD Quick-Flow | `hotfix/ghi-*` | `/tdgs-aidlc-initiate-issue {id} hotfix` |
| `project` | New projects (Full BMAD) | Full BMAD Workflow | `project/ghi-*` (protected) + `planning/ghi-*` | `/tdgs-aidlc-initiate-project {id}` |
| `bug` | Defects found during project testing | M&O-like (from project/epic) | `dev/ghi-{bug_id}-bug-*` | `/tdgs-aidlc-initiate-issue {id} bug` |

> 💡 `project` type issues follow a different workflow — see [Project Planning](project-planning.md) for the full planning process.
>
> 💡 **`bug` vs `hotfix`:** Use `hotfix` for defects found in **production** (branches from master, M&O quick-flow). Use `bug` for defects found during **project testing** before release (branches from project/epic, requires active project). If there's no active `project/*` branch, use `hotfix`.
>
> See [Bug Remediation](project-implementation.md#bug-remediation-process) for the full bug workflow.

## Assigning an Issue (Feature/Hotfix — M&O Quick-Flow)

1. **Create and configure the GitHub Issue** with requirements and acceptance criteria
2. **Notify the ADE** with just:
   - **Issue ID** (e.g., `#123`)
   - **Issue Type** (`feature` or `hotfix`)

**Example message to ADE:**
```
Assigned: Issue #123 (feature)
Requirements are in the GitHub Issue. 
Run: /tdgs-aidlc-initiate-issue 123 feature
```

> 💡 **When to use `project` vs `feature`:**
> - Use `project` when the work requires formal planning artifacts (Product Brief, PRD, Architecture, Epics, Sprint Plans) — typically new modules, major rewrites, or multi-sprint initiatives. The EM completes planning; ADE implements.
> - Use `feature` for smaller, well-defined enhancements that can be specified in a single spec — typically single-sprint M&O work. The ADE handles everything.

## ADE Workflow Summary (M&O Quick-Flow)

1. Run `/tdgs-aidlc-initiate-issue {id} {type}` — creates integration branch (`feature/ghi-*` or `hotfix/ghi-*`) and dev branch (`dev/ghi-*-{username}`) from master
2. Run `/tdgs-aidlc-reference-sync` — syncs shared service docs into the docs repo
3. Run `/bmad-quick-dev` (spec) → approve → close chat → commit → draft PR
4. Run `/tdgs-aidlc-prepare-repos` — creates branches in worker repos
5. Run `/bmad-quick-dev` (implement) per worker repo → commit → PR
6. Submit PRs to integration branch
7. Notify EM when PRs are ready for review and Test Env deployment

## Assigning a Bug (Project Workflow)

When a defect is found during testing within a project (manual or automated testing of implemented stories), the EM triages and assigns it as a `bug` type issue.

### Prerequisites

- The project must be active (a `project/ghi-{pid}-*` branch exists)
- The ADE's docs repo must be on the `project/*` branch

### Steps

1. **Create a GitHub Issue** for the bug with:
   - Clear bug description (steps to reproduce, expected vs actual behavior)
   - `bug` label
   - A reference to the parent project issue (e.g., "Related to #42" in the body)
   - If the bug is scoped to a specific epic/story, note it (e.g., "Found in Epic 1, Story 3")
2. **Notify the ADE** with:
   - **Bug Issue ID** (e.g., `#74`)
   - **Issue Type**: `bug`
   - **Parent project** context (if not obvious from the issue link)

**Example message to ADE:**
```
Bug found in testing: Issue #74 (bug)
Related to project #42, Epic 1.
Docs repo should be on project/ghi-42-* branch.
Run: /tdgs-aidlc-initiate-issue 74 bug
```

### Bug Tracking

- Bugs are tracked via GitHub Issues with the `bug` label, linked to the parent project issue
- Bugs are **NOT** tracked in `sprint-status.yaml`
- Dashboard: deferred to delivery-metrics work

---

## EM Responsibilities for Releases

| Phase | EM Action |
|-------|-----------|
| **Assignment** | Create GitHub Issue, assign to ADE, provide issue ID + type (`feature` or `hotfix`) |
| **Bug Assignment** | Create bug GitHub Issue with `bug` label linked to parent project, assign to ADE, provide bug issue ID + type `bug` |
| **Review** | Review PRs targeting integration branches |
| **Test Env** | Deploy integration branch to Test Env for validation |
| **Release** | Create release branch manually after Test Env validation |
| **Production** | Merge release branch → master after production deployment |
| **Documentation** | Run `/tdgs-aidlc-post-deployment-docs-sync` to update knowledge base |
| **KB Sync (Project)** | After PRs merge to `project/*`, optionally run `/tdgs-aidlc-update-context-docs {issue_id}` from the project branch to regenerate KB docs. Recommended before assigning new work or after batch merges. See [Post-Merge KB Sync](project-implementation.md#post-merge-kb-sync-em-responsibility). |
