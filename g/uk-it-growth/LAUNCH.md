# Launch notes · /g/uk-it-growth

UK IT services firms with £2m+ turnover ("IKT"). One landing page, a thirteen question form that
checks itself, five answer pages, one endpoint (`/api/lead`) and one daily check. Built from the IT
board v56 (Claude Design) and the project document "Løsning: eget skjema, Zapier, ClickUp og Slack"
(16 Oct 2026). The health and law funnels are built the same way and reuse `g/_growth/`, the
function and the tests; this is the first.

**Status: built and tested; the switch is `"live"` in `config.json`.** While it is `false` the endpoint answers every
post with a 503 and stores nothing. Every page carries `noindex` either way, because this is an ad landing page and nobody is
meant to find it in a search. The branch `go-live/uk-it-growth` sets `"live": true` and changes nothing else; it is merged only
when the rows in section 10 are done, and section 10 also says where things stand. The build says what is outstanding:

```
npm run build        # or: node scripts/build-g-growth.mjs
npm run test:g-growth
```

---

## 1. What only a person can supply

| # | What | Where it goes | Until then |
|---|---|---|---|
| 1 | **Calendly event address** for the "30 minute pipeline review" | `config.json` → `funnel.calendlyUrl`, no query string | **Set** to the collective event "Elevate Marketing \| Commission I IT" (section 3). Its Calendly name and description still describe another offer. The owner approved new wording on 19 Oct 2026 (text in section 3); it is not entered yet, because the browser's Calendly login had expired and the assistant never types a password. |
| 2 | **Zapier Catch Hook URL** for Zap 1 | Netlify, `ZAPIER_LEAD_HOOK` | Endpoint answers 503. |
| 3 | **Companies House API key** | Netlify, `COMPANIES_HOUSE_API_KEY`, and `legal.registerCheck` in `config.json` | **Dropped for now** (owner's decision, 19 Oct 2026, changed the same evening). With `legal.registerCheck: false` no register lookup is made: a lead whose own answers qualify is a `fit`, reaches `/book` by itself, and is marked `unchecked` with the reason `register_not_used`. The calendar is therefore open to anyone who answers the form right (section 6). The pages say nothing about a register check while `legal.registerCheck` is `false`. A deploy preview can still run with the register off (`COMPANIES_HOUSE_MODE=off`, section 2); production never can. Getting the key later is one variable and one flag (section 13). |
| 4 | **Meta Conversions API token** | Netlify, `META_CAPI_TOKEN` | The browser pixel still works; the server copy of the event is skipped. |
| 5 | **An alert channel**, Slack or e-mail (either one is enough) | Netlify, `SLACK_ALERT_WEBHOOK_URL`, or `RESEND_API_KEY` with `ALERT_EMAIL_FROM` | Failures are only in the function log. Do not launch without one. Slack is the shorter road: an incoming webhook for one channel, no new processor in the privacy notice and no DNS record. E-mail through Resend needs an account, a verified sender domain and a line in the notice. |
| 6 | **Zap 1 and Zap 2**, ClickUp field `lead_id`, Slack `#leads-uk` | Section 4 | **Built and tested against the real ClickUp list and one real Calendly booking, saved switched off.** Zap 1 has had one live run with a made-up lead (task in ClickUp, post in `#leads-uk`); Zap 2 has had one live run with a real booking on "Commission I IT" (task found by lead id, moved to `møte booket`, due date set, one comment). Both have to be switched on again, by a person, for the acceptance run (section 10). The hook URL for row 2 exists once Zap 1 has been switched on; it is copied from Zap 1's trigger step in the Zapier editor. |
| 7 | **Privacy notice and website terms** approved by the solicitor | `legal.json`, `config.json` → `links` | **Built** as `/g/uk-it-growth/privacy/` and `/terms/` from the pack's drafts, and linked from every page (section 13). The owner reports that the solicitor approved on 19 Oct 2026. No written answer is in the repository or the pack, so a final wording that differs from the drafts has to be sent and copied into `legal.json`. |
| 8 | **A real phone test** (section 9) | | |

Secrets are never written in this repository, in a document or in a chat. They are created by the
person who owns the account and pasted into Netlify.

---

## 2. Settings (Netlify, Site configuration → Environment variables, scope: Functions)

| Variable | | If missing |
|---|---|---|
| `ZAPIER_LEAD_HOOK` | **Required.** An `https://` Catch Hook URL. | 503, nothing stored. |
| `COMPANIES_HOUSE_API_KEY` | The register lookup. Not needed for launch (decision of 19 Oct 2026). Set it together with `legal.registerCheck: true` (section 13). | With `legal.registerCheck: false`, nothing: no lookup is made and qualifying leads are `fit`, marked `unchecked`. With `registerCheck: true` and no key, every would-be `fit` is a `review`. |
| `COMPANIES_HOUSE_MODE` | `off` skips the register so a **deploy preview** can be tried end to end before the key exists. Set it for the deploy-preview context only, never for production. The code ignores it on every address except a Netlify deploy preview, a branch deploy and localhost, and whenever Netlify's `CONTEXT` is `production`. Not a launch setting. | The register is asked. |
| `META_CAPI_TOKEN` | Server side `QualifiedForm`. | Skipped, recorded as `not_configured`. |
| `META_PIXEL_ID` | Optional. Defaults to the page's pixel (`config.json` → `funnel.pixelId`). Setting it to anything else breaks the match between the browser event and the server event. | Page pixel. |
| `META_TEST_EVENT_CODE` | Optional. While set, events show only under Test Events in Events Manager. **Remove it for launch.** | Live events. |
| `RESEND_API_KEY`, `ALERT_EMAIL_FROM` | Alert e-mail. The sender must be on a domain verified in Resend, and Resend has to be named in the privacy notice (it is not today). `ALERT_EMAIL_TO` defaults to `post@elevatemarketing.no`. | No e-mail alerts. |
| `SLACK_ALERT_WEBHOOK_URL` | Alert channel, and the recommended one: Slack is already a named processor and nothing has to be verified. An incoming webhook for one channel; a channel of its own is easier to notice than `#leads-uk`. Must start `https://hooks.slack.com/`. | No Slack alerts. |
| `CLICKUP_API_TOKEN` | Optional. Lets the daily check compare delivered leads with ClickUp tasks. | No comparison. |
| `LEAD_IP_SALT` | Optional. Salt for the hashed address in the rate limiter. | A fixed default. |

Alerts go straight from the function and not through Zapier, on purpose: the case they exist for is
Zapier being down. Both channels (the Slack webhook and Resend e-mail) are in `netlify/functions/lead/alert.mjs`,
either one alone is enough, and a service added there has to be named as a processor in the privacy notice.
Alerts carry a lead id and the company name, never an e-mail address, phone number or free text.

---

## 3. Calendly

**Chosen event (19 Oct 2026):** the collective event "Elevate Marketing | Commission I IT", event type id
`769980c2-23c5-4a60-8f1e-462e5e4ea12e`, 30 minutes, instant booking, no custom questions, address
`https://calendly.com/d/dv8z-vdp-5xt/elevate-marketing-commission-i-it` (already in `config.json`). It is the
only IT specific 30 minute event, and as a collective event it can be taken by more than one host. Its
Calendly description opens with "Growth Assessment for IT Consultancies" and talks about commission-only lead
generation ("you pay nothing until a deal closes"), which does not match the page's "30 minute pipeline review",
and the visitor sees both. **Approved by the owner on 19 Oct 2026, not entered yet:**

- Event name: `Elevate Marketing | 30 minute pipeline review`
- Description: `A 30 minute pipeline review for IT firms. Bring three numbers: last year's turnover, next year's target and what a typical new client is worth in the first year.`

Nothing else on the event changes. Check that the event link still ends `/elevate-marketing-commission-i-it`
before and after saving (it is in `config.json` and must not change), keep "Redirect to an external site" off,
and Zap 2 is not affected, because it finds the event by its event type id. It was not done because the Calendly
login in the browser session had expired and the assistant never types a password. A person who is signed in
does it in Calendly → Event types → the event → Event details, or signs in and asks for it. If another event is
chosen instead, change `calendlyUrl` and the event type id in Zap 2 (`CAMPAIGNS`) together. The other events in the account are not IT events: "Clinic intake
call" is the health page's, "Pipeline-gjennomgang" is 20 minutes and Norwegian.

1. Calendly → the event type → **Share** → **Add to website** → **Inline embed**. Copy the address,
   which looks like `https://calendly.com/<account>/<event>`, without anything after a `?`.
2. Put it in `config.json` → `funnel.calendlyUrl`. The build refuses anything that is not a
   `calendly.com` address without a query string.
3. In the event type, **Confirmation page** stays on "Display Calendly confirmation page". Do **not**
   set "Redirect to an external site": the page forwards to `/takk` itself when Calendly reports the
   booking, and with both on the visitor is sent twice.
4. The page passes the lead id to Calendly in `utm_content` (`config.json` → `funnel.calendlyLeadParam`).
   Calendly keeps `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and `utm_term` with the
   booking, and Zap 2 reads `utm_content` back. The ad's own `utm_content` stays on the application
   in ClickUp; it is only replaced inside Calendly. Change the parameter in the config and in Zap 2
   together, never in one place.
5. The page also passes name and e-mail (only after a `fit`, only for a visitor with JavaScript, once,
   within 30 minutes), `hide_gdpr_banner=1`, white background, ink text and the blue `0073BD`.
   Calendly may ignore colours on a free plan.

Open question: Calendly's frame can set its own cookies as soon as the booking page loads, before the
visitor has answered the banner. The banner and the page text are about Meta. If that matters for
compliance, the calendar has to wait for a click, which is a design change and not made here.

---

## 4. Zapier, ClickUp and Slack

The function decides. Zapier distributes. All logic (thresholds, register check, routing) is in code.

### What Zapier receives

`POST` of JSON to `ZAPIER_LEAD_HOOK`, fixed keys in a fixed order, an empty string for what does not
apply (so a mapping never breaks). The list is `PAYLOAD_KEYS` in `netlify/functions/lead/payload.mjs`
and is covered by a test; change it there and in the Zap together.

`lead_id, campaign, route, route_reason, submitted_at, company_name, company_website, company_number,
ch_status, ch_accounts_type, ch_incorporated, ch_check, specialism, practice_areas, sra_number,
turnover_band, trading_years, employees_or_fee_earners, marketing_spend, first_year_value, sales_cycle,
target_next_year, decision_maker, capacity, first_name, last_name, job_title, email, mobile,
utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, page_slug, referrer`

Never sent: the browser's Meta identifiers, the consent state, the IP address. `fbclid` is empty unless
the visitor accepted the cookie choice. `route` is `fit`, `review`, `not_now` or `not_a_fit`.

### How the two Zaps are built

Both are Zapier durable workflows written in code, not click-built Zaps. The source, the tests and a
short README are in `g/_growth/zapier/`; what is published in Zapier is that source, byte for byte.

| | Zapier workflow | Id | Trigger |
|---|---|---|---|
| Zap 1 | Leads v3: skjema til ClickUp og Slack | `01a150f8-009e-71cc-9696-fc8ec4119d57` | Webhooks by Zapier, Catch Hook |
| Zap 2 | Leads v3: Calendly-booking | `01a15111-adb3-7400-b62c-803edc7657d3` | Calendly, Invitee Created, whole organisation |

Editor: `https://zapier.com/workflow/<id>`. Both are private to the Zapier account. Both were built
switched off (19 Oct 2026). Both were switched on briefly for their first live tests the same day (Zap 1 with
a made-up lead, Zap 2 with a real booking) and are saved switched off again (see "How the two Zaps were
tested"). A trigger that has never been switched on shows as
`unclaimed`, a switched-on one as `active`, and one switched off again as `released`.

**The hook URL.** The Catch Hook URL exists only once Zap 1 has been switched on: an `unclaimed` trigger shows
none. Switch Zap 1 on, open the trigger step in the Zapier editor, copy the Catch Hook URL and paste it into
Netlify as `ZAPIER_LEAD_HOOK`. Checked once on 19 Oct 2026: switching Zap 1 off and on again gave the same
URL, so a URL pasted into Netlify before launch should stay valid. A lead sent while Zap 1 is off does not
become a task, so Zap 1 is switched on before the first real submission (section 10). Anyone who has the URL
can post leads, so it is not written in this repository, in a document or in a chat.

### Zap 1 "Leads v3: skjema til ClickUp og Slack"

| Step | |
|---|---|
| 1 | Catch Hook. The payload is read as it comes, as a JSON string, or inside a wrapper, and checked before anything is written. An unknown `campaign` or `route` fails the run on purpose, so it shows in the run history and in Zapier's error e-mail. |
| 2 | ClickUp: look for a task with this `lead_id` in the campaign's list. If there is one, stop (`deduped`): the same lead never makes two tasks, and a second delivery never reaches Slack. |
| 3 | ClickUp: create the task in `IT - UK - Commision` (list `901522580321`, ClickUp team `43257387`), tag `growth-2m`. Name `{company_name} · {first_name} {last_name}`. Description: the whole payload as readable blocks (Selskap, Svar i skjemaet, Kontakt, Ruting, Kilde) with the exact answers. If ClickUp refuses the custom fields, the task is made without them and the fields are set one at a time, with a comment on the task naming any that did not take. |
| 4 | Slack `#leads-uk` (channel id `C0CAA3726DS`), for `fit` and `review` only. A test lead posts only when the payload carries `slack_test: true`. |
| 5 | ClickUp: the phone number, best effort. |

Custom fields on the task:

- Always: `lead_id`; CRM Item Type `Lead`; Sales Stage `Lead Qualification`; Tier (`fit` is Tier 1, `review`
  Tier 2, `not_now` and `not_a_fit` Tier 3; **confirm this mapping**); Contact Name; Email (when it is a
  valid address); Job Title; Nettside (when it is a valid address); IT Specialism (the answer; "Other: text"
  becomes Other).
- **Team Size, Ad Spend Budget and Contract Value only when the form's band lies inside exactly one ClickUp
  option.** The ClickUp options are not the form's bands (Team Size runs Just me, 2-5, 6-10, 11-25, 26-50,
  50+; Contract Value runs Under £10k, £10k-£30k, £30k-£75k, £75k-£150k, £150k+), and a wrong bucket is worse
  than an empty one. The exact answers are always in the description.
- Phone: normalised to `+44...` and set once the task exists. ClickUp refuses numbers it does not accept, so
  this is best effort; the number is always in the description.

Status by route:

| route | Status on creation |
|---|---|
| `fit` | `ny lead`, priority high |
| `review` | `ny lead`, priority normal, tag `sjekk-størrelse` |
| `not_now` | `ukvalifisert - archive`, tag `ta-opp-om-3-mnd`, due in 90 days |
| `not_a_fit` | `ukvalifisert - archive` |

Slack message. It is built in Norwegian because the team reads it, and carries no phone, e-mail or free text:

```
FIT · UK IT · {company_name}
{turnover_band} · {employees_or_fee_earners} ansatte · Companies House: {ch_accounts_type}, stiftet {year}
Verdi første år: {first_year_value} · Salgssyklus: {sales_cycle}
Kapasitet: {capacity} · Beslutter: {decision_maker}
Kilde: {utm_source} / {utm_content}
ClickUp: åpne oppgaven (link)
```

For `review` the first word is `REVIEW`, and when `ch_check` is `mismatch`, `timeout` or `not_found` a last line
says `⚠ Størrelse ikke bekreftet, sjekk før møtet`. A test lead's message starts with `[TEST]`.

### Zap 2 "Leads v3: Calendly-booking"

Trigger: Calendly, Invitee Created, scope **whole organisation**. A collective event such as "Commission I IT"
can not be picked in the trigger's own dropdown, so every booking in the Calendly account starts a run. The
code looks at the event type first and skips what is not ours within a second (`other_event`). A
cancellation is skipped too (`not_active`). Which events count is the `eventTypes` list of each entry in
`CAMPAIGNS` in the workflow file; today that is the IT event `769980c2-23c5-4a60-8f1e-462e5e4ea12e`.

Finding the task, in this order:

1. **The lead id in `utm_content`**: `l_...` from the form, or `d_...` made by `/book` when the visitor came
   without the form. The task with that `lead_id` is the match. For an `l_...` id with no task yet, the run
   waits up to three times 40 seconds for Zap 1 (a visitor can book seconds after the form), then goes on.
2. **No lead id**, or a booking moved to a new time without one: the newest task in the list with the same
   e-mail address from the last 90 days. The comment says it was linked by e-mail, so a person checks it.
3. **Nothing found**: a new task with status `møte booket` and tag `booket-uten-skjema`, with a lead id of its
   own (the `d_...` id, otherwise `c_...` made from the Calendly invitee id). It never takes the form's `l_...`
   id, because Zap 1 would then treat the real form task as a duplicate and skip it.

On the task it found, the run sets the due date to the meeting's start (date and time), moves the status to
`møte booket` from `ny lead`, `kontaktet`, `møte booket - noshow` or `ukvalifisert - archive` (a later stage
is left alone and the booking is only noted), and adds one comment with the time in London and Oslo, the
event and a `Calendly-ref`; the same booking delivered twice adds no second comment. A task the form routed to
`ukvalifisert - archive` gets a warning in the comment: check before the meeting.

A booking that carries one of our lead ids on an event that is not in `CAMPAIGNS`, with no task to link to,
fails the run on purpose, so it shows. It never creates a task for it. Add the event type to `CAMPAIGNS`.

The output of a run carries no name or e-mail address. A booking with an e-mail ending `@example.invalid` is
a test and gets the tag `test`.

**Not built yet:** cancellations and no-shows (nothing happens in ClickUp), and a Slack message for a booking.

### How the two Zaps were tested

- On this machine, with fakes for ClickUp, Calendly and Slack: `g/_growth/zapier/` (Zap 1 120 checks, Zap 2
  164 checks).
- In Zapier, switched off: draft runs against the real ClickUp list with made-up data. Zap 1 for all four
  routes, a repeated lead, a test lead and a phone number ClickUp refuses. Zap 2 for the main cases: found
  by lead id, found by e-mail, no task (a new one is made), the wait for Zap 1's task, an event that is not
  ours, and an event missing from `CAMPAIGNS`. The edge cases (cancellation, unreadable booking, winter time)
  are covered by the local checks. The test tasks carry the tag `test` and are archived, never deleted.
- **Live, 19 Oct 2026, Zap 1 switched on for a few minutes.** One made-up lead (route `fit`, an address ending
  `@example.invalid`, `slack_test` true) was fired through Zapier's own trigger with the JSON the function
  sends. Result: one ClickUp task in "IT - UK - Commision" (status `ny lead`, priority high, tags `growth-2m`
  and `test`, twelve fields set including `lead_id`), one Slack post in `#leads-uk` marked `[TEST]` with no
  phone, e-mail or free text, and the trigger going `active`. The phone field refused the made-up number
  07700 900123 (HTTP 400; that range is reserved for drama and is not a valid mobile number), which the Zap
  tolerates because the number is also in the task description. ClickUp did accept +442079460123, a reserved
  London drama number, when it was set from outside the Zap, so a valid real number should pass; the first
  real phone test shows it.
- **Live, 19 Oct 2026, Zap 2 switched on for a short while.** One real booking on "Commission I IT", made from
  the booking link with `utm_content` set by hand to the made-up lead's id (so not through the embedded widget
  on `/book`), by an invented invitee. The run finished in about fourteen seconds without a retry. It found the
  task by lead id on the first lookup, moved it from `ny lead` to `møte booket`, set the due date to the
  meeting's start (11:30 UTC, 13:30 in Oslo) and added one comment with 12:30 in London, 13:30 in Oslo and the
  `Calendly-ref`. No second task was made. Calendly handed the invitee over as one flat object, with the lead id
  at `tracking.utm_content` and the times inside `scheduled_event`, so `parseBooking` needed no change. The
  event type reports `pooling_type` collective and the booking has two hosts, so every booking, test ones
  included, also lands in the second host's calendar until it is cancelled. A cancellation was not tested: the
  trigger fires for new bookings only, so a cancelled booking leaves its task where it is. Zap 2 was then
  switched off again and the test task archived.
