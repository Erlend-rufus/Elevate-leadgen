/**
 * What every page in the funnel shares: attribution and the consent question.
 * Inlined after core.cjs and before client.js (landing) or outcome.js.
 *
 * Attribution. lead_id is minted once per visit and kept in sessionStorage, so
 * a refresh or the walk from the form to an outcome page does not split one
 * visitor into two leads. UTMs and fbclid come from the URL and win over what
 * was stored. referrer is document.referrer, the page the visitor came from.
 *
 * Consent. This funnel owns its own: its own storage key, its own pixel loader.
 * Nothing is loaded until Accetto, and nothing is shared with the UK funnel.
 *
 * Plain ES5 for the same reason as client.js.
 */
(function () {
  'use strict';
  var K = window.EMIT;
  if (!K) return;
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var Core = window.EmItCore;
  /* Shorten without ending in half an emoji: encodeURIComponent throws on a lone surrogate, and a throw in
     the submit handler leaves the button doing nothing. Core.cut is the shared implementation. */
  function cut(s, n) { return Core && Core.cut ? Core.cut(s, n) : String(s).slice(0, n); }
  var STORE = 'elevate:g:' + K.slug;

  function fromStore() { try { return JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } }
  function toStore(o) { try { sessionStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }
  function mintLeadId() {
    var body;
    try { if (window.crypto && crypto.randomUUID) body = crypto.randomUUID().replace(/-/g, '').slice(0, 20); } catch (e) {}
    if (!body) body = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    return 'l_' + body;
  }

  /** @param {boolean} mint false on pages that must not invent a lead (outcome pages): they only carry what exists. */
  function attribution(mint) {
    var s = fromStore(), q = null, out = {}, k;
    for (k in s) if (Object.prototype.hasOwnProperty.call(s, k)) out[k] = s[k];
    try { q = new URLSearchParams(location.search); } catch (e) {}
    if (q) UTM.concat(['fbclid', 'lead_id']).forEach(function (n) { var v = q.get(n); if (v) out[n] = cut(v, 200); });
    if (mint && !out.lead_id) out.lead_id = mintLeadId();
    if (mint && !Object.prototype.hasOwnProperty.call(out, 'referrer')) {
      try { out.referrer = cut(document.referrer || '', 300); } catch (e) { out.referrer = ''; }
    }
    toStore(out);
    return out;
  }

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* Consent and the pixel, owned by this funnel. The UK funnel loads a shared script
     and stores its choice under its own key; this one must not share
     either: a choice made on the UK site is not consent given here, and a change to the
     shared script must not be able to switch this pixel on. Nothing is loaded, and
     nothing is written but the choice itself, until Accetto. With no pixel id in the
     config, nothing is ever loaded. */
  var KEY = K.consentKey;
  function readChoice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function writeChoice(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  var pixelLoaded = false, queued = [];
  function loadPixel() {
    if (pixelLoaded || !K.pixelId) return;
    pixelLoaded = true;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', K.pixelId);
    window.fbq('track', 'PageView');
    while (queued.length) { var ev = queued.shift(); window.fbq('track', ev[0], ev[1]); if (ev[2]) ev[2](); }
  }
  var Consent = {
    status: readChoice,
    accept: function () { writeChoice('accepted'); loadPixel(); },
    decline: function () { writeChoice('declined'); queued.length = 0; },
    /** Sent only when accepted. Before the choice it waits; after Rifiuto it is dropped.
        sent() runs when the event really went out, and only then: a caller that records
        "already sent" must not do it earlier, or a visitor who leaves before choosing
        would never be counted on a later visit. */
    track: function (name, params, sent) {
      if (readChoice() === 'declined') return;
      if (pixelLoaded && window.fbq) { window.fbq('track', name, params || {}); if (sent) sent(); }
      else queued.push([name, params || {}, sent]);
    }
  };
  if (readChoice() === 'accepted') loadPixel();

  var banner = { closed: true, listeners: [], onClose: function (fn) { banner.listeners.push(fn); } };
  var bar = document.getElementById('consent');
  if (bar && !readChoice()) {
    banner.closed = false;
    bar.hidden = false;
    document.documentElement.classList.add('banner-open');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-c]');
      if (!b) return;
      if (b.getAttribute('data-c') === 'yes') Consent.accept(); else Consent.decline();
      bar.hidden = true;
      banner.closed = true;
      document.documentElement.classList.remove('banner-open');
      for (var i = 0; i < banner.listeners.length; i++) banner.listeners[i]();
    });
  }

  window.EmItCommon = { attribution: attribution, banner: banner, consent: Consent, reduced: reduced, UTM: UTM };
})();
