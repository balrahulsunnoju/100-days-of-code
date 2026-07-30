#!/usr/bin/env node

/**
 * Test: Cross-Reference Integrity
 *
 * Validates all references between documents in the AIDLC toolkit:
 *   - Internal anchor links (#heading) resolve to real headings
 *   - Relative file links (./path.md) resolve to existing files
 *   - Prompt invocation references (/tdgs-aidlc-*) match real prompt files
 *   - BMAD skill references (/bmad-*) are from the known-valid set
 *   - Cross-guide links between all user guides resolve
 *   - README.md links resolve
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness');

const SCAN_DIRS = ['doc', 'src'];

// Known BMAD 6.3.0 skills (valid invocations)
// Source of truth: doc/contributing/catalog.md § 3
const VALID_BMAD_SKILLS = new Set([
  '/bmad-quick-dev',
  '/bmad-code-review',
  '/bmad-party-mode',
  '/bmad-checkpoint-preview',
  '/bmad-help',
  '/bmad-document-project',
  '/bmad-generate-project-context',
  '/bmad-correct-course',
  '/bmad-create-epics-and-stories',
  '/bmad-sprint-planning',
  '/bmad-product-brief',
  '/bmad-create-prd',
  '/bmad-create-architecture',
  '/bmad-create-story',
  '/bmad-dev-story',
]);

// Known removed skills
const REMOVED_BMAD_SKILLS = new Set(['/bmad-quick-spec', '/bmad-init']);

// ──────────────────────────────────────────────────────────────────────────
// Heading slug generation (GitHub-compatible)
// ──────────────────────────────────────────────────────────────────────────

function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/ /g, '-')
    .replace(/^-|-$/g, '');
}

function extractAnchors(content) {
  const anchors = new Set();
  const slugCounts = new Map();
  const stripped = content.replace(/^```[\s\S]*?^```/gm, '');
  for (const line of stripped.split('\n')) {
    const m = line.match(/^#{1,6}\s+(.+)/);
    if (m) {
      const base = slugify(m[1]);
      const count = slugCounts.get(base) || 0;
      slugCounts.set(base, count + 1);
      // First occurrence gets plain slug, subsequent get -1, -2, etc.
      anchors.add(base);
      if (count > 0) {
        anchors.add(`${base}-${count}`);
      }
    }
  }
  return anchors;
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

function run() {
  const files = h.collectFiles(SCAN_DIRS);
  const mdFiles = files.filter((f) => f.relPath.endsWith('.md'));

  // ── Internal anchor links ──
  h.section('Internal Anchor Links');

  let brokenAnchors = 0;
  for (const { fullPath, relPath } of mdFiles) {
    const content = h.readContent(fullPath);
    const anchors = extractAnchors(content);
    const lines = content.split('\n');
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      if (/^\s*```/.test(lines[i])) inCodeBlock = !inCodeBlock;
      if (inCodeBlock) continue;
      const linkPattern = /\[([^\]]*)\]\(#([^)]+)\)/g;
      let m;
      while ((m = linkPattern.exec(lines[i])) !== null) {
        if (!anchors.has(m[2])) {
          brokenAnchors++;
          if (brokenAnchors <= 15) {
            h.fail('XREF-ANCHOR', `Broken anchor: [${m[1]}](#${m[2]})`, `${relPath}:${i + 1}`);
          }
        }
      }
    }
  }
  if (brokenAnchors === 0) {
    h.pass('XREF-ANCHOR', 'All internal anchor links resolve');
  } else if (brokenAnchors > 15) {
    h.fail('XREF-ANCHOR-OVERFLOW', `${brokenAnchors} total broken anchors (showing first 15)`);
  }

  // ── Relative file links ──
  h.section('Relative File Links');

  let brokenFileLinks = 0;
  for (const { fullPath, relPath } of mdFiles) {
    const content = h.readContent(fullPath);
    const dir = path.dirname(fullPath);
    const lines = content.split('\n');
    let inCodeBlock = false;
    for (const line of lines) {
      if (/^\s*```/.test(line)) inCodeBlock = !inCodeBlock;
      if (inCodeBlock) continue;
      const linkPattern = /\[([^\]]*)\]\(([^)#]+\.(?:md|yml|yaml|json))\)/g;
      let m;
      while ((m = linkPattern.exec(line)) !== null) {
        const target = m[2];
        if (target.startsWith('http://') || target.startsWith('https://')) continue;
        const resolved = path.resolve(dir, target);
        if (!fs.existsSync(resolved)) {
          brokenFileLinks++;
          if (brokenFileLinks <= 15) {
            h.fail('XREF-FILE', `Broken link: [${m[1]}](${target})`, `In: ${relPath}`);
          }
        }
      }
    }
  }
  if (brokenFileLinks === 0) {
    h.pass('XREF-FILE', 'All relative file links resolve');
  } else if (brokenFileLinks > 15) {
    h.fail('XREF-FILE-OVERFLOW', `${brokenFileLinks} total broken file links (showing first 15)`);
  }

  // ── Prompt invocation references ──
  h.section('Prompt Invocation References');

  const promptDir = path.join(h.ROOT, 'src', 'prompts');
  const promptNames = new Set(
    fs.readdirSync(promptDir)
      .filter((f) => f.endsWith('.prompt.md'))
      .map((f) => '/' + f.replace('.prompt.md', ''))
  );

  // Also recognize i2a-skills as valid command references
  const skillsDir = path.join(h.ROOT, 'src', 'i2a-skills');
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir)) {
      if (fs.statSync(path.join(skillsDir, entry)).isDirectory()) {
        promptNames.add('/' + entry);
      }
    }
  }

  const allPromptRefs = new Map();
  for (const { fullPath, relPath } of mdFiles) {
    const content = h.readContent(fullPath);
    // Match /tdgs-aidlc-* invocations but NOT the repo name itself
    const pattern = /\/tdgs-aidlc-[\w-]+/g;
    let m;
    while ((m = pattern.exec(content)) !== null) {
      const ref = m[0];
      // Skip repo-name references like /tdgs-aidlc-starter-kit
      if (ref === '/tdgs-aidlc-starter-kit') continue;
      // Skip glob prefix patterns like /tdgs-aidlc-setup-* (captured as /tdgs-aidlc-setup-)
      if (ref.endsWith('-')) continue;
      if (!allPromptRefs.has(ref)) allPromptRefs.set(ref, []);
      allPromptRefs.get(ref).push(relPath);
    }
  }

  for (const [ref, fileList] of allPromptRefs) {
    if (promptNames.has(ref)) {
      h.pass(`XREF-PROMPT:${ref}`, `Prompt ref "${ref}" → file exists`);
    } else {
      h.fail(`XREF-PROMPT:${ref}`, `Prompt ref "${ref}" has no matching prompt file`, [...new Set(fileList)]);
    }
  }

  // ── BMAD skill references ──
  h.section('BMAD Skill References');

  const allSkillRefs = new Map();
  for (const { fullPath, relPath } of mdFiles) {
    const content = h.readContent(fullPath);
    const lines = content.split('\n');
    let fenceLevel = 0;
    for (const line of lines) {
      const fenceMatch = line.match(/^(\s*`{3,})/);
      if (fenceMatch) {
        const backtickCount = (fenceMatch[1].match(/`/g) || []).length;
        if (fenceLevel === 0) fenceLevel = backtickCount;
        else if (backtickCount >= fenceLevel) fenceLevel = 0;
        continue;
      }
      if (fenceLevel > 0) continue;
      const pattern = /\/bmad-[\w-]+/g;
      let m;
      while ((m = pattern.exec(line)) !== null) {
        const ref = m[0];
        if (!allSkillRefs.has(ref)) allSkillRefs.set(ref, []);
        allSkillRefs.get(ref).push(relPath);
      }
    }
  }

  for (const [ref, fileList] of allSkillRefs) {
    if (REMOVED_BMAD_SKILLS.has(ref)) {
      h.fail(`XREF-SKILL:${ref}`, `Removed BMAD skill "${ref}" still referenced`, [...new Set(fileList)]);
    } else if (VALID_BMAD_SKILLS.has(ref)) {
      h.pass(`XREF-SKILL:${ref}`, `Valid BMAD skill: ${ref}`);
    } else {
      h.fail(`XREF-SKILL:${ref}`, `Unknown BMAD skill "${ref}" — not in VALID_BMAD_SKILLS or REMOVED_BMAD_SKILLS; verify it exists or add to the appropriate set`);
    }
  }

  // ── Skill internal file references ──
  h.section('Skill Internal File References');

  const skillsRoot = path.join(h.ROOT, 'src', 'i2a-skills');
  if (fs.existsSync(skillsRoot)) {
    for (const skillName of fs.readdirSync(skillsRoot)) {
      const skillDir = path.join(skillsRoot, skillName);
      if (!fs.statSync(skillDir).isDirectory()) continue;
      const skillMd = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const skillContent = h.readContent(skillMd);
      const refPattern = /(?:workflow\.md|tools\/[\w-]+\.md)/g;
      let ref;
      while ((ref = refPattern.exec(skillContent)) !== null) {
        const refPath = path.join(skillDir, ref[0]);
        if (fs.existsSync(refPath)) {
          h.pass(`XREF-SKINTERN:${skillName}:${ref[0]}`, `Skill ref exists: ${ref[0]}`);
        } else {
          const inSibling = fs.readdirSync(skillsRoot).some(sib => {
            const sibPath = path.join(skillsRoot, sib, ref[0]);
            return fs.existsSync(sibPath);
          });
          if (inSibling) {
            h.pass(`XREF-SKINTERN:${skillName}:${ref[0]}`, `Skill ref exists in sibling: ${ref[0]}`);
          } else {
            h.fail(`XREF-SKINTERN:${skillName}:${ref[0]}`, `Skill ref missing: ${skillName}/${ref[0]}`);
          }
        }
      }
    }
  }

  // ── README links ──
  h.section('README Link Validation');

  const readmePath = path.join(h.ROOT, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readme = h.readContent(readmePath);
    const linkPattern = /\[([^\]]*)\]\(\.\/([^)#]+)\)/g;
    let m;
    let readmeBroken = 0;
    while ((m = linkPattern.exec(readme)) !== null) {
      const target = m[2];
      const resolved = path.resolve(h.ROOT, target);
      if (fs.existsSync(resolved)) {
        h.pass(`XREF-README:${target}`, `README link resolves: ${target}`);
      } else {
        readmeBroken++;
        h.fail(`XREF-README:${target}`, `README broken link: [${m[1]}](./${target})`);
      }
    }
    if (readmeBroken === 0) {
      h.pass('XREF-README', 'All README links valid');
    }
  } else {
    h.skip('XREF-README', 'README.md not found');
  }
}

module.exports = { run };
