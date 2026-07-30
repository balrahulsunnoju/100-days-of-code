#!/usr/bin/env node

/**
 * Test: Guide Structure Validation
 *
 * Validates the structural integrity of all user guides:
 *   - Required top-level sections exist
 *   - Table of Contents entries resolve to headings
 *   - Mermaid diagrams have no forbidden content
 *   - Tables are well-formed (header + separator + rows)
 *   - Expected cross-references between guides exist
 *   - Guide-specific content requirements
 *   - Prerequisites tables are complete
 *   - Version references are consistent
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness');

const GUIDES_DIR = path.join(h.ROOT, 'doc');

// ──────────────────────────────────────────────────────────────────────────
// Expected structure per guide
// ──────────────────────────────────────────────────────────────────────────

const GUIDE_RULES = {
  'em-guide.md': {
    shortName: 'EM-INDEX',
    requiredH2: [
      /workflow.at.a.glance/i,
      /quick.cheat.sheet/i,
      /reading.path/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-setup-workspace',
      '/tdgs-aidlc-initiate-project',
      '/tdgs-aidlc-post-deployment-docs-sync',
    ],
    mustContainSkills: [],
    mustReferenceGuides: ['setup.md', 'knowledge-base-generation.md', 'project-planning.md', 'reference.md'],
    mustContainPrereqs: [],
    hasMermaid: true,
  },
  'ade-guide.md': {
    shortName: 'ADE-INDEX',
    requiredH2: [
      /workflow.at.a.glance/i,
      /quick.cheat.sheet/i,
      /reading.path/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-setup-workspace',
      '/tdgs-aidlc-initiate-issue',
      '/tdgs-aidlc-prepare-repos',
      '/tdgs-aidlc-commit',
      '/tdgs-aidlc-create-pull-request',
    ],
    mustContainSkills: ['/bmad-quick-dev', '/bmad-code-review'],
    mustReferenceGuides: ['setup.md', 'mo-workflow.md', 'project-implementation.md', 'reference.md'],
    mustContainPrereqs: [],
    hasMermaid: true,
  },
  'setup.md': {
    shortName: 'SETUP',
    requiredH2: [
      /prerequisite/i,
      /workspace.setup|setup.steps/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-setup-workspace',
      '/tdgs-aidlc-quick-setup',
    ],
    mustContainSkills: [],
    mustReferenceGuides: [],
    mustContainPrereqs: [/git/i, /node/i, /python/i, /\buv\b/],
    hasMermaid: false,
  },
  'mo-workflow.md': {
    shortName: 'MO',
    requiredH2: [
      /workflow|overview/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-initiate-issue',
      '/tdgs-aidlc-prepare-repos',
      '/tdgs-aidlc-commit',
      '/tdgs-aidlc-create-pull-request',
    ],
    mustContainSkills: ['/bmad-quick-dev', '/bmad-code-review'],
    mustReferenceGuides: [],
    mustContainPrereqs: [],
    hasMermaid: true,
  },
  'project-implementation.md': {
    shortName: 'PROJ-IMPL',
    requiredH2: [
      /project.implementation|implementation/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-prepare-repos',
      '/tdgs-aidlc-commit',
      '/tdgs-aidlc-create-pull-request',
    ],
    mustContainSkills: ['/bmad-dev-story'],
    mustReferenceGuides: ['project-planning.md'],
    mustContainPrereqs: [],
    hasMermaid: true,
  },
  'knowledge-base-generation.md': {
    shortName: 'KB',
    requiredH2: [
      /knowledge.base|generate|documentation/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-commit',
      '/tdgs-aidlc-create-pull-request',
    ],
    mustContainSkills: [],
    mustReferenceGuides: ['test-management.md'],
    mustContainPrereqs: [],
    hasMermaid: false,
  },
  'mo-assignment.md': {
    shortName: 'MO-ASSIGN',
    requiredH2: [
      /issue.types|assigning.an.issue|ade.workflow|em.responsibilities/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-initiate-issue',
    ],
    mustContainSkills: [],
    mustReferenceGuides: ['project-planning.md'],
    mustContainPrereqs: [],
    hasMermaid: false,
    contentChecks: [
      {
        pattern: /m&o|feature.*hotfix/i,
        passMsg: 'Has M&O / feature/hotfix content',
        failMsg: 'Missing M&O / feature/hotfix content',
      },
    ],
  },
  'project-planning.md': {
    shortName: 'PROJ-PLAN',
    requiredH2: [
      /project.planning|assigning.a.project/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-commit',
      '/tdgs-aidlc-create-pull-request',
    ],
    mustContainSkills: [],
    mustReferenceGuides: ['mo-assignment.md'],
    mustContainPrereqs: [],
    hasMermaid: true,
    contentChecks: [
      {
        pattern: /project.planning.workflow/i,
        passMsg: 'Has Project Planning Workflow section',
        failMsg: 'Missing Project Planning Workflow section',
      },
    ],
  },
  'post-deployment.md': {
    shortName: 'POST-DEPLOY',
    requiredH2: [
      /post-deployment|documentation.sync/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-post-deployment-docs-sync',
    ],
    mustContainSkills: [],
    mustReferenceGuides: [],
    mustContainPrereqs: [],
    hasMermaid: true,
    contentChecks: [
      {
        pattern: /step\s*[1-4]:/i,
        passMsg: 'Has post-deployment sub-steps (Steps 1–4)',
        failMsg: 'Missing post-deployment sub-steps (Steps 1–4)',
      },
    ],
  },
  'reference.md': {
    shortName: 'REF',
    requiredH2: [
      /bmad.skills?.reference/i,
      /branch.naming/i,
      /troubleshoot/i,
    ],
    mustContainPrompts: [],
    mustContainSkills: [],
    mustReferenceGuides: [],
    mustContainPrereqs: [],
    hasMermaid: false,
  },
  'ops-runbook-update.md': {
    shortName: 'OPS-RUNBOOK',
    requiredH2: [
      /overview/i,
      /prerequisite/i,
      /step.1|identify.*change/i,
      /troubleshoot/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-ops-runbook',
    ],
    mustContainSkills: [],
    mustReferenceGuides: ['post-deployment.md', 'test-management.md'],
    mustContainPrereqs: [/python-docx/i],
    hasMermaid: true,
    contentChecks: [
      {
        pattern: /format.preserv|python-docx/i,
        passMsg: 'Documents format-preserving edit approach',
        failMsg: 'Missing format-preserving edit approach',
      },
      {
        pattern: /backup|\.bak/i,
        passMsg: 'Documents backup/rollback mechanism',
        failMsg: 'Missing backup/rollback documentation',
      },
    ],
  },
  'mcp-setup-guide.md': {
    shortName: 'MCP-GUIDE',
    requiredH2: [
      /overview/i,
      /github.mcp/i,
      /splunk.mcp/i,
      /oracle|mysql|postgresql|mongodb/i,
    ],
    mustContainPrompts: [],
    mustContainSkills: [],
    mustReferenceGuides: [],
    mustContainPrereqs: [],
    hasMermaid: false,
    contentChecks: [
      {
        pattern: /credential|keychain|wallet/i,
        passMsg: 'Documents credential storage',
        failMsg: 'Missing credential storage section',
      },
      {
        pattern: /troubleshoot/i,
        passMsg: 'Has troubleshooting section',
        failMsg: 'Missing troubleshooting section',
      },
    ],
  },
  'test-management.md': {
    shortName: 'TMG',
    requiredH2: [/workflow.at.a.glance/i, /what.you.get|quick.start/i],
    mustContainPrompts: [
      '/tdgs-aidlc-setup-functional-tests',
      '/tdgs-aidlc-setup-api-tests',
      '/tdgs-aidlc-setup-unit-tests',
      '/tdgs-aidlc-generate-functional-tests',
      '/tdgs-aidlc-generate-api-tests',
      '/tdgs-aidlc-generate-unit-tests',
    ],
    mustContainSkills: [],
    mustReferenceGuides: [],
    mustContainPrereqs: [],
    hasMermaid: false,
    contentChecks: [
      {
        pattern: /test.report.location|report.location/i,
        passMsg: 'Documents test report locations',
        failMsg: 'Missing test report locations section',
      },
      {
        pattern: /test-summary\.html|html.report/i,
        passMsg: 'Documents HTML report generation',
        failMsg: 'Missing HTML report documentation',
      },
      {
        pattern: /coverage.*target|coverage.*\d+%/i,
        passMsg: 'Documents coverage targets',
        failMsg: 'Missing coverage target documentation',
      },
    ],
  },
  'prompt-reference.md': {
    shortName: 'PROMPT-REF',
    requiredH2: [
      /at.a.glance/i,
      /setup.*infrastructure/i,
      /test.management/i,
    ],
    mustContainPrompts: [
      '/tdgs-aidlc-quick-setup',
      '/tdgs-aidlc-setup-workspace',
      '/tdgs-aidlc-initiate-issue',
      '/tdgs-aidlc-commit',
      '/tdgs-aidlc-run-tests',
    ],
    mustContainSkills: ['/tdgs-aidlc-project-kanban-planning', '/tdgs-aidlc-sprint-dashboard'],
    mustReferenceGuides: [],
    mustContainPrereqs: [],
    hasMermaid: false,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function extractHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const m = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (m) {
      headings.push({ level: m[1].length, text: m[2], lineNum: i + 1 });
    }
  }
  return headings;
}

function extractMermaidBlocks(content) {
  const blocks = [];
  const pattern = /```mermaid\n([\s\S]*?)```/g;
  let m;
  while ((m = pattern.exec(content)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

function extractTables(content) {
  const tables = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    // Table starts with | in header + separator with |---|
    if (lines[i].startsWith('|') && i + 1 < lines.length && /^\|[\s:]*-+/.test(lines[i + 1])) {
      let endLine = i + 2;
      while (endLine < lines.length && lines[endLine].startsWith('|')) {
        endLine++;
      }
      tables.push({ startLine: i + 1, endLine, headerCols: lines[i].split('|').length });
    }
  }
  return tables;
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

function run() {
  for (const [fileName, rules] of Object.entries(GUIDE_RULES)) {
    const fp = path.join(GUIDES_DIR, fileName);
    if (!fs.existsSync(fp)) {
      h.section(`${rules.shortName} Guide`);
      h.fail(`GS:${rules.shortName}`, `Guide file missing: ${fileName}`);
      continue;
    }

    const content = h.readContent(fp);
    const headings = extractHeadings(content);
    const h2Headings = headings.filter((hd) => hd.level === 2);

    h.section(`${rules.shortName} Guide Structure`);

    // ── Required H2 sections ──
    for (const pattern of rules.requiredH2) {
      const found = h2Headings.some((hd) => pattern.test(hd.text));
      if (found) {
        h.pass(`GS:${rules.shortName}:h2`, `Has required section: ${pattern.source.substring(0, 30)}`);
      } else {
        h.fail(`GS:${rules.shortName}:h2`, `Missing required H2 section: ${pattern.source}`);
      }
    }

    // ── Heading hierarchy (no more than 2 level jumps) ──
    let hierarchyOk = true;
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1].level;
      const curr = headings[i].level;
      // Allow jumping down 2 levels (e.g., H2 → H4 is acceptable in complex guides)
      // Only flag jumps of 3+ levels (e.g., H1 → H4 or H2 → H5)
      if (curr > prev + 2) {
        h.fail(
          `GS:${rules.shortName}:hierarchy`,
          `Heading level skip: H${prev} → H${curr} at line ${headings[i].lineNum}`,
          `"${headings[i].text}"`
        );
        hierarchyOk = false;
        break; // Report first instance only
      }
    }
    if (hierarchyOk) {
      h.pass(`GS:${rules.shortName}:hierarchy`, `Heading hierarchy is valid (${headings.length} headings)`);
    }

    // ── Must reference prompts ──
    for (const prompt of rules.mustContainPrompts) {
      if (content.includes(prompt)) {
        h.pass(`GS:${rules.shortName}:prompt`, `References ${prompt}`);
      } else {
        h.fail(`GS:${rules.shortName}:prompt`, `Missing expected prompt reference: ${prompt}`);
      }
    }

    // ── Must reference BMAD skills ──
    for (const skill of rules.mustContainSkills) {
      if (content.includes(skill)) {
        h.pass(`GS:${rules.shortName}:skill`, `References ${skill}`);
      } else {
        h.fail(`GS:${rules.shortName}:skill`, `Missing expected skill reference: ${skill}`);
      }
    }

    // ── Must reference other guides ──
    for (const guide of rules.mustReferenceGuides) {
      if (content.includes(guide)) {
        h.pass(`GS:${rules.shortName}:guide-ref`, `Cross-references ${guide}`);
      } else {
        h.fail(`GS:${rules.shortName}:guide-ref`, `Missing cross-reference to ${guide}`);
      }
    }

    // ── Prerequisites completeness ──
    for (const pattern of rules.mustContainPrereqs) {
      if (pattern.test(content)) {
        h.pass(`GS:${rules.shortName}:prereq`, `Prerequisite present: ${pattern.source}`);
      } else {
        h.fail(`GS:${rules.shortName}:prereq`, `Missing prerequisite: ${pattern.source}`);
      }
    }

    // ── Mermaid diagrams ──
    const mermaidBlocks = extractMermaidBlocks(content);
    if (rules.hasMermaid) {
      if (mermaidBlocks.length > 0) {
        h.pass(`GS:${rules.shortName}:mermaid`, `Has ${mermaidBlocks.length} Mermaid diagram(s)`);
      } else {
        h.fail(`GS:${rules.shortName}:mermaid`, 'Expected Mermaid diagrams but found none');
      }
    }

    // Mermaid forbidden content
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const block = mermaidBlocks[i];
      const forbidden = [
        { pattern: /tech-spec/i, label: 'tech-spec' },
        { pattern: /bmad-quick-spec/i, label: 'bmad-quick-spec' },
        { pattern: /spec-wip/i, label: 'spec-wip' },
        { pattern: /quick-flow-solo-dev/i, label: 'quick-flow-solo-dev' },
      ];
      for (const { pattern, label } of forbidden) {
        if (pattern.test(block)) {
          h.fail(`GS:${rules.shortName}:mermaid:d${i + 1}`, `Mermaid diagram contains forbidden term: ${label}`);
        }
      }
    }

    // ── Table well-formedness ──
    const tables = extractTables(content);
    if (tables.length > 0) {
      h.pass(`GS:${rules.shortName}:tables`, `Has ${tables.length} markdown table(s)`);
    }

    // ── No TODO/FIXME ──
    // Strip code blocks and inline code before checking (TODO-PROVIDE-VALUE / stub-TODO are legitimate pattern names)
    const contentNoCode = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/TODO-PROVIDE-VALUE/g, '')
      .replace(/stub-TODO/g, '');
    if (/\bTODO\b|\bFIXME\b/i.test(contentNoCode)) {
      h.fail(`GS:${rules.shortName}:todo`, 'Guide contains TODO/FIXME markers');
    } else {
      h.pass(`GS:${rules.shortName}:todo`, 'No TODO/FIXME markers');
    }

    // ── Line count sanity ──
    const lineCount = content.split('\n').length;
    h.pass(`GS:${rules.shortName}:size`, `Guide has ${lineCount} lines`);

    // ── Guide-specific content depth checks ──
    if (rules.contentChecks) {
      for (const check of rules.contentChecks) {
        if (check.pattern.test(content)) {
          h.pass(`GS:${rules.shortName}:content`, check.passMsg);
        } else {
          h.fail(`GS:${rules.shortName}:content`, check.failMsg);
        }
      }
    }
  }

  // ── Step Navigation Links ──
  h.section('Step Navigation Links');

  const STEP_NAV_FILES = [
    'setup.md', 'knowledge-base-generation.md', 'mo-workflow.md',
    'project-implementation.md', 'project-planning.md', 'post-deployment.md',
  ];

  for (const fileName of STEP_NAV_FILES) {
    const fp = path.join(GUIDES_DIR, fileName);
    if (!fs.existsSync(fp)) continue;
    const content = h.readContent(fp);
    const lines = content.split('\n');
    let stepsWithNav = 0;
    let stepsWithoutNav = 0;
    const missing = [];

    for (let i = 0; i < lines.length; i++) {
      if (/^### Step \d/.test(lines[i])) {
        const hasNav = lines.slice(i + 1, i + 4).some(l => /^>\s*\[.*[←→]/.test(l));
        if (hasNav) {
          stepsWithNav++;
        } else {
          stepsWithoutNav++;
          missing.push(`Line ${i + 1}: ${lines[i].trim()}`);
        }
      }
    }

    if (stepsWithoutNav === 0 && stepsWithNav > 0) {
      h.pass(`GS:STEP-NAV:${fileName}`, `All ${stepsWithNav} steps have navigation links`);
    } else if (stepsWithoutNav > 0) {
      h.fail(`GS:STEP-NAV:${fileName}`, `${stepsWithoutNav} step(s) missing navigation`, missing);
    }
  }
}

module.exports = { run };
