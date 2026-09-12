# Launch configuration · /g/uk-private-clinics

Everything this funnel needs that is not code. The code values live in one
place, `g/uk-private-clinics.json`. The rest is settings in Typeform, Calendly
and Meta.

**Nothing here is guessed.** Where a value is missing, the field in the JSON is
empty and the build says so. `"live": false` keeps the build green while the
Typeform and Calendly ids are missing: the five pages are generated so the
change can be reviewed and a deploy preview can build, but they all carry
`noindex`, and the form and the calendar are replaced by a short notice. The
exchange rate is not covered by that flag: an empty or zero rate fails the
build whatever `live` says, because a wrong figure there is published as a
named client's real numbers.

---

## 1. The exchange rate

`figures.currency_rate_nok_to_gbp` is currently **0.08**, supplied by Erlend on
12 September 2026. It is not verified against Norges Bank, and the footnote on
the page says the rate was published by Norges Bank.

Before launch, open the Norges Bank GBP rate for 11 September 2026, and either
put the real figure in the JSON or change `figures.rate_source` to whatever the
source actually is. It is one number in one file. Everything on the page is
recomputed from it at build time, so there is nothing else to edit.

At 0.08 the table renders:

| Row | Spend | Booked consultations | Cost per booking |
|---|---|---|---|
| 24 months, all campaigns | £323,520 | 6,124 | £53 |
| 24 months, excluding brand searches | £278,160 | 3,269 | £85 |
| Last 12 months | £164,160 | 3,189 | £51 |

The approved design shows £321,902 / £276,769 / £163,339, which is the same
kroner at 0.0796. Cost per booking is £53 / £85 / £51 either way, so the headline
figure the page argues from does not move.

---

## 2. Typeform

### The id

Share → Embed → Inline. The snippet contains `data-tf-live="01…"`, 26
characters. That goes in `funnel.typeformId`.

### Hidden fields

The form must have Hidden Fields with exactly these names. A name that does not
match is dropped silently by Typeform, and the value is gone for the rest of the
chain:

```
utm_source  utm_medium  utm_campaign  utm_content  utm_term  fbclid  lead_id  page_slug
```

The landing page writes all eight before the embed script loads. Empty is fine.

### The nine questions

Proposed, from the qualification criteria on the page. Change the wording freely.
The only thing that must not change is that there are three endings and that
nothing is skipped.

| # | Question | Type | Options |
|---|---|---|---|
| 1 | Roughly what share of your revenue is self-pay rather than insured or contracted? | Multiple choice | A Under a quarter · B A quarter to a half · C Most of it · D All of it |
| 2 | Can patients book an appointment with you online? | Multiple choice | A Yes, and the system records whether they attended · B Yes, but it does not record attendance · C No, by phone or email only |
| 3 | How many more new patients could you take next month? | Multiple choice | A None, we are at capacity · B Up to twenty · C Twenty to fifty · D More than fifty |
| 4 | What does your clinic treat? | Short text | |
| 5 | Which town or city are you in? | Short text | |
| 6 | Is there one named clinician who can approve campaign material within a couple of days? | Multiple choice | A Yes · B No · C Not sure yet |
| 7 | Clinic name | Short text | |
| 8 | Your name | Short text | |
| 9 | Work email | Email | |

### Routing

**All nine questions are asked of everyone.** The routing happens after the last
answer, never as a jump in the middle. Practically, in Typeform: put no logic on
questions 1 to 8, and put every rule on question 9, so the form only chooses an
ending once it has all the answers.

```
Q1 = A  (under a quarter)          → Not a fit
Q2 = C  (phone or email only)      → Not a fit
Q3 = A  (at capacity)              → Not now
anything else                      → Qualified
```

Not a fit wins over Not now if both apply: being too small is structural, being
full is a date. Question 6 is captured but does not gate anything; a clinic
without a clinician to sign off is a conversation, not a rejection.

Someone who is too small today can be right in a year, so every field is kept
whatever the ending. Not a fit and Not now never see a calendar and are never
offered a substitute.

### The three endings

Each ending is a "Redirect to a website" with these URLs. The `{{hidden:…}}`
pipes are inserted from Typeform's own variable picker, not typed by hand.

Qualified:
```
https://getelevateleads.com/g/uk-private-clinics/booking/?utm_source={{hidden:utm_source}}&utm_medium={{hidden:utm_medium}}&utm_campaign={{hidden:utm_campaign}}&utm_content={{hidden:utm_content}}&utm_term={{hidden:utm_term}}&fbclid={{hidden:fbclid}}&lead_id={{hidden:lead_id}}
```

Not a fit:
```
https://getelevateleads.com/g/uk-private-clinics/not-a-fit/?utm_source={{hidden:utm_source}}&utm_campaign={{hidden:utm_campaign}}&lead_id={{hidden:lead_id}}
```

Not now:
```
https://getelevateleads.com/g/uk-private-clinics/not-now/?utm_source={{hidden:utm_source}}&utm_campaign={{hidden:utm_campaign}}&lead_id={{hidden:lead_id}}
```

**The host must be `getelevateleads.com`, not `it.getelevateleads.com`.** The
consent choice and the fire-once guard are both stored per origin. Send the
visitor across hosts mid-funnel and they are asked for consent twice and the
conversion loses its lead id.

### Theme

