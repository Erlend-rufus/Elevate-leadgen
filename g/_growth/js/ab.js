/* The A/B test's events (config.json "ab"). The head of the page has already drawn the variant and
   set it on <html> as data-ab. Everything here goes through /js/consent.js, so nothing is sent
   before Accept and nothing at all after Decline. The events are counts for the test and carry no
   answer from the form:
     AbView       the landing page was seen, once per page view
     AbFormReach  a quarter of the form came into view
     AbFormStart  the first focus inside the form
   AbQualified is sent beside QualifiedForm, in base.js, with the variant kept for the session. */

function initAb() {
  var v = docEl.getAttribute('data-ab');
  if (!Consent || !CFG.ab || (v !== 'a' && v !== 'b')) return;
  var p = { test: CFG.ab.id, variant: v, forced: docEl.hasAttribute('data-ab-forced') ? 1 : 0 };
  Consent.track('AbView', p);

  var form = document.getElementById('form');
  if (!form) return;
  var reached = false;
  var started = false;
  if (typeof IntersectionObserver === 'function') {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && !reached) {
          reached = true;
          Consent.track('AbFormReach', p);
          io.disconnect();
        }
      }
    }, { threshold: 0.25 });
    io.observe(form);
  }
  form.addEventListener('focusin', function () {
    if (started) return;
    started = true;
    Consent.track('AbFormStart', p);
  });
}
