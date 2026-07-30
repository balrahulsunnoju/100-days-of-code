#!/usr/bin/env node

/**
 * Test: Version Consistency
 *
 * Ensures version numbers are consistent across all toolkit files:
 *   - VERSION file, README badge, i2a-config.yml, CHANGELOG
 *   - BMAD version references are consistent
 *   - No stale/outdated version strings in guides or prompts
 *   - Changelog follows Keep a Changelog format
 *   - Changelog has entry for current version
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness');

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

function run() {
  h.section('Starter Kit Version Consistency');

  // Read VERSION file
  const versionPath = path.join(h.ROOT, 'VERSION');
  let kitVersion = null;
  if (fs.existsSync(versionPath)) {
    kitVersion = h.readContent(versionPath).trim();
    if (/^\d+\.\d+\.\d+$/.test(kitVersion)) {
      h.pass('VER-1', `VERSION file: ${kitVersion}`);
    } else {
      h.fail('VER-1', `VERSION file has invalid semver: "${kitVersion}"`);
    }
  } else {
    h.fail('VER-1', 'VERSION file not found');
  }

  // README badge matches VERSION
  const readmePath = path.join(h.ROOT, 'README.md');
  if (fs.existsSync(readmePath) && kitVersion) {
    const readme = h.readContent(readmePath);
    const badgeMatch = readme.match(/version-(\d+\.\d+\.\d+)/);
    if (badgeMatch) {
      if (badgeMatch[1] === kitVersion) {
        h.pass('VER-2', `README badge matches VERSION: ${kitVersion}`);
      } else {
        h.fail('VER-2', `README badge (${badgeMatch[1]}) ≠ VERSION (${kitVersion})`);
      }
    } else {
      h.skip('VER-2', 'No version badge found in README');
    }
  }

  // package.json version matches VERSION
  const pkgPath = path.join(h.ROOT, 'package.json');
  if (fs.existsSync(pkgPath) && kitVersion) {
    const pkg = JSON.parse(h.readContent(pkgPath));
    if (pkg.version === kitVersion) {
      h.pass('VER-3', `package.json version matches VERSION: ${kitVersion}`);
    } else {
      h.fail('VER-3', `package.json (${pkg.version}) ≠ VERSION (${kitVersion})`);
    }
  }

  // ── NEXT_VERSION file ──
  h.section('NEXT_VERSION Validation');

  const nextVersionPath = path.join(h.ROOT, 'NEXT_VERSION');
  if (fs.existsSync(nextVersionPath)) {
    const nvRaw = h.readContent(nextVersionPath);
    if (nvRaw.length > 0 && !/^\d+\.\d+\.\d+\n?$/.test(nvRaw)) {
      h.fail('VER-NV-FMT', `NEXT_VERSION has unexpected raw format (whitespace, BOM, or extra lines): ${JSON.stringify(nvRaw.slice(0, 40))}`);
    }
    const nvContent = nvRaw.trim();
    if (nvContent === '') {
      h.pass('VER-NV-1', 'NEXT_VERSION file is empty (no override active)');
    } else if (/^\d+\.\d+\.\d+$/.test(nvContent)) {
      h.pass('VER-NV-1', `NEXT_VERSION has valid semver: ${nvContent}`);

      if (kitVersion) {
        const [nvMaj, nvMin, nvPat] = nvContent.split('.').map(Number);
        const [kvMaj, kvMin, kvPat] = kitVersion.split('.').map(Number);
        const nvNum = nvMaj * 10000 + nvMin * 100 + nvPat;
        const kvNum = kvMaj * 10000 + kvMin * 100 + kvPat;
        if (nvNum > kvNum) {
          h.pass('VER-NV-2', `NEXT_VERSION (${nvContent}) > current VERSION (${kitVersion})`);
        } else {
          h.fail('VER-NV-2', `NEXT_VERSION (${nvContent}) must be greater than current VERSION (${kitVersion})`);
        }
      }
    } else {
      h.fail('VER-NV-1', `NEXT_VERSION has invalid format: "${nvContent}" (expected empty or X.Y.Z)`);
    }
  } else {
    h.skip('VER-NV-1', 'NEXT_VERSION file not found (optional)');
  }

  // ── BMAD version ──
  h.section('BMAD Version Consistency');

  const configPath = path.join(h.ROOT, 'src', 'i2a-config.yml');
  let bmadVersion = null;
  if (fs.existsSync(configPath)) {
    const cfg = h.readContent(configPath);
    const m = cfg.match(/bmad:\s*["']?(\d+\.\d+\.\d+)["']?/);
    if (m) {
      bmadVersion = m[1];
      h.pass('VER-BMAD-1', `i2a-config.yml BMAD version: ${bmadVersion}`);
    } else {
      h.fail('VER-BMAD-1', 'i2a-config.yml missing BMAD semver');
    }
  }

  // Guides should reference the configured BMAD version (not an older one)
  if (bmadVersion) {
    const [major, minor] = bmadVersion.split('.');
    const versionPattern = new RegExp(`BMAD\\s+${major}\\.${minor}\\.\\d+`, 'g');
    const oldMajorMinorPattern = /BMAD\s+(\d+)\.(\d+)\.\d+/g;

    const guideFiles = [
      'doc/setup.md',
      'doc/reference.md',
    ];

    for (const rel of guideFiles) {
      const fp = path.join(h.ROOT, rel);
      if (!fs.existsSync(fp)) continue;
      const content = h.readContent(fp);
      const shortName = path.basename(rel, '.md');

      // Check if any BMAD version reference exists
      const allVersions = [];
      let m;
      while ((m = oldMajorMinorPattern.exec(content)) !== null) {
        allVersions.push(m[0]);
      }

      if (allVersions.length > 0) {
        // Check for stale versions (different major.minor)
        const staleVersions = allVersions.filter(
          (v) => !v.includes(`${major}.${minor}`)
        );
        if (staleVersions.length === 0) {
          h.pass(`VER-BMAD:${shortName}`, `All BMAD version refs match ${major}.${minor}.x`);
        } else {
          h.fail(
            `VER-BMAD:${shortName}`,
            `Stale BMAD version(s) found: ${[...new Set(staleVersions)].join(', ')}`,
            `Expected ${major}.${minor}.x`
          );
        }
      } else {
        h.skip(`VER-BMAD:${shortName}`, 'No explicit BMAD version references');
      }
    }
  }

  // ── CHANGELOG format ──
  h.section('Changelog Validation');

  const clPath = path.join(h.ROOT, 'CHANGELOG.md');
  if (fs.existsSync(clPath)) {
    const cl = h.readContent(clPath);

    // Has Keep a Changelog link
    if (/keepachangelog\.com/i.test(cl)) {
      h.pass('VER-CL-1', 'Changelog references Keep a Changelog standard');
    } else {
      h.fail('VER-CL-1', 'Changelog missing Keep a Changelog reference');
    }

    // Has Semantic Versioning link
    if (/semver\.org/i.test(cl)) {
      h.pass('VER-CL-2', 'Changelog references Semantic Versioning');
    } else {
      h.fail('VER-CL-2', 'Changelog missing Semantic Versioning reference');
    }

    // Has [Unreleased] section
    if (/\[Unreleased\]/i.test(cl)) {
      h.pass('VER-CL-3', 'Changelog has [Unreleased] section');
    } else {
      h.fail('VER-CL-3', 'Changelog missing [Unreleased] section');
    }

    // Has version entries matching VERSION file
    if (kitVersion && cl.includes(`[${kitVersion}]`)) {
      h.pass('VER-CL-4', `Changelog has entry for current version [${kitVersion}]`);
    } else if (kitVersion) {
      h.fail('VER-CL-4', `Changelog missing entry for current VERSION: ${kitVersion}`);
    }

    // Uses standard change categories
    const categories = ['Added', 'Changed', 'Fixed', 'Removed', 'Deprecated', 'Security'];
    const usedCategories = categories.filter((c) => cl.includes(`### ${c}`));
    if (usedCategories.length > 0) {
      h.pass('VER-CL-5', `Uses standard categories: ${usedCategories.join(', ')}`);
    } else {
      h.fail('VER-CL-5', 'No standard change categories (Added/Changed/Fixed/etc.)');
    }

    // Compare URLs at bottom
    if (/\[.*\]:.*compare\//.test(cl) || /\[Unreleased\]:/.test(cl)) {
      h.pass('VER-CL-6', 'Has compare URLs');
    } else {
      h.skip('VER-CL-6', 'No compare URLs detected');
    }
  } else {
    h.fail('VER-CL-0', 'CHANGELOG.md not found');
  }
}

module.exports = { run };