The page is paper and ink, not the dark site. In Typeform's Design tab:
background `#FFFFFF`, questions `#10141C`, answers `#10141C`, buttons `#0073BD`,
button text `#FFFFFF`. No logo inside the frame: the brand is already above it
and the embed is 640px tall on a phone.

---

## 3. Calendly

Create an event called **Clinic intake call**, 30 minutes, video. Put the URL
with no query string in `funnel.calendlyUrl`, for example
`https://calendly.com/eb-growwithelevate/clinic-intake-call`. The page adds its
own parameters.

Two settings matter:

- **"Redirect to an external site" after booking must stay off.** The booking
  page listens for Calendly's own `event_scheduled` message and forwards to the
  booked page itself, with the tracking parameters intact. Calendly's redirect
  is unreliable inside the Facebook in-app browser and hands us no control over
  the query string. With both switched on the visitor is sent twice.
- Colour parameters (`background_color=F7F5F0`, `text_color=10141C`,
  `primary_color=0073BD`) are set in the markup, but **Calendly ignores them on
  the free plan.** Standard or above is needed, or the calendar renders white
  with a blue button on a paper page. Same note as `docs/GREEN-FUNNEL-COLOURS.md`.

`hide_gdpr_banner=1` is set, because the page asks for consent itself.

---

## 4. Meta

Pixel **1466790598245604** (`getelevateleads`), already live on the site and
already gated behind consent by `/js/consent.js`.

The conversion event is **`ClinicBookedUK`**, a custom event, fired on
`/g/uk-private-clinics/booked` and nowhere else. Not on a CTA click, not on
Typeform submit, not on not-a-fit, not on not-now. It is deliberately not the
standard `Lead`: the previous campaign optimised against form fills and Meta
learned to find people who fill in forms. 262 of them, 76 per cent archived as
unqualified, none signed.

### Create the custom conversion in this order

Events Manager only lists events it has already received, so the order is not
optional.

1. Deploy, with `live: true` and both ids filled in.
2. Run one booking yourself, accepting the cookie banner, all the way to the
   booked page.
3. Confirm `ClinicBookedUK` appears on the pixel, in Events Manager or Test
   Events.
4. Create the custom conversion in the ad account that will run the campaign,
   **DMP - Intern - V.2 (848189724138049)**. Custom conversions are per ad
   account, and the account currently has none for this domain.
   - Event: `ClinicBookedUK`
   - URL contains: `getelevateleads.com/g/uk-private-clinics/booked`
   - The host is part of the rule on purpose: Netlify deploy previews load the
     same live pixel and their events land in the same production statistics.
5. Only then build the ad set and point it at the custom conversion.

### What the campaign will not see

`ElevateConsent` queues an event until the visitor accepts, and drops it if they
decline. A visitor who books without answering the banner sends nothing. Meta
therefore counts consented bookings only, and the real cost per booking is lower
than Ads Manager will show. Calendly is the ground truth: every booking carries
`utm_term` (the lead id) and `utm_source`. Compare the two weekly rather than
trusting either alone.

---

## 5. The parameter chain, end to end

The ad URL. `utm_content` is the creative, and it stays the creative the whole
way through:

```
https://getelevateleads.com/g/uk-private-clinics/?utm_source=meta&utm_medium=paid&utm_campaign=uk_clinics_sep&utm_content=ad_a_waiting_room&utm_term=broad
```

1. **Landing page.** Mints `lead_id=l_9f3c…`, keeps everything from the URL, and
   writes all eight values into the Typeform hidden fields before the embed
   script loads.
2. **Typeform.** The qualified ending redirects to
   `…/booking?utm_source=meta&utm_medium=paid&utm_campaign=uk_clinics_sep&utm_content=ad_a_waiting_room&utm_term=broad&fbclid=&lead_id=l_9f3c…`
3. **Booking page.** Builds the Calendly URL. Calendly accepts five tracking
   parameters and no more, so the lead id rides in `utm_term`:
   `…?hide_gdpr_banner=1&…&utm_term=l_9f3c…&utm_source=meta&utm_medium=paid&utm_campaign=uk_clinics_sep&utm_content=ad_a_waiting_room`
4. **Booked page.** `…/booked?utm_source=meta&…&utm_content=ad_a_waiting_room&utm_term=broad&lead_id=l_9f3c…`, and `ClinicBookedUK` fires once.

**The ad's own `utm_term` does not reach Calendly**, because the lead id has that
seat. It does reach Typeform, so it is on the submission. The older funnels on
this site put the lead id in `utm_content` instead; anything reading Calendly's
fields, a Zapier step or a spreadsheet, has to know this one is different, or it
will read the creative name as a lead id.

---

## 6. Before the ads run

- [ ] Real exchange rate in the JSON, or `rate_source` corrected
- [ ] `funnel.typeformId` filled in
- [ ] `funnel.calendlyUrl` filled in
- [ ] `"live": true`
- [ ] Typeform: eight hidden fields, nine questions, three endings, logic on
      question 9 only
- [ ] Calendly: redirect after booking off, plan supports colours
- [ ] One consented test booking end to end, checking the address bar at each
      step
- [ ] `ClinicBookedUK` visible in Events Manager
- [ ] Custom conversion created in DMP - Intern - V.2
- [ ] Ad set points at the custom conversion, not at Lead

Not code, and not in this repo: which endings send an email. The not-now page
says "reply to the email we just sent" and the not-a-fit page says "we have your
details". Erlend owns both, and the three-month follow-up.
