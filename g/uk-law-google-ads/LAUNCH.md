# Launch notes · /g/uk-law-google-ads

Google Ads on a fixed monthly fee for law firms in England and Wales. Built 27 Nov 2026 by cloning
`/g/uk-law-firms` (form, routing, legal pages and endpoint are the same code; read that LAUNCH.md first).
The Norwegian version of this offer (leads.elevatemarketing.no/google-ads/) was dropped the same day.

**Status: `"live": true` since 27 Nov 2026.** The form endpoint takes leads and the booking page shows the
calendar. The pages stay noindex (paid traffic only).

## What is different from /g/uk-law-firms

| | Commission funnel | This funnel |
|---|---|---|
| Offer | commission on new instructions | fixed monthly management fee, ad budget paid to Google, no minimum term |
| Fee on the page | never a rate | never a figure; set on the first call |
| Cases | none | four anonymised cards (two law, one clinic, one retailer) |
| Minimum | £1m turnover or £2,000/month ads | same rule, worded as Google Ads budget |

## Case figures and their source (Windsor, read 27 Nov 2026)

| Card | Account | Figure | Basis |
|---|---|---|---|
| Business law firm | Google Ads "Aspiria" (Nova Law conversions), campaign Forretningsjus | 271 enquiries, 19.4/month, Oct 2023 to Nov 2024 | form submissions + phone clicks, counted. Best 14 months of a 20 month run; the dates are on the card |
| Private client firm | Google Ads "Campbell & Co" | cost per contact click NOK 642 (2024) to 166 (1 Jan to 27 Nov 2026), -74%; ~1,730 phone/email clicks over 33 months | Google-modelled click events |
| Private clinic group | C-Medical | 632 bookings, NOK 614 per booking (~£45 at 0.073), 2 months | same figures as the C-Medical case |
| Online retailer | garn/strikk webshop | 4.7× ROAS, ~4,210 orders, 11 months | as on the Norwegian page |

Judicia (no Google Ads account) and RSM (no conversion tracking since Oct 2023) have no usable figures.
The moving company case is excluded on purpose.

## Done on 27 Nov 2026

1. ClickUp: leads go to the existing list LAW - UK - Commission (`1201270000003579`), tagged `growth-law-gads` and
   `retainer`, with `[RETAINER]` first in the task name. No list of its own: the connector cannot duplicate a list with
   the shared fields. Move them to their own list if the commission and fixed fee leads get mixed up.
2. Calendly: "Elevate Marketing | Law | 30 minute Google Ads review", event type
   `95487c87-7502-42cc-a3ee-7b031edfd731`, under Erlend's own user. Erlend hosts and Sondre joins (decided by Erlend
   27 Nov 2026, an exception to the UK host rule). Sondre is not on the event: the API cannot add a co-host, so
   Erlend invites him per meeting or adds him in Calendly.
3. Zapier: `uk-law-google-ads` is in `CAMPAIGNS` in both files and both Zaps are published (Zap 1 version
   `01a21eea-f4ab-714d-bd05-129bd72b9eb4`, Zap 2 version `01a21eea-ff46-783f-83ac-b06b2e7ee8dd`, 21:30 UTC). Draft runs
   with made-up leads (`@example.invalid`): a fit lead and a booking on the new campaign, and one lead and one booking
   on `uk-law-firms`; the three test tasks were archived. The published sources are the repository files byte for byte.
4. Minimum ad budget £2,000/month confirmed by Erlend. The fee is set on the first call and is not on the page.

## Changed after the review, 27 Nov 2026 (Erlend's answers the same evening)

- Price on the page: "from £1,000 a month" (`funnel.fixedFeeOnPage` lets the build accept an amount next to
  "fee"; the commission words are still refused). Minimum ad budget £2,000 a month, unchanged.
- Erlend confirmed that Elevate has run the business law account from 2023 until now, so "we run it for" stays.
- The 14 months are called the firm's strongest stretch, and the note says later months were lower.
- The private client card shows clicks to call or email, not enquiries.
- The £2,000 a month question is asked of everyone. Under £1m and no: not a fit. £1m or more and no: review.
- The SRA number is required.
- The call to action is "Book a 30 minute Google Ads review". Nothing to prepare: nobody has the account id to
  hand, so access to the Google Ads account is sorted together on the call (Erlend, 27 Nov 2026).
- Name outward: Erlend Rufus (the reminder e-mails in Zap 1).

## Still open

1. A test from a phone, and one real test booking through the page (a person has to do both).
2. Own ClickUp list (Erlend: yes). Duplicate "LAW - UK - Commission" in ClickUp (the connector cannot copy the
   shared fields), then put its id in `config.json` and both Zap files. Until then the leads share the law
   list, marked `[RETAINER]`.
3. Sondre is not on the Calendly event; the Calendly user is still `eb-growwithelevate`.
4. The main site says "From €1,500/month" and a 90 day initial period, which this offer does not have.
5. gclid tracking before any Google Search campaign (see ADS.md).
6. The Meta campaign (see ADS.md): creatives, then Erlend approves the spend.
