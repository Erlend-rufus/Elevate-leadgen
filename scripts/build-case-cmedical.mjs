#!/usr/bin/env node
/**
 * Builds the named C-Medical case study at public/case/c-medical/index.html from
 * content/c-medical.json. Static on purpose, like the other case pages: every figure
 * is in the first HTML response and readable with JavaScript off. JavaScript only
 * adds the motion (the hero reveal, the counters, the sticky chapter frame, the
 * reveals) and the cookie question.
 *
 * Design: the paper and ink system of /g/uk-private-hospitals (Fraunces and Geist,
 * self-hosted under /g/_assets/fonts), because this page is the case that funnel
 * cites and links to. Motion is ported from BYQ Supply (stringer-hero-8,
 * sticky-media-swap-01, odometer-counter-01, stringer-structured-data-1) to plain
 * CSS and the Web Animations API, timings kept. Every animation has a resolved
 * static state under prefers-reduced-motion.
 *
 * The build fails on an em dash, an exclamation mark, an American spelling from the
 * short list below, or a percentage near the word "commission".
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'content', 'c-medical.json');
const OUT_DIR = join(root, 'public', 'case', 'c-medical');
const SITE = 'https://getelevateleads.com';

const d = JSON.parse(readFileSync(SRC, 'utf8'));
const F = d.figures;

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v, dec = 0) => Number(v).toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const gbp = (nok) => '£' + n(Math.round(nok / F.rate));
const nok = (v) => 'NOK ' + n(Math.round(v));
const pct = (a, b, dec = 1) => {
  const p = ((b - a) / a) * 100;
  return (p >= 0 ? '+' : '') + p.toFixed(dec) + '%';
};
const pctAbs = (a, b, dec = 0) => Math.abs(((b - a) / a) * 100).toFixed(dec) + '%';

/* ------------------------------------------------------------------ checks */
function die(m) { console.error('build-case-cmedical: ' + m); process.exit(1); }
function checkText(label, text) {
  if (/[—–]/.test(text)) die(`${label}: contains a dash (use a comma or a full stop)`);
  if (/!/.test(text)) die(`${label}: contains an exclamation mark`);
  const us = /\b(optimiz\w*|analyz\w*|color|center|favorite|program\b|specializ\w*|organiz\w*|behavior|catalog\b)\b/i.exec(text);
  if (us) die(`${label}: American spelling "${us[0]}"`);
  const m = /commission[^.]{0,80}/gi;
  let hit;
  while ((hit = m.exec(text))) if (/\d\s?%|\d\s?(per cent|percent)/i.test(hit[0])) die(`${label}: a rate appears near "commission"`);
}
checkText('content/c-medical.json', JSON.stringify(d).replace(/\\u2014|\\u2013/g, '—'));

/* --------------------------------------------------------------- derived */
const site = F.site, ads = F.ads, seo = F.seo, ai = F.ai;
const rate2025 = (site.b2025 / site.s2025) * 100, rate2026 = (site.b2026 / site.s2026) * 100;
const perB2025 = ads.spend2025 / ads.b2025, perB2026 = ads.spend2026 / ads.b2026;
const A = F.assumptions;
const attended = ads.b2026 * A.attendance;
const consultRev = attended * A.consultationNok;
const procLow = attended * A.procedureShareLow * A.procedureNok;
const procHigh = attended * A.procedureShareHigh * A.procedureNok;
const roasConsult = consultRev / ads.spend2026;
const roasLow = (consultRev + procLow) / ads.spend2026;
const roasHigh = (consultRev + procHigh) / ads.spend2026;
const nr = F.noReception;
const nrAttended = nr.b2026 * A.attendance;
const roasNrLow = (nrAttended * A.consultationNok + nrAttended * A.procedureShareLow * A.procedureNok) / nr.spend2026;
const spendPerAttended = ads.spend2026 / attended;

const beyondValues = [
  n(Math.round(attended)),
  nok(spendPerAttended) + ' (' + gbp(spendPerAttended) + ')',
  roasConsult.toFixed(1) + 'x',
  Math.round(roasLow) + 'x',
  Math.round(roasNrLow) + 'x',
  Math.round(roasHigh) + 'x',
];

