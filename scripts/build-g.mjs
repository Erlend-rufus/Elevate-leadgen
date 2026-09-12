#!/usr/bin/env node
/**
 * Campaign landing page generator (/g/<slug>).
 *
 * Reads g/<slug>.json and writes a five page funnel to public/g/<slug>/ :
 *   index.html            S1  landing page          indexed
 *   booking/index.html    S2  Calendly              noindex
 *   booked/index.html     S3  booked, conversion    noindex
 *   not-a-fit/index.html  S4  not a fit             noindex
 *   not-now/index.html    S5  at capacity           noindex
 *
 * Why static HTML, not a React route: the app at / is client rendered, so a
 * route there serves a 1.7 KB shell with no body copy and no JSON-LD to
 * anything that does not run JavaScript. These pages carry their content in
 * the first response. Same reasoning as scripts/build-cases.mjs.
 *
 * Why a generator and not hand-written HTML: the pound figures in the hero
 * table are computed here from kroner and the exchange rate, so the published
 * arithmetic cannot drift from the source numbers, and the copy rules below
 * are enforced on every build rather than on review.
 *
 * IMPORTANT: this generator removes only public/g/<slug>. public/g/_assets/
 * holds the self-hosted fonts and logos and must survive every build, so the
 * slug "_assets" is rejected and public/g/ is never enumerated.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'g');
const OUT = join(root, 'public', 'g');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let FILE = '';
const die = (msg) => {
  console.error(`\n  ✗ ${FILE}: ${msg}\n`);
  process.exit(1);
};

/* ------------------------------------------------------------- arithmetic */

/**
 * Pounds from kroner, rounded half up to a whole pound, computed on integers.
 *
 * 4044000 * 0.08 in binary floating point is 323520.00000000006, and a rate
 * that lands a product exactly on .5 would round by whatever the last bit
 * happens to be. Scaling the rate to an integer numerator removes both.
 */
function poundsFromNok(nok, rate) {
  const s = String(rate);
  const dot = s.indexOf('.');
  const decimals = dot === -1 ? 0 : s.length - dot - 1;
  if (decimals > 6) die(`currency_rate_nok_to_gbp has ${decimals} decimals (${s}). A published rate has at most 6.`);
  const den = Math.pow(10, decimals);
  const num = Math.round(Number(s) * den);
  const product = nok * num;
  if (!Number.isSafeInteger(product)) die(`rate ${s} times ${nok} overflows exact integer arithmetic.`);
  return Math.floor((product * 2 + den) / (den * 2));
}

const money = (n) => '£' + n.toLocaleString('en-GB');
const num = (n) => n.toLocaleString('en-GB');

/** "a, b and c". Joined from the parts, never by pattern-matching the result:
 *  the figures carry their own thousands commas and a regex cannot tell those
 *  from the separators. */
function list(parts) {
  if (parts.length < 2) return parts.join('');
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m) die(`date "${iso}" must be YYYY-MM-DD`);
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) die(`date "${iso}" has no such month`);
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/* ------------------------------------------------------------- validation */

