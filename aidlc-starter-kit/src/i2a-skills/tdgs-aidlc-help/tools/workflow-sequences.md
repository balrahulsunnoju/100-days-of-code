# AIDLC Workflow Sequences

End-to-end workflow sequences for common scenarios. Each sequence shows the commands in order with brief notes on what each step produces.

---

## 1. First-Time Workspace Setup

For a brand-new workspace — run once per machine.

```
Step 1: /tdgs-aidlc-quick-setup
          → Installs BMAD, copies prompts + skills + config

Step 2: /tdgs-aidlc-setup-workspace {em|ade}
          → Full toolchain validation, docs repo setup, i2a-config

Step 3: /tdgs-aidlc-install-hooks
          → Pre-commit hooks (Gitleaks, conventional commit) in all worker repos

Step 4 (optional): /tdgs-aidlc-reference-sync
          → Sync shared-service docs into knowledge base
```

**After setup, you're ready for either EM or ADE workflows.**

---

## 2. M&O Development Cycle (Feature / Hotfix / Bug)

The standard issue-to-PR workflow for maintenance & operations work.

```
Step 1: /tdgs-aidlc-initiate-issue {id} {feature|hotfix|bug}
          → Creates branches in docs repo, generates change-brief or bug-brief

Step 2: /tdgs-aidlc-prepare-repos
          → Creates dev branches in affected worker repos

Step 3: /bmad-quick-dev
          → Streamlined implementation workflow (BMAD)

Step 4: /tdgs-aidlc-commit
          → Conventional commit across all repos with Refs footer

Step 5: /tdgs-aidlc-pre-check-pull-request
          → Triggers CI, reports pass/fail

Step 6: /tdgs-aidlc-create-pull-request
          → Creates PR, requests Copilot review, comments on issue
```

### Switching Between Issues Mid-Work

```
/tdgs-aidlc-commit                 # Commit current work first
/tdgs-aidlc-switch {other_id}      # Switch to a different issue
... work on the other issue ...
/tdgs-aidlc-switch {original_id}   # Switch back
```

---

## 3. Full Project Lifecycle (EM + ADE)

Multi-sprint project from initiation through delivery.

### Phase A: EM — Project Initiation & Planning

```
Step 1: /tdgs-aidlc-initiate-project {id}
          → Creates project/* and planning/* branches, scaffolds docs, generates change-brief

Step 2: /tdgs-aidlc-reference-sync
          → Sync shared-service documentation

Step 3: /bmad-product-brief
          → Create product brief (BMAD)

Step 4: /bmad-create-prd
          → Create product requirements document (BMAD)

Step 5: /bmad-create-architecture
          → Create solution architecture (BMAD)

Step 6: /bmad-create-epics-and-stories
          → Break PRD into epics and stories (BMAD)

Step 7: /bmad-sprint-planning
          → Generate sprint-status.yaml (BMAD)

Step 8: /tdgs-aidlc-project-kanban-planning
          → Generate kanban plan, dashboard, sprint metrics

Step 9: /bmad-create-story
          → Write detailed story specs for ADE handoff (BMAD, repeat per story)
```

### Phase B: ADE — Story Implementation

```
Step 1: /tdgs-aidlc-show-available-stories
          → See which stories are available (dependency-aware)

Step 2: /tdgs-aidlc-prepare-repos {spec-path}
          → Create dev branches in worker repos for the selected story

Step 3: /bmad-dev-story
          → Implement the story (BMAD)

Step 4: /tdgs-aidlc-commit
          → Commit changes

Step 5: /tdgs-aidlc-pre-check-pull-request
          → Run CI

Step 6: /tdgs-aidlc-create-pull-request
          → Open PR
```

**Repeat Phase B for each story.**

### Phase C: EM — Sprint Management (Ongoing)

```
/tdgs-aidlc-update-metrics            # After each story status change
/tdgs-aidlc-manage-blockers add ...   # Track blockers
/tdgs-aidlc-manage-blockers resolve ...  # Resolve blockers
/tdgs-aidlc-metrics-report            # Generate snapshot for stakeholders
/tdgs-aidlc-generate-dashboard        # Regenerate dashboard (structural changes only)
```