/* ------------------------------------------------------------------- CSS */
const CSS = `
@font-face{font-family:Fraunces;src:url(/g/_assets/fonts/fraunces-v1.woff2) format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:Geist;src:url(/g/_assets/fonts/geist-v1.woff2) format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
:root{
--paper:#F7F5F0;--paper-dark:#EFEDE7;--white:#FFFFFF;--hairline:#CFCBC0;--hairline-soft:#E3E0D8;--field-border:#8B909C;
--ink:#10141C;--ink-hover:#2A3140;--muted:#4A5162;--navy:#0A1628;--mark-off:#D9D5CB;
--font-display:Fraunces,"Iowan Old Style",Georgia,serif;--font-body:Geist,"Geist Sans",system-ui,sans-serif;
--gutter:clamp(24px,5vw,64px);--container:1200px;--section-y:clamp(64px,8vw,120px);
--fs-h1:clamp(40px,6vw,88px);--fs-h2:clamp(30px,3.4vw,52px);--fs-lead:clamp(18px,1.45vw,21px);--fs-body:clamp(17px,1.25vw,19px);
--fs-stat:clamp(56px,8vw,120px);--fs-chapter:clamp(34px,4.4vw,64px);
--radius-card:4px;--radius-button:2px;--ease-out:cubic-bezier(.16,1,.3,1);--ease-inout:cubic-bezier(.76,0,.24,1);
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-body);font-size:var(--fs-body);line-height:1.55;font-feature-settings:"ss01","tnum"}
img{display:block;max-width:100%}
a{color:inherit}
.skip{position:absolute;left:-999px;top:8px;background:var(--ink);color:#fff;padding:8px 12px;z-index:100}
.skip:focus{left:8px}
.wrap{width:min(100% - 2*var(--gutter),var(--container));margin-inline:auto}
.eyebrow{font-size:12px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 16px}
h1,h2,h3{font-family:var(--font-display);font-weight:400;letter-spacing:-.02em;line-height:1.04;margin:0}
h2{font-size:var(--fs-h2);max-width:20ch}
h2 em,h1 em{font-style:italic;font-variation-settings:"opsz" 144}
p{margin:0}
.lead{font-size:var(--fs-lead);line-height:1.5;max-width:60ch}
.muted{color:var(--muted)}
.section{padding-block:var(--section-y);border-top:1px solid var(--hairline-soft)}
.section.flush{border-top:0}
.cols{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,6vw,96px);align-items:start}
@media (max-width:860px){.cols{grid-template-columns:1fr;gap:28px}}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:14px 28px;background:var(--ink);color:#fff;text-decoration:none;font-weight:600;font-size:17px;border-radius:var(--radius-button);transition:background .2s}
.btn:hover{background:var(--ink-hover)}
.quiet{display:inline-block;margin-left:24px;text-decoration:underline;text-underline-offset:4px;color:var(--ink)}
:focus-visible{outline:2px solid var(--ink);outline-offset:4px}

/* reveal */
.rv{opacity:1;transform:none}
html.anim .rv{opacity:0;transform:translateY(18px);transition:opacity .8s var(--ease-out),transform .9s var(--ease-out)}
html.anim .rv.in{opacity:1;transform:none}

/* header */
.topbar{border-bottom:1px solid var(--hairline);font-size:14px;font-weight:500;padding:10px 0;color:var(--ink)}
.hd{padding:20px 0}
.hd img{width:48px;height:auto}
.hd .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px}
.hd a.back{font-size:14px;text-decoration:underline;text-underline-offset:4px}

/* hero (BYQ stringer-hero-8, ported) */
.hero-track{position:relative}
html.js.hero-anim .hero-track{height:260vh}
.hero-stage{position:relative;padding:clamp(40px,6vw,88px) 0 clamp(48px,6vw,80px)}
html.js.hero-anim .hero-stage{position:sticky;top:0;height:100vh;height:100svh;display:flex;flex-direction:column;justify-content:center;overflow:hidden;padding:0}
.hero-cover{display:none}
html.js.hero-anim .hero-cover{display:block;position:absolute;inset:0;z-index:2;overflow:hidden;background:var(--paper-dark);will-change:clip-path}
.hero-cover img{position:absolute;top:0;left:0;max-width:none;will-change:transform;transform-origin:0 0}
.hero-plate{position:relative;z-index:3;width:min(100% - 2*var(--gutter),var(--container));margin-inline:auto;display:flex;flex-direction:column;gap:clamp(20px,3vw,32px)}
.hero-head{display:flex;flex-direction:column;gap:16px}
.hero-head h1{font-size:var(--fs-h1);max-width:14ch}
.hero-head .lead{max-width:62ch}
.hero-frame{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:var(--paper-dark);border-radius:var(--radius-card)}
.hero-frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero-foot{border-top:1px solid var(--ink);padding-top:14px;display:grid;grid-template-columns:1fr 1fr auto;gap:16px;align-items:center;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:var(--muted)}
.hero-foot .mid{text-align:center;letter-spacing:.02em;text-transform:none;font-weight:400}
.hero-foot a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--ink);padding-bottom:3px;justify-self:end}
.hero-foot a:hover{color:var(--muted);border-color:var(--muted)}
@media (max-width:767px){.hero-foot{grid-template-columns:1fr;gap:8px}.hero-foot .mid{text-align:left}.hero-foot a{justify-self:start}}
html.js.hero-anim .hero-head,html.js.hero-anim .hero-foot{opacity:0;transform:translateY(24px);transition:opacity .7s var(--ease-out),transform .7s var(--ease-out)}
html.js.hero-anim .hero-head.on,html.js.hero-anim .hero-foot.on{opacity:1;transform:none}
html.js.hero-anim .hero-plate{width:min(100% - 2*var(--gutter),84vh,var(--container))}
html.js.hero-anim .hero-frame:not(.on){background:transparent}
html.js.hero-anim .hero-frame img{opacity:0}
html.js.hero-anim .hero-frame.on img{opacity:1}
html.js.hero-anim .hero-head h1{font-size:clamp(36px,4.6vw,68px)}
html.js.hero-anim .hero-head .lead{font-size:clamp(16px,1.2vw,18px)}
.hero-cap{display:none}
html.js.hero-anim .hero-cap{display:flex;position:absolute;left:var(--gutter);right:var(--gutter);bottom:28px;z-index:2;justify-content:space-between;align-items:center;color:#fff;font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:500;text-shadow:0 1px 12px rgba(0,0,0,.35);transition:opacity .4s}
html.js.hero-anim .hero-cap.off{opacity:0}
.hero-cap .arrow{display:inline-block;width:1px;height:28px;background:#fff;margin-left:12px;vertical-align:middle;animation:cap-bob 1.8s ease-in-out infinite}
@keyframes cap-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){.hero-cap .arrow{animation:none}}

/* stats (odometer, BYQ odometer-counter-01, ported) */
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(24px,4vw,64px)}
@media (max-width:860px){.stats{grid-template-columns:1fr;gap:36px}}
.stat{border-top:1px solid var(--ink);padding-top:20px}
.odo{display:flex;align-items:stretch;height:var(--odo-h);--odo-h:calc(var(--fs-stat)*1.08);font-family:var(--font-display);font-size:var(--fs-stat);line-height:var(--odo-h);letter-spacing:-.03em;font-variant-numeric:tabular-nums;overflow:hidden;-webkit-mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 82%,transparent)}
.odo-digit{position:relative;height:var(--odo-h);width:.6em;overflow:hidden;text-align:center}
.odo-reel{display:flex;flex-direction:column;will-change:transform}
.odo-num{height:var(--odo-h);line-height:var(--odo-h)}
.odo-sep{width:.3em;text-align:center;color:var(--muted)}
.odo-suffix{width:auto;padding-left:.05em;font-size:.6em;align-self:center;line-height:1}
.stat-l{font-family:var(--font-display);font-size:clamp(20px,1.8vw,26px);margin-top:4px}
.stat-s{color:var(--muted);margin-top:6px;font-size:15px}
.stats-note{margin-top:32px;font-size:14px;color:var(--muted);max-width:70ch}

/* chapters (BYQ sticky-media-swap-01, ported) */
.ch{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);column-gap:clamp(32px,5vw,80px)}
.ch-steps{display:block}
.ch-step{display:grid;align-items:center;min-height:100vh;min-height:100svh}
.ch-entry{display:grid;grid-template-columns:auto 1fr;column-gap:clamp(16px,2.4vw,28px);align-items:start;margin:0;padding:8px 0;border:0;background:none;font:inherit;text-align:left;cursor:pointer;color:var(--ink);transition:opacity .5s var(--ease-out);opacity:.28}
.ch-entry.is-active{opacity:1}
.ch-entry:hover{opacity:.6}
.ch-entry.is-active:hover{opacity:1}
.ch-num{display:inline-block;font-size:13px;line-height:1;padding-top:.7em;letter-spacing:.08em;color:var(--muted);font-variant-numeric:tabular-nums;backface-visibility:hidden}
html.anim .ch-entry.is-active .ch-num{animation:ch-flip .55s var(--ease-out)}
@keyframes ch-flip{from{transform:rotateX(-90deg)}to{transform:rotateX(0)}}
.ch-title{display:block;font-family:var(--font-display);font-size:var(--fs-chapter);line-height:1.02;letter-spacing:-.02em}
.ch-line{display:block;margin-top:16px;max-width:44ch;font-size:var(--fs-body);line-height:1.55}
.ch-stage{position:relative;min-height:100%}
.ch-frame{position:sticky;top:24px;height:calc(100vh - 48px);height:calc(100svh - 48px);border-radius:var(--radius-card);overflow:hidden;isolation:isolate;background:var(--paper-dark);border:1px solid var(--hairline-soft);transform:translateZ(0)}
.ch-frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;will-change:transform,clip-path,opacity}
.ch-frame img.is-on{opacity:1}
@media (max-width:860px){
 .ch{display:block;position:relative}
 .ch-stage{position:absolute;inset:0}
 .ch-frame{top:16px;height:44vh;height:44svh}
 .ch-step{position:relative;z-index:1;min-height:92vh;min-height:92svh;align-items:end;padding-bottom:9vh}
 .ch-entry{background:linear-gradient(to bottom,rgba(247,245,240,0) 0,var(--paper) 18%);padding-top:40px}
 .ch-title{font-size:clamp(30px,8vw,40px)}
}
html:not(.js) .ch-entry{opacity:1}
html:not(.js) .ch-frame img:first-child{opacity:1}

/* ledger */
.ledger{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:16px}
.ledger th,.ledger td{text-align:right;padding:14px 10px;border-top:1px solid var(--hairline-soft);vertical-align:top}
.ledger th:first-child,.ledger td:first-child{text-align:left;padding-left:0;font-weight:500}
.ledger thead th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:var(--muted);border-top:0;padding-top:0}
.ledger tfoot td{border-top:1px solid var(--ink);font-weight:600}
.ledger tfoot tr.nr td{border-top:1px solid var(--hairline-soft);font-weight:400;color:var(--muted)}
.ledger .up{color:var(--ink)}
.ledger .down{color:var(--muted)}
.ledger small{display:block;font-weight:400;color:var(--muted);font-size:13px}
.ledger-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
@media (max-width:700px){.ledger{min-width:640px}}
.tnote{margin-top:16px;font-size:14px;color:var(--muted);max-width:70ch}

/* weeks matrix (BYQ stringer-structured-data-1, ported) */
.wk-scroll{overflow-x:auto}
.wk{display:grid;grid-template-columns:repeat(34,minmax(18px,1fr));gap:6px;min-width:640px;align-items:end}
.wk-col{display:flex;flex-direction:column;align-items:center;gap:8px}
.wk-mark{width:12px;height:12px;background:var(--mark-off);transition:background .4s var(--ease-out),transform .5s var(--ease-out)}
.wk-mark.on{background:var(--ink)}
.wk-mark.eq{background:transparent;box-shadow:inset 0 0 0 2px var(--ink)}
.wk-lbl{font-size:10px;color:var(--muted);letter-spacing:.04em;writing-mode:vertical-rl;transform:rotate(180deg);height:40px;display:flex;align-items:center}
html.anim .wk-col{opacity:0;transform:translateY(12px);transition:opacity .6s var(--ease-out),transform .7s var(--ease-out)}
html.anim .wk.in .wk-col{opacity:1;transform:none}
.wk-foot{display:grid;grid-template-columns:1fr 1fr auto;gap:16px;margin-top:28px;padding-top:14px;border-top:1px solid var(--hairline-soft);font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:var(--muted)}
.wk-foot .c{text-align:center}
@media (max-width:767px){.wk-foot{grid-template-columns:1fr;gap:6px}.wk-foot .c{text-align:left}}
.wk-gap{grid-column:span 1;display:flex;flex-direction:column;align-items:center;gap:8px}
.wk-gap .wk-mark{background:transparent;box-shadow:inset 0 0 0 1px var(--hairline)}

/* months chart */
.chart{width:100%;height:auto;display:block;overflow:visible}
.chart .bar{transform-origin:bottom}
html.anim .chart .bar{transform:scaleY(0);transition:transform 1s var(--ease-out)}
html.anim .chart.in .bar{transform:none}
.chart text{font-family:var(--font-body);font-size:12px;fill:var(--muted)}
.chart .lbl-b{fill:var(--ink);font-weight:500}
.legend{display:flex;gap:24px;margin-top:12px;font-size:13px;color:var(--muted)}
.legend span::before{content:"";display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:-1px;background:var(--ink)}
.legend span.l25::before{background:var(--mark-off)}
.legend span.plain::before{display:none}

/* beyond */
.beyond{display:grid;grid-template-columns:1fr;gap:0;border-top:1px solid var(--ink)}
.b-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:baseline;padding:18px 0;border-bottom:1px solid var(--hairline-soft)}
.b-row .v{font-family:var(--font-display);font-size:clamp(28px,3vw,44px);letter-spacing:-.02em;white-space:nowrap}
.b-row .k{font-weight:500}
.b-row small{display:block;color:var(--muted);font-size:14px;margin-top:4px}

/* limits / method */
.list{list-style:none;margin:0;padding:0;counter-reset:li}
.list li{position:relative;padding:18px 0 18px 56px;border-top:1px solid var(--hairline-soft);counter-increment:li}
.list li::before{content:counter(li,decimal-leading-zero);position:absolute;left:0;top:20px;font-size:12px;letter-spacing:.08em;color:var(--muted);font-variant-numeric:tabular-nums}
.list li:last-child{border-bottom:1px solid var(--hairline-soft)}

/* cta */
.cta{background:var(--navy);color:#fff;padding-block:var(--section-y)}
.cta .eyebrow{color:rgba(255,255,255,.7)}
.cta .btn{background:#fff;color:var(--ink)}
.cta .btn:hover{background:var(--paper)}
.cta .quiet{color:#fff}
.cta .lead{color:rgba(255,255,255,.85)}
footer{padding:40px 0 56px;font-size:14px;color:var(--muted)}
footer .wrap{display:flex;flex-wrap:wrap;gap:16px 32px;justify-content:space-between;align-items:center}
footer nav{display:flex;gap:20px}
footer img{width:40px}

/* consent banner (paper) */
.cb{position:fixed;left:0;right:0;bottom:0;z-index:50;width:100%;padding:16px var(--gutter);padding-bottom:max(16px,env(safe-area-inset-bottom));pointer-events:none;animation:cb-in .24s cubic-bezier(.2,.7,.2,1) both}
.cb-in{pointer-events:auto;display:flex;flex-direction:column;gap:16px;width:100%;max-width:620px;padding:20px;background:var(--white);color:var(--ink);border:1px solid var(--field-border);border-radius:var(--radius-card);box-shadow:0 12px 40px rgba(16,20,28,.18)}
.cb-t{margin:0;font-size:16px;line-height:1.5}
.cb-btns{display:flex;gap:12px}
.cb-btn{flex:1 1 0;min-height:52px;padding:12px 28px;border:1px solid var(--ink);border-radius:var(--radius-button);background:var(--white);color:var(--ink);font:inherit;font-weight:600;font-size:17px;cursor:pointer}
.cb-btn:hover{background:var(--ink);color:var(--white)}
@keyframes cb-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.cb{animation:none}html.anim .rv{transition:none}}
@media print{.cb,.cta{display:none}.hero-cover{display:none}}
`;

