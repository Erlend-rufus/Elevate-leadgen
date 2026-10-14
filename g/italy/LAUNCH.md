# Launch notes · /italy

Elevate Marketing Italia: cybersecurity firms and MSSPs in Italy. Landing page
(variant A1, "canoni"), a six step application form, and five outcome pages. Built
from "Claude Design brief: landing pages for Elevate Marketing, Italy" (the updated
version, 14 October 2026). Italian copy is word for word from the brief and has **not**
been proofread.

**Status: built, dark.** `config.json` has `"live": false`. Every page carries
`noindex`, and the lead endpoint answers every submission with a 503 and records
nothing. The build lists what is outstanding:

```
npm run build        # or: node scripts/build-italy.mjs
npm run test:italy
```

Set `"live": true` and the build refuses to finish while any item below is open.

This funnel is a deliberate **copy** of `/uk-it-firms`, not an extension of it: its own
copy, form, consent key, pixel loader, function and environment variables, so a change
to one cannot break the other. Nothing in `g/uk-it-larger-firms` or `public/uk-it-firms`
was touched.

---

## 1. What is open, and where it goes

| # | Open | Where it goes | Until then |
|---|---|---|---|
| 1 | **{OFFER}**: the wording about Elevate's fee (shown in the "paid" section and the FAQ) | `config.json` → `variables.OFFER` | The page shows `{OFFER}` literally, as the brief says. Live is refused. |
| 2 | **{THRESHOLD}**: the size band, e.g. "da 10 a 150 dipendenti" | `config.json` → `variables.THRESHOLD` | Shows `{THRESHOLD}`. Live is refused. If the band is not 10 to 150, the options of question 2 and `routing.json` must change with it. |
| 3 | **Proofreading** of every Italian string (Aurora) | `config.json` → `proofread: true` | Live is refused. |
| 4 | **Legal approval** of every line the brief marks ADVISOR: consent text, banner, footer, compensation wording, who owns data and ideas | `config.json` → `legalApproved: true` | Live is refused. |
| 5 | **Privacy notice** and **cookie notice** (legal text, delivered separately) | `public/italy/privacy/index.html`, `public/italy/cookie/index.html` | The links exist and answer 404. Live is refused until both files exist. The generator never deletes them. |
| 6 | **Terms page** | the page in `public/italy/terms/index.html`, then `config.json` → `links.terms` set to `/italy/terms/` (`copy.json` → `footer.terms` is the link text) | The brief says to omit the link if there is none at launch, so there is no link. Once the key is set, live is refused until the page exists. |
| 7 | **Calendly event** (a separate Italian event type, not the UK link) | `config.json` → `funnel.calendlyUrl`, no query string | `/book` shows `CALENDLY_EMBED`. Live is refused. |
| 8 | **Meta pixel id** (own, or shared with the UK; sharing means sharing optimisation data) | `config.json` → `funnel.pixelId` | No pixel ever loads, so no Lead event. Live is refused. |
| 9 | **Where leads go** | Netlify environment variables, scope Functions (below) | The endpoint answers 503. Not checkable at build time. |
| 10 | **Whether the landing page may be indexed** (outcome pages never are) | `config.json` → `indexable` | `false`: the landing page is `noindex` even when live. `true` while not live fails the build. |
| 11 | **Consent version**: a real label for the approved consent wording, replacing `v1-draft` | `config.json` → `consent.version` | Live is refused while it still says "draft". |

Two guards on the consent wording: `config.json` → `consent.textSha256` pins the checkbox text, and the
build fails if the text changes without it. New wording is a new consent: bump `consent.version`, then
set the hash to the value the build prints. `page_slug` in the payload is `config.json` → `pageSlug`
(`canoni` for this variant, as the brief defines the hidden field), not the folder name.

The calendar must be Italy's own: the live gate also refuses a `calendlyUrl` equal to the UK funnel's.

Routing is **configured** (section 6 of the brief), see `routing.json`.

### Where leads go

Set in Netlify, **scope: Functions**:

| Variable | |
|---|---|
| `ITALY_LEAD_WEBHOOK_URL` | Required. An `https://` URL. A Zapier "Catch Hook" works as is. |
| `ITALY_LEAD_WEBHOOK_TOKEN` | Optional. Sent as `Authorization: Bearer <token>`. |

