/* The booking page: the calendar, and what happens when a time is booked. */

function initBook() {
  var q = readQuery();
  var known = !!(q.lead_id && ID_RE.test(q.lead_id));
  var leadId = known ? q.lead_id : newId('d_');   // d_: arrived without a form, so a booking we can not tie to an application

  /* name and e-mail from the form, once: read here and removed. Only the page that follows a fit sends them. */
  var pre = null;
  var raw = storeGet(CFG.prefillKey);
  if (raw) {
    storeDel(CFG.prefillKey);
    try {
      var o = JSON.parse(raw);
      if (o && o.l === leadId && typeof o.t === 'number' && Date.now() - o.t < 30 * 60 * 1000) pre = o;
    } catch (e) { pre = null; }
  }

  var host = document.getElementById('cal');
  if (host && CFG.calendlyUrl) {
    /* Calendly takes name, e-mail and five tracking parameters, and no more. The lead id rides in
       the one named in the config, which replaces the tracking value of the same name: the creative
       is kept on the application, so nothing is lost. The look is the page's own: white inside the
       white box, ink text. */
    var p = ['hide_gdpr_banner=1', 'background_color=FFFFFF', 'text_color=10141C', 'primary_color=0073BD'];
    if (pre && pre.n) p.push('name=' + encodeURIComponent(pre.n));
    if (pre && pre.e) p.push('email=' + encodeURIComponent(pre.e));
    var tracking = {};
    UTM_KEYS.forEach(function (k) { if (q[k]) tracking[k] = q[k]; });
    tracking[CFG.calendlyLeadParam] = leadId;
    Object.keys(tracking).forEach(function (k) { p.push(k + '=' + encodeURIComponent(tracking[k])); });
    var w = document.createElement('div');
    w.className = 'calendly-inline-widget';
    w.setAttribute('data-url', CFG.calendlyUrl + '?' + p.join('&'));
    host.appendChild(w);
    var sc = document.createElement('script');
    sc.src = 'https://assets.calendly.com/assets/external/widget.js';
    sc.async = true;
    document.head.appendChild(sc);
  }

  /* Calendly's own redirect is unreliable inside an in-app browser and gives no say over the
     parameters, so the event is what forwards. There is no timer: a timeout would count a booking
     that never happened. The event type's redirect setting in Calendly must stay unset, or the
     visitor is sent twice. */
  window.addEventListener('message', function (e) {
    if (!/^https:\/\/([a-z0-9-]+\.)*calendly\.com$/.test(String(e.origin))) return;
    if (e.data && e.data.event === 'calendly.event_scheduled') {
      var out = { lead_id: leadId };
      UTM_KEYS.forEach(function (k) { if (q[k]) out[k] = q[k]; });
      location.href = CFG.takkPath + '?' + qs(out);
    }
  });

  /* A qualified form is a lead we sent here from the form. A visit without a lead id is not. */
  function fire() { if (known) fireQualified('fit', leadId); }
  initBanner(fire);
  fire();
}
