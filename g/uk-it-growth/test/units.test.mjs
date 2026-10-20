import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, fakeBlobs, ok, sha256 } from './helpers.mjs';
import { deliverToZapier } from '../../../netlify/functions/lead/deliver.mjs';
import { sendAlert } from '../../../netlify/functions/lead/alert.mjs';
import { sendQualifiedForm, clickId } from '../../../netlify/functions/lead/capi.mjs';
import { lookup, normaliseName } from '../../../netlify/functions/lead/companies-house.mjs';
import { buildPayload, PAYLOAD_KEYS } from '../../../netlify/functions/lead/payload.mjs';
import { dayOf, hourOf, RETENTION_DAYS } from '../../../netlify/functions/lead/store.mjs';

/* ---------------------------------------------------------------------------- delivery */

const abortable = (init) => new Promise((_, reject) => {
  init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
});

test('delivery: the first answer that is OK ends it', async () => {
  let n = 0;
  const r = await deliverToZapier({ url: 'https://h.test/x', payload: { a: 1 }, fetch: async () => { n++; return ok('ok'); }, sleep: async () => {}, now: () => 0, deadline: 8000 });
  assert.deepEqual(r, { ok: true, attempts: 1, status: 200, error: '' });
  assert.equal(n, 1);
});

test('delivery: the pauses grow, and a failure on the third try is a failure', async () => {
  const waits = [];
  const r = await deliverToZapier({ url: 'https://h.test/x', payload: {}, fetch: async () => ok('', 503), sleep: async (ms) => waits.push(ms), now: () => 0, deadline: 8000 });
  assert.equal(r.ok, false);
  assert.equal(r.attempts, 3);
  assert.equal(r.error, 'http_503');
  assert.deepEqual(waits, [300, 800]);
});

test('delivery: the body is the payload as JSON, and a redirect is never followed', async () => {
  let seen;
  await deliverToZapier({ url: 'https://h.test/x', payload: { lead_id: 'l_1' }, fetch: async (u, init) => { seen = init; return ok('ok'); }, sleep: async () => {}, now: () => 0, deadline: 8000 });
  assert.equal(seen.method, 'POST');
  assert.equal(seen.body, '{"lead_id":"l_1"}');
  assert.equal(seen.redirect, 'manual');
  assert.equal(seen.headers['Content-Type'], 'application/json');
});

test('delivery: no attempt is started that cannot finish inside the time that is left', async () => {
  let n = 0;
  const fetch = async () => { n++; return ok('', 500); };
  // 500 ms left: one attempt is allowed, and no second one fits behind the pause
  const a = await deliverToZapier({ url: 'https://h.test/x', payload: {}, fetch, sleep: async () => {}, now: () => 0, deadline: 500 });
  assert.equal(a.attempts, 1);
  // under 300 ms left: not even the first
  const b = await deliverToZapier({ url: 'https://h.test/x', payload: {}, fetch, sleep: async () => {}, now: () => 0, deadline: 200 });
  assert.deepEqual(b, { ok: false, attempts: 0, error: 'not_attempted' });
  assert.equal(n, 1);
});

test('delivery: an attempt that hangs is cut off and reported as a timeout', async () => {
  const r = await deliverToZapier({ url: 'https://h.test/x', payload: {}, fetch: (u, init) => abortable(init), sleep: async () => {}, now: () => 0, deadline: 8000, attempts: 1, attemptTimeoutMs: 20 });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'timeout');
});

test('delivery: only a hook that is wrong is not tried again', async () => {
  for (const [status, tries] of [[400, 1], [401, 1], [404, 1], [410, 1], [302, 1], [429, 3], [500, 3], [502, 3], [504, 3]]) {
    let n = 0;
    await deliverToZapier({ url: 'https://h.test/x', payload: {}, fetch: async () => { n++; return ok('', status); }, sleep: async () => {}, now: () => 0, deadline: 8000 });
    assert.equal(n, tries, String(status));
  }
});

/* -------------------------------------------------------------------------------- store */

const REC = (id, at = '2026-10-19T09:00:00.000Z') => ({ v: 1, lead_id: id, campaign: 'uk-it-growth', received_at: at, route: 'fit' });

