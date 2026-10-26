#!/usr/bin/env node
/**
 * Growth funnel generator (/g/<slug>, the funnels with their own lead endpoint).
 *
 * For each funnel named in FUNNELS it reads g/<slug>/{config.json, copy.json, core.mjs,
 * render-form.mjs} and the shared sources in g/_growth/{style.css, js/*.js}, and writes:
 *
 *   public/g/<slug>/index.html            landing page, with the application form in it
 *   public/g/<slug>/book/index.html       fit: choose a time (Calendly)
 *   public/g/<slug>/takk/index.html       booked
 *   public/g/<slug>/review/index.html     we check a few details first
 *   public/g/<slug>/not-now/index.html    at capacity
 *   public/g/<slug>/not-a-fit/index.html  not the right fit
 *   public/g/<slug>/privacy/index.html    privacy notice   (text in g/<slug>/legal.json)
 *   public/g/<slug>/terms/index.html      website terms    (text in g/<slug>/legal.json)
 *   netlify/functions/lead/data.generated.mjs
 *       the config, the form copy and the page shell the lead function needs to answer a
 *       post that has no JavaScript behind it
 *
 * Static on purpose, like the other funnels in this repo: the pages carry their whole
 * content in the first response, the form works with no script, and a script only improves
 * it. Generated output is committed; edit the sources, not the output.
 *
 * What the build refuses (see check* below): a dash, an exclamation mark, an American spelling,
 * a telephone number, a commission rate or amount near the word commission, a font from
 * Google, a token that was not filled in, and, once "live" is true, an empty calendar address.
 *
 * Only public/g/<slug> is removed and rewritten. public/g/_assets (fonts, logos) is shared and
 * is never touched.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderLegalBlocks } from '../g/_growth/legal.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const G = join(root, 'g');
const SHARED = join(G, '_growth');
/* The two paths can be redirected so that a test can build into a scratch folder and compare the
   result with the committed files, without touching them. Normal builds never set these. */
const OUT = process.env.G_GROWTH_OUT || join(root, 'public', 'g');
const FUNCTION_DATA = process.env.G_GROWTH_FUNCTION_DATA || join(root, 'netlify', 'functions', 'lead', 'data.generated.mjs');

const FUNNELS = ['uk-it-growth', 'uk-private-hospitals', 'uk-law-firms', 'it-ict-growth'];

/* What a funnel says about its own language. The UK funnels have no "locale" in config.json and get this, so their
   output is exactly what it was before Italy: lang en-GB, UK number format, the English rule set. A funnel may
   override any of it (g/it-ict-growth/config.json does). "rules" picks the build's own checks below: the UK set
   refuses American spellings, which in Italian would catch "organizzazione" and "specializzato". */
const DEFAULT_LOCALE = {
  lang: 'en-GB',
  numbers: 'en-GB',
  rules: 'en',
  ui: {
    legalNav: 'Legal',
    calendarMissing: null, // built from the slug when null
    calendarOwnPage: 'Open the calendar in its own page',
    other: 'Other',
  },
};
/* The UK pixel. A funnel for another country must not go live on it by mistake (see the checks in build()). */
const UK_PIXEL_ID = '1466790598245604';
let LOCALE = DEFAULT_LOCALE;

/* The order of the sections on a landing page. copy.json may carry its own "layout"; without one the
   page is the IT board's. Every name here is a renderer in SECTIONS below. */
const DEFAULT_LAYOUT = ['hero', 'cases', 'fit', 'pay', 'keep', 'measure', 'meeting', 'faq', 'form'];
/* The sections of the IT board live in the "page" and "cards" css; the ones added for the health
   and law boards live in "extra", included only on a page that uses one of them. */
const EXTRA_SECTIONS = new Set(['strip', 'floors', 'pulse', 'beyond', 'search', 'records', 'how']);

/* ------------------------------------------------------------------ helpers */

/** The words of the form that a visitor reads (not field names, input types or autocomplete tokens). */
function questionText(core) {
  const words = { options: core.OPTIONS, messages: core.MSG, questions: [] };
  for (const s of core.STEPS) {
    words.questions.push({ q: s.q, help: s.help, when: s.whenNote, other: s.other ? s.other.placeholder : undefined });
    for (const f of s.fields || []) words.questions.push({ label: f.label, help: f.help });
  }
  return words;
}

let CURRENT = '';
const die = (msg) => {
  console.error(`\n  ✗ ${CURRENT}: ${msg}\n`);
  process.exit(1);
};

const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const readJson = (p) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { die(`${p}: ${e.message}`); }
};

/** Every string with its path. Keys that start with _ are notes to a person and are never rendered. */
function walkStrings(node, path, out) {
  if (typeof node === 'string') { out.push([path, node]); return out; }
  if (Array.isArray(node)) { node.forEach((v, i) => walkStrings(v, `${path}[${i}]`, out)); return out; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('_')) continue;
      walkStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

function mapStrings(node, fn) {
  if (typeof node === 'string') return fn(node);
  if (Array.isArray(node)) return node.map((v) => mapStrings(v, fn));
  if (node && typeof node === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(node)) o[k] = k.startsWith('_') ? v : mapStrings(v, fn);
    return o;
  }
  return node;
}

/** {THRESHOLD}, {OFFER}, {WORTH}, {EMAIL}: filled from config.json. An unknown token stops the build. */
function fill(copy, vars) {
  return mapStrings(copy, (s) => s.replace(/\{([A-Z_]+)\}/g, (m, name) => {
    if (!(name in vars)) die(`copy uses ${m}, which config.json does not define (it defines ${Object.keys(vars).map((k) => '{' + k + '}').join(', ')})`);
    return vars[name];
  }));
}

/* --------------------------------------------------------------- the rules */

