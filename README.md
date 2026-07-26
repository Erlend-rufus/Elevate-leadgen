# Elevate Marketing — getelevateleads.com

Marketing site for Elevate Marketing's UK division. One job: convert warm
traffic into **booked strategy calls** and build trust in the UK market.

## Stack

React 19 + TypeScript + Vite 7 · Tailwind CSS 3.4 (shadcn theme) · Framer Motion · lucide-react

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build to dist/
npm run preview  # serve the production build
```

## Editing content — start here

**All copy, figures and placeholders live in `src/content.ts`.**
Everything marked `[REPLACE]` must be swapped for real, documentable
values before launch (stats, cases, phone/address, Companies House no.,
Cal.com URL, testimonials, team bios/photos). Never publish a number that
cannot be evidenced — and never a counter that can show 0.

## Structure

```
src/content.ts          Single source of truth for all copy + data
src/components/         ArrowMotif (signature dotted gradient arrow),
                        Logo, Reveal, CtaButton, BookingEmbed (Cal.com),
                        CookieConsent, LegalPage, ui/ (shadcn)
src/sections/           Header, Hero, ProofBar, Problem, Services, Process,
                        ResultsTeaser, Testimonials, AboutTeaser, FAQ,
                        FinalCTA, Footer
src/pages/              Home (/) · Results · About · Contact · Privacy · Terms · Book (/book)
public/                 favicon.svg + PNGs (arrow motif), og-image.jpg,
                        logo-white.png, robots.txt, sitemap.xml
```

## Before launch checklist

- [ ] Replace all `[REPLACE]` items in `src/content.ts`
- [x] Real Calendly event connected (`site.bookingUrl`, `bookingEnabled: true`) — UK timezone.
      Booking surfaces: FinalCTA + /contact (embedded widget) and /book
      (dedicated conversion landing page). `site.bookingDirectUrl` is the
      plain link used by CTA buttons that open Calendly in a new tab.
- [ ] Swap `Logo.tsx` for the official SVG logo when delivered
- [ ] Real team photos (never stock) on /about
- [ ] GA4 measurement ID in `index.html` + Consent Mode v2, gated behind
      the cookie banner (`localStorage['elevate-cookie-consent']`)
- [ ] Legal review of /privacy and /terms (UK GDPR / PECR)
- [ ] 301 redirects from old URLs if the structure changed
- [ ] Deploy on Vercel (`vercel.json` included)

## Legacy funnels (still live)

The pre-existing campaign pages are preserved as static files under `public/`
and keep their URLs: `/lp` (the old landing page, moved from `/`),
`/lp/privacy/`, `/lp/terms/`, `/takk.html`, `/not-a-fit.html`, `/geo-audit/*`,
`/audit/` (Visibility Dossier, source in `dossier/`), `/case/*.html`,
`/nevari/`. See `docs/LEGACY-FUNNELS.md` for details. Redirect order in
`netlify.toml` matters: the `/audit/*` and `/lp/*` rules must stay before the
final SPA catch-all.
