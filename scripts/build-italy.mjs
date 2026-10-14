#!/usr/bin/env node
/**
 * /italy generator: the Italian landing page (variant A1), the application
 * form, five outcome pages, and the pre-rendered shell the lead function needs.
 *
 * A third generator beside scripts/build-g.mjs and scripts/build-g-it.mjs, and
 * deliberately a copy of the second rather than an extension of it. The Italian
 * funnel has its own copy, its own form, its own consent key and pixel loader
 * and its own function, so that a change to the UK funnel cannot break it and
 * the other way round. They share the idea (static HTML, a form that works with
 * no script, one fail-closed endpoint) and the design tokens, not the code.
 *
 * Source of truth is g/italy/. Nothing in public/italy (apart from the two legal
 * notices, see below) or netlify/functions/italy-lead/data.generated.mjs is edited
 * by hand.
 *
 * What this removes and what it keeps. Each build rewrites index.html, the five
 * outcome folders and assets/ under public/italy. It does NOT remove the folder:
 * public/italy/privacy/ and public/italy/cookie/ are the Italian legal notices,
 * delivered separately as text the Italian adviser approves, and they must
 * survive every build. The live gate checks that they exist.
 *
 * Fonts and logos are copied from public/g/_assets (the one place they are kept) into
 * public/italy/assets, so this funnel does not depend on /g staying where it is.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'g', 'italy');
const PUBLIC = join(root, 'public');
const FN = join(root, 'netlify', 'functions', 'italy-lead');
const SHARED_ASSETS = join(PUBLIC, 'g', '_assets');

const { renderForm, esc, linkify, ALERT_ICON } = require(join(SRC, 'form.cjs'));
const { checkRouting, PAGES } = require(join(SRC, 'route.cjs'));

const json = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));
const text = (f) => readFileSync(join(SRC, f), 'utf8');

const die = (msg) => { console.error(`\n  ✗ g/italy: ${msg}\n`); process.exit(1); };

const cfg = json('config.json');
const copy = json('copy.json');
const routing = json('routing.json');
const CSS = text('style.css');
const SLUG = cfg.slug;
const BASE = cfg.path;
const OUTCOMES = PAGES; // book, takk, not-now, not-a-fit, not-a-fit-b

/* -------------------------------------------------------------- variables */

const VARS = Object.fromEntries(Object.entries(cfg.variables).filter(([k]) => !k.startsWith('_')));
/** {THRESHOLD} and {OFFER}, in one place. Anything else in capitals and braces is a typo. A value that is
    itself still "{NAME}" is an open decision: the brief says to render it as written, and the live gate refuses it. */
function sub(s) {
  return String(s).replace(/\{([A-Z_]+)\}/g, (m, k) => {
    if (!(k in VARS)) die(`copy uses {${k}}, which config.variables does not define`);
    return VARS[k];
  });
}
const stillOpen = (k) => /^\{[A-Z_]+\}$/.test(String(VARS[k]).trim());
const links = cfg.links;
/** Escaped, variables resolved first, with [text](privacy) and [text](cookies) as links. */
const plain = (s) => linkify(sub(s), links);

/* ------------------------------------------------------------ validation */

