// Tests added after the independent review of the funnel: what was found, kept from coming back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { core, cfg, copy, routing, formMod, GOOD, SHELL, post, Q } from './helpers.mjs';
import { createHandler } from '../../../netlify/functions/italy-lead/index.mjs';

const cp = (n) => String.fromCharCode(n); // code points spelled out: an invisible character in a source file is a trap
const TAG = formMod.consentTag(cfg);

function rig(over = {}) {
  const calls = [], logs = [];
  const hook = over.hook || (async () => new Response('ok', { status: 200 }));
  const handler = createHandler({
    cfg: Object.assign({}, cfg, { live: true }),
    copy, routing, shell: SHELL,
    env: () => Object.assign({ ITALY_LEAD_WEBHOOK_URL: 'https://hooks.example.test/catch/1' }, over.env || {}),
    fetch: async (url, init) => { calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null }); return hook(url, init); },
    now: () => new Date('2026-10-14T12:00:00Z'),
    uuid: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    log: (o) => logs.push(o),
  });
  return { handler, calls, logs };
}

test('C1 controls, line and paragraph separators and bidirectional overrides are not text', () => {
  const dirty = 'A' + cp(0x85) + 'B' + cp(0x2028) + 'C' + cp(0x2029) + 'D' + cp(0x202e) + 'E' + cp(0x2066) + 'F' + cp(0x2069) + 'G';
  assert.equal(core.str(dirty), 'A B C D E F G');
  assert.equal(core.str('Società Più è ancora così è'), 'Società Più è ancora così è', 'accented Italian is untouched');
});

test('the form carries a consent_version field, and a re-rendered form does too', async () => {
  const html = formMod.renderForm({ copy, config: cfg });
  assert.ok(html.includes(`<input type="hidden" name="consent_version" value="${TAG}">`));
  assert.match(TAG, /^[A-Za-z0-9._-]{1,40}:[a-f0-9]{16}$/);
  const { handler } = rig();
  const again = await (await handler(post(Object.assign({}, GOOD, { details_email: 'x' }), { json: false }))).text();
  assert.ok(again.includes(`name="consent_version" value="${TAG}"`));
});

test('the lead records the consent wording the visitor\'s page showed, and says whether it is still the current one', async () => {
  const { handler, calls } = rig();
  await handler(post(Object.assign({}, GOOD, { consent_version: TAG })));
  assert.equal(calls[0].body.consent.version_shown, TAG);
  assert.equal(calls[0].body.consent.matches_shown, true);
  assert.equal(calls[0].body.consent.version, cfg.consent.version);

  // a tab opened before the wording changed
  await handler(post(Object.assign({}, GOOD, { consent_version: 'v0-old:0123456789abcdef' })));
  assert.equal(calls[1].body.consent.version_shown, 'v0-old:0123456789abcdef');
  assert.equal(calls[1].body.consent.matches_shown, false, 'delivered, and flagged');

  // nothing, or something that is not a tag: recorded as empty, never echoed
  await handler(post(GOOD));
  await handler(post(Object.assign({}, GOOD, { consent_version: '<script>alert(1)</script>' })));
  for (const i of [2, 3]) { assert.equal(calls[i].body.consent.version_shown, ''); assert.equal(calls[i].body.consent.matches_shown, false); }
});

test('a refused delivery logs the HTTP status or the error class, so a wrong token and an outage can be told apart, and nothing personal', async () => {
  for (const [status, expect] of [[401, 401], [404, 404], [500, 500], [429, 429]]) {
    const { handler, logs } = rig({ hook: async () => new Response('no', { status }) });
    await handler(post(GOOD));
    assert.deepEqual(logs[0], { code: 'delivery_rejected', lead_id: 'l_test123', status: expect });
  }
  const net = rig({ hook: async () => { const e = new TypeError('connect ECONNREFUSED hooks.example.test:443 for marco@rossicyber.it'); throw e; } });
  await net.handler(post(GOOD));
  assert.deepEqual(net.logs[0], { code: 'delivery_failed', lead_id: 'l_test123', error: 'TypeError' }, 'the class only, never the message (it can hold a host or an address)');
  const slow = rig({ hook: async () => { const e = new Error('t'); e.name = 'AbortError'; throw e; } });
  await slow.handler(post(GOOD));
  assert.equal(slow.logs[0].code, 'delivery_timeout');
  assert.equal(JSON.stringify([...net.logs, ...slow.logs]).includes('marco'), false);
});

test('the not-live and no-destination refusals log no extra fields', async () => {
  const a = rig({ env: { ITALY_LEAD_WEBHOOK_URL: '' } });
  await a.handler(post(GOOD));
  assert.deepEqual(a.logs[0], { code: 'no_destination', lead_id: 'l_test123' });
});

test('the question ids and their order are the ones the client, the server and the routing all assume', () => {
  assert.deepEqual(Q.map((q) => q.id), ['offers', 'employees', 'source', 'priority', 'budget', 'details']);
  assert.deepEqual(routing.rules.map((r) => Object.keys(r.when)[0]), ['offers', 'employees', 'budget']);
});
