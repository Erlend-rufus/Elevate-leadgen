# Launch notes · /g/it-ict-growth

Italian IT and ICT firms with a turnover of 2 million euro or more. A copy of the UK IT funnel (`g/uk-it-growth/`): the same
landing page, the same thirteen question form, the same four outcomes, the same endpoint (`/api/lead`) and the same daily
check, in Italian and in euro. Decided and scoped on 23 Oct 2026. Read `g/uk-it-growth/LAUNCH.md` for the mechanics this file
does not repeat (the endpoint, hosting, the Zapier build and the privacy notice). This file lists what is **different** for Italy
and what a person has to supply before it can go live.

**Status: built and tested; not live. The switch is `"live"` in `config.json`.** While it is `false` the endpoint answers every
post with a 503 and stores nothing, and every page carries `noindex`. The build says what is outstanding:

```
npm run build                  # or: node scripts/build-g-growth.mjs
npm run test:g-growth          # growth funnels, Italy included
node g/_growth/zapier/build.mjs zap1-lead-to-clickup-slack.ts && node g/_growth/zapier/zap1-it.test.mjs   # 198 checks
node g/_growth/zapier/build.mjs zap2-calendly-booking.ts && node g/_growth/zapier/zap2-it.test.mjs        # 93 checks
```

The Italian funnel has not been through a real phone test, a Zapier draft run, a solicitor or a native speaker. Do not set
`"live": true` until section 9 is done.

---

## 1. What is different from the UK funnel

| | UK (`uk-it-growth`) | Italy (`it-ict-growth`) |
|---|---|---|
| Language, locale | English, `en-GB` | Italian, `it-IT`. Form, validation messages, outcome pages, privacy notice and terms are Italian. |
| Currency, bands | £ | €. Same thresholds in euro (2m, 10,000, 25,000, 5,000 a month). **These are conversions, not research.** |
| Register check | Companies House (optional, off) | None. `legal.registerCheck: false`, `registerSupported: false`. A firm whose own answers qualify is a `fit` with the reason `register_not_used`. |
| Offer | 100 % commission, client pays the ad spend, no setup fee | **Identical.** No commission rate is published. |
| Contact | Sondre's mailbox and the once-only e-mail | Aurora's address `au@growwithelevate.eu` is the only address shown. The domain stays `getelevateleads.com`. |
| Meetings | Sondre | Aurora (owner in ClickUp and Slack) |
| Cases | UK firms | The **same three UK firms**, labelled as British in the hero, over the cases and in the note. |
| Opt-in quote button on "not a fit" | Yes | Yes (assumes Elevate sells websites in Italy and Aurora handles it). Delete `copy.json` → `outcomes.not-a-fit.interest` to remove it. |
| Meta | UK pixel, `META_CAPI_TOKEN` | **Own pixel and own token**: `funnel.capiTokenEnv` = `META_CAPI_TOKEN_IT` (section 5). |
| ClickUp, Slack, Calendly | `IT - UK - Commision`, `#leads-uk`, "Commission I IT" | Own list, own channel, own Calendly event (section 3 and 4). |
| Pages | `/g/uk-it-growth/*` | `/g/it-ict-growth/*`, 8 pages, `noindex`, headers and redirects in `netlify.toml`. |

---

## 2. What only a person can supply

