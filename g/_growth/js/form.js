/* The application form. The page ships the whole form as plain HTML (every question, a
   submit button, a post to the lead endpoint) and works like that with no script. This turns
   the same markup into one question at a time, checks each answer with the same code the
   server runs (CORE, inlined from core.mjs), and posts the answers without leaving the page.
   It never builds a question itself: the questions are in the HTML, from core.mjs, so the
   page and the server cannot disagree about what is asked. */

function initForm() {
  var form = document.getElementById('lf-form');
  if (!form || !CORE || !window.fetch || !window.FormData || !window.URLSearchParams ||
      !Element.prototype.closest || !('classList' in form)) return;

  var T = CFG.text;
  var STEPS = CORE.STEPS;
  var blocks = STEPS.map(function (s) { return form.querySelector('.lf-block[data-step="' + s.id + '"]'); });
  if (blocks.some(function (b) { return !b; })) return;   // markup and definition disagree: stay with the plain form
  var total = blocks.length;
  var cur = 0;
  var phase = 'idle';                                     // idle | sending | failed
  var leadId = '';
  var shownKey = {};                                      // step index -> the errors on show, to avoid redrawing them
  var armed = {};                                         // step index -> the visitor has tried to go on, so errors stay live

  /* ---- the parts the script adds -------------------------------------------------------- */
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5v.5"></path></svg>';
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var prog = document.createElement('div');
  prog.className = 'lf-prog';
  prog.innerHTML =
    '<div class="lf-prog-top"><div class="lf-prog-l">' +
    '<button class="lf-back" type="button" hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>' + esc(T.back) + '</button>' +
    '</div><span class="lf-count" id="lf-count"></span></div>' +
    '<div class="lf-bar" role="progressbar" aria-labelledby="lf-count" aria-valuemin="1" aria-valuemax="' + total + '" aria-valuenow="1"><span class="lf-bar-fill"></span></div>';
  form.insertBefore(prog, form.firstChild);
  var back = prog.querySelector('.lf-back');
  var count = prog.querySelector('.lf-count');
  var bar = prog.querySelector('.lf-bar');
  var fill = prog.querySelector('.lf-bar-fill');

  var actions = form.querySelector('.lf-actions');
  var btn = actions.querySelector('.btn');
  var consentP = form.querySelector('.lf-consent');

  var status = document.createElement('div');
  status.className = 'lf-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  status.innerHTML = '<p class="lf-status-t">' + esc(T.sending) + '</p><div class="lf-calm" aria-hidden="true"><span class="lf-calm-fill"></span></div>';
  form.insertBefore(status, actions);

  var gerr = document.createElement('p');
  gerr.className = 'lf-gerr';
  gerr.setAttribute('role', 'alert');
  gerr.hidden = true;
  gerr.innerHTML = ICON + '<span>' + esc(T.failed) + ' <a class="lf-ulink" href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + '</a></span>';
  form.insertBefore(gerr, status);

  form.classList.add('is-steps');

  /* ---- reading the form ------------------------------------------------------------------ */
  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el.length && el[0] && el[0].type === 'checkbox') {   // a multi-choice question: its ticked options, in order
      var picked = [];
      for (var k = 0; k < el.length; k++) if (el[k].checked) picked.push(el[k].value);
      return picked.join(', ');
    }
    if (el.type === 'checkbox') return el.checked ? el.value : '';
    return el.value || '';
  }
  function setHidden(name, v) {
    var el = form.elements[name];
    if (el && el.type === 'hidden') el.value = v || '';
  }
  function fieldsOf(step) {
    if (step.kind === 'group') return step.fields.map(function (f) { return f.field; });
    return step.other ? [step.field, step.other.field] : [step.field];
  }

  /* ---- errors ---------------------------------------------------------------------------- */
  function addDescribed(el, id) {
    var cur = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (cur.indexOf(id) < 0) cur.push(id);
    el.setAttribute('aria-describedby', cur.join(' '));
  }
  function dropDescribed(el) {
    var rest = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (t) { return t && t.indexOf('e-') !== 0; });
    if (rest.length) el.setAttribute('aria-describedby', rest.join(' ')); else el.removeAttribute('aria-describedby');
  }
  function clearErrors(i) {
    var b = blocks[i];
    [].forEach.call(b.querySelectorAll('.lf-err'), function (p) { p.parentNode.removeChild(p); });
    [].forEach.call(b.querySelectorAll('[aria-invalid="true"]'), function (el) { el.setAttribute('aria-invalid', 'false'); });
    [].forEach.call(b.querySelectorAll('[aria-describedby]'), dropDescribed);
    shownKey[i] = '';
  }
  function showErrors(i, errs) {
    var key = JSON.stringify(errs);
    if (shownKey[i] === key) return;
    clearErrors(i);
    shownKey[i] = key;
    var b = blocks[i];
    Object.keys(errs).forEach(function (field) {
      var p = document.createElement('p');
      p.className = 'lf-err';
      p.id = 'e-' + field;
      p.innerHTML = ICON + '<span>' + esc(errs[field]) + '</span>';
      var fs = b.querySelector('fieldset.lf-set');
      var input = b.querySelector('#f-' + field);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        addDescribed(input, p.id);
        input.parentNode.insertBefore(p, input.nextSibling);
      } else if (fs) {
        addDescribed(fs, p.id);
        fs.appendChild(p);
      }
    });
  }
  function check(i) { return CORE.stepErrors(STEPS[i], val); }

  /* ---- moving between questions ---------------------------------------------------------- */
  function firstControl(i) {
    var s = STEPS[i];
    if (s.kind === 'choice' || s.kind === 'multi') return blocks[i].querySelector('legend.lf-q');
    return blocks[i].querySelector('input.lf-input');
  }
  function focusControl(el) {
    if (!el) return;
    if (el.tagName === 'LEGEND') el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }
  function bringIntoView() {
    var r = form.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) form.scrollIntoView({ block: 'start' });
  }
  function render() {
    blocks.forEach(function (b, k) { b.hidden = k !== cur; });
    count.textContent = (cur + 1) + ' / ' + total;
    bar.setAttribute('aria-valuenow', String(cur + 1));
    bar.setAttribute('aria-valuetext', count.textContent);
    fill.style.width = Math.round(((cur + 1) / total) * 100) + '%';
    var last = cur === total - 1;
    back.hidden = cur === 0;
    back.disabled = phase === 'sending';
    if (consentP) consentP.hidden = !last;
    btn.textContent = phase === 'failed' ? T.retry : (last ? T.cta : T.next);
    btn.disabled = phase === 'sending';
    if (phase === 'sending') btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled');
    status.hidden = phase !== 'sending';
    gerr.hidden = phase !== 'failed';
    form.classList.toggle('is-sending', phase === 'sending');
    form.setAttribute('aria-busy', phase === 'sending' ? 'true' : 'false');
  }
  function go(i, focus) {
    clearErrors(cur);                  // errors belong to one visit to a question, as on the board
    armed = {};
    cur = Math.max(0, Math.min(total - 1, i));
    render();
    bringIntoView();
    if (focus) focusControl(firstControl(cur));
  }

  /* ---- choices --------------------------------------------------------------------------- */
  function syncChoices() {
    [].forEach.call(form.querySelectorAll('.lf-card'), function (card) {
      var input = card.querySelector('input');
      card.classList.toggle('is-checked', !!(input && input.checked));
    });
    STEPS.forEach(function (s, i) {
      if (!s.other) return;
      var box = blocks[i].querySelector('[data-other-for]');
      if (box) box.hidden = val(s.field) !== s.other.value;
    });
  }
  form.addEventListener('change', function (e) {
    if (e.target && (e.target.type === 'radio' || e.target.type === 'checkbox')) {
      syncChoices();
      afterEdit(e.target);
    }
  });
  form.addEventListener('input', function (e) { afterEdit(e.target); });
  function afterEdit(target) {
    var b = target && target.closest ? target.closest('.lf-block') : null;
    var i = b ? blocks.indexOf(b) : -1;
    if (i >= 0 && armed[i]) showErrors(i, check(i));   // once told, the messages follow the answer
  }

  /* ---- the hidden fields ----------------------------------------------------------------- */
  function fillHidden() {
    var q = readQuery();
    setHidden('lead_id', leadId);
    UTM_KEYS.forEach(function (k) { setHidden(k, q[k] || ''); });
    var accepted = consentState() === 'accepted';
    setHidden('consent', consentState());
    setHidden('fbclid', accepted ? (q.fbclid || '') : '');
    var fbp = accepted ? readCookie('_fbp') : '';
    var fbc = accepted ? readCookie('_fbc') : '';
    if (accepted && !fbc && q.fbclid) fbc = 'fb.1.' + Date.now() + '.' + q.fbclid;
    setHidden('fbp', fbp);
    setHidden('fbc', fbc);
    var ref = '';
    try { ref = document.referrer || ''; } catch (e) { ref = ''; }
    setHidden('referrer', ref.slice(0, 300));
  }
  function collect() {
    var data = {};
    [].forEach.call(form.elements, function (el) {
      if (!el.name || el.type === 'submit' || el.type === 'button') return;
      if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; return; }
      if (el.type === 'checkbox') { data[el.name] = val(el.name); return; }
      data[el.name] = el.value;
    });
    return data;
  }

  /* ---- sending --------------------------------------------------------------------------- */
  function sameSite(next) {
    return typeof next === 'string' && next.indexOf(CFG.path + '/') === 0 && next.indexOf('//') < 0;
  }
  function savePrefill() {
    var name = (val('first_name') + ' ' + val('last_name')).trim();
    var email = val('email').trim();
    if (name || email) storeSet(CFG.prefillKey, JSON.stringify({ n: name, e: email, l: leadId, t: Date.now() }));
  }
  function fail() {
    phase = 'failed';
    go(total - 1, false);
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  }
  function mapServerErrors(errs) {
    for (var i = 0; i < total; i++) {
      var mine = {};
      fieldsOf(STEPS[i]).forEach(function (f) { if (errs[f]) mine[f] = String(errs[f]); });
      if (Object.keys(mine).length) {
        phase = 'idle';
        go(i, false);
        armed[i] = true;
        showErrors(i, mine);
        focusControl(blocks[i].querySelector('[aria-invalid="true"]') || firstControl(i));
        return true;
      }
    }
    return false;
  }
  function send() {
    phase = 'sending';
    render();
    fillHidden();
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    fetch(CFG.applyPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(collect()),
      credentials: 'same-origin',
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      return res.json().then(function (j) { return { status: res.status, body: j }; }, function () { return { status: res.status, body: null }; });
    }).then(function (r) {
      clearTimeout(timer);
      if (r.status === 200 && r.body && r.body.ok && sameSite(r.body.next)) {
        if (r.body.route === 'fit') savePrefill();
        location.assign(r.body.next);            // stays in the sending state until the next page replaces this one
        return;
      }
      if (r.status === 422 && r.body && r.body.errors && mapServerErrors(r.body.errors)) return;
      fail();
    }, function () {
      clearTimeout(timer);
      fail();
    });
  }

  /* ---- events ---------------------------------------------------------------------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (phase === 'sending') return;
    var errs = check(cur);
    armed[cur] = true;
    if (Object.keys(errs).length) {
      showErrors(cur, errs);
      focusControl(blocks[cur].querySelector('[aria-invalid="true"]') || firstControl(cur));
      return;
    }
    if (cur < total - 1) { go(cur + 1, true); return; }
    send();
  });
  back.addEventListener('click', function () {
    if (phase === 'sending') return;
    phase = 'idle';
    go(cur - 1, true);
  });
  /* The browser's back button can restore this page as it was, mid-send. Put the form back. */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && phase === 'sending') { phase = 'idle'; render(); }
  });

  /* ---- start ----------------------------------------------------------------------------- */
  var q0 = readQuery();
  leadId = form.elements.lead_id && ID_RE.test(form.elements.lead_id.value || '') ? form.elements.lead_id.value : newId('l_');
  setHidden('lead_id', leadId);
  UTM_KEYS.forEach(function (k) { setHidden(k, q0[k] || ''); });
  syncChoices();
  render();
}
