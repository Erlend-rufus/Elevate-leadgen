/* =====================================================================
   params.js · S1 og S2
   De leddene i parameterkjeden (ARBEIDSORDRE punkt 7) som ligger i koden:
     S1  location.search → skjulte felter i Typeform-embeden
     S2  location.search → Calendly-URL med forhåndsutfylling og utm
   Alle verdier encodeURIComponent-es. Manglende parametere ødelegger
   ingenting: /book uten parametere viser kalenderen uten forhåndsutfylling.
   Ingen persondata lagres i sessionStorage eller localStorage.
   ===================================================================== */
(function () {
  'use strict';

  var cfg = window.EM_CONFIG || {};
  /* URLSearchParams finnes i alle nettlesere som betyr noe her, men en gammel
     WebView skal få en tom parameter, ikke en tom skjemaboks. */
  var sp = null;
  try { sp = new URLSearchParams(location.search); } catch (e) { sp = null; }
  function param(k) {
    var v = null;
    if (sp) { v = sp.get(k); }
    else {
      var m = new RegExp('[?&]' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^&#]*)').exec(location.search);
      if (m) { try { v = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { v = m[1]; } }
    }
    return v ? String(v).trim() : '';
  }
  function erPlassholder(v) { return !v || /^[A-Z]+(_[A-Z]+)+$/.test(String(v).trim()); }
  function melding(vert, tittel, html) {
    vert.innerHTML = '<div class="embed-melding"><div><p class="eyebrow">' + tittel + '</p><p>' + html + '</p></div></div>';
  }
  function lastSkript(src) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.head.appendChild(s);
  }

  /* ---------- S1: Typeform, inline ---------- */
  var tf = document.getElementById('typeform-vert');
  if (tf) {
    var id = String(cfg.typeformId || '').trim();
    if (erPlassholder(id)) {
      melding(tf, 'Skjemaet er ikke koblet til ennå',
        'Fyll inn <code>typeformId</code> i <code>assets/js/config.js</code>. Se KONFIG.md.');
    } else {
      /* Samme feltnavn må finnes som Hidden Fields i Typeform-skjemaet.
         Verdiene sendes rå: Typeforms SDK URL-koder dem selv når den bygger
         adressen til iframen, så encodeURIComponent her hadde gitt dobbel
         koding («Høst» → «H%C3%B8st» i Typeform). Komma er SDK-ens skilletegn
         og escapes med bakstrek, slik SDK-en forventer. */
      var skjulte = [];
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']
        .forEach(function (k) { var v = param(k); if (v) skjulte.push(k + '=' + v.replace(/,/g, '\\,')); });

      var el = document.createElement('div');
      /* Live embed-ID (26 tegn) eller klassisk form-ID. Begge tar data-tf-hidden. */
      el.setAttribute(/^[0-9A-Z]{26}$/.test(id) ? 'data-tf-live' : 'data-tf-widget', id);
      if (skjulte.length) el.setAttribute('data-tf-hidden', skjulte.join(','));
      /* Inline også på mobil. Uten denne åpner Typeform fullskjerm ved trykk. */
      el.setAttribute('data-tf-inline-on-mobile', '');
      el.setAttribute('data-tf-opacity', '100');
      tf.appendChild(el);
      lastSkript('https://embed.typeform.com/next/embed.js');
    }
  }

  /* ---------- S2: Calendly, inline ---------- */
  var cal = document.getElementById('calendly-vert');
  if (cal) {
    var konto = String(cfg.calendlyKonto || '').trim().replace(/^\/+|\/+$/g, '');
    var slug = String(cfg.calendlySlug || '').trim().replace(/^\/+|\/+$/g, '');
    if (erPlassholder(konto) || erPlassholder(slug)) {
      melding(cal, 'Kalenderen er ikke koblet til ennå',
        'Fyll inn <code>calendlyKonto</code> og <code>calendlySlug</code> i <code>assets/js/config.js</code>. Se KONFIG.md.');
    } else {
      var deler = [];
      var legg = function (k, v) { if (v) deler.push(k + '=' + encodeURIComponent(v)); };
      legg('name', param('navn'));
      legg('email', param('epost'));
      /* a1 forutsetter at «selskap» er første egendefinerte spørsmål i
         Calendly-eventet. Bekreft rekkefølgen før lansering (KONFIG.md). */
      legg('a1', param('selskap'));
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
        .forEach(function (k) { legg(k, param(k)); });
      deler.push('hide_gdpr_banner=1');      /* eget samtykkebånd, punkt 8 */
      deler.push('primary_color=00a862');

      var url = 'https://calendly.com/' + konto + '/' + slug + '?' + deler.join('&');
      var w = document.createElement('div');
      w.className = 'calendly-inline-widget';
      w.setAttribute('data-url', url);
      w.style.minWidth = '320px';
      w.style.height = '100%';
      cal.appendChild(w);
      lastSkript('https://assets.calendly.com/assets/external/widget.js');

      /* Reserve. Calendly er satt til å sende videre til /takk selv
         (KONFIG.md). Gjør den ikke det i en app-nettleser, tar vi over når
         Calendly melder at et møte faktisk er booket. Ingen tidsavbrudd:
         det ville telt en booking som aldri skjedde. */
      window.addEventListener('message', function (e) {
        if (!/^https:\/\/([a-z0-9-]+\.)*calendly\.com$/.test(String(e.origin))) return;
        if (e.data && e.data.event === 'calendly.event_scheduled') {
          setTimeout(function () {
            if (location.pathname.indexOf('/takk') === -1) location.href = '../takk/';
          }, 1500);
        }
      });
    }
  }
})();