### Phase D: EM — Mid-Project Changes (If Needed)

```
Step 1: /tdgs-aidlc-project-course-correction {id} {source}
          → Gather CR, impact analysis, apply approved changes

Step 2: /tdgs-aidlc-project-kanban-planning update
          → Recalculate plan with updated scope

Step 3: /tdgs-aidlc-show-available-stories
          → Review updated story board after changes
```

---

## 4. Testing Pipeline

Set up and generate tests across all three layers.

### 4a: Unit Tests

```
Step 1: /tdgs-aidlc-setup-unit-tests [coverage%]
          → Scaffold test framework per stack

Step 2: /tdgs-aidlc-generate-unit-tests [coverage%] [repo=]
          → Generate hermetic unit tests to coverage target

Step 3: /tdgs-aidlc-run-tests --type unit
          → Execute and generate reports

Step 4: /tdgs-aidlc-commit
          → Commit generated tests
```

### 4b: API Tests

```
Step 1: /tdgs-aidlc-setup-api-tests [coverage%]
          → Scaffold Insomnia collections + runner

Step 2: /tdgs-aidlc-setup-testdata
          → Generate test-data catalog (identity pools, API chains)

Step 3: /tdgs-aidlc-generate-api-tests [service=]
          → Generate and execute API test collections

Step 4: /tdgs-aidlc-run-tests --type api
          → Execute and generate reports

Step 5: /tdgs-aidlc-commit
          → Commit generated tests
```

### 4c: Functional Tests

```
Step 1: /tdgs-aidlc-setup-functional-tests [ui_repo=]
          → Scaffold Playwright + page objects

Step 2: /tdgs-aidlc-setup-testdata
          → Generate test-data catalog (if not done in 4b)

Step 3: /tdgs-aidlc-generate-functional-tests [ui_repo=] [mode=mock]
          → Generate Playwright specs

Step 4: /tdgs-aidlc-run-tests --type functional
          → Execute and generate reports

Step 5: /tdgs-aidlc-commit
          → Commit generated tests
```

### 4d: Full Test Suite Execution

```
/tdgs-aidlc-run-tests --type all --scope full
  → Runs unit + API + functional tests across all repos, generates workspace summary
```

---

## 5. Sprint Management Cycle

Ongoing sprint tracking for EMs during project execution.

```
Daily:
  /tdgs-aidlc-update-metrics          # Update story status + Harvey ball scores
  /tdgs-aidlc-manage-blockers ...     # Track / resolve blockers

Weekly or at milestones:
  /tdgs-aidlc-metrics-report          # Generate metrics snapshot
  /tdgs-aidlc-generate-dashboard      # Regenerate if structure changed

As needed:
  /tdgs-aidlc-project-course-correction ...  # Handle change requests
  /tdgs-aidlc-project-kanban-planning update # Recalculate plan
```

---

## 6. Pre-Deployment Documentation

Before merging release branch to master and deploying to production, update operational runbooks.

```
Step 1: /tdgs-aidlc-ops-runbook {runbook_path}
          → Scans workspace code + existing KB on release branch
          → Updates .docx runbook with change details

Step 2: /tdgs-aidlc-validate-runbook-context
          → Validate runbook against workspace code
```

---

## 7. Post-Deployment Documentation

After merging to master and deploying to production, regenerate the knowledge base.

```
Step 1: /tdgs-aidlc-post-deployment-docs-sync {release} [issues:N,M]
          → Regenerates KB from deployed code, creates PR to master

Step 2: /tdgs-aidlc-validate-test-context
          → Validate test cases against updated business rules

Step 3: Review and merge the KB update PR
```

---

## 8. Knowledge Base Maintenance

Keep context docs aligned with code changes.

```
After code merges to release/project branch:
  /tdgs-aidlc-update-context-docs {id}
    → Scans commits, maps to KB docs, regenerates

After sync:
  /tdgs-aidlc-commit
  /tdgs-aidlc-create-pull-request
    → PR the KB changes for review
```
