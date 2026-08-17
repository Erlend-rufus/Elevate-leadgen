#!/usr/bin/env node
/**
 * Case study generator.
 *
 * Reads cases/<slug>.json and writes a four page funnel to
 * public/case/<slug>/ : the case study, /apply, /booking and /thanks.
 *
 * Why static HTML: the React app is client rendered, so a route there would
 * serve an empty page to anything that does not run JavaScript. These pages
 * carry their full content in the first response, which is the precondition for
 * everything else on them working.
 *
 * IMPORTANT: this generator only removes the directories of the slugs it owns.
 * public/case/ also holds three hand written legacy pages (cruxit, ignite,
 * be-shaping) that are not generated and must survive a build.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'cases');
const OUT = join(root, 'public', 'case');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Content is trusted first-party copy and some fields carry inline <strong>. */
const raw = (s) => String(s);

/* ---------------------------------------------------------------- validate */

function validate(d, file) {
  const die = (msg) => {
    console.error(`\n  ✗ ${basename(file)}: ${msg}\n`);
    process.exit(1);
  };
  for (const k of ['slug', 'meta', 'funnel', 'hero', 'calculator', 'evidence', 'limits', 'verification', 'call'])
    if (!d[k]) die(`missing required section "${k}"`);
  if (basename(file, '.json') !== d.slug) die(`filename must match slug "${d.slug}"`);
  if (!d.funnel.typeformId) die('funnel.typeformId is required');
  if (!d.funnel.conversionEvent) die('funnel.conversionEvent is required');

  /* Commercial terms must not carry a rate or an amount. This page can be
     forwarded to anyone; percentages and prices belong in an offer to one
     named counterparty. */
  const text = JSON.stringify(d);
  const TERMS = /(commission|retainer|\bfees?\b)/gi;
  let m;
  while ((m = TERMS.exec(text))) {
    const window_ = text.slice(Math.max(0, m.index - 100), m.index + 100);
    if (/%|£\s?\d|\d\s?(percent|per cent)/i.test(window_)) {
      die(
        `a rate or an amount appears within 100 characters of "${m[0]}".\n` +
        `    Context: ...${window_.replace(/\s+/g, ' ').trim()}...\n` +
        `    Commercial terms on a forwardable page must carry no percentage and no figure.`
      );
    }
  }
}

/* --------------------------------------------------------------------- css */

