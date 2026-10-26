#!/usr/bin/env node
/**
 * Casebank generator.
 *
 * Reads casebank/casebank.json and writes:
 *   public/cases/index.html            the filterable overview at /cases
 *   public/case/<slug>/index.html      one page per case with generate_page: true
 *
 * Static on purpose, like the other funnels: every card and every number is in
 * the first HTML response, readable with JavaScript off. JavaScript only hides
 * cards that do not match the filters and writes the filters to the URL, so a
 * filtered link (/cases/?sector=legal) can be sent to a prospect.
 *
 * The build fails when a published case lacks consent, when an anonymous case
 * leaks a client name, when a quote has no attribution, when a known wrong
 * figure appears, or when a commission rate appears.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'casebank', 'casebank.json');
const OUT_INDEX = join(root, 'public', 'cases');
const OUT_CASE = join(root, 'public', 'case');
const SITE = 'https://getelevateleads.com';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const data = JSON.parse(readFileSync(SRC, 'utf8'));
const cases = data.cases.filter((c) => c.published);

/* ---------------------------------------------------------------- validate */

const die = (msg) => {
  console.error(`\n  ✗ casebank: ${msg}\n`);
  process.exit(1);
};

for (const c of data.cases) {
  for (const k of ['slug', 'display_name', 'sector', 'niches', 'market', 'period', 'headline', 'metrics', 'page'])
    if (c[k] === undefined || c[k] === '') die(`${c.slug || '?'}: missing "${k}"`);
  if (c.published && c.consent_confirmed !== true) die(`${c.slug}: published without consent_confirmed`);
  if (c.quote && !c.attribution) die(`${c.slug}: quote without attribution`);
  if (c.metrics.length > 3) die(`${c.slug}: at most three metrics on a card`);
  if (c.generate_page)
    for (const k of ['situation', 'what_we_did', 'what_it_does_not_show', 'source'])
      if (!c[k] || (Array.isArray(c[k]) && !c[k].length)) die(`${c.slug}: a generated page needs "${k}"`);
  const text = JSON.stringify(c);
  if (!c.named)
    for (const n of data.forbiddenNames)
      if (text.toLowerCase().includes(n.toLowerCase())) die(`${c.slug}: anonymous case contains the name "${n}"`);
  for (const f of data.forbiddenFigures) if (text.includes(f)) die(`${c.slug}: contains the withdrawn figure ${f}`);
}

const all = JSON.stringify(data);
const TERMS = /commission/gi;
let m;
while ((m = TERMS.exec(all))) {
  const w = all.slice(Math.max(0, m.index - 100), m.index + 100);
  if (/\d\s?%|\d\s?(percent|per cent)/i.test(w)) die(`a rate appears near "commission": ...${w}...`);
}
if (/[–—]/.test(all)) die('an en or em dash appears in the copy');

/* ------------------------------------------------------------------ shared */

const sectorSlug = (c) => slugify(c.sector);
const marketSlug = (c) => slugify(c.market);
const ctaFor = (c) => data.ctaBySector[sectorSlug(c)] || data.ctaBySector.default;

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">';

