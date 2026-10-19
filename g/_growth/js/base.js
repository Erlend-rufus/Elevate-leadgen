/* Shared by every page of a growth funnel. The build wraps the pieces of a page in one
   function and writes CFG above them; nothing here reads the page's own copy. */

var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
var ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
var Consent = window.ElevateConsent || null;
var docEl = document.documentElement;

/* A page in a frame would show the rest of the funnel nested, with the address bar on
   another site. Put it back at the top with its query string. */
if (window.top !== window.self) { try { window.top.location.replace(location.href); } catch (e) {} }

/** 'accepted', 'declined' or '' (not chosen yet). Not chosen is not the same as declined. */
function consentState() {
  try { return Consent ? (Consent.status() || '') : ''; } catch (e) { return ''; }
}

function readQuery() {
  var out = {};
  try {
    var q = new URLSearchParams(location.search);
    ['lead_id', 'fbclid'].concat(UTM_KEYS).forEach(function (k) {
      var v = q.get(k);
      if (v) out[k] = v;
    });
  } catch (e) { /* no query, nothing to carry */ }
  return out;
}

function newId(prefix) {
  var body = '';
  try {
    if (window.crypto && crypto.randomUUID) body = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    else if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(10);
      crypto.getRandomValues(a);
      body = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
  } catch (e) { body = ''; }
  if (!body) body = Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  return (prefix || 'l_') + body;
}

function qs(o) {
  var p = new URLSearchParams();
  Object.keys(o).forEach(function (k) { if (o[k] !== '' && o[k] !== null && o[k] !== undefined) p.set(k, o[k]); });
  return p.toString();
}

function readCookie(name) {
  try {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  } catch (e) { return ''; }
}

function storeGet(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
function storeSet(key, v) { try { sessionStorage.setItem(key, v); } catch (e) { /* private mode */ } }
function storeDel(key) { try { sessionStorage.removeItem(key); } catch (e) { /* private mode */ } }

/* The cookie question. Page owned: /js/consent.js decides whether the pixel loads and keeps the
   choice; this only asks, in the page's own clothes. It comes on screen once the visitor has
   scrolled 200 px, or at once on a page too short to scroll that far. There is no timer. */
function initBanner(afterChoice) {
  var bar = document.getElementById('g-consent');
  if (!bar) return;
  if (!Consent || consentState()) { bar.parentNode.removeChild(bar); return; }
  var shown = false;
  function measure() {
    try { docEl.style.setProperty('--cb-h', bar.getBoundingClientRect().height + 'px'); } catch (e) {}
  }
  function show() {
    if (shown) return;
    shown = true;
    bar.hidden = false;
    docEl.classList.add('has-cb');
    measure();
  }
  function check() {
    var y = window.pageYOffset || docEl.scrollTop || 0;
    if (y >= 200 || docEl.scrollHeight - window.innerHeight < 200) {
      show();
      window.removeEventListener('scroll', check);
    }
  }
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('load', check);
  window.addEventListener('resize', function () { if (shown) measure(); });
  bar.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button[data-c]') : null;
    if (!b) return;
    if (b.getAttribute('data-c') === 'yes') Consent.accept(); else Consent.decline();
    window.removeEventListener('scroll', check);
    if (bar.parentNode) bar.parentNode.removeChild(bar);
    docEl.classList.remove('has-cb');
    if (typeof afterChoice === 'function') afterChoice();
  });
  check();
}

/* The qualified-form event. Fires once per lead and only after Accept, with the lead id as the
   event id, so Meta counts it once when the server sends the same event (Conversions API). */
function fireQualified(route, leadId) {
  if (!Consent || !leadId || consentState() !== 'accepted') return;
  var key = 'elevate:g:' + CFG.slug + ':' + CFG.qualifiedEvent + ':' + leadId;
  if (storeGet(key) === '1') return;
  Consent.track(CFG.qualifiedEvent, { route: route, campaign: CFG.campaign }, { eventID: leadId });
  storeSet(key, '1');
}
