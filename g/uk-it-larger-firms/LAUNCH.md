# Launch notes · /uk-it-firms

UK IT services firms with £4m+ turnover. Landing page, a twelve step application
form, and five outcome pages. Built from the work order "Arbeidsordre: UK IT,
større selskaper" (handoff `Elevate_-_Landingsside_1.zip`, 8 October 2026).

**Status: built, ready to go live, not live.** `config.json` has `"live": false`. Every
page carries `noindex`, and the apply endpoint answers every submission with a 503 and
records nothing. The build says what is outstanding (today: nothing; with `live: true`
it builds clean):

```
npm run build        # or: node scripts/build-g-it.mjs
```

Going live is two steps, in this order: (1) the webhook below is set in Netlify (item 4:
`docs/WORKORDER-UK-IT-LEAD-WEBHOOK.md` is the work order for it), then (2) `config.json`
→ `"live": true`. Setting `live` first changes nothing a visitor sees except that the
endpoint answers "no destination" instead of "not live": both are a 503.

---

## 1. What was not supplied, and where it stands

| # | Missing | Where it goes | Status |
|---|---|---|---|
| 1 | **Routing rules**: which answers send a lead to which outcome page | `routing.json` | **Done**, a proposal derived from the page's own criteria (below). Change a row, nothing else. |
| 2 | **Error text for an empty text field** | `copy.json` → `form.errors.required` | **Done**: "Please fill in this field". |
| 3 | **Calendly event** for `/book` | `config.json` → `funnel.calendlyUrl` | **Done**: the commission IT event the `/lp` funnel already books on (`/takk.html`). |
| 4 | **Where leads go** | Netlify environment variables (below) | **Open.** Endpoint answers 503. Not checkable at build time. |

### 1. Routing rules

