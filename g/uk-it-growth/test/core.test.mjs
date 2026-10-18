import test from 'node:test';
import assert from 'node:assert/strict';
import { core, GOOD, OPTIONS, copy, cfg, renderForm } from './helpers.mjs';

const { validate, tidy, STEPS, FIELDS, MSG } = core;
const answers = (over = {}) => Object.assign({}, GOOD, over);

test('the thirteen questions are the board\'s, in the board\'s order', () => {
  assert.deepEqual(STEPS.map((s) => s.id), [
    'website', 'company', 'area', 'turnover', 'trading', 'people', 'spend', 'worth',
    'cycle', 'target', 'decider', 'capacity', 'details',
  ]);
  assert.equal(STEPS.length, 13);
});

test('every input name on the form, in order, with the free text of "Other" after its question', () => {
  assert.deepEqual(FIELDS, [
    'company_website', 'company_name', 'specialism', 'specialism_other', 'turnover_band', 'trading_years',
    'employees_or_fee_earners', 'marketing_spend', 'first_year_value', 'sales_cycle', 'target_next_year',
    'decision_maker', 'capacity', 'first_name', 'last_name', 'job_title', 'email', 'mobile',
  ]);
});

test('a complete submission validates and comes back cleaned', () => {
  const r = validate(answers());
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.errors, {});
  assert.equal(r.values.company_name, 'Northbridge IT Limited');
  assert.equal(r.values.specialism_other, '');
  assert.equal(r.values.target_next_year, '', 'the optional question may be empty');
});

test('only two things are optional: next year\'s target and the mobile number', () => {
  const r = validate(answers({ target_next_year: '', mobile: '' }));
  assert.equal(r.ok, true);
  for (const f of FIELDS) {
    if (f === 'target_next_year' || f === 'mobile' || f === 'specialism_other') continue;
    const e = validate(answers({ [f]: '' }));
    assert.equal(e.ok, false, f + ' is required');
    assert.ok(e.errors[f], f + ' reports an error');
  }
});

test('website: protocol optional, a domain with a real ending, nothing with spaces', () => {
  const good = ['northbridge-it.co.uk', 'https://northbridge-it.co.uk', 'http://a.io', 'HTTPS://EXAMPLE.COM/path?x=1', 'sub.domain.example.org/a/b'];
  const bad = ['northbridge', 'no spaces.com', '', 'http://', 'a.b', 'ftp://example.com', 'example..com', '.com', 'javascript:alert(1)'];
  for (const v of good) assert.equal(validate(answers({ company_website: v })).errors.company_website, undefined, v);
  for (const v of bad) assert.equal(validate(answers({ company_website: v })).errors.company_website, MSG.url, JSON.stringify(v));
});

test('work email: one @, a dot after it, a real ending, no spaces', () => {
  for (const v of ['alex@northbridge-it.co.uk', 'a@b.co', 'first.last+tag@sub.example.org'])
    assert.equal(validate(answers({ email: v })).errors.email, undefined, v);
  for (const v of ['alex@northbridge', 'alex', '@x.com', 'a b@c.com', 'a@b.c', '', 'a@@b.com'])
    assert.equal(validate(answers({ email: v })).errors.email, MSG.email, JSON.stringify(v));
});

test('a choice must be exactly one of its options, as worded on the form', () => {
  assert.equal(validate(answers({ turnover_band: 'Roughly two million' })).errors.turnover_band, MSG.choice);
  assert.equal(validate(answers({ turnover_band: '' })).errors.turnover_band, MSG.choice);
  assert.equal(validate(answers({ turnover_band: OPTIONS.turnover[0].toUpperCase() })).errors.turnover_band, MSG.choice, 'case matters');
  assert.equal(validate(answers({ capacity: '1' })).errors.capacity, MSG.choice, 'an index is not an answer');
  for (const [key, opts] of [['specialism', OPTIONS.area], ['turnover_band', OPTIONS.turnover], ['trading_years', OPTIONS.trading],
    ['employees_or_fee_earners', OPTIONS.people], ['marketing_spend', OPTIONS.spend], ['first_year_value', OPTIONS.worth],
    ['sales_cycle', OPTIONS.cycle], ['decision_maker', OPTIONS.decider], ['capacity', OPTIONS.capacity]]) {
    for (const o of opts) assert.equal(validate(answers({ [key]: o })).errors[key], undefined, `${key}: ${o}`);
  }
});