/* What no funnel may say, in any language. */
const BANNED_ALL = [
  [/!/, 'an exclamation mark'],
  [/—|–/, 'an em-dash or en-dash'],
  [/tel:|\+39|\+44|\+47/, 'a telephone number (this brand publishes none)'],
  [/\{[A-Z_]{3,}\}/, 'a {TOKEN} that was not filled in'],
  [/\bundefined\b|\[object /, 'a value that was never set'],
];
/* The UK rules: hype words, and American spellings (the pages are en-GB). */
const BANNED_EN = [
  [/skyrocket/i, 'the word "skyrocket"'],
  [/game.changer/i, 'the phrase "game-changer"'],
  [/supercharge/i, 'the word "supercharge"'],
  [/\bunlock\w*/i, 'the word "unlock"'],
  [/\b(optimiz|analyz|organiz|specializ|recogniz)\w*/i, 'an American -ize spelling'],
  [/\bcolor\b|\bcenter\b|\bfavorite\b/i, 'an American spelling'],
];
/* The Italian rules: hype and promises the brand does not make. No spelling rule: the English ones would
   fire on ordinary Italian ("organizzazione"). */
const BANNED_IT = [
  [/skyrocket|game.changer|supercharge/i, 'an English hype word'],
  [/alle stelle|rivoluzionar\w*|esplosiv\w*|imperdibil\w*|straordinari\w* risultati/i, 'a hype word'],
  [/risultati garantiti|garantiamo (i |dei |il |un )?(risultat|ritorn|vendit|contratt)/i, 'a promise of results'],
];
const BANNED_BY_RULES = { en: BANNED_ALL.concat(BANNED_EN), it: BANNED_ALL.concat(BANNED_IT) };
/** A commission is never printed with a rate or an amount on a page anyone can forward. */
function checkTerms(path, text) {
  const m = /(commission|commissione|commissioni|provvigion\w*|kommisjon|\bfees?\b)/i.exec(text);
  if (!m) return;
  const around = text.slice(Math.max(0, m.index - 100), m.index + 100);
  if (/%|[£€]\s?\d|\d\s?[£€]|\bkr\s?\d|\d\s?(percent|per cent|per cento|euro)\b/i.test(around)) {
    die(`${path} puts a rate or an amount within 100 characters of "${m[0]}":\n    ...${around.trim()}...`);
  }
}

function checkStrings(strings, { terms = true } = {}) {
  const banned = BANNED_BY_RULES[LOCALE.rules];
  for (const [path, text] of strings) {
    for (const [re, what] of banned) {
      if (re.test(text)) die(`${path} contains ${what}:\n    ...${text.slice(0, 140)}...`);
    }
    if (terms) checkTerms(path, text);
  }
}

const visibleText = (html) => html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ');

function checkOutput(path, html) {
  const where = `${CURRENT}/${path}`;
  if (html.includes('{{')) die(`${where} still contains template syntax "{{"`);
  // The form's own words are checked one string at a time (questionText); next to each other
  // they read as "recurring fees ... Under £10k", which is a question and its answers, not a rate.
  checkStrings([[where + ' (visible text)', visibleText(html)]], { terms: false });
  checkStrings([[where + ' (visible text outside the form)', visibleText(html.replace(/<form[\s\S]*?<\/form>/g, ' '))]]);
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) die(`${where} requests a font from Google. The two families are self-hosted under /g/_assets/fonts/.`);
  if (!/<meta name="robots" content="noindex,nofollow">/.test(html)) die(`${where} is missing its noindex`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) die(`${where} must have exactly one h1`);
  if (!/<main[\s>]/.test(html)) die(`${where} has no <main>`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) die(`${where} uses the id "${dup}" twice`);
  const idset = new Set(ids);
  for (const m of html.matchAll(/\s(?:for|aria-labelledby)="([^"]+)"/g)) {
    for (const ref of m[1].split(/\s+/)) if (!idset.has(ref)) die(`${where} refers to the id "${ref}", which is not on the page`);
  }
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!idset.has(m[1])) die(`${where} links to #${m[1]}, which is not on the page`);
  }
}

/* --------------------------------------------------------------------- css */

/** g/_growth/style.css is cut at its @section markers; a page gets the sections it uses. */
function loadCss() {
  const src = readFileSync(join(SHARED, 'style.css'), 'utf8');
  const parts = src.split(/\/\*@section ([a-z]+)\*\//);
  const sections = {};
  for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parts[i + 1];
  return sections;
}

const tidyCss = (css) => css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => l.trim()).filter(Boolean).join('\n');

/* ----------------------------------------------------------------- the html */

const picture = (tone, { lazy } = {}) =>
  `<picture><source srcset="/g/_assets/logo-${tone}.webp" type="image/webp">` +
  `<img class="lg" src="/g/_assets/logo-${tone}.png" width="418" height="168" alt="Elevate Marketing"${lazy ? ' loading="lazy"' : ''}></picture>`;

