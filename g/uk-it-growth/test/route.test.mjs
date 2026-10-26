import test from 'node:test';
import assert from 'node:assert/strict';
import { route, core, GOOD, OPTIONS } from './helpers.mjs';

const { decide, needsRegistry, assessProfile, selfReport, ROUTES, PAGE_FOR } = route;
const T = OPTIONS.turnover, TR = OPTIONS.trading, W = OPTIONS.worth, C = OPTIONS.capacity, SP = OPTIONS.spend;
const LOW = { marketing_spend: SP[0] }; // under £1,000 a month: the budget does not lift a rule (26 Oct 2026)
const v = (over = {}) => core.validate(Object.assign({}, GOOD, over)).values;
const OK = { check: 'ok', reasons: [], profile: { number: '1', status: 'active', created: '2012-03-01', accounts_type: 'full' } };
const NOW = new Date('2026-10-19T09:00:00Z');

test('four routes, each with its own page', () => {
  assert.deepEqual(ROUTES, ['fit', 'review', 'not_now', 'not_a_fit']);
  assert.deepEqual(PAGE_FOR, { fit: 'book', review: 'review', not_now: 'not-now', not_a_fit: 'not-a-fit' });
});

test('a firm of the right size, age and value, with room, is a fit', () => {
  const r = decide(v(), OK);
  assert.equal(r.route, 'fit');
  assert.deepEqual(r.reasons, ['turnover_2m_plus', 'trading_2y_plus', 'ch_full']);
});

test('not a fit: turnover under £1m, whatever the marketing budget', () => {
  for (const s of SP) {
    const r = decide(v({ turnover_band: T[0], marketing_spend: s }), { check: 'skipped', reasons: [] });
    assert.equal(r.route, 'not_a_fit', s);
    assert.equal(r.reasons[0], 'turnover_below_2m', s);
  }
});

test('26 Oct 2026: £1m to under £2m is a fit with £1,000+ a month on marketing, review with "I do not know", not a fit under £1,000', () => {
  for (const s of [SP[1], SP[2], SP[3]]) {
    assert.deepEqual(decide(v({ turnover_band: T[1], marketing_spend: s }), OK), { route: 'fit', reasons: ['turnover_1m_2m_spend_1k', 'trading_2y_plus', 'ch_full'] }, s);
  }
  assert.deepEqual(decide(v({ turnover_band: T[1], marketing_spend: SP[4] }), OK), { route: 'review', reasons: ['turnover_1m_2m_spend_unknown'] });
  assert.deepEqual(decide(v({ turnover_band: T[1], marketing_spend: SP[0] }), OK), { route: 'not_a_fit', reasons: ['turnover_below_2m', 'spend_under_1k'] });
});

test('26 Oct 2026: under two years of trading is a fit with £1,000+ a month, review with "I do not know", not a fit under £1,000', () => {
  for (const s of [SP[1], SP[2], SP[3]]) {
    assert.deepEqual(decide(v({ trading_years: TR[0], marketing_spend: s }), OK), { route: 'fit', reasons: ['turnover_2m_plus', 'trading_under_2y_spend_1k', 'ch_full'] }, s);
  }
  assert.deepEqual(decide(v({ trading_years: TR[0], marketing_spend: SP[4] }), OK), { route: 'review', reasons: ['trading_under_2y_spend_unknown'] });
  assert.deepEqual(decide(v({ trading_years: TR[0], marketing_spend: SP[0] }), OK), { route: 'not_a_fit', reasons: ['trading_under_2y', 'spend_under_1k'] });
});