test('store: a lead is created once; the second time says so and changes nothing', async () => {
  const blobs = fakeBlobs();
  const s = createStore({ blobs });
  assert.deepEqual(await s.createLead(REC('l_1')), { created: true });
  assert.deepEqual(await s.createLead(Object.assign(REC('l_1'), { route: 'review' })), { created: false });
  assert.equal((await s.getLead('l_1')).route, 'fit');
  assert.equal(await s.getLead('l_missing'), null);
});

test('store: the daily index lists a day\'s leads', async () => {
  const s = createStore({ blobs: fakeBlobs() });
  await s.createLead(REC('l_a'));
  await s.createLead(REC('l_b'));
  await s.createLead(REC('l_c', '2026-10-18T23:59:59.000Z'));
  assert.deepEqual((await s.listDay('2026-10-19')).sort(), ['l_a', 'l_b']);
  assert.deepEqual(await s.listDay('2026-10-18'), ['l_c']);
  assert.deepEqual(await s.listDay('2026-10-17'), []);
});

test('store: a lead is stored even when its index entry cannot be written', async () => {
  const blobs = fakeBlobs();
  blobs.fail = (op, key) => { if (String(key).startsWith('by-day/')) throw new Error('index down'); };
  const s = createStore({ blobs });
  assert.deepEqual(await s.createLead(REC('l_1')), { created: true });
  assert.ok(blobs.lead('l_1'));
});

test('store: saveLead replaces the lead', async () => {
  const s = createStore({ blobs: fakeBlobs() });
  await s.createLead(REC('l_1'));
  await s.saveLead(Object.assign(REC('l_1'), { delivery: { state: 'ok' } }));
  assert.equal((await s.getLead('l_1')).delivery.state, 'ok');
});

test('store: the hourly counter counts, stops at the limit, and keeps hours and addresses apart', async () => {
  const s = createStore({ blobs: fakeBlobs() });
  for (let i = 0; i < 3; i++) assert.equal(await s.rateHit({ ipHash: 'aa', hour: '2026101909', limit: 3 }), true);
  assert.equal(await s.rateHit({ ipHash: 'aa', hour: '2026101909', limit: 3 }), false);
  assert.equal(await s.rateHit({ ipHash: 'bb', hour: '2026101909', limit: 3 }), true);
  assert.equal(await s.rateHit({ ipHash: 'aa', hour: '2026101910', limit: 3 }), true);
});

test('store: the day and the hour are read in UTC', () => {
  assert.equal(dayOf(new Date('2026-10-19T23:30:00-02:00')), '2026-10-20');
  assert.equal(hourOf(new Date('2026-10-19T09:59:59Z')), '2026101909');
});

test('store: sweeping removes old counters and leads past retention, and nothing else', async () => {
  const blobs = fakeBlobs();
  const s = createStore({ blobs });
  const now = new Date('2026-10-19T09:30:00Z');
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();
  await s.createLead(REC('l_old', daysAgo(RETENTION_DAYS + 5)));
  await s.createLead(REC('l_edge', daysAgo(RETENTION_DAYS)));
  await s.createLead(REC('l_new', daysAgo(2)));
  await s.rateHit({ ipHash: 'aa', hour: '2026101908', limit: 12 });
  await s.rateHit({ ipHash: 'aa', hour: '2026101909', limit: 12 });
  const removed = await s.sweep({ now });
  assert.equal(removed, 1);
  assert.equal(blobs.lead('l_old'), null);
  assert.ok(blobs.lead('l_edge'), 'exactly at the limit is kept until tomorrow');
  assert.ok(blobs.lead('l_new'));
  assert.equal(blobs.m.has('by-day/' + dayOf(new Date(daysAgo(RETENTION_DAYS + 5))) + '/l_old'), false, 'and its index entry goes with it');
  assert.equal([...blobs.m.keys()].filter((k) => k.startsWith('rl/')).length, 1, 'the earlier hour is gone, this hour stays');
  assert.equal(RETENTION_DAYS, 365);
});

/* -------------------------------------------------------------------------------- alert */

