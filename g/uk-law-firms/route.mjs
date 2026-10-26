/**
 * Which outcome a lead of /g/uk-law-firms gets. Pure functions, no network, same shape as
 * g/uk-it-growth/route.mjs. The rules are the solicitors brief of 16 Oct 2026 (section 6) with
 * the answers in the work document of 18 Oct 2026: F6 (first match wins: not a fit, not now,
 * review, fit), F7 (turnover not stated is always review), L5 (a client worth under £2,000 in
 * the first year is review, not a refusal) and L23 (personal injury on its own is not a fit).
 *
 * Changed 22 Oct 2026, two loosenings for firms that are plainly large (the Ackroyd case):
 *   - A firm that says "I would rather not say" about turnover is routed as £2m to under £5m when it has
 *     30 or more people AND spends £5,000 or more a month on marketing. The reason "turnover_inferred"
 *     replaces "turnover_2m_plus". What the visitor wrote is not altered; the lift is made in here.
 *   - A first-year value under £2,000 is no longer a reason for review for a volume firm. The reason
 *     "value_under_2k_volume_firm" is kept as a flag.
 *
 * Changed 26 Oct 2026, the workshop of Erlend and Sondre (document "Leadregler per landingsside"):
 *   - £1m to under £2m is a fit (reason "turnover_1m_2m").
 *   - Under £1m asks one more question (core.mjs, low_turnover_budget): a firm that can put £2,000 a month
 *     into advertising goes on (reason "turnover_under_1m_budget_2k"); one that cannot is not a fit
 *     ("turnover_below_1m", "budget_2k_no").
 *   - Trading under two years and no capacity next month no longer change the route. Under two years is
 *     kept as the reason "trading_under_2y_ok" in place of "trading_2y_plus".
 *   - A volume firm, for a first-year value under £2,000, is 30 or more fee earners OR £2,000 or more a
 *     month on marketing (was £5,000). The marketing question gained a band at £2,000 for this.
 *     The "I would rather not say" lift still needs £5,000 or more a month.
 *
 *   not_a_fit   turnover under £1m without the £2,000 a month, only "Personal injury" ticked, or
 *               (when turnover is not stated and the register was asked) micro-entity or dormant
 *               accounts.
 *   not_now     never, since 26 Oct 2026 (the route and its page stay, for the other funnels' shape).
 *   review      turnover not stated, a client worth under £2,000 in the first year at a firm that is
 *               not a volume firm, or a register answer that is missing, late or contradicts the form.
 *   fit         everything else.
 *
 * A firm that ticks personal injury together with other areas is routed on the other areas; the
 * reason "personal_injury_ticked" is kept so the agreement can leave those matters out.
 */
import { OPTIONS } from './core.mjs';

const T = OPTIONS.turnover;
const TRADING = OPTIONS.trading;
const WORTH = OPTIONS.worth;
const PEOPLE = OPTIONS.people;
const SPEND = OPTIONS.spend;
const BUDGET = OPTIONS.budget;

const UNDER_1M = T[0];
const T_1M_2M = T[1];
const CLAIMS_THRESHOLD = new Set([T[2], T[3], T[4]]);
const NOT_STATED = T[5];
const PI = 'Personal injury';

export const ROUTES = ['fit', 'review', 'not_now', 'not_a_fit'];
export const PAGE_FOR = { fit: 'book', review: 'review', not_now: 'not-now', not_a_fit: 'not-a-fit' };

/* Bands by their words, not their place in the list: the list gained a band on 26 Oct 2026. */
const band = (label) => {
  if (SPEND.indexOf(label) < 0) throw new Error('uk-law-firms route: no marketing band "' + label + '"');
  return label;
};
const SPEND_2K_PLUS = new Set([band('£2,000 to under £5,000'), band('£5,000 to under £15,000'), band('£15,000 or more')]);
const SPEND_5K_PLUS = new Set([band('£5,000 to under £15,000'), band('£15,000 or more')]);

