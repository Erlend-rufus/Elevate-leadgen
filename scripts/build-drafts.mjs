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
  [style*="font-size:28px"],[style*="font-size:29px"],[style*="font-size:30px"]{font-size:22px!important}
  /* the verification fields stay two-up so the band keeps its shape and height
     instead of becoming a long stack that pushes itself off the screen */
  [style*="grid-template-columns:repeat(4,1fr)"],
  [style*="grid-template-columns:1.5fr 1fr 1fr 1fr"]{grid-template-columns:1fr 1fr!important}
  [style*="grid-template-columns:repeat(3,1fr)"],[style*="grid-template-columns:1fr 1fr"],
  [style*="grid-template-columns:240px 1fr"],[style*="grid-template-columns:1fr 320px"],
  [style*="grid-template-columns:1fr 380px"],[style*="grid-template-columns:1fr 420px"],
  [style*="grid-template-columns:1fr 460px"]{grid-template-columns:1fr!important}
  /* tighten the mid-size blocks so the verification band still clears the fold
     on a narrower handset (360x740), not just on a 375-wide one */
  [style*="padding:28px 32px"]{padding:18px 20px 20px!important}
  [style*="padding:26px 28px"],[style*="padding:20px 22px"]{padding:16px 18px!important}
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

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let pageCount = 0;

for (const d of cfg.drafts) {
  if (!/^[a-z0-9-]+-[a-z0-9]{5,}$/.test(d.slug))
    die(`slug "${d.slug}" needs a random suffix of at least 5 characters`);

  const base = `/draft/${d.slug}`;
  /** file name in the export -> published URL */
  const routeOf = new Map(
    d.pages.map((p) => [p.file, p.route ? `${base}/${p.route}/` : `${base}/`])
  );

  for (const p of d.pages) {
    const from = join(SRC, d.dir, p.file);
    if (!existsSync(from)) die(`${d.dir}/${p.file} is listed in drafts.json but not on disk`);
    let html = readFileSync(from, 'utf8');

    // editor affordance -> static labelled frame
    html = html.replace(
      /<image-slot\b[^>]*?(?:placeholder="([^"]*)")?[^>]*><\/image-slot>/g,
      (_m, placeholder) => staticImageFrame(placeholder)
    );
    if (/<image-slot/i.test(html)) die(`${d.dir}/${p.file} still contains an <image-slot> after rewriting`);

    // flat links -> published routes. Anything not published is a broken link,
    // and a dead nav item in a client demo is worse than no nav item.
    html = html.replace(/href="([A-Za-z0-9._-]+\.html)"/g, (m, file) => {
      const to = routeOf.get(file);
      if (!to) die(`${d.dir}/${p.file} links to "${file}", which is not a published page`);
      return `href="${to}"`;
    });

    // guarantees
    if (!/<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">/.test(html))
      die(`${d.dir}/${p.file} is missing the robots meta`);
    if (!/<meta name="referrer" content="no-referrer">/.test(html))
      die(`${d.dir}/${p.file} is missing the no-referrer meta`);
    if (!/<title>\s*Draft\b/.test(html))
      die(`${d.dir}/${p.file} has a title that does not start with "Draft"`);
    if (!/class="dc-banner"/.test(html))
      die(`${d.dir}/${p.file} is missing the draft banner`);
    if (/<script\b[^>]*\ssrc=/.test(html))
      die(`${d.dir}/${p.file} loads an external script; drafts must render standalone`);

    /* Optional mobile-only reorder. Flex keeps source order for equal `order`
       values, so hoisting one child needs only two rules and the rest stay put. */
    let hoistCss = '';
    if (p.mobileHoistChild) {
      const marked = html.replace(
        /(<div class="dc-nav">[\s\S]*?<\/div>\s*)<div /,
        (m, nav) => `${nav}<div class="dc-main" `
      );
      if (marked === html) die(`${d.dir}/${p.file}: could not find the main wrapper to hoist inside`);
      html = marked;
      hoistCss = `
@media (max-width:640px){
  .dc-main{display:flex!important;flex-direction:column!important}
  .dc-main>*{order:3}
  .dc-main>:nth-child(1){order:1}
  .dc-main>:nth-child(${p.mobileHoistChild}){order:2}
}`;
    }

    if (!html.includes('</head>')) die(`${d.dir}/${p.file} has no </head> to inject the mobile stylesheet into`);
    html = html.replace('</head>', `<style>${MOBILE_CSS}${hoistCss}</style>\n</head>`);

    const dir = p.route ? join(OUT, d.slug, p.route) : join(OUT, d.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    pageCount += 1;
  }

  console.log(`  drafts: ${base}/ (${d.pages.length} pages)`);
}

console.log(`  drafts: ${pageCount} pages written. No index page is generated, by design.`);
