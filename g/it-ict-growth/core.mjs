/**
 * ITALY. The one definition of the application form and of what counts as a valid answer, in Italian.
 *
 * It is the UK IT form (g/uk-it-growth/core.mjs) question for question: the same fourteen steps, the same field
 * names (they are the keys of the payload sent to Zapier), the same order of every set of options (route.mjs
 * reads an answer by its position, so the order is the rules: do not reorder an option list). What changed is the
 * language and the money: bands are in euro, and a band keeps the position of its UK twin.
 *
 * It is run in two places and must stay identical in both:
 *   - in the browser, where the build inlines this file into the page with the word "export" removed, and
 *   - on the server, where netlify/functions/lead imports it.
 * So it has no imports, no DOM and no Node APIs.
 *
 * The wording is Claude's draft in Italian from the UK board (IT board v56). It must be read by a native speaker
 * before the funnel goes live (g/it-ict-growth/LAUNCH.md). The form speaks to the firm ("l'azienda", "voi"), not to
 * one person, so that it works whether the owner or a manager answers.
 */

export const SLUG = 'it-ict-growth';

/** Options in the order they appear on the form, and in the order route.mjs reads them. A radio's value is its label. */
export const OPTIONS = {
  area: [
    'Strategia IT e trasformazione digitale',
    'Servizi IT gestiti (MSP)',
    'Sviluppo software',
    'Dati e intelligenza artificiale',
    'Cybersecurity',
    'Altro',
  ],
  turnover: [
    'Meno di 1 milione di €',
    'Da 1 milione a meno di 2 milioni di €',
    'Da 2 a meno di 5 milioni di €',
    'Da 5 a meno di 10 milioni di €',
    '10 milioni di € o più',
    'Preferisco non dirlo',
  ],
  trading: ['Meno di due anni', 'Da due a cinque anni', 'Più di cinque anni'],
  people: ['Meno di 10', 'Da 10 a 24', 'Da 25 a 49', 'Da 50 a 99', '100 o più'],
  spend: ['Meno di 1.000 €', 'Da 1.000 € a meno di 5.000 €', 'Da 5.000 € a meno di 15.000 €', '15.000 € o più', 'Non lo so'],
  worth: ['Meno di 10.000 €', 'Da 10.000 € a meno di 25.000 €', 'Da 25.000 € a meno di 50.000 €', 'Da 50.000 € a meno di 150.000 €', '150.000 € o più'],
  cycle: ['Meno di quattro settimane', 'Da uno a meno di tre mesi', 'Da tre a sei mesi', 'Più di sei mesi'],
  decider: ['Io', 'Io, insieme a un socio o al consiglio', 'Qualcun altro, che coinvolgerei', 'Un processo di acquisto strutturato'],
  capacity: ['Nessuno, siamo al limite', 'Da uno a tre', 'Da quattro a dieci', 'Più di dieci'],
};

/** The messages the form can show. */
export const MSG = {
  url: 'Inserire un sito web valido',
  required: 'Completare questo campo',
  choice: 'Scegliere una sola opzione',
  email: 'Inserire un indirizzo email aziendale valido',
  goal: 'Indicare cosa volete ottenere dall’incontro.',
};

export const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The fourteen steps. "field" is the name of the input and the payload key.
 * kind: url | text | long | choice | group. A long is a textarea, free text. A group is one step with several inputs.
 */
export const STEPS = [
  { id: 'website', kind: 'url', field: 'company_website', q: 'Sito web dell’azienda', max: 300 },
  { id: 'company', kind: 'text', field: 'company_name', q: 'Nome dell’azienda', ac: 'organization', max: 200 },
  {
    id: 'area', kind: 'choice', field: 'specialism', q: 'Qual è l’area principale dei servizi IT dell’azienda?', options: 'area',
    other: { value: 'Altro', field: 'specialism_other', placeholder: 'Specificare quale', max: 120 },
  },
  { id: 'turnover', kind: 'choice', field: 'turnover_band', q: 'Qual è, indicativamente, il fatturato dell’azienda nell’ultimo esercizio?', options: 'turnover' },
  { id: 'trading', kind: 'choice', field: 'trading_years', q: 'Da quanto tempo l’azienda è attiva?', options: 'trading' },
  { id: 'people', kind: 'choice', field: 'employees_or_fee_earners', q: 'Quante persone lavorano in azienda?', options: 'people' },
  { id: 'spend', kind: 'choice', field: 'marketing_spend', q: 'Quanto spende l’azienda in marketing in un mese tipico, tutti i canali inclusi?', options: 'spend' },
  {
    id: 'worth', kind: 'choice', field: 'first_year_value', q: 'Quanto vale per voi un nuovo cliente tipico nel primo anno?',
    help: 'Includere canoni ricorrenti, licenze e progetti una tantum del primo anno.', options: 'worth',
  },
  { id: 'cycle', kind: 'choice', field: 'sales_cycle', q: 'Quanto dura una vendita tipica, dal primo incontro alla firma?', options: 'cycle' },
  {
    id: 'target', kind: 'text', field: 'target_next_year', q: 'Quale fatturato vi ponete come obiettivo per il prossimo anno?', optional: true,
    help: 'Facoltativa. Ci aiuta a preparare la chiamata.', max: 120,
  },
  { id: 'decider', kind: 'choice', field: 'decision_maker', q: 'Chi decide se lavorare con noi?', options: 'decider' },
  { id: 'capacity', kind: 'choice', field: 'capacity', q: 'Quanti nuovi clienti potreste acquisire nei prossimi tre mesi?', options: 'capacity' },
  {
    id: 'goal', kind: 'long', field: 'meeting_goal', q: 'Cosa volete ottenere da questo incontro?',
    help: 'Basta una o due righe.', min: 2, max: 600,
  },
  {
    id: 'details', kind: 'group', q: 'I vostri dati',
    fields: [
      { field: 'first_name', label: 'Nome', type: 'text', ac: 'given-name', im: 'text', wide: false, max: 80 },
      { field: 'last_name', label: 'Cognome', type: 'text', ac: 'family-name', im: 'text', wide: false, max: 80 },
      { field: 'job_title', label: 'Ruolo', type: 'text', ac: 'organization-title', im: 'text', wide: true, max: 120 },
      { field: 'email', label: 'Email aziendale', type: 'email', ac: 'email', im: 'email', wide: true, max: 254 },
      { field: 'mobile', label: 'Cellulare (facoltativo)', type: 'tel', ac: 'tel', im: 'tel', wide: true, optional: true, max: 40, help: 'Usato solo per fissare o confermare un orario.' },
    ],
  },
];

/** Every input name on the form, in order, including the free-text part of "Altro". */
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
  } else if (step.kind === 'long') {
    // Free text with no gate behind it: it only has to be there, and not so long that nobody will read it.
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
 * All fourteen steps against a set of answers. "input" is a plain object of strings.
 * Returns {ok, errors, values}: errors by field name, and values cleaned for every
 * field (an empty string where nothing was answered, "Altro" text only when "Altro"
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