test('26 Oct 2026: both lifted rules at once, and the rules the budget never lifts', () => {
  assert.deepEqual(decide(v({ turnover_band: T[1], trading_years: TR[0] }), OK), { route: 'fit', reasons: ['turnover_1m_2m_spend_1k', 'trading_under_2y_spend_1k', 'ch_full'] });
  assert.deepEqual(decide(v({ turnover_band: T[1], trading_years: TR[0], marketing_spend: SP[4] }), OK),
    { route: 'review', reasons: ['turnover_1m_2m_spend_unknown', 'trading_under_2y_spend_unknown'] });
  assert.deepEqual(decide(v({ turnover_band: T[1], first_year_value: W[0], marketing_spend: SP[3] }), OK), { route: 'not_a_fit', reasons: ['value_under_10k'] });
  assert.deepEqual(decide(v({ turnover_band: T[1], first_year_value: W[1] }), OK), { route: 'review', reasons: ['value_10k_to_25k'] });
  assert.deepEqual(decide(v({ turnover_band: T[1], marketing_spend: SP[4], capacity: C[0] }), OK), { route: 'not_now', reasons: ['capacity_none'] }, 'not now still comes before review');
  assert.deepEqual(decide(v({ turnover_band: T[0], trading_years: TR[0], marketing_spend: SP[0] }), OK),
    { route: 'not_a_fit', reasons: ['turnover_below_2m', 'trading_under_2y', 'spend_under_1k'] });
});

test('not a fit: a typical client worth under £10k', () => {
  assert.deepEqual(decide(v({ first_year_value: W[0] }), OK), { route: 'not_a_fit', reasons: ['value_under_10k'] });
});

test('every self-reported reason is listed, not just the first', () => {
  const r = decide(v({ turnover_band: T[0], trading_years: TR[0], first_year_value: W[0], marketing_spend: SP[0] }), OK);
  assert.deepEqual(r.reasons, ['turnover_below_2m', 'trading_under_2y', 'value_under_10k', 'spend_under_1k']);
});

test('structural beats temporary: too small AND at capacity is not a fit, not "not now"', () => {
  assert.equal(decide(v({ turnover_band: T[0], capacity: C[0] }), OK).route, 'not_a_fit');
});

test('not now: no room for new clients in the next three months', () => {
  assert.deepEqual(decide(v({ capacity: C[0] }), OK), { route: 'not_now', reasons: ['capacity_none'] });
});

test('review: turnover not stated', () => {
  assert.deepEqual(decide(v({ turnover_band: T[5] }), OK), { route: 'review', reasons: ['turnover_not_stated'] });
});

test('review: a typical client worth £10k to under £25k', () => {
  assert.deepEqual(decide(v({ first_year_value: W[1] }), OK), { route: 'review', reasons: ['value_10k_to_25k'] });
});

test('review: the company is not in the register, or the register could not be reached', () => {
  assert.deepEqual(decide(v(), { check: 'not_found', reasons: [] }), { route: 'review', reasons: ['ch_not_found'] });
  assert.deepEqual(decide(v(), { check: 'timeout', reasons: [] }), { route: 'review', reasons: ['ch_timeout'] });
});

test('review: every reason is kept, in order', () => {
  const r = decide(v({ turnover_band: T[5], first_year_value: W[1] }), { check: 'not_found', reasons: [] });
  assert.deepEqual(r.reasons, ['turnover_not_stated', 'value_10k_to_25k', 'ch_not_found']);
});

test('not a fit: no turnover given and the register says micro-entity or dormant', () => {
  for (const t of ['micro-entity', 'dormant']) {
    const r = decide(v({ turnover_band: T[5] }), { check: 'ok', reasons: [], profile: { accounts_type: t, status: 'active', created: '2012-03-01' } });
    assert.deepEqual(r, { route: 'not_a_fit', reasons: ['ch_micro_or_dormant'] }, t);
  }
});

test('DISCLOSED DEVIATION: claims £2m or more but files micro-entity or dormant accounts is review, not not-a-fit', () => {
  const ch = { check: 'mismatch', reasons: ['ch_accounts_too_small'], profile: { accounts_type: 'micro-entity', status: 'active', created: '2012-03-01' } };
  for (const t of [T[2], T[3], T[4]]) assert.deepEqual(decide(v({ turnover_band: t }), ch), { route: 'review', reasons: ['ch_accounts_too_small'] }, t);
});

/* Changed 22 Oct 2026: turnover withheld, but 50+ people AND £5,000+ a month on marketing: routed as £2m to under £5m. */
const P = OPTIONS.people, S = OPTIONS.spend;
const big = (over = {}) => v(Object.assign({ turnover_band: T[5], employees_or_fee_earners: P[3], marketing_spend: S[2] }, over));

