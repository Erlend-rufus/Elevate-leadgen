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
 *   1. index.html, side/index.html and side-b/index.html exist and carry a robots
 *      noindex meta.
 *   2. No network code anywhere in the folder: fetch(, XMLHttpRequest,
 *      sendBeacon, data-netlify, form action= with a URL, or known tracker hosts.
 *   3. No phone-line number, commission or percentage wording, and no NOK amounts.
 *   4. netlify.toml has the X-Robots-Tag header for /demo/*.
 *   5. The twelve ad links (ten static, two film) on the showcase page point at side/ or side-b/ with the
 *      expected utm_content values.
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

  for (const page of ['index.html', 'side/index.html', 'side-b/index.html']) {
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
      if (re.test(text)) fail(`${rel(file)}: contains ${label}`);
    }
  }

  const index = join(dir, 'index.html');
  if (existsSync(index)) {
    const html = readFileSync(index, 'utf8');
    const links = [...html.matchAll(/href="(side(?:-b)?)\/\?utm_source=(meta|linkedin)&utm_campaign=demo&utm_content=(\w+)"/g)];
    const got = links.map((m) => `${m[1]}:${m[2]}:${m[3]}`).sort();
    const want = ['side-b:linkedin:b4', 'side-b:linkedin:b5', 'side-b:meta:b1', 'side-b:meta:b2', 'side-b:meta:b3', 'side-b:meta:b6', 'side-b:meta:b7',
                  'side:linkedin:a4', 'side:linkedin:a5', 'side:meta:a1', 'side:meta:a2', 'side:meta:a3'];
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
