#!/usr/bin/env node

/**
 * Test: Workflow Completeness
 *
 * Validates that the documented workflows are complete end-to-end:
 *   - ADE workflow steps are sequential and complete
 *   - EM workflow steps cover full lifecycle
 *   - Test management covers setup → generate → run → report cycle
 *   - Prompt workflow chains are documented and reachable
 *   - Branch naming convention is consistent across all docs
 *   - Security-sensitive patterns are properly documented
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness');

const GUIDES_DIR = path.join(h.ROOT, 'doc');
const PROMPTS_DIR = path.join(h.ROOT, 'src', 'prompts');

// ──────────────────────────────────────────────────────────────────────────
// ADE Workflow Step Completeness
// ──────────────────────────────────────────────────────────────────────────

function testADEWorkflow(content) {
  h.section('ADE Workflow Step Completeness');

  // Expected ADE workflow step sequence
  const expectedSteps = [
    { id: '1', pattern: /step\s*1[:.\s]/i, desc: 'Initiate Issue' },
    { id: '2', pattern: /step\s*2[:.\s]/i, desc: 'Create Spec' },
    { id: '3', pattern: /step\s*3[:.\s]/i, desc: 'Prepare Repos' },
    { id: '4', pattern: /step\s*4[:.\s]/i, desc: 'Quick-Dev' },
    { id: '5', pattern: /step\s*5[:.\s]/i, desc: 'Code Review' },
    { id: '6', pattern: /step\s*6[:.\s]/i, desc: 'Commit' },
    { id: '7', pattern: /step\s*7[:.\s]/i, desc: 'Pre-Check PR' },
    { id: '8', pattern: /step\s*8[:.\s]/i, desc: 'Create PR' },
  ];

  for (const step of expectedSteps) {
    if (step.pattern.test(content)) {
      h.pass(`WF-ADE:${step.id}`, `Step ${step.id} (${step.desc}) documented`);
    } else {
      h.fail(`WF-ADE:${step.id}`, `Missing Step ${step.id} (${step.desc})`);
    }
  }

  // Verify setup content exists (setup steps are now in setup.md with renumbered steps)
  const setupFilePath = path.join(GUIDES_DIR, 'setup.md');
  if (fs.existsSync(setupFilePath)) {
    const setupContent = h.readContent(setupFilePath);
    const setupPatterns = [
      { id: 'workspace', pattern: /create.project.workspace/i },
      { id: 'setup-cmd', pattern: /tdgs-aidlc-setup-workspace/i },
      { id: 'hooks', pattern: /install.*hooks|pre-commit/i },
    ];
    let setupCount = 0;
    for (const step of setupPatterns) {
      if (step.pattern.test(setupContent)) setupCount++;
    }
    if (setupCount === setupPatterns.length) {
      h.pass('WF-ADE:setup', `All ${setupPatterns.length} setup topics documented`);
    } else {
      h.fail('WF-ADE:setup', `Only ${setupCount}/${setupPatterns.length} setup topics found`);
    }
  } else {
    h.fail('WF-ADE:setup', 'setup.md not found');
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Test Management Workflow Completeness
// ──────────────────────────────────────────────────────────────────────────

function testTMGWorkflow(content) {
  h.section('Test Management Workflow Completeness');

  // Must document the full setup → generate → report cycle for each test type
  const testTypes = [
    { name: 'unit', setup: /setup-unit-test/i, generate: /generate-unit-test/i },
    { name: 'api', setup: /setup-api-test/i, generate: /generate-api-test/i },
    { name: 'functional', setup: /setup-functional-test/i, generate: /generate-functional-test/i },
  ];

  for (const tt of testTypes) {
    if (tt.setup.test(content)) {
      h.pass(`WF-TMG:${tt.name}:setup`, `${tt.name} test setup documented`);
    } else {
      h.fail(`WF-TMG:${tt.name}:setup`, `${tt.name} test setup not referenced`);
    }
    if (tt.generate.test(content)) {
      h.pass(`WF-TMG:${tt.name}:generate`, `${tt.name} test generation documented`);
    } else {
      h.fail(`WF-TMG:${tt.name}:generate`, `${tt.name} test generation not referenced`);
    }
  }

  // Coverage target documented
  if (/coverage.*\d+%|\d+%.*coverage|coverage_target/i.test(content)) {
    h.pass('WF-TMG:coverage', 'Coverage targets documented');
  } else {
    h.fail('WF-TMG:coverage', 'No coverage target documentation found');
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Prompt Workflow Chains
// ──────────────────────────────────────────────────────────────────────────

function testPromptChains() {
  h.section('Prompt Workflow Chains');

  /**
   * Verifies that prompts reference their known next-step prompts.
   * This validates the documented workflow chains are intact.
   */
  const chains = [
    {
      from: 'tdgs-aidlc-initiate-issue',
      shouldReference: ['tdgs-aidlc-prepare-repos', 'tdgs-aidlc-commit', 'tdgs-aidlc-create-pull-request'],
    },
    {
      from: 'tdgs-aidlc-prepare-repos',
      shouldReference: ['tdgs-aidlc-commit', 'tdgs-aidlc-create-pull-request'],
    },
    {
      from: 'tdgs-aidlc-setup-workspace',
      shouldReference: ['tdgs-aidlc-install-hooks'],
    },
    {
      from: 'tdgs-aidlc-quick-setup',
      shouldReference: ['tdgs-aidlc-setup-workspace'],
    },
    {
      from: 'tdgs-aidlc-project-course-correction',
      shouldReference: ['tdgs-aidlc-show-available-stories', 'tdgs-aidlc-commit'],
    },
    {
      from: 'tdgs-aidlc-manage-blockers',
      shouldReference: ['tdgs-aidlc-update-metrics', 'tdgs-aidlc-generate-dashboard'],
    },
    {
      from: 'tdgs-aidlc-metrics-report',
      shouldReference: ['tdgs-aidlc-update-metrics', 'tdgs-aidlc-generate-dashboard'],
    },
    {
      from: 'tdgs-aidlc-update-metrics',
      shouldReference: ['tdgs-aidlc-generate-dashboard', 'tdgs-aidlc-manage-blockers'],
    },
    {
      from: 'tdgs-aidlc-generate-api-tests',
      shouldReference: ['tdgs-aidlc-setup-api-tests'],
    },
    {
      from: 'tdgs-aidlc-generate-functional-tests',
      shouldReference: ['tdgs-aidlc-setup-functional-tests'],
    },
    {
      from: 'tdgs-aidlc-generate-unit-tests',
      shouldReference: ['tdgs-aidlc-setup-unit-tests'],
    },
  ];

  for (const chain of chains) {
    const fp = path.join(PROMPTS_DIR, `${chain.from}.prompt.md`);
    if (!fs.existsSync(fp)) {
      h.skip(`WF-CHAIN:${chain.from}`, 'Prompt file missing');
      continue;
    }

    const content = h.readContent(fp);
    const shortFrom = chain.from.replace('tdgs-aidlc-', '');

    for (const target of chain.shouldReference) {
      if (content.includes(target)) {
        h.pass(`WF-CHAIN:${shortFrom}→${target.replace('tdgs-aidlc-', '')}`, 'Chain link present');
      } else {
        h.fail(
          `WF-CHAIN:${shortFrom}→${target.replace('tdgs-aidlc-', '')}`,
          `${chain.from} should reference ${target}`
        );
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Branch Naming Consistency
// ──────────────────────────────────────────────────────────────────────────

function testBranchConventions() {
  h.section('Branch Naming Convention Consistency');

  const files = h.collectFiles(['doc', 'src']);
  const mdFiles = files.filter((f) => f.relPath.endsWith('.md'));

  // Collect all branch pattern examples
  const branchPatterns = {
    dev: /dev\/ghi-\d+-[\w-]+-\w+/,
    feature: /feature\/ghi-\d+-[\w-]+/,
    hotfix: /hotfix\/ghi-\d+-[\w-]+/,
    project: /project\/ghi-\d+-[\w-]+/,
    release: /release\/\d+\.\d+\.\d+/,
  };

  // The ADE guide should document all branch types
  const refPath = path.join(GUIDES_DIR, 'reference.md');
  if (fs.existsSync(refPath)) {
    const ade = h.readContent(refPath);
    for (const [type, pattern] of Object.entries(branchPatterns)) {
      if (pattern.test(ade) || new RegExp(`${type}\\/`, 'i').test(ade)) {
        h.pass(`WF-BRANCH:${type}`, `ADE guide documents ${type}/ branch pattern`);
      } else {
        h.fail(`WF-BRANCH:${type}`, `ADE guide missing ${type}/ branch pattern`);
      }
    }
  }

  // Prompts that reference branches should use consistent patterns
  const branchPrompts = [
    'tdgs-aidlc-commit',
    'tdgs-aidlc-create-pull-request',
    'tdgs-aidlc-initiate-issue',
    'tdgs-aidlc-prepare-repos',
    'tdgs-aidlc-pre-check-pull-request',
  ];

  for (const name of branchPrompts) {
    const fp = path.join(PROMPTS_DIR, `${name}.prompt.md`);
    if (!fs.existsSync(fp)) continue;
    const content = h.readContent(fp);
    const shortName = name.replace('tdgs-aidlc-', '');

    // Must reference dev/ pattern
    if (/dev\//i.test(content)) {
      h.pass(`WF-BRANCH:${shortName}`, `${shortName} references dev/ branch pattern`);
    } else {
      h.fail(`WF-BRANCH:${shortName}`, `${shortName} missing dev/ branch pattern`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Security patterns in prompts
// ──────────────────────────────────────────────────────────────────────────

function testSecurityPatterns() {
  h.section('Security Pattern Coverage');

  // Commit prompt should have security checks
  const commitPath = path.join(PROMPTS_DIR, 'tdgs-aidlc-commit.prompt.md');
  if (fs.existsSync(commitPath)) {
    const content = h.readContent(commitPath);

    if (/secret|credential|password|api.key|token/i.test(content)) {
      h.pass('WF-SEC:commit-sensitive', 'Commit prompt checks for sensitive content');
    } else {
      h.fail('WF-SEC:commit-sensitive', 'Commit prompt missing sensitive content checks');
    }

    if (/delet|remov/i.test(content)) {
      h.pass('WF-SEC:commit-deletion', 'Commit prompt handles deletion safety');
    } else {
      h.fail('WF-SEC:commit-deletion', 'Commit prompt missing deletion safety');
    }
  }

  // Install-hooks should reference gitleaks
  const hooksPath = path.join(PROMPTS_DIR, 'tdgs-aidlc-install-hooks.prompt.md');
  if (fs.existsSync(hooksPath)) {
    const content = h.readContent(hooksPath);

    if (/gitleaks/i.test(content)) {
      h.pass('WF-SEC:gitleaks', 'Install-hooks references gitleaks');
    } else {
      h.fail('WF-SEC:gitleaks', 'Install-hooks missing gitleaks reference');
    }

    if (/pre-commit/i.test(content)) {
      h.pass('WF-SEC:precommit', 'Install-hooks references pre-commit');
    } else {
      h.fail('WF-SEC:precommit', 'Install-hooks missing pre-commit reference');
    }
  }

  // Generate tests should not modify production code
  const testGenerators = [
    'tdgs-aidlc-generate-api-tests',
    'tdgs-aidlc-generate-functional-tests',
    'tdgs-aidlc-generate-unit-tests',
  ];

  for (const name of testGenerators) {
    const fp = path.join(PROMPTS_DIR, `${name}.prompt.md`);
    if (!fs.existsSync(fp)) continue;
    const content = h.readContent(fp);
    const shortName = name.replace('tdgs-aidlc-generate-', '');

    if (/do not modify.*production|production.*code.*(?:not|never)|not.*modify.*source/i.test(content)) {
      h.pass(`WF-SEC:${shortName}-readonly`, `${shortName} test generator has production-code safety rule`);
    } else {
      h.fail(`WF-SEC:${shortName}-readonly`, `${shortName} test generator missing "do not modify production code" constraint`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

function run() {
  // ADE Workflow
  const moPath = path.join(GUIDES_DIR, 'mo-workflow.md');
  const projImplPath = path.join(GUIDES_DIR, 'project-implementation.md');
  const setupPath = path.join(GUIDES_DIR, 'setup.md');
  const adeContent = [moPath, projImplPath, setupPath]
    .filter(p => fs.existsSync(p))
    .map(p => h.readContent(p))
    .join('\n');
  if (adeContent) {
    testADEWorkflow(adeContent);
  }

  // TMG Workflow
  const tmgPath = path.join(GUIDES_DIR, 'test-management.md');
  if (fs.existsSync(tmgPath)) {
    testTMGWorkflow(h.readContent(tmgPath));
  }

  // Prompt chains
  testPromptChains();

  // Branch conventions
  testBranchConventions();

  // Security patterns
  testSecurityPatterns();
}

module.exports = { run };
