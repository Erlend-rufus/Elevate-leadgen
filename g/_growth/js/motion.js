/* Motion, as on the board: the figures count up and the sections arrive as they reach the screen.
   Both are decoration. The final text and the open sections are what the page is without this,
   and what it is under reduced motion, in print, and in a browser without IntersectionObserver.
   The head of the page adds html.anim only when motion is allowed; nothing here runs without it. */

function initMotion() {
  if (!docEl.classList.contains('anim') || typeof IntersectionObserver !== 'function' ||
      typeof requestAnimationFrame !== 'function') return;

  /* ---- counting figures ------------------------------------------------------------------ */
  var nf = null;
  function fmt(el, n) {
    var d = Math.max(0, Number(el.getAttribute('data-dec')) || 0);
    var s;
    try {
      nf = nf || {};
      nf[d] = nf[d] || new Intl.NumberFormat('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
      s = nf[d].format(n);
    } catch (e) { s = n.toFixed(d); }
    return (el.getAttribute('data-pre') || '') + s + (el.getAttribute('data-suf') || '');
  }
  var counters = [].slice.call(document.querySelectorAll('.cn[data-to]'));
  counters.forEach(function (el) {
    var vis = el.querySelector('[aria-hidden]');
    if (!vis) return;
    vis.textContent = fmt(el, 0);      // armed: start at zero, the final text is already in .cn-sr
    el.classList.add('cn-on');
  });
  function run(el) {
    if (el._ran) return;
    el._ran = true;
    var vis = el.querySelector('[aria-hidden]');
    if (!vis) return;
    var to = Number(el.getAttribute('data-to')) || 0;
    var dur = Math.max(200, Number(el.getAttribute('data-dur')) || 1100);
    var delay = Math.max(0, Number(el.getAttribute('data-delay')) || 0);
    var finished = false;
    function finish() { if (finished) return; finished = true; vis.textContent = fmt(el, to); }
    setTimeout(function () {
      var t0 = performance.now();
      function step(t) {
        if (finished) return;
        var p = Math.max(0, Math.min(1, (t - t0) / dur));
        var e = 1 - Math.pow(1 - p, 3);
        if (p < 1) { vis.textContent = fmt(el, to * e); requestAnimationFrame(step); } else finish();
      }
      requestAnimationFrame(step);
    }, delay);
    setTimeout(finish, delay + dur + 600);   // a tab in the background pauses animation frames; the figure must still end right
  }
  counters.filter(function (el) { return el.getAttribute('data-play') !== 'cases'; }).forEach(run);

  var cases = document.getElementById('cases');
  var caseCounters = counters.filter(function (el) { return el.getAttribute('data-play') === 'cases'; });
  if (cases && caseCounters.length) {
    var cio = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { caseCounters.forEach(run); cio.disconnect(); break; }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    cio.observe(cases);
  } else {
    caseCounters.forEach(run);
  }

  /* ---- sections arriving ------------------------------------------------------------------ */
  var rio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.remove('is-closed'); rio.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  [].forEach.call(document.querySelectorAll('.sec-in, .band .rail, .cc, .sec--form .wrap'), function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;   // already on the first screen: left open
    el.classList.add('rv', 'is-closed');
    if (el.classList.contains('sec-in')) el.classList.add('rv-line');
    rio.observe(el);
  });
}
