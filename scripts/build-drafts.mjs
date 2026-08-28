#!/usr/bin/env node
/**
 * Design draft publisher.
 *
 * Reads drafts/drafts.json + the Claude Design HTML in drafts/<dir>/ and writes
 * standalone pages to public/draft/<slug>/.
 *
 * Why this exists rather than committing the HTML straight into public/: the
 * design lives in Claude Design and gets re-exported. Everything this script
 * does is a mechanical fix-up of an export, so a re-export means re-running one
 * command rather than hand-patching files again and re-deriving which edits
 * were ours.
 *
 * What it fixes up:
 *  - flat foo.html links become the published routes (/draft/<slug>/about/),
 *    written absolute so a page works at any depth
 *  - <image-slot>, an editor affordance with no runtime here, becomes a static
 *    labelled frame. Left alone it is an unknown inline element: the style
 *    attribute does not apply, so it collapses to nothing and the layout has a
 *    silent hole where a photograph should be
 *
 * What it refuses to ship (these are the guarantees, so they are asserted, not
 * assumed): a page without the robots meta, without no-referrer, with a title
 * that does not start with "Draft", without the draft banner, or with a link to
 * a page that is not published.
 *
 * IMPORTANT: these pages look like a prospect's real website. They must never
 * be indexed and must never be linked to from anywhere public. Defence in
 * depth: robots meta here, X-Robots-Tag in netlify.toml, no index page, no
 * inbound links, unguessable slug, no-referrer.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'drafts');
const OUT = join(root, 'public', 'draft');

const die = (msg) => {
  console.error(`\n  ✗ drafts: ${msg}\n`);
  process.exit(1);
};

if (!existsSync(join(SRC, 'drafts.json'))) {
  console.log('  drafts: no drafts/drafts.json, nothing to build');
  process.exit(0);
}

const cfg = JSON.parse(readFileSync(join(SRC, 'drafts.json'), 'utf8'));

/** The editor's image placeholder, rendered as something a client can read. */
function staticImageFrame(placeholder) {
  const label = placeholder && /founder/i.test(placeholder)
    ? '[[TO CONFIRM: photograph of founder]]'
    : `[[TO CONFIRM: ${placeholder || 'photograph'}]]`;
  return (
    '<div style="width:240px;height:300px;border:1px dashed #D6A800;border-radius:3px;' +
    'background:#FFFBEA;display:flex;align-items:center;justify-content:center;' +
    'padding:16px;box-sizing:border-box">' +
    '<span style="font-family:Poppins,sans-serif;font-size:11px;font-weight:500;' +
    'line-height:1.5;color:#3A2C00;text-align:center">' + label + '</span></div>'
  );
}

/**
 * Mobile breakpoint.
 *
 * The export hard-codes desktop geometry inline (72px side padding, 40-48px
 * display type, multi-column grids) and ships no breakpoint, so a phone gets
 * the desktop layout squeezed into 375px: no horizontal overflow, but a hero
 * nearly a thousand pixels tall. The brief asks for a genuinely responsive
 * page rather than a separate mobile artboard, and the Talentline acceptance
 * test (verification band reachable without scrolling) cannot pass without it.
 *
 * Inline styles beat a stylesheet, hence !important. Selectors match the exact
 * inline strings present in the export rather than a substring like "72px",
 * which would also catch gap and margin declarations on unrelated elements.
 */
