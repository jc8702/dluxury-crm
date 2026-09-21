#!/usr/bin/env node
/**
 * Hex Color Audit Script — dluxury-crm
 *
 * Counts hardcoded hex occurrences in src/, groups by file and color,
 * maps each hex to the nearest design token from src/index.css,
 * and lists the top 20 offender files.
 *
 * Usage: node scripts/audit/hex-audit.cjs
 */

const fs = require('fs');
const path = require('path');

// ── 1. Parse design tokens from src/index.css ──────────────────────────────
function parseTokens(cssPath) {
  const css = fs.readFileSync(cssPath, 'utf8');
  const tokens = [];

  // Match --var-name: #hex or hsl(...) or rgb(...)
  const hexRe = /--([\w-]+)\s*:\s*#([0-9a-fA-F]{3,8})\s*[;)]/g;
  const hslRe = /--([\w-]+)\s*:\s*(\d+)\s+(\d+)%\s+([\d.]+)%/g;

  let m;
  while ((m = hexRe.exec(css)) !== null) {
    tokens.push({ name: `--${m[1]}`, hex: normalizeHex(m[2]) });
  }
  while ((m = hslRe.exec(css)) !== null) {
    const hex = hslToHex(parseInt(m[2]), parseInt(m[3]), parseFloat(m[4]));
    tokens.push({ name: `--${m[1]}`, hex });
  }

  // Deduplicate by hex (keep first occurrence)
  const seen = new Set();
  return tokens.filter((t) => {
    if (seen.has(t.hex)) return false;
    seen.add(t.hex);
    return true;
  });
}

function normalizeHex(h) {
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length === 8) h = h.slice(0, 6); // strip alpha
  return '#' + h.toLowerCase();
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexDistance(hex1, hex2) {
  const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function findNearestToken(hex, tokens) {
  let best = tokens[0], bestDist = Infinity;
  for (const t of tokens) {
    const d = hexDistance(hex, t.hex);
    if (d < bestDist) { bestDist = d; best = t; }
  }
  return { token: best.name, tokenHex: best.hex, distance: Math.round(bestDist) };
}

// ── 2. Scan src/ for hardcoded hex ─────────────────────────────────────────
function scanHex(rootDir) {
  const results = {}; // { file: { hex: count } }
  const hexColorRe = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        walk(full);
      } else if (/\.(tsx?|css)$/.test(e.name)) {
        const content = fs.readFileSync(full, 'utf8');
        const matches = content.match(hexColorRe);
        if (matches) {
          const rel = path.relative(rootDir, full).replace(/\\/g, '/');
          const counts = {};
          for (const h of matches) {
            const norm = h.toLowerCase();
            counts[norm] = (counts[norm] || 0) + 1;
          }
          results[rel] = counts;
        }
      }
    }
  }
  walk(rootDir);
  return results;
}

// ── 3. Main ────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..', '..');
const CSS_PATH = path.join(ROOT, 'src', 'index.css');

console.log('=== Hex Color Audit — dluxury-crm ===\n');

// Parse tokens
const tokens = parseTokens(CSS_PATH);
console.log(`[INFO] ${tokens.length} unique color tokens found in src/index.css\n`);

// Scan
const fileData = scanHex(path.join(ROOT, 'src'));

// Aggregate per file
const fileTotals = Object.entries(fileData).map(([file, colors]) => ({
  file,
  total: Object.values(colors).reduce((a, b) => a + b, 0),
  colors,
}));
fileTotals.sort((a, b) => b.total - a.total);

// ── 4. Top 20 offender files ──────────────────────────────────────────────
console.log('=== TOP 20 OFFENDER FILES ===\n');
console.log(
  'Rank | Total | File'.padEnd(80)
);
console.log('-'.repeat(80));
for (let i = 0; i < Math.min(20, fileTotals.length); i++) {
  const f = fileTotals[i];
  console.log(`${String(i + 1).padStart(4)} | ${String(f.total).padStart(5)} | ${f.file}`);
}

// ── 5. Per-file breakdown: top hex values mapped to tokens ────────────────
console.log('\n=== PER-FILE BREAKDOWN (Top 20 files) ===\n');
for (let i = 0; i < Math.min(20, fileTotals.length); i++) {
  const f = fileTotals[i];
  const sorted = Object.entries(f.colors).sort((a, b) => b[1] - a[1]);
  console.log(`--- ${f.file} (${f.total} occurrences) ---`);
  for (const [hex, count] of sorted) {
    const { token, tokenHex, distance } = findNearestToken(hex, tokens);
    const match = distance === 0 ? 'EXACT' : distance < 10 ? 'CLOSE' : 'NEAR';
    console.log(`  ${hex} x${String(count).padStart(3)}  =>  ${token} (${tokenHex}) [${match}, d=${distance}]`);
  }
  console.log('');
}

// ── 6. Global color frequency (all files) ─────────────────────────────────
const globalColors = {};
for (const f of Object.values(fileData)) {
  for (const [hex, count] of Object.entries(f)) {
    globalColors[hex] = (globalColors[hex] || 0) + count;
  }
}
const globalSorted = Object.entries(globalColors).sort((a, b) => b[1] - a[1]);

console.log('=== GLOBAL COLOR FREQUENCY (Top 30) ===\n');
console.log('Hex        | Count | Nearest Token');
console.log('-'.repeat(60));
for (const [hex, count] of globalSorted.slice(0, 30)) {
  const { token, tokenHex, distance } = findNearestToken(hex, tokens);
  const match = distance === 0 ? 'EXACT' : distance < 10 ? 'CLOSE' : 'NEAR';
  console.log(`${hex}  | ${String(count).padStart(5)} | ${token} (${tokenHex}) [${match}]`);
}

// ── 7. Summary stats ──────────────────────────────────────────────────────
const totalHex = globalSorted.reduce((a, [, c]) => a + c, 0);
const exactMatch = globalSorted.filter(([h]) => tokens.some((t) => t.hex === h.toLowerCase()));
const exactCount = exactMatch.reduce((a, [, c]) => a + c, 0);

console.log('\n=== SUMMARY ===');
console.log(`Total files with hex:       ${fileTotals.length}`);
console.log(`Total hex occurrences:      ${totalHex}`);
console.log(`Exact token matches:        ${exactCount} (${((exactCount / totalHex) * 100).toFixed(1)}%)`);
console.log(`Non-token hardcoded:        ${totalHex - exactCount} (${(((totalHex - exactCount) / totalHex) * 100).toFixed(1)}%)`);
console.log(`Unique hardcoded colors:    ${globalColors.length}`);
