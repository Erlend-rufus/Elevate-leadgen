#!/usr/bin/env node
/**
 * /g/uk-it-larger-firms generator: landing page, application form, five outcome
 * pages, and the pre-rendered shell the apply function needs.
 *
 * A second generator beside scripts/build-g.mjs, not an extension of it. That
 * one is built around a different page (a table of a named client's figures,
 * compliance points, a Typeform) and its validate() would reject this funnel's
 * data. They share the self-hosted fonts and logos under public/g/_assets and
 * the idea: static HTML, because the React app serves a 1.7 KB shell to anything
 * that does not run JavaScript. Here that matters twice, because this funnel's
 * requirement is that it works with no script at all.
 *
 * Source of truth is g/uk-it-larger-firms/. Nothing in public/g/uk-it-larger-firms
 * or netlify/functions/uk-it-apply/data.generated.mjs is edited by hand.
 *
 * IMPORTANT: this removes only public/g/uk-it-larger-firms. public/g/_assets
 * holds the fonts and logos every /g campaign shares and must survive every
 * build, so the slug "_assets" is refused and public/g is never enumerated.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'g', 'uk-it-larger-firms');
const OUT = join(root, 'public', 'g');
const FN = join(root, 'netlify', 'functions', 'uk-it-apply');

const { renderForm, esc, ALERT_ICON } = require(join(SRC, 'form.cjs'));
const { checkRouting } = require(join(SRC, 'route.cjs'));

const json = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));
const text = (f) => readFileSync(join(SRC, f), 'utf8');

const die = (msg) => { console.error(`\n  ✗ g/uk-it-larger-firms: ${msg}\n`); process.exit(1); };

const cfg = json('config.json');
const copy = json('copy.json');
const routing = json('routing.json');
const CSS = text('style.css');
const SLUG = cfg.slug;
const BASE = `/g/${SLUG}`;

/* -------------------------------------------------------------- variables */

