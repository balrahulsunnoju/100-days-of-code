#!/usr/bin/env node

/**
 * Test: Prompt Structure Validation
 *
 * Validates the internal structure and conventions of each prompt file:
 *   - Required sections/headings per prompt type
 *   - Input parameter declarations
 *   - Error handling / bail conditions documented
 *   - Output format specifications
 *   - CLI tool dependency declarations
 *   - Branch pattern conventions
 *   - Security-sensitive patterns
 *   - i2a-config.yml consumption patterns
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness');

const PROMPTS_DIR = path.join(h.ROOT, 'src', 'prompts');

// ──────────────────────────────────────────────────────────────────────────
// Prompt classification and expected patterns
// ──────────────────────────────────────────────────────────────────────────

/**
 * Each prompt entry defines what structural elements are expected.
 * Keys: required headings/sections, required patterns, forbidden patterns.
 */
const PROMPT_RULES = {
  'tdgs-aidlc-commit': {
    desc: 'Multi-repo commit assistant',
    mustContain: [/conventional commit/i, /\bgit\b/i, /branch/i],
    mustHaveSection: [/security|sensitive/i, /error|abort|bail/i],
    mustReferenceConfig: true,
    branchPattern: true,
    behavioralChecks: [
      {
        id: 'sensitivity-list',
        pattern: /\.env[\s,].*\.pem|\.pem[\s,].*\.env|\.env.*credentials.*\.key/is,
        passMsg: 'Has file sensitivity checklist (.env, .pem, .key)',
        failMsg: 'Missing detailed file sensitivity checklist',
      },
      {
        id: 'branch-protection',
        pattern: /master.*release\/.*feature\/.*hotfix\/|protected\s+branch/is,
        passMsg: 'Has branch protection list (master, release, feature, hotfix)',
        failMsg: 'Missing branch protection list',
      },
    ],
  },
  'tdgs-aidlc-create-pull-request': {
    desc: 'PR creation',
    mustContain: [/\bgh\b.*\bpr\b|\bpr\b.*\bgh\b/i, /branch/i, /draft/i],
    mustHaveSection: [/error|abort|bail/i],
    mustReferenceConfig: false,
    branchPattern: true,
    behavioralChecks: [
      {
        id: 'multi-repo-scan',
        pattern: /detect.*repositor|scan.*repositor|multi.*repo/i,
        passMsg: 'Has multi-repo scan workflow',
        failMsg: 'Missing multi-repo scan workflow',
      },
      {
        id: 'all-cancel',
        pattern: /["']all["'].*["']cancel["']|enter.*all|enter.*cancel/is,
        passMsg: 'Has "all"/"cancel" user options',
        failMsg: 'Missing "all"/"cancel" user options',
      },
    ],
  },
  'tdgs-aidlc-generate-kb': {
    desc: 'Generate customized KB documentation prompt via auto-detection',
    mustContain: [/knowledge.base/i, /template/i, /auto-detect|workspace.features/i],
    mustHaveSection: [/error|abort|bail/i, /output|example/i],
    mustReferenceConfig: true,
    branchPattern: false,
    behavioralChecks: [
      { id: 'bmad-config', pattern: /_bmad\/bmm\/config\.yaml/, passMsg: 'Reads BMAD config from _bmad/bmm/config.yaml', failMsg: 'Missing BMAD config path reference' },
      { id: 'apigee-modes', pattern: /auto.*git.*exports|git.*exports.*false/is, passMsg: 'Documents all Apigee detection modes', failMsg: 'Missing Apigee detection mode documentation' },
      { id: 'template-path', pattern: /src\/templates\/kb-generation-prompt\.md/, passMsg: 'References KB template file path', failMsg: 'Missing KB template file path' },
      { id: 'user-confirm', pattern: /proceed/i, passMsg: 'Has user confirmation step', failMsg: 'Missing user confirmation step' },
    ],
  },
  'tdgs-aidlc-generate-api-tests': {
    desc: 'API test generation',
    mustContain: [/api.test|test.*api/i, /coverage/i, /knowledge.base/i],
    mustHaveSection: [/output|report|result/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'coverage-target', pattern: /coverage_target/, passMsg: 'Has coverage_target parameter', failMsg: 'Missing coverage_target parameter' },
      { id: 'two-phase', pattern: /two-phase.*discovery|Phase 1.*Phase 2/is, passMsg: 'Has two-phase discovery', failMsg: 'Missing two-phase discovery' },
      { id: 'auto-scaffold', pattern: /auto-invoke.*setup-api-tests|missing.*setup-api-tests/i, passMsg: 'Has auto-scaffold fallback', failMsg: 'Missing auto-scaffold fallback' },
      { id: 'workspace-confirm', pattern: /workspace.*scan|confirm.*service|confirm.*repo/i, passMsg: 'Has workspace scan & confirmation', failMsg: 'Missing workspace scan & confirmation' },
      { id: 'skill-delegation', pattern: /i2a-skills\/tdgs-aidlc-generate-api-tests/i, passMsg: 'Delegates to generate-api-tests skill', failMsg: 'Missing generate-api-tests skill delegation' },
    ],
  },
  'tdgs-aidlc-generate-functional-tests': {
    desc: 'Functional test generation',
    mustContain: [/playwright/i, /functional.test|e2e/i, /coverage/i],
    mustHaveSection: [/output|report|result/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'coverage-target', pattern: /coverage_target/, passMsg: 'Has coverage_target parameter', failMsg: 'Missing coverage_target parameter' },
      { id: 'two-phase', pattern: /two-phase.*discovery|Phase 1.*Phase 2/is, passMsg: 'Has two-phase discovery', failMsg: 'Missing two-phase discovery' },
      { id: 'auto-scaffold', pattern: /auto-invoke.*setup-functional-tests|missing.*setup-functional-tests/i, passMsg: 'Has auto-scaffold fallback', failMsg: 'Missing auto-scaffold fallback' },
      { id: 'workspace-confirm', pattern: /workspace.*scan|confirm.*repo/i, passMsg: 'Has workspace scan & confirmation', failMsg: 'Missing workspace scan & confirmation' },
      { id: 'skill-delegation', pattern: /i2a-skills\/tdgs-aidlc-generate-functional-tests/i, passMsg: 'Delegates to generate-functional-tests skill', failMsg: 'Missing generate-functional-tests skill delegation' },
    ],
  },
  'tdgs-aidlc-generate-unit-tests': {
    desc: 'Unit test generation',
    mustContain: [/unit.test/i, /coverage/i],
    mustHaveSection: [/output|report|result/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'coverage-target', pattern: /coverage_target/, passMsg: 'Has coverage_target parameter', failMsg: 'Missing coverage_target parameter' },
      { id: 'two-phase', pattern: /two-phase.*discovery|Phase 1.*Phase 2/is, passMsg: 'Has two-phase discovery', failMsg: 'Missing two-phase discovery' },
      { id: 'auto-scaffold', pattern: /auto-invoke.*setup-unit-tests|missing.*setup-unit-tests/i, passMsg: 'Has auto-scaffold fallback', failMsg: 'Missing auto-scaffold fallback' },
      { id: 'workspace-confirm', pattern: /workspace.*scan|confirm.*repo/i, passMsg: 'Has workspace scan & confirmation', failMsg: 'Missing workspace scan & confirmation' },
      { id: 'skip-completed', pattern: /skip_completed/, passMsg: 'Has skip_completed resumption support', failMsg: 'Missing skip_completed resumption support' },
      { id: 'skill-delegation', pattern: /i2a-skills\/tdgs-aidlc-generate-unit-tests/i, passMsg: 'Delegates to generate-unit-tests skill', failMsg: 'Missing generate-unit-tests skill delegation' },
    ],
  },
  'tdgs-aidlc-initiate-issue': {
    desc: 'Issue workflow initiation',
    mustContain: [/issue/i, /branch/i, /change.brief/i],
    mustHaveSection: [/error|abort|bail/i, /output|checklist|next.step/i],
    mustReferenceConfig: true,
    branchPattern: true,
  },
  'tdgs-aidlc-install-hooks': {
    desc: 'Pre-commit hook installation',
    mustContain: [/pre-commit/i, /gitleaks/i, /worker.repo/i],
    mustHaveSection: [/error|skip|fail/i],
    mustReferenceConfig: true,
    branchPattern: false,
  },
  'tdgs-aidlc-post-deployment-docs-sync': {
    desc: 'Post-deployment docs sync',
    mustContain: [/release/i, /deployment|deploy/i, /knowledge.base/i],
    mustHaveSection: [/error|abort|bail/i],
    mustReferenceConfig: false,
    branchPattern: true,
  },
  'tdgs-aidlc-pre-check-pull-request': {
    desc: 'Pre-PR CI pipeline check',
    mustContain: [/ci|pipeline|workflow/i, /branch/i],
    mustHaveSection: [/error|fail/i],
    mustReferenceConfig: false,
    branchPattern: true,
  },
  'tdgs-aidlc-prepare-repos': {
    desc: 'Worker repo branch preparation',
    mustContain: [/spec/i, /branch/i, /worker.repo/i],
    mustHaveSection: [/error|abort|bail/i],
    mustReferenceConfig: true,
    branchPattern: true,
  },
  'tdgs-aidlc-reference-sync': {
    desc: 'Reference document sync',
    mustContain: [/common.service|reference/i, /sync/i, /knowledge.base|MCP/i],
    mustHaveSection: [/error|abort|bail/i],
    mustReferenceConfig: true,
    branchPattern: false,
    behavioralChecks: [
      { id: 'mcp-prereq', pattern: /GitHub MCP.*activat|prerequisite.*MCP/is, passMsg: 'Documents GitHub MCP prerequisite', failMsg: 'Missing GitHub MCP prerequisite documentation' },
      { id: 'mcp-tools', pattern: /mcp_github/, passMsg: 'References MCP tool names', failMsg: 'Missing MCP tool name references' },
    ],
  },
  'tdgs-aidlc-setup-api-tests': {
    desc: 'API test scaffold',
    mustContain: [/api.test/i, /scaffold|setup|framework/i],
    mustHaveSection: [/output|structure|tree/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'coverage-target', pattern: /coverage_target/, passMsg: 'Has coverage_target parameter', failMsg: 'Missing coverage_target parameter' },
      { id: 'skill-delegation', pattern: /i2a-skills\/tdgs-aidlc-setup-api-tests/i, passMsg: 'Delegates to setup-api-tests skill', failMsg: 'Missing setup-api-tests skill delegation' },
    ],
  },
  'tdgs-aidlc-setup-functional-tests': {
    desc: 'Functional test scaffold',
    mustContain: [/playwright/i, /functional.test|e2e/i, /scaffold|setup|framework/i],
    mustHaveSection: [/output|structure|tree/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'coverage-target', pattern: /coverage_target/, passMsg: 'Has coverage_target parameter', failMsg: 'Missing coverage_target parameter' },
    ],
  },
  'tdgs-aidlc-setup-unit-tests': {
    desc: 'Unit test scaffold',
    mustContain: [/unit.test/i, /scaffold|setup|framework/i],
    mustHaveSection: [/output|structure/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'coverage-target', pattern: /coverage_target/, passMsg: 'Has coverage_target parameter', failMsg: 'Missing coverage_target parameter' },
    ],
  },
  'tdgs-aidlc-setup-workspace': {
    desc: 'Workspace bootstrap',
    mustContain: [/persona|em|ade/i, /bmad/i, /prerequisite|prereq/i],
    mustHaveSection: [/error|abort|bail/i, /verification|verify/i],
    mustReferenceConfig: true,
    branchPattern: true,
    behavioralChecks: [
      { id: 'prereq-git', pattern: /git --version/, passMsg: 'Checks Git prerequisite', failMsg: 'Missing Git prerequisite check' },
      { id: 'prereq-node', pattern: /node --version/, passMsg: 'Checks Node.js prerequisite', failMsg: 'Missing Node.js prerequisite check' },
      { id: 'prereq-python', pattern: /python3? --version/, passMsg: 'Checks Python prerequisite', failMsg: 'Missing Python prerequisite check' },
      { id: 'prereq-uv', pattern: /uv --version/, passMsg: 'Checks uv prerequisite', failMsg: 'Missing uv prerequisite check' },
      { id: 'prereq-gh', pattern: /gh --version/, passMsg: 'Checks GitHub CLI prerequisite', failMsg: 'Missing GitHub CLI prerequisite check' },
      { id: 'prereq-auth', pattern: /gh auth status/, passMsg: 'Checks GitHub CLI auth', failMsg: 'Missing GitHub CLI auth check' },
    ],
  },
  'tdgs-aidlc-update-context-docs': {
    desc: 'Context doc sync from worker repos',
    mustContain: [/context.doc|context/i, /worker.repo/i, /issue/i],
    mustHaveSection: [/error|abort|bail/i],
    mustReferenceConfig: true,
    branchPattern: true,
  },
  'tdgs-aidlc-ops-runbook': {
    desc: 'Ops runbook update via python-docx',
    mustContain: [/python-docx/i, /runbook/i, /backup|\.bak/i],
    mustHaveSection: [/critical.*rule|guardrail|rule/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'backup-gate', pattern: /\.bak|backup.*before/i, passMsg: 'Has backup-before-edit gate', failMsg: 'Missing backup-before-edit gate' },
      { id: 'evidence-table', pattern: /evidence.*table/i, passMsg: 'Has evidence table requirement', failMsg: 'Missing evidence table requirement' },
      { id: 'anti-hallucination', pattern: /anti-hallucination|no fabrication|G19|G3/i, passMsg: 'Has anti-hallucination guardrail', failMsg: 'Missing anti-hallucination guardrail' },
      { id: 'git-readonly', pattern: /read-only|READ-ONLY/i, passMsg: 'Has git read-only enforcement', failMsg: 'Missing git read-only enforcement' },
    ],
  },
  'tdgs-aidlc-validate-runbook-context': {
    desc: 'Runbook validation',
    mustContain: [/runbook/i, /validation|validate/i, /context/i],
    mustHaveSection: [/report|output/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'output-file', pattern: /runbook-validation-report\.md/, passMsg: 'Has fixed output file: runbook-validation-report.md', failMsg: 'Missing fixed output filename' },
      { id: 'deterministic', pattern: /deterministic|fixed.*categor|exact.*categor/i, passMsg: 'Has deterministic output rules', failMsg: 'Missing deterministic output rules' },
    ],
  },
  'tdgs-aidlc-validate-test-context': {
    desc: 'Test case validation',
    mustContain: [/test.case|manual.test/i, /validation|validate/i, /context/i],
    mustHaveSection: [/report|output/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'output-file', pattern: /test-validation-report\.md/, passMsg: 'Has fixed output file: test-validation-report.md', failMsg: 'Missing fixed output filename' },
      { id: 'severity', pattern: /🔴.*🟡.*🔵.*✅|severity.*categor/is, passMsg: 'Has severity categories (🔴🟡🔵✅)', failMsg: 'Missing severity categories' },
    ],
  },
  'tdgs-aidlc-quick-setup': {
    desc: 'Lightweight BMAD + AIDLC prompt setup',
    mustContain: [/bmad/i, /prerequisite|prereq/i, /prompt/i],
    mustHaveSection: [/error|abort|bail|stop/i, /verification|verify|summary/i],
    mustReferenceConfig: true,
    branchPattern: false,
    behavioralChecks: [
      { id: 'prereq-node', pattern: /node --version/, passMsg: 'Checks Node.js prerequisite', failMsg: 'Missing Node.js prerequisite check' },
      { id: 'prereq-python', pattern: /python3? --version/, passMsg: 'Checks Python prerequisite', failMsg: 'Missing Python prerequisite check' },
      { id: 'prereq-uv', pattern: /uv --version/, passMsg: 'Checks uv prerequisite', failMsg: 'Missing uv prerequisite check' },
      { id: 'version-compare', pattern: /version.*mismatch|compare.*version|installed.*version/i, passMsg: 'Has BMAD version comparison logic', failMsg: 'Missing BMAD version comparison logic' },
      { id: 'legacy-cleanup', pattern: /legacy.*prompt|cleanup.*prompt/i, passMsg: 'Has legacy prompt cleanup step', failMsg: 'Missing legacy prompt cleanup step' },
    ],
  },
  'tdgs-aidlc-initiate-project': {
    desc: 'Project workflow initiation (EM)',
    mustContain: [/issue/i, /branch/i, /project/i],
    mustHaveSection: [/error|abort|bail/i, /output|checklist|result/i],
    mustReferenceConfig: true,
    branchPattern: true,
    behavioralChecks: [
      { id: 'project-branch', pattern: /project\/ghi-/, passMsg: 'Has project/* branch pattern', failMsg: 'Missing project/* branch pattern' },
      { id: 'master-check', pattern: /master.*branch|branch.*master/i, passMsg: 'Verifies master branch requirement', failMsg: 'Missing master branch verification' },
    ],
  },
  'tdgs-aidlc-show-available-stories': {
    desc: 'Read-only story discovery for ADEs',
    mustContain: [/stor/i, /project/i, /sprint/i],
    mustHaveSection: [/error|abort|bail|stop/i, /output|display|result/i],
    mustReferenceConfig: false,
    branchPattern: true,
    behavioralChecks: [
      { id: 'project-branch', pattern: /project\//, passMsg: 'Requires project branch context', failMsg: 'Missing project branch requirement' },
      { id: 'sprint-status', pattern: /sprint-status/, passMsg: 'References sprint-status file', failMsg: 'Missing sprint-status reference' },
    ],
  },
  'tdgs-aidlc-project-course-correction': {
    desc: 'Mid-project course correction orchestrator',
    mustContain: [/bmad-correct-course/i, /sprint.*change|change.*request|course.correct/i, /planning/i],
    mustHaveSection: [/error|abort|bail/i, /output|result/i],
    mustReferenceConfig: true,
    branchPattern: true,
    behavioralChecks: [
      { id: 'bmad-delegation', pattern: /bmad-correct-course/, passMsg: 'Delegates to bmad-correct-course skill', failMsg: 'Missing bmad-correct-course delegation' },
      { id: 'done-immutable', pattern: /done.*immutable|never.*reopen|create.*new.*follow/i, passMsg: 'Has done-story immutability rule', failMsg: 'Missing done-story immutability rule' },
      { id: 'source-types', pattern: /comment.*sub-issue.*document.*url.*inline/is, passMsg: 'Documents all 5 source types', failMsg: 'Missing source type documentation' },
      { id: 'planning-branch', pattern: /planning\/ghi-/, passMsg: 'Uses planning/* branch pattern', failMsg: 'Missing planning/* branch pattern' },
    ],
  },
  'tdgs-aidlc-project-kanban-planning': {
    desc: 'Project kanban planning orchestrator',
    mustContain: [/kanban/i, /sprint-status/i, /bmad-sprint-planning|bmad-create-epics/i],
    mustHaveSection: [/error|abort|bail/i, /output|result/i],
    mustReferenceConfig: false,
    branchPattern: true,
    behavioralChecks: [
      { id: 'skill-delegation', pattern: /i2a-skills\/tdgs-aidlc-project-kanban-planning/i, passMsg: 'Delegates to project-kanban-planning skill', failMsg: 'Missing project-kanban-planning skill delegation' },
      { id: 'prd-prereq', pattern: /prd/i, passMsg: 'Requires PRD as prerequisite', failMsg: 'Missing PRD prerequisite' },
      { id: 'architecture-prereq', pattern: /architecture/i, passMsg: 'Requires architecture doc as prerequisite', failMsg: 'Missing architecture prerequisite' },
    ],
  },
  'tdgs-aidlc-switch': {
    desc: 'Switch workspace to different issue or role',
    mustContain: [/issue/i, /branch/i, /checkout|switch/i],
    mustHaveSection: [/error|abort|bail/i],
    mustReferenceConfig: true,
    branchPattern: true,
    behavioralChecks: [
      { id: 'clean-check', pattern: /clean.*working|uncommitted|dirty/i, passMsg: 'Has clean working tree check', failMsg: 'Missing clean working tree check' },
      { id: 'multi-repo', pattern: /worker.*repo|multi.*repo/i, passMsg: 'Handles multi-repo workspace', failMsg: 'Missing multi-repo handling' },
      { id: 'role-em', pattern: /role.*=.*em|em.*planning/i, passMsg: 'Has EM role branch resolution', failMsg: 'Missing EM role branch resolution' },
      { id: 'role-ade', pattern: /role.*=.*ade|ade.*dev/i, passMsg: 'Has ADE role branch resolution', failMsg: 'Missing ADE role branch resolution' },
    ],
  },
  'tdgs-aidlc-generate-dashboard': {
    desc: 'Generate live HTML sprint dashboard',
    mustContain: [/dashboard/i, /sprint-status/i, /html/i],
    mustHaveSection: [/output|result|confirm/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'skill-delegation', pattern: /i2a-skills\/tdgs-aidlc-sprint-dashboard/i, passMsg: 'Delegates to sprint-dashboard skill', failMsg: 'Missing sprint-dashboard skill delegation' },
      { id: 'skill-installed-bail', pattern: /tdgs-aidlc-sprint-dashboard\/workflow\.md[\s\S]{0,400}does not exist[\s\S]{0,200}quick-setup/i, passMsg: 'BAIL when sprint-dashboard skill missing', failMsg: 'Missing BAIL for uninstalled sprint-dashboard skill' },
      { id: 'http-server', pattern: /http.*server|localhost/i, passMsg: 'Documents local server requirement', failMsg: 'Missing local server instructions' },
    ],
  },
  'tdgs-aidlc-manage-blockers': {
    desc: 'Manage blockers in sprint-status.yaml',
    mustContain: [/blocker/i, /sprint-status/i, /add|resolve|update/i],
    mustHaveSection: [/action|command/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'blocker-schema', pattern: /impact.*high|medium|low/i, passMsg: 'Documents blocker impact levels', failMsg: 'Missing blocker impact levels' },
      { id: 'workflow-delegation', pattern: /manage-blockers\/instructions/i, passMsg: 'Delegates to manage-blockers workflow', failMsg: 'Missing workflow delegation' },
    ],
  },
  'tdgs-aidlc-metrics-report': {
    desc: 'Generate markdown metrics summary report',
    mustContain: [/metric/i, /report/i, /sprint-status/i],
    mustHaveSection: [/output|confirm|content/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'harvey-ball', pattern: /harvey.*ball/i, passMsg: 'References Harvey ball metrics', failMsg: 'Missing Harvey ball reference' },
      { id: 'workflow-delegation', pattern: /sprint-metrics-report\/instructions/i, passMsg: 'Delegates to sprint-metrics-report workflow', failMsg: 'Missing workflow delegation' },
    ],
  },
  'tdgs-aidlc-update-metrics': {
    desc: 'Update sprint-status.yaml with timing and metrics',
    mustContain: [/metric/i, /sprint-status/i, /status/i],
    mustHaveSection: [/command|usage/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'harvey-ball', pattern: /harvey.*ball/i, passMsg: 'References Harvey ball metrics', failMsg: 'Missing Harvey ball reference' },
      { id: 'workflow-delegation', pattern: /update-sprint-metrics\/instructions/i, passMsg: 'Delegates to update-sprint-metrics workflow', failMsg: 'Missing workflow delegation' },
      { id: 'timestamp-utc', pattern: /utc/i, passMsg: 'Specifies UTC timestamps', failMsg: 'Missing UTC timestamp requirement' },
    ],
  },
  'tdgs-aidlc-run-tests': {
    desc: 'Test execution across workspace (unit, API, functional)',
    mustContain: [/unit.*test|test.*unit/i, /playwright|functional/i, /api.*test/i],
    mustHaveSection: [/guardrail|non-negotiable/i, /report|result|summary/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'scope-choice', pattern: /full.suite|issue.scoped|full.*issue/is, passMsg: 'Has full-suite/issue-scoped scope choice', failMsg: 'Missing full-suite/issue-scoped scope choice' },
      { id: 'prerequisite-check', pattern: /setup-\w+.*first|NEVER auto-scaffold/i, passMsg: 'Has prerequisite/scaffold check (G5)', failMsg: 'Missing prerequisite/scaffold check' },
      { id: 'report-chaining', pattern: /exit.code.*preserv|ec=\$\?|exit \$ec/i, passMsg: 'Has exit-code-preserving report chaining (G14)', failMsg: 'Missing exit-code-preserving report chaining' },
      { id: 'pass-rate', pattern: /passRate|pass.rate/i, passMsg: 'Has pass-rate formula', failMsg: 'Missing pass-rate formula' },
      { id: 'anti-hallucination', pattern: /anti.hallucination|NEVER re-classify/i, passMsg: 'Has anti-hallucination guardrails', failMsg: 'Missing anti-hallucination guardrails' },
    ],
  },
  'tdgs-aidlc-setup-testdata': {
    desc: 'Test data catalog and identity pool setup',
    mustContain: [/test.data.*catalog|catalog/i, /identity.*pool/i, /api.*chain/i],
    mustHaveSection: [/guardrail|non-negotiable/i, /output|result/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'catalog-merge', pattern: /merge.*semantic|idempoten/i, passMsg: 'Has catalog merge semantics (G9)', failMsg: 'Missing catalog merge semantics' },
      { id: 'identity-pool', pattern: /PLACEHOLDER_\*/i, passMsg: 'Has PLACEHOLDER_* sentinel documentation', failMsg: 'Missing PLACEHOLDER_* sentinel documentation' },
      { id: 'cross-service-stubs', pattern: /cross.service.*stub|stubs:/i, passMsg: 'Has cross-service stubs block (G7a)', failMsg: 'Missing cross-service stubs block' },
      { id: 'pii-safety', pattern: /PII|gitignore/i, passMsg: 'Has PII safety / gitignore rule (G6)', failMsg: 'Missing PII safety / gitignore rule' },
      { id: 'dashboard-gen', pattern: /dashboard\.html/i, passMsg: 'Has dashboard generation output', failMsg: 'Missing dashboard generation output' },
    ],
  },
  'tdgs-aidlc-help': {
    desc: 'Help and reference command',
    mustContain: [/catalog/i, /workflow/i, /goal|question/i],
    mustHaveSection: [/syntax/i, /instructions/i],
    mustReferenceConfig: false,
    branchPattern: false,
    behavioralChecks: [
      { id: 'skill-delegation', pattern: /i2a-skills\/tdgs-aidlc-help/i, passMsg: 'Delegates to help skill', failMsg: 'Missing help skill delegation' },
      { id: 'mode-routing', pattern: /Mode A.*Mode B.*Mode C.*Mode D/is, passMsg: 'Has 4-mode routing (A/B/C/D)', failMsg: 'Missing 4-mode routing' },
      { id: 'bail-skill-missing', pattern: /BAIL.*help skill not installed/i, passMsg: 'Has BAIL for missing skill', failMsg: 'Missing BAIL for missing help skill' },
      { id: 'read-only', pattern: /read.only|never modif/i, passMsg: 'Declares read-only behavior', failMsg: 'Missing read-only declaration' },
    ],
  },
};

