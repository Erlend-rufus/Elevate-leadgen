// Tests for /g/uk-law-firms: the form, the routing and the endpoint with this campaign.
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
  campaign: 'uk-law-firms',
  company_website: 'www.bridgewater-law.co.uk',
  company_name: 'Bridgewater Law LLP',
  sra_number: '654321',
  turnover_band: O.turnover[2],
  trading_years: O.trading[2],
  employees_or_fee_earners: O.people[2],
  practice_areas: 'Family, Employment',
  first_year_value: O.worth[2],
  marketing_spend: O.spend[1],
  decision_maker: O.decider[1],
  capacity: O.capacity[1],
  meeting_goal: 'A straight answer on whether this can work for us.',
  first_name: 'Tom',
  last_name: 'Reid',
  job_title: 'Managing Partner',
  email: 'tom@bridgewater-law.co.uk',
  mobile: '',
  lead_id: 'l_law0001',
  page_slug: 'uk-law-firms',
  consent: 'accepted',
};

function lawRig(over = {}) {
  const r = rig(over);
  const base = realCampaigns['uk-law-firms'];
  r.campaigns['uk-law-firms'] = Object.assign({}, base, {
    cfg: Object.assign({}, base.cfg, { live: over.live !== false, legal: { registerCheck: over.registerCheck !== undefined ? over.registerCheck : Boolean(r.env.COMPANIES_HOUSE_API_KEY) } }),
  });
  return r;
}
const go = async (over, fields, opts) => {
  const r = lawRig(over);
  const res = await r.handler(post(fields, opts), { ip: '203.0.113.9' });
  return { r, res, body: res.headers.get('content-type').includes('json') ? await bodyOf(res) : await res.text() };
};

test('law form: fourteen steps, one asked only after "Under £1m", practice areas is the multi-choice, bands written "to under", mobile optional', () => {
  assert.equal(core.STEPS.length, 14);
  const multi = core.STEPS.filter((s) => s.kind === 'multi');
  assert.equal(multi.length, 1);
  assert.equal(multi[0].field, 'practice_areas');
  assert.deepEqual(O.turnover.slice(0, 5), ['Under £1m', '£1m to under £2m', '£2m to under £5m', '£5m to under £10m', '£10m or more']);
  assert.deepEqual(O.worth, ['Under £2,000', '£2,000 to under £5,000', '£5,000 to under £15,000', '£15,000 or more']);
  assert.deepEqual(O.spend, ['Under £1,000', '£1,000 to under £2,000', '£2,000 to under £5,000', '£5,000 to under £15,000', '£15,000 or more', 'I do not know']);
  const budget = core.STEPS.find((s) => s.when);
  assert.equal(budget.field, 'low_turnover_budget');
  assert.equal(core.STEPS.indexOf(budget), core.STEPS.findIndex((s) => s.field === 'turnover_band') + 1, 'right after the turnover question');
  assert.deepEqual(budget.when, { field: 'turnover_band', values: ['Under £1m'] });
  assert.ok(!/\d/.test(budget.help), 'the line about commission carries no number');
  const mobile = core.STEPS[13].fields.find((f) => f.field === 'mobile');
  assert.equal(mobile.optional, true);
  assert.equal(core.validate(GOOD).ok, true);
});

test('law form: the budget question is required after "Under £1m" and ignored otherwise', () => {
  const small = Object.assign({}, GOOD, { turnover_band: O.turnover[0] });
  assert.equal(core.validate(small).errors.low_turnover_budget, core.MSG.choice, 'asked and not answered');
  assert.equal(core.validate(Object.assign({}, small, { low_turnover_budget: 'Maybe' })).errors.low_turnover_budget, core.MSG.choice);
  const yes = core.validate(Object.assign({}, small, { low_turnover_budget: O.budget[0] }));
  assert.equal(yes.ok, true);
  assert.equal(yes.values.low_turnover_budget, O.budget[0]);
  const larger = core.validate(Object.assign({}, GOOD, { low_turnover_budget: O.budget[1] }));
  assert.equal(larger.ok, true, 'a stale answer from a turnover changed back is not an error');
  assert.equal(larger.values.low_turnover_budget, '', 'and it is not kept');
  assert.equal(core.applies(core.STEPS[4], (n) => small[n]), true);
  assert.equal(core.applies(core.STEPS[4], (n) => GOOD[n]), false);
  assert.ok(core.FIELDS.includes('low_turnover_budget'));
});

