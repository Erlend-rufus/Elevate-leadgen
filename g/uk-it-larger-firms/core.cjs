/**
 * Validation shared by the browser and the server for /g/uk-it-larger-firms.
 *
 * One file, two homes. The generator inlines this text into the landing page,
 * where it defines window.UkItCore. The Netlify Function requires it. Because
 * both run the same code, "the client and the server agree on what is valid"
 * is not something to test for, it cannot be otherwise.
 *
 * Plain ES5 on purpose: the traffic is Meta, much of it arrives inside the
 * Facebook in-app browser, and a syntax error in an old WebView would leave
 * the form dead with nothing to say why. No arrow functions, no spread, no
 * optional chaining.
 *
 * The rules are the ones in the approved prototype (UK-IT-Form), nothing more:
 *   url      a domain or URL, protocol optional
 *   text     not empty, unless the question is optional
 *   choice   one option picked
 *   details  email must look like an email, every other field not empty
 * The copy for each message is passed in. This file carries none, so the
 * placeholder for the empty-field message cannot end up hard-coded here.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UkItCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WEBSITE_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* Not in the work order. Caps keep a hostile or broken client from posting
     megabytes into a lead record. 254 is the longest a real address can be. */
  var MAX = { text: 200, url: 300, email: 254, other: 200 };

  function str(v) {
    if (v === null || v === undefined) return '';
    /* Control characters never belong in a lead field, and a newline in an
       email or name is how a value gets smuggled into a header or a CSV row. */
    return String(v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/^\s+|\s+$/g, '');
  }

  function isChoiceIndex(v, q) {
    return typeof v === 'number' && v % 1 === 0 && v >= 0 && v < q.options.length;
  }

  /**
   * Build the answers object from anything with a lookup: a URLSearchParams,
   * a FormData, or a plain object. Choice answers become integer indexes,
   * which is how the prototype's state holds them; everything else is a
   * trimmed string. A choice that is missing or not a valid index is null.
   */
  function answersFrom(questions, get) {
    var a = {};
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (q.kind === 'details') {
        for (var f = 0; f < q.fields.length; f++) {
          var key = q.id + '_' + q.fields[f].key;
          a[key] = str(get(key)).slice(0, q.fields[f].type === 'email' ? MAX.email + 1 : MAX.text);
        }
      } else if (q.kind === 'choice') {
        var raw = get(q.id);
        /* Digits only. Number('') and Number(' ') are 0 and Number('0x1') is 1: a non-answer must not become option 0. */
        var n = /^[0-9]{1,3}$/.test(String(raw === null || raw === undefined ? '' : raw)) ? Number(raw) : NaN;
        a[q.id] = isChoiceIndex(n, q) ? n : null;
        if (q.otherIndex !== undefined) a[q.id + '_other'] = str(get(q.id + '_other')).slice(0, MAX.other);
      } else {
        a[q.id] = str(get(q.id));
      }
    }
    return a;
  }

  /** One question. Returns null when fine, a string for a single message, or an object keyed by field for details. */
  function validateQuestion(q, a, msg) {
    var v;
    if (q.kind === 'url') {
      v = str(a[q.id]);
      return v.length <= MAX.url && WEBSITE_RE.test(v) ? null : msg.website;
    }
    if (q.kind === 'text') {
      v = str(a[q.id]);
      return q.optional || v ? null : msg.required;
    }
    if (q.kind === 'choice') {
      return isChoiceIndex(a[q.id], q) ? null : msg.choice;
    }
    var e = {}, any = false;
    for (var i = 0; i < q.fields.length; i++) {
      var f = q.fields[i];
      v = str(a[q.id + '_' + f.key]);
      if (f.type === 'email') {
        if (v.length > MAX.email || !EMAIL_RE.test(v)) { e[f.key] = msg.email; any = true; }
      } else if (!v) {
        e[f.key] = msg.required; any = true;
      }
    }
    return any ? e : null;
  }

  /** Every question. errors is keyed by question id; firstId is the first question, in order, that failed. */
  function validateAll(questions, a, msg) {
    var errors = {}, firstId = null;
    for (var i = 0; i < questions.length; i++) {
      var r = validateQuestion(questions[i], a, msg);
      if (r) { errors[questions[i].id] = r; if (firstId === null) firstId = questions[i].id; }
    }
    return { ok: firstId === null, errors: errors, firstId: firstId };
  }

  /** The answers as a person would read them, for the lead record. Labels, not just indexes, so a receiving system needs no copy of the form. */
  function describe(questions, a) {
    var out = {};
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (q.kind === 'details') {
        var d = {};
        for (var f = 0; f < q.fields.length; f++) d[q.fields[f].key] = str(a[q.id + '_' + q.fields[f].key]);
        out[q.id] = d;
      } else if (q.kind === 'choice') {
        var idx = a[q.id];
        out[q.id] = isChoiceIndex(idx, q)
          ? { index: idx, label: q.options[idx], other: q.otherIndex === idx ? str(a[q.id + '_other']) : '' }
          : { index: null, label: '', other: '' };
      } else {
        out[q.id] = str(a[q.id]).slice(0, q.kind === 'url' ? MAX.url : MAX.text);
      }
    }
    return out;
  }

  return {
    WEBSITE_RE: WEBSITE_RE, EMAIL_RE: EMAIL_RE, MAX: MAX,
    str: str, isChoiceIndex: isChoiceIndex,
    answersFrom: answersFrom, validateQuestion: validateQuestion,
    validateAll: validateAll, describe: describe
  };
});