These were not in the work order. They come from what the landing page itself tells a
visitor ("This works if / does not work if", the footnote that turnover is checked
against public records, and each outcome page's own wording). They are a proposal and
belong to the business: change `routing.json` and run `npm run test:g-it` (a test pins
the option indexes to their labels, so a reordered option fails loudly).

| Rule (in order) | When | Page | Why |
|---|---|---|---|
| `turnover-below-threshold` | turnover under £1m, or £1m to £4m | `not-a-fit` | The page: "You are below £4m turnover". `/not-a-fit` says "above a certain size". |
| `client-value-too-low` | a new client is worth under £10k in year one | `not-a-fit` | The page: "one new client is worth £25,000 or more in the first year". Under £10k is clearly outside. |
| `at-capacity` | "None, we are at capacity" | `not-now` | The page: "You are at capacity, come back when you are not". `/not-now` says it will ask again in three months. |
| `turnover-not-stated` | "I would rather not say" | `review` | The page: "Turnover is checked against public records after you apply." `/review` says "We want to check a few things before we suggest a time." |
| `client-value-borderline` | £10k to £25k | `review` | Straddles the £25k line, so a person looks before a slot is offered. |
| `procurement-decides` | decision is "a procurement process" | `review` | A long path, not a no. A person decides whether a 30 minute slot is useful. |
| fallback | everything else | `book` | Includes exactly £4m to £10m: the threshold is a minimum. |

Precedence: not a fit, then not now, then review, then book. Structural beats temporary
(a firm that is too small and at capacity is "not a fit"), and a lead that needs a person
to look comes after both. `area`, `people`, `marketing`, `cycle` and the optional `target`
are captured and sent with the lead but never change the outcome. `people` is the one worth
a second look: nothing stops "Under 10 people" with £4m+ turnover from booking.

**`review` has no process behind it.** It promises "in touch within one working day" (see
"Promises" in section 2). A lead routed there is delivered to the webhook like any other,
with `route.page: "review"` and the rule id, so the receiving side can make it a task.

How the matching works, for reference. Evaluated top to bottom, first match wins. A rule
matches when **every** question in `when` holds one of the listed options. Options are
counted from 0 in the order they appear on the form. Only choice questions can be tested.
`fallback` is required, so no lead lands nowhere by omission. The build validates the table
(`checkRouting`) and names what is wrong.

```json
{
  "status": "configured",
  "rules": [
    { "id": "short-name", "when": { "turnover": [0, 1], "people": [0] }, "then": "not-a-fit" }
  ],
  "fallback": "review"
}
```

Questions and their options, for reference:

| id | options (index: label) |
|---|---|
| `area` | 0 IT strategy and digital transformation · 1 Managed IT services · 2 Software development · 3 Data and AI · 4 Cybersecurity · 5 Other |
| `turnover` | 0 Under £1m · 1 £1m to £4m · 2 £4m to £10m · 3 £10m to £25m · 4 £25m or more · 5 I would rather not say |
| `people` | 0 Under 10 · 1 10 to 24 · 2 25 to 49 · 3 50 to 99 · 4 100 or more |
| `marketing` | 0 Under £1,000 · 1 £1,000 to £5,000 · 2 £5,000 to £15,000 · 3 £15,000 or more · 4 I do not know |
| `value` | 0 Under £10k · 1 £10k to £25k · 2 £25k to £50k · 3 £50k to £150k · 4 £150k or more |
| `cycle` | 0 Under four weeks · 1 One to three months · 2 Three to six months · 3 Over six months |
| `decider` | 0 Me · 1 Me, with a co-founder or board · 2 Someone else, I would bring them in · 3 A procurement process |
| `capacity` | 0 None, we are at capacity · 1 One to three · 2 Four to ten · 3 More than ten |

Pages: `book`, `takk`, `review`, `not-now`, `not-a-fit`. `takk` is also where `/book`
sends someone once Calendly confirms a booking.

To replace the matching logic itself, `route.cjs` is the one function: answers in, page
out.

### 4. Where leads go

The endpoint posts each lead as JSON to a webhook. Set in Netlify, **scope: Functions**:

| Variable | |
|---|---|
| `UK_IT_LEAD_WEBHOOK_URL` | Required. An `https://` URL. A Zapier "Catch Hook" works as is. |
| `UK_IT_LEAD_WEBHOOK_TOKEN` | Optional. Sent as `Authorization: Bearer <token>`. |

The payload, so the receiving side can be set up before launch:

```json
{
  "event": "uk_it_larger_firms.lead",
  "lead_id": "l_9f3c…",
  "received_at": "2026-10-08T12:00:00.000Z",
  "page_slug": "uk-it-larger-firms",
  "route": { "page": "book", "rule": "short-name" },
  "answers": {
    "website": "northbridge-it.co.uk",
    "company": "Northbridge IT",
    "area": { "index": 1, "label": "Managed IT services", "other": "" },
    "turnover": { "index": 2, "label": "£4m to £10m", "other": "" },
    "target": "",
    "details": { "first": "…", "last": "…", "title": "…", "email": "…", "mobile": "…" }
  },
  "tracking": { "lead_id": "…", "utm_source": "…", "utm_medium": "…", "utm_campaign": "…",
                "utm_content": "…", "utm_term": "…", "fbclid": "…", "referrer": "…" }
}
```

`lead_id` is the idempotency key: a visitor who retries after a failure sends the same
one. The function stores nothing itself and logs no personal data, only a lead id and the
reason for a refusal.

**It fails closed.** If the webhook is missing, rejects the lead, or times out (8 s),
the visitor gets the form's general error with their answers kept, and is not sent on.
A lead that is accepted and goes nowhere is the worst outcome on a paid funnel.

---

## 2. Before going live

- [x] 1 to 3 above (routing, error text, Calendly)
- [ ] 4 above: the webhook is set in Netlify (`docs/WORKORDER-UK-IT-LEAD-WEBHOOK.md`)
- [ ] `config.json` → `"live": true`, and `npm run build` says nothing is outstanding
- [x] `npm run test:g-it` passes (54)
- [ ] One real submission end to end, with the banner accepted: lead arrives at the
      webhook, visitor lands on the routed page, UTMs and `lead_id` present
- [ ] **Privacy and Terms.** The links point at `/lp/privacy/` and `/lp/terms/`, the
      existing Elevate pages (the same ones `/g/uk-private-clinics` uses). The work order
      says new ones are delivered separately. Check the existing policy covers what this
      form collects (turnover, contact details) and the Meta cookie; swap the paths in
      `config.json` → `links` when the new pages exist.
- [ ] **"Turnover is checked against public records after you apply."** The page promises
      this. Nothing here does it. Someone has to, or the footnote should change.
- [ ] **"Named with each client's written permission."** Ignite Consulting,
      Be | Shaping the Future and Crux IT Consulting. Confirm the permission exists.
- [ ] **Promises the outcome pages make, which only a person can keep.** `/review`: "We
      will be in touch within one working day." `/not-now`: "we will ask again in three
      months." `/takk`: "We will send a confirmation and a short note." The meeting
      section: "You receive a one page sheet … Within 24 hours". Nothing in this build
      sends, schedules or reminds anyone of any of them. Decide who does, and what
      happens to a lead routed to `/review` when nobody does.
- [ ] **Calendly colours.** `/book` passes white, ink and an ink button. Calendly ignores
      colour parameters on its free plan (same note as `docs/GREEN-FUNNEL-COLOURS.md`).
      Calendly's own redirect-after-booking must stay **off**: the page forwards to
      `/takk` itself, and with both on the visitor is sent twice.
- [ ] **The Calendly event is shared with the `/lp` funnel.** `/book` embeds
      `calendly.com/d/dv8z-vdp-5xt/elevate-marketing-commission-i-it`, the event
      `/takk.html` already uses. Bookings from both funnels land in the same event, told
      apart by the UTMs and `lead_id` (in `utm_term`). The page and `/book` copy say "30 minute
      pipeline review": check the event's duration in Calendly really is 30 minutes (not
      verifiable from here), and that its confirmation e-mail does not tell a UK IT firm
      something written for the other funnel.
