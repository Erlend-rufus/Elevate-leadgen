/**
 * Progressive enhancement for /g/uk-it-larger-firms.
 *
 * The page works without this file: every question is on the page, the button
 * is a normal submit, the FAQ is <details>, the anchor is an anchor, and the
 * server validates. This adds what a script can do better: one question at a
 * time, a progress bar, focus that follows the visitor, errors beside the
 * field, a submit that does not leave the page until it knows the outcome,
 * the consent question, and the sticky button on a phone.
 *
 * Plain ES5, inlined after core.cjs. Reads window.UKIT, written by the
 * generator: { slug, questions, messages, labels, applyPath, hidden, icon }.
 */
(function () {
  'use strict';
  var K = window.UKIT, Core = window.UkItCore;
  if (!K || !Core) { try { document.documentElement.className = document.documentElement.className.replace(/\bjs\b/, 'no-js'); console.error('[uk-it] core or config missing: the form stays in its no-script layout'); } catch (e) {} return; }

  var Common = window.UkItCommon;
  if (!Common) { try { document.documentElement.className = document.documentElement.className.replace(/\bjs\b/, 'no-js'); console.error('[uk-it] common.js missing: the form stays in its no-script layout'); } catch (e) {} return; }
  var form = document.getElementById('apply-form');
  var reduced = Common.reduced;
  /* The page is marked "js" in the head, which is what hides all but one question.
     If this script then fails, put the page back as it is without one, so a visitor
     is left with a form they can finish instead of one question and a final submit. */
  function revert() { document.documentElement.className = document.documentElement.className.replace(/\bjs\b/, 'no-js'); }

  /* The hidden fields are filled as soon as the script runs, from the URL and
     from the session. lead_id is minted here, so it exists before the visitor
     has typed anything and is the same one on every page that follows. */
  function fillHidden() {
    var a = Common.attribution(true);
    K.hidden.forEach(function (name) {
      var el = form.elements[name];
      if (!el || name === 'page_slug') return;
      el.value = a[name] || '';
    });
  }

  /* -------------------------------------------------------------- the form */

  try { if (form) {
    var qEls = Array.prototype.slice.call(form.querySelectorAll('.q'));
    var Q = K.questions, M = K.messages, total = Q.length;
    var step = 0, status = 'idle';
    var btn = form.querySelector('.btn'), label = form.querySelector('.btn-label');
    var back = form.querySelector('.back'), bar = form.querySelector('.bar'), fill = form.querySelector('.bar-fill');
    var SPIN = '<svg class="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" stroke-opacity="0.25"></circle><path d="M21 12a9 9 0 0 0-9-9" stroke-linecap="round"></path></svg>';

    fillHidden();

    var radioValue = function (name) {
      var r = form.querySelector('input[name="' + name + '"]:checked');
      return r ? r.value : null;
    };
    var getVal = function (name) {
      var els = form.elements[name];
      if (!els) return null;
      if (els.length !== undefined && els.type === undefined) return radioValue(name);   // RadioNodeList
      return els.value;
    };
    var answers = function () { return Core.answersFrom(Q, getVal); };

    var el = function (html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; };
    var errHtml = function (id, msg) {
      return '<div class="err" role="alert" id="' + id + '">' + K.icon + '<span></span></div>';
    };
    var addErr = function (parent, id, msg) {
      var node = el(errHtml(id, msg));
      node.lastChild.textContent = msg;
      parent.appendChild(node);
    };

    /* One field's error: the control is marked, a message follows it, and the
       control points at the message. All of it goes again when the field changes. */
    var clearField = function (control, id) {
      var m = document.getElementById(id);
      if (m && m.parentNode) m.parentNode.removeChild(m);
      if (!control) return;
      control.setAttribute('aria-invalid', 'false');
      control.removeAttribute('aria-describedby');
      if (control.classList) { control.classList.remove('is-bad'); control.classList.remove('has-error'); }
    };
    var clearQuestion = function (q) {
      var root = form.querySelector('[data-q="' + q.id + '"]');
      if (!root) return;
      if (q.kind === 'choice') clearField(root.querySelector('.opts'), 'e-' + q.id);
      else if (q.kind === 'details') q.fields.forEach(function (f) { clearField(document.getElementById('f-' + q.id + '-' + f.key), 'e-' + q.id + '-' + f.key); });
      else clearField(document.getElementById('f-' + q.id), 'e-' + q.id);
    };
    var showQuestion = function (q, result) {
      var root = form.querySelector('[data-q="' + q.id + '"]');
      clearQuestion(q);
      if (!root || !result) return;
      if (q.kind === 'choice') {
        var g = root.querySelector('.opts');
        g.classList.add('has-error'); g.setAttribute('aria-invalid', 'true'); g.setAttribute('aria-describedby', 'e-' + q.id);
        addErr(root, 'e-' + q.id, result);
      } else if (q.kind === 'details') {
        q.fields.forEach(function (f) {
          if (!result[f.key]) return;
          var input = document.getElementById('f-' + q.id + '-' + f.key);
          input.classList.add('is-bad'); input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', 'e-' + q.id + '-' + f.key);
          addErr(input.parentNode, 'e-' + q.id + '-' + f.key, result[f.key]);
        });
      } else {
        var t = document.getElementById('f-' + q.id);
        t.classList.add('is-bad'); t.setAttribute('aria-invalid', 'true'); t.setAttribute('aria-describedby', 'e-' + q.id);
        addErr(root, 'e-' + q.id, result);
      }
    };
    var focusFirstBad = function (q) {
      var root = form.querySelector('[data-q="' + q.id + '"]');
      var target = root && (root.querySelector('.is-bad') || root.querySelector('input[type=radio]') || root.querySelector('input'));
      if (target) { try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); } }
    };

    /* ---------------------------------------------------------- the steps */

    var setGeneral = function (on) {
      var g = form.querySelector('.general');
      if (g && g.parentNode) g.parentNode.removeChild(g);
      if (!on) return;
      var node = el('<div class="general" role="alert"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5v.5"></path></svg><span></span></div>');
      var span = node.lastChild;
      span.appendChild(document.createTextNode(M.general));
      var a = document.createElement('a'); a.href = 'mailto:' + K.email; a.textContent = K.email; span.appendChild(a);
      form.querySelector('.submit-area').insertBefore(node, btn);
    };
    var setStatus = function (s) {
      status = s;
      var loading = s === 'loading', wasLoading = status === 'loading' && !loading;
      btn.disabled = loading;
      btn.setAttribute('aria-busy', loading ? 'true' : 'false');
      var spin = btn.querySelector('.spin');
      if (loading && !spin) btn.insertAdjacentHTML('beforeend', SPIN);
      if (!loading && spin) spin.parentNode.removeChild(spin);
      setGeneral(s === 'failed');
      if (wasLoading) { try { btn.focus({ preventScroll: true }); } catch (e) {} }   // a disabled button drops focus to <body>
    };
    var goto = function (n, focus) {
      step = n;
      qEls.forEach(function (node, i) { if (i === n) node.classList.add('is-current'); else node.classList.remove('is-current'); });
      var last = n === total - 1;
      form.classList.toggle('at-last', last);
      label.textContent = last ? K.labels.submit : K.labels.next;
      back.hidden = n === 0;
      bar.setAttribute('aria-valuenow', String(n + 1));
      fill.style.width = ((n + 1) / total * 100) + '%';
      if (focus) {
        try { qEls[n].focus({ preventScroll: true }); } catch (e) { qEls[n].focus(); }
        var r = form.getBoundingClientRect();
        if (r.top < 0) { try { form.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); } catch (e) { form.scrollIntoView(); } }
      }
    };

    var check = function (i) {
      var res = Core.validateQuestion(Q[i], answers(), M);
      showQuestion(Q[i], res);
      if (res) focusFirstBad(Q[i]);
      return !res;
    };

    var submit = function () {
      var all = Core.validateAll(Q, answers(), M);
      if (!all.ok) {
        Q.forEach(function (q) { showQuestion(q, all.errors[q.id] || null); });
        for (var i = 0; i < Q.length; i++) if (Q[i].id === all.firstId) { goto(i, true); focusFirstBad(Q[i]); break; }
        return;
      }
      var pairs = [];
      Array.prototype.forEach.call(form.elements, function (c) {
        if (!c.name || c.disabled || c.type === 'submit' || c.type === 'button') return;
        if ((c.type === 'radio' || c.type === 'checkbox') && !c.checked) return;
        pairs.push(encodeURIComponent(c.name) + '=' + encodeURIComponent(c.value));
      });
      setStatus('loading');
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
      fetch(K.applyPath, {
        signal: ctl ? ctl.signal : undefined,
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'Accept': 'application/json' },
        body: pairs.join('&')
      }).then(function (res) {
        clearTimeout(timer);
        return res.json().then(function (data) { return { ok: res.ok, code: res.status, data: data }; }, function () { return { ok: false, code: res.status, data: null }; });
      }).then(function (r) {
        if (r.ok && r.data && r.data.next) { location.assign(r.data.next); return; }
        if (r.code === 422 && r.data && r.data.errors) {
          setStatus('idle');
          Q.forEach(function (q) { showQuestion(q, r.data.errors[q.id] || null); });
          for (var i = 0; i < Q.length; i++) if (r.data.errors[Q[i].id]) { goto(i, true); focusFirstBad(Q[i]); break; }
          return;
        }
        setStatus('failed');
      }, function () { clearTimeout(timer); setStatus('failed'); });
    };

    /* Back from the next page can restore this one from the browser's page cache with
       the button frozen mid-send. Start it fresh. */
    window.addEventListener('pageshow', function (e) { if (e.persisted && status === 'loading') setStatus('idle'); });

    form.addEventListener('submit', function (e) {
      if (status === 'loading') { e.preventDefault(); return; }
      var last = step === total - 1;
      if (last && !window.fetch) return;                    // old WebView: let the browser post it, the server handles that
      e.preventDefault();
      if (!last) { if (check(step)) goto(step + 1, true); return; }
      if (!check(step)) return;
      submit();
    });
    back.addEventListener('click', function () { if (step > 0) goto(step - 1, true); });

    /* A field that changes is a field the visitor is fixing: its error goes, and so does a general failure. */
    var onChange = function (e) {
      var root = e.target.closest ? e.target.closest('[data-q]') : null;
      if (status === 'failed') setStatus('idle');
      if (!root) return;
      for (var i = 0; i < Q.length; i++) if (Q[i].id === root.getAttribute('data-q')) {
        var q = Q[i];
        if (q.kind === 'details') {
          var id = e.target.id.replace(/^f-/, '');
          clearField(e.target, 'e-' + id);
        } else clearQuestion(q);
      }
    };
    form.addEventListener('input', onChange);
    form.addEventListener('change', onChange);

    goto(0, false);
  } } catch (err) { revert(); try { console.error('[uk-it] form script failed, showing the form without it', err); } catch (x) {} }

  /* ------------------------------------------- the link to the form, sticky */

  var section = document.getElementById('form');
  var heroCta = document.getElementById('hero-cta');
  var sticky = document.getElementById('sticky');
  var toForm = function (e) {
    if (!section) return;
    e.preventDefault();
    try { section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); } catch (x) { section.scrollIntoView(); }
    var first = form && form.querySelector('.q.is-current');
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) {} }
  };
  Array.prototype.forEach.call(document.querySelectorAll('a[href="#form"]'), function (a) { a.addEventListener('click', toForm); });

  if (sticky && section && heroCta && 'IntersectionObserver' in window) {
    var narrow = false, heroGone = false, formIn = false;
    var mq = null;
    try { mq = window.matchMedia('(max-width: 767.98px)'); narrow = mq.matches; } catch (e) {}
    var paint = function () {
      var show = narrow && heroGone && !formIn && Common.banner.closed;
      sticky.hidden = !show;
      document.body.classList.toggle('has-sticky', show);
      document.documentElement.classList.toggle('has-sticky', show);
    };
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { heroGone = !en.isIntersecting && en.boundingClientRect.top < 0; });
      paint();
    }).observe(heroCta);
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { formIn = en.isIntersecting; });
      paint();
    }).observe(section);
    if (mq) { var onMq = function (e) { narrow = e.matches; paint(); }; if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }
    Common.banner.onClose(paint);
    paint();
  }
})();
