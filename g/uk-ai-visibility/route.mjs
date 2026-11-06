/**
 * Which outcome a lead of /g/uk-ai-visibility gets. Pure functions, no network, same shape as
 * g/uk-law-firms/route.mjs. The owner's rules (6 Nov 2026): UK companies with £1m or more in turnover,
 * any sector, a retainer from £1,500 a month.
 *
 *   not_a_fit   turnover under £1m, or (when turnover is not stated and the register was asked)
 *               micro-entity or dormant accounts.
 *   not_now     never (the route and its page stay, for the other funnels' shape).
 *   review      turnover not stated (unless 50 or more people and £3,000 or more a month on marketing,
 *               which is read as £1m or more: "turnover_inferred"), or a register answer that is missing,
 *               late or contradicts the form.
 *   fit         everything else.
 *
 * Flags, kept with the reasons and shown in ClickUp and Slack, never a reason to refuse:
 *   legal_no_chatgpt_ads   OpenAI does not take ads for legal services, so the package is the search work only.
 *   health_ads_check       OpenAI takes some health ads and not others: check before the call.
 */
import { OPTIONS } from './core.mjs';

const T = OPTIONS.turnover;
const PEOPLE = OPTIONS.people;
const SPEND = OPTIONS.spend;

const UNDER_1M = T[0];
const NOT_STATED = T[5];
const CLAIMS_THRESHOLD = new Set([T[2], T[3], T[4]]);

export const ROUTES = ['fit', 'review', 'not_now', 'not_a_fit'];
export const PAGE_FOR = { fit: 'book', review: 'review', not_now: 'not-now', not_a_fit: 'not-a-fit' };

const band = (label) => {
  if (SPEND.indexOf(label) < 0) throw new Error('uk-ai-visibility route: no marketing band "' + label + '"');
  return label;
};
const SPEND_3K_PLUS = new Set([band('£3,000 to under £10,000'), band('£10,000 or more')]);
const LARGE = new Set([PEOPLE[2], PEOPLE[3]]);

/** Whether turnover was withheld but headcount and marketing budget (both) put the company at £1m or more. */
export function turnoverInferred(v) {
  return v.turnover_band === NOT_STATED && LARGE.has(v.employees_or_fee_earners) && SPEND_3K_PLUS.has(v.marketing_spend);
}

function lift(v) {
  return turnoverInferred(v) ? Object.assign({}, v, { turnover_band: T[1] }) : v;
}

function flagsOf(v) {
  const out = [];
  if (v.specialism === 'Legal') out.push('legal_no_chatgpt_ads');
  if (v.specialism === 'Healthcare') out.push('health_ads_check');
  return out;
}

export function selfReport(v) {
  return v.turnover_band === UNDER_1M ? ['turnover_below_1m'] : [];
}

/** Whether the register has to be asked: only when the answers do not settle it by themselves. */
export function needsRegistry(v) {
  return selfReport(lift(v)).length === 0;
}

const DAY = 86400000;
const TWO_YEARS = 2 * 365.25 * DAY;
const none = (t) => !t || t === 'null';
const isTiny = (t) => t === 'micro-entity' || t === 'dormant';

export function assessProfile(v, profile, now) {
  v = lift(v);
  const reasons = [];
  const created = profile.created ? Date.parse(profile.created) : NaN;
  const age = Number.isFinite(created) ? (now.getTime() - created) : NaN;
  if (profile.status && profile.status !== 'active') reasons.push('ch_not_active');
  if (CLAIMS_THRESHOLD.has(v.turnover_band) && isTiny(profile.accounts_type)) reasons.push('ch_accounts_too_small');
  if (none(profile.accounts_type) && Number.isFinite(age) && age >= TWO_YEARS) reasons.push('ch_no_accounts');
  return { check: reasons.length ? 'mismatch' : 'ok', reasons };
}

export function decide(v, ch) {
  const registry = ch || { check: 'skipped', reasons: [] };
  const profile = registry.profile || {};
  const flags = flagsOf(v);
  const inferred = turnoverInferred(v) ? ['turnover_inferred'] : [];
  v = lift(v);

  const notAFit = selfReport(v);
  if (notAFit.length) return { route: 'not_a_fit', reasons: notAFit };
  if (v.turnover_band === NOT_STATED && registry.check !== 'skipped' && isTiny(profile.accounts_type)) {
    return { route: 'not_a_fit', reasons: ['ch_micro_or_dormant'] };
  }

  const review = [];
  if (v.turnover_band === NOT_STATED) review.push('turnover_not_stated');
  if (registry.check === 'not_found') review.push('ch_not_found');
  else if (registry.check === 'timeout') review.push('ch_timeout');
  else if (registry.check === 'mismatch') review.push.apply(review, registry.reasons);
  if (review.length) {
    if (registry.check === 'off') review.push('register_off');
    return { route: 'review', reasons: inferred.concat(review, flags) };
  }

  const fit = [inferred.length ? 'turnover_inferred' : (v.turnover_band === T[1] ? 'turnover_1m_2m' : 'turnover_2m_plus')];
  if (profile.accounts_type) fit.push('ch_' + profile.accounts_type);
  if (registry.check === 'off') fit.push('register_off');
  if (registry.check === 'unchecked') fit.push('register_not_used');
  return { route: 'fit', reasons: fit.concat(flags) };
}
