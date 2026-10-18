/**
 * The one definition of the application form and of what counts as a valid answer.
 *
 * It is run in two places and must stay identical in both:
 *   - in the browser, where the build inlines this file into the page with the word
 *     "export" removed, and
 *   - on the server, where netlify/functions/lead imports it.
 * So it has no imports, no DOM and no Node APIs. Anything that needs either belongs
 * in a different file. Wording is the board's (Claude Design, IT board v56), word for
 * word: do not edit a question, an option or a message to fit a layout.
 *
 * Field names are the keys of the payload sent to Zapier (see
 * netlify/functions/lead/payload.mjs), so a column in ClickUp and a field on this
 * page have one name each.
 */

export const SLUG = 'uk-it-growth';

/** Options in the order they appear on the form. A radio's value is its label. */
export const OPTIONS = {
  area: [
    'IT strategy and digital transformation',
    'Managed IT services',
    'Software development',
    'Data and AI',
    'Cybersecurity',
    'Other',
  ],
  turnover: ['Under £1m', '£1m to under £2m', '£2m to under £5m', '£5m to under £10m', '£10m or more', 'I would rather not say'],
  trading: ['Under two years', 'Two to five years', 'More than five years'],
  people: ['Under 10', '10 to 24', '25 to 49', '50 to 99', '100 or more'],
  spend: ['Under £1,000', '£1,000 to under £5,000', '£5,000 to under £15,000', '£15,000 or more', 'I do not know'],
  worth: ['Under £10k', '£10k to under £25k', '£25k to under £50k', '£50k to under £150k', '£150k or more'],
  cycle: ['Under four weeks', 'One to under three months', 'Three to six months', 'Over six months'],
  decider: ['Me', 'Me, with a co-founder or board', 'Someone else, I would bring them in', 'A procurement process'],
  capacity: ['None, we are at capacity', 'One to three', 'Four to ten', 'More than ten'],
};

/** The messages the form can show. The wording is the board's. */
export const MSG = {
  url: 'Please enter a valid website',
  required: 'Please complete this field',
  choice: 'Please choose one option',
  email: 'Please enter a valid work email',
};

export const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The thirteen steps. "field" is the name of the input and the payload key.
 * kind: url | text | choice | group. A group is one step with several inputs.
 */
export const STEPS = [
  { id: 'website', kind: 'url', field: 'company_website', q: 'Company website', max: 300 },
  { id: 'company', kind: 'text', field: 'company_name', q: 'Company name', ac: 'organization', max: 200 },
  {
    id: 'area', kind: 'choice', field: 'specialism', q: 'What is your main area of IT services?', options: 'area',
    other: { value: 'Other', field: 'specialism_other', placeholder: 'Please tell us', max: 120 },
  },
  { id: 'turnover', kind: 'choice', field: 'turnover_band', q: 'Roughly what did the business turn over in the last financial year?', options: 'turnover' },
  { id: 'trading', kind: 'choice', field: 'trading_years', q: 'How long has the business been trading?', options: 'trading' },
  { id: 'people', kind: 'choice', field: 'employees_or_fee_earners', q: 'How many people work in the business?', options: 'people' },
  { id: 'spend', kind: 'choice', field: 'marketing_spend', q: 'What does the business spend on marketing in a typical month, all channels?', options: 'spend' },
  {
    id: 'worth', kind: 'choice', field: 'first_year_value', q: 'What is a typical new client worth to you in the first year?',
    help: 'Include recurring fees, licences and any first-year project work.', options: 'worth',
  },
  { id: 'cycle', kind: 'choice', field: 'sales_cycle', q: 'How long does a typical sale take, from first meeting to signed?', options: 'cycle' },
  {
    id: 'target', kind: 'text', field: 'target_next_year', q: 'What turnover are you aiming for next year?', optional: true,
    help: 'Optional. It helps us prepare for the call.', max: 120,
  },
  { id: 'decider', kind: 'choice', field: 'decision_maker', q: 'Who would decide whether to work with us?', options: 'decider' },
  { id: 'capacity', kind: 'choice', field: 'capacity', q: 'How many new clients could you take on in the next three months?', options: 'capacity' },
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

/** Every input name on the form, in order, including the free-text part of "Other". */
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

/** The error for one step's answers, or {} when it is fine. "get" reads a value by field name. */
export function stepErrors(step, get) {
  var out = {};
  if (step.kind === 'url') {
    var u = tidy(get(step.field), step.max);
    if (!u || !URL_RE.test(u)) out[step.field] = MSG.url;
  } else if (step.kind === 'text') {
    if (!step.optional && !tidy(get(step.field), step.max)) out[step.field] = MSG.required;
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
 * All thirteen steps against a set of answers. "input" is a plain object of strings.
 * Returns {ok, errors, values}: errors by field name, and values cleaned for every
 * field (an empty string where nothing was answered, "Other" text only when "Other"
 * was chosen).
 */
export function validate(input) {
  var get = function (name) { return input ? input[name] : ''; };
  var errors = {};
  var values = {};
  STEPS.forEach(function (s) {
    Object.assign(errors, stepErrors(s, get));
    if (s.kind === 'group') {
      s.fields.forEach(function (f) { values[f.field] = tidy(get(f.field), f.max); });
    } else {
      values[s.field] = tidy(get(s.field), s.max || 200);
      if (s.other) {
        var other = values[s.field] === s.other.value ? tidy(get(s.other.field), s.other.max) : '';
        values[s.other.field] = other;
      }
    }
  });
  return { ok: Object.keys(errors).length === 0, errors: errors, values: values };
}
