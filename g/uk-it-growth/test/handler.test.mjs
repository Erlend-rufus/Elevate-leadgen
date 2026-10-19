import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rig, post, bodyOf, visible, GOOD, OPTIONS, cfg, ok, chResponder, CH_PROFILE, sha256, HOOK, NOW,
} from './helpers.mjs';
import { PAYLOAD_KEYS } from '../../../netlify/functions/lead/payload.mjs';

const T = OPTIONS.turnover, TR = OPTIONS.trading, W = OPTIONS.worth, C = OPTIONS.capacity;

/** One submission through a fresh rig. text is read once; j is the parsed body when it is JSON. */
async function go(over = {}, fields = GOOD, opts = {}) {
  const r = rig(over);
  const res = await r.handler(post(fields, opts), opts.context);
  const text = await res.text();
  let j = null;
  try { j = JSON.parse(text); } catch (e) { /* an HTML answer */ }
  return { r, res, text, j };
}
const NEXT_GOOD = '/g/uk-it-growth/book/?lead_id=l_test123&utm_source=meta&utm_medium=paid&utm_campaign=itq4&utm_content=ad7&utm_term=managed&fbclid=FB1';

/* ------------------------------------------------------------------------------- the request */

test('only POST is accepted', async () => {
  const { handler } = rig();
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
    const res = await handler(new Request('https://x.test/api/lead', { method }));
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.get('allow'), 'POST');
  }
});

test('a post that is neither JSON nor a form is refused, and so is broken JSON', async () => {
  const a = await go({}, GOOD, { type: 'text/plain' });
  assert.equal(a.res.status, 415);
  const { handler, calls } = rig();
  const bad = await handler(new Request('https://x.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json' }));
  assert.equal(bad.status, 400);
  assert.equal((await bodyOf(bad)).error, 'bad_json');
  const arr = await handler(new Request('https://x.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[1,2]' }));
  assert.equal(arr.status, 400);
  assert.equal(calls.length, 0);
});

test('a body over 64 KB is refused, whether or not the header says so', async () => {
  const { handler, calls } = rig();
  const big = JSON.stringify(Object.assign({}, GOOD, { company_name: 'x'.repeat(70 * 1024) }));
  const noHeader = await handler(new Request('https://x.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: big }));
  assert.equal(noHeader.status, 413);
  const withHeader = await handler(new Request('https://x.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': String(70 * 1024) }, body: '{}' }));
  assert.equal(withHeader.status, 413);
  assert.equal(calls.length, 0);
});

test('an unknown or missing campaign is refused', async () => {
  assert.equal((await go({}, Object.assign({}, GOOD, { campaign: 'uk-law-firms' }))).res.status, 400);
  assert.equal((await go({}, Object.assign({}, GOOD, { campaign: undefined }))).res.status, 400);
  assert.equal((await go({}, Object.assign({}, GOOD, { campaign: '__proto__' }))).res.status, 400);
  assert.equal((await go({}, Object.assign({}, GOOD, { campaign: 'constructor' }))).res.status, 400);
});

test('every answer says it must not be stored, cached or indexed', async () => {
  for (const make of [
    () => go(),
    () => go({}, Object.assign({}, GOOD, { company_website: 'x' })),
    () => go({ live: false }),
    () => go({}, GOOD, { type: 'text/plain' }),
  ]) {
    const { res } = await make();
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  }
});

/* ------------------------------------------------------------------------- a good submission */

test('a good submission is stored, delivered once, and the visitor is sent on with the tracking', async () => {
  const { r, res, j } = await go();
  assert.equal(res.status, 200);
  assert.deepEqual(j, { ok: true, lead_id: 'l_test123', route: 'fit', page: 'book', next: NEXT_GOOD });
  assert.equal(r.of('zapier').length, 1);
  assert.equal(r.of('zapier')[0].url, HOOK);
  assert.equal(r.of('zapier')[0].headers['Content-Type'], 'application/json');
  assert.equal(r.of('ch').length, 2, 'one search and one profile');
});

test('what Zapier receives: fixed keys in a fixed order, nothing else', async () => {
  const { r } = await go();
  const p = r.of('zapier')[0].body;
  assert.deepEqual(Object.keys(p), PAYLOAD_KEYS);
  assert.deepEqual(p, {
    lead_id: 'l_test123', campaign: 'uk-it-growth', route: 'fit',
    route_reason: 'turnover_2m_plus, trading_2y_plus, ch_full', submitted_at: NOW.toISOString(),
    company_name: 'Northbridge IT Limited', company_website: 'northbridge-it.co.uk', company_number: '01234567',
    ch_status: 'active', ch_accounts_type: 'full', ch_incorporated: '2012-03-01', ch_check: 'ok',
    specialism: 'Managed IT services', practice_areas: '', sra_number: '',
    turnover_band: T[2], trading_years: TR[2], employees_or_fee_earners: OPTIONS.people[2], marketing_spend: OPTIONS.spend[1],
    first_year_value: W[2], sales_cycle: OPTIONS.cycle[1], target_next_year: '', decision_maker: OPTIONS.decider[0], capacity: C[1],
    first_name: 'Alex', last_name: 'Morgan', job_title: 'Managing Director', email: 'alex@northbridge-it.co.uk', mobile: '07700 900123',
    utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'itq4', utm_content: 'ad7', utm_term: 'managed',
    fbclid: 'FB1', page_slug: 'uk-it-growth', referrer: 'https://l.facebook.com/',
  });
});

test('"Other" as the area is sent with the visitor\'s own words', async () => {
  const { r } = await go({}, Object.assign({}, GOOD, { specialism: 'Other', specialism_other: 'Quantum networking' }));
  assert.equal(r.of('zapier')[0].body.specialism, 'Other: Quantum networking');
});

test('the lead is in storage, with its delivery and its Meta outcome, before anything else is trusted', async () => {
  const { r } = await go();
  const rec = r.blobs.lead('l_test123');
  assert.equal(rec.route, 'fit');
  assert.equal(rec.campaign, 'uk-it-growth');
  assert.equal(rec.received_at, NOW.toISOString());
  assert.equal(rec.delivery.state, 'ok');
  assert.equal(rec.delivery.attempts, 1);
  assert.equal(rec.capi.state, 'ok');
  assert.equal(rec.consent, 'accepted');
  assert.equal(rec.values.email, 'alex@northbridge-it.co.uk');
  assert.equal(rec.ch.check, 'ok');
  assert.ok(r.blobs.m.has('by-day/2026-10-19/l_test123'), 'indexed for the daily check');
  assert.equal(JSON.stringify(rec).includes(GOOD.fbp), false, 'the browser id is sent to Meta and not kept');
});