const MOBILE_CSS = `
@media (max-width:640px){
  [style*="padding:0 72px"],[style*="padding:16px 72px"],[style*="padding:24px 72px"],
  [style*="padding:32px 72px"],[style*="padding:34px 72px"],[style*="padding:56px 72px"],
  [style*="padding:60px 72px"],[style*="padding:72px 72px"],[style*="padding:64px 60px"],
  [style*="padding:60px 54px"]{padding-left:20px!important;padding-right:20px!important}
  [style*="padding:56px 72px"],[style*="padding:60px 72px"],[style*="padding:72px 72px"],
  [style*="padding:64px 60px"],[style*="padding:60px 54px"]{padding-top:28px!important;padding-bottom:28px!important}
  [style*="margin:0 72px"],[style*="margin:36px 72px"],[style*="margin:40px 72px"],
  [style*="margin:44px 72px"]{margin-left:20px!important;margin-right:20px!important}
  [style*="gap:44px"],[style*="gap:48px"],[style*="gap:56px"],
  [style*="gap:60px"],[style*="gap:64px"],[style*="gap:72px"]{gap:22px!important}
  [style*="font-size:40px"],[style*="font-size:42px"]{font-size:27px!important}
  [style*="font-size:46px"],[style*="font-size:48px"]{font-size:29px!important}
  [style*="font-size:28px"],[style*="font-size:29px"],[style*="font-size:30px"],
  [style*="font-size:32px"]{font-size:22px!important}
  /* the concepts use display type up to 72px, which sets a min-content width
     wider than a phone and drags the whole column out with it */
  [style*="font-size:44px"],[style*="font-size:50px"],[style*="font-size:52px"]{font-size:29px!important}
  [style*="font-size:66px"],[style*="font-size:68px"],[style*="font-size:72px"]{font-size:31px!important}
  /* a long unbroken word in a narrow column is the other way a page widens */
  h1,h2,h3,p,span,em,li{overflow-wrap:break-word!important}
  /* the verification fields stay two-up so the band keeps its shape and height
     instead of becoming a long stack that pushes itself off the screen */
  [style*="grid-template-columns:repeat(4,1fr)"],
  [style*="grid-template-columns:1.5fr 1fr 1fr 1fr"]{grid-template-columns:1fr 1fr!important}
  [style*="grid-template-columns:repeat(3,1fr)"],[style*="grid-template-columns:1fr 1fr"],
  [style*="grid-template-columns:240px 1fr"],[style*="grid-template-columns:1fr 320px"],
  [style*="grid-template-columns:1fr 380px"],[style*="grid-template-columns:1fr 420px"],
  [style*="grid-template-columns:1fr 460px"],
  [style*="grid-template-columns:1fr 400px"],[style*="grid-template-columns:1fr 440px"],
  [style*="grid-template-columns:1fr 480px"],[style*="grid-template-columns:1fr 520px"],
  [style*="grid-template-columns:340px 1fr"],[style*="grid-template-columns:480px 1fr"]{grid-template-columns:1fr!important}
  /* the concept exports use wider grids and non-wrapping flex rows than the
     first batch did; on a phone both push the page sideways */
  [style*="grid-template-columns:repeat(5,1fr)"],
  [style*="grid-template-columns:1.4fr 1fr 1fr 1.3fr"],
  [style*="grid-template-columns:1.4fr 1fr 1fr 1.2fr"]{grid-template-columns:1fr 1fr!important}
  [style*="display:flex"]:not([style*="flex-direction:column"]){flex-wrap:wrap!important}
  [style*="gap:38px"],[style*="gap:36px"],[style*="gap:34px"],
  [style*="gap:32px"],[style*="gap:30px"]{gap:14px!important}
  /* tighten the mid-size blocks so the verification band still clears the fold
     on a narrower handset (360x740), not just on a 375-wide one */
  [style*="padding:28px 32px"]{padding:18px 20px 20px!important}
  [style*="padding:26px 28px"],[style*="padding:20px 22px"]{padding:16px 18px!important}
  [style*="padding:30px"]{padding:16px!important}
  [style*="padding:22px 24px"],[style*="padding:22px 0 22px 24px"]{padding:14px 16px!important}
  [style*="gap:28px"]{gap:16px!important}
  [style*="gap:24px"]{gap:13px!important}
  [style*="gap:20px"]{gap:12px!important}
  /* the client's own site header: fixed 76px with a 36px-gap nav row beside the
     wordmark, which on a phone squeezes the nav into three-line items. Let it
     stack and breathe instead. */
  [style*="height:76px"][style*="justify-content:space-between"]{
    height:auto!important;flex-wrap:wrap!important;gap:6px 16px!important;
    padding-top:12px!important;padding-bottom:12px!important}
  [style*="height:76px"][style*="justify-content:space-between"] [style*="gap:36px"]{
    gap:14px!important;flex-wrap:wrap!important}
  .dc-banner{padding-left:20px!important;padding-right:20px!important}
  .dc-nav{padding-left:20px!important;padding-right:20px!important}
}
/* Print. These sheets get printed for the meeting, so the nav chips are dead
   weight on paper and the dark strip is a waste of toner. The banner itself
   stays: on a printed page that is the only thing saying this is not the
   client's real site, so it is kept and inverted rather than hidden. */
@media print{
  .dc-nav{display:none!important}
  .dc-banner{position:static!important;background:#fff!important;
    border-bottom:2px solid #000!important;padding:6px 0!important}
  .dc-banner span{color:#000!important;font-weight:700!important}
  .dc-banner i{background:#000!important}
}`;