/** 30 or more fee earners. */
const LARGE_HEADCOUNT = (v) => v.employees_or_fee_earners === PEOPLE[3];

/** Whether turnover was withheld but headcount and marketing budget (both) put the firm well above £2m. */
export function turnoverInferred(v) {
  return v.turnover_band === NOT_STATED && LARGE_HEADCOUNT(v) && SPEND_5K_PLUS.has(v.marketing_spend);
}

/** The answers as the rules read them: a withheld turnover that is inferred counts as the £2m to under £5m band. */
function lift(v) {
  return turnoverInferred(v) ? Object.assign({}, v, { turnover_band: T[2] }) : v;
}

/** A low value per matter is normal for a firm that is big or spends £2,000 or more a month on marketing (either). */
const volumeFirm = (v) => LARGE_HEADCOUNT(v) || SPEND_2K_PLUS.has(v.marketing_spend);

/** Under £1m and able to put £2,000 a month into advertising. */
const budgetYes = (v) => v.low_turnover_budget === BUDGET[0];

const DAY = 86400000;
const TWO_YEARS = 2 * 365.25 * DAY;

const ticked = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

export function selfReport(v) {
  const reasons = [];
  const areas = ticked(v.practice_areas);
  if (v.turnover_band === UNDER_1M && !budgetYes(v)) reasons.push('turnover_below_1m', 'budget_2k_no');
  if (areas.length && areas.every((a) => a === PI)) reasons.push('personal_injury_only');
  return reasons;
}

/** Whether the register has to be asked. Capacity no longer decides anything, so only a self-reported no settles it. */
export function needsRegistry(v) {
  return selfReport(lift(v)).length === 0;
}

const none = (t) => !t || t === 'null';
const isTiny = (t) => t === 'micro-entity' || t === 'dormant';

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

export function decide(v, ch) {
  const registry = ch || { check: 'skipped', reasons: [] };
  const profile = registry.profile || {};
  const areas = ticked(v.practice_areas);
  const flags = areas.includes(PI) && !areas.every((a) => a === PI) ? ['personal_injury_ticked'] : [];
  const inferred = turnoverInferred(v) ? ['turnover_inferred'] : [];
  v = lift(v);

  const notAFit = selfReport(v);
  if (notAFit.length) return { route: 'not_a_fit', reasons: notAFit };
  if (v.turnover_band === NOT_STATED && registry.check !== 'skipped' && isTiny(profile.accounts_type)) {
    return { route: 'not_a_fit', reasons: ['ch_micro_or_dormant'].concat(flags) };
  }

  const review = [];
  if (v.turnover_band === NOT_STATED) review.push('turnover_not_stated');
  if (v.first_year_value === WORTH[0]) {
    if (volumeFirm(v)) flags.push('value_under_2k_volume_firm');
    else review.push('value_under_2k');
  }
  if (registry.check === 'not_found') review.push('ch_not_found');
  else if (registry.check === 'timeout') review.push('ch_timeout');
  else if (registry.check === 'mismatch') review.push.apply(review, registry.reasons);
  if (review.length) {
    if (registry.check === 'off') review.push('register_off');
    return { route: 'review', reasons: inferred.concat(review, flags) };
  }

  let turnover = 'turnover_2m_plus';
  if (inferred.length) turnover = 'turnover_inferred';
  else if (v.turnover_band === T_1M_2M) turnover = 'turnover_1m_2m';
  else if (v.turnover_band === UNDER_1M) turnover = 'turnover_under_1m_budget_2k';
  const fit = [turnover, v.trading_years === TRADING[0] ? 'trading_under_2y_ok' : 'trading_2y_plus'];
  if (profile.accounts_type) fit.push('ch_' + profile.accounts_type);
  if (registry.check === 'off') fit.push('register_off');
  if (registry.check === 'unchecked') fit.push('register_not_used');
  return { route: 'fit', reasons: fit.concat(flags) };
}