test('without JavaScript a good submission is a 303 to the same place', async () => {
  const { res } = await go({}, GOOD, { asJson: false });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), NEXT_GOOD);
});

test('the same address and the same people give the same answer for the JSON and the form', async () => {
  const a = await go({}, GOOD, { asJson: true });
  const b = await go({}, GOOD, { asJson: false });
  assert.equal(a.j.next, b.res.headers.get('location'));
});

/* ---------------------------------------------------------------------------- each route */

test('not a fit: sent to its page, the register is not asked, Meta is not told', async () => {
  const { r, j } = await go({}, Object.assign({}, GOOD, { turnover_band: T[0] }));
  assert.equal(j.route, 'not_a_fit');
  assert.equal(j.page, 'not-a-fit');
  assert.ok(j.next.startsWith('/g/uk-it-growth/not-a-fit/?lead_id=l_test123'));
  assert.equal(r.of('ch').length, 0);
  assert.equal(r.of('capi').length, 0);
  assert.equal(r.of('zapier')[0].body.route, 'not_a_fit', 'still delivered: the Zap decides what a team sees');
  assert.equal(r.of('zapier')[0].body.route_reason, 'turnover_below_2m');
});

test('not now: sent to its page, the register is not asked, Meta is not told', async () => {
  const { r, j } = await go({}, Object.assign({}, GOOD, { capacity: C[0] }));
  assert.equal(j.route, 'not_now');
  assert.equal(j.page, 'not-now');
  assert.equal(r.of('ch').length, 0);
  assert.equal(r.of('capi').length, 0);
});

test('review: sent to its page, and Meta is told because a person will look at it', async () => {
  const { r, j } = await go({}, Object.assign({}, GOOD, { turnover_band: T[5] }));
  assert.equal(j.route, 'review');
  assert.equal(j.page, 'review');
  assert.equal(r.of('capi').length, 1);
});

test('at capacity with turnover unstated, the register decides between not-now and not-a-fit', async () => {
  const base = Object.assign({}, GOOD, { capacity: C[0], turnover_band: T[5] });
  const tiny = await go({ responders: { ch: chResponder(Object.assign({}, CH_PROFILE, { accounts: { last_accounts: { type: 'micro-entity' } } })) } }, base);
  assert.equal(tiny.j.route, 'not_a_fit');
  assert.equal(tiny.r.of('ch').length, 2);
  const normal = await go({}, base);
  assert.equal(normal.j.route, 'not_now');
});

test('a self-reported no is never turned into a yes by the register', async () => {
  const { j } = await go({}, Object.assign({}, GOOD, { trading_years: TR[0] }));
  assert.equal(j.route, 'not_a_fit');
});

/* ------------------------------------------------------------------------------ invalid input */

test('invalid input: JSON gets the errors by field, and nothing is stored or sent', async () => {
  const { r, res, j } = await go({}, Object.assign({}, GOOD, { company_website: 'northbridge', email: 'alex@x', turnover_band: 'lots' }));
  assert.equal(res.status, 422);
  assert.deepEqual(j.errors, {
    company_website: 'Please enter a valid website',
    turnover_band: 'Please choose one option',
    email: 'Please enter a valid work email',
  });
  assert.equal(r.blobs.leads().length, 0);
  assert.equal(r.calls.length, 0, 'not even the register is asked');
});

