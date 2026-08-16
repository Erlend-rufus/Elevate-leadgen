/**
 * Consent-gated Meta Pixel for the static pages.
 *
 * Nothing is loaded until the visitor accepts. The pixel snippet is not present
 * in the markup at all, so no request reaches connect.facebook.net before a
 * choice is made. Declining loads nothing, ever.
 *
 * Reuses the `elevate-cookie-consent` key the React app's CookieConsent banner
 * already writes, so a visitor who accepted there is not asked twice.
 *
 * Usage on a page:
 *   <script src="/js/consent.js" data-pixel="1466790598245604"></script>
 *   <script>ElevateConsent.track('QualifiedMeetingITC');</script>   // optional
 *
 * Events requested before consent are queued and fire on accept. Events
 * requested after a decline are dropped.
 */
(function () {
  'use strict';

  var KEY = 'elevate-cookie-consent';
  var self = document.currentScript;
  var PIXEL = (self && self.dataset.pixel) || '1466790598245604';

  var queue = [];
  var loaded = false;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: session only */ }
  }

  function loadPixel() {
    if (loaded) return;
    loaded = true;

    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq('init', PIXEL);
    window.fbq('track', 'PageView');

    while (queue.length) {
      var ev = queue.shift();
      window.fbq('trackCustom', ev.name, ev.params || {});
    }
  }

  function banner() {
    var el = document.createElement('div');
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Cookie consent');
    el.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:60;background:rgba(11,11,46,.97);' +
      'border-top:1px solid rgba(255,255,255,.1);backdrop-filter:blur(8px);' +
      'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    el.innerHTML =
      '<div style="max-width:1140px;margin:0 auto;padding:18px 24px;display:flex;' +
      'gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap">' +
      '<p style="margin:0;max-width:62ch;font-size:14px;line-height:1.6;color:#b9bbd9">' +
      'We use analytics cookies to understand how this page is used. Accept or decline; ' +
      'the page works the same either way.</p>' +
      '<div style="display:flex;gap:12px;flex-shrink:0">' +
      '<button type="button" data-c="declined" style="background:none;border:1px solid ' +
      'rgba(255,255,255,.2);color:#b9bbd9;padding:10px 20px;border-radius:8px;font:inherit;' +
      'font-size:14px;cursor:pointer">Decline</button>' +
      '<button type="button" data-c="accepted" style="background:linear-gradient(135deg,' +
      '#00a3d6,#006aba,#02009a);border:none;color:#fff;padding:10px 22px;border-radius:8px;' +
      'font:inherit;font-size:14px;font-weight:600;cursor:pointer">Accept</button>' +
      '</div></div>';

    el.addEventListener('click', function (e) {
      var choice = e.target && e.target.dataset && e.target.dataset.c;
      if (!choice) return;
      write(choice);
      el.remove();
      if (choice === 'accepted') loadPixel();
      else queue.length = 0;
    });

    document.body.appendChild(el);
  }

  window.ElevateConsent = {
    /** Fire a custom conversion, or queue it until consent is given. */
    track: function (name, params) {
      if (read() === 'declined') return;
      if (loaded && window.fbq) window.fbq('trackCustom', name, params || {});
      else queue.push({ name: name, params: params });
    },
    status: read
  };

  function start() {
    var choice = read();
    if (choice === 'accepted') loadPixel();
    else if (choice !== 'declined') banner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
