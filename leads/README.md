# leads.elevatemarketing.no

Fire statiske sider for kampanjen «AI-synlighet for norske regnskapsbyråer».
Bygget etter `ARBEIDSORDRE.md` i overleveringspakken fra Claude Design
(3. september 2026). Ren HTML, CSS og vanilla JavaScript. Ingen rammeverk,
ingen npm-avhengigheter, ingen byggesteg. Sidene fungerer om du åpner
`index.html` rett fra disk.

**Før lansering: `KONFIG.md`.** Der står de sju åpne punktene og det ene
stedet verdiene skal inn (`assets/js/config.js`).

## Filer

```
leads/
├── index.html               S1  /               landingssiden
├── book/index.html          S2  /book           Calendly
├── takk/index.html          S3  /takk           booket
├── ikke-aktuelt/index.html  S4  /ikke-aktuelt   ikke kvalifisert
├── assets/
│   ├── css/site.css         én delt stilfil, tokens øverst
│   ├── js/config.js         ← alle verdier som skal fylles inn
│   ├── js/hero.js           kun S1: hero-sekvensen, byfeltet, fast bånd
│   ├── js/params.js         S1 og S2: parameterkjeden inn i Typeform og Calendly
│   ├── js/consent.js        alle fire: samtykkebånd og Meta Pixel
│   ├── fonts/               Fraunces 700/900, Geist 400/500/700, woff2, subsett latin + æøå
│   └── img/                 logo som WebP + PNG, 418 × 168
├── netlify.toml             headere (noindex, cache)
├── KONFIG.md                det som må avklares og fylles inn
└── README.md
```

`config.js` er én fil mer enn filtreet i arbeidsordren. Den finnes for at
Typeform-ID, Calendly-adresse, Pixel-ID og personvernlenke skal rettes ett
sted, ikke i tre skript og fire HTML-filer.

## Redigere tekst

Teksten ligger rett i HTML-filene, i samme rekkefølge som i `TEKST.md`.
Endre setningen, lagre, publiser. Ingen kompilering. Reglene fra briefen:
ingen tankestreker, ingen utropstegn, ingen priser, ingen forekomst av «GEO»,
ingen lesbare firmanavn i svarpanelet.

## Kjøre lokalt

Åpne `index.html` i en nettleser, eller for å teste ruter som `/book`:

```
npx http-server leads -p 3000
```

Åpnet rett fra disk avviser nettleseren de to `preload`-hintene for fonter
(fontpreload krever CORS, som `file://` ikke har). Fontene lastes likevel via
`@font-face`, så sidene ser riktige ut. På nettstedet virker preload som normalt.

## Slik er heroen bygget (ARBEIDSORDRE punkt 4)

HTML-en inneholder sluttbildet: søkefeltet ferdig utfylt, svarpanelet fullt,
rad 6 klikkbar, KILDER synlig. Et lite skript i `<head>` legger klassen
`hero-anim` på `<html>` før første maling, og bare da setter CSS
startilstanden (opacity 0, clip-path). `hero.js` spiller sekvensen framover
etter `design/S1-hero-tidslinje.md` og fjerner klassen når den er ferdig.

Resultat: uten JavaScript, ved JavaScript-feil, når `hero.js` ikke er i gang
innen 2,5 s, eller med `prefers-reduced-motion: reduce`, står sluttbildet der.
Animasjonen rører kun `opacity`, `transform`, `clip-path` og panelhøyden.
Rad 6 er en ekte `<button>` som er klikkbar fra første øyeblikk.

Byfeltet skriver kun inn i søkelinjen. Rad 1 til 5 er hardkodet, rad 6 står
alltid med «Ditt byrå».

## Avvik fra designfilen, med vilje

Ordren vinner over `design/*.dc.html` der de er uenige (ARBEIDSORDRE punkt 0).

1. **Rad 2 i svarpanelet** heter «Regnskap, lønn og rådgivning», ikke
   «Regnskap og rådgivning» (11.1, et ekte firmanavn).