- **Live, 19 Oct 2026, from a real phone on the deploy preview of pull request #74 (both Zaps switched on for
  about a quarter of an hour, then off again).** Two submissions of the real form with the register switched off
  (section 8): the first with the banner accepted, a real e-mail address and a Norwegian mobile number, followed
  by a booking from the page itself; the second with the banner declined, an address ending `@example.invalid`
  and no booking. Result:
  - The Netlify function delivered both leads to the Catch Hook URL, the first time that path ran. Both Zap 1
    runs finished without an error, and each lead made one task in "IT - UK - Commision" (route `fit`, status
    `ny lead`, priority high, reason `register_off`, "Sjekk mot registeret: off").
  - Slack: one post in `#leads-uk` for the first lead, with no phone, e-mail or free text, "Companies House: ikke
    sjekket" and "Kilde: ukjent" (the page was opened without UTM tags). None for the second, which is a test lead
    without `slack_test`. The second lead's task carries the tag `test`.
  - ClickUp accepted the real mobile number in the Phone field. It was a Norwegian +47 number; a British +44
    number has so far only been shown with the reserved drama number.
  - The embedded widget on `/book` filled in the visitor's name and e-mail address and handed the lead id on in
    `utm_content`. Zap 2 found the task by it on the first lookup, moved it from `ny lead` to `møte booket`, set
    the due date to the meeting's start and added one comment with the time in London and Oslo, about ten seconds
    after the booking. The booking ended on `/takk`.
  - Team Size, Ad Spend Budget and Contract Value stayed empty, as designed, because each of the form's bands
    spans two ClickUp options. The exact answers are in the description.
  - Both test tasks were archived. The booking has to be cancelled in Calendly by hand: it lands in both hosts'
    calendars.