The UK variables are not read here: setting `UK_IT_LEAD_WEBHOOK_URL` gives Italy no destination (there is a test for it).

Payload:

```json
{
  "event": "italy.lead",
  "lead_id": "l_9f3c…",
  "received_at": "2026-10-14T12:00:00.000Z",
  "page_slug": "canoni",
  "route": { "page": "book", "rule": null },
  "answers": {
    "offers":    { "index": 0, "label": "Sì", "other": "" },
    "employees": { "index": 1, "label": "Da 10 a 49", "other": "" },
    "source":    { "index": 0, "label": "Passaparola", "other": "" },
    "priority":  { "index": 0, "label": "Più clienti a canone ricorrente", "other": "" },
    "budget":    { "index": 1, "label": "Da valutare", "other": "" },
    "details":   { "name": "…", "company": "…", "email": "…", "consent": true }
  },
  "consent": { "given": true, "version": "v1-draft", "text": "Acconsento al trattamento…",
               "version_shown": "v1-draft:c6d1e6a38bf96bd9", "matches_shown": true },
  "tracking": { "lead_id": "…", "utm_source": "…", "utm_medium": "…", "utm_campaign": "…",
                "utm_content": "…", "utm_term": "…", "fbclid": "…", "referrer": "…" }
}
```

`consent.text` is the wording the visitor ticked, with the privacy link turned into its address,
kept with the lead. `consent.version` and the text are the server's current ones. The visitor's own
page also posts back a tag of what it showed (`version_shown`: the version and a hash of the wording);
`matches_shown` is false if the wording changed while the page was open (the lead is still delivered,
flagged), and `version_shown` is empty if nothing valid came back. `consent.version` must be bumped
whenever the wording changes.
Leads routed to `not-a-fit`, `not-a-fit-b` or `not-now` are delivered too, with
`route.page` saying where they were sent.

**`lead_id` is the idempotency key.** A visitor whose delivery succeeded but whose answer was lost
(a slow 2xx, a dropped connection) sees the error and retries with the same `lead_id`: the receiver
must find-or-update on it, not create. The function cannot know a delivery it could not see.

**It fails closed**, as the UK endpoint does: no webhook, a rejected lead, or an 8 s
timeout gives the visitor the form's general error with their answers kept, and they are
not sent on. The function stores nothing and logs no personal data: a lead id, a reason, and
for a refused delivery the HTTP status or the error class (so a wrong token, 401, a stale
URL, 404, and an outage, 5xx, can be told apart in the function log).

**What the endpoint does not do**, as with the UK one: no rate limit, no origin check, no CSRF token,
no captcha and no double opt-in, only the hidden honeypot. Any script can post well-formed answers
with the box "ticked" and each becomes a webhook call and a record with `consent.given: true`. The
owner of the e-mail address is never verified. Put a limit and a duplicate filter on the receiving
side before ads run, and neutralise values starting `=`, `+`, `-` or `@` if the receiver writes to a
spreadsheet.

#### Deviation from the brief

The brief names ClickUp (and Netlify Forms) as the destination. **Not built.** The
endpoint posts to a webhook, which lets any receiver (ClickUp via Zapier, a CRM) be
plugged in without code. Netlify Forms is not enabled on this site. Say if ClickUp must
be written to directly.

---

## 2. Routing

From section 6 of the brief. Answers are captured completely, then routed. Precedence:
not-a-fit (reason A, then B), then not-now.

| Rule | When | Page |
|---|---|---|
| `not-a-fit-a` | offers = No | `/italy/not-a-fit/` |
| `not-a-fit-b` | employees = "Da 1 a 9" or "Più di 150" | `/italy/not-a-fit-b/` |
| `not-now` | ad budget = "No" | `/italy/not-now/` |
| fallback | everything else, including "Da valutare" on budget | `/italy/book/` |

`not-a-fit-b` is a sixth page: the brief gives the size-band refusal its own text. Option
indexes are pinned by a test that fails if an option is reordered without the table.

After a booking, `/italy/book/` forwards to `/italy/takk/`. **Lead fires only on
`/italy/takk/`**, only with a valid `lead_id` in the URL (the forward always carries one, so a
visit without it did not come through a booking and is not counted), and only once per lead id
in a browser (the mark is kept in `localStorage` as well as `sessionStorage`, written only once
the pixel really sent the event): never on submit, never for a lead that was turned away. It
is not tied to Calendly's own confirmation beyond that, so anyone who opens a `/takk/` link
that carries a lead id and has accepted the pixel is counted once; that is a limit of a
browser-side event, not something the page can prove. Calendly's own redirect is not used
(unreliable in the Facebook in-app browser); the event type's redirect setting must stay off.