/* -------------------------------------------------------------------- JS */
const JS = `
(function(){
'use strict';
var docEl=document.documentElement;
var reduce=false;try{reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
var anim=docEl.classList.contains('anim');
var EASE_OUT='cubic-bezier(.16,1,.3,1)',P3_INOUT='cubic-bezier(.76,0,.24,1)',P2_OUT='cubic-bezier(.33,1,.68,1)',P4_OUT='cubic-bezier(.25,1,.5,1)';

/* reveals */
if(anim&&'IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.rv,.wk,.chart').forEach(function(el){io.observe(el);});
}else{document.querySelectorAll('.rv,.wk,.chart').forEach(function(el){el.classList.add('in');});}

/* hero: cover image clips into the frame as you scroll (BYQ stringer-hero-8) */
(function(){
  var track=document.getElementById('hero-track'),cover=document.getElementById('hero-cover'),img=document.getElementById('hero-cover-img'),frame=document.getElementById('hero-frame'),stage=document.getElementById('hero-stage'),head=document.getElementById('hero-head'),foot=document.getElementById('hero-foot');
  if(!track||!cover||!img||!frame||!stage)return;
  var ASPECT=2752/1536;
  function enable(){return anim&&!reduce&&window.innerWidth>767&&window.innerHeight>=560;}
  function on(){
    if(!docEl.classList.contains('hero-anim'))return;
    var tr=track.getBoundingClientRect(),top=tr.top,th=tr.height-window.innerHeight;
    var p=Math.min(Math.max(-top/th,0),1);
    var sr=stage.getBoundingClientRect(),fr=frame.getBoundingClientRect();
    var fx=fr.left-sr.left,fy=fr.top-sr.top,fw=fr.width,fh=fr.height,sw=sr.width,sh=sr.height;
    var w0=sw,h0=w0/ASPECT;if(h0<sh){h0=sh;w0=h0*ASPECT;}
    var x0=(sw-w0)/2,y0=(sh-h0)/2;
    var SHOW=.85,ANCHOR=.35;
    var h1=Math.max(fh/SHOW,fw/ASPECT,fh),w1=h1*ASPECT;h1=Math.min(h1,h0);w1=h1*ASPECT;
    var x1=fx+(fw-w1)/2,y1=fy-(h1-fh)*ANCHOR;
    var a=Math.min(p/.7,1);
    cover.style.clipPath='inset('+(fy*a)+'px '+((sw-fx-fw)*a)+'px '+((sh-fy-fh)*a)+'px '+(fx*a)+'px)';
    img.style.left=x0+'px';img.style.top=y0+'px';img.style.width=w0+'px';img.style.height=h0+'px';
    img.style.transform='translate('+((x1-x0)*a)+'px,'+((y1-y0)*a)+'px) scale('+(1+(w1/w0-1)*a)+')';
    frame.classList.toggle('on',a>=.999);head.classList.toggle('on',p>=.55);foot.classList.toggle('on',p>=.65);var cap=document.getElementById('hero-cap');if(cap)cap.classList.toggle('off',p>.15);
  }
  function setup(){
    if(enable()){docEl.classList.add('hero-anim');on();}
    else{docEl.classList.remove('hero-anim');cover.style.clipPath='';img.style.transform='';head.classList.add('on');foot.classList.add('on');frame.classList.add('on');}
  }
  setup();
  window.addEventListener('scroll',on,{passive:true});
  window.addEventListener('resize',setup);
})();

/* odometer counters (BYQ odometer-counter-01) */
(function(){
  var SPINS=2;
  document.querySelectorAll('.odo').forEach(function(odo){
    var value=odo.getAttribute('data-value')||'0',dec=parseInt(odo.getAttribute('data-dec')||'0',10),suffix=odo.getAttribute('data-suffix')||'';
    var str=Number(value).toFixed(dec);
    odo.innerHTML='';
    var reels=[];
    var chars=str.split('');
    var intLen=str.indexOf('.')>=0?str.indexOf('.'):str.length;
    chars.forEach(function(ch,i){
      if(ch==='.'){var s=document.createElement('span');s.className='odo-sep';s.textContent='.';odo.appendChild(s);return;}
      var d=parseInt(ch,10);
      var digit=document.createElement('div');digit.className='odo-digit';
      var reel=document.createElement('div');reel.className='odo-reel';
      for(var c=0;c<=SPINS;c++)for(var k=0;k<=9;k++){var nEl=document.createElement('div');nEl.className='odo-num';nEl.textContent=String(k);reel.appendChild(nEl);}
      digit.appendChild(reel);odo.appendChild(digit);reels.push({reel:reel,d:d});
      var posFromRight=intLen-i;
      if(i<intLen&&posFromRight>1&&(posFromRight-1)%3===0){var sep=document.createElement('span');sep.className='odo-sep';sep.textContent=',';odo.appendChild(sep);}
    });
    if(suffix){var sf=document.createElement('span');sf.className='odo-suffix';sf.textContent=suffix;odo.appendChild(sf);}
    function target(d){var h=odo.querySelector('.odo-num').offsetHeight;return -(SPINS*10+d)*h;}
    function settle(){reels.forEach(function(r){r.reel.style.transform='translateY('+target(r.d)+'px)';});}
    if(!anim||reduce||!('IntersectionObserver' in window)||!reels[0]||!reels[0].reel.animate){settle();return;}
    var played=false;
    var io=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting||played)return;played=true;io.disconnect();
      reels.forEach(function(r,i){
        var y=target(r.d);
        r.reel.animate([{transform:'translateY(0)'},{transform:'translateY('+y+'px)'}],{duration:850+i*100,easing:P4_OUT,fill:'forwards'});
      });
    });},{rootMargin:'0px 0px -20% 0px'});
    io.observe(odo);
    window.addEventListener('resize',function(){if(played)settle();});
  });
})();

/* chapters: sticky frame wipes between images (BYQ sticky-media-swap-01) */
(function(){
  var root=document.getElementById('chapters');if(!root)return;
  var steps=[].slice.call(root.querySelectorAll('.ch-step')),entries=[].slice.call(root.querySelectorAll('.ch-entry')),medias=[].slice.call(root.querySelectorAll('.ch-frame img'));
  if(!steps.length||steps.length!==medias.length)return;
  var FULL='inset(0% 0% 0% 0%)',current=0,swaps=0;
  medias.forEach(function(m,i){m.classList.toggle('is-on',i===0);m.style.zIndex=i===0?1:0;m.style.clipPath=FULL;});
  entries.forEach(function(en,i){en.classList.toggle('is-active',i===0);});
  function swapTo(i){
    if(i===current)return;
    var incoming=medias[i],outgoing=medias[current];current=i;
    entries.forEach(function(en,k){en.classList.toggle('is-active',k===i);});
    medias.forEach(function(m){if(m.getAnimations)m.getAnimations().forEach(function(a){a.cancel();});});
    if(reduce||!anim||!incoming.animate){
      medias.forEach(function(m,k){m.classList.toggle('is-on',k===i);m.style.zIndex=k===i?1:0;m.style.clipPath=FULL;m.style.transform='';});
      return;
    }
    swaps+=1;var fromTop=swaps%2===1;
    medias.forEach(function(m){if(m!==incoming&&m!==outgoing){m.classList.remove('is-on');m.style.zIndex=0;m.style.transform='';}});
    outgoing.style.zIndex=1;outgoing.classList.add('is-on');outgoing.style.clipPath=FULL;
    incoming.style.zIndex=2;incoming.classList.add('is-on');
    var startClip=fromTop?'inset(0% 0% 100% 0%)':'inset(100% 0% 0% 0%)';
    incoming.animate([{clipPath:startClip},{clipPath:FULL}],{duration:850,easing:P3_INOUT,fill:'forwards'});
    incoming.animate([{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:1250,easing:P2_OUT,fill:'forwards'});
    var a=outgoing.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY('+(fromTop?7:-7)+'%) scale(1.05)'}],{duration:850,easing:P3_INOUT,fill:'forwards'});
    a.onfinish=function(){if(outgoing!==medias[current]){outgoing.classList.remove('is-on');outgoing.style.zIndex=0;outgoing.style.transform='';}};
  }
  function check(){
    var mid=window.innerHeight/2,best=current;
    for(var i=0;i<steps.length;i++){var r=steps[i].getBoundingClientRect();if(r.top<=mid&&r.bottom>mid){best=i;break;}}
    swapTo(best);
  }
  window.addEventListener('scroll',check,{passive:true});window.addEventListener('resize',check);check();
  entries.forEach(function(en,i){en.addEventListener('click',function(){steps[i].scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});});});
})();

/* cookie question, in the page's own clothes; /js/consent.js keeps the choice */
(function(){
  var bar=document.getElementById('g-consent');if(!bar)return;
  var C=window.ElevateConsent||null;
  function state(){try{return C?(C.status()||''):'';}catch(e){return '';}}
  if(!C||state()){bar.parentNode.removeChild(bar);return;}
  var shown=false;
  function show(){if(shown)return;shown=true;bar.hidden=false;}
  function check(){var y=window.pageYOffset||docEl.scrollTop||0;if(y>=200||docEl.scrollHeight-window.innerHeight<200){show();window.removeEventListener('scroll',check);}}
  window.addEventListener('scroll',check,{passive:true});window.addEventListener('load',check);
  bar.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('button[data-c]'):null;if(!b)return;
    if(b.getAttribute('data-c')==='yes')C.accept();else C.decline();
    window.removeEventListener('scroll',check);if(bar.parentNode)bar.parentNode.removeChild(bar);});
  check();
})();
})();
`;