- **Not shown yet:** live submissions of `review`, `not_now` and `not_a_fit` (the Zap's draft runs cover all four
  routes), a booking that arrives without a lead id (only the local and draft checks have run it), a booking
  moved to a new time, a cancelled booking (its task stays where it is), Zap 1 with a British mobile number,
  the Meta pixel and the Conversions API (no token or test event code yet), the banner's Decline path in the
  browser, the register with a real key, the alert e-mail, a failed delivery and a submission with JavaScript off.
  Section 10 covers them.

### Not changed

The old `/lp/` Typeform page (the control group, form `eswUMY4k`), `/g/uk-private-clinics/`, Zap
379289826 (duplicate and adapt it, never edit it), the campaign `LEADS / UK / IT_KOM` and the dormant
older IT funnel `/uk-it-firms` (`g/uk-it-larger-firms`).

---

## 5. Meta

Pixel `1466790598245604`, loaded by `/js/consent.js` only after Accept. Nothing from `connect.facebook.net`
is requested before a choice, and a visitor who declined is never asked again.

| Where | Event | When |
|---|---|---|
| Landing page | `ViewContent` | After Accept (queued until then). |
| `/book` and `/review` | `QualifiedForm`, custom, `eventID = lead_id` | After Accept, once per lead (`sessionStorage`), only if the visitor came from the form. |
| Server (Conversions API) | `QualifiedForm`, same `event_id` | For `fit` and `review` only, and only if the browser reported `consent = accepted`. Meta counts the pair once. |

