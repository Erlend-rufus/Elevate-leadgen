/**
 * The message sent to Zapier. Fixed keys, in this order; a key that does not apply to a
 * campaign is sent empty, never left out, so a Zap mapping does not break when a campaign
 * lacks a question. The contract is written down in the project document "Løsning: eget
 * skjema, Zapier, ClickUp og Slack" (16 Oct 2026), section 3. Change it there first.
 * Four keys were added on 20 Oct 2026 for the health funnel (regulator_number, self_pay_share,
 * specialties, first_consultation_value); they are empty for the other campaigns.
 */
export const PAYLOAD_KEYS = [
  'lead_id', 'campaign', 'route', 'route_reason', 'submitted_at',
  'company_name', 'company_website', 'company_number',
  'ch_status', 'ch_accounts_type', 'ch_incorporated', 'ch_check',
  'specialism', 'practice_areas', 'sra_number',
  'regulator_number', 'self_pay_share', 'specialties', 'first_consultation_value',
  'turnover_band', 'trading_years', 'employees_or_fee_earners', 'marketing_spend',
  'first_year_value', 'sales_cycle', 'target_next_year', 'decision_maker', 'capacity',
  'first_name', 'last_name', 'job_title', 'email', 'mobile',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'page_slug', 'referrer',
];

const s = (v) => (v === null || v === undefined ? '' : String(v));

/**
 * v: cleaned answers (g/<campaign>/core.mjs validate().values). ch: {check, profile}.
 * tracking: utm_*, fbclid, referrer, page_slug.
 */
export function buildPayload({ leadId, campaign, route, reasons, submittedAt, values, ch, tracking }) {
  const v = values || {};
  const profile = (ch && ch.profile) || {};
  const specialism = v.specialism === 'Other' && v.specialism_other ? `Other: ${v.specialism_other}` : s(v.specialism);
  const out = {
    lead_id: leadId,
    campaign,
    route,
    route_reason: (reasons || []).join(', '),
    submitted_at: submittedAt,
    company_name: s(v.company_name),
    company_website: s(v.company_website),
    company_number: s(profile.number),
    ch_status: s(profile.status),
    ch_accounts_type: s(profile.accounts_type),
    ch_incorporated: s(profile.created),
    ch_check: s(ch && ch.check),
    specialism,
    practice_areas: s(v.practice_areas),
    sra_number: s(v.sra_number),
    regulator_number: s(v.regulator_number),
    self_pay_share: s(v.self_pay_share),
    specialties: s(v.specialties),
    first_consultation_value: s(v.first_consultation_value),
    turnover_band: s(v.turnover_band),
    trading_years: s(v.trading_years),
    employees_or_fee_earners: s(v.employees_or_fee_earners),
    marketing_spend: s(v.marketing_spend),
    first_year_value: s(v.first_year_value),
    sales_cycle: s(v.sales_cycle),
    target_next_year: s(v.target_next_year),
    decision_maker: s(v.decision_maker),
    capacity: s(v.capacity),
    first_name: s(v.first_name),
    last_name: s(v.last_name),
    job_title: s(v.job_title),
    email: s(v.email),
    mobile: s(v.mobile),
  };
  const t = tracking || {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'page_slug', 'referrer']
    .forEach((k) => { out[k] = s(t[k]); });
  // Same order as PAYLOAD_KEYS, and nothing else.
  const ordered = {};
  PAYLOAD_KEYS.forEach((k) => { ordered[k] = out[k] === undefined ? '' : out[k]; });
  return ordered;
}
