#!/usr/bin/env node

/**
 * Test: Simulation — Behavioral Decision Rules
 *
 * Tests deterministic decision logic extracted from all 31 AIDLC prompts.
 * Covers the full EM and ADE workflow chains without requiring an LLM.
 *
 * Test ID prefixes:
 *   SIM-BRANCH   Branch validation & naming
 *   SIM-INPUT    Input parsing & validation
 *   SIM-CFG      Config validation
 *   SIM-PREREQ   Prerequisite checks
 *   SIM-SENS     File sensitivity detection
 *   SIM-DEL      File deletion detection
 *   SIM-OS       OS detection & package manager
 *   SIM-STACK    Stack detection & framework mapping
 *   SIM-COV      Coverage target resolution
 *   SIM-PR       PR targeting & formatting
 *   SIM-COMMIT   Conventional commit rules
 *   SIM-URL      Worker repo URL parsing
 *   SIM-MAP      File-to-context-doc mapping
 *   SIM-VALID    Validation report classification
 *   SIM-WF       Workflow chain prerequisites
 *   SIM-LEGACY   Legacy prompt cleanup
 *   SIM-BRIEF    Change brief generation
 *   SIM-CI       CI failure classification
 *   SIM-API      API test classification
 *   SIM-EXCL     Scan exclusion patterns
 *   SIM-PROJECT  Initiate project rules
 *   SIM-STORIES  Show available stories rules
 *   SIM-SWITCH   Switch issue rules
 */

'use strict';

const h = require('./harness');
const rules = require('./simulation/rules');