Never the standard `Lead` event, never for `not_now` or `not_a_fit`. No GA4 on these pages. Name, e-mail
and phone are never sent in plain text: the server sends a SHA-256 hash of e-mail, first name and last
name, plus the IP address and user agent Meta asks for. An advertising click id (`fbclid`, `_fbp`, `_fbc`)
is dropped on the server unless the visitor accepted.

To test: set `META_TEST_EVENT_CODE` (Events Manager → Test events), submit a form on a phone after
Accept, and check that `QualifiedForm` appears once (browser and server merged), never `Lead`. Remove
the variable before launch.

---

## 6. Routing

First rule that applies wins. A firm that is too small and also at capacity is "not a fit": structural
beats temporary. Edit `route.mjs`; every rule has a test (`test/route.test.mjs`).

| Route | When |
|---|---|
| `not_a_fit` | turnover under £2m, trading under two years, a typical client worth under £10k, or (turnover not stated) accounts filed as micro-entity or dormant |
| `not_now` | "None, we are at capacity" for the next three months |
| `review` | turnover not stated, a client worth £10k to under £25k, the company not found in the register, the register unavailable, or an answer the register contradicts |
| `fit` | everything else. In production, not while there is no register key (below) |

Page for each: `fit` → `/book`, `review` → `/review`, `not_now` → `/not-now`, `not_a_fit` → `/not-a-fit`.

**One reading to confirm.** A firm that says £2m or more but files micro-entity or dormant accounts is
sent to `review`, not `not_a_fit` (reason `ch_accounts_too_small`). The accounts are evidence against
the claim, but a company can file late or sit in a group, and turning a real lead away on that alone
costs more than a person looking. It is one line in `assessProfile`.

The register is asked only when it can change the outcome. It is matched on the exact company name
(upper case, "limited" and "ltd" normalised), an active company is preferred, and a lookup that fails
or takes over four seconds gives `review`, never `fit`.

