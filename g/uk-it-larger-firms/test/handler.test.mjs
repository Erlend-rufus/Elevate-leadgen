import test from 'node:test';
import assert from 'node:assert/strict';
import { cfg, copy, FIXTURE_ROUTING, routing, GOOD, SHELL, post } from './helpers.mjs';
import { createHandler } from '../../../netlify/functions/uk-it-apply/index.mjs';

/** A handler wired to fakes: the webhook records what it is sent and what it should answer. */
function rig(over = {}) {
  const calls = [], logs = [];
  const hook = over.hook || (async () => new Response('ok', { status: 200 }));
  const handler = createHandler({
    cfg: Object.assign({}, cfg, { live: true }, over.cfg || {}),
    copy, routing: over.routing || FIXTURE_ROUTING, shell: SHELL,
    env: () => Object.assign({ UK_IT_LEAD_WEBHOOK_URL: 'https://hooks.example.test/catch/1' }, over.env || {}),
    fetch: async (url, init) => { calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null }); return hook(url, init); },
    now: () => new Date('2026-10-08T12:00:00Z'),
    uuid: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    log: (o) => logs.push(o),
  });
  return { handler, calls, logs };
}
const bodyOf = async (res) => JSON.parse(await res.text());

test('only POST is accepted', async () => {
  const { handler } = rig();
  const res = await handler(new Request('https://x.test/uk-it-firms/apply', { method: 'GET' }));
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'POST');
});

test('a good submission is delivered once, routed, and the visitor is sent on with their tracking', async () => {
  const { handler, calls } = rig();
  const res = await handler(post(GOOD));
  assert.equal(res.status, 200);
  const j = await bodyOf(res);
  assert.equal(j.ok, true);
  assert.equal(j.page, 'book');
  assert.equal(j.next, '/uk-it-firms/book/?lead_id=l_test123&utm_source=meta&utm_medium=paid&utm_campaign=itq4&utm_content=ad7&utm_term=solar&fbclid=FB1');
  assert.equal(calls.length, 1);
  const lead = calls[0].body;
  assert.equal(lead.lead_id, 'l_test123');
  assert.equal(lead.received_at, '2026-10-08T12:00:00.000Z');
  assert.deepEqual(lead.route, { page: 'book', rule: null });
  assert.equal(lead.answers.turnover.label, '£4m to £10m');
  assert.equal(lead.answers.details.email, 'alex@northbridge-it.co.uk');
  assert.equal(lead.tracking.utm_campaign, 'itq4');
  assert.equal(lead.tracking.referrer, 'https://l.facebook.com/');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
});