/* ------------------------------------------------------------------ parts */
const imgSet = (name, widths, ext = 'webp') =>
  widths.map((w) => `/case/c-medical/img/${name}-${w}.${ext} ${w}w`).join(', ');

function hero() {
  const h = d.hero;
  const src = `/case/c-medical/img/hero-corridor-1800.webp`;
  const set = imgSet('hero-corridor', [800, 1200, 1800]);
  return `
<section class="hero-track" id="hero-track" aria-labelledby="h1">
  <div class="hero-stage" id="hero-stage">
    <div class="hero-cover" id="hero-cover" aria-hidden="true"><img id="hero-cover-img" src="${src}" srcset="${set}" sizes="100vw" alt="" fetchpriority="high">
      <div class="hero-cap" id="hero-cap"><span>${esc(h.eyebrow)}</span><span>${esc(h.coverCaption)}<span class="arrow"></span></span></div>
    </div>
    <div class="hero-plate">
      <div class="hero-head" id="hero-head">
        <p class="eyebrow">${esc(h.eyebrow)}</p>
        <h1 id="h1">${esc(h.h1)}</h1>
        <p class="lead">${esc(h.lede)}</p>
      </div>
      <div class="hero-frame" id="hero-frame"><img src="${src}" srcset="${set}" sizes="(min-width: 1328px) 1200px, 92vw" width="2752" height="1536" alt="${esc(h.imgAlt)}"></div>
      <div class="hero-foot" id="hero-foot">
        <span>${esc(h.footLeft)}</span>
        <span class="mid">${esc(h.footMid)}</span>
        <a href="#numbers">${esc(h.footRight)}</a>
      </div>
    </div>
  </div>
</section>`;
}