**No register key (the launch setting from 19 Oct 2026).** The lookup answers `no_key` without making a request,
the check is recorded as `timeout` with the error `no_key`, and a lead that would have been a `fit` is a `review`
(reason `ch_timeout`). So in production a lead is `review`, `not_now` or `not_a_fit`, never `fit`: nobody is sent to
`/book`, the page says "We will be in touch within one working day. We want to check a few details before we suggest
a time", and a person sends the calendar link. That promise is the running cost of this setting: every lead that
would have been a `fit` needs a reply the same or the next working day. `QualifiedForm` is still sent for `review`
(browser and server, after Accept), so the ads can still optimise on it, and Slack posts `review` leads as it posts
`fit` ones. A booking made from a link sent by hand carries no lead id; Zap 2 then finds the task by e-mail address.
What can no longer be measured is the share of leads that are `fit` and the bookings that came from a `fit`, so a
stop rule written in those terms has to count bookings by task status (`møte booket`) instead. The pages say
nothing about a register check while `legal.registerCheck` is `false`. With the key, set both (section 13).

**Register off (previews only).** With `COMPANIES_HOUSE_MODE=off` on a preview the register is not asked. The
check is recorded as `off`, never as `ok`. A lead that would have been a `fit` is still a `fit` and carries the
reason `register_off`; a `review` caused by something else carries it too. What the answers decide alone is
unchanged (not a fit, not now), and turnover not stated is still `review`. Meta is not told about such a lead
unless `META_TEST_EVENT_CODE` is set. The point is to test the page, the booking and the Zaps; it is not a way to
run real traffic, and the code refuses it on the live address.

---

## 7. What the endpoint does

`POST /api/lead`, in this order. Each step is tested (`test/handler.test.mjs`, 84 tests).

1. Only `POST` (405 otherwise), JSON or a plain form post, at most 64 KB, a known campaign.
2. Tracking: `utm_*` and `fbclid` from the post, or from the `Referer` of the page that posted (a
   browser without JavaScript can not fill them in). The lead id from the page (`l_…`), or a new one.
3. The hidden field `contact_by_fax` filled in: a bot. It gets the "not a fit" answer, and nothing is
   stored or sent.
4. `live` false or no `ZAPIER_LEAD_HOOK`: 503.
5. Rate limit: 12 posts an hour per hashed IP address (fails open).
6. Validation with the same code the page runs (`core.mjs`): 422 with the messages, or for a post
   without JavaScript the form again with the answers and the errors.
7. The same lead id seen before: the **first decision stays** (a visitor who goes back and changes an
   answer after an outcome gets the same page; the answer pages carry the contact address), and a
   delivery that failed is tried again.
8. Companies House lookup (not made when `legal.registerCheck` is `false`: the lead is marked `unchecked` and stays a `fit`; skipped on a preview with the register off; with the check on and no key it makes no request and gives
   `review`, section 6), then the decision (section 6).
9. **The lead is stored before anything is sent** (Netlify Blobs, store `leads`, kept 365 days).
10. Zapier (three attempts, 8 seconds in all; a redirect counts as a failure) and, in parallel, the
    Meta event. A failure in either never changes the answer the visitor gets.
11. The visitor is sent on (JSON `next`, or a 303 without JavaScript). If the lead could be neither
    stored nor delivered, the visitor gets an honest error and keeps their answers.

The log carries a lead id, a route and a reason code, never a name, an address or free text.

**Daily check, 07:00 UTC** (`netlify/functions/lead-reconcile`; 08:00 Norwegian winter time, 09:00 in
summer): deletes leads past retention, sends again any lead from yesterday or today that Zapier never
confirmed (it gives up after two failures in a row and says how many are left for tomorrow, because a
scheduled function is stopped after 30 seconds), compares delivered leads with ClickUp when
`CLICKUP_API_TOKEN` is set, and sends an alert only when something is wrong. A lead whose delivery fails
at 09:00 is therefore retried at 07:00 the next morning, not before. Zapier's own "send e-mail on error"
should be on for both Zaps.

---

## 8. Hosting facts

- **Rule order in `netlify.toml` matters.** The page rewrites for `/g/uk-it-growth/*` come before the
  `/g` and `/g/*` 404 rules, and the SPA catch-all `/* /index.html 200` is last. The `/api/lead`
  function sets its own path in code; Netlify matches functions with their own path before redirects,
  so the redirect rule is only a fallback. No `method` is set on that path on purpose: a `GET` has to
  reach the function and get a 405, not fall through to the home page.
- **`consent.js?v=4`.** The new pages load the consent script with `?v=4`. About 35 older pages keep
  `?v=3` deliberately: the change to the script is additive, the file revalidates on every visit, and
  those pages were not touched.
- Generated output is committed (`public/g/uk-it-growth/**`, `netlify/functions/lead/data.generated.mjs`).
  Editing it by hand is lost on the next build. Edit `copy.json`, `config.json`, `legal.json`, `core.mjs`,
  `render-form.mjs`, `route.mjs`, `g/_growth/` or the generator. The privacy and terms pages have entries in
  `netlify.toml` next to the other pages of the funnel, ahead of the `/g` 404 rules.
- **Previews (checked 19 Oct 2026).** Netlify builds a deploy preview for every pull request, at
  `deploy-preview-<number>--luxury-custard-0c4db9.netlify.app`, and it answers with `X-Robots-Tag: noindex`.
  There is no branch deploy for `feat/uk-it-growth`. A preview of a branch that still has `"live": false`
  shows the pages but the form answers 503, so a preview that takes real posts needs its own branch with
  `"live": true` that is never merged (section 10). Not checked: whether Netlify Blobs in a preview is a
  store of its own or the site's shared one, so assume a preview lead lands in the shared store.
  Used on 19 Oct 2026: pull request #74 (a draft, base `main`, head `preview/uk-it-growth`) had its preview
  about a minute after the push, and an empty commit rebuilt it in under twenty seconds. A function reads its
  environment variables as they were when the deploy was built, so a variable added in Netlify reaches the
  preview only after the next build. Until `ZAPIER_LEAD_HOOK` existed the preview answered 503 to a post; with it,
  an empty post answers 422, which is the check that costs nothing. The preview has no password, so while
  Zap 1 is on anyone who finds the address can post a lead.
- Text is the board's, word for word, in `copy.json`. The build refuses dashes, exclamation marks,
  American spellings, a commission rate and an unfilled `{TOKEN}`.

---

## 9. Testing

