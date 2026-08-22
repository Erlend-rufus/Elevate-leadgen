/* UK recruitment funnel: attribution, form, routing, booking.
   No framework, no build step. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* PLACEHOLDER. Must be replaced before a single pound is spent. It is  */
  /* deliberately ugly so it cannot survive a review: a placeholder that  */
  /* looks like a valid URL is a placeholder that ships.                  */
  /* ------------------------------------------------------------------ */

  var ZAPIER_HOOK = 'https://hooks.zapier.com/hooks/catch/REPLACE-ME/REPLACE-ME/';

  /* Colours and the hidden page details come from the event's own booking
     page settings, so they are already in this URL. Do not re-add them
     below: a duplicated query key is a coin toss over which one Calendly
     reads. */
  var CALENDLY_URL = 'https://calendly.com/eb-growwithelevate/' +
    'elevate-marketing-x-geo-audit' +
    '?hide_event_type_details=1&hide_gdpr_banner=1' +
    '&text_color=12123d&primary_color=006aba';

  var CONTACT_EMAIL = 'hello@getelevateleads.com';
  var QUALIFIED = ['Recruitment agency', 'Executive search'];

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

  /* -------------------------------------------------------- validation */

  function normaliseUrl(v) {
    v = (v || '').trim();
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }
  function looksLikeUrl(v) {
    try { var u = new URL(normaliseUrl(v)); return !!u.hostname && u.hostname.indexOf('.') > 0; }
    catch (e) { return false; }
  }
  /* Obviously invalid only. Free domains are flagged downstream, not blocked. */
  function looksLikeEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim()); }
  /* International, and 07 numbers are normal here. Do not force +44. */
  function looksLikePhone(v) {
    var d = (v || '').replace(/[^\d]/g, '');
    return d.length >= 7 && d.length <= 15;
  }

  /* -------------------------------------------------------------- form */

  var form = document.getElementById('lead-form');
  if (!form) return;

  var submitted = false; /* no red borders before the first attempt */
  var formError = document.getElementById('form-error');
  var submitBtn = document.getElementById('submit-btn');

  function block(el) { return el.closest('.q'); }

  function fieldValue(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el instanceof RadioNodeList || (el.length && !el.tagName)) {
      var picked = form.querySelector('input[name="' + name + '"]:checked');
      return picked ? picked.value : '';
    }
    return (el.value || '').trim();
  }

  var RULES = [
    { name: 'business_type', msg: 'Please choose one.' },
    { name: 'website', msg: 'Please enter your website address.', test: looksLikeUrl },
    { name: 'company_name', msg: 'Please enter your company name.' },
    { name: 'specialism', msg: 'Please tell us what you recruit for.' },
    { name: 'consultants', msg: 'Please choose one.' },
    { name: 'turnover', msg: 'Please choose one.' },
    { name: 'full_name', msg: 'Please enter your name.' },
    { name: 'email', msg: 'Please enter a valid work email.', test: looksLikeEmail },
    { name: 'mobile', msg: 'Please enter a phone number we can reach you on.', test: looksLikePhone }
  ];

  function validate() {
    var firstBad = null;
    RULES.forEach(function (r) {
      var v = fieldValue(r.name);
      var ok = r.test ? r.test(v) : !!v;
      var el = form.querySelector('[name="' + r.name + '"]');
      var b = el && block(el);
      if (!b) return;
      var errEl = b.querySelector('.err');
      if (errEl) errEl.textContent = r.msg;
      b.classList.toggle('invalid', submitted && !ok);
      if (!ok && !firstBad) firstBad = b;
    });
    return firstBad;
  }

  form.addEventListener('input', function () { if (submitted) validate(); });
  form.addEventListener('change', function () { if (submitted) validate(); });

  /* ------------------------------------------------------------ submit */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitted = true;
    formError.classList.remove('on');

    var bad = validate();
    if (bad) {
      bad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var f = bad.querySelector('input');
      if (f) f.focus({ preventScroll: true });
      return;
    }

    var type = fieldValue('business_type');
    /* Routing happens here, after every field is captured. Never on the answer
       to question one: jumping early loses the turnover figure, and that is the
       field the manual follow-up rule depends on. */
    var route = QUALIFIED.indexOf(type) !== -1 ? 'booked' : 'review';

    var payload = {
      business_type: type,
      website: normaliseUrl(fieldValue('website')),
      company_name: fieldValue('company_name'),
      specialism: fieldValue('specialism'),
      consultants: fieldValue('consultants'),
      competitor_1: fieldValue('competitor_1'),
      competitor_2: fieldValue('competitor_2'),
      turnover: fieldValue('turnover'),
      full_name: fieldValue('full_name'),
      email: fieldValue('email'),
      mobile: fieldValue('mobile'),
      lead_id: attr.lead_id,
      fbclid: attr.fbclid || '',
      page_slug: 'uk-recruitment',
      referrer: document.referrer || '',
      submitted_at: new Date().toISOString(),
      route: route
    };
    UTM.forEach(function (k) { payload[k] = attr[k] || ''; });

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    /* text/plain avoids a CORS preflight against the Zapier hook. */
    fetch(ZAPIER_HOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('hook ' + r.status);
        proceed(route, payload);
      })
      .catch(function () {
        /* A lead lost here is paid for and never seen, so it fails loudly. */
        submitBtn.disabled = false;
        submitBtn.textContent = 'Book your walkthrough';
        formError.innerHTML =
          'Something went wrong sending your details. Please email <a href="mailto:' +
          CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a> and we will pick it up from there.';
        formError.classList.add('on');
        formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
  });

  function proceed(route, payload) {
    var q = new URLSearchParams();
    q.set('lead_id', attr.lead_id);
    UTM.forEach(function (k) { if (attr[k]) q.set(k, attr[k]); });
    if (attr.fbclid) q.set('fbclid', attr.fbclid);

    if (route === 'review') {
      location.href = '/uk-recruitment/thanks-review?' + q.toString();
      return;
    }
    showCalendar(payload, q);
  }

  /* ----------------------------------------------------------- booking */

  function showCalendar(payload, q) {
    var formSection = document.getElementById('form');
    var cal = document.getElementById('calendar');
    var host = document.getElementById('cal-host');
    var sticky = document.querySelector('.sticky');

    /* Inline, never a popup: popups are blocked far more often in Facebook's
       in-app browser, which is where most of this traffic arrives. */
    var url = CALENDLY_URL +
      (CALENDLY_URL.indexOf('?') === -1 ? '?' : '&') +
      (CALENDLY_URL.indexOf('hide_gdpr_banner=') === -1 ? 'hide_gdpr_banner=1&' : '') +
      'name=' + encodeURIComponent(payload.full_name) +
      '&email=' + encodeURIComponent(payload.email) +
      '&utm_content=' + encodeURIComponent(attr.lead_id);
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