test('the free text of "Other" is kept only when Other is the chosen option', () => {
  assert.equal(validate(answers({ specialism: 'Other', specialism_other: 'Quantum networking' })).values.specialism_other, 'Quantum networking');
  assert.equal(validate(answers({ specialism: OPTIONS.area[1], specialism_other: 'stale text' })).values.specialism_other, '');
  assert.equal(validate(answers({ specialism: 'Other', specialism_other: '' })).ok, true, 'Other with no text is still an answer');
});

test('the messages are the board\'s, word for word', () => {
  assert.deepEqual(MSG, {
    url: 'Please enter a valid website',
    required: 'Please complete this field',
    choice: 'Please choose one option',
    email: 'Please enter a valid work email',
  });
  assert.equal(validate(answers({ company_name: '   ' })).errors.company_name, MSG.required);
  assert.equal(validate(answers({ first_name: '' })).errors.first_name, MSG.required);
});

test('every error is reported at once, by field name', () => {
  const r = validate({});
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), FIELDS.filter((f) => !['specialism_other', 'target_next_year', 'mobile'].includes(f)).sort());
});

test('tidy: control characters, line breaks and the two Unicode line separators never survive', () => {
  assert.equal(tidy('Acme\r\nBcc: x@y.z'), 'Acme Bcc: x@y.z');
  assert.equal(tidy('A\u0000B\u0007C'), 'A B C');
  assert.equal(tidy('line\u2028one\u2029two'), 'line one two', 'U+2028 and U+2029 are replaced, not left to break a script');
  assert.equal(tidy('  padded  '), 'padded');
  assert.equal(tidy('tab\tseparated'), 'tab separated');
  assert.equal(/[\u0000-\u001F\u007F\u2028\u2029]/.test(tidy('x\u0000\u001f\u007f\u2028\u2029y')), false);
});

test('tidy: cut at the limit, never throws, and a number is a value', () => {
  assert.equal(tidy('x'.repeat(5000), 200).length, 200);
  assert.equal(tidy('x'.repeat(5000)).length, 200, 'default limit');
  assert.equal(tidy(null), '');
  assert.equal(tidy(undefined), '');
  assert.equal(tidy({}), '');
  assert.equal(tidy([]), '');
  assert.equal(tidy(42), '42');
});

test('over-long values are cut for text and refused for a website or an address', () => {
  const long = 'x'.repeat(5000);
  assert.ok(validate(answers({ company_name: long })).values.company_name.length <= 200);
  assert.ok(validate(answers({ job_title: long })).values.job_title.length <= 120);
  const w = validate(answers({ company_website: 'a.com/' + long }));
  assert.ok(w.values.company_website.length <= 300, 'cut, not stored whole');
  assert.equal(validate(answers({ email: long + '@x.com' })).values.email.length <= 254, true);
});

test('validate() never throws on a missing or odd input', () => {
  assert.doesNotThrow(() => validate(null));
  assert.doesNotThrow(() => validate(undefined));
  assert.doesNotThrow(() => validate({ company_name: { a: 1 }, email: ['x'], capacity: 3 }));
  assert.equal(validate(null).ok, false);
});

test('the form renders all thirteen questions, the hidden fields and the honeypot', () => {
  const html = renderForm({ copy, cfg });
  assert.equal((html.match(/class="lf-block"/g) || []).length, 13);
  for (const name of cfg.hiddenFields) assert.ok(html.includes(`<input type="hidden" name="${name}"`), name);
  assert.ok(html.includes(`name="${cfg.honeypot}"`));
  assert.ok(html.includes(`action="${cfg.funnel.applyPath}"`));
  assert.ok(html.includes('method="post"'));
  // every option is a radio whose value is its label
  for (const o of OPTIONS.turnover) assert.ok(html.includes(`name="turnover_band" value="${o.replace(/&/g, '&amp;')}"`), o);
});

test('the rendered form writes answers and errors back, escaped', () => {
  const evil = '"><script>alert(1)</script>';
  const html = renderForm({
    copy, cfg,
    values: { company_name: evil, turnover_band: OPTIONS.turnover[3] },
    errors: { company_website: MSG.url },
    hidden: { lead_id: 'l_abc' },
  });
  assert.equal(html.includes('<script>alert(1)'), false);
  assert.ok(html.includes('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes(`<span>${MSG.url}</span>`));
  assert.ok(html.includes('value="l_abc"'));
  assert.ok(new RegExp(`name="turnover_band" value="${OPTIONS.turnover[3]}" checked`).test(html), 'the chosen option stays chosen');
});
