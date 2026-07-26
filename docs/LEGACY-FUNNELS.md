> **NOTE (July 2026):** The main site at `/` is now the React app in this repo's
> root (see `README.md`). Everything documented below still ships, served as
> static files from `public/`:
>
> | Old location | New location in repo | Live URL (unchanged unless noted) |
> |---|---|---|
> | `index.html` | `public/lp/index.html` | **moved:** `/` → `/lp/` |
> | `privacy/`, `terms/` | `public/lp/privacy/`, `public/lp/terms/` | **moved:** `/privacy` → `/lp/privacy/`, `/terms` → `/lp/terms/` |
> | `takk.html`, `not-a-fit.html` | `public/takk.html`, `public/not-a-fit.html` | `/takk.html`, `/not-a-fit.html` |
> | `geo-audit/` | `public/geo-audit/` | `/geo-audit`, `/geo-audit/thanks`, `/geo-audit/not-a-fit` |
> | `audit/` (Dossier build) | `public/audit/` | `/audit/` |
> | `case/` | `public/case/` | `/case/*.html` |
> | `nevari/` | `public/nevari/` | `/nevari/` |
> | `css/`, `js/`, `images/` | `public/css/`, `public/js/`, `public/images/` | `/css/*`, `/js/*`, `/images/*` |
>
> The Dossier *source* stays in `dossier/` (repo root, not deployed).
> Typeform/Calendly redirect URLs pointing at `/takk.html` and `/geo-audit/*`
> keep working. Ads pointing at the domain root now land on the new site —
> update them to `/lp` if they should keep hitting the commission funnel page.

# Elevate Marketing: IT Consultancy Landing Page

High-converting landing page for UK IT consultancies. Commission-only lead generation model. Built with pure HTML/CSS/JS, deployed on Netlify.

## Project Structure

```
├── index.html          # Landing page
├── css/styles.css      # All styles
├── js/main.js          # Animations, sticky bar, FAQ accordion, UTM capture, conversion tracking
├── images/             # SVG assets (if needed)
├── netlify.toml        # Netlify deploy config + security headers
└── .gitignore
```

## Setup

### 1. Connect to Netlify

1. Log in to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** > **"Import an existing project"**
3. Select this GitHub repository
4. Branch to deploy: `main`
5. Build command: leave blank (no build step)
6. Publish directory: `.`
7. Click **Deploy site**

### 2. Custom Domain

1. In Netlify, go to **Domain management** > **Add custom domain**
2. Enter your subdomain (e.g. `it.yourdomain.com`)
3. Add the DNS records Netlify provides to your domain registrar
4. Netlify will auto-provision an SSL certificate

### 3. Replace Typeform ID

In `index.html`, find this line in the form section:

```html
<div data-tf-live="TYPEFORM_ID"
```

Replace `TYPEFORM_ID` with your actual Typeform form ID (found in Typeform's share/embed settings).

### 4. Configure Facebook Pixel

The Facebook Pixel (ID: `1396679842249197`) is already installed in `index.html`. It fires:

- **PageView** on every page load
- **Lead** event when the Typeform is submitted (via `js/main.js`)

To change the Pixel ID, edit the `fbq('init', '...')` line in `index.html`.

### 5. Configure Google Analytics 4

In `index.html`, uncomment the GA4 block in `<head>` and replace `GA_MEASUREMENT_ID` with your actual GA4 Measurement ID (format: `G-XXXXXXXXXX`).

GA4 events fired:
- **page_view** automatically
- **generate_lead** on Typeform submit (via `js/main.js`)

## GEO Audit Funnel (`/geo-audit`)

Separate funnel for the Meta campaign "LEADS I ENGLAND I IT I v.3", adset GEO-audit. Three pages, styled by `css/geo.css` (V2 editorial system: Fraunces + Geist, navy `#0A1628`), fully independent of the commission funnel pages.

| Path | Purpose | Pixel events |
|---|---|---|
| `/geo-audit` | Landing page (cold Meta traffic) | `PageView` only |
| `/geo-audit/thanks` | Qualified Typeform redirect, Calendly embed | `PageView` + `LeadGEOUK` (trackCustom) |
| `/geo-audit/not-a-fit` | Disqualified Typeform redirect | `PageView` only |

`LeadGEOUK` is a custom event, deliberately separate from the commission funnel's `Lead` event so the two Meta audiences never mix. It fires **only** on `/geo-audit/thanks`.

**Before launch:**
1. Create the GEO Typeform (5 questions with gate logic; see campaign brief) and replace `TYPEFORM_URL` at the top of `geo-audit/index.html`.
2. Set Typeform redirects: qualified → `https://it.getelevateleads.com/geo-audit/thanks`, disqualified → `https://it.getelevateleads.com/geo-audit/not-a-fit`.
3. Confirm the delivery-time answer in the FAQ ("You will have the findings within a week.") — flagged with a TODO comment in `geo-audit/index.html`.
4. Zapier: Typeform → ClickUp list "IT - UK - GEO" (separate from "IT - UK - Commision") + Slack alert. Flag free email domains in the Zapier step.

UTM parameters on the landing page URL are appended to the Typeform link automatically.

## Duplicating for Other Verticals

1. Copy the entire repository
2. Update industry-specific copy (see brief Section 8 for swap table)
3. Key areas to change: hero tag, pain points, "who this is for" cards, process steps, form copy, meta title/description
4. Deploy as a separate Netlify site with its own subdomain

## UTM Tracking

UTM parameters from the URL are automatically passed to Typeform as hidden fields. Use URLs like:

```
https://yourdomain.com/?utm_source=meta&utm_medium=cpc&utm_campaign=it_consultancy
```

## Tech Stack

- **HTML/CSS/JS** (no frameworks, no build tools)
- **Google Fonts**: Plus Jakarta Sans
- **Typeform**: Embedded conversational form
- **Netlify**: Hosting with auto-deploy on push
- **Facebook Pixel**: Conversion tracking
- **GA4**: Analytics (placeholder, configure before launch)