/**
 * Raw Claude Design canvas export (.dc.html) -> a standalone page.
 *
 * The first batch of drafts arrived already converted. These did not: they are
 * the canvas format, which is a <x-dc> wrapper, a <helmet> block linking the
 * shared design-system bundle, and one artboard per top-level div. None of that
 * survives outside the editor, so it is rebuilt here.
 *
 * Checked before relying on it: the concepts use literal inline styles and no
 * CSS custom properties, and the only non-standard tags are <x-dc> and
 * <image-slot>. So the _ds bundle, its token stylesheets and support.js are all
 * unnecessary for rendering and are dropped rather than inlined. Montserrat and
 * Poppins fall back to system-ui, exactly as on the already-published drafts,
 * because a draft must render standalone with no external request.
 *
 * Each export carries two top-level blocks: the page, and a "Canvas note" that
 * says of itself that it is not part of the page. The note is the list of
 * fields to confirm, so it becomes the printable /checklist/ rather than being
 * published as part of the page or thrown away.
 */
/** Balanced-tag scan for the direct element children of a fragment. */
function topLevelBlocks(html) {
  const out = [];
  const VOID = new Set(['br', 'img', 'meta', 'input', 'hr', 'source', 'link']);
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let depth = 0, start = null, m;
  while ((m = tag.exec(html))) {
    const [, closing, name, selfClosing] = m;
    if (VOID.has(name.toLowerCase())) continue;
    if (!closing && !selfClosing) {
      if (depth === 0) start = m.index;
      depth += 1;
    } else if (closing) {
      depth -= 1;
      if (depth === 0 && start !== null) { out.push({ start, end: tag.lastIndex, html: html.slice(start, tag.lastIndex) }); start = null; }
    }
  }
  return out;
}

function splitCanvas(raw, file) {
  const open = raw.indexOf('<x-dc>');
  const close = raw.indexOf('</x-dc>');
  if (open === -1 || close === -1) die(`${file}: no <x-dc> wrapper, is this a canvas export?`);
  let inner = raw.slice(open + '<x-dc>'.length, close);
  inner = inner.replace(/<helmet>[\s\S]*?<\/helmet>/g, '');

  const blocks = topLevelBlocks(inner).map((b) => b.html);
  if (!blocks.length) die(`${file}: no top-level blocks found inside <x-dc>`);

  const isNote = (b) => /Canvas note/i.test(b);
  const page = blocks.filter((b) => !isNote(b)).join('\n');
  const note = blocks.find(isNote) || '';
  if (!page.trim()) die(`${file}: everything looked like a canvas note, nothing left to publish`);
  return { page, note };
}

/**
 * The concept marks an unconfirmed value as grey italic with a dotted underline.
 * That is elegant in a design review and far too quiet on a page a client may
 * read as their real site: REGLER.md requires placeholders rendered visibly and
 * in yellow, and the reason is specific rather than stylistic. An unverified
 * company number sitting unmarked on the page whose job is to prove the company
 * is real is worse than no page. Same inline flow, unmissable treatment.
 */