```
npm run test:g-growth                     # 219 tests, no network, a few seconds
npm run test:g-it                         # the older IT funnel, unchanged

npm install --no-save playwright-core axe-core        # once
npx playwright-core install chromium                   # once
node g/uk-it-growth/e2e/run.mjs                        # the real pages in Chromium, about four minutes
E2E_SHOTS=/tmp/shots node g/uk-it-growth/e2e/run.mjs landing form    # some groups, with screenshots
```

The two Zaps have their own checks in `g/_growth/zapier/` (section 4): Zap 1 120, Zap 2 164.

The unit tests drive the real handler with fakes for Zapier, Companies House, Meta and e-mail and a real
store over an in-memory stand-in for Blobs: validation, every route, replay, the race between two
posts with one id, the rate limit, the honeypot, every failure of Zapier, storage, the register and
Meta, consent gating, log privacy, the daily check and the generator's output.

The browser run builds a copy of the repository with `live: true` and a stand-in Calendly address, so it
tests the state the pages will be in on launch day, plus the committed state. It covers the landing
page, all thirteen questions with their messages, the four outcomes end to end, the cookie choice and
the pixel, the booking page and the forward to `/takk`, the privacy and terms pages and their cookie button, no JavaScript (including a failed post and the
Referer fallback), network failures, double presses, reduced motion, keyboard use and an automatic
accessibility check (axe-core, WCAG 2.2 AA).

**What no test here can show**, because it needs your accounts: the real Calendly widget and its
`calendly.event_scheduled` message, the real Meta pixel and Conversions API, Zapier, ClickUp, Slack,
Companies House, the alert e-mail, and Netlify's own routing. The acceptance run in section 10 covers them.

---

## 10. Before launch, in this order

**Where this stands (19 Oct 2026, evening).** Built and tested on `feat/uk-it-growth` (219 unit tests, every browser group
including accessibility), `"live"` is `false`, nothing is on production. The owner decided on 19 Oct: the solicitor has
approved the notice and terms; the three IT firms named on the page have given written permission to be named; the Companies
House key is dropped for now (section 6); the Calendly event gets new wording (section 3); and yes to the steps below. Still open:

| Open | Why the assistant has not done it | Who |
|---|---|---|
| Calendly event name and description | The browser's Calendly login had expired, and passwords are never typed by the assistant | A person signed in to Calendly |
| `ZAPIER_LEAD_HOOK` in the Production context | A secret URL, pasted by its owner. Today it is set for deploy previews only | Owner, in Netlify |
| An alert channel | Needs an account and a secret. Recommended: a Slack incoming webhook, `SLACK_ALERT_WEBHOOK_URL` | Owner, in Slack and Netlify |
| The phone test of every outcome (below) | Needs a real phone and the cookie banner | Owner, with the assistant reading Slack, ClickUp and Test events |
| The Meta campaign and its spend | Created paused. The spend is approved in chat, once, with the numbers in front of the owner | Owner says yes |

**Prepared (19 Oct 2026, evening).** The branch `go-live/uk-it-growth` is `feat/uk-it-growth` with one change, `"live": true` (and
`netlify/functions/lead/data.generated.mjs`, which follows from it; no page changes, because every page is `noindex` either way).
On it `npm run build` is green, `npm run test:g-growth` passes (219), `npm run test:g-it` passes (45), both Zap checks pass and the
browser run passes in full (383 checks, the group for the committed pre-launch state skipped on purpose). A pull request into `main`
carries it, with a deploy preview. What is left of the "Go live" step below is the merge, and the merge waits for the Production
variable and the alert channel.

Do not point ads at the page before every row is done. A merge before the hook exists loses no data (the endpoint answers 503 and
stores nothing) but shows a form that fails, so set the variable first.

- [ ] **Settings in Netlify, Production context** (section 2): `ZAPIER_LEAD_HOOK` (Functions scope, secret) and an alert channel
      (`SLACK_ALERT_WEBHOOK_URL`, or Resend). `COMPANIES_HOUSE_API_KEY` and `COMPANIES_HOUSE_MODE` stay unset; `META_CAPI_TOKEN` is
      optional. A function reads its variables as they were when the deploy was built, so every change needs a new deploy.
- [ ] Calendly: the new name and description are in (section 3) and the event link still ends `/elevate-marketing-commission-i-it`.
- [x] A deploy preview run with the real hook (19 Oct 2026: pull request #74, a draft from `preview/uk-it-growth`, never merged;
      sections 4 and 8). Repeat it only if the page or the function changes after this point.
- [ ] **Go live.** On a branch made from `feat/uk-it-growth`, never from `preview/uk-it-growth` and never pull request #74:
      `config.json` → `"live": true`; `npm run build`, `npm run test:g-growth` and `node g/uk-it-growth/e2e/run.mjs` pass and the build says
      nothing is outstanding; a pull request into `main` whose deploy preview has been looked at; merge. The owner gave the explicit
      yes to production on 19 Oct 2026; ask again if the plan has changed since. After the merge and the deploy, a POST to
      `https://getelevateleads.com/api/lead` with the header `Accept: application/json` and the body `{"campaign":"uk-it-growth"}`
      answers 422 with a list of missing answers when production has the hook, and 503 when it does not: the check that costs
      nothing and sends nothing. (Without the `campaign` key the answer is 400, and without the `Accept` header it is the form page.)
- [ ] **The register.** Decided 19 Oct 2026: no key at launch. Production has no `COMPANIES_HOUSE_API_KEY`, `legal.registerCheck` is
      `false`, and `COMPANIES_HOUSE_MODE` is not set in production (the code ignores it there anyway). Changed the same evening: a lead on the live address whose own answers qualify is a `fit` with
      check `unchecked` and reason `register_not_used`, and gets the calendar. To use the register: the key and `legal.registerCheck: true` together (section 13); a lead then
      shows `ok`, `mismatch` or `not_found`, never `off` or `unchecked`.
- [ ] **Switch Zap 1 and Zap 2 on** in the Zapier editor, after production has the hook. They are saved switched off, and a lead sent
      to a switched-off hook does not become a task. Both triggers should then show `active`. Zap 2 now runs for every
      booking in the Calendly account and skips what is not ours.
