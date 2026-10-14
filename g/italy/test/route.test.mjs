import test from 'node:test';
import assert from 'node:assert/strict';
import { route, core, Q, routing, copy } from './helpers.mjs';

const BASE = { offers: '0', employees: '1', source: '0', priority: '0', budget: '0' };
const lead = (o) => { const f = Object.assign({}, BASE, o); return core.answersFrom(Q, (n) => (n in f ? f[n] : null)); };
const go = (o) => route.routeLead(Q, lead(o), routing);
const opt = (id, i) => Q.find((q) => q.id === id).options[i];

test('the routing table is configured and valid for these questions', () => {
  assert.equal(routing.status, 'configured');
  assert.deepEqual(route.checkRouting(Q, routing), []);
});

test('the option indexes in routing.json are the options the brief means (reorder an option and this fails)', () => {
  assert.equal(opt('offers', 1), 'No');
  assert.equal(opt('employees', 0), 'Da 1 a 9');
  assert.equal(opt('employees', 3), 'Più di 150');
  assert.equal(opt('budget', 2), 'No');
  assert.equal(opt('budget', 1), 'Da valutare');
});

test('a lead that passes everything reaches /book; "to be assessed" on budget still does', () => {
  assert.deepEqual(go({}), { page: 'book', rule: null });
  assert.equal(go({ budget: '0' }).page, 'book');
  assert.equal(go({ budget: '1' }).page, 'book', 'Da valutare is not a refusal');
  assert.equal(go({ employees: '1' }).page, 'book');
  assert.equal(go({ employees: '2' }).page, 'book');
});

test('each reason lands on its own page', () => {
  assert.deepEqual(go({ offers: '1' }), { page: 'not-a-fit', rule: 'not-a-fit-a' });
  assert.deepEqual(go({ employees: '0' }), { page: 'not-a-fit-b', rule: 'not-a-fit-b' });
  assert.deepEqual(go({ employees: '3' }), { page: 'not-a-fit-b', rule: 'not-a-fit-b' });
  assert.deepEqual(go({ budget: '2' }), { page: 'not-now', rule: 'not-now' });
});

test('precedence: not-a-fit A, then B, then not-now', () => {
  assert.equal(go({ offers: '1', employees: '0', budget: '2' }).page, 'not-a-fit');
  assert.equal(go({ employees: '3', budget: '2' }).page, 'not-a-fit-b');
  assert.equal(go({ offers: '1', budget: '2' }).page, 'not-a-fit');
});

test('source and priority never change the outcome', () => {
  for (const s of ['0', '1', '2', '3']) for (const p of ['0', '1', '2']) assert.equal(go({ source: s, priority: p }).page, 'book');
});

test('an unconfigured table refuses rather than guesses', () => {
  assert.throws(() => route.routeLead(Q, lead({}), { status: 'pending', rules: [], fallback: 'book' }), (e) => e.name === 'RoutingNotConfigured');
});

test('checkRouting names every way a table can be wrong', () => {
  const bad = (t) => route.checkRouting(Q, Object.assign({ status: 'configured', rules: [], fallback: 'book' }, t));
  assert.deepEqual(bad({}), []);
  assert.match(bad({ fallback: null })[0], /fallback/);
  assert.match(bad({ fallback: 'nowhere' })[0], /fallback/);
  assert.match(bad({ rules: [{ id: 'x', when: {}, then: 'book' }] })[0], /empty "when"/);
  assert.match(bad({ rules: [{ id: 'x', when: { offers: [0] }, then: 'home' }] })[0], /not a page/);
  assert.match(bad({ rules: [{ id: 'x', when: { offers: [9] }, then: 'book' }] })[0], /option 9/);
  assert.match(bad({ rules: [{ id: 'x', when: { details: [0] }, then: 'book' }] })[0], /not a choice question/);
  assert.match(bad({ rules: [{ id: 'x', when: { offers: [] }, then: 'book' }] })[0], /no options/);
});

test('the pages are the five outcomes of the brief plus the reason-B variant, and every page has copy', () => {
  assert.deepEqual(route.PAGES, ['book', 'takk', 'not-now', 'not-a-fit', 'not-a-fit-b']);
  for (const p of route.PAGES) assert.ok(copy.outcomes[p] && copy.outcomes[p].h1 && copy.outcomes[p].text, p);
});
