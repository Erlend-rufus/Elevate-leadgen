# Transport-case: Richard

Gratis case-nettside for en bekjent av Erlend som driver transport og kjører for flere selskaper.
Målet er en ferdig scroll-film-side vi kan vise i egen markedsføring, med kundens samtykke.

Mappen er kilde, ikke publisert. Ferdig side legges i `public/demo/<slug>/` (utkast) og flyttes
til kundens eget domene når han har godkjent.

## Status

- [x] Spørreskjema sendt på e-post (28.10.2026)
- [ ] Svar mottatt, fylt inn i `intake.md`
- [ ] Logo og bilfoto lagt i `assets/`
- [ ] Samtykke til bruk som case (navn og logo) bekreftet skriftlig
- [ ] Stilrammer og filmscener laget
- [ ] Utkast publisert under `/demo/` og sendt til ham
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