- [ ] One submission of each outcome from a **real phone**, with the banner accepted, then declined. With no register key a `fit`
      does not occur in production (a lead that would be one shows `/review`), so run the `fit` and Zap 2 lines on the deploy preview,
      where the register is off, and the rest on production:
  - `fit` → `/book`; the calendar shows, name and e-mail are filled in, a test booking lands on `/takk`.
  - ClickUp: one task per lead, in the right list and status, with `lead_id`; the same lead sent twice gives one task.
  - Slack: a message for `fit` and `review` only, with no phone, e-mail or free text. A real e-mail address
    posts for real; an address ending `@example.invalid` is a test and posts only with `slack_test`.
  - Zap 2, after a `fit`: book a time on "Commission I IT" from the page itself (a booking e-mails both hosts, so
    cancel it in Calendly afterwards). The form's task moves to `møte booket`, its due date is the meeting's
    start, and it has one comment with the time in London and Oslo. The same result was seen on 19 Oct 2026 from
    a hand-made link (section 4), so this run is what shows that the widget on `/book` hands the lead id on.
    Opening `/book` directly and booking gives a new task tagged `booket-uten-skjema`. If the Zap 2 run fails,
    its message lists the keys it saw, which is the shape of the Calendly data.
  - Meta Test events: `QualifiedForm` once per `fit` or `review`, never `Lead`, and nothing after Decline. The server's copy needs
    `META_CAPI_TOKEN`, and `META_TEST_EVENT_CODE` in Production for the test (a new deploy each way).
  - A deliberately wrong `ZAPIER_LEAD_HOOK`, on the deploy preview with its own variable so that production's hook is never touched:
    the lead is in storage and the alert arrives in the channel that was set up.
  - A submission with JavaScript off (or another browser with scripts blocked).
  - Afterwards archive the test tasks in ClickUp (status `ukvalifisert - archive`, archived), never delete.
- [ ] Remove `META_TEST_EVENT_CODE`. Only then point the ads at the page. The Zaps stay on.
- [ ] Ads and Meta campaign settings follow separately: the campaign is created paused, and it is switched on only after the owner has said
      yes in chat to its budget, audience and dates.

## 11. Limits and decisions to confirm

- **Replay returns the first decision.** Someone who corrects an answer after an outcome is not re-routed.
  They can write to the contact address on the answer page.
- **Failed deliveries are retried once a day** (07:00 UTC), and the retry stops after two failures in a row.
- **Register off is a test aid, not a mode for real traffic.** If it were used for real visitors, every firm that
  claims £2m or more would get a calendar slot unchecked, and a firm that is not what it says would cost a call.
  The code refuses it on the live address on purpose. Zap 1 shows such a lead as "ikke sjekket" and has no
  warning line for it, because it can only occur on a preview. Having the check switched off in `config.json` is a different thing and is the live setting for now: a qualifying lead is a
  `fit` with check `unchecked`, so a firm that is not what it says can book a call. The task shows it (`register_not_used`), look before the meeting.
- **The register check is an exact match on the company name.** A trading name that differs from the
  registered name gives `review`, by design: a person looks, nobody is turned away on it.
- **Free text is passed on as typed.** A value starting `=`, `+`, `-` or `@` is a formula to a
  spreadsheet; neutralise it where a spreadsheet is fed from ClickUp.
- **`lead_id` is chosen by the browser and is not a secret.** It matches a lead to a booking; it proves nothing.
- **There is no bot challenge** beyond the hidden field and the rate limit.
- **Tier follows the route** (`fit` Tier 1, `review` Tier 2, the rest Tier 3). It is a guess at what the field
  was meant for; confirm it, or change `option.tier` in Zap 1.
- **Zap 2 runs for every booking in the Calendly account** and skips what is not ours, so the run history shows
  skipped runs. They are harmless. A booking with one of our lead ids on an event that is not listed in
  `CAMPAIGNS` fails on purpose and shows.
- **A Zap 1 run that fails inside Zapier** (ClickUp down, say) is retried three times per step by Zapier and then
  shows as failed there. The function counts the lead as delivered once the hook answered, so the daily check
  (needs `CLICKUP_API_TOKEN`) is what notices a lead without a task. Switch on Zapier's error e-mail for both Zaps.
- **Privacy.** The notice and terms are built (section 13): the processors in this flow, the transfers and the retention
  (12 months after the last contact). Two things in them the system does not keep by itself. ClickUp tasks are not deleted by
  anything here (the store is, at 365 days), so applications that did not become customers have to be purged by hand from the
  list "IT - UK - Commision" once they are 12 months past the last contact; monthly is enough, until there is a Zap for it. And
  a service added later (an SMS provider, an alert e-mail service) has to be named in Part 4 of the notice before it
  receives a lead.

## 12. How it works

```
config.json  copy.json  core.mjs  route.mjs  render-form.mjs   one place each
        │         │         │         │            │
        └─────────┴─────────┴─────────┴────────────┴──▶ scripts/build-g-growth.mjs ──▶ public/g/uk-it-growth/**
                                                                                  └─▶ netlify/functions/lead/data.generated.mjs

browser ──▶ landing page (readable and submittable with no script)
              │  with JS: thirteen steps, the same form, the same checks
              ▼
        POST /api/lead   netlify/functions/lead/index.mjs
              │  validates with core.mjs   (the file the browser runs)
              │  decides with route.mjs    (+ Companies House)
              │  stores in Netlify Blobs, then Zapier and Meta in parallel
              ▼
        JSON next / 303 ──▶ /book  /review  /not-now  /not-a-fit      /book ──▶ Calendly ──▶ /takk

daily 07:00 UTC   netlify/functions/lead-reconcile   retention, redelivery, ClickUp comparison, alerts
```

- **One validation, two homes.** `core.mjs` is inlined into the page and imported by the function, so the
  browser and the server can not disagree about what is valid. `render-form.mjs` writes the form once for the
  page and once for the no-script error answer.
- **Shared with the next funnels.** `g/_growth/` (style, scripts), `netlify/functions/lead/` and the tests take
  the campaign from `campaigns.mjs`. A new campaign is a folder under `g/`, an entry there and a new Zap path.
- **The legal pages** are written in `legal.json` and rendered by `g/_growth/legal.mjs` (section 13).

## 13. Privacy notice and website terms

`/g/uk-it-growth/privacy/` and `/g/uk-it-growth/terms/`, linked from the footer and the cookie bar of every page. The words are in
`legal.json` (headings, paragraphs, lists, tables and one button). `g/_growth/legal.mjs` renders them and
`scripts/build-g-growth.mjs` puts them in the funnel's shell, so they are built, linted (no dashes, no exclamation marks, no
rate near the word commission) and tested like the other pages: `test/legal.test.mjs`, and the `legal` and `a11y` groups of the
browser run. The health and law funnels reuse the renderer and bring their own `legal.json`, or the same file.

