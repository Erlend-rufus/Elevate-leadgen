#!/usr/bin/env node
/**
 * Guards for prospect demos under public/demo/<prospect>-<slug>/.
 *
 * A demo shows a prospect's own brand on our domain with a form that must only
 * ever pretend to submit. If someone later wires it to a real endpoint, adds a
 * pixel, or lets it rank, that is a silent problem: the prospect's name ends up
 * in a search index or a lead lands nowhere. So the build fails instead.
 *
 * Checks, per demo folder:
 *   1. index.html (and side/index.html, for ad-showcase demos) exist and carry a
 *      robots noindex meta. A demo is an ad showcase when it has a side/ folder.
 *   2. No network code anywhere in the folder: fetch(, XMLHttpRequest,
 *      sendBeacon, data-netlify, form action= with a URL, or known tracker hosts.
 *   3. No phone-line number, commission or percentage wording, and no NOK amounts.
 *   4. netlify.toml has the X-Robots-Tag header for /demo/*.
 *   5. The five ad links on the showcase page point at side/ with the expected
 *      utm_content values (ad-showcase demos only).
 *
 * A demo may carry a demo.json manifest. "allowProspectPrices": true lets the
 * demo show the prospect's own public NOK prices (rule 3 then skips NOK amounts
 * only; commission, percentage and phone-line rules still apply).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoRoot = join(root, 'public', 'demo');
const problems = [];
const fail = (m) => problems.push(m);

if (!existsSync(demoRoot)) process.exit(0);

const toml = readFileSync(join(root, 'netlify.toml'), 'utf8');
if (!/for = "\/demo\/\*"[\s\S]{0,200}X-Robots-Tag = "noindex/.test(toml)) {
  fail('netlify.toml: missing X-Robots-Tag noindex header for /demo/*');
}

const forbidden = [
  [/\bfetch\s*\(/, 'fetch('],
  [/XMLHttpRequest/, 'XMLHttpRequest'],
  [/sendBeacon/, 'navigator.sendBeacon'],
  [/data-netlify/, 'data-netlify'],
  [/<form[^>]*\baction\s*=\s*["']?(https?:)?\/\//i, 'form action with a URL'],
  [/googletagmanager|google-analytics|connect\.facebook\.net|fbq\(|gtag\(|clarity\.ms|hotjar|zapier|clickup|hooks\.slack/i, 'tracker or pipeline host'],
  [/\b02485\b/, 'phone line 02485'],
  [/kommisjon/i, '"kommisjon"'],
  [/\bprosent\b/i, '"prosent"'],
  [/\d[\d\s]*\s?kr\b/, 'a NOK amount'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|js|mjs|css|json|txt)$/.test(name)) out.push(p);
  }
  return out;
}

for (const demo of readdirSync(demoRoot)) {
  const dir = join(demoRoot, demo);
  if (!statSync(dir).isDirectory()) continue;
  const rel = (p) => relative(root, p);
  const manifestPath = join(dir, 'demo.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const showcase = existsSync(join(dir, 'side'));
  const pages = showcase ? ['index.html', 'side/index.html'] : ['index.html'];

  for (const page of pages) {
    const p = join(dir, page);
    if (!existsSync(p)) { fail(`${rel(p)}: missing`); continue; }
    const html = readFileSync(p, 'utf8');
    if (!/<meta\s+name="robots"\s+content="[^"]*noindex[^"]*"/i.test(html)) {
      fail(`${rel(p)}: no robots noindex meta`);
    }
  }

  for (const file of walk(dir)) {
    const text = readFileSync(file, 'utf8');
    for (const [re, label] of forbidden) {
      if (label === 'a NOK amount' && manifest.allowProspectPrices === true) continue;
      if (re.test(text)) fail(`${rel(file)}: contains ${label}`);
    }
  }

  const index = join(dir, 'index.html');
  if (showcase && existsSync(index)) {
    const html = readFileSync(index, 'utf8');
    const links = [...html.matchAll(/href="side\/\?utm_source=(meta|linkedin)&utm_campaign=demo&utm_content=(\w+)"/g)];
    const got = links.map((m) => `${m[1]}:${m[2]}`).sort();
    const want = ['linkedin:l1', 'linkedin:l2', 'meta:m1', 'meta:m2', 'meta:m3'];
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      fail(`${rel(index)}: ad links are ${got.join(', ') || 'missing'}; expected ${want.join(', ')}`);
    }
  }
}

if (problems.length) {
  console.error('');
  console.error('  ' + '='.repeat(68));
  console.error('  DEMO CHECK FAILED. A prospect demo must stay inert and unindexed.');
  problems.forEach((p) => console.error('    ' + p));
  console.error('  ' + '='.repeat(68));
  console.error('');
  process.exit(1);
}
console.log(`check-demo: ok (${readdirSync(demoRoot).length} demo folder(s))`);