| # | What | Where it goes | Until then |
|---|---|---|---|
| 1 | **Italian Meta pixel** (own, never the UK one) | `config.json` → `funnel.pixelId` | Placeholder is the UK pixel so the cookie bar works in review. **The build refuses `live: true` while it is the UK pixel.** |
| 2 | **Conversions API token for that pixel** | Netlify, `META_CAPI_TOKEN_IT` (function scope) | Browser pixel works; the server copy of the event is skipped (`not_configured`). The build refuses `live: true` if `funnel.capiTokenEnv` is empty. |
| 3 | **Calendly event** for the 30 minute pipeline review, host Aurora, in the **same Calendly organisation** as the UK events | `config.json` → `funnel.calendlyUrl` (no query string) | Booking page shows a notice. The build refuses `live: true` with it empty. Name: "Elevate Marketing \| Commission \| IT Italia". Leave Calendly's own redirect off. |
| 4 | **ClickUp list**: duplicate `IT - UK - Commision` in the CRM folder (statuses and custom fields come with it) | `config.json` → `clickup.listId`, `zap1-…ts` and `zap2-…ts` (`listId` of `it-ict-growth`) | Both Zaps fail visibly for Italy on purpose. The daily check skips ClickUp for this funnel. |
| 5 | **Slack channel** (suggested `#leads-it`) | `zap1-…ts` (`slackChannel`) | Zap 1 fails visibly for Italy on purpose. |
| 6 | **Aurora in ClickUp and Slack** (invite, then ids) | `zap1-…ts` (`reviewer`: ClickUp user id, Slack user id) | Tasks are not assigned and nobody is pinged. |
| 7 | **Zapier Catch Hook** | Netlify, `ZAPIER_LEAD_HOOK` | Shared with the UK funnels: Zap 1 routes on the `campaign` field. Nothing to do if the UK funnels are live. |
| 8 | **An alert channel** | Netlify, `SLACK_ALERT_WEBHOOK_URL` or Resend | Shared with the UK funnels. |
| 9 | **A native Italian speaker reads every page** (landing, form, outcome pages, privacy, terms, ads) | `copy.json` → `review.by`, `review.on` | The build refuses `live: true` with `review` empty. |
| 10 | **An Italian solicitor reads** the privacy notice, the cookie banner, the terms and the commission agreement | `legal.json` → `review.by`, `review.on` | Same. See the jurist pack. |
| 11 | **Aurora approves** the pages, the ads and the flow | | Erlend's condition for delivery. |

Secrets are never written in this repository, in a document or in a chat. They are created by the person who owns the account
and pasted into Netlify.

---

## 3. Calendly

One event type, 30 minutes, "Elevate Marketing | Commission | IT Italia". Aurora is the host. **It has to be in the same Calendly
organisation as the UK events:** Zap 2's trigger listens to that organisation, and a booking in another one never reaches it.
The lead id travels in `utm_content` (`calendlyLeadParam`), exactly as in the UK. Add the event type's id (the uuid at the end of the event type URI in
Calendly) to `zap2-calendly-booking.ts` → `eventTypes` for `it-ict-growth` (it is empty on purpose). Set Aurora's availability in Calendly in the
Europe/Rome time zone. Zap 2 writes the meeting time in Italian local time through the `zones` option.

Do not use Calendly's own redirect: the page forwards the invitee to `/takk/` itself.

---

## 4. Zapier, ClickUp and Slack

Zap 1 ("Leads v3: skjema til ClickUp og Slack") and Zap 2 ("Leads v3: Calendly-booking") are shared by every growth funnel. The Italian
funnel is a new entry in their `CAMPAIGNS` table. **The Italian entries are in the source and tested, but they are not published
in Zapier:** the two Zaps are live for UK leads, and publishing now would put an unfinished entry in front of real UK traffic.

What the Italian entry changes (options, all default to the old behaviour for UK):

| Option | Italy | Effect |
|---|---|---|
| `lang` | `"en"` | ClickUp task text, comments and the Slack post are in English (the source language is Norwegian). Aurora reads English. If she wants Italian, add an `IT` table next to `EN`; a missing entry falls back to Norwegian. |
| `reviewer` | Aurora | Assignee in ClickUp, ping in Slack. |
| `slackChannel` | empty | Run fails on purpose until a channel is set. |
| `register` | `false` | No register rows in the description. |
| `phonePrefix` | `39` | Italian mobile numbers (3xx) and landlines (0x) are normalised to `+39…`. |
| `reasonText`, `otherSpecialism` | Italian options | Reason codes stay English; texts are the Italian ones. |
| Zap 2 `zones` | Europe/Rome | Meeting time in Italian local time. |

Publish in this order, by a person, after sections 2 and 3:

1. Fill the ids above into both source files; `node g/_growth/zapier/zap1-it.test.mjs` and `zap2-it.test.mjs` must stay green.
2. `create_workflow_draft` or `update_workflow_draft` from the source (`sourceFiles: workflow.ts`, built with `build.mjs`).
3. `run_workflow_draft` with **made-up data** (`@example.invalid`) and `campaign: "it-ict-growth"`. Check the task in the Italian list
   (tagged `test`), the Slack post (only with `slack_test`), the assignee. Archive the test task.