const fmtNumber = (n, dec) => n.toLocaleString(LOCALE.numbers, { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** "97", "40%", "£2m", "1,250" count up; anything else is plain text. */
function parseFigure(v) {
  const m = typeof v === 'string' ? v.trim().match(/^([£$€]?)([0-9][0-9,]*(?:\.[0-9]+)?)([%a-zA-Z]{0,3})$/) : null;
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return { pre: m[1], n, dec: (m[2].split('.')[1] || '').length, suf: m[3] };
}

function counter(fig, { dur, delay, play }) {
  const final = fig.pre + fmtNumber(fig.n, fig.dec) + fig.suf;
  return `<span class="cn" data-to="${fig.n}" data-dec="${fig.dec}" data-pre="${esc(fig.pre)}" data-suf="${esc(fig.suf)}" ` +
    `data-dur="${dur}" data-delay="${delay}" data-play="${play}"><span class="cn-sr">${esc(final)}</span><span aria-hidden="true">${esc(final)}</span></span>`;
}

function heroLead(segments) {
  return segments.map((s) => {
    const m = s.cls === 'em' ? String(s.t).match(/^(\d[\d,]*)(.*)$/) : null;
    if (m) {
      const fig = { pre: '', n: Number(m[1].replace(/,/g, '')), dec: 0, suf: '' };
      return `<span class="em">${counter(fig, { dur: 1400, delay: 400, play: 'load' })}${esc(m[2])}</span>`;
    }
    return s.cls ? `<span class="${esc(s.cls)}">${esc(s.t)}</span>` : esc(s.t);
  }).join('');
}

function caseCard(item) {
  const figs = (item.figs || []).map((f, i) => {
    const fig = parseFigure(f.value);
    const val = fig
      ? counter(fig, { dur: 1100 + i * 150, delay: 150 + i * 120, play: 'cases' })
      : esc(f.value);
    return `<div class="cc-fig${f.emph ? ' is-emph' : ''}"><dt>${esc(f.label)}</dt><dd><span class="cc-val">${val}</span></dd></div>`;
  }).join('');
  const quote = item.quote
    ? `<figure class="cc-quote"><blockquote><p>${esc(item.quote)}</p></blockquote>` +
      (item.person ? `<figcaption class="cc-by"><b>${esc(item.person)},</b> ${esc(item.role)}</figcaption>` : '') + '</figure>'
    : '';
  const link = item.href ? `<a class="cc-link" href="${esc(item.href)}"><span>${esc(item.linkText)}</span></a>` : '';
  const side = quote || link ? `<div class="cc-side">${quote}${link}</div>` : '';
  return `<article class="cc${side ? '' : ' no-side'}"><div class="cc-in">` +
    `<header class="cc-head"><h3 class="cc-name">${esc(item.name)}</h3>` +
    (item.sub ? `<p class="cc-sub">${esc(item.sub)}</p>` : '') +
    (item.country ? `<span class="cc-country">${esc(item.country)}</span>` : '') +
    `</header><dl class="cc-figs">${figs}</dl>${side}</div></article>`;
}

const li = (items) => items.map((x) => `<li>${esc(x)}</li>`).join('');

/* The line above the logo and the logo are one page header (one banner landmark). The line used to
   sit outside any landmark, which a screen reader user can not jump past or to. Looks the same. */
function topbar(copy) {
  return `<header class="pg-hd"><div class="topbar"><div class="wrap"><p class="tb-line">${esc(copy.topline)}</p></div></div>
  <div class="hd"><div class="wrap">${picture('ink')}</div></div></header>`;
}

function footer(cfg, copy) {
  const F = copy.footer;
  return `<footer class="ft" data-theme="marine">
    <div class="wrap">
      <div class="ft-top">
        ${picture('white', { lazy: true })}
        <p class="ft-text">${esc(F.text)} <a href="mailto:${esc(cfg.contact.email)}">${esc(cfg.contact.email)}</a></p>
      </div>
      <nav class="ft-links" aria-label="${esc(LOCALE.ui.legalNav)}"><a href="${esc(cfg.links.privacy)}">${esc(F.privacy)}</a><a href="${esc(cfg.links.terms)}">${esc(F.terms)}</a></nav>
    </div>
  </footer>`;
}

function banner(cfg, copy) {
  const c = copy.consent;
  return `<div class="cb" id="g-consent" role="region" aria-label="${esc(c.label)}" hidden>
  <div class="cb-in">
    <p class="cb-t">${esc(c.text)} <a href="${esc(cfg.links.privacy)}">${esc(c.privacy)}</a></p>
    <div class="cb-btns"><button class="cb-btn" type="button" data-c="yes">${esc(c.accept)}</button><button class="cb-btn" type="button" data-c="no">${esc(c.decline)}</button></div>
  </div>
</div>`;
}

function heroPanel(p) {
  if (!p) return '';
  const rows = p.rows.map((r) =>
    `<li class="dp-row"><span class="dp-n">${esc(r.n)}</span><span class="dp-name">${esc(r.name)}</span>` +
    `<span class="dp-val">${esc(r.value)}${r.sr ? `<span class="cn-sr"> ${esc(r.sr)}</span>` : ''}</span></li>`).join('');
  const total = parseFigure(p.total.value);
  const tv = total ? counter(total, { dur: 1400, delay: 400, play: 'load' }) : esc(p.total.value);
  return `<div class="dp" data-theme="marine" role="group" aria-label="${esc(p.title)}">
            <p class="dp-title">${esc(p.title)}</p>
            <p class="dp-total"><span class="dp-big">${tv}</span><span class="dp-total-l">${esc(p.total.label)}</span></p>
            <ol class="dp-rows">${rows}</ol>
            <p class="dp-foot">${esc(p.foot)}</p>
          </div>`;
}

/** A figure that counts when its own section reaches the screen. */
function figure(value, i, play) {
  const fig = parseFigure(value);
  return fig ? counter(fig, { dur: 1100 + i * 150, delay: 150 + i * 120, play: play || 'sec' }) : esc(value);
}

const tiles = (items, cls) => `<ul class="${cls || 'tiles'}">${items.map((t, i) =>
  `<li class="tile"><span class="tile-v">${figure(t.value, i)}</span><span class="tile-l">${esc(t.label)}</span></li>`).join('')}</ul>`;

function floorBoard(b) {
  const max = Math.max.apply(null, (b.bars || []).map((x) => x.n)) || 1;
  const bars = (b.bars || []).map((x) =>
    `<li class="fb-bar"><span class="fb-bar-l">${esc(x.label)}</span><span class="fb-bar-t" aria-hidden="true"><span class="fb-bar-f" style="width:${Math.round((x.n / max) * 100)}%"></span></span><span class="fb-bar-n">${esc(fmtNumber(x.n, 0))}</span></li>`).join('');
  return `<div class="fb" data-theme="marine">
              <p class="fb-title">${esc(b.title)}</p>
              <p class="fb-big"><span class="fb-n">${figure(b.value, 0)}</span><span class="fb-l">${esc(b.label)}</span>${b.against ? `<span class="fb-a">${esc(b.against)}</span>` : ''}</p>
              <dl class="fb-rows">${b.rows.map((r, i) => `<div class="fb-row"><dd>${figure(r.value, i + 1)}</dd><dt>${esc(r.label)}</dt></div>`).join('')}</dl>
              ${bars ? `<ul class="fb-bars">${bars}</ul>` : ''}
            </div>`;
}

/** The weekly line: 2026 against the same week of 2025, the uncounted weeks hatched. Inline SVG, no script. */
function pulseChart(p) {
  const W = 760, H = 300, L = 44, R = 16, T = 18, B = 44;
  const weeks = p.weeks;
  const n = weeks.length;
  const vals = weeks.filter((w) => !w.gap).flatMap((w) => [w.a, w.b]);
  const max = Math.ceil(Math.max.apply(null, vals) / 10) * 10;
  const x = (i) => L + (i * (W - L - R)) / (n - 1);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const path = (key) => {
    let d = '';
    let pen = false;
    weeks.forEach((w, i) => {
      if (w.gap) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(w[key]).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };
  const gapIdx = weeks.map((w, i) => (w.gap ? i : -1)).filter((i) => i >= 0);
  const gap = gapIdx.length
    ? `<rect class="pc-gap" x="${(x(gapIdx[0]) - (x(1) - x(0)) / 2).toFixed(1)}" y="${T}" width="${((x(gapIdx[gapIdx.length - 1]) - x(gapIdx[0])) + (x(1) - x(0))).toFixed(1)}" height="${H - T - B}" fill="url(#pc-hatch)"></rect>`
    : '';
  const ticks = [];
  for (let v = 0; v <= max; v += 20) ticks.push(`<g class="pc-tick"><line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"></line><text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text></g>`);
  const labels = weeks.map((w, i) => (i % 4 === 0 || i === n - 1) ? `<text class="pc-x" x="${x(i).toFixed(1)}" y="${H - B + 20}" text-anchor="middle">${esc(w.w)}</text>` : '').join('');
  const dots = weeks.map((w, i) => (w.gap ? '' : `<circle class="pc-dot-a" cx="${x(i).toFixed(1)}" cy="${y(w.a).toFixed(1)}" r="2.5"></circle>`)).join('');
  const rows = weeks.map((w) => w.gap
    ? `<tr class="is-gap"><th scope="row">${esc(w.w)}</th><td>n/a</td><td>n/a</td><td class="pc-note">${esc(p.gapNote)}</td></tr>`
    : `<tr><th scope="row">${esc(w.w)}</th><td>${w.a}</td><td>${w.b}</td><td class="pc-note">${esc(w.note || '')}</td></tr>`).join('');
  return `<figure class="pc">
            <figcaption class="pc-cap">${esc(p.chartTitle)}</figcaption>
            <svg class="pc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.chartTitle)}. The weekly numbers are in the table below.">
              <defs><pattern id="pc-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="pc-hatch"></line></pattern></defs>
              ${gap}
              ${ticks.join('')}
              <path class="pc-line-b" d="${path('b')}"></path>
              <path class="pc-line-a" d="${path('a')}"></path>
              ${dots}
              ${labels}
            </svg>
            <ul class="pc-legend" aria-hidden="true"><li class="pc-k-a">${esc(p.legend.a)}</li><li class="pc-k-b">${esc(p.legend.b)}</li><li class="pc-k-gap">${esc(p.legend.gap)}</li><li class="pc-k-last">${esc(p.legend.last)}</li></ul>
            <p class="note">${esc(p.readnote)}</p>
            <details class="dd"><summary class="dd-s">${esc(p.tableButton)}</summary>
              <div class="mt mt--data"><table><caption class="vh">${esc(p.chartTitle)}</caption><thead><tr>${p.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}<th scope="col"><span class="vh">Note</span></th></tr></thead><tbody>${rows}</tbody></table></div>
            </details>
          </figure>`;
}

function recordsTable(r) {
  const groups = r.groups.map((g) =>
    `<tr class="tg"><th scope="colgroup" colspan="${r.columns.length}">${esc(g.title)}${g.sub ? ` <span class="tg-sub">${esc(g.sub)}</span>` : ''}</th></tr>` +
    g.rows.map((row) => `<tr${row.key ? ' class="is-key"' : ''}>${row.c.map((c, i) => i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')).join('');
  return `<details class="dd"><summary class="dd-s">${esc(r.button)}</summary>
            <div class="mt mt--data mt--records"><table><caption class="mt-cap">${esc(r.tableTitle)}</caption><thead><tr>${r.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${groups}</tbody></table></div>
            <ul class="notes">${r.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </details>`;
}

/* One renderer per section name. Each returns a <section>. "ctx" carries the pieces a section may need. */
const SECTIONS = {
  hero(c, ctx) {
    const h = c.hero;
    const cta2 = h.cta2 ? `<a class="btn btn--ghost" href="${esc(h.cta2.href)}">${esc(h.cta2.t)}</a>` : '';
    return `<section class="hero" aria-labelledby="h-hero">
      <div class="wrap">
        <div class="hero-row">
          <h1 class="h1" id="h-hero"><span>${esc(h.h1a)}</span> <span>${esc(h.h1b)}</span></h1>
          <div class="hero-side">
            <p class="lead">${heroLead(h.ingress)}</p>
            <div class="cta">
              <div class="cta-btns">${ctx.cta()}${cta2}</div>
              <p class="micro">${esc(h.micro)}</p>
            </div>
          </div>
        </div>
        ${heroPanel(h.panel)}
      </div>
    </section>`;
  },
  cases(c, ctx) {
    return `<section class="sec" id="cases" aria-labelledby="h-cases">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2" id="h-cases">${esc(c.cases.h2)}</h2>
        <div class="cases">
          ${c.cases.items.map(caseCard).join('\n          ')}
        </div>
        <p class="note">${esc(c.cases.note)}</p>
        <div class="cta-row">${ctx.cta()}</div>
      </div></div>
    </section>`;
  },
  strip(c) {
    const s = c.strip;
    return `<section class="sec" id="strip" aria-labelledby="h-strip">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2 h2--small" id="h-strip">${esc(s.h2)}</h2>
        ${tiles(s.items, 'tiles tiles--strip')}
        <p class="note">${esc(s.tail)}</p>
      </div></div>
    </section>`;
  },
  floors(c) {
    const f = c.floors;
    const rooms = f.rooms.map((r, i) => `<article class="room" id="room-${i + 1}" aria-labelledby="h-room-${i + 1}">
          <p class="plate">${esc(r.plate)}</p>
          <div class="room-in">
            <div class="room-text">
              <h3 class="h3 h3--room" id="h-room-${i + 1}">${esc(r.h3)}</h3>
              ${r.paras.map((x) => `<p class="room-p">${esc(x)}</p>`).join('')}
            </div>
            ${floorBoard(r.board)}
          </div>
        </article>`).join('');
    return `<section class="sec" id="${esc(f.id || 'walk')}" aria-labelledby="h-floors">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2" id="h-floors">${esc(f.h2)}</h2>
        <div class="rooms">${rooms}</div>
      </div></div>
    </section>`;
  },
  pulse(c) {
    const p = c.pulse;
    return `<section class="sec" id="pulse" aria-labelledby="h-pulse">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2" id="h-pulse">${esc(p.h2)}</h2>
        ${p.paras.map((x) => `<p class="intro">${esc(x)}</p>`).join('')}
        ${tiles(p.stats, 'tiles tiles--three')}
        ${pulseChart(p)}
      </div></div>
    </section>`;
  },
  beyond(c) { return SECTIONS._tiles(c.beyond, 'beyond'); },
  search(c) { return SECTIONS._tiles(c.search, 'search'); },
  _tiles(t, id) {
    const dark = t.theme === 'dark';
    const inner = `<h2 class="h2" id="h-${id}">${esc(t.h2)}</h2>
        <p class="intro">${esc(t.intro)}</p>
        ${tiles(t.items)}
        <p class="note">${esc(t.note)}</p>`;
    return dark
      ? `<section class="band band--tiles" data-theme="marine" id="${id}" aria-labelledby="h-${id}"><div class="wrap"><div class="band-in">${inner}</div></div></section>`
      : `<section class="sec" id="${id}" aria-labelledby="h-${id}"><div class="wrap"><div class="sec-in">${inner}</div></div></section>`;
  },
  records(c, ctx) {
    const r = c.records;
    return `<section class="sec" id="records" aria-labelledby="h-records">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2" id="h-records">${esc(r.h2)}</h2>
        <ul class="trio trio--method">${r.method.map((m) => `<li><h3 class="h3">${esc(m.t)}</h3><p>${esc(m.p)}</p></li>`).join('')}</ul>
        ${recordsTable(r)}
        <div class="cta-row">${ctx.cta()}</div>
      </div></div>
    </section>`;
  },
  how(c, ctx) {
    const h = c.how;
    return `<section class="sec" id="how" aria-labelledby="h-how">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2" id="h-how">${esc(h.h2)}</h2>
        <p class="intro">${esc(h.intro)}</p>
        <ul class="trio">${h.items.map((k) => `<li><h3 class="h3">${esc(k.t)}</h3><p>${esc(k.p)}</p></li>`).join('')}</ul>
        <div class="cta-row">${ctx.cta()}</div>
      </div></div>
    </section>`;
  },
  fit(c) {
    return `<section class="sec" aria-labelledby="h-fit">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2" id="h-fit">${esc(c.fit.h2)}</h2>
        <p class="intro">${esc(c.fit.body)}</p>
        <div class="cols">
          <div class="col"><h3 class="col-h">${esc(c.fit.yesTitle)}</h3><ul class="lines">${li(c.fit.yes)}</ul></div>
          <div class="col col--no"><h3 class="col-h">${esc(c.fit.noTitle)}</h3><ul class="lines">${li(c.fit.no)}</ul></div>
        </div>
        <p class="note">${esc(c.fit.note)}</p>
      </div></div>
    </section>`;
  },
  pay(c) {
    return `<section class="band" data-theme="marine" aria-labelledby="h-pay">
      <div class="wrap">
        <div class="rail">
          <h2 class="h2" id="h-pay">${esc(c.pay.h2)}</h2>
          <div class="rail-b">
            <p class="intro">${esc(c.pay.body)}</p>
            <ul class="lines lines--open">${li(c.pay.open)}</ul>
          </div>
        </div>
      </div>
    </section>`;
  },
  keep(c) {
    return `<section class="sec" aria-labelledby="h-keep">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2" id="h-keep">${esc(c.keep.h2)}</h2>
        <ul class="trio">${c.keep.items.map((k) => `<li><h3 class="h3">${esc(k.t)}</h3><p>${esc(k.p)}</p></li>`).join('')}</ul>
      </div></div>
    </section>`;
  },
  measure(c) {
    return `<section class="sec" aria-labelledby="h-measure">
      <div class="wrap"><div class="sec-in">
        <div class="rail">
          <h2 class="h2" id="h-measure">${esc(c.measure.h2)}</h2>
          <div class="rail-b"><div class="measure"><div class="mt"><table><tbody>${c.measure.rows.map((r) =>
            `<tr${r.key ? ' class="is-key"' : ''}><th scope="row">${esc(r.metric)}</th><td>${esc(r.status)}</td></tr>`).join('')}</tbody></table></div></div></div>
        </div>
      </div></div>
    </section>`;
  },
  meeting(c) {
    return `<section class="sec" aria-labelledby="h-meeting">
      <div class="wrap"><div class="sec-in">
        <h2 class="h2" id="h-meeting">${esc(c.meeting.h2)}</h2>
        <p class="intro">${esc(c.meeting.body)}</p>
        <ol class="steps">${c.meeting.steps.map((s) => `<li class="step"><h3 class="h3">${esc(s.t)}</h3><p>${esc(s.p)}</p></li>`).join('')}</ol>
        <p class="closing">${esc(c.meeting.closing)}</p>
      </div></div>
    </section>`;
  },
  faq(c, ctx) {
    return `<section class="sec" aria-labelledby="h-faq">
      <div class="wrap"><div class="sec-in">
        <div class="rail">
          <h2 class="h2" id="h-faq">${esc(c.faq.h2)}</h2>
          <div class="rail-b">
            <dl class="faq">${c.faq.items.map((f) => `<div class="qa"><dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd></div>`).join('')}</dl>
            <div class="cta-row">${ctx.cta()}</div>
          </div>
        </div>
      </div></div>
    </section>`;
  },
  form(c, ctx) {
    return `<section class="sec--form" id="form">
      <div class="wrap">${ctx.formHtml}</div>
    </section>`;
  },
};

function landingMain(cfg, copy, formHtml, layout) {
  const ctx = { formHtml, cta: () => `<a class="btn btn--primary" href="#form">${esc(copy.cta)}</a>` };
  const parts = layout.map((name) => {
    if (!SECTIONS[name] || name.startsWith('_')) die(`copy.json layout names "${name}", which is not a section the build knows`);
    if (!copy[name] && name !== 'form') die(`copy.json layout names "${name}" but has no "${name}" block`);
    return SECTIONS[name](copy, ctx);
  });
  return `<main id="main">\n    ${parts.join('\n\n    ')}\n  </main>`;
}

/* The head. The first script adds the classes the stylesheet keys on: js always, anim only when
   motion is allowed, so that a counter is hidden before its script runs only for a visitor who
   will see it count. */
const HEAD_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{if(window.IntersectionObserver&&!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('anim')}catch(e){}})();`;

function head(cfg, { title, description, css, og, scripts, preconnect }) {
  const font = (f) => `<link rel="preload" href="/g/_assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`;
  const consent = scripts
    ? `<script src="/js/consent.js?v=4" data-pixel="${esc(cfg.funnel.pixelId)}" data-banner="off"${scripts.track ? ` data-track="${esc(scripts.track)}"` : ''}></script>`
    : '';
  return `<!DOCTYPE html>
<html lang="${esc(LOCALE.lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">\n` : ''}<meta name="robots" content="noindex,nofollow">
${og ? `<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
` : ''}<meta name="theme-color" content="#F7F5F0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${(preconnect || []).map((u) => `<link rel="preconnect" href="${u}" crossorigin>`).join('\n')}${preconnect && preconnect.length ? '\n' : ''}${font('geist-v1.woff2')}
${font('fraunces-v1.woff2')}
<style>
${css}
</style>
<script>${HEAD_SCRIPT}</script>
${consent}
</head>`;
}

/* ------------------------------------------------------------------ scripts */

const JS = {};
function loadJs() {
  for (const f of ['base', 'form', 'motion', 'book', 'notafit']) JS[f] = readFileSync(join(SHARED, 'js', `${f}.js`), 'utf8');
}

/** core.mjs has no imports, so removing the word "export" is all it takes to run it in a page. */
function coreForBrowser(src) {
  const body = src.replace(/^export /gm, '');
  if (/^\s*import\s/m.test(body)) die('core.mjs must not import anything: it is inlined into the page');
  return `var CORE = (function(){\n${body}\nreturn { STEPS: STEPS, OPTIONS: OPTIONS, stepErrors: stepErrors, validate: validate, tidy: tidy };\n})();`;
}

/** JSON that is safe inside a script element. */
const jsonForScript = (o) => JSON.stringify(o)
  .replace(/</g, '\\u003c')
  .split(String.fromCharCode(0x2028)).join('\\u2028')
  .split(String.fromCharCode(0x2029)).join('\\u2029');

function pageScript(cfgClient, kind, coreSrc) {
  const parts = [`var CFG = ${jsonForScript(cfgClient)};`, JS.base];
  if (kind === 'landing') {
    parts.push(coreForBrowser(coreSrc), JS.form, JS.motion, 'initForm();\ninitMotion();\ninitBanner();');
  } else if (kind === 'book') {
    parts.push(JS.book, 'initBook();');
  } else if (kind === 'review') {
    parts.push(`var q = readQuery();
var known = !!(q.lead_id && ID_RE.test(q.lead_id));
function fire() { if (known) fireQualified('review', q.lead_id); }
initBanner(fire);
fire();`);
  } else if (kind === 'notafit') {
    parts.push(JS.notafit, 'initAsk();\ninitBanner();');
  } else if (kind === 'privacy') {
    // The notice says the cookie choice can be changed with a button. The choice is kept by
    // /js/consent.js under this key; removing it and reloading makes the page ask again.
    parts.push(`initBanner();
var resetBtn = document.getElementById('cookie-reset');
if (resetBtn) {
  resetBtn.hidden = false;
  resetBtn.addEventListener('click', function () {
    try { localStorage.removeItem('elevate-cookie-consent'); } catch (e) { /* private mode */ }
    window.location.reload();
  });
}`);
  } else {
    parts.push('initBanner();');
  }
  return `(function(){\n'use strict';\n${parts.join('\n')}\n})();`;
}

/* ------------------------------------------------------------------- build */

async function build(slug) {
  CURRENT = slug;
  const dir = join(G, slug);
  if (!existsSync(join(dir, 'config.json'))) die(`g/${slug}/config.json is missing`);
  const cfg = readJson(join(dir, 'config.json'));
  const rawCopy = readJson(join(dir, 'copy.json'));
  const coreSrc = readFileSync(join(dir, 'core.mjs'), 'utf8');
  const core = await import(pathToFileURL(join(dir, 'core.mjs')).href);
  const { renderForm } = await import(pathToFileURL(join(dir, 'render-form.mjs')).href);

  LOCALE = {
    lang: (cfg.locale && cfg.locale.lang) || DEFAULT_LOCALE.lang,
    numbers: (cfg.locale && cfg.locale.numbers) || DEFAULT_LOCALE.numbers,
    rules: (cfg.locale && cfg.locale.rules) || DEFAULT_LOCALE.rules,
    ui: Object.assign({}, DEFAULT_LOCALE.ui, (cfg.locale && cfg.locale.ui) || {}),
  };
  if (!BANNED_BY_RULES[LOCALE.rules]) die(`config.json locale.rules "${LOCALE.rules}" must be one of ${Object.keys(BANNED_BY_RULES).join(', ')}`);

  if (cfg.slug !== slug || cfg.campaign !== slug) die(`config.json slug and campaign must both be "${slug}"`);
  if (!/^\/g\/[a-z0-9-]+$/.test(cfg.path) || cfg.path !== `/g/${slug}`) die(`config.json path must be /g/${slug}`);
  if (!/^https:\/\/[a-z0-9.-]+$/.test(cfg.origin)) die(`origin "${cfg.origin}" must be an https host with no path`);
  if (typeof cfg.live !== 'boolean') die('"live" must be true or false');
  const url = cfg.funnel.calendlyUrl;
  if (cfg.live && !url) die('funnel.calendlyUrl is empty while "live" is true');
  if (cfg.live && !slug.startsWith('uk-') && cfg.funnel.pixelId === UK_PIXEL_ID) {
    die('funnel.pixelId is still the UK pixel while "live" is true. Make a pixel for this country and set it, or change this check on purpose.');
  }
  if (cfg.funnel.capiTokenEnv !== undefined && !/^META_CAPI_TOKEN_[A-Z0-9_]{1,30}$/.test(cfg.funnel.capiTokenEnv)) {
    die(`funnel.capiTokenEnv "${cfg.funnel.capiTokenEnv}" must be the name of a Netlify variable like META_CAPI_TOKEN_IT (never the token itself)`);
  }
  if (cfg.live && !slug.startsWith('uk-') && !cfg.funnel.capiTokenEnv) {
    die('funnel.capiTokenEnv is empty while "live" is true for a non-UK funnel. A Meta token belongs to one pixel: name the variable that holds this funnel\'s own token (META_CAPI_TOKEN_<COUNTRY>).');
  }
  if (url && !/^https:\/\/calendly\.com\/[^?#\s]+$/.test(url)) die(`funnel.calendlyUrl "${url}" must be a calendly.com address with no query string: the page adds its own`);
  if (!/^[A-Za-z][A-Za-z0-9_]{2,44}$/.test(cfg.funnel.qualifiedEvent) ||
      /^(Lead|Purchase|Schedule|CompleteRegistration|Contact|SubmitApplication|ViewContent)$/.test(cfg.funnel.qualifiedEvent)) {
    die(`funnel.qualifiedEvent "${cfg.funnel.qualifiedEvent}" must be a custom event name, never a standard one`);
  }
  if (!/^[A-Za-z0-9_]{1,40}$/.test(cfg.funnel.calendlyLeadParam || '') ||
      !['utm_content', 'utm_term', 'utm_campaign', 'utm_medium', 'utm_source'].includes(cfg.funnel.calendlyLeadParam)) {
    die('funnel.calendlyLeadParam must be one of the five tracking parameters Calendly passes on: utm_source, utm_medium, utm_campaign, utm_content, utm_term');
  }

  const vars = Object.assign({}, cfg.variables, { EMAIL: cfg.contact.email });
  const copy = fill(rawCopy, vars);
  checkStrings(walkStrings(copy, '', []));
  checkStrings(walkStrings(questionText(core), 'core', []));

  // The privacy notice and the website terms. "register" is whether the notice may say that the company is
  // checked against Companies House: true only while COMPANIES_HOUSE_API_KEY is set in production.
  if (!existsSync(join(dir, 'legal.json'))) die(`g/${slug}/legal.json is missing`);
  const legal = fill(readJson(join(dir, 'legal.json')), vars);
  checkStrings(walkStrings(legal, 'legal', []));
  for (const key of ['privacy', 'terms']) {
    if (!legal[key] || !legal[key].title || !legal[key].updated || !Array.isArray(legal[key].blocks)) die(`legal.json needs "${key}" with title, updated and blocks`);
  }
  if (!cfg.legal || typeof cfg.legal.registerCheck !== 'boolean') die('config.json needs "legal": { "registerCheck": true | false }');
  if (cfg.links.privacy !== `${cfg.path}/privacy/`) die(`links.privacy must be ${cfg.path}/privacy/ (the page built from legal.json)`);
  if (cfg.links.terms !== `${cfg.path}/terms/`) die(`links.terms must be ${cfg.path}/terms/ (the page built from legal.json)`);
  const legalFlags = { register: cfg.legal.registerCheck };

  // A funnel in another language does not go live on a draft: a lawyer has read the notice, and a native speaker the page.
  if (cfg.live && LOCALE.rules !== 'en') {
    const rv = legal.review || {};
    if (!rv.by || !rv.on) die(`legal.json "review" is empty while "live" is true: the privacy notice and the terms need a named reviewer and a date`);
    const cr = rawCopy.review || {};
    if (!cr.by || !cr.on) die(`copy.json "review" is empty while "live" is true: a native speaker has to read the page and be named, with a date`);
  }

  // The form, rendered once for the landing page and kept for the server's no-script answer.
  const formHtml = renderForm({ copy, cfg, values: {}, errors: {}, hidden: {}, general: false });

  loadJs();
  const sections = loadCss();
  for (const name of ['base', 'page', 'cards', 'form', 'banner', 'outcome', 'legal']) {
    if (!sections[name]) die(`g/_growth/style.css has no @section ${name}`);
  }
  const cssFor = (...names) => tidyCss(names.map((n) => sections[n]).join('\n'));

  const layout = Array.isArray(rawCopy.layout) ? rawCopy.layout : DEFAULT_LAYOUT;
  const extra = layout.some((n) => EXTRA_SECTIONS.has(n)) ? ['extra'] : [];
  if (extra.length && !sections.extra) die('g/_growth/style.css has no @section extra');

  const cfgClient = {
    slug: cfg.slug,
    campaign: cfg.campaign,
    path: cfg.path,
    applyPath: cfg.funnel.applyPath,
    interestPath: '/api/lead-interest',
    qualifiedEvent: cfg.funnel.qualifiedEvent,
    email: cfg.contact.email,
    calendlyUrl: url,
    calendlyLeadParam: cfg.funnel.calendlyLeadParam,
    takkPath: `${cfg.path}/takk/`,
    prefillKey: `elevate:g:${cfg.slug}:prefill`,
    text: {
      back: copy.form.back, next: copy.form.next, cta: copy.form.cta, retry: copy.form.retry,
      sending: copy.form.sending, failed: copy.form.failed,
      askDone: ((copy.outcomes['not-a-fit'] || {}).interest || {}).done || '',
      askError: ((copy.outcomes['not-a-fit'] || {}).interest || {}).error || '',
    },
  };

  /* ---- the landing page ---- */
  const landing = head(cfg, {
    title: copy.meta.title, description: copy.meta.description, og: true,
    css: cssFor.apply(null, ['base', 'page', 'cards'].concat(extra, ['form', 'banner'])),
    scripts: { track: cfg.funnel.viewEvent },
  }) + `
<body>
<div class="pg"><div class="pg-in em-fluid">
  ${topbar(copy)}
  ${landingMain(cfg, copy, formHtml, layout)}
  ${footer(cfg, copy)}
</div></div>
${banner(cfg, copy)}
<script>
${pageScript(cfgClient, 'landing', coreSrc)}
</script>
</body>
</html>
`;

  /* ---- the answer to a post without JavaScript that fails: the form alone, with the visitor's answers ---- */
  const shellHead = head(cfg, {
    title: copy.meta.title, description: copy.meta.description, og: false,
    css: cssFor('base', 'page', 'form'), scripts: null,
  });
  const shell = {
    before: `${shellHead}
<body>
<div class="pg"><div class="pg-in em-fluid">
  ${topbar(copy)}
  <main id="main">
    <h1 class="vh">${esc(copy.meta.title)}</h1>
    <section class="sec--form" id="form">
      <div class="wrap">`,
    after: `</div>
    </section>
  </main>
  ${footer(cfg, copy)}
</div></div>
</body>
</html>
`,
  };

  /* ---- the five outcome pages ---- */
  const O = copy.outcomes;
  function outcome(key, { kind, cal }) {
    const o = O[key];
    const m = o.h.match(/^(.+?\.)\s+(.+)$/);
    const h1 = m ? `<span class="o-soft">${esc(m[1])}</span> ${esc(m[2])}` : esc(o.h);
    const plain = (m ? m[2] : o.h).replace(/\.$/, '');
    const title = `${plain} | Elevate Marketing`;
    const note = o.note
      ? `<p class="o-note">${esc(o.note).replace(esc(cfg.contact.email), `<a href="mailto:${esc(cfg.contact.email)}">${esc(cfg.contact.email)}</a>`)}</p>`
      : '';
    const mail = (text) => esc(text).replace(esc(cfg.contact.email), `<a href="mailto:${esc(cfg.contact.email)}">${esc(cfg.contact.email)}</a>`);
    const ask = o.interest ? `
        <section class="o-ask" id="ask" aria-labelledby="ask-h" hidden>
          <h2 class="o-ask-h" id="ask-h">${esc(o.interest.h)}</h2>
          <p class="o-ask-p">${esc(o.interest.p)}</p>
          <button class="btn" type="button" id="ask-btn">${esc(o.interest.button)}</button>
          <p class="o-small o-ask-msg" id="ask-msg" role="status" aria-live="polite" tabindex="-1"></p>
          <p class="o-small"><a href="${esc(cfg.links.privacy)}">${esc(o.interest.privacy)}</a></p>
        </section>
        <noscript><p class="o-note">${mail(o.interest.noscript)}</p></noscript>` : '';
    const calendar = cal ? `
        <div class="o-cal-wrap">
          <div class="o-cal" id="cal">${url ? '' : `<p class="o-note">${esc(LOCALE.ui.calendarMissing || `The calendar is not connected yet. Set funnel.calendlyUrl in g/${slug}/config.json.`)}</p>`}</div>
          ${url ? `<noscript><p class="o-small"><a href="${esc(url)}">${esc(LOCALE.ui.calendarOwnPage)}</a></p></noscript>\n          ` : ''}<p class="o-small">${esc(o.small)}</p>
        </div>` : '';
    const html = head(cfg, {
      title, description: '', og: false,
      css: cssFor('base', 'outcome', 'banner'), scripts: {},
      preconnect: cal && url ? ['https://assets.calendly.com', 'https://calendly.com'] : [],
    }) + `
<body>
<div class="o"><div class="o-in em-fluid${cal ? ' o--book' : ''}">
  <header class="hd"><div class="wrap">${picture('ink')}</div></header>
  <main class="o-main" id="main">
    <div class="wrap">
      <div class="o-grid">
        <h1 class="o-h1">${h1}</h1>
        <p class="o-p">${esc(o.p)}</p>
        ${note}${ask}${calendar}
      </div>
    </div>
  </main>
  ${footer(cfg, copy)}
</div></div>
${banner(cfg, copy)}
<script>
${pageScript(cfgClient, kind, coreSrc)}
</script>
</body>
</html>
`;
    return html;
  }

  /* ---- the privacy notice and the website terms ---- */
  function legalBody(doc) {
    try { return renderLegalBlocks(doc, cfg, legalFlags); } catch (e) { return die(`legal.json (${doc.title}): ${e.message}`); }
  }
  function legalPage(key) {
    const doc = legal[key];
    return head(cfg, {
      title: `${doc.title} | Elevate Marketing`, description: '', og: false,
      css: cssFor('base', 'outcome', 'banner', 'legal'), scripts: {},
    }) + `
<body>
<div class="o"><div class="o-in em-fluid">
  <header class="hd"><div class="wrap">${picture('ink')}</div></header>
  <main class="lg-main" id="main">
    <div class="wrap">
      <article class="lg-doc">
        <h1 class="lg-h1">${esc(doc.title)}</h1>
        <p class="lg-date">${esc(doc.updated)}</p>
        ${legalBody(doc)}
      </article>
    </div>
  </main>
  ${footer(cfg, copy)}
</div></div>
${banner(cfg, copy)}
<script>
${pageScript(cfgClient, key === 'privacy' ? 'privacy' : 'plain', coreSrc)}
</script>
</body>
</html>
`;
  }

  const pages = [
    ['index.html', landing],
    ['book/index.html', outcome('book', { kind: 'book', cal: true })],
    ['takk/index.html', outcome('takk', { kind: 'takk' })],
    ['review/index.html', outcome('review', { kind: 'review' })],
    ['not-now/index.html', outcome('not-now', { kind: 'plain' })],
    ['not-a-fit/index.html', outcome('not-a-fit', { kind: 'notafit' })],
    ['privacy/index.html', legalPage('privacy')],
    ['terms/index.html', legalPage('terms')],
  ];
  for (const [rel, html] of pages) checkOutput(rel, html);
  checkOutput('form-only (no-script answer)', shell.before + formHtml + shell.after);

  /* ---- write ---- */
  const outDir = join(OUT, slug);
  rmSync(outDir, { recursive: true, force: true });
  for (const sub of ['book', 'takk', 'review', 'not-now', 'not-a-fit', 'privacy', 'terms']) mkdirSync(join(outDir, sub), { recursive: true });
  for (const [rel, html] of pages) writeFileSync(join(outDir, rel), html);

  /* What the lead function needs: no page copy beyond the form's, no notes. Written once, for all funnels, below. */
  const dataCfg = JSON.parse(JSON.stringify(cfg, (k, v) => (k.startsWith('_') ? undefined : v)));
  GENERATED[slug] = { cfg: dataCfg, copy: { form: copy.form }, shell };

  console.log(`  g-growth: /g/${slug} + /book /takk /review /not-now /not-a-fit /privacy /terms  (${pages.map(([, h]) => Math.round(h.length / 1024) + ' KB').join(', ')})`);
  if (!cfg.live) {
    console.log(`    ⚠ "live" is false in g/${slug}/config.json: the pages are built, the lead endpoint answers 503 and stores nothing.`);
    if (!url) console.log('      funnel.calendlyUrl is empty: the booking page shows a notice instead of the calendar.');
    console.log('      Before setting "live": true, read g/' + slug + '/LAUNCH.md.');
    return 1;
  }
  return 0;
}

const GENERATED = {};
let held = 0;
for (const slug of FUNNELS) held += await build(slug);
writeFileSync(FUNCTION_DATA,
  '// GENERATED by scripts/build-g-growth.mjs from g/<slug>/ for ' + FUNNELS.join(', ') + '. Do not edit: the next build overwrites it.\n' +
  'export const funnels = ' + JSON.stringify(GENERATED, null, 1) + ';\n' +
  '/** The first funnel, kept under its old name for the tests written against it. */\n' +
  "export const growth = funnels['uk-it-growth'];\n");
if (held) console.log('\n  ⚠ A growth funnel is not live yet (listed above). It is generated and noindex.');
