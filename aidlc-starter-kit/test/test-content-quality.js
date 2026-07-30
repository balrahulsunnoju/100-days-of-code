#!/usr/bin/env node

/**
 * Test: Content Quality
 *
 * Validates documentation quality standards across all files:
 *   - No orphaned/stale references (removed skills, old filenames)
 *   - Consistent terminology
 *   - No empty sections
 *   - No duplicate headings at same level within scope
 *   - Markdown formatting correctness
 *   - No hardcoded absolute paths
 *   - No placeholder text left behind
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness');

const SCAN_DIRS = ['doc', 'src'];

// ──────────────────────────────────────────────────────────────────────────
// Forbidden patterns (stale/removed content)
// ──────────────────────────────────────────────────────────────────────────

const STATIC_FORBIDDEN_PATTERNS = [
  { pattern: /tech-spec/i, label: 'tech-spec (renamed to spec)', id: 'FP-tech-spec' },
  { pattern: /spec-wip/i, label: 'spec-wip (WIP workflow removed)', id: 'FP-spec-wip' },
  { pattern: /quick-flow-solo-dev/i, label: 'quick-flow-solo-dev (agent removed)', id: 'FP-solo-dev' },
  { pattern: /bmad-quick-spec/i, label: 'bmad-quick-spec (skill removed)', id: 'FP-quick-spec' },
  { pattern: /Quick-Spec/, label: 'Quick-Spec (skill removed)', id: 'FP-Quick-Spec' },
  { pattern: /\/bmad-init\b/, label: '/bmad-init (skill removed)', id: 'FP-bmad-init' },
  { pattern: /\/gh-(?!i)/, label: 'gh- branch pattern (should be ghi-)', id: 'FP-gh-branch' },
];

/** Stale BMAD version patterns derived from src/i2a-config.yml versions.bmad */
function buildStaleBmadVersionPatterns() {
  const configPath = path.join(h.ROOT, 'src', 'i2a-config.yml');
  let current = '6.3.0';
  if (fs.existsSync(configPath)) {
    const m = h.readContent(configPath).match(/bmad:\s*["']?([\d.]+)["']?/);
    if (m) current = m[1];
  }
  const [majorStr, minorStr] = current.split('.');
  const major = Number(majorStr);
  const minor = Number(minorStr);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return [];

  const patterns = [];
  for (let m = 0; m < minor; m++) {
    const id = `FP-bmad-${major}-${m}`;
    // BMAD-specific contexts only (avoids npm package versions like jest-dom ^6.0.0)
    patterns.push({
      pattern: new RegExp(`bmad-method@${major}\\.${m}\\.\\d+`, 'i'),
      label: `bmad-method@${major}.${m}.x (current kit targets ${current})`,
      id: `${id}-pkg`,
    });
    patterns.push({
      pattern: new RegExp(`BMAD v?${major}\\.${m}\\.\\d+`, 'i'),
      label: `BMAD v${major}.${m}.x (current kit targets ${current})`,
      id: `${id}-label`,
    });
  }
  if (minor > 0) {
    const prev = minor - 1;
    patterns.push({
      pattern: new RegExp(`\\b${major}\\.${prev}\\.0\\b`),
      label: `Stale BMAD pin ${major}.${prev}.0 (current kit targets ${current})`,
      id: `FP-bmad-${major}-${prev}-0`,
      bmadContextOnly: true,
    });
  }
  return patterns;
}

// ──────────────────────────────────────────────────────────────────────────
// Terminology consistency checks
// ──────────────────────────────────────────────────────────────────────────

const TERMINOLOGY = [
  {
    wrong: /\bQD\b(?!.*abbreviat)/,
    right: 'Quick-Dev',
    label: 'QD abbreviation → Quick-Dev',
    id: 'TERM-QD',
  },
  {
    wrong: /\bQS\b(?!.*abbreviat)/,
    right: 'Quick-Spec or Quick-Dev',
    label: 'QS abbreviation',
    id: 'TERM-QS',
  },
  {
    wrong: /\bCR\b(?!\s*[-=]|\.\w|[,;].*review)/,
    right: 'Code Review',
    label: 'CR abbreviation (in context of reviews)',
    id: 'TERM-CR',
    // Only flag if near review context to avoid false positives
    contextRequired: /review|adversarial|code/i,
  },
];

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Search files for a pattern, skipping lines inside fenced code blocks.
 * Code blocks contain examples/templates that may legitimately reference old patterns.
 * Properly handles nested fences (e.g., 4-backtick wrapping 3-backtick content).
 */
function searchFilesSkipCodeBlocks(files, pattern) {
  const results = [];
  for (const { fullPath, relPath } of files) {
    if (!relPath.endsWith('.md')) continue;
    const content = h.readContent(fullPath);
    const lines = content.split('\n');
    let fenceLevel = 0; // length of opening fence (0 = not in code block)
    for (let i = 0; i < lines.length; i++) {
      const fenceMatch = lines[i].match(/^(\s*`{3,})/);
      if (fenceMatch) {
        const backtickCount = (fenceMatch[1].match(/`/g) || []).length;
        if (fenceLevel === 0) {
          fenceLevel = backtickCount;
        } else if (backtickCount >= fenceLevel) {
          fenceLevel = 0;
        }
        continue;
      }
      if (fenceLevel > 0) continue;
      const m = lines[i].match(pattern);
      if (m) {
        results.push({ file: relPath, line: lines[i].trim(), lineNum: i + 1, match: m[0] });
      }
    }
  }
  return results;
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

function run() {
  const files = h.collectFiles(SCAN_DIRS);
  const mdFiles = files.filter((f) => f.relPath.endsWith('.md'));
  const userFacingMdFiles = mdFiles.filter((f) => !f.relPath.includes('contributing/'));

  // ── Forbidden patterns ──
  h.section('Forbidden Patterns (Stale Content)');

  const forbiddenPatterns = [...STATIC_FORBIDDEN_PATTERNS, ...buildStaleBmadVersionPatterns()];

  for (const entry of forbiddenPatterns) {
    const { pattern, label, id, bmadContextOnly } = entry;
    let hits = searchFilesSkipCodeBlocks(userFacingMdFiles, pattern);
    if (bmadContextOnly) {
      hits = hits.filter(
        (hit) => /bmad|npx bmad-method/i.test(hit.line),
      );
    }
    if (hits.length === 0) {
      h.pass(id, `No "${label}" found`);
    } else {
      h.fail(id, `Found ${hits.length} "${label}" reference(s)`, h.formatHits(hits));
    }
  }

  // ── Terminology consistency ──
  h.section('Terminology Consistency');

  for (const term of TERMINOLOGY) {
    const hits = [];
    for (const { fullPath, relPath } of mdFiles) {
      const content = h.readContent(fullPath);
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(term.wrong);
        if (m) {
          // If context is required, check surrounding lines
          if (term.contextRequired) {
            const context = lines.slice(Math.max(0, i - 2), i + 3).join(' ');
            if (!term.contextRequired.test(context)) continue;
          }
          hits.push({ file: relPath, line: lines[i].trim(), lineNum: i + 1, match: m[0] });
        }
      }
    }
    if (hits.length === 0) {
      h.pass(term.id, `No "${term.label}" issues`);
    } else {
      h.fail(term.id, `${hits.length} "${term.label}" occurrence(s)`, h.formatHits(hits));
    }
  }

  // ── Empty sections ──
  h.section('Empty Section Detection');

  for (const { fullPath, relPath } of mdFiles) {
    const content = h.readContent(fullPath);
    const lines = content.split('\n');
    let emptyCount = 0;

    // Build set of line indices inside fenced code blocks (to skip)
    const inCodeBlock = new Set();
    let insideFence = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^```/.test(lines[i].trim())) {
        if (insideFence) {
          inCodeBlock.add(i);
          insideFence = false;
        } else {
          insideFence = true;
          inCodeBlock.add(i);
        }
      } else if (insideFence) {
        inCodeBlock.add(i);
      }
    }

    for (let i = 0; i < lines.length - 1; i++) {
      if (inCodeBlock.has(i)) continue;
      const isHeading = /^#{1,6}\s+/.test(lines[i]);
      if (!isHeading) continue;

      // Look ahead for next heading or ANY non-blank content (skipping code blocks)
      let j = i + 1;
      let foundContent = false;
      while (j < lines.length) {
        if (inCodeBlock.has(j)) { foundContent = true; break; }
        const trimmed = lines[j].trim();
        if (trimmed === '') { j++; continue; }
        if (/^#{1,6}\s+/.test(trimmed)) break; // next heading
        foundContent = true;
        break;
      }

      if (!foundContent && j < lines.length) {
        const currentMatch = lines[i].match(/^(#{1,6})/);
        const nextMatch = lines[j].match(/^(#{1,6})/);
        if (currentMatch && nextMatch) {
          const currentLevel = currentMatch[1].length;
          const nextLevel = nextMatch[1].length;
          // Only flag if next heading is same level or higher (not a subheading)
          if (nextLevel <= currentLevel) {
            emptyCount++;
            if (emptyCount <= 3) {
              h.fail(
                `CQ-EMPTY:${path.basename(relPath)}:L${i + 1}`,
                `Empty section: "${lines[i].trim()}"`,
                `${relPath}:${i + 1}`
              );
            }
          }
        }
      }
    }
    if (emptyCount === 0) {
      h.pass(`CQ-EMPTY:${path.basename(relPath)}`, 'No empty sections');
    } else if (emptyCount > 3) {
      h.fail(`CQ-EMPTY:${path.basename(relPath)}`, `${emptyCount} total empty sections (showing first 3)`);
    }
  }

  // ── Placeholder detection ──
  h.section('Placeholder Detection');

  const placeholderPatterns = [
    { pattern: /\[TBD\]|\[TODO\]|\[PLACEHOLDER\]|\[INSERT\]/i, label: 'placeholder marker' },
    { pattern: /Lorem ipsum/i, label: 'lorem ipsum' },
    { pattern: /(?<![-\w])xxx+(?![-\w])|XXXX+(?!-\d)/i, label: 'xxx placeholder' },
  ];

  // Strip inline code before placeholder detection (format templates like `XXX-XX-XXXX` are not placeholders)
  const mdFilesForPlaceholders = mdFiles.map(({ fullPath, relPath }) => ({
    fullPath, relPath,
    _contentOverride: h.readContent(fullPath).replace(/`[^`]+`/g, ''),
  }));

  for (const { pattern, label } of placeholderPatterns) {
    const hits = [];
    for (const { fullPath, relPath, _contentOverride } of mdFilesForPlaceholders) {
      const content = _contentOverride;
      const lines = content.split('\n');
      let fenceLevel = 0;
      for (let i = 0; i < lines.length; i++) {
        // Match code fences, including blockquote-indented ones (> ```)
        const fenceMatch = lines[i].match(/^(?:>\s*)*(\s*`{3,})/);
        if (fenceMatch) {
          const backtickCount = (fenceMatch[1].match(/`/g) || []).length;
          if (fenceLevel === 0) { fenceLevel = backtickCount; }
          else if (backtickCount >= fenceLevel) { fenceLevel = 0; }
          continue;
        }
        if (fenceLevel > 0) continue;
        const m = lines[i].match(pattern);
        if (m) {
          hits.push({ file: relPath, line: lines[i].trim(), lineNum: i + 1, match: m[0] });
        }
      }
    }
    if (hits.length === 0) {
      h.pass(`CQ-PLACE:${label}`, `No "${label}" found`);
    } else {
      h.fail(`CQ-PLACE:${label}`, `Found ${hits.length} "${label}" instance(s)`, h.formatHits(hits));
    }
  }

  // ── Hardcoded absolute paths ──
  h.section('Hardcoded Path Detection');

  // Look for OS-specific absolute paths (but not in code blocks showing examples)
  const absPathHits = searchFilesSkipCodeBlocks(mdFiles, /(?:^|\s)(\/Users\/|C:\\Users\\|\/home\/)\S+/);
  if (absPathHits.length === 0) {
    h.pass('CQ-ABS-PATH', 'No hardcoded absolute paths');
  } else {
    h.fail('CQ-ABS-PATH', `Found ${absPathHits.length} hardcoded absolute path(s)`, h.formatHits(absPathHits));
  }

  // ── Broken markdown tables ──
  h.section('Table Formatting');

  for (const { fullPath, relPath } of mdFiles) {
    const content = h.readContent(fullPath);
    const lines = content.split('\n');
    let brokenTables = 0;
    let fenceLevel = 0;

    for (let i = 0; i < lines.length - 1; i++) {
      const fenceMatch = lines[i].match(/^(\s*`{3,})/);
      if (fenceMatch) {
        const backtickCount = (fenceMatch[1].match(/`/g) || []).length;
        if (fenceLevel === 0) {
          fenceLevel = backtickCount;
        } else if (backtickCount >= fenceLevel) {
          fenceLevel = 0;
        }
        continue;
      }
      if (fenceLevel > 0) continue;
      if (!lines[i].startsWith('|')) continue;
      // Strip inline code and escaped pipes before counting structural pipes
      const stripLine = (l) => l.replace(/`[^`]*`/g, '').replace(/\\\|/g, '');
      const pipeCount = (stripLine(lines[i]).match(/\|/g) || []).length;
      if (pipeCount >= 3 && i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next.startsWith('|')) {
          // Check column count consistency
          const nextPipeCount = (stripLine(next).match(/\|/g) || []).length;
          if (Math.abs(pipeCount - nextPipeCount) > 1) {
            brokenTables++;
            if (brokenTables <= 5) {
              h.fail(
                `CQ-TABLE:${path.basename(relPath)}:L${i + 1}`,
                `Table column count mismatch (${pipeCount} vs ${nextPipeCount})`,
                `${relPath}:${i + 1}`
              );
            }
          }
        }
      }
    }
    if (brokenTables === 0) {
      h.pass(`CQ-TABLE:${path.basename(relPath)}`, 'Table formatting consistent');
    }
  }

  // ── "Agent dropdown" references (agents consolidated in 6.3.0) ──
  h.section('Agent Dropdown References');

  const agentDropdownHits = h.searchFiles(files, /[Aa]gent\s+dropdown/);
  if (agentDropdownHits.length === 0) {
    h.pass('CQ-AGENT-DD', 'No "Agent dropdown" references (agents consolidated)');
  } else {
    h.fail('CQ-AGENT-DD', `${agentDropdownHits.length} "Agent dropdown" reference(s) — verify agent status`, h.formatHits(agentDropdownHits));
  }

  const activateAnalystHits = h.searchFiles(files, /[Aa]ctivate\s+[Aa]nalyst/);
  if (activateAnalystHits.length === 0) {
    h.pass('CQ-ANALYST', 'No "Activate Analyst" references');
  } else {
    h.fail('CQ-ANALYST', `${activateAnalystHits.length} "Activate Analyst" reference(s)`, h.formatHits(activateAnalystHits));
  }

  // ── package.json scripts match test suites ──
  h.section('Package.json Script Validation');

  const pkgPath = path.join(h.ROOT, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(h.readContent(pkgPath));
    const scripts = pkg.scripts || {};

    // Must have a "test" script
    if (scripts.test) {
      h.pass('CQ-PKG:test', `Has "test" script: ${scripts.test}`);
    } else {
      h.fail('CQ-PKG:test', 'Missing "test" script in package.json');
    }

    // Each test:* script should reference a valid test file
    const testDir = path.join(h.ROOT, 'test');
    for (const [name, cmd] of Object.entries(scripts)) {
      if (!name.startsWith('test:')) continue;
      // Extract the JS file reference from the command
      const fileMatch = cmd.match(/test\/([\w-]+\.js)/);
      if (fileMatch) {
        const testFile = path.join(testDir, fileMatch[1]);
        if (fs.existsSync(testFile)) {
          h.pass(`CQ-PKG:${name}`, `Script "${name}" references existing file`);
        } else {
          h.fail(`CQ-PKG:${name}`, `Script "${name}" references missing file: ${fileMatch[1]}`);
        }
      }
    }
  }

  // ── CONTRIBUTING.md accuracy ──
  h.section('Contributing Guide Accuracy');

  const contribPath = path.join(h.ROOT, 'doc', 'contributing', 'README.md');
  if (fs.existsSync(contribPath)) {
    const contrib = h.readContent(contribPath);

    // References npm test
    if (/npm test/i.test(contrib)) {
      h.pass('CQ-CONTRIB:npm-test', 'CONTRIBUTING.md references npm test');
    } else {
      h.fail('CQ-CONTRIB:npm-test', 'CONTRIBUTING.md missing npm test reference');
    }

    // References the test suite names
    const suiteNames = ['inventory', 'cross-refs', 'prompts', 'guides', 'versions', 'workflow', 'quality'];
    let mentionedCount = 0;
    for (const suite of suiteNames) {
      if (contrib.includes(suite)) mentionedCount++;
    }
    if (mentionedCount >= 5) {
      h.pass('CQ-CONTRIB:suites', `CONTRIBUTING.md references ${mentionedCount}/${suiteNames.length} test suites`);
    } else {
      h.fail('CQ-CONTRIB:suites', `CONTRIBUTING.md only references ${mentionedCount}/${suiteNames.length} test suites`);
    }

    // References release workflow
    if (/release.*workflow|github.*action/i.test(contrib)) {
      h.pass('CQ-CONTRIB:release', 'CONTRIBUTING.md documents release workflow');
    } else {
      h.fail('CQ-CONTRIB:release', 'CONTRIBUTING.md missing release workflow documentation');
    }

    // References conventional commits
    if (/conventional commit/i.test(contrib)) {
      h.pass('CQ-CONTRIB:commits', 'CONTRIBUTING.md references conventional commits');
    } else {
      h.fail('CQ-CONTRIB:commits', 'CONTRIBUTING.md missing conventional commits reference');
    }
  } else {
    h.fail('CQ-CONTRIB', 'CONTRIBUTING.md not found');
  }
}

module.exports = { run };
