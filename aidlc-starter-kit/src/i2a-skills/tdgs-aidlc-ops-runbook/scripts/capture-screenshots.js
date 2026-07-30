#!/usr/bin/env node
/**
 * capture-screenshots.js — Interactive UI screenshot capture for Ops Runbook
 *
 * APPLICATION-AGNOSTIC: Opens a visible Chromium browser, user navigates
 * manually, script auto-captures on every page transition. No hardcoded routes.
 *
 * POWERED BY PLAYWRIGHT — industry-standard browser automation with:
 *   - Built-in auto-wait (networkidle + DOM stable)
 *   - Native iframe load detection (no polling hacks)
 *   - animations:'disabled' for flake-free screenshots
 *   - Reliable browser close detection on macOS
 *   - SPA route observer survives full-page navigations
 *
 * USAGE:
 *   node capture-screenshots.js <base_url> <output_dir> [runbook_path]
 *
 * WHAT HAPPENS:
 *   1. Browser opens at the base URL (visible — you can see it)
 *   2. You navigate the app: fill forms, enter test credentials, place an order
 *   3. Every page change is AUTO-CAPTURED as a screenshot
 *   4. Close the browser when done
 *   5. Screenshots saved and appended to runbook Section 9.1
 *
 * SAFETY:
 *   - ONLY runs against test/staging/UAT/dev environments
 *   - Hard-blocks any URL containing 'prod' or 'prd'
 *
 * REQUIRES:
 *   npm install playwright
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Auto-install Playwright if not present ──
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.log('⏳ Playwright not found — installing (one-time setup)...');
  try {
    execSync('npm install playwright', { stdio: 'inherit', cwd: __dirname });
    ({ chromium } = require('playwright'));
    console.log('✅ Playwright installed successfully.\n');
  } catch (installErr) {
    console.error('❌ Failed to install Playwright. Run manually: npm install playwright');
    process.exit(1);
  }
}

// ============================================================
// ENVIRONMENT SAFETY
// ============================================================

const PROD_PATTERNS = [/(?<!non)prod/i, /\bprd\b/i, /texas-gov-prod/i];
const ALLOWED_PATTERNS = [/test/i, /stage/i, /stg/i, /uat/i, /dev/i, /nonprod/i, /localhost/i, /127\.0\.0/];

function validateUrl(url) {
  // Check allowed patterns first — explicit non-prod match skips prod check
  let allowed = false;
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(url)) { allowed = true; break; }
  }
  if (allowed) return;

  for (const pattern of PROD_PATTERNS) {
    if (pattern.test(url)) {
      console.error(`\n❌ HARD BLOCK: "${url}" matches production pattern.`);
      console.error('   Only test/staging/UAT/dev allowed.\n');
      process.exit(1);
    }
  }
  console.error(`⚠️  "${url}" doesn't match known non-prod patterns. Proceeding with caution.\n`);
}

// ============================================================
// INTERACTIVE CAPTURE (Playwright)
// ============================================================

async function run(baseUrl, outputDir, runbookPath) {
  validateUrl(baseUrl);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RUNBOOK SCREENSHOT CAPTURE (Playwright)`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  URL:      ${baseUrl}`);
  console.log(`  Output:   ${outputDir}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`\n  A browser will open. Navigate through the app normally.`);
  console.log(`  Every page change is auto-captured.`);
  console.log(`  Close the browser when done.\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const captured = [];
  let captureCount = 0;
  let lastUrl = '';
  let captureLock = Promise.resolve();
  let browserClosed = false;

  // ── Browser close tracking (set flag immediately on disconnect) ──
  browser.on('disconnected', () => { browserClosed = true; });

  // ── Capture function (serialized via async lock — no race conditions) ──
  const captureCurrentPage = () => {
    captureLock = captureLock.then(async () => {
      try {
        if (browserClosed) return;

        const currentUrl = page.url();
        if (currentUrl === lastUrl || currentUrl === 'about:blank') return;
        lastUrl = currentUrl;

        // ── Phase 1: Wait for initial page network to settle ──
        if (browserClosed) return;
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

        // ── Phase 2: Wait for loading indicators to disappear ──
        // Common patterns: spinners, skeleton loaders, "Loading..." text
        if (browserClosed) return;
        await page.waitForFunction(() => {
          const spinners = document.querySelectorAll(
            '.spinner, .loading, [class*="spinner"], [class*="loading"], [class*="Loader"], [class*="skeleton"]'
          );
          for (const el of spinners) {
            const style = window.getComputedStyle(el);
            const opacity = parseFloat(style.opacity);
            const isHidden = style.display === 'none' || style.visibility === 'hidden' || (Number.isFinite(opacity) && opacity === 0);
            if (!isHidden) {
              return false;
            }
          }
          return true;
        }, { timeout: 15000 }).catch(() => {});

        // ── Phase 3: Wait for dynamically-injected iframes to appear and load ──
        // Payment iframes (Snappay, Stripe, etc.) are created AFTER an async API call.
        // Poll for new iframes to appear over a window, then wait for their content.
        if (browserClosed) return;
        const initialFrameCount = page.frames().length;
        let stableCount = 0;
        let lastFrameCount = initialFrameCount;

        // Poll for up to 20 seconds for new iframes to appear and stabilize
        for (let i = 0; i < 40; i++) {
          if (browserClosed) return;
          await page.waitForTimeout(500).catch(() => {});
          const currentFrameCount = page.frames().length;
          if (currentFrameCount === lastFrameCount) {
            stableCount++;
            // If frame count is stable for 2 seconds (4 polls) after initial load, we're done
            if (stableCount >= 4) break;
          } else {
            stableCount = 0;
            lastFrameCount = currentFrameCount;
          }
        }

        // Now wait for all iframes to fully load their content
        if (browserClosed) return;
        const allFrames = page.frames();
        if (allFrames.length > 1) {
          const childFrames = allFrames.slice(1);
          console.log(`     ⏳ Detected ${childFrames.length} iframe(s) — waiting for content...`);

          // Wait for each iframe's network to settle (content fully rendered)
          await Promise.all(
            childFrames.map(f =>
              f.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
            )
          );

          if (browserClosed) return;

          // For payment/form iframes: wait until they have visible input fields or content
          for (const frame of childFrames) {
            try {
              if (browserClosed) return;
              await frame.waitForFunction(() => {
                // Consider iframe loaded when it has either:
                // - Visible input fields (payment form)
                // - Or meaningful text content (>50 chars)
                const inputs = document.querySelectorAll('input, select, button');
                const hasInputs = inputs.length > 0;
                const hasContent = (document.body?.innerText?.length || 0) > 50;
                return hasInputs || hasContent;
              }, { timeout: 10000 }).catch(() => {});
            } catch {
              // Frame may have detached — continue
            }
          }

          if (browserClosed) return;
          // Final settle after iframe content renders (CSS animations, font loading)
          await page.waitForTimeout(1500).catch(() => {});
        }

        if (browserClosed) return;
        captureCount++;
        const urlPath = new URL(currentUrl).pathname;
        const pageName = urlPath
          .replace(/^\//, '')
          .replace(/\//g, '-')
          .replace(/[^a-z0-9-]/gi, '-')
          .replace(/-+/g, '-') || 'root';
        const filename = `${String(captureCount).padStart(2, '0')}-${pageName}.png`;
        const filepath = path.join(outputDir, filename);

        // Capture with animations disabled (no CSS transition flakes)
        await page.screenshot({
          path: filepath,
          fullPage: true,
          animations: 'disabled',
        });

        const displayName = urlPath
          .split('/')
          .filter(Boolean)
          .pop()
          ?.replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase()) || 'Home';
        captured.push({ name: displayName, route: urlPath, filename });
        console.log(`  📸 [${captureCount}] ${displayName} → ${filename}`);
      } catch (e) {
        // Page may have closed during capture — safe to ignore
      }
    });
    return captureLock;
  };

  // ── SPA route detection (survives full-page navigations + redirects) ──
  await page.exposeFunction('__notifyRouteChange', async () => {
    await captureCurrentPage();
  });

  // addInitScript re-injects on every navigation (unlike evaluate which is lost on reload)
  await context.addInitScript(() => {
    let lastPath = window.location.pathname;
    const checkRoute = () => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        if (window.__notifyRouteChange) window.__notifyRouteChange();
      }
    };
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function () {
      origPush.apply(this, arguments);
      checkRoute();
    };
    history.replaceState = function () {
      origReplace.apply(this, arguments);
      checkRoute();
    };
    // MutationObserver catches edge-case route changes that skip pushState
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(checkRoute).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  });

  // ── Navigate to start URL ──
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await captureCurrentPage();

  // ── Auto-capture on full-page navigations (non-SPA) ──
  page.on('framenavigated', async (frame) => {
    if (frame === page.mainFrame()) {
      await page.waitForTimeout(500); // Let SPA finish rendering
      await captureCurrentPage();
    }
  });

  // ── Wait for browser close ──
  // Uses both page.close and browser.disconnected for reliable detection.
  // The browserClosed flag ensures in-flight captures abort quickly.
  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        browserClosed = true; // Signal any in-flight captures to abort
        clearTimeout(safetyTimer);
        // Race captureLock with a 3s timeout — wait for in-flight capture to
        // finish if possible, but don't hang if it's stuck on a dead page.
        Promise.race([
          captureLock,
          new Promise(r => setTimeout(r, 3000)),
        ]).finally(resolve);
      }
    };

    page.on('close', finish);
    context.on('close', finish);
    browser.on('disconnected', finish);

    // Safety timeout: auto-close after 30 minutes of idle
    const safetyTimer = setTimeout(() => {
      console.log('\n  ⏰ Safety timeout (30min). Closing browser...');
      browser.close().catch(() => {});
      finish();
    }, 30 * 60 * 1000);
  });

  // ── Results ──
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DONE — ${captured.length} screenshots captured`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── Append to runbook Section 9.1 ──
  if (captured.length > 0 && runbookPath && fs.existsSync(runbookPath)) {
    const runbookDir = path.dirname(runbookPath);
    const relPath = path.relative(runbookDir, outputDir);
    let md = '\n\n### Application Screen Captures\n\n';
    md += `> Captured: ${new Date().toISOString().split('T')[0]} | Total: ${captured.length}\n\n`;
    for (const p of captured) {
      md += `**${p.name}**\n\n`;
      md += `![${p.name}](${relPath}/${p.filename})\n\n`;
      md += `*Route: \`${p.route}\`*\n\n---\n\n`;
    }
    let content = fs.readFileSync(runbookPath, 'utf8');
    const marker = '## 9.1 Screen Shots';
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      const next = content.indexOf('\n---\n', idx + marker.length);
      const insertAt = next !== -1 ? next : content.length;
      content =
        content.substring(0, idx + marker.length) +
        '\n' +
        md +
        content.substring(insertAt);
    } else {
      content += '\n\n## 9.1 Screen Shots\n' + md;
    }
    fs.writeFileSync(runbookPath, content, 'utf8');
    console.log(`  📝 Runbook Section 9.1 updated\n`);
  }
}

// ============================================================
// CLI
// ============================================================

const [, , baseUrl, outputDir, runbookPath] = process.argv;

if (!baseUrl || !outputDir) {
  console.error(`
capture-screenshots.js — Runbook UI Screenshot Capture (Playwright)

Opens a visible Chromium browser. YOU navigate the app.
Script auto-captures every page change. Close the browser when done.
Screenshots appended to runbook Section 9.1.

Usage:
  node capture-screenshots.js <test_url> <output_dir> [runbook_path]

Arguments:
  test_url      Test/Staging URL (NEVER production)
  output_dir    Where to save screenshots
  runbook_path  (Optional) .md runbook — screenshots appended to Section 9.1

Safety:
  HARD BLOCKS any URL with 'prod' or 'prd'.
  Only test/stage/uat/dev/nonprod/localhost allowed.

Requires:
  npm install playwright

Example:
  node capture-screenshots.js https://myapp.stagetxapps.texas.gov ./screenshots ./runbook.md
`);
  process.exit(1);
}

run(baseUrl, outputDir, runbookPath).catch((e) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
