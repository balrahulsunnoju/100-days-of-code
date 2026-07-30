#!/usr/bin/env node
/**
 * Mechanical post-generation checks (subset of tools/post-generation-checks.md).
 * Checks 11 (token leak), 15 (captured in negative/edge), 17 (AJV response-schema
 * validation), 20 (assertion strictness + data-file emptiness), Postman pm.*,
 * plus the unit-test-code-patterns.md rule #5 (positive tests assert
 * `resp.elapsedTime` SLA).
 *
 * Usage:
 *   node post-generation-gate.mjs path/to/collection.json [more.json ...]
 *   node post-generation-gate.mjs path/to/collections/
 *
 * Environment overrides (per tools/post-generation-checks.md "SKIP for
 * schemaSource: code-fallback" carve-out — use when KB OpenAPI is absent or
 * the endpoint returns non-JSON):
 *   SKIP_AJV=1            disable Check 17 (AJV) enforcement
 *   SKIP_ELAPSED_TIME=1   disable rule #5 (elapsedTime SLA) enforcement
 *
 * These flags are documented escape hatches, not silent skips — the script
 * still reports which positive tests are uncovered as informational lines so
 * the agent can record the carve-out reason in the generation report.
 */

import fs from 'node:fs';
import path from 'node:path';

const SKIP_AJV = process.env.SKIP_AJV === '1' || process.env.SKIP_AJV === 'true';
const SKIP_ELAPSED_TIME =
  process.env.SKIP_ELAPSED_TIME === '1' || process.env.SKIP_ELAPSED_TIME === 'true';

// Allowed token shapes per setup-api-tests/workflow.md LINT-2 + Output Contract
// (env-field names base_url/context_path/auth_token/content_type are pinned).
// catalog.stubs.* is the documented cross-service stub pattern (G7, G15.2).
const ALLOWED_TOKEN =
  /^\{\{(?:\s*(?:base_url|context_path|auth_token|content_type)\s*|catalog\.identityPool\.[^}]+|catalog\.stubs\.[^}]+|captured\.[^}]+|\$(?:randomUUID|timestamp|isoTimestamp|randomInt|randomFirstName|randomLastName|randomFullName|randomEmail|randomPhone|randomStreetAddress|randomCity|randomState|randomZip|randomDate|randomGender))\}\}$/;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: post-generation-gate.mjs <collection.json|dir> [...]');
  process.exit(2);
}

function collectJsonFiles(target) {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) return [];
  const st = fs.statSync(abs);
  if (st.isFile()) return abs.endsWith('.json') ? [abs] : [];
  const out = [];
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    if (ent.isFile() && ent.name.endsWith('.json')) out.push(path.join(abs, ent.name));
  }
  return out;
}

const files = [...new Set(args.flatMap(collectJsonFiles))].sort();
if (files.length === 0) {
  console.error('No collection JSON files found.');
  process.exit(2);
}

const failures = [];
const warnings = [];

function fail(check, file, detail) {
  failures.push({ check, file, detail });
}

function walkResources(doc, cb) {
  const resources = doc?.resources ?? (Array.isArray(doc) ? doc : null);
  if (!Array.isArray(resources)) return;
  const byId = new Map(resources.map((r) => [r._id, r]));
  for (const r of resources) cb(r, byId);
}

function folderPath(resource, byId) {
  const parts = [];
  let cur = resource;
  const seen = new Set();
  while (cur?.parentId && !seen.has(cur.parentId)) {
    seen.add(cur.parentId);
    const parent = byId.get(cur.parentId);
    if (!parent) break;
    if (parent.name) parts.unshift(parent.name);
    cur = parent;
  }
  return parts.join('/');
}

function isNegativeOrEdge(folder, name) {
  const f = folder.toLowerCase();
  if (/(^|\/)negative(\/|$)|(^|\/)edge-?case(\/|$)/.test(f)) return true;
  const n = (name || '').toLowerCase();
  return (
    n.includes('missing required') ||
    n.includes('invalid format') ||
    n.includes('xss') ||
    n.includes('sql') ||
    n.includes('injection') ||
    n.includes('traversal') ||
    n.includes('boundary') ||
    // Additive: explicit negative-test name patterns surfaced once Check 17 /
    // rule #5 enforcement went live. All patterns assert non-2xx — never a
    // positive test. Conservative: only widens the negative set, never
    // reclassifies a previously-positive test.
    /\breturns?\s*[45]\d{2}\b/.test(n) ||           // "returns 400", "returns 5xx"
    /\bexpects?\s*[45]\d{2}\b/.test(n) ||           // "expects 422"
    /^\s*(missing|invalid|malformed|forbidden|unauthorized)\b/.test(n) ||
    /\b(missing|invalid|malformed)\s+\S+\s+(returns?|expects?|format)\b/.test(n)
  );
}

function isPositive(folder, name) {
  const f = folder.toLowerCase();
  if (/(^|\/)positive(\/|$)/.test(f)) return true;
  if (isNegativeOrEdge(folder, name)) return false;
  const n = (name || '').toLowerCase();
  return !/^(negative|edge|security)\b/.test(n) && !n.includes('xss') && !n.includes('sql');
}

