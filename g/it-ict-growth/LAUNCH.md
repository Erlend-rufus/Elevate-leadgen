# Launch notes · /g/it-ict-growth

Italian IT and ICT firms with a turnover of 2 million euro or more (the target on the page and in the ads; since 3 Nov 2026 the
limit that refuses a firm is 1 million euro, and 5,000 euro a month on marketing is a fit on its own: section 6). A copy of the UK IT funnel (`g/uk-it-growth/`): the same
landing page, the same thirteen question form, the same four outcomes, the same endpoint (`/api/lead`) and the same daily
check, in Italian and in euro. Decided and scoped on 23 Oct 2026. Read `g/uk-it-growth/LAUNCH.md` for the mechanics this file
does not repeat (the endpoint, hosting, the Zapier build and the privacy notice). This file lists what is **different** for Italy
and what a person has to supply before it can go live.

**Status: live since 3 Nov 2026 (branch `go-live/it-ict-growth`). The switch is `"live"` in `config.json`.** While it is `false`
the endpoint answers every post with a 503 and stores nothing (that is also the rollback, section 11). Every page carries `noindex`
either way, because it is an ad landing page. The build says what is outstanding:

```
npm run build                  # or: node scripts/build-g-growth.mjs
npm run test:g-growth          # growth funnels, Italy included
node g/_growth/zapier/build.mjs zap1-lead-to-clickup-slack.ts && node g/_growth/zapier/zap1-it.test.mjs   # 584 checks
node g/_growth/zapier/build.mjs zap2-calendly-booking.ts && node g/_growth/zapier/zap2-it.test.mjs        # 98 checks
```

Reviews: `copy.json` review names Aurora Ulliana and `legal.json` review records an Italian solicitor, both dated 3 Nov 2026 and
confirmed by Erlend Rufus. The solicitor's name and firm are still to be added. Not done by a person: the phone test of section 9
step 9. The Meta ads stay paused until Erlend activates them (section 9 step 11). (The Zapier side: both workflows were published
with the Italian entries on 3 Nov 2026 after draft runs, section 4.)

---

## 1. What is different from the UK funnel

| | UK (`uk-it-growth`) | Italy (`it-ict-growth`) |
|---|---|---|
| Language, locale | English, `en-GB` | Italian, `it-IT`. Form, validation messages, outcome pages, privacy notice and terms are Italian. |
| Currency, bands | £ | €. Same thresholds in euro (2m, 10,000, 25,000, 5,000 a month). **These are conversions, not research.** Since 3 Nov 2026 the turnover limit that refuses a firm is 1m, and 5,000 a month on marketing is a fit on its own (section 6). |
| Register check | Companies House (optional, off) | None. `legal.registerCheck: false`, `registerSupported: false`. A firm whose own answers qualify is a `fit` with the reason `register_not_used`. |
| Offer | 100 % commission, client pays the ad spend, no setup fee | **Identical.** No commission rate is published. |
| Contact | Sondre's mailbox and the once-only e-mail | Aurora's address `au@growwithelevate.eu` is the only address shown. The domain stays `getelevateleads.com`. |
| Meetings | Sondre | Aurora (owner in ClickUp and Slack) |
| Cases | UK firms | The **same three UK firms**, labelled as British in the hero, over the cases and in the note. |
| Opt-in quote button on "not a fit" | Yes | Yes (assumes Elevate sells websites in Italy and Aurora handles it). Delete `copy.json` → `outcomes.not-a-fit.interest` to remove it. |
| Meta | UK pixel, `META_CAPI_TOKEN` | **The same pixel and the same token** (decision 3 Nov 2026, Erlend): `funnel.sharedPixel: true`, no variable of its own (section 5). |
| ClickUp, Slack, Calendly | `IT - UK - Commision`, `#leads-uk`, "Commission I IT" | Own list `IT - ITALY - Commission`, own channel `#leads-it`, own Calendly event (section 3 and 4). |
| Pages | `/g/uk-it-growth/*` | `/g/it-ict-growth/*`, 8 pages, `noindex`, headers and redirects in `netlify.toml`. |

---

## 2. What only a person can supply