const CSS = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --page:#04041C; --surface:#0B0B2E; --raised:#12123D;
  --heading:#f4f5ff; --body:#b9bbd9; --muted:#8a8cb3;
  --line:rgba(255,255,255,.08); --line-2:rgba(255,255,255,.16);
  --brand:#00a3d6;
  --grad:linear-gradient(135deg,#00a3d6,#006aba,#02009a);
  --warn-bg:rgba(252,163,17,.07); --warn-line:rgba(252,163,17,.34); --warn:#f0b455;
  --display:'Space Grotesk',system-ui,sans-serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --ease:cubic-bezier(.16,.84,.44,1);
}
*{margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{background:var(--page);color:var(--body);font-family:var(--sans);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--display);color:var(--heading);font-weight:600;line-height:1.14;letter-spacing:-.02em;text-wrap:balance}
a{color:var(--heading);text-decoration-color:rgba(255,255,255,.3);text-underline-offset:3px}
a:hover{text-decoration-color:var(--brand)}
:focus-visible{outline:2px solid var(--brand);outline-offset:3px;border-radius:4px}
.skip{position:absolute;left:-9999px;top:0;background:var(--brand);color:#fff;padding:12px 20px;z-index:99;font-size:14px}
.skip:focus{left:0}
.wrap{max-width:1140px;margin:0 auto;padding:0 24px}
p{max-width:66ch}
.eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--brand);font-weight:600;display:block}
.bar{display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid var(--line);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.bar a{color:var(--muted);text-decoration:none}
.bar a:hover{color:var(--heading)}
.hero{padding:56px 0 40px}
.hero h1{font-size:clamp(32px,5.2vw,54px);max-width:20ch;margin-top:18px}
.hero .lede{font-size:clamp(17px,2vw,20px);margin-top:20px}
.btn{display:inline-block;background:var(--grad);color:#fff;padding:15px 28px;font-size:15.5px;font-weight:600;text-decoration:none;border-radius:8px;line-height:1;transition:transform .18s var(--ease),box-shadow .18s var(--ease)}
.btn:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,163,214,.28);color:#fff}
.filters{display:grid;gap:18px;padding:24px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
.fgroup{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.fgroup .fl{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);min-width:72px;font-weight:600}
.chip{font:inherit;font-size:14px;color:var(--body);background:transparent;border:1px solid var(--line-2);border-radius:999px;padding:6px 14px;cursor:pointer;line-height:1.3}
.chip:hover{border-color:var(--brand);color:var(--heading)}
.chip[aria-pressed="true"]{background:var(--brand);border-color:var(--brand);color:#04041C;font-weight:600}
.status{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;margin:28px 0 16px;color:var(--muted);font-size:14px}
.linkbtn{font:inherit;font-size:14px;background:none;border:none;color:var(--heading);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:0}
.grid{display:grid;gap:16px;grid-template-columns:1fr}
@media(min-width:720px){.grid{grid-template-columns:1fr 1fr}}
@media(min-width:1040px){.grid{grid-template-columns:1fr 1fr 1fr}}
.card{display:flex;flex-direction:column;gap:16px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:24px;min-width:0}
.card[hidden]{display:none}
.card .meta{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.card h2{font-size:20px}
.card .hl{color:var(--body);font-size:15.5px}
.figs{display:grid;gap:12px;border-top:1px solid var(--line);padding-top:16px;margin-top:auto}
.fig{display:grid;grid-template-columns:minmax(0,auto) 1fr;gap:12px;align-items:baseline}
.fig b{font-family:var(--display);font-size:22px;font-weight:700;color:var(--heading);font-variant-numeric:tabular-nums;white-space:nowrap}
.fig span{font-size:13.5px;color:var(--muted);line-height:1.4}
.card .more{font-weight:600;font-size:15px}
.empty{border:1px dashed var(--line-2);border-radius:14px;padding:32px 24px;display:grid;gap:18px;justify-items:start}
.empty[hidden]{display:none}
.foot{padding:40px 0 64px;border-top:1px solid var(--line);margin-top:48px;color:var(--muted);font-size:14px;display:grid;gap:10px}
section{padding:48px 0;border-top:1px solid var(--line)}
section h2{font-size:clamp(24px,3.2vw,32px);margin-bottom:18px}
.swing{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-top:36px;grid-template-columns:1fr}
@media(min-width:760px){.swing{grid-template-columns:repeat(3,1fr)}}
.swing-cell{background:var(--surface);padding:24px}
.swing .figbig{font-family:var(--display);font-size:clamp(28px,4.4vw,38px);font-weight:700;line-height:1.05;color:var(--heading);display:block;font-variant-numeric:tabular-nums}
.swing .sub{font-size:14px;color:var(--muted);margin-top:10px;display:block}
ul.did{display:grid;gap:10px;padding-left:20px}
.warn{background:var(--warn-bg);border:1px solid var(--warn-line);border-radius:12px;padding:20px 22px}
.warn h2{color:var(--warn);font-size:18px;margin-bottom:10px}
.cta{display:grid;gap:18px;justify-items:start}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const head = ({ title, description, canonical }) => `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:site_name" content="Elevate Marketing">
<meta name="theme-color" content="#04041C">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${FONTS}
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Elevate Marketing',
  legalName: 'EngeCo AS',
  url: SITE,
})}</script>
</head>`;

const bar = (right) => `<div class="wrap"><div class="bar"><a href="/">Elevate Marketing</a><span>${right}</span></div></div>`;

/* ------------------------------------------------------------- the index */

const groups = [
  ['sector', data.page.filters.sector, (c) => [[sectorSlug(c), c.sector]]],
  ['niche', data.page.filters.niche, (c) => c.niches.map((n) => [slugify(n), n])],
  ['market', data.page.filters.market, (c) => [[marketSlug(c), c.market]]],
];

const order = [...cases].sort((a, b) => {
  const uk = (c) => (c.market === 'UK' ? 0 : 1);
  return uk(a) - uk(b);
});

const options = groups.map(([key, label, get]) => {
  const seen = new Map();
  for (const c of order) for (const [v, l] of get(c)) if (!seen.has(v)) seen.set(v, l);
  return [key, label, [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'en'))];
});

const card = (c) => `<article class="card" data-sector="${sectorSlug(c)}" data-market="${marketSlug(c)}" data-niches="${c.niches.map(slugify).join(' ')}">
  <span class="meta">${esc(c.sector)} · ${esc(c.market_label || c.market)} · ${esc(c.period_short || c.period)}</span>
  <h2>${esc(c.display_name)}</h2>
  <p class="hl">${esc(c.headline)}</p>
  <div class="figs">${c.metrics.map((f) => `<div class="fig"><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join('')}</div>
  <a class="more" href="${esc(c.page)}">${esc(data.page.readCase)}</a>
</article>`;

const indexHtml = `${head({ title: data.page.title, description: data.page.description, canonical: '/cases/' })}
<body>
<a class="skip" href="#cases">Skip to the cases</a>
${bar(esc(data.page.eyebrow))}
<main class="wrap">
  <div class="hero">
    <span class="eyebrow">${esc(data.page.eyebrow)}</span>
    <h1>${esc(data.page.h1)}</h1>
    <p class="lede">${esc(data.page.lede)}</p>
  </div>
  <div class="filters" id="filters" hidden>
    ${options
      .map(
        ([key, label, opts]) => `<div class="fgroup" role="group" aria-label="${esc(label)}"><span class="fl">${esc(label)}</span>
      <button type="button" class="chip" data-key="${key}" data-value="" aria-pressed="true">${esc(data.page.filters.all)}</button>
      ${opts.map(([v, l]) => `<button type="button" class="chip" data-key="${key}" data-value="${v}" aria-pressed="false">${esc(l)}</button>`).join('\n      ')}
    </div>`
      )
      .join('\n    ')}
  </div>
  <div class="status"><span id="count" aria-live="polite">${order.length} ${esc(data.page.count.many)}</span><button type="button" class="linkbtn" id="clear" hidden>${esc(data.page.filters.clear)}</button></div>
  <div class="grid" id="cases">
${order.map(card).join('\n')}
  </div>
  <div class="empty" id="empty" hidden>
    <p>${esc(data.page.empty)}</p>
    <a class="btn" id="empty-cta" href="${esc(data.ctaBySector.default)}">${esc(data.page.emptyCta)}</a>
  </div>
  <div class="foot"><p>${esc(data.page.footnote)}</p><p>Elevate Marketing is a trading name of EngeCo AS, org.nr 924 490 926, Norway.</p></div>
</main>
<script>
(function(){
  var ctas = ${JSON.stringify(data.ctaBySector)};
  var words = ${JSON.stringify(data.page.count)};
  var keys = ['sector','niche','market'];
  var state = {sector:'',niche:'',market:''};
  var cards = [].slice.call(document.querySelectorAll('.card'));
  var chips = [].slice.call(document.querySelectorAll('.chip'));
  var params = new URLSearchParams(location.search);
  keys.forEach(function(k){ var v = params.get(k); if (v && chips.some(function(c){return c.dataset.key===k && c.dataset.value===v;})) state[k] = v; });
  document.getElementById('filters').hidden = false;
  function match(card){
    if (state.sector && card.dataset.sector !== state.sector) return false;
    if (state.market && card.dataset.market !== state.market) return false;
    if (state.niche && card.dataset.niches.split(' ').indexOf(state.niche) < 0) return false;
    return true;
  }
  function render(){
    var n = 0;
    cards.forEach(function(c){ var ok = match(c); c.hidden = !ok; if (ok) n++; });
    var avail = {};
    cards.forEach(function(c){
      if ((!state.sector || c.dataset.sector === state.sector) && (!state.market || c.dataset.market === state.market))
        c.dataset.niches.split(' ').forEach(function(n){ avail[n] = true; });
    });
    chips.forEach(function(c){
      c.setAttribute('aria-pressed', String(state[c.dataset.key] === c.dataset.value));
      if (c.dataset.key === 'niche' && c.dataset.value) c.hidden = !avail[c.dataset.value] && state.niche !== c.dataset.value;
    });
    document.getElementById('count').textContent = n + ' ' + (n === 1 ? words.one : words.many);
    document.getElementById('empty').hidden = n > 0;
    document.getElementById('empty-cta').href = ctas[state.sector] || ctas['default'];
    var any = keys.some(function(k){ return state[k]; });
    document.getElementById('clear').hidden = !any;
    var q = new URLSearchParams();
    keys.forEach(function(k){ if (state[k]) q.set(k, state[k]); });
    var s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }
  chips.forEach(function(c){ c.addEventListener('click', function(){ state[c.dataset.key] = c.dataset.value; render(); }); });
  document.getElementById('clear').addEventListener('click', function(){ keys.forEach(function(k){ state[k]=''; }); render(); });
  render();
})();
</script>
</body>
</html>
`;

/* ------------------------------------------------------- one case, one page */

const casePageHtml = (c) => {
  const p = data.casePage;
  const back = `/cases/?sector=${sectorSlug(c)}`;
  return `${head({ title: `${c.headline} | Elevate Marketing`, description: `${c.display_name}. ${c.headline}. ${c.period}.`, canonical: c.page })}
<body>
<a class="skip" href="#main">Skip to the case</a>
${bar(`<a href="${esc(back)}">${esc(p.back)}</a>`)}
<main class="wrap" id="main">
  <div class="hero">
    <span class="eyebrow">${esc(c.sector)} · ${esc(c.market_label || c.market)} · ${esc(c.channels.join(', '))}</span>
    <h1>${esc(c.headline)}</h1>
    <p class="lede">${esc(c.display_name)}. ${esc(c.period)}.</p>
    <div class="swing">${c.metrics.map((f) => `<div class="swing-cell"><span class="figbig">${esc(f.value)}</span><span class="sub">${esc(f.label)}</span></div>`).join('')}</div>
  </div>
  <section><p>${esc(c.situation)}</p></section>
  <section><h2>${esc(p.whatWeDid)}</h2><ul class="did">${c.what_we_did.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
  <section><div class="warn"><h2>${esc(p.doesNotShow)}</h2><p>${esc(c.what_it_does_not_show)}</p></div></section>
  <section><h2>${esc(p.source)}</h2><p>${esc(c.source)}</p><p>${esc(data.page.footnote)}</p></section>
  <section class="cta"><h2>${esc(p.ctaTitle)}</h2><p>${esc(p.ctaBody)}</p><a class="btn" href="${esc(ctaFor(c))}?utm_source=cases&amp;utm_medium=site&amp;utm_content=${esc(c.slug)}">${esc(p.ctaButton)}</a><a href="${esc(back)}">${esc(p.back)}</a></section>
  <div class="foot"><p>Elevate Marketing is a trading name of EngeCo AS, org.nr 924 490 926, Norway.</p></div>
</main>
</body>
</html>
`;
};

/* ------------------------------------------------------------------- write */

if (existsSync(OUT_INDEX)) rmSync(OUT_INDEX, { recursive: true });
mkdirSync(OUT_INDEX, { recursive: true });
writeFileSync(join(OUT_INDEX, 'index.html'), indexHtml);

const generated = cases.filter((c) => c.generate_page);
for (const c of generated) {
  const dir = join(OUT_CASE, c.slug);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), casePageHtml(c));
}

console.log(`  casebank: /cases (${cases.length} cases) + ${generated.map((c) => '/case/' + c.slug).join(', ')}`);
