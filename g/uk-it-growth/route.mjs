/**
 * Which outcome a lead gets. Pure functions, no network: the Companies House lookup is
 * done elsewhere (netlify/functions/lead/companies-house.mjs) and handed in as a plain
 * profile, so every rule here can be tested with a table.
 *
 * The routes, in the order they are tried. The first that applies wins, so a firm that is
 * too small and also at capacity is "not a fit" (structural beats temporary):
 *
 *   not_a_fit   turnover under £1m; turnover £1m to under £2m or trading under two years
 *               with under £1,000 a month on marketing; a typical client worth under £10k;
 *               or (when turnover is not stated) accounts filed as micro-entity or dormant.
 *   not_now     no capacity for new clients in the next three months.
 *   review      a person has to look before a time is offered: turnover not stated, a
 *               client worth £10k to under £25k, £1m to under £2m or under two years with
 *               "I do not know" on marketing spend, the company not found in the register,
 *               the register unavailable, or an answer the register contradicts.
 *   fit         everything else.
 *
 * Changed 22 Oct 2026: a firm that says "I would rather not say" about turnover is still routed as
 * a firm of £2m to under £5m when its headcount (50 or more) and its monthly marketing budget
 * (£5,000 or more) both point well above the threshold. The reason "turnover_inferred" replaces
 * "turnover_2m_plus" so nobody reads it as stated. What the visitor wrote is never altered: the
 * lift is made here, inside the rules, and the payload keeps "I would rather not say".
 *
 * Changed 26 Oct 2026 (workshop Erlend and Sondre, document "Leadregler per landingsside"): turnover of
 * £1m to under £2m, and trading under two years, no longer refuse a firm that spends £1,000 or more a month
 * on marketing. With "I do not know" on marketing spend those firms go to review. With under £1,000 a month
 * they stay not a fit, now with the extra reason "spend_under_1k". Under £1m and a client worth under £10k
 * still refuse, whatever the budget.
 *
 * Deliberate reading, say so if it is wrong: a firm that claims £2m or more but files
 * micro-entity or dormant accounts is "review", not "not a fit". The accounts are
 * evidence against the claim, but a company can file late or be one of several in a
 * group, and rejecting a firm on that alone costs a real lead. It is one line to change:
 * search for ch_accounts_too_small below.
 */
import { OPTIONS } from './core.mjs';

const T = OPTIONS.turnover;
const TRADING = OPTIONS.trading;
const WORTH = OPTIONS.worth;
const CAPACITY = OPTIONS.capacity;
const PEOPLE = OPTIONS.people;
const SPEND = OPTIONS.spend;

const CLAIMS_THRESHOLD = new Set([T[2], T[3], T[4]]);
const NOT_STATED = T[5];

export const ROUTES = ['fit', 'review', 'not_now', 'not_a_fit'];

/** 50 or more people, and £5,000 or more a month on marketing: both have to hold. */
const LARGE_HEADCOUNT = new Set([PEOPLE[3], PEOPLE[4]]);
const SPENDS_5K = new Set([SPEND[2], SPEND[3]]);

/** Whether turnover was withheld but the other answers put the firm well above £2m. */
export function turnoverInferred(v) {
  return v.turnover_band === NOT_STATED && LARGE_HEADCOUNT.has(v.employees_or_fee_earners) && SPENDS_5K.has(v.marketing_spend);
}

/** The answers as the rules read them: a withheld turnover that is inferred counts as the £2m to under £5m band. */
function lift(v) {
  return turnoverInferred(v) ? Object.assign({}, v, { turnover_band: T[2] }) : v;
}

/** The page each route is sent to, relative to the funnel's address. */
export const PAGE_FOR = { fit: 'book', review: 'review', not_now: 'not-now', not_a_fit: 'not-a-fit' };

const DAY = 86400000;
const TWO_YEARS = 2 * 365.25 * DAY;

/* 26 Oct 2026: the marketing budget that lets a smaller or younger firm through. */
const SPEND_1K_PLUS = new Set([SPEND[1], SPEND[2], SPEND[3]]); // £1,000 or more a month
const SPEND_UNKNOWN = SPEND[4];
const UNDER_1M = T[0];
const T_1M_2M = T[1];
const UNDER_2Y = TRADING[0];

/** Whether a rule that the budget can lift applies to this firm: £1m to under £2m, or under two years. */
const liftable = (v) => v.turnover_band === T_1M_2M || v.trading_years === UNDER_2Y;

/** Reasons a firm is "not a fit" from what it said about itself. */
export function selfReport(v) {
  const reasons = [];
  const lowSpend = !SPEND_1K_PLUS.has(v.marketing_spend) && v.marketing_spend !== SPEND_UNKNOWN;
  if (v.turnover_band === UNDER_1M || (v.turnover_band === T_1M_2M && lowSpend)) reasons.push('turnover_below_2m');
  if (v.trading_years === UNDER_2Y && lowSpend) reasons.push('trading_under_2y');
  if (v.first_year_value === WORTH[0]) reasons.push('value_under_10k');
  // The budget decided at least one of the reasons above: say so, once.
  if (lowSpend && liftable(v)) reasons.push('spend_under_1k');
  return reasons;
}