/** Every string in the data file, with its dotted path. _comment keys are notes to a human and are never rendered. */
function walkStrings(node, path, out) {
  if (typeof node === 'string') { out.push([path, node]); return out; }
  if (Array.isArray(node)) { node.forEach((v, i) => walkStrings(v, `${path}[${i}]`, out)); return out; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('_comment')) continue;
      walkStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

const BANNED = [
  [/skyrocket/i, 'the word "skyrocket"'],
  [/game.changer/i, 'the phrase "game-changer"'],
  [/supercharge/i, 'the word "supercharge"'],
  [/\bunlock\w*/i, 'the word "unlock"'],
  [/!/, 'an exclamation mark'],
  [/—|–/, 'an em-dash or en-dash'],
  [/\b(optimiz|analyz|organiz|specializ|recogniz)\w*/i, 'an American -ize spelling'],
  [/\bcolor\b|\bcenter\b|\bfavorite\b/i, 'an American spelling'],
  [/tel:|\+44|\+47/, 'a telephone number (this brand publishes none)'],
];

function validate(d) {
  for (const k of ['slug', 'origin', 'meta', 'funnel', 'figures', 'testimonial', 's1', 's2', 's3', 's4', 's5', 'consent', 'footer', 'organisation', 'service'])
    if (!d[k]) die(`missing required section "${k}"`);
  if (basename(FILE, '.json') !== d.slug) die(`filename must match slug "${d.slug}"`);
  if (d.slug === '_assets') die('slug "_assets" is reserved for the shared fonts and logos');
  if (!/^[a-z0-9-]+$/.test(d.slug)) die(`slug "${d.slug}" must be lower-case letters, digits and hyphens`);
  if (typeof d.live !== 'boolean') die('"live" must be true or false');
  if (!/^https:\/\/[a-z0-9.-]+$/.test(d.origin)) die(`origin "${d.origin}" must be an https host with no path`);

  const f = d.figures;

  /* The work order's hardest requirement: no page may be deployed with a
     guessed rate. This fails whether or not the funnel is live, because a
     wrong number here is published as a client's real figures. */
  if (!f.currency_rate_nok_to_gbp || Number(f.currency_rate_nok_to_gbp) <= 0)
    die('figures.currency_rate_nok_to_gbp is empty or zero.\n' +
        '    Every pound figure on the page is computed from it, so there is nothing to render.\n' +
        '    Put the published rate in g/' + d.slug + '.json. Do not guess one.');
  for (const k of ['rate_source', 'rate_date', 'export_date', 'client_name', 'platform', 'permission_statement'])
    if (!f[k]) die(`figures.${k} is required: the footnote is rendered from it, not written by hand`);

  /* The client consented to being named and to the figures being published.
     That sentence is what makes the rest of the footnote publishable, so it
     is rendered from the data file and cannot be edited into something else. */
  if (f.permission_statement !== 'Published with their written permission.')
    die(`figures.permission_statement must read exactly "Published with their written permission."\n    It reads "${f.permission_statement}".`);

  if (!Array.isArray(f.rows) || !f.rows.length) die('figures.rows is empty');
  f.rows.forEach((r, i) => {
    for (const k of ['label', 'spend_nok', 'bookings', 'cost_per_booking_nok'])
      if (r[k] === undefined || r[k] === '') die(`figures.rows[${i}].${k} is required`);
    const implied = Math.round(r.spend_nok / r.bookings);
    if (Math.abs(implied - r.cost_per_booking_nok) > 1)
      die(`figures.rows[${i}] does not add up: ${num(r.spend_nok)} / ${num(r.bookings)} is kr ${implied}, but cost_per_booking_nok says ${r.cost_per_booking_nok}`);
  });

  const strings = walkStrings(d, '', []);

  /* Commercial terms carry no rate and no amount on a page anyone can forward.
     Checked on the copy, never on rendered HTML: a CSS gradient contains 0%
     and 100% and would trip this for ever. */
  for (const [path, text] of strings) {
    const m = /(commission|kommisjon|\bfees?\b)/i.exec(text);
    if (!m) continue;
    const window_ = text.slice(Math.max(0, m.index - 100), m.index + 100);
    if (/%|£\s?\d|\bkr\s?\d|\d\s?(percent|per cent)/i.test(window_))
      die(`${path} puts a rate or an amount within 100 characters of "${m[0]}":\n    ...${window_.trim()}...`);
  }

  for (const [path, text] of strings) {
    for (const [re, what] of BANNED)
      if (re.test(text)) die(`${path} contains ${what}:\n    ...${text.slice(0, 140)}...`);
  }

  /* The client is named twice on the page: the label above the table and the
     footnote. The footnote is generated from client_name, so the only other
     permitted copy field is that label. An attribution is exempt because a
     quote, when one arrives, is attributed to them by name. */
  const NAME_OK = new Set(['figures.client_name', 'figures.label', 'testimonial.attribution']);
  const name = f.client_name;
  for (const [path, text] of strings) {
    if (NAME_OK.has(path)) continue;
    if (text.includes(name)) die(`${path} names ${name}. The client is named in two places only: the table label and the footnote.\n    ...${text.slice(0, 140)}...`);
  }
  if (!f.label.includes(name)) die(`figures.label must name ${name}: it is one of the two permitted mentions`);

  if (d.live) {
    if (!d.funnel.typeformId) die('funnel.typeformId is empty while "live" is true');
    if (!d.funnel.calendlyUrl) die('funnel.calendlyUrl is empty while "live" is true');
  }
  if (d.funnel.typeformId && !/^[0-9A-Za-z]{26}$/.test(d.funnel.typeformId))
    die(`funnel.typeformId "${d.funnel.typeformId}" is not a 26-character live-embed id`);
  if (d.funnel.calendlyUrl && !/^https:\/\/calendly\.com\/[^?#]+$/.test(d.funnel.calendlyUrl))
    die(`funnel.calendlyUrl "${d.funnel.calendlyUrl}" must be a calendly.com URL with no query string: the page adds its own parameters`);
  if (!/^[A-Za-z][A-Za-z0-9_]{2,44}$/.test(d.funnel.conversionEvent))
    die(`funnel.conversionEvent "${d.funnel.conversionEvent}" is not a usable custom event name`);
  if (/^(Lead|Purchase|Schedule|CompleteRegistration|Contact|SubmitApplication)$/.test(d.funnel.conversionEvent))
    die(`funnel.conversionEvent must not be the standard event "${d.funnel.conversionEvent}": the campaign optimises against a custom conversion built on a name only this funnel sends`);
}

/** Run over every generated page, after rendering. */
function checkOutput(path, html) {
  if (html.includes('{{')) die(`${path} still contains template syntax "{{"`);
  const ph = /\[(rate|REPLACE[^\]]*|[a-z_]{3,20})\]/.exec(html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ''));
  if (ph) die(`${path} still contains the placeholder "${ph[0]}"`);
  if (/fonts\.googleapis|fonts\.gstatic/.test(html))
    die(`${path} requests a font from Google. The three families are self-hosted under /g/_assets/fonts/.`);
  const green = /#(00[dD]47[eE]|00[eE]88[aA]|00[aA]862|00[fF][fF][cC]5|007[fF]4[cC])/.exec(html);
  if (green) die(`${path} uses ${green[0]}, which belongs to the green IT funnel. This campaign is paper and ink.`);
}

/* --------------------------------------------------------------------- css */

/* Values are the ones in the approved canvases. Mobile first, because the
   traffic is Meta and LinkedIn and most of it arrives in an in-app browser.
   Body copy never drops below 17px at 390. */
const CSS = `
*,*::before,*::after{box-sizing:border-box}
@font-face{font-family:Fraunces;src:url(/g/_assets/fonts/fraunces-v1.woff2)format('woff2');font-weight:100 900;font-display:swap}
@font-face{font-family:Geist;src:url(/g/_assets/fonts/geist-v1.woff2)format('woff2');font-weight:100 900;font-display:swap}
@font-face{font-family:'Geist Mono';src:url(/g/_assets/fonts/geist-mono-v1.woff2)format('woff2');font-weight:100 900;font-display:swap}
:root{
  --paper:#F7F5F0; --ink:#10141C; --marine:#0A1628; --deep:#04041C;
  --blue:#0073BD; --cyan:#00A3D6; --grey:#4A5162; --line:#CFCBC0;
  --box:#EFEDE7; --tint:#EAF2F8; --white:#FFFFFF;
  --display:Fraunces,Georgia,'Times New Roman',serif;
  --sans:Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --mono:'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --pad:22px;
}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  font-size:17.5px;line-height:1.45;font-weight:400;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--display);letter-spacing:-.025em;margin:0;color:var(--ink)}
h1{font-weight:900;font-size:37px;line-height:1.03;text-wrap:pretty}
h2{font-weight:700;font-size:29px;line-height:1.08}
h3{font-weight:700;font-size:26px;line-height:1.1}
p{margin:0}
img{max-width:100%;height:auto}
a{color:var(--blue);text-decoration:none}
a:hover{color:var(--deep)}
:focus-visible{outline:2px solid var(--blue);outline-offset:3px}
.wrap{padding-left:var(--pad);padding-right:var(--pad)}
.skip{position:absolute;left:-9999px;top:0;background:var(--blue);color:var(--white);
  padding:12px 20px;z-index:99;font-size:15px}
.skip:focus{left:0}
.vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
.eyebrow{font-weight:700;font-size:11px;line-height:1.4;letter-spacing:.16em;
  text-transform:uppercase;color:var(--grey)}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}

/* head */
.top{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-top:20px}
.top .eyebrow{display:none}
.logo{width:116px;display:block}

/* hero table. A real table, because that is what it is. At 390 each row
   becomes a card and the column headers move into the cells via data-label,
   so the figures stack rather than shrink. */
.figs{margin-top:34px}
.tbl{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.tbl caption{text-align:left;font-weight:700;font-size:11px;line-height:1.4;
  letter-spacing:.16em;text-transform:uppercase;color:var(--grey);padding-bottom:20px}
.tbl thead{position:absolute;width:1px;height:1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap}
.tbl tr{display:block;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  padding:14px 0;margin-bottom:14px}
.tbl tr:last-child{margin-bottom:0}
.tbl tr.hi{background:var(--tint);border:0;border-left:3px solid var(--blue);
  padding:16px 16px 18px}
.tbl th[scope=row]{display:block;text-align:left;font-weight:500;font-size:17px;padding:0 0 12px}
.tbl td{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
  padding:4px 0;font-family:var(--mono);font-weight:500;font-size:20px}
.tbl td::before{content:attr(data-label);font-family:var(--sans);font-weight:700;
  font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--grey)}
.tbl tr.hi td.key{border-top:1px solid var(--line);margin-top:4px;padding-top:8px;
  color:var(--blue);font-size:30px}
.tbl tr.hi td.key::before{color:var(--blue)}
.foot-note{margin-top:16px;font-size:17px;line-height:1.5;color:var(--grey)}

/* hero copy */
.hero h1{margin:40px 0 22px}
.hero p{margin-bottom:28px}
.hero p.quiet{color:var(--grey)}
.cta{display:block;text-align:center;background:var(--blue);color:var(--white);
  font-weight:500;font-size:17px;padding:18px 20px;border-radius:2px;
  transition:background .18s ease}
.cta:hover,.cta:focus{background:var(--deep);color:var(--white)}
.cta-note{margin-top:12px;font-size:17px;color:var(--grey);text-align:center}

section{padding:48px 0}
.sec-line{border-top:1px solid var(--line)}
.sec-eyebrow{margin-bottom:16px}
section h2{margin-bottom:34px}

/* numbered compliance points */
.pts{display:flex;flex-direction:column;gap:26px}
.pt{display:grid;grid-template-columns:44px 1fr;gap:6px}
.pt-n{font-family:var(--display);font-weight:900;font-size:32px;line-height:1;color:var(--blue)}
.note{margin-top:32px;background:var(--box);padding:24px 22px}
.note p{font-size:17px;line-height:1.5}

/* marine bands */
.marine{background:linear-gradient(160deg,var(--marine) 0%,var(--deep) 100%);color:var(--white)}
.marine h2{color:var(--white)}
.nots{display:flex;flex-direction:column;gap:30px}
.not{border-top:2px solid var(--cyan);padding-top:18px}
.not-t{font-weight:700;font-size:18px;color:var(--cyan);margin-bottom:10px}
.not p{line-height:1.5}

/* fit lists */
.fit{list-style:none;margin:0 0 40px;padding:0;display:flex;flex-direction:column;gap:18px}
.fit:last-child{margin-bottom:0}
.fit li{display:grid;grid-template-columns:30px 1fr;gap:8px;align-items:start}
.fit svg{margin-top:4px}
.dash{width:20px;height:2px;background:var(--line);margin-top:13px}
.fit--no{color:var(--grey)}
h3.no{color:var(--grey)}
.fit-h{margin-bottom:24px}

.prose{display:flex;flex-direction:column;gap:20px}

/* quote band */
.quote blockquote{margin:0;font-family:var(--display);font-weight:700;font-size:26px;
  line-height:1.2;color:var(--white);letter-spacing:-.02em}
.quote figcaption{margin-top:24px;font-weight:500;font-size:17px;color:var(--cyan)}
.quote figure{margin:0}

/* faq: native details, no script */
.faq{margin:0}
.faq details{border-top:1px solid var(--line)}
.faq details:last-of-type{border-bottom:1px solid var(--line)}
.faq summary{display:flex;align-items:center;justify-content:space-between;gap:18px;
  padding:20px 0;cursor:pointer;font-weight:500;font-size:18px;line-height:1.3;
  list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'+';font-family:var(--mono);font-weight:500;font-size:18px;
  color:var(--blue);flex:0 0 auto}
.faq details[open] summary::after{content:'\\2212'}
.faq details p{padding:0 0 22px;font-size:17px;line-height:1.5;color:var(--grey)}

.who{background:var(--box);padding:26px 22px}
.who .eyebrow{margin-bottom:14px}

/* embeds. An explicit height is required: without one Typeform renders at
   roughly 300x500 and the form is a fifth of the screen. The iframe override
   is what makes the embed fill that box instead of leaving a band of white
   under it, learned on /case/what-a-client-costs/apply. */
.embed{width:100%;background:var(--white);border:1px solid var(--line);overflow:hidden}
.embed--form{height:640px}
.embed--cal{height:700px;min-width:320px}
.embed>iframe,.embed .calendly-inline-widget{width:100%!important;height:100%!important;
  border:0!important;display:block}
.embed-off{height:100%;display:flex;align-items:center;justify-content:center;
  padding:32px 22px;text-align:center;color:var(--grey);font-size:17px;line-height:1.5}
.form-sec h2{margin-bottom:14px}
.form-sec .sub{margin-bottom:28px;color:var(--grey)}

/* sticky mobile CTA. Fixed, not sticky: an in-app browser with a collapsing
   toolbar handles fixed predictably and sticky sometimes not at all. */
.bar{position:fixed;left:0;right:0;bottom:0;z-index:40;
  background:rgba(247,245,240,.94);backdrop-filter:blur(8px);
  border-top:1px solid var(--line);
  padding:12px var(--pad) calc(14px + env(safe-area-inset-bottom))}
.bar.hide{display:none}
body.has-bar{padding-bottom:96px}

footer{background:var(--marine);padding:32px var(--pad);
  display:flex;flex-direction:column;gap:18px}
footer .legal{font-size:17px;line-height:1.5;color:var(--white);opacity:.85}
.page{min-height:100dvh;display:flex;flex-direction:column}
.page>main{flex:1}
.tick{display:block;margin-bottom:28px}
.rule{width:72px;height:2px;background:var(--blue);margin-bottom:28px}
.end h1{margin:0 0 28px}
.end{padding:52px 0 60px}

/* consent bar. Page owned, because the shared banner is dressed for the dark
   site. The choice is stored under the same key, so nobody is asked twice. */
.consent{position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--marine);
  color:var(--white);padding:18px var(--pad) calc(18px + env(safe-area-inset-bottom))}
.consent p{font-size:15px;line-height:1.5;margin-bottom:14px;max-width:62ch}
.consent a{color:var(--cyan);text-decoration:underline}
.consent-btns{display:flex;gap:12px;flex-wrap:wrap}
.consent button{font:500 15px/1 var(--sans);padding:12px 22px;border-radius:2px;cursor:pointer}
.consent .yes{background:var(--blue);color:var(--white);border:1px solid var(--blue)}
.consent .no{background:none;color:var(--white);border:1px solid rgba(255,255,255,.35)}

@media (min-width:900px){
  :root{--pad:80px}
  body{font-size:19px}
  h1{font-size:66px;line-height:1.02}
  h2{font-size:46px;line-height:1.06}
  h3{font-size:30px}
  .wrap{max-width:1440px;margin-left:auto;margin-right:auto}
  .top{padding-top:36px}
  .top .eyebrow{display:block;font-size:12px}
  .logo{width:168px}
  section{padding:96px 0}
  .bar{display:none}
  body.has-bar{padding-bottom:0}
  .figs{margin-top:0}
  .tbl caption{font-size:12px;padding-bottom:28px}
  .tbl thead{position:static;width:auto;height:auto;clip:auto}
  .tbl tr{display:table-row;border:0;padding:0;margin:0}
  .tbl thead th{padding:14px 24px 14px 0;font-weight:700;font-size:12px;
    letter-spacing:.16em;text-transform:uppercase;color:var(--grey);text-align:right;
    border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .tbl thead th:first-child{text-align:left;width:38%;padding-right:0}
  .tbl thead th:last-child{padding-right:0}
  .tbl th[scope=row]{display:table-cell;font-weight:400;font-size:17px;padding:22px 0;
    border-bottom:1px solid var(--line)}
  .tbl td{display:table-cell;text-align:right;font-size:27px;padding:22px 24px 22px 0;
    border-bottom:1px solid var(--line)}
  .tbl td:last-child{padding-right:0}
  .tbl td::before{content:none}
  .tbl tr.hi{background:var(--tint)}
  .tbl tr.hi th[scope=row]{font-weight:500;padding-left:18px;border-left:3px solid var(--blue)}
  .tbl tr.hi td.key{font-size:34px;color:var(--blue);border-top:0;margin-top:0;padding-top:22px}
  .foot-note{font-size:15px;max-width:760px}
  .hero{display:grid;grid-template-columns:1fr 420px;gap:80px;align-items:start;
    margin-top:72px}
  .hero h1{margin:0}
  .hero-side{padding-top:8px}
  .hero p{margin-bottom:36px}
  .cta{display:inline-block;font-size:18px;padding:19px 30px}
  .cta-note{text-align:left;font-size:15px;margin-top:14px}
  section h2{margin-bottom:64px;max-width:900px}
  .pts{display:grid;grid-template-columns:1fr 1fr;gap:56px 80px}
  .pt{grid-template-columns:64px 1fr;gap:8px}
  .pt-n{font-size:44px}
  .note{margin-top:64px;padding:40px 44px;max-width:940px}
  .note p{font-size:18px;line-height:1.55}
  .nots{display:grid;grid-template-columns:repeat(3,1fr);gap:56px}
  .not{padding-top:24px}
  .not-t{font-size:20px;margin-bottom:14px}
  .not p{font-size:18px}
  .fits{display:grid;grid-template-columns:1fr 1fr;gap:80px}
  .fit{margin-bottom:0}
  .prose{max-width:900px}
  .quote blockquote{font-size:40px;line-height:1.15;max-width:20ch}
  .quote figcaption{font-size:18px}
  .faq{max-width:1000px}
  .faq summary{font-size:20px;padding:24px 0}
  .faq details p{font-size:19px;padding-bottom:26px;max-width:80ch}
  .who{padding:40px 44px;max-width:940px}
  .embed--form{height:720px}
  .embed--cal{height:780px}
  .form-sec h2{margin-bottom:18px}
  .end{padding:110px 0 120px}
  .end-grid{display:grid;grid-template-columns:1fr 640px;gap:96px;align-items:start}
  .end-grid h1{margin:0}
  .end-grid .prose{padding-top:12px;gap:26px}
  .rule{width:96px;margin-bottom:44px}
  footer{flex-direction:row;align-items:center;justify-content:space-between;
    gap:60px;padding:56px var(--pad)}
  footer .logo{width:148px}
  footer .legal{font-size:15px;max-width:70ch}
  .consent{display:flex;align-items:center;justify-content:space-between;gap:32px;
    flex-wrap:wrap;padding:20px var(--pad)}
  .consent p{margin-bottom:0}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

/* ----------------------------------------------------------- page runtime */

/* Attribution helpers, shared by every page in the funnel. Concatenation
   rather than template literals throughout: this string is itself inside a
   template literal in this file. */
const PARAM_JS = `
var UTM = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
var CARRY = UTM.concat(['fbclid','lead_id','page_slug']);
var STORE = 'elevate:g:' + SLUG;
function newLeadId(prefix){
  var body;
  try { if (crypto && crypto.randomUUID) body = crypto.randomUUID().replace(/-/g,'').slice(0,20); } catch (e) {}
  if (!body) body = Date.now().toString(36) + Math.random().toString(36).slice(2,10);
  return (prefix || 'l_') + body;
}
function readParams(){
  var q, out = {};
  try { q = new URLSearchParams(location.search); } catch (e) { return out; }
  CARRY.forEach(function(k){ var v = q.get(k); if (v) out[k] = v; });
  return out;
}
function restore(){ try { return JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } }
function save(o){ try { sessionStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }
/* URL wins, the session fills the gaps, and a lead_id is minted only if the
   visitor still has none. mintPrefix marks where that happened: 'd_' on the
   booking page means they arrived without one, which is a direct visit rather
   than an ad click, and a booking we cannot trace back to a creative. */
function state(mintPrefix){
  var s = restore(), p = readParams(), out = {};
  Object.keys(s).forEach(function(k){ out[k] = s[k]; });
  Object.keys(p).forEach(function(k){ out[k] = p[k]; });
  out.page_slug = SLUG;
  if (!out.lead_id && mintPrefix) {
    out.lead_id = newLeadId(mintPrefix);
    if (mintPrefix !== 'l_') out.src = 'direct';
  }
  save(out);
  return out;
}
function query(o){
  var q = new URLSearchParams();
  Object.keys(o).forEach(function(k){ if (o[k] !== '' && o[k] != null) q.set(k, o[k]); });
  return q.toString();
}`;

/* The embed and the calendar are same-origin frameable, so a Typeform ending
   that redirects inside its own iframe would render the rest of the funnel
   nested, with the address bar still on the landing page. This puts the page
   back at the top with its query string intact. */
const FRAME_BUSTER = `
if (window.top !== window.self) { try { window.top.location.replace(location.href); } catch (e) {} }`;

/* Page-owned consent bar. /js/consent.js owns whether the pixel loads; this
   only asks the question in the page's own clothes, with data-banner="off"
   suppressing the dark one. Same storage key, so a visitor who chose on any
   other page of the site is not asked again. */
const CONSENT_JS = `
(function(){
  var C = window.ElevateConsent;
  if (!C) { try { console.error('[elevate] /js/consent.js did not load: nothing is gated and nothing will fire'); } catch (e) {} return; }
  function done(){ var el = document.getElementById('g-consent'); if (el) el.remove();
    if (typeof window.__gAfterConsent === 'function') window.__gAfterConsent(); }
  if (C.status()) { done(); return; }
  var bar = document.getElementById('g-consent');
  if (!bar) return;
  bar.hidden = false;
  bar.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('button[data-c]');
    if (!b) return;
    if (b.getAttribute('data-c') === 'yes') C.accept(); else C.decline();
    done();
  });
})();`;

const LANDING_JS = `
(function(){
  var s = state('l_');

  /* Hidden fields are written before the embed script is appended, never
     after it. Typeform reads the attribute when the element is scanned, and
     on /lp a DOMContentLoaded pass was demonstrably too late: the attribute
     still held empty keys at that moment and every paid click arrived with
     no source. */
  var tf = document.getElementById('tf');
  if (tf && TYPEFORM_ID) {
    var hidden = [];
    HIDDEN_FIELDS.forEach(function(k){ hidden.push(k + '=' + String(s[k] == null ? '' : s[k]).replace(/,/g, '\\\\,')); });
    tf.setAttribute('data-tf-live', TYPEFORM_ID);
    tf.setAttribute('data-tf-hidden', hidden.join(','));
    tf.setAttribute('data-tf-inline-on-mobile', '');
    tf.setAttribute('data-tf-redirect-target', '_top');
    var sc = document.createElement('script');
    sc.src = 'https://embed.typeform.com/next/embed.js';
    sc.async = true;
    document.body.appendChild(sc);
  }

  document.querySelectorAll('[data-to-form]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.preventDefault();
      var t = document.getElementById('form');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* The sticky button covers the bottom of the screen, which is where the
     form is once you reach it. Hide it there rather than have it sit on top
     of the question. */
  var bar = document.querySelector('.bar'), form = document.getElementById('form');
  if (bar && form && 'IntersectionObserver' in window) {
    new IntersectionObserver(function(es){
      es.forEach(function(en){ bar.classList.toggle('hide', en.isIntersecting); });
    }, { rootMargin: '0px 0px -40% 0px' }).observe(form);
  }
})();`;

const BOOKING_JS = `
(function(){
  var s = state('d_');

  var host = document.getElementById('cal');
  if (host && CALENDLY_URL) {
    /* Calendly accepts five tracking parameters and no more. lead_id rides in
       utm_term so utm_content keeps carrying the creative: overwrite that and
       a booking can no longer be traced to the ad that produced it, which is
       the whole point of running four of them. */
    var p = ['hide_gdpr_banner=1', 'background_color=F7F5F0', 'text_color=10141C', 'primary_color=0073BD'];
    if (s.lead_id) p.push('utm_term=' + encodeURIComponent(s.lead_id));
    ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function(k){
      if (s[k]) p.push(k + '=' + encodeURIComponent(s[k]));
    });
    var w = document.createElement('div');
    w.className = 'calendly-inline-widget';
    w.setAttribute('data-url', CALENDLY_URL + '?' + p.join('&'));
    host.appendChild(w);
    var sc = document.createElement('script');
    sc.src = 'https://assets.calendly.com/assets/external/widget.js';
    sc.async = true;
    document.head.appendChild(sc);
  }

  /* Calendly's own redirect is unreliable inside an in-app browser and hands
     us no control over the parameters, so the event is what forwards. There
     is deliberately no timer: a timeout would count a booking that never
     happened. The event's own redirect setting must stay unset, or the
     visitor is sent twice. */
  window.addEventListener('message', function(e){
    if (!/^https:\\/\\/([a-z0-9-]+\\.)*calendly\\.com$/.test(String(e.origin))) return;
    if (e.data && e.data.event === 'calendly.event_scheduled') {
      var q = query(s);
      location.href = BOOKED_PATH + (q ? '?' + q : '');
    }
  });
})();`;

const BOOKED_JS = `
(function(){
  var s = state(null);

  /* The conversion. This is the only place in the funnel it fires: not on a
     CTA click, not on form submit, not on the not-a-fit or not-now pages. It
     is a custom event rather than Lead so the campaign optimises against
     people who booked, not against people who fill in forms. */
  function fire(){
    var C = window.ElevateConsent;
    if (!C) { try { console.error('[elevate] consent.js missing: ' + EVENT + ' not sent'); } catch (e) {} return; }
    /* Not yet consented is not the same as declined. Leave the guard unset so
       the event can still fire if they accept on this page or a later one;
       writing it now would suppress the conversion for ever. */
    if (C.status() !== 'accepted') return;
    var key = STORE + ':' + EVENT + ':' + (s.lead_id || 'none');
    try { if (sessionStorage.getItem(key) === '1') return; } catch (e) {}
    C.track(EVENT, {
      lead_id: s.lead_id || '',
      utm_source: s.utm_source || '',
      utm_campaign: s.utm_campaign || '',
      utm_content: s.utm_content || ''
    });
    try { sessionStorage.setItem(key, '1'); } catch (e) {}
  }
  window.__gAfterConsent = fire;
  fire();
})();`;

/* ------------------------------------------------------------------ shell */

const CONSENT_TAG = (d) =>
  `<script src="/js/consent.js?v=3" data-pixel="${esc(d.funnel.pixelId)}" data-banner="off"></script>`;

function jsonLd(d) {
  const o = d.organisation;
  const org = {
    '@type': 'Organization',
    '@id': `${o.url}/#organisation`,
    name: o.name,
    legalName: o.legalName,
    url: o.url,
    email: o.email,
    vatID: o.vatID,
    address: {
      '@type': 'PostalAddress',
      streetAddress: o.address.street,
      postalCode: o.address.postalCode,
      addressLocality: o.address.locality,
      addressCountry: o.address.country,
    },
  };
  const service = {
    '@type': 'Service',
    name: d.service.name,
    description: d.service.description,
    areaServed: { '@type': 'Country', name: d.service.areaServed },
    provider: { '@id': `${o.url}/#organisation` },
  };
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, service] })
    .replace(/</g, '\\u003c')}</script>`;
}

function shell(d, { title, description, noindex, path, mono, structured, bodyClass, eyebrow }) {
  const url = `${d.origin}/g/${d.slug}${path}`;
  const font = (f) => `<link rel="preload" href="/g/_assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`;
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
${noindex ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#F7F5F0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<!-- og:image omitted while public/og-image.jpg still carries a growwithelevate.eu badge,
     matching every other static funnel in this repo. -->
${font('geist-v1.woff2')}
${font('fraunces-v1.woff2')}${mono ? '\n' + font('geist-mono-v1.woff2') : ''}
<style>${CSS}</style>
${CONSENT_TAG(d)}${structured ? '\n' + jsonLd(d) : ''}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
<div class="page">
<header class="wrap top">
  <picture>
    <source srcset="/g/_assets/logo-ink.webp" type="image/webp">
    <img class="logo" src="/g/_assets/logo-ink.png" width="418" height="168" alt="Elevate Marketing">
  </picture>
  ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}