| # | What | Where it goes | Until then |
|---|---|---|---|
| 1 | ~~Italian Meta pixel~~ **Decided 3 Nov 2026: Italy uses the same pixel as the UK funnels and the rest of getelevateleads.com** | `config.json` → `funnel.pixelId` (the UK value) and `funnel.sharedPixel: true` | **Done.** Events from both countries land in one dataset: split them by campaign or page URL when reporting. The build refuses `live: true` on the UK pixel unless `sharedPixel` says so. |
| 2 | ~~Conversions API token for that pixel~~ **The shared `META_CAPI_TOKEN`**, already used by the UK funnels | Netlify, `META_CAPI_TOKEN` (function scope) | Nothing to create. **Check that it is set in Netlify before go-live** (this repo never reads it), and that `META_PIXEL_ID` is not set to another pixel. Without the token the server copy of the event is skipped (`not_configured`) and the lead is not held up. |
| 3 | **Calendly event** for the 30 minute pipeline review, host Aurora, in the **same Calendly organisation** as the UK events | `config.json` → `funnel.calendlyUrl` (no query string) | **Done 2 Nov 2026.** "Elevate Marketing \| Commission \| IT Italia". The build refuses `live: true` with it empty. Leave Calendly's own redirect off. |
| 4 | ~~ClickUp list~~ `IT - ITALY - Commission` in the CRM folder, made 3 Nov 2026 with the statuses of `IT - UK - Commision` and the same fields | `config.json` → `clickup.listId`, `zap1-…ts` and `zap2-…ts` (`listId` of `it-ict-growth`) | **Done** (`1201270000004918`). |
| 5 | ~~Slack channel~~ `#leads-it` | `zap1-…ts` (`slackChannel`) | **Done** (`C0CEKL5H4LC`, public). The Zapier app joined it by itself on the first post. |
| 6 | **Aurora in ClickUp and Slack** (invite, then ids) | `zap1-…ts` (`reviewer`: ClickUp user id, Slack user id) | **Open.** She has no account in either. Until she has, tasks are not assigned and nobody is pinged. Erlend invites her; the ids then go into `reviewer` in the source and the workflow. |
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
Calendly) to `zap2-calendly-booking.ts` → `eventTypes` for `it-ict-growth`. **Done 3 Nov 2026:** `82a67d1d-2a3b-4bd4-b892-97c41d4a47ad`. Set Aurora's
availability in Calendly in the Europe/Rome time zone. Zap 2 writes the meeting time in Italian local time through the `zones` option.

Do not use Calendly's own redirect: the page forwards the invitee to `/takk/` itself.

---

## 4. Zapier, ClickUp and Slack

Zap 1 ("Leads v3: skjema til ClickUp og Slack") and Zap 2 ("Leads v3: Calendly-booking") are shared by every growth funnel. The Italian
funnel is a new entry in their `CAMPAIGNS` table. **The Italian entries are published (3 Nov 2026).** The funnel is `live: false`, so the
function answers every submission with a 503 and no Italian lead reaches the Zaps before launch; the UK entries are unchanged.

What the Italian entry changes (options, all default to the old behaviour for UK):

| Option | Italy | Effect |
|---|---|---|
| `listId` | `1201270000004918` | ClickUp list `IT - ITALY - Commission` (CRM folder), made 3 Nov 2026 with the nine statuses of the UK list. The UK list's custom fields were added to it as the same fields, so every field and option id is the UK one. |
| `slackChannel` | `C0CEKL5H4LC` | `#leads-it` (public). Empty fails the run on purpose. |
| `lang` | `"en"` | ClickUp task text, comments and the Slack posts are in English (the source language is Norwegian). Aurora reads English. If she wants Italian, add an `IT` table next to `EN`; a missing entry falls back to Norwegian. |
| `answersEn` | 42 entries | The Italian form's answer words in English. Slack shows the English; the ClickUp description shows the English with the visitor's word in brackets. A test fails if an option of `core.mjs` has no entry. |
| `slackDetail` | `true` | The full Slack post also carries the IT area, years trading, target, website and a "Why" line; the one-line not-a-fit post carries the website. No name, e-mail address or phone number in Slack. |
| `reviewer` | Aurora, no ids yet | Assignee in ClickUp, ping in Slack. With ClickUp id 0 and no Slack id nobody is assigned or pinged. Fill in her ids when she has been invited (section 1, row 6), in the source and in a new publish. |
| `register` | `false` | No register rows in the description. |
| `phonePrefix` | `39` | Italian mobile numbers (3xx) and landlines (0x) are normalised to `+39…`. |
| `reasonText`, `otherSpecialism` | English texts in euro, "Altro" | Reason codes stay English; the texts are English, also for fit and review. |
| Zap 2 `zones` | Europe/Rome | Meeting time in Italian local time. |
| Zap 2 `eventTypes` | `82a67d1d-2a3b-4bd4-b892-97c41d4a47ad` | Aurora's event type (section 3). |

What the visitor wrote in their own words (the target, what they want from the meeting) is shown as written, in Italian if they wrote Italian:
a table cannot translate it.