const CONFIRM_EM = /<em style="font-style:italic;[^"]*border-bottom:1px dotted[^"]*">/g;
const CONFIRM_STYLE =
  '<em style="font-style:normal;background:#FFE066;border:1px solid #D6A800;' +
  'color:#3A2C00;border-radius:3px;padding:1px 6px;font-weight:500;' +
  'white-space:normal;box-decoration-break:clone;-webkit-box-decoration-break:clone">';

function canvasToPage(raw, d, p) {
  const { page, note } = splitCanvas(raw, p.canvas);
  const body = p.part === 'note' ? note : page;
  if (p.part === 'note' && !note) die(`${p.canvas}: asked for the canvas note but it has none`);

  let html = body;

  /* editor affordance -> labelled frame */
  html = html.replace(
    /<image-slot\b[^>]*?(?:placeholder="([^"]*)")?[^>]*><\/image-slot>/g,
    (_m, placeholder) => staticImageFrame(placeholder)
  );

  /* quiet placeholder -> unmistakable one */
  const confirmCount = (html.match(CONFIRM_EM) || []).length;
  html = html.replace(CONFIRM_EM, CONFIRM_STYLE);

  /* An artboard is a fixed canvas, so the export pins widths in pixels
     throughout: the 1440 frame, and dozens of inner columns from 340px up.
     On a real page each of those is a maximum, not a width, or the page
     scrolls sideways on a phone. Rewritten here rather than fought with
     !important overrides for every value.
     The lookbehind keeps it from matching max-width, which would otherwise
     compound on a second pass. Anything under 320px is left alone: those are
     icons, rules and avatars, and they should keep their size. */
  html = html.replace(/(?<!max-)width:(\d{3,})px/g, (m, px) =>
    Number(px) >= 320 ? `max-width:${px}px;width:100%` : m);

  /* Drop the canvas banner: centred, 34px, and worded for a design review. The
     published page needs REGLER.md's wording and a banner that stays visible
     while scrolling, so it is replaced rather than restyled.
     Done structurally rather than with a regex. The banner is the first child
     of the artboard wrapper and contains nested elements, so a non-greedy
     pattern ending at </div></div> runs past it and eats the site header's
     opening tag with it, which is exactly what happened first time round. */
  if (p.part !== 'note') {
    const wrappers = topLevelBlocks(html);
    if (wrappers.length !== 1) die(`${p.canvas}: expected one artboard wrapper, found ${wrappers.length}`);
    const w = wrappers[0];
    const openEnd = w.html.indexOf('>') + 1;
    const closeStart = w.html.lastIndexOf('</');
    const shell = { open: w.html.slice(0, openEnd), close: w.html.slice(closeStart) };
    const inner = w.html.slice(openEnd, closeStart);
    const kids = topLevelBlocks(inner);
    if (!kids.length) die(`${p.canvas}: artboard wrapper has no children`);
    if (!/Not a published site/i.test(kids[0].html))
      die(`${p.canvas}: expected the canvas banner as the first block, found "${kids[0].html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)}". Refusing to guess which block to drop.`);
    html = shell.open + inner.slice(kids[0].end) + shell.close;
  }

  const banner =
    `<div class="dc-banner"><i></i><span>Draft prepared by Elevate Marketing. ` +
    `Not published by ${d.company}.</span></div>`;

  return { html: banner + '\n' + html, confirmCount };
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let pageCount = 0;

for (const d of cfg.drafts) {
  if (!/^[a-z0-9-]+-[a-z0-9]{5,}$/.test(d.slug))
    die(`slug "${d.slug}" needs a random suffix of at least 5 characters`);

  const base = `/draft/${d.slug}`;
  /** file name in the export -> published URL */
  const routeOf = new Map(
    d.pages.map((p) => [p.file || p.canvas, p.route ? `${base}/${p.route}/` : `${base}/`])
  );

  for (const p of d.pages) {
    let html;

    if (p.canvas) {
      /* raw canvas export: rebuild the document around the artboard */
      const from = join(SRC, d.dir, p.canvas);
      if (!existsSync(from)) die(`${d.dir}/${p.canvas} is listed in drafts.json but not on disk`);
      const built = canvasToPage(readFileSync(from, 'utf8'), d, p);
      if (p.part !== 'note' && built.confirmCount === 0)
        die(`${p.canvas}: no placeholders found. Either the concept states everything as fact, which REGLER.md forbids, or the markup changed and they are no longer being highlighted.`);
      html = `<!DOCTYPE html>
<html lang="${p.lang || 'en-GB'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<meta name="referrer" content="no-referrer">
<title>${p.title}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{background:#0E1116;font-family:Poppins,system-ui,sans-serif}
  a{color:#00FFC5;text-decoration:none}
  a:hover{color:#00D9A8}
  .dc-banner{position:sticky;top:0;z-index:99;display:flex;align-items:center;gap:14px;
    min-height:40px;padding:8px 32px;background:#0E1116;
    border-bottom:1px solid rgba(0,255,197,0.5)}
  .dc-banner i{display:block;width:20px;height:2px;background:#00FFC5;flex:none}
  .dc-banner span{font-family:Poppins,sans-serif;font-size:12px;letter-spacing:0.06em;color:#fff}
</style>
</head>
<body>
${built.html}
</body>
</html>
`;
    } else {
      const from = join(SRC, d.dir, p.file);
      if (!existsSync(from)) die(`${d.dir}/${p.file} is listed in drafts.json but not on disk`);
      html = readFileSync(from, 'utf8');
    }

    // editor affordance -> static labelled frame
    html = html.replace(
      /<image-slot\b[^>]*?(?:placeholder="([^"]*)")?[^>]*><\/image-slot>/g,
      (_m, placeholder) => staticImageFrame(placeholder)
    );
    if (/<image-slot/i.test(html)) die(`${d.dir}/${p.file || p.canvas} still contains an <image-slot> after rewriting`);

    // flat links -> published routes. Anything not published is a broken link,
    // and a dead nav item in a client demo is worse than no nav item.
    html = html.replace(/href="([A-Za-z0-9._-]+\.html)"/g, (m, file) => {
      const to = routeOf.get(file);
      if (!to) die(`${d.dir}/${p.file || p.canvas} links to "${file}", which is not a published page`);
      return `href="${to}"`;
    });

    // guarantees
    if (!/<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">/.test(html))
      die(`${d.dir}/${p.file || p.canvas} is missing the robots meta`);
    if (!/<meta name="referrer" content="no-referrer">/.test(html))
      die(`${d.dir}/${p.file || p.canvas} is missing the no-referrer meta`);
    if (!/<title>\s*Draft\b/.test(html))
      die(`${d.dir}/${p.file || p.canvas} has a title that does not start with "Draft"`);
    if (!/class="dc-banner"/.test(html))
      die(`${d.dir}/${p.file || p.canvas} is missing the draft banner`);
    if (/<script\b[^>]*\ssrc=/.test(html))
      die(`${d.dir}/${p.file || p.canvas} loads an external script; drafts must render standalone`);

    /* Optional mobile-only reorder. Flex keeps source order for equal `order`
       values, so hoisting one child needs only two rules and the rest stay put. */
    let hoistCss = '';
    if (p.mobileHoistChild) {
      const marked = html.replace(
        /(<div class="dc-nav">[\s\S]*?<\/div>\s*)<div /,
        (m, nav) => `${nav}<div class="dc-main" `
      );
      if (marked === html) die(`${d.dir}/${p.file || p.canvas}: could not find the main wrapper to hoist inside`);
      html = marked;
      hoistCss = `
@media (max-width:640px){
  .dc-main{display:flex!important;flex-direction:column!important}
  .dc-main>*{order:3}
  .dc-main>:nth-child(1){order:1}
  .dc-main>:nth-child(${p.mobileHoistChild}){order:2}
}`;
    }

    if (!html.includes('</head>')) die(`${d.dir}/${p.file || p.canvas} has no </head> to inject the mobile stylesheet into`);
    html = html.replace('</head>', `<style>${MOBILE_CSS}${hoistCss}</style>\n</head>`);

    const dir = p.route ? join(OUT, d.slug, p.route) : join(OUT, d.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    pageCount += 1;
  }

  console.log(`  drafts: ${base}/ (${d.pages.length} pages)`);
}

console.log(`  drafts: ${pageCount} pages written. No index page is generated, by design.`);