</header>`;
}

function footer(d) {
  return `<footer>
  <picture>
    <source srcset="/g/_assets/logo-white.webp" type="image/webp">
    <img class="logo" src="/g/_assets/logo-white.png" width="418" height="168" alt="Elevate Marketing" loading="lazy">
  </picture>
  <p class="legal">${esc(d.footer)}</p>
</footer>
</div>`;
}

function consentBar(d) {
  const c = d.consent;
  return `<div class="consent" id="g-consent" role="region" aria-label="Cookie choice" hidden>
  <p>${esc(c.body)} <a href="${esc(c.privacyUrl)}">${esc(c.privacyLabel)}</a></p>
  <div class="consent-btns">
    <button type="button" class="yes" data-c="yes">${esc(c.accept)}</button>
    <button type="button" class="no" data-c="no">${esc(c.decline)}</button>
  </div>
</div>`;
}

/** Constants every page's runtime needs, written once at the top of its script. */
function consts(d, extra) {
  const lines = [
    `var SLUG = ${JSON.stringify(d.slug)};`,
    `var HIDDEN_FIELDS = ${JSON.stringify(d.funnel.hiddenFields)};`,
    ...extra,
  ];
  return lines.join('\n');
}

/* ----------------------------------------------------------------- S1 */

function renderLanding(d) {
  const f = d.figures;
  const rate = f.currency_rate_nok_to_gbp;
  const s = d.s1;

  const rows = f.rows.map((r) => {
    const hi = r.highlight ? ' class="hi"' : '';
    const key = r.highlight ? ' class="key"' : '';
    return `      <tr${hi}>
        <th scope="row">${esc(r.label)}</th>
        <td data-label="${esc(f.columns.spend)}">${money(poundsFromNok(r.spend_nok, rate))}</td>
        <td data-label="${esc(f.columns.bookings)}">${num(r.bookings)}</td>
        <td${key} data-label="${esc(f.columns.costPerBooking)}">${money(poundsFromNok(r.cost_per_booking_nok, rate))}</td>
      </tr>`;
  }).join('\n');

  /* Rendered from the same fields as the table. The permission sentence is one
     of them, so it cannot be dropped by editing prose. */
  const note =
    `Spend in the account was ${list(f.rows.map((r) => 'kr ' + num(r.spend_nok)))}, ` +
    `at ${list(f.rows.map((r) => 'kr ' + num(r.cost_per_booking_nok)))} per booking. ` +
    `Converted from Norwegian kroner at 1 NOK = £${rate}, the rate published by ${f.rate_source} on ${longDate(f.rate_date)}. ` +
    `Source: ${f.client_name}'s own ${f.platform} account, exported ${longDate(f.export_date)}. ` +
    f.permission_statement;

  const tick = `<svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M3 11.5L8.5 17L19 5" stroke="#0073BD" stroke-width="2.4"/></svg>`;

  const quote = d.testimonial.quote
    ? `\n  <section class="marine quote">
    <div class="wrap">
      <figure>
        <blockquote>${esc(d.testimonial.quote)}</blockquote>
        ${d.testimonial.attribution ? `<figcaption>${esc(d.testimonial.attribution)}</figcaption>` : ''}
      </figure>
    </div>
  </section>`
    : '';

  const embed = d.funnel.typeformId
    ? `<div class="embed embed--form"><div id="tf"></div></div>`
    : `<div class="embed embed--form"><p class="embed-off">The form is not connected yet. Put the Typeform id in g/${esc(d.slug)}.json.</p></div>`;

  return `${shell(d, {
    title: d.meta.title,
    description: d.meta.description,
    noindex: !d.live,
    path: '',
    mono: true,
    structured: true,
    bodyClass: 'has-bar',
    eyebrow: s.eyebrow,
  })}

<main id="main">

  <section class="wrap" style="padding-top:34px">
    <div class="figs">
      <table class="tbl">
        <caption>${esc(f.label)}</caption>
        <thead>
          <tr>
            <th scope="col"><span class="vh">Period</span></th>
            <th scope="col">${esc(f.columns.spend)}</th>
            <th scope="col">${esc(f.columns.bookings)}</th>
            <th scope="col">${esc(f.columns.costPerBooking)}</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
      <p class="foot-note">${esc(note)}</p>
    </div>

    <div class="hero">
      <h1>${esc(s.h1)}</h1>
      <div class="hero-side">
${s.lede.map((p, i) => `        <p${i ? ' class="quiet"' : ''}>${esc(p)}</p>`).join('\n')}
        <a class="cta" href="#form" data-to-form>${esc(s.cta)}</a>
        <p class="cta-note">${esc(s.ctaNote)}</p>
      </div>
    </div>
  </section>

  <section class="wrap sec-line">
    <p class="eyebrow sec-eyebrow">${esc(s.compliance.eyebrow)}</p>
    <h2>${esc(s.compliance.h2)}</h2>
    <div class="pts">
${s.compliance.points.map((p, i) => `      <div class="pt"><span class="pt-n" aria-hidden="true">${i + 1}</span><p>${esc(p)}</p></div>`).join('\n')}
    </div>
    <div class="note"><p>${esc(s.compliance.note)}</p></div>
  </section>

  <section class="marine">
    <div class="wrap">
      <h2>${esc(s.notDo.h2)}</h2>
      <div class="nots">
${s.notDo.items.map((i) => `        <div class="not"><p class="not-t">${esc(i.title)}</p><p>${esc(i.body)}</p></div>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="wrap">
    <div class="fits">
      <div>
        <h3 class="fit-h">${esc(s.fit.worksTitle)}</h3>
        <ul class="fit">
