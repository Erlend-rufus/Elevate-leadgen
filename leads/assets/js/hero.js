/* =====================================================================
   hero.js · kun S1
   Spiller hero-sekvensen framover (design/S1-hero-tidslinje.md) oppå et
   sluttbilde som allerede ligger i HTML-en. Startilstanden settes av CSS
   under html.hero-anim, som et skript i <head> la på før første maling.
   Er klassen ikke der (prefers-reduced-motion, feil, tidsavbrudd), spilles
   ingenting, og sluttbildet står som det er.

   Animasjonen rører kun opacity, transform, clip-path og panelhøyden.
   Aldri pointer-events, aldri visibility. Rad 6 er klikkbar hele tiden.

   I tillegg: byfeltet og det faste knappebåndet. Rad 6 og trekkspillet
   ligger i <head>-skriptet på index.html, så de virker uten denne filen.
   ===================================================================== */
(function () {
  'use strict';

  var rot = document.documentElement;
  var demo = document.getElementById('hero-demo');
  if (!demo) return;

  var SOK = 'beste regnskapsfører i';
  var BY = 'Bergen';
  var TEGN = SOK.length + BY.length;
  /* Sekunder. 0,75× av A1-videoen; pausen før rad 6 er beholdt. */
  var T = {
    skriv0: 0.4, skriv1: 2.2,
    prikker0: 2.2, panel: 2.7,
    rader: [2.95, 3.31, 3.67, 4.03, 4.39],
    rad6: 5.45, slutt: 5.9
  };

  var tekst = demo.querySelector('[data-hero-tekst]');
  var by = demo.querySelector('[data-hero-by]');
  var bg = demo.querySelector('.svar-bg');
  var kort = document.getElementById('svar-kort');
  var etikett = demo.querySelector('.svar-etikett');
  var rader = [].slice.call(demo.querySelectorAll('[data-hero-rad]'));
  var rad6 = demo.querySelector('[data-hero-rad6]');
  var kilder = demo.querySelector('[data-hero-kilder]');
  var skjema = document.getElementById('skjema');

  /* ---------- Byfeltet skriver kun inn i søkelinjen ----------
     Verdien ekkoes aldri inn i resultatradene. Rad 1–5 er hardkodet,
     rad 6 står alltid med «Ditt byrå». (ARBEIDSORDRE 4.4) */
  var rort = false;    /* brukeren har skrevet noe selv */
  var fokus = false;   /* brukeren har fokusert feltet */
  function settBredde() {
    if (by) by.style.width = (Math.max(1, by.value.length) + 1) + 'ch';
  }
  if (by) {
    /* Fokus midt i sekvensen: vis hele byen med en gang, ikke en halv. */
    by.addEventListener('focus', function () {
      if (!rort && !fokus) by.value = BY;
      fokus = true;
      by.classList.add('er-inne');
      settBredde();
    });
    by.addEventListener('input', function () { rort = true; fokus = true; by.classList.add('er-inne'); settBredde(); });
    by.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); by.blur(); }
    });
    settBredde();
  }

  /* Rad 6 håndteres av skriptet i <head> på index.html, så den virker før
     denne filen har lastet. Uten JavaScript sender skjemaet rundt knappen
     nettleseren til #skjema. */

  /* ---------- Det faste knappebåndet (11.4) ----------
     Vises når hero-knappen er scrollet ut av syne over toppen, og
     forsvinner når skjemaseksjonen nås. Observatørene har utvidet
     rootMargin, så de måler «over toppen / ikke» og «nådd / ikke» i
     stedet for «synlig / ikke». Da fyrer de også ved hopp (scroll til
     topp, ankerlenker) der elementet aldri passerer gjennom viewporten. */
  var cta = document.getElementById('hero-cta');
  var baand = document.getElementById('baand');
  if (cta && baand && skjema && 'IntersectionObserver' in window) {
    var ctaUte = false, skjemaNaadd = false;
    var vis = function () {
      baand.classList.toggle('er-synlig', ctaUte && !skjemaNaadd);
    };
    /* Roten strekkes langt nedover: «ikke skjærende» betyr at knappen
       ligger helt over viewportens toppkant. */
    new IntersectionObserver(function (es) {
      ctaUte = !es[es.length - 1].isIntersecting;
      vis();
    }, { rootMargin: '0px 0px 100000px 0px', threshold: 0 }).observe(cta);
    /* Roten strekkes langt oppover: «skjærende» betyr at seksjonens
       toppkant er kommet over viewportens bunnkant, altså nådd. */
    new IntersectionObserver(function (es) {
      skjemaNaadd = es[es.length - 1].isIntersecting;
      vis();
    }, { rootMargin: '100000px 0px 0px 0px', threshold: 0 }).observe(skjema);
  }

  /* ---------- Sekvensen ---------- */
  if (!rot.classList.contains('hero-anim')) return;
  if (!tekst || !by || !bg || !kort || !etikett || rader.length !== 5 || !rad6 || !kilder) {
    rot.classList.remove('hero-anim');
    return;
  }
  window.EM_HERO_RUNNING = true;

  var start = null, sisteRader = -1, ferdig = false;

  /* Panelhøyden vokser med radene. Den ene JavaScript-målingen som er lov
     (4.5). Uten JavaScript har panelet full høyde fra start. */
  function hoydeTil(el) {
    return Math.round(el.getBoundingClientRect().bottom - kort.getBoundingClientRect().top) + 16 + 'px';
  }

  /* Spol tilbake det CSS ikke kan: teksten i søkefeltet. Byfeltet holdes
     på 0 px bredde til byen skrives, så markøren står inntil teksten.
     Panelbakgrunnen settes til etikettens høyde nå, mens den er usynlig,
     så den toner opp i riktig størrelse ved 2,7 s i stedet for å krympe. */
  tekst.textContent = '';
  tekst.classList.add('er-inne');
  if (!rort && !fokus) { by.value = ''; by.style.width = '0px'; }
  bg.style.height = hoydeTil(etikett);

  function bilde(t) {
    var skrevet = t < T.skriv0 ? 0
      : Math.min(TEGN, Math.floor((t - T.skriv0) / ((T.skriv1 - T.skriv0) / TEGN)) + 1);
    tekst.textContent = SOK.slice(0, Math.min(skrevet, SOK.length));
    if (!rort && !fokus) {
      by.value = BY.slice(0, Math.max(0, skrevet - SOK.length));
      if (skrevet >= SOK.length) settBredde();
    }
    if (skrevet >= SOK.length) by.classList.add('er-inne');

    demo.classList.toggle('er-skriver', t < T.skriv1);
    demo.classList.toggle('er-tenker', t >= T.prikker0 && t < T.panel);

    if (t >= T.panel) { bg.classList.add('er-inne'); etikett.classList.add('er-inne'); }

    var n = 0;
    for (var i = 0; i < rader.length; i++) {
      if (t >= T.rader[i]) { rader[i].classList.add('er-inne'); n = i + 1; }
    }

    if (t >= T.rad6) {
      rad6.classList.add('er-inne');
      kilder.classList.add('er-inne');
      bg.style.height = '100%';
    } else if (t >= T.panel && n !== sisteRader) {
      sisteRader = n;
      bg.style.height = hoydeTil(n ? rader[n - 1] : etikett);
    }
  }

  function slutt() {
    if (ferdig) return;
    ferdig = true;
    demo.classList.remove('er-skriver');
    demo.classList.remove('er-tenker');
    tekst.textContent = SOK;
    if (!rort) { by.value = BY; settBredde(); }
    bg.style.height = '';
    rot.classList.remove('hero-anim');
    window.EM_HERO_RUNNING = false;
  }

  function steg(now) {
    if (start === null) { start = now; demo.setAttribute('data-hero-start', String(Math.round(now))); }
    var t = (now - start) / 1000;
    bilde(t);
    if (t >= T.slutt + 0.1) slutt();
    else requestAnimationFrame(steg);
  }
  requestAnimationFrame(steg);
})();