test('alert: each channel is optional and the other is unaffected', async () => {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), headers: init.headers }); return ok('ok'); };
  const none = await sendAlert({ env: {}, fetch, subject: 's', text: 't' });
  assert.deepEqual(none, { email: 'skipped', slack: 'skipped' });
  assert.equal(calls.length, 0);

  const mail = await sendAlert({ env: { RESEND_API_KEY: 'k', ALERT_EMAIL_FROM: 'a@x.test' }, fetch, subject: 's', text: 't' });
  assert.deepEqual(mail, { email: 'ok', slack: 'skipped' });
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.deepEqual(calls[0].body, { from: 'a@x.test', to: ['post@elevatemarketing.no'], subject: 's', text: 't' });

  const half = await sendAlert({ env: { RESEND_API_KEY: 'k' }, fetch, subject: 's', text: 't' });
  assert.equal(half.email, 'skipped', 'a key with no sender address is not enough');

  const both = await sendAlert({ env: { RESEND_API_KEY: 'k', ALERT_EMAIL_FROM: 'a@x.test', ALERT_EMAIL_TO: 'b@x.test', SLACK_ALERT_WEBHOOK_URL: 'https://hooks.slack.com/services/T/B/x' }, fetch, subject: 'S', text: 'T' });
  assert.deepEqual(both, { email: 'ok', slack: 'ok' });
  assert.deepEqual(calls.filter((c) => c.url.includes('resend')).pop().body.to, ['b@x.test']);
  assert.equal(calls.filter((c) => c.url.includes('slack')).pop().body.text, '*S*\nT');
});

test('alert: a failing channel is reported, not thrown, and does not stop the other', async () => {
  const env = { RESEND_API_KEY: 'k', ALERT_EMAIL_FROM: 'a@x.test', SLACK_ALERT_WEBHOOK_URL: 'https://hooks.slack.com/services/T/B/x' };
  const r = await sendAlert({ env, fetch: async (u) => { if (u.includes('resend')) throw new Error('down'); return ok('ok'); }, subject: 's', text: 't' });
  assert.deepEqual(r, { email: 'failed', slack: 'ok' });
  const slow = await sendAlert({ env, fetch: (u, init) => abortable(init), subject: 's', text: 't', timeoutMs: 20 });
  assert.deepEqual(slow, { email: 'failed', slack: 'failed' });
});

/* ---------------------------------------------------------------------------------- Meta */

test('meta: a click id is the browser\'s own, or built from fbclid in the documented form', () => {
  assert.equal(clickId('fb.1.1.REAL', 'X', 5), 'fb.1.1.REAL');
  assert.equal(clickId('', 'ABC', 1700000000000), 'fb.1.1700000000000.ABC');
  assert.equal(clickId('', '', 5), '');
  assert.equal(clickId('', 'x'.repeat(500), 1).length <= 'fb.1.1.'.length + 180, true);
});

test('meta: only what is known is sent, hashed the way Meta asks (trimmed, lower case, SHA-256)', async () => {
  let body;
  const r = await sendQualifiedForm({
    env: { META_CAPI_TOKEN: 't', META_PIXEL_ID: '123' }, fetch: async (u, init) => { body = JSON.parse(init.body); return ok({}); },
    nowMs: 1700000000000, eventName: 'QualifiedForm', leadId: 'l_1', route: 'fit', campaign: 'c', sourceUrl: 'https://x.test/',
    email: '  Alex@Example.COM ', firstName: '', lastName: '', ip: '', userAgent: '', fbp: '', fbc: '', fbclid: '',
  });
  assert.deepEqual(r, { state: 'ok' });
  assert.deepEqual(body.data[0].user_data, { em: [sha256('alex@example.com')] });
});

test('meta: not configured is a skip, not an error', async () => {
  let n = 0;
  const base = { fetch: async () => { n++; return ok({}); }, nowMs: 1, eventName: 'E', leadId: 'l', route: 'fit', campaign: 'c', sourceUrl: 'https://x.test/' };
  assert.deepEqual(await sendQualifiedForm(Object.assign({ env: {} }, base)), { state: 'skipped', reason: 'not_configured' });
  assert.deepEqual(await sendQualifiedForm(Object.assign({ env: { META_CAPI_TOKEN: 't' } }, base)), { state: 'skipped', reason: 'not_configured' });
  assert.equal(n, 0);
});

