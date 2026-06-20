import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
const ignorePrefixes = ['http://', 'https://', 'mailto:', 'tel:', '#', 'javascript:', 'data:'];
const dynamicMarkers = ['${', '{{'];
const missing = [];

for (const file of htmlFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const re = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const match of text.matchAll(re)) {
    const raw = match[1].trim();
    if (!raw) continue;
    if (ignorePrefixes.some((prefix) => raw.startsWith(prefix))) continue;
    if (dynamicMarkers.some((marker) => raw.includes(marker))) continue;
    const clean = raw.split('#')[0].split('?')[0];
    if (!clean || clean.startsWith('/')) continue;
    const target = path.resolve(path.dirname(path.join(root, file)), clean);
    if (!target.startsWith(root)) continue;
    if (!fs.existsSync(target)) {
      missing.push({ file, ref: raw });
    }
  }
}

for (const json of fs.readdirSync(root).filter((f) => f.endsWith('.json'))) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, json), 'utf8'));
  } catch (err) {
    missing.push({ file: json, ref: `Invalid JSON: ${err.message}` });
  }
}

if (missing.length) {
  console.error('Package audit found missing/invalid references:');
  for (const item of missing) console.error(`- ${item.file}: ${item.ref}`);
  process.exit(1);
}

console.log(`Package audit passed: ${htmlFiles.length} HTML files checked.`);