How it was published, and how to change it later (the workflows are switched on and carry live UK leads, so every publish is a change to production):

1. Change the source files; `node g/_growth/zapier/zap1-it.test.mjs`, `zap2-it.test.mjs` and the UK suites must stay green.
2. Put the file into a Zapier draft of the existing workflow (`create_workflow_draft`, `update_workflow_draft`, `workflow.ts`) and check the
   draft against the file by sha256.
3. `run_workflow_draft` with **made-up data** (`@example.invalid`), `campaign: "it-ict-growth"`. Check the task in the Italian list
   (tagged `test`), the Slack post (only with `slack_test`), the assignee. Archive the test tasks, never delete them.
4. Run a UK test lead through the same draft: it must look exactly as before.
5. `publish_workflow_draft` without `enabled`, so the switched-on state is kept. Read the published version back and compare the sha256.
   Versions and the older ones to go back to are in `g/_growth/zapier/README.md`.

Not changed by Italy: the UK entries, the hook, the tags, the status names, the shared custom fields. ClickUp's dropdowns are in pounds, so
the euro bands are left unset in ClickUp and the exact answer is in the task description.

**Question sheet, pipeline review, deckgen and lead sweep** (the scheduled routines in the project) are hard-wired to the UK list ids,
Companies House and Norwegian labels. They do **not** cover Italy yet. Until they do, a booked Italian meeting gets no automatic question
sheet: see "Italy variant" in `claude/sporsmalsark/OPPSKRIFT-italia-2026-10-23.md` (draft; no scheduled task has been created).

---

## 5. Meta

The campaign specification is `claude/spesifikasjon-meta-kampanje-it-ict-2026-10-23.md`; the creative brief is
`claude/brief-claude-design-annonser-it-ict-2026-10-23.md`. Nothing is created in Meta.

- **Italy uses the same pixel as the UK funnels and the rest of getelevateleads.com** (`1466790598245604`; decision 3 Nov 2026, Erlend). The
  browser pixel is the one in `config.json` → `funnel.pixelId`, with `funnel.sharedPixel: true` saying that this is on purpose. The server event
  (`QualifiedForm`, same event id) goes to the same pixel with the shared token `META_CAPI_TOKEN`, as for the UK funnels. Events from both
  countries land in one dataset: split them by campaign or page URL when reporting.
- The build refuses `live: true` for a non-UK funnel on the UK pixel unless `sharedPixel` is true, refuses `sharedPixel: true` when `pixelId` is
  not the UK pixel, and refuses it together with `capiTokenEnv`. To give a country a pixel of its own later: set `pixelId`, remove `sharedPixel`
  and name the Netlify variable that holds that pixel's token in `capiTokenEnv` (`META_CAPI_TOKEN_<COUNTRY>`). A Meta access token belongs to one
  pixel. Without a token nothing is sent (`not_configured`) and the lead is not held up.
- **`META_PIXEL_ID` must not be set to another pixel in Netlify.** It is a testing override of the server event; set to anything else it would
  send the Italian events to that pixel.
- The domain `getelevateleads.com` is already verified in Meta Business Settings.
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
| `not_a_fit` | turnover under 1 million euro (2 until 3 Nov 2026), trading under 2 years, or a typical client worth under 10,000 euro in year one, unless the firm spends 5,000 euro or more a month on marketing |
| `not_now` | no capacity for new clients in the next three months (and not already `not_a_fit`), whatever the firm spends |
| `review` | turnover withheld without the inference rule, or a client worth 10,000 to under 25,000 euro, or an answer that needs a person, unless the firm spends 5,000 euro or more a month on marketing |
| `fit` | everything else; reason `register_not_used`, marked `unchecked` |

Inference rule (22 Oct 2026, same as UK): withheld turnover counts as 2 to under 5 million euro when the firm has 50 or more people **and**
5,000 euro or more a month on marketing (`turnover_inferred`). The payload keeps what the visitor wrote.

**Two changes of 3 Nov 2026** (Erlend and Sondre in #leads-it, then Erlend in the chat), made after the first real lead (ResilientX,
cybersecurity, 1 to under 2 million euro) was refused on turnover alone. They differ from the UK funnel and are meant as a starting setting, so
the person taking the meetings gets practice:

1. **The limit that refuses a firm is turnover under 1 million euro, not 2.** A firm at 1 to under 2 million goes through the same rules as one
   above it and carries its own reason, `turnover_1m_2m`; under 1 million is `turnover_below_1m`. Unlike the UK funnel since 26 Oct 2026, the band
   has no marketing budget condition. The 2 million euro stays on the page and in the ads as the target (`THRESHOLD` in `config.json`: the topline,
   the "works if" list and the not-a-fit page), the same split the UK pages have. That text was approved by Aurora and the jurist on 3 Nov 2026
   and is **not** changed with the rules.
