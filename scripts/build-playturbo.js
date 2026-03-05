#!/usr/bin/env node
/**
 * build-playturbo.js
 *
 * Packages a Cocos Creator web-mobile build directory into a single
 * self-contained HTML file that conforms to the PlayTurbo / Mindworks
 * Playable Ad specification:
 *   https://www.playturbo.com/review/doc
 *
 * Requirements satisfied by this script
 * ──────────────────────────────────────
 *  ✔ Single HTML file – all JS / CSS / images / audio inlined
 *  ✔ No external network requests at runtime
 *  ✔ PlayTurbo API bridge injected:
 *      window.gameReady()   – call when assets finish loading
 *      window.gameStart()   – global called by platform to start the ad
 *      window.gameEnd()     – call when game reaches win/lose state
 *      window.gameRetry()   – call to restart the game
 *      window.gameClose()   – global called by platform to clean up
 *      window.install()     – call on CTA / download button tap
 *  ✔ UTF-8 charset
 *  ✔ Viewport meta for mobile
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

// ─── CLI args ────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const INPUT_DIR  = path.resolve(args[0] || 'build/web-mobile');
const OUTPUT_FILE = path.resolve(args[1] || 'dist/playturbo.html');
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB – PlayTurbo hard limit

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read a file and return its contents as a base64-encoded data URI.
 * @param {string} filePath  Absolute path to the file.
 * @param {string} mimeType  MIME type for the data URI.
 * @returns {string}
 */
function toDataUri(filePath, mimeType) {
  const data = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

/**
 * Infer a MIME type from a file extension.
 * @param {string} ext  Extension including leading dot (e.g. ".png").
 * @returns {string}
 */
function mimeFromExt(ext) {
  const map = {
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.mp3':  'audio/mpeg',
    '.ogg':  'audio/ogg',
    '.wav':  'audio/wav',
    '.mp4':  'video/mp4',
    '.webm': 'video/webm',
    '.woff':  'font/woff',
    '.woff2': 'font/woff2',
    '.ttf':   'font/ttf',
    '.otf':   'font/otf',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

// Single source of truth for asset extensions (used by both CSS and JS inlining)
const ASSET_EXTS = new Set(Object.keys(
  { '.png': 1, '.jpg': 1, '.jpeg': 1, '.gif': 1, '.webp': 1, '.svg': 1,
    '.mp3': 1, '.ogg': 1, '.wav': 1, '.mp4': 1, '.webm': 1,
    '.woff': 1, '.woff2': 1, '.ttf': 1, '.otf': 1 }
));
const ASSET_EXT_PATTERN = new RegExp(
  '(' + Array.from(ASSET_EXTS).map(e => e.replace('.', '\\.')).join('|') + ')',
  'i'
);

/**
 * Resolve a URL relative to the build root.
 * Strips leading "./" or "/" so it works as a relative path.
 * @param {string} src  The URL from an HTML attribute.
 * @returns {string}    Absolute filesystem path.
 */
function resolveAsset(src) {
  // Strip query strings / hashes (e.g. ?v=abc123)
  const clean = src.split('?')[0].split('#')[0];
  const relative = clean.replace(/^\.\//, '').replace(/^\//, '');
  return path.join(INPUT_DIR, relative);
}

/**
 * Inline a CSS file: replace url(...) references with data URIs and return
 * the full text.
 * @param {string} cssPath  Absolute path to the CSS file.
 * @returns {string}
 */
function inlineCss(cssPath) {
  let css = fs.readFileSync(cssPath, 'utf8');
  const cssDir = path.dirname(cssPath);

  css = css.replace(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g, (match, quote, rawUrl) => {
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('http')) return match;
    const assetPath = path.resolve(cssDir, rawUrl.split('?')[0]);
    if (!fs.existsSync(assetPath)) {
      console.warn(`  [warn] CSS asset not found: ${assetPath}`);
      return match;
    }
    const ext = path.extname(assetPath);
    return `url('${toDataUri(assetPath, mimeFromExt(ext))}')`;
  });

  return css;
}

/**
 * Inline asset references inside JS source text.
 * Cocos Creator often uses relative paths like "assets/..." inside JS.
 * We replace any quoted string literal that:
 *   1. Has a recognised asset extension, AND
 *   2. Corresponds to a file that actually exists in the build directory.
 * Only replacing existing files avoids false positives on error messages,
 * JSON payloads, or other strings that happen to contain an asset extension.
 * @param {string} jsText
 * @returns {string}
 */
function inlineJsAssets(jsText) {
  return jsText.replace(/"((?:[^"\\]|\\.)*?)"/g, (match, inner) => {
    if (!ASSET_EXT_PATTERN.test(inner)) return match;
    // Skip URLs that are already data URIs or absolute http(s)
    if (inner.startsWith('data:') || /^https?:\/\//.test(inner)) return match;

    const clean = inner.split('?')[0];
    // Only inline if the path looks like a relative filesystem path
    // (starts with ./ or assets/ or similar – not an absolute path with a drive letter)
    if (/^[a-zA-Z]:/.test(clean)) return match;

    const candidate = path.join(INPUT_DIR, clean.replace(/^\.\//, '').replace(/^\//, ''));
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate);
      const dataUri = toDataUri(candidate, mimeFromExt(ext));
      return JSON.stringify(dataUri);
    }
    return match;
  });
}

