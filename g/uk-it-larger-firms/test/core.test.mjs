import test from 'node:test';
import assert from 'node:assert/strict';
import { core, Q, M, GOOD } from './helpers.mjs';

const get = (o) => (n) => (n in o ? o[n] : null);
const valid = (o) => core.validateAll(Q, core.answersFrom(Q, get(o)), M);

test('the twelve questions are the twelve in the work order, in order', () => {
  assert.deepEqual(Q.map((q) => q.id), ['website', 'company', 'area', 'turnover', 'people', 'marketing', 'value', 'cycle', 'target', 'decider', 'capacity', 'details']);
});

test('a complete submission validates, and the optional question may be empty', () => {
  const r = valid(GOOD);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(GOOD.target, '');
});

test('website: the work order\'s regex, protocol optional, case-insensitive', () => {
  const ok = ['northbridge-it.co.uk', 'https://northbridge-it.co.uk', 'http://a.io', 'HTTPS://EXAMPLE.COM/path?x=1', 'sub.domain.example.org/a/b'];
  const bad = ['northbridge', 'no spaces.com', '', 'http://', 'a.b', 'ftp://example.com', 'example..com', '.com'];
  ok.forEach((v) => assert.equal(core.validateQuestion(Q[0], { website: v }, M), null, v));
  bad.forEach((v) => assert.equal(core.validateQuestion(Q[0], { website: v }, M), M.website, JSON.stringify(v)));
});

test('email: the work order\'s regex', () => {
  const details = Q[11];
  const run = (email) => core.validateQuestion(details, Object.assign({}, core.answersFrom(Q, get(GOOD)), { details_email: email }), M);
  ['alex@northbridge-it.co.uk', 'a@b.co', 'first.last+tag@sub.example.org'].forEach((v) => assert.equal(run(v), null, v));
  ['alex@northbridge', 'alex', '@x.com', 'a b@c.com', 'a@b.c', ''].forEach((v) => assert.deepEqual(run(v), { email: M.email }, JSON.stringify(v)));
});

test('empty text fields use the required message, which is still the placeholder', () => {
  const r = valid(Object.assign({}, GOOD, { company: '   ', details_first: '', details_mobile: '' }));
  assert.equal(r.errors.company, M.required);
  assert.deepEqual(r.errors.details, { first: M.required, mobile: M.required });
  assert.equal(M.required, '[TEKST MANGLER]');
  assert.equal(M._pending, 'required', 'the message is flagged as undelivered so the build can refuse to go live');
});

test('choices: only an integer index inside the option list counts', () => {
  const area = Q[2];
  ['0', '5', 3].forEach((v) => assert.equal(core.validateQuestion(area, core.answersFrom([area], get({ area: v })), M), null, String(v)));
  ['', null, '6', '-1', '1.5', 'abc', '1e0x', 'NaN'].forEach((v) => assert.equal(core.validateQuestion(area, core.answersFrom([area], get({ area: v })), M), M.choice, JSON.stringify(v)));
});

test('every question reports, in order, and firstId is the first one that failed', () => {
  const r = core.validateAll(Q, core.answersFrom(Q, get({})), M);
  assert.equal(r.ok, false);
  assert.equal(r.firstId, 'website');
  assert.deepEqual(Object.keys(r.errors), ['website', 'company', 'area', 'turnover', 'people', 'marketing', 'value', 'cycle', 'decider', 'capacity', 'details']);
  assert.ok(!('target' in r.errors), 'optional');
});

test('control characters never survive into a field', () => {
  const a = core.answersFrom(Q, get(Object.assign({}, GOOD, { company: 'Acme\r\nBcc: x@y.z', details_first: 'A\u0000B' })));
  assert.equal(/[\r\n\u0000]/.test(a.company + a.details_first), false);
});

test('over-long values: plain text is cut, an address or URL is refused', () => {
  const long = 'x'.repeat(5000);
  assert.ok(core.describe(Q, core.answersFrom(Q, get(Object.assign({}, GOOD, { company: long })))).company.length <= core.MAX.text);
  assert.equal(core.validateQuestion(Q[0], { website: 'a.com/' + long }, M), M.website);
  assert.deepEqual(core.validateQuestion(Q[11], Object.assign(core.answersFrom(Q, get(GOOD)), { details_email: long + '@x.com' }), M), { email: M.email });
});

test('describe() gives labels, so a receiver needs no copy of the form', () => {
  const d = core.describe(Q, core.answersFrom(Q, get(Object.assign({}, GOOD, { area: '5', area_other: 'Quantum' }))));
  assert.deepEqual(d.area, { index: 5, label: 'Other', other: 'Quantum' });
  assert.deepEqual(d.turnover, { index: 2, label: '£4m to £10m', other: '' });
  assert.equal(d.details.email, 'alex@northbridge-it.co.uk');
  assert.equal(d.website, 'northbridge-it.co.uk');
});

test('"other" text is only kept when Other is the chosen option', () => {
  const d = core.describe(Q, core.answersFrom(Q, get(Object.assign({}, GOOD, { area: '1', area_other: 'stale text' }))));
  assert.equal(d.area.other, '');
});

test('a choice is digits or nothing: blank, whitespace and other numerals are not an answer', () => {
  const area = Q[2];
  [' ', '  ', '0x1', '1e0', '+1', '١', '00001', '0.0'].forEach((v) =>
    assert.equal(core.validateQuestion(area, core.answersFrom([area], get({ area: v })), M), v === '00001' ? M.choice : M.choice, JSON.stringify(v)));
  assert.equal(core.answersFrom([area], get({ area: ' ' })).area, null);
});

test('every details field is capped, not only the free-text ones', () => {
  const a = core.answersFrom(Q, get(Object.assign({}, GOOD, { details_first: 'x'.repeat(9000), details_mobile: '9'.repeat(9000), details_title: 'y'.repeat(9000) })));
  ['details_first', 'details_mobile', 'details_title'].forEach((k) => assert.ok(a[k].length <= core.MAX.text, k));
});
