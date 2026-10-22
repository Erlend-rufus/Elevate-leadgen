// Shared pieces of the browser tests for /g/uk-it-growth (see run.mjs). A local server serves a
// built copy of the pages and runs the REAL lead function on /api/lead; only Zapier, Companies
// House, Meta and e-mail are fakes (the same ones the unit tests use, test/helpers.mjs).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterestHandler } from '../../../netlify/functions/lead/interest.mjs';
import { createStore } from '../../../netlify/functions/lead/store.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
/** Screenshots are written here when E2E_SHOTS is set. Otherwise none are taken. */
export const SHOTS = process.env.E2E_SHOTS ? path.resolve(process.env.E2E_SHOTS) : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const helpers = await import('../test/helpers.mjs');
export const { rig, GOOD, ok, chResponder, CH_PROFILE, core, cfg, OPTIONS } = helpers;
/** copy.json with {THRESHOLD}, {OFFER}, {WORTH} and {EMAIL} filled in, as the build does. */
const VARS = Object.assign({}, helpers.cfg.variables, { EMAIL: helpers.cfg.contact.email });
export const copy = JSON.parse(JSON.stringify(helpers.copy).replace(/\{([A-Z]+)\}/g, (m, k) => (k in VARS ? VARS[k] : m)));

/** A stand-in for the live copy, so these runs never depend on the real event address in config.json; no request ever reaches it. */
export const CALENDLY = 'https://calendly.com/elevate-test/30-minute-pipeline-review';

/**
 * A copy of the repository with "live": true and the stand-in Calendly address, built with the
 * repository's own generator. That is the state the pages will be in on launch day; the committed
 * output (live false, the real calendar address) is tested separately. Nothing in the real tree is touched.
 */