test('turnover inferred: withheld turnover, 50+ people and £5,000+ a month is a fit, with its own reason', () => {
  for (const [p, s] of [[P[3], S[2]], [P[3], S[3]], [P[4], S[2]], [P[4], S[3]]]) {
    assert.deepEqual(decide(big({ employees_or_fee_earners: p, marketing_spend: s }), OK), { route: 'fit', reasons: ['turnover_inferred', 'trading_2y_plus', 'ch_full'] }, p + ' / ' + s);
  }
  assert.equal(route.turnoverInferred(big()), true);
});

test('turnover inferred: needs both. Headcount alone, spend alone, or a stated turnover is not inferred', () => {
  for (const over of [{ employees_or_fee_earners: P[2] }, { marketing_spend: S[1] }, { marketing_spend: S[4] }, { employees_or_fee_earners: P[0], marketing_spend: S[3] }]) {
    assert.deepEqual(decide(big(over), OK), { route: 'review', reasons: ['turnover_not_stated'] }, JSON.stringify(over));
    assert.equal(route.turnoverInferred(big(over)), false);
  }
  assert.equal(route.turnoverInferred(big({ turnover_band: T[2] })), false, 'a stated turnover is never marked as inferred');
  assert.deepEqual(decide(big({ turnover_band: T[2] }), OK).reasons, ['turnover_2m_plus', 'trading_2y_plus', 'ch_full']);
});

test('turnover inferred: the other rules still apply, in the same order', () => {
  assert.deepEqual(decide(big({ trading_years: TR[0] }), OK), { route: 'fit', reasons: ['turnover_inferred', 'trading_under_2y_spend_1k', 'ch_full'] }, '£5,000+ a month lifts the two-year rule too');
  assert.deepEqual(decide(big({ first_year_value: W[0] }), OK), { route: 'not_a_fit', reasons: ['value_under_10k'] });
  assert.deepEqual(decide(big({ first_year_value: W[1] }), OK), { route: 'review', reasons: ['turnover_inferred', 'value_10k_to_25k'] });
  assert.deepEqual(decide(big({ capacity: C[0] }), OK), { route: 'not_now', reasons: ['capacity_none', 'turnover_inferred'] });
  assert.deepEqual(decide(big(), { check: 'not_found', reasons: [] }), { route: 'review', reasons: ['turnover_inferred', 'ch_not_found'] });
});

test('turnover inferred: micro-entity or dormant accounts are evidence against the inference, so review, not not-a-fit', () => {
  const profile = { number: '1', status: 'active', created: '2012-03-01', accounts_type: 'micro-entity' };
  const ch = assessProfile(big(), profile, NOW);
  assert.deepEqual(ch.reasons, ['ch_accounts_too_small']);
  assert.deepEqual(decide(big(), Object.assign({ profile }, ch)), { route: 'review', reasons: ['turnover_inferred', 'ch_accounts_too_small'] });
});

test('turnover inferred: the register is asked as for a stated £2m+ firm, and the answer the visitor gave is never changed', () => {
  assert.equal(needsRegistry(big()), true);
  assert.equal(needsRegistry(big({ capacity: C[0] })), false, 'at capacity and inferred: no register call, as for a stated turnover');
  assert.equal(needsRegistry(v({ turnover_band: T[5], capacity: C[0] })), true, 'not inferred and at capacity: the register still decides');
  const values = big();
  decide(values, OK); assessProfile(values, OK.profile, NOW); needsRegistry(values);
  assert.equal(values.turnover_band, T[5], 'the stored answer stays "I would rather not say"');
});

test('the register can only add reasons for a person to look; it never turns a self-reported no into a yes', () => {
  for (const ch of [OK, { check: 'not_found', reasons: [] }, { check: 'timeout', reasons: [] }, { check: 'skipped', reasons: [] }]) {
    assert.equal(decide(v(Object.assign({ turnover_band: T[1] }, LOW)), ch).route, 'not_a_fit');
    assert.equal(decide(v(Object.assign({ trading_years: TR[0] }, LOW)), ch).route, 'not_a_fit');
  }
});

test('a missing registry result is treated as not asked', () => {
  assert.equal(decide(v(), undefined).route, 'fit');
  assert.equal(decide(v(), null).route, 'fit');
});

