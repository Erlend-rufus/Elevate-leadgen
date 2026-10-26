// Tests for /g/uk-private-hospitals: the form, the routing and the endpoint with this campaign.
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
  campaign: 'uk-private-hospitals',
  company_website: 'www.harbour-clinics.co.uk',
  company_name: 'Harbour Clinics Group Limited',
  regulator_number: '1-123456789',
  turnover_band: O.turnover[2],
  trading_years: O.trading[2],
  self_pay_share: O.selfpay[3],
  specialties: 'Gynaecology, Urology',
  first_consultation_value: O.worth[1],
  marketing_spend: O.spend[1],
  decision_maker: O.decider[0],
  capacity: O.capacity[1],
  meeting_goal: 'A straight answer on whether this can work for us.',
  first_name: 'Priya',
  last_name: 'Shah',
  job_title: 'Chief Executive',
  email: 'priya@harbour-clinics.co.uk',
  mobile: '',
  lead_id: 'l_health001',
  page_slug: 'uk-private-hospitals',
  consent: 'accepted',
};

/** The IT rig, but with this campaign in it (live, register check as the rig's env says). */
function healthRig(over = {}) {
  const r = rig(over);
  const base = realCampaigns['uk-private-hospitals'];
  r.campaigns['uk-private-hospitals'] = Object.assign({}, base, {
    cfg: Object.assign({}, base.cfg, { live: over.live !== false, legal: { registerCheck: over.registerCheck !== undefined ? over.registerCheck : Boolean(r.env.COMPANIES_HOUSE_API_KEY) } }),
  });
  return r;
}
const go = async (over, fields, opts) => {
  const r = healthRig(over);
  const res = await r.handler(post(fields, opts), { ip: '203.0.113.9' });
  return { r, res, body: res.headers.get('content-type').includes('json') ? await bodyOf(res) : await res.text() };
};

test('health form: thirteen steps, one of them a multi-choice, every field name a payload key', () => {
  assert.equal(core.STEPS.length, 13);
  const multi = core.STEPS.filter((s) => s.kind === 'multi');
  assert.equal(multi.length, 1);
  assert.equal(multi[0].field, 'specialties');
  for (const s of core.STEPS) if (s.kind === 'choice' || s.kind === 'multi') assert.ok(O[s.options], s.id + ' names its options');
  const bands = O.turnover.concat(O.worth, O.spend, O.selfpay);
  for (const b of bands) assert.ok(!/\d\s+to\s+£?\d/.test(b.replace(' to under ', ' ')), 'band "' + b + '" is written "to under"');
});

test('health form: a valid submission passes, the multi-choice keeps only real options, mobile is optional', () => {
  const v = core.validate(GOOD);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.values.specialties, 'Gynaecology, Urology');
  assert.equal(v.values.mobile, '');
  const bad = core.validate(Object.assign({}, GOOD, { specialties: 'Gynaecology, Cardiology' }));
  assert.equal(bad.errors.specialties, core.MSG.multi);
  const none = core.validate(Object.assign({}, GOOD, { specialties: '' }));
  assert.equal(none.errors.specialties, core.MSG.multi);
  const dup = core.validate(Object.assign({}, GOOD, { specialties: 'Urology, Urology' }));
  assert.equal(dup.values.specialties, 'Urology');
});

test('health routing: the table from the brief, as changed by the workshop of 26 Oct 2026, first match wins', () => {
  const v = core.validate(GOOD).values;
  const un = { check: 'unchecked', reasons: [] };
  const d = (patch, ch = un) => route.decide(Object.assign({}, v, patch), ch);
  const T = O.turnover, S = O.spend;
  assert.deepEqual(S, ['Under £3,000', '£3,000 to under £20,000', '£20,000 to under £50,000', '£50,000 or more', 'I do not know']);
  assert.deepEqual(d({}), { route: 'fit', reasons: ['turnover_2m_plus', 'trading_2y_plus', 'self_pay_30pc_plus', 'register_not_used'] });
  // £2m is the threshold now.
  assert.equal(d({ turnover_band: T[1] }).route, 'fit', '£2m to under £5m is a fit');
  assert.equal(d({ turnover_band: T[1] }).reasons[0], 'turnover_2m_plus');
  // Under £2m: the marketing budget decides.
  for (const s of [S[1], S[2], S[3]]) {
    assert.deepEqual(d({ turnover_band: T[0], marketing_spend: s }).reasons.slice(0, 1), ['turnover_under_2m_spend_3k'], s);
    assert.equal(d({ turnover_band: T[0], marketing_spend: s }).route, 'fit', s);
  }
  assert.deepEqual(d({ turnover_band: T[0], marketing_spend: S[4] }), { route: 'review', reasons: ['turnover_under_2m_spend_unknown'] });
  assert.deepEqual(d({ turnover_band: T[0], marketing_spend: S[0] }), { route: 'not_a_fit', reasons: ['turnover_below_2m', 'spend_under_3k'] });
  // Removed: trading, the value of a first consultation, capacity.
  assert.deepEqual(d({ trading_years: O.trading[0] }).reasons, ['turnover_2m_plus', 'trading_under_2y_ok', 'self_pay_30pc_plus', 'register_not_used']);
  assert.equal(d({ first_consultation_value: O.worth[0] }).route, 'fit');
  assert.equal(d({ first_consultation_value: O.worth[4] }).route, 'fit');
  assert.equal(d({ capacity: O.capacity[0] }).route, 'fit');
  assert.equal(d({ capacity: O.capacity[0], turnover_band: T[0], marketing_spend: S[0] }).route, 'not_a_fit');
  // What stays.
  assert.equal(d({ self_pay_share: O.selfpay[0] }).route, 'not_a_fit');
  assert.equal(d({ turnover_band: T[5] }).route, 'review');
  assert.equal(d({ self_pay_share: O.selfpay[1] }).route, 'review');
  assert.equal(d({ self_pay_share: O.selfpay[4] }).route, 'review');
  assert.equal(d({ specialties: 'Other' }).route, 'review');
  assert.equal(d({ specialties: 'Other, Urology' }).route, 'fit');
  assert.ok(d({ specialties: 'Fertility' }).reasons.includes('fertility'), 'fertility is flagged');
  assert.equal(d({}, { check: 'timeout', reasons: [] }).route, 'review');
  assert.equal(d({}, { check: 'mismatch', reasons: ['ch_accounts_too_small'], profile: { accounts_type: 'micro-entity' } }).route, 'review');
  assert.equal(d({ turnover_band: T[5] }, { check: 'mismatch', reasons: [], profile: { accounts_type: 'dormant' } }).route, 'not_a_fit');
  assert.equal(route.needsRegistry(Object.assign({}, v, { capacity: O.capacity[0] })), true, 'capacity settles nothing now');
});