test('law routing, 26 Oct 2026: the workshop rules', () => {
  const v = core.validate(GOOD).values;
  const un = { check: 'unchecked', reasons: [] };
  const d = (patch, ch = un) => route.decide(Object.assign({}, v, patch), ch);
  const T = O.turnover, B = O.budget;
  assert.deepEqual(d({}), { route: 'fit', reasons: ['turnover_2m_plus', 'trading_2y_plus', 'register_not_used'] });
  // Turnover: £1m to under £2m is a fit; under £1m depends on the £2,000 a month.
  assert.deepEqual(d({ turnover_band: T[1] }), { route: 'fit', reasons: ['turnover_1m_2m', 'trading_2y_plus', 'register_not_used'] });
  assert.deepEqual(d({ turnover_band: T[0], low_turnover_budget: B[0] }), { route: 'fit', reasons: ['turnover_under_1m_budget_2k', 'trading_2y_plus', 'register_not_used'] });
  assert.deepEqual(d({ turnover_band: T[0], low_turnover_budget: B[1] }), { route: 'not_a_fit', reasons: ['turnover_below_1m', 'budget_2k_no'] });
  assert.deepEqual(d({ turnover_band: T[0], low_turnover_budget: '' }), { route: 'not_a_fit', reasons: ['turnover_below_1m', 'budget_2k_no'] }, 'no answer is not a yes');
  // Trading and capacity no longer route.
  assert.deepEqual(d({ trading_years: O.trading[0] }), { route: 'fit', reasons: ['turnover_2m_plus', 'trading_under_2y_ok', 'register_not_used'] });
  assert.equal(d({ capacity: O.capacity[0] }).route, 'fit');
  assert.equal(d({ capacity: O.capacity[0], turnover_band: T[5] }).route, 'review');
  // What stays.
  assert.equal(d({ practice_areas: 'Personal injury' }).route, 'not_a_fit', 'personal injury alone');
  const mixed = d({ practice_areas: 'Personal injury, Family' });
  assert.equal(mixed.route, 'fit', 'personal injury with other areas is routed on the other areas');
  assert.ok(mixed.reasons.includes('personal_injury_ticked'));
  assert.equal(d({ turnover_band: T[5] }).route, 'review', 'F7: not stated is always review');
  assert.equal(d({}, { check: 'not_found', reasons: [] }).route, 'review', 'a partnership that is not at Companies House is review');
  assert.equal(route.needsRegistry(Object.assign({}, v, { turnover_band: T[0], low_turnover_budget: B[1] })), false);
  assert.equal(route.needsRegistry(Object.assign({}, v, { capacity: O.capacity[0] })), true, 'capacity settles nothing now');
});

test('law routing: a low first-year value, and the volume firm (30+ fee earners or £2,000+ a month, 26 Oct 2026)', () => {
  const v = core.validate(GOOD).values;
  const un = { check: 'unchecked', reasons: [] };
  const d = (patch, ch = un) => route.decide(Object.assign({}, v, patch), ch);
  const P = O.people, S = O.spend, W = O.worth;
  // GOOD: 15 to 29 people, £1,000 to under £2,000 a month: not a volume firm.
  assert.equal(v.marketing_spend, '£1,000 to under £2,000');
  assert.deepEqual(d({ first_year_value: W[0] }).reasons, ['value_under_2k']);
  for (const over of [{ employees_or_fee_earners: P[3] }, { marketing_spend: S[2] }, { marketing_spend: S[3] }, { marketing_spend: S[4] }]) {
    const r = d(Object.assign({ first_year_value: W[0] }, over));
    assert.equal(r.route, 'fit', JSON.stringify(over));
    assert.deepEqual(r.reasons, ['turnover_2m_plus', 'trading_2y_plus', 'register_not_used', 'value_under_2k_volume_firm']);
  }
  for (const s of [S[0], S[1], S[5]]) assert.equal(d({ first_year_value: W[0], marketing_spend: s }).route, 'review', s + ' is under £2,000 or not known');
});