function stats() {
  const s = d.stats;
  return `
<section class="section flush" id="numbers" aria-labelledby="h-stats">
  <div class="wrap">
    <p class="eyebrow rv" id="h-stats">${esc(s.eyebrow)}</p>
    <p class="lead rv" style="margin-bottom:40px">${esc(s.lede)}</p>
    <div class="stats">
${s.items.map((it) => {
    const dec = it.decimals || 0;
    const shown = n(it.value, dec) + (it.suffix || '');
    return `      <div class="stat rv">
        <div class="odo" data-value="${it.value}" data-dec="${dec}" data-suffix="${esc(it.suffix || '')}" role="img" aria-label="${esc(shown)}"><span class="odo-fallback">${esc(shown)}</span></div>
        <p class="stat-l">${esc(it.label)}</p>
        <p class="stat-s">${esc(it.sub)}</p>
      </div>`;
  }).join('\n')}
    </div>
    <p class="stats-note rv">${esc(s.note)}</p>
  </div>
</section>`;
}

function chapters() {
  const c = d.chapters;
  return `
<section class="section" aria-labelledby="h-ch">
  <div class="wrap">
    <p class="eyebrow rv">${esc(c.eyebrow)}</p>
    <h2 class="rv" id="h-ch">${esc(c.h2)}</h2>
  </div>
  <div class="wrap ch" id="chapters" style="margin-top:clamp(32px,4vw,56px)">
    <div class="ch-steps">
${c.items.map((it) => `      <div class="ch-step">
        <button class="ch-entry" type="button">
          <span class="ch-num" aria-hidden="true">${esc(it.num)}</span>
          <span><span class="ch-title">${esc(it.title)}</span><span class="ch-line">${esc(it.line)}</span></span>
        </button>
      </div>`).join('\n')}
    </div>
    <div class="ch-stage" aria-hidden="true">
      <div class="ch-frame">
${c.items.map((it) => `        <img src="/case/c-medical/img/${it.img}-1100.webp" srcset="${imgSet(it.img, [700, 1100])}" sizes="(max-width: 860px) 100vw, 46vw" width="1856" height="2304" alt="" loading="lazy">`).join('\n')}
      </div>
    </div>
  </div>
</section>`;
}