2. **5,000 euro or more a month on marketing is a `fit` whatever else was said** (`spend_5k_plus`), except at capacity (`not_now`). A firm that would
   be refused or sent to review and spends that much gets the calendar; a firm that is a fit already keeps its own reasons. It is `decide()` in
   `route.mjs`, a wrapper round `decideByAnswers()`: to go back, delete `decide()` and rename `decideByAnswers()`. The spend is what the visitor
   wrote and nothing checks it. Meta gets `QualifiedForm` for these firms like for any `fit` (section 5).

Zap 1's Italy table has the words for the three new codes (`turnover_below_1m`, `turnover_1m_2m`, `spend_5k_plus`); the old `turnover_below_2m` keeps
its words for the leads made before. `zap1-it.test.mjs` fails if the route can give a code that the table has no words for.

**Consequence of no register:** the calendar is open to anyone who answers the form right. Aurora checks the company in Registro Imprese before
the meeting. Adding a register later is one provider, `legal.registerCheck: true` and a line in the privacy notice.

---

## 7. What is shared and what is separate

| Shared with the UK funnels | Separate for Italy |
|---|---|
| The function `netlify/functions/lead/`, the daily check, the alert channel, `ZAPIER_LEAD_HOOK`, the Meta pixel and `META_CAPI_TOKEN` | Calendly event |
| Zap 1 and Zap 2 (as table entries) | ClickUp list, Slack channel, Aurora's ids |
| The Netlify site and domain | Pages under `/g/it-ict-growth/`, the Netlify rules for them |
| The build script, the form renderer, the tests | `g/it-ict-growth/` (config, core, route, copy, legal, tests) |

---

## 8. Testing

```
npm run test:g-growth          # 286 tests on 3 Nov 2026, the Italian funnel included
```

The Italian tests cover: the form against the UK form field for field, euro bands, validation, the routing table, the endpoint (fit, not a fit,
not now, review, 503 while not live, no-JavaScript 422 in Italian), the eight pages (Italian, `noindex`, one h1, no dashes, no exclamation
marks, no phone numbers, no pound sign, no commission with an amount), the labelling of the UK cases, the only address, the offer text, privacy
and terms, the cookie bar, the shared pixel and token (and the build's refusals around `sharedPixel`), and the `netlify.toml` rules.

**What the tests do not cover:** a real phone, a real Calendly booking by a real visitor, a real lead through the live workflows (draft runs against
the real ClickUp lists and `#leads-it` were done on 3 Nov 2026), Italian that reads naturally.
`node g/uk-it-growth/e2e/run.mjs` (needs `npm install --no-save playwright-core axe-core`) is written for the UK page; run it against
`/g/it-ict-growth/` after adapting the slug and the Italian texts it looks for. Not done.

---

## 9. Before launch, in this order

1. Aurora reads the landing page, the form, the outcome pages and the ads, and approves them.
2. A native speaker corrects the Italian. Decide **voi or Lei** (the draft uses voi). Fill `copy.json` → `review`.
3. The Italian solicitor reads the jurist pack, answers its questions and confirms or changes the privacy notice, terms, cookie banner and commission
   agreement. Copy their wording into `legal.json`, fill `legal.json` → `review`.
4. Erlend: invite Aurora to ClickUp and Slack. (Done 3 Nov 2026: the ClickUp list, the Slack channel, the Calendly event. Italy shares the UK pixel and
   token: `META_CAPI_TOKEN` has to be set in Netlify, and `META_PIXEL_ID` must not be set to another pixel.)
5. Fill Aurora's ids in the source (section 4), re-run the Zap tests, run a Zapier draft with a made-up lead and publish (section 4).
6. `funnel.pixelId` (the shared one), `funnel.calendlyUrl` and `clickup.listId` are set in `config.json` (3 Nov 2026). Check the build output.
7. Branch `go-live/it-ict-growth`: `"live": true`, nothing else. The build must pass (it refuses a non-UK funnel on the UK pixel unless
   `sharedPixel` is set, an empty Calendly URL and an empty review).
8. Merge. Check on production: `/g/it-ict-growth/` 200; an empty post to `/api/lead` 422 (not 503); GET 405.
9. A real phone test of all four outcomes with `@example.invalid` addresses and a real Calendly booking; cancel the booking afterwards.
10. The Zaps are already switched on and carry the Italian entries. Run the acceptance run through the live function, check ClickUp and
    `#leads-it`.
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