- [ ] **Indexing.** `config.json` → `indexable` is `false`. The work order does not say
      whether the landing page should be findable. Only takes effect when `live` is true.

### Meta

Pixel `1466790598245604`, loaded by `/js/consent.js` only after Accept. **No conversion
event is fired.** The work order defines none, so only `PageView` is sent. Say which
event on which page and it is one line; the clinics funnel fires a custom event on its
"booked" page for a reason worth reading in `g/LAUNCH.md` before choosing.

The consent choice is stored under the key the rest of the site uses
(`elevate-cookie-consent`, in `localStorage`), so nobody is asked twice.

One honest limit: `/book` embeds Calendly as soon as the page loads, because the work
order asks for an inline embed. Calendly's frame can set its own cookies before the
visitor has chosen. The page's promise ("Nothing is loaded until you choose") is about
Meta. If that matters for compliance, the calendar has to wait for a click, which is a
design change and not made here.

---

### What the endpoint does not do

- **No rate limit, bot check or origin check.** It has a hidden field that catches the
  crudest scripts and nothing else. Every valid post becomes a call to the webhook, so a
  determined script could fill the receiving system. Put a limit on the webhook side, or
  add a challenge, before spending heavily.
- **Free text is passed on as typed.** A value starting `=`, `+`, `-` or `@` is a formula
  to a spreadsheet. If the receiving system writes leads into one, neutralise those there.
- **`lead_id` is chosen by the browser and is not a secret.** Use it to match a lead to a
  Calendly booking, never as proof of anything.
- **Public error answers say only "unavailable".** The reason (not live, routing missing,
  no webhook, webhook refused or timed out) is in the function log, with the lead id and
  no personal data.

## 3. How it works

```
config.json  copy.json  routing.json          one place each
      │          │           │
      └──────────┴───────────┴──▶ scripts/build-g-it.mjs ──▶ public/uk-it-firms/**   static pages
                                                          └─▶ netlify/functions/uk-it-apply/data.generated.mjs

browser ──▶ landing page (works with no script)
              │  with JS: twelve steps, same form, same server
              ▼
        POST /uk-it-firms/apply   netlify/functions/uk-it-apply/index.mjs
              │  validates with g/…/core.cjs   (the same file the browser runs)
              │  routes with     g/…/route.cjs
              │  delivers to     UK_IT_LEAD_WEBHOOK_URL
              ▼
        303 / JSON ──▶ /book  /takk  /review  /not-now  /not-a-fit
```

- **One validation, two homes.** `core.cjs` is inlined into the page and required by the
  function. The browser and the server cannot disagree about what is valid.
- **No script.** All twelve questions are on the page, divided by thin rules, with one
  submit button. A failed submission comes back as the same form with the visitor's
  answers put back and the errors shown (`form.cjs`, escaped), as a page with no script.
  UTMs a script-less browser could not fill in are recovered from the `Referer` of the
  page that posted.
- **Variables.** `THRESHOLD` and `OFFER` are in `config.json`. Change them there and the
  top line, both lists, the meeting heading and the `/book` text all follow.
- **Colours.** Only the work order's tokens. The build fails on any other colour literal,
  and on any named colour in the stylesheet.

### Decisions the work order did not make

| | Chosen | Why |
|---|---|---|
| Units | `vw`, not `cqw` | Allowed by the work order. `cqw` needs container queries, absent from older WebViews, and an unsupported unit invalidates the whole `clamp()`. |
| Logos | the shared `/g/_assets` logos | Same artwork as the handoff's (verified), at 3× display size: 17 KB against 51 and 108 KB. |
| Page title, description | taken word for word from the hero | The work order gives none. Nothing new is claimed. |
| Calendly → `/takk` | forwarded on Calendly's booking event | `/takk` says "You are booked in", so only a booking should reach it. The mechanism and its reasons are the clinics funnel's. |
| Calendly tracking | `lead_id` in `utm_term`, creative in `utm_content` | Calendly accepts five tracking parameters. Same as the clinics funnel. |
| Spam | a hidden field; anything in it is dropped silently | Not in the work order. A public form with no check fills with junk. |
| Autocomplete | real tokens (`given-name`, `email`, `tel`…) | The reference has `off`. Invisible, and lets a phone fill the form. |
| Reduced motion | the progress bar stops animating | The reference slows the spinner to 2.4 s. Less movement is the intent. |

## 4. Working on it

```
npm run build          # generate + build the whole site
npm run test:g-it      # validation, routing, the apply function
node scripts/build-g-it.mjs   # just this funnel
```

Do not edit `public/uk-it-firms/**` or
`netlify/functions/uk-it-apply/data.generated.mjs`: both are rewritten on every build.
`public/g/_assets` (fonts, logos) is shared with every `/g` campaign and is never touched.

Unlike `/css` and `/js`, nothing here needs a `?v=` token: the scripts are inlined in
each page.
