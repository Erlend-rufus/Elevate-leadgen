/**
 * The application form's markup, as a pure function.
 *
 * Used twice, on purpose. scripts/build-g-it.mjs calls it for the page as
 * first served. The Netlify Function calls it again to answer a submission
 * from a browser without JavaScript that failed validation, with the visitor's
 * answers put back and the errors shown. Same function, so the page a visitor
 * gets back is the page they started on, not a lookalike.
 *
 * With no JavaScript every question is on the page at once, divided by thin
 * rules, with one ordinary submit button. client.js turns that into twelve
 * steps. Nothing in the markup depends on the script having run.
 *
 * Every value that came from a visitor goes through esc() before it reaches
 * HTML. The re-render path echoes what they typed, which is the one place on
 * this site where user input is written back into a page.
 */
'use strict';

function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var ALERT_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5v.5"></path></svg>';

function errBlock(id, message) {
  return '<div class="err" role="alert" id="' + esc(id) + '">' + ALERT_ICON + '<span>' + esc(message) + '</span></div>';
}

function textInput(o) {
  var bad = !!o.error;
  return '<input class="txt' + (bad ? ' is-bad' : '') + '"' + (o.autofocus ? ' autofocus' : '') + ' type="' + esc(o.type) + '" id="' + esc(o.id) + '" name="' + esc(o.name) + '"' +
    ' value="' + esc(o.value) + '"' +
    (o.labelledby ? ' aria-labelledby="' + esc(o.labelledby) + '"' : '') +
    (o.inputmode ? ' inputmode="' + esc(o.inputmode) + '"' : '') +
    ' autocomplete="' + esc(o.autocomplete || 'off') + '"' +
    ' aria-invalid="' + (bad ? 'true' : 'false') + '"' +
    (bad ? ' aria-describedby="' + esc(o.errId) + '"' : '') + '>';
}

function renderQuestion(q, a, e, index, firstBad) {
  var title = '<h2 id="t-' + esc(q.id) + '">' + esc(q.title) + '</h2>';
  var hint = q.hint ? '<p class="hint">' + esc(q.hint) + '</p>' : '';
  var body = '', tail = '';
  var err = e && typeof e === 'string' ? e : null;

  if (q.kind === 'url' || q.kind === 'text') {
    body = textInput({
      type: q.kind === 'url' ? 'url' : 'text', id: 'f-' + q.id, name: q.id, value: a[q.id],
      labelledby: 't-' + q.id, inputmode: q.kind === 'url' ? 'url' : 'text',
      autocomplete: q.kind === 'url' ? 'url' : 'off', error: err, errId: 'e-' + q.id, autofocus: firstBad && !!err
    });
    if (err) tail = errBlock('e-' + q.id, err);
  } else if (q.kind === 'choice') {
    var opts = q.options.map(function (label, i) {
      var id = 'o-' + q.id + '-' + i;
      return '<input class="vh' + (q.otherIndex === i ? ' is-other' : '') + '"' + (firstBad && err && i === 0 ? ' autofocus' : '') + ' type="radio" id="' + id + '" name="' + esc(q.id) + '" value="' + i + '"' + (a[q.id] === i ? ' checked' : '') + '>' +
        '<label class="opt" for="' + id + '"><span class="ring" aria-hidden="true"><span class="dot"></span></span><span class="lbl">' + esc(label) + '</span></label>';
    }).join('');
    var other = '';
    if (q.otherIndex !== undefined) {
      other = '<input class="txt other" type="text" id="f-' + esc(q.id) + '-other" name="' + esc(q.id) + '_other" value="' + esc(a[q.id + '_other']) + '"' +
        ' placeholder="' + esc(q.otherPlaceholder) + '" aria-label="' + esc(q.otherPlaceholder) + '" autocomplete="off">';
    }
    body = '<div class="opts' + (err ? ' has-error' : '') + '" role="radiogroup" aria-labelledby="t-' + esc(q.id) + '"' +
      (err ? ' aria-invalid="true" aria-describedby="e-' + esc(q.id) + '"' : '') +
      (q.otherIndex !== undefined ? ' data-other="' + q.otherIndex + '"' : '') + '>' + opts + other + '</div>';
    if (err) tail = errBlock('e-' + q.id, err);
  } else {
    var fe = e && typeof e === 'object' ? e : {};
    var autoKey = null;
    q.fields.forEach(function (f) { if (autoKey === null && fe[f.key]) autoKey = f.key; });
    var fields = q.fields.map(function (f) {
      var id = 'f-' + q.id + '-' + f.key, msg = fe[f.key];
      var ac = { first: 'given-name', last: 'family-name', title: 'organization-title', email: 'email', mobile: 'tel' }[f.key] || 'off';
      return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label>' +
        textInput({ type: f.type, id: id, name: q.id + '_' + f.key, value: a[q.id + '_' + f.key], autocomplete: ac, error: msg, errId: 'e-' + q.id + '-' + f.key, autofocus: firstBad && f.key === autoKey }) +
        (msg ? errBlock('e-' + q.id + '-' + f.key, msg) : '') + '</div>';
    }).join('');
    body = '<div class="details" role="group" aria-labelledby="t-' + esc(q.id) + '">' + fields + '</div>';
  }

  return '<div class="q' + (index === 0 ? ' is-current' : '') + '" role="group" aria-labelledby="t-' + esc(q.id) + '" tabindex="-1" data-q="' + esc(q.id) + '" data-kind="' + esc(q.kind) + '">' +
    title + hint + body + tail + '</div>';
}

