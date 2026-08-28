#!/usr/bin/env node
/**
 * Client GEO-audit report generator.
 *
 * Reads audits/<slug>.json (+ optional audits/<slug>/ screenshot folder) and
 * writes a self-contained static page to public/report/<slug>/index.html.
 *
 * Why static HTML rather than a React route (see CLAUDE.md §Architecture):
 * these reports must be readable with JavaScript disabled, print cleanly, load
 * fast on 4G and carry no external font requests. The React app is
 * client-rendered, so a route there would give an empty page to anything that
 * does not run JS. Animations are layered on as progressive enhancement: the
 * `js` class is only set by an inline script, so no-JS and print get the full
 * content with everything visible.
 *
 * Publishing a new audit = one JSON file + one screenshot folder. No code.
 *
 * IMPORTANT: reports name a client's weaknesses. They must never be indexed.
 * Defence in depth: robots meta here, X-Robots-Tag in netlify.toml, no index
 * page, no inbound links, random slug suffix, no-referrer.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'audits');
const OUT = join(root, 'public', 'report');

/* ------------------------------------------------------------------ helpers */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Validation: fail loudly rather than shipping half a report. */
function validate(d, file) {
  const die = (msg) => {
    console.error(`\n  ✗ ${basename(file)}: ${msg}\n`);
    process.exit(1);
  };
  for (const k of ['company', 'slug', 'date', 'lede', 'headline', 'visibility', 'queries', 'accuracy', 'gaps', 'fixes', 'method'])
    if (!d[k]) die(`missing required section "${k}"`);
  if (!/^[a-z0-9-]+-[a-z0-9]{5,}$/.test(d.slug))
    die(`slug "${d.slug}" needs a random suffix of at least 5 characters (guessable URLs expose other clients' reports)`);
  if (basename(file, '.json') !== d.slug) die(`filename must match slug "${d.slug}"`);
  if (!d.headline.stat || !d.headline.stat_label || !d.headline.body) die('headline needs stat, stat_label and body');
  if (!Array.isArray(d.queries) || !d.queries.length) die('queries must be a non-empty array');
  if (!Array.isArray(d.accuracy.quotes) || !d.accuracy.body) die('accuracy needs quotes and body');
  if (!Array.isArray(d.gaps.items) || !d.gaps.items.length) die('gaps.items must be a non-empty array');
  if (!Array.isArray(d.fixes.items) || !d.fixes.items.length) die('fixes.items must be a non-empty array');
  if (!Array.isArray(d.method) || !d.method.length) die('method must be a non-empty array');
  // cta, how_it_works and pricing are optional: a report presented live in a
  // meeting has no use for a "book a call" block, but one sent cold does.
  // cta comes in two shapes: a button block (title + button_text + button_url)
  // for a report sent cold, or a plain closing block (title + body, optional
  // contact) for one walked through in a meeting. Require one or the other.
  if (d.cta) {
    if (!d.cta.title) die('cta needs a title');
    const hasButton = d.cta.button_text && d.cta.button_url;
    const hasBody = d.cta.body;
    if (!hasButton && !hasBody) die('cta needs either button_text + button_url, or body');
  }
  if (d.how_it_works && !Array.isArray(d.how_it_works.steps)) die('how_it_works needs a steps array');
  // pricing items also come in two shapes: priced cards (name + price) or
  // scope cards sharing the fixes shape (title + how + effect). Mixing the two
  // inside one report would render half the cards blank, so reject that.
  // fixes.draft_url points at the design draft for this client. Restricted to
  // a /draft/ path on purpose: this link sits inside a client-facing report,
  // and the drafts are the one thing on this site that look like the client's
  // own website.
  if (d.fixes.draft_url && !/^\/draft\/[a-z0-9-]+\/$/.test(d.fixes.draft_url))
    die(`fixes.draft_url must be a /draft/<slug>/ path, got "${d.fixes.draft_url}"`);
  if (d.pricing) {
    if (!Array.isArray(d.pricing.items) || !d.pricing.items.length) die('pricing needs a non-empty items array');
    const scope = d.pricing.items.filter((i) => i.title && i.how);
    const priced = d.pricing.items.filter((i) => i.name && i.price);
    if (scope.length + priced.length !== d.pricing.items.length)
      die('every pricing item needs either name + price, or title + how');
    if (scope.length && priced.length)
      die('pricing items mix the priced shape (name + price) and the scope shape (title + how) — pick one per report');
  }
}

/* --------------------------------------------------------------------- CSS */

const css = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --navy:#14213D; --navy-2:#1B2A4E; --navy-3:#22335C;
  --amber:#FCA311;            /* accents + text on navy only */
  --amber-ink:#7A4A00;        /* amber-family text on light: WCAG AA on white */
  --light:#F4F6F9; --white:#fff; --grey:#5A6070; --ink:#1A1D24; --line:#D8DBE2;
  --red:#B3261E; --red-bg:#FCEBEA; --green:#1E7D46; --green-bg:#E9F3EC;
  --sky:#CADCFC; --sky-dim:#9AA3B5;
  --serif:Georgia,'Iowan Old Style','Times New Roman',serif;
  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  --ease:cubic-bezier(.16,.84,.44,1);
}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;font-family:var(--sans);color:var(--ink);font-size:17px;line-height:1.62;background:var(--white)}
h1,h2,h3{font-family:var(--serif);color:var(--navy);line-height:1.2;margin:0;font-weight:700}
a{color:var(--navy)}
img{max-width:100%}
.wrap{max-width:860px;margin:0 auto;padding:0 24px}
.kicker{font-size:12px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:var(--amber-ink);margin:0 0 10px;display:flex;align-items:center;gap:10px}
.kicker .n{font-family:var(--serif);font-size:13px;letter-spacing:0;color:var(--grey);font-weight:400}
.kicker .n::after{content:'';display:inline-block;width:18px;height:1px;background:var(--line);vertical-align:middle;margin-left:10px}

