/* The "ask for a quote" button on the not-a-fit page. It is shown only when the address carries a lead id,
   which the answer to the form adds; a visitor who arrives without one sees the page without the button
   (the e-mail address in the copy is the other way in). The request is an opt-in: nothing is sent until
   the button is pressed, and one press is one request. */
function initAsk() {
  var box = document.getElementById('ask');
  var btn = document.getElementById('ask-btn');
  var msg = document.getElementById('ask-msg');
  if (!box || !btn || !msg) return;
  var q = readQuery();
  if (!(q.lead_id && ID_RE.test(q.lead_id))) return;
  box.hidden = false;
  var busy = false;
  function done() {
    btn.hidden = true;
    msg.textContent = CFG.text.askDone;
    msg.focus();
  }
  function fail() {
    busy = false;
    btn.disabled = false;
    msg.textContent = CFG.text.askError;
  }
  btn.addEventListener('click', function () {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    msg.textContent = '';
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch(CFG.interestPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ campaign: CFG.campaign, lead_id: q.lead_id }),
      credentials: 'same-origin',
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      return res.json().then(function (j) { return { status: res.status, body: j }; }, function () { return { status: res.status, body: null }; });
    }).then(function (r) {
      clearTimeout(timer);
      if (r.status === 200 && r.body && r.body.ok) done(); else fail();
    }, function () {
      clearTimeout(timer);
      fail();
    });
  });
}