4. Run a UK test lead through the same draft: it must look exactly as before.
5. Publish switched off. Switching on needs a person's yes, because live UK leads share the Zap.

Not changed by Italy: the UK entries, the hook, the tags, the status names, the shared custom fields. ClickUp's dropdowns are in pounds, so
the euro bands are left unset in ClickUp and the exact answer is in the task description.

**Question sheet, pipeline review, deckgen and lead sweep** (the scheduled routines in the project) are hard-wired to the UK list ids,
Companies House and Norwegian labels. They do **not** cover Italy yet. Until they do, a booked Italian meeting gets no automatic question
sheet: see "Italy variant" in `claude/sporsmalsark/OPPSKRIFT-italia-2026-10-23.md` (draft; no scheduled task has been created).

---

## 5. Meta

The campaign specification is `claude/spesifikasjon-meta-kampanje-it-ict-2026-10-23.md`; the creative brief is
`claude/brief-claude-design-annonser-it-ict-2026-10-23.md`. Nothing is created in Meta.

- The browser pixel is the one in `config.json` → `funnel.pixelId`. The server event (`QualifiedForm`, same event id) goes to the same pixel.
- **A Meta access token belongs to one pixel.** `funnel.capiTokenEnv` names the Netlify variable that holds the Italian token. For a funnel
  that sets it, the function uses that token and `funnel.pixelId`, and ignores `META_PIXEL_ID`. Without it, nothing is sent
  (`not_configured`) and the lead is not held up.
- **`META_PIXEL_ID` must stay unset in Netlify.** For the UK funnels it is a testing override; it would otherwise be copied to the server
  event of any funnel without `capiTokenEnv`.
- The domain `getelevateleads.com` is already verified in Meta Business Settings (UK). The Italian pixel is added to the same business.
- `META_TEST_EVENT_CODE` is not set in Production.
- Meta gets `QualifiedForm` for a `fit` or a `review` whose visitor accepted cookies: from the browser on `/book` and `/review`, and from the
  server with the same event id. `not_now` and `not_a_fit` are never reported. (The server event is held only when the register switch
  `COMPANIES_HOUSE_MODE=off` is on, which is a deploy-preview setting.)

---

## 6. Routing

Same four routes, same order, same reason codes as the UK funnel (the Zaps and the payload read them, so they stay English). Keyed by the
position of an answer in `core.mjs` `OPTIONS`: never reorder them.

| Route | When |
|---|---|
| `not_a_fit` | turnover under 2 million euro, trading under 2 years, or a typical client worth under 10,000 euro in year one |
| `not_now` | no capacity for new clients in the next three months (and not already `not_a_fit`) |
| `review` | turnover withheld without the inference rule, or a client worth 10,000 to under 25,000 euro, or an answer that needs a person |
| `fit` | everything else; reason `register_not_used`, marked `unchecked` |

Inference rule (22 Oct 2026, same as UK): withheld turnover counts as 2 to under 5 million euro when the firm has 50 or more people **and**
5,000 euro or more a month on marketing (`turnover_inferred`). The payload keeps what the visitor wrote.

**Consequence of no register:** the calendar is open to anyone who answers the form right. Aurora checks the company in Registro Imprese before
the meeting. Adding a register later is one provider, `legal.registerCheck: true` and a line in the privacy notice.

---

## 7. What is shared and what is separate

| Shared with the UK funnels | Separate for Italy |
|---|---|
| The function `netlify/functions/lead/`, the daily check, the alert channel, `ZAPIER_LEAD_HOOK` | Pixel, CAPI token, Calendly event |
| Zap 1 and Zap 2 (as table entries) | ClickUp list, Slack channel, Aurora's ids |
| The Netlify site and domain | Pages under `/g/it-ict-growth/`, the Netlify rules for them |
| The build script, the form renderer, the tests | `g/it-ict-growth/` (config, core, route, copy, legal, tests) |

---

## 8. Testing

```
npm run test:g-growth          # 277 tests on 23 Oct 2026; the Italian funnel has 22 of its own
```