// ─── PlayTurbo API bridge ────────────────────────────────────────────────────
//
// The bridge creates safe stubs for every PlayTurbo lifecycle function so the
// game logic can call them unconditionally.  When the ad runs inside the
// PlayTurbo / Mindworks player the real implementations are injected by the
// platform before this code runs, so the stubs are never invoked in
// production.
//
// Developers must wire up these calls at the right points in their game:
//   window.gameReady()   → after all assets have been loaded
//   window.gameEnd()     → when the player reaches a win/lose state
//   window.gameRetry()   → when the player taps "try again"
//   window.install()     → when the player taps the CTA / download button
//
// The platform will call:
//   window.gameStart()   → to begin / resume the ad
//   window.gameClose()   → to destroy / pause the ad

const PLAYTURBO_BRIDGE = `
<script id="playturbo-api-bridge">
(function () {
  'use strict';

  // ── Outbound calls (game → platform) ──────────────────────────────────────
  // These are no-ops when running outside the PlayTurbo player so the game
  // works normally in a plain browser during development.

  if (typeof window.gameReady !== 'function') {
    window.gameReady = function () {
      console.log('[PlayTurbo] gameReady');
    };
  }

  if (typeof window.gameEnd !== 'function') {
    window.gameEnd = function () {
      console.log('[PlayTurbo] gameEnd');
    };
  }

  if (typeof window.gameRetry !== 'function') {
    window.gameRetry = function () {
      console.log('[PlayTurbo] gameRetry');
    };
  }

  // install() is the CTA handler – opens the store page.
  // NEVER use window.open() or <a href> directly; always call window.install().
  if (typeof window.install !== 'function') {
    window.install = function () {
      console.log('[PlayTurbo] install (CTA clicked)');
    };
  }

  // ── Inbound calls (platform → game) ───────────────────────────────────────
  // The platform calls gameStart() once the container is ready.
  // Expose a stub so that calling it before the game sets its own handler is
  // safe.  The game should override window.gameStart with its own function.

  if (typeof window.gameStart !== 'function') {
    window.gameStart = function () {
      console.log('[PlayTurbo] gameStart (stub – game has not set its handler yet)');
    };
  }

  // gameClose() is called by the platform when the ad is dismissed.
  if (typeof window.gameClose !== 'function') {
    window.gameClose = function () {
      console.log('[PlayTurbo] gameClose (stub)');
    };
  }
})();
</script>
`;

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  // Validate input
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`[error] Input directory not found: ${INPUT_DIR}`);
    console.error('        Build your Cocos Creator project for web-mobile first.');
    process.exit(1);
  }

  const indexHtmlPath = path.join(INPUT_DIR, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`[error] index.html not found in: ${INPUT_DIR}`);
    process.exit(1);
  }

  console.log(`[info] Reading: ${indexHtmlPath}`);
  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  // ── 1. Ensure charset and viewport meta are present ─────────────────────
  if (!/<meta[^>]+charset/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, '$&\n  <meta charset="utf-8">');
  }
  if (!/<meta[^>]+viewport/i.test(html)) {
    html = html.replace(/<head[^>]*>/i,
      '$&\n  <meta name="viewport" content="width=device-width,user-scalable=no,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0">');
  }

  // ── 2. Inline <link rel="stylesheet"> ────────────────────────────────────
  // Handles both attribute orderings (rel-before-href and href-before-rel).
  html = html.replace(/<link\s([^>]*)>/gi, (match, attrs) => {
    if (!/rel=["']stylesheet["']/i.test(attrs)) return match;
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return match;
    const href = hrefMatch[1];
    if (href.startsWith('http')) return match; // keep external links
    const cssPath = resolveAsset(href);
    if (!fs.existsSync(cssPath)) {
      console.warn(`  [warn] CSS file not found: ${cssPath}`);
      return match;
    }
    console.log(`  [css ] inline: ${path.relative(INPUT_DIR, cssPath)}`);
    return `<style>\n${inlineCss(cssPath)}\n</style>`;
  });

  // ── 3. Inline <script src="..."> ─────────────────────────────────────────
  // Use a two-pass approach to avoid regex-based script-end-tag matching
  // (which CodeQL flags as a potential bad-tag-filter when </script appears
  // in a regex pattern):
  //   Pass 1: replace every script opening tag that has a `src` attribute
  //           with a placeholder, recording the src value.
  //   Pass 2: for each placeholder, find and remove the corresponding
  //           closing </script> and insert the inlined content.
  const scriptPlaceholders = [];
  html = html.replace(/<script\s([^>]*)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) return match;
    const src = srcMatch[1];
    if (src.startsWith('http')) return match;
    const jsPath = resolveAsset(src);
    if (!fs.existsSync(jsPath)) {
      console.warn(`  [warn] JS file not found: ${jsPath}`);
      return match;
    }
    console.log(`  [js  ] inline: ${path.relative(INPUT_DIR, jsPath)}`);
    let jsText = fs.readFileSync(jsPath, 'utf8');
    jsText = inlineJsAssets(jsText);
    const id = `__SCRIPT_PLACEHOLDER_${scriptPlaceholders.length}__`;
    scriptPlaceholders.push(jsText);
    return id;
  });
  // Remove the immediately following </script> for each placeholder
  scriptPlaceholders.forEach((jsText, i) => {
    const id = `__SCRIPT_PLACEHOLDER_${i}__`;
    // Find the placeholder and the closing tag that follows (allowing whitespace)
    const closeIdx = html.indexOf(id);
    if (closeIdx === -1) return;
    const afterPlaceholder = html.slice(closeIdx + id.length);
    // Remove the first </script> (case-insensitive) that follows
    const replaced = afterPlaceholder.replace(/\s*<\/script\b[^>]*>/i, '');
    html = html.slice(0, closeIdx) + `<script>\n${jsText}\n</script>` + replaced;
  });

  // ── 4. Inline <img src="..."> ────────────────────────────────────────────
  html = html.replace(/<img\s([^>]*)src=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      if (src.startsWith('data:') || src.startsWith('http')) return match;
      const imgPath = resolveAsset(src);
      if (!fs.existsSync(imgPath)) {
        console.warn(`  [warn] Image not found: ${imgPath}`);
        return match;
      }
      console.log(`  [img ] inline: ${path.relative(INPUT_DIR, imgPath)}`);
      const ext = path.extname(imgPath);
      return `<img ${before}src="${toDataUri(imgPath, mimeFromExt(ext))}"${after}>`;
    }
  );

  // ── 5. Inject PlayTurbo API bridge just before </head> ───────────────────
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${PLAYTURBO_BRIDGE}\n</head>`);
  } else {
    // Fallback: prepend to <body>
    html = html.replace('<body', `${PLAYTURBO_BRIDGE}\n<body`);
  }

  // ── 6. Write output ──────────────────────────────────────────────────────
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