---

## 3. Consent and the pixel

Owned by this funnel, in `common.js`: its own storage key (`em_it_consent`), its own pixel
loader. It does not use `/js/consent.js`, and a choice made on the UK funnel does not count
here (tested). Until **Accetto** no pixel is loaded and no `localStorage` is written but the
choice itself. After **Rifiuto** nothing is ever sent to Meta. The banner copy and the cookie
notice link are in `copy.json`.

### What the code does, for the adviser

The banner and the checkbox say less than the code does. This is the full list, so the legal text
can be checked against it rather than against the copy:

- **From the first load, before any choice**, and whatever the choice: the page keeps a working
  record in `sessionStorage` (cleared when the tab closes): a random `lead_id` it makes up, the
  `utm_*` and `fbclid` values from the address, and the referring page. The form cannot work without
  it. It is first-party, and it is sent to our own endpoint with the lead. It is not sent to Meta
  or anyone else by the page.
- **When the form is submitted**: name, company, e-mail, the five answers, the consent record
  (the wording shown, its version, the time) and the working record go to the webhook, wherever
  that is. **This includes visitors who are then shown "not a fit" or "not now"**: their details
  are delivered and kept like any other, although the checkbox says the purpose is to be contacted
  "in merito a questa richiesta". Decide whether that is covered, or whether a turned-away visitor's
  data should be dropped or deleted on a schedule.
- **Only after Accetto**: the Meta pixel loads, sends `PageView` on every page, and `Lead` with
  `lead_id` only on `/italy/takk/`. No name, e-mail or company is passed to it. The page address Meta
  sees does carry `lead_id`, the UTMs and `fbclid`, and on the outcome pages the path itself says
  which outcome (for example `/italy/not-now/`). A mark that a lead was counted is stored in
  `localStorage`.
- **On `/italy/book/`, always**: the Calendly script and frame load, whatever the visitor chose
  about cookies, and the page passes `hide_gdpr_banner=1`, which suppresses Calendly's own cookie
  banner. So a visitor who pressed Rifiuto still gets Calendly with `lead_id` and UTMs in its
  address, and Calendly's banner is not shown to them. If that is not acceptable, either remove
  `hide_gdpr_banner=1` from `outcome.js` (Calendly then asks for itself) or make the calendar wait for a click.
- The choice itself is kept with no expiry (section 4b).

