# Launch notes · /g/uk-law-google-ads

Google Ads on a fixed monthly fee for law firms in England and Wales. Built 27 Nov 2026 by cloning
`/g/uk-law-firms` (form, routing, legal pages and endpoint are the same code; read that LAUNCH.md first).
The Norwegian version of this offer (leads.elevatemarketing.no/google-ads/) was dropped the same day.

**Status: `"live": false`.** The pages build and are noindex. The form endpoint answers 503 and the
booking page shows a notice until the items below are done.

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
| Private client firm | Google Ads "Campbell & Co" | cost per contact click NOK 642 (2024) to 162 (2026), -75%; ~1,730 phone/email clicks over 33 months | Google-modelled click events |
| Private clinic group | C-Medical | 632 bookings, NOK 614 per booking (~£45 at 0.073), 2 months | same figures as the C-Medical case |
| Online retailer | garn/strikk webshop | 4.7× ROAS, ~4,210 orders, 11 months | as on the Norwegian page |

Judicia (no Google Ads account) and RSM (no conversion tracking since Oct 2023) have no usable figures.
The moving company case is excluded on purpose.

## Outstanding before `live: true`

1. ClickUp list for these leads (own list, like the Norwegian fixed-fee list) → `config.json` `clickup.listId`.
2. Calendly event "30 minute Google Ads review" under Erlend's own Calendly user (Erlend hosts, Sondre joins as co-host; decided 27 Nov 2026, an exception to the UK host rule) → `funnel.calendlyUrl`.
3. `uk-law-google-ads` in `CAMPAIGNS` in both `g/_growth/zapier/*.ts`, publish both Zaps.
4. Fixed fee set on the first call. Minimum ad budget £2,000/month confirmed by Erlend 27 Nov 2026.
5. Phone test, one test booking, then the Meta campaign (see ADS.md).
