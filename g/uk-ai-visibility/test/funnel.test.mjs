// Tests for /g/uk-ai-visibility: the form, the routing, the endpoint with this campaign and the built pages.
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
  campaign: 'uk-ai-visibility',
  company_website: 'www.northgate-it.co.uk',
  company_name: 'Northgate IT Ltd',
  specialism: O.sector[0],
  turnover_band: O.turnover[2],
  employees_or_fee_earners: O.people[1],
  marketing_spend: O.spend[2],
  decision_maker: O.decider[0],
  meeting_goal: 'Who is the best managed IT provider in Leeds for a 50 person firm?',
  first_name: 'Amy',
  last_name: 'Shaw',
  job_title: 'Managing Director',
  email: 'amy@northgate-it.co.uk',
  mobile: '',
  lead_id: 'l_ai00001',
  page_slug: 'uk-ai-visibility',
  consent: 'accepted',
};

function aiRig(over = {}) {
  const r = rig(over);
  const base = realCampaigns['uk-ai-visibility'];
  r.campaigns['uk-ai-visibility'] = Object.assign({}, base, {
    cfg: Object.assign({}, base.cfg, { live: over.live !== false, legal: { registerCheck: false } }),
  });
  return r;
}
const go = async (over, fields, opts) => {
  const r = aiRig(over);
  const res = await r.handler(post(fields, opts), { ip: '203.0.113.9' });
  return { r, res, body: res.headers.get('content-type').includes('json') ? await bodyOf(res) : await res.text() };
};

test('ai form: nine steps, every field a payload key the Zap already reads, mobile optional', () => {
  assert.equal(core.STEPS.length, 9);
  assert.deepEqual(core.FIELDS.slice(0, 8), ['company_website', 'company_name', 'specialism', 'turnover_band', 'employees_or_fee_earners', 'marketing_spend', 'decision_maker', 'meeting_goal']);
  assert.equal(core.STEPS[8].fields.find((f) => f.field === 'mobile').optional, true);
  assert.equal(core.validate(GOOD).ok, true);
  assert.equal(core.validate(Object.assign({}, GOOD, { specialism: 'Fishing' })).errors.specialism, core.MSG.choice);
  assert.equal(core.validate(Object.assign({}, GOOD, { meeting_goal: '' })).errors.meeting_goal, core.MSG.goal);
});

test('ai routing: £1m or more is a fit, under £1m is not, not stated is review unless plainly large', () => {
  const v = core.validate(GOOD).values;
  const un = { check: 'unchecked', reasons: [] };
  const d = (patch, ch = un) => route.decide(Object.assign({}, v, patch), ch);
  const T = O.turnover;
  assert.deepEqual(d({}), { route: 'fit', reasons: ['turnover_2m_plus', 'register_not_used'] });
  assert.deepEqual(d({ turnover_band: T[1] }), { route: 'fit', reasons: ['turnover_1m_2m', 'register_not_used'] });
  assert.deepEqual(d({ turnover_band: T[0] }), { route: 'not_a_fit', reasons: ['turnover_below_1m'] });
  assert.deepEqual(d({ turnover_band: T[5] }), { route: 'review', reasons: ['turnover_not_stated'] });
  const large = { turnover_band: T[5], employees_or_fee_earners: O.people[2], marketing_spend: O.spend[2] };
  assert.deepEqual(d(large), { route: 'fit', reasons: ['turnover_inferred', 'register_not_used'] });
  assert.equal(d(Object.assign({}, large, { marketing_spend: O.spend[1] })).route, 'review');
  assert.equal(route.needsRegistry(Object.assign({}, v, { turnover_band: T[0] })), false);
  for (const r of ['fit', 'review', 'not_a_fit']) assert.ok(route.ROUTES.includes(r));
});