2. **`cqw` er borte.** `vw` og media queries i stedet (11.2).
3. **Brytepunktet 600px** ligger i CSS (`@media (min-width:600px)`), ikke i
   JavaScript med ResizeObserver som i designfilen (11.3).
4. **Det faste knappebåndet** er `position: fixed` og styres av to
   IntersectionObservere, ikke `position: sticky` i dokumentflyten (11.4).
   Det ligger i papirfarge med topplinje og skygge, og over samtykkebåndet
   om begge vises samtidig.
5. **Heroen** er bygget sluttbilde-først, motsatt av designfilens React-komponent (4.1).
6. **Fonter** er selvhostet woff2, ikke Google Fonts (punkt 9).
7. **Logo** er nedskalert WebP med PNG-fallback, ikke 2607 px PNG (punkt 9).
8. **Linjeavstand 1,5** på brødtekst på alle sider. Designfilen hadde 1,45 på
   S2 til S4, ordrens typografitabell sier 1,5.
9. **Trekkspillet** er `<button aria-expanded>` som styrer et panel med `id`.
   Uten JavaScript er alle fire svarene synlige. Togglingen ligger i det
   lille skriptet i `<head>` på `index.html`, ikke i `hero.js`, så den
   virker selv om `hero.js` kommer sent eller aldri.
10. **Hero-knappen** er en lenke til `#skjema`, så den virker uten JavaScript.
    Rad 6 er fortsatt `<button>`, som ordren krever, men ligger i et
    `<form action="#skjema">`: uten JavaScript tar skjemaet brukeren til
    skjemaseksjonen, med JavaScript håndterer `<head>`-skriptet klikket.
12. **H1 på S2 til S4** er 38→56px som i designfilen og referansebildene,
    ikke 60px som i ordrens typografitabell (den gjelder S1).
13. **Søkefeltet** holder én linje på alle bredder (`flex-wrap: nowrap`,
    16px under 390px), så heroen ikke skifter høyde mens byen skrives.
    Designfilen lot det brekke.
11. **Lagt til fra ordren, ikke i designet:** samtykkebåndet, meldinger i
    skjema- og kalenderboksen når konfigurasjonen mangler, og reserven som
    sender til `/takk` når Calendly melder om booking (KONFIG.md punkt 2).
    `netlify.toml` svarer 404 på `/README.md`, `/KONFIG.md` og
    `/netlify.toml`, som ellers hadde ligget åpent på nettstedet.

**Uthevingen i H1 over 600px.** `TEKST.md` sier «grønn + understrek over
600px». Designfilen og referansebildet viser blekkfarget tekst med grønn
understrek. Sidene følger referansebildet. Skal teksten også være grønn på
desktop, fjern `color:inherit` i regelen `.uthev` i `site.css` (én linje).

## Kontrast, til orientering

Grønnfargen `#00A862` er avklart og bevisst (punkt 3) og er ikke rørt. Den
består likevel ikke WCAG AA mot papir eller med hvit tekst: hvit på grønn
(knappene) måler 3,1:1 mot kravet 4,5:1 for vanlig tekst, og grønn tekst på
papir (H1 på mobil, tallene i «Hva vi faktisk gjør», «Ditt byrå») måler
2,8:1 mot kravet 3:1 for stor tekst. Blekk og grå er som ordren sier (AAA/AA).

## Testet

Automatisk i Chromium (Playwright), punktene fra ARBEIDSORDRE 12 som kan
kjøres uten ekte telefon: JS av, reduced motion, tidslinjen målt ved 1,4 /
2,4 / 3,9 / 5,0 / 6,3 s, rad 6 klikkbar ved 0,5 s, byfeltet, ingen
layoutforskyvning i heroen, embed-høyder 640/680/720, 18px brødtekst på 390,
noindex, org.nr, ingen «GEO»/priser/tankestreker, parameterkjeden, samtykke
og pixel-rekkefølge, Lead/Schedule én gang, axe på alle fire sider.

Må gjøres på ekte telefon i Facebook-appens nettleser før lansering: punkt 7
til 10 i ARBEIDSORDRE 12 med ekte Typeform og Calendly, og at `Lead` og
`Schedule` når Events Manager.
