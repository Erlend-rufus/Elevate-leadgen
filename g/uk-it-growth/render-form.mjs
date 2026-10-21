/**
 * The application form as HTML. Used twice, so the two cannot drift:
 *   - at build time, to write the form into the landing page (every question,
 *     readable and submittable with JavaScript off), and
 *   - on the server, to put the same page back with the visitor's answers and the errors
 *     when a post without JavaScript fails validation.
 * The page's script then turns this same markup into one step at a time. It never
 * builds the form itself.
 */
import { STEPS, OPTIONS } from './core.mjs';

export const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ERR_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5v.5"></path></svg>';

const describedBy = (parts) => {
  const s = parts.filter(Boolean).join(' ');
  return s ? ` aria-describedby="${s}"` : '';
};

const errorP = (field, msg, extra) =>
  `<p class="lf-err" id="e-${field}"${extra || ''}>${ERR_ICON}<span>${esc(msg)}</span></p>`;

function renderInput(step, f, values, errors) {
  const name = f.field;
  const err = errors[name] || '';
  const help = f.help ? `<p class="lf-help" id="h-${name}">${esc(f.help)}</p>` : '';
  const type = f.type || (step && step.kind === 'url' ? 'url' : 'text');
  const ac = f.ac || (step && step.kind === 'url' ? 'url' : 'off');
  const im = f.im || (step && step.kind === 'url' ? 'url' : 'text');
  return { help, input:
    `<input class="lf-input" id="f-${name}" name="${name}" type="${type}" value="${esc(values[name] || '')}" ` +
    `autocomplete="${ac}" inputmode="${im}" aria-invalid="${err ? 'true' : 'false'}"` +
    `${f.optional ? '' : ' aria-required="true"'}${describedBy([f.help ? `h-${name}` : '', err ? `e-${name}` : ''])}>`,
  err };
}

function renderBlock(step, values, errors) {
  if (step.kind === 'long') {
    // A textarea, not an input: the one free-text answer on the form. Same classes, so the
    // styling and the step script treat it like any other typed field.
    const name = step.field;
    const err = errors[name] || '';
    const help = step.help ? `<p class="lf-help" id="h-${name}">${esc(step.help)}</p>` : '';
    const ta = `<textarea class="lf-input lf-input--long" id="f-${name}" name="${name}" rows="4" maxlength="${step.max}" ` +
      `autocomplete="off" aria-invalid="${err ? 'true' : 'false'}" aria-required="true"` +
      `${describedBy([step.help ? `h-${name}` : '', err ? `e-${name}` : ''])}>${esc(values[name] || '')}</textarea>`;
    return `<div class="lf-block" data-step="${step.id}">` +
      `<label class="lf-q" for="f-${name}">${esc(step.q)}</label>` + help + ta + (err ? errorP(name, err) : '') + '</div>';
  }
  if (step.kind === 'url' || step.kind === 'text') {
    const f = { field: step.field, help: step.help, optional: step.optional, ac: step.ac };
    const r = renderInput(step, f, values, errors);
    return `<div class="lf-block" data-step="${step.id}">` +
      `<label class="lf-q" for="f-${step.field}">${esc(step.q)}</label>` +
      r.help + r.input + (r.err ? errorP(step.field, r.err) : '') + '</div>';
  }
  if (step.kind === 'choice') {
    const name = step.field;
    const err = errors[name] || '';
    const cur = values[name] || '';
    const help = step.help ? `<p class="lf-help" id="h-${name}">${esc(step.help)}</p>` : '';
    const cards = OPTIONS[step.options].map((label) =>
      `<label class="lf-card"><input type="radio" name="${name}" value="${esc(label)}"${cur === label ? ' checked' : ''}>` +
      `<span class="lf-ind" aria-hidden="true"></span><span>${esc(label)}</span></label>`).join('');
    const other = step.other
      ? `<input class="lf-input" id="o-${step.id}" name="${step.other.field}" type="text" value="${esc(values[step.other.field] || '')}" ` +
        `placeholder="${esc(step.other.placeholder)}" aria-label="Other" maxlength="${step.other.max}" data-other-for="${esc(step.other.value)}">`
      : '';
    return `<div class="lf-block" data-step="${step.id}">` +
      `<fieldset class="lf-set"${describedBy([step.help ? `h-${name}` : '', err ? `e-${name}` : ''])}>` +
      `<legend class="lf-q">${esc(step.q)}</legend>${help}` +
      `<div class="lf-cards">${cards}</div>${other}${err ? errorP(name, err) : ''}</fieldset></div>`;
  }
  // group
  const fields = step.fields.map((f) => {
    const r = renderInput(step, f, values, errors);
    return `<div class="lf-field${f.wide ? ' lf-field--wide' : ''}">` +
      `<label class="lf-label" for="f-${f.field}">${esc(f.label)}</label>${r.help}${r.input}` +
      (r.err ? errorP(f.field, r.err) : '') + '</div>';
  }).join('');
  return `<div class="lf-block" data-step="${step.id}"><fieldset class="lf-set">` +
    `<legend class="lf-q">${esc(step.q)}</legend><div class="lf-fields">${fields}</div></fieldset></div>`;
}

/**
 * copy: copy.json (uses copy.form). cfg: config.json. values: answers by field name.
 * errors: messages by field name. hidden: tracking fields. general: show the "something
 * went wrong on our side" message (a server fault, not the visitor's input).
 */
export function renderForm({ copy, cfg, values = {}, errors = {}, hidden = {}, general = false }) {
  const F = copy.form;
  const hid = cfg.hiddenFields.map((name) => {
    const v = name === 'campaign' ? cfg.campaign : name === 'page_slug' ? cfg.slug : (hidden[name] || '');
    return `<input type="hidden" name="${name}" value="${esc(v)}">`;
  }).join('');
  const blocks = STEPS.map((s) => renderBlock(s, values, errors)).join('\n');
  const gerr = general
    ? `<p class="lf-gerr" role="alert">${ERR_ICON}<span>${esc(F.failed)} ` +
      `<a class="lf-ulink" href="mailto:${esc(cfg.contact.email)}">${esc(cfg.contact.email)}</a></span></p>`
    : '';
  return `<section class="lf" aria-labelledby="h-form">
  <div class="lf-wrap">
    <div class="lf-intro">
      <h2 class="lf-h" id="h-form">${esc(F.heading)}</h2>
      <p class="lf-under">${esc(F.under)}</p>
    </div>
    <form class="lf-panel" id="lf-form" method="post" action="${esc(cfg.funnel.applyPath)}" novalidate>
      ${hid}
      <div class="lf-trap" aria-hidden="true"><label>Fax <input type="text" name="${cfg.honeypot}" tabindex="-1" autocomplete="off" value=""></label></div>
${blocks}
      ${gerr}
      <div class="lf-actions"><button class="btn btn--primary" type="submit">${esc(F.submit)}</button></div>
      <p class="lf-consent">${esc(F.consent)} <a href="${esc(cfg.links.privacy)}">${esc(F.privacy)}</a></p>
    </form>
  </div>
</section>`;
}
