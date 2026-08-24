/* UK recruitment funnel: attribution, Typeform routing, booking.
   No framework, no build step. */
(function () {
  'use strict';

  var TYPEFORM_ID = '01M0SDA0DGYFWWYMF3C94YM82M';

  /* Erlend filters wrong-fit leads inside Typeform itself: the "Ending B /
     feil lead" screen redirects straight to /uk-recruitment/thanks-review,
     so that path never reaches this file at all. Everything else - the
     normal ending, and any submission this code cannot identify - defaults
     to qualified and shows the calendar.

     This inverts the funnel's earlier "safe by default" design on purpose.
     Showing Calendly to an unqualified lead now costs one wasted call slot;
     the previous default cost a qualified lead never reaching a calendar at
     all, which is the more expensive mistake to make silently.

     MISMATCH_ENDINGS is a second, optional line of defence for the same
     "Ending B" ref, in case the Typeform redirect ever fails to fire (an
     ad blocker, an in-app browser eating the navigation). It is not
     required to launch: leave it empty until there is a real ref to add,
     read off the console log this file prints on every submission. */
  var MISMATCH_ENDINGS = [];

  /* Colours and the hidden page details come from the event's own booking
     page settings, so they are already in this URL. Do not re-add them
     below: a duplicated query key is a coin toss over which one Calendly
     reads. */
  var CALENDLY_URL = 'https://calendly.com/d/dtth-7vs-2x8/' +
    'geo-visibility-review-30-minutes' +
    '?hide_event_type_details=1&hide_gdpr_banner=1' +
    '&text_color=12123d&primary_color=006aba';

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

  function toQuery() {
    var q = new URLSearchParams();
    q.set('lead_id', attr.lead_id);
    UTM.forEach(function (k) { if (attr[k]) q.set(k, attr[k]); });
    if (attr.fbclid) q.set('fbclid', attr.fbclid);
    return q;
  }

  /* -------------------------------------------------------------- form */

  var tf = document.getElementById('tf');
  if (!tf) return;

  /* Attribution rides into Typeform as hidden fields, so it lands on the
     submission itself and reaches Zapier (or whatever Typeform is wired to)
     without a separate client-side POST. Untouched fields simply arrive
     empty. Matching Hidden Fields must exist on the Typeform with these
     exact names, or Typeform silently drops values with nowhere to go. */
  var hidden = [];
  UTM.concat(['fbclid', 'lead_id']).forEach(function (k) {
    hidden.push(k + '=' + encodeURIComponent(attr[k] || ''));
  });
  hidden.push('page_slug=' + encodeURIComponent('uk-recruitment'));

  tf.setAttribute('data-tf-live', TYPEFORM_ID);
  tf.setAttribute('data-tf-hidden', hidden.join(','));
  tf.setAttribute('data-tf-on-submit', 'elevateTfSubmit');
  tf.setAttribute('data-tf-on-ending-button-click', 'elevateTfEnding');

  /* ----------------------------------------------------------- routing */

  var routed = false; /* the named callback and the message fallback can both
                          fire for one submission; route() must only act once,
                          or a qualified lead gets two Calendly widgets. */

  function route(ref) {
    if (routed) return;
    routed = true;

    /* Logged so the ending reference can be read off a real submission: open
       the console, submit once per ending, and copy the ref into
       MISMATCH_ENDINGS above. Typeform does not surface it anywhere else
       that is easy to reach. */
    try { console.info('[elevate] typeform ending ref:', ref); } catch (e) {}

    /* Default is qualified. The wrong-fit path is filtered out in Typeform
       itself (see MISMATCH_ENDINGS above), so under normal operation this
       code only ever sees the qualified ending, or no ref at all. */
    var isMismatch = ref && MISMATCH_ENDINGS.indexOf(String(ref)) !== -1;
    if (isMismatch) {
      location.href = '/uk-recruitment/thanks-review?' + toQuery().toString();
      return;
    }
    showCalendar();
  }

  window.elevateTfSubmit = function (payload) {
    route(payload && (payload.ref || payload.endingRef));
  };
  window.elevateTfEnding = function (payload) {
    route(payload && (payload.ref || payload.endingRef));
  };

  /* Fallback for embed builds that post a message instead of invoking the
     named callbacks. Same routing, same safe default. */
  window.addEventListener('message', function (e) {
    if (!/typeform\.com$/.test(String(e.origin).replace(/^https?:\/\//, '').split('/')[0] || '')) return;
    var t = e.data && (e.data.type || e.data.event);
    if (t === 'form-submit' || t === 'form-ready-to-redirect' || t === 'thank-you-screen-button-click') {
      route(e.data.ref || (e.data.data && e.data.data.ref));
    }
  });

  var tfScript = document.createElement('script');
  tfScript.src = 'https://embed.typeform.com/next/embed.js';
  tfScript.async = true;
  document.body.appendChild(tfScript);

  /* ----------------------------------------------------------- booking */

  function showCalendar() {
    var formSection = document.getElementById('form');
    var cal = document.getElementById('calendar');
    var host = document.getElementById('cal-host');
    var sticky = document.querySelector('.sticky');

    /* Inline, never a popup: popups are blocked far more often in Facebook's
       in-app browser, which is where most of this traffic arrives. No name
       or email prefill: Typeform's client-side callback does not hand back
       answer values, only the ending ref, so the visitor fills those in on
       Calendly itself. */
    var url = CALENDLY_URL +
      (CALENDLY_URL.indexOf('?') === -1 ? '?' : '&') +
      (CALENDLY_URL.indexOf('hide_gdpr_banner=') === -1 ? 'hide_gdpr_banner=1&' : '') +
      'utm_content=' + encodeURIComponent(attr.lead_id);
    UTM.forEach(function (k) {
      if (k !== 'utm_content' && attr[k]) url += '&' + k + '=' + encodeURIComponent(attr[k]);
    });

    var div = document.createElement('div');
    div.className = 'calendly-inline-widget';
    div.setAttribute('data-url', url);
    host.appendChild(div);

    var s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    document.head.appendChild(s);

    formSection.style.display = 'none';
    if (sticky) sticky.classList.add('hide');
    cal.classList.add('on');
    cal.scrollIntoView({ behavior: 'smooth', block: 'start' });

    var q = toQuery();

    /* Calendly's own redirect setting is unreliable in in-app browsers and
       hands us no control over the parameters, so we listen instead. There is
       deliberately no timeout fallback: redirecting on a timer would count a
       booking that never happened. */
    window.addEventListener('message', function (e) {
      if (!/calendly\.com$/.test(String(e.origin).replace(/^https?:\/\//, '').split('/')[0] || '')) return;
      var name = e.data && e.data.event;
      if (name === 'calendly.event_scheduled') {
        location.href = '/uk-recruitment/thanks-booked?' + q.toString();
      }
    });
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
