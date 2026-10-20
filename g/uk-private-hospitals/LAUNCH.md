# Launch notes · /g/uk-private-hospitals

UK private hospitals and clinic groups with £5m+ turnover ("HELSE"). Built 20 Oct 2026 on the framework of
`/g/uk-it-growth` (read `g/uk-it-growth/LAUNCH.md` first: the endpoint, storage, delivery, alerts, Meta and
the daily check are the same code). This file only says what is different and what is outstanding.

**Status 20 Oct 2026: `"live": true`.** ClickUp list, Calendly event and both Zap workflows are in place and
tested. The pages are served (noindex by design, on every growth page), and the endpoint stores leads and hands them
to Zapier. Still to do before the ads go on: the phone test (Accept, then Decline), one test booking, and the
owner's yes (section 2, points 4 and 5).

```
npm run build          # or: node scripts/build-g-growth.mjs
npm run test:g-growth  # g/uk-private-hospitals/test/funnel.test.mjs is in it
```

## 1. What is different from the IT funnel

| | IT | Health |
|---|---|---|
| Threshold | £2m | £5m (`{THRESHOLD}`), self-paying patients, an attended first consultation worth £500+ (`{WORTH}`) |
| Form | 13 steps | 12 steps; "Which specialties would you like to grow?" is a multi-choice (tick any), sent as `specialties` joined with ", " |
| Payload keys | 37 | the same plus `regulator_number`, `self_pay_share`, `specialties`, `first_consultation_value` (empty for the other campaigns) |
| Routing (`route.mjs`) | | not a fit: turnover under £5m, trading under two years, self-pay under 10%, consultation worth under £500. not now: no capacity. review: turnover not stated, self-pay 10% to under 30% or unknown, consultation value unknown, only "Other" ticked. Fertility ticked is flagged (`fertility` in the reasons), not routed. |
| Payment | commission on closed deals | commission on attended first consultations and on the procedures those patients book within a year (owner's decision 20 Oct 2026, De Peyer model). The rate is never on the page. |
| Case | three IT consultancies | C-Medical, 1 Feb to 16 Oct 2026 against the same days of 2025, with written permission (owner, 20 Oct). Headline multiple 13x without reception; 22x whole account in the note. |
| Register | off (`legal.registerCheck` false) | the same: no Companies House or CQC lookup is promised or made. Check before each meeting. |
| ClickUp list | `IT - UK - Commision` (901522580321) | `HEALTH - UK - Commission` (1201270000003578), a duplicate with the same field ids |
| Calendly | `elevate-marketing-commission-i-it` | `https://calendly.com/d/d346-6dd-2w6/elevate-marketing-health-30-minute-bookings-review`, event type `516ab30e-089f-49dc-a8e6-0e1071a71a1d` |

## 2. What only a person can supply (in this order)

Points 1 to 3 are done (20 Oct 2026); they are kept as the record of what was set up and why.

1. **ClickUp list (done: 1201270000003578).** Duplicate `IT - UK - Commision` in ClickUp (Duplicate list, with statuses and custom fields),
   name it `HEALTH - UK - Commission`, and put its id in `config.json` → `clickup.listId`. The API can not set the
   statuses, which is why it is a duplicate and not a new list. The existing `HELSE - UK - Commision`
   (901526426774) keeps the Typeform flow and the default statuses; it is not used here.
2. **Zap 1 and Zap 2 (done, published and switched on 20 Oct 2026).** Read the new list's field ids (`lead_id`, `Tier`, `Team Size`, `Ad Spend Budget`,
   `Contract Value`, the specialism dropdown) and fill in `uk-private-hospitals` in `CAMPAIGNS` in both
   `g/_growth/zapier/*.ts`, run the tests, publish both workflows (switched on, since they already carry IT
   leads). Until `listId` is set, a health lead fails the run on purpose and is kept in the function's store.
3. **Calendly (done).** A new 30 minute event for health (owner, 20 Oct: "Clinic intake call" is not reused; a new
   event for each funnel). Name "Elevate Marketing | 30 minute bookings review", description "A 30 minute
   bookings review for private hospitals and clinic groups. Bring three numbers: last year's turnover, your
   main specialties and what an attended first consultation is worth." Redirect after booking off. Put the
   inline-embed address (no query string) in `config.json` → `funnel.calendlyUrl` and the event type id in
   Zap 2's `eventTypes`. The confirmation e-mail should carry the "what to have to hand" line, as /takk promises.
4. **Go live (`live: true` set 20 Oct 2026; the phone test and the test booking remain).** `"live": true` in `config.json`, build, merge. Then one submission of each outcome from a real
   phone (Accept first, then Decline), one test booking, Zap 2 moves the task to `møte booket`; archive the
   test tasks.
5. **Ads.** The Meta campaign `LEADS / UK / HEALTH` (see the project document of 20 Oct 2026) is created
   paused and is switched on only after step 4 and the owner's yes. Budget kr 1 000 a day (kr 30 000 a month).
6. **Old page (301 added in netlify.toml 20 Oct 2026, landing page only; its booking and outcome pages stay).** `/g/uk-private-clinics/` says £85 per booking and is not consistent with this page. When this
   funnel is live, redirect it here (netlify.toml, 301) and retire the old deck and ads (owner's yes given
   20 Oct 2026 for the correction).

## 3. Things to know

- `specialties` posts one value per ticked box without JavaScript; the endpoint joins them with ", " (the
  page's script does the same), so the stored value is one string either way.
- The strip's "13x" and the note's "22x" are estimates built from the clinic group's reported rates (92%
  attendance, 35% procedures, about £4,700 a procedure at NOK 59,000). The arithmetic is in the note on the
  page and in `copy.json`; change one, change both.
- SEO and AI: the page says what was done from February 2026 (about 30 articles, about 150 titles and
  descriptions, rewrites, the new site in August 2026). It is the owner's statement of 20 Oct 2026.
- The legal pages are `g/uk-it-growth/legal.json` with the data list adapted (regulator number, self-pay share,
  specialties, "never anything about a patient") and the links pointed here. The solicitor approved the IT
  wording on 19 Oct 2026; this adaptation has not been shown to her.
