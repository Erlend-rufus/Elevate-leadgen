/* Motion for the v2 design (scripts/build-g-growth.mjs, the V2 renderers). It only moves what the page
   already shows: without this script, under reduced motion and without IntersectionObserver every element is
   in its final state (html.anim is never set). The one loop, the hero pipeline, has a pause button and stops
   while the tab is hidden (WCAG 2.2.2). The counters themselves are run by motion.js. */

function initMotion2() {
  if (!docEl.classList.contains('anim') || typeof IntersectionObserver !== 'function' ||
      typeof requestAnimationFrame !== 'function') return;

  var $$ = function (sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); };
  var EASE = 'cubic-bezier(.2,.7,.1,1)';

  /* ---- hero: the words of the heading rise in (BYQ scroll-text-reveal, without the pin) ----------- */
  var h1 = document.querySelector('.v2-h1');
  if (h1 && typeof h1.animate === 'function') {
    var label = h1.textContent.replace(/\s+/g, ' ').trim();
    h1.setAttribute('aria-label', label);
    var n = 0;
    [].slice.call(h1.childNodes).forEach(function (node) {
      var soft = node.nodeType === 1;
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
        var outer = document.createElement('span');
        outer.className = 'v2-w' + (soft ? ' v2-soft' : '');
        outer.setAttribute('aria-hidden', 'true');
        var inner = document.createElement('span');
        inner.textContent = w;
        inner.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }],
          { duration: 900, delay: 100 + n * 50, easing: EASE, fill: 'both' });
        outer.appendChild(inner); frag.appendChild(outer); n++;
      });
      h1.replaceChild(frag, node);
    });
  }

  /* ---- hero: the illustrative pipeline, a loop with a pause button ------------------------------- */
  var pipe = document.querySelector('.v2-pipe');
  var pauseBtn = document.querySelector('.v2-pause');
  if (pipe && pauseBtn) {
    var tags = [];
    try { tags = JSON.parse(pipe.getAttribute('data-tags')) || []; } catch (e) { tags = []; }
    var stacks = [0, 1, 2].map(function (c) { return pipe.querySelector('[data-ps="' + c + '"]'); });
    var counts = [0, 1, 2].map(function (c) { return pipe.querySelector('[data-pc="' + c + '"]'); });
    var seq = [0, 0, 1, 0, 1, 2], step = 0, timer = null, paused = false;
    var add = function () {
      var col = seq[step % seq.length]; step++;
      var card = document.createElement('div');
      card.className = 'v2-card is-new' + (col === 2 ? ' is-won' : '');
      var w = 55 + Math.floor(Math.random() * 40);
      card.innerHTML = '<span class="v2-bar" style="width:' + w + '%"></span><span class="v2-bar v2-bar--s"></span><span class="v2-tag"></span>';
      card.lastChild.textContent = tags[col] || '';
      stacks[col].insertBefore(card, stacks[col].firstChild);
      while (stacks[col].children.length > 3) stacks[col].removeChild(stacks[col].lastChild);
      counts[col].textContent = String(Number(counts[col].textContent) + 1);
    };
    var start = function () { if (!timer && !paused && !document.hidden) timer = setInterval(add, 1600); };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    pauseBtn.hidden = false;
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseBtn.textContent = pauseBtn.getAttribute(paused ? 'data-resume' : 'data-pause');
      pipe.classList.toggle('is-paused', paused);
      if (paused) stop(); else start();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    /* only while the pipeline is on screen */
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else stop(); }).observe(pipe);
  }

  /* ---- reveals: one observer, staggered by position among siblings -------------------------------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      var el = e.target;
      setTimeout(function () { el.classList.add('is-on'); }, Number(el.getAttribute('data-d')) || 0);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  var stagger = function (sel, gap) {
    $$(sel).forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.85) { el.classList.add('is-on'); return; }
      el.setAttribute('data-d', [].indexOf.call(el.parentNode.children, el) * gap);
      io.observe(el);
    });
  };
  stagger('.v2-ticks li', 140);
  stagger('.v2-rows li', 110);
  stagger('.v2-trio li', 150);

  /* cases: the figures come into focus as they count (BYQ nextwell-stats-2) */
  var cases = document.querySelector('.v2-cases');
  if (cases) {
    var cio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      cio.disconnect();
      $$('.v2-big .cn, .v2-total .cn').forEach(function (el, i) {
        setTimeout(function () { el.classList.add('v2-sharp'); }, i * 180);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    cio.observe(cases);
  }

  /* meeting: the track fills first, then the steps (BYQ kelvin-process-1) */
  var track = document.querySelector('.v2-track');
  var steps = $$('.v2-steps li');
  if (track && steps.length) {
    var tio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      tio.disconnect();
      track.classList.add('is-on');
      steps.forEach(function (s, i) { setTimeout(function () { s.classList.add('is-on'); }, 450 + i * 420); });
    }, { threshold: 0.3 });
    tio.observe(steps[0].parentNode);
  }

  /* ---- measure: scroll scrubs each row into focus (BYQ scroll-blur-reveal) ----------------------- */
  var rows = $$('.v2-mrow');
  if (rows.length) {
    var ticking = false;
    var scrub = function () {
      ticking = false;
      var vh = window.innerHeight;
      rows.forEach(function (r) {
        var top = r.getBoundingClientRect().top;
        var p = Math.max(0, Math.min(1, (vh * 0.88 - top) / (vh * 0.38)));
        r.style.setProperty('--p', p.toFixed(3));
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(scrub); } }, { passive: true });
    window.addEventListener('resize', scrub);
    scrub();
  }

  /* ---- faq: one answer open at a time, the height animates (BYQ stringer-faq-2) ------------------ */
  var qas = $$('.v2-qa');
  var shut = function (q) {
    q.classList.add('is-shut');
    setTimeout(function () { q.open = false; q.classList.remove('is-shut'); }, 420);
  };
  qas.forEach(function (q, i) {
    if (i > 0) q.open = false;   // the page is built with every answer open, for a visitor without script
    q.querySelector('summary').addEventListener('click', function (ev) {
      ev.preventDefault();
      if (q.open) { shut(q); return; }
      qas.forEach(function (o) { if (o !== q && o.open) shut(o); });
      q.classList.add('is-shut');
      q.open = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { q.classList.remove('is-shut'); }); });
    });
  });
}