/* scroll progress */
.prog{position:fixed;inset:0 auto auto 0;height:3px;width:100%;transform:scaleX(0);transform-origin:0 50%;background:var(--amber);z-index:50}

/* hero */
.hero{background:var(--navy);color:var(--white);padding:76px 0 68px;position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;inset:auto -10% -60% 55%;height:340px;background:radial-gradient(circle at 50% 50%,rgba(252,163,17,.14),transparent 68%);pointer-events:none}
.hero .kicker{color:var(--amber)}
.hero .kicker .n{color:var(--sky-dim)}
.hero h1{color:var(--white);font-size:clamp(36px,6.4vw,56px);margin:0 0 18px;letter-spacing:-.01em}
.hero .lede{color:var(--sky);font-size:clamp(17px,2.4vw,20px);margin:0 0 28px;max-width:56ch}
.rule{width:64px;height:3px;background:var(--amber);margin:0 0 22px;transform-origin:0 50%}
.hero .meta{color:var(--sky-dim);font-size:14px;margin:0}

/* headline stat */
.headline{background:var(--navy-2);color:var(--white);padding:56px 0;position:relative}
.headline .kicker{color:var(--amber)}
.headline .kicker .n{color:var(--sky-dim)}
.statrow{display:flex;align-items:flex-start;gap:clamp(20px,5vw,48px);flex-wrap:wrap}
.big{font-family:var(--serif);font-size:clamp(60px,14vw,116px);font-weight:700;color:var(--amber);line-height:.9;margin:0;letter-spacing:-.02em}
.big-sub{font-family:var(--serif);font-size:clamp(20px,3.4vw,27px);font-weight:700;color:var(--white);margin:10px 0 0;max-width:24ch}
.dots{display:flex;gap:9px;margin:20px 0 0}
.dot{width:13px;height:13px;border-radius:50%;background:rgba(255,255,255,.16);flex:none}
.dot.miss{background:#E5544B}
.dot.hit{background:#39C07C}
.headline p.body{color:var(--sky);margin:26px 0 0;max-width:64ch}

section{padding:56px 0;border-bottom:1px solid var(--line)}
section h2{font-size:clamp(25px,4vw,33px);margin:0 0 10px}
section .sub{color:var(--grey);margin:0 0 30px;max-width:66ch}
p{margin:0 0 16px}

/* query cards */
.q{background:var(--light);border-radius:12px;padding:22px 24px;margin:0 0 14px;border:1px solid transparent}
.q.brand{background:var(--green-bg);border-color:rgba(30,125,70,.22)}
.qt{font-family:var(--serif);font-size:18px;font-style:italic;color:var(--ink);margin:0 0 16px}
.verdict{display:inline-flex;align-items:center;gap:7px;font-weight:700;font-size:12px;letter-spacing:1.1px;text-transform:uppercase;padding:5px 11px;border-radius:100px;white-space:nowrap}
.verdict.no{background:var(--red-bg);color:var(--red)}
.verdict.yes{background:#D7EBDF;color:var(--green)}
.verdict::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor}
.lbl{display:block;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--grey);margin:16px 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.chip{background:var(--white);border:1px solid var(--line);border-radius:100px;padding:5px 13px;font-size:14px;font-weight:600;color:var(--navy)}
.chip-note{font-size:14px;color:var(--grey)}
.qnote{margin:16px 0 0;padding:14px 16px;background:var(--white);border-left:3px solid var(--amber);border-radius:0 8px 8px 0;font-size:15px;color:var(--ink)}

/* rival tally */
.tally{display:flex;align-items:center;gap:20px;background:var(--navy);color:var(--white);border-radius:12px;padding:24px 26px;margin:26px 0 0}
.tally .n{font-family:var(--serif);font-size:clamp(42px,9vw,62px);font-weight:700;color:var(--amber);line-height:.9}
.tally .t{font-size:16px;color:var(--sky);max-width:26ch}

/* quotes */
blockquote{margin:0 0 16px;padding:18px 22px;background:var(--light);border-left:4px solid var(--amber);border-radius:0 10px 10px 0}
blockquote p{margin:0;font-family:var(--serif);font-style:italic;font-size:17px}
blockquote.flag{background:#FFF6E6;border-left-color:var(--amber-ink)}
blockquote.flag .tag{display:block;font-family:var(--sans);font-style:normal;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--amber-ink);margin:0 0 8px}
.src{font-size:13px;color:var(--grey);margin:-4px 0 24px}

/* gaps + fixes */
.gap,.fix{display:flex;gap:18px;padding:24px 0;border-top:1px solid var(--line)}
.gap:first-of-type,.fix:first-of-type{border-top:none;padding-top:6px}
.num{flex:0 0 36px;height:36px;border-radius:50%;background:var(--amber);color:var(--navy);font-family:var(--serif);font-weight:700;display:flex;align-items:center;justify-content:center;font-size:16px}
.gap h3,.fix h3{font-size:19px;margin:5px 0 7px}
.gap p{margin:0}
.good{background:var(--green-bg);border-radius:12px;padding:22px 24px;margin:28px 0 0;border:1px solid rgba(30,125,70,.2)}
.good p{margin:0}
.good strong{color:var(--green)}
.fix .how{color:var(--grey);font-size:15px;margin:0 0 10px}
.eff{margin:0;font-size:15px;padding:10px 14px;background:var(--light);border-radius:8px;border-left:3px solid var(--amber);display:flex;gap:9px}
.eff::before{content:'→';color:var(--amber-ink);font-weight:700;flex:none}
.draftlink{display:inline-flex;align-items:center;gap:9px;background:var(--navy);color:#fff;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:16px}
.draftlink::after{content:'→'}
.draftlink:hover{background:var(--navy-3)}

/* evidence */
figure{margin:0 0 30px}
.shot{display:block;width:100%;padding:0;border:1px solid var(--line);border-radius:10px;background:var(--light);overflow:hidden;cursor:zoom-in;position:relative}
.shot img{display:block;width:100%;height:auto}
.shot .zoom{position:absolute;inset:auto 10px 10px auto;background:rgba(20,33,61,.88);color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:6px 10px;border-radius:6px;opacity:0;transition:opacity .18s}
.shot:hover .zoom,.shot:focus-visible .zoom{opacity:1}
.missing{border:1px dashed var(--line);border-radius:10px;background:var(--light);padding:34px 24px;text-align:center;color:var(--grey);font-size:14px}
.missing code{font-size:13px;color:var(--ink)}
figcaption{font-size:14px;color:var(--grey);margin:12px 0 0;line-height:1.55}

/* lightbox */
dialog.lb{border:none;padding:0;background:transparent;max-width:96vw;max-height:96vh;width:auto}
dialog.lb::backdrop{background:rgba(10,16,30,.9)}
dialog.lb img{display:block;max-width:96vw;max-height:88vh;width:auto;border-radius:8px}
dialog.lb .x{position:absolute;top:-40px;right:0;background:none;border:none;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:6px}
dialog.lb form{position:relative}

/* step flow: how it works */
.flow{list-style:none;margin:0;padding:0;display:grid;gap:18px}
.step{background:var(--light);border-radius:12px;padding:20px 22px;position:relative}
.step .sn{display:flex;width:30px;height:30px;border-radius:50%;background:var(--navy);color:#fff;font-family:var(--serif);font-weight:700;align-items:center;justify-content:center;font-size:15px;margin:0 0 13px}
.step h3{font-size:17px;margin:0 0 7px}
.step p{font-size:15px;color:var(--grey);margin:0}
.step::after{content:'';position:absolute;background:var(--line);left:35px;bottom:-18px;width:2px;height:18px}
.step:last-child::after{display:none}
@media(min-width:820px){
  .flow{grid-template-columns:repeat(4,1fr);gap:16px}
  .step::after{top:34px;left:auto;right:-16px;bottom:auto;width:16px;height:2px}
}

/* pricing */
.prices{display:grid;gap:16px;margin:0 0 22px}
@media(min-width:700px){.prices{grid-template-columns:1fr 1fr}}
.price{border:1px solid var(--line);border-radius:12px;padding:24px;display:flex;flex-direction:column;background:var(--white)}
.price.hl{border:2px solid var(--amber);padding:23px}
.price .pn{font-family:var(--serif);font-size:19px;font-weight:700;color:var(--navy);margin:0 0 14px}
.price .pv{font-family:var(--serif);font-size:clamp(34px,6.4vw,44px);font-weight:700;color:var(--navy);line-height:1;margin:0}
.price .pu{font-size:14px;color:var(--grey);margin:7px 0 16px}
.price .pb{font-size:15px;margin:0 0 14px}
.price ul{margin:0;padding:0;list-style:none;font-size:15px;color:var(--grey)}
.price li{margin:0 0 8px;padding:0 0 0 20px;position:relative}
.price li::before{content:'';position:absolute;left:0;top:8px;width:7px;height:7px;border-radius:50%;background:var(--amber)}
.price li:last-child{margin:0}
.pnote{font-size:15px;color:var(--grey);margin:0}

/* pricing: the figure is the thing the reader is looking for, so it is set
   large and first. Options sit side by side because they are alternatives;
   a recurring item is marked and de-emphasised because it is an add-on to
   whichever option is chosen, not a third option. */
.pgrid{display:grid;gap:16px;margin:0 0 22px}
@media(min-width:720px){
  /* auto-fit rather than a fixed pair: two options sit side by side, and a
     report with only one package fills the row instead of leaving half of it
     empty next to the card */
  .pgrid{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
  /* auto-fit cannot collapse the second track when the recurring card spans
     both, so a report with a single package is told explicitly to fill the row
     rather than sit in half of it */
  .pgrid.single .pcard{grid-column:1/-1}
  /* the recurring item spans the row and lays itself out in two columns:
     identity on the left, detail on the right. Each element needs its own
     cell; putting terms and the get-box in one cell stacks them on top of
     each other and the terms disappear. */
  .pcard.recurring{grid-column:1/-1;display:grid;
    grid-template-columns:minmax(190px,250px) 1fr;gap:0 32px;align-content:start}
  .pcard.recurring .pname{grid-column:1;grid-row:1}
  .pcard.recurring .pfig{grid-column:1;grid-row:2;margin:0}
  .pcard.recurring .pterms{grid-column:2;grid-row:1/span 2;margin:0 0 14px}
  .pcard.recurring .pget{grid-column:2;grid-row:3;margin:0}}
.pcard{border:1px solid var(--line);border-top:3px solid var(--amber);border-radius:12px;
  padding:24px 26px;background:var(--white);display:flex;flex-direction:column}
.pcard.recurring{border-top-color:var(--line-strong,var(--line));background:var(--light)}
.pname{font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;
  color:var(--amber-ink);margin:0 0 12px}
.pcard.recurring .pname{color:var(--grey)}
.pfig{font-family:var(--serif);font-size:clamp(30px,4.6vw,40px);font-weight:700;
  color:var(--navy);line-height:1;margin:0 0 16px;display:flex;align-items:baseline;
  gap:10px;flex-wrap:wrap}
.punit{font-family:var(--sans);font-size:13px;font-weight:600;letter-spacing:.06em;
  text-transform:uppercase;color:var(--grey)}
.pterms{font-size:15px;color:var(--grey);margin:0 0 16px}
.pget{margin:auto 0 0;padding:14px 16px;background:var(--light);border-radius:8px}
.pcard.recurring .pget{background:var(--white)}
.pget span{display:block;font-size:11px;font-weight:700;letter-spacing:1.2px;
  text-transform:uppercase;color:var(--amber-ink);margin:0 0 6px}
.pget p{margin:0;font-size:15px}
.pnotes{display:grid;gap:14px;margin:0 0 20px}
.pnote{border-left:3px solid var(--line);padding:2px 0 2px 18px}
.pnote h3{font-size:16px;margin:0 0 5px}
.pnote p{margin:0;font-size:15px;color:var(--grey)}
.pnote-eff{margin-top:6px!important;color:var(--ink)!important}
.pnote-foot{font-size:15px;color:var(--grey);margin:0}

/* closing section (pricing): own ground, no trailing rule */
.closing{background:var(--light);border-bottom:none}

/* method */
.method{background:var(--light);border-radius:12px;padding:26px 28px}
.method p{font-size:15px;color:var(--grey)}
.method p:last-child{margin:0}

/* cta */
.cta{background:var(--navy);color:var(--white);padding:64px 0;position:relative;overflow:hidden}
.cta::after{content:'';position:absolute;inset:-40% 60% auto -10%;height:420px;background:radial-gradient(circle at 50% 50%,rgba(252,163,17,.12),transparent 68%);pointer-events:none}
.cta .kicker{color:var(--amber)}
.cta .kicker .n{color:var(--sky-dim)}
.cta h2{color:var(--white);font-size:clamp(25px,4.2vw,35px);margin:0 0 16px;max-width:30ch}
.cta p{color:var(--sky);max-width:58ch}
.btn{display:inline-flex;align-items:center;gap:10px;background:var(--amber);color:var(--navy);font-weight:700;text-decoration:none;padding:16px 30px;border-radius:8px;margin:14px 0 26px;font-size:17px;transition:transform .18s var(--ease),box-shadow .18s var(--ease)}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(252,163,17,.28)}
.btn::after{content:'→'}
.sign{color:var(--sky-dim);font-size:14px;line-height:1.7;margin:0}
.sign a{color:var(--sky)}

:focus-visible{outline:3px solid var(--amber);outline-offset:3px}

@media(max-width:640px){
  body{font-size:16px}
  section{padding:42px 0}
  .hero{padding:56px 0 48px}
  .gap,.fix{gap:14px}
  .num{flex-basis:32px;height:32px;font-size:15px}
  .statrow{gap:18px}
  .tally{flex-direction:column;align-items:flex-start;gap:8px}
}

/* ---- animation: opt-in via .js, so no-JS and print show everything ---- */
.js .reveal{opacity:0;transform:translateY(22px)}
.js .reveal.in{opacity:1;transform:none;transition:opacity .62s var(--ease),transform .62s var(--ease)}
.js .reveal.in.d1{transition-delay:.08s}.js .reveal.in.d2{transition-delay:.16s}
.js .reveal.in.d3{transition-delay:.24s}.js .reveal.in.d4{transition-delay:.32s}
.js .rule{transform:scaleX(0)}
.js .rule.in{transform:none;transition:transform .7s var(--ease) .2s}
.js .big{opacity:0;transform:scale(.9)}
.js .big.in{opacity:1;transform:none;transition:opacity .5s var(--ease),transform .6s var(--ease)}
.js .dot{transform:scale(0)}
.js .dot.in{transform:none;transition:transform .42s var(--ease)}
.js .chip{opacity:0;transform:translateY(6px)}
.js .chip.in{opacity:1;transform:none;transition:opacity .34s var(--ease),transform .34s var(--ease)}
/* numbered circles ride on their parent .reveal — they are not observed
   directly, so they must key off the ancestor's .in class or they stay at
   scale(0) and disappear entirely. */
.js .step{opacity:0;transform:translateY(16px)}
.js .step.in{opacity:1;transform:none;transition:opacity .5s var(--ease),transform .5s var(--ease)}
.js .step::after{opacity:0}
.js .step.in::after{opacity:1;transition:opacity .4s var(--ease) .3s}
.js .num{transform:scale(0)}
.js .reveal.in .num{transform:none;transition:transform .46s var(--ease) .12s}

@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .js .reveal,.js .rule,.js .big,.js .dot,.js .chip,.js .num,.js .reveal.in .num,.js .step,.js .step::after{opacity:1!important;transform:none!important;transition:none!important}
  .prog{display:none}
  .btn:hover{transform:none}
}

@media print{
  .prog,.btn,dialog.lb,.shot .zoom{display:none!important}
  .js .reveal,.js .rule,.js .big,.js .dot,.js .chip,.js .num,.js .reveal.in .num,.js .step,.js .step::after{opacity:1!important;transform:none!important}
  body{font-size:11pt}
  .hero,.headline,.cta{background:var(--white)!important;color:var(--ink)!important;padding:24pt 0!important}
  .closing{background:var(--white)!important}
  .hero::after,.cta::after{display:none}
  .hero h1,.cta h2{color:var(--navy)!important}
  .hero .lede,.headline p.body,.cta p{color:var(--ink)!important}
  .hero .meta,.sign{color:var(--grey)!important}
  .headline .big-sub{color:var(--navy)!important}
  .tally{background:var(--light)!important;color:var(--ink)!important}
  .tally .t{color:var(--ink)!important}
  .shot{cursor:default}
  section,.q,.gap,.fix,figure,.method,.tally,.step,.price{page-break-inside:avoid}
  h1,h2,h3{page-break-after:avoid}
  a[href^="http"]::after{content:' (' attr(href) ')';font-size:9pt;color:var(--grey)}
}`;

/* ----------------------------------------------------------------- runtime */

const js = `
(function(){
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // scroll progress
  var p = document.querySelector('.prog');
  if (p && !rm) {
    var tick = function(){
      var h = document.documentElement.scrollHeight - innerHeight;
      p.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')';
    };
    addEventListener('scroll', tick, {passive:true});
    addEventListener('resize', tick); tick();
  }

  // reveal on enter; stagger children marked data-stagger
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if (!e.isIntersecting) return;
      var el = e.target;
      io.unobserve(el);
      var kids = el.dataset.stagger ? el.querySelectorAll(el.dataset.stagger) : null;
      if (kids && kids.length) {
        Array.prototype.forEach.call(kids, function(k, i){
          setTimeout(function(){ k.classList.add('in'); }, i * 90);
        });
      }
      el.classList.add('in');
      if (el.dataset.count) countUp(el, +el.dataset.count);
    });
  }, {rootMargin:'0px 0px -8% 0px', threshold:0.15});

  document.querySelectorAll('.reveal,.rule,.big,[data-stagger],[data-count]')
    .forEach(function(el){ io.observe(el); });

  function countUp(el, to){
    if (rm || to > 400) { el.textContent = to; return; }
    var t0 = null, dur = 900;
    (function step(t){
      if (t0 === null) t0 = t;
      var k = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
    requestAnimationFrame(function(t){ t0 = t; });
  }

  // screenshot lightbox
  var lb = document.querySelector('dialog.lb');
  if (lb && lb.showModal) {
    var img = lb.querySelector('img');
    document.querySelectorAll('.shot').forEach(function(b){
      b.addEventListener('click', function(){
        img.src = b.dataset.full; img.alt = b.dataset.alt || '';
        lb.showModal();
      });
    });
    lb.addEventListener('click', function(e){ if (e.target === lb) lb.close(); });
  }
})();`;

/* --------------------------------------------------------------- rendering */

function renderDots(stat) {
  // "of" for English reports, "av" for Norwegian ones (e.g. "0 av 3") - purely
  // additive, existing "N of M" reports parse exactly as before.
  const m = /^(\d+)\s+(?:of|av)\s+(\d+)$/.exec(String(stat).trim());
  if (!m) return '';
  const hit = +m[1], total = +m[2];
  if (total < 1 || total > 12) return '';
  const dots = Array.from({ length: total }, (_, i) =>
    `<span class="dot ${i < hit ? 'hit' : 'miss'}"></span>`).join('');
  return `<div class="dots" data-stagger=".dot" aria-hidden="true">${dots}</div>`;
}

/** named_instead is written either as an array or as a comma-separated string. */
function rivals(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

function renderQuery(q, t) {
  const chips = rivals(q.named_instead).map((n) => `<span class="chip">${esc(n)}</span>`).join('');
  const note = q.named_instead_note ? `<span class="chip-note">${esc(q.named_instead_note)}</span>` : '';
  /* q.note is a framing note about the question itself, not about who was
     named: used to state up front why a query is in the set when its answer
     would otherwise read as a mismatch. Sits below the chips, visually
     separated, so it reads as our commentary rather than as more findings. */
  const qnote = q.note ? `        <p class="qnote">${esc(q.note)}</p>\n` : '';
  return `      <div class="q reveal${q.named ? ' brand' : ''}"${chips ? ' data-stagger=".chip"' : ''}>
        <p class="qt">&ldquo;${esc(q.text)}&rdquo;</p>
        <span class="verdict ${q.named ? 'yes' : 'no'}">${q.named ? t.named : t.notNamed}</span>
${chips ? `        <span class="lbl">${t.namedInstead}</span>
        <div class="chips">${chips}${note}</div>\n` : ''}${qnote}      </div>`;
}

function renderShot(s, i, hasFile, t) {
  const src = s.file.split('/').pop();
  const cap = esc(s.caption || '');
  const alt = esc(s.alt || s.caption || `Screenshot ${i + 1}`);
  if (!hasFile) {
    return `      <figure class="reveal">
        <div class="missing">${t.missingShot(esc(src))}</div>
        <figcaption>${cap}</figcaption>
      </figure>`;
  }
  return `      <figure class="reveal">
        <button type="button" class="shot" data-full="${esc(src)}" data-alt="${alt}" aria-label="${esc(t.enlargeAlt(i + 1))}">
          <img src="${esc(src)}" alt="${alt}" loading="lazy" decoding="async">
          <span class="zoom">${t.enlarge}</span>
        </button>
        <figcaption>${cap}</figcaption>
      </figure>`;
}

/* UI chrome: labels the JSON itself never carries. "lang": "nb" on an audit
   switches all of these; the JSON's own prose (queries, quotes, findings) is
   written directly in whatever language the audit was conducted in either
   way, and is untouched by this. Defaults to English so every existing
   report keeps rendering exactly as before. */
const STRINGS = {
  en: {
    htmlLang: 'en-GB', kicker: 'GEO audit', titlePrefix: 'GEO audit: ',
    metaDescription: (c) => `Private GEO audit prepared for ${c} by Elevate Marketing.`,
    preparedFor: (c, date) => `Prepared for ${esc(c)} by Elevate Marketing &middot; ${esc(date)}`,
    kHeadline: 'The headline', kHowItWorks: 'How it works', kVisibility: 'Visibility',
    kAccuracy: 'Accuracy', kGaps: 'Gaps', kWork: 'The work', kEvidence: 'Evidence',
    kMethod: 'Method', kInvestment: 'What this costs', kNextStep: 'Next step',
    named: 'Named', notNamed: 'Not named', namedInstead: 'Named instead',
    worthWatching: 'Worth watching', alreadyWorking: 'Already working for you: ',
    defaultRivalLabel: 'rival firms named instead of you',
    evidenceTitle: 'Screenshots of every answer quoted',
    evidenceSub: (date) => `All captured ${date}. Nothing in this report is paraphrased from memory.`,
    enlarge: 'Enlarge', enlargeAlt: (i) => `Enlarge screenshot ${i}`, close: 'Close',
    methodTitle: 'How this was measured',
    missingShot: (f) => `Screenshot pending: drop <code>${f}</code> into <code>audits/&lt;slug&gt;/</code> and rebuild.`,
    seeDraft: 'See what this looks like',
    oneOff: 'one-off', whatYouGet: 'What you get'
  },
  nb: {
    htmlLang: 'nb-NO', kicker: 'GEO-rapport', titlePrefix: 'GEO-rapport: ',
    metaDescription: (c) => `Privat GEO-rapport utarbeidet for ${c} av Elevate Marketing.`,
    preparedFor: (c, date) => `Utarbeidet for ${esc(c)} av Elevate Marketing &middot; ${esc(date)}`,
    kHeadline: 'Hovedfunn', kHowItWorks: 'Slik gjør vi det', kVisibility: 'Synlighet',
    kAccuracy: 'Nøyaktighet', kGaps: 'Svakheter', kWork: 'Tiltakene', kEvidence: 'Bevis',
    kMethod: 'Metode', kInvestment: 'Investering', kNextStep: 'Neste steg',
    named: 'Navngitt', notNamed: 'Ikke navngitt', namedInstead: 'Navngitt i stedet',
    worthWatching: 'Verdt å følge med på', alreadyWorking: 'Det som allerede fungerer: ',
    defaultRivalLabel: 'konkurrenter navngitt i stedet for dere',
    evidenceTitle: 'Skjermbilder av hvert svar som er sitert',
    evidenceSub: (date) => `Alle tatt ${date}. Ingenting i denne rapporten er gjengitt fra hukommelsen.`,
    enlarge: 'Forstørr', enlargeAlt: (i) => `Forstørr skjermbilde ${i}`, close: 'Lukk',
    methodTitle: 'Hvordan dette ble målt',
    missingShot: (f) => `Skjermbilde mangler: legg <code>${f}</code> i <code>audits/&lt;slug&gt;/</code> og bygg på nytt.`,
    seeDraft: 'Se hvordan dette ser ut',
    oneOff: 'engangssum', whatYouGet: 'Dette får dere'
  }
};

function render(d, shotsPresent) {
  let secN = 0;
  const n = () => `<span class="n">${String(++secN).padStart(2, '0')}</span>`;
  const sig = d.signature || {};
  const flag = d.accuracy.flag_quote_index;
  const t = STRINGS[d.lang] || STRINGS.en;

  /* Pricing renders in two shapes (see validate): priced cards, or scope cards
     that reuse the fixes layout so cost sits in the same visual grammar as the
     work it pays for. Built here rather than inline because the section is
     placed between fixes and method, and the section counter must run in
     document order. */
  /* Pricing.
     The items arrive in the same shape as fixes (title + how + effect), and
     rendering them that way was a mistake: the figure ended up as the third
     word of a grey paragraph, and the numbered circles read as steps one to
     three when the first two are alternatives and the last is an add-on.
     Two of the items are not priced at all, they are statements ("we are not
     proposing a new website"), so listing them alongside the packages made
     them look like products.
     So the items are split on whether `how` opens with a figure. Priced ones
     become cards with the figure set large and the terms beneath it; the rest
     become plain notes under them, which is what they are. */
  const priceItems = (d.pricing && d.pricing.items) || [];
  const scopeShaped = priceItems.length > 0 && priceItems.every((it) => it.title && it.how);
  /* the digit group must not end on the comma that separates the figure from
     the sentence after it, or the card reads "GBP 1,850," */
  const PRICE_RE = /^([A-Z]{3}\s?[\d,]*\d(?:\.\d+)?)(\s+per\s+\w+)?\s*[.,]?\s*/;
  const priced = [];
  const notes = [];
  if (scopeShaped) {
    for (const it of priceItems) {
      const m = PRICE_RE.exec(it.how);
      if (m) {
        priced.push({
          title: it.title,
          figure: m[1].trim(),
          unit: (m[2] || '').trim() || t.oneOff,
          /* the figure is lifted out of the front of the sentence, so what is
             left starts mid-sentence and lowercase */
          terms: (() => { const r = it.how.slice(m[0].length).trim();
            return r ? r[0].toUpperCase() + r.slice(1) : r; })(),
          effect: it.effect,
          recurring: /per\s+\w+/.test(m[2] || ''),
        });
      } else {
        notes.push(it);
      }
    }
  }

  const renderPricing = () => !d.pricing ? '' : `<section class="closing"><div class="wrap">
  <p class="kicker reveal">${n()} ${t.kInvestment}</p>
  <h2 class="reveal">${esc(d.pricing.title)}</h2>
  <p class="sub reveal d1">${esc(d.pricing.sub || '')}</p>
${scopeShaped ? `  <div class="pgrid${priced.filter((x) => !x.recurring).length === 1 ? ' single' : ''}">
${priced.map((it) => `    <div class="pcard${it.recurring ? ' recurring' : ''} reveal">
      <p class="pname">${esc(it.title)}</p>
      <p class="pfig">${esc(it.figure)}<span class="punit">${esc(it.unit)}</span></p>
${it.terms ? `      <p class="pterms">${esc(it.terms)}</p>\n` : ''}${it.effect ? `      <div class="pget"><span>${t.whatYouGet}</span><p>${esc(it.effect)}</p></div>\n` : ''}    </div>`).join('\n')}
  </div>
${notes.length ? `  <div class="pnotes reveal">
${notes.map((it) => `    <div class="pnote"><h3>${esc(it.title)}</h3><p>${esc(it.how)}</p>${it.effect ? `<p class="pnote-eff">${esc(it.effect)}</p>` : ''}</div>`).join('\n')}
  </div>\n` : ''}` : `  <div class="prices">
${priceItems.map((it) => `    <div class="price${it.highlight ? ' hl' : ''} reveal">
      <p class="pn">${esc(it.name)}</p>
      <p class="pv">${esc(it.price)}</p>
      <p class="pu">${esc(it.unit || '')}</p>
${it.body ? `      <p class="pb">${esc(it.body)}</p>\n` : ''}${(it.bullets || []).length ? `      <ul>\n${it.bullets.map((bl) => `        <li>${esc(bl)}</li>`).join('\n')}\n      </ul>\n` : ''}    </div>`).join('\n')}
  </div>`}
${d.pricing.note ? `  <p class="pnote-foot reveal">${esc(d.pricing.note)}</p>\n` : ''}</div></section>

`;

  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<meta name="referrer" content="no-referrer">
<title>${t.titlePrefix}${esc(d.company)}</title>
<meta name="description" content="${esc(t.metaDescription(d.company))}">
<meta name="theme-color" content="#14213D">
<style>${css}</style>
</head>
<body>
<script>document.documentElement.className+=' js';</script>
<div class="prog" aria-hidden="true"></div>

<header class="hero"><div class="wrap">
  <p class="kicker reveal">${t.kicker}</p>
  <h1 class="reveal d1">${esc(d.company)}</h1>
  <p class="lede reveal d2">${esc(d.lede)}</p>
  <div class="rule"></div>
  <p class="meta reveal d3">${t.preparedFor(d.company, d.date)}</p>
</div></header>

<div class="headline"><div class="wrap">
  <p class="kicker reveal">${t.kHeadline}</p>
  <div class="statrow">
    <div>
      <p class="big">${esc(d.headline.stat)}</p>
      ${renderDots(d.headline.stat)}
    </div>
    <p class="big-sub reveal d1">${esc(d.headline.stat_label)}</p>
  </div>
  <p class="body reveal d2">${esc(d.headline.body)}</p>
</div></div>

${d.how_it_works ? `<section><div class="wrap">
  <p class="kicker reveal">${n()} ${t.kHowItWorks}</p>
  <h2 class="reveal">${esc(d.how_it_works.title)}</h2>
  <p class="sub reveal d1">${esc(d.how_it_works.sub || '')}</p>
  <ol class="flow" data-stagger=".step">
${d.how_it_works.steps.map((st, i) => `    <li class="step">
      <span class="sn" aria-hidden="true">${i + 1}</span>
      <h3>${esc(st.title)}</h3>
      <p>${esc(st.body)}</p>
    </li>`).join('\n')}
  </ol>
${d.how_it_works.close ? `  <p class="reveal" style="margin-top:28px">${esc(d.how_it_works.close)}</p>\n` : ''}</div></section>

` : ''}<section><div class="wrap">
  <p class="kicker reveal">${n()} ${t.kVisibility}</p>
  <h2 class="reveal">${esc(d.visibility.title)}</h2>
  <p class="sub reveal d1">${esc(d.visibility.sub)}</p>
${d.queries.map((q) => renderQuery(q, t)).join('\n')}
${d.visibility.rival_count ? `  <div class="tally reveal">
    <span class="n" data-count="${esc(d.visibility.rival_count)}">${esc(d.visibility.rival_count)}</span>
    <span class="t">${esc(d.visibility.rival_count_label || t.defaultRivalLabel)}</span>
  </div>\n` : ''}${d.visibility.close ? `  <p class="reveal" style="margin-top:22px">${esc(d.visibility.close)}</p>\n` : ''}</div></section>

<section><div class="wrap">
  <p class="kicker reveal">${n()} ${t.kAccuracy}</p>
  <h2 class="reveal">${esc(d.accuracy.title)}</h2>
  <p class="sub reveal d1">${esc(d.accuracy.sub)}</p>
${d.accuracy.quotes.map((q, i) => `  <blockquote class="reveal${i === flag ? ' flag' : ''}">${
    i === flag ? `<span class="tag">${t.worthWatching}</span>` : ''
  }<p>&ldquo;${esc(q)}&rdquo;</p></blockquote>`).join('\n')}
  <p class="src reveal">${esc(d.accuracy.source || '')}</p>
${d.accuracy.body.map((p) => `  <p class="reveal">${esc(p)}</p>`).join('\n')}
</div></section>

<section><div class="wrap">
  <p class="kicker reveal">${n()} ${t.kGaps}</p>
  <h2 class="reveal">${esc(d.gaps.title)}</h2>
  <p class="sub reveal d1">${esc(d.gaps.sub)}</p>
${d.gaps.items.map((g, i) => `  <div class="gap reveal">
    <div class="num" aria-hidden="true">${i + 1}</div>
    <div><h3>${esc(g.title)}</h3><p>${esc(g.body)}</p></div>
  </div>`).join('\n')}
${d.gaps.already_works ? `  <div class="good reveal"><p><strong>${t.alreadyWorking}</strong>${esc(d.gaps.already_works)}</p></div>\n` : ''}</div></section>

<section><div class="wrap">
  <p class="kicker reveal">${n()} ${t.kWork}</p>
  <h2 class="reveal">${esc(d.fixes.title)}</h2>
  <p class="sub reveal d1">${esc(d.fixes.sub)}</p>
${d.fixes.items.map((f, i) => `  <div class="fix reveal">
    <div class="num" aria-hidden="true">${i + 1}</div>
    <div>
      <h3>${esc(f.title)}</h3>
      <p class="how">${esc(f.how)}</p>
      <p class="eff">${esc(f.effect)}</p>
    </div>
  </div>`).join('\n')}
${d.fixes.draft_url ? `  <p class="reveal" style="margin-top:26px"><a class="draftlink" href="${esc(d.fixes.draft_url)}">${t.seeDraft}</a></p>\n` : ''}${d.fixes.disclaimer ? `  <p class="reveal" style="margin-top:26px">${esc(d.fixes.disclaimer)}</p>\n` : ''}</div></section>

${(d.screenshots || []).length ? `<section><div class="wrap">
  <p class="kicker reveal">${n()} ${t.kEvidence}</p>
  <h2 class="reveal">${t.evidenceTitle}</h2>
  <p class="sub reveal d1">${esc(t.evidenceSub(d.date))}</p>
${d.screenshots.map((s, i) => renderShot(s, i, shotsPresent.has(s.file), t)).join('\n')}
</div></section>

<dialog class="lb"><form method="dialog"><button class="x" aria-label="${t.close}">&times;</button><img src="" alt=""></form></dialog>
` : ''}
${renderPricing()}<section><div class="wrap">
  <p class="kicker reveal">${n()} ${t.kMethod}</p>
  <h2 class="reveal">${t.methodTitle}</h2>
  <div class="method reveal d1">
${d.method.map((p) => `    <p>${esc(p)}</p>`).join('\n')}
  </div>
</div></section>

${d.cta ? `<div class="cta"><div class="wrap">
  <p class="kicker reveal">${t.kNextStep}</p>
  <h2 class="reveal">${esc(d.cta.title)}</h2>
  <p class="reveal d1">${esc(d.cta.body || '')}</p>
${d.cta.button_url && d.cta.button_text ? `  <a class="btn reveal d2" href="${esc(d.cta.button_url)}">${esc(d.cta.button_text)}</a>\n` : ''}${d.cta.contact ? `  <p class="reveal d2" style="margin-top:18px"><a href="mailto:${esc(d.cta.contact)}${d.cta.contact_subject ? '?subject=' + encodeURIComponent(d.cta.contact_subject) : ''}" style="color:var(--amber)">${esc(d.cta.contact)}</a></p>\n` : ''}${sig.entity || sig.address || sig.email ? `  <p class="sign reveal d3">${sig.entity ? esc(sig.entity) + '<br>' : ''}${sig.address ? esc(sig.address) + '<br>' : ''}${
    sig.email ? `<a href="mailto:${esc(sig.email)}">${esc(sig.email)}</a>` : ''
  }</p>\n` : ''}
${sig.ownership ? `  <p class="sign reveal d3" style="margin-top:18px">${esc(sig.ownership)}</p>\n` : ''}</div></div>` : ''}

<script>${js}</script>
</body>
</html>
`;
}

