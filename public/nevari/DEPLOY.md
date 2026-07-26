# Nevari x Elevate proposal — standalone deploy

This folder is a **self-contained**, client-facing copy of the "Nevari Proposal"
deck. It is deployed as its **own** Netlify site at `nevari.getelevateleads.com`.

It is deliberately **separate** from the `it.getelevateleads.com` site: it carries
**no Facebook Pixel, no GA4, no Typeform, no campaign tracking of any kind**. A
commercial proposal has no business carrying campaign pixels.

## What's in here

| File | Purpose |
|------|---------|
| `index.html` | The deck (the original `Nevari Proposal.dc.html`, with title/OG/robots meta and local font/runtime references). |
| `support.js` | Claude Design `dc-runtime`. Patched: React/ReactDOM are loaded from `./vendor/` instead of unpkg.com. |
| `deck-stage.js` | The slide-deck web component (unchanged). |
| `vendor/react*.production.min.js` | React 18.3.1 UMD, vendored locally (was unpkg.com). |
| `fonts/` | Montserrat + Poppins woff2 (latin) + `fonts.css`, vendored locally (was Google Fonts). |
| `robots.txt` | Disallows all crawlers. |
| `netlify.toml` | Publish config + security headers + edge `X-Robots-Tag: noindex`. |

**Self-containment verified:** rendered headless with the network captured and
again with all non-localhost requests blocked — **zero external requests** are
made (no claude.ai, anthropic.com, unpkg.com, fonts.googleapis.com, gstatic.com).

## Create the Netlify site

This repo's root is already the `it.getelevateleads.com` site, so the proposal
goes up as a **second, independent** Netlify site pointed at this subfolder.

1. Netlify → **Add new site → Import an existing project** → this GitHub repo.
2. **Base directory:** `nevari`
3. **Publish directory:** `nevari` (or `.` relative to the base)
4. **Build command:** leave blank (no build step).
5. Deploy. Note the auto-assigned `*.netlify.app` name (rename it to something
   tidy, e.g. `nevari-elevate.netlify.app`, under Site settings → Site details).

## Custom domain + DNS

In Netlify: **Domain management → Add a domain →** `nevari.getelevateleads.com`.

Then add this record in the `getelevateleads.com` DNS zone (external DNS):

```
Type:   CNAME
Name:   nevari            (i.e. nevari.getelevateleads.com)
Value:  <your-site-name>.netlify.app
TTL:    3600 (or Auto)
```

Use the exact `*.netlify.app` hostname Netlify shows for **this** new site (not
the `it.` site). Netlify auto-provisions the Let's Encrypt certificate once the
CNAME resolves.

## Re-running the QA gate locally

```
cd nevari && python3 -m http.server 8799 --bind 127.0.0.1 &
# render every slide at 1440x900 and check forbidden/required strings + figures
# (Playwright/Chromium, --no-sandbox). See PR description for the gate results.
```
