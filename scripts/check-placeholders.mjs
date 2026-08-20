#!/usr/bin/env node
/**
 * Fails loudly on placeholders that would break a live funnel silently.
 * A dead Calendly URL or an unset webhook does not error: the page loads, the
 * visitor submits, and the lead is simply gone. That is worth stopping a build
 * to notice.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!/\.(html|js|css|json)$/.test(name)) continue;
    const text = readFileSync(p, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (line.includes('REPLACE-ME')) hits.push(`${p.replace(root + '/', '')}:${i + 1}`);
    });
  }
}
walk(join(root, 'public'));

if (hits.length) {
  console.log('');
  console.log('  ' + '='.repeat(68));
  console.log('  PLACEHOLDERS STILL IN THE BUILD. Do not spend on ads yet.');
  hits.forEach((h) => console.log('    ' + h));
  console.log('  Every paid lead reaching these goes nowhere and cannot be recovered.');
  console.log('  ' + '='.repeat(68));
  console.log('');
}
