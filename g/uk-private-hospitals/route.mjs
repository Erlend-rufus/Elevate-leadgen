/**
 * Which outcome a lead of /g/uk-private-hospitals gets. Pure functions, no network, same shape as
 * g/uk-it-growth/route.mjs. The rules are the health brief of 17 Oct 2026 (section 6) with the
 * answers in the work document of 18 Oct 2026 (F6: first match wins in the order not a fit, not
 * now, review, fit; F7: turnover not stated is always review; F8: the self-pay bands).
 *
 *   not_a_fit   turnover under £5m, trading under two years, under 10% self-paying patients,
 *               an attended first consultation worth under £500, or (when turnover is not
 *               stated and the register was asked) accounts filed as micro-entity or dormant.
 *   not_now     no capacity for more consultations next month.
 *   review      turnover not stated, self-pay share 10% to under 30% or unknown, consultation
 *               value unknown, only "Other" ticked as a specialty, or a register answer that
 *               is missing, late or contradicts the form.
 *   fit         everything else.
 *
 * Fertility gives no route of its own; it is flagged in the reasons (HFEA regulated, and the
 * dearest specialty in the case) so the task and the Slack post can say so.
 */
import { OPTIONS } from './core.mjs';

const T = OPTIONS.turnover;
const TRADING = OPTIONS.trading;
const SELF = OPTIONS.selfpay;
const WORTH = OPTIONS.worth;
const CAPACITY = OPTIONS.capacity;

const BELOW_THRESHOLD = new Set([T[0], T[1]]);
const CLAIMS_THRESHOLD = new Set([T[2], T[3], T[4]]);
const NOT_STATED = T[5];

export const ROUTES = ['fit', 'review', 'not_now', 'not_a_fit'];
export const PAGE_FOR = { fit: 'book', review: 'review', not_now: 'not-now', not_a_fit: 'not-a-fit' };

const DAY = 86400000;
const TWO_YEARS = 2 * 365.25 * DAY;

const ticked = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

/** Reasons a group is "not a fit" from what it said about itself. */
export function selfReport(v) {
  const reasons = [];
  if (BELOW_THRESHOLD.has(v.turnover_band)) reasons.push('turnover_below_5m');
  if (v.trading_years === TRADING[0]) reasons.push('trading_under_2y');
  if (v.self_pay_share === SELF[0]) reasons.push('self_pay_under_10pc');
  if (v.first_consultation_value === WORTH[0]) reasons.push('value_under_500');
  return reasons;
}

export function needsRegistry(v) {
  if (selfReport(v).length) return false;
  if (v.capacity === CAPACITY[0] && v.turnover_band !== NOT_STATED) return false;
  return true;
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

/** The decision. "ch" is what the register said; see g/uk-it-growth/route.mjs for the values. */
export function decide(v, ch) {
  const registry = ch || { check: 'skipped', reasons: [] };
  const profile = registry.profile || {};
  const specs = ticked(v.specialties);
  const flags = specs.includes('Fertility') ? ['fertility'] : [];

  const notAFit = selfReport(v);
  if (notAFit.length) return { route: 'not_a_fit', reasons: notAFit.concat(flags) };
  if (v.turnover_band === NOT_STATED && registry.check !== 'skipped' && isTiny(profile.accounts_type)) {
    return { route: 'not_a_fit', reasons: ['ch_micro_or_dormant'].concat(flags) };
  }

  if (v.capacity === CAPACITY[0]) return { route: 'not_now', reasons: ['capacity_none'].concat(flags) };

  const review = [];
  if (v.turnover_band === NOT_STATED) review.push('turnover_not_stated');
  if (v.self_pay_share === SELF[1]) review.push('self_pay_10_to_30pc');
  if (v.self_pay_share === SELF[4]) review.push('self_pay_unknown');
  if (v.first_consultation_value === WORTH[4]) review.push('value_unknown');
  if (specs.length && specs.every((s) => s === 'Other')) review.push('specialty_other_only');
  if (registry.check === 'not_found') review.push('ch_not_found');
  else if (registry.check === 'timeout') review.push('ch_timeout');
  else if (registry.check === 'mismatch') review.push.apply(review, registry.reasons);
  if (review.length) {
    if (registry.check === 'off') review.push('register_off');
    return { route: 'review', reasons: review.concat(flags) };
  }

  const fit = ['turnover_5m_plus', 'trading_2y_plus', 'self_pay_30pc_plus'];
  if (profile.accounts_type) fit.push('ch_' + profile.accounts_type);
  if (registry.check === 'off') fit.push('register_off');
  if (registry.check === 'unchecked') fit.push('register_not_used');
  return { route: 'fit', reasons: fit.concat(flags) };
}
