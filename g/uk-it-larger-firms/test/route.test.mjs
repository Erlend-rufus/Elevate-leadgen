import test from 'node:test';
import assert from 'node:assert/strict';
import { route, core, Q, routing, FIXTURE_ROUTING } from './helpers.mjs';

const ans = (o) => core.answersFrom(Q, (n) => (n in o ? o[n] : null));
const lead = (o) => ans(Object.assign({ turnover: '3', capacity: '2', people: '3' }, o));

test('an unconfigured table refuses to route rather than guess', () => {
  const none = { status: 'not_configured', rules: [], fallback: null };
  assert.throws(() => route.routeLead(Q, lead({}), none), (e) => e.name === 'RoutingNotConfigured');
});

/* ---------- the real table (routing.json) ---------- */

const opt = (id, i) => Q.find((q) => q.id === id).options[i];
const BASE = { area: '1', turnover: '2', people: '3', marketing: '2', value: '2', cycle: '1', decider: '0', capacity: '1' };
const go = (o) => route.routeLead(Q, ans(Object.assign({}, BASE, o)), routing);

test('the real routing table is configured, valid for these questions, and sends nobody to /takk', () => {
  assert.equal(routing.status, 'configured');
  assert.deepEqual(route.checkRouting(Q, routing), []);
  const pages = routing.rules.map((r) => r.then).concat(routing.fallback);
  assert.equal(pages.includes('takk'), false, '/takk is only reached after a booking');
});

test('the option indexes in routing.json are the options the rules mean (reorder an option and this fails)', () => {
  assert.equal(opt('turnover', 0), 'Under £1m');
  assert.equal(opt('turnover', 1), '£1m to £4m');
  assert.equal(opt('turnover', 2), '£4m to £10m');
  assert.equal(opt('turnover', 5), 'I would rather not say');
  assert.equal(opt('value', 0), 'Under £10k');
  assert.equal(opt('value', 1), '£10k to £25k');
  assert.equal(opt('decider', 3), 'A procurement process');
  assert.equal(opt('capacity', 0), 'None, we are at capacity');
});

test('a firm at the threshold or above, with room and a decision maker, is offered a booking', () => {
  assert.deepEqual(go({}), { page: 'book', rule: null });
  assert.equal(go({ turnover: '2' }).page, 'book', 'exactly £4m to £10m is in: the threshold is a minimum');
  for (const t of ['3', '4']) assert.equal(go({ turnover: t }).page, 'book', t);
  for (const d of ['0', '1', '2']) assert.equal(go({ decider: d }).page, 'book', 'decider ' + d);
  for (const v of ['2', '3', '4']) assert.equal(go({ value: v }).page, 'book', 'value ' + v);
  for (const c of ['1', '2', '3']) assert.equal(go({ capacity: c }).page, 'book', 'capacity ' + c);
});

test('below the stated threshold, or a client worth under £10k, is not a fit', () => {
  assert.deepEqual(go({ turnover: '0' }), { page: 'not-a-fit', rule: 'turnover-below-threshold' });
  assert.deepEqual(go({ turnover: '1' }), { page: 'not-a-fit', rule: 'turnover-below-threshold' });
  assert.deepEqual(go({ value: '0' }), { page: 'not-a-fit', rule: 'client-value-too-low' });
});

test('at capacity is not now, which the page says it will ask again about', () => {
  assert.deepEqual(go({ capacity: '0' }), { page: 'not-now', rule: 'at-capacity' });
});

test('what only a person can settle goes to review: turnover not stated, a borderline client value, a procurement process', () => {
  assert.deepEqual(go({ turnover: '5' }), { page: 'review', rule: 'turnover-not-stated' });
  assert.deepEqual(go({ value: '1' }), { page: 'review', rule: 'client-value-borderline' });
  assert.deepEqual(go({ decider: '3' }), { page: 'review', rule: 'procurement-decides' });
});

test('precedence: not a fit, then not now, then review, then book', () => {
  assert.equal(go({ turnover: '1', capacity: '0' }).page, 'not-a-fit', 'too small and at capacity: structural beats temporary');
  assert.equal(go({ value: '0', capacity: '0' }).page, 'not-a-fit');
  assert.equal(go({ turnover: '5', capacity: '0' }).page, 'not-now', 'at capacity wins over "needs checking"');
  assert.equal(go({ turnover: '5', value: '1', decider: '3' }).page, 'review');
  assert.equal(go({ turnover: '0', value: '1', decider: '3' }).page, 'not-a-fit');
});

test('area, people, marketing spend and sales cycle are captured but never change the outcome', () => {
  for (const [id, n] of [['area', 6], ['people', 5], ['marketing', 5], ['cycle', 4]])
    for (let i = 0; i < n; i++) assert.equal(go({ [id]: String(i) }).page, 'book', `${id}=${i}`);
});

test('first matching rule wins, and later rules are not consulted', () => {
  assert.deepEqual(route.routeLead(Q, lead({ turnover: '0', capacity: '0' }), FIXTURE_ROUTING), { page: 'not-a-fit', rule: 'fixture-small' });
  assert.deepEqual(route.routeLead(Q, lead({ turnover: '3', capacity: '0' }), FIXTURE_ROUTING), { page: 'not-now', rule: 'fixture-full' });
});

test('every question in a rule must hold', () => {
  assert.equal(route.routeLead(Q, lead({ turnover: '5', people: '3' }), FIXTURE_ROUTING).page, 'book', 'only one of the two conditions holds');
  assert.equal(route.routeLead(Q, lead({ turnover: '5', people: '1' }), FIXTURE_ROUTING).page, 'review');
});

test('no rule matching means the fallback, with a null rule', () => {
  assert.deepEqual(route.routeLead(Q, lead({}), FIXTURE_ROUTING), { page: 'book', rule: null });
});

test('checkRouting names every way a table can be wrong', () => {
  const bad = (t) => route.checkRouting(Q, Object.assign({ status: 'configured', rules: [], fallback: 'book' }, t));
  assert.deepEqual(bad({}), []);
  assert.match(bad({ fallback: null })[0], /fallback/);
  assert.match(bad({ fallback: 'nowhere' })[0], /fallback/);
  assert.match(bad({ rules: [{ id: 'x', when: {}, then: 'book' }] })[0], /empty "when"/);
  assert.match(bad({ rules: [{ id: 'x', when: { turnover: [0] }, then: 'home' }] })[0], /not a page/);
  assert.match(bad({ rules: [{ id: 'x', when: { turnover: [9] }, then: 'book' }] })[0], /option 9/);
  assert.match(bad({ rules: [{ id: 'x', when: { website: [0] }, then: 'book' }] })[0], /not a choice question/);
  assert.match(bad({ rules: [{ id: 'x', when: { nope: [0] }, then: 'book' }] })[0], /not a choice question/);
  assert.match(bad({ rules: [{ id: 'x', when: { turnover: [] }, then: 'book' }] })[0], /no options/);
  assert.match(bad({ rules: [{ id: 'x', when: { turnover: [1.5] }, then: 'book' }] })[0], /option 1\.5/);
});

test('the five pages are exactly the ones the work order names', () => {
  assert.deepEqual(route.PAGES, ['book', 'takk', 'review', 'not-now', 'not-a-fit']);
});