test('health endpoint: a fit with no register check books, Zapier gets the four health keys, Meta is told', async () => {
  const { r, res, body } = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, GOOD);
  assert.equal(res.status, 200);
  assert.equal(body.route, 'fit');
  assert.equal(body.next, '/g/uk-private-hospitals/book/?lead_id=l_health001');
  const z = r.of('zapier')[0].body;
  assert.equal(z.campaign, 'uk-private-hospitals');
  assert.equal(z.specialties, 'Gynaecology, Urology');
  assert.equal(z.self_pay_share, O.selfpay[3]);
  assert.equal(z.first_consultation_value, O.worth[1]);
  assert.equal(z.regulator_number, '1-123456789');
  assert.equal(z.route_reason, 'turnover_2m_plus, trading_2y_plus, self_pay_30pc_plus, register_not_used');
  assert.equal(r.of('ch').length, 0, 'the register is not asked');
  assert.equal(r.of('capi').length, 1, 'QualifiedForm is sent');
});

test('health endpoint: a plain form post with several ticked specialties is read as one answer', async () => {
  const r = healthRig({ env: { COMPANIES_HOUSE_API_KEY: undefined } });
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(GOOD)) if (k !== 'specialties') p.append(k, v);
  p.append('specialties', 'Urology');
  p.append('specialties', 'Fertility');
  const req = new Request('https://getelevateleads.com/api/lead', {
    method: 'POST', body: p.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html', 'x-nf-client-connection-ip': '203.0.113.9' },
  });
  const res = await r.handler(req, { ip: '203.0.113.9' });
  assert.equal(res.status, 303);
  assert.match(res.headers.get('location'), /^\/g\/uk-private-hospitals\/book\//);
  assert.equal(r.of('zapier')[0].body.specialties, 'Urology, Fertility');
});

test('health endpoint: while not live, every post is refused and nothing stored', async () => {
  const { r, res } = await go({ live: false }, GOOD);
  assert.equal(res.status, 503);
  assert.equal(r.blobs.leads().length, 0);
});

test('health endpoint: a failed no-script post comes back as the health form with the errors', async () => {
  const { res, body } = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, Object.assign({}, GOOD, { specialties: '', email: 'nope' }), { asJson: false });
  assert.equal(res.status, 422);
  const t = visible(body);
  assert.match(t, /Hospital or clinic group website/);
  assert.match(t, /Please choose at least one option/);
  assert.match(t, /Please enter a valid work email/);
});

test('health pages: built, noindex, checkboxes for the specialties, the booking page embeds Calendly once it is configured', () => {
  const dir = join(ROOT, 'public', 'g', 'uk-private-hospitals');
  for (const p of ['index.html', 'book/index.html', 'takk/index.html', 'review/index.html', 'not-now/index.html', 'not-a-fit/index.html', 'privacy/index.html', 'terms/index.html']) {
    assert.ok(existsSync(join(dir, p)), p + ' is built');
    assert.match(readFileSync(join(dir, p), 'utf8'), /<meta name="robots" content="noindex,nofollow">/);
  }
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.equal((html.match(/type="checkbox" name="specialties"/g) || []).length, O.specialties.length);
  assert.match(html, /13x/);
  assert.ok(!/Companies House/.test(visible(html)), 'the page promises no register check while legal.registerCheck is false');
  assert.ok(!/C-Medical/.test(visible(html).replace(/C-Medical, Google Ads, 2026 against the same days of 2025|accounts for C-Medical/g, '')), 'the name appears only in the table title and the source line');
  const book = readFileSync(join(dir, 'book/index.html'), 'utf8');
  const cfg = JSON.parse(readFileSync(join(ROOT, 'g', 'uk-private-hospitals', 'config.json'), 'utf8'));
  if (!cfg.funnel.calendlyUrl) assert.match(book, /The calendar is not connected yet/);
  else {
    assert.equal(/not connected yet/.test(book), false);
    assert.ok(book.includes(cfg.funnel.calendlyUrl), 'the booking page embeds the configured event');
  }
});