test('invalid input without JavaScript: the form comes back with the answers kept and the errors shown', async () => {
  const { r, res, text } = await go({}, Object.assign({}, GOOD, { company_website: 'northbridge', company_name: 'Kept Co', turnover_band: T[3] }), { asJson: false });
  assert.equal(res.status, 422);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(text, /Please enter a valid website/);
  assert.match(text, /value="northbridge"/);
  assert.match(text, /value="Kept Co"/);
  assert.match(text, /name="lead_id" value="l_test123"/, 'the lead id survives the round trip');
  assert.match(text, /name="utm_source" value="meta"/);
  assert.ok(text.includes(`name="turnover_band" value="${T[3]}" checked`), 'the chosen option is still chosen');
  assert.match(text, /^<!doctype html>/i, 'a whole page, not a fragment');
  assert.equal((text.match(/<h1[\s>]/g) || []).length, 1, 'one h1');
  assert.match(text, /<meta name="robots" content="noindex/);
  assert.equal(r.calls.length, 0);
});

test('what a visitor typed is escaped when the page is written back', async () => {
  const evil = '"><script>alert(1)</script><img src=x onerror=alert(2)>';
  const { text } = await go({}, Object.assign({}, GOOD, {
    company_website: evil, company_name: evil, first_name: evil, job_title: evil, utm_source: evil, specialism: 'Other', specialism_other: evil,
  }), { asJson: false });
  assert.equal(/<script>alert/.test(text), false);
  assert.equal(/<img src=x/.test(text), false);
  assert.ok(text.includes('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;'), 'shown as text');
});

test('a field that is not text counts as missing, not as a crash', async () => {
  const { res, j } = await go({}, Object.assign({}, GOOD, { company_name: { a: 1 }, email: ['x@y.com'] }));
  assert.equal(res.status, 422);
  assert.equal(j.errors.company_name, 'Please complete this field');
  assert.equal(j.errors.email, 'Please enter a valid work email');
});

/* ------------------------------------------------------------------------------- the trap */

test('the hidden field: filled in means a program, which is told "not a fit" and nothing else happens', async () => {
  const { r, res, j, } = await go({}, Object.assign({}, GOOD, { contact_by_fax: 'Acme Ltd' }));
  assert.equal(res.status, 200);
  assert.equal(j.route, 'not_a_fit');
  assert.equal(r.calls.length, 0, 'no register, no Zapier, no Meta, no e-mail');
  assert.equal(r.blobs.m.size, 0, 'nothing stored, not even a rate counter');
  assert.deepEqual(r.logs.map((l) => l.code), ['honeypot']);
});

test('the hidden field with only spaces in it is empty', async () => {
  const { j } = await go({}, Object.assign({}, GOOD, { contact_by_fax: '   ' }));
  assert.equal(j.route, 'fit');
});

/* -------------------------------------------------------------------------------- readiness */

test('not live: every submission is refused with 503, and nothing is stored or sent', async () => {
  const { r, res, j } = await go({ live: false });
  assert.equal(res.status, 503);
  assert.deepEqual(j, { ok: false, error: 'unavailable' });
  assert.equal(r.calls.length, 0);
  assert.equal(r.blobs.m.size, 0);
  assert.equal(r.logs[0].code, 'not_live');
});

test('not live, no JavaScript: the form comes back with the answers kept and the general message', async () => {
  const { res, text } = await go({ live: false }, GOOD, { asJson: false });
  assert.equal(res.status, 503);
  assert.match(text, /Something went wrong on our side\. Your answers are still here\./);
  assert.match(text, /mailto:post@elevatemarketing\.no/);
  assert.match(text, /value="Northbridge IT Limited"/);
});

test('no destination for the leads: refused rather than accepted into the void', async () => {
  for (const hook of [undefined, '', 'http://hooks.zapier.com/x', 'not a url', 'https://has space.test/x']) {
    const { r, res, j } = await go({ env: { ZAPIER_LEAD_HOOK: hook } });
    assert.equal(res.status, 503, String(hook));
    assert.equal(j.error, 'unavailable');
    assert.equal(r.calls.length, 0);
    assert.equal(r.logs[0].code, 'no_destination');
  }
});

/* ------------------------------------------------------------------------------ rate limit */

const lead = (n) => Object.assign({}, GOOD, { lead_id: 'l_rate' + n });

test('twelve an hour from one address, the thirteenth is turned away', async () => {
  const r = rig();
  for (let i = 1; i <= 12; i++) {
    const res = await r.handler(post(lead(i)));
    assert.equal(res.status, 200, 'request ' + i);
  }
  const res = await r.handler(post(lead(13)));
  assert.equal(res.status, 429);
  assert.deepEqual(await bodyOf(res), { ok: false, error: 'rate_limited' });
  assert.equal(r.of('zapier').length, 12, 'the thirteenth was not delivered');
  assert.equal(r.blobs.lead('l_rate13'), null);
});

test('another address is unaffected, and the next hour starts again', async () => {
  const r = rig();
  for (let i = 1; i <= 13; i++) await r.handler(post(lead(i)));
  assert.equal((await r.handler(post(lead(14), { ip: '198.51.100.20' }))).status, 200);
  r.tick(3600 * 1000);
  assert.equal((await r.handler(post(lead(15)))).status, 200);
});

test('the limit without JavaScript puts the form back with the general message', async () => {
  const r = rig();
  for (let i = 1; i <= 12; i++) await r.handler(post(lead(i)));
  const res = await r.handler(post(lead(13), { asJson: false }));
  assert.equal(res.status, 429);
  assert.match(await res.text(), /Something went wrong on our side/);
});

test('only a hash of the address is ever stored', async () => {
  const { r } = await go();
  const keys = [...r.blobs.m.keys()].filter((k) => k.startsWith('rl/'));
  assert.equal(keys.length, 1);
  assert.match(keys[0], /^rl\/2026101909\/[0-9a-f]{32}$/);
  assert.equal([...r.blobs.m.entries()].some(([k, v]) => k.includes('203.0.113.7') || v.includes('203.0.113.7')), false);
});

test('the address comes from Netlify first, then the context, then the forwarding header', async () => {
  const r = rig();
  await r.handler(post(GOOD, { ip: null, headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' } }));
  assert.equal(r.of('capi')[0].body.data[0].user_data.client_ip_address, '198.51.100.9');
  const r2 = rig();
  await r2.handler(post(Object.assign({}, GOOD, { lead_id: 'l_ctx' }), { ip: '203.0.113.7' }), { ip: '192.0.2.44' });
  assert.equal(r2.of('capi')[0].body.data[0].user_data.client_ip_address, '192.0.2.44', 'the context wins');
});

test('a broken counter lets people in rather than turning a lead away', async () => {
  const r = rig();
  r.blobs.fail = (op, key) => { if (String(key).startsWith('rl/')) throw new Error('storage down'); };
  const res = await r.handler(post(GOOD));
  assert.equal(res.status, 200);
  assert.ok(r.logs.some((l) => l.code === 'rate_error'));
  assert.ok(r.blobs.lead('l_test123'));
});

/* --------------------------------------------------------------------------- the same lead twice */

test('the same lead again is answered as before and sent nowhere twice', async () => {
  const r = rig();
  const first = await bodyOf(await r.handler(post(GOOD)));
  const second = await bodyOf(await r.handler(post(GOOD)));
  assert.deepEqual(second, first);
  assert.equal(r.of('zapier').length, 1);
  assert.equal(r.of('ch').length, 2);
  assert.equal(r.of('capi').length, 1, 'Meta would otherwise count it twice');
  assert.ok(r.logs.some((l) => l.code === 'replay'));
});

test('the same lead again with other answers keeps the first decision', async () => {
  const r = rig();
  await r.handler(post(Object.assign({}, GOOD, { turnover_band: T[0] })));
  const again = await bodyOf(await r.handler(post(GOOD)));
  assert.equal(again.route, 'not_a_fit', 'a retry cannot be used to try other answers');
  assert.equal(r.blobs.lead('l_test123').values.turnover_band, T[0]);
});

test('two requests at once for the same lead make one lead', async () => {
  const r = rig();
  const [a, b] = await Promise.all([r.handler(post(GOOD)), r.handler(post(GOOD))]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(r.of('zapier').length, 1);
  assert.equal(r.blobs.leads().length, 1);
});

test('losing the race to create a lead answers with the winner\'s route and sends nothing', async () => {
  let reads = 0;
  const store = () => ({
    rateHit: async () => true,
    getLead: async () => (reads++ === 0 ? null : { lead_id: 'l_test123', route: 'review', delivery: { state: 'ok' } }),
    createLead: async () => ({ created: false }),
    saveLead: async () => {},
  });
  const { r, j } = await go({ store });
  assert.equal(j.route, 'review');
  assert.equal(r.of('zapier').length, 0);
});

test('a retry after a failed delivery delivers it, and Meta is still told once', async () => {
  let up = false;
  const r = rig({ responders: { zapier: () => ok('', up ? 200 : 500) } });
  const first = await r.handler(post(GOOD));
  assert.equal(first.status, 200, 'the visitor was received');
  assert.equal(r.blobs.lead('l_test123').delivery.state, 'failed');
  assert.equal(r.of('zapier').length, 3);
  up = true;
  const second = await r.handler(post(GOOD));
  assert.equal(second.status, 200);
  assert.equal(r.of('zapier').length, 4);
  const rec = r.blobs.lead('l_test123');
  assert.equal(rec.delivery.state, 'ok');
  assert.equal(rec.delivery.attempts, 4);
  assert.equal(r.of('capi').length, 1);
});

/* ------------------------------------------------------------------------------ Zapier */

test('a hook that fails once is tried again, and no alert goes out', async () => {
  let n = 0;
  const { r, res } = await go({ responders: { zapier: () => ok('', ++n === 1 ? 502 : 200) } });
  assert.equal(res.status, 200);
  assert.equal(r.of('zapier').length, 2);
  assert.equal(r.blobs.lead('l_test123').delivery.state, 'ok');
  assert.equal(r.blobs.lead('l_test123').delivery.attempts, 2);
  assert.equal(r.of('resend').length + r.of('slack').length, 0);
});

test('a hook that stays down: three tries, the lead is kept, the visitor is still sent on, a person is told', async () => {
  const { r, res, j } = await go({ responders: { zapier: () => ok('', 500) } });
  assert.equal(res.status, 200);
  assert.equal(j.route, 'fit');
  assert.equal(r.of('zapier').length, 3);
  const rec = r.blobs.lead('l_test123');
  assert.equal(rec.delivery.state, 'failed');
  assert.equal(rec.delivery.error, 'http_500');
  assert.equal(r.of('resend').length, 1);
  assert.equal(r.of('slack').length, 1);
});

test('a hook that is wrong (4xx) is tried once: another try changes nothing', async () => {
  const { r } = await go({ responders: { zapier: () => ok('gone', 410) } });
  assert.equal(r.of('zapier').length, 1);
  assert.equal(r.blobs.lead('l_test123').delivery.error, 'http_410');
});

test('429 is retried, a redirect is not trusted', async () => {
  let n = 0;
  const a = await go({ responders: { zapier: () => ok('', ++n < 3 ? 429 : 200) } });
  assert.equal(a.r.of('zapier').length, 3);
  assert.equal(a.r.blobs.lead('l_test123').delivery.state, 'ok');
  const b = await go({ responders: { zapier: () => new Response(null, { status: 302, headers: { Location: 'https://elsewhere.test/' } }) } });
  assert.equal(b.r.of('zapier').length, 1);
  assert.equal(b.r.blobs.lead('l_test123').delivery.error, 'http_302');
  assert.equal(b.r.of('zapier')[0].init.redirect, 'manual');
});

test('a network error is retried and then reported', async () => {
  const { r, res } = await go({ responders: { zapier: () => { throw new TypeError('fetch failed'); } } });
  assert.equal(res.status, 200);
  assert.equal(r.of('zapier').length, 3);
  assert.equal(r.blobs.lead('l_test123').delivery.error, 'network');
});

test('the alert names the lead and the company and nothing a person typed beyond that', async () => {
  const { r } = await go({ responders: { zapier: () => ok('', 500) } });
  const mail = r.of('resend')[0];
  assert.equal(mail.headers.Authorization, 'Bearer resend-test-key');
  assert.deepEqual(mail.body.to, ['post@elevatemarketing.no']);
  assert.equal(mail.body.from, 'alerts@example.test');
  assert.equal(mail.body.subject, 'Lead not delivered to Zapier: Northbridge IT Limited');
  assert.match(mail.body.text, /lead_id: l_test123/);
  assert.match(mail.body.text, /will be delivered again by the daily reconciliation/);
  const slack = r.of('slack')[0].body.text;
  for (const text of [mail.body.subject + mail.body.text, slack]) {
    for (const secret of ['alex@', 'Morgan', 'Alex', '07700', 'Managing Director']) assert.equal(text.includes(secret), false, secret);
  }
});

test('an alert that cannot be sent never takes the answer down', async () => {
  const { res, r } = await go({ responders: { zapier: () => ok('', 500), resend: () => ok('', 500), slack: () => { throw new Error('down'); } } });
  assert.equal(res.status, 200);
  assert.equal(r.blobs.lead('l_test123').delivery.state, 'failed');
});

test('with no alert channel set, a failed delivery is still kept and logged', async () => {
  const { r, res } = await go({ env: { RESEND_API_KEY: undefined, SLACK_ALERT_WEBHOOK_URL: undefined }, responders: { zapier: () => ok('', 500) } });
  assert.equal(res.status, 200);
  assert.equal(r.of('resend').length + r.of('slack').length, 0);
  assert.ok(r.logs.some((l) => l.code === 'zap_failed' && l.lead_id === 'l_test123'));
});

test('a Slack address that is not Slack\'s is not posted to', async () => {
  const { r } = await go({ env: { SLACK_ALERT_WEBHOOK_URL: 'https://evil.test/hook' }, responders: { zapier: () => ok('', 500) } });
  assert.equal(r.calls.filter((c) => c.host === 'evil.test').length, 0);
});

/* ------------------------------------------------------------------------------ storage */

test('storage that cannot be opened: the lead is still delivered and the visitor is sent on', async () => {
  const { r, res, j } = await go({ store: () => { throw new Error('no blobs'); } });
  assert.equal(res.status, 200);
  assert.equal(j.route, 'fit');
  assert.equal(r.of('zapier').length, 1);
  assert.ok(r.logs.some((l) => l.code === 'store_unavailable'));
});

test('a lead that cannot be stored but can be delivered is delivered', async () => {
  const r = rig();
  r.blobs.fail = (op, key) => { if (String(key).startsWith('lead/') || String(key).startsWith('by-day/')) throw new Error('storage down'); };
  const res = await r.handler(post(GOOD));
  assert.equal(res.status, 200);
  assert.equal(r.of('zapier').length, 1);
  assert.ok(r.logs.some((l) => l.code === 'store_error'));
});

test('a lead that can be neither stored nor delivered is refused honestly, and the answers stay on screen', async () => {
  const r = rig({ responders: { zapier: () => ok('', 500) } });
  r.blobs.fail = (op, key) => { if (String(key).startsWith('lead/') || String(key).startsWith('by-day/')) throw new Error('storage down'); };
  const json = await r.handler(post(GOOD));
  assert.equal(json.status, 503);
  assert.deepEqual(await bodyOf(json), { ok: false, error: 'unavailable' });
  assert.ok(r.logs.some((l) => l.code === 'lost_lead_refused'));
  assert.match(r.of('resend')[0].body.text, /could NOT be stored/);

  const html = await r.handler(post(Object.assign({}, GOOD, { lead_id: 'l_second' }), { asJson: false }));
  assert.equal(html.status, 503);
  const text = await html.text();
  assert.match(text, /Something went wrong on our side\. Your answers are still here\./);
  assert.match(text, /value="Northbridge IT Limited"/);
});

test('a lead that cannot be read back is treated as new', async () => {
  const r = rig();
  r.blobs.fail = (op, key) => { if (op === 'get' && String(key) === 'lead/l_test123') throw new Error('read failed'); };
  const res = await r.handler(post(GOOD));
  assert.equal(res.status, 200);
  assert.ok(r.logs.some((l) => l.code === 'read_error'));
});

test('anything unexpected is a 500 that says nothing about what happened', async () => {
  const { res, j } = await go({ store: () => ({ rateHit: async () => { throw new RangeError('boom'); }, getLead: async () => { throw new RangeError('boom'); } }) });
  assert.equal(res.status, 200, 'the failures the handler expects are absorbed');
  assert.equal(j.ok, true);
  const bad = rig({ uuid: () => { throw new Error('not expected'); } });
  const out = await bad.handler(post(Object.assign({}, GOOD, { lead_id: '' })));
  assert.equal(out.status, 500);
  assert.deepEqual(await bodyOf(out), { ok: false, error: 'unavailable' });
  assert.ok(bad.logs.some((l) => l.code === 'unhandled'));
  assert.equal(JSON.stringify(bad.logs).includes('not expected'), false, 'the message is not logged, only the kind of error');
});

/* ------------------------------------------------------------------------- Companies House */

test('the register is asked with the key as the user name and an empty password', async () => {
  const { r } = await go();
  const [search, profile] = r.of('ch');
  assert.equal(search.headers.Authorization, 'Basic ' + Buffer.from('ch-test-key:').toString('base64'));
  assert.match(search.url, /\/search\/companies\?q=Northbridge%20IT%20Limited&items_per_page=20$/);
  assert.match(profile.url, /\/company\/01234567$/);
});

test('register check switched on but no key: every lead goes to review, never to fit', async () => {
  const { r, j } = await go({ registerCheck: true, env: { COMPANIES_HOUSE_API_KEY: undefined } });
  assert.equal(j.route, 'review');
  assert.equal(r.of('ch').length, 0);
  assert.deepEqual(r.of('zapier')[0].body.route_reason, 'ch_timeout');
  assert.ok(r.logs.some((l) => l.code === 'ch_unavailable' && l.reason === 'no_key'));
});

test('no register check (legal.registerCheck false): a firm whose answers qualify is a fit, marked unchecked, and Meta is told', async () => {
  const { r, j } = await go({ env: { COMPANIES_HOUSE_API_KEY: undefined, META_CAPI_TOKEN: 'tok' } });
  assert.equal(j.route, 'fit');
  assert.equal(r.of('ch').length, 0, 'the register is not asked');
  const z = r.of('zapier')[0].body;
  assert.equal(z.ch_check, 'unchecked', 'never reported as ok');
  assert.equal(z.route_reason, 'turnover_2m_plus, trading_2y_plus, register_not_used');
  assert.deepEqual(r.blobs.lead('l_test123').ch, { check: 'unchecked', reasons: [] });
  assert.equal(r.logs.some((l) => l.code === 'ch_unavailable'), false);
});

test('no register check: the self-reported rules still apply (review, not now, not a fit)', async () => {
  const env = { COMPANIES_HOUSE_API_KEY: undefined };
  assert.equal((await go({ env }, Object.assign({}, GOOD, { turnover_band: T[1] }))).j.route, 'not_a_fit');
  assert.equal((await go({ env }, Object.assign({}, GOOD, { capacity: C[0] }))).j.route, 'not_now');
  assert.equal((await go({ env }, Object.assign({}, GOOD, { first_year_value: W[1] }))).j.route, 'review');
  assert.equal((await go({ env }, Object.assign({}, GOOD, { turnover_band: T[5] }))).j.route, 'review');
});

test('a company that is not in the register goes to review', async () => {
  const none = () => ok({ items: [{ title: 'SOMETHING ELSE LIMITED', company_number: '999', company_status: 'active' }] });
  const { r, j } = await go({ responders: { ch: none } });
  assert.equal(j.route, 'review');
  assert.equal(r.of('zapier')[0].body.route_reason, 'ch_not_found');
  assert.equal(r.of('zapier')[0].body.company_number, '');
});

test('a similar name is not the same company: only an exact name matches', async () => {
  const similar = () => ok({ items: [{ title: 'NORTHBRIDGE IT SERVICES LIMITED', company_number: '999', company_status: 'active' }, { title: 'NORTHBRIDGE', company_number: '998', company_status: 'active' }] });
  const { r, j } = await go({ responders: { ch: similar } });
  assert.equal(j.route, 'review');
  assert.equal(r.of('ch').length, 1, 'no profile was fetched for a company that is not this one');
});

test('case, punctuation, "Ltd" and "the" do not stop a name from matching', async () => {
  const { r, j } = await go({}, Object.assign({}, GOOD, { company_name: 'the Northbridge I.T. ltd.' }));
  assert.equal(j.route, 'review', 'I.T. is not IT: two words, no match');
  const ok2 = await go({}, Object.assign({}, GOOD, { company_name: 'THE NORTHBRIDGE  IT  LTD' }));
  assert.equal(ok2.j.route, 'fit');
  assert.ok(r);
});

test('when two companies share a name, the active one is used', async () => {
  const two = (call) => {
    const u = new URL(call.url);
    if (u.pathname === '/search/companies') {
      return ok({ items: [
        { title: 'NORTHBRIDGE IT LIMITED', company_number: '111', company_status: 'dissolved' },
        { title: 'NORTHBRIDGE IT LIMITED', company_number: '222', company_status: 'active' },
      ] });
    }
    return ok(Object.assign({}, CH_PROFILE, { company_number: u.pathname.split('/').pop() }));
  };
  const { r } = await go({ responders: { ch: two } });
  assert.match(r.of('ch')[1].url, /\/company\/222$/);
  assert.equal(r.of('zapier')[0].body.company_number, '222');
});

test('the register failing or timing out goes to review and is logged without personal data', async () => {
  const cases = {
    search_500: () => ok('', 500),
    profile_404: (call) => (new URL(call.url).pathname === '/search/companies' ? chResponder()(call) : ok('', 404)),
    network: () => { throw new TypeError('fetch failed'); },
    timeout: () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; },
  };
  for (const [reason, ch] of Object.entries(cases)) {
    const { r, j } = await go({ responders: { ch } });
    assert.equal(j.route, 'review', reason);
    assert.equal(r.of('zapier')[0].body.route_reason, 'ch_timeout', reason);
    assert.equal(r.of('zapier')[0].body.ch_check, 'timeout', reason);
    assert.ok(r.logs.some((l) => l.code === 'ch_unavailable' && l.reason === reason), reason);
  }
});

test('an answer the register contradicts goes to review, with the reason a person needs', async () => {
  const profile = (over) => chResponder(Object.assign({}, CH_PROFILE, over));
  const younger = await go({ responders: { ch: profile({ date_of_creation: '2025-06-01' }) } });
  assert.equal(younger.j.route, 'review');
  assert.equal(younger.r.of('zapier')[0].body.route_reason, 'ch_younger_than_claimed');
  const inactive = await go({ responders: { ch: profile({ company_status: 'dissolved' }) } });
  assert.equal(inactive.r.of('zapier')[0].body.route_reason, 'ch_not_active');
  const noAccounts = await go({ responders: { ch: profile({ accounts: {} }) } });
  assert.equal(noAccounts.r.of('zapier')[0].body.route_reason, 'ch_no_accounts');
  assert.equal(noAccounts.r.of('zapier')[0].body.ch_check, 'mismatch');
});

test('DISCLOSED DEVIATION: £2m or more claimed against micro-entity accounts is review, not not-a-fit', async () => {
  for (const type of ['micro-entity', 'dormant']) {
    const { j, r } = await go({ responders: { ch: chResponder(Object.assign({}, CH_PROFILE, { accounts: { last_accounts: { type } } })) } });
    assert.equal(j.route, 'review', type);
    assert.equal(r.of('zapier')[0].body.route_reason, 'ch_accounts_too_small');
  }
});

/* ------------------------------------------------------- the register switched off (preview only) */

const PREVIEW = 'https://deploy-preview-72--luxury-custard-0c4db9.netlify.app/api/lead';
const OFF = { COMPANIES_HOUSE_MODE: 'off' };

test('register off on a deploy preview: the register is not asked, a firm that qualifies is a fit, and the record says it was not checked', async () => {
  const { r, j } = await go({ registerCheck: true, env: Object.assign({ COMPANIES_HOUSE_API_KEY: undefined }, OFF) }, GOOD, { url: PREVIEW });
  assert.equal(j.route, 'fit');
  assert.equal(r.of('ch').length, 0);
  const z = r.of('zapier')[0].body;
  assert.equal(z.ch_check, 'off', 'never reported as ok');
  assert.equal(z.route_reason, 'turnover_2m_plus, trading_2y_plus, register_off');
  assert.equal(z.company_number, '');
  assert.deepEqual(r.blobs.lead('l_test123').ch, { check: 'off', reasons: [] });
  assert.ok(r.logs.some((l) => l.code === 'ch_switched_off' && l.lead_id === 'l_test123'));
  assert.equal(r.logs.some((l) => l.code === 'ch_unavailable'), false);
  assert.equal(JSON.stringify(r.logs).includes('Northbridge'), false, 'the log carries no company name');
});

test('register off wins over a key that is present: the setting is explicit', async () => {
  const { r, j } = await go({ env: OFF }, GOOD, { url: PREVIEW });
  assert.equal(j.route, 'fit');
  assert.equal(r.of('ch').length, 0);
});

test('register off is ignored on every address a real visitor can reach', async () => {
  const live = [
    'https://getelevateleads.com/api/lead',
    'https://www.getelevateleads.com/api/lead',
    'https://it.getelevateleads.com/api/lead',
    'https://luxury-custard-0c4db9.netlify.app/api/lead',
    'https://netlify.app/api/lead',
    'https://evil.example/deploy-preview-1--x.netlify.app/api/lead',
    'https://deploy-preview-1--x.netlify.app.evil.example/api/lead',
    'https://x-deploy-preview-1--x.netlify.app.getelevateleads.com/api/lead',
  ];
  for (const url of live) {
    const { r, j } = await go({ registerCheck: true, env: Object.assign({ COMPANIES_HOUSE_API_KEY: undefined }, OFF) }, GOOD, { url });
    assert.equal(j.route, 'review', url);
    assert.equal(r.of('zapier')[0].body.ch_check, 'timeout', url);
    assert.equal(r.logs.some((l) => l.code === 'ch_switched_off'), false, url);
  }
  // with a key, the live address asks the register as before
  const keyed = await go({ env: OFF });
  assert.equal(keyed.j.route, 'fit');
  assert.ok(keyed.r.of('ch').length > 0, 'the register was asked');
  assert.equal(keyed.r.of('zapier')[0].body.ch_check, 'ok');
});

test('register off is ignored when Netlify says the context is production, whatever the address', async () => {
  for (const CONTEXT of ['production', 'Production', ' production ']) {
    const { r, j } = await go({ registerCheck: true, env: Object.assign({ COMPANIES_HOUSE_API_KEY: undefined, CONTEXT }, OFF) }, GOOD, { url: PREVIEW });
    assert.equal(j.route, 'review', CONTEXT);
    assert.equal(r.of('zapier')[0].body.ch_check, 'timeout', CONTEXT);
  }
  const preview = await go({ env: Object.assign({ CONTEXT: 'deploy-preview' }, OFF) }, GOOD, { url: PREVIEW });
  assert.equal(preview.j.route, 'fit', 'a preview context does not get in the way');
});

test('only the value "off" switches the register off, in any case and with spaces round it', async () => {
  for (const value of ['on', 'false', '0', 'no', '', 'offline', 'of']) {
    const { j } = await go({ registerCheck: true, env: { COMPANIES_HOUSE_API_KEY: undefined, COMPANIES_HOUSE_MODE: value } }, GOOD, { url: PREVIEW });
    assert.equal(j.route, 'review', JSON.stringify(value));
  }
  for (const value of ['off', 'OFF', ' Off ']) {
    const { j } = await go({ env: { COMPANIES_HOUSE_MODE: value } }, GOOD, { url: PREVIEW });
    assert.equal(j.route, 'fit', JSON.stringify(value));
  }
});

test('register off works on a branch deploy and on this computer', async () => {
  for (const url of [
    'https://preview-uk-it-growth--luxury-custard-0c4db9.netlify.app/api/lead',
    'http://localhost:8888/api/lead',
    'http://127.0.0.1:8888/api/lead',
  ]) {
    const { r, j } = await go({ env: OFF }, GOOD, { url });
    assert.equal(j.route, 'fit', url);
    assert.equal(r.of('ch').length, 0, url);
  }
});

test('register off changes nothing the answers already decide, and marks the review reasons it touches', async () => {
  const small = await go({ env: OFF }, Object.assign({}, GOOD, { turnover_band: T[0] }), { url: PREVIEW });
  assert.equal(small.j.route, 'not_a_fit');
  assert.equal(small.r.of('zapier')[0].body.route_reason, 'turnover_below_2m');
  const full = await go({ env: OFF }, Object.assign({}, GOOD, { capacity: C[0] }), { url: PREVIEW });
  assert.equal(full.j.route, 'not_now');
  assert.equal(full.r.of('zapier')[0].body.route_reason, 'capacity_none');
  const notStated = await go({ env: OFF }, Object.assign({}, GOOD, { turnover_band: T[5] }), { url: PREVIEW });
  assert.equal(notStated.j.route, 'review');
  assert.equal(notStated.r.of('zapier')[0].body.route_reason, 'turnover_not_stated, register_off');
  assert.equal(notStated.r.of('ch').length, 0);
});

test('with the register off Meta is not told the form is qualified, unless the events go to Test Events', async () => {
  const held = await go({ env: OFF }, GOOD, { url: PREVIEW });
  assert.equal(held.j.route, 'fit');
  assert.equal(held.r.of('capi').length, 0);
  assert.deepEqual(held.r.blobs.lead('l_test123').capi, { state: 'skipped', reason: 'register_off' });
  const withCode = await go({ env: Object.assign({ META_TEST_EVENT_CODE: 'TEST123' }, OFF) }, GOOD, { url: PREVIEW });
  assert.equal(withCode.r.of('capi').length, 1);
  assert.equal(withCode.r.of('capi')[0].body.test_event_code, 'TEST123');
  const declined = await go({ env: Object.assign({ META_TEST_EVENT_CODE: 'TEST123' }, OFF) }, Object.assign({}, GOOD, { consent: 'declined' }), { url: PREVIEW });
  assert.equal(declined.r.of('capi').length, 0, 'a visitor who declined is never told to Meta');
});

/* ---------------------------------------------------------------------------------- Meta */

test('Meta is told once, with the lead id as the event id and nothing readable about the person', async () => {
  const { r } = await go();
  const [c] = r.of('capi');
  assert.equal(c.url, `https://graph.facebook.com/v21.0/${cfg.funnel.pixelId}/events`);
  const ev = c.body.data[0];
  assert.equal(ev.event_name, 'QualifiedForm');
  assert.equal(ev.event_id, 'l_test123');
  assert.equal(ev.action_source, 'website');
  assert.equal(ev.event_source_url, 'https://getelevateleads.com/g/uk-it-growth/');
  assert.equal(ev.event_time, Math.floor(NOW.getTime() / 1000));
  assert.deepEqual(ev.custom_data, { route: 'fit', campaign: 'uk-it-growth' });
  assert.deepEqual(ev.user_data.em, [sha256('alex@northbridge-it.co.uk')]);
  assert.deepEqual(ev.user_data.fn, [sha256('alex')]);
  assert.deepEqual(ev.user_data.ln, [sha256('morgan')]);
  assert.equal(ev.user_data.client_ip_address, '203.0.113.7');
  assert.equal(ev.user_data.client_user_agent, 'node-test/1.0');
  assert.equal(ev.user_data.fbp, GOOD.fbp);
  assert.equal(ev.user_data.fbc, `fb.1.${NOW.getTime()}.FB1`, 'built from fbclid when there is no cookie');
  assert.equal(c.body.access_token, 'capi-test-token');
  assert.equal('test_event_code' in c.body, false);
  const raw = c.init.body;
  for (const secret of ['alex@northbridge', 'Morgan', '"Alex"', '07700', 'Northbridge']) assert.equal(raw.includes(secret), false, secret);
});

test('the real browser cookie value wins over one built from fbclid', async () => {
  const { r } = await go({}, Object.assign({}, GOOD, { fbc: 'fb.1.1699999999999.REALCLICK' }));
  assert.equal(r.of('capi')[0].body.data[0].user_data.fbc, 'fb.1.1699999999999.REALCLICK');
});

test('a test event code is added only when one is set', async () => {
  const { r } = await go({ env: { META_TEST_EVENT_CODE: 'TEST123' } });
  assert.equal(r.of('capi')[0].body.test_event_code, 'TEST123');
});

test('Meta is told only for a qualified route AND an accepted choice', async () => {
  const routes = {
    fit: {},
    review: { turnover_band: T[5] },
    not_now: { capacity: C[0] },
    not_a_fit: { turnover_band: T[0] },
  };
  for (const [route, over] of Object.entries(routes)) {
    for (const consent of ['accepted', 'declined', 'unset', undefined, 'maybe']) {
      const { r, j } = await go({}, Object.assign({}, GOOD, over, { consent, lead_id: `l_${route}_${consent}` }));
      assert.equal(j.route, route);
      const expected = (route === 'fit' || route === 'review') && consent === 'accepted' ? 1 : 0;
      assert.equal(r.of('capi').length, expected, `${route} / ${consent}`);
    }
  }
});

test('without the token Meta needs, nothing is sent and the lead is not held up', async () => {
  const { r, res } = await go({ env: { META_CAPI_TOKEN: undefined } });
  assert.equal(res.status, 200);
  assert.equal(r.of('capi').length, 0);
  assert.deepEqual(r.blobs.lead('l_test123').capi, { state: 'skipped', reason: 'not_configured' });
});

test('the token alone is enough: the event goes to the same pixel the page loads', async () => {
  const { r, res } = await go({ env: { META_PIXEL_ID: undefined } });
  assert.equal(res.status, 200);
  assert.equal(r.of('capi').length, 1);
  assert.equal(new URL(r.of('capi')[0].url).pathname, `/v21.0/${cfg.funnel.pixelId}/events`);
  assert.equal(r.blobs.lead('l_test123').capi.state, 'ok');
});

test('META_PIXEL_ID, when set, overrides the page pixel (testing only)', async () => {
  const { r } = await go({ env: { META_PIXEL_ID: '999000111' } });
  assert.equal(new URL(r.of('capi')[0].url).pathname, '/v21.0/999000111/events');
});

test('Meta failing never changes the answer, and is recorded', async () => {
  for (const [capi, reason] of [[() => ok('', 400), 'http_400'], [() => { throw new TypeError('x'); }, 'network'], [() => { const e = new Error('a'); e.name = 'AbortError'; throw e; }, 'timeout']]) {
    const { r, res, j } = await go({ responders: { capi } });
    assert.equal(res.status, 200);
    assert.equal(j.route, 'fit');
    assert.deepEqual(r.blobs.lead('l_test123').capi, { state: 'failed', reason });
    assert.ok(r.logs.some((l) => l.code === 'capi_failed' && l.reason === reason));
  }
});

test('Meta is sent in the same moment as Zapier, not after it', async () => {
  const order = [];
  const { r } = await go({ responders: {
    zapier: async () => { order.push('zapier:start'); await new Promise((s) => setTimeout(s, 20)); order.push('zapier:end'); return ok('ok'); },
    capi: async () => { order.push('capi'); return ok({}); },
  } });
  assert.deepEqual(order, ['zapier:start', 'capi', 'zapier:end']);
  assert.ok(r);
});

/* --------------------------------------------------------------- advertising identifiers and consent */

test('without an accepted choice the advertising identifiers are neither kept, sent on, nor carried to the next page', async () => {
  for (const consent of ['declined', 'unset', undefined]) {
    const { r, j } = await go({}, Object.assign({}, GOOD, { consent, lead_id: 'l_c_' + consent }));
    assert.equal(/fbclid|fbp|fbc/.test(j.next), false, 'next: ' + consent);
    assert.equal(r.of('zapier')[0].body.fbclid, '', 'payload: ' + consent);
    const rec = r.blobs.lead('l_c_' + consent);
    assert.equal(rec.tracking.fbclid, '');
    assert.equal(rec.consent, consent === 'declined' ? 'declined' : 'unset');
    assert.equal(JSON.stringify(rec).includes('FB1'), false);
    assert.equal(JSON.stringify(rec).includes(GOOD.fbp), false);
  }
});

test('the campaign parameters (utm) are not advertising identifiers and are kept either way', async () => {
  const { j, r } = await go({}, Object.assign({}, GOOD, { consent: 'declined' }));
  assert.match(j.next, /utm_source=meta&utm_medium=paid&utm_campaign=itq4&utm_content=ad7&utm_term=managed$/);
  assert.equal(r.of('zapier')[0].body.utm_campaign, 'itq4');
});

/* --------------------------------------------------------------------- tracking and redirects */

test('utm and fbclid are recovered from the page that posted when the post carries none', async () => {
  const noTracking = Object.assign({}, GOOD, { utm_source: undefined, utm_medium: undefined, utm_campaign: undefined, utm_content: undefined, utm_term: undefined, fbclid: undefined });
  const { j, r } = await go({}, noTracking, { headers: { Referer: 'https://getelevateleads.com/g/uk-it-growth/?utm_source=meta&utm_campaign=itq4&fbclid=ZZ9' } });
  assert.equal(j.next, '/g/uk-it-growth/book/?lead_id=l_test123&utm_source=meta&utm_campaign=itq4&fbclid=ZZ9');
  assert.equal(r.of('zapier')[0].body.utm_campaign, 'itq4');
});

test('a Referer from some other page is ignored', async () => {
  const noTracking = Object.assign({}, GOOD, { utm_source: undefined, utm_medium: undefined, utm_campaign: undefined, utm_content: undefined, utm_term: undefined, fbclid: undefined });
  const { j } = await go({}, noTracking, { headers: { Referer: 'https://getelevateleads.com/lp/?utm_source=other' } });
  assert.equal(j.next, '/g/uk-it-growth/book/?lead_id=l_test123');
  const bad = await go({}, noTracking, { headers: { Referer: 'not a url' } });
  assert.equal(bad.j.next, '/g/uk-it-growth/book/?lead_id=l_test123');
});

test('the page the visitor is sent to is built here, from values we cleaned: never a location from the visitor', async () => {
  const { j } = await go({}, Object.assign({}, GOOD, { utm_source: 'https://evil.test/&page=x', fbclid: '\r\nLocation: https://evil.test', utm_term: '"><script>' }));
  assert.ok(j.next.startsWith('/g/uk-it-growth/book/?lead_id=l_test123'), j.next);
  assert.equal(/[\r\n]/.test(j.next), false);
  assert.equal(j.next.includes('https://evil.test'), false, 'encoded, not interpreted');
  assert.equal(j.next.includes('<'), false);
  assert.equal(new URL(j.next, 'https://getelevateleads.com').origin, 'https://getelevateleads.com');
  const form = await go({}, Object.assign({}, GOOD, { fbclid: '\r\nLocation: https://evil.test' }), { asJson: false });
  assert.equal(/[\r\n]/.test(form.res.headers.get('location')), false);
});

test('a lead id from the page is kept if it is plain, and replaced if it is not', async () => {
  assert.equal((await go({}, Object.assign({}, GOOD, { lead_id: 'l_Ab-9_z' }))).j.lead_id, 'l_Ab-9_z');
  for (const id of ['', undefined, 'has space', 'semi;colon', '../../etc', 'ä', '<b>']) {
    const { j, r } = await go({}, Object.assign({}, GOOD, { lead_id: id }));
    assert.equal(j.lead_id, 'l_aaaaaaaabbbbccccdddd', JSON.stringify(id));
    assert.ok(r.blobs.lead('l_aaaaaaaabbbbccccdddd'));
  }
  const long = (await go({}, Object.assign({}, GOOD, { lead_id: 'x'.repeat(100) }))).j.lead_id;
  assert.equal(long, 'x'.repeat(64), 'cut, then plain');
});

test('what a visitor typed into the free fields cannot start a new line anywhere', async () => {
  const { r } = await go({}, Object.assign({}, GOOD, { company_name: 'Acme\r\nBcc: x@y.z', job_title: 'CEO\u2028', first_name: 'A\u0000B' }));
  const p = r.of('zapier')[0].body;
  assert.equal(/[\r\n\u0000\u2028]/.test(p.company_name + p.job_title + p.first_name), false);
});

/* -------------------------------------------------------------------------------- the log */

test('the log carries ids, routes and reason codes and no personal data, in any outcome', async () => {
  const runs = [
    await go(),
    await go({ responders: { zapier: () => ok('', 500) } }),
    await go({ responders: { ch: () => ok('', 500) } }),
    await go({ responders: { capi: () => ok('', 400) } }),
    await go({}, Object.assign({}, GOOD, { contact_by_fax: 'x' })),
    await go({ live: false }),
  ];
  for (const { r } of runs) {
    const text = JSON.stringify(r.logs);
    for (const secret of ['alex@', 'Morgan', 'Alex', '07700', 'Managing Director', 'Northbridge', 'northbridge-it.co.uk', '203.0.113.7', 'FB1']) {
      assert.equal(text.includes(secret), false, secret + ' in ' + text);
    }
  }
  const accepted = runs[0].r.logs.find((l) => l.code === 'accepted');
  assert.equal(accepted.lead_id, 'l_test123');
  assert.equal(accepted.route, 'fit');
  assert.equal(accepted.delivery, 'ok');
  assert.equal(typeof accepted.ms, 'number');
});