/**
 * Whether the register has to be asked. Not when the answers alone already say "not a
 * fit", and not when the firm is simply at capacity, unless it did not state its turnover:
 * then the register decides between "not a fit" and "review".
 */
export function needsRegistry(v) {
  v = lift(v);
  if (selfReport(v).length) return false;
  if (v.capacity === CAPACITY[0] && v.turnover_band !== NOT_STATED) return false;
  return true;
}

const none = (t) => !t || t === 'null';
const isTiny = (t) => t === 'micro-entity' || t === 'dormant';

/**
 * What a matched company profile says about the answers.
 * profile: {number, name, status, created: 'YYYY-MM-DD', accounts_type}
 * Returns {check: 'ok' | 'mismatch', reasons: []}.
 */
export function assessProfile(v, profile, now) {
  v = lift(v);
  const reasons = [];
  const created = profile.created ? Date.parse(profile.created) : NaN;
  const age = Number.isFinite(created) ? (now.getTime() - created) : NaN;
  if (profile.status && profile.status !== 'active') reasons.push('ch_not_active');
  if (v.trading_years !== TRADING[0] && Number.isFinite(age) && age < TWO_YEARS) reasons.push('ch_younger_than_claimed');
  if (CLAIMS_THRESHOLD.has(v.turnover_band) && isTiny(profile.accounts_type)) reasons.push('ch_accounts_too_small');
  if (none(profile.accounts_type) && Number.isFinite(age) && age >= TWO_YEARS) reasons.push('ch_no_accounts');
  return { check: reasons.length ? 'mismatch' : 'ok', reasons };
}

/**
 * The decision. "ch" is what the register said: {check, reasons, profile}, where check is
 * 'skipped' (not asked), 'ok', 'not_found', 'timeout', 'mismatch' or 'off'.
 *
 * 'unchecked' means the funnel makes no register check at all (legal.registerCheck is false in config.json): a firm
 * whose own answers qualify is a fit and gets the calendar, with the reason "register_not_used" so nobody reads it as
 * checked. Turn the check on and the same firms go through the register again.
 *
 * 'off' means the register was deliberately not asked, on a preview only (see
 * registerSwitchedOff in netlify/functions/lead/index.mjs). It is never turned into 'ok': a
 * lead that would have been a fit is still a fit, but carries the reason "register_off" so
 * nobody reads it as checked.
 *
 * Returns {route, reasons}.
 */
export function decide(v, ch) {
  const registry = ch || { check: 'skipped', reasons: [] };
  const profile = registry.profile || {};
  const inferred = turnoverInferred(v) ? ['turnover_inferred'] : [];
  v = lift(v);

  const notAFit = selfReport(v);
  if (notAFit.length) return { route: 'not_a_fit', reasons: notAFit };
  if (v.turnover_band === NOT_STATED && registry.check !== 'skipped' && isTiny(profile.accounts_type)) {
    return { route: 'not_a_fit', reasons: ['ch_micro_or_dormant'] };
  }

  if (v.capacity === CAPACITY[0]) return { route: 'not_now', reasons: ['capacity_none'].concat(inferred) };

  const review = [];
  if (v.turnover_band === NOT_STATED) review.push('turnover_not_stated');
  if (v.turnover_band === T_1M_2M && v.marketing_spend === SPEND_UNKNOWN) review.push('turnover_1m_2m_spend_unknown');
  if (v.trading_years === UNDER_2Y && v.marketing_spend === SPEND_UNKNOWN) review.push('trading_under_2y_spend_unknown');
  if (v.first_year_value === WORTH[1]) review.push('value_10k_to_25k');
  if (registry.check === 'not_found') review.push('ch_not_found');
  else if (registry.check === 'timeout') review.push('ch_timeout');
  else if (registry.check === 'mismatch') review.push.apply(review, registry.reasons);
  if (review.length) {
    if (registry.check === 'off') review.push('register_off');
    return { route: 'review', reasons: inferred.concat(review) };
  }

  let turnover = 'turnover_2m_plus';
  if (inferred.length) turnover = 'turnover_inferred';
  else if (v.turnover_band === T_1M_2M) turnover = 'turnover_1m_2m_spend_1k';
  const fit = [turnover, v.trading_years === UNDER_2Y ? 'trading_under_2y_spend_1k' : 'trading_2y_plus'];
  if (profile.accounts_type) fit.push('ch_' + profile.accounts_type);
  if (registry.check === 'off') fit.push('register_off');
  if (registry.check === 'unchecked') fit.push('register_not_used');
  return { route: 'fit', reasons: fit };
}
