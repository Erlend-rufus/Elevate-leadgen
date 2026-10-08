import test from 'node:test';
import assert from 'node:assert/strict';
import { route, core, Q, routing, FIXTURE_ROUTING } from './helpers.mjs';

const ans = (o) => core.answersFrom(Q, (n) => (n in o ? o[n] : null));
const lead = (o) => ans(Object.assign({ turnover: '3', capacity: '2', people: '3' }, o));

test('as shipped, routing is not configured and refuses to route', () => {
  assert.notEqual(routing.status, 'configured');
  assert.throws(() => route.routeLead(Q, lead({}), routing), (e) => e.name === 'RoutingNotConfigured');
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
