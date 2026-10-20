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

test('law form: thirteen steps, practice areas is the multi-choice, bands written "to under", mobile optional', () => {
  assert.equal(core.STEPS.length, 13);
  const multi = core.STEPS.filter((s) => s.kind === 'multi');
  assert.equal(multi.length, 1);
  assert.equal(multi[0].field, 'practice_areas');
  assert.deepEqual(O.turnover.slice(0, 5), ['Under £1m', '£1m to under £2m', '£2m to under £5m', '£5m to under £10m', '£10m or more']);
  assert.deepEqual(O.worth, ['Under £2,000', '£2,000 to under £5,000', '£5,000 to under £15,000', '£15,000 or more']);
  const mobile = core.STEPS[12].fields.find((f) => f.field === 'mobile');
  assert.equal(mobile.optional, true);
  assert.equal(core.validate(GOOD).ok, true);
});

test('law routing: the table from the brief with the work document answers', () => {
  const v = core.validate(GOOD).values;
  const un = { check: 'unchecked', reasons: [] };
  const d = (patch, ch = un) => route.decide(Object.assign({}, v, patch), ch);
  assert.equal(d({}).route, 'fit');
  assert.deepEqual(d({}).reasons, ['turnover_2m_plus', 'trading_2y_plus', 'register_not_used']);
  assert.equal(d({ turnover_band: O.turnover[1] }).route, 'not_a_fit');
  assert.equal(d({ trading_years: O.trading[0] }).route, 'not_a_fit');
  assert.equal(d({ practice_areas: 'Personal injury' }).route, 'not_a_fit', 'personal injury alone');
  const mixed = d({ practice_areas: 'Personal injury, Family' });
  assert.equal(mixed.route, 'fit', 'personal injury with other areas is routed on the other areas');
  assert.ok(mixed.reasons.includes('personal_injury_ticked'));
  assert.equal(d({ capacity: O.capacity[0] }).route, 'not_now');
  assert.equal(d({ turnover_band: O.turnover[5] }).route, 'review', 'F7: not stated is always review');
  assert.equal(d({ turnover_band: O.turnover[5], employees_or_fee_earners: O.people[0] }).route, 'review');
  assert.equal(d({ first_year_value: O.worth[0] }).route, 'review', 'L5: under £2,000 is review, not a refusal');
  assert.equal(d({}, { check: 'not_found', reasons: [] }).route, 'review', 'a partnership that is not at Companies House is review');
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
