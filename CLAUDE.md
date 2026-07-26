# CLAUDE.md — Elevate Marketing (getelevateleads.com)

> Handover from Kimi (Moonshot AI) swarm, July 2026. This site was designed, built and
> client-approved as an extension of the Elevate Marketing web presence. Read this file
> fully before making any change.

## What this is

Marketing site for Elevate Marketing (legal entity: **EngeCo AS**, org.nr 924 490 926,
Midtfjellet 66, 5363 Ågotnes, Norway — trading as "Elevate Marketing"). Target market: UK
SMEs. Language: **English (en-GB)** everywhere. Domain: `getelevateleads.com`
(live — this app is the root site on that domain; it also serves at
`it.getelevateleads.com`).

> **July 2026 integration note:** This app was originally built for the
> `getleadelevate.com` domain as a separate project. Per the client's decision it now
> lives in the main repo and serves as the root app on `getelevateleads.com`. The
> GoDaddy-parked `getleadelevate.com` is unused. Deltas from the original handover:
> the audit landing page moved from `/audit` to **`/growth-audit`** (the Visibility
> Dossier campaign SPA keeps `/audit/`), the `/book` Calendly page was ported in from
> the previous root app (`src/pages/Book.tsx` + `src/content/book.ts`), and all
> domain/e-mail references were swapped to `getelevateleads.com`.

**Legacy funnels co-hosted in this repo** (static files under `public/`, URLs must not
break): `/lp` (old commission landing page + `/lp/privacy/`, `/lp/terms/`),
`/geo-audit/*`, `/audit/` (Visibility Dossier build — source in `dossier/`),
`/case/*.html`, `/takk.html`, `/not-a-fit.html`, `/nevari/`, plus shared `/css`, `/js`,
`/images`. See `docs/LEGACY-FUNNELS.md`.

## Stack & commands

- React 19 + TypeScript + Vite 7 · Tailwind CSS 3.4 (shadcn theme) · lucide-react · react-router v7
- Node 20
- `npm install` → `npm run dev` (port 3000) · `npm run build` (outputs `dist/`, must stay green) · `npm run preview`
- Deploy target: **Netlify** (static, publish dir `dist`, build cmd `npm run build`).

## Architecture — the rules that matter

1. **Content registry pattern (mandatory).** All copy/data lives in `src/content/*.ts`
   (`site`, `home`, `services`, `cases`, `audit`, `about`, `contact`, `legal`).
   **Never write copy inside components.** New text → content module first.
2. Routes are lazy-loaded via `React.lazy` in `src/App.tsx`. `AppShell` renders minimal
   chrome (logo-only header, legal-only footer) on `/growth-audit` and `/book` — keep it
   that way (ad traffic).
3. `BookingEmbed` reads `site.bookingEnabled` + `site.calendlyUrl` (single source for the
   Calendly event — change it there only). Contact form is a Typeform live-embed, ID in
   `contact.form.typeformId`.
4. SEO: `usePageMeta` per page + `JsonLd` helper (`Service` schema on service pages,
   `FAQPage` on home). `public/sitemap.xml` must be regenerated when routes change.
5. Redirects/headers live in the repo-root `netlify.toml` ONLY (no `public/_redirects` —
   it would be processed before netlify.toml and break the order). Rule order is
   critical: `/audit/*` (Dossier SPA fallback) then `/lp/*` then the SPA catch-all
   `/* /index.html 200` LAST. Do not reorder or delete.
6. `vite.config.ts` has `base: '/'` — required for direct loads of nested routes. Do not
   revert to `'./'` (regression: blank pages on refresh of /services/* etc.).
7. Mobile nav overlay is portalled to `document.body` (Header.tsx) — the header's
   `backdrop-blur` collapses fixed children otherwise. Do not move it back inside.

## Design DNA (non-negotiable)

- Background `#04041C`; surfaces `#0B0B2E` / `#12123D`.
- Brand gradient `#00A3D6 → #006ABA → #02009A` used **sparingly**: headline keywords,
  primary CTAs, metric numbers, the arrow motif. Never full-section backgrounds.
- Space Grotesk (display) + Inter (body). Utility classes: `.section-pad`, `.card-dark`,
  `.text-gradient`, `.eyebrow`, `.container-site`.
- Motion via the `Reveal` component only (once, 24–40px, calm). `prefers-reduced-motion`
  respected globally. No loops, no autoplay, no letter animations.
- Arrow motif (`ArrowMotif`/`JourneyCurve`) only where already used: Logo, FinalCTA,
  home Process, /audit steps. Do not add new applications.
- Tone: direct, concrete, zero hype. Banned: "skyrocket", "game-changer", "supercharge",
  "unlock", exclamation marks. British spellings.

## Placeholder policy

`[REPLACE: …]` marks content awaiting client data. As of July 2026 the only remaining
placeholders are **intentional** (client wants anonymity): case-study figures/quotes in
`cases.ts`. The home testimonials section was removed at the client's request (July
2026) — reinstate only with real, attributable quotes. The results teaser disclaimer
("Figures shown are placeholders pending client-approved data.") must stay while the
case placeholders do. Never invent concrete numbers, client names or quotes.

Confirmed real data (do not flag as placeholder): ProofBar (£2.4M+, 4.2×, 92%, 10 years),
pricing "From €1,500/month", response time "one working day", contract terms (90-day
initial → monthly), invoicing (monthly in arrears, 15–30 day terms), 30-day notice,
retention (24 mo enquiries / 14 mo analytics), no retrospective liability, GA4 + Microsoft
Clarity, European servers, team bios (Erlend Rufus, Sondre Henanger).

## Contact / booking facts

- Email only: `hello@getelevateleads.com` (no phone anywhere — deliberate).
- Calendly event: `eb-growwithelevate/elevate-marketing-intro-meeting-clone-1`
  (embedded on `/growth-audit` and `/book`).
- Typeform: live-embed `01KYF20M5CAMYSVACWPM3AMY4S` on `/contact`.

## Likely next tasks

1. Fill anonymous blocks if/when the client approves real case data (see Placeholder policy).
2. Submit `sitemap.xml` in Google Search Console after go-live.

## Version history (Kimi platform)

- `fb0ad83` full site (18 routes) · `b16ef56` Calendly live · `031d434` confirmed content ·
  `3fe5900` EngeCo AS legal + Typeform