test('selfReport() looks only at what the firm said', () => {
  assert.deepEqual(selfReport(v()), []);
  assert.deepEqual(selfReport(v({ turnover_band: T[5] })), []);
  assert.deepEqual(selfReport(v({ capacity: C[0] })), []);
});

test('the register is asked only when the answers alone do not settle it', () => {
  assert.equal(needsRegistry(v()), true);
  assert.equal(needsRegistry(v({ turnover_band: T[0] })), false, 'already not a fit');
  assert.equal(needsRegistry(v(Object.assign({ trading_years: TR[0] }, LOW))), false);
  assert.equal(needsRegistry(v({ trading_years: TR[0] })), true, 'under two years with £1,000+ a month is not settled by the answers');
  assert.equal(needsRegistry(v({ first_year_value: W[0] })), false);
  assert.equal(needsRegistry(v({ capacity: C[0] })), false, 'at capacity: not now, whatever the register says');
  assert.equal(needsRegistry(v({ capacity: C[0], turnover_band: T[5] })), true, 'unless turnover is unstated: then the register decides between not a fit and review');
});

test('assessProfile: an active, old enough company with accounts matches', () => {
  assert.deepEqual(assessProfile(v(), { status: 'active', created: '2012-03-01', accounts_type: 'full' }, NOW), { check: 'ok', reasons: [] });
});

test('assessProfile: not active', () => {
  for (const s of ['dissolved', 'liquidation', 'administration']) {
    assert.deepEqual(assessProfile(v(), { status: s, created: '2012-03-01', accounts_type: 'full' }, NOW).reasons, ['ch_not_active'], s);
  }
});

test('assessProfile: younger than the firm claims', () => {
  const r = assessProfile(v({ trading_years: TR[2] }), { status: 'active', created: '2025-06-01', accounts_type: 'full' }, NOW);
  assert.deepEqual(r, { check: 'mismatch', reasons: ['ch_younger_than_claimed'] });
  const justInside = assessProfile(v({ trading_years: TR[1] }), { status: 'active', created: '2024-11-19', accounts_type: 'full' }, NOW);
  assert.equal(justInside.check, 'mismatch', 'eleven months short of two years');
  const justOutside = assessProfile(v({ trading_years: TR[1] }), { status: 'active', created: '2024-09-19', accounts_type: 'full' }, NOW);
  assert.equal(justOutside.check, 'ok', 'a month beyond two years');
  const old = assessProfile(v({ trading_years: TR[1] }), { status: 'active', created: '2020-01-01', accounts_type: 'full' }, NOW);
  assert.equal(old.check, 'ok');
});

test('assessProfile: a company a firm admits is new is not checked for age', () => {
  const r = assessProfile(v({ trading_years: TR[0] }), { status: 'active', created: '2026-01-01', accounts_type: '' }, NOW);
  assert.equal(r.check, 'ok');
});

test('assessProfile: small accounts against a claim of £2m or more', () => {
  for (const t of ['micro-entity', 'dormant']) {
    assert.deepEqual(assessProfile(v({ turnover_band: T[3] }), { status: 'active', created: '2012-03-01', accounts_type: t }, NOW).reasons, ['ch_accounts_too_small'], t);
  }
  assert.equal(assessProfile(v({ turnover_band: T[3] }), { status: 'active', created: '2012-03-01', accounts_type: 'small' }, NOW).check, 'ok');
});

test('assessProfile: no accounts filed on a company older than two years', () => {
  for (const a of ['', null, undefined, 'null']) {
    assert.deepEqual(assessProfile(v(), { status: 'active', created: '2012-03-01', accounts_type: a }, NOW).reasons, ['ch_no_accounts'], String(a));
  }
  assert.equal(assessProfile(v(), { status: 'active', created: '2026-03-01', accounts_type: '' }, NOW).reasons.includes('ch_no_accounts'), false, 'a new company has not had to file yet');
});

test('assessProfile: a profile with no usable date does not invent an age problem', () => {
  assert.equal(assessProfile(v(), { status: 'active', created: '', accounts_type: 'full' }, NOW).check, 'ok');
  assert.equal(assessProfile(v(), { status: 'active', created: 'not a date', accounts_type: 'full' }, NOW).check, 'ok');
});