export function buildLiveCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g-growth-e2e-'));
  fs.cpSync(ROOT, dir, { recursive: true, filter: (p) => !/(^|\/)(\.git|node_modules|dist)(\/|$)/.test(path.relative(ROOT, p)) });
  const cfgPath = path.join(dir, 'g', 'uk-it-growth', 'config.json');
  const c = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  c.live = true;
  c.funnel.calendlyUrl = CALENDLY;
  fs.writeFileSync(cfgPath, JSON.stringify(c, null, 2));
  execFileSync(process.execPath, ['scripts/build-g-growth.mjs'], { cwd: dir, stdio: 'pipe' });
  return { dir, publicDir: path.join(dir, 'public'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain',
};

/** One server per run. state.rig can be swapped between scenarios (fresh storage and call log). */
export async function startServer({ publicDir = path.join(ROOT, 'public'), live = true } = {}) {
  const state = { rig: null, ipCounter: 1, ch: null, zapier: null, capi: null };
  function newRig() {
    state.ch = chResponder(CH_PROFILE);
    state.zapier = () => ok('{"status":"success"}');
    state.capi = () => ok({ events_received: 1 });
    state.rig = rig({ live, uuid: () => randomUUID(), responders: {
      ch: (c) => state.ch(c),
      zapier: (c) => state.zapier(c),
      capi: (c) => state.capi(c),
    } });
    // The quote button's endpoint, on the same storage and fakes as the lead function.
    state.interest = createInterestHandler({
      campaigns: state.rig.campaigns, env: () => state.rig.env, fetch: state.rig.fetch, now: state.rig.now,
      sleep: async () => {}, log: (o) => state.rig.logs.push(o), store: () => createStore({ blobs: state.rig.blobs }),
    });
    return state.rig;
  }
  newRig();

  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/api/lead' || u.pathname === '/api/lead-interest') {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = Buffer.concat(chunks);
        const headers = {};
        for (const [k, v] of Object.entries(req.headers)) headers[k] = Array.isArray(v) ? v.join(', ') : v;
        headers['x-nf-client-connection-ip'] = '203.0.113.' + (1 + (state.ipCounter++ % 250));
        const r = new Request('http://localhost' + req.url, { method: req.method, headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
        const out = u.pathname === '/api/lead-interest' ? await state.interest(r) : await state.rig.handler(r);
        const h = {};
        out.headers.forEach((v, k) => { h[k] = v; });
        state.lastApi = { status: out.status, location: out.headers.get('location') || '' };
        res.writeHead(out.status, h);
        return res.end(Buffer.from(await out.arrayBuffer()));
      }
      let p = decodeURIComponent(u.pathname);
      let fp = path.join(publicDir, p);
      if (!fp.startsWith(publicDir)) { res.writeHead(403); return res.end(); }
      let st = null;
      try { st = fs.statSync(fp); } catch (e) { /* missing */ }
      if (st && st.isDirectory()) {
        if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' + u.search }); return res.end(); }
        fp = path.join(fp, 'index.html');
        try { st = fs.statSync(fp); } catch (e) { st = null; }
      }
      if (!st) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found: ' + p); }
      res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(fp).pipe(res);
    } catch (e) {
      res.writeHead(500); res.end(String(e && e.stack));
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return { server, state, newRig, port, base: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

export async function launch() {
  let pw;
  try { pw = await import('playwright-core'); } catch (e) {
    console.error('The browser tests need playwright-core and a Chromium:\n' +
      '  npm install --no-save playwright-core axe-core\n' +
      '  npx playwright-core install chromium     (or set E2E_CHROMIUM to the path of a Chrome or Chromium)');
    process.exit(2);
  }
  const chromium = pw.chromium || pw.default.chromium;
  return chromium.launch({ headless: true, executablePath: process.env.E2E_CHROMIUM || undefined });
}

/** Tallies as the run goes; prints a line per check. */
export function reporter() {
  const rows = [];
  const R = {
    rows,
    ok(name, detail) { rows.push({ ok: true, name }); console.log('  ✓ ' + name + (detail ? '  ' + detail : '')); },
    fail(name, detail) { rows.push({ ok: false, name, detail }); console.log('  ✗ ' + name + (detail ? '\n      ' + detail : '')); process.exitCode = 1; },
    check(cond, name, detail) { cond ? R.ok(name) : R.fail(name, detail); },
    eq(a, b, name) { const same = JSON.stringify(a) === JSON.stringify(b); same ? R.ok(name) : R.fail(name, 'got ' + JSON.stringify(a) + '\n      want ' + JSON.stringify(b)); },
    section(t) { console.log('\n' + t); },
    summary() {
      const bad = rows.filter((r) => !r.ok);
      console.log(`\n${rows.length - bad.length} of ${rows.length} checks passed.`);
      return bad.length;
    },
  };
  return R;
}

/** Console messages and network trouble on a page. */
export function watch(page, bucket) {
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) bucket.console.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => bucket.errors.push(String(e && e.message)));
  page.on('requestfailed', (r) => bucket.failed.push(r.method() + ' ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
  page.on('response', (r) => { if (r.status() >= 400) bucket.bad.push(r.status() + ' ' + r.url()); });
}
export const bucket = () => ({ console: [], errors: [], failed: [], bad: [] });

/** Stand-in for Meta's script: the real loader queues calls on window.fbq.queue before it loads. */
export async function stubPixel(ctx, hits) {
  await ctx.route('https://connect.facebook.net/**', (route) => { hits.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stub */' }); });
}
export const fbqCalls = (page) => page.evaluate(() => (window.fbq && window.fbq.queue ? window.fbq.queue.map((a) => Array.from(a)) : null));

/** Answers for a route, over GOOD. Values are the labels on the form. */
export const ANSWERS = {
  fit: {},
  review: { turnover_band: OPTIONS.turnover[5] },
  not_now: { capacity: OPTIONS.capacity[0] },
  not_a_fit: { turnover_band: OPTIONS.turnover[0] },
};

/** Answers one question of the step-by-step form (the block must be on screen). */
export async function answerStep(page, i, a) {
  const s = core.STEPS[i];
  const form = page.locator('#lf-form');
  const block = form.locator(`.lf-block[data-step="${s.id}"]`);
  await block.waitFor({ state: 'visible' });
  if (s.kind === 'url' || s.kind === 'text' || s.kind === 'long') {
    await block.locator('.lf-input').fill(a[s.field] || '');
  } else if (s.kind === 'choice') {
    const opt = a[s.field];
    await block.locator('label.lf-card').filter({ has: page.locator(`input[value="${opt}"]`) }).click();
    if (s.other && opt === s.other.value) await block.locator('[data-other-for]').fill(a[s.other.field] || 'Something else');
  } else {
    for (const f of s.fields) await block.locator(`#f-${f.field}`).fill(a[f.field] || '');
  }
}

/** From question `from`, as a person does: answer, press the button. submit=false stops before the last press. */
export async function fillFrom(page, from, over = {}, { submit = true } = {}) {
  const a = Object.assign({}, GOOD, over);
  const btn = page.locator('#lf-form .lf-actions .btn');
  for (let i = from; i < core.STEPS.length; i++) {
    await answerStep(page, i, a);
    if (i === core.STEPS.length - 1 && !submit) return;
    await btn.click();
  }
}
export const fillForm = (page, over = {}, o = {}) => fillFrom(page, 0, over, o);

/** The whole form at once: JavaScript off, every question on the page. */
export async function fillAll(page, over = {}) {
  const a = Object.assign({}, GOOD, over);
  const form = page.locator('#lf-form');
  for (const s of core.STEPS) {
    if (s.kind === 'url' || s.kind === 'text' || s.kind === 'long') await form.locator(`#f-${s.field}`).fill(a[s.field] || '');
    else if (s.kind === 'choice') {
      await form.locator('label.lf-card').filter({ has: page.locator(`input[name="${s.field}"][value="${a[s.field]}"]`) }).click();
      if (s.other && a[s.field] === s.other.value) await form.locator(`[name="${s.other.field}"]`).fill(a[s.other.field] || 'Something else');
    } else for (const f of s.fields) await form.locator(`#f-${f.field}`).fill(a[f.field] || '');
  }
}

/** Text a reader gets: no scripts, no hidden or aria-hidden parts. One string per text node. */
export const pageText = (page) => page.evaluate(() => {
  const out = [];
  const skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  (function walk(n) {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    if (n.nodeType !== 1 || skip[n.tagName]) return;
    if (n.getAttribute('aria-hidden') === 'true' || n.hidden) return;
    n.childNodes.forEach(walk);
  })(document.body);
  return out;
});
