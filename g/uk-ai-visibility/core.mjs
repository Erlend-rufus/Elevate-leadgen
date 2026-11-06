/**
 * The one definition of the application form of /g/uk-ai-visibility and of what counts as a valid
 * answer. Same shape as g/uk-law-firms/core.mjs, and the same rule: it runs in the browser (inlined
 * by the build with "export" removed) and on the server, so it has no imports, no DOM and no Node APIs.
 *
 * Built 6 Nov 2026 for the AI visibility retainer (GEO and ChatGPT ads, from £1,500 a month with £500
 * of ad spend included, month to month, 30 days' notice). The owner's rules: UK companies with £1m or
 * more in turnover, any sector. Every answer goes into an existing payload key (netlify/functions/lead/
 * payload.mjs), so the Zapier contract does not change: the sector is sent as "specialism".
 */

export const SLUG = 'uk-ai-visibility';

/** Options in the order they appear on the form. A choice's value is its label. */
export const OPTIONS = {
  sector: [
    'IT and technology',
    'Professional services',
    'Healthcare',
    'Legal',
    'Financial services',
    'Property and construction',
    'Manufacturing and engineering',
    'Retail and ecommerce',
    'Other',
  ],
  turnover: ['Under £1m', '£1m to under £2m', '£2m to under £5m', '£5m to under £10m', '£10m or more', 'I would rather not say'],
  people: ['Under 10', '10 to 49', '50 to 249', '250 or more'],
  spend: ['Under £1,000', '£1,000 to under £3,000', '£3,000 to under £10,000', '£10,000 or more', 'I do not know'],
  decider: ['Me', 'Me, with others in the business', 'Someone else, I would bring them in'],
};

/** The messages the form can show. */
export const MSG = {
  url: 'Please enter a valid website',
  required: 'Please complete this field',
  choice: 'Please choose one option',
  multi: 'Please choose at least one option',
  email: 'Please enter a valid work email',
  goal: 'Please tell us what you want from the meeting.',
};

export const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The nine steps. "field" is the name of the input and the payload key.
 * kind: url | text | choice | long | group. A group is one step with several inputs.
 */
export const STEPS = [
  { id: 'website', kind: 'url', field: 'company_website', q: 'Company website', max: 300 },
  { id: 'company', kind: 'text', field: 'company_name', q: 'Company name', ac: 'organization', max: 200 },
  { id: 'sector', kind: 'choice', field: 'specialism', q: 'Which sector are you in?', options: 'sector' },
  { id: 'turnover', kind: 'choice', field: 'turnover_band', q: "Roughly what was the company's turnover in the last financial year?", options: 'turnover' },
  { id: 'people', kind: 'choice', field: 'employees_or_fee_earners', q: 'How many people work in the company?', options: 'people' },
  { id: 'spend', kind: 'choice', field: 'marketing_spend', q: 'What does the company spend on marketing in a typical month?', options: 'spend' },
  { id: 'decider', kind: 'choice', field: 'decision_maker', q: 'Who would decide whether to work with us?', options: 'decider' },
  {
    id: 'goal', kind: 'long', field: 'meeting_goal', q: 'Which questions do your best clients ask before they buy?',
    help: 'One or two is enough. We put them to ChatGPT before the call.', min: 2, max: 600,
  },
  {
    id: 'details', kind: 'group', q: 'Your details',
    fields: [
      { field: 'first_name', label: 'First name', type: 'text', ac: 'given-name', im: 'text', wide: false, max: 80 },
      { field: 'last_name', label: 'Last name', type: 'text', ac: 'family-name', im: 'text', wide: false, max: 80 },
      { field: 'job_title', label: 'Job title', type: 'text', ac: 'organization-title', im: 'text', wide: true, max: 120 },
      { field: 'email', label: 'Work email', type: 'email', ac: 'email', im: 'email', wide: true, max: 254 },
      { field: 'mobile', label: 'Mobile (optional)', type: 'tel', ac: 'tel', im: 'tel', wide: true, optional: true, max: 40, help: 'Only used to arrange or confirm a time.' },
    ],
  },
];

/** Every input name on the form, in order. */
export const FIELDS = [].concat.apply([], STEPS.map(function (s) {
  if (s.kind === 'group') return s.fields.map(function (f) { return f.field; });
  return s.other ? [s.field, s.other.field] : [s.field];
}));

/** One value as typed: control characters out, ends trimmed, cut at max. Never throws. */
export function tidy(v, max) {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  var s = String(v);
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g, ' ').replace(/[\r\n\t]+/g, ' ');
  s = s.trim();
  return s.length > (max || 200) ? s.slice(0, max || 200).trim() : s;
}

/** Whether a step is asked: always, unless it has "when" and the earlier answer it names is not one of its values. */
export function applies(step, get) {
  if (!step.when) return true;
  return step.when.values.indexOf(tidy(get(step.when.field), 200)) >= 0;
}

/** The error for one step's answers, or {} when it is fine. "get" reads a value by field name. */
export function stepErrors(step, get) {
  var out = {};
  if (!applies(step, get)) return out;
  if (step.kind === 'url') {
    var u = tidy(get(step.field), step.max);
    if (!u || !URL_RE.test(u)) out[step.field] = MSG.url;
  } else if (step.kind === 'text') {
    if (!step.optional && !tidy(get(step.field), step.max)) out[step.field] = MSG.required;
  } else if (step.kind === 'long') {
    if (tidy(get(step.field), step.max).length < (step.min || 1)) out[step.field] = MSG.goal;
  } else if (step.kind === 'choice') {
    var c = tidy(get(step.field), 200);
    if (!c || OPTIONS[step.options].indexOf(c) < 0) out[step.field] = MSG.choice;
  } else if (step.kind === 'group') {
    step.fields.forEach(function (f) {
      var v = tidy(get(f.field), f.max);
      if (f.field === 'email') { if (!v || !EMAIL_RE.test(v)) out[f.field] = MSG.email; }
      else if (!f.optional && !v) out[f.field] = MSG.required;
    });
  }
  return out;
}

/**
 * All nine steps against a set of answers. "input" is a plain object of strings.
 * Returns {ok, errors, values}: errors by field name, values cleaned for every field.
 */
export function validate(input) {
  var get = function (name) { return input ? input[name] : ''; };
  var errors = {};
  var values = {};
  STEPS.forEach(function (s) {
    Object.assign(errors, stepErrors(s, get));
    if (!applies(s, get)) {
      values[s.field] = '';
    } else if (s.kind === 'group') {
      s.fields.forEach(function (f) { values[f.field] = tidy(get(f.field), f.max); });
    } else {
      values[s.field] = tidy(get(s.field), s.max || 200);
    }
  });
  return { ok: Object.keys(errors).length === 0, errors: errors, values: values };
}