${s.fit.works.map((t) => `          <li>${tick}<p>${esc(t)}</p></li>`).join('\n')}
        </ul>
      </div>
      <div>
        <h3 class="fit-h no">${esc(s.fit.notTitle)}</h3>
        <ul class="fit fit--no">
${s.fit.not.map((t) => `          <li><span class="dash" aria-hidden="true"></span><p>${esc(t)}</p></li>`).join('\n')}
        </ul>
      </div>
    </div>
  </section>

  <section class="wrap sec-line">
    <h2>${esc(s.model.h2)}</h2>
    <div class="prose">
${s.model.body.map((p) => `      <p>${esc(p)}</p>`).join('\n')}
    </div>
  </section>${quote}

  <section class="wrap sec-line">
    <h2>${esc(s.faq.h2)}</h2>
    <div class="faq">
${s.faq.items.map((i) => `      <details>
        <summary>${esc(i.q)}</summary>
        <p>${esc(i.a)}</p>
      </details>`).join('\n')}
    </div>
  </section>

  <section class="wrap" style="padding-top:0">
    <div class="who">
      <p class="eyebrow">${esc(s.who.eyebrow)}</p>
      <p>${esc(s.who.body)}</p>
    </div>
  </section>

  <section class="wrap sec-line form-sec" id="form">
    <h2>${esc(s.form.h2)}</h2>
    <p class="sub">${esc(s.form.sub)}</p>
    ${embed}
    <noscript><p class="foot-note">${esc(s.form.noscript)}</p></noscript>
  </section>