const CSS = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --page:#04041C; --surface:#0B0B2E; --raised:#12123D;
  --heading:#f4f5ff; --body:#b9bbd9; --muted:#7c7ea6;
  --line:rgba(255,255,255,.08); --line-2:rgba(255,255,255,.16);
  --brand:#00a3d6;
  --grad:linear-gradient(135deg,#00a3d6,#006aba,#02009a);
  --warn-bg:rgba(252,163,17,.07); --warn-line:rgba(252,163,17,.34); --warn:#f0b455;
  --display:'Space Grotesk',system-ui,sans-serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --mono:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;
  --ease:cubic-bezier(.16,.84,.44,1);
}
*{margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--page);color:var(--body);font-family:var(--sans);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
::selection{background:var(--brand);color:#fff}
h1,h2,h3{font-family:var(--display);color:var(--heading);font-weight:600;line-height:1.14;letter-spacing:-.02em}
.mono{font-family:var(--mono)}
.grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.col{max-width:66ch}
a{color:var(--heading);text-decoration-color:rgba(255,255,255,.3);text-underline-offset:3px}
a:hover{text-decoration-color:var(--brand)}
:focus-visible{outline:2px solid var(--brand);outline-offset:3px;border-radius:4px}
.skip{position:absolute;left:-9999px;top:0;background:var(--brand);color:#fff;padding:12px 20px;z-index:99;font-size:14px}
.skip:focus{left:0}
p{margin-bottom:18px;max-width:66ch}
strong{color:var(--heading);font-weight:600}
.eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--brand);font-weight:600;display:block}
.btn{display:inline-block;background:var(--grad);color:#fff;padding:16px 32px;font-size:15.5px;font-weight:600;text-decoration:none;border-radius:8px;line-height:1;transition:transform .18s var(--ease),box-shadow .18s var(--ease);border:none;cursor:pointer;font-family:var(--sans)}
.btn:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,163,214,.28);color:#fff;text-decoration:none}
.bar{display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--line);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.hero{padding:64px 0 56px}
.hero h1{font-size:clamp(34px,5.6vw,60px);max-width:18ch;margin-top:22px;text-wrap:balance}
.hero .lede{font-size:clamp(18px,2.1vw,21px);max-width:60ch;margin-top:26px}
.swing{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:14px;overflow:hidden;margin:44px 0 0;grid-template-columns:1fr}
@media(min-width:760px){.swing{grid-template-columns:1fr 1fr 1fr}}
.swing-cell{background:var(--surface);padding:26px 24px}
.swing-cell.now{background:var(--raised)}
.swing .lbl{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:14px}
.swing .fig{font-family:var(--display);font-size:clamp(34px,5.4vw,46px);font-weight:700;line-height:1;letter-spacing:-.03em;color:var(--heading);display:block}
.swing .sub{font-size:14px;color:var(--muted);margin-top:9px;display:block}
.swing-cell.now .fig{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.swing .delta{font-family:var(--mono);font-size:13px;color:var(--brand);margin-top:12px;display:block}
.hero .cta-row{margin-top:40px;display:flex;flex-wrap:wrap;align-items:center;gap:18px 26px}
.hero .quiet{font-size:15px;color:var(--body)}
section{padding:64px 0;border-top:1px solid var(--line);scroll-margin-top:20px}
.shead{display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px}
.shead .n{font-family:var(--mono);font-size:13px;color:var(--brand)}
h2{font-size:clamp(26px,3.6vw,36px);text-wrap:balance}
section > .sub{color:var(--muted);margin:14px 0 0;max-width:66ch}
h3{font-size:20px;margin:32px 0 12px}
.calc{border:1px solid var(--line-2);border-radius:14px;background:var(--surface);overflow:hidden;margin:34px 0 0}
.calc-head{padding:18px 24px;border-bottom:1px solid var(--line);background:var(--raised)}
.calc-head .t{font-family:var(--display);font-size:19px;color:var(--heading);font-weight:600;display:block}
.calc-head .s{font-size:13.5px;color:var(--muted);margin-top:6px;display:block}
.calc-body{padding:24px;display:grid;gap:26px}
@media(min-width:820px){.calc-body{grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:40px}}
.field{margin-bottom:22px}
.field:last-child{margin-bottom:0}
.field label{display:block;font-size:13.5px;color:var(--body);margin-bottom:9px;font-weight:500}
.field .row{display:flex;align-items:center;gap:10px}
.field .pfx{font-family:var(--mono);font-size:15px;color:var(--muted)}
.field input[type=number]{flex:1;min-width:0;background:var(--page);border:1px solid var(--line-2);border-radius:8px;color:var(--heading);font-family:var(--mono);font-size:16px;padding:11px 13px}
.field input[type=range]{width:100%;accent-color:var(--brand);margin-top:4px}
.field .rangeval{font-family:var(--mono);font-size:14px;color:var(--brand);min-width:44px;text-align:right}
.field .hint{font-size:12.5px;color:var(--muted);margin-top:7px;max-width:none}
.out{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:11px;overflow:hidden;align-content:start;align-self:start;grid-template-columns:1fr}
@media(min-width:480px){.out{grid-template-columns:1fr 1fr}}
.out-cell{background:var(--raised);padding:20px}
.out-cell.wide{grid-column:1/-1;background:var(--surface)}
.out .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:10px}
.out .v{font-family:var(--display);font-size:clamp(26px,4vw,34px);font-weight:700;line-height:1;color:var(--heading);display:block;font-variant-numeric:tabular-nums}
.out-cell.wide .v{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.out .n{font-size:13px;color:var(--muted);margin-top:9px;display:block}
.calc-note{padding:16px 24px;border-top:1px solid var(--line);font-size:13.5px;color:var(--muted);line-height:1.6;background:var(--page);max-width:none}
.calc-note strong{color:var(--warn)}
.ex{border:1px solid var(--line);border-radius:12px;background:var(--surface);margin:30px 0;overflow:hidden}
.ex-cap{padding:12px 18px;border-bottom:1px solid var(--line);background:var(--raised);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ex-cap span:first-child{color:var(--brand);font-weight:600}
.ex-body{padding:18px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.ex-note{padding:14px 18px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);line-height:1.6;max-width:none}
table{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:13px;font-variant-numeric:tabular-nums;min-width:520px}
caption{text-align:left;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:0 0 12px;font-family:var(--sans)}
th,td{padding:10px;text-align:right;color:var(--body)}
th:first-child,td:first-child{text-align:left}
thead th{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line-2);font-weight:500;font-family:var(--sans);vertical-align:bottom}
tbody th[scope=row]{color:var(--heading);font-weight:500;white-space:nowrap}
tbody td{white-space:nowrap}
tbody tr{border-bottom:1px solid var(--line)}
tbody tr:hover{background:rgba(255,255,255,.03)}
tfoot th,tfoot td{border-top:1px solid var(--line-2);color:var(--heading);font-weight:500}
.caution{border:1px solid var(--warn-line);border-radius:12px;background:var(--warn-bg);overflow:hidden;margin:30px 0}
.caution-strip{background:rgba(252,163,17,.14);color:var(--warn);padding:11px 20px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;border-bottom:1px solid var(--warn-line);font-weight:600}
.caution-body{padding:22px 24px}
.caution-body p:last-child{margin-bottom:0}
.caution-body ul{margin:0 0 18px 1.25em}
.caution-body li{margin-bottom:10px}
.limits{display:grid;gap:14px;margin:30px 0 0}
@media(min-width:760px){.limits{grid-template-columns:1fr 1fr}}
.limit{border:1px solid var(--line);border-radius:11px;background:var(--surface);padding:20px 22px}
.limit h3{font-size:16.5px;font-family:var(--sans);font-weight:600;margin:0 0 9px}
.limit p{font-size:14.5px;margin:0;color:var(--muted)}
ol.steps{list-style:none;margin:30px 0 0;padding:0;counter-reset:s}
ol.steps li{counter-increment:s;display:grid;grid-template-columns:36px 1fr;gap:18px;padding:20px 0;border-top:1px solid var(--line)}
ol.steps li:first-child{border-top:none;padding-top:4px}
ol.steps li::before{content:counter(s);width:34px;height:34px;border-radius:50%;background:var(--raised);border:1px solid var(--line-2);color:var(--brand);font-family:var(--mono);font-size:14px;display:flex;align-items:center;justify-content:center}
ul.tl{list-style:none;margin:28px 0;padding:0 0 0 26px;position:relative}
ul.tl::before{content:'';position:absolute;left:5px;top:8px;bottom:8px;width:1px;background:var(--line-2)}
ul.tl li{position:relative;padding-bottom:20px;max-width:64ch}
ul.tl li:last-child{padding-bottom:0}
ul.tl li::before{content:'';position:absolute;left:-26px;top:8px;width:11px;height:11px;border-radius:50%;background:var(--brand)}
.tl .d{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);margin-bottom:4px}
ul.ver{list-style:none;margin:28px 0 0;padding:0;display:flex;flex-direction:column;gap:14px}
ul.ver li{border:1px solid var(--line);border-radius:11px;padding:18px 20px;background:var(--surface);display:flex;flex-direction:column;gap:7px}
.src{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:600}
.url{font-size:12.5px;word-break:break-all;font-family:var(--mono)}
.final .btn{margin-top:10px}
.smallprint{margin-top:22px;font-size:13.5px;color:var(--muted);max-width:62ch}
footer{border-top:1px solid var(--line);padding:26px 0 60px;font-size:12.5px;color:var(--muted)}
footer div{display:flex;flex-direction:column;gap:7px}
@media(max-width:640px){
  body{font-size:16px}
  section{padding:48px 0}
  .hero{padding:44px 0 40px}
  .calc-body{padding:18px}
  .ex-body{padding:14px}
}
.js .rv{opacity:0;transform:translateY(28px)}
.js .rv.in{opacity:1;transform:none;transition:opacity .6s var(--ease),transform .6s var(--ease)}
@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .js .rv{opacity:1!important;transform:none!important;transition:none!important}
  .btn:hover{transform:none}
}
@media print{
  .btn,.skip{display:none!important}
  .js .rv{opacity:1!important;transform:none!important}
  body{background:#fff!important;color:#1a1d24!important;font-size:10.5pt}
  h1,h2,h3,strong,tbody th[scope=row]{color:#04041C!important}
  .grad,.swing-cell.now .fig,.out-cell.wide .v{background:none!important;color:#04041C!important;-webkit-text-fill-color:#04041C}
  .ex,.calc,.caution,.limit,ul.ver li,.swing-cell{background:#fff!important;border-color:#d8dbe2!important}
  .ex-cap,.calc-head,.out-cell{background:#f4f6f9!important}
  .eyebrow,.src,.shead .n,.ex-cap span:first-child,.tl .d{color:#7A4A00!important}
  p,li,td,th,.sub,.ex-note,.calc-note,.smallprint,footer{color:#1a1d24!important}
  section,.ex,.calc,.caution,table,.swing{page-break-inside:avoid}
  a[href^="http"]::after{content:' (' attr(href) ')';font-size:8pt}
}
/* funnel pages */
.funnel{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column}
.funnel-head{padding:22px 0;border-bottom:1px solid var(--line)}
.funnel-head .wrap{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}
.funnel-logo{font-family:var(--display);font-size:17px;font-weight:600;color:var(--heading);text-decoration:none;letter-spacing:-.01em}
.funnel-step{font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.funnel-main{flex:1 1 auto;display:flex;flex-direction:column}

/* Typeform host.
   The page is locked to the viewport so the form fills whatever is left below
   the intro: no dead band underneath, and no page scroll competing with the
   form's own. The height chain has to stay definite the whole way down, because
   the embed sizes its iframe to 100% of this element and a percentage height
   against an indefinite parent resolves to nothing.
   The width is capped and centred with justify-content, never with auto
   margins: auto cross-axis margins cancel flex stretch, which is what once
   collapsed this element to zero width and made Typeform fall back to a small
   card. Edge to edge also looks wrong on a wide screen, because Typeform
   centres its own narrow column and the rest is bare white. */
body.apply{height:100vh;height:100dvh;overflow:hidden}
body.apply .funnel{height:100%}
body.apply .funnel-main{flex:1 1 auto;min-height:0}
.apply-intro{padding:22px 0 16px;flex:0 0 auto}
.apply-intro h1{font-size:clamp(22px,2.6vw,28px);max-width:26ch}
.apply-intro p{color:var(--muted);margin:8px 0 0;font-size:15px}
.tf-host{flex:1 1 auto;min-height:0;display:flex;justify-content:center;padding:0 24px 24px}
/* No border and no light fallback: the form carries the site's own dark theme,
   so any frame reads as a seam and a white fallback flashes on load. The
   background matches the page so the host is invisible behind the iframe. */
.tf-host #tf{width:100%;max-width:980px;height:100%;min-height:420px;
  overflow:hidden;border:none;background:var(--page)}
/* Typeform injects its iframe with an inline height that does not fill the host,
   which left a band of the host's own white background below the form. The
   iframe element itself is styleable from here even though its document is not,
   and !important is required because the inline style would otherwise win. */
.tf-host #tf iframe{width:100%!important;height:100%!important;border:0!important;display:block}
@media(max-width:640px){
  .apply-intro{padding:16px 0 12px}
  .tf-host{padding:0 14px 14px}
  .tf-host #tf{border-radius:0}
}
.funnel-mid{padding:56px 0 72px}
.funnel-mid h1{font-size:clamp(28px,4.4vw,42px);max-width:20ch;margin-bottom:20px;text-wrap:balance}
.cal-wrap{margin-top:34px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface);min-height:700px}
.noscript-note{border:1px solid var(--warn-line);background:var(--warn-bg);color:var(--warn);border-radius:10px;padding:16px 20px;margin-top:24px;font-size:14.5px;max-width:none}
`;

/* ---------------------------------------------------------- shared runtime */

/** Carried through every hop of the funnel. */
const PARAM_JS = `
var UTM = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
function newLeadId(){
  try { if (crypto && crypto.randomUUID) return 'l_' + crypto.randomUUID().replace(/-/g,'').slice(0,20); } catch(e){}
  return 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2,10);
}
function readParams(){
  var q = new URLSearchParams(location.search), out = {};
  UTM.concat(['fbclid','lead_id','calc_acv','calc_close_rate','calc_requests_wanted','src'])
    .forEach(function(k){ var v = q.get(k); if (v) out[k] = v; });
  return out;
}
function store(o){ try { sessionStorage.setItem('elevate:funnel', JSON.stringify(o)); } catch(e){} }
function restore(){ try { return JSON.parse(sessionStorage.getItem('elevate:funnel') || '{}'); } catch(e){ return {}; } }
/** URL wins, session fills gaps, lead_id is minted if still absent.
 *  markDirect is set only on /apply: arriving there without a lead_id means the
 *  visitor skipped the landing page, via a shared link or a direct hit, and that
 *  is worth recording. Minting one on the landing page is the normal path and
 *  must not be labelled direct, or every ad click would be. */
function funnelState(markDirect){
  var s = restore(), p = readParams(), out = {};
  Object.keys(s).forEach(function(k){ out[k] = s[k]; });
  Object.keys(p).forEach(function(k){ out[k] = p[k]; });
  if (!out.lead_id) {
    out.lead_id = newLeadId();
    if (markDirect && !out.utm_source && !out.fbclid) out.src = 'direct';
  }
  store(out);
  return out;
}
function toQuery(o){
  var q = new URLSearchParams();
  Object.keys(o).forEach(function(k){ if (o[k] !== '' && o[k] != null) q.set(k, o[k]); });
  return q.toString();
}`;

const REVEAL_JS = `
(function(){
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(!e.isIntersecting) return; io.unobserve(e.target); e.target.classList.add('in'); });
  },{rootMargin:'0px 0px -8% 0px',threshold:.1});
  document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
})();`;

/* ------------------------------------------------------------------ layout */

function head(d, { title, description, noindex, canonicalPath, bodyClass }) {
  const url = `https://getelevateleads.com/case/${d.slug}${canonicalPath || ''}`;
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
${noindex ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${url}">`}
${noindex ? '' : `<meta property="og:title" content="${esc(d.meta.ogTitle)}">
<meta property="og:description" content="${esc(d.meta.ogDescription)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Elevate Marketing">
<meta name="twitter:card" content="summary_large_image">`}
<meta name="theme-color" content="#04041C">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<!-- og:image omitted while public/og-image.jpg still carries a growwithelevate.eu badge. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
<script>document.documentElement.className+=' js';</script>`;
}

/* Consent-gated pixel. Loaded on every funnel page; nothing fires before accept. */
const CONSENT_TAG = '<script src="/js/consent.js" data-pixel="1466790598245604"></script>';

/* ------------------------------------------------------------- case study */

function renderCase(d) {
  const c = d.calculator;
  const def = c.defaults;
  const perClient = c.costPerRequest / (def.closeRate / 100);
  const spend = def.requests * c.costPerRequest;
  const clients = def.requests * (def.closeRate / 100);
  const pct = (perClient / def.contractValue) * 100;
  const money = (n) => '£' + Math.round(n).toLocaleString('en-GB');

  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  const exhibit = (x) => `      <div class="ex rv">
        <div class="ex-cap"><span>${esc(x.label)}</span><span>${esc(x.caption)}</span></div>
        <div class="ex-body">
          <table>
            <caption>${esc(x.tableCaption)}</caption>
            <thead><tr>${x.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
            <tbody>
${x.rows.map((r) => `              <tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('\n')}
            </tbody>
${x.foot ? `            <tfoot><tr><th scope="row">${esc(x.foot[0])}</th>${x.foot.slice(1).map((v) => `<td>${esc(v)}</td>`).join('')}</tr></tfoot>\n` : ''}          </table>
        </div>
        <p class="ex-note">${esc(x.note)}</p>
      </div>`;

  return `${head(d, { title: d.meta.title, description: d.meta.description })}
${CONSENT_TAG}

<div class="wrap">
  <div class="bar mono">${d.bar.map((b) => `<span>${esc(b)}</span>`).join('')}</div>

  <header class="hero">
    <span class="eyebrow rv">${esc(d.hero.eyebrow)}</span>
    <h1 class="rv">${esc(d.hero.h1Before)}<span class="grad">${esc(d.hero.h1Keyword)}</span></h1>
    <p class="lede rv">${esc(d.hero.lede)}</p>
    <div class="swing rv">
${d.hero.swing.map((s) => `      <div class="swing-cell${s.highlight ? ' now' : ''}">
        <span class="lbl">${esc(s.label)}</span>
        <span class="fig">${esc(s.figure)}</span>
        <span class="sub">${esc(s.sub)}</span>
${s.delta ? `        <span class="delta">${esc(s.delta)}</span>\n` : ''}      </div>`).join('\n')}
    </div>
    <div class="cta-row rv">
      <a class="btn js-cta" href="/case/${d.slug}/apply">${esc(d.hero.cta)}</a>
      <a class="quiet" href="#evidence">${esc(d.hero.ctaQuiet)}</a>
    </div>
  </header>

  <main id="main">

    <section id="yours">
      <div class="shead"><span class="n mono">${num()}</span><h2 class="rv">${esc(c.title)}</h2></div>
      <p class="sub rv">${esc(c.sub)}</p>
      <div class="calc rv">
        <div class="calc-head">
          <span class="t">${esc(c.cardTitle)}</span>
          <span class="s">${esc(c.cardSub)}</span>
        </div>
        <div class="calc-body">
          <div>
            <div class="field">
              <label for="cv">${esc(c.fields.contractValue.label)}</label>
              <div class="row"><span class="pfx">£</span>
                <input type="number" id="cv" value="${def.contractValue}" min="500" max="500000" step="500" inputmode="numeric"></div>
              <p class="hint">${esc(c.fields.contractValue.hint)}</p>
            </div>
            <div class="field">
              <label for="cr">${esc(c.fields.closeRate.label)}</label>
              <div class="row"><input type="range" id="cr" value="${def.closeRate}" min="5" max="70" step="5">
                <span class="rangeval mono" id="crv">${def.closeRate}%</span></div>
              <p class="hint">${esc(c.fields.closeRate.hint)}</p>
            </div>
            <div class="field">
              <label for="qr">${esc(c.fields.requests.label)}</label>
              <div class="row"><input type="number" id="qr" value="${def.requests}" min="1" max="200" step="1" inputmode="numeric"></div>
              <p class="hint">${esc(c.fields.requests.hint)}</p>
            </div>
          </div>
          <div class="out">
            <div class="out-cell"><span class="k">${esc(c.outputs.spend.key)}</span>
              <span class="v" id="o-spend">${money(spend)}</span>
              <span class="n">${esc(c.outputs.spend.note)}</span></div>
            <div class="out-cell"><span class="k">${esc(c.outputs.clients.key)}</span>
              <span class="v" id="o-clients">${clients.toFixed(1)}</span>
              <span class="n">${esc(c.outputs.clients.note)}</span></div>
            <div class="out-cell wide"><span class="k">${esc(c.outputs.perClient.key)}</span>
              <span class="v" id="o-cpc">${money(perClient)}</span>
              <span class="n" id="o-pct">${pct.toFixed(2)}% of a ${money(def.contractValue)} contract</span></div>
          </div>
        </div>
        <p class="calc-note"><strong>This is arithmetic, not a forecast.</strong> ${esc(c.note.replace('This is arithmetic, not a forecast. ', ''))}</p>
      </div>
    </section>

${d.sections.map((s) => `    <section id="${esc(s.id)}">
      <div class="shead"><span class="n mono">${num()}</span><h2 class="rv">${esc(s.title)}</h2></div>
      <p class="sub rv">${esc(s.sub)}</p>
${s.body ? `      <div class="col">\n${s.body.map((p) => `        <p class="rv">${raw(p)}</p>`).join('\n')}\n      </div>\n` : ''}${s.steps ? `      <ol class="steps">\n${s.steps.map((t) => `        <li class="rv"><div>${raw(t)}</div></li>`).join('\n')}\n      </ol>\n` : ''}${s.caution ? `      <div class="caution rv">
        <div class="caution-strip">${esc(s.caution.strip)}</div>
        <div class="caution-body">
${s.caution.body.map((p) => `          <p>${raw(p)}</p>`).join('\n')}
        </div>
      </div>\n` : ''}    </section>`).join('\n\n')}

    <section id="evidence">
      <div class="shead"><span class="n mono">${num()}</span><h2 class="rv">${esc(d.evidence.title)}</h2></div>
      <p class="sub rv">${esc(d.evidence.sub)}</p>
${d.evidence.exhibits.map(exhibit).join('\n\n')}
    </section>

    <section id="limits">
      <div class="shead"><span class="n mono">${num()}</span><h2 class="rv">${esc(d.limits.title)}</h2></div>
      <p class="sub rv">${esc(d.limits.sub)}</p>
      <div class="caution rv">
        <div class="caution-strip">${esc(d.limits.supplied.strip)}</div>
        <div class="caution-body">
          <p>${esc(d.limits.supplied.intro)}</p>
          <ul>${d.limits.supplied.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          <p>${esc(d.limits.supplied.close)}</p>
        </div>
      </div>
      <div class="limits">
${d.limits.cards.map((c2) => `        <div class="limit rv"><h3>${esc(c2.title)}</h3><p>${esc(c2.body)}</p></div>`).join('\n')}
      </div>
      <ul class="tl rv">
${d.limits.timeline.map((t) => `        <li><span class="d">${esc(t.date)}</span>${esc(t.text)}</li>`).join('\n')}
      </ul>
    </section>

    <section id="verification">
      <div class="shead"><span class="n mono">${num()}</span><h2 class="rv">${esc(d.verification.title)}</h2></div>
      <p class="sub rv">${esc(d.verification.sub)}</p>
      <ul class="ver">
${d.verification.sources.map((s) => `        <li class="rv">
          <span class="src">${esc(s.label)}</span>
          <span>${esc(s.text)}</span>
          <a class="url" href="${esc(s.url)}" rel="noopener noreferrer" target="_blank">${esc(s.display)}</a>
        </li>`).join('\n')}
      </ul>
      <p class="rv" style="margin-top:24px">${esc(d.verification.close)}</p>
    </section>

    <section id="call" class="final">
      <div class="shead"><span class="n mono">${num()}</span><h2 class="rv">${esc(d.call.title)}</h2></div>
      <div class="col">
${d.call.body.map((p) => `        <p class="rv">${esc(p)}</p>`).join('\n')}
      </div>
      <a class="btn rv js-cta" href="/case/${d.slug}/apply">${esc(d.call.cta)}</a>
      <p class="smallprint rv">${esc(d.call.smallprint)}</p>
    </section>

  </main>

  <footer><div>${d.footer.map((f) => `<span>${esc(f)}</span>`).join('')}</div></footer>
</div>

<script>
${PARAM_JS}
${REVEAL_JS}

/* Calculator. Renders its worked default in the markup above, so this only
   updates it; the page reads complete with JavaScript off. */
(function () {
  var COST_PER_REQUEST = ${c.costPerRequest};
  var cv = document.getElementById('cv'), cr = document.getElementById('cr'), qr = document.getElementById('qr');
  if (!cv || !cr || !qr) return;
  var crv = document.getElementById('crv');
  var oSpend = document.getElementById('o-spend'), oClients = document.getElementById('o-clients');
  var oCpc = document.getElementById('o-cpc'), oPct = document.getElementById('o-pct');
  var touched = false;
  var money = function (n) { return '£' + Math.round(n).toLocaleString('en-GB'); };

  window.__calcValues = function () {
    if (!touched) return {};
    return {
      calc_acv: String(Math.max(500, Math.min(500000, Number(cv.value) || 0))),
      calc_close_rate: String(Number(cr.value)),
      calc_requests_wanted: String(Math.max(1, Math.min(200, Number(qr.value) || 0)))
    };
  };

  function update() {
    var contract = Math.max(500, Math.min(500000, Number(cv.value) || 0));
    var rate = Number(cr.value) / 100;
    var requests = Math.max(1, Math.min(200, Number(qr.value) || 0));
    var perClient = COST_PER_REQUEST / rate;
    crv.textContent = Math.round(rate * 100) + '%';
    oSpend.textContent = money(requests * COST_PER_REQUEST);
    oClients.textContent = (requests * rate).toFixed(1);
    oCpc.textContent = money(perClient);
    oPct.textContent = ((perClient / contract) * 100).toFixed(2) + '% of a ' + money(contract) + ' contract';
  }
  ['input','change'].forEach(function (ev) {
    [cv, cr, qr].forEach(function (el) {
      el.addEventListener(ev, function () { touched = true; update(); });
    });
  });
  update();
})();

/* Carry attribution and, if the reader used it, the calculator values to /apply.
   Without JavaScript the CTA is a plain link and the fields arrive empty, which
   is the documented behaviour. */
(function () {
  var state = funnelState();
  document.querySelectorAll('a.js-cta').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var payload = {};
      Object.keys(state).forEach(function (k) { payload[k] = state[k]; });
      var calc = window.__calcValues ? window.__calcValues() : {};
      Object.keys(calc).forEach(function (k) { payload[k] = calc[k]; });
      location.href = a.getAttribute('href') + '?' + toQuery(payload);
    });
  });
})();
</script>
</body>
</html>
`;
}

/* ----------------------------------------------------------------- /apply */

function renderApply(d) {
  const f = d.funnel;
  const fit = JSON.stringify(f.endings.fit || []);
  return `${head(d, { title: d.apply.title, noindex: true, bodyClass: 'apply' })}
${CONSENT_TAG}

<div class="funnel">
  <header class="funnel-head"><div class="wrap">
    <span class="funnel-logo">Elevate Marketing</span>
    <span class="funnel-step">Qualification &middot; 2 minutes</span>
  </div></header>

  <main class="funnel-main" id="main">
    <div class="apply-intro"><div class="wrap">
      <h1>${esc(d.apply.heading)}</h1>
      <p>${esc(d.apply.sub)}</p>
    </div></div>
    <div class="tf-host">
      <div id="tf" data-tf-live="${esc(f.typeformId)}"></div>
    </div>
    <noscript>
      <div class="wrap"><p class="noscript-note">This form needs JavaScript. If it does not
      appear, email hello@getelevateleads.com and we will send the questions by reply.</p></div>
    </noscript>
  </main>
</div>

<script>
${PARAM_JS}

(function () {
  var FIT_ENDINGS = ${fit};
  var BASE = '/case/${d.slug}';
  var state = funnelState(true);

  /* Hidden fields are built from the URL this page was called with, never
     hardcoded. Untouched calculator fields simply arrive empty. */
  var hidden = [];
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid',
   'lead_id','calc_acv','calc_close_rate','calc_requests_wanted','src'].forEach(function (k) {
    hidden.push(k + '=' + encodeURIComponent(state[k] || ''));
  });

  var el = document.getElementById('tf');
  el.setAttribute('data-tf-hidden', hidden.join(','));
  el.setAttribute('data-tf-medium', 'apply-embed');
  el.setAttribute('data-tf-on-submit', 'elevateTfSubmit');
  el.setAttribute('data-tf-on-ending-button-click', 'elevateTfEnding');
  window.__elevateFunnelState = state;

  function go(path) {
    var q = toQuery(state);
    /* Break out of the embed iframe. Without this the thank-you page loads
       inside Typeform: the conversion fires cross-origin with the wrong
       referrer, the address bar still shows /apply, and Calendly ends up
       nested two frames deep. */
    try { window.top.location.href = path + (q ? '?' + q : ''); }
    catch (e) { window.location.href = path + (q ? '?' + q : ''); }
  }

  function route(ref) {
    /* Unknown endings go to /thanks. Showing a calendar to a lead we cannot
       confirm as qualified is the exact failure this funnel exists to prevent,
       so the safe default is the one that does not fire the conversion. */
    var isFit = ref && FIT_ENDINGS.indexOf(String(ref)) !== -1;
    go(BASE + (isFit ? '/booking' : '/thanks'));
  }

  /* Logged so the ending reference can be read off a real submission: open the
     console, submit once, and copy the ref into funnel.endings.fit. Typeform
     does not surface it anywhere else that is easy to reach. */
  function log(where, payload) {
    try { console.info('[elevate] typeform ' + where, payload); } catch (e) {}
  }

  window.elevateTfEnding = function (payload) {
    log('ending-button-click', payload);
    route(payload && (payload.ref || payload.endingRef));
  };
  window.elevateTfSubmit = function (payload) {
    log('submit', payload);
    route(payload && (payload.ref || payload.endingRef));
  };

  /* Fallback for embed builds that post a message instead of invoking the
     named callbacks. Same routing, same safe default. */
  window.addEventListener('message', function (e) {
    if (!/typeform\\.com$/.test(String(e.origin).replace(/^https?:\\/\\//, '').split('/')[0] || '')) return;
    var t = e.data && (e.data.type || e.data.event);
    if (t === 'form-submit' || t === 'form-ready-to-redirect' || t === 'thank-you-screen-button-click') {
      log('message:' + t, e.data);
      route(e.data.ref || (e.data.data && e.data.data.ref));
    }
  });

  var s = document.createElement('script');
  s.src = '//embed.typeform.com/next/embed.js';
  s.async = true;
  document.body.appendChild(s);
})();
</script>
</body>
</html>
`;
}

/* --------------------------------------------------------------- /booking */

function renderBooking(d) {
  const f = d.funnel;
  return `${head(d, { title: d.booking.title, noindex: true })}
${CONSENT_TAG}

<div class="funnel">
  <header class="funnel-head"><div class="wrap">
    <a class="funnel-logo" href="/case/${d.slug}">Elevate Marketing</a>
  </div></header>

  <main class="funnel-main funnel-mid" id="main"><div class="wrap">
    <span class="eyebrow">Qualified</span>
    <h1 style="margin-top:16px">${esc(d.booking.heading)}</h1>
${d.booking.body.map((p) => `    <p>${esc(p)}</p>`).join('\n')}
    <div class="cal-wrap">
      <div class="calendly-inline-widget" data-url="${esc(f.calendlyUrl)}?hide_gdpr_banner=1&primary_color=00a3d6" style="min-width:320px;height:700px"></div>
    </div>
    <noscript>
      <p class="noscript-note">The calendar needs JavaScript. Email
      hello@getelevateleads.com and we will send you times by reply.</p>
    </noscript>
  </div></main>
</div>

<script>
${PARAM_JS}

(function () {
  var state = funnelState();

  /* The conversion. This is the only place in the funnel it fires: not on a CTA
     click, not on form submit, and never on /thanks. Queued until consent, and
     dropped entirely if the visitor declined. */
  if (window.ElevateConsent) {
    window.ElevateConsent.track('${esc(f.conversionEvent)}', {
      lead_id: state.lead_id || '',
      utm_source: state.utm_source || '',
      utm_campaign: state.utm_campaign || ''
    });
  }

  /* Prefill Calendly with what we already know, so the booker does not retype it. */
  var w = document.querySelector('.calendly-inline-widget');
  if (w) {
    var u = w.getAttribute('data-url');
    var extra = new URLSearchParams();
    if (state.lead_id) extra.set('utm_content', state.lead_id);
    if (state.utm_source) extra.set('utm_source', state.utm_source);
    if (state.utm_campaign) extra.set('utm_campaign', state.utm_campaign);
    if (state.utm_medium) extra.set('utm_medium', state.utm_medium);
    var q = extra.toString();
    if (q) w.setAttribute('data-url', u + '&' + q);
  }

  var s = document.createElement('script');
  s.src = 'https://assets.calendly.com/assets/external/widget.js';
  s.async = true;
  document.body.appendChild(s);
})();
</script>
</body>
</html>
`;
}

/* ---------------------------------------------------------------- /thanks */

function renderThanks(d) {
  return `${head(d, { title: d.thanks.title, noindex: true })}
${CONSENT_TAG}

<div class="funnel">
  <header class="funnel-head"><div class="wrap">
    <a class="funnel-logo" href="/case/${d.slug}">Elevate Marketing</a>
  </div></header>

  <main class="funnel-main funnel-mid" id="main"><div class="wrap">
    <h1>${esc(d.thanks.heading)}</h1>
    <div class="col">
${d.thanks.body.map((p) => `      <p>${esc(p)}</p>`).join('\n')}
    </div>
    <p class="smallprint">${esc(d.thanks.close)}</p>
  </div></main>
</div>

<script>
${PARAM_JS}
/* No conversion here, deliberately. This visitor did not qualify, and firing
   anything would teach the campaign to find more people like them. */
funnelState();
</script>
</body>
</html>
`;
}

/* -------------------------------------------------------------------- main */

if (!existsSync(SRC)) {
  console.log('  cases: no cases/ directory, nothing to build');
  process.exit(0);
}
const files = readdirSync(SRC).filter((f) => f.endsWith('.json'));
if (!files.length) {
  console.log('  cases: no case data files, nothing to build');
  process.exit(0);
}

let warned = false;

for (const f of files) {
  const file = join(SRC, f);
  let d;
  try {
    d = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`\n  ✗ ${f}: invalid JSON — ${e.message}\n`);
    process.exit(1);
  }
  validate(d, file);

  const dir = join(OUT, d.slug);
  rmSync(dir, { recursive: true, force: true }); // only this slug, never all of public/case
  mkdirSync(join(dir, 'apply'), { recursive: true });
  mkdirSync(join(dir, 'booking'), { recursive: true });
  mkdirSync(join(dir, 'thanks'), { recursive: true });

  writeFileSync(join(dir, 'index.html'), renderCase(d));
  writeFileSync(join(dir, 'apply', 'index.html'), renderApply(d));
  writeFileSync(join(dir, 'booking', 'index.html'), renderBooking(d));
  writeFileSync(join(dir, 'thanks', 'index.html'), renderThanks(d));

  console.log(`  cases: /case/${d.slug} + /apply /booking /thanks`);

  if (!(d.funnel.endings.fit || []).length) {
    warned = true;
    console.log(`    ⚠ funnel.endings.fit is empty in cases/${d.slug}.json.`);
    console.log('      Every Typeform ending will route to /thanks, so nobody reaches the');
    console.log('      calendar and the conversion never fires. Add the qualified ending');
    console.log('      ref(s) from the form before running ads at this page.');
  }
}

if (warned) console.log('\n  ⚠ A funnel is missing its qualified ending ref (listed above).');
