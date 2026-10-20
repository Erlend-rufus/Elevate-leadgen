/**
 * The one definition of the application form of /g/uk-private-hospitals and of what counts as a
 * valid answer. Same shape as g/uk-it-growth/core.mjs, and the same rule: it runs in the browser
 * (inlined by the build with "export" removed) and on the server, so it has no imports, no DOM
 * and no Node APIs. Wording is the health board's (Claude Design, Version 7, 18 Oct 2026) with
 * the answers in the work document of 18 Oct 2026 (F1, F5, F9, L36 style bands).
 *
 * Field names are the keys of the payload sent to Zapier (netlify/functions/lead/payload.mjs).
 * One question, "specialties", lets the visitor tick several options (kind: multi); its value is
 * the ticked options joined with ", ".
 */

export const SLUG = 'uk-private-hospitals';

/** Options in the order they appear on the form. A choice's value is its label. */
export const OPTIONS = {
  turnover: ['Under £2m', '£2m to under £5m', '£5m to under £10m', '£10m to under £25m', '£25m or more', 'I would rather not say'],
  trading: ['Under two years', 'Two to five years', 'More than five years'],
  selfpay: ['Under 10%', '10% to under 30%', '30% to under 60%', '60% or more', 'I do not know'],
  specialties: ['Gynaecology', 'Urology', 'Orthopaedics', 'Dermatology', 'Diagnostics and imaging', 'Fertility', 'Other'],
  worth: ['Under £500', '£500 to under £1,500', '£1,500 to under £5,000', '£5,000 or more', 'I do not know'],
  spend: ['Under £5,000', '£5,000 to under £20,000', '£20,000 to under £50,000', '£50,000 or more', 'I do not know'],
  decider: ['Me', 'Me, with the leadership team', 'Someone else, I would bring them in'],
  capacity: ['None, we are at capacity', 'A few', 'Many'],
};

/** The messages the form can show. */
export const MSG = {
  url: 'Please enter a valid website',
  required: 'Please complete this field',
  choice: 'Please choose one option',
  multi: 'Please choose at least one option',
  email: 'Please enter a valid work email',
};

export const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The twelve steps. "field" is the name of the input and the payload key.
 * kind: url | text | choice | multi | group. A group is one step with several inputs.
 */
export const STEPS = [
  { id: 'website', kind: 'url', field: 'company_website', q: 'Hospital or clinic group website', max: 300 },
  { id: 'company', kind: 'text', field: 'company_name', q: 'Hospital or clinic group name', ac: 'organization', max: 200 },
  {
    id: 'regulator', kind: 'text', field: 'regulator_number', q: 'Regulator registration number', optional: true,
    help: 'Optional. For example a CQC provider ID. It helps us prepare.', max: 60,
  },
  { id: 'turnover', kind: 'choice', field: 'turnover_band', q: 'Roughly what was your turnover in the last financial year?', options: 'turnover' },
  { id: 'trading', kind: 'choice', field: 'trading_years', q: 'How long have you been trading?', options: 'trading' },
  { id: 'selfpay', kind: 'choice', field: 'self_pay_share', q: 'What share of your consultations do patients pay for themselves?', options: 'selfpay' },
  { id: 'specialties', kind: 'multi', field: 'specialties', q: 'Which specialties would you like to grow?', help: 'Tick as many as apply.', options: 'specialties' },
  {
    id: 'worth', kind: 'choice', field: 'first_consultation_value',
    q: 'What is an attended first consultation worth to you, including the care that follows?', options: 'worth',
  },
  { id: 'spend', kind: 'choice', field: 'marketing_spend', q: 'What do you spend on marketing in a typical month?', options: 'spend' },
  { id: 'decider', kind: 'choice', field: 'decision_maker', q: 'Who would decide whether to work with us?', options: 'decider' },
  { id: 'capacity', kind: 'choice', field: 'capacity', q: 'How many more consultations could you take on next month?', options: 'capacity' },
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

/** The ticked options of a multi-choice answer, as typed ("A, B"), kept only if every one is an option. */
export function splitMulti(step, raw) {
  var all = OPTIONS[step.options];
  var parts = tidy(raw, 600).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (all.indexOf(parts[i]) < 0) return null;
    if (out.indexOf(parts[i]) < 0) out.push(parts[i]);
  }
  return out;
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
  } else if (step.kind === 'multi') {
    var m = splitMulti(step, get(step.field));
    if (!m || !m.length) out[step.field] = MSG.multi;
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
 * All twelve steps against a set of answers. "input" is a plain object of strings.
 * Returns {ok, errors, values}: errors by field name, values cleaned for every field (an
 * empty string where nothing was answered; a multi-choice as its options joined with ", ").
 */
export function validate(input) {
  var get = function (name) { return input ? input[name] : ''; };
  var errors = {};
  var values = {};
  STEPS.forEach(function (s) {
    Object.assign(errors, stepErrors(s, get));
    if (s.kind === 'group') {
      s.fields.forEach(function (f) { values[f.field] = tidy(get(f.field), f.max); });
    } else if (s.kind === 'multi') {
      var m = splitMulti(s, get(s.field));
      values[s.field] = m ? m.join(', ') : '';
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
