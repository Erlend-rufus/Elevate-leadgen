# Launch notes · /g/uk-law-firms

Law firms in England and Wales with £2m+ turnover ("ADVOKAT"). Built 20 Oct 2026 on the framework of
`/g/uk-it-growth` (read `g/uk-it-growth/LAUNCH.md` first: the endpoint, storage, delivery, alerts, Meta and
the daily check are the same code). This file only says what is different and what is outstanding.

**Status: built and tested, `"live": false`.** The pages are served (noindex), the endpoint answers every post
for this campaign with a 503 and stores nothing.

```
npm run build          # or: node scripts/build-g-growth.mjs
npm run test:g-growth  # g/uk-law-firms/test/funnel.test.mjs is in it
```

## 1. What is different from the IT funnel

| | IT | Law |
|---|---|---|
| Threshold | £2m | £2m (`{THRESHOLD}`), a new client worth £2,000+ in the first year (`{WORTH}`), outside personal injury |
| Form | 13 steps | 12 steps; "Which practice areas would you like to grow?" is a multi-choice, sent as `practice_areas` joined with ", ". Bands written "to under" (L36). SRA number optional. |
| Routing (`route.mjs`) | | not a fit: turnover under £2m, trading under two years, only "Personal injury" ticked. not now: no capacity. review: turnover not stated (F7), a client worth under £2,000 (L5). Personal injury ticked with other areas is routed on the other areas and flagged (`personal_injury_ticked`): the agreement must leave those matters out. |
| Payment | commission on closed deals | version A: commission on new instructions from campaigns we run (L16 to L22). Never a rate on the page. |
| Case | three IT consultancies | **none**: the hero is the L6 fallback ("We run client acquisition for law firms. Here is how it works."), no firm is named, no figures. Cards come back when a firm has given figures and written permission for UK use (AF1 to AF6). |
| Register | off | the same: no Companies House or SRA lookup is promised or made. Check before each meeting (SRA register for partnerships that are not at Companies House). |
| ClickUp list | `IT - UK - Commision` | **not created yet**, see section 2 |
| Calendly | `elevate-marketing-commission-i-it` | **empty**, see section 2 |

## 2. What only a person can supply (in this order)

1. **ClickUp list.** Duplicate `IT - UK - Commision` in ClickUp (with statuses and custom fields), name it
   `LAW - UK - Commission`, and put its id in `config.json` → `clickup.listId`. Do not use
   `UK - LAWYERS - WEBSITE SALE`.
2. **Zap 1 and Zap 2.** Fill in `uk-law-firms` in `CAMPAIGNS` in both `g/_growth/zapier/*.ts` with the new
   list's field ids, test, publish. Until `listId` is set, a law lead fails the run on purpose and is kept in the
   function's store.
3. **Calendly.** A new 30 minute event (owner, 20 Oct: "skal få lagd en advokat greie i morgen"). Name
   "Elevate Marketing | 30 minute instruction review", description "A 30 minute instruction review for law
   firms. Bring four numbers: last year's turnover, your growth target for next year, your main practice
   areas and what a typical new instruction is worth." Redirect after booking off. Put the inline-embed
   address in `config.json` → `funnel.calendlyUrl` and the event type id in Zap 2's `eventTypes`. The
   confirmation e-mail should carry the "what to have to hand" line (L32).
4. **Go live.** `"live": true`, build, merge, phone test of each outcome, one test booking, archive the test tasks.
5. **Ads.** The Meta campaign `LEADS / UK / LAW` is created paused and is switched on only after step 4 and the
   owner's yes. Budget kr 1 000 a day (kr 30 000 a month).

## 3. Things to know

- The page makes no result claim: no close rates, no counts, no firm names (ASA and CAP require substantiation
  for such claims; the figures from the four Norwegian firms are not in yet).
- FAQ 2 ("Is this a referral arrangement?") carries the L30 wording. The owner reports the solicitor approved
  all points on 19 Oct 2026; her written answer is not in the repository.
- `measure`: "New instructions" is both what we judge ourselves on and what we are paid on (version A, L28).
- The legal pages are `g/uk-it-growth/legal.json` with the data list adapted (SRA number, fee earners, practice
  areas, "never anything about a client's matter") and the links pointed here.