// Branch convention patterns expected across the toolkit
const BRANCH_KEYWORDS = /dev\/|feature\/|hotfix\/|release\/|integration\/|project\/|planning\//;

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

function run() {
  h.section('Prompt Structure Validation');

  for (const [baseName, rules] of Object.entries(PROMPT_RULES)) {
    const fileName = `${baseName}.prompt.md`;
    const fp = path.join(PROMPTS_DIR, fileName);
    if (!fs.existsSync(fp)) {
      h.skip(`PS:${baseName}`, `File missing: ${fileName}`);
      continue;
    }

    const content = h.readContent(fp);
    const shortName = baseName.replace('tdgs-aidlc-', '');

    // Must-contain patterns
    for (const pattern of rules.mustContain) {
      if (pattern.test(content)) {
        h.pass(`PS:${shortName}:contain`, `Contains expected pattern: ${pattern.source.substring(0, 40)}`);
      } else {
        h.fail(`PS:${shortName}:contain`, `Missing expected pattern: ${pattern.source}`, `In: ${fileName}`);
      }
    }

    // Must-have-section patterns (checks if content has headings or labeled areas matching)
    for (const pattern of rules.mustHaveSection) {
      if (pattern.test(content)) {
        h.pass(`PS:${shortName}:section`, `Has section matching: ${pattern.source.substring(0, 30)}`);
      } else {
        h.fail(`PS:${shortName}:section`, `Missing section for: ${pattern.source}`, `In: ${fileName}`);
      }
    }

    // Config reference check
    if (rules.mustReferenceConfig) {
      if (/i2a-config\.yml|i2a-config/i.test(content)) {
        h.pass(`PS:${shortName}:config`, 'References i2a-config.yml');
      } else {
        h.fail(`PS:${shortName}:config`, 'Expected i2a-config.yml reference', `In: ${fileName}`);
      }
    }

    // Branch pattern check
    if (rules.branchPattern) {
      if (BRANCH_KEYWORDS.test(content)) {
        h.pass(`PS:${shortName}:branch`, 'Contains branch naming patterns');
      } else {
        h.fail(`PS:${shortName}:branch`, 'Expected branch naming patterns', `In: ${fileName}`);
      }
    }

    // Behavioral checks (gap coverage)
    if (rules.behavioralChecks) {
      for (const check of rules.behavioralChecks) {
        if (check.pattern.test(content)) {
          h.pass(`PS:${shortName}:${check.id}`, check.passMsg);
        } else {
          h.fail(`PS:${shortName}:${check.id}`, check.failMsg, `In: ${fileName}`);
        }
      }
    }
  }

  // ── Global prompt conventions ──
  h.section('Global Prompt Conventions');

  const allPromptFiles = fs.readdirSync(PROMPTS_DIR).filter((f) => f.endsWith('.prompt.md'));

  for (const fileName of allPromptFiles) {
    const fp = path.join(PROMPTS_DIR, fileName);
    const content = h.readContent(fp);
    const shortName = fileName.replace('tdgs-aidlc-', '').replace('.prompt.md', '');

    // Frontmatter validation: must have mode: agent and non-empty description
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      h.fail(`PS-GLOB:${shortName}:frontmatter`, 'Missing YAML frontmatter', `In: ${fileName}`);
    } else {
      const fm = fmMatch[1];
      const hasMode = /^mode:\s*agent$/m.test(fm);
      const hasDesc = /^description:\s*".+"/m.test(fm);
      if (hasMode && hasDesc) {
        h.pass(`PS-GLOB:${shortName}:frontmatter`, 'Valid frontmatter (mode: agent + description)');
      } else {
        const issues = [];
        if (!hasMode) issues.push('missing mode: agent');
        if (!hasDesc) issues.push('missing or empty description');
        h.fail(`PS-GLOB:${shortName}:frontmatter`, `Invalid frontmatter: ${issues.join(', ')}`, `In: ${fileName}`);
      }
    }

    // No TODO/FIXME/HACK left in prompts (skip legitimate references:
    //   - TODO-PROVIDE-VALUE (sentinel pattern name)
    //   - // TODO(...) in code snippet instructions
    //   - @quarantine + TODO pattern instructions
    //   - WRITE TODO + ASK USER (workflow action label)
    //   - # TODO: (YAML comment template)
    //   - "todo"/"TODO" (quoted references to the word as a forbidden literal)
    //   - fixme (Playwright native test annotation/outcome string)
    //   - Forbidden pattern lists mentioning TODO as a banned literal)
    const contentForTodo = content
      .replace(/TODO-PROVIDE-VALUE/g, '')
      .replace(/WRITE TODO/g, '')
      .replace(/\/\/\s*TODO\b[^\n]*/g, '')
      .replace(/#\s*TODO:/g, '')
      .replace(/`[^`]*TODO[^`]*`/g, '')
      .replace(/`TODO`/g, '')
      .replace(/"todo"/gi, '')
      .replace(/\bfixme\b/g, '');
    if (/\bTODO\b|\bFIXME\b|\bHACK\b/i.test(contentForTodo)) {
      h.fail(`PS-GLOB:${shortName}:todo`, `Contains TODO/FIXME/HACK marker`, `In: ${fileName}`);
    } else {
      h.pass(`PS-GLOB:${shortName}:todo`, 'No TODO/FIXME/HACK markers');
    }

    // No empty code blocks (indicates placeholder content)
    // Match ``` on one line followed immediately by ``` on the next line (truly empty)
    if (/^```\w*\n```/m.test(content)) {
      h.fail(`PS-GLOB:${shortName}:empty-code`, `Contains empty code block`, `In: ${fileName}`);
    } else {
      h.pass(`PS-GLOB:${shortName}:empty-code`, 'No empty code blocks');
    }

    // Pre-flight multi-repo workspace check (critical safety pattern)
    // Skip for alias prompts that delegate to another prompt
    const isAlias = /^>\s*\*\*Alias/m.test(content);
    if (isAlias) {
      h.pass(`PS-GLOB:${shortName}:preflight`, 'Alias prompt — delegates to primary prompt');
    } else if (/Pre-flight Check:\s*Multi-Repository Workspace/i.test(content)) {
      h.pass(`PS-GLOB:${shortName}:preflight`, 'Has Pre-flight Check: Multi-Repository Workspace');
    } else if (/pre-flight/i.test(content)) {
      h.pass(`PS-GLOB:${shortName}:preflight`, 'Has pre-flight check (alternate format)');
    } else {
      h.fail(`PS-GLOB:${shortName}:preflight`, 'Missing Pre-flight Check: Multi-Repository Workspace', `In: ${fileName}`);
    }
  }
}

module.exports = { run };