const VARS = cfg.variables;
/** {THRESHOLD} and {OFFER}, in one place. Anything else in braces is a typo. */
function sub(s) {
  const out = String(s).replace(/\{([A-Z_]+)\}/g, (m, k) => {
    if (!(k in VARS)) die(`copy uses {${k}}, which config.variables does not define`);
    return VARS[k];
  });
  return out;
}
/** Escaped, with **bold** as <strong>. Variables resolved first so a value is escaped like any text. */
const rich = (s) => esc(sub(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const plain = (s) => esc(sub(s));

/* ------------------------------------------------------------ validation */

/** Every { path } in copy.json that carries a _pending marker. */
function pendingCopy(node, path, out) {
  if (node && typeof node === 'object') {
    if (!Array.isArray(node) && '_pending' in node) out.push(`${path} (${node._pending})`);
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('_')) pendingCopy(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

function validate() {
  if (SLUG === '_assets') die('slug "_assets" is reserved for the shared fonts and logos');
  if (!/^[a-z0-9-]+$/.test(SLUG)) die(`slug "${SLUG}" must be lower-case letters, digits and hyphens`);
  if (typeof cfg.live !== 'boolean') die('config.live must be true or false');
  if (!/^https:\/\/[a-z0-9.-]+$/.test(cfg.origin)) die(`origin "${cfg.origin}" must be an https host with no path`);
  if (cfg.funnel.calendlyUrl && !/^https:\/\/calendly\.com\/[^?#]+$/.test(cfg.funnel.calendlyUrl))
    die(`funnel.calendlyUrl "${cfg.funnel.calendlyUrl}" must be a calendly.com URL with no query string: the page adds its own parameters`);
  if (!/^\/g\/[a-z0-9-]+\/apply$/.test(cfg.funnel.applyPath) || cfg.funnel.applyPath !== `${BASE}/apply`)
    die(`funnel.applyPath must be ${BASE}/apply`);
  for (const [k, v] of Object.entries(VARS)) if (!String(v).trim()) die(`config.variables.${k} is empty: the copy would read as broken sentences`);
  if (copy.form.questions.length !== 12) die(`the form must have twelve questions, it has ${copy.form.questions.length}`);
  // the details question must be the last: the last step is the one that submits
  if (copy.form.questions[11].kind !== 'details') die('question 12 must be the details question');

  const outstanding = [];
  const pending = pendingCopy(copy, '', []);
  pending.forEach((p) => outstanding.push(`copy not delivered: ${p}`));
  const rp = checkRouting(copy.form.questions, routing);
  rp.forEach((p) => outstanding.push(`routing: ${p}`));
  if (!cfg.funnel.calendlyUrl) outstanding.push('funnel.calendlyUrl is empty');

  if (cfg.live && outstanding.length)
    die('"live" is true but these are not done, and a visitor would meet every one of them:\n' + outstanding.map((o) => '      - ' + o).join('\n'));
  return outstanding;
}

/** Acceptance criterion 2 as a build check: no colour outside the tokens, and no green. */
const HEX_OK = new Set(['F7F5F0', 'EFEDE7', 'FFFFFF', 'CFCBC0', 'E3E0D8', '8B909C', '10141C', '4A5162', '2A3140', '0A1628', 'B3261E']);
const RGBA_OK = new Set([
  'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0.82)', 'rgba(255,255,255,0.86)',
  'rgba(16,20,28,0.25)', 'rgba(16,20,28,0.18)',
]);
/* A colour keyword standing on its own. Not var(--white): a custom property's name is not a colour. */
const NAMED = /:\s*[^;{}]*(?<![-\w])(white|black|red|green|blue|orange|yellow|teal|lime|gray|grey|purple|pink|cyan|navy)(?![-\w])/i;

function checkOutput(path, html) {
  if (html.includes('{{')) die(`${path} still contains template syntax "{{"`);
  const left = /\{(THRESHOLD|OFFER)\}/.exec(html);
  if (left) die(`${path} still contains ${left[0]}: a variable was not resolved`);
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) die(`${path} requests a font from Google. Fonts are self-hosted under /g/_assets/fonts/.`);
  for (const m of html.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)) {
    if (!HEX_OK.has(m[1].toUpperCase())) die(`${path} uses the colour ${m[0]}, which is not one of the work order's tokens. This page has no green and no accent.`);
  }
  const other = /\b(hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i.exec(html.replace(/<script[\s\S]*?<\/script>/g, ''));
  if (other) die(`${path} uses a ${other[1]}() colour. Only the work order's hex and rgba tokens are allowed.`);
  for (const m of html.matchAll(/rgba?\([^)]*\)/g)) {
    const norm = m[0].replace(/\s+/g, '');
    if (!RGBA_OK.has(norm)) die(`${path} uses ${m[0]}, which is not one of the work order's tokens`);
  }
  const named = NAMED.exec(CSS);
  if (named) die(`style.css uses the named colour "${named[1]}": ${named[0].slice(0, 60)}`);
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    // an inlined script containing "</script" would end itself early; the regex above would not see it, so look for the opening tags instead
    if (/<\/script/i.test(m[1])) die(`${path} has a script that contains "</script"`);
  }
}

/* ------------------------------------------------------------------ shell */

const LOGO = (kind, cls) => `<picture>
      <source srcset="/g/_assets/logo-${kind}.webp" type="image/webp">
      <img class="${cls}" src="/g/_assets/logo-${kind}.png" width="418" height="168" alt="Elevate Marketing">
    </picture>`;

const font = (f) => `<link rel="preload" href="/g/_assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`;

function head({ title, description, robots, canonical, scripts }) {
  return `<!DOCTYPE html>
<html lang="en-GB" class="no-js">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">\n` : ''}${robots ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta name="theme-color" content="#F7F5F0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${font('geist-v1.woff2')}
${font('fraunces-v1.woff2')}
${scripts ? "<script>document.documentElement.className='js'</script>\n" : ''}<style>${CSS}</style>
${scripts ? `<script src="/js/consent.js?v=3" data-pixel="${esc(cfg.funnel.pixelId)}" data-banner="off"></script>\n` : ''}</head>`;
}

const topbar = () => `<div class="topbar"><div class="wrap">${plain(copy.topbar)}</div></div>`;
const siteHeader = () => `<header class="site-header">
  <div class="wrap">
    ${LOGO('ink', 'logo')}
  </div>
</header>`;

function siteFooter() {
  const f = copy.footer;
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      ${LOGO('white', 'logo-foot')}
      <p class="legal">${plain(f.legal)}</p>
    </div>
    <div class="footer-links">
      <a href="${esc(cfg.links.privacy)}">${plain(f.privacy)}</a>
      <a href="${esc(cfg.links.terms)}">${plain(f.terms)}</a>
    </div>
  </div>
</footer>`;
}

const consentBar = () => `<div class="consent" id="consent" role="region" aria-label="Cookies" hidden>
  <p>${plain(copy.consent.body)}</p>
  <div class="consent-btns">
    <button type="button" data-c="yes">${plain(copy.consent.accept)}</button>
    <button type="button" data-c="no">${plain(copy.consent.decline)}</button>
  </div>
</div>`;

/** window.UKIT, then the shared scripts in dependency order, then this page's own. */
function scriptBlock(extra, page) {
  const k = {
    slug: SLUG,
    applyPath: cfg.funnel.applyPath,
    hidden: cfg.hiddenFields,
    questions: copy.form.questions,
    messages: copy.form.errors,
    labels: copy.form.labels,
    icon: ALERT_ICON,
    email: cfg.contact.email,
    calendlyUrl: cfg.funnel.calendlyUrl,
    takkPath: `${BASE}/takk/`,
    ...extra,
  };
  const data = JSON.stringify(k).replace(/</g, '\\u003c');
  return `<script>window.UKIT=${data};</script>
<script>${text('core.cjs')}</script>
<script>${text('common.js')}</script>
<script>${text(page)}</script>`;
}

/* ---------------------------------------------------------------- landing */

function renderLanding() {
  const h = copy.hero, fit = copy.fit, paid = copy.paid, keep = copy.keep, meet = copy.meeting, cl = copy.clients, faq = copy.faq, fs = copy.formSection;

  const plus = '<svg class="em-plus" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10141C" stroke-width="1.5" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"></path></svg>';
  const minus = '<svg class="em-minus" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10141C" stroke-width="1.5" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="M5 12h14"></path></svg>';

  const title = `${h.h1.join(' ')} | Elevate Marketing`;
  const indexable = cfg.live && cfg.indexable;

  return `${head({ title, description: sub(h.lede), robots: !indexable, canonical: `${cfg.origin}${BASE}/`, scripts: true })}
<body>
${topbar()}
${siteHeader()}
<main>
<section class="hero" data-section="hero">
  <div class="wrap">
    <h1>${h.h1.map((l) => `<span>${plain(l)}</span>`).join('')}</h1>
    <div class="hero-side">
      <p class="lede">${plain(h.lede)}</p>
      <div class="cta-block">
        <a class="cta" id="hero-cta" href="#form">${plain(h.cta)}</a>
        <p class="micro">${plain(h.micro)}</p>
      </div>
    </div>
  </div>
</section>
<section class="sec fit rule-top" data-section="fit">
  <div class="wrap">
    <div class="fit-grid">
      <div>
        <h2>${plain(fit.worksTitle)}</h2>
        <ul class="fit-list">
${fit.works.map((t) => `          <li>${rich(t)}</li>`).join('\n')}
        </ul>
      </div>
      <div>
        <h2>${plain(fit.notTitle)}</h2>
        <ul class="fit-list">
${fit.not.map((t) => `          <li>${rich(t)}</li>`).join('\n')}
        </ul>
      </div>
    </div>
    <p class="foot-note">${plain(fit.footnote)}</p>
  </div>
</section>
<section class="sec paid" data-section="paid">
  <div class="wrap">
    <h2>${plain(paid.h2)} <span class="dim">${plain(paid.h2muted)}</span></h2>
    <div class="paid-grid">
      <p>${plain(paid.p1)}</p>
      <p>${plain(paid.p2)}</p>
    </div>
  </div>
</section>
<section class="sec keep" data-section="keep">
  <div class="wrap">
    <h2>${plain(keep.h2)}</h2>
    <div class="keep-grid">
${keep.items.map((i) => `      <div class="keep-item"><h3>${plain(i.title)}</h3><p>${plain(i.text)}</p></div>`).join('\n')}
    </div>
  </div>
</section>
<section class="sec meeting rule-top" data-section="meeting">
  <div class="wrap">
    <div class="meeting-top">
      <div><h2>${plain(meet.h2)}</h2></div>
      <p>${plain(meet.lede)}</p>
    </div>
    <ol class="steps">
${meet.steps.map((s, i) => `      <li><div class="step-n">${i + 1}</div><div class="step-body"><h3>${plain(s.title)}</h3><p>${plain(s.text)}</p></div></li>`).join('\n')}
    </ol>
    <div class="notice"><p>${plain(meet.notice)}</p></div>
  </div>
</section>
<section class="sec clients rule-top" data-section="clients">
  <div class="wrap">
    <h2>${plain(cl.h2)}</h2>
    <div class="clients-grid">
${cl.items.map((c) => `      <div class="client"><div class="client-name">${plain(c.name)}</div><div class="client-sector">${plain(c.sector)}</div></div>`).join('\n')}
    </div>
    <p class="foot-note">${plain(cl.footnote)}</p>
  </div>
</section>
<section class="sec faq rule-top" data-section="faq">
  <div class="wrap">
    <div class="faq-head"><h2>${plain(faq.h2)}</h2></div>
    <div class="faq-list">
${faq.items.map((i, n) => `      <details${n === 0 ? ' open' : ''}><summary><span>${plain(i.q)}</span>${plus}${minus}</summary><p>${plain(i.a)}</p></details>`).join('\n')}
    </div>
  </div>
</section>
<section class="sec form-sec rule-top" id="form" data-section="form">
  <div class="wrap">
    <div class="form-intro">
      <h2>${plain(fs.h2)}</h2>
      <p>${plain(fs.text)}</p>
    </div>
    <div class="form-main">
${renderForm({ copy, config: cfg })}
    </div>
  </div>
</section>
</main>
${siteFooter()}
${consentBar()}
<div class="sticky" id="sticky" hidden><a class="cta" href="#form">${plain(copy.sticky)}</a></div>
${scriptBlock({}, 'client.js')}
</body>
</html>
`;
}

/* ---------------------------------------------------------------- outcomes */

function renderOutcome(page) {
  const o = copy.outcomes[page];
  const book = page === 'book';
  const embed = !book ? '' : cfg.funnel.calendlyUrl
    ? `
    <div class="embed-box" id="cal"><noscript><p class="embed-off"><a href="${esc(cfg.funnel.calendlyUrl)}">${esc(cfg.funnel.calendlyUrl)}</a></p></noscript></div>`
    : `
    <div class="embed-box" id="cal"><div class="embed-off">CALENDLY_EMBED</div></div>`;

  return `${head({ title: `${o.h1} | Elevate Marketing`, robots: true, scripts: true })}
<body>
<div class="outcome${book ? ' is-book' : ''}">
${siteHeader()}
<main>
<section class="outcome-sec" data-section="outcome">
  <div class="wrap">
    <div class="outcome-text">
      <h1>${plain(o.h1)}</h1>
      <p>${plain(o.text)}</p>
    </div>${embed}
  </div>
</section>
</main>
${siteFooter()}
</div>
${consentBar()}
${scriptBlock({}, 'outcome.js')}
</body>
</html>
`;
}

/* --------------------------------------- shell for the no-script re-render */

/** The page a visitor without JavaScript gets back after a failed submission: the form section on its own, no script, no pixel. */
function noScriptShell() {
  const fs = copy.formSection;
  const title = `${copy.hero.h1.join(' ')} | Elevate Marketing`;
  return {
    before: `${head({ title, robots: true, scripts: false })}
<body>
${topbar()}
${siteHeader()}
<main>
<section class="sec form-sec" id="form" data-section="form">
  <div class="wrap">
    <div class="form-intro">
      <h1 class="h2">${plain(fs.h2)}</h1>
      <p>${plain(fs.text)}</p>
    </div>
    <div class="form-main">
`,
    after: `
    </div>
  </div>
</section>
</main>
${siteFooter()}
</body>
</html>
`,
  };
}

/* -------------------------------------------------------------------- main */

const outstanding = validate();

const pages = [
  ['index.html', renderLanding()],
  ...['book', 'takk', 'review', 'not-now', 'not-a-fit'].map((p) => [join(p, 'index.html'), renderOutcome(p)]),
];
const shell = noScriptShell();
for (const [rel, html] of pages) checkOutput(`${SLUG}/${rel}`, html);
checkOutput(`${SLUG}/(no-script shell)`, shell.before + shell.after);

/* Only this slug. public/g/_assets is never enumerated, let alone removed. */
const dir = join(OUT, SLUG);
rmSync(dir, { recursive: true, force: true });
for (const sub of ['book', 'takk', 'review', 'not-now', 'not-a-fit']) mkdirSync(join(dir, sub), { recursive: true });
for (const [rel, html] of pages) writeFileSync(join(dir, rel), html);

mkdirSync(FN, { recursive: true });
/* The function imports this one module rather than the JSON files. A JSON import
   needs an import attribute in Node and is treated differently by Netlify's
   bundler; a plain ES module is the same everywhere, tests included. */
writeFileSync(join(FN, 'data.generated.mjs'),
  '// Generated by scripts/build-g-it.mjs from g/uk-it-larger-firms/. Do not edit.\n' +
  `export const cfg = ${JSON.stringify(cfg)};\n` +
  `export const copy = ${JSON.stringify(copy)};\n` +
  `export const routing = ${JSON.stringify(routing)};\n` +
  `export const shell = ${JSON.stringify(shell)};\n`);

console.log(`  g-it: /g/${SLUG} + /book /takk /review /not-now /not-a-fit  (+ apply data)`);
if (!cfg.live) {
  console.log(`    ⚠ "live" is false in g/${SLUG}/config.json: every page carries noindex and the apply endpoint refuses submissions`);
  if (outstanding.length) {
    console.log('      Outstanding before it can go live:');
    outstanding.forEach((o) => console.log('        - ' + o));
  }
}
