#!/usr/bin/env node

/**
 * AIDLC Starter Kit — Complete Test Suite
 *
 * Runs all automated validation checks across the entire toolkit:
 *
 *   1. INVENTORY       — All 33 prompts, 14 guides, config, supporting files exist
 *   2. CROSS-REFS      — Internal anchors, file links, prompt refs, BMAD skill refs
 *   3. PROMPT-STRUCT    — Per-prompt structure, required sections, conventions
 *   4. GUIDE-STRUCT     — Per-guide sections, heading hierarchy, prerequisites
 *   5. VERSION          — Version consistency across VERSION/README/config/changelog
 *   6. WORKFLOW         — Workflow completeness, prompt chains, branch conventions
 *   7. CONTENT-QUALITY  — Forbidden patterns, terminology, placeholders, table format
 *   8. SIMULATION       — Behavioral decision rules (branch, config, prereq, stack)
 *
 * Usage:
 *   node test/test-all.js             # standard output (failures + summary)
 *   node test/test-all.js --verbose   # include passing checks
 *
 * Run individual suites:
 *   node test/test-all.js inventory
 *   node test/test-all.js cross-refs
 *   node test/test-all.js prompts
 *   node test/test-all.js guides
 *   node test/test-all.js versions
 *   node test/test-all.js workflow
 *   node test/test-all.js quality
 *
 * Exit codes: 0 = all pass, 1 = failures found
 */

'use strict';

const h = require('./harness');

// ──────────────────────────────────────────────────────────────────────────
// Module registry
// ──────────────────────────────────────────────────────────────────────────

const SUITES = {
  inventory:    { mod: './test-inventory',            label: 'Starter Kit Inventory' },
  'cross-refs': { mod: './test-cross-references',     label: 'Cross-Reference Integrity' },
  prompts:      { mod: './test-prompt-structure',      label: 'Prompt Structure Validation' },
  guides:       { mod: './test-guide-structure',       label: 'Guide Structure Validation' },
  versions:     { mod: './test-version-consistency',   label: 'Version Consistency' },
  workflow:     { mod: './test-workflow-completeness',  label: 'Workflow Completeness' },
  quality:      { mod: './test-content-quality',       label: 'Content Quality' },
  simulation:   { mod: './test-simulation',            label: 'Behavioral Simulation' },
};

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

function main() {
  // Determine which suites to run
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const selectedKeys = args.length > 0 ? args : Object.keys(SUITES);

  console.log(`${h.FG.bold}AIDLC Starter Kit — Complete Test Suite${h.FG.reset}`);
  console.log(`${h.FG.dim}Root: ${h.ROOT}${h.FG.reset}`);
  console.log(`${h.FG.dim}Suites: ${selectedKeys.join(', ')}${h.FG.reset}`);

  for (const key of selectedKeys) {
    const suite = SUITES[key];
    if (!suite) {
      console.error(`\n${h.FG.red}Unknown suite: ${key}${h.FG.reset}`);
      console.error(`Available: ${Object.keys(SUITES).join(', ')}`);
      process.exit(2);
    }

    console.log(`\n${h.FG.bold}${h.FG.cyan}${'━'.repeat(60)}${h.FG.reset}`);
    console.log(`${h.FG.bold}${h.FG.cyan}  ${suite.label}${h.FG.reset}`);
    console.log(`${h.FG.bold}${h.FG.cyan}${'━'.repeat(60)}${h.FG.reset}`);

    const mod = require(suite.mod);
    mod.run();
  }

  // Print overall summary
  const failCount = h.printSummary('Overall Summary');
  process.exit(failCount > 0 ? 1 : 0);
}

main();
