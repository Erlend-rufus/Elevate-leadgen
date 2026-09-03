# KONFIG.md · det som må fylles inn før lansering

Alt som står åpent i ARBEIDSORDRE punkt 13, samlet på ett sted. Ingenting av
dette er gjettet i koden. Der koden trenger en verdi, står det en plassholder
i STORE_BOKSTAVER, og skriptene lar være å laste embed og pixel til den er
byttet ut. En halvferdig konfigurasjon sender derfor aldri noe til Meta og
viser en tydelig melding i skjema- og kalenderboksen i stedet for en tom flate.

**Kodeverdiene fylles inn i én fil: `assets/js/config.js`.** Resten er
innstillinger i Typeform, Calendly og Netlify.

| Plassholder      | Hvor i koden                            | Hva som skal inn |
|------------------|-----------------------------------------|------------------|
| `TYPEFORM_ID`    | `assets/js/config.js` → `typeformId`    | ID-en til skjemaet (punkt 1) |
| `CALENDLY_KONTO` | `assets/js/config.js` → `calendlyKonto` | Kontodelen av Calendly-adressen (punkt 2) |
| `CALENDLY_SLUG`  | `assets/js/config.js` → `calendlySlug`  | Event-delen av Calendly-adressen (punkt 2) |
| `META_PIXEL_ID`  | `assets/js/config.js` → `metaPixelId`   | Pixel-ID, bare sifre (punkt 3) |
| `PERSONVERN_URL` | `assets/js/config.js` → `personvernUrl` | Full adresse til personvernerklæringen (punkt 4) |

Plassholderne gjenkjennes på formen `STORE_BOKSTAVER_MED_UNDERSTREK`. En ekte
Typeform-ID som `01KYF20M5CAMYSVACWPM3AMY4S` har ingen understrek og går fint.

---

## 1. Typeform: ID og de syv spørsmålene

**ID.** Typeform → Share → Embed → «Inline». Kodesnutten inneholder
`data-tf-live="01…"` (26 tegn). Den korte form-ID-en fra adressen
`form.typeform.com/to/xxxxxx` virker også. Lim inn i `typeformId`.

**Skjulte felter.** Skjemaet må ha Hidden Fields med nøyaktig disse navnene,
ellers slipper Typeform verdiene på gulvet. Begge ID-typene tar dem imot:

```
utm_source  utm_medium  utm_campaign  utm_content  utm_term  fbclid  gclid
```

`params.js` sender dem inn fra annonselenken. Tomme felter er greit.

**Spørsmålene.** Syv spørsmål, avgjøres av Erlend. Tre av dem må ha
question reference (spørsmålsreferanse i Typeform) satt til nøyaktig
`navn`, `epost` og `selskap`, fordi avslutningen piper dem videre til `/book`.

**To avslutninger, med «Redirect to a website»:**

Kvalifisert:
```
https://leads.elevatemarketing.no/book?navn={{field:navn}}&epost={{field:epost}}&selskap={{field:selskap}}&utm_source={{hidden:utm_source}}&utm_medium={{hidden:utm_medium}}&utm_campaign={{hidden:utm_campaign}}&utm_content={{hidden:utm_content}}
```

Ikke kvalifisert:
```
https://leads.elevatemarketing.no/ikke-aktuelt
```

Logikken for hvem som er kvalifisert settes i Typeform (Logic → avslutning),
ikke i koden. Er skjemaet innstilt slik at det åpner i fullskjerm på mobil,
overstyrer koden det med `data-tf-inline-on-mobile`: alltid inline, aldri popup.

## 2. Calendly: konto, event og rekkefølgen på spørsmålene

Bookingadressen til eventet ser slik ut: `https://calendly.com/<konto>/<event>`.
Kontodelen inn i `calendlyKonto`, eventdelen inn i `calendlySlug`. Har eventet
en kort adresse på formen `calendly.com/d/xxx-yyy/event`, går `d/xxx-yyy` inn
i `calendlyKonto`.

I Calendly-eventet:

- **Første egendefinerte spørsmål må være selskapsnavn.** Koden fyller det inn
  som `a1`. Ligger det et annet spørsmål først, havner selskapsnavnet feil sted.
- **Etter booking:** «Redirect to an external site» → `https://leads.elevatemarketing.no/takk`.
  Koden har i tillegg en reserve: får siden melding fra Calendly om at et møte
  er booket, og Calendlys egen videresending ikke har skjedd innen 1,5 s,
  sendes brukeren til `/takk` av koden.
- Calendlys eget GDPR-banner er skrudd av i adressen (`hide_gdpr_banner=1`),
  fordi sidene har eget samtykkebånd.