function ledger() {
  const l = d.ledger;
  const row = (label, f, cls = '') => {
    const per5 = f.spend2025 / f.b2025, per6 = f.spend2026 / f.b2026;
    const ch = pct(f.b2025, f.b2026);
    return `        <tr class="${cls}"><td>${esc(label)}</td><td>${n(f.b2025)}</td><td>${n(f.b2026)}</td><td class="${f.b2026 >= f.b2025 ? 'up' : 'down'}">${ch}</td><td>${nok(per5)}<small>${gbp(per5)}</small></td><td>${nok(per6)}<small>${gbp(per6)}</small></td></tr>`;
  };
  const tot = { b2025: ads.b2025, b2026: ads.b2026, spend2025: ads.spend2025, spend2026: ads.spend2026 };
  return `
<section class="section" aria-labelledby="h-ledger">
  <div class="wrap">
    <div class="cols">
      <div><p class="eyebrow rv">${esc(l.eyebrow)}</p><h2 class="rv" id="h-ledger">${esc(l.h2)}</h2></div>
      <p class="lead rv">${esc(l.intro)}</p>
    </div>
    <div class="ledger-scroll rv" style="margin-top:40px">
    <table class="ledger">
      <caption class="eyebrow" style="text-align:left">C-Medical, Google Ads, 1 February to 5 November 2026 against the same days of 2025</caption>
      <thead><tr>${l.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>
${l.rows.map(([label, key]) => row(label, F.floors[key])).join('\n')}
      </tbody>
      <tfoot>
${row(l.totalLabel, tot)}
${row(l.noReceptionLabel, F.noReception, 'nr')}
      </tfoot>
    </table>
    </div>
    <p class="tnote rv">${esc(l.note)}</p>
  </div>
</section>`;
}