The Italian tests cover: the form against the UK form field for field, euro bands, validation, the routing table, the endpoint (fit, not a fit,
not now, review, 503 while not live, no-JavaScript 422 in Italian), the eight pages (Italian, `noindex`, one h1, no dashes, no exclamation
marks, no phone numbers, no pound sign, no commission with an amount), the labelling of the UK cases, the only address, the offer text, privacy
and terms, the cookie bar, Meta's own token and pixel, and the `netlify.toml` rules.

**What the tests do not cover:** a real phone, a real Calendly booking, a real Zapier run, a real ClickUp list, Italian that reads naturally.
`node g/uk-it-growth/e2e/run.mjs` (needs `npm install --no-save playwright-core axe-core`) is written for the UK page; run it against
`/g/it-ict-growth/` after adapting the slug and the Italian texts it looks for. Not done.

---

## 9. Before launch, in this order

1. Aurora reads the landing page, the form, the outcome pages and the ads, and approves them.
2. A native speaker corrects the Italian. Decide **voi or Lei** (the draft uses voi). Fill `copy.json` → `review`.
3. The Italian solicitor reads the jurist pack, answers its questions and confirms or changes the privacy notice, terms, cookie banner and commission
   agreement. Copy their wording into `legal.json`, fill `legal.json` → `review`.
4. Erlend: Italian pixel, CAPI token (`META_CAPI_TOKEN_IT`), ClickUp list, Slack channel, invite Aurora, Calendly event.
5. Fill the ids in the source (sections 2 to 4), re-run the Zap tests, run the Zapier draft with a made-up lead (section 4).
6. Set `funnel.pixelId`, `funnel.calendlyUrl`, `clickup.listId`. Check the build output.
7. Branch `go-live/it-ict-growth`: `"live": true`, nothing else. The build must pass (it refuses a UK pixel, an empty Calendly URL, an empty token
   variable and an empty review).
8. Merge. Check on production: `/g/it-ict-growth/` 200; an empty post to `/api/lead` 422 (not 503); GET 405.
9. A real phone test of all four outcomes with `@example.invalid` addresses and a real Calendly booking; cancel the booking afterwards.
10. Switch Zap 1 and Zap 2 for Italy on (a person's yes), run the acceptance run, check ClickUp and Slack.
11. Only then: Meta ads created paused, previewed, activated by Erlend.

## 10. Limits and decisions to confirm

- **The pages make promises Aurora has to keep.** `review`: "we will answer within one working day". The not-a-fit button: "we will write once,
  by e-mail, within two working days". The booking page: "answer the confirmation e-mail and we will find another time". Cover for her absences.

- **Nothing here is legal advice.** Garante rules, cookie consent, e-mail and phone marketing, the commission agreement and Aurora's status are all
  for the Italian solicitor. See the jurist pack.
- **Aurora's own mailbox** (`au@growwithelevate.eu`) is the data protection contact in the notice. If that is a personal mailbox, a handling
  procedure for access and deletion requests is needed (who answers, within what time, who has access when she is away).
- **Consent to use the three UK case names and figures** on an Italian page is assumed from the UK page. Confirm it covers this use.
- **Payment terms 14 days** are copied from the UK. 30 to 60 days is the norm in Italy; a firm that reads 14 days as unrealistic will not apply.
- **Euro bands** are conversions of the UK bands. They have not been tested against Italian firms.
- **Italian IT firm names** are different (S.r.l., S.p.A.): the form says so; the free-text company number field is not used.
- **The opt-in quote button** assumes Elevate sells websites in Italy. If not, remove it (section 1).
- **Language of ClickUp and Slack for Aurora:** English by default (section 4). Ask her.
- **`fit` is not verified.** With no register the share of `fit` means nothing; Aurora's manual read in ClickUp does.
- **No Italian baseline.** The UK cost per submission and booking rate are not Italian numbers.

## 11. Rolling back

Set `"live": false` and merge: the endpoint answers 503 and stores nothing, the pages stay up with `noindex`. Pause the Meta campaign first, so
nobody pays for clicks that cannot be submitted. Switch Zap 1 and Zap 2 off only if nothing else needs them (UK leads share them).
