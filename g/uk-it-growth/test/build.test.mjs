import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, cfg, copy, visible } from './helpers.mjs';

/* The generator is run into a scratch folder, so these tests never touch the committed files
   and can still say whether the committed files are what the sources produce today. */
const OUT = mkdtempSync(join(tmpdir(), 'g-growth-'));
const DATA = join(OUT, 'data.generated.mjs');
const PAGES = ['index.html', 'book/index.html', 'takk/index.html', 'review/index.html', 'not-now/index.html', 'not-a-fit/index.html'];
const LEGAL = ['privacy/index.html', 'terms/index.html'];
const ALL = PAGES.concat(LEGAL);
const built = {};
let dataModule;

before(async () => {
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'build-g-growth.mjs')], {
    cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { G_GROWTH_OUT: OUT, G_GROWTH_FUNCTION_DATA: DATA }),
  });
  for (const p of ALL) built[p] = readFileSync(join(OUT, cfg.slug, p), 'utf8');
  dataModule = await import(DATA);
});

const committed = (p) => readFileSync(join(ROOT, 'public', 'g', cfg.slug, p), 'utf8');
const text = (p) => visible(built[p]);
const scripts = (html) => [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => s.trim());
const body = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ');

test('the committed pages and the function\'s data are exactly what the sources build today', () => {
  for (const p of ALL) assert.equal(committed(p), built[p], p + ' is out of date: run node scripts/build-g-growth.mjs');
  assert.equal(
    readFileSync(join(ROOT, 'netlify', 'functions', 'lead', 'data.generated.mjs'), 'utf8'),
    readFileSync(DATA, 'utf8'), 'netlify/functions/lead/data.generated.mjs is out of date');
});

test('six pages: the landing page and one for each thing that can happen after the form', () => {
  assert.deepEqual(PAGES.length, 6);
  for (const p of PAGES) assert.ok(built[p].length > 5000, p);
});

test('every page is noindex, English (UK), has one h1 and a main', () => {
  for (const p of ALL) {
    const h = built[p];
    assert.match(h, /<html lang="en-GB">/, p);
    assert.match(h, /<meta name="robots" content="noindex,nofollow">/, p);
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, p + ' h1');
    assert.equal((h.match(/<main[\s>]/g) || []).length, 1, p + ' main');
    assert.match(h, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
  }
});

