/**
 * What every page in the funnel shares: attribution and the consent question.
 * Inlined after core.cjs and before client.js (landing) or outcome.js.
 *
 * Attribution. lead_id is minted once per visit and kept in sessionStorage, so
 * a refresh or the walk from the form to an outcome page does not split one
 * visitor into two leads. UTMs and fbclid come from the URL and win over what
 * was stored. referrer is document.referrer, the page the visitor came from.
 *
 * Consent. /js/consent.js owns whether the pixel loads and remembers the
 * choice; it is loaded with data-banner="off" so its dark banner stays away.
 * This only asks the question in this page's own clothes. Same storage key, so
 * nobody who chose elsewhere on the site is asked again. Nothing here loads
 * anything: until Accept, no pixel and no cookie.
 *
 * Plain ES5 for the same reason as client.js.
 */
(function () {
  'use strict';
  var K = window.UKIT;
  if (!K) return;
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
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
    if (q) UTM.concat(['fbclid', 'lead_id']).forEach(function (n) { var v = q.get(n); if (v) out[n] = v.slice(0, 200); });
    if (mint && !out.lead_id) out.lead_id = mintLeadId();
    if (mint && !Object.prototype.hasOwnProperty.call(out, 'referrer')) {
      try { out.referrer = (document.referrer || '').slice(0, 300); } catch (e) { out.referrer = ''; }
    }
    toStore(out);
    return out;
  }

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var banner = { closed: true, listeners: [], onClose: function (fn) { banner.listeners.push(fn); } };
  var C = window.ElevateConsent, bar = document.getElementById('consent');
  if (!C) {
    try { console.error('[uk-it] /js/consent.js did not load: nothing is gated and nothing will fire'); } catch (e) {}
  } else if (bar && !C.status()) {
    banner.closed = false;
    bar.hidden = false;
    document.documentElement.classList.add('banner-open');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-c]');
      if (!b) return;
      if (b.getAttribute('data-c') === 'yes') C.accept(); else C.decline();
      bar.hidden = true;
      banner.closed = true;
      document.documentElement.classList.remove('banner-open');
      for (var i = 0; i < banner.listeners.length; i++) banner.listeners[i]();
    });
  }

  window.UkItCommon = { attribution: attribution, banner: banner, reduced: reduced, UTM: UTM };
})();