</main>

${footer(d)}

<div class="bar">
  <a class="cta" href="#form" data-to-form>${esc(s.cta)}</a>
</div>

${consentBar(d)}

<script>
${consts(d, [`var TYPEFORM_ID = ${JSON.stringify(d.funnel.typeformId)};`])}
${PARAM_JS}
${LANDING_JS}
${CONSENT_JS}
</script>
</body>
</html>
`;
}

/* ----------------------------------------------------------------- S2 */

function renderBooking(d) {
  const s = d.s2;
  const embed = d.funnel.calendlyUrl
    ? `<div class="embed embed--cal" id="cal"></div>`
    : `<div class="embed embed--cal"><p class="embed-off">The calendar is not connected yet. Put the Calendly URL in g/${esc(d.slug)}.json.</p></div>`;

  return `${shell(d, {
    title: `Pick a time | ${d.organisation.name}`,
    noindex: true,
    path: '/booking',
    structured: true,
    eyebrow: s.eyebrow,
  })}

<main id="main">
  <section class="wrap" style="padding-top:34px;padding-bottom:30px">
    <div class="hero">
      <h1>${esc(s.h1)}</h1>
      <div class="hero-side"><p>${esc(s.lede)}</p></div>
    </div>
  </section>
  <section class="wrap" style="padding-top:0">
    ${embed}
    <noscript><p class="foot-note">${esc(s.noscript)}</p></noscript>
  </section>