test('no dash, no exclamation mark, no telephone number, no unfilled token in anything a visitor reads', () => {
  for (const p of ALL) {
    const t = text(p);
    assert.equal(/[—–]/.test(t), false, p + ': dash');
    assert.equal(t.includes('!'), false, p + ': exclamation mark');
    assert.equal(/tel:|\+44|\+47|\b0\d{3,4} ?\d{3} ?\d{3,4}\b/.test(built[p]), false, p + ': phone number');
    assert.equal(/\{[A-Z_]{3,}\}|\{\{|undefined|\[object /.test(t), false, p + ': unfilled value');
  }
});

test('British spelling in what a visitor reads', () => {
  for (const p of ALL) {
    assert.equal(/\b(optimiz|analyz|organiz|specializ|recogniz|color|center|favorite)\w*/i.test(text(p).replace(/\borganization\b/gi, '')), false, p);
  }
});

test('a commission is never printed with a rate or an amount, on any page', () => {
  for (const p of ALL) {
    const t = text(p);
    for (const m of t.matchAll(/commission|kommisjon|revenue share|success fee/gi)) {
      const around = t.slice(Math.max(0, m.index - 120), m.index + 120);
      assert.equal(/%|£\s?\d|\bkr\s?\d|\d\s?(percent|per cent)|\b\d+\s?p\b/i.test(around), false, `${p}: ${around}`);
    }
  }
  // and the sources themselves, before they are cut into pages
  const src = JSON.stringify(copy);
  assert.equal(/(commission|kommisjon)[^"]{0,100}(%|£\s?\d)/i.test(src), false);
});

test('only the contact address appears, and only as a link to it', () => {
  for (const p of ALL) {
    const found = new Set(built[p].match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []);
    for (const a of found) assert.equal(a, cfg.contact.email, p);
  }
});

test('no analytics, no tag manager and no pixel written into a page: the pixel is loaded by the consent script after Accept', () => {
  for (const p of ALL) {
    const h = built[p];
    for (const bad of ['googletagmanager', 'google-analytics', 'gtag(', 'G-XXXX', 'clarity.ms', 'connect.facebook.net', 'fbevents.js', "fbq('init'", 'hotjar', 'fonts.googleapis', 'fonts.gstatic']) {
      assert.equal(h.includes(bad), false, `${p}: ${bad}`);
    }
  }
});

test('the only outside host a page may use is the calendar, and only on the booking page', () => {
  for (const p of ALL) {
    const hosts = new Set([...body(built[p]).matchAll(/(?:src|href)="(https?:)?\/\/([^/"]+)/g)].map((m) => m[2]));
    const allowed = p === 'book/index.html' ? ['assets.calendly.com', 'calendly.com'] : [];
    for (const h of hosts) assert.ok(allowed.includes(h), `${p} reaches ${h}`);
  }
  const bookJs = scripts(built['book/index.html']).join('\n');
  assert.match(bookJs, /assets\.calendly\.com\/assets\/external\/widget\.js/);
  assert.equal(/<script[^>]+calendly/.test(built['book/index.html']), false, 'the calendar script is added by the page script, after the lead id is known');
});

test('the consent script: banner off (the page owns it), version 4, the funnel\'s pixel, a view event on the landing page only', () => {
  for (const p of ALL) {
    const m = built[p].match(/<script src="\/js\/consent\.js\?v=4" data-pixel="(\d+)" data-banner="off"( data-track="(\w+)")?><\/script>/);
    assert.ok(m, p);
    assert.equal(m[1], cfg.funnel.pixelId);
    assert.equal(m[3], p === 'index.html' ? cfg.funnel.viewEvent : undefined, p);
  }
});

test('the cookie banner sits directly in the body, after the page: a fixed bar inside a container is placed against the container', () => {
  for (const p of ALL) {
    const h = built[p];
    const at = h.indexOf('id="g-consent"');
    assert.ok(at > 0, p);
    const start = h.lastIndexOf('<div', at);          // the opening tag of the banner itself
    const before = body(h.slice(0, start));
    const opens = (before.match(/<div[\s>]/g) || []).length;
    const closes = (before.match(/<\/div>/g) || []).length;
    assert.equal(opens, closes, p + ': every container is closed before the banner');
    assert.match(h.slice(start, start + 80), /^<div class="cb" id="g-consent" role="region" aria-label="[^"]+" hidden>/);
    assert.equal((h.match(/id="g-consent"/g) || []).length, 1, p);
  }
});

test('markup is balanced on every page and on the no-script answer', () => {
  const balance = (html, where) => {
    const t = body(html);
    for (const tag of ['div', 'section', 'main', 'header', 'footer', 'nav', 'ul', 'ol', 'dl', 'dd', 'dt', 'table', 'tbody', 'tr', 'form', 'fieldset', 'legend', 'label', 'article', 'figure', 'figcaption', 'blockquote', 'button', 'a', 'picture', 'noscript', 'h1', 'h2', 'h3', 'p']) {
      const open = (t.match(new RegExp(`<${tag}(?=[\\s>])`, 'g')) || []).length;
      const close = (t.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.equal(open, close, `${where}: <${tag}> opened ${open}, closed ${close}`);
    }
  };
  for (const p of ALL) balance(built[p], p);
  const form = text('index.html') && built['index.html'].match(/<section class="lf"[\s\S]*?<\/section>/)[0];
  balance(dataModule.growth.shell.before + form + dataModule.growth.shell.after, 'no-script answer');
});

test('every id is unique, and every label, link and aria reference points at something on the page', () => {
  for (const p of ALL) {
    const h = built[p];
    const ids = [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, p + ': duplicate id');
    for (const m of h.matchAll(/\s(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g)) {
      for (const ref of m[1].split(/\s+/)) assert.ok(ids.includes(ref), `${p}: ${ref}`);
    }
    for (const m of h.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]), `${p}: #${m[1]}`);
  }
});

test('every file a page asks for from this site exists', () => {
  const asked = new Set();
  for (const p of ALL) {
    for (const m of body(built[p]).matchAll(/(?:src|href|srcset)="(\/[^"?#]*)/g)) asked.add(m[1]);
  }
  for (const a of asked) {
    if (a.startsWith('/g/uk-it-growth/')) continue; // pages of this funnel: built above
    if (a.startsWith('mailto:')) continue;
    const file = a.endsWith('/') ? join(ROOT, 'public', a, 'index.html') : join(ROOT, 'public', a);
    assert.ok(existsSync(file), `${a} is referenced and does not exist`);
  }
  assert.ok(asked.has('/g/_assets/logo-ink.webp') && asked.has('/g/uk-it-growth/privacy/') && asked.has('/g/uk-it-growth/terms/'));
});

test('the two fonts and the logos are served from this site and preloaded', () => {
  for (const p of ALL) {
    assert.match(built[p], /<link rel="preload" href="\/g\/_assets\/fonts\/geist-v1\.woff2" as="font" type="font\/woff2" crossorigin>/, p);
    assert.match(built[p], /<link rel="preload" href="\/g\/_assets\/fonts\/fraunces-v1\.woff2" as="font" type="font\/woff2" crossorigin>/, p);
  }
  for (const f of ['fonts/geist-v1.woff2', 'fonts/fraunces-v1.woff2', 'logo-ink.webp', 'logo-ink.png', 'logo-white.webp', 'logo-white.png']) {
    assert.ok(existsSync(join(ROOT, 'public', 'g', '_assets', f)), f);
  }
});

test('every inline script compiles', () => {
  for (const p of ALL) {
    const list = scripts(built[p]);
    assert.ok(list.length >= 2, p);
    for (const code of list) assert.doesNotThrow(() => new vm.Script(code, { filename: p }), p);
  }
});

test('the browser\'s settings are what the config says, and carry no secret', () => {
  for (const p of ALL) {
    const m = built[p].match(/var CFG = (\{.*?\});\n/);
    assert.ok(m, p);
    const c = JSON.parse(m[1]);
    assert.equal(c.slug, cfg.slug);
    assert.equal(c.campaign, cfg.campaign);
    assert.equal(c.applyPath, '/api/lead');
    assert.equal(c.qualifiedEvent, 'QualifiedForm');
    assert.equal(c.takkPath, '/g/uk-it-growth/takk/');
    assert.equal(c.calendlyLeadParam, cfg.funnel.calendlyLeadParam);
    assert.equal(c.prefillKey, 'elevate:g:uk-it-growth:prefill');
    assert.equal(c.interestPath, '/api/lead-interest');
    assert.deepEqual(Object.keys(c).sort(), ['applyPath', 'calendlyLeadParam', 'calendlyUrl', 'campaign', 'email', 'interestPath', 'path', 'prefillKey', 'qualifiedEvent', 'slug', 'takkPath', 'text']);
    assert.equal(/token|secret|key|password/i.test(m[1].replace('prefillKey', '')), false, 'nothing that looks like a secret');
  }
});

test('the standard Lead event is never used', () => {
  for (const p of ALL) {
    assert.equal(/['"]Lead['"]/.test(built[p]), false, p);
    assert.equal(/\btrackStandard\(\s*['"]Lead/.test(built[p]), false, p);
  }
  assert.equal(cfg.funnel.qualifiedEvent, 'QualifiedForm');
});

/* ------------------------------------------------------------------- the landing page */

test('the landing page carries the whole form: fourteen questions, posting to the endpoint, with no script needed', () => {
  const h = built['index.html'];
  assert.equal((h.match(/class="lf-block"/g) || []).length, 14);
  assert.match(h, /<form class="lf-panel" id="lf-form" method="post" action="\/api\/lead" novalidate>/);
  for (const name of cfg.hiddenFields) assert.ok(h.includes(`<input type="hidden" name="${name}"`), name);
  assert.match(h, /<div class="lf-trap" aria-hidden="true"><label>Fax <input type="text" name="contact_by_fax" tabindex="-1" autocomplete="off" value=""><\/label><\/div>/);
  assert.match(h, /<button class="btn btn--primary" type="submit">Submit<\/button>/);
  assert.equal((h.match(/<input type="radio"/g) || []).length, 6 + 6 + 3 + 5 + 5 + 5 + 4 + 4 + 4);
});

test('the page is complete without a script: final figures in the text, every section open', () => {
  const h = built['index.html'];
  assert.equal(/class="[^"]*\bis-closed\b/.test(h), false);
  assert.equal(/class="[^"]*\brv\b/.test(h), false);
  for (const m of h.matchAll(/<span class="cn" data-to="([^"]+)"[^>]*><span class="cn-sr">([^<]+)<\/span><span aria-hidden="true">([^<]+)<\/span><\/span>/g)) {
    assert.equal(m[2], m[3], 'the visible figure is the final figure: ' + m[2]);
  }
  assert.ok((h.match(/class="cn"/g) || []).length >= 4, 'the figures are counters');
});

test('the words on the landing page are the board\'s copy, with the variables filled in', () => {
  const t = text('index.html');
  assert.ok(t.includes(copy.form.heading));
  assert.ok(t.includes('For UK IT services firms with £2m+ turnover'));
  assert.ok(t.includes(copy.hero.h1a) && t.includes(copy.hero.h1b));
  for (const q of copy.faq.items) assert.ok(t.includes(q.q), q.q);
  assert.equal(t.includes('{THRESHOLD}'), false);
  assert.ok(t.includes('30 minute pipeline review'));
});

test('the call to action goes to the form, which is on the same page', () => {
  const h = built['index.html'];
  assert.ok((h.match(/href="#form"/g) || []).length >= 3);
  assert.match(h, /<section class="sec--form" id="form">/);
});

/* ---------------------------------------------------------------------- the other pages */

test('the booking page: a place for the calendar, the offer named, and no calendar script in the markup', () => {
  const h = built['book/index.html'];
  assert.match(h, /id="cal"/);
  assert.ok(text('book/index.html').includes('30 minute pipeline review'));
  if (!cfg.funnel.calendlyUrl) assert.match(h, /The calendar is not connected yet/);
  else assert.equal(/not connected yet/.test(h), false);
});

test('the other outcome pages say what the board says, with the threshold and the address filled in', () => {
  const t = (p) => text(p);
  assert.ok(t('not-a-fit/index.html').includes('£2m'));
  assert.ok(t('review/index.html').length > 200);
  assert.match(built['not-now/index.html'], /<a href="mailto:post@elevatemarketing\.no">post@elevatemarketing\.no<\/a>/);
  for (const p of ALL.slice(1)) assert.ok(!/<form/.test(built[p]), p + ' has no form');
});

test('the not-a-fit page offers a website quote by one button, hidden until a lead id is in the address, and no other page does', () => {
  const h = built['not-a-fit/index.html'];
  assert.match(h, /<section class="o-ask" id="ask" aria-labelledby="ask-h" hidden>/, 'hidden in the markup');
  assert.equal((h.match(/id="ask-btn"/g) || []).length, 1);
  assert.match(h, /<button class="btn" type="button" id="ask-btn">Yes, send me a quote<\/button>/);
  assert.match(h, /<p class="o-small o-ask-msg" id="ask-msg" role="status" aria-live="polite" tabindex="-1"><\/p>/);
  assert.ok(h.includes(`<a href="/g/${cfg.slug}/privacy/">How we use your details</a>`), 'a link to the privacy notice sits beside the button');
  assert.match(h, /<noscript><p class="o-note">To ask for a quote on a new website, email <a href="mailto:post@elevatemarketing\.no">/);
  assert.ok(h.includes('initAsk'), 'the script that shows and posts');
  assert.ok(!/<form/.test(h), 'a button, not a form');
  const t = text('not-a-fit/index.html');
  assert.ok(t.includes('may email you once about this if we think it could suit your firm. Every email says how to say no.'));
  assert.equal(/\{[A-Z_]+\}/.test(h), false, 'no placeholder left');
  for (const p of ALL.filter((x) => x !== 'not-a-fit/index.html')) {
    assert.equal(built[p].includes('id="ask-btn"'), false, p + ' has no quote button');
    assert.equal(built[p].includes('initAsk()'), false, p + ' does not call initAsk');
  }
});

test('the script on the not-a-fit page posts the campaign and the lead id as JSON, and never the visitor\'s answers', () => {
  const h = built['not-a-fit/index.html'];
  const code = scripts(h).find((s) => s.includes('function initAsk'));
  assert.ok(code, 'initAsk is inlined');
  assert.match(code, /CFG\.interestPath/);
  assert.match(code, /JSON\.stringify\(\{ ?campaign: CFG\.campaign, lead_id: [a-zA-Z_.]+ ?\}\)/);
  assert.equal(/localStorage|sessionStorage|document\.cookie/.test(code.slice(code.indexOf('function initAsk'))), false, 'initAsk reads and writes nothing in the browser');
});

test('each page has its own title', () => {
  const titles = ALL.map((p) => built[p].match(/<title>([^<]+)<\/title>/)[1]);
  assert.equal(new Set(titles).size, ALL.length, titles.join(' | '));
  for (const t of titles) assert.equal(t.length < 80, true, t);
});

/* ------------------------------------------------------------------------------ the data */

test('the function gets the page it needs to answer a post without a script, and no copy beyond the form', () => {
  const g = dataModule.growth;
  assert.deepEqual(Object.keys(g), ['cfg', 'copy', 'shell']);
  assert.deepEqual(Object.keys(g.copy), ['form']);
  assert.equal(g.cfg.campaign, cfg.campaign);
  assert.equal(g.cfg.live, cfg.live);
  assert.equal(JSON.stringify(g.cfg).includes('"_'), false, 'no notes to a person');
  assert.ok(g.shell.before.startsWith('<!DOCTYPE html>'));
  assert.ok(g.shell.before.includes('<h1 class="vh">'));
  assert.ok(g.shell.after.includes('</html>'));
});

test('live is only possible with a calendar address', () => {
  assert.equal(cfg.live === true && !cfg.funnel.calendlyUrl, false);
  assert.match(cfg.funnel.calendlyLeadParam, /^utm_(source|medium|campaign|content|term)$/);
  assert.equal(/^(Lead|Purchase|Schedule|CompleteRegistration|Contact|SubmitApplication|ViewContent)$/.test(cfg.funnel.qualifiedEvent), false);
});

test('the sizes are sensible: nothing large has been inlined by mistake', () => {
  assert.ok(built['index.html'].length < 130 * 1024, 'landing ' + built['index.html'].length);
  for (const p of PAGES.slice(1)) assert.ok(built[p].length < 40 * 1024, p + ' ' + built[p].length);
  for (const p of LEGAL) assert.ok(built[p].length < 70 * 1024, p + ' ' + built[p].length);
  assert.equal(/data:(font|application)/.test(built['index.html']), false, 'no embedded fonts');
});
