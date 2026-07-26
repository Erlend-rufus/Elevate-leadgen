# CLAUDE.md — "The Visibility Dossier" (Elevate Marketing · Free AI Visibility Audit)

Handover brief for Claude Code. This repo contains a finished, production-built campaign site.
Your job going forward: deploy it, wire the remaining integrations, and iterate **without breaking the design system**.

---

## 1. What this is

Campaign site for **Elevate Marketing's free GEO (Generative Engine Optimization) Audit** aimed at UK IT companies
(MSPs, IT support, cybersecurity — 2 to 50 people; B2B SaaS is NOT in the audience, the shared Typeform disqualifies it). Art direction: a forensic case file / evidence dossier — warm paper, redaction bars
that wipe open on scroll, rubber stamps, mono examiner's notes, navy "interrogation room" console panels where AI
answers type out live. **Deliberately anti-generic-SaaS**: no purple gradients, no glassmorphism, no stock imagery.

Domain (target): `elevatemarketing.co.uk` · All copy is British English.

## 2. Stack (pinned — do not upgrade casually)

- Node 20 · Vite 7.2.4 · React 19 + TypeScript · Tailwind CSS **v3.4.19** (NOT v4) · shadcn/ui (Radix)
- GSAP 3.15 + ScrollTrigger + **free** CustomEase/SplitText (registered in `src/lib/gsap.ts` — no club license)
- Lenis smooth scroll (singleton in `src/lib/lenis.ts`, synced to ScrollTrigger)
- Framer Motion (micro-interactions, accordions, drawers)
- react-helmet-async (per-page SEO/OG/meta + JSON-LD)
- react-router v7 (`BrowserRouter`) — **SPA**: Netlify needs `public/_redirects` (`/* /index.html 200`) — already included.

## 3. First-time setup

```bash
git init && git add -A && git commit -m "Import: The Visibility Dossier v2"
gh repo create elevate-geo-audit --private --source=. --push   # or your existing repo
npm install
npm run dev        # local dev
npm run build      # production build → dist/ (must pass before any commit)
```

**Netlify:** New site from Git → build command `npm run build` · publish directory `dist` · no functions needed (yet).
The included `public/_redirects` handles SPA routing.

## 4. Site map

| Route | File | Notes |
|---|---|---|
| `/` | `src/pages/Home.tsx` (+ `src/pages/home/*`, 13 section components) | Flagship landing. Interactive Prompt Simulator hero, pinned 300vh stats sequence, benchmark bar race, form (`FORM 06`), FAQ + FAQPage JSON-LD |
| `/sample-report` | `src/pages/SampleReport.tsx` (+ `src/pages/sample-report/*`) | Anonymised example audit ("COMPANY X", 23/100). Secondary-CTA destination, conversion close |
| `/thank-you` | `src/pages/ThankYou.tsx` | Stamped confirmation w/ case number. Reads submission echo from router state or `sessionStorage('elevate:audit-request')` |
| `/privacy-policy` | `src/pages/PrivacyPolicy.tsx` (exports `LegalDocument`) | UK GDPR structure — **review placeholders before launch** |
| `/terms` | `src/pages/Terms.tsx` | England & Wales clauses — same review note |

## 5. Architecture contracts (read before editing anything)

1. **Routing pattern B**: `src/components/Layout.tsx` renders `<Outlet/>`; `src/App.tsx` uses nested `<Route>`s.
   Never pass `<Routes>` as Layout children (renders blank but builds clean).
2. **Navbar is `fixed` (72px)** → Layout owns the `pt-[72px]` offset on `<main>`. Pages never compensate,
   except full-bleed heroes which opt out *inside the page* (see `Home.tsx`).
3. **Navbar theme inversion is data-driven**: dark sections carry `data-nav="navy"`. If you add a navy section,
   add the attribute or the nav will render dark-on-dark.
4. **Shared components** (`src/components/`): `Navbar`, `Footer`, `Layout`, `Redact` (wipe/peek/locked),
   `Stamp`, `DocCard`, `ConsoleCard`, `Cursor`. Other code consumes these — don't change their APIs casually.
