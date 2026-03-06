'use strict';
/**
 * html-builder.js
 *
 * Shared HTML-inlining core used by both build-playturbo.js and
 * build-mintegral.js.
 *
 * Exports a single function:
 *   buildHtml(inputDir)  →  string   (the fully-inlined HTML)
 */

const fs   = require('fs');
const path = require('path');

// ─── MIME helpers ─────────────────────────────────────────────────────────────

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

// ─── Per-build helpers (depend on inputDir) ────────────────────────────────────

/**
 * Resolve a URL relative to the build root.
 * Strips leading "./" or "/" so it works as a relative filesystem path.
 * @param {string} inputDir  Absolute path to the Cocos web-mobile build dir.
 * @param {string} src       The URL from an HTML attribute.
 * @returns {string}         Absolute filesystem path.
 */
function resolveAsset(inputDir, src) {
  const clean = src.split('?')[0].split('#')[0];
  const relative = clean.replace(/^\.\//, '').replace(/^\//, '');
  return path.join(inputDir, relative);
}

/**
 * Inline a CSS file: replace url(...) references with data URIs and return
 * the full text.
 * @param {string} inputDir  Build root (for resolving relative asset paths).
 * @param {string} cssPath   Absolute path to the CSS file.
 * @returns {string}
 */
function inlineCss(inputDir, cssPath) {
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
 * Replaces any quoted string literal that:
 *   1. Has a recognised asset extension, AND
 *   2. Corresponds to a file that actually exists in the build directory.
 * Only replacing existing files avoids false positives on error messages,
 * JSON payloads, or other strings that happen to contain an asset extension.
 * @param {string} inputDir  Build root.
 * @param {string} jsText    JavaScript source text.
 * @returns {string}
 */
function inlineJsAssets(inputDir, jsText) {
  return jsText.replace(/"((?:[^"\\]|\\.)*?)"/g, (match, inner) => {
    if (!ASSET_EXT_PATTERN.test(inner)) return match;
    if (inner.startsWith('data:') || /^https?:\/\//.test(inner)) return match;

    const clean = inner.split('?')[0];
    // Skip absolute paths (e.g. Windows drive letters)
    if (/^[a-zA-Z]:/.test(clean)) return match;

    const candidate = path.join(inputDir, clean.replace(/^\.\//, '').replace(/^\//, ''));
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate);
      return JSON.stringify(toDataUri(candidate, mimeFromExt(ext)));
    }
    return match;
  });
}

// ─── PlayTurbo API bridge ─────────────────────────────────────────────────────
//
// Safe no-op stubs for every PlayTurbo / Mindworks lifecycle function.
// When the ad runs inside the platform player the real implementations are
// injected before this code runs, so the stubs are never invoked in production.
//
// Game code must wire up:
//   window.gameReady()   → after all assets have loaded
//   window.gameEnd()     → on win/lose
//   window.gameRetry()   → on "play again"
//   window.install()     → on CTA / download button tap (never use window.open)
//
// The platform will call:
//   window.gameStart     → to begin the ad (game should override this)
//   window.gameClose     → to destroy/pause the ad (game should override this)

const PLAYTURBO_BRIDGE = `
<script id="playturbo-api-bridge">
(function () {
  'use strict';

  // Outbound calls (game → platform) — no-ops outside the PlayTurbo player
  if (typeof window.gameReady !== 'function') {
    window.gameReady = function () { console.log('[PlayTurbo] gameReady'); };
  }
  if (typeof window.gameEnd !== 'function') {
    window.gameEnd = function () { console.log('[PlayTurbo] gameEnd'); };
  }
  if (typeof window.gameRetry !== 'function') {
    window.gameRetry = function () { console.log('[PlayTurbo] gameRetry'); };
  }
  // CTA — NEVER use window.open(); always call window.install()
  if (typeof window.install !== 'function') {
    window.install = function () { console.log('[PlayTurbo] install (CTA clicked)'); };
  }

  // Inbound calls (platform → game) — stubs so early calls are safe
  if (typeof window.gameStart !== 'function') {
    window.gameStart = function () { console.log('[PlayTurbo] gameStart (stub)'); };
  }
  if (typeof window.gameClose !== 'function') {
    window.gameClose = function () { console.log('[PlayTurbo] gameClose (stub)'); };
  }
})();
</script>
`;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build a single, fully self-contained HTML string from a Cocos Creator
 * web-mobile build directory.
 *
 * @param {string} inputDir  Absolute path to the Cocos `web-mobile` build dir.
 * @returns {string}         The inlined HTML.
 */