**Where the text comes from.** The pages are the drafts in the solicitor pack (Claude Doc "Solicitor pack (UK): commission, consent and
three drafts", tabs Privacy and Terms), with each open bracket closed and nothing else added. The owner reports that the solicitor
approved on 19 Oct 2026. No written answer is in the repository or in the pack, so if the final wording differs from the draft, it is
copied into `legal.json`, the date at the top (`updated`) is changed and the pages are built again. No code changes.

**What the closing rested on.** Rows 1 to 5 follow the code and the Zaps as documented in this file. The rest only the owner can confirm.

| Statement | Where | Basis |
|---|---|---|
| Applications are deleted 12 months after the last contact, from the store and from ClickUp | Notice 6 | The store deletes at 365 days (`RETENTION_DAYS`, tested). **Nothing here deletes ClickUp tasks** (section 11). |
| Meta gets a hashed e-mail, first and last name, the IP address and browser details, never a phone number, and only after Accept | Notice 3, 4, 9 | `capi.mjs` and its consent tests. |
| Slack gets the company name and the decision, no e-mail, phone number or free text | Notice 4 | The Zap 1 Slack step (section 4). |
| No analytics; our code writes no cookie; the cookie choice sits in `localStorage` and two items in the tab's `sessionStorage` | Notice 8 | `test/legal.test.mjs` fails if a page script writes a cookie or to `localStorage`. |
| The scrambled IP address is kept up to a day | Notice 3, 6 | Hourly counters, swept by the daily check. |
| Governing law is England and Wales | Terms 10 | The draft's choice. Owner: confirm that the solicitor kept it. |
| No UK representative and no ICO fee are mentioned | Notice 1, 5 | None is appointed or paid (the pack's own fact, marked "Elevate to confirm"). Owner: confirm what the solicitor decided in question B3. |
| Transfers rest on the UK to US data bridge, the EU to US framework, or standard clauses with the UK addendum | Notice 5 | The draft's wording. Owner: confirm that each provider's data processing terms are accepted in the account (Netlify, Zapier, ClickUp, Slack, Calendly). |
| No VAT number | Terms 1 | Not given. Owner: if EngeCo AS is registered for MVA, add `NO 924 490 926 MVA` after the organisation number in the notice, the terms and the footer. |
| E-mail and text providers are named by kind, not by name | Notice 4 | None was chosen when the draft was written. Name them when chosen. |
| Meta measurement is described without saying how audiences are built | Notice 3, 9 | Owner: say whether audiences are built from pixel visitors or from form submitters. If they are, the notice has to say so. |

Not in the pages, and still the owner's to fill in the customer agreement before the first signature: the period in which
commission still applies after termination (12 months, in square brackets in the draft) and whether professional indemnity
insurance is held.

**The Companies House rows.** Rows and sentences about the register carry `"when": "register"` or `"unless": "register"` in `legal.json`
and are shown or left out by `config.json` → `legal.registerCheck`. It is `false` while there is no key in production, and no page then
mentions a check. With the key, **both are changed in one go**: `COMPANIES_HOUSE_API_KEY` in Netlify and `legal.registerCheck: true`
in the config, then build and deploy. If only one is done, the notice is wrong in one direction or the other, so the daily check
(`lead-reconcile`) reports a live funnel where the key and the flag disagree, once a day, until they agree.

---

## 14. Running it

**What arrives, and where.** Every post is stored first (365 days), then sent to Zap 1, which makes one ClickUp task in
"IT - UK - Commision" and, for `fit` and `review`, one post in `#leads-uk`. Alerts (a delivery that failed, a lead with no task, the hook
missing, the register key and the notice disagreeing) go to the alert channel, never through Zapier.

**With no register check (`legal.registerCheck: false`) a qualifying lead is a `FIT` marked `unchecked` and books by itself; the steps below apply to `REVIEW` leads (a client worth £10k to under £25k, turnover not stated).** Before each booked meeting, look the company up by hand as in step 2 (it takes two minutes). The text that follows is the older description for the case where the check is on and the key is missing, when every would-be `fit` arrives as `REVIEW`. The Slack post carries the line
`⚠ Størrelse ikke bekreftet, sjekk før møtet`, the task has the tag `sjekk-størrelse` and the reason `ch_timeout` (section 6), and the visitor has
been told that we will be in touch within one working day. A person keeps that promise, the same working day or the next:

1. Open the task from the Slack post. The exact answers are in its description.
2. Look the company up at Companies House by hand. The rules are those of `route.mjs`: the name matches, the company is active and at least
   two years old, and the accounts are not micro-entity or dormant (a firm in a group can file small accounts; if in doubt, ask on the call).
3. Write to the visitor from post@elevatemarketing.no with the booking link (the text is in the project document "Driftsrutine for IKT-leads").
   Adding `?utm_content=<the task's lead_id>` to the link makes the booking find this very task, even if the visitor books with another
   address. Set the status to `kontaktet`.
4. If the lookup shows that the firm is not what it said, send the decline text from the same document and set `ukvalifisert - archive`.
5. When the booking is made, Zap 2 moves the task to `møte booket`. Without a lead id in the link it matches on the e-mail address; a booking it
   cannot match makes a new task tagged `booket-uten-skjema`, which a person merges by hand.

**Counting.** While there is no register check, `fit` means only that the visitor's own answers qualified, so the share of `fit` says nothing about real size. Count
bookings as tasks that reached `møte booket`, and read the cost per booking from that. `QualifiedForm` in Meta counts `fit` and `review`
together.

**Once a month.** In the list "IT - UK - Commision", delete by hand the applications that are more than 12 months past the last contact and did
not become customers (section 11). Test tasks are archived when the test is done and are purged the same way.

**When an alert arrives.** It names what failed and carries a lead id and a company name, never an address, a number or free text.
`Still not delivered` and `not tried this run`: nothing is lost, the lead is in storage and the daily check sends it again at 07:00 UTC; open
the Zap's run history and the hook first. `no ClickUp task`: the hook answered and Zap 1 did not finish; find the run in Zapier and run it
again, or make the task by hand. `ZAPIER_LEAD_HOOK is not set`: the endpoint refuses every post until it is. The two messages about the register
mean that the key and `legal.registerCheck` disagree (section 13).