- Koden setter `primary_color=00a862` (grønnfargen) på kalenderen. Skal
  eventets egne farger vinne, fjern den linjen i `assets/js/params.js`.

## 3. Meta Pixel-ID

Events Manager → datakilden → ID (bare sifre). Inn i `metaPixelId`.

Pixelen lastes først når brukeren trykker «Godta». Hendelser: `PageView` på
alle sider, `Lead` på `/book`, `Schedule` på `/takk`, ingen på `/ikke-aktuelt`.
`Lead` og `Schedule` fyres én gang per fane, ikke på nytt ved oppdatering.

Optimaliser kampanjen mot `Lead`, ikke `Schedule` (ARBEIDSORDRE punkt 8).
Conversions API er ikke satt opp i denne koden. Settes det opp senere, må det
ligge bak det samme samtykket.

## 4. Personvernerklæring

Samtykkebåndet lenker til `personvernUrl`. Den finnes ikke ennå. Den må dekke
det disse sidene faktisk gjør: Meta Pixel etter samtykke, Typeform (skjema),
Calendly (booking), valget lagret i nettleseren (`localStorage`, nøkkel
`em_consent`) og EngeCo AS som behandlingsansvarlig. Databehandleravtaler med
Typeform og Calendly er nevnt i ARBEIDSORDRE punkt 14 og er heller ikke kode.

Teksten i samtykkebåndet er skrevet av meg, ikke hentet fra TEKST.md, og bør
leses gjennom. Den ligger i `assets/js/consent.js`:

> Vi bruker informasjonskapsler fra Meta til å måle om annonsene våre virker.
> Du velger selv. Personvernerklæring · Godta · Bare nødvendige

## 5. SVG-versjon av logoen

Pakken hadde bare PNG (2607 × 1048, 51 og 108 KB). Sidene bruker nå
nedskalert WebP med PNG-fallback, 418 × 168 (3× av 56 px visningshøyde,
7 til 17 KB), i `assets/img/`. Kommer SVG-ene, legg `logo-ink.svg` og
`logo-white.svg` i `assets/img/` og bytt hver `<picture>`-blokk (topp og bunn
i alle fire filene, åtte steder) med én `<img>`:

```html
<img class="logo" src="assets/img/logo-ink.svg" width="418" height="168" alt="Elevate Marketing">
```

Bruk samme relative sti som PNG-en allerede står med i den filen:
`assets/img/…` i `index.html`, `../assets/img/…` i de tre undermappene.
Toppen bruker `logo-ink`, bunnen `logo-white`. Behold `width`/`height`
(bildets faktiske sideforhold), så ingenting flytter seg mens den laster.

## 6. Bekreftelse fra Calendly, eller Zapier med SMS først

Ikke kode. Men setningen på `/takk` forutsetter e-post:
«Du får en bekreftelse på e-post med lenke til møtet.» Blir det SMS først,
endres den i `takk/index.html`. Oppfølging av dem som fyller ut skjemaet uten
å booke (ARBEIDSORDRE punkt 14) er heller ikke kode og finnes ikke ennå.

## 7. Rot eller undermappe på subdomenet

Bygget for roten: `leads.elevatemarketing.no/`, `/book`, `/takk`,
`/ikke-aktuelt`. Alle stier i HTML, CSS og JS er relative, så de fire mappene
kan flyttes samlet til for eksempel `ai-synlighet/` uten kodeendringer.
Det som da må endres er adressene i Typeform (punkt 1) og Calendly (punkt 2).

---

## Sjekk som ikke kunne gjøres herfra

**Radnavnene mot Brønnøysundregistrene** (ARBEIDSORDRE 11.1 ber om det).
Rad 2 er byttet til «Regnskap, lønn og rådgivning». De fire andre står som i
TEKST.md. Oppslaget mot `data.brreg.no` var blokkert fra byggemiljøet, så
kontroller disse fem selv, for eksempel på
`https://data.brreg.no/enhetsregisteret/oppslag/enheter?navn=<navn>`:

1. Autorisert regnskapsbyrå
2. Regnskap, lønn og rådgivning
3. Regnskapskontoret i sentrum
4. Økonomi og regnskap
5. Regnskapsførerselskapet

Slår ett av dem ut som et registrert navn, bytt teksten i `index.html`
(rad 1 til 5 i svarpanelet). Teksten er sladdet visuelt, men står i kilden.

## Netlify

Nytt nettsted koblet til dette repoet:

- Base directory: `leads`
- Build command: tom
- Publish directory: `leads` (netlify.toml i mappen sier `.`, relativt til base)
- DNS: `CNAME leads → <site>.netlify.app`

`netlify.toml` i denne mappen setter `X-Robots-Tag: noindex` på alle ruter og
cache-regler for fonter, bilder, CSS og JS.
