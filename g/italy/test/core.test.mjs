import test from 'node:test';
import assert from 'node:assert/strict';
import { core, Q, M, GOOD } from './helpers.mjs';

const get = (o) => (n) => (n in o ? o[n] : null);
const answers = (o) => core.answersFrom(Q, get(o));
const valid = (o) => core.validateAll(Q, answers(o), M);
const details = Q[Q.length - 1];

test('the six questions are the six in the brief, in order, and the last one submits', () => {
  assert.deepEqual(Q.map((q) => q.id), ['offers', 'employees', 'source', 'priority', 'budget', 'details']);
  assert.equal(details.kind, 'details');
});

test('a complete submission validates', () => {
  const r = valid(GOOD);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test('email: must look like an address, and an empty one carries the field\'s own Italian message', () => {
  const run = (email) => core.validateQuestion(details, Object.assign({}, answers(GOOD), { details_email: email }), M);
  ['marco@rossicyber.it', 'a@b.co', 'nome.cognome+tag@sub.example.org'].forEach((v) => assert.equal(run(v), null, v));
  const emailField = details.fields.find((f) => f.key === 'email');
  ['marco@rossicyber', 'marco', '@x.com', 'a b@c.com', 'a@b.c', ''].forEach((v) => assert.deepEqual(run(v), { email: emailField.error }, JSON.stringify(v)));
});

test('every details field has its own error text, and it wins over the shared one', () => {
  const r = valid(Object.assign({}, GOOD, { details_name: '  ', details_company: '', details_email: 'x', details_consent: '' }));
  const own = Object.fromEntries(details.fields.map((f) => [f.key, f.error]));
  assert.deepEqual(r.errors.details, own);
  for (const f of details.fields) assert.ok(f.error && f.error.length > 10, f.key);
});

test('the consent box must be ticked: unticked or missing is an error, any ticked value is not', () => {
  assert.deepEqual(valid(Object.assign({}, GOOD, { details_consent: '' })).errors.details, { consent: M.consent });
  const noBox = Object.assign({}, GOOD); delete noBox.details_consent;
  assert.deepEqual(valid(noBox).errors.details, { consent: M.consent });
  assert.equal(valid(Object.assign({}, GOOD, { details_consent: 'on' })).ok, true, 'a browser sends "on" when the box has no value');
  assert.equal(answers(Object.assign({}, GOOD, { details_consent: 'on' })).details_consent, '1', 'normalised to "1"');
});

test('choices: only an integer index inside the option list counts', () => {
  const q = Q[1]; // four options
  ['0', '3', 2].forEach((v) => assert.equal(core.validateQuestion(q, core.answersFrom([q], get({ employees: v })), M), null, String(v)));
  ['', null, '4', '-1', '1.5', 'abc', '1e0x', 'NaN', ' ', '0x1', '1e0', '+1', '١'].forEach((v) => assert.equal(core.validateQuestion(q, core.answersFrom([q], get({ employees: v })), M), M.choice, JSON.stringify(v)));
  assert.equal(core.answersFrom([q], get({ employees: ' ' })).employees, null, 'a blank is not option 0');
});

test('every question reports, in order, and firstId is the first one that failed', () => {
  const r = core.validateAll(Q, answers({}), M);
  assert.equal(r.ok, false);
  assert.equal(r.firstId, 'offers');
  assert.deepEqual(Object.keys(r.errors), ['offers', 'employees', 'source', 'priority', 'budget', 'details']);
});

test('control characters never survive into a field', () => {
  const a = answers(Object.assign({}, GOOD, { details_company: 'Acme\r\nBcc: x@y.z', details_name: 'A\u0000B' }));
  assert.equal(/[\r\n\u0000]/.test(a.details_company + a.details_name), false);
});

test('over-long values are cut or refused, whatever the field', () => {
  const long = 'x'.repeat(9000);
  const a = answers(Object.assign({}, GOOD, { details_name: long, details_company: long }));
  ['details_name', 'details_company'].forEach((k) => assert.ok(a[k].length <= core.MAX.text, k));
  const emailField = details.fields.find((f) => f.key === 'email');
  assert.deepEqual(core.validateQuestion(details, Object.assign(answers(GOOD), { details_email: long + '@x.com' }), M), { email: emailField.error });
});

test('describe() gives labels and a boolean for consent, so a receiver needs no copy of the form', () => {
  const d = core.describe(Q, answers(GOOD));
  assert.deepEqual(d.offers, { index: 0, label: 'Sì', other: '' });
  assert.deepEqual(d.employees, { index: 1, label: 'Da 10 a 49', other: '' });
  assert.deepEqual(d.details, { name: 'Marco Rossi', company: 'Rossi Cyber Srl', email: 'marco@rossicyber.it', consent: true });
  assert.equal(core.describe(Q, answers(Object.assign({}, GOOD, { details_consent: '' }))).details.consent, false);
});
