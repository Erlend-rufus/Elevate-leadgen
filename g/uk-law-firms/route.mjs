/**
 * Which outcome a lead of /g/uk-law-firms gets. Pure functions, no network, same shape as
 * g/uk-it-growth/route.mjs. The rules are the solicitors brief of 16 Oct 2026 (section 6) with
 * the answers in the work document of 18 Oct 2026: F6 (first match wins: not a fit, not now,
 * review, fit), F7 (turnover not stated is always review), L5 (a client worth under £2,000 in
 * the first year is review, not a refusal) and L23 (personal injury on its own is not a fit).
 *
 *   not_a_fit   turnover under £2m, trading under two years, only "Personal injury" ticked, or
 *               (when turnover is not stated and the register was asked) micro-entity or
 *               dormant accounts.
 *   not_now     no capacity for new instructions next month.
 *   review      turnover not stated, a client worth under £2,000 in the first year, or a
 *               register answer that is missing, late or contradicts the form.
 *   fit         everything else.
 *
 * A firm that ticks personal injury together with other areas is routed on the other areas; the
 * reason "personal_injury_ticked" is kept so the agreement can leave those matters out.
 */
import { OPTIONS } from './core.mjs';

const T = OPTIONS.turnover;
const TRADING = OPTIONS.trading;
const WORTH = OPTIONS.worth;
const CAPACITY = OPTIONS.capacity;

const BELOW_THRESHOLD = new Set([T[0], T[1]]);
const CLAIMS_THRESHOLD = new Set([T[2], T[3], T[4]]);
const NOT_STATED = T[5];
const PI = 'Personal injury';

export const ROUTES = ['fit', 'review', 'not_now', 'not_a_fit'];
export const PAGE_FOR = { fit: 'book', review: 'review', not_now: 'not-now', not_a_fit: 'not-a-fit' };

const DAY = 86400000;
const TWO_YEARS = 2 * 365.25 * DAY;

const ticked = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

export function selfReport(v) {
  const reasons = [];
  const areas = ticked(v.practice_areas);
  if (BELOW_THRESHOLD.has(v.turnover_band)) reasons.push('turnover_below_2m');
  if (v.trading_years === TRADING[0]) reasons.push('trading_under_2y');
  if (areas.length && areas.every((a) => a === PI)) reasons.push('personal_injury_only');
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

export function decide(v, ch) {
  const registry = ch || { check: 'skipped', reasons: [] };
  const profile = registry.profile || {};
  const areas = ticked(v.practice_areas);
  const flags = areas.includes(PI) && !areas.every((a) => a === PI) ? ['personal_injury_ticked'] : [];

  const notAFit = selfReport(v);
  if (notAFit.length) return { route: 'not_a_fit', reasons: notAFit };
  if (v.turnover_band === NOT_STATED && registry.check !== 'skipped' && isTiny(profile.accounts_type)) {
    return { route: 'not_a_fit', reasons: ['ch_micro_or_dormant'].concat(flags) };
  }

  if (v.capacity === CAPACITY[0]) return { route: 'not_now', reasons: ['capacity_none'].concat(flags) };

  const review = [];
  if (v.turnover_band === NOT_STATED) review.push('turnover_not_stated');
  if (v.first_year_value === WORTH[0]) review.push('value_under_2k');
  if (registry.check === 'not_found') review.push('ch_not_found');
  else if (registry.check === 'timeout') review.push('ch_timeout');
  else if (registry.check === 'mismatch') review.push.apply(review, registry.reasons);
  if (review.length) {
    if (registry.check === 'off') review.push('register_off');
    return { route: 'review', reasons: review.concat(flags) };
  }

  const fit = ['turnover_2m_plus', 'trading_2y_plus'];
  if (profile.accounts_type) fit.push('ch_' + profile.accounts_type);
  if (registry.check === 'off') fit.push('register_off');
  if (registry.check === 'unchecked') fit.push('register_not_used');
  return { route: 'fit', reasons: fit.concat(flags) };
}
