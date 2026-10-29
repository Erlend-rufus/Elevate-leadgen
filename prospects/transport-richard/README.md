# Transport-case: Richard

Gratis case-nettside for en bekjent av Erlend som driver transport og kjører for flere selskaper.
Målet er en ferdig scroll-film-side vi kan vise i egen markedsføring, med kundens samtykke.

Mappen er kilde, ikke publisert. Ferdig side legges i `public/demo/<slug>/` (utkast) og flyttes
til kundens eget domene når han har godkjent.

## Status

- [x] Spørreskjema sendt på e-post (28.10.2026)
- [x] Svar mottatt, fylt inn i `intake.md` (29.10.2026)
- [ ] Logo og bilfoto lagt i `assets/`
- [x] Samtykke til bruk som case bekreftet skriftlig (e-post 29.10.2026)
- [x] Stilrammer og filmscener laget (KI, hvit E-Transit uten dekor)
- [x] Utkast publisert under `/demo/bjorsvik-wlihro/`
- [ ] Logo og bilfoto mottatt, dekor lagt på bilen
- [ ] Utkast sendt til ham
- [ ] Godkjent, flyttet til eget domene

## Regler for denne siden

- Han kjører for flere selskaper. Ingen andre selskapers navn, logo eller bildekor uten skriftlig ja.
  Biler med andres dekor brukes ikke som referanse til filmene.
- Bare påstander han har bekreftet går på siden. Det vi antar, merkes i `intake.md` og sjekkes før publisering.
- Ingen personlige kontaktopplysninger i dette repoet (det er offentlig). Telefon og e-post til siden
  legges inn først når de er bekreftet som firmaets offisielle.

## Slik bygges den

Samme metode som Multi Trans-demoen, se `docs/SCROLL-FILM-SITES.md`.
Utgangspunktet er `public/demo/multitrans-koepjt/index.html`: scenene og grenene ligger i `ALL`,
`BRANCHES` og `COPY` øverst i scriptet, og kortene i HTML-en har `data-scene`.