test('ai routing: legal and healthcare are flagged, never refused', () => {
  const v = core.validate(GOOD).values;
  const d = (patch) => route.decide(Object.assign({}, v, patch), { check: 'unchecked', reasons: [] });
  assert.deepEqual(d({ specialism: 'Legal' }), { route: 'fit', reasons: ['turnover_2m_plus', 'register_not_used', 'legal_no_chatgpt_ads'] });
  assert.deepEqual(d({ specialism: 'Healthcare' }).reasons, ['turnover_2m_plus', 'register_not_used', 'health_ads_check']);
  assert.deepEqual(d({ specialism: 'Legal', turnover_band: O.turnover[5] }).reasons, ['turnover_not_stated', 'legal_no_chatgpt_ads']);
});

test('ai endpoint: a fit books, Zapier gets the sector as specialism, Meta is told', async () => {
  const { r, res, body } = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, GOOD);
  assert.equal(res.status, 200);
  assert.equal(body.route, 'fit');
  assert.equal(body.next, '/g/uk-ai-visibility/book/?lead_id=l_ai00001');
  const z = r.of('zapier')[0].body;
  assert.equal(z.campaign, 'uk-ai-visibility');
  assert.equal(z.specialism, 'IT and technology');
  assert.equal(z.commission_promised, 'yes', 'the payload default; the Zap marks every lead of this campaign RETAINER instead');
  assert.equal(r.of('capi').length, 1);
});

test('ai endpoint: under £1m is not a fit and Meta is not told', async () => {
  const { r, body } = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined } }, Object.assign({}, GOOD, { turnover_band: O.turnover[0], lead_id: 'l_ai00002' }));
  assert.equal(body.route, 'not_a_fit');
  assert.equal(r.of('zapier')[0].body.route_reason, 'turnover_below_1m');
  assert.equal(r.of('capi').length, 0);
});

test('ai pages: built, noindex, the price is on the page, commission is nowhere', () => {
  const dir = join(ROOT, 'public', 'g', 'uk-ai-visibility');
  for (const p of ['index.html', 'book/index.html', 'takk/index.html', 'review/index.html', 'not-now/index.html', 'not-a-fit/index.html', 'privacy/index.html', 'terms/index.html']) {
    assert.ok(existsSync(join(dir, p)), p + ' is built');
    const html = readFileSync(join(dir, p), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
    assert.ok(!/\bcommissions?\b|kommisjon/i.test(visible(html)), p + ' says nothing about commission (the ICO, Information Commissioner, is fine)');
  }
  const t = visible(readFileSync(join(dir, 'index.html'), 'utf8'));
  assert.match(t, /From £1,500 a month/);
  assert.match(t, /30 days(&#39;|') notice/);
  assert.ok(!/guarantee(d|s)? (a|your) (ranking|position|result)/i.test(t.replace(/Do you guarantee results\?/, '')), 'no guarantee is offered');
  assert.match(readFileSync(join(dir, 'book', 'index.html'), 'utf8'), /elevate-marketing-ai-visibility-30-minute-review/);
});

test('ai ab test: the ten to one module is variant b only, hidden without a script, events wired', () => {
  const html = readFileSync(join(ROOT, 'public', 'g', 'uk-ai-visibility', 'index.html'), 'utf8');
  assert.match(html, /<section data-ab-only="b" class="sec t1" id="tenone"/);
  assert.match(html, /\[data-ab-only\]\{display:none\}/, 'no script, no variant class: the module stays hidden (variant a)');
  assert.match(html, /elevate:g:uk-ai-visibility:ab/);
  for (const ev of ['AbView', 'AbFormReach', 'AbFormStart', 'AbQualified']) assert.ok(html.includes(`'${ev}'`), ev + ' is sent');
  assert.ok(html.indexOf('data-ab') < html.indexOf('<body'), 'the variant is drawn in the head, before the body');
  const other = readFileSync(join(ROOT, 'public', 'g', 'uk-it-growth', 'index.html'), 'utf8');
  assert.ok(!/data-ab-only|AbView/.test(other), 'a funnel without "ab" gets no test');
});