test('meta: a slow answer is cut off and reported', async () => {
  const r = await sendQualifiedForm({
    env: { META_CAPI_TOKEN: 't', META_PIXEL_ID: '1' }, fetch: (u, init) => abortable(init), timeoutMs: 20,
    nowMs: 1, eventName: 'E', leadId: 'l', route: 'fit', campaign: 'c', sourceUrl: 'https://x.test/',
  });
  assert.deepEqual(r, { state: 'failed', reason: 'timeout' });
});

/* -------------------------------------------------------------------------- Companies House */

test('register: names are compared without case, punctuation, accents, "&", "the" or the company-type words', () => {
  assert.equal(normaliseName('The Northbridge IT Limited'), 'northbridge it');
  assert.equal(normaliseName('NORTHBRIDGE I.T. LTD.'), 'northbridge i t');
  assert.equal(normaliseName('Smith & Sons Ltd'), normaliseName('SMITH AND SONS LIMITED'));
  assert.equal(normaliseName('Café Dév PLC'), 'cafe dev');
  assert.equal(normaliseName('Acme LLP'), 'acme');
  assert.equal(normaliseName(''), '');
  assert.equal(normaliseName(null), '');
  assert.equal(normaliseName('Limited'), '');
});

test('register: a name that normalises to nothing is not looked up', async () => {
  let n = 0;
  const r = await lookup({ name: 'Limited', key: 'k', fetch: async () => { n++; return ok({}); } });
  assert.deepEqual(r, { status: 'not_found' });
  assert.equal(n, 0);
});

test('register: no key is an error the caller treats as "could not ask"', async () => {
  assert.deepEqual(await lookup({ name: 'Acme Ltd', key: '', fetch: async () => ok({}) }), { status: 'error', reason: 'no_key' });
});

test('register: the profile is cut down to the five things the rules use', async () => {
  const fetch = async (u) => (u.includes('/search/')
    ? ok({ items: [{ title: 'ACME LIMITED', company_number: '00112233', company_status: 'active' }] })
    : ok({ company_number: '00112233', company_name: 'ACME LIMITED', company_status: 'active', date_of_creation: '2001-02-03', accounts: { last_accounts: { type: 'null' } }, officers_link: '/x', registered_office_address: { postal_code: 'AB1' } }));
  const r = await lookup({ name: 'Acme Ltd', key: 'k', fetch });
  assert.deepEqual(r, { status: 'found', profile: { number: '00112233', name: 'ACME LIMITED', status: 'active', created: '2001-02-03', accounts_type: '' } });
});

/* ---------------------------------------------------------------------------------- payload */

test('payload: every key is present, empty when it does not apply, and nothing else is ever added', () => {
  const p = buildPayload({ leadId: 'l_1', campaign: 'c', route: 'fit', reasons: ['a', 'b'], submittedAt: 'T', values: {}, ch: null, tracking: null });
  assert.deepEqual(Object.keys(p), PAYLOAD_KEYS);
  assert.equal(p.route_reason, 'a, b');
  for (const k of PAYLOAD_KEYS) if (!['lead_id', 'campaign', 'route', 'route_reason', 'submitted_at'].includes(k)) assert.equal(p[k], '', k);
});

test('payload: browser identifiers and the consent state never go to Zapier', () => {
  const p = buildPayload({
    leadId: 'l', campaign: 'c', route: 'fit', reasons: [], submittedAt: 'T', values: { company_name: 'X' }, ch: null,
    tracking: { fbclid: 'F', fbp: 'P', fbc: 'C', consent: 'accepted', utm_source: 'm', ip: '1.2.3.4' },
  });
  assert.equal(JSON.stringify(p).includes('"P"'), false);
  assert.equal(JSON.stringify(p).includes('1.2.3.4'), false);
  assert.equal('consent' in p, false);
  assert.equal(p.fbclid, 'F');
  assert.equal(p.utm_source, 'm');
});

test('payload: the key list is the contract with the Zap, and changing it is deliberate', () => {
  assert.equal(PAYLOAD_KEYS.length, 41); // 37 at launch, plus the four health keys added 20 Oct 2026
  assert.deepEqual(PAYLOAD_KEYS.slice(0, 5), ['lead_id', 'campaign', 'route', 'route_reason', 'submitted_at']);
  assert.equal(new Set(PAYLOAD_KEYS).size, PAYLOAD_KEYS.length, 'no key twice');
});