/**
 * @param {object} o
 * @param {object} o.copy       copy.json, already with {THRESHOLD}/{OFFER} resolved where they appear
 * @param {object} o.config     config.json
 * @param {object} [o.answers]  as produced by core.answersFrom
 * @param {object} [o.errors]   as produced by core.validateAll
 * @param {boolean} [o.general] show the general error above the button
 * @param {object} [o.hidden]   values for the hidden fields; the rest are empty
 */
function renderForm(o) {
  var copy = o.copy, cfg = o.config, f = copy.form;
  var a = o.answers || {}, errors = o.errors || {}, hidden = o.hidden || {};
  var hiddenInputs = cfg.hiddenFields.map(function (name) {
    var v = name === 'page_slug' ? cfg.slug : hidden[name];
    return '<input type="hidden" name="' + esc(name) + '" value="' + esc(v) + '">';
  }).join('');

  var steps = '<div class="steps-head">' +
    '<div class="back-row"><button class="back" type="button" hidden>' +
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="M19 12H5M11 6l-6 6 6 6"></path></svg>' +
    '<span>' + esc(f.labels.back) + '</span></button></div>' +
    '<div class="bar" role="progressbar" aria-label="' + esc(f.labels.progress) + '" aria-valuemin="0" aria-valuemax="' + f.questions.length + '" aria-valuenow="1">' +
    '<div class="bar-fill" style="width:' + (100 / f.questions.length) + '%"></div></div></div>';

  /* With no script a failed submission reloads the page at the top, and the first
     problem can be eleven questions down. autofocus is plain HTML: the browser
     scrolls to that control on load, which is the only "go to the error" there is. */
  var firstBadId = null;
  f.questions.forEach(function (q) { if (firstBadId === null && errors[q.id]) firstBadId = q.id; });

  var general = o.general
    ? '<div class="general" role="alert" tabindex="-1" autofocus>' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5v.5"></path></svg>' +
      '<span>' + esc(f.errors.general) + '<a href="mailto:' + esc(cfg.contact.email) + '">' + esc(cfg.contact.email) + '</a></span></div>'
    : '';

  return '<form class="apply is-steps" id="apply-form" method="post" action="' + esc(cfg.funnel.applyPath) + '" novalidate data-steps="' + f.questions.length + '">' +
    hiddenInputs +
    '<div class="hp" aria-hidden="true"><input type="text" name="contact_by_fax" tabindex="-1" autocomplete="off" value=""></div>' +
    steps +
    f.questions.map(function (q, i) { return renderQuestion(q, a, errors[q.id], i, q.id === firstBadId); }).join('') +
    '<div class="submit-area">' + general +
    '<button class="btn" type="submit"><span class="btn-label">' + esc(f.labels.submit) + '</span></button>' +
    '<p class="note">' + esc(f.privacyNote.text) + ' <a href="' + esc(cfg.links.privacy) + '">' + esc(f.privacyNote.link) + '</a></p>' +
    '</div></form>';
}

module.exports = { renderForm: renderForm, esc: esc, ALERT_ICON: ALERT_ICON };
