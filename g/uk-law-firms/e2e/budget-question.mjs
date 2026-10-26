// Browser check of the law form's conditional question (low_turnover_budget, 26 Oct 2026), against the built
// page in public/. The lead endpoint is a stub that records the post; the routing itself is tested in
// g/uk-law-firms/test/funnel.test.mjs. Not part of "npm test": it needs a browser.
//
//   npm install --no-save playwright-core
//   node scripts/build-g-growth.mjs && node g/uk-law-firms/e2e/budget-question.mjs
//
// E2E_CHROMIUM=<path> uses that browser (default: the one in /opt/pw-browsers).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('playwright-core');
const PUB = path.join(ROOT, 'public');
let posted = [];
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/api/lead') {
    let b = ''; req.on('data', (c) => b += c); req.on('end', () => {
      posted.push(JSON.parse(b));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, route: 'fit', page: 'book', next: '/g/uk-law-firms/takk/?lead_id=x' }));
    });
    return;
  }
  let p = path.join(PUB, decodeURIComponent(u.pathname));
  if (p.endsWith('/')) p += 'index.html';
  if (!fs.existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) { passes++; console.log('  ✓ ' + m); } else { fails++; console.log('  ✗ ' + m); } };
const errors = [];

async function run(turnover, expectBudget) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + '/g/uk-law-firms/');
  const count = page.locator('#lf-count');
  ok((await count.textContent()).trim() === '1 / 13', `${turnover}: starts at 1 / 13 (the budget question is not counted yet)`);
  const next = page.locator('#lf-form .lf-actions .btn');
  await page.fill('#f-company_website', 'www.example-law.co.uk'); await next.click();
  await page.fill('#f-company_name', 'Example Law LLP'); await next.click();
  await next.click(); // SRA optional
  await page.locator(`input[name="turnover_band"][value="${turnover}"]`).check({ force: true });
  ok((await count.textContent()).trim() === (expectBudget ? '4 / 14' : '4 / 13'), `${turnover}: the count follows the answer (${(await count.textContent()).trim()})`);
  await next.click();
  const shown = await page.locator('.lf-block[data-step="budget"]').isVisible();
  ok(shown === expectBudget, `${turnover}: budget question ${expectBudget ? 'shown' : 'skipped'}`);
  if (expectBudget) {
    ok(!(await page.locator('.lf-when').isVisible()), 'the "only answer this if" note is hidden with the script');
    await next.click();
    ok(await page.locator('#e-low_turnover_budget').isVisible(), 'required: an error without an answer');
    await page.locator('input[name="low_turnover_budget"]').first().check({ force: true });
    await next.click();
  }
  ok(await page.locator('.lf-block[data-step="trading"]').isVisible(), `${turnover}: on to the trading question`);
  // back goes to the right place
  await page.locator('.lf-back').click();
  ok(await page.locator(`.lf-block[data-step="${expectBudget ? 'budget' : 'turnover'}"]`).isVisible(), `${turnover}: Back returns to the ${expectBudget ? 'budget' : 'turnover'} question`);
  if (expectBudget) await next.click(); else await next.click();
  // answer the rest
  await page.locator('input[name="trading_years"]').nth(2).check({ force: true }); await next.click();
  await page.locator('input[name="employees_or_fee_earners"]').nth(1).check({ force: true }); await next.click();
  await page.locator('input[name="practice_areas"]').first().check({ force: true }); await next.click();
  await page.locator('input[name="first_year_value"]').nth(2).check({ force: true }); await next.click();
  await page.locator('input[name="marketing_spend"]').nth(2).check({ force: true }); await next.click();
  await page.locator('input[name="decision_maker"]').first().check({ force: true }); await next.click();
  await page.locator('input[name="capacity"]').nth(1).check({ force: true }); await next.click();
  await page.fill('#f-meeting_goal', 'To see if this works for us.'); await next.click();
  const c = (await count.textContent()).trim();
  ok(c === (expectBudget ? '14 / 14' : '13 / 13'), `${turnover}: last question is ${c}`);
  await page.fill('#f-first_name', 'Ann'); await page.fill('#f-last_name', 'Lee'); await page.fill('#f-job_title', 'Partner'); await page.fill('#f-email', 'ann@example-law.co.uk');
  posted = [];
  await Promise.all([page.waitForURL('**/takk/**', { timeout: 10000 }).catch(() => {}), next.click()]);
  const body = posted[0] || {};
  ok(body.turnover_band === turnover, `${turnover}: posted with the turnover`);
  ok(expectBudget ? body.low_turnover_budget === 'Yes, we can put £2,000 a month into advertising' : true, `${turnover}: posted with the budget answer when asked`);
  await ctx.close();
}
await run('Under £1m', true);
await run('£2m to under £5m', false);
// no script: every question on the page, with the note
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/g/uk-law-firms/');
  ok(await page.locator('.lf-when').isVisible(), 'no script: the "only answer this if" note shows');
  ok(await page.locator('.lf-block[data-step="budget"]').isVisible(), 'no script: the budget question is on the page');
  await ctx.close();
}
ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
await browser.close(); srv.close();
console.log(`\n${passes} of ${passes + fails} checks passed.`);
process.exit(fails ? 1 : 0);