function weeks() {
  const w = d.weeks;
  const list = F.weeks;
  const fmt = (iso) => { const dt = new Date(iso + 'T00:00:00Z'); return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); };
  return `
<section class="section" aria-labelledby="h-weeks">
  <div class="wrap">
    <div class="cols">
      <div><p class="eyebrow rv">${esc(w.eyebrow)}</p><h2 class="rv" id="h-weeks">${esc(w.h2)}</h2></div>
      <p class="lead rv">${esc(w.intro)}</p>
    </div>
    <div class="wk-scroll" style="margin-top:40px">
      <div class="wk" role="img" aria-label="Google Ads bookings by week: ${list.map((x) => `week from ${fmt(x.start)}, ${x.b2026} against ${x.b2025}`).join('; ')}">
${list.map((x) => `        <div class="wk-col" title="Week of ${fmt(x.start)}: ${x.b2026} bookings in 2026, ${x.b2025} in 2025"><span class="wk-mark${x.ahead ? ' on' : x.equal ? ' eq' : ''}"></span><span class="wk-lbl">${fmt(x.start)}</span></div>`).join('\n')}
      </div>
    </div>
    <div class="wk-foot rv"><span>${esc(w.footLeft)}</span><span class="c">${esc(w.legend)}</span><span>${esc(w.footRight)}</span></div>
  </div>
</section>`;
}

function months() {
  const m = d.months;
  const ms = F.months;
  const W = 1200, H = 420, padL = 44, padB = 44, padT = 16, gap = 10;
  const max = Math.max(...ms.flatMap((x) => [x.all2025, x.all2026]));
  const colW = (W - padL) / ms.length;
  const barW = (colW - gap * 2) / 2;
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  let bars = '', labels = '';
  ms.forEach((x, i) => {
    const x0 = padL + i * colW + gap;
    const h5 = H - padB - y(x.all2025), h6 = H - padB - y(x.all2026);
    bars += `<rect class="bar" x="${x0.toFixed(1)}" y="${y(x.all2025).toFixed(1)}" width="${barW.toFixed(1)}" height="${h5.toFixed(1)}" fill="var(--mark-off)"><title>${x.m} 2025: ${n(x.all2025)} bookings</title></rect>`;
    bars += `<rect class="bar" x="${(x0 + barW).toFixed(1)}" y="${y(x.all2026).toFixed(1)}" width="${barW.toFixed(1)}" height="${h6.toFixed(1)}" fill="var(--ink)"><title>${x.m} 2026: ${n(x.all2026)} bookings</title></rect>`;
    labels += `<text x="${(x0 + barW).toFixed(1)}" y="${H - padB + 20}" text-anchor="middle">${x.m}${x.partial ? '*' : ''}</text>`;
    labels += `<text class="lbl-b" x="${(x0 + barW).toFixed(1)}" y="${(y(x.all2026) - 6).toFixed(1)}" text-anchor="middle">${n(x.all2026)}</text>`;
  });
  const ticks = [0, 200, 400, 600].filter((t) => t <= max).map((t) => `<line x1="${padL}" x2="${W}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="var(--hairline-soft)"/><text x="${padL - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${t}</text>`).join('');
  return `
<section class="section" aria-labelledby="h-months">
  <div class="wrap">
    <div class="cols">
      <div><p class="eyebrow rv">${esc(m.eyebrow)}</p><h2 class="rv" id="h-months">${esc(m.h2)}</h2></div>
      <p class="lead rv">${esc(m.intro)}</p>
    </div>
    <figure style="margin:40px 0 0">
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Online bookings per month, 2025 and 2026: ${ms.map((x) => `${x.m} ${x.all2026} against ${x.all2025}`).join(', ')}">
        ${ticks}
        ${bars}
        ${labels}
      </svg>
      <figcaption class="legend"><span class="l25">${esc(m.legend2025)}</span><span>${esc(m.legend2026)}</span><span class="plain" style="margin-left:auto">* ${esc(m.partial)}</span></figcaption>
    </figure>
  </div>
</section>`;
}

