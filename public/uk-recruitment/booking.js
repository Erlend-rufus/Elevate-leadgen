/* UK recruitment funnel: booking page. Attribution arrives entirely via the
   URL - Typeform's own redirect handed it here as query params, inserted
   from the hidden fields set on the form - so there is no sessionStorage
   merge to do, unlike the landing page. Shows Calendly, then forwards to
   thanks-booked once a slot is actually booked. No framework, no build step. */
(function () {
  'use strict';

  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function readParams() {
    var q = new URLSearchParams(location.search), out = {};
    UTM.concat(['fbclid', 'lead_id']).forEach(function (k) {
      var v = q.get(k);
      if (v) out[k] = v;
    });
    return out;
  }

  var p = readParams();

  /* Colours and the hidden page details come from the event's own booking
     page settings, so they are already in this URL. Do not re-add them
     below: a duplicated query key is a coin toss over which one Calendly
     reads. */
  var CALENDLY_URL = 'https://calendly.com/d/dtth-7vs-2x8/' +
    'geo-visibility-review-30-minutes' +
    '?hide_event_type_details=1&hide_gdpr_banner=1' +
    '&text_color=12123d&primary_color=006aba';

  var url = CALENDLY_URL + (CALENDLY_URL.indexOf('?') === -1 ? '?' : '&');
  if (p.lead_id) url += 'utm_content=' + encodeURIComponent(p.lead_id) + '&';
  UTM.forEach(function (k) {
    if (k !== 'utm_content' && p[k]) url += k + '=' + encodeURIComponent(p[k]) + '&';
  });
  url = url.replace(/&$/, '');

  var host = document.getElementById('cal-host');
  if (host) {
    var div = document.createElement('div');
    div.className = 'calendly-inline-widget';
    div.setAttribute('data-url', url);
    host.appendChild(div);

    var s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    document.head.appendChild(s);
  }

  /* Calendly's own redirect setting is unreliable in in-app browsers and
     hands us no control over the parameters, so we listen instead. There is
     deliberately no timeout fallback: redirecting on a timer would count a
     booking that never happened. */
  window.addEventListener('message', function (e) {
    if (!/calendly\.com$/.test(String(e.origin).replace(/^https?:\/\//, '').split('/')[0] || '')) return;
    if (e.data && e.data.event === 'calendly.event_scheduled') {
      var q = new URLSearchParams();
      if (p.lead_id) q.set('lead_id', p.lead_id);
      UTM.forEach(function (k) { if (p[k]) q.set(k, p[k]); });
      if (p.fbclid) q.set('fbclid', p.fbclid);
      location.href = '/uk-recruitment/thanks-booked?' + q.toString();
    }
  });
})();
