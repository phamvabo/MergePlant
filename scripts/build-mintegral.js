#!/usr/bin/env node
/**
 * build-mintegral.js
 *
 * Packages a Cocos Creator web-mobile build into a Mintegral-compliant ZIP
 * playable ad package.
 *
 * ─── Mintegral ZIP Structure ─────────────────────────────────────────────────
 *
 *   {adName}.zip
 *     └── {adName}/
 *           └── {adName}.html     ← single self-contained HTML (all assets inlined)
 *
 * Rules enforced:
 *  ✔ ZIP file name = inner folder name = HTML file name (without extensions)
 *  ✔ All assets inlined into the HTML – no external network requests
 *  ✔ PlayTurbo / Mindworks API bridge injected (gameReady, gameEnd,
 *      gameRetry, install, gameStart, gameClose)
 *  ✔ UTF-8 charset + mobile viewport meta
 *  ✔ File-size warning when uncompressed HTML exceeds 5 MB
 *
 * ─── Reference ────────────────────────────────────────────────────────────────
 *   https://www.playturbo.com/review/doc
 *   https://helpcenter.mintegral.com/en/docs/playable-ad-guide
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 *   node scripts/build-mintegral.js [inputDir] [adName] [outputDir]
 *
 *   inputDir   Cocos Creator web-mobile build output  (default: build/web-mobile)
 *   adName     Name used for the ZIP, folder, and HTML (default: playable)
 *              Rules: letters, numbers, underscores only (max 50 chars)
 *   outputDir  Where to write the ZIP file             (default: dist)
 *
 *   Output: {outputDir}/{adName}.zip
 *
 * ─── Or via npm ───────────────────────────────────────────────────────────────
 *   npm run build:mintegral
 *   npm run build:mintegral -- path/to/web-mobile my_ad_name dist/
 */

'use strict';

const fs            = require('fs');
const os            = require('os');
const path          = require('path');
const { execSync }  = require('child_process');
const { buildHtml } = require('./lib/html-builder');

// ─── CLI args ────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const INPUT_DIR  = path.resolve(args[0] || 'build/web-mobile');
const AD_NAME    = (args[1] || 'playable').trim();
const OUTPUT_DIR = path.resolve(args[2] || 'dist');

const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5 MB – Mintegral hard limit

// ─── Validate ad name ────────────────────────────────────────────────────────
if (!/^[a-zA-Z0-9_]{1,50}$/.test(AD_NAME)) {
  console.error('[error] adName must contain only letters, numbers, and underscores (max 50 chars).');
  console.error(`        Got: "${AD_NAME}"`);
  process.exit(1);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  // Validate input directory
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`[error] Input directory not found: ${INPUT_DIR}`);
    console.error('        Build your Cocos Creator project for web-mobile first.');
    process.exit(1);
  }

  // ── Step 1: Build the inlined HTML ─────────────────────────────────────────
  let html;
  try {
    html = buildHtml(INPUT_DIR);
  } catch (err) {
    console.error(`[error] ${err.message}`);
    process.exit(1);
  }

  const htmlBytes = Buffer.byteLength(html, 'utf8');
  const htmlMB    = (htmlBytes / 1024 / 1024).toFixed(2);

  if (htmlBytes > MAX_HTML_BYTES) {
    console.warn(`\n[warn] ⚠  Inlined HTML size (${htmlMB} MB) exceeds the 5 MB Mintegral limit.`);
    console.warn('       Reduce asset sizes or compress images before uploading.');
  }

  // ── Step 2: Build the ZIP structure in a temp directory ────────────────────
  //
  // Required layout:
  //   {tempDir}/{adName}/{adName}.html
  //
  // Then zip the entire {adName} folder into {adName}.zip
  //
  const tmpBase  = fs.mkdtempSync(path.join(os.tmpdir(), 'mintegral-'));
  const adFolder = path.join(tmpBase, AD_NAME);
  fs.mkdirSync(adFolder);

  const htmlFileName = `${AD_NAME}.html`;
  const htmlFilePath = path.join(adFolder, htmlFileName);
  fs.writeFileSync(htmlFilePath, html, 'utf8');

  // ── Step 3: Create the ZIP file ─────────────────────────────────────────────
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const zipName = `${AD_NAME}.zip`;
  const zipPath = path.join(OUTPUT_DIR, zipName);

  // Remove any existing ZIP with the same name
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  // Use the system `zip` utility: zip the named folder so the ZIP contains
  //   {adName}/{adName}.html   (not just {adName}.html at the root)
  try {
    execSync(`zip -r "${zipPath}" "${AD_NAME}"`, {
      cwd: tmpBase,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    console.error('[error] Failed to create ZIP file.');
    console.error(err.stderr ? err.stderr.toString() : err.message);
    process.exit(1);
  } finally {
    // Clean up temp directory
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }

  // ── Step 4: Report results ───────────────────────────────────────────────────
  const zipStats  = fs.statSync(zipPath);
  const zipMB     = (zipStats.size / 1024 / 1024).toFixed(2);

  console.log('\n[done] Mintegral ZIP created successfully');
  console.log(`       ZIP  : ${zipPath}  (${zipMB} MB compressed)`);
  console.log(`       HTML : ${htmlMB} MB uncompressed`);
  console.log('\n       ZIP structure:');
  console.log(`         ${zipName}`);
  console.log(`           └── ${AD_NAME}/`);
  console.log(`                 └── ${AD_NAME}.html`);

  if (htmlBytes > MAX_HTML_BYTES) {
    console.warn(`\n[warn] ⚠  Uncompressed HTML (${htmlMB} MB) exceeds the 5 MB Mintegral limit.`);
    console.warn('       Reduce asset sizes or compress images before uploading.');
  } else {
    console.log('\n       ✔  Within the 5 MB Mintegral size limit.');
  }

  console.log('\n[info] Test your playable at: https://www.mindworks-creative.com/review/');
}

main();
