import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { scrollToTarget } from '@/lib/lenis'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Shared legal document chrome (privacy-policy.md / terms.md):        */
/* document card, folio strip, numbered clauses, mini-TOC scroll-spy.  */
/* Named export reused by Terms.tsx (no shared files may be touched).  */
/* ------------------------------------------------------------------ */

export type LegalClause = {
  n: number
  title: string
  body?: string
  /** Lettered sub-points (rendered a. b. c. …). */
  points?: string[]
}

export type LegalMeta = { label: string; href?: string }

export type LegalDocumentProps = {
  /** Folio strip, left cell, e.g. "FILE — PRIVACY NOTICE". */
  fileLabel: string
  /** Folio strip, e.g. "DOC: EM-PP-2026". */
  docCode: string
  /** Folio strip, e.g. "VERSION 2.0". */
  version: string
  /** Orange-aa case tag above the H1, e.g. "FILE — YOUR DATA". */
  caseTag: string
  /** H1, e.g. "Privacy Policy". */
  title: string
  meta: LegalMeta[]
  /** Plain-English preface (paper-2 callout, orange left border). */
  preface: string
  clauses: LegalClause[]
  /** Closing mono line, e.g. "END OF FILE — EM-PP-2026". */
  endMark: string
  /** Cross-link to the sibling legal document. */
  crossLink: { to: string; label: string }
}