function run() {
  // ════════════════════════════════════════════════════════════════════════
  // BRANCH VALIDATION (commit, create-pr, pre-check-pr)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Branch Validation — Commit/Pre-check');

  const protectedBranches = ['master', 'main', 'release/4.0.0', 'feature/ghi-123-foo', 'hotfix/ghi-45-fix'];
  for (const branch of protectedBranches) {
    const r = rules.validateCommitBranch(branch);
    r.action === 'BAIL'
      ? h.pass(`SIM-BRANCH:commit-bail:${branch}`, `BAIL on protected branch "${branch}"`)
      : h.fail(`SIM-BRANCH:commit-bail:${branch}`, `Expected BAIL on "${branch}", got ${r.action}`);
  }

  const validCommitBranches = [
    'dev/ghi-123-foo-user', 'dev/initial-docs-setup', 'dev/ghi-45-critical-fix-janedoe',
    'planning/ghi-42-tabc-app', 'project/ghi-42-tabc-app',
  ];
  for (const branch of validCommitBranches) {
    const r = rules.validateCommitBranch(branch);
    r.action === 'PROCEED'
      ? h.pass(`SIM-BRANCH:commit-ok:${branch}`, `PROCEED on allowed branch "${branch}"`)
      : h.fail(`SIM-BRANCH:commit-ok:${branch}`, `Expected PROCEED on "${branch}", got ${r.action}`);
  }

  // Empty / undefined branch
  {
    const r = rules.validateCommitBranch('');
    r.action === 'BAIL'
      ? h.pass('SIM-BRANCH:commit-empty', 'BAIL on empty branch name')
      : h.fail('SIM-BRANCH:commit-empty', 'Expected BAIL on empty branch');
  }

  // Project branch file restriction
  {
    const allowed = ['sprint-status.yaml', 'implementation-artifacts/sprint-status.yaml', 'planning-artifacts/bug-brief-74.md'];
    const r1 = rules.validateProjectBranchFiles('project/ghi-42-tabc-app', allowed);
    r1.action === 'PROCEED'
      ? h.pass('SIM-BRANCH:project-files-ok', 'PROCEED when all staged files are allowed on project branch')
      : h.fail('SIM-BRANCH:project-files-ok', `Expected PROCEED, got ${r1.action}`);

    const disallowed = ['src/main.js', 'sprint-status.yaml'];
    const r2 = rules.validateProjectBranchFiles('project/ghi-42-tabc-app', disallowed);
    r2.action === 'BAIL'
      ? h.pass('SIM-BRANCH:project-files-bail', 'BAIL when disallowed files staged on project branch')
      : h.fail('SIM-BRANCH:project-files-bail', `Expected BAIL, got ${r2.action}`);

    const r3 = rules.validateProjectBranchFiles('dev/ghi-42-feature-user', ['src/main.js']);
    r3.action === 'PROCEED'
      ? h.pass('SIM-BRANCH:project-files-skip-dev', 'PROCEED on non-project branch (no restriction)')
      : h.fail('SIM-BRANCH:project-files-skip-dev', `Expected PROCEED on dev branch, got ${r3.action}`);

    const r4 = rules.validateProjectBranchFiles('project/ghi-42-tabc-app', []);
    r4.action === 'PROCEED'
      ? h.pass('SIM-BRANCH:project-files-empty', 'PROCEED when no files staged')
      : h.fail('SIM-BRANCH:project-files-empty', `Expected PROCEED on empty staged files, got ${r4.action}`);
  }

  h.section('Branch Validation — PR Source');

  for (const branch of protectedBranches) {
    const r = rules.validatePrSourceBranch(branch);
    r.action === 'BAIL'
      ? h.pass(`SIM-BRANCH:pr-src-bail:${branch}`, `BAIL on PR source "${branch}"`)
      : h.fail(`SIM-BRANCH:pr-src-bail:${branch}`, `Expected BAIL on "${branch}"`);
  }

  const validPrSourceBranches = ['dev/ghi-123-foo-user', 'dev/initial-docs-setup', 'planning/ghi-42-tabc-app'];
  for (const branch of validPrSourceBranches) {
    const r = rules.validatePrSourceBranch(branch);
    r.action === 'PROCEED'
      ? h.pass(`SIM-BRANCH:pr-src-ok:${branch}`, `PROCEED on PR source "${branch}"`)
      : h.fail(`SIM-BRANCH:pr-src-ok:${branch}`, `Expected PROCEED on "${branch}"`);
  }

  h.section('Branch Validation — PR Target');

  const validTargets = [
    'feature/ghi-123-zip-code-fix',
    'hotfix/ghi-45-urgent-patch',
    'feature/initial-docs-setup',
    'project/ghi-42-tabc-app',
  ];
  for (const target of validTargets) {
    const r = rules.validatePrTargetBranch(target);
    r.action === 'PROCEED'
      ? h.pass(`SIM-BRANCH:pr-tgt-ok:${target}`, `PROCEED on valid target "${target}"`)
      : h.fail(`SIM-BRANCH:pr-tgt-ok:${target}`, `Expected PROCEED on "${target}"`);
  }

  const invalidTargets = ['master', 'main', 'release/4.0.0', 'dev/ghi-123-foo-user', 'some-random'];
  for (const target of invalidTargets) {
    const r = rules.validatePrTargetBranch(target);
    r.action === 'BAIL'
      ? h.pass(`SIM-BRANCH:pr-tgt-bail:${target}`, `BAIL on invalid target "${target}"`)
      : h.fail(`SIM-BRANCH:pr-tgt-bail:${target}`, `Expected BAIL on "${target}"`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // BRANCH NAME BUILDER (initiate-issue, prepare-repos)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Branch Name Builder');

  {
    const r = rules.buildBranchNames('feature', '123', 'zip-code-enhancement', 'johndoe');
    r.action === 'PROCEED' &&
    r.integration === 'feature/ghi-123-zip-code-enhancement' &&
    r.dev === 'dev/ghi-123-zip-code-enhancement-johndoe'
      ? h.pass('SIM-BRANCH:build-feature', 'Correct feature branch names')
      : h.fail('SIM-BRANCH:build-feature', `Wrong: int=${r.integration} dev=${r.dev}`);
  }

  {
    const r = rules.buildBranchNames('hotfix', '45', 'critical-payment-fix', 'janedoe');
    r.action === 'PROCEED' &&
    r.integration === 'hotfix/ghi-45-critical-payment-fix' &&
    r.dev === 'dev/ghi-45-critical-payment-fix-janedoe'
      ? h.pass('SIM-BRANCH:build-hotfix', 'Correct hotfix branch names')
      : h.fail('SIM-BRANCH:build-hotfix', `Wrong: int=${r.integration} dev=${r.dev}`);
  }

  {
    const r = rules.buildBranchNames('bug', '74', 'jwt-token-expiry', 'johndoe');
    r.action === 'PROCEED' &&
    r.integration === null &&
    r.dev === 'dev/ghi-74-bug-jwt-token-expiry-johndoe'
      ? h.pass('SIM-BRANCH:build-bug', 'Correct bug branch name (no integration branch)')
      : h.fail('SIM-BRANCH:build-bug', `Wrong: int=${r.integration} dev=${r.dev}`);
  }

  {
    const longSlug = 'a-very-long-slug-that-exceeds-the-maximum-allowed-branch-name-length-of-one-hundred-chars';
    const r = rules.buildBranchNames('bug', '74', longSlug, 'johndoe');
    r.action === 'BAIL'
      ? h.pass('SIM-BRANCH:build-bug-too-long', 'BAIL on bug branch exceeding 100-char limit')
      : h.fail('SIM-BRANCH:build-bug-too-long', `Expected BAIL, got ${r.action}: ${r.dev}`);
  }

  {
    const r = rules.buildBranchNames('project', '42', 'bulk-refund', 'janedoe');
    r.action === 'PROCEED' &&
    r.integration === 'project/ghi-42-bulk-refund' &&
    r.dev === null
      ? h.pass('SIM-BRANCH:build-project', 'Correct project branch name (no dev branch)')
      : h.fail('SIM-BRANCH:build-project', `Wrong: int=${r.integration} dev=${r.dev}`);
  }

  {
    const r = rules.buildBranchNames('bugfix', '99', 'oops', 'user');
    r.action === 'BAIL'
      ? h.pass('SIM-BRANCH:build-invalid-type', 'BAIL on invalid issue type "bugfix"')
      : h.fail('SIM-BRANCH:build-invalid-type', 'Expected BAIL');
  }

  {
    const r = rules.buildBranchNames('feature', '', 'slug', 'user');
    r.action === 'BAIL'
      ? h.pass('SIM-BRANCH:build-no-id', 'BAIL when issueId empty')
      : h.fail('SIM-BRANCH:build-no-id', 'Expected BAIL');
  }

  // Username sanitization (hyphen removal for unambiguous branch parsing)
  {
    const s = rules.sanitizeUsername('jane-doe');
    s === 'janedoe'
      ? h.pass('SIM-BRANCH:sanitize-hyphen', 'Strips hyphens from username')
      : h.fail('SIM-BRANCH:sanitize-hyphen', `Expected "janedoe", got "${s}"`);
  }

  {
    const s = rules.sanitizeUsername('JohnDoe');
    s === 'johndoe'
      ? h.pass('SIM-BRANCH:sanitize-case', 'Lowercases username')
      : h.fail('SIM-BRANCH:sanitize-case', `Expected "johndoe", got "${s}"`);
  }

  {
    const s = rules.sanitizeUsername('simple');
    s === 'simple'
      ? h.pass('SIM-BRANCH:sanitize-noop', 'No-op for simple username')
      : h.fail('SIM-BRANCH:sanitize-noop', `Expected "simple", got "${s}"`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // DEV BRANCH PARSING (commit, create-pr)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Dev Branch Parsing');

  {
    const r = rules.parseDevBranch('dev/ghi-123-zip-code-enhancement-johndoe');
    r.action === 'PROCEED' && r.issueId === '123' && r.slug === 'zip-code-enhancement' && r.username === 'johndoe'
      ? h.pass('SIM-BRANCH:parse-std', 'Parses standard dev branch correctly')
      : h.fail('SIM-BRANCH:parse-std', `Wrong: id=${r.issueId} slug=${r.slug} user=${r.username}`);
  }

  {
    const r = rules.parseDevBranch('dev/initial-docs-setup');
    r.action === 'PROCEED' && r.special === true
      ? h.pass('SIM-BRANCH:parse-docs', 'Parses initial-docs-setup branch')
      : h.fail('SIM-BRANCH:parse-docs', 'Expected special=true');
  }

  {
    const r = rules.parseDevBranch('dev/ghi-74-bug-jwt-token-expiry-johndoe');
    r.action === 'PROCEED' && r.isBug === true && r.bugScope === 'project' && r.issueId === '74' && r.slug === 'jwt-token-expiry' && r.username === 'johndoe'
      ? h.pass('SIM-BRANCH:parse-bug-project', 'Parses project-level bug branch')
      : h.fail('SIM-BRANCH:parse-bug-project', `Wrong: scope=${r.bugScope} id=${r.issueId} slug=${r.slug}`);
  }

  {
    const r = rules.parseDevBranch('dev/ghi-73-bug-e1-uswds-compile-johndoe');
    r.action === 'PROCEED' && r.isBug === true && r.bugScope === 'epic' && r.epicNumber === '1' && r.slug === 'uswds-compile' && r.username === 'johndoe'
      ? h.pass('SIM-BRANCH:parse-bug-epic', 'Parses epic-level bug branch')
      : h.fail('SIM-BRANCH:parse-bug-epic', `Wrong: scope=${r.bugScope} epic=${r.epicNumber} slug=${r.slug}`);
  }

  {
    const r = rules.parseDevBranch('dev/ghi-72-bug-e2-s6-null-pointer-johndoe');
    r.action === 'PROCEED' && r.isBug === true && r.bugScope === 'story' && r.epicNumber === '2' && r.storyNumber === '6' && r.slug === 'null-pointer' && r.username === 'johndoe'
      ? h.pass('SIM-BRANCH:parse-bug-story', 'Parses story-level bug branch')
      : h.fail('SIM-BRANCH:parse-bug-story', `Wrong: scope=${r.bugScope} epic=${r.epicNumber} story=${r.storyNumber} slug=${r.slug}`);
  }

  {
    const r = rules.parseDevBranch('master');
    r.action === 'BAIL'
      ? h.pass('SIM-BRANCH:parse-invalid', 'BAIL on non-dev branch')
      : h.fail('SIM-BRANCH:parse-invalid', 'Expected BAIL');
  }

  // ════════════════════════════════════════════════════════════════════════
  // PR TARGET RESOLUTION (create-pull-request)
  // ════════════════════════════════════════════════════════════════════════

  h.section('PR Target Resolution');

  {
    const r = rules.resolvePrTarget('dev/ghi-123-zip-code-enhancement-johndoe');
    r.action === 'PROCEED' && r.candidates.includes('feature/ghi-123-zip-code-enhancement')
      ? h.pass('SIM-PR:resolve-feature', 'Resolves dev → feature integration')
      : h.fail('SIM-PR:resolve-feature', `Candidates: ${r.candidates}`);
  }

  {
    const r = rules.resolvePrTarget('dev/ghi-45-urgent-fix-janedoe');
    r.action === 'PROCEED' && r.candidates.includes('hotfix/ghi-45-urgent-fix')
      ? h.pass('SIM-PR:resolve-hotfix', 'Resolves dev → hotfix integration')
      : h.fail('SIM-PR:resolve-hotfix', `Candidates: ${r.candidates}`);
  }

  {
    const r = rules.resolvePrTarget('dev/initial-docs-setup');
    r.action === 'PROCEED' && r.target === 'feature/initial-docs-setup'
      ? h.pass('SIM-PR:resolve-docs', 'Resolves initial-docs-setup')
      : h.fail('SIM-PR:resolve-docs', `Target: ${r.target}`);
  }

  {
    const r = rules.resolvePrTarget('dev/ghi-74-bug-jwt-token-expiry-johndoe');
    r.action === 'PROCEED' && r.requiresBugBrief === true && r.bugScope === 'project'
      ? h.pass('SIM-PR:resolve-bug-project', 'Bug project-level requires bug-brief resolution')
      : h.fail('SIM-PR:resolve-bug-project', `Got: requiresBugBrief=${r.requiresBugBrief} scope=${r.bugScope}`);
  }

  {
    const r = rules.resolvePrTarget('dev/ghi-73-bug-e1-uswds-compile-johndoe');
    r.action === 'PROCEED' && r.requiresBugBrief === true && r.bugScope === 'epic' && r.epicNumber === '1'
      ? h.pass('SIM-PR:resolve-bug-epic', 'Bug epic-level requires bug-brief + knows epic number')
      : h.fail('SIM-PR:resolve-bug-epic', `Got: scope=${r.bugScope} epic=${r.epicNumber}`);
  }

  {
    const r = rules.resolvePrTarget('master');
    r.action === 'BAIL'
      ? h.pass('SIM-PR:resolve-invalid', 'BAIL on non-dev source')
      : h.fail('SIM-PR:resolve-invalid', 'Expected BAIL');
  }

  // ════════════════════════════════════════════════════════════════════════
  // INPUT PARSING & VALIDATION
  // ════════════════════════════════════════════════════════════════════════

  h.section('Input Parsing — Issue ID');

  {
    const r = rules.parseIssueId('123');
    r.action === 'PROCEED' && r.issueId === '123'
      ? h.pass('SIM-INPUT:issue-plain', 'Parses plain issue ID')
      : h.fail('SIM-INPUT:issue-plain', `Got: ${r.issueId}`);
  }

  {
    const r = rules.parseIssueId('#45');
    r.action === 'PROCEED' && r.issueId === '45'
      ? h.pass('SIM-INPUT:issue-hash', 'Strips # prefix')
      : h.fail('SIM-INPUT:issue-hash', `Got: ${r.issueId}`);
  }

  for (const bad of ['', null, 'abc', '#', '0', '-5']) {
    const r = rules.parseIssueId(bad);
    r.action === 'BAIL'
      ? h.pass(`SIM-INPUT:issue-bad:${bad}`, `BAIL on invalid issue ID "${bad}"`)
      : h.fail(`SIM-INPUT:issue-bad:${bad}`, 'Expected BAIL');
  }

  h.section('Input Parsing — Issue Type');

  {
    const r = rules.validateIssueType('feature');
    r.action === 'PROCEED'
      ? h.pass('SIM-INPUT:type-feature', 'Accepts "feature"')
      : h.fail('SIM-INPUT:type-feature', 'Expected PROCEED');
  }

  {
    const r = rules.validateIssueType('hotfix');
    r.action === 'PROCEED'
      ? h.pass('SIM-INPUT:type-hotfix', 'Accepts "hotfix"')
      : h.fail('SIM-INPUT:type-hotfix', 'Expected PROCEED');
  }

  {
    const r = rules.validateIssueType('project');
    r.action === 'PROCEED'
      ? h.pass('SIM-INPUT:type-project', 'Accepts "project"')
      : h.fail('SIM-INPUT:type-project', 'Expected PROCEED');
  }

  {
    const r = rules.validateIssueType('bug');
    r.action === 'PROCEED'
      ? h.pass('SIM-INPUT:type-bug', 'Accepts "bug"')
      : h.fail('SIM-INPUT:type-bug', 'Expected PROCEED');
  }

  for (const bad of ['bugfix', 'enhancement', '', null]) {
    const r = rules.validateIssueType(bad);
    r.action === 'BAIL'
      ? h.pass(`SIM-INPUT:type-bad:${bad}`, `BAIL on invalid type "${bad}"`)
      : h.fail(`SIM-INPUT:type-bad:${bad}`, 'Expected BAIL');
  }

  h.section('Input Parsing — Persona (setup-workspace)');

  {
    const r = rules.validatePersona('em');
    r.action === 'PROCEED'
      ? h.pass('SIM-INPUT:persona-em', 'Accepts "em" persona')
      : h.fail('SIM-INPUT:persona-em', 'Expected PROCEED');
  }

  {
    const r = rules.validatePersona('ade');
    r.action === 'PROCEED'
      ? h.pass('SIM-INPUT:persona-ade', 'Accepts "ade" persona')
      : h.fail('SIM-INPUT:persona-ade', 'Expected PROCEED');
  }

  for (const bad of ['admin', 'dev', '', null, undefined]) {
    const r = rules.validatePersona(bad);
    r.action === 'BAIL'
      ? h.pass(`SIM-INPUT:persona-bad:${bad}`, `BAIL on invalid persona "${bad}"`)
      : h.fail(`SIM-INPUT:persona-bad:${bad}`, 'Expected BAIL');
  }

  h.section('Input Parsing — Release Version (post-deployment-docs-sync)');

  {
    const r = rules.parseReleaseVersion('4.0.0');
    r.action === 'PROCEED' && r.version === '4.0.0'
      ? h.pass('SIM-INPUT:release-plain', 'Parses plain version')
      : h.fail('SIM-INPUT:release-plain', `Got: ${r.version}`);
  }

  {
    const r = rules.parseReleaseVersion('release/4.0.0');
    r.action === 'PROCEED' && r.version === '4.0.0'
      ? h.pass('SIM-INPUT:release-prefix', 'Strips release/ prefix')
      : h.fail('SIM-INPUT:release-prefix', `Got: ${r.version}`);
  }

  for (const bad of ['', 'v4', '4.0', null]) {
    const r = rules.parseReleaseVersion(bad);
    r.action === 'BAIL'
      ? h.pass(`SIM-INPUT:release-bad:${bad}`, `BAIL on invalid release "${bad}"`)
      : h.fail(`SIM-INPUT:release-bad:${bad}`, 'Expected BAIL');
  }

  // ════════════════════════════════════════════════════════════════════════
  // CONFIG VALIDATION
  // ════════════════════════════════════════════════════════════════════════

  h.section('Config Validation — initiate-issue');

  {
    const r = rules.validateInitiateIssueConfig({ issues: {}, worker_repos: { svc: 'org/repo' } });
    r.action === 'BAIL' && r.reasons.some((rr) => rr.includes('issues.repository'))
      ? h.pass('SIM-CFG:no-issue-repo', 'BAIL when issues.repository empty')
      : h.fail('SIM-CFG:no-issue-repo', 'Expected BAIL with issues.repository reason');
  }

  {
    const r = rules.validateInitiateIssueConfig({ issues: { repository: 'org/repo' }, worker_repos: {} });
    r.action === 'BAIL' && r.reasons.some((rr) => rr.includes('worker_repos'))
      ? h.pass('SIM-CFG:no-workers', 'BAIL when worker_repos empty')
      : h.fail('SIM-CFG:no-workers', 'Expected BAIL with worker_repos reason');
  }

  {
    const r = rules.validateInitiateIssueConfig({});
    r.action === 'BAIL' && r.reasons.length === 2
      ? h.pass('SIM-CFG:both-missing', 'BAIL with both reasons when config empty')
      : h.fail('SIM-CFG:both-missing', `Expected 2 reasons, got ${r.reasons?.length}`);
  }

  {
    const r = rules.validateInitiateIssueConfig({
      issues: { repository: 'org/docs' },
      worker_repos: { svc: 'org/svc' },
    });
    r.action === 'PROCEED'
      ? h.pass('SIM-CFG:valid', 'PROCEED with valid config')
      : h.fail('SIM-CFG:valid', 'Expected PROCEED');
  }

  h.section('Config Validation — BMAD version');

  {
    const r = rules.validateBmadVersion({ versions: { bmad: '6.3.0' } });
    r.action === 'PROCEED' && r.version === '6.3.0'
      ? h.pass('SIM-CFG:bmad-valid', 'Accepts valid BMAD semver')
      : h.fail('SIM-CFG:bmad-valid', 'Expected PROCEED');
  }

  {
    const r = rules.validateBmadVersion({ versions: {} });
    r.action === 'BAIL'
      ? h.pass('SIM-CFG:bmad-missing', 'BAIL when BMAD version missing')
      : h.fail('SIM-CFG:bmad-missing', 'Expected BAIL');
  }

  {
    const r = rules.validateBmadVersion({ versions: { bmad: 'latest' } });
    r.action === 'BAIL'
      ? h.pass('SIM-CFG:bmad-invalid', 'BAIL on non-semver BMAD version')
      : h.fail('SIM-CFG:bmad-invalid', 'Expected BAIL');
  }

  h.section('Config — BMAD Install Action');

  {
    const a = rules.determineBmadAction(null, '6.3.0');
    a === 'install'
      ? h.pass('SIM-CFG:bmad-fresh', 'Fresh install when no manifest')
      : h.fail('SIM-CFG:bmad-fresh', `Expected "install", got "${a}"`);
  }

  {
    const a = rules.determineBmadAction('6.3.0', '6.3.0');
    a === 'skip'
      ? h.pass('SIM-CFG:bmad-match', 'Skip when versions match')
      : h.fail('SIM-CFG:bmad-match', `Expected "skip", got "${a}"`);
  }

  {
    const a = rules.determineBmadAction('6.2.0', '6.3.0');
    a === 'update'
      ? h.pass('SIM-CFG:bmad-upgrade', 'Update when installed is older than target')
      : h.fail('SIM-CFG:bmad-upgrade', `Expected "update", got "${a}"`);
  }

  {
    const a = rules.determineBmadAction('6.3.0', '6.2.0');
    a === 'downgrade'
      ? h.pass('SIM-CFG:bmad-downgrade', 'Downgrade when installed is newer than target')
      : h.fail('SIM-CFG:bmad-downgrade', `Expected "downgrade", got "${a}"`);
  }

  {
    const a = rules.determineBmadAction('7.0.0', '6.3.0');
    a === 'downgrade'
      ? h.pass('SIM-CFG:bmad-downgrade-major', 'Downgrade detected across major versions')
      : h.fail('SIM-CFG:bmad-downgrade-major', `Expected "downgrade", got "${a}"`);
  }

  {
    const a = rules.determineBmadAction('v6.3.0', '6.3.0');
    a === 'skip'
      ? h.pass('SIM-CFG:bmad-v-prefix-skip', 'Skip when v-prefixed version matches')
      : h.fail('SIM-CFG:bmad-v-prefix-skip', `Expected "skip", got "${a}"`);
  }

  {
    const a = rules.determineBmadAction('v6.2.0', '6.3.0');
    a === 'update'
      ? h.pass('SIM-CFG:bmad-v-prefix-upgrade', 'Update when v-prefixed installed is older')
      : h.fail('SIM-CFG:bmad-v-prefix-upgrade', `Expected "update", got "${a}"`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // PREREQUISITE CHECKS (quick-setup, setup-workspace)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Prerequisite Checks — quick-setup');

  {
    const r = rules.checkPrerequisites({ node: 'v22.12.0', python: '3.12.0', uv: '0.6.0' });
    r.action === 'PROCEED' && r.results.every((rr) => rr.status === 'PASS')
      ? h.pass('SIM-PREREQ:all-pass', 'PROCEED when all prerequisites met')
      : h.fail('SIM-PREREQ:all-pass', 'Expected all PASS');
  }

  {
    const r = rules.checkPrerequisites({ node: 'v18.19.0', python: '3.12.0', uv: '0.6.0' });
    r.action === 'BAIL' && r.results.find((rr) => rr.tool === 'Node.js')?.status === 'FAIL'
      ? h.pass('SIM-PREREQ:old-node', 'BAIL when Node.js < 20')
      : h.fail('SIM-PREREQ:old-node', 'Expected Node.js FAIL');
  }

  {
    const r = rules.checkPrerequisites({ node: 'v20.0.0', python: '3.9.7', uv: '0.6.0' });
    r.action === 'BAIL' && r.results.find((rr) => rr.tool === 'Python')?.status === 'FAIL'
      ? h.pass('SIM-PREREQ:old-python', 'BAIL when Python < 3.10')
      : h.fail('SIM-PREREQ:old-python', 'Expected Python FAIL');
  }

  {
    const r = rules.checkPrerequisites({ node: 'v20.0.0', python: '3.10.0', uv: '' });
    r.action === 'BAIL' && r.results.find((rr) => rr.tool === 'uv')?.status === 'FAIL'
      ? h.pass('SIM-PREREQ:no-uv', 'BAIL when uv missing')
      : h.fail('SIM-PREREQ:no-uv', 'Expected uv FAIL');
  }

  // Edge: exactly at boundary
  {
    const r = rules.checkPrerequisites({ node: 'v20.0.0', python: '3.10.0', uv: '0.1.0' });
    r.action === 'PROCEED'
      ? h.pass('SIM-PREREQ:boundary', 'PROCEED at exact minimum versions')
      : h.fail('SIM-PREREQ:boundary', 'Expected PROCEED at boundary');
  }

  {
    const r = rules.checkPrerequisites({ node: 'v19.99.99', python: '3.10.0', uv: '0.1.0' });
    r.action === 'BAIL'
      ? h.pass('SIM-PREREQ:node-19', 'BAIL on Node.js 19 (just below threshold)')
      : h.fail('SIM-PREREQ:node-19', 'Expected BAIL');
  }

  h.section('Prerequisite Checks — setup-workspace (git + gh)');

  {
    const r = rules.checkPrerequisites(
      { node: 'v22.0.0', python: '3.12.0', uv: '0.6.0', git: '2.43.0', gh: '2.40.0' },
      { requireGit: true, requireGh: true },
    );
    r.action === 'PROCEED' && r.results.length === 5
      ? h.pass('SIM-PREREQ:workspace-all', 'All 5 tools pass for setup-workspace')
      : h.fail('SIM-PREREQ:workspace-all', `Expected 5 results, got ${r.results.length}`);
  }

  {
    const r = rules.checkPrerequisites(
      { node: 'v22.0.0', python: '3.12.0', uv: '0.6.0', git: '2.43.0' },
      { requireGit: true, requireGh: true },
    );
    r.action === 'BAIL' && r.results.find((rr) => rr.tool === 'gh')?.status === 'FAIL'
      ? h.pass('SIM-PREREQ:no-gh', 'BAIL when gh CLI missing')
      : h.fail('SIM-PREREQ:no-gh', 'Expected gh FAIL');
  }

  {
    const r = rules.checkPrerequisites(
      { node: 'v22.0.0', python: '3.12.0', uv: '0.6.0', gh: '2.40.0' },
      { requireGit: true, requireGh: true },
    );
    r.action === 'BAIL' && r.results.find((rr) => rr.tool === 'git')?.status === 'FAIL'
      ? h.pass('SIM-PREREQ:no-git', 'BAIL when git missing')
      : h.fail('SIM-PREREQ:no-git', 'Expected git FAIL');
  }

  h.section('Version Parsing');

  {
    const v = rules.parseVersion('v22.12.0');
    v && v.major === 22 && v.minor === 12 && v.patch === 0
      ? h.pass('SIM-PREREQ:parse-v-prefix', 'Parses "v22.12.0"')
      : h.fail('SIM-PREREQ:parse-v-prefix', `Got: ${JSON.stringify(v)}`);
  }

  {
    const v = rules.parseVersion('Python 3.10.14');
    v && v.major === 3 && v.minor === 10 && v.patch === 14
      ? h.pass('SIM-PREREQ:parse-python', 'Parses "Python 3.10.14"')
      : h.fail('SIM-PREREQ:parse-python', `Got: ${JSON.stringify(v)}`);
  }

  {
    const v = rules.parseVersion('');
    v === null
      ? h.pass('SIM-PREREQ:parse-empty', 'Returns null for empty string')
      : h.fail('SIM-PREREQ:parse-empty', 'Expected null');
  }

  {
    const v = rules.parseVersion(null);
    v === null
      ? h.pass('SIM-PREREQ:parse-null', 'Returns null for null')
      : h.fail('SIM-PREREQ:parse-null', 'Expected null');
  }

  // ════════════════════════════════════════════════════════════════════════
  // SENSITIVITY DETECTION (commit)
  // ════════════════════════════════════════════════════════════════════════

  h.section('File Sensitivity Detection');

  {
    const r = rules.detectSensitiveFiles([
      '.env',
      '.env.local',
      '.env.production',
      'cert.pem',
      'private.key',
      'keystore.p12',
      'src/app.js',
      'README.md',
    ]);
    r.hasSensitive && r.flagged.length === 6
      ? h.pass('SIM-SENS:mixed', `Flagged 6 of 8 files`)
      : h.fail('SIM-SENS:mixed', `Expected 6 flagged, got ${r.flagged.length}`);
  }

  {
    const r = rules.detectSensitiveFiles(['src/app.js', 'README.md', 'package.json']);
    !r.hasSensitive
      ? h.pass('SIM-SENS:clean', 'No flags on clean files')
      : h.fail('SIM-SENS:clean', `Unexpected ${r.flagged.length} flags`);
  }

  {
    const r = rules.detectSensitiveFiles(['node_modules/lodash/index.js']);
    r.hasSensitive && r.flagged[0].category === 'Dependencies'
      ? h.pass('SIM-SENS:node-modules', 'Flags node_modules as dependencies')
      : h.fail('SIM-SENS:node-modules', 'Expected Dependencies category');
  }

  {
    const r = rules.detectSensitiveFiles(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
    r.flagged.length === 3 && r.flagged.every((f) => f.category === 'OS file')
      ? h.pass('SIM-SENS:os-files', 'Flags all OS-specific files')
      : h.fail('SIM-SENS:os-files', `Expected 3 OS files, got ${r.flagged.length}`);
  }

  {
    const r = rules.detectSensitiveFiles(['debug.log', 'temp.tmp', 'buffer.swp', 'old~']);
    r.flagged.length === 4
      ? h.pass('SIM-SENS:temp-files', 'Flags all temporary file types')
      : h.fail('SIM-SENS:temp-files', `Expected 4, got ${r.flagged.length}`);
  }

  {
    const r = rules.detectSensitiveFiles(['venv/lib/python3.12/site-packages/foo.py']);
    r.hasSensitive
      ? h.pass('SIM-SENS:venv', 'Flags virtual environment files')
      : h.fail('SIM-SENS:venv', 'Expected flag');
  }

  {
    const r = rules.detectSensitiveFiles(['dist/bundle.js', 'build/output.css']);
    r.flagged.length === 2
      ? h.pass('SIM-SENS:build-artifacts', 'Flags build artifacts')
      : h.fail('SIM-SENS:build-artifacts', `Expected 2, got ${r.flagged.length}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // DELETION DETECTION (commit)
  // ════════════════════════════════════════════════════════════════════════

  h.section('File Deletion Detection');

  {
    const deleted = rules.detectDeletions([
      'M  src/app.js',
      'D  old-file.js',
      ' D config.yml',
      'A  new.js',
      'D  another-removed.ts',
      '?? untracked.txt',
    ]);
    deleted.length === 3
      ? h.pass('SIM-DEL:mixed-status', `Found ${deleted.length} deletions in mixed status`)
      : h.fail('SIM-DEL:mixed-status', `Expected 3, got ${deleted.length}`);
  }

  {
    const deleted = rules.detectDeletions(['M  src/app.js', 'A  new.js', '?? untracked.txt']);
    deleted.length === 0
      ? h.pass('SIM-DEL:no-deletions', 'No deletions in status without D')
      : h.fail('SIM-DEL:no-deletions', `Expected 0, got ${deleted.length}`);
  }

  {
    const deleted = rules.detectDeletions([]);
    deleted.length === 0
      ? h.pass('SIM-DEL:empty', 'No deletions from empty status')
      : h.fail('SIM-DEL:empty', `Expected 0, got ${deleted.length}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // OS DETECTION & PACKAGE MANAGER (install-hooks)
  // ════════════════════════════════════════════════════════════════════════

  h.section('OS Detection');

  const osTests = [
    ['Darwin', 'macos'],
    ['Linux', 'linux'],
    ['MINGW64_NT-10.0', 'windows'],
    ['MSYS_NT-10.0', 'windows'],
    ['CYGWIN_NT-10.0', 'windows'],
  ];
  for (const [input, expected] of osTests) {
    const r = rules.detectOS(input);
    r.action === 'PROCEED' && r.osType === expected
      ? h.pass(`SIM-OS:detect-${expected}`, `"${input}" → "${expected}"`)
      : h.fail(`SIM-OS:detect-${expected}`, `Expected "${expected}", got ${r.osType}`);
  }

  {
    const r = rules.detectOS('FreeBSD');
    r.action === 'BAIL'
      ? h.pass('SIM-OS:unsupported', 'BAIL on unsupported OS')
      : h.fail('SIM-OS:unsupported', 'Expected BAIL');
  }

  {
    const r = rules.detectOS('');
    r.action === 'BAIL'
      ? h.pass('SIM-OS:empty', 'BAIL on empty OS string')
      : h.fail('SIM-OS:empty', 'Expected BAIL');
  }

  h.section('Package Manager Selection');

  {
    const r = rules.selectPackageManager(['brew', 'pip3']);
    r.packageManager === 'brew'
      ? h.pass('SIM-OS:pm-brew-first', 'brew takes priority over pip3')
      : h.fail('SIM-OS:pm-brew-first', `Got: ${r.packageManager}`);
  }

  {
    const r = rules.selectPackageManager(['pip3', 'pip', 'choco']);
    r.packageManager === 'pip3'
      ? h.pass('SIM-OS:pm-pip3-priority', 'pip3 takes priority over pip and choco')
      : h.fail('SIM-OS:pm-pip3-priority', `Got: ${r.packageManager}`);
  }

  {
    const r = rules.selectPackageManager(['pip']);
    r.packageManager === 'pip'
      ? h.pass('SIM-OS:pm-pip-only', 'Falls back to pip when only option')
      : h.fail('SIM-OS:pm-pip-only', `Got: ${r.packageManager}`);
  }

  {
    const r = rules.selectPackageManager(['choco', 'winget']);
    r.packageManager === 'choco'
      ? h.pass('SIM-OS:pm-choco-over-winget', 'choco before winget')
      : h.fail('SIM-OS:pm-choco-over-winget', `Got: ${r.packageManager}`);
  }

  {
    const r = rules.selectPackageManager([]);
    r.action === 'BAIL'
      ? h.pass('SIM-OS:pm-none', 'BAIL when no package manager')
      : h.fail('SIM-OS:pm-none', 'Expected BAIL');
  }

  h.section('Install Command Mapping');

  {
    const cmds = rules.getInstallCommands('brew');
    cmds.precommit === 'brew install pre-commit' && cmds.gitleaks === 'brew install gitleaks'
      ? h.pass('SIM-OS:cmds-brew', 'Correct brew install commands')
      : h.fail('SIM-OS:cmds-brew', `Got: ${JSON.stringify(cmds)}`);
  }

  {
    const cmds = rules.getInstallCommands('pip3');
    cmds.precommit === 'pip3 install pre-commit' && cmds.gitleaks === 'binary-fallback'
      ? h.pass('SIM-OS:cmds-pip3', 'pip3 → binary fallback for gitleaks')
      : h.fail('SIM-OS:cmds-pip3', `Got: ${JSON.stringify(cmds)}`);
  }

  {
    const cmds = rules.getInstallCommands('winget');
    cmds.precommit === null && cmds.gitleaks === 'winget install gitleaks'
      ? h.pass('SIM-OS:cmds-winget', 'winget has no pre-commit command')
      : h.fail('SIM-OS:cmds-winget', `Got: ${JSON.stringify(cmds)}`);
  }

  h.section('Gitleaks Fallback URL');

  {
    const url = rules.buildGitleaksFallbackUrl('linux', 'x86_64');
    url && url.includes('linux_x64') && url.includes('8.22.1')
      ? h.pass('SIM-OS:gitleaks-linux-x64', 'Correct Linux x64 URL')
      : h.fail('SIM-OS:gitleaks-linux-x64', `Got: ${url}`);
  }

  {
    const url = rules.buildGitleaksFallbackUrl('macos', 'arm64');
    url && url.includes('darwin_arm64')
      ? h.pass('SIM-OS:gitleaks-macos-arm64', 'Correct macOS ARM64 URL')
      : h.fail('SIM-OS:gitleaks-macos-arm64', `Got: ${url}`);
  }

  {
    const url = rules.buildGitleaksFallbackUrl('linux', 'aarch64');
    url && url.includes('linux_arm64')
      ? h.pass('SIM-OS:gitleaks-aarch64', 'Maps aarch64 → arm64')
      : h.fail('SIM-OS:gitleaks-aarch64', `Got: ${url}`);
  }

  {
    const url = rules.buildGitleaksFallbackUrl('linux', 'mips');
    url === null
      ? h.pass('SIM-OS:gitleaks-bad-arch', 'Returns null for unsupported arch')
      : h.fail('SIM-OS:gitleaks-bad-arch', 'Expected null');
  }

  // ════════════════════════════════════════════════════════════════════════
  // STACK DETECTION (setup-unit-tests, setup-api-tests, setup-functional-tests)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Stack Detection');

  {
    const s = rules.detectStack({ hasPomXml: true });
    s && s.stack === 'java-spring' && s.coverage === 'JaCoCo'
      ? h.pass('SIM-STACK:java-maven', 'Detects Java/Spring with Maven')
      : h.fail('SIM-STACK:java-maven', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ hasBuildGradle: true });
    s && s.stack === 'java-spring-gradle'
      ? h.pass('SIM-STACK:java-gradle', 'Detects Java/Spring with Gradle')
      : h.fail('SIM-STACK:java-gradle', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ packageJsonDeps: { react: '^18.2.0' } });
    s && s.stack === 'react' && s.framework === 'Jest + RTL'
      ? h.pass('SIM-STACK:react', 'Detects React with Jest + RTL')
      : h.fail('SIM-STACK:react', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ packageJsonDeps: { express: '^4.18.0' } });
    s && s.stack === 'node'
      ? h.pass('SIM-STACK:node-express', 'Detects Node.js/Express')
      : h.fail('SIM-STACK:node-express', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ packageJsonDeps: { '@angular/core': '^17.0.0' } });
    s && s.stack === 'angular'
      ? h.pass('SIM-STACK:angular', 'Detects Angular')
      : h.fail('SIM-STACK:angular', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ packageJsonDeps: { vue: '^3.0.0' } });
    s && s.stack === 'vue'
      ? h.pass('SIM-STACK:vue', 'Detects Vue')
      : h.fail('SIM-STACK:vue', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ hasCsproj: true });
    s && s.stack === 'dotnet' && s.framework === 'xUnit'
      ? h.pass('SIM-STACK:dotnet', 'Detects .NET with xUnit')
      : h.fail('SIM-STACK:dotnet', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ hasRequirementsTxt: true });
    s && s.stack === 'python' && s.framework === 'pytest'
      ? h.pass('SIM-STACK:python', 'Detects Python with pytest')
      : h.fail('SIM-STACK:python', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ hasTemplateYaml: true });
    s && s.stack === 'lambda-sam'
      ? h.pass('SIM-STACK:lambda-sam', 'Detects Lambda SAM')
      : h.fail('SIM-STACK:lambda-sam', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ hasServerlessYml: true });
    s && s.stack === 'lambda-serverless'
      ? h.pass('SIM-STACK:lambda-sls', 'Detects Serverless Framework')
      : h.fail('SIM-STACK:lambda-sls', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({ packageJsonDeps: { next: '^14.0.0' } });
    s && s.stack === 'nextjs'
      ? h.pass('SIM-STACK:nextjs', 'Detects Next.js')
      : h.fail('SIM-STACK:nextjs', `Got: ${JSON.stringify(s)}`);
  }

  {
    const s = rules.detectStack({});
    s === null
      ? h.pass('SIM-STACK:unknown', 'Returns null for unrecognized stack')
      : h.fail('SIM-STACK:unknown', `Got: ${JSON.stringify(s)}`);
  }

  h.section('UI Repo Detection');

  {
    rules.isUiRepo({ react: '^18.2.0' })
      ? h.pass('SIM-STACK:ui-react', 'Detects React as UI repo')
      : h.fail('SIM-STACK:ui-react', 'Expected true');
  }

  {
    rules.isUiRepo({ svelte: '^4.0.0' })
      ? h.pass('SIM-STACK:ui-svelte', 'Detects Svelte as UI repo')
      : h.fail('SIM-STACK:ui-svelte', 'Expected true');
  }

  {
    !rules.isUiRepo({ express: '^4.18.0' })
      ? h.pass('SIM-STACK:ui-not-express', 'Express is NOT a UI repo')
      : h.fail('SIM-STACK:ui-not-express', 'Expected false');
  }

  h.section('React Testing Library Version');

  {
    const v = rules.reactTestingLibraryVersion('^18.2.0');
    v === '^14'
      ? h.pass('SIM-STACK:rtl-18', 'React 18 → RTL ^14')
      : h.fail('SIM-STACK:rtl-18', `Got: ${v}`);
  }

  {
    const v = rules.reactTestingLibraryVersion('16.13.1');
    v === '^11'
      ? h.pass('SIM-STACK:rtl-16', 'React 16 → RTL ^11')
      : h.fail('SIM-STACK:rtl-16', `Got: ${v}`);
  }

  h.section('Default Ports');

  {
    const p = rules.defaultPort('java-spring');
    p === 8080
      ? h.pass('SIM-STACK:port-java', 'Java Spring default port 8080')
      : h.fail('SIM-STACK:port-java', `Got: ${p}`);
  }

  {
    const p = rules.defaultPort('python-flask');
    p === 5000
      ? h.pass('SIM-STACK:port-flask', 'Flask default port 5000')
      : h.fail('SIM-STACK:port-flask', `Got: ${p}`);
  }

  {
    const p = rules.defaultPort('python-fastapi');
    p === 8000
      ? h.pass('SIM-STACK:port-fastapi', 'FastAPI default port 8000')
      : h.fail('SIM-STACK:port-fastapi', `Got: ${p}`);
  }

  {
    const p = rules.defaultPort('lambda-sam');
    p === 3000
      ? h.pass('SIM-STACK:port-sam', 'SAM local default port 3000')
      : h.fail('SIM-STACK:port-sam', `Got: ${p}`);
  }

  {
    const p = rules.defaultPort('unknown-stack');
    p === 8080
      ? h.pass('SIM-STACK:port-fallback', 'Unknown stack falls back to 8080')
      : h.fail('SIM-STACK:port-fallback', `Got: ${p}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCAN EXCLUSION PATTERNS
  // ════════════════════════════════════════════════════════════════════════

  h.section('Scan Exclusion Patterns');

  const mustExclude = ['node_modules', '_bmad', '_bmad-output', 'tdgs-aidlc-starter-kit', '.github', 'scripts', 'sim3-tx-ovra-docs', 'apigee-exports'];
  for (const dir of mustExclude) {
    rules.shouldExcludeFromScan(dir)
      ? h.pass(`SIM-EXCL:${dir}`, `Excludes "${dir}" from scanning`)
      : h.fail(`SIM-EXCL:${dir}`, `Expected exclusion for "${dir}"`);
  }

  const mustInclude = ['txgov-sim3-api', 'txgov-sim3-ui', 'orderdetails-service'];
  for (const dir of mustInclude) {
    !rules.shouldExcludeFromScan(dir)
      ? h.pass(`SIM-EXCL:include-${dir}`, `Includes "${dir}" in scanning`)
      : h.fail(`SIM-EXCL:include-${dir}`, `Unexpected exclusion of "${dir}"`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // COVERAGE TARGET
  // ════════════════════════════════════════════════════════════════════════

  h.section('Coverage Target Resolution');

  {
    const c = rules.resolveCoverageTarget(undefined);
    c === 80
      ? h.pass('SIM-COV:default', 'Defaults to 80% when undefined')
      : h.fail('SIM-COV:default', `Got: ${c}`);
  }

  {
    const c = rules.resolveCoverageTarget('');
    c === 80
      ? h.pass('SIM-COV:empty', 'Defaults to 80% when empty string')
      : h.fail('SIM-COV:empty', `Got: ${c}`);
  }

  {
    const c = rules.resolveCoverageTarget(90);
    c === 90
      ? h.pass('SIM-COV:custom', 'Accepts custom target 90')
      : h.fail('SIM-COV:custom', `Got: ${c}`);
  }

  {
    const c = rules.resolveCoverageTarget(-10);
    c === 80
      ? h.pass('SIM-COV:negative', 'Defaults on negative input')
      : h.fail('SIM-COV:negative', `Got: ${c}`);
  }

  {
    const c = rules.resolveCoverageTarget(150);
    c === 80
      ? h.pass('SIM-COV:over-100', 'Defaults on > 100 input')
      : h.fail('SIM-COV:over-100', `Got: ${c}`);
  }

  h.section('JaCoCo Minimum Ratio');

  {
    const m = rules.jacocoMinimum(80);
    m === '0.80'
      ? h.pass('SIM-COV:jacoco-80', '80% → 0.80')
      : h.fail('SIM-COV:jacoco-80', `Got: ${m}`);
  }

  {
    const m = rules.jacocoMinimum(95);
    m === '0.95'
      ? h.pass('SIM-COV:jacoco-95', '95% → 0.95')
      : h.fail('SIM-COV:jacoco-95', `Got: ${m}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // CONVENTIONAL COMMITS & PR FORMATTING
  // ════════════════════════════════════════════════════════════════════════

  h.section('Conventional Commit Types');

  for (const type of ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore']) {
    rules.isValidCommitType(type)
      ? h.pass(`SIM-COMMIT:type-${type}`, `"${type}" is valid`)
      : h.fail(`SIM-COMMIT:type-${type}`, `Expected "${type}" to be valid`);
  }

  for (const bad of ['feature', 'bugfix', 'wip', 'update']) {
    !rules.isValidCommitType(bad)
      ? h.pass(`SIM-COMMIT:type-bad-${bad}`, `"${bad}" is invalid`)
      : h.fail(`SIM-COMMIT:type-bad-${bad}`, `Expected "${bad}" to be invalid`);
  }

  h.section('PR Commit Type from Integration Branch');

  {
    const t = rules.prCommitType('feature/ghi-123-zip-code');
    t === 'feat'
      ? h.pass('SIM-PR:type-feature', 'feature/ → "feat"')
      : h.fail('SIM-PR:type-feature', `Got: ${t}`);
  }

  {
    const t = rules.prCommitType('hotfix/ghi-45-urgent');
    t === 'fix'
      ? h.pass('SIM-PR:type-hotfix', 'hotfix/ → "fix"')
      : h.fail('SIM-PR:type-hotfix', `Got: ${t}`);
  }

  {
    const t = rules.prCommitType('other/branch');
    t === 'feat'
      ? h.pass('SIM-PR:type-default', 'Unknown prefix defaults to "feat"')
      : h.fail('SIM-PR:type-default', `Got: ${t}`);
  }

  h.section('Refs Footer');

  {
    const ref = rules.buildRefsFooter('123', 'myorg/sim3-docs');
    ref === 'Refs: myorg/sim3-docs#123'
      ? h.pass('SIM-COMMIT:refs-cross-repo', 'Cross-repo format with issues.repository')
      : h.fail('SIM-COMMIT:refs-cross-repo', `Got: ${ref}`);
  }

  {
    const ref = rules.buildRefsFooter('45', '');
    ref === 'Refs: #45'
      ? h.pass('SIM-COMMIT:refs-short', 'Short format when repository empty')
      : h.fail('SIM-COMMIT:refs-short', `Got: ${ref}`);
  }

  {
    const ref = rules.buildRefsFooter(null, 'org/repo');
    ref === null
      ? h.pass('SIM-COMMIT:refs-no-id', 'Returns null when no issue ID')
      : h.fail('SIM-COMMIT:refs-no-id', `Got: ${ref}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // WORKER REPO URL PARSING (setup-workspace)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Worker Repo URL Parsing');

  {
    const r = rules.parseGitRemoteUrl('https://github.com/myorg/txgov-sim3-api.git');
    r && r.provider === 'github' && r.format === 'myorg/txgov-sim3-api'
      ? h.pass('SIM-URL:github-https', 'Parses GitHub HTTPS URL')
      : h.fail('SIM-URL:github-https', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseGitRemoteUrl('git@github.com:myorg/txgov-sim3-ui.git');
    r && r.provider === 'github' && r.format === 'myorg/txgov-sim3-ui'
      ? h.pass('SIM-URL:github-ssh', 'Parses GitHub SSH URL')
      : h.fail('SIM-URL:github-ssh', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseGitRemoteUrl('https://txgscmp.ad.portal.texas.gov/scm/ovra/txgov-sim3-api.git');
    r && r.provider === 'bitbucket' && r.format.includes('/projects/OVRA/repos/txgov-sim3-api/browse')
      ? h.pass('SIM-URL:bb-https', 'Parses TX Bitbucket HTTPS → browse URL with uppercase project')
      : h.fail('SIM-URL:bb-https', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseGitRemoteUrl('ssh://git@txgscmp.ad.portal.texas.gov/ovra/txgov-sim3-api.git');
    r && r.provider === 'bitbucket' && r.format.includes('/projects/OVRA/')
      ? h.pass('SIM-URL:bb-ssh', 'Parses TX Bitbucket SSH URL')
      : h.fail('SIM-URL:bb-ssh', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseGitRemoteUrl('https://gitlab.com/org/repo.git');
    r === null
      ? h.pass('SIM-URL:unknown', 'Returns null for unknown remote')
      : h.fail('SIM-URL:unknown', 'Expected null');
  }

  h.section('Service Key Derivation');

  {
    const k = rules.deriveServiceKey('tx-ovra-orderdetails-service', 'tx-ovra');
    k === 'orderdetails-service'
      ? h.pass('SIM-URL:svc-key-strip', 'Strips project prefix')
      : h.fail('SIM-URL:svc-key-strip', `Got: ${k}`);
  }

  {
    const k = rules.deriveServiceKey('standalone-repo', 'tx-ovra');
    k === 'standalone-repo'
      ? h.pass('SIM-URL:svc-key-noprefix', 'Returns full name when no prefix match')
      : h.fail('SIM-URL:svc-key-noprefix', `Got: ${k}`);
  }

  {
    const k = rules.deriveServiceKey('my-repo', '');
    k === 'my-repo'
      ? h.pass('SIM-URL:svc-key-empty-prefix', 'Returns full name when prefix empty')
      : h.fail('SIM-URL:svc-key-empty-prefix', `Got: ${k}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // FILE-TO-CONTEXT-DOC MAPPING (update-context-docs)
  // ════════════════════════════════════════════════════════════════════════

  h.section('File-to-Context-Doc Mapping');

  {
    const docs = rules.mapFileToContextDocs('src/main/java/com/example/model/Order.java');
    docs.includes('shared/data-models.md')
      ? h.pass('SIM-MAP:java-model', 'Java model → shared/data-models.md')
      : h.fail('SIM-MAP:java-model', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('src/main/java/com/example/dto/OrderDto.java');
    docs.includes('shared/data-models.md')
      ? h.pass('SIM-MAP:java-dto', 'Java DTO → shared/data-models.md')
      : h.fail('SIM-MAP:java-dto', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('src/main/java/com/example/OrderEntity.java');
    docs.includes('shared/database-schema.md')
      ? h.pass('SIM-MAP:java-entity', 'Entity → shared/database-schema.md')
      : h.fail('SIM-MAP:java-entity', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('src/main/java/com/example/OrderRepository.java');
    docs.includes('shared/database-schema.md')
      ? h.pass('SIM-MAP:java-repo', 'Repository → shared/database-schema.md')
      : h.fail('SIM-MAP:java-repo', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('src/main/java/com/example/controller/OrderController.java');
    docs.some((d) => d.includes('openapi')) && docs.some((d) => d.includes('architecture'))
      ? h.pass('SIM-MAP:java-controller', 'Controller → openapi + architecture')
      : h.fail('SIM-MAP:java-controller', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('src/components/Header.jsx');
    docs.includes('{ui}/ui-components.md')
      ? h.pass('SIM-MAP:react-component', 'JSX component → ui-components.md')
      : h.fail('SIM-MAP:react-component', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('src/pages/Dashboard.tsx');
    docs.includes('{ui}/architecture.md')
      ? h.pass('SIM-MAP:react-page', 'TSX page → architecture.md')
      : h.fail('SIM-MAP:react-page', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('application.properties');
    docs.includes('shared/deployment-configuration.md')
      ? h.pass('SIM-MAP:spring-props', 'application.properties → deployment-configuration.md')
      : h.fail('SIM-MAP:spring-props', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('pom.xml');
    docs.includes('shared/technology-stack.md')
      ? h.pass('SIM-MAP:pom', 'pom.xml → technology-stack.md')
      : h.fail('SIM-MAP:pom', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('apiproxy/proxies/default.xml');
    docs.length >= 2
      ? h.pass('SIM-MAP:apigee-proxy', `Apigee proxy maps to ${docs.length} docs`)
      : h.fail('SIM-MAP:apigee-proxy', `Expected ≥2 docs, got ${docs.length}`);
  }

  {
    const docs = rules.mapFileToContextDocs('apiproxy/policies/VerifyOAuth.xml');
    docs.includes('apigee/security-config.md')
      ? h.pass('SIM-MAP:apigee-oauth', 'OAuth policy → apigee/security-config.md')
      : h.fail('SIM-MAP:apigee-oauth', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('src/main/java/com/example/integration/PaymentClient.java');
    docs.includes('shared/integration-architecture.md')
      ? h.pass('SIM-MAP:integration', 'Integration client → integration-architecture.md')
      : h.fail('SIM-MAP:integration', `Got: ${docs}`);
  }

  {
    const docs = rules.mapFileToContextDocs('README.md');
    docs.length === 0
      ? h.pass('SIM-MAP:no-mapping', 'README.md has no context-doc mapping')
      : h.fail('SIM-MAP:no-mapping', `Unexpected mappings: ${docs}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // KB SYNC MODE (update-context-docs — project sync)
  // ════════════════════════════════════════════════════════════════════════

  h.section('KB Sync — Mode Determination');

  {
    const mode = rules.determineSyncMode('release/4.0.0');
    mode === 'release'
      ? h.pass('SIM-KBSYNC:release-mode', 'release/* → release sync mode')
      : h.fail('SIM-KBSYNC:release-mode', `Expected "release", got "${mode}"`);
  }

  {
    const mode = rules.determineSyncMode('project/ghi-42-tabc-app');
    mode === 'project'
      ? h.pass('SIM-KBSYNC:project-mode', 'project/* → project sync mode')
      : h.fail('SIM-KBSYNC:project-mode', `Expected "project", got "${mode}"`);
  }

  {
    const mode = rules.determineSyncMode('master');
    mode === null
      ? h.pass('SIM-KBSYNC:master-null', 'master → null (invalid for sync)')
      : h.fail('SIM-KBSYNC:master-null', `Expected null, got "${mode}"`);
  }

  {
    const mode = rules.determineSyncMode('feature/ghi-10-epic-1-auth');
    mode === null
      ? h.pass('SIM-KBSYNC:feature-null', 'feature/* → null (invalid for sync)')
      : h.fail('SIM-KBSYNC:feature-null', `Expected null, got "${mode}"`);
  }

  {
    const mode = rules.determineSyncMode('dev/ghi-10-1-1-scaffolding-user');
    mode === null
      ? h.pass('SIM-KBSYNC:dev-null', 'dev/* → null (invalid for sync)')
      : h.fail('SIM-KBSYNC:dev-null', `Expected null, got "${mode}"`);
  }

  h.section('KB Sync — Planning Branch Resolution');

  {
    const branch = rules.resolveKbSyncPlanningBranch('project/ghi-42-tabc-app');
    branch === 'planning/ghi-42-kb-sync'
      ? h.pass('SIM-KBSYNC:plan-branch', 'project/ghi-42-tabc-app → planning/ghi-42-kb-sync')
      : h.fail('SIM-KBSYNC:plan-branch', `Expected "planning/ghi-42-kb-sync", got "${branch}"`);
  }

  {
    const branch = rules.resolveKbSyncPlanningBranch('project/ghi-150-api-v2-migration');
    branch === 'planning/ghi-150-kb-sync'
      ? h.pass('SIM-KBSYNC:plan-branch-150', 'project/ghi-150-api-v2-migration → planning/ghi-150-kb-sync')
      : h.fail('SIM-KBSYNC:plan-branch-150', `Expected "planning/ghi-150-kb-sync", got "${branch}"`);
  }

  {
    const branch = rules.resolveKbSyncPlanningBranch('release/4.0.0');
    branch === null
      ? h.pass('SIM-KBSYNC:plan-branch-invalid', 'release/* → null (not a project branch)')
      : h.fail('SIM-KBSYNC:plan-branch-invalid', `Expected null, got "${branch}"`);
  }

  {
    const branch = rules.resolveKbSyncPlanningBranch('master');
    branch === null
      ? h.pass('SIM-KBSYNC:plan-branch-master', 'master → null (not a project branch)')
      : h.fail('SIM-KBSYNC:plan-branch-master', `Expected null, got "${branch}"`);
  }

  h.section('KB Sync — Project Context Update Decision');

  {
    const should = rules.shouldUpdateProjectContext(['pom.xml']);
    should === true
      ? h.pass('SIM-KBSYNC:ctx-pom', 'pom.xml → update project-context')
      : h.fail('SIM-KBSYNC:ctx-pom', 'Expected true');
  }

  {
    const should = rules.shouldUpdateProjectContext(['package.json']);
    should === true
      ? h.pass('SIM-KBSYNC:ctx-pkg', 'package.json → update project-context')
      : h.fail('SIM-KBSYNC:ctx-pkg', 'Expected true');
  }

  {
    const should = rules.shouldUpdateProjectContext(['.github/workflows/ci.yml']);
    should === true
      ? h.pass('SIM-KBSYNC:ctx-ci', 'CI workflow → update project-context')
      : h.fail('SIM-KBSYNC:ctx-ci', 'Expected true');
  }

  {
    const should = rules.shouldUpdateProjectContext(['Dockerfile']);
    should === true
      ? h.pass('SIM-KBSYNC:ctx-docker', 'Dockerfile → update project-context')
      : h.fail('SIM-KBSYNC:ctx-docker', 'Expected true');
  }

  {
    const should = rules.shouldUpdateProjectContext(['jest.config.ts']);
    should === true
      ? h.pass('SIM-KBSYNC:ctx-jest', 'jest.config.ts → update project-context')
      : h.fail('SIM-KBSYNC:ctx-jest', 'Expected true');
  }

  {
    const should = rules.shouldUpdateProjectContext(['src/main/java/com/example/service/OrderService.java']);
    should === false
      ? h.pass('SIM-KBSYNC:ctx-service-no', 'Service source → no project-context update')
      : h.fail('SIM-KBSYNC:ctx-service-no', 'Expected false');
  }

  {
    const should = rules.shouldUpdateProjectContext([
      'src/main/java/com/example/controller/OrderController.java',
      'src/main/java/com/example/model/Order.java',
    ]);
    should === false
      ? h.pass('SIM-KBSYNC:ctx-source-only-no', 'Only source code → no project-context update')
      : h.fail('SIM-KBSYNC:ctx-source-only-no', 'Expected false');
  }

  {
    const should = rules.shouldUpdateProjectContext([
      'src/main/java/com/example/service/OrderService.java',
      'pom.xml',
    ]);
    should === true
      ? h.pass('SIM-KBSYNC:ctx-mixed', 'Source + pom.xml → update project-context (config present)')
      : h.fail('SIM-KBSYNC:ctx-mixed', 'Expected true');
  }

  {
    const should = rules.shouldUpdateProjectContext([]);
    should === false
      ? h.pass('SIM-KBSYNC:ctx-empty', 'Empty file list → no project-context update')
      : h.fail('SIM-KBSYNC:ctx-empty', 'Expected false');
  }

  // ════════════════════════════════════════════════════════════════════════
  // VALIDATION REPORT CLASSIFICATION
  // ════════════════════════════════════════════════════════════════════════

  h.section('Runbook Validation — Status Classification');

  {
    const r = rules.classifyRunbookStatus('v20.11.1', 'v20.11.1');
    r.status === 'MATCH' && r.symbol === '✅'
      ? h.pass('SIM-VALID:match-exact', 'Identical values → MATCH ✅')
      : h.fail('SIM-VALID:match-exact', `Got: ${r.status}`);
  }

  {
    const r = rules.classifyRunbookStatus('^16.13.1', '16.13.1');
    r.status === 'MATCH' && r.symbol === '✅'
      ? h.pass('SIM-VALID:match-caret', 'Caret-prefix normalization → MATCH ✅')
      : h.fail('SIM-VALID:match-caret', `Got: ${r.status}`);
  }

  {
    const r = rules.classifyRunbookStatus('v18.0.0', 'v20.0.0');
    r.status === 'MISMATCH' && r.symbol === '❌'
      ? h.pass('SIM-VALID:mismatch-version', 'Different versions → MISMATCH ❌')
      : h.fail('SIM-VALID:mismatch-version', `Got: ${r.status}`);
  }

  {
    const r = rules.classifyRunbookStatus('PostgreSQL', 'MySQL');
    r.status === 'MISMATCH'
      ? h.pass('SIM-VALID:mismatch-tech', 'Different technologies → MISMATCH')
      : h.fail('SIM-VALID:mismatch-tech', `Got: ${r.status}`);
  }

  {
    const r = rules.classifyRunbookStatus('https://prod.example.com', '');
    r.status === 'INFO' && r.symbol === 'ℹ️'
      ? h.pass('SIM-VALID:info-one-source', 'Value in one source only → INFO ℹ️')
      : h.fail('SIM-VALID:info-one-source', `Got: ${r.status}`);
  }

  {
    const r = rules.classifyRunbookStatus('', '');
    r.status === 'INFO'
      ? h.pass('SIM-VALID:info-both-empty', 'Both empty → INFO')
      : h.fail('SIM-VALID:info-both-empty', `Got: ${r.status}`);
  }

  {
    const r = rules.classifyRunbookStatus(null, 'value');
    r.status === 'INFO'
      ? h.pass('SIM-VALID:info-null', 'Null vs value → INFO')
      : h.fail('SIM-VALID:info-null', `Got: ${r.status}`);
  }

  h.section('Runbook Validation — Worst Status Rollup');

  {
    const r = rules.worstStatus(['MATCH', 'MATCH', 'MATCH']);
    r.status === 'MATCH'
      ? h.pass('SIM-VALID:worst-all-match', 'All MATCH → MATCH')
      : h.fail('SIM-VALID:worst-all-match', `Got: ${r.status}`);
  }

  {
    const r = rules.worstStatus(['MATCH', 'INFO', 'MATCH']);
    r.status === 'INFO'
      ? h.pass('SIM-VALID:worst-info', 'INFO present → INFO')
      : h.fail('SIM-VALID:worst-info', `Got: ${r.status}`);
  }

  {
    const r = rules.worstStatus(['MATCH', 'INFO', 'MISMATCH']);
    r.status === 'MISMATCH'
      ? h.pass('SIM-VALID:worst-mismatch', 'MISMATCH present → MISMATCH (worst)')
      : h.fail('SIM-VALID:worst-mismatch', `Got: ${r.status}`);
  }

  h.section('Runbook Validation — Discrepancy IDs');

  {
    const id = rules.discrepancyId('ENV', 1);
    id === 'ENV-001'
      ? h.pass('SIM-VALID:disc-id-env', 'ENV-001 format correct')
      : h.fail('SIM-VALID:disc-id-env', `Got: ${id}`);
  }

  {
    const id = rules.discrepancyId('SVC', 42);
    id === 'SVC-042'
      ? h.pass('SIM-VALID:disc-id-svc', 'SVC-042 zero-padded')
      : h.fail('SIM-VALID:disc-id-svc', `Got: ${id}`);
  }

  {
    const id = rules.discrepancyId('DB', 100);
    id === 'DB-100'
      ? h.pass('SIM-VALID:disc-id-3digit', 'DB-100 three digits')
      : h.fail('SIM-VALID:disc-id-3digit', `Got: ${id}`);
  }

  h.section('Test Validation — Severity Classification');

  {
    const r = rules.classifyTestSeverity('fee');
    r.symbol === '🔴'
      ? h.pass('SIM-VALID:sev-fee', 'Fee → 🔴')
      : h.fail('SIM-VALID:sev-fee', `Got: ${r.symbol}`);
  }

  {
    const r = rules.classifyTestSeverity('calculation');
    r.symbol === '🟡'
      ? h.pass('SIM-VALID:sev-calc', 'Calculation → 🟡')
      : h.fail('SIM-VALID:sev-calc', `Got: ${r.symbol}`);
  }

  {
    const r = rules.classifyTestSeverity('coverage');
    r.symbol === '🔵'
      ? h.pass('SIM-VALID:sev-coverage', 'Coverage → 🔵')
      : h.fail('SIM-VALID:sev-coverage', `Got: ${r.symbol}`);
  }

  {
    const r = rules.classifyTestSeverity('match');
    r.symbol === '✅'
      ? h.pass('SIM-VALID:sev-match', 'Match → ✅')
      : h.fail('SIM-VALID:sev-match', `Got: ${r.symbol}`);
  }

  {
    const r = rules.classifyTestSeverity('unknown-type');
    r.symbol === '🔵'
      ? h.pass('SIM-VALID:sev-default', 'Unknown defaults to Coverage Gaps 🔵')
      : h.fail('SIM-VALID:sev-default', `Got: ${r.symbol}`);
  }

  h.section('Test Validation — Calculation Model Detection');

  {
    const m = rules.detectCalculationModel('Total = Quantity × Unit Price');
    m === 'flat-rate'
      ? h.pass('SIM-VALID:calc-flat', 'Detects flat-rate model')
      : h.fail('SIM-VALID:calc-flat', `Got: ${m}`);
  }

  {
    const m = rules.detectCalculationModel('First page $25 + additional pages $5 each');
    m === 'first-additional'
      ? h.pass('SIM-VALID:calc-first-add', 'Detects first+additional model')
      : h.fail('SIM-VALID:calc-first-add', `Got: ${m}`);
  }

  {
    const m = rules.detectCalculationModel('Apply tier brackets: 1-10 = $5, 11-50 = $3');
    m === 'tiered'
      ? h.pass('SIM-VALID:calc-tiered', 'Detects tiered model')
      : h.fail('SIM-VALID:calc-tiered', `Got: ${m}`);
  }

  {
    const m = rules.detectCalculationModel('Apply 8.25% state tax');
    m === 'percentage'
      ? h.pass('SIM-VALID:calc-percent', 'Detects percentage model')
      : h.fail('SIM-VALID:calc-percent', `Got: ${m}`);
  }

  {
    const m = rules.detectCalculationModel('Some custom logic');
    m === 'unknown'
      ? h.pass('SIM-VALID:calc-unknown', 'Unknown formula → "unknown"')
      : h.fail('SIM-VALID:calc-unknown', `Got: ${m}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // WORKFLOW CHAIN PREREQUISITES
  // ════════════════════════════════════════════════════════════════════════

  h.section('Workflow Chain — Branch Prerequisites');

  // initiate-issue requires master
  {
    const r = rules.checkWorkflowBranchPrereq('initiate-issue', 'master');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:initiate-on-master', 'initiate-issue PROCEED on master')
      : h.fail('SIM-WF:initiate-on-master', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('initiate-issue', 'dev/ghi-123-foo-user');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:initiate-on-dev', 'initiate-issue BAIL when not on master')
      : h.fail('SIM-WF:initiate-on-dev', 'Expected BAIL');
  }

  // commit requires dev/*, planning/*, or project/*
  {
    const r = rules.checkWorkflowBranchPrereq('commit', 'dev/ghi-123-foo-user');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:commit-on-dev', 'commit PROCEED on dev/*')
      : h.fail('SIM-WF:commit-on-dev', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('commit', 'planning/ghi-42-tabc-app');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:commit-on-planning', 'commit PROCEED on planning/*')
      : h.fail('SIM-WF:commit-on-planning', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('commit', 'project/ghi-42-tabc-app');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:commit-on-project', 'commit PROCEED on project/*')
      : h.fail('SIM-WF:commit-on-project', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('commit', 'master');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:commit-on-master', 'commit BAIL on master')
      : h.fail('SIM-WF:commit-on-master', 'Expected BAIL');
  }

  // prepare-repos requires dev/ghi-*
  {
    const r = rules.checkWorkflowBranchPrereq('prepare-repos', 'dev/ghi-123-foo-user');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:prepare-on-dev-ghi', 'prepare-repos PROCEED on dev/ghi-*')
      : h.fail('SIM-WF:prepare-on-dev-ghi', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('prepare-repos', 'dev/initial-docs-setup');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:prepare-not-ghi', 'prepare-repos BAIL on dev/initial-docs-setup (no ghi)')
      : h.fail('SIM-WF:prepare-not-ghi', 'Expected BAIL');
  }

  // update-context-docs requires release/* or project/*
  {
    const r = rules.checkWorkflowBranchPrereq('update-context-docs', 'release/4.0.0');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:update-on-release', 'update-context-docs PROCEED on release/*')
      : h.fail('SIM-WF:update-on-release', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('update-context-docs', 'project/ghi-42-tabc-app');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:update-on-project', 'update-context-docs PROCEED on project/*')
      : h.fail('SIM-WF:update-on-project', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('update-context-docs', 'master');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:update-on-master', 'update-context-docs BAIL on master')
      : h.fail('SIM-WF:update-on-master', 'Expected BAIL');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('update-context-docs', 'feature/ghi-10-epic-1-auth');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:update-on-feature', 'update-context-docs BAIL on feature/*')
      : h.fail('SIM-WF:update-on-feature', 'Expected BAIL');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('update-context-docs', 'dev/ghi-10-1-1-scaffolding-user');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:update-on-dev', 'update-context-docs BAIL on dev/*')
      : h.fail('SIM-WF:update-on-dev', 'Expected BAIL');
  }

  // post-deployment-docs-sync requires master
  {
    const r = rules.checkWorkflowBranchPrereq('post-deployment-docs-sync', 'master');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:post-deploy-master', 'post-deployment-docs-sync PROCEED on master')
      : h.fail('SIM-WF:post-deploy-master', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('post-deployment-docs-sync', 'release/4.0.0');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:post-deploy-release', 'post-deployment-docs-sync BAIL on release')
      : h.fail('SIM-WF:post-deploy-release', 'Expected BAIL');
  }

  // pre-check-pull-request requires dev/*
  {
    const r = rules.checkWorkflowBranchPrereq('pre-check-pull-request', 'dev/ghi-123-foo-user');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:precheck-on-dev', 'pre-check PROCEED on dev/*')
      : h.fail('SIM-WF:precheck-on-dev', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('pre-check-pull-request', 'feature/ghi-123-foo');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:precheck-on-feature', 'pre-check BAIL on feature/*')
      : h.fail('SIM-WF:precheck-on-feature', 'Expected BAIL');
  }

  // No branch restriction prompts
  for (const step of ['quick-setup', 'setup-workspace', 'install-hooks', 'switch']) {
    const r = rules.checkWorkflowBranchPrereq(step, 'any-branch');
    r.action === 'PROCEED'
      ? h.pass(`SIM-WF:${step}-no-branch-req`, `${step} has no branch requirement`)
      : h.fail(`SIM-WF:${step}-no-branch-req`, 'Expected PROCEED');
  }

  // initiate-project requires master
  {
    const r = rules.checkWorkflowBranchPrereq('initiate-project', 'master');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:init-project-master', 'initiate-project PROCEED on master')
      : h.fail('SIM-WF:init-project-master', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('initiate-project', 'project/ghi-42-foo');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:init-project-not-master', 'initiate-project BAIL when not on master')
      : h.fail('SIM-WF:init-project-not-master', 'Expected BAIL');
  }

  // show-available-stories requires project/*
  {
    const r = rules.checkWorkflowBranchPrereq('show-available-stories', 'project/ghi-42-payment');
    r.action === 'PROCEED'
      ? h.pass('SIM-WF:stories-on-project', 'show-available-stories PROCEED on project/*')
      : h.fail('SIM-WF:stories-on-project', 'Expected PROCEED');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('show-available-stories', 'master');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:stories-on-master', 'show-available-stories BAIL on master')
      : h.fail('SIM-WF:stories-on-master', 'Expected BAIL');
  }

  {
    const r = rules.checkWorkflowBranchPrereq('show-available-stories', 'feature/ghi-42-payment');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:stories-on-feature', 'show-available-stories BAIL on feature/*')
      : h.fail('SIM-WF:stories-on-feature', 'Expected BAIL');
  }

  // Unknown step
  {
    const r = rules.checkWorkflowBranchPrereq('nonexistent-step', 'master');
    r.action === 'BAIL'
      ? h.pass('SIM-WF:unknown-step', 'BAIL on unknown workflow step')
      : h.fail('SIM-WF:unknown-step', 'Expected BAIL');
  }

  // ════════════════════════════════════════════════════════════════════════
  // LEGACY PROMPT CLEANUP (quick-setup)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Legacy Prompt Cleanup');

  {
    rules.isLegacyPrompt('bmad-quick-spec.prompt.md')
      ? h.pass('SIM-LEGACY:old-prompt', 'Flags non-tdgs-aidlc prompt as legacy')
      : h.fail('SIM-LEGACY:old-prompt', 'Expected true');
  }

  {
    rules.isLegacyPrompt('quick-setup.prompt.md')
      ? h.pass('SIM-LEGACY:no-prefix', 'Flags prompt without tdgs-aidlc- prefix')
      : h.fail('SIM-LEGACY:no-prefix', 'Expected true');
  }

  {
    !rules.isLegacyPrompt('tdgs-aidlc-commit.prompt.md')
      ? h.pass('SIM-LEGACY:valid-prompt', 'Keeps tdgs-aidlc- prefixed prompt')
      : h.fail('SIM-LEGACY:valid-prompt', 'Expected false');
  }

  // ════════════════════════════════════════════════════════════════════════
  // CHANGE BRIEF GENERATION (initiate-issue)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Change Brief Metadata');

  {
    const m = rules.buildChangeBriefMeta('123', 'myorg/docs', 'feature', 'zip-code-fix', 'johndoe');
    m.source === 'github-issue' &&
    m.issue_id === '123' &&
    m.repository === 'myorg/docs' &&
    m.issue_type === 'feature' &&
    m.integration_branch === 'feature/ghi-123-zip-code-fix' &&
    m.dev_branch === 'dev/ghi-123-zip-code-fix-johndoe'
      ? h.pass('SIM-BRIEF:feature', 'Correct feature change-brief metadata')
      : h.fail('SIM-BRIEF:feature', `Got: ${JSON.stringify(m)}`);
  }

  {
    const m = rules.buildChangeBriefMeta('45', 'org/repo', 'hotfix', 'payment-crash', 'janedoe');
    m.issue_type === 'hotfix' &&
    m.integration_branch === 'hotfix/ghi-45-payment-crash' &&
    m.dev_branch === 'dev/ghi-45-payment-crash-janedoe'
      ? h.pass('SIM-BRIEF:hotfix', 'Correct hotfix change-brief metadata')
      : h.fail('SIM-BRIEF:hotfix', `Got: ${JSON.stringify(m)}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // CI FAILURE CLASSIFICATION (pre-check-pull-request)
  // ════════════════════════════════════════════════════════════════════════

  h.section('CI Failure Classification');

  {
    const t = rules.classifyCiFailure('error: cannot find symbol\n  symbol: class Foo');
    t === 'build'
      ? h.pass('SIM-CI:build', 'Compilation error → "build"')
      : h.fail('SIM-CI:build', `Got: ${t}`);
  }

  {
    const t = rules.classifyCiFailure('Tests run: 5, Failures: 1\nExpected 200 but got 404');
    t === 'test'
      ? h.pass('SIM-CI:test', 'Test failure → "test"')
      : h.fail('SIM-CI:test', `Got: ${t}`);
  }

  {
    const t = rules.classifyCiFailure('fatal: bad revision \'origin/master..HEAD\'');
    t === 'gitleaks-baseline'
      ? h.pass('SIM-CI:gitleaks-baseline', 'bad revision → "gitleaks-baseline"')
      : h.fail('SIM-CI:gitleaks-baseline', `Got: ${t}`);
  }

  {
    const t = rules.classifyCiFailure('could not determine log options for revision');
    t === 'gitleaks-baseline'
      ? h.pass('SIM-CI:gitleaks-log-opts', 'log options error → "gitleaks-baseline"')
      : h.fail('SIM-CI:gitleaks-log-opts', `Got: ${t}`);
  }

  {
    const t = rules.classifyCiFailure('no commits to scan');
    t === 'gitleaks-baseline'
      ? h.pass('SIM-CI:gitleaks-no-commits', 'no commits → "gitleaks-baseline"')
      : h.fail('SIM-CI:gitleaks-no-commits', `Got: ${t}`);
  }

  {
    const t = rules.classifyCiFailure('gitleaks finding: AWS key detected in config.yml');
    t === 'gitleaks-secret'
      ? h.pass('SIM-CI:gitleaks-secret', 'Actual finding → "gitleaks-secret"')
      : h.fail('SIM-CI:gitleaks-secret', `Got: ${t}`);
  }

  {
    const t = rules.classifyCiFailure('Veracode scan failed: high severity vulnerability');
    t === 'veracode'
      ? h.pass('SIM-CI:veracode', 'Veracode failure → "veracode"')
      : h.fail('SIM-CI:veracode', `Got: ${t}`);
  }

  {
    const t = rules.classifyCiFailure('Some random error with no pattern');
    t === 'unknown'
      ? h.pass('SIM-CI:unknown', 'Unrecognized → "unknown"')
      : h.fail('SIM-CI:unknown', `Got: ${t}`);
  }

  h.section('CI Polling Delays');

  {
    const delays = rules.ciPollingDelays();
    delays[0] === 30 && delays[1] === 45 && delays[2] === 60 && delays[3] === 90
      ? h.pass('SIM-CI:poll-schedule', 'Correct delay progression 30→45→60→90')
      : h.fail('SIM-CI:poll-schedule', `Got: ${delays.slice(0, 4)}`);
  }

  {
    const delays = rules.ciPollingDelays();
    const total = delays.reduce((a, b) => a + b, 0);
    delays[0] === 30 && delays[delays.length - 1] === 90 && total > 0
      ? h.pass('SIM-CI:poll-total', `Total polling budget ${total}s across ${delays.length} attempts`)
      : h.fail('SIM-CI:poll-total', `Unexpected schedule: ${delays}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // API TEST CLASSIFICATION (generate-api-tests)
  // ════════════════════════════════════════════════════════════════════════

  h.section('API Test Result Classification');

  {
    const r = rules.classifyApiTestResult('pass');
    r.symbol === '✅' && r.label === 'PASS'
      ? h.pass('SIM-API:pass', 'pass → ✅ PASS')
      : h.fail('SIM-API:pass', `Got: ${r.symbol} ${r.label}`);
  }

  {
    const r = rules.classifyApiTestResult('defect');
    r.symbol === '❌' && r.label === 'API DEFECT'
      ? h.pass('SIM-API:defect', 'defect → ❌ API DEFECT')
      : h.fail('SIM-API:defect', `Got: ${r.symbol} ${r.label}`);
  }

  {
    const r = rules.classifyApiTestResult('infra');
    r.symbol === '⚠️' && r.label === 'INFRA ISSUE'
      ? h.pass('SIM-API:infra', 'infra → ⚠️ INFRA ISSUE')
      : h.fail('SIM-API:infra', `Got: ${r.symbol} ${r.label}`);
  }

  {
    const r = rules.classifyApiTestResult('contract');
    r.symbol === '🔄' && r.label === 'CONTRACT MISMATCH'
      ? h.pass('SIM-API:contract', 'contract → 🔄 CONTRACT MISMATCH')
      : h.fail('SIM-API:contract', `Got: ${r.symbol} ${r.label}`);
  }

  h.section('Security Payloads');

  {
    const payloads = rules.getSecurityPayloads();
    const hasAll =
      payloads.xss.length === 3 &&
      payloads.sql.length === 3 &&
      payloads.pathTraversal.length === 2 &&
      payloads.commandInjection.length === 2 &&
      payloads.ldap.length === 1 &&
      payloads.headerInjection.length === 1;
    hasAll
      ? h.pass('SIM-API:payloads-count', 'All 6 payload categories with correct counts')
      : h.fail('SIM-API:payloads-count', `Counts: xss=${payloads.xss.length} sql=${payloads.sql.length}`);
  }

  {
    const payloads = rules.getSecurityPayloads();
    payloads.xss.includes("<script>alert('xss')</script>") && payloads.sql.includes("' OR 1=1--")
      ? h.pass('SIM-API:payloads-content', 'Canonical XSS + SQL injection strings present')
      : h.fail('SIM-API:payloads-content', 'Missing canonical payloads');
  }

  // ════════════════════════════════════════════════════════════════════════
  // REFERENCE SYNC (reference-sync)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Reference Sync — MCP Availability');

  {
    const r = rules.checkMcpAvailability(['mcp_github_actions_run_workflow', 'mcp_github-mcp_get_file_contents']);
    r.action === 'PROCEED'
      ? h.pass('SIM-REFSYNC:mcp-ok', 'PROCEED with GitHub MCP tools')
      : h.fail('SIM-REFSYNC:mcp-ok', 'Expected PROCEED');
  }

  {
    const r = rules.checkMcpAvailability(['mcp_slack_send_message', 'mcp_jira_create_issue']);
    r.action === 'BAIL'
      ? h.pass('SIM-REFSYNC:mcp-no-github', 'BAIL when no mcp_github tools')
      : h.fail('SIM-REFSYNC:mcp-no-github', 'Expected BAIL');
  }

  {
    const r = rules.checkMcpAvailability([]);
    r.action === 'BAIL'
      ? h.pass('SIM-REFSYNC:mcp-empty', 'BAIL on empty tool list')
      : h.fail('SIM-REFSYNC:mcp-empty', 'Expected BAIL');
  }

  {
    const r = rules.checkMcpAvailability(null);
    r.action === 'BAIL'
      ? h.pass('SIM-REFSYNC:mcp-null', 'BAIL on null tool list')
      : h.fail('SIM-REFSYNC:mcp-null', 'Expected BAIL');
  }

  h.section('Reference Sync — Service Filter');

  {
    const r = rules.shouldSyncService('pacs-service', ['pacs-service', 'notif-service'], false);
    r === true
      ? h.pass('SIM-REFSYNC:filter-included', 'Sync listed service')
      : h.fail('SIM-REFSYNC:filter-included', `Got: ${r}`);
  }

  {
    const r = rules.shouldSyncService('unknown-svc', ['pacs-service'], false);
    r === false
      ? h.pass('SIM-REFSYNC:filter-excluded', 'Skip unlisted service')
      : h.fail('SIM-REFSYNC:filter-excluded', `Got: ${r}`);
  }

  {
    const r = rules.shouldSyncService('any-svc', ['pacs-service'], true);
    r === true
      ? h.pass('SIM-REFSYNC:filter-syncall', 'sync_all overrides filtering')
      : h.fail('SIM-REFSYNC:filter-syncall', `Got: ${r}`);
  }

  {
    const r = rules.shouldSyncService('svc', null, false);
    r === null
      ? h.pass('SIM-REFSYNC:filter-no-config', 'Returns null when no common_services (prompt user)')
      : h.fail('SIM-REFSYNC:filter-no-config', `Got: ${r}`);
  }

  {
    const r = rules.shouldSyncService('svc', [], false);
    r === null
      ? h.pass('SIM-REFSYNC:filter-empty-config', 'Returns null on empty common_services')
      : h.fail('SIM-REFSYNC:filter-empty-config', `Got: ${r}`);
  }

  h.section('Reference Sync — Files & Categories');

  {
    const files = rules.getServiceSyncFiles('pacs-service');
    files.length === 2 && files[0] === 'repos/pacs-service/README.md' && files[1] === 'repos/pacs-service/architecture.md'
      ? h.pass('SIM-REFSYNC:files', 'Correct 2 files per service')
      : h.fail('SIM-REFSYNC:files', `Got: ${files}`);
  }

  {
    const cats = rules.getGapAnalysisCategories();
    cats.length === 3 && cats[0] === 'Glossary Terms' && cats[1] === 'Business Rules' && cats[2] === 'External Services'
      ? h.pass('SIM-REFSYNC:gap-cats', 'Correct gap analysis categories in order')
      : h.fail('SIM-REFSYNC:gap-cats', `Got: ${cats}`);
  }

  {
    const targets = rules.getSyncIndexTargets();
    targets.length === 3 && targets[0].required === true && targets[1].required === false && targets[2].required === false
      ? h.pass('SIM-REFSYNC:index-targets', 'Correct index targets with required flags')
      : h.fail('SIM-REFSYNC:index-targets', `Got: ${JSON.stringify(targets)}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // POST-DEPLOYMENT DOCS SYNC
  // ════════════════════════════════════════════════════════════════════════

  h.section('Post-Deployment Docs Sync');

  {
    const candidates = rules.getReleaseTagCandidates('4.0.0');
    candidates[0] === 'v4.0.0' && candidates[1] === '4.0.0' && candidates[2] === 'release/4.0.0'
      ? h.pass('SIM-DEPLOY:tag-candidates', 'Correct tag discovery order')
      : h.fail('SIM-DEPLOY:tag-candidates', `Got: ${candidates}`);
  }

  {
    const name = rules.buildDocsBranchName('4.0.0', '2026-04-30');
    name === 'docs/post-deploy-4.0.0-2026-04-30'
      ? h.pass('SIM-DEPLOY:branch-name', 'Correct docs branch name')
      : h.fail('SIM-DEPLOY:branch-name', `Got: ${name}`);
  }

  {
    rules.isReleasePrSourceBranch('feature/ghi-123-zip-code')
      ? h.pass('SIM-DEPLOY:pr-src-feature', 'feature/ghi-* is valid PR source')
      : h.fail('SIM-DEPLOY:pr-src-feature', 'Expected true');
  }

  {
    rules.isReleasePrSourceBranch('hotfix/ghi-45-urgent')
      ? h.pass('SIM-DEPLOY:pr-src-hotfix', 'hotfix/ghi-* is valid PR source')
      : h.fail('SIM-DEPLOY:pr-src-hotfix', 'Expected true');
  }

  {
    !rules.isReleasePrSourceBranch('dev/ghi-123-foo-user')
      ? h.pass('SIM-DEPLOY:pr-src-dev', 'dev/* is NOT a release PR source')
      : h.fail('SIM-DEPLOY:pr-src-dev', 'Expected false');
  }

  {
    !rules.isReleasePrSourceBranch('release/4.0.0')
      ? h.pass('SIM-DEPLOY:pr-src-release', 'release/* is NOT a release PR source')
      : h.fail('SIM-DEPLOY:pr-src-release', 'Expected false');
  }

  h.section('Post-Deployment — Issue ID Extraction');

  {
    const id = rules.extractIssueIdFromCommit('feat: add zip code field\n\nRefs: #123');
    id === '123'
      ? h.pass('SIM-DEPLOY:extract-id', 'Extracts issue ID from Refs footer')
      : h.fail('SIM-DEPLOY:extract-id', `Got: ${id}`);
  }

  {
    const id = rules.extractIssueIdFromCommit('Refs: #45');
    id === '45'
      ? h.pass('SIM-DEPLOY:extract-id-short', 'Extracts from short-form Refs')
      : h.fail('SIM-DEPLOY:extract-id-short', `Got: ${id}`);
  }

  {
    const id = rules.extractIssueIdFromCommit('fix: something without refs');
    id === null
      ? h.pass('SIM-DEPLOY:extract-no-refs', 'Returns null when no Refs footer')
      : h.fail('SIM-DEPLOY:extract-no-refs', `Got: ${id}`);
  }

  {
    const id = rules.extractIssueIdFromCommit('feat: cross-repo feature\n\nRefs: org/docs#456');
    id === '456'
      ? h.pass('SIM-DEPLOY:extract-id-cross-repo', 'Extracts issue ID from cross-repo Refs format')
      : h.fail('SIM-DEPLOY:extract-id-cross-repo', `Got: ${id}`);
  }

  {
    const footer = rules.buildRefsFooter('789', 'org/docs');
    const id = rules.extractIssueIdFromCommit(`feat: test\n\n${footer}`);
    id === '789'
      ? h.pass('SIM-DEPLOY:extract-roundtrip-cross-repo', 'Round-trip: buildRefsFooter → extractIssueIdFromCommit')
      : h.fail('SIM-DEPLOY:extract-roundtrip-cross-repo', `Got: ${id}`);
  }

  {
    const title = rules.buildSyncCommitTitle('4.0.0');
    title === 'docs(sync): update knowledge base for release 4.0.0'
      ? h.pass('SIM-DEPLOY:commit-title', 'Correct sync commit title')
      : h.fail('SIM-DEPLOY:commit-title', `Got: ${title}`);
  }

  {
    rules.shouldTriggerCommonServicesSync(['--sync-common-services', '--dry-run'])
      ? h.pass('SIM-DEPLOY:sync-flag-present', 'Triggers sync when flag present')
      : h.fail('SIM-DEPLOY:sync-flag-present', 'Expected true');
  }

  {
    !rules.shouldTriggerCommonServicesSync(['--dry-run'])
      ? h.pass('SIM-DEPLOY:sync-flag-absent', 'No sync when flag absent')
      : h.fail('SIM-DEPLOY:sync-flag-absent', 'Expected false');
  }

  {
    !rules.shouldTriggerCommonServicesSync(null)
      ? h.pass('SIM-DEPLOY:sync-flag-null', 'No sync on null flags')
      : h.fail('SIM-DEPLOY:sync-flag-null', 'Expected false');
  }

  // ════════════════════════════════════════════════════════════════════════
  // VALIDATE RUNBOOK CONTEXT — EXTENDED
  // ════════════════════════════════════════════════════════════════════════

  h.section('Runbook — Environment Ordering');

  {
    const sorted = rules.sortByEnvironmentOrder(['Dev', 'Production', 'Staging', 'UAT']);
    sorted[0] === 'Production' && sorted[1] === 'Staging' && sorted[2] === 'UAT' && sorted[3] === 'Dev'
      ? h.pass('SIM-RUNBOOK:env-order', 'Correct Production → Staging → UAT → Dev order')
      : h.fail('SIM-RUNBOOK:env-order', `Got: ${sorted}`);
  }

  {
    const sorted = rules.sortByEnvironmentOrder(['Test', 'Production', 'Custom-Env']);
    sorted[0] === 'Production' && sorted[1] === 'Test' && sorted[2] === 'Custom-Env'
      ? h.pass('SIM-RUNBOOK:env-unknown-last', 'Unrecognized environments sort last')
      : h.fail('SIM-RUNBOOK:env-unknown-last', `Got: ${sorted}`);
  }

  {
    const sorted = rules.sortByEnvironmentOrder(['UAT Server', 'Production API', 'Dev DB']);
    sorted[0] === 'Production API' && sorted[2] === 'Dev DB'
      ? h.pass('SIM-RUNBOOK:env-substring', 'Matches environments by substring')
      : h.fail('SIM-RUNBOOK:env-substring', `Got: ${sorted}`);
  }

  h.section('Runbook — Empty Cell Text');

  {
    rules.emptyCellText() === 'Not documented'
      ? h.pass('SIM-RUNBOOK:empty-cell', 'Canonical empty cell text is "Not documented"')
      : h.fail('SIM-RUNBOOK:empty-cell', `Got: ${rules.emptyCellText()}`);
  }

  for (const forbidden of rules.FORBIDDEN_EMPTY_CELL_VARIANTS) {
    rules.isForbiddenEmptyCellText(forbidden)
      ? h.pass(`SIM-RUNBOOK:forbidden-cell:${forbidden || 'empty'}`, `"${forbidden || '(empty)'}" is forbidden`)
      : h.fail(`SIM-RUNBOOK:forbidden-cell:${forbidden || 'empty'}`, 'Expected true');
  }

  {
    !rules.isForbiddenEmptyCellText('Not documented')
      ? h.pass('SIM-RUNBOOK:valid-cell', '"Not documented" is NOT forbidden')
      : h.fail('SIM-RUNBOOK:valid-cell', 'Expected false');
  }

  h.section('Runbook — Section Prefixes');

  const expectedPrefixes = { 1: 'ENV', 2: 'SVC', 3: 'DB', 4: 'TECH', 5: 'MICRO', 6: 'GW', 7: 'MON', 8: 'AUTH', 9: 'DBTBL', 10: 'BATCH' };
  for (const [num, prefix] of Object.entries(expectedPrefixes)) {
    const p = rules.getSectionPrefix(Number(num));
    p === prefix
      ? h.pass(`SIM-RUNBOOK:prefix-${prefix}`, `Section ${num} → "${prefix}"`)
      : h.fail(`SIM-RUNBOOK:prefix-${prefix}`, `Expected "${prefix}", got "${p}"`);
  }

  {
    rules.getSectionPrefix(99) === null
      ? h.pass('SIM-RUNBOOK:prefix-unknown', 'null for unknown section number')
      : h.fail('SIM-RUNBOOK:prefix-unknown', 'Expected null');
  }

  h.section('Runbook — Alphabetical Sorting');

  {
    const items = [{ name: 'Zebra' }, { name: 'Apple' }, { name: 'Mango' }];
    const sorted = rules.sortSectionItems(items, (i) => i.name);
    sorted[0].name === 'Apple' && sorted[1].name === 'Mango' && sorted[2].name === 'Zebra'
      ? h.pass('SIM-RUNBOOK:alpha-sort', 'Alphabetical sort by name')
      : h.fail('SIM-RUNBOOK:alpha-sort', `Got: ${sorted.map((i) => i.name)}`);
  }

  h.section('Runbook — Output File Path');

  {
    rules.getRunbookReportFilePath() === 'runbook-validation-report.md'
      ? h.pass('SIM-RUNBOOK:output-path', 'Fixed output path, no numbered variants')
      : h.fail('SIM-RUNBOOK:output-path', `Got: ${rules.getRunbookReportFilePath()}`);
  }

  h.section('Runbook — Recommendation Validation');

  {
    rules.isValidRecommendationPath('shared/data-models.md', ['shared/data-models.md', 'shared/database-schema.md'])
      ? h.pass('SIM-RUNBOOK:rec-valid', 'Recommendation references existing file')
      : h.fail('SIM-RUNBOOK:rec-valid', 'Expected true');
  }

  {
    !rules.isValidRecommendationPath('shared/new-doc.md', ['shared/data-models.md'])
      ? h.pass('SIM-RUNBOOK:rec-invalid', 'Rejects recommendation to non-existing file')
      : h.fail('SIM-RUNBOOK:rec-invalid', 'Expected false');
  }

  // ════════════════════════════════════════════════════════════════════════
  // VALIDATE TEST CONTEXT — EXTENDED
  // ════════════════════════════════════════════════════════════════════════

  h.section('Test Validation — Extended');

  {
    rules.getTestReportFilePath() === 'test-validation-report.md'
      ? h.pass('SIM-TESTVAL:output-path', 'Fixed test report path')
      : h.fail('SIM-TESTVAL:output-path', `Got: ${rules.getTestReportFilePath()}`);
  }

  {
    rules.getTestDiscrepancyPrefix() === 'DISC'
      ? h.pass('SIM-TESTVAL:prefix', 'Test discrepancy prefix is DISC')
      : h.fail('SIM-TESTVAL:prefix', `Got: ${rules.getTestDiscrepancyPrefix()}`);
  }

  {
    const sorted = rules.sortTestFiles(['z-tests.md', 'a-tests.md', 'm-tests.md']);
    sorted[0] === 'a-tests.md' && sorted[1] === 'm-tests.md' && sorted[2] === 'z-tests.md'
      ? h.pass('SIM-TESTVAL:file-sort', 'Alphabetical test file processing order')
      : h.fail('SIM-TESTVAL:file-sort', `Got: ${sorted}`);
  }

  h.section('Test Validation — Rule Matching');

  {
    const businessRules = [
      { id: 'FEE-001', category: 'fee', description: 'recording fee' },
      { id: 'FEE-002', category: 'fee', description: 'search fee' },
    ];
    const m = rules.matchBusinessRule('FEE-001', null, businessRules);
    m && m.matchType === 'exact-id' && m.match.id === 'FEE-001'
      ? h.pass('SIM-TESTVAL:match-exact', 'Exact Rule ID match takes priority')
      : h.fail('SIM-TESTVAL:match-exact', `Got: ${JSON.stringify(m)}`);
  }

  {
    const businessRules = [
      { id: 'FEE-001', category: 'fee', description: 'recording' },
    ];
    const m = rules.matchBusinessRule(null, 'fee recording validation', businessRules);
    m && m.matchType === 'category-description'
      ? h.pass('SIM-TESTVAL:match-fuzzy', 'Category + description fallback match')
      : h.fail('SIM-TESTVAL:match-fuzzy', `Got: ${JSON.stringify(m)}`);
  }

  {
    const businessRules = [{ id: 'FEE-001', category: 'fee', description: 'recording' }];
    const m = rules.matchBusinessRule(null, 'completely unrelated text', businessRules);
    m === null
      ? h.pass('SIM-TESTVAL:match-none', 'Returns null when no match')
      : h.fail('SIM-TESTVAL:match-none', `Got: ${JSON.stringify(m)}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SETUP WORKSPACE — EXTENDED
  // ════════════════════════════════════════════════════════════════════════

  h.section('Setup Workspace — Project Name Derivation');

  {
    const name = rules.deriveProjectName(['tx-ovra-orderdetails-service', 'tx-ovra-ui', 'tx-ovra-database']);
    name === 'tx-ovra'
      ? h.pass('SIM-SETUP:project-name-multi', 'Derives "tx-ovra" from 3 repos')
      : h.fail('SIM-SETUP:project-name-multi', `Got: ${name}`);
  }

  {
    const name = rules.deriveProjectName(['tx-ovra-orderdetails-service', 'tx-ovra-receipt-service']);
    name === 'tx-ovra'
      ? h.pass('SIM-SETUP:project-name-2repo', 'Derives "tx-ovra" from 2 repos')
      : h.fail('SIM-SETUP:project-name-2repo', `Got: ${name}`);
  }

  {
    const name = rules.deriveProjectName([]);
    name === null
      ? h.pass('SIM-SETUP:project-name-empty', 'Returns null for empty list')
      : h.fail('SIM-SETUP:project-name-empty', `Got: ${name}`);
  }

  h.section('Setup Workspace — Docs Folder by Persona');

  {
    const r = rules.checkDocsFolderForPersona(true, 'em');
    r.action === 'PROCEED'
      ? h.pass('SIM-SETUP:docs-exists-em', 'PROCEED when docs exists (EM)')
      : h.fail('SIM-SETUP:docs-exists-em', `Got: ${r.action}`);
  }

  {
    const r = rules.checkDocsFolderForPersona(true, 'ade');
    r.action === 'PROCEED'
      ? h.pass('SIM-SETUP:docs-exists-ade', 'PROCEED when docs exists (ADE)')
      : h.fail('SIM-SETUP:docs-exists-ade', `Got: ${r.action}`);
  }

  {
    const r = rules.checkDocsFolderForPersona(false, 'em');
    r.action === 'CREATE'
      ? h.pass('SIM-SETUP:docs-missing-em', 'CREATE when docs missing (EM)')
      : h.fail('SIM-SETUP:docs-missing-em', `Got: ${r.action}`);
  }

  {
    const r = rules.checkDocsFolderForPersona(false, 'ade');
    r.action === 'BAIL'
      ? h.pass('SIM-SETUP:docs-missing-ade', 'BAIL when docs missing (ADE must clone)')
      : h.fail('SIM-SETUP:docs-missing-ade', `Got: ${r.action}`);
  }

  h.section('Setup Workspace — Common Repos Classification');

  {
    rules.shouldPopulateCommonServices('ade') === true
      ? h.pass('SIM-SETUP:cs-ade', 'ADE classifies common repos')
      : h.fail('SIM-SETUP:cs-ade', 'Expected true');
  }

  {
    rules.shouldPopulateCommonServices('em') === true
      ? h.pass('SIM-SETUP:cs-em', 'EM classifies common repos')
      : h.fail('SIM-SETUP:cs-em', 'Expected true');
  }

  h.section('Setup Workspace — Extract Common Services');

  {
    const svcs = rules.extractCommonServicesFromFiles(['README.md', 'pacs-service.md', 'notificationengine-service.md', 'notes.txt']);
    svcs.length === 2 && svcs[0] === 'notificationengine-service' && svcs[1] === 'pacs-service'
      ? h.pass('SIM-SETUP:extract-cs', 'Extracts sorted service names, excludes README and non-md')
      : h.fail('SIM-SETUP:extract-cs', `Got: ${svcs}`);
  }

  {
    const svcs = rules.extractCommonServicesFromFiles(['README.md']);
    svcs.length === 0
      ? h.pass('SIM-SETUP:extract-cs-readme-only', 'Empty when only README.md')
      : h.fail('SIM-SETUP:extract-cs-readme-only', `Got: ${svcs}`);
  }

  h.section('Setup Workspace — BMAD Config');

  {
    const cfg = rules.buildBmadConfig('tx-ovra', 'tx-ovra-docs');
    cfg.project_name === 'tx-ovra' &&
    cfg.planning_artifacts === 'tx-ovra-docs/planning-artifacts' &&
    cfg.implementation_artifacts === 'tx-ovra-docs/implementation-artifacts' &&
    cfg.project_knowledge === 'tx-ovra-docs/knowledge-base' &&
    cfg.output_folder === 'tx-ovra-docs'
      ? h.pass('SIM-SETUP:bmad-config', 'Correct BMAD config field mapping')
      : h.fail('SIM-SETUP:bmad-config', `Got: ${JSON.stringify(cfg)}`);
  }

  h.section('Setup Workspace — Workspace Scan Exclusions');

  for (const exclude of ['_bmad', '_bmad-output', 'tdgs-aidlc-starter-kit']) {
    rules.shouldExcludeFromWorkspaceScan(exclude, 'tx-ovra-docs')
      ? h.pass(`SIM-SETUP:ws-excl-${exclude}`, `Excludes "${exclude}" from workspace scan`)
      : h.fail(`SIM-SETUP:ws-excl-${exclude}`, 'Expected true');
  }

  {
    rules.shouldExcludeFromWorkspaceScan('tx-ovra-docs', 'tx-ovra-docs')
      ? h.pass('SIM-SETUP:ws-excl-docs', 'Excludes docs folder from scan')
      : h.fail('SIM-SETUP:ws-excl-docs', 'Expected true');
  }

  {
    !rules.shouldExcludeFromWorkspaceScan('tx-ovra-api', 'tx-ovra-docs')
      ? h.pass('SIM-SETUP:ws-incl-api', 'Includes worker repo in scan')
      : h.fail('SIM-SETUP:ws-incl-api', 'Expected false');
  }

  // ════════════════════════════════════════════════════════════════════════
  // INSTALL HOOKS — EXTENDED
  // ════════════════════════════════════════════════════════════════════════

  h.section('Install Hooks — Worker Repo Skip Conditions');

  {
    const r = rules.shouldSkipWorkerRepo({ cloned: false, isGit: true, hasPrecommitConfig: true });
    r.skip && r.reason.includes('Not cloned')
      ? h.pass('SIM-HOOKS:skip-not-cloned', 'Skip when not cloned locally')
      : h.fail('SIM-HOOKS:skip-not-cloned', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.shouldSkipWorkerRepo({ cloned: true, isGit: false, hasPrecommitConfig: true });
    r.skip && r.reason.includes('Not a git')
      ? h.pass('SIM-HOOKS:skip-not-git', 'Skip when not a git repo')
      : h.fail('SIM-HOOKS:skip-not-git', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.shouldSkipWorkerRepo({ cloned: true, isGit: true, hasPrecommitConfig: false });
    r.skip && r.reason.includes('pre-commit')
      ? h.pass('SIM-HOOKS:skip-no-precommit', 'Skip when no .pre-commit-config.yaml')
      : h.fail('SIM-HOOKS:skip-no-precommit', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.shouldSkipWorkerRepo({ cloned: true, isGit: true, hasPrecommitConfig: true });
    !r.skip
      ? h.pass('SIM-HOOKS:no-skip', 'No skip when all conditions met')
      : h.fail('SIM-HOOKS:no-skip', `Unexpected skip: ${r.reason}`);
  }

  h.section('Install Hooks — Sibling Path Resolution');

  {
    const p = rules.resolveWorkerRepoPath('/projects/tx-ovra-docs', 'tx-ovra-api');
    p === '/projects/tx-ovra-api'
      ? h.pass('SIM-HOOKS:sibling-path', 'Resolves sibling directory correctly')
      : h.fail('SIM-HOOKS:sibling-path', `Got: ${p}`);
  }

  {
    const p = rules.resolveWorkerRepoPath('/home/user/workspace/tx-ovra-docs', 'tx-ovra-ui');
    p === '/home/user/workspace/tx-ovra-ui'
      ? h.pass('SIM-HOOKS:sibling-deep', 'Resolves deep nested sibling')
      : h.fail('SIM-HOOKS:sibling-deep', `Got: ${p}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // PREPARE REPOS — EXTENDED
  // ════════════════════════════════════════════════════════════════════════

  h.section('Prepare Repos — Spec File Glob');

  {
    const g = rules.specFileGlob('tx-ovra-docs');
    g === 'tx-ovra-docs/implementation-artifacts/spec-*.md'
      ? h.pass('SIM-PREPARE:spec-glob', 'Correct spec file glob pattern')
      : h.fail('SIM-PREPARE:spec-glob', `Got: ${g}`);
  }

  h.section('Prepare Repos — Branch Conflict Choice');

  {
    const c = rules.parseBranchConflictChoice('1');
    c === 'SKIP'
      ? h.pass('SIM-PREPARE:conflict-1', '"1" → SKIP')
      : h.fail('SIM-PREPARE:conflict-1', `Got: ${c}`);
  }

  {
    const c = rules.parseBranchConflictChoice('skip');
    c === 'SKIP'
      ? h.pass('SIM-PREPARE:conflict-skip', '"skip" → SKIP')
      : h.fail('SIM-PREPARE:conflict-skip', `Got: ${c}`);
  }

  {
    const c = rules.parseBranchConflictChoice('2');
    c === 'RESET'
      ? h.pass('SIM-PREPARE:conflict-2', '"2" → RESET')
      : h.fail('SIM-PREPARE:conflict-2', `Got: ${c}`);
  }

  {
    const c = rules.parseBranchConflictChoice('3');
    c === 'ABORT'
      ? h.pass('SIM-PREPARE:conflict-3', '"3" → ABORT')
      : h.fail('SIM-PREPARE:conflict-3', `Got: ${c}`);
  }

  {
    const c = rules.parseBranchConflictChoice('abort');
    c === 'ABORT'
      ? h.pass('SIM-PREPARE:conflict-abort', '"abort" → ABORT')
      : h.fail('SIM-PREPARE:conflict-abort', `Got: ${c}`);
  }

  {
    const c = rules.parseBranchConflictChoice('4');
    c === null
      ? h.pass('SIM-PREPARE:conflict-invalid', 'Invalid → null')
      : h.fail('SIM-PREPARE:conflict-invalid', `Got: ${c}`);
  }

  {
    const c = rules.parseBranchConflictChoice('');
    c === null
      ? h.pass('SIM-PREPARE:conflict-empty', 'Empty → null')
      : h.fail('SIM-PREPARE:conflict-empty', `Got: ${c}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // CREATE PULL REQUEST — EXTENDED
  // ════════════════════════════════════════════════════════════════════════

  h.section('Create PR — Draft Status');

  {
    const r = rules.parseDraftStatus('draft');
    r.action === 'PROCEED' && r.draft === true
      ? h.pass('SIM-PR:draft-yes', '"draft" → draft PR')
      : h.fail('SIM-PR:draft-yes', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseDraftStatus('DRAFT');
    r.action === 'PROCEED' && r.draft === true
      ? h.pass('SIM-PR:draft-case', 'Case-insensitive "DRAFT"')
      : h.fail('SIM-PR:draft-case', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseDraftStatus('ready');
    r.action === 'PROCEED' && r.draft === false
      ? h.pass('SIM-PR:ready', '"ready" → non-draft PR')
      : h.fail('SIM-PR:ready', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseDraftStatus('');
    r.action === 'ASK'
      ? h.pass('SIM-PR:draft-empty', 'Empty → prompt user')
      : h.fail('SIM-PR:draft-empty', `Got: ${r.action}`);
  }

  {
    const r = rules.parseDraftStatus(null);
    r.action === 'ASK'
      ? h.pass('SIM-PR:draft-null', 'Null → prompt user')
      : h.fail('SIM-PR:draft-null', `Got: ${r.action}`);
  }

  {
    const r = rules.parseDraftStatus('maybe');
    r.action === 'ASK' && r.reason
      ? h.pass('SIM-PR:draft-invalid', 'Invalid value → ASK with reason')
      : h.fail('SIM-PR:draft-invalid', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Create PR — Copilot Reviewer');

  {
    rules.shouldAddCopilotReviewer() === true
      ? h.pass('SIM-PR:copilot-reviewer', 'Always adds copilot as reviewer')
      : h.fail('SIM-PR:copilot-reviewer', 'Expected true');
  }

  h.section('Create PR — Commits Ahead');

  {
    const r = rules.checkCommitsAhead(0);
    r.action === 'BAIL'
      ? h.pass('SIM-PR:zero-commits', 'BAIL when 0 commits ahead')
      : h.fail('SIM-PR:zero-commits', `Got: ${r.action}`);
  }

  {
    const r = rules.checkCommitsAhead(5);
    r.action === 'PROCEED' && r.commitCount === 5
      ? h.pass('SIM-PR:five-commits', 'PROCEED with 5 commits ahead')
      : h.fail('SIM-PR:five-commits', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Create PR — Multi-Repo Selection');

  {
    const repos = ['api', 'ui', 'db'];
    const r = rules.parseMultiRepoSelection('all', repos);
    r && r.length === 3
      ? h.pass('SIM-PR:select-all', '"all" selects all repos')
      : h.fail('SIM-PR:select-all', `Got: ${r}`);
  }

  {
    const r = rules.parseMultiRepoSelection('cancel', ['api', 'ui']);
    Array.isArray(r) && r.length === 0
      ? h.pass('SIM-PR:select-cancel', '"cancel" returns empty array')
      : h.fail('SIM-PR:select-cancel', `Got: ${r}`);
  }

  {
    const r = rules.parseMultiRepoSelection('api, db', ['api', 'ui', 'db']);
    r && r.length === 2 && r.includes('api') && r.includes('db')
      ? h.pass('SIM-PR:select-specific', 'Comma-separated selects matching repos')
      : h.fail('SIM-PR:select-specific', `Got: ${r}`);
  }

  {
    const r = rules.parseMultiRepoSelection('nonexistent', ['api', 'ui']);
    r === null
      ? h.pass('SIM-PR:select-none-match', 'Returns null when no matches')
      : h.fail('SIM-PR:select-none-match', `Got: ${r}`);
  }

  {
    const r = rules.parseMultiRepoSelection('', ['api']);
    r === null
      ? h.pass('SIM-PR:select-empty', 'Returns null on empty input')
      : h.fail('SIM-PR:select-empty', `Got: ${r}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // TEST GENERATION — EXTENDED
  // ════════════════════════════════════════════════════════════════════════

  h.section('Test Generation — Test Title');

  {
    const t = rules.buildTestTitle('calculate $25 fee', 'recording count is 1', 'FEE-001');
    t === 'should calculate $25 fee when recording count is 1 [FEE-001]'
      ? h.pass('SIM-GEN:title-with-rule', 'Test title with rule ID')
      : h.fail('SIM-GEN:title-with-rule', `Got: ${t}`);
  }

  {
    const t = rules.buildTestTitle('display error message', 'input is empty', null);
    t === 'should display error message when input is empty'
      ? h.pass('SIM-GEN:title-no-rule', 'Test title without rule ID')
      : h.fail('SIM-GEN:title-no-rule', `Got: ${t}`);
  }

  h.section('Test Generation — Skip Completed');

  {
    const filtered = rules.filterSkippedModules(['api', 'ui', 'db'], ['api', 'db']);
    filtered.length === 1 && filtered[0] === 'ui'
      ? h.pass('SIM-GEN:skip-completed', 'Filters out completed modules')
      : h.fail('SIM-GEN:skip-completed', `Got: ${filtered}`);
  }

  {
    const filtered = rules.filterSkippedModules(['api', 'ui'], null);
    filtered.length === 2
      ? h.pass('SIM-GEN:skip-null', 'No filtering when skip list is null')
      : h.fail('SIM-GEN:skip-null', `Got: ${filtered}`);
  }

  {
    const filtered = rules.filterSkippedModules(['api', 'ui'], []);
    filtered.length === 2
      ? h.pass('SIM-GEN:skip-empty', 'No filtering when skip list is empty')
      : h.fail('SIM-GEN:skip-empty', `Got: ${filtered}`);
  }

  h.section('Test Generation — Auto-Scaffold');

  {
    rules.needsAutoScaffold({ hasTestDir: false, hasPackageJson: true, hasTestRunner: true, hasFramework: true })
      ? h.pass('SIM-GEN:scaffold-no-dir', 'Needs scaffold when test dir missing')
      : h.fail('SIM-GEN:scaffold-no-dir', 'Expected true');
  }

  {
    rules.needsAutoScaffold({ hasTestDir: true, hasPackageJson: false, hasTestRunner: true, hasFramework: true })
      ? h.pass('SIM-GEN:scaffold-no-pkg', 'Needs scaffold when package.json missing')
      : h.fail('SIM-GEN:scaffold-no-pkg', 'Expected true');
  }

  {
    !rules.needsAutoScaffold({ hasTestDir: true, hasPackageJson: true, hasTestRunner: true, hasFramework: true })
      ? h.pass('SIM-GEN:scaffold-all-ok', 'No scaffold when all infra present')
      : h.fail('SIM-GEN:scaffold-all-ok', 'Expected false');
  }

  h.section('Test Generation — Knowledge Base Paths');

  {
    const p = rules.kbBusinessRulesPath('tx-ovra-docs');
    p === 'tx-ovra-docs/knowledge-base/business/business-rules-catalog.md'
      ? h.pass('SIM-GEN:kb-biz-rules', 'Correct business rules path')
      : h.fail('SIM-GEN:kb-biz-rules', `Got: ${p}`);
  }

  {
    const p = rules.kbDataModelsPath('tx-ovra-docs');
    p === 'tx-ovra-docs/knowledge-base/shared/data-models.md'
      ? h.pass('SIM-GEN:kb-data-models', 'Correct data models path')
      : h.fail('SIM-GEN:kb-data-models', `Got: ${p}`);
  }

  {
    const p = rules.kbOpenApiPath('tx-ovra-docs', 'orderdetails-service');
    p === 'tx-ovra-docs/knowledge-base/api/orderdetails-service-openapi.yaml'
      ? h.pass('SIM-GEN:kb-openapi', 'Correct OpenAPI path with service name')
      : h.fail('SIM-GEN:kb-openapi', `Got: ${p}`);
  }

  {
    const p = rules.kbServiceArchPath('tx-ovra-docs', 'receipt-service');
    p === 'tx-ovra-docs/knowledge-base/repos/receipt-service/architecture.md'
      ? h.pass('SIM-GEN:kb-svc-arch', 'Correct service architecture path')
      : h.fail('SIM-GEN:kb-svc-arch', `Got: ${p}`);
  }

  {
    const p = rules.kbIntegrationArchPath('tx-ovra-docs');
    p === 'tx-ovra-docs/knowledge-base/shared/integration-architecture.md'
      ? h.pass('SIM-GEN:kb-integ-arch', 'Correct integration architecture path')
      : h.fail('SIM-GEN:kb-integ-arch', `Got: ${p}`);
  }

  {
    const p = rules.kbProcessFlowsPath('tx-ovra-docs');
    p === 'tx-ovra-docs/knowledge-base/business/process-flows.md'
      ? h.pass('SIM-GEN:kb-process-flows', 'Correct process flows path')
      : h.fail('SIM-GEN:kb-process-flows', `Got: ${p}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // INITIATE PROJECT (initiate-project)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Project Branch Naming');

  {
    const r = rules.buildProjectBranchName('42', 'new-payment-module');
    r.action === 'PROCEED' && r.branch === 'project/ghi-42-new-payment-module'
      ? h.pass('SIM-PROJECT:branch-ok', 'Builds project/ghi-{id}-{slug} branch')
      : h.fail('SIM-PROJECT:branch-ok', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.buildProjectBranchName('', 'slug');
    r.action === 'BAIL'
      ? h.pass('SIM-PROJECT:branch-no-id', 'BAIL when issue ID missing')
      : h.fail('SIM-PROJECT:branch-no-id', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.buildProjectBranchName('42', '');
    r.action === 'BAIL'
      ? h.pass('SIM-PROJECT:branch-no-slug', 'BAIL when slug missing')
      : h.fail('SIM-PROJECT:branch-no-slug', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Project Branch Parsing');

  {
    const r = rules.parseProjectBranch('project/ghi-42-new-payment-module');
    r.action === 'PROCEED' && r.issueId === '42' && r.slug === 'new-payment-module'
      ? h.pass('SIM-PROJECT:parse-ok', 'Parses project branch correctly')
      : h.fail('SIM-PROJECT:parse-ok', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseProjectBranch('feature/ghi-42-something');
    r.action === 'BAIL'
      ? h.pass('SIM-PROJECT:parse-not-project', 'BAIL on non-project branch')
      : h.fail('SIM-PROJECT:parse-not-project', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseProjectBranch('project/no-ghi-prefix');
    r.action === 'BAIL'
      ? h.pass('SIM-PROJECT:parse-bad-format', 'BAIL on malformed project branch')
      : h.fail('SIM-PROJECT:parse-bad-format', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Project Change Brief Metadata');

  {
    const m = rules.buildProjectChangeBriefMeta('42', 'myorg/docs', 'new-payment-module');
    m.source === 'github-issue' &&
    m.issue_id === '42' &&
    m.repository === 'myorg/docs' &&
    m.issue_type === 'project' &&
    m.integration_branch === 'project/ghi-42-new-payment-module' &&
    m.workflow === 'full-bmad'
      ? h.pass('SIM-PROJECT:brief-meta', 'Correct project change-brief (no dev branch)')
      : h.fail('SIM-PROJECT:brief-meta', `Got: ${JSON.stringify(m)}`);
  }

  h.section('Knowledge Base Directory Validation');

  {
    const r = rules.validateKnowledgeBaseDirs(['api', 'business', 'project', 'repos', 'shared']);
    r.action === 'PROCEED'
      ? h.pass('SIM-PROJECT:kb-all-dirs', 'PROCEED when all KB dirs present')
      : h.fail('SIM-PROJECT:kb-all-dirs', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.validateKnowledgeBaseDirs(['api', 'business', 'shared']);
    r.action === 'BAIL' && r.missing.includes('project') && r.missing.includes('repos')
      ? h.pass('SIM-PROJECT:kb-missing', 'BAIL with missing dirs listed')
      : h.fail('SIM-PROJECT:kb-missing', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.validateKnowledgeBaseDirs([]);
    r.action === 'BAIL' && r.missing.length === 5
      ? h.pass('SIM-PROJECT:kb-empty', 'BAIL when no KB dirs exist')
      : h.fail('SIM-PROJECT:kb-empty', `Got: ${JSON.stringify(r)}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SHOW AVAILABLE STORIES (show-available-stories)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Story Status Classification');

  {
    const c = rules.classifyStoryStatus('ready-for-dev', false, false);
    c === 'AVAILABLE'
      ? h.pass('SIM-STORIES:available', 'ready-for-dev + no branch + no deps → AVAILABLE')
      : h.fail('SIM-STORIES:available', `Got: ${c}`);
  }

  {
    const c = rules.classifyStoryStatus('ready-for-dev', false, true);
    c === 'BLOCKED'
      ? h.pass('SIM-STORIES:blocked', 'ready-for-dev + deps unmet → BLOCKED')
      : h.fail('SIM-STORIES:blocked', `Got: ${c}`);
  }

  {
    const c = rules.classifyStoryStatus('ready-for-dev', true, false);
    c === 'CLAIMED'
      ? h.pass('SIM-STORIES:claimed-branch', 'Has remote branch → CLAIMED')
      : h.fail('SIM-STORIES:claimed-branch', `Got: ${c}`);
  }

  {
    const c = rules.classifyStoryStatus('in-progress', false, false);
    c === 'CLAIMED'
      ? h.pass('SIM-STORIES:claimed-status', 'in-progress → CLAIMED')
      : h.fail('SIM-STORIES:claimed-status', `Got: ${c}`);
  }

  {
    const c = rules.classifyStoryStatus('review', false, false);
    c === 'CLAIMED'
      ? h.pass('SIM-STORIES:claimed-review', 'review → CLAIMED')
      : h.fail('SIM-STORIES:claimed-review', `Got: ${c}`);
  }

  {
    const c = rules.classifyStoryStatus('done', false, false);
    c === 'DONE'
      ? h.pass('SIM-STORIES:done', 'done → DONE')
      : h.fail('SIM-STORIES:done', `Got: ${c}`);
  }

  {
    const c = rules.classifyStoryStatus('backlog', false, false);
    c === 'NOT_READY'
      ? h.pass('SIM-STORIES:not-ready', 'backlog → NOT_READY')
      : h.fail('SIM-STORIES:not-ready', `Got: ${c}`);
  }

  h.section('Story Dependency Resolution');

  {
    const depMap = { '1-7-pipeline': ['1-1', '1-2', '1-3'] };
    const statuses = { '1-1-auth': 'done', '1-2-db': 'done', '1-3-config': 'done' };
    const r = rules.resolveStoryDependencies('1-7-pipeline', depMap, statuses);
    r.met === true && r.unmet.length === 0
      ? h.pass('SIM-STORIES:deps-all-met', 'All deps done → met')
      : h.fail('SIM-STORIES:deps-all-met', `Got: ${JSON.stringify(r)}`);
  }

  {
    const depMap = { '1-7-pipeline': ['1-1', '1-2', '1-3'] };
    const statuses = { '1-1-auth': 'done', '1-2-db': 'in-progress', '1-3-config': 'done' };
    const r = rules.resolveStoryDependencies('1-7-pipeline', depMap, statuses);
    r.met === false && r.unmet.includes('1-2')
      ? h.pass('SIM-STORIES:deps-partial', 'Unmet dep identified')
      : h.fail('SIM-STORIES:deps-partial', `Got: ${JSON.stringify(r)}`);
  }

  {
    const depMap = { '3-1-guard': ['epic-2'] };
    const statuses = { 'epic-2': 'done' };
    const r = rules.resolveStoryDependencies('3-1-guard', depMap, statuses);
    r.met === true
      ? h.pass('SIM-STORIES:deps-epic-met', 'Epic dependency met')
      : h.fail('SIM-STORIES:deps-epic-met', `Got: ${JSON.stringify(r)}`);
  }

  {
    const depMap = { '3-1-guard': ['epic-2'] };
    const statuses = { 'epic-2': 'in-progress' };
    const r = rules.resolveStoryDependencies('3-1-guard', depMap, statuses);
    r.met === false && r.unmet.includes('epic-2')
      ? h.pass('SIM-STORIES:deps-epic-unmet', 'Epic dependency not met')
      : h.fail('SIM-STORIES:deps-epic-unmet', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.resolveStoryDependencies('1-1-auth', null, {});
    r.met === true
      ? h.pass('SIM-STORIES:deps-no-map', 'No dep map → met')
      : h.fail('SIM-STORIES:deps-no-map', `Got: ${JSON.stringify(r)}`);
  }

  {
    const depMap = { '1-7-pipeline': ['1-1'] };
    const r = rules.resolveStoryDependencies('1-1-auth', depMap, {});
    r.met === true
      ? h.pass('SIM-STORIES:deps-not-in-map', 'Story not in dep map → met')
      : h.fail('SIM-STORIES:deps-not-in-map', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Story Dev Branch Parsing');

  {
    const r = rules.parseStoryDevBranch('dev/ghi-42-1-2-error-handling-johndoe', '42');
    r && r.epic === '1' && r.story === '2' && r.slug === 'error-handling' && r.username === 'johndoe' && r.storyKey === '1-2'
      ? h.pass('SIM-STORIES:parse-story-branch', 'Parses story dev branch correctly')
      : h.fail('SIM-STORIES:parse-story-branch', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseStoryDevBranch('dev/ghi-42-3-1-idempotency-guard-janedoe', '42');
    r && r.epic === '3' && r.story === '1' && r.slug === 'idempotency-guard' && r.username === 'janedoe'
      ? h.pass('SIM-STORIES:parse-story-multi-slug', 'Handles multi-word slug')
      : h.fail('SIM-STORIES:parse-story-multi-slug', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseStoryDevBranch('dev/ghi-99-1-2-foo-bar', '42');
    r === null
      ? h.pass('SIM-STORIES:parse-wrong-issue', 'null for non-matching issue ID')
      : h.fail('SIM-STORIES:parse-wrong-issue', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseStoryDevBranch('feature/ghi-42-something', '42');
    r === null
      ? h.pass('SIM-STORIES:parse-not-dev', 'null for non-dev branch')
      : h.fail('SIM-STORIES:parse-not-dev', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Slug to Title Conversion');

  {
    const t = rules.slugToTitle('error-handling');
    t === 'Error Handling'
      ? h.pass('SIM-STORIES:slug-title-simple', '"error-handling" → "Error Handling"')
      : h.fail('SIM-STORIES:slug-title-simple', `Got: ${t}`);
  }

  {
    const t = rules.slugToTitle('dry-run-pipeline-and-controller-endpoint');
    t === 'Dry Run Pipeline And Controller Endpoint'
      ? h.pass('SIM-STORIES:slug-title-long', 'Multi-word slug title conversion')
      : h.fail('SIM-STORIES:slug-title-long', `Got: ${t}`);
  }

  {
    const t = rules.slugToTitle('api');
    t === 'Api'
      ? h.pass('SIM-STORIES:slug-title-single', 'Single word slug')
      : h.fail('SIM-STORIES:slug-title-single', `Got: ${t}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SWITCH
  // ════════════════════════════════════════════════════════════════════════

  h.section('Switch Issue — Clean Working Tree');

  {
    const r = rules.checkAllReposClean([
      { name: 'docs', hasChanges: false },
      { name: 'api', hasChanges: false },
    ]);
    r.action === 'PROCEED'
      ? h.pass('SIM-SWITCH:all-clean', 'PROCEED when all repos clean')
      : h.fail('SIM-SWITCH:all-clean', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.checkAllReposClean([
      { name: 'docs', hasChanges: false },
      { name: 'api', hasChanges: true },
      { name: 'ui', hasChanges: true },
    ]);
    r.action === 'BAIL' && r.dirty.length === 2 && r.dirty.includes('api') && r.dirty.includes('ui')
      ? h.pass('SIM-SWITCH:dirty-repos', 'BAIL listing dirty repos')
      : h.fail('SIM-SWITCH:dirty-repos', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Switch Issue — Docs Branch Resolution');

  {
    const branches = ['dev/ghi-42-foo-johndoe', 'project/ghi-42-payment', 'feature/ghi-42-payment'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe');
    r.action === 'PROCEED' && r.branch === 'dev/ghi-42-foo-johndoe' && r.type === 'dev'
      ? h.pass('SIM-SWITCH:priority-dev', 'Dev branch takes priority')
      : h.fail('SIM-SWITCH:priority-dev', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['project/ghi-42-payment', 'feature/ghi-42-payment'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe');
    r.action === 'PROCEED' && r.branch === 'project/ghi-42-payment' && r.type === 'project'
      ? h.pass('SIM-SWITCH:priority-project', 'Project branch is 2nd priority')
      : h.fail('SIM-SWITCH:priority-project', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['feature/ghi-42-payment'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe');
    r.action === 'PROCEED' && r.branch === 'feature/ghi-42-payment' && r.type === 'integration'
      ? h.pass('SIM-SWITCH:priority-integration', 'Integration branch is 3rd priority')
      : h.fail('SIM-SWITCH:priority-integration', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['hotfix/ghi-42-urgent-fix'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe');
    r.action === 'PROCEED' && r.type === 'integration'
      ? h.pass('SIM-SWITCH:hotfix-integration', 'Hotfix branch matches integration priority')
      : h.fail('SIM-SWITCH:hotfix-integration', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['dev/ghi-99-other-user', 'feature/ghi-99-other'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe');
    r.action === 'BAIL'
      ? h.pass('SIM-SWITCH:no-match', 'BAIL when no branches match issue')
      : h.fail('SIM-SWITCH:no-match', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = [];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe');
    r.action === 'BAIL'
      ? h.pass('SIM-SWITCH:empty-branches', 'BAIL on empty branch list')
      : h.fail('SIM-SWITCH:empty-branches', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Switch — Role: EM');

  {
    const branches = ['planning/ghi-42-migration', 'project/ghi-42-migration', 'dev/ghi-42-foo-johndoe'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'em');
    r.action === 'PROCEED' && r.branch === 'planning/ghi-42-migration' && r.type === 'planning'
      ? h.pass('SIM-SWITCH:em-planning', 'EM targets planning branch')
      : h.fail('SIM-SWITCH:em-planning', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['project/ghi-42-migration', 'dev/ghi-42-foo-johndoe'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'em');
    r.action === 'PROCEED' && r.branch === 'project/ghi-42-migration' && r.type === 'project'
      ? h.pass('SIM-SWITCH:em-project-fallback', 'EM falls back to project branch when no planning')
      : h.fail('SIM-SWITCH:em-project-fallback', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['feature/ghi-42-payment'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'em');
    r.action === 'BAIL' && /M&O/.test(r.reason)
      ? h.pass('SIM-SWITCH:em-mo-bail', 'EM BAILs for M&O issues (no planning branch)')
      : h.fail('SIM-SWITCH:em-mo-bail', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = [];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'em');
    r.action === 'BAIL'
      ? h.pass('SIM-SWITCH:em-no-branches', 'EM BAILs when no branches found')
      : h.fail('SIM-SWITCH:em-no-branches', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Switch — Role: ADE');

  {
    const branches = ['dev/ghi-42-1-1-scaffolding-johndoe', 'planning/ghi-42-migration', 'project/ghi-42-migration'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'ade');
    r.action === 'PROCEED' && r.branch === 'dev/ghi-42-1-1-scaffolding-johndoe' && r.type === 'dev'
      ? h.pass('SIM-SWITCH:ade-dev', 'ADE targets dev branch')
      : h.fail('SIM-SWITCH:ade-dev', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['project/ghi-42-migration', 'planning/ghi-42-migration'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'ade');
    r.action === 'PROCEED' && r.branch === 'project/ghi-42-migration' && r.type === 'project'
      ? h.pass('SIM-SWITCH:ade-project-fallback', 'ADE falls back to project branch when no dev')
      : h.fail('SIM-SWITCH:ade-project-fallback', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['planning/ghi-42-migration'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'ade');
    r.action === 'BAIL' && /prepare-repos/.test(r.reason)
      ? h.pass('SIM-SWITCH:ade-no-dev-bail', 'ADE BAILs with prepare-repos message when no dev branch')
      : h.fail('SIM-SWITCH:ade-no-dev-bail', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['feature/ghi-42-payment'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'ade');
    r.action === 'BAIL'
      ? h.pass('SIM-SWITCH:ade-mo-no-dev', 'ADE BAILs for M&O with no dev branch')
      : h.fail('SIM-SWITCH:ade-mo-no-dev', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['dev/ghi-42-foo-johndoe', 'dev/ghi-42-bar-johndoe'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe', 'ade');
    r.action === 'ASK_USER' && r.candidates.length === 2
      ? h.pass('SIM-SWITCH:multi-dev-ade', 'ADE ASK_USER when multiple dev branches match')
      : h.fail('SIM-SWITCH:multi-dev-ade', `Got: ${JSON.stringify(r)}`);
  }

  {
    const branches = ['dev/ghi-42-foo-johndoe', 'dev/ghi-42-bar-johndoe', 'project/ghi-42-x'];
    const r = rules.resolveDocsBranchForSwitch(branches, '42', 'johndoe');
    r.action === 'ASK_USER'
      ? h.pass('SIM-SWITCH:multi-dev-auto', 'Auto-detect ASK_USER when multiple dev branches')
      : h.fail('SIM-SWITCH:multi-dev-auto', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Generate Dashboard — Prerequisites');

  {
    const r = rules.validateGenerateDashboardPrerequisites(false, true);
    r.action === 'BAIL' && /epics/i.test(r.reason)
      ? h.pass('SIM-DASH:no-epics', 'BAIL when epics file missing')
      : h.fail('SIM-DASH:no-epics', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.validateGenerateDashboardPrerequisites(true, false);
    r.action === 'BAIL' && /sprint-status/i.test(r.reason)
      ? h.pass('SIM-DASH:no-sprint-status', 'BAIL when sprint-status missing')
      : h.fail('SIM-DASH:no-sprint-status', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.validateGenerateDashboardPrerequisites(true, true);
    r.action === 'PROCEED'
      ? h.pass('SIM-DASH:ok', 'PROCEED when prerequisites present')
      : h.fail('SIM-DASH:ok', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Update Metrics — Harvey Ball');

  {
    const r = rules.clampHarveyMetric(3.9);
    r.action === 'PROCEED' && r.value === 3
      ? h.pass('SIM-METRICS:floor', 'Harvey metric floors to integer 0–4')
      : h.fail('SIM-METRICS:floor', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.clampHarveyMetric(5);
    r.action === 'PROCEED' && r.value === 4
      ? h.pass('SIM-METRICS:cap', 'Harvey metric caps at 4')
      : h.fail('SIM-METRICS:cap', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Manage Blockers — Command Parse');

  {
    const r = rules.parseManageBlockersCommand('add', '1-1-story', 'impact:high');
    r.action === 'PROCEED' && r.impact === 'high'
      ? h.pass('SIM-BLOCK:add', 'Parses add with impact')
      : h.fail('SIM-BLOCK:add', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseManageBlockersCommand('add', '1-1-story', 'no impact');
    r.action === 'BAIL'
      ? h.pass('SIM-BLOCK:add-bail', 'BAIL when impact missing on add')
      : h.fail('SIM-BLOCK:add-bail', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseManageBlockersCommand('resolve', '1-1-story', '');
    r.action === 'BAIL'
      ? h.pass('SIM-BLOCK:resolve-bail', 'BAIL when resolution empty')
      : h.fail('SIM-BLOCK:resolve-bail', `Got: ${JSON.stringify(r)}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // MULTI-REPO WORKSPACE DETECTION (all prompts)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Multi-Repo Workspace Detection');

  {
    const r = rules.detectGitContext(true, []);
    r.context === 'single-repo'
      ? h.pass('SIM-MULTI:single-repo', 'Current dir is git repo → single-repo')
      : h.fail('SIM-MULTI:single-repo', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.detectGitContext(false, ['tx-ovra-api', 'tx-ovra-ui']);
    r.context === 'multi-repo' && r.repos.length === 2
      ? h.pass('SIM-MULTI:multi-repo', 'Subdirs have git repos → multi-repo')
      : h.fail('SIM-MULTI:multi-repo', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.detectGitContext(false, []);
    r.action === 'BAIL'
      ? h.pass('SIM-MULTI:no-repos', 'No git repos anywhere → BAIL')
      : h.fail('SIM-MULTI:no-repos', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.detectGitContext(false, null);
    r.action === 'BAIL'
      ? h.pass('SIM-MULTI:null-repos', 'Null subdirGitRepos → BAIL')
      : h.fail('SIM-MULTI:null-repos', `Got: ${JSON.stringify(r)}`);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Project Course Correction
  // ────────────────────────────────────────────────────────────────────────

  h.section('Course Correction — Source Parsing');

  {
    const r = rules.parseCourseCorrectionSource('comment');
    r.action === 'PROCEED' && r.type === 'comment'
      ? h.pass('SIM-CC:source-comment', 'Parses "comment" source')
      : h.fail('SIM-CC:source-comment', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseCourseCorrectionSource('inline');
    r.action === 'PROCEED' && r.type === 'inline'
      ? h.pass('SIM-CC:source-inline', 'Parses "inline" source')
      : h.fail('SIM-CC:source-inline', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseCourseCorrectionSource('sub-issue:456');
    r.action === 'PROCEED' && r.type === 'sub-issue' && r.subId === '456'
      ? h.pass('SIM-CC:source-subissue', 'Parses "sub-issue:456" source')
      : h.fail('SIM-CC:source-subissue', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseCourseCorrectionSource('document:planning-artifacts/attachments/cr.pdf');
    r.action === 'PROCEED' && r.type === 'document' && r.path === 'planning-artifacts/attachments/cr.pdf'
      ? h.pass('SIM-CC:source-document', 'Parses "document:{path}" source')
      : h.fail('SIM-CC:source-document', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseCourseCorrectionSource('document:../../.env');
    r.action === 'BAIL'
      ? h.pass('SIM-CC:source-document-traversal', 'BAIL on path traversal in document source')
      : h.fail('SIM-CC:source-document-traversal', `Expected BAIL, got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseCourseCorrectionSource('document:foo/../../../etc/passwd');
    r.action === 'BAIL'
      ? h.pass('SIM-CC:source-document-traversal2', 'BAIL on nested path traversal')
      : h.fail('SIM-CC:source-document-traversal2', `Expected BAIL, got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseCourseCorrectionSource('url:https://confluence.example.com/cr-123');
    r.action === 'PROCEED' && r.type === 'url' && r.url === 'https://confluence.example.com/cr-123'
      ? h.pass('SIM-CC:source-url', 'Parses "url:{url}" source')
      : h.fail('SIM-CC:source-url', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseCourseCorrectionSource('invalid-source');
    r.action === 'BAIL'
      ? h.pass('SIM-CC:source-invalid', 'Rejects invalid source type')
      : h.fail('SIM-CC:source-invalid', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.parseCourseCorrectionSource(null);
    r.action === 'BAIL'
      ? h.pass('SIM-CC:source-null', 'Rejects null source')
      : h.fail('SIM-CC:source-null', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Course Correction — CR Sequence');

  {
    const seq = rules.nextCrSequence([], '42');
    seq === 1
      ? h.pass('SIM-CC:seq-first', 'First CR for project gets seq=1')
      : h.fail('SIM-CC:seq-first', `Got: ${seq}`);
  }

  {
    const seq = rules.nextCrSequence(['cr-brief-42-1.md', 'cr-brief-42-2.md'], '42');
    seq === 3
      ? h.pass('SIM-CC:seq-increment', 'Increments past existing CRs (1,2 → 3)')
      : h.fail('SIM-CC:seq-increment', `Got: ${seq}`);
  }

  {
    const seq = rules.nextCrSequence(['cr-brief-99-1.md'], '42');
    seq === 1
      ? h.pass('SIM-CC:seq-other-project', 'Ignores CRs from different project issue')
      : h.fail('SIM-CC:seq-other-project', `Got: ${seq}`);
  }

  h.section('Course Correction — CR Brief Metadata');

  {
    const meta = rules.buildCrBriefMeta('42', 1, 'comment', 'https://github.com/...');
    meta.project_issue === '42' && meta.cr_sequence === 1 && meta.source_type === 'comment' && meta.status === 'pending'
      ? h.pass('SIM-CC:brief-meta', 'Builds CR brief frontmatter correctly')
      : h.fail('SIM-CC:brief-meta', `Got: ${JSON.stringify(meta)}`);
  }

  h.section('Course Correction — Planning Branch Resolution');

  {
    const r = rules.resolvePlanningBranchAction('planning/ghi-42-bulk-refund', [], '42');
    r.action === 'CONTINUE'
      ? h.pass('SIM-CC:branch-already-planning', 'Already on planning/* → CONTINUE')
      : h.fail('SIM-CC:branch-already-planning', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.resolvePlanningBranchAction(
      'project/ghi-42-bulk-refund',
      ['planning/ghi-42-bulk-refund'],
      '42',
    );
    r.action === 'CHECKOUT' && r.branch === 'planning/ghi-42-bulk-refund'
      ? h.pass('SIM-CC:branch-checkout-existing', 'On project/*, planning/* exists → CHECKOUT')
      : h.fail('SIM-CC:branch-checkout-existing', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.resolvePlanningBranchAction('project/ghi-42-bulk-refund', [], '42');
    r.action === 'CREATE' && r.branch === 'planning/ghi-42-bulk-refund'
      ? h.pass('SIM-CC:branch-create-new', 'On project/*, no planning/* → CREATE')
      : h.fail('SIM-CC:branch-create-new', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.resolvePlanningBranchAction('master', [], '42');
    r.action === 'BAIL'
      ? h.pass('SIM-CC:branch-wrong', 'On master → BAIL')
      : h.fail('SIM-CC:branch-wrong', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.resolvePlanningBranchAction('project/ghi-99-other-project', [], '42');
    r.action === 'BAIL' && /does not match/.test(r.reason)
      ? h.pass('SIM-CC:branch-id-mismatch-project', 'project/* issue ID mismatch → BAIL')
      : h.fail('SIM-CC:branch-id-mismatch-project', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.resolvePlanningBranchAction('planning/ghi-99-other-project', [], '42');
    r.action === 'BAIL' && /does not match/.test(r.reason)
      ? h.pass('SIM-CC:branch-id-mismatch-planning', 'planning/* issue ID mismatch → BAIL')
      : h.fail('SIM-CC:branch-id-mismatch-planning', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Course Correction — Story Action Classification');

  {
    const cases = [
      { status: 'done', expected: 'CREATE_FOLLOWUP' },
      { status: 'in-progress', expected: 'APPEND_DELTA' },
      { status: 'review', expected: 'APPEND_DELTA' },
      { status: 'ready-for-dev', expected: 'MODIFY_IN_PLACE' },
      { status: 'backlog', expected: 'MODIFY_OR_REMOVE' },
    ];
    let allPass = true;
    for (const c of cases) {
      const result = rules.classifyCourseCorrectionStoryAction(c.status);
      if (result !== c.expected) {
        h.fail(`SIM-CC:story-${c.status}`, `Expected ${c.expected}, got ${result}`);
        allPass = false;
      }
    }
    if (allPass) {
      h.pass('SIM-CC:story-actions', 'All 5 story status→action mappings correct');
    }
  }

  {
    const r = rules.classifyCourseCorrectionStoryAction('unknown-status');
    r === 'UNKNOWN'
      ? h.pass('SIM-CC:story-unknown', 'Unknown status → UNKNOWN action')
      : h.fail('SIM-CC:story-unknown', `Got: ${r}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // RUN-TESTS (run-tests)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Run-Tests — Scope, Type, Environment, Mode');

  {
    const r = rules.validateTestScope('full');
    r.action === 'PROCEED' && r.scope === 'full'
      ? h.pass('SIM-RUNTESTS:scope-full', '"full" → PROCEED, scope=full')
      : h.fail('SIM-RUNTESTS:scope-full', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.validateTestScope(null);
    r.action === 'ASK'
      ? h.pass('SIM-RUNTESTS:scope-null', 'null → ASK')
      : h.fail('SIM-RUNTESTS:scope-null', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.validateTestType('api');
    r.action === 'PROCEED' && r.type === 'api'
      ? h.pass('SIM-RUNTESTS:type-api', '"api" → PROCEED, type=api')
      : h.fail('SIM-RUNTESTS:type-api', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.validateTestType('3');
    r.action === 'PROCEED' && r.type === 'api'
      ? h.pass('SIM-RUNTESTS:type-3', '"3" → PROCEED, type=api')
      : h.fail('SIM-RUNTESTS:type-3', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.validateTestType('unknown');
    r.action === 'ASK'
      ? h.pass('SIM-RUNTESTS:type-invalid', '"unknown" → ASK')
      : h.fail('SIM-RUNTESTS:type-invalid', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.validateTestEnvironment(null);
    r.action === 'PROCEED' && r.env === 'local'
      ? h.pass('SIM-RUNTESTS:env-default', 'null → PROCEED, env=local (default)')
      : h.fail('SIM-RUNTESTS:env-default', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.validateTestEnvironment('production');
    r.action === 'BAIL'
      ? h.pass('SIM-RUNTESTS:env-production', '"production" → BAIL')
      : h.fail('SIM-RUNTESTS:env-production', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.validateTestEnvironment('stage');
    r.action === 'PROCEED' && r.env === 'stage'
      ? h.pass('SIM-RUNTESTS:env-stage', '"stage" → PROCEED, env=stage')
      : h.fail('SIM-RUNTESTS:env-stage', `Got: ${JSON.stringify(r)}`);
  }

  {
    const r = rules.validateTestMode(null);
    r.action === 'ASK'
      ? h.pass('SIM-RUNTESTS:mode-null', 'null → ASK (no default)')
      : h.fail('SIM-RUNTESTS:mode-null', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.validateTestMode('real');
    r.action === 'PROCEED' && r.mode === 'real'
      ? h.pass('SIM-RUNTESTS:mode-real', '"real" → PROCEED, mode=real')
      : h.fail('SIM-RUNTESTS:mode-real', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Run-Tests — Pass Rate (G11)');

  {
    const rate = rules.computePassRate({ passed: 8, failed: 1, skipped: 3, dataIssue: 1, infra: 0 });
    rate === 0.8
      ? h.pass('SIM-RUNTESTS:passrate-basic', '8/(8+1+1+0) = 0.8 (skipped excluded)')
      : h.fail('SIM-RUNTESTS:passrate-basic', `Expected 0.8, got ${rate}`);
  }
  {
    const rate = rules.computePassRate({ passed: 0, failed: 0, skipped: 5, dataIssue: 0, infra: 0 });
    rate === 0.0
      ? h.pass('SIM-RUNTESTS:passrate-zero-denom', 'All skipped → 0.0')
      : h.fail('SIM-RUNTESTS:passrate-zero-denom', `Expected 0.0, got ${rate}`);
  }
  {
    const rate = rules.computePassRate({ passed: 10, failed: 0, skipped: 0, dataIssue: 0, infra: 0 });
    rate === 1.0
      ? h.pass('SIM-RUNTESTS:passrate-perfect', '10/(10+0+0+0) = 1.0')
      : h.fail('SIM-RUNTESTS:passrate-perfect', `Expected 1.0, got ${rate}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SETUP-TESTDATA (setup-testdata)
  // ════════════════════════════════════════════════════════════════════════

  h.section('Setup-Testdata — Pool Record Status & Quarantine');

  {
    const r = rules.classifyPoolRecordStatus('pass', 3, 5);
    r.status === 'available' && r.consecutiveFailureCount === 0
      ? h.pass('SIM-TESTDATA:pool-pass', 'pass → available, consecutiveFailureCount reset to 0')
      : h.fail('SIM-TESTDATA:pool-pass', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.classifyPoolRecordStatus('fail', 2, 5);
    r.status === 'available' && r.consecutiveFailureCount === 3
      ? h.pass('SIM-TESTDATA:pool-fail-below', 'fail (2→3, below threshold 5) → available')
      : h.fail('SIM-TESTDATA:pool-fail-below', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.classifyPoolRecordStatus('fail', 4, 5);
    r.status === 'quarantined' && r.consecutiveFailureCount === 5
      ? h.pass('SIM-TESTDATA:pool-quarantine', 'fail (4→5, at threshold) → quarantined')
      : h.fail('SIM-TESTDATA:pool-quarantine', `Got: ${JSON.stringify(r)}`);
  }
  {
    const r = rules.classifyPoolRecordStatus('skip', 2, 5);
    r.status === 'available' && r.consecutiveFailureCount === 2
      ? h.pass('SIM-TESTDATA:pool-skip', 'skip → available, count unchanged')
      : h.fail('SIM-TESTDATA:pool-skip', `Got: ${JSON.stringify(r)}`);
  }

  h.section('Setup-Testdata — Placeholder & Catalog Merge');

  {
    const yes = rules.isPlaceholderValue('PLACEHOLDER_SSN');
    const no = rules.isPlaceholderValue('123-45-6789');
    yes && !no
      ? h.pass('SIM-TESTDATA:placeholder', 'PLACEHOLDER_SSN detected, real value rejected')
      : h.fail('SIM-TESTDATA:placeholder', `Got: yes=${yes}, no=${no}`);
  }

  {
    const cases = [
      { exists: false, data: true, expected: 'create' },
      { exists: true, data: true, expected: 'merge' },
      { exists: true, data: false, expected: 'preserve' },
      { exists: false, data: false, expected: 'skip' },
    ];
    let allPass = true;
    for (const c of cases) {
      const result = rules.classifyCatalogMergeAction(c.exists, c.data);
      if (result !== c.expected) {
        h.fail(`SIM-TESTDATA:merge-${c.expected}`, `Expected ${c.expected}, got ${result}`);
        allPass = false;
      }
    }
    if (allPass) {
      h.pass('SIM-TESTDATA:merge-actions', 'All 4 catalog merge action mappings correct');
    }
  }
  // ════════════════════════════════════════════════════════════════════════
  // Help — Mode Routing
  // ════════════════════════════════════════════════════════════════════════

  h.section('Help — Mode Routing');

  {
    const cases = [
      { id: 'empty', input: '', expected: 'A', desc: 'empty → overview' },
      { id: 'help', input: 'help', expected: 'A', desc: '"help" → overview' },
      { id: 'what-can-i-do', input: 'what can I do', expected: 'A', desc: '"what can I do" → overview' },
      { id: 'em', input: 'em', expected: 'B', desc: '"em" → role filter' },
      { id: 'ade', input: 'ADE', expected: 'B', desc: '"ADE" → role filter' },
      { id: 'commit', input: 'commit', expected: 'C', desc: '"commit" → targeted detail' },
      { id: 'full-name', input: 'tdgs-aidlc-commit', expected: 'C', desc: '"tdgs-aidlc-commit" → targeted detail' },
      { id: 'workflow-q', input: 'how do I create a PR', expected: 'D', desc: 'workflow question → sequence' },
    ];
    let allPass = true;
    for (const c of cases) {
      const result = rules.routeHelpMode(c.input);
      if (result !== c.expected) {
        h.fail(`SIM-HELP:mode-${c.id}`, `Expected mode ${c.expected}, got ${result} (${c.desc})`);
        allPass = false;
      }
    }
    if (allPass) {
      h.pass('SIM-HELP:mode-routing', `All ${cases.length} help mode routing cases correct`);
    }
  }
}

module.exports = { run };
