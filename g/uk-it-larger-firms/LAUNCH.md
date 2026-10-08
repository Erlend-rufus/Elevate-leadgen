# Launch notes · /g/uk-it-larger-firms

UK IT services firms with £4m+ turnover. Landing page, a twelve step application
form, and five outcome pages. Built from the work order "Arbeidsordre: UK IT,
større selskaper" (handoff `Elevate_-_Landingsside_1.zip`, 8 October 2026).

**Status: built, not live.** `config.json` has `"live": false`. Every page carries
`noindex`, and the apply endpoint answers every submission with a 503 and records
nothing. The build says exactly what is outstanding:

```
npm run build        # or: node scripts/build-g-it.mjs
```

Nothing below is guessed. Four things the work order says it does not contain are
left as one clearly marked place each. Fill them, set `"live": true`, and the build
then refuses to finish while any is still missing.

---

## 1. What is not supplied, and where it goes

| # | Missing | Where it goes | What the build does until then |
|---|---|---|---|
| 1 | **Routing rules**: which answers send a lead to which outcome page | `routing.json` | Endpoint answers 503. `live: true` fails the build. |
| 2 | **Error text for an empty text field** | `copy.json` → `form.errors.required` (and delete `_pending`) | Shows `[TEKST MANGLER]`. `live: true` fails the build. |
| 3 | **Calendly event** for `/book` | `config.json` → `funnel.calendlyUrl` | `/book` shows `CALENDLY_EMBED`. `live: true` fails the build. |
| 4 | **Where leads go** | Netlify environment variables (below) | Endpoint answers 503. Not checkable at build time. |

### 1. Routing rules

Evaluated top to bottom, first match wins. A rule matches when **every** question in
`when` holds one of the listed options. Options are counted from 0 in the order they
appear on the form. Only choice questions can be tested. `fallback` is required, so
no lead lands nowhere by omission. The build validates the table (`checkRouting`) and
names what is wrong.

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

Two things to decide while writing the table, because the work order leaves them open:
a firm that answers *I would rather not say* to turnover, and what wins when a firm is
both too small and at capacity (the clinics funnel decided "not a fit wins over not
now": structural beats temporary).

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

- [ ] 1 to 4 above
- [ ] `config.json` → `"live": true`, and `npm run build` says nothing is outstanding
- [ ] `npm run test:g-it` passes
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
      └──────────┴───────────┴──▶ scripts/build-g-it.mjs ──▶ public/g/uk-it-larger-firms/**   static pages
                                                          └─▶ netlify/functions/uk-it-apply/data.generated.mjs

browser ──▶ landing page (works with no script)
              │  with JS: twelve steps, same form, same server
              ▼
        POST /g/uk-it-larger-firms/apply   netlify/functions/uk-it-apply/index.mjs
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

Do not edit `public/g/uk-it-larger-firms/**` or
`netlify/functions/uk-it-apply/data.generated.mjs`: both are rewritten on every build.
`public/g/_assets` (fonts, logos) is shared with every `/g` campaign and is never touched.

Unlike `/css` and `/js`, nothing here needs a `?v=` token: the scripts are inlined in
each page.
