#!/usr/bin/env node

/**
 * Test: Starter Kit Inventory
 *
 * Verifies the core structure of the AIDLC toolkit:
 *   - All 33 prompt files exist
 *   - All 14 user guides exist
 *   - Configuration file exists with required keys
 *   - Prompt files follow naming convention
 *   - All prompt files have frontmatter/metadata headers
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness');

const PROMPTS_DIR = path.join(h.ROOT, 'src', 'prompts');
const GUIDES_DIR = path.join(h.ROOT, 'doc');

// ──────────────────────────────────────────────────────────────────────────
// Expected prompt inventory (all 33)
// ──────────────────────────────────────────────────────────────────────────

const EXPECTED_PROMPTS = [
  'tdgs-aidlc-commit.prompt.md',
  'tdgs-aidlc-create-pull-request.prompt.md',
  'tdgs-aidlc-generate-api-tests.prompt.md',
  'tdgs-aidlc-generate-dashboard.prompt.md',
  'tdgs-aidlc-generate-functional-tests.prompt.md',
  'tdgs-aidlc-generate-kb.prompt.md',
  'tdgs-aidlc-generate-unit-tests.prompt.md',
  'tdgs-aidlc-help.prompt.md',
  'tdgs-aidlc-initiate-issue.prompt.md',
  'tdgs-aidlc-initiate-project.prompt.md',
  'tdgs-aidlc-install-hooks.prompt.md',
  'tdgs-aidlc-manage-blockers.prompt.md',
  'tdgs-aidlc-metrics-report.prompt.md',
  'tdgs-aidlc-ops-runbook.prompt.md',
  'tdgs-aidlc-post-deployment-docs-sync.prompt.md',
  'tdgs-aidlc-pre-check-pull-request.prompt.md',
  'tdgs-aidlc-prepare-repos.prompt.md',
  'tdgs-aidlc-quick-setup.prompt.md',
  'tdgs-aidlc-reference-sync.prompt.md',
  'tdgs-aidlc-run-tests.prompt.md',
  'tdgs-aidlc-setup-api-tests.prompt.md',
  'tdgs-aidlc-setup-functional-tests.prompt.md',
  'tdgs-aidlc-setup-testdata.prompt.md',
  'tdgs-aidlc-setup-unit-tests.prompt.md',
  'tdgs-aidlc-setup-workspace.prompt.md',
  'tdgs-aidlc-show-available-stories.prompt.md',
  'tdgs-aidlc-project-course-correction.prompt.md',
  'tdgs-aidlc-project-kanban-planning.prompt.md',
  'tdgs-aidlc-switch.prompt.md',
  'tdgs-aidlc-update-context-docs.prompt.md',
  'tdgs-aidlc-update-metrics.prompt.md',
  'tdgs-aidlc-validate-runbook-context.prompt.md',
  'tdgs-aidlc-validate-test-context.prompt.md',
];

// ──────────────────────────────────────────────────────────────────────────
// Expected guides
// ──────────────────────────────────────────────────────────────────────────

const EXPECTED_GUIDES = [
  'em-guide.md',
  'ade-guide.md',
  'setup.md',
  'mcp-setup-guide.md',
  'knowledge-base-generation.md',
  'mo-assignment.md',
  'mo-workflow.md',
  'project-planning.md',
  'project-implementation.md',
  'post-deployment.md',
  'ops-runbook-update.md',
  'test-management.md',
  'reference.md',
  'prompt-reference.md',
];

// ──────────────────────────────────────────────────────────────────────────
// Config required keys
// ──────────────────────────────────────────────────────────────────────────

const CONFIG_FILE = path.join(h.ROOT, 'src', 'i2a-config.yml');
const CONFIG_REQUIRED_KEYS = ['versions', 'issues', 'worker_repos', 'common_repos'];

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

function run() {
  h.section('Prompt File Inventory');

  // Prompt directory exists
  if (!fs.existsSync(PROMPTS_DIR)) {
    h.fail('INV-P0', `Prompt directory missing: src/prompts/`);
    return;
  }
  h.pass('INV-P0', 'Prompt directory exists');

  // Each expected prompt file exists
  for (const name of EXPECTED_PROMPTS) {
    const fp = path.join(PROMPTS_DIR, name);
    if (fs.existsSync(fp)) {
      h.pass(`INV-P:${name}`, `Prompt exists: ${name}`);
    } else {
      h.fail(`INV-P:${name}`, `Missing prompt: ${name}`);
    }
  }

  // No unexpected files (must follow naming convention)
  const EXCLUDED_PROMPTS = [
    'tdgs-aidlc-rom-estimate.prompt.md',
  ];
  const excludedPromptSet = new Set(EXCLUDED_PROMPTS);
  const actual = fs.readdirSync(PROMPTS_DIR).filter(
    (f) => f.endsWith('.prompt.md') && !excludedPromptSet.has(f)
  );
  for (const name of actual) {
    if (!name.startsWith('tdgs-aidlc-')) {
      h.fail('INV-P-NAMING', `Prompt file does not follow tdgs-aidlc-* naming: ${name}`);
    }
  }

  // Detect unexpected prompt files not in EXPECTED_PROMPTS
  const expectedSet = new Set(EXPECTED_PROMPTS);
  const unexpected = actual.filter((f) => !expectedSet.has(f));
  if (unexpected.length === 0) {
    h.pass('INV-P-UNEXPECTED', 'No unexpected prompt files on disk');
  } else {
    h.fail('INV-P-UNEXPECTED', `${unexpected.length} unexpected prompt file(s) not in EXPECTED_PROMPTS`, unexpected);
  }

  // Count check
  if (actual.length === EXPECTED_PROMPTS.length) {
    h.pass('INV-P-COUNT', `Prompt count matches: ${actual.length}`);
  } else {
    h.fail('INV-P-COUNT', `Expected ${EXPECTED_PROMPTS.length} prompts, found ${actual.length}`);
  }

  // ── Guides ──
  h.section('User Guide Inventory');

  for (const name of EXPECTED_GUIDES) {
    const fp = path.join(GUIDES_DIR, name);
    if (fs.existsSync(fp)) {
      h.pass(`INV-G:${name}`, `Guide exists: ${name}`);
    } else {
      h.fail(`INV-G:${name}`, `Missing guide: ${name}`);
    }
  }

  // ── Config ──
  h.section('Configuration File');

  if (!fs.existsSync(CONFIG_FILE)) {
    h.fail('INV-CFG', 'Missing: src/i2a-config.yml');
    return;
  }
  h.pass('INV-CFG', 'i2a-config.yml exists');

  const cfg = h.readContent(CONFIG_FILE);
  for (const key of CONFIG_REQUIRED_KEYS) {
    if (new RegExp(`^${key}:`, 'm').test(cfg)) {
      h.pass(`INV-CFG:${key}`, `Config has top-level key: ${key}`);
    } else {
      h.fail(`INV-CFG:${key}`, `Config missing top-level key: ${key}`);
    }
  }

  // BMAD version is present
  const vMatch = cfg.match(/bmad:\s*["']?(\d+\.\d+\.\d+)["']?/);
  if (vMatch) {
    h.pass('INV-CFG:bmad-ver', `BMAD version in config: ${vMatch[1]}`);
  } else {
    h.fail('INV-CFG:bmad-ver', 'Config missing versions.bmad semver');
  }

  // ── Prompt metadata ──
  h.section('Prompt Metadata Validation');

  for (const name of EXPECTED_PROMPTS) {
    const fp = path.join(PROMPTS_DIR, name);
    if (!fs.existsSync(fp)) continue;

    const content = h.readContent(fp);
    const prefix = `INV-META:${name.replace('tdgs-aidlc-', '').replace('.prompt.md', '')}`;

    // Must start with frontmatter (---) or have a top-level heading
    const hasFrontmatter = content.startsWith('---');
    const hasHeading = /^#\s+/m.test(content);
    if (hasFrontmatter || hasHeading) {
      h.pass(prefix, `Has metadata/heading`);
    } else {
      h.fail(prefix, `No frontmatter or heading in ${name}`);
    }

    // Non-trivial content (> 50 lines) — skip for alias prompts
    const isAlias = /^>\s*\*\*Alias/m.test(content);
    const lineCount = content.split('\n').length;
    if (isAlias) {
      h.pass(`${prefix}-size`, `Alias prompt (${lineCount} lines) — size check skipped`);
    } else if (lineCount >= 50) {
      h.pass(`${prefix}-size`, `Content substantial (${lineCount} lines)`);
    } else {
      h.fail(`${prefix}-size`, `Suspiciously short: ${lineCount} lines in ${name}`);
    }
  }

  // ── Supporting files ──
  h.section('Supporting Files');

  const supportFiles = [
    { rel: 'VERSION', desc: 'VERSION file' },
    { rel: 'NEXT_VERSION', desc: 'NEXT_VERSION file' },
    { rel: 'CHANGELOG.md', desc: 'CHANGELOG.md' },
    { rel: 'README.md', desc: 'README.md' },
    { rel: 'CONTRIBUTING.md', desc: 'CONTRIBUTING.md' },
    { rel: '.github/pull_request_template.md', desc: 'PR template' },
    { rel: '.github/workflows/release.yml', desc: 'Release workflow' },
    { rel: 'package.json', desc: 'package.json' },
  ];

  for (const { rel, desc } of supportFiles) {
    const fp = path.join(h.ROOT, rel);
    if (fs.existsSync(fp)) {
      h.pass(`INV-SUP:${rel}`, `${desc} exists`);
    } else {
      h.fail(`INV-SUP:${rel}`, `Missing: ${desc}`);
    }
  }

  // ── i2a-skills ──
  h.section('Custom Skills Inventory');

  const EXPECTED_SKILLS = [
    {
      name: 'tdgs-aidlc-project-kanban-planning',
      requiredFiles: ['SKILL.md', 'workflow.md'],
    },
    {
      name: 'tdgs-aidlc-sprint-dashboard',
      requiredFiles: ['SKILL.md', 'workflow.md', 'templates/dashboard-template.html', 'tools/metrics-calculator.md', 'tools/yaml-format-spec.md'],
    },
    {
      name: 'tdgs-aidlc-setup-api-tests',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
        'templates/test-runner.js.template',
        'templates/generate-report.js.template',
        'templates/lint-collection.js.template',
        'templates/audit-coverage.js.template',
        'templates/audit-config.json.template',
        'tools/runner-contract.md',
        'tools/insomnia-unit-test-examples.md',
      ],
    },
    {
      name: 'tdgs-aidlc-generate-api-tests',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
        'templates/insomnia-unit-test-resources.json.template',
        'templates/results-json-shape.example.json',
        'tools/guardrails.md',
        'tools/preflight-catalog.md',
        'tools/preflight-ground-truth.md',
        'tools/discovery.md',
        'tools/generation-rules.md',
        'tools/execution-and-reports.md',
        'tools/constraints-and-phase5.md',
        'tools/pre-write-contract.md',
        'tools/post-generation-checks.md',
        'tools/field-derivation-hierarchy.md',
        'tools/unit-test-code-patterns.md',
        'scripts/post-generation-gate.mjs',
      ],
    },
    {
      name: 'tdgs-aidlc-setup-unit-tests',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
        'tools/java-scaffold.md',
        'tools/javascript-scaffold.md',
        'tools/guardrails.md',
      ],
    },
    {
      name: 'tdgs-aidlc-generate-unit-tests',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
        'tools/discovery.md',
        'tools/generation-rules.md',
        'tools/guardrails.md',
        'tools/pre-write-contract.md',
        'tools/post-generation-checks.md',
        'tools/preflight-checks.md',
        'tools/constraints-and-augmentations.md',
        'tools/execution-and-reports.md',
      ],
    },
    {
      name: 'tdgs-aidlc-setup-functional-tests',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
        'tools/scaffold-structure.md',
        'tools/component-detection.md',
        'tools/fixtures-and-helpers.md',
        'tools/flow-descriptors.md',
        'tools/preflight-and-discovery.md',
        'tools/verification-and-docs.md',
      ],
    },
    {
      name: 'tdgs-aidlc-generate-functional-tests',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
        'tools/discovery.md',
        'tools/gap-analysis.md',
        'tools/guardrails.md',
        'tools/pre-write-contract.md',
        'tools/post-generation-checks.md',
        'tools/preflight-checks.md',
        'tools/preflight-ground-truth.md',
        'tools/execution-and-reports.md',
        'tools/phase-4-augmentations.md',
      ],
    },
    {
      name: 'tdgs-aidlc-help',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
        'tools/catalog-data.md',
        'tools/workflow-sequences.md',
      ],
    },
    {
      name: 'tdgs-aidlc-ops-runbook',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
      ],
    },
    {
      name: 'tdgs-aidlc-setup-testdata',
      requiredFiles: [
        'SKILL.md',
        'workflow.md',
        'tools/guardrails.md',
        'tools/ground-truth-hierarchy.md',
        'tools/discovery.md',
        'tools/data-collection.md',
        'tools/catalog-generation.md',
        'tools/dashboard-generation.md',
        'tools/ledger-and-schemas.md',
        'tools/hard-rules.md',
      ],
    },
  ];

  const skillsDir = path.join(h.ROOT, 'src', 'i2a-skills');
  if (!fs.existsSync(skillsDir)) {
    h.fail('INV-SK0', 'Skills directory missing: src/i2a-skills/');
  } else {
    h.pass('INV-SK0', 'Skills directory exists');

    for (const skill of EXPECTED_SKILLS) {
      const skillDir = path.join(skillsDir, skill.name);
      if (!fs.existsSync(skillDir)) {
        h.fail(`INV-SK:${skill.name}`, `Missing skill directory: ${skill.name}/`);
        continue;
      }
      h.pass(`INV-SK:${skill.name}`, `Skill directory exists: ${skill.name}/`);

      for (const file of skill.requiredFiles) {
        const fp = path.join(skillDir, file);
        if (fs.existsSync(fp)) {
          h.pass(`INV-SK:${skill.name}:${file}`, `Has ${file}`);
        } else {
          h.fail(`INV-SK:${skill.name}:${file}`, `Missing required file: ${skill.name}/${file}`);
        }
      }
    }
  }

  // ── Unexpected skills ──
  h.section('Unexpected Skills Check');

  const EXCLUDED_SKILLS = [
    'tdgs-aidlc-delivery-metrics-dashboard',
    'tdgs-aidlc-rom-estimate',
  ];

  if (fs.existsSync(skillsDir)) {
    const expectedSkillNames = new Set(EXPECTED_SKILLS.map((s) => s.name));
    const excludedSet = new Set(EXCLUDED_SKILLS);
    const onDisk = fs.readdirSync(skillsDir).filter((entry) => {
      const full = path.join(skillsDir, entry);
      return fs.statSync(full).isDirectory();
    });
    const unexpectedSkills = onDisk.filter(
      (d) => !expectedSkillNames.has(d) && !excludedSet.has(d)
    );
    if (unexpectedSkills.length === 0) {
      h.pass('INV-SK-UNEXPECTED', 'No unexpected skill directories on disk');
    } else {
      h.fail(
        'INV-SK-UNEXPECTED',
        `${unexpectedSkills.length} unexpected skill directory(ies) not in EXPECTED_SKILLS`,
        unexpectedSkills
      );
    }
  }

  // ── Config schema depth ──
  h.section('Configuration Schema Validation');

  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = h.readContent(CONFIG_FILE);

    // versions.bmad nested under versions:
    if (/^versions:\s*\n\s+bmad:/m.test(cfg)) {
      h.pass('INV-CFG-SCHEMA:versions.bmad', 'versions.bmad is nested under versions:');
    } else {
      h.fail('INV-CFG-SCHEMA:versions.bmad', 'versions.bmad not properly nested under versions:');
    }

    // versions.bmad value is semver format
    const bmadMatch = cfg.match(/bmad:\s*"([^"]+)"/);
    if (bmadMatch && /^\d+\.\d+\.\d+$/.test(bmadMatch[1])) {
      h.pass('INV-CFG-SCHEMA:versions.bmad-semver', `versions.bmad is valid semver: ${bmadMatch[1]}`);
    } else {
      h.fail('INV-CFG-SCHEMA:versions.bmad-semver', 'versions.bmad is not valid semver (expected N.N.N)');
    }

    // issues.repository nested under issues:
    if (/^issues:\s*\n\s+repository:/m.test(cfg)) {
      h.pass('INV-CFG-SCHEMA:issues.repository', 'issues.repository is nested under issues:');
    } else {
      h.fail('INV-CFG-SCHEMA:issues.repository', 'issues.repository not properly nested under issues:');
    }

    // issues.repository value is empty or owner/repo format
    const repoMatch = cfg.match(/repository:\s*"([^"]*)"/);
    if (repoMatch && (repoMatch[1] === '' || /^[\w.-]+\/[\w.-]+$/.test(repoMatch[1]))) {
      h.pass('INV-CFG-SCHEMA:issues.repository-format', 'issues.repository is valid (empty or owner/repo)');
    } else {
      h.fail('INV-CFG-SCHEMA:issues.repository-format', 'issues.repository should be empty or owner/repo format');
    }

    // worker_repos is a top-level key
    if (/^worker_repos:/m.test(cfg)) {
      h.pass('INV-CFG-SCHEMA:worker_repos', 'worker_repos key exists at top level');
    } else {
      h.fail('INV-CFG-SCHEMA:worker_repos', 'Missing worker_repos top-level key');
    }

    // common_services is a top-level key (for reference-sync)
    if (/^common_services:/m.test(cfg)) {
      h.pass('INV-CFG-SCHEMA:common_services', 'common_services key exists at top level');
    } else {
      h.fail('INV-CFG-SCHEMA:common_services', 'Missing common_services top-level key');
    }

    // Config has instructive comments
    const commentCount = (cfg.match(/^#/gm) || []).length;
    if (commentCount >= 5) {
      h.pass('INV-CFG-SCHEMA:comments', `Config has ${commentCount} comment lines`);
    } else {
      h.fail('INV-CFG-SCHEMA:comments', `Config has only ${commentCount} comment lines (expected ≥5 for documentation)`);
    }
  }

  // ── Release workflow structure ──
  h.section('Release Workflow Validation');

  const releasePath = path.join(h.ROOT, '.github', 'workflows', 'release.yml');
  if (fs.existsSync(releasePath)) {
    const wf = h.readContent(releasePath);

    // Triggers: push to master
    if (/push:\s*\n\s+branches:[\s\S]*?master/m.test(wf)) {
      h.pass('INV-WF:push-trigger', 'Release workflow triggers on push to master');
    } else {
      h.fail('INV-WF:push-trigger', 'Release workflow missing push-to-master trigger');
    }

    // Triggers: workflow_dispatch
    if (/workflow_dispatch:/m.test(wf)) {
      h.pass('INV-WF:manual-trigger', 'Release workflow supports manual dispatch');
    } else {
      h.fail('INV-WF:manual-trigger', 'Release workflow missing workflow_dispatch trigger');
    }

    // version_bump input with patch/minor/major
    if (/version_bump[\s\S]*?patch[\s\S]*?minor[\s\S]*?major/m.test(wf)) {
      h.pass('INV-WF:version-bump', 'Release workflow has patch/minor/major version bump options');
    } else {
      h.fail('INV-WF:version-bump', 'Release workflow missing version bump options');
    }

    // NEXT_VERSION override support
    if (/NEXT_VERSION/m.test(wf)) {
      h.pass('INV-WF:next-version', 'Release workflow references NEXT_VERSION file');
    } else {
      h.fail('INV-WF:next-version', 'Release workflow missing NEXT_VERSION override support');
    }

    if (/paths-ignore:[\s\S]*?NEXT_VERSION/m.test(wf)) {
      h.pass('INV-WF:next-version-ignore', 'NEXT_VERSION is in paths-ignore (prevents release loops)');
    } else {
      h.fail('INV-WF:next-version-ignore', 'NEXT_VERSION not in paths-ignore — clearing it may re-trigger the workflow');
    }

    if (/Clear NEXT_VERSION/i.test(wf)) {
      h.pass('INV-WF:next-version-clear', 'Workflow clears NEXT_VERSION after release');
    } else {
      h.fail('INV-WF:next-version-clear', 'Workflow missing NEXT_VERSION clear step');
    }

    // Key steps
    const requiredSteps = [
      { pattern: /Update VERSION/i, desc: 'Updates VERSION file' },
      { pattern: /Update README/i, desc: 'Updates README badge' },
      { pattern: /Update CHANGELOG/i, desc: 'Updates CHANGELOG' },
      { pattern: /Create Git tag|git tag/i, desc: 'Creates git tag' },
      { pattern: /Create GitHub Release/i, desc: 'Creates GitHub Release' },
    ];

    for (const step of requiredSteps) {
      if (step.pattern.test(wf)) {
        h.pass(`INV-WF:step`, `Workflow ${step.desc}`);
      } else {
        h.fail(`INV-WF:step`, `Workflow missing: ${step.desc}`);
      }
    }
  }
}

module.exports = { run };
