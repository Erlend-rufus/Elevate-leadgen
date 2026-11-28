# Cartaia landingsside: Møtet er utsatt

Pakken er selvstendig: `index.html` pluss mappen `assets/`. Ingen byggesteg, ingen rammeverk, ingen eksterne kall. All CSS ligger i `<style>` øverst i filen.

## Før siden legges på cartaia.no

1. Fjern linjen `<meta name="robots" content="noindex...">` (merket DEMO).
2. Koble skjemaet `#skjema` til eget mottak. Skriptet nederst (merket DEMO) stopper innsendingen i dag. Feltnavn: virksomhet, brukere, losning, navn, epost, telefon, vinkel.
3. Sjekk lenken til prøvestart. Den peker til https://solo.cartaia.no. Bytt hvis Bedrift har egen adresse.
4. Sett riktig lenke til personvernerklæringen under skjemaet.
5. Legg til eget samtykkebånd og eventuell måling. Siden har ingen sporing.
6. Bytt `cartaia-logo.png` med SVG hvis dere har den.

## Innhold i assets/

- `hero.mp4` og `hero.jpg`, eller bare `hero.jpg`: bildet i toppen. Laget med KI, viser ikke ekte personer.
- `cartaia-logo.png`: logoen, fristilt fra JPG.
- `instrument-sans-400.woff2`, `instrument-sans-500.woff2`: Instrument Sans (SIL Open Font License), latinsk tegnsett.

## Påstander som må stå seg

Siden sier at Cartaia var oppe 12. og 13. november 2026, og gjengir Microsofts egne statusmeldinger. Ha driftsloggen tilgjengelig.
