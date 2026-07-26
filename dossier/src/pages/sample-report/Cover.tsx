import { useRef } from 'react'
import Redact from '@/components/Redact'
import Stamp from '@/components/Stamp'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'

const META_ROWS: [string, string][] = [
  ['SUBJECT', 'COMPANY X LTD (MSP, MANCHESTER)'],
  ['STATUS', 'ILLUSTRATIVE EXAMPLE'],
  ['EXAMINER', 'ELEVATE MARKETING, GEO UNIT'],
  ['SCOPE', 'BUYER-STYLE QUERIES, MAJOR AI PLATFORMS'],
  ['DELIVERY', 'WALKTHROUGH CALL'],
]

const TEASERS = [
  { label: 'VISIBILITY SCORE', value: 23, suffix: '/100' },
  { label: 'COMPETITORS RECOMMENDED INSTEAD', value: 4, suffix: '' },
  { label: 'FACTUAL ERRORS FOUND', value: 7, suffix: '' },
]

/** S1 — Report cover: the page opens like a physical case file (sample-report.md §S1). */
export default function Cover() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        TEASERS.forEach((_, i) => {
          const el = root.current?.querySelector<HTMLElement>(`.sr-teaser-val-${i}`)
          if (el) el.textContent = `${TEASERS[i].value}${TEASERS[i].suffix}`
        })
        return
      }

      const tl = gsap.timeline({ defaults: { ease: 'snap' } })

      // Folio strips type in L→R (clip-path), staggered
      tl.fromTo(
        '.sr-folio-cell',
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: 0.4, stagger: 0.1, ease: 'none' },
        0.15,
      )

      // H1 line masks
      tl.fromTo(
        '.sr-h1-inner',
        { yPercent: 110 },
        { yPercent: 0, duration: 0.9, stagger: 0.09 },
        0.25,
      )

      // Sub rises gently
      tl.fromTo('.sr-cover-sub', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.55)

      // Release the H1 masks after reveal so the X tooltip can escape the clip
      tl.set('.sr-h1-mask', { overflow: 'visible' }, 1.35)

      // Meta block
      tl.fromTo('.sr-cover-meta', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.5)

      // Teaser counters (0.9s)
      TEASERS.forEach((t, i) => {
        const el = root.current?.querySelector<HTMLElement>(`.sr-teaser-val-${i}`)
        const obj = { v: 0 }
        tl.to(
          obj,
          {
            v: t.value,
            duration: 0.9,
            ease: 'power2.out',
            onUpdate: () => {
              if (el) el.textContent = `${Math.round(obj.v)}${t.suffix}`
            },
          },
          0.7,
        )
      })
      tl.fromTo('.sr-teaser-row', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.65)
    },
    { scope: root },
  )

  return (
    <div ref={root} className="sr-cover">
      {/* Document header strip */}
      <div className="flex items-center justify-between border-b border-line-paper px-5 py-3 md:px-8">
        <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" width={28} height={28} className="h-7 w-7" />
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-ink-soft">
          ELEVATE MARKETING — GEO UNIT
        </p>
      </div>

      {/* Folio strip */}
      <div className="grid grid-cols-1 border-b border-line-paper font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft sm:grid-cols-3">
        <p className="sr-folio-cell border-b border-line-paper px-5 py-2.5 sm:border-b-0 sm:border-r md:px-8">
          GEO AUDIT REPORT
        </p>
        <p className="sr-folio-cell border-b border-line-paper px-5 py-2.5 text-center sm:border-b-0 sm:border-r">
          REF: GEO-26-SAMPLE
        </p>
        <p className="sr-folio-cell px-5 py-2.5 sm:text-right md:px-8">PAGES 01–06</p>
      </div>

      {/* Title stack + cover meta */}
      <div className="grid grid-cols-1 gap-10 px-5 pb-10 pt-10 md:px-8 lg:grid-cols-12 lg:gap-8 lg:pb-14 lg:pt-14">
        <div className="lg:col-span-8">
          <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa">
            SAMPLE REPORT — ILLUSTRATIVE EXAMPLE
          </p>
          <h1 className="mt-5 font-serif text-[clamp(2.4rem,5.4vw,4.25rem)] font-medium leading-[1.02] tracking-[-0.02em] text-ink">
            <span className="mask-line sr-h1-mask">
              <span className="mask-inner sr-h1-inner">What the AI says about</span>
            </span>
            <span className="mask-line sr-h1-mask pb-[0.28em]">
              <span className="mask-inner sr-h1-inner italic">
                Company{' '}
                <span className="group/xred relative inline-block not-italic" tabIndex={0}>
                  <Redact mode="locked" className="font-serif italic">
                    X
                  </Redact>
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-full mt-[0.06em] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft"
                  >
                    FICTIONAL
                  </span>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap border border-ink bg-ink px-2.5 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-paper opacity-0 shadow-[4px_4px_0_rgba(26,26,46,.15)] transition-opacity duration-200 group-hover/xred:opacity-100 group-focus-visible/xred:opacity-100"
                  >
                    ILLUSTRATIVE EXAMPLE
                  </span>
                </span>{' '}
                Ltd.
              </span>
            </span>
          </h1>
          <p className="sr-cover-sub mt-6 max-w-[60ch] text-[1.125rem] leading-[1.65] text-ink-soft">
            A fictional managed IT service provider in Manchester, built as a worked example: strong Google rankings —
            and effectively invisible to every major AI platform. This is what your report looks like, page for page,
            with invented data throughout.
          </p>
        </div>

        {/* Cover meta block */}
        <div className="relative lg:col-span-4">
          <Stamp color="orange" className="absolute -top-5 right-2 z-10 bg-paper lg:-right-3">
            SAMPLE
          </Stamp>
          <dl className="sr-cover-meta border border-ink/70 bg-paper-2/50">
            {META_ROWS.map(([k, v], i) => (
              <div
                key={k}
                className={
                  'flex flex-col gap-0.5 px-4 py-2.5 md:flex-row md:items-baseline md:justify-between md:gap-3' +
                  (i > 0 ? ' border-t border-line-paper' : '')
                }
              >
                <dt className="shrink-0 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                  {k}
                </dt>
                <dd className="font-mono text-[12px] font-medium tracking-[0.04em] text-ink md:text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Teaser stat row */}
      <div className="sr-teaser-row grid grid-cols-1 border-t border-line-paper sm:grid-cols-3">
        {TEASERS.map((t, i) => (
          <div
            key={t.label}
            className={
              'group px-5 py-5 transition-colors duration-200 hover:bg-paper-2 md:px-8' +
              (i > 0 ? ' border-t border-line-paper sm:border-l sm:border-t-0' : '')
            }
          >
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">{t.label}</p>
            <p className={`sr-teaser-val-${i} tnum mt-1.5 font-mono text-[1.75rem] font-bold leading-none text-ink`}>
              0{t.suffix}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