function isSecurityInjection(folder, name) {
  const f = folder.toLowerCase();
  const n = (name || '').toLowerCase();
  const inEdge = /(^|\/)edge-?case(\/|$)/.test(f);
  return (
    inEdge &&
    /xss|sql|injection|traversal|command/.test(n)
  );
}

function scanLiteralTokens(text, file, ctx) {
  const re = /\{\{[^}]+\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const tok = m[0];
    if (!ALLOWED_TOKEN.test(tok)) {
      fail('check-11-token', file, `${ctx}: unrecognized token ${tok}`);
    }
  }
}

for (const file of files) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) {
    fail('read', file, e.message);
    continue;
  }

  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    fail('parse', file, e.message);
    continue;
  }

  const jsonText = JSON.stringify(doc);
  scanLiteralTokens(jsonText, file, 'collection');

  walkResources(doc, (r, byId) => {
    const folder = folderPath(r, byId);
    const name = r.name || '';

    if (r.url) scanLiteralTokens(String(r.url), file, `${name || r._id} url`);
    if (r.body?.text) scanLiteralTokens(String(r.body.text), file, `${name || r._id} body`);

    if (isNegativeOrEdge(folder, name)) {
      const blob = [r.url, r.body?.text, r.code].filter(Boolean).join('\n');
      if (/\{\{captured\./.test(blob)) {
        fail('check-15-captured', file, `${name || r._id}: negative/edge must not use {{captured.*}}`);
      }
    }

    if (r._type === 'unit_test' && typeof r.code === 'string') {
      const code = r.code;
      if (/\bpm\.(test|response|expect)\b/.test(code)) {
        fail('postman-api', file, `${name}: uses pm.* (use insomnia.send + expect)`);
      }

      if (isPositive(folder, name)) {
        if (/resp\.status\)\.to\.be\.oneOf\(|response\.status\)\.to\.be\.oneOf\(/.test(code)) {
          fail('check-20-positive', file, `${name}: positive must not use status oneOf`);
        }
        if (/resp\.status\)\.to\.be\.within\(|response\.status\)\.to\.be\.within\(/.test(code)) {
          fail('check-20-positive', file, `${name}: positive must not use status within`);
        }

        // Check 17 — OpenAPI response-schema validation via AJV (HARD FAILURE in
        // post-generation-checks.md). Mechanical scan looks for AJV usage in the
        // unit_test code. SKIP_AJV=1 disables enforcement (use only when KB
        // OpenAPI is absent OR the endpoint returns non-JSON — document the
        // carve-out per skill spec).
        const hasAjv = /\bajv\b|insomnia\.addFormats|\.compile\s*\(|\bvalidate\s*\(/i.test(code);
        if (!hasAjv) {
          if (SKIP_AJV) {
            warnings.push(`${path.basename(file)} :: ${name}: positive test lacks AJV (SKIP_AJV=1)`);
          } else {
            fail('check-17-ajv', file, `${name}: positive test missing AJV response-schema validation`);
          }
        }

        // Rule #5 (unit-test-code-patterns.md) — every positive test MUST assert
        // a response-time SLA via resp.elapsedTime. SKIP_ELAPSED_TIME=1 disables
        // (e.g., long-running async endpoints where the SLA is enforced
        // upstream).
        const hasElapsed = /\b(resp|response)\.elapsedTime\b/.test(code);
        if (!hasElapsed) {
          if (SKIP_ELAPSED_TIME) {
            warnings.push(`${path.basename(file)} :: ${name}: positive test lacks elapsedTime SLA (SKIP_ELAPSED_TIME=1)`);
          } else {
            fail('rule-5-elapsed-time', file, `${name}: positive test missing resp.elapsedTime SLA assertion`);
          }
        }
      }

      if (isSecurityInjection(folder, name)) {
        if (/resp\.status\)\.to\.equal\(200\)|response\.status\)\.to\.equal\(200\)/.test(code)) {
          fail('check-20-security', file, `${name}: injection test must not accept status 200`);
        }
      }
    }
  });

  const apiTestsDir = path.dirname(path.dirname(file));
  const dataDir = path.join(apiTestsDir, 'data');
  if (fs.existsSync(dataDir)) {
    for (const ent of fs.readdirSync(dataDir, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.endsWith('.json')) continue;
      const dp = path.join(dataDir, ent.name);
      try {
        const data = JSON.parse(fs.readFileSync(dp, 'utf8'));
        const empty =
          data == null ||
          (Array.isArray(data) && data.length === 0) ||
          (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0);
        if (empty) fail('check-20-data-empty', dp, 'data file is empty');
      } catch (e) {
        fail('check-20-data-parse', dp, e.message);
      }
    }
  }
}

console.log('POST-GENERATION GATE (mechanical)');
console.log(`Collections scanned: ${files.length}`);
if (warnings.length) {
  console.log('\nWarnings:');
  for (const w of warnings) console.log(`  ⚠️  ${w}`);
}
if (failures.length === 0) {
  console.log('\n✅ All mechanical checks passed.');
  process.exit(0);
}

console.log(`\n❌ ${failures.length} violation(s):\n`);
for (const f of failures) {
  console.log(`  [${f.check}] ${path.basename(f.file)}`);
  console.log(`    ${f.detail}`);
}
process.exit(1);