5. **GSAP/Lenis**: register plugins and eases (`snap`/`thump`/`wipe`) only in `src/lib/gsap.ts`; use the
   `useGSAP` hook; always clean up ScrollTriggers; kill/recreate on breakpoint change.
6. **Code splitting**: secondary routes are `React.lazy` in `App.tsx`. Home stays eager (LCP).
7. **Reduced motion**: every animation has a resolved static state (`prefers-reduced-motion`). New animations
   must follow the same rule — content must never depend on animation to be readable.

## 6. Design system = law

`design/` is the single source of truth: `design.md` (tokens, WCAG-approved colour pairs, type scale, motion
recipes, anti-slop rules) + one doc per page. **Implement faithfully — exact colours, values, copy.** Key rules:

- Colour pairs from `design.md` §2 only. Never: white text on orange, `#00D4AA` teal text on paper, orange text on navy.
  Use `teal-aa` / `orange-aa` for small text on paper.
- Surface rhythm: never two navy sections adjacent.
- No decorative gradients; animation must carry meaning (wipe = censorship lifted, counter = evidence counted).
- Fonts: Fraunces (display), Archivo (UI), JetBrains Mono (labels/data) — already loaded in `index.html`.

## 7. Remaining work before launch (priority order)

1. ~~Wire the form.~~ **DONE (July 2026): the embedded form was replaced by CTA link-outs to Typeform.**
   All primary CTAs link to `TYPEFORM_URL` in `src/lib/typeform.ts` (`https://form.typeform.com/to/Ps2ivRIT`),
   with UTM parameters passed as a hash fragment (Typeform reads hidden fields from the hash only).
   The Typeform handles qualification and redirects: qualified → `/geo-audit/thanks` (fires `LeadGEOUK`),
   disqualified → `/geo-audit/not-a-fit`. `ThankYou.tsx` (`/thank-you`) is currently unused in the flow.
   The old embedded-form spec remains in `design/home.md` §FORM 06 if the inline form is ever revived.
2. **Analytics.** CTA/form elements carry `data-event` (`cta_primary_hero`, `cta_secondary_hero`, `form_submit`,
   `sample_report_view`, …). Add GA4/Meta Pixel **behind a consent banner** — none is shipped, and UK GDPR/PECR
   requires one before any marketing pixel fires.
3. **Legal review.** Privacy/Terms have real UK clause structure but placeholder company details (company number,
   ICO registration, contact). Fill in before launch.
4. **Domain + OG.** Point `elevatemarketing.co.uk`, then verify all absolute URLs (`og:url`, canonical, JSON-LD
   `url`) and test sharing on LinkedIn (uses `public/og-image.png`, 1200×630).
5. **Favicon fallback.** Only `favicon.svg` ships; add PNG fallbacks (32/180) for older browsers/iOS.
6. **Sitemap lastmod.** `public/sitemap.xml` is static — update `lastmod` on releases (optional).

## 8. Known cosmetic notes (not blockers)

- Footer's top CTA zone renders on `/sample-report` (design suggested suppressing it there — optional polish).
- `/thank-you` restyles the navbar CTA via page-scoped CSS targeting `data-event="cta_nav"`; if you change
  Navbar markup, re-check that page.
- 6 pre-existing eslint warnings in shadcn template files (`src/components/ui/*`) — inherited, untouched.
- Form endpoint 404 is expected pre-wiring (see §7.1) — the console warning is harmless.

## 9. Working agreements

- `npm run build` must pass before every commit. TypeScript strict — no `any` escapes.
- New pages: create `src/pages/NewPage.tsx`, lazy-route it, Helmet SEO per existing pages, doc in `design/`.
- Campaign assets (LinkedIn/Google banners + ad copy) live in the previous single-file build — ask the team
  for `elevate-geo-audit/index.html` (v1) if you need them; this repo is the landing site only.
- Tone of all copy: professional, direct, slightly provocative. British English. No fluff, no emoji in UI copy.
