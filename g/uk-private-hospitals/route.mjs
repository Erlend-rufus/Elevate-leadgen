/**
 * Which outcome a lead of /g/uk-private-hospitals gets. Pure functions, no network, same shape as
 * g/uk-it-growth/route.mjs. The rules are the health brief of 17 Oct 2026 (section 6) with the
 * answers in the work document of 18 Oct 2026 (F6: first match wins in the order not a fit, not
 * now, review, fit; F7: turnover not stated is always review; F8: the self-pay bands), changed by
 * the workshop of 26 Oct 2026 (Erlend and Sondre, document "Leadregler per landingsside"):
 *
 *   - The threshold is £2m, not £5m: £2m to under £5m is a fit.
 *   - Under £2m is a fit when the group spends £3,000 or more a month on marketing, review when it
 *     says "I do not know", and not a fit under £3,000 a month (reasons turnover_below_2m, spend_under_3k).
 *   - Trading under two years, a first consultation worth under £500 (or "I do not know"), and no
 *     capacity next month no longer change the route. The answers are still asked and sent on.
 *
 *   not_a_fit   under £2m with under £3,000 a month on marketing, under 10% self-paying patients,
 *               or (when turnover is not stated and the register was asked) accounts filed as
 *               micro-entity or dormant.
 *   not_now     never, since 26 Oct 2026 (the route and its page stay, for the other funnels' shape).
 *   review      turnover not stated, under £2m with "I do not know" on marketing spend, self-pay
 *               share 10% to under 30% or unknown, only "Other" ticked as a specialty, or a register
 *               answer that is missing, late or contradicts the form.
 *   fit         everything else.
 *
 * Fertility gives no route of its own; it is flagged in the reasons (HFEA regulated, and the
 * dearest specialty in the case) so the task and the Slack post can say so.
 */
import { OPTIONS } from './core.mjs';

const T = OPTIONS.turnover;
const TRADING = OPTIONS.trading;
const SELF = OPTIONS.selfpay;
const SPEND = OPTIONS.spend;

const UNDER_2M = T[0];
const CLAIMS_THRESHOLD = new Set([T[1], T[2], T[3], T[4]]);
const NOT_STATED = T[5];
const SPEND_3K_PLUS = new Set([SPEND[1], SPEND[2], SPEND[3]]); // £3,000 or more a month
const SPEND_UNKNOWN = SPEND[4];

export const ROUTES = ['fit', 'review', 'not_now', 'not_a_fit'];
export const PAGE_FOR = { fit: 'book', review: 'review', not_now: 'not-now', not_a_fit: 'not-a-fit' };

const DAY = 86400000;
const TWO_YEARS = 2 * 365.25 * DAY;

const ticked = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

/** Reasons a group is "not a fit" from what it said about itself. */
export function selfReport(v) {
  const reasons = [];
  if (v.turnover_band === UNDER_2M && !SPEND_3K_PLUS.has(v.marketing_spend) && v.marketing_spend !== SPEND_UNKNOWN) {
    reasons.push('turnover_below_2m', 'spend_under_3k');
  }
  if (v.self_pay_share === SELF[0]) reasons.push('self_pay_under_10pc');
  return reasons;
}

/** Whether the register has to be asked. Capacity no longer decides anything, so only a self-reported no settles it. */
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

  const review = [];
  if (v.turnover_band === NOT_STATED) review.push('turnover_not_stated');
  if (v.turnover_band === UNDER_2M && v.marketing_spend === SPEND_UNKNOWN) review.push('turnover_under_2m_spend_unknown');
  if (v.self_pay_share === SELF[1]) review.push('self_pay_10_to_30pc');
  if (v.self_pay_share === SELF[4]) review.push('self_pay_unknown');
  if (specs.length && specs.every((s) => s === 'Other')) review.push('specialty_other_only');
  if (registry.check === 'not_found') review.push('ch_not_found');
  else if (registry.check === 'timeout') review.push('ch_timeout');
  else if (registry.check === 'mismatch') review.push.apply(review, registry.reasons);
  if (review.length) {
    if (registry.check === 'off') review.push('register_off');
    return { route: 'review', reasons: review.concat(flags) };
  }

  const fit = [
    v.turnover_band === UNDER_2M ? 'turnover_under_2m_spend_3k' : 'turnover_2m_plus',
    v.trading_years === TRADING[0] ? 'trading_under_2y_ok' : 'trading_2y_plus',
    'self_pay_30pc_plus',
  ];
  if (profile.accounts_type) fit.push('ch_' + profile.accounts_type);
  if (registry.check === 'off') fit.push('register_off');
  if (registry.check === 'unchecked') fit.push('register_not_used');
  return { route: 'fit', reasons: fit.concat(flags) };
}
