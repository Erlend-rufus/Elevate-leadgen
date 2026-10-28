# Scroll-film-sider

Slik bygde vi Multi Trans-demoen (`public/demo/multitrans-koepjt/`), og slik bygger vi neste.
Siden er en sammenhengende historie: brukeren scroller, og AI-genererte miniatyrfilmer spoles frem
og tilbake med scrollen. Små UI-kort over filmen viser salgsargumentene (ordre, sporing, temperatur, signatur).

## Hvorfor film og ikke sanntids-3D

Vi testet begge (oktober 2026). Ekte 3D i nettleseren ble stilisert og spillaktig. Forhåndsgenererte
filmer ga et premium uttrykk på en brøkdel av tiden. 3D brukes bare der brukeren skal styre noe selv.

## Oppskrift

1. **Referanser fra kunden**: logo og et bilfoto med dekor. Bilfotoet er referansen i alle bilder,
   så bilene ser like ut overalt.
2. **Stilrammer** (Higgsfield, `gpt_image_2_5`): én ramme per scene, 16:9. Be om tilt-shift miniatyr,
   ingen tekst og ingen bilmerker. Sjekk hver ramme for feil emblem, feil antall biler og tekst.
3. **Filmscener** (Higgsfield): `minimax_h3` i 2K fra stilrammen, 6 sekunder. Når noe må holde seg likt
   (for eksempel tre parkerte biler), lås både start- og sluttbilde og la bare kameraet bevege seg.
   Svarer Higgsfield med et preset-forslag, send på nytt med `declined_preset_id`.
4. **Koding**: `scripts/film-encode.sh <kilde.mp4> <mappe> <navn>` lager 1600 px H.264 med tette
   nøkkelbilder (spoler jevnt) og et stillbilde med samme navn.
5. **Siden**: kopier `public/demo/multitrans-koepjt/index.html`. Scener, grener og tekst per gren
   ligger øverst i scriptet (`ALL`, `START`, `BRANCHES`, `END`, `COPY`). Hvert kort har `data-scene`.
   Mobil og redusert bevegelse får stillbilder med rolig zoom i stedet for film.
6. **Grenlenker**: `#navn` eller `?type=navn` åpner en gren direkte og bytter åpningstekst,
   ordrekort og forvalg i skjemaet. Brukes til én annonse per kundetype.
7. **Annonser**: `annonser/` i samme mappe, med 4:5 feed, 9:16 Reels og lenke med UTM per gren.

## Regler

- Demoer ligger under `/demo/<prospekt>-<tilfeldig>/` og sjekkes av `scripts/check-demo.mjs`
  (noindex, ingen nettverkskall, ingen sporing). Prospektets egne priser tillates med `demo.json`.
- Påstander vi ikke har bekreftet, står i en sjekkliste til møtet, ikke stille på siden.
- Ingen andre selskapers navn, logo eller dekor uten skriftlig ja.
- Filmene er store (ca. 4 MB per scene). Hver besøkende laster bare sin gren, men repoet vokser.
  Neste steg er å legge filmene utenfor git.