function beyond() {
  const b = d.beyond;
  return `
<section class="section" aria-labelledby="h-beyond">
  <div class="wrap">
    <div class="cols">
      <div><p class="eyebrow rv">${esc(b.eyebrow)}</p><h2 class="rv" id="h-beyond">${esc(b.h2)}</h2></div>
      <p class="lead rv">${esc(b.intro)}</p>
    </div>
    <div class="beyond rv" style="margin-top:40px">
${b.rows.map((r, i) => `      <div class="b-row"><div><span class="k">${esc(r.label)}</span><small>${esc(r.note)}</small></div><span class="v">${esc(beyondValues[i])}</span></div>`).join('\n')}
    </div>
    <p class="tnote rv">${esc(b.note)}</p>
  </div>
</section>`;
}

function listSection(id, s) {
  return `
<section class="section" aria-labelledby="h-${id}">
  <div class="wrap">
    <div class="cols">
      <div><p class="eyebrow rv">${esc(s.eyebrow)}</p><h2 class="rv" id="h-${id}">${esc(s.h2)}</h2></div>
      <ol class="list rv">
${s.items.map((t) => `        <li>${esc(t)}</li>`).join('\n')}
      </ol>
    </div>
  </div>
</section>`;
}

function cta() {
  const c = d.cta;
  return `
<section class="cta" aria-labelledby="h-cta">
  <div class="wrap">
    <p class="eyebrow rv">${esc(c.eyebrow)}</p>
    <h2 class="rv" id="h-cta">${esc(c.h2)}</h2>
    <p class="lead rv" style="margin-top:20px">${esc(c.body)}</p>
    <p class="rv" style="margin-top:32px"><a class="btn" href="${esc(c.buttonHref)}">${esc(c.button)}</a><a class="quiet" href="${esc(c.quietHref)}">${esc(c.quiet)}</a></p>
  </div>
</section>`;
}

/* -------------------------------------------------------------------- page */
const url = `${SITE}/case/${d.slug}`;
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: d.hero.h1,
  description: d.meta.description,
  inLanguage: 'en-GB',
  datePublished: '2026-11-06',
  dateModified: '2026-11-06',
  url,
  image: `${SITE}/case/c-medical/img/hero-corridor-1800.webp`,
  author: { '@type': 'Organization', name: 'Elevate Marketing', url: SITE },
  publisher: { '@type': 'Organization', name: 'Elevate Marketing (EngeCo AS)', url: SITE },
  about: { '@type': 'Organization', name: 'C-Medical', url: 'https://www.cmedical.no/' },
};

const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(d.meta.title)}</title>
<meta name="description" content="${esc(d.meta.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(d.meta.ogTitle)}">
<meta property="og:description" content="${esc(d.meta.ogDescription)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Elevate Marketing">
<meta property="og:image" content="${SITE}/case/c-medical/img/hero-corridor-1800.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F7F5F0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/g/_assets/fonts/geist-v1.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/g/_assets/fonts/fraunces-v1.woff2" as="font" type="font/woff2" crossorigin>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>${CSS}</style>
<script>(function(){var d=document.documentElement;d.classList.add('js');try{if(window.IntersectionObserver&&!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('anim')}catch(e){}})();</script>
<script src="/js/consent.js?v=4" data-pixel="1466790598245604" data-banner="off" data-track="ViewContent"></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header>
  <div class="topbar"><div class="wrap">${esc(d.topbar)}</div></div>
  <div class="hd"><div class="wrap"><a href="/" aria-label="Elevate Marketing"><picture><source srcset="/g/_assets/logo-ink.webp" type="image/webp"><img src="/g/_assets/logo-ink.png" width="418" height="168" alt="Elevate Marketing"></picture></a><a class="back" href="/cases/">${esc(d.footer.links[0].label)}</a></div></div>
</header>
<main id="main">
${hero()}
${stats()}
${chapters()}
${ledger()}
${weeks()}
${months()}
${beyond()}
${listSection('limits', d.limits)}
${listSection('method', d.method)}
${cta()}
</main>
<footer>
  <div class="wrap">
    <p>${esc(d.footer.legal)}</p>
    <nav aria-label="Legal">${d.footer.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</nav>
  </div>
</footer>
<div class="cb" id="g-consent" role="region" aria-label="Cookie choice" hidden>
  <div class="cb-in">
    <p class="cb-t">${esc(d.consent.text)} <a href="${esc(d.consent.privacyHref)}">Privacy</a></p>
    <div class="cb-btns"><button class="cb-btn" type="button" data-c="yes">${esc(d.consent.accept)}</button><button class="cb-btn" type="button" data-c="no">${esc(d.consent.decline)}</button></div>
  </div>
</div>
<script>${JS}</script>
</body>
</html>
`;

checkText('rendered page (text)', html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' '));

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'index.html'), html);
console.log(`  case: /case/c-medical (${(html.length / 1024).toFixed(1)} KB)`);
