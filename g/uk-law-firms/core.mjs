/**
 * The one definition of the application form of /g/uk-law-firms and of what counts as a valid
 * answer. Same shape as g/uk-it-growth/core.mjs, and the same rule: it runs in the browser
 * (inlined by the build with "export" removed) and on the server, so it has no imports, no DOM
 * and no Node APIs. Wording is the solicitors brief of 16 Oct 2026 (4.10) with the answers in
 * the work document of 18 Oct 2026 (L5: the value question is the client's first year; L36:
 * bands written "to under"; F9: mobile optional).
 *
 * Field names are the keys of the payload sent to Zapier (netlify/functions/lead/payload.mjs).
 * One question, "practice_areas", lets the visitor tick several options (kind: multi); its value
 * is the ticked options joined with ", ".
 */

export const SLUG = 'uk-law-firms';

/** Options in the order they appear on the form. A choice's value is its label. */
export const OPTIONS = {
  turnover: ['Under £1m', '£1m to under £2m', '£2m to under £5m', '£5m to under £10m', '£10m or more', 'I would rather not say'],
  trading: ['Under two years', 'Two to five years', 'More than five years'],
  people: ['Under 5', '5 to 14', '15 to 29', '30 or more'],
  areas: ['Family', 'Conveyancing', 'Wills and probate', 'Employment', 'Commercial', 'Immigration', 'Personal injury', 'Other'],
  worth: ['Under £2,000', '£2,000 to under £5,000', '£5,000 to under £15,000', '£15,000 or more'],
  spend: ['Under £1,000', '£1,000 to under £5,000', '£5,000 to under £15,000', '£15,000 or more', 'I do not know'],
  decider: ['Me', 'Me, with the other partners', 'Someone else, I would bring them in'],
  capacity: ['None, we are at capacity', 'A few', 'Many'],
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
 * The twelve steps. "field" is the name of the input and the payload key.
 * kind: url | text | choice | multi | group. A group is one step with several inputs.
 */
export const STEPS = [
  { id: 'website', kind: 'url', field: 'company_website', q: 'Firm website', max: 300 },
  { id: 'company', kind: 'text', field: 'company_name', q: 'Firm name', ac: 'organization', max: 200 },
  { id: 'sra', kind: 'text', field: 'sra_number', q: 'SRA number', optional: true, help: 'Optional. It helps us prepare.', max: 40 },
  { id: 'turnover', kind: 'choice', field: 'turnover_band', q: "Roughly what was the firm's turnover in the last financial year?", options: 'turnover' },
  { id: 'trading', kind: 'choice', field: 'trading_years', q: 'How long has the firm been trading?', options: 'trading' },
  { id: 'people', kind: 'choice', field: 'employees_or_fee_earners', q: 'How many fee earners does the firm have?', options: 'people' },
  { id: 'areas', kind: 'multi', field: 'practice_areas', q: 'Which practice areas would you like to grow?', help: 'Tick as many as apply.', options: 'areas' },
  {
    id: 'worth', kind: 'choice', field: 'first_year_value', q: 'What is a typical new client worth to the firm in the first year?',
    help: 'Include the first instruction and any further work in that year.', options: 'worth',
  },
  { id: 'spend', kind: 'choice', field: 'marketing_spend', q: 'What does the firm spend on marketing in a typical month?', options: 'spend' },
  { id: 'decider', kind: 'choice', field: 'decision_maker', q: 'Who would decide whether to work with us?', options: 'decider' },
  { id: 'capacity', kind: 'choice', field: 'capacity', q: 'How many new instructions could the firm take on next month?', options: 'capacity' },
  {
    id: 'goal', kind: 'long', field: 'meeting_goal', q: 'What do you want to get out of this meeting?',
    help: 'One or two lines is enough.', min: 2, max: 600,
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
  } else if (step.kind === 'long') {
    // Free text with no gate behind it: it only has to be there, and not so long that nobody will read it.
    if (tidy(get(step.field), step.max).length < (step.min || 1)) out[step.field] = MSG.goal;
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
