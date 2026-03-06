#!/usr/bin/env node
/**
 * build-playturbo.js
 *
 * Packages a Cocos Creator web-mobile build directory into a single
 * self-contained HTML file that conforms to the PlayTurbo / Mindworks
 * Playable Ad specification:
 *   https://www.playturbo.com/review/doc
 *
 * Requirements satisfied
 * ──────────────────────
 *  ✔ Single HTML file – all JS / CSS / images / audio inlined
 *  ✔ No external network requests at runtime
 *  ✔ PlayTurbo API bridge injected (gameReady, gameEnd, gameRetry,
 *      install, gameStart, gameClose)
 *  ✔ UTF-8 charset + mobile viewport meta
 *  ✔ File-size warning when output exceeds 5 MB (PlayTurbo hard limit)
 *
 * Usage
 * ──────
 *   node scripts/build-playturbo.js [inputDir] [outputFile]
 *
 * Defaults
 *   inputDir   ./build/web-mobile
 *   outputFile ./dist/playturbo.html
 *
 * Or via npm:
 *   npm run build:playturbo
 *   npm run build:playturbo -- path/to/web-mobile dist/my-ad.html
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { buildHtml } = require('./lib/html-builder');

// ─── CLI args ────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const INPUT_DIR   = path.resolve(args[0] || 'build/web-mobile');
const OUTPUT_FILE = path.resolve(args[1] || 'dist/playturbo.html');
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB – PlayTurbo hard limit

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`[error] Input directory not found: ${INPUT_DIR}`);
    console.error('        Build your Cocos Creator project for web-mobile first.');
    process.exit(1);
  }

  let html;
  try {
    html = buildHtml(INPUT_DIR);
  } catch (err) {
    console.error(`[error] ${err.message}`);
    process.exit(1);
  }

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');

  const sizeBytes = Buffer.byteLength(html, 'utf8');
  const sizeMB    = (sizeBytes / 1024 / 1024).toFixed(2);

  console.log(`\n[done] Output: ${OUTPUT_FILE}`);
  console.log(`       Size  : ${sizeMB} MB`);

  if (sizeBytes > MAX_SIZE_BYTES) {
    console.warn(`\n[warn] ⚠  File size (${sizeMB} MB) exceeds the 5 MB PlayTurbo limit.`);
    console.warn('       Reduce asset sizes or compress images before uploading.');
  } else {
    console.log('       ✔  Within the 5 MB PlayTurbo size limit.');
  }
}

main();