export function LegalDocument({
  fileLabel,
  docCode,
  version,
  caseTag,
  title,
  meta,
  preface,
  clauses,
  endMark,
  crossLink,
}: LegalDocumentProps) {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(clauses[0]?.n ?? 1)

  /* Calm, once-only reveals (legal pages: no pins, no scroll theatre). */
  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      if (reduced) {
        gsap.set('.ld-doc', { y: 0, opacity: 1 })
        gsap.set('.ld-folio', { clipPath: 'inset(0 0% 0 0)' })
        gsap.set('.ld-h1 .mask-inner', { yPercent: 0 })
        gsap.set('.ld-preface', { x: 0, opacity: 1 })
        gsap.set('.ld-clause-no', { clipPath: 'inset(0 0% 0 0)' })
        gsap.set('.ld-clause-body', { y: 0, opacity: 1 })
        gsap.set('.ld-close', { y: 0, opacity: 1 })
        return
      }
      const tl = gsap.timeline({ defaults: { ease: 'snap' } })
      tl.fromTo('.ld-doc', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 })
        .fromTo('.ld-folio', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.4 }, 0.15)
        .fromTo('.ld-h1 .mask-inner', { yPercent: 110 }, { yPercent: 0, duration: 0.9 }, 0.25)
        .fromTo('.ld-preface', { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 0.3)

      gsap.set('.ld-clause-no', { clipPath: 'inset(0 100% 0 0)' })
      gsap.set('.ld-clause-body', { y: 16, opacity: 0 })
      gsap.utils.toArray<HTMLElement>('.ld-clause').forEach((el) => {
        const ctl = gsap.timeline({
          defaults: { ease: 'snap' },
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        })
        ctl
          .to(el.querySelector('.ld-clause-no'), { clipPath: 'inset(0 0% 0 0)', duration: 0.3 })
          .to(el.querySelector('.ld-clause-body'), { y: 0, opacity: 1, duration: 0.5 }, 0.05)
      })

      gsap.fromTo(
        '.ld-close',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'snap', scrollTrigger: { trigger: '.ld-close', start: 'top 88%', once: true } },
      )
    },
    { scope: root },
  )

  /* Mini-TOC scroll-spy. */
  useEffect(() => {
    const els = clauses
      .map((c) => document.getElementById(`clause-${c.n}`))
      .filter((el): el is HTMLElement => !!el)
    if (els.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.id.replace('clause-', '')))
        })
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [clauses])

  const goClause = (n: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    scrollToTarget(`#clause-${n}`)
    window.history.replaceState(null, '', `#clause-${n}`)
  }

  return (
    <div ref={root}>
      <section data-nav="paper" className="relative">
        <div className="relative mx-auto max-w-[1200px] px-6 pb-24 pt-[88px] lg:px-12 lg:pb-32">
          <div className="mx-auto max-w-[760px]">
            <article className="ld-doc border border-ink bg-paper p-4 shadow-[4px_4px_0_rgba(26,26,46,.1)] md:p-6 md:shadow-[8px_8px_0_rgba(26,26,46,.1)]">
              {/* Folio strip */}
              <div className="ld-folio flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border border-line-paper px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                <span>{fileLabel}</span>
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>{docCode}</span>
                  <span>{version}</span>
                </span>
              </div>

              {/* Header */}
              <p className="mt-8 font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa">
                {caseTag}
              </p>
              <h1 className="ld-h1 mask-line mt-4 font-serif text-[clamp(2.4rem,5.4vw,4.25rem)] font-medium leading-[1.0] tracking-[-0.02em] text-ink">
                <span className="mask-inner">{title}</span>
              </h1>
              <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-soft">
                {meta.map((m, i) => (
                  <span key={m.label} className="flex items-center gap-3">
                    {i > 0 && <span aria-hidden="true">·</span>}
                    {m.href ? (
                      <a href={m.href} className="underline-sweep text-ink">
                        {m.label}
                      </a>
                    ) : (
                      m.label
                    )}
                  </span>
                ))}
              </p>

              {/* Plain-English preface */}
              <div className="ld-preface mt-8 border-l-2 border-orange bg-paper-2 p-5 text-[1.125rem] leading-[1.65] text-ink">
                {preface}
              </div>

              {/* Clauses */}
              <div className="mt-10">
                {clauses.map((c) => (
                  <section
                    key={c.n}
                    id={`clause-${c.n}`}
                    aria-labelledby={`clause-${c.n}-title`}
                    className="ld-clause group scroll-mt-28 border-t border-line-paper py-7 first:border-t-0 first:pt-2 lg:grid lg:grid-cols-[52px_minmax(0,1fr)] lg:gap-6"
                  >
                    <p className="ld-clause-no tnum mb-2 font-mono text-[13px] font-medium text-orange-aa lg:mb-0 lg:pt-1.5">
                      § {c.n}
                    </p>
                    <div className="ld-clause-body">
                      <h2
                        id={`clause-${c.n}-title`}
                        className="font-sans text-[clamp(1.25rem,2vw,1.6rem)] font-bold leading-[1.2] tracking-[-0.01em] text-ink"
                      >
                        {c.title}
                        <a
                          href={`#clause-${c.n}`}
                          onClick={goClause(c.n)}
                          aria-label={`Deep link to clause ${c.n}`}
                          className="ml-2 font-mono text-[0.95rem] font-normal text-ink-soft opacity-0 transition-opacity duration-200 hover:text-orange-aa focus-visible:opacity-100 focus-visible:text-orange-aa group-hover:opacity-100"
                        >
                          #
                        </a>
                      </h2>
                      {c.body && <p className="mt-3 max-w-[68ch] leading-[1.65] text-ink-soft">{c.body}</p>}
                      {c.points && (
                        <ol className="mt-3 max-w-[68ch] list-[lower-alpha] space-y-2 pl-6 leading-[1.65] text-ink-soft marker:font-mono marker:text-[13px] marker:text-ink">
                          {c.points.map((p) => (
                            <li key={p.slice(0, 32)} className="pl-1">
                              {p}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </section>
                ))}
              </div>

              {/* Closing strip */}
              <div className="ld-close mt-8 border-t border-line-paper pt-8 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">{endMark}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  <Link to="/" className="underline-sweep font-mono text-[12px] uppercase tracking-[0.18em] text-ink">
                    Back to the audit ↩
                  </Link>
                  <Link
                    to={crossLink.to}
                    className="underline-sweep font-mono text-[12px] uppercase tracking-[0.18em] text-orange-aa"
                  >
                    {crossLink.label}
                  </Link>
                </div>
              </div>
            </article>
          </div>

          {/* Sticky mini-TOC (xl only, right gutter) */}
          <nav aria-label="Contents" className="absolute inset-y-0 right-12 hidden w-[160px] xl:block">
            <div className="sticky top-28">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-soft/70">
                Contents
              </p>
              <ol className="mt-3 space-y-2">
                {clauses.map((c) => (
                  <li key={c.n}>
                    <a
                      href={`#clause-${c.n}`}
                      onClick={goClause(c.n)}
                      aria-current={active === c.n ? 'true' : undefined}
                      className={cn(
                        'block font-mono text-[10px] uppercase leading-[1.6] tracking-[0.12em] transition-colors duration-200',
                        active === c.n ? 'text-orange-aa' : 'text-ink-soft/70 hover:text-ink',
                      )}
                    >
                      §{c.n} {c.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* /privacy-policy — "File: Your Data" (final copy, privacy-policy.md) */
/* ------------------------------------------------------------------ */

const CLAUSES: LegalClause[] = [
  {
    n: 1,
    title: 'Who we are',
    body: 'EngeCo AS, trading as Elevate Marketing ("we", "us"), is the data controller for personal data collected through this website. Registered in Norway. Contact: post@elevatemarketing.no.',
  },
  {
    n: 2,
    title: 'What we collect',
    body: "When you request a GEO audit: first name, work email, company name, website URL, industry, and (optionally) a competitor's name. When you browse: standard server logs and, with your consent, anonymised analytics (see § 7). We do not collect special-category data, and we do not want any — please don't send it.",
  },
  {
    n: 3,
    title: 'Why we collect it (lawful bases)',
    points: [
      'To deliver your audit and report (performance of a contract / steps before one).',
      'To send your report, walkthrough link and related follow-ups (legitimate interest — you asked us to).',
      'To send occasional marketing email (consent — you can withdraw it in one click).',
      'To keep our site secure and measure performance (legitimate interest).',
    ],
  },
  {
    n: 4,
    title: 'What we never do',
    body: "We never sell your data. We never share it with third parties for their marketing. We never add you to lists you didn't ask for. Competitor names you submit are used solely to run comparative visibility queries.",
  },
  {
    n: 5,
    title: 'Who processes it',
    body: 'Hosting and email delivery via GDPR-compliant processors under data-processing agreements (cloud hosting within the UK/EEA; transactional email provider). Audit queries are run against public AI platforms; no personal data is included in those queries beyond published business details.',
  },
  {
    n: 6,
    title: 'Retention',
    body: 'Audit requests and reports: 24 months, then deleted or fully anonymised. Marketing consents: until withdrawn. Server logs: 90 days.',
  },
  {
    n: 7,
    title: 'Cookies & analytics',
    body: 'This site uses the Meta Pixel to measure advertising performance and build advertising audiences for the campaigns that bring visitors here. You can control cookies in your browser settings and adjust your advertising preferences in your Meta account settings. We do not use fingerprinting.',
  },
  {
    n: 8,
    title: 'Your rights (UK GDPR)',
    body: "Access, rectification, erasure, restriction, portability, objection — and withdrawal of consent at any time. Email post@elevatemarketing.no and we respond within 30 days. You can also complain to the ICO (ico.org.uk), though we'd welcome the chance to fix things first.",
  },
  {
    n: 9,
    title: 'Changes & contact',
    body: 'Material changes are posted here with a new version number and date. Questions, requests, complaints: post@elevatemarketing.no — EngeCo AS (trading as Elevate Marketing).',
  },
]

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Elevate Marketing</title>
        <meta
          name="description"
          content="How Elevate Marketing collects, uses and protects your personal data when you request a GEO audit. UK GDPR compliant."
        />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://it.getelevateleads.com/audit/privacy-policy" />
        <meta property="og:title" content="Privacy Policy — Elevate Marketing" />
        <meta
          property="og:description"
          content="How Elevate Marketing collects, uses and protects your personal data when you request a GEO audit. UK GDPR compliant."
        />
        <meta property="og:url" content="https://it.getelevateleads.com/audit/privacy-policy" />
      </Helmet>
      <LegalDocument
        fileLabel="FILE — PRIVACY NOTICE"
        docCode="DOC: EM-PP-2026"
        version="VERSION 2.0"
        caseTag="FILE — YOUR DATA"
        title="Privacy Policy"
        meta={[
          { label: 'LAST UPDATED: 6 JANUARY 2026' },
          { label: 'CONTROLLER: ELEVATE MARKETING LTD' },
          { label: 'QUESTIONS: post@elevatemarketing.no', href: 'mailto:post@elevatemarketing.no' },
        ]}
        preface="The short version: we collect only what we need to run your audit, we never sell or share it, you can unsubscribe or have it deleted at any time, and we'll show you exactly what's held if you ask. The full legal version follows."
        clauses={CLAUSES}
        endMark="END OF FILE — EM-PP-2026"
        crossLink={{ to: '/terms', label: 'Terms of Service →' }}
      />
    </>
  )
}
