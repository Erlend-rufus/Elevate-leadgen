/**
 * Which outcome a lead of /g/uk-google-ads gets. Pure functions, no network, same shape as
 * g/uk-law-google-ads/route.mjs, which it was cloned from on 27 Nov 2026.
 *
 * The rule of the Norwegian page it copies: we only take businesses that can put enough into Google Ads
 * for a fixed fee to make sense (there 30,000 kr a month, here £2,000).
 *
 *   not_a_fit   cannot put £2,000 a month into Google Ads and turns over under £1m, or (when turnover is
 *               not stated and the register was asked) micro-entity or dormant accounts.
 *   not_now     never (the route and its page stay, for the other funnels' shape).
 *   review      cannot put £2,000 a month in but turns over £1m or more or did not say, turnover not stated,
 *               a customer worth under £500 in the first year, or a register answer that is missing, late
 *               or contradicts the form.
 *   fit         everything else.
 */
import { OPTIONS } from './core.mjs';

const T = OPTIONS.turnover;
const TRADING = OPTIONS.trading;
const WORTH = OPTIONS.worth;
const BUDGET = OPTIONS.budget;

const UNDER_1M = T[0];
const T_1M_2M = T[1];
const CLAIMS_THRESHOLD = new Set([T[2], T[3], T[4]]);
const NOT_STATED = T[5];

export const ROUTES = ['fit', 'review', 'not_now', 'not_a_fit'];
export const PAGE_FOR = { fit: 'book', review: 'review', not_now: 'not-now', not_a_fit: 'not-a-fit' };

const budgetYes = (v) => v.low_turnover_budget === BUDGET[0];

const DAY = 86400000;
const TWO_YEARS = 2 * 365.25 * DAY;

export function turnoverInferred() {
  return false;
}

export function selfReport(v) {
  if (v.turnover_band === UNDER_1M && !budgetYes(v)) return ['turnover_below_1m', 'budget_2k_no'];
  return [];
}

export function needsRegistry(v) {
  return selfReport(v).length === 0;
}

const none = (t) => !t || t === 'null';
const isTiny = (t) => t === 'micro-entity' || t === 'dormant';

export function assessProfile(v, profile, now) {
  const reasons = [];
  const created = profile.created ? Date.parse(profile.created) : NaN;
  const age = Number.isFinite(created) ? (now.getTime() - created) : NaN;
  if (profile.status && profile.status !== 'active') reasons.push('ch_not_active');
  if (v.trading_years !== TRADING[0] && Number.isFinite(age) && age < TWO_YEARS) reasons.push('ch_younger_than_claimed');
  if (CLAIMS_THRESHOLD.has(v.turnover_band) && isTiny(profile.accounts_type)) reasons.push('ch_accounts_too_small');
  if (none(profile.accounts_type) && Number.isFinite(age) && age >= TWO_YEARS) reasons.push('ch_no_accounts');
  return { check: reasons.length ? 'mismatch' : 'ok', reasons };
}

export function decide(v, ch) {
  const registry = ch || { check: 'skipped', reasons: [] };
  const profile = registry.profile || {};

  const notAFit = selfReport(v);
  if (notAFit.length) return { route: 'not_a_fit', reasons: notAFit };
  if (v.turnover_band === NOT_STATED && registry.check !== 'skipped' && isTiny(profile.accounts_type)) {
    return { route: 'not_a_fit', reasons: ['ch_micro_or_dormant'] };
  }

  const review = [];
  if (!budgetYes(v)) review.push('budget_2k_no');
  if (v.turnover_band === NOT_STATED) review.push('turnover_not_stated');
  if (v.first_year_value === WORTH[0]) review.push('value_under_500');
  if (registry.check === 'not_found') review.push('ch_not_found');
  else if (registry.check === 'timeout') review.push('ch_timeout');
  else if (registry.check === 'mismatch') review.push.apply(review, registry.reasons);
  if (review.length) {
    if (registry.check === 'off') review.push('register_off');
    return { route: 'review', reasons: review };
  }

  let turnover = 'turnover_2m_plus';
  if (v.turnover_band === T_1M_2M) turnover = 'turnover_1m_2m';
  else if (v.turnover_band === UNDER_1M) turnover = 'turnover_under_1m_budget_2k';
  const fit = [turnover, v.trading_years === TRADING[0] ? 'trading_under_2y_ok' : 'trading_2y_plus'];
  if (profile.accounts_type) fit.push('ch_' + profile.accounts_type);
  if (registry.check === 'off') fit.push('register_off');
  if (registry.check === 'unchecked') fit.push('register_not_used');
  return { route: 'fit', reasons: fit };
}