/* -------------------------------------------------------------------- main */

if (!existsSync(SRC)) {
  console.log('  reports: no audits/ directory, nothing to build');
  process.exit(0);
}

let missingAny = false;
const files = readdirSync(SRC).filter((f) => f.endsWith('.json'));
if (!files.length) {
  console.log('  reports: no audit data files, nothing to build');
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const f of files) {
  const file = join(SRC, f);
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`\n  ✗ ${f}: invalid JSON — ${e.message}\n`);
    process.exit(1);
  }
  validate(data, file);

  const dir = join(OUT, data.slug);
  mkdirSync(dir, { recursive: true });

  // copy screenshots that exist; the page renders a labelled placeholder for the rest
  const shotDir = join(SRC, data.slug);
  const present = new Set();
  const missing = [];
  for (const s of data.screenshots || []) {
    // file may carry a full path from wherever the audit was assembled
    const base = s.file.split('/').pop();
    const from = join(shotDir, base);
    if (existsSync(from) && statSync(from).isFile() && ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(base).toLowerCase())) {
      copyFileSync(from, join(dir, base));
      present.add(s.file);
    } else {
      missing.push(base);
    }
  }

  writeFileSync(join(dir, 'index.html'), render(data, present));
  const kb = (statSync(join(dir, 'index.html')).size / 1024).toFixed(1);
  console.log(`  reports: /report/${data.slug} (${kb} kB HTML, ${present.size}/${(data.screenshots || []).length} screenshots)`);
  if (missing.length) {
    missingAny = true;
    console.log(`    ⚠ MISSING EVIDENCE in audits/${data.slug}/: ${missing.join(', ')}`);
    console.log(`      The page claims "screenshots of every answer quoted". Do not send it until these are in place.`);
  }
}

if (missingAny) console.log('\n  \u26a0 Evidence screenshots are missing (listed above). Reports are not deliverable until they render.');