There is no control on the page to change the choice later (the banner is shown once, and
is not in the brief's banner copy). The visitor can clear it by clearing site data, and the
cookie notice (item 5) should say how to withdraw. Flag this to the adviser.

---

## 4. Not built

- **Variants A2 and A3** of the landing page. The brief describes three; only A1 is built.
- **`/review`**: the UK funnel has one, the Italian brief does not.
- **Privacy, cookie and terms pages**: legal text, delivered separately (items 5, 6).
- **Calendly loads before consent.** The embed is a third party loaded on `/italy/book/`
  whether or not the visitor accepted cookies, and its own banner is suppressed (section 3).
  Calendly's own cookies are the adviser's call. The booking page is only reached after the form.
  If Calendly's script does not load (a blocker, a proxy, a WebView), the box shows the plain
  Calendly link instead of staying empty.
- **Calendly pre-fill** (name, email) is not passed. The five tracking slots carry lead id
  and UTMs only. Not verified against a real event.

---

## 4b. Known limits, deliberately not changed

- **No-JS double submit sends two leads.** On a browser without JavaScript the page is static, so there is no
  lead id until the server mints one per POST. A double tap on the button gives two ids and two deliveries. The
  JavaScript path mints the id in the browser, so a retry keeps it. Deriving the id from the visitor's email
  would fix it but would also put an email-derived identifier into the Meta pixel's `lead_id`, so it is not done.
  Dedupe on email in the receiving system if it matters.
- **The honeypot is named `website_url`, as the brief says.** A browser that autofills hidden fields could fill
  it: that visitor is silently sent to `/italy/not-a-fit/` and nothing is stored. Watch for it in the first
  week; the UK funnel uses a name browsers do not autofill.
- **Referer.** For a browser without JavaScript the UTMs are recovered from the Referer if its path starts with
  `/italy`. The host is not checked. Harmless (the values are encoded and only travel on to the same site).
- **Consent has no expiry and no way back on the page** (section 3). Ask the adviser how often it must be re-asked.
- **Meta automatic advanced matching** may read form fields once the pixel is loaded. Check the setting in Events
  Manager before launch; it is not controlled from this code.
- **Cache headers** for `/italy/assets/fonts/*` and `/italy/assets/logo-*` are set in `netlify.toml` and could
  not be checked against a deploy from here: `curl -I` one font after the first deploy preview.
- **A viewport under about 370 px** clips the right edge of the calendar: Calendly's embed has a 320 px minimum
  and the page padding leaves less. Very rare today; the fallback is the same link.
- **Old browsers without `clamp()` or flex `gap`** (before Chrome 79, Safari 13.1 and 14.1) get a plainer,
  tighter layout, probably not a broken form: the scripts are ES5 and parse in old WebViews, but the layout on
  a browser that old was not tested.
- **Back to the no-script error page** re-posts the form (that page is the POST response). Browsers ask before
  they do it; a visitor who follows the privacy link from the consent label in the same tab and comes back can
  hit it. A rare path on a rare browser.
- **The Italy generator is part of the shared `prebuild`.** If it fails, every deploy fails, including the UK
  funnels and the main site, even while Italy is dark. That keeps committed output honest, and the build says
  what is wrong. If that trade-off is wrong for a dark funnel, give it its own non-blocking step.
- **Node.** `npm run test:italy` lists its files explicitly so it runs on Node 20 as well as 22 (a quoted glob
  needs Node 21 or later). Netlify builds on Node 22.

## 5. How it works, and differences from `/uk-it-firms`

- Source of truth: this folder. `scripts/build-italy.mjs` writes `public/italy/index.html`,
  `book`, `takk`, `not-now`, `not-a-fit`, `not-a-fit-b` and `assets/`, plus
  `netlify/functions/italy-lead/data.generated.mjs`. **Never edit those.** The generator
  does not touch `public/italy/privacy` or `public/italy/cookie`.
- Fonts and logos are copied from `public/g/_assets` into `public/italy/assets`, so the
  funnel does not depend on `/g`.
- The form works with no JavaScript (all six questions stacked, plain POST, server
  re-render with the errors, answers kept, ticked box kept). `client.js` turns it into steps.
- `core.cjs` is shared by browser and server, so client and server cannot disagree on what
  is valid. Each details field carries its own Italian error text.
- Differences from the UK funnel: six questions not twelve; a consent checkbox on the last
  step (server-enforced); no website question; `lang="it"`; no `/review`; the endpoint is
  `/italy/api/lead`; honeypot field `website_url`; the topbar and logo share one `<header>`.
- Design tokens are the UK funnel's (paper, ink, marine; no green). The build refuses any
  other colour, any Google Fonts request, the shared consent script and the UK consent key.
- Hard rules checked by the build on every string, including the `OFFER` and `THRESHOLD` values: no exclamation
  marks, no em dashes. The build also refuses a stub legal page (under 500 bytes), a folder under `public/italy`
  that holds files it does not own, `config.path` other than `/italy`, any CSS named colour used as a value (not
  in a selector or a comment), 4 and 8 digit hex, `/g/_assets`, an inlined script or style that could end its own
  element, the words "undefined" or "null" in the page (a missing copy key), and any brace left over from a
  mistyped placeholder.

## 6. Working on it

```
npm run test:italy                 # 64 tests: validation, routing, the function, the review fixes
node scripts/build-italy.mjs       # regenerate public/italy and the function data
```

Browser behaviour (the six-step walk, the three refusals, a failed delivery and retry, no
JavaScript, consent and pixel, the Lead event, Calendly, axe, overflow from 320 to 1920 px,
every string of the brief on the page) was checked with Playwright against the built site
with the real function and routing and a fake webhook. Those scripts are not in the repo.

Not verified here: the live domain, Calendly and Meta responses (the sandbox cannot reach
them), real iOS Safari and the Facebook in-app browser, Lighthouse.

Changing `/css` or `/js` files is not relevant here (nothing is shared), but if `client.js`,
`common.js`, `outcome.js` or `style.css` change, rebuild: they are inlined into every page.
