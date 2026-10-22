// POST /api/lead-interest: the quote request button on the "not the right fit" pages.
// Run with: npm run test:g-growth
import test from 'node:test';
import assert from 'node:assert/strict';
import { rig, post, bodyOf, GOOD, OPTIONS, ok, HOOK } from './helpers.mjs';
import { createInterestHandler, NOTICE } from '../../../netlify/functions/lead/interest.mjs';
import { createStore } from '../../../netlify/functions/lead/store.mjs';

const T = OPTIONS.turnover;
const TOO_SMALL = Object.assign({}, GOOD, { lead_id: 'l_small0001', turnover_band: T[0] });

/** A rig that has already taken one application, plus an interest handler on the same storage and fakes. */
async function world(fields = TOO_SMALL, over = {}) {
  const r = rig(over);
  const res = await r.handler(post(fields));
  const lead = await bodyOf(res);
  const handler = createInterestHandler({
    campaigns: r.campaigns, env: () => r.env, fetch: r.fetch, now: r.now, sleep: async () => {},
    log: (o) => r.logs.push(o), store: () => createStore({ blobs: r.blobs }),
  });
  const press = (body, opts = {}) => handler(new Request('https://getelevateleads.com/api/lead-interest', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json', 'x-nf-client-connection-ip': '203.0.113.50' }, opts.headers || {}),
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
  return { r, lead, handler, press, zapCalls: () => r.of('zapier') };
}

test('a lead routed not_a_fit can ask for a quote: stored first, then sent to Zapier as the lead plus the event', async () => {
  const w = await world();
  assert.equal(w.lead.route, 'not_a_fit');
  const before = w.zapCalls().length;
  const res = await w.press({ campaign: 'uk-it-growth', lead_id: 'l_small0001' });
  assert.equal(res.status, 200);
  assert.deepEqual(await bodyOf(res), { ok: true, lead_id: 'l_small0001' });

  const sent = w.zapCalls().slice(before);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, HOOK);
  assert.equal(sent[0].body.event, 'website_interest');
  assert.equal(sent[0].body.lead_id, 'l_small0001');
  assert.equal(sent[0].body.route, 'not_a_fit');
  assert.equal(sent[0].body.campaign, 'uk-it-growth');
  assert.equal(sent[0].body.company_name, GOOD.company_name);
  assert.equal(sent[0].body.email, GOOD.email, 'the whole lead goes along, so Zap 1 can make the task if the application never reached ClickUp');
  assert.ok(/^\d{4}-\d\d-\d\dT/.test(sent[0].body.interest_at));

  const stored = w.r.blobs.lead('l_small0001');
  assert.equal(stored.interest.kind, 'website');
  assert.equal(stored.interest.notice, NOTICE);
  assert.equal(stored.interest.delivery.state, 'ok');
  assert.equal(stored.route, 'not_a_fit', 'the route is not changed by asking');
});

test('pressing the button twice sends nothing the second time', async () => {
  const w = await world();
  await w.press({ campaign: 'uk-it-growth', lead_id: 'l_small0001' });
  const n = w.zapCalls().length;
  const again = await w.press({ campaign: 'uk-it-growth', lead_id: 'l_small0001' });
  assert.equal(again.status, 200);
  assert.deepEqual(await bodyOf(again), { ok: true, lead_id: 'l_small0001', already: true });
  assert.equal(w.zapCalls().length, n);
});

test('only a stored not_a_fit lead of that campaign can ask: fit, review, not_now, unknown ids and other campaigns all get the same answer', async () => {
  const fit = await world(Object.assign({}, GOOD, { lead_id: 'l_fit00001' }));
  assert.equal(fit.lead.route, 'fit');
  const zaps = fit.zapCalls().length;
  for (const body of [
    { campaign: 'uk-it-growth', lead_id: 'l_fit00001' },
    { campaign: 'uk-it-growth', lead_id: 'l_doesnotexist' },
  ]) {
    const res = await fit.press(body);
    assert.equal(res.status, 404);
    assert.deepEqual(await bodyOf(res), { ok: false, error: 'not_available' });
  }
  const review = await world(Object.assign({}, GOOD, { lead_id: 'l_rev00001', turnover_band: T[5] }));
  assert.equal(review.lead.route, 'review');
  assert.equal((await review.press({ campaign: 'uk-it-growth', lead_id: 'l_rev00001' })).status, 404);
  const notNow = await world(Object.assign({}, GOOD, { lead_id: 'l_now00001', capacity: OPTIONS.capacity[0] }));
  assert.equal(notNow.lead.route, 'not_now');
  assert.equal((await notNow.press({ campaign: 'uk-it-growth', lead_id: 'l_now00001' })).status, 404);
  assert.equal(fit.zapCalls().length, zaps, 'nothing was sent for any of them');
  assert.equal(fit.r.blobs.lead('l_fit00001').interest, undefined, 'and nothing was written to the lead');
});

test('bad requests: not JSON, not an object, unknown campaign, a malformed or missing lead id, a body that is too large', async () => {
  const w = await world();
  const n = w.zapCalls().length;
  const cases = [
    [() => w.handler(new Request('https://x.test/api/lead-interest', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' })), 415],
    [() => w.press('{not json'), 400],
    [() => w.press('[1]'), 400],
    [() => w.press({ campaign: 'nope', lead_id: 'l_small0001' }), 400],
    [() => w.press({ campaign: 'constructor', lead_id: 'l_small0001' }), 400],
    [() => w.press({ campaign: 'uk-it-growth', lead_id: '../etc' }), 400],
    [() => w.press({ campaign: 'uk-it-growth' }), 400],
    [() => w.press({ campaign: 'uk-it-growth', lead_id: 'l_small0001', pad: 'x'.repeat(3000) }), 413],
  ];
  for (const [fn, status] of cases) assert.equal((await fn()).status, status);
  const get = await w.handler(new Request('https://x.test/api/lead-interest', { method: 'GET' }));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal(w.zapCalls().length, n);
});

test('while the funnel is not live, or the hook is missing, the request is refused and nothing is written', async () => {
  const w = await world();
  const dead = createInterestHandler({
    campaigns: { 'uk-it-growth': Object.assign({}, w.r.campaigns['uk-it-growth'], { cfg: Object.assign({}, w.r.campaigns['uk-it-growth'].cfg, { live: false }) }) },
    env: () => w.r.env, fetch: w.r.fetch, now: w.r.now, sleep: async () => {}, log: () => {}, store: () => createStore({ blobs: w.r.blobs }),
  });
  const req = () => new Request('https://x.test/api/lead-interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign: 'uk-it-growth', lead_id: 'l_small0001' }) });
  assert.equal((await dead(req())).status, 503);
  const noHook = createInterestHandler({
    campaigns: w.r.campaigns, env: () => Object.assign({}, w.r.env, { ZAPIER_LEAD_HOOK: '' }), fetch: w.r.fetch, now: w.r.now, sleep: async () => {},
    log: () => {}, store: () => createStore({ blobs: w.r.blobs }),
  });
  assert.equal((await noHook(req())).status, 503);
  assert.equal(w.r.blobs.lead('l_small0001').interest, undefined);
});

test('when Zapier cannot be reached the request is kept, the visitor is told it was received, and Sondre is alerted by e-mail', async () => {
  const w = await world(TOO_SMALL, {});
  w.r.env.ZAPIER_LEAD_HOOK = HOOK;
  // From here on every call to Zapier fails: swap the responder by making a handler on a failing fetch.
  const failing = async (url, init) => (new URL(url).host === 'hooks.zapier.com' ? new Response('no', { status: 500 }) : w.r.fetch(url, init));
  const h = createInterestHandler({
    campaigns: w.r.campaigns, env: () => w.r.env, fetch: failing, now: w.r.now, sleep: async () => {},
    log: (o) => w.r.logs.push(o), store: () => createStore({ blobs: w.r.blobs }),
  });
  const res = await h(new Request('https://x.test/api/lead-interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign: 'uk-it-growth', lead_id: 'l_small0001' }) }));
  assert.equal(res.status, 200);
  assert.deepEqual(await bodyOf(res), { ok: true, lead_id: 'l_small0001' });
  const stored = w.r.blobs.lead('l_small0001');
  assert.equal(stored.interest.delivery.state, 'failed');
  assert.equal(stored.interest.delivery.error, 'http_500');
  const mails = w.r.of('resend');
  assert.equal(mails.length, 1);
  assert.match(mails[0].body.subject, /Website quote request not delivered/);
  assert.ok(!JSON.stringify(mails[0].body).includes(GOOD.email), 'no e-mail address in the alert');
  // A second press tries again, because the first delivery failed.
  const again = createInterestHandler({
    campaigns: w.r.campaigns, env: () => w.r.env, fetch: w.r.fetch, now: w.r.now, sleep: async () => {},
    log: () => {}, store: () => createStore({ blobs: w.r.blobs }),
  });
  const res2 = await again(new Request('https://x.test/api/lead-interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign: 'uk-it-growth', lead_id: 'l_small0001' }) }));
  assert.equal(res2.status, 200);
  assert.equal(w.r.blobs.lead('l_small0001').interest.delivery.state, 'ok');
  assert.equal(w.r.blobs.lead('l_small0001').interest.at, stored.interest.at, 'the time of the first press is kept');
});

test('an address that presses too often is limited, apart from the application form\'s own count', async () => {
  const w = await world();
  let last;
  for (let i = 0; i < 14; i++) last = await w.press({ campaign: 'uk-it-growth', lead_id: 'l_doesnotexist' });
  assert.equal(last.status, 429);
});

test('the log names the lead and a code, never a name or an address', async () => {
  const w = await world();
  await w.press({ campaign: 'uk-it-growth', lead_id: 'l_small0001' });
  const text = JSON.stringify(w.r.logs);
  assert.ok(!text.includes(GOOD.email) && !text.includes(GOOD.first_name) && !text.includes(GOOD.company_name));
});