test('assessProfile: several problems are all reported', () => {
  const r = assessProfile(v({ trading_years: TR[2], turnover_band: T[3] }), { status: 'dissolved', created: '2025-06-01', accounts_type: 'dormant' }, NOW);
  assert.deepEqual(r.reasons, ['ch_not_active', 'ch_younger_than_claimed', 'ch_accounts_too_small']);
});

test('register off: a firm that would be a fit is a fit, marked as unchecked, and never as checked', () => {
  const off = { check: 'off', reasons: [] };
  assert.deepEqual(decide(v(), off), { route: 'fit', reasons: ['turnover_2m_plus', 'trading_2y_plus', 'register_off'] });
  assert.deepEqual(decide(v({ turnover_band: T[5] }), off), { route: 'review', reasons: ['turnover_not_stated', 'register_off'] });
  assert.deepEqual(decide(v({ first_year_value: W[1] }), off), { route: 'review', reasons: ['value_10k_to_25k', 'register_off'] });
  // what the answers alone decide is untouched
  assert.deepEqual(decide(v({ turnover_band: T[0] }), off), { route: 'not_a_fit', reasons: ['turnover_below_2m'] });
  assert.deepEqual(decide(v({ capacity: C[0] }), off), { route: 'not_now', reasons: ['capacity_none'] });
  // the marker appears only when the register was switched off
  for (const ch of [OK, { check: 'skipped', reasons: [] }, { check: 'not_found', reasons: [] }, { check: 'timeout', reasons: [] }]) {
    assert.equal(decide(v(), ch).reasons.includes('register_off'), false, ch.check);
  }
});

test('the full table: one line per outcome the board promises', () => {
  const table = [
    // answers,                                   register,                                      route,        first reason
    [{},                                          OK,                                            'fit',        'turnover_2m_plus'],
    [{ turnover_band: T[0] },                     OK,                                            'not_a_fit',  'turnover_below_2m'],
    [{ trading_years: TR[0], marketing_spend: SP[0] }, OK,                                       'not_a_fit',  'trading_under_2y'],
    [{ turnover_band: T[1], marketing_spend: SP[0] }, OK,                                        'not_a_fit',  'turnover_below_2m'],
    [{ turnover_band: T[1] },                     OK,                                            'fit',        'turnover_1m_2m_spend_1k'],
    [{ turnover_band: T[1], marketing_spend: SP[4] }, OK,                                        'review',     'turnover_1m_2m_spend_unknown'],
    [{ first_year_value: W[0] },                  OK,                                            'not_a_fit',  'value_under_10k'],
    [{ capacity: C[0] },                          OK,                                            'not_now',    'capacity_none'],
    [{ turnover_band: T[5] },                     OK,                                            'review',     'turnover_not_stated'],
    [{ first_year_value: W[1] },                  OK,                                            'review',     'value_10k_to_25k'],
    [{},                                          { check: 'not_found', reasons: [] },          'review',     'ch_not_found'],
    [{},                                          { check: 'timeout', reasons: [] },            'review',     'ch_timeout'],
    [{ turnover_band: T[5] }, { check: 'ok', reasons: [], profile: { accounts_type: 'dormant' } }, 'not_a_fit', 'ch_micro_or_dormant'],
  ];
  for (const [a, ch, want, reason] of table) {
    const r = decide(v(a), ch);
    assert.equal(r.route, want, JSON.stringify(a) + ' / ' + ch.check);
    assert.equal(r.reasons[0], reason, JSON.stringify(a));
  }
});

test('unchecked (no register check in this funnel): a qualifying firm is a fit with the reason register_not_used; the other rules are unchanged', () => {
  const un = { check: 'unchecked', reasons: [] };
  assert.deepEqual(decide(v(), un), { route: 'fit', reasons: ['turnover_2m_plus', 'trading_2y_plus', 'register_not_used'] });
  assert.equal(decide(v({ turnover_band: T[5] }), un).route, 'review');
  assert.equal(decide(v(Object.assign({ turnover_band: T[1] }, LOW)), un).route, 'not_a_fit');
  assert.equal(decide(v({ turnover_band: T[1] }), un).route, 'fit');
  assert.equal(decide(v({ capacity: OPTIONS.capacity[0] }), un).route, 'not_now');
});