</main>

${footer(d)}

${consentBar(d)}

<script>
${consts(d, [
    `var CALENDLY_URL = ${JSON.stringify(d.funnel.calendlyUrl)};`,
    `var BOOKED_PATH = ${JSON.stringify(`/g/${d.slug}/booked`)};`,
  ])}
${FRAME_BUSTER}
${PARAM_JS}
${BOOKING_JS}
${CONSENT_JS}
</script>
</body>
</html>
`;
}

/* -------------------------------------------------------------- S3 S4 S5 */

/** The three endings share a layout: a mark, a headline, a short prose column. */
function renderEnd(d, key, { title, path, mark, track }) {
  const s = d[key];
  return `${shell(d, { title, noindex: true, path, eyebrow: s.eyebrow })}

<main id="main">
  <section class="wrap end">
    ${mark}
    <div class="end-grid">
      <h1>${esc(s.h1)}</h1>
      <div class="prose">
${s.body.map((p) => `        <p>${esc(p)}</p>`).join('\n')}
      </div>
    </div>
  </section>
</main>

${footer(d)}

${consentBar(d)}

<script>
${consts(d, track ? [`var EVENT = ${JSON.stringify(d.funnel.conversionEvent)};`] : [])}
${FRAME_BUSTER}
${PARAM_JS}
${track ? BOOKED_JS : '\n/* No conversion on this page, deliberately. Firing one for a lead we cannot\n   serve would teach the campaign to find more of them. */\nstate(null);'}
${CONSENT_JS}
</script>
</body>
</html>
`;
}

const TICK = `<svg class="tick" width="40" height="40" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M2 11.5L8.5 18L20 4" stroke="#0073BD" stroke-width="2"/></svg>`;
const RULE = `<div class="rule" aria-hidden="true"></div>`;

