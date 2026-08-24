/* UK recruitment funnel: attribution -> Typeform hidden fields.
   Routing after submission happens entirely inside Typeform (a "Redirect to
   a website" configured per ending), not here - see /uk-recruitment/booking
   for what a qualified ending redirects to. No framework, no build step. */
(function () {
  'use strict';

  var TYPEFORM_ID = '01M0SDA0DGYFWWYMF3C94YM82M';

  /* ------------------------------------------------------- attribution */

  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var STORE = 'elevate:ukrec';

  function uuid() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /** URL wins, session fills the gaps, lead_id is minted once and kept. */
  function attribution() {
    var saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch (e) {}
    var q = new URLSearchParams(location.search);
    var out = {};
    Object.keys(saved).forEach(function (k) { out[k] = saved[k]; });
    UTM.concat(['fbclid']).forEach(function (k) {
      var v = q.get(k);
      if (v) out[k] = v;
    });
    if (!out.lead_id) out.lead_id = uuid();
    try { sessionStorage.setItem(STORE, JSON.stringify(out)); } catch (e) {}
    return out;
  }

  var attr = attribution();

  /* -------------------------------------------------------------- form */

  var tf = document.getElementById('tf');
  if (tf) {
    /* Attribution rides into Typeform as hidden fields, so it lands on the
       submission itself (reaching Zapier without a separate client-side
       POST) and can be inserted into each ending's redirect URL from
       Typeform's own variable picker. Untouched fields simply arrive empty.
       Matching Hidden Fields must exist on the Typeform with these exact
       names, or Typeform silently drops values with nowhere to go. */
    var hidden = [];
    UTM.concat(['fbclid', 'lead_id']).forEach(function (k) {
      hidden.push(k + '=' + encodeURIComponent(attr[k] || ''));
    });
    hidden.push('page_slug=' + encodeURIComponent('uk-recruitment'));

    tf.setAttribute('data-tf-live', TYPEFORM_ID);
    tf.setAttribute('data-tf-hidden', hidden.join(','));

    var tfScript = document.createElement('script');
    tfScript.src = 'https://embed.typeform.com/next/embed.js';
    tfScript.async = true;
    document.body.appendChild(tfScript);
  }

  /* ------------------------------------------------------ sticky / cta */

  document.querySelectorAll('[data-scroll-to-form]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var t = document.getElementById('form');
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
