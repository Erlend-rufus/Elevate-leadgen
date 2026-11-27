// Tests for /g/uk-google-ads: the form, the routing, the endpoint and the built pages.
// Run with: npm run test:g-growth
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as core from '../core.mjs';
import * as route from '../route.mjs';
import { ROOT, rig, post, bodyOf, visible } from '../../uk-it-growth/test/helpers.mjs';
import { campaigns as realCampaigns } from '../../../netlify/functions/lead/campaigns.mjs';

const O = core.OPTIONS;
const GOOD = {
  campaign: 'uk-google-ads',
  company_website: 'www.harbourdental.co.uk',
  company_name: 'Harbour Dental Ltd',
  specialism: O.sector[0],
  turnover_band: O.turnover[1],
  low_turnover_budget: O.budget[0],
  trading_years: O.trading[2],
  employees_or_fee_earners: O.people[1],
  first_year_value: O.worth[1],
  marketing_spend: O.spend[2],
  decision_maker: O.decider[0],
  meeting_goal: 'See where our Google Ads budget goes.',
  first_name: 'Amy',
  last_name: 'Shaw',
  job_title: 'Owner',
  email: 'amy@harbourdental.co.uk',
  mobile: '',
  lead_id: 'l_gads0001',
  page_slug: 'uk-google-ads',
  consent: 'accepted',
};

function gRig(over = {}) {
  const r = rig(over);
  const base = realCampaigns['uk-google-ads'];
  r.campaigns['uk-google-ads'] = Object.assign({}, base, {
    cfg: Object.assign({}, base.cfg, { live: over.live !== false, legal: { registerCheck: false } }),
  });
  return r;
}
const go = async (over, fields) => {
  const r = gRig(over);
  const res = await r.handler(post(fields), { ip: '203.0.113.9' });
  return { r, res, body: res.headers.get('content-type').includes('json') ? await bodyOf(res) : await res.text() };
};
const noCH = { env: { COMPANIES_HOUSE_API_KEY: undefined } };

test('service form: twelve steps, budget asked of everyone with the fee floor, no law questions', () => {
  assert.equal(core.STEPS.length, 12);
  assert.ok(!core.FIELDS.includes('sra_number') && !core.FIELDS.includes('practice_areas') && !core.FIELDS.includes('capacity'));
  const budget = core.STEPS.find((s) => s.field === 'low_turnover_budget');
  assert.match(budget.q, /£2,000 a month into Google Ads/);
  assert.match(budget.help, /from £1,000 a month/);
  assert.equal(core.STEPS.filter((s) => s.when).length, 0);
  assert.equal(core.validate(GOOD).ok, true);
  assert.equal(core.validate(Object.assign({}, GOOD, { low_turnover_budget: '' })).errors.low_turnover_budget, core.MSG.choice);
});

test('service routing: budget decides, turnover not stated and low value go to a person', () => {
  const d = (v) => route.decide(Object.assign({}, GOOD, v), { check: 'unchecked', reasons: [] });
  assert.equal(d({}).route, 'fit');
  assert.deepEqual(d({ turnover_band: O.turnover[0], low_turnover_budget: O.budget[1] }), { route: 'not_a_fit', reasons: ['turnover_below_1m', 'budget_2k_no'] });
  assert.deepEqual(d({ low_turnover_budget: O.budget[1] }).reasons, ['budget_2k_no']);
  assert.equal(d({ turnover_band: O.turnover[5] }).route, 'review');
  assert.deepEqual(d({ first_year_value: O.worth[0] }).reasons, ['value_under_500']);
  assert.equal(d({ turnover_band: O.turnover[0] }).reasons[0], 'turnover_under_1m_budget_2k');
});

test('service endpoint: a fit books, Zapier gets the sector as specialism, Meta is told', async () => {
  const { r, res, body } = await go(noCH, GOOD);
  assert.equal(res.status, 200);
  assert.equal(body.route, 'fit');
  assert.equal(body.next, '/g/uk-google-ads/book/?lead_id=l_gads0001');
  const z = r.of('zapier')[0].body;
  assert.equal(z.campaign, 'uk-google-ads');
  assert.equal(z.specialism, O.sector[0]);
  assert.ok(!('low_turnover_budget' in z));
  assert.equal(r.of('capi').length, 1);
});

test('service endpoint: under £1m without the budget is not a fit and Meta is not told; not live refuses', async () => {
  const no = await go(noCH, Object.assign({}, GOOD, { turnover_band: O.turnover[0], low_turnover_budget: O.budget[1] }));
  assert.equal(no.body.route, 'not_a_fit');
  assert.equal(no.r.of('capi').length, 0);
  const off = await go({ live: false }, GOOD);
  assert.equal(off.res.status, 503);
});

test('service pages: built, noindex, four anonymised cards, fixed fee, no commission, no moving company', () => {
  const dir = join(ROOT, 'public', 'g', 'uk-google-ads');
  for (const p of ['index.html', 'book/index.html', 'takk/index.html', 'review/index.html', 'not-now/index.html', 'not-a-fit/index.html', 'privacy/index.html', 'terms/index.html']) {
    assert.ok(existsSync(join(dir, p)), p + ' is built');
    assert.match(readFileSync(join(dir, p), 'utf8'), /<meta name="robots" content="noindex,nofollow">/);
  }
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const t = visible(html);
  assert.ok(!/Judicia|Campbell|Nova Law|Aspiria|RSM|C-?Medical|Oslo Transport/i.test(html), 'every case is anonymised');
  assert.equal((html.match(/<article class="cc/g) || []).length, 4);
  assert.match(t, /A fixed monthly fee, from £1,000\. No minimum term\./);
  assert.match(t, /estimated/, 'the clinic revenue is marked as an estimate');
  assert.ok(!/commission/i.test(t));
  assert.ok(!/removals|moving company|flytt/i.test(t), 'the moving company case is left out on purpose');
  assert.ok(!/solicitor|SRA/.test(t), 'no law wording left from the clone');
  const book = readFileSync(join(dir, 'book', 'index.html'), 'utf8');
  assert.match(book, /elevate-marketing-30-minute-google-ads-review/);
});