/* -------------------------------------------------------------------- main */

if (!existsSync(SRC)) {
  console.log('  g: no g/ directory, nothing to build');
  process.exit(0);
}
const files = readdirSync(SRC).filter((f) => f.endsWith('.json'));
if (!files.length) {
  console.log('  g: no campaign data files, nothing to build');
  process.exit(0);
}

let held = 0;

for (const file of files) {
  FILE = file;
  const full = join(SRC, file);
  let d;
  try {
    d = JSON.parse(readFileSync(full, 'utf8'));
  } catch (e) {
    die(`invalid JSON: ${e.message}`);
  }
  validate(d);

  const pages = [
    ['index.html', renderLanding(d)],
    [join('booking', 'index.html'), renderBooking(d)],
    [join('booked', 'index.html'), renderEnd(d, 's3', {
      title: `You are booked in | ${d.organisation.name}`, path: '/booked', mark: TICK, track: true })],
    [join('not-a-fit', 'index.html'), renderEnd(d, 's4', {
      title: `Thank you for the straight answers | ${d.organisation.name}`, path: '/not-a-fit', mark: RULE })],
    [join('not-now', 'index.html'), renderEnd(d, 's5', {
      title: `Thanks for the straight answer | ${d.organisation.name}`, path: '/not-now', mark: RULE })],
  ];

  for (const [rel, html] of pages) checkOutput(`${d.slug}/${rel}`, html);

  /* Only this slug. public/g/_assets holds the fonts and logos every variant
     shares and is never enumerated, let alone removed. */
  const dir = join(OUT, d.slug);
  rmSync(dir, { recursive: true, force: true });
  for (const sub of ['booking', 'booked', 'not-a-fit', 'not-now']) mkdirSync(join(dir, sub), { recursive: true });

  for (const [rel, html] of pages) writeFileSync(join(dir, rel), html);

  console.log(`  g: /g/${d.slug} + /booking /booked /not-a-fit /not-now`);

  if (!d.live) {
    held++;
    console.log(`    ⚠ "live" is false in g/${file}, so all five pages carry noindex`);
    if (!d.funnel.typeformId) console.log('      funnel.typeformId is empty: the landing page shows a notice instead of the form');
    if (!d.funnel.calendlyUrl) console.log('      funnel.calendlyUrl is empty: the booking page shows a notice instead of the calendar');
    console.log('      Fill both, set "live": true, and the build then enforces them.');
  }
}

if (held) console.log('\n  ⚠ A campaign is not live yet (listed above). It is generated but not indexable.');