test('every hidden field the work order lists is stored with the lead', async () => {
  const { handler, calls } = rig();
  await handler(post(GOOD));
  for (const k of ['lead_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'referrer'])
    assert.ok(k in calls[0].body.tracking && calls[0].body.tracking[k] !== undefined, k);
  assert.equal(calls[0].body.page_slug, 'uk-it-larger-firms');
});

test('routing decides the page, and the page is in the redirect', async () => {
  const { handler } = rig();
  assert.equal((await bodyOf(await handler(post(Object.assign({}, GOOD, { turnover: '0' }))))).next.split('?')[0], '/uk-it-firms/not-a-fit/');
  assert.equal((await bodyOf(await handler(post(Object.assign({}, GOOD, { capacity: '0' }))))).next.split('?')[0], '/uk-it-firms/not-now/');
});

test('without JavaScript a good submission is a 303 to the same place', async () => {
  const { handler } = rig();
  const res = await handler(post(GOOD, { json: false }));
  assert.equal(res.status, 303);
  assert.match(res.headers.get('location'), /^\/uk-it-firms\/book\/\?lead_id=l_test123/);
});

test('invalid input: JSON gets the errors, and nothing is delivered', async () => {
  const { handler, calls } = rig();
  const res = await handler(post(Object.assign({}, GOOD, { website: 'northbridge', details_email: 'alex@x' })));
  assert.equal(res.status, 422);
  const j = await bodyOf(res);
  assert.equal(j.errors.website, 'Please enter a valid website');
  assert.deepEqual(j.errors.details, { email: 'Please enter a valid work email' });
  assert.equal(calls.length, 0);
});

test('invalid input without JavaScript: the form comes back with answers kept and errors shown', async () => {
  const { handler, calls } = rig();
  const res = await handler(post(Object.assign({}, GOOD, { website: 'northbridge', company: 'Kept Co' }), { json: false }));
  assert.equal(res.status, 422);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  assert.match(html, /Please enter a valid website/);
  assert.match(html, /value="northbridge"/);
  assert.match(html, /value="Kept Co"/);
  assert.match(html, /value="l_test123"/, 'the lead id survives the round trip');
  assert.match(html, /<input class="vh" type="radio" id="o-turnover-2" name="turnover" value="2" checked>/);
  assert.equal(calls.length, 0);
});

test('what a visitor typed is escaped when it is written back into the page', async () => {
  const { handler } = rig();
  const evil = '"><script>alert(1)</script><img src=x onerror=alert(2)>';
  const res = await handler(post(Object.assign({}, GOOD, { website: evil, company: evil, details_first: evil, utm_source: evil }), { json: false }));
  const html = await res.text();
  assert.equal(/<script>alert/.test(html), false);
  assert.equal(/<img src=x/.test(html), false);
  // the value attribute holds the text, with the quote that would have closed it escaped
  assert.ok(html.includes('value="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;img src=x onerror=alert(2)&gt;"'), 'shown as text inside the attribute');
  // and nothing the visitor typed became markup: the only tags are the ones the form itself writes
  const tags = new Set((html.match(/<\/?[a-z][a-z0-9]*/gi) || []).map((t) => t.replace('/', '').toLowerCase()));
  for (const bad of ['<script', '<img', '<svg onload', '<iframe']) assert.equal(tags.has(bad) && bad !== '<svg onload', false, bad);
});

test('the redirect carries values we built, never a location from the visitor', async () => {
  const { handler } = rig();
  const res = await handler(post(Object.assign({}, GOOD, { utm_source: 'https://evil.test/&page=x', fbclid: '\r\nLocation: https://evil.test' })));
  const next = (await bodyOf(res)).next;
  assert.ok(next.startsWith('/uk-it-firms/'), next);
  assert.equal(/\r|\n/.test(next), false);
  assert.equal(next.includes('https://evil.test'), false, 'encoded, not interpreted');
});

test('not live: every submission is refused with 503 and nothing is delivered', async () => {
  const { handler, calls, logs } = rig({ cfg: { live: false } });
  const res = await handler(post(GOOD));
  assert.equal(res.status, 503);
  assert.equal((await bodyOf(res)).error, 'unavailable', 'the public is not told why');
  assert.equal(logs[0].code, 'not_live', 'the log is');
  assert.equal(calls.length, 0);
});

test('as shipped (routing not configured) a live funnel still refuses rather than guessing a page', async () => {
  const { handler, calls, logs } = rig({ routing });
  const res = await handler(post(GOOD));
  assert.equal(res.status, 503);
  assert.equal(logs[0].code, 'routing_not_configured');
  assert.equal(calls.length, 0);
});

test('no destination configured: 503, and the lead is not pretended into existence', async () => {
  for (const url of ['', 'http://insecure.test/x', 'not a url']) {
    const { handler, calls, logs } = rig({ env: { UK_IT_LEAD_WEBHOOK_URL: url } });
    const res = await handler(post(GOOD));
    assert.equal(res.status, 503, url);
    assert.equal(logs[0].code, 'no_destination');
    assert.equal(calls.length, 0);
  }
});

test('the destination rejecting the lead, failing, or timing out: the visitor is told, not sent on', async () => {
  for (const [name, hook, code, status] of [
    ['500', async () => new Response('no', { status: 500 }), 'delivery_rejected', 502],
    ['network', async () => { throw new Error('boom'); }, 'delivery_failed', 502],
    ['abort', async () => { const e = new Error('t'); e.name = 'AbortError'; throw e; }, 'delivery_timeout', 502],
  ]) {
    const { handler, logs } = rig({ hook });
    const res = await handler(post(GOOD));
    assert.equal(res.status, status, name);
    assert.equal(logs[0].code, code, name);
  }
});

test('a refusal without JavaScript shows the general error and keeps the answers', async () => {
  const { handler } = rig({ hook: async () => new Response('no', { status: 500 }) });
  const res = await handler(post(GOOD, { json: false }));
  assert.equal(res.status, 502);
  const html = await res.text();
  assert.match(html, /Something went wrong\. Please try again, or email <a href="mailto:post@elevatemarketing\.no">post@elevatemarketing\.no<\/a>/);
  assert.match(html, /value="northbridge-it\.co\.uk"/);
});

test('the optional token is sent as a bearer, and only when set', async () => {
  let r = rig({ env: { UK_IT_LEAD_WEBHOOK_TOKEN: 'sekrit' } });
  await r.handler(post(GOOD));
  assert.equal(r.calls[0].init.headers.Authorization, 'Bearer sekrit');
  r = rig();
  await r.handler(post(GOOD));
  assert.equal('Authorization' in r.calls[0].init.headers, false);
});

test('the honeypot looks like success and records nothing', async () => {
  const { handler, calls } = rig();
  const res = await handler(post(Object.assign({}, GOOD, { contact_by_fax: 'buy now' })));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('a lead id that is not ours is replaced, not trusted', async () => {
  const { handler, calls } = rig();
  await handler(post(Object.assign({}, GOOD, { lead_id: 'x'.repeat(200) })));
  assert.equal(calls[0].body.lead_id, 'l_aaaaaaaabbbbccccdddd');
  await handler(post(Object.assign({}, GOOD, { lead_id: '' })));
  assert.equal(calls[1].body.lead_id, 'l_aaaaaaaabbbbccccdddd');
});

test('a browser without JavaScript cannot fill the UTMs in, so they are recovered from the page that posted', async () => {
  const { handler, calls } = rig();
  const fields = Object.assign({}, GOOD, { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '', fbclid: '' });
  await handler(post(fields, { json: false, headers: { Referer: 'https://getelevateleads.com/uk-it-firms/?utm_source=meta&utm_campaign=itq4&fbclid=ZZ' } }));
  assert.equal(calls[0].body.tracking.utm_source, 'meta');
  assert.equal(calls[0].body.tracking.utm_campaign, 'itq4');
  assert.equal(calls[0].body.tracking.fbclid, 'ZZ');
});

test('a Referer from somewhere else is ignored', async () => {
  const { handler, calls } = rig();
  await handler(post(Object.assign({}, GOOD, { utm_source: '' }), { headers: { Referer: 'https://elsewhere.test/other/?utm_source=spoof' } }));
  assert.equal(calls[0].body.tracking.utm_source, '');
});

test('size and type limits', async () => {
  const { handler } = rig();
  const big = new Request('https://x.test/uk-it-firms/apply', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'a=' + 'x'.repeat(70000) });
  assert.equal((await handler(big)).status, 413);
  const xml = new Request('https://x.test/uk-it-firms/apply', { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: '<a/>' });
  assert.equal((await handler(xml)).status, 415);
  const badJson = new Request('https://x.test/uk-it-firms/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{nope' });
  assert.equal((await handler(badJson)).status, 400);
});

test('JSON bodies work too', async () => {
  const { handler, calls } = rig();
  const res = await handler(new Request('https://x.test/uk-it-firms/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(GOOD) }));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
});

test('no personal data reaches the log, only an id and a reason', async () => {
  const { handler, logs } = rig({ hook: async () => new Response('no', { status: 500 }) });
  await handler(post(GOOD));
  await handler(post(Object.assign({}, GOOD, { website: 'x' })));
  const text = JSON.stringify(logs);
  for (const pii of ['alex@northbridge', 'Alex', 'Morgan', '07700', 'Northbridge']) assert.equal(text.includes(pii), false, pii);
  assert.ok(logs.length >= 1);
});

test('every response says it must not be cached or indexed', async () => {
  const { handler } = rig();
  for (const res of [await handler(post(GOOD)), await handler(post({})), await handler(new Request('https://x.test/uk-it-firms/apply'))]) {
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.match(res.headers.get('x-robots-tag'), /noindex/);
  }
});

test('a destination that answers with a redirect did not accept the lead', async () => {
  let init;
  const { handler, logs } = rig({ hook: async (url, i) => { init = i; return new Response(null, { status: 302, headers: { Location: 'https://elsewhere.test/' } }); } });
  const res = await handler(post(GOOD));
  assert.equal(res.status, 502);
  assert.equal(logs[0].code, 'delivery_rejected');
  assert.equal(init.redirect, 'manual', 'we must not follow it to some other place and call that delivery');
});

test('public answers carry the security headers the site sets elsewhere', async () => {
  const { handler } = rig();
  const res = await handler(post({}, { json: false }));
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
});

test('with no script, the first error is the control the browser jumps to', async () => {
  const { handler } = rig();
  const html = await (await handler(post(Object.assign({}, GOOD, { company: '', details_email: 'x' }), { json: false }))).text();
  assert.equal((html.match(/autofocus/g) || []).length, 1);
  assert.match(html, /<input class="txt is-bad" autofocus type="text" id="f-company"/);
  const gen = await (await rig({ hook: async () => new Response('', { status: 500 }) }).handler(post(GOOD, { json: false }))).text();
  assert.match(gen, /<div class="general" role="alert" tabindex="-1" autofocus>/);
  const real = await import('../../../netlify/functions/uk-it-apply/data.generated.mjs');
  assert.match(real.shell.before, /<h1 class="h2">See whether we would take you on<\/h1>/, 'the real no-script page has a first-level heading');
});