test('law routing, 22 Oct 2026: withheld turnover is lifted only with 30+ fee earners AND £5,000+ a month', () => {
  const v = core.validate(GOOD).values;
  const un = { check: 'unchecked', reasons: [] };
  const d = (patch, ch = un) => route.decide(Object.assign({}, v, patch), ch);
  const P = O.people, S = O.spend, T = O.turnover, W = O.worth;
  const withheld = { turnover_band: T[5], employees_or_fee_earners: P[3], marketing_spend: S[3] };
  assert.deepEqual(d(withheld).reasons, ['turnover_inferred', 'trading_2y_plus', 'register_not_used']);
  assert.equal(d(Object.assign({}, withheld, { marketing_spend: S[4] })).route, 'fit');
  for (const over of [{ employees_or_fee_earners: P[2] }, { marketing_spend: S[2] }, { marketing_spend: S[1] }, { marketing_spend: S[5] }]) {
    assert.deepEqual(d(Object.assign({}, withheld, over)).reasons, ['turnover_not_stated'], JSON.stringify(over));
    assert.equal(d(Object.assign({}, withheld, over)).route, 'review');
  }
  assert.equal(route.turnoverInferred(Object.assign({}, v, withheld)), true);
  assert.equal(route.turnoverInferred(v), false, 'a stated turnover is never marked as inferred');
  const both = d(Object.assign({ first_year_value: W[0] }, withheld));
  assert.deepEqual(both, { route: 'fit', reasons: ['turnover_inferred', 'trading_2y_plus', 'register_not_used', 'value_under_2k_volume_firm'] }, 'the Ackroyd shape');
  assert.deepEqual(d(Object.assign({ practice_areas: 'Personal injury, Family', first_year_value: W[0] }, withheld)).reasons,
    ['turnover_inferred', 'trading_2y_plus', 'register_not_used', 'personal_injury_ticked', 'value_under_2k_volume_firm']);
  assert.deepEqual(d(withheld, { check: 'not_found', reasons: [] }).reasons, ['turnover_inferred', 'ch_not_found']);
});

test('law endpoint: under £1m with the £2,000 a month books; without it is not a fit; the answer is kept with the lead, not sent as a key', async () => {
  const small = Object.assign({}, GOOD, { turnover_band: O.turnover[0] });
  const yes = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, Object.assign({}, small, { low_turnover_budget: O.budget[0], lead_id: 'l_lawyes1' }));
  assert.equal(yes.body.route, 'fit');
  const z = yes.r.of('zapier')[0].body;
  assert.equal(z.route_reason, 'turnover_under_1m_budget_2k, trading_2y_plus, register_not_used');
  assert.ok(!('low_turnover_budget' in z), 'not a payload key');
  assert.equal(yes.r.blobs.leads()[0].values.low_turnover_budget, O.budget[0], 'stored with the lead');
  const no = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, Object.assign({}, small, { low_turnover_budget: O.budget[1], lead_id: 'l_lawno01' }));
  assert.equal(no.body.route, 'not_a_fit');
  assert.equal(no.r.of('zapier')[0].body.route_reason, 'turnover_below_1m, budget_2k_no');
  const missing = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, Object.assign({}, small, { lead_id: 'l_lawmis1' }));
  assert.equal(missing.res.status, 422);
  assert.deepEqual(missing.body.errors, { low_turnover_budget: core.MSG.choice });
});

test('law endpoint: a fit with no register check books and Zapier gets the practice areas and the SRA number', async () => {
  const { r, res, body } = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, GOOD);
  assert.equal(res.status, 200);
  assert.equal(body.route, 'fit');
  assert.equal(body.next, '/g/uk-law-firms/book/?lead_id=l_law0001');
  const z = r.of('zapier')[0].body;
  assert.equal(z.campaign, 'uk-law-firms');
  assert.equal(z.practice_areas, 'Family, Employment');
  assert.equal(z.sra_number, '654321');
  assert.equal(z.specialties, '', 'the health keys are sent empty');
  assert.equal(r.of('capi').length, 1);
});

test('law endpoint: personal injury alone is not a fit, goes to the archive and Meta is not told', async () => {
  const { r, body } = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, Object.assign({}, GOOD, { practice_areas: 'Personal injury' }));
  assert.equal(body.route, 'not_a_fit');
  assert.equal(r.of('zapier')[0].body.route_reason, 'personal_injury_only');
  assert.equal(r.of('capi').length, 0);
});

test('law endpoint: while not live, every post is refused', async () => {
  const { res } = await go({ live: false }, GOOD);
  assert.equal(res.status, 503);
});

test('law pages: built, noindex, no case cards and no firm names, version A of the payment text', () => {
  const dir = join(ROOT, 'public', 'g', 'uk-law-firms');
  for (const p of ['index.html', 'book/index.html', 'takk/index.html', 'review/index.html', 'not-now/index.html', 'not-a-fit/index.html', 'privacy/index.html', 'terms/index.html']) {
    assert.ok(existsSync(join(dir, p)), p + ' is built');
    assert.match(readFileSync(join(dir, p), 'utf8'), /<meta name="robots" content="noindex,nofollow">/);
  }
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const t = visible(html);
  assert.ok(!/Judicia|Campbell|Nova Law|Cedra|RSM/.test(t), 'no firm is named until figures and permission are in');
  assert.ok(!/class="cc"/.test(html), 'no case cards');
  assert.match(t, /Paid when a new client instructs you/);
  assert.ok(!/Companies House|SRA register/.test(t), 'no register check is promised');
  assert.equal((html.match(/type="checkbox" name="practice_areas"/g) || []).length, O.areas.length);
});