function buildHtml(inputDir) {
  const indexHtmlPath = path.join(inputDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`index.html not found in: ${inputDir}`);
  }

  console.log(`[info] Reading: ${indexHtmlPath}`);
  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  // ── 1. Ensure charset and viewport meta ──────────────────────────────────
  if (!/<meta[^>]+charset/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, '$&\n  <meta charset="utf-8">');
  }
  if (!/<meta[^>]+viewport/i.test(html)) {
    html = html.replace(/<head[^>]*>/i,
      '$&\n  <meta name="viewport" content="width=device-width,user-scalable=no,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0">');
  }

  // ── 2. Inline <link rel="stylesheet"> ────────────────────────────────────
  html = html.replace(/<link\s([^>]*)>/gi, (match, attrs) => {
    if (!/rel=["']stylesheet["']/i.test(attrs)) return match;
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return match;
    const href = hrefMatch[1];
    if (href.startsWith('http')) return match;
    const cssPath = resolveAsset(inputDir, href);
    if (!fs.existsSync(cssPath)) {
      console.warn(`  [warn] CSS file not found: ${cssPath}`);
      return match;
    }
    console.log(`  [css ] inline: ${path.relative(inputDir, cssPath)}`);
    return `<style>\n${inlineCss(inputDir, cssPath)}\n</style>`;
  });

  // ── 3. Inline <script src="..."> ─────────────────────────────────────────
  // Two-pass approach to avoid a </script> literal in the regex pattern
  // (CodeQL js/bad-tag-filter).
  const scriptPlaceholders = [];
  html = html.replace(/<script\s([^>]*)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) return match;
    const src = srcMatch[1];
    if (src.startsWith('http')) return match;
    const jsPath = resolveAsset(inputDir, src);
    if (!fs.existsSync(jsPath)) {
      console.warn(`  [warn] JS file not found: ${jsPath}`);
      return match;
    }
    console.log(`  [js  ] inline: ${path.relative(inputDir, jsPath)}`);
    let jsText = fs.readFileSync(jsPath, 'utf8');
    jsText = inlineJsAssets(inputDir, jsText);
    const id = `__SCRIPT_PLACEHOLDER_${scriptPlaceholders.length}__`;
    scriptPlaceholders.push(jsText);
    return id;
  });

  scriptPlaceholders.forEach((jsText, i) => {
    const id = `__SCRIPT_PLACEHOLDER_${i}__`;
    const closeIdx = html.indexOf(id);
    if (closeIdx === -1) return;
    const afterPlaceholder = html.slice(closeIdx + id.length);
    const replaced = afterPlaceholder.replace(/\s*<\/script\b[^>]*>/i, '');
    html = html.slice(0, closeIdx) + `<script>\n${jsText}\n</script>` + replaced;
  });

  // ── 4. Inline <img src="..."> ────────────────────────────────────────────
  html = html.replace(/<img\s([^>]*)src=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      if (src.startsWith('data:') || src.startsWith('http')) return match;
      const imgPath = resolveAsset(inputDir, src);
      if (!fs.existsSync(imgPath)) {
        console.warn(`  [warn] Image not found: ${imgPath}`);
        return match;
      }
      console.log(`  [img ] inline: ${path.relative(inputDir, imgPath)}`);
      const ext = path.extname(imgPath);
      return `<img ${before}src="${toDataUri(imgPath, mimeFromExt(ext))}"${after}>`;
    }
  );

  // ── 5. Inject PlayTurbo API bridge ────────────────────────────────────────
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${PLAYTURBO_BRIDGE}\n</head>`);
  } else {
    html = html.replace('<body', `${PLAYTURBO_BRIDGE}\n<body`);
  }

  return html;
}

module.exports = { buildHtml };
