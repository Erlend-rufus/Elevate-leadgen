/**
 * The five outcome pages. Only /book has anything to do: it puts the calendar
 * in the box and, when Calendly says a time was booked, sends the visitor on to
 * /takk with the same tracking parameters. The other four pages need nothing
 * from a script beyond the consent question, which common.js handles.
 *
 * Calendly's own redirect-after-booking is deliberately not used: it is
 * unreliable inside the Facebook in-app browser and gives no control over the
 * query string. The same reasoning, and the same mechanism, as the booking
 * page in /g/uk-private-clinics. The event's own redirect setting must stay
 * off in Calendly, or the visitor is sent twice. There is no timer: a timeout
 * would send someone to "You are booked in" who never booked.
 *
 * Plain ES5.
 */
(function () {
  'use strict';
  var K = window.EMIT, Common = window.EmItCommon;
  if (!K || !Common) return;
  var a = Common.attribution(false);

  /* The one conversion. Lead fires only on /italy/takk/, which is reached only after a
     booking: not on submit, and never for a lead that was turned away. Once per lead id,
     and only while consent allows (Consent.track holds it until the choice is made and
     drops it after Rifiuto). A refresh must not count again. */
  if (K.page === 'takk') {
    var gk = 'em:it:lead:' + (a.lead_id || 'none'), seen = false;
    try { seen = sessionStorage.getItem(gk) === '1'; } catch (e) {}
    if (!seen) {
      Common.consent.track('Lead', { lead_id: a.lead_id || '' }, function () {
        try { sessionStorage.setItem(gk, '1'); } catch (e) {}
      });
    }
  }

  var host = document.getElementById('cal');
  if (!host || !K.calendlyUrl) return;

  /* Colours are the page's: a white panel, ink text, an ink button. Calendly
     draws white text on the primary colour, so the primary has to be dark.
     Calendly ignores these on its free plan; see LAUNCH.md.

     lead_id rides in utm_term because Calendly accepts five tracking
     parameters and no more, and utm_content must keep naming the creative.
     Same convention as /g/uk-private-clinics. */
  var p = ['hide_gdpr_banner=1', 'background_color=FFFFFF', 'text_color=10141C', 'primary_color=10141C'];
  if (a.lead_id) p.push('utm_term=' + encodeURIComponent(a.lead_id));
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
    if (a[k]) p.push(k + '=' + encodeURIComponent(a[k]));
  });

  var w = document.createElement('div');
  w.className = 'calendly-inline-widget';
  w.setAttribute('data-url', K.calendlyUrl + '?' + p.join('&'));
  host.innerHTML = '';
  host.appendChild(w);
  var sc = document.createElement('script');
  sc.src = 'https://assets.calendly.com/assets/external/widget.js';
  sc.async = true;
  document.head.appendChild(sc);

  window.addEventListener('message', function (e) {
    if (!/^https:\/\/([a-z0-9-]+\.)*calendly\.com$/.test(String(e.origin))) return;
    if (e.data && e.data.event === 'calendly.event_scheduled') {
      var q = [];
      Common.UTM.concat(['fbclid', 'lead_id']).forEach(function (k) { if (a[k]) q.push(k + '=' + encodeURIComponent(a[k])); });
      location.href = K.takkPath + (q.length ? '?' + q.join('&') : '');
    }
  });
})();