/** Every string in copy.json, with its path. */
function strings(node, path, out) {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('_')) strings(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

function validate() {
  if (SLUG === '_assets') die('slug "_assets" is reserved for the shared fonts and logos');
  if (!/^[a-z0-9-]+$/.test(SLUG)) die(`slug "${SLUG}" must be lower-case letters, digits and hyphens`);
  /* The address. One segment, and not a place the site already uses: a path that is
     also a React route or another funnel would be shadowed or would shadow it. */
  if (!/^\/[a-z0-9]+(-[a-z0-9]+)*$/.test(BASE)) die(`config.path "${BASE}" must be one lower-case segment such as /italy`);
  const RESERVED = ['/g', '/lp', '/audit', '/case', '/report', '/draft', '/r', '/uk-recruitment', '/uk-it-firms', '/css', '/js', '/images', '/assets', '/nevari', '/the-journey', '/growth-audit', '/book', '/contact', '/about', '/services', '/blog', '/cases', '/takk', '/not-a-fit'];
  if (RESERVED.includes(BASE)) die(`config.path "${BASE}" is already used by the site`);
  const app = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
  if (app.includes(`"${BASE}`) || app.includes(`'${BASE}`)) die(`config.path "${BASE}" is a route in the React app`);
  if (typeof cfg.live !== 'boolean') die('config.live must be true or false');
  if (typeof cfg.proofread !== 'boolean' || typeof cfg.legalApproved !== 'boolean') die('config.proofread and config.legalApproved must be true or false');
  if (!/^https:\/\/[a-z0-9.-]+$/.test(cfg.origin)) die(`origin "${cfg.origin}" must be an https host with no path`);
  if (cfg.funnel.calendlyUrl && !/^https:\/\/calendly\.com\/[^?#]+$/.test(cfg.funnel.calendlyUrl))
    die(`funnel.calendlyUrl "${cfg.funnel.calendlyUrl}" must be a calendly.com URL with no query string: the page adds its own parameters`);
  if (cfg.funnel.pixelId && !/^[0-9]{8,20}$/.test(cfg.funnel.pixelId)) die(`funnel.pixelId "${cfg.funnel.pixelId}" is not a Meta pixel id (digits only)`);
  if (!/^[a-z0-9_]{3,40}$/.test(cfg.consent.storageKey)) die(`consent.storageKey "${cfg.consent.storageKey}" must be 3 to 40 lower-case letters, digits or underscores`);
  if (cfg.consent.storageKey === 'elevate-cookie-consent') die('consent.storageKey must not be the UK funnel\'s key: a choice made there is not consent given here');
  if (cfg.funnel.applyPath !== `${BASE}/api/lead`) die(`funnel.applyPath must be ${BASE}/api/lead`);
  for (const k of ['privacy', 'cookies']) {
    if (cfg.links[k] !== `${BASE}/${k === 'cookies' ? 'cookie' : k}/`) die(`links.${k} must be ${BASE}/${k === 'cookies' ? 'cookie' : k}/`);
  }
  if (cfg.links.terms !== null) die('links.terms must be null: there is no terms page at launch, and the brief says to omit the link');
  /* The function names its own route as a literal (Netlify reads it statically). If it
     drifts from config.funnel.applyPath, the form posts to a path nothing answers. */
  const fnFile = join(FN, 'index.mjs');
  if (!existsSync(fnFile)) die('netlify/functions/italy-lead/index.mjs is missing');
  if (!readFileSync(fnFile, 'utf8').includes(`path: '${cfg.funnel.applyPath}'`)) die(`netlify/functions/italy-lead/index.mjs must export config.path '${cfg.funnel.applyPath}'`);
  for (const [k, v] of Object.entries(VARS)) if (!String(v).trim()) die(`config.variables.${k} is empty: the copy would read as broken sentences`);

  const qs = copy.form.questions;
  if (qs.length !== 6) die(`the form must have six questions, it has ${qs.length}`);
  // the details question must be the last: the last step is the one that submits
  if (qs[qs.length - 1].kind !== 'details') die('the last question must be the details question');
  if (!qs[qs.length - 1].fields.some((f) => f.type === 'checkbox')) die('the details question must carry the consent checkbox');
  for (const o of OUTCOMES) if (!copy.outcomes[o]) die(`copy.outcomes.${o} is missing`);

  /* Tone rules that hold for every Elevate page: no exclamation marks, no em dashes. */
  for (const [p, s] of strings(copy, '', [])) {
    if (s.includes('!')) die(`copy.${p} contains an exclamation mark`);
    if (s.includes('—')) die(`copy.${p} contains an em dash`);
  }

  const outstanding = [];
  if (!cfg.proofread) outstanding.push('config.proofread is false: Aurora has not proofread the Italian copy');
  if (!cfg.legalApproved) outstanding.push('config.legalApproved is false: the Italian adviser has not approved the lines marked ADVISOR');
  for (const k of Object.keys(VARS)) if (stillOpen(k)) outstanding.push(`config.variables.${k} is still the placeholder ${VARS[k]}`);
  checkRouting(qs, routing).forEach((p) => outstanding.push(`routing: ${p}`));
  if (!cfg.funnel.calendlyUrl) outstanding.push('funnel.calendlyUrl is empty (a separate Italian event type is needed)');
  if (!cfg.funnel.pixelId) outstanding.push('funnel.pixelId is empty: no pixel loads, so no Lead event is ever sent');
  for (const [name, dir] of [['privacy notice', 'privacy'], ['cookie notice', 'cookie']])
    if (!existsSync(join(PUBLIC, 'italy', dir, 'index.html'))) outstanding.push(`public/italy/${dir}/index.html does not exist: the ${name} has not been delivered`);

  if (cfg.live && outstanding.length)
    die('"live" is true but these are not done, and a visitor would meet every one of them:\n' + outstanding.map((o) => '      - ' + o).join('\n'));
  return outstanding;
}

/** The build check for the design tokens: no colour outside them, and no green. */
const HEX_OK = new Set(['F7F5F0', 'EFEDE7', 'FFFFFF', 'CFCBC0', 'E3E0D8', '8B909C', '10141C', '4A5162', '2A3140', '0A1628', 'B3261E']);
const RGBA_OK = new Set([
  'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0.82)', 'rgba(255,255,255,0.86)',
  'rgba(16,20,28,0.25)', 'rgba(16,20,28,0.18)',
]);
/* A colour keyword standing on its own. Not var(--white): a custom property's name is not a colour. */
const NAMED = /:\s*[^;{}]*(?<![-\w])(white|black|red|green|blue|orange|yellow|teal|lime|gray|grey|purple|pink|cyan|navy)(?![-\w])/i;

function checkOutput(path, html) {
  if (html.includes('{{')) die(`${path} still contains template syntax "{{"`);
  /* {THRESHOLD} and {OFFER} may remain only where config says the decision is still open. */
  for (const m of html.matchAll(/\{([A-Z_]+)\}/g)) {
    if (!(m[1] in VARS) || !stillOpen(m[1])) die(`${path} still contains ${m[0]}: a variable was not resolved`);
  }
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) die(`${path} requests a font from Google. Fonts are self-hosted under /italy/assets/fonts/.`);
  if (/href="\/g\/_assets|src="\/g\/_assets|srcset="\/g\/_assets|url\(\/g\/_assets/.test(html)) die(`${path} points at /g/_assets: this funnel serves its own copies from /italy/assets/`);
  if (/\/js\/consent\.js|elevate-cookie-consent/.test(html)) die(`${path} uses the shared consent script or the UK consent key. This funnel owns its own consent.`);
  for (const m of html.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)) {
    if (!HEX_OK.has(m[1].toUpperCase())) die(`${path} uses the colour ${m[0]}, which is not one of the design tokens. This page has no green and no accent.`);
  }
  const other = /\b(hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i.exec(html.replace(/<script[\s\S]*?<\/script>/g, ''));
  if (other) die(`${path} uses a ${other[1]}() colour. Only the design tokens' hex and rgba values are allowed.`);
  for (const m of html.matchAll(/rgba?\([^)]*\)/g)) {
    const norm = m[0].replace(/\s+/g, '');
    if (!RGBA_OK.has(norm)) die(`${path} uses ${m[0]}, which is not one of the design tokens`);
  }
  const named = NAMED.exec(CSS);
  if (named) die(`style.css uses the named colour "${named[1]}": ${named[0].slice(0, 60)}`);
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    // an inlined script containing "</script" would end itself early; the regex above would not see it, so look for the opening tags instead
    if (/<\/script/i.test(m[1])) die(`${path} has a script that contains "</script"`);
  }
}

/* ------------------------------------------------------------------ shell */

const A = '/italy/assets';
const LOGO = (kind, cls) => `<picture>
      <source srcset="${A}/logo-${kind}.webp" type="image/webp">
      <img class="${cls}" src="${A}/logo-${kind}.png" width="418" height="168" alt="Elevate Marketing">
    </picture>`;

const font = (f) => `<link rel="preload" href="${A}/fonts/${f}" as="font" type="font/woff2" crossorigin>`;

function head({ title, description, robots, canonical, scripts }) {
  return `<!DOCTYPE html>
<html lang="it" class="no-js">
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
</head>`;
}

const topbar = () => `<div class="topbar"><div class="wrap">${plain(copy.topbar)}</div></div>`;
const siteHeader = (tag = 'header') => `<${tag} class="site-header">
  <div class="wrap">
    ${LOGO('ink', 'logo')}
  </div>
</${tag}>`;
/* The top bar is page content and must sit inside a landmark, or a screen reader meets it before the page starts.
   One header holds it and the logo; the logo strip is then a div, so there is a single banner. */
const pageTop = () => `<header class="page-top">
${topbar()}
${siteHeader('div')}
</header>`;

function siteFooter() {
  const f = copy.footer;
  /* The terms link is omitted while there is no terms page (config.links.terms is null). The cookie notice is
     linked here as well as in the banner, so a visitor who dismissed the banner can still find it. */
  const items = [
    [cfg.links.privacy, f.privacy],
    [cfg.links.cookies, copy.consent.cookieLink],
    [cfg.links.terms, f.terms],
  ].filter(([href]) => href);
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      ${LOGO('white', 'logo-foot')}
      <p class="legal">${plain(f.legal)}</p>
    </div>
    <div class="footer-links">
${items.map(([href, label]) => `      <a href="${esc(href)}">${plain(label)}</a>`).join('\n')}
    </div>
  </div>
</footer>`;
}

const consentBar = () => `<div class="consent" id="consent" role="region" aria-label="Cookie" hidden>
  <p>${plain(copy.consent.body)} <a href="${esc(cfg.links.cookies)}">${plain(copy.consent.cookieLink)}</a></p>
  <div class="consent-btns">
    <button type="button" data-c="yes">${plain(copy.consent.accept)}</button>
    <button type="button" data-c="no">${plain(copy.consent.decline)}</button>
  </div>
</div>`;

/** window.EMIT, then the scripts in dependency order, then this page's own. */
function scriptBlock(extra, page) {
  const k = {
    slug: SLUG,
    page,
    applyPath: cfg.funnel.applyPath,
    hidden: cfg.hiddenFields,
    questions: copy.form.questions,
    messages: copy.form.errors,
    labels: copy.form.labels,
    icon: ALERT_ICON,
    calendlyUrl: cfg.funnel.calendlyUrl,
    takkPath: `${BASE}/takk/`,
    consentKey: cfg.consent.storageKey,
    pixelId: cfg.funnel.pixelId,
    ...extra,
  };
  const data = JSON.stringify(k).replace(/</g, '\\u003c');
  const file = page === 'landing' ? 'client.js' : 'outcome.js';
  return `<script>window.EMIT=${data};</script>
<script>${text('core.cjs')}</script>
<script>${text('common.js')}</script>
<script>${text(file)}</script>`;
}

/* ---------------------------------------------------------------- landing */

function renderLanding() {
  const h = copy.hero, fit = copy.fit, paid = copy.paid, keep = copy.keep, meet = copy.meeting, faq = copy.faq, fs = copy.formSection;

  const plus = '<svg class="em-plus" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10141C" stroke-width="1.5" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"></path></svg>';
  const minus = '<svg class="em-minus" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10141C" stroke-width="1.5" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="M5 12h14"></path></svg>';

  const indexable = cfg.live && cfg.indexable;

  return `${head({ title: sub(copy.meta.title), description: sub(copy.meta.description), robots: !indexable, canonical: `${cfg.origin}${BASE}/`, scripts: true })}
<body>
${pageTop()}
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
    <h2>${plain(fit.h2)}</h2>
    <div class="fit-grid">
      <div>
        <h3>${plain(fit.worksTitle)}</h3>
        <ul class="fit-list">
${fit.works.map((t) => `          <li>${plain(t)}</li>`).join('\n')}
        </ul>
      </div>
      <div>
        <h3>${plain(fit.notTitle)}</h3>
        <ul class="fit-list">
${fit.not.map((t) => `          <li>${plain(t)}</li>`).join('\n')}
        </ul>
      </div>
    </div>
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
    </div>
    <ol class="steps">
${meet.steps.map((s, i) => `      <li><div class="step-n">${i + 1}</div><div class="step-body"><h3>${plain(s.title)}</h3><p>${plain(s.text)}</p></div></li>`).join('\n')}
    </ol>
    <div class="notice"><p>${plain(meet.notice)}</p></div>
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
    </div>
    <div class="form-main">
${renderForm({ copy: resolved(), config: cfg })}
    </div>
  </div>
</section>
</main>
${siteFooter()}
${consentBar()}
<div class="sticky" id="sticky" hidden><a class="cta" href="#form">${plain(copy.sticky)}</a></div>
${scriptBlock({}, 'landing')}
</body>
</html>
`;
}

/** copy.json with {THRESHOLD} and {OFFER} resolved in every string, for the form and the function, which do not know about variables. */
function resolved() {
  const walk = (n) => (typeof n === 'string' ? sub(n) : Array.isArray(n) ? n.map(walk) : n && typeof n === 'object' ? Object.fromEntries(Object.entries(n).map(([k, v]) => [k, walk(v)])) : n);
  return walk(copy);
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

  return `${head({ title: `${sub(o.h1)} | Elevate Marketing`, robots: true, scripts: true })}
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
${scriptBlock({}, page)}
</body>
</html>
`;
}

/* --------------------------------------- shell for the no-script re-render */

/** The page a visitor without JavaScript gets back after a failed submission: the form section on its own, no script, no pixel. */
function noScriptShell() {
  const fs = copy.formSection;
  return {
    before: `${head({ title: sub(copy.meta.title), robots: true, scripts: false })}
<body>
${pageTop()}
<main>
<section class="sec form-sec" id="form" data-section="form">
  <div class="wrap">
    <div class="form-intro">
      <h1 class="h2">${plain(fs.h2)}</h1>
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
  ...OUTCOMES.map((p) => [join(p, 'index.html'), renderOutcome(p)]),
];
const shell = noScriptShell();
for (const [rel, html] of pages) checkOutput(`${SLUG}/${rel}`, html);
checkOutput(`${SLUG}/(no-script shell)`, shell.before + shell.after);

/* Only what this generator makes. public/italy/privacy and public/italy/cookie are the legal
   notices and are never touched; public/g/_assets is only read. */
const dir = join(PUBLIC, ...BASE.split('/').filter(Boolean));
mkdirSync(dir, { recursive: true });
rmSync(join(dir, 'index.html'), { force: true });
rmSync(join(dir, 'assets'), { recursive: true, force: true });
for (const p of OUTCOMES) rmSync(join(dir, p), { recursive: true, force: true });
for (const p of OUTCOMES) mkdirSync(join(dir, p), { recursive: true });
for (const [rel, html] of pages) writeFileSync(join(dir, rel), html);

mkdirSync(join(dir, 'assets', 'fonts'), { recursive: true });
for (const f of ['geist-v1.woff2', 'fraunces-v1.woff2']) {
  if (!existsSync(join(SHARED_ASSETS, 'fonts', f))) die(`public/g/_assets/fonts/${f} is missing`);
  copyFileSync(join(SHARED_ASSETS, 'fonts', f), join(dir, 'assets', 'fonts', f));
}
for (const f of ['logo-ink.png', 'logo-ink.webp', 'logo-white.png', 'logo-white.webp']) {
  if (!existsSync(join(SHARED_ASSETS, f))) die(`public/g/_assets/${f} is missing`);
  copyFileSync(join(SHARED_ASSETS, f), join(dir, 'assets', f));
}

mkdirSync(FN, { recursive: true });
/* The function imports this one module rather than the JSON files. A JSON import
   needs an import attribute in Node and is treated differently by Netlify's
   bundler; a plain ES module is the same everywhere, tests included. The copy is
   written with its variables resolved, so the re-rendered form says what the page says. */
writeFileSync(join(FN, 'data.generated.mjs'),
  '// Generated by scripts/build-italy.mjs from g/italy/. Do not edit.\n' +
  `export const cfg = ${JSON.stringify(cfg)};\n` +
  `export const copy = ${JSON.stringify(resolved())};\n` +
  `export const routing = ${JSON.stringify(routing)};\n` +
  `export const shell = ${JSON.stringify(shell)};\n`);

console.log(`  italy: ${BASE} + ${OUTCOMES.map((p) => '/' + p).join(' ')}  (+ lead function data)`);
if (!cfg.live) {
  console.log(`    ⚠ "live" is false in g/${SLUG}/config.json: every page carries noindex and the lead endpoint refuses submissions`);
  if (outstanding.length) {
    console.log('      Outstanding before it can go live:');
    outstanding.forEach((o) => console.log('        - ' + o));
  }
}
