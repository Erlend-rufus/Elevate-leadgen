import { useRef } from 'react'
import Redact from '@/components/Redact'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { cn } from '@/lib/utils'
import { SectionHeader } from './shared'

type BenchRow = {
  name: string
  value: number
  platforms: boolean[] // ChatGPT · Gemini · Perplexity · Copilot · AIO
  queries: string[]
  you?: boolean
}

const ROWS: BenchRow[] = [
  {
    name: 'Northbeam IT',
    value: 78,
    platforms: [true, true, false, true, true],
    queries: ['best MSP Manchester', 'managed IT services for a 40-person company', 'IT support for schools Manchester'],
  },
  {
    name: 'Corelan Systems',
    value: 64,
    platforms: [true, true, false, true, true],
    queries: ['best MSP Manchester', 'cyber essentials consultant near me', 'IT support for law firms'],
  },
  {
    name: 'HexGuard Security',
    value: 51,
    platforms: [false, true, true, false, true],
    queries: ['penetration testing Manchester', 'cyber security audit for SMEs', 'best MSP Manchester'],
  },
  {
    name: 'BrightByte',
    value: 43,
    platforms: [true, false, true, true, false],
    queries: ['best MSP Manchester', 'cloud migration partner UK', 'Microsoft 365 support Manchester'],
  },
  {
    name: 'Company X',
    value: 4,
    platforms: [false, true, true, false, false],
    queries: ['named once — as “XServe Ltd”, a brand retired in 2022'],
    you: true,
  },
]

const WINNERS = [
  'Cited in 3+ industry directories AI trusts',
  'Recent, consistent reviews on 2 platforms',
  'Machine-readable services page (schema)',
  'A Wikipedia-adjacent footprint (Crunchbase, Companies House)',
]

const COMPANYX = [
  'Strong website, invisible sources',
  'Reviews on one platform, 14 months old',
  'No structured data',
  'Footprint: none found',
]

const PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'AI Overviews']

/** S5 — 03 Competitor Benchmark: the bar race, fully solved (sample-report.md §S5). */
export default function Benchmark() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()

      if (reduced) {
        ROWS.forEach((_, i) => {
          const fill = root.current?.querySelector<HTMLElement>(`.srb-fill-${i}`)
          const val = root.current?.querySelector<HTMLElement>(`.srb-val-${i}`)
          if (fill) fill.style.width = `${ROWS[i].value}%`
          if (val) val.textContent = `${ROWS[i].value}%`
        })
        return
      }

      // Bars scrub-fill like home — but resolve fully (the dossier has done its job)
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.srb-chart', start: 'top 78%', end: 'bottom 40%', scrub: 0.6 },
      })
      ROWS.forEach((r, i) => {
        const pos = i * 0.12
        tl.fromTo(`.srb-fill-${i}`, { width: '0%' }, { width: `${r.value}%`, duration: 0.5, ease: 'none' }, pos)
        const valEl = root.current?.querySelector<HTMLElement>(`.srb-val-${i}`)
        const obj = { v: 0 }
        tl.to(
          obj,
          {
            v: r.value,
            duration: 0.5,
            ease: 'none',
            onUpdate: () => {
              if (valEl) valEl.textContent = `${Math.round(obj.v)}%`
            },
          },
          pos,
        )
      })

      // Analysis cards slide up staggered; checklists tick in item-by-item
      gsap.fromTo(
        '.srb-analysis',
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'snap',
          stagger: 0.15,
          scrollTrigger: { trigger: '.srb-analysis-grid', start: 'top 78%', once: true },
        },
      )
      gsap.fromTo(
        '.srb-check',
        { x: -8, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'snap',
          stagger: 0.07,
          scrollTrigger: { trigger: '.srb-analysis-grid', start: 'top 72%', once: true },
        },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} id="report-benchmark" data-nav="paper" aria-label="Competitor benchmark" className="border-t border-line-paper px-5 py-16 md:px-8 lg:py-24">
      <SectionHeader index="03" title="Who gets recommended instead" />
      <p className="mt-6 max-w-[62ch] leading-[1.65] text-ink-soft">
        When buyers asked the AIs who to shortlist, these four names came back — repeatedly, across platforms. Company
        X appeared once, misattributed to a brand name retired in 2022.
      </p>

      {/* Chart */}
      <div className="srb-chart mt-10 space-y-5 border border-ink/70 bg-paper p-5 md:p-8 lg:mt-14">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-ink-soft">
          EXHIBIT 03-A — WHO APPEARS WHEN BUYERS ASK
        </p>
        {ROWS.map((r, i) => (
          <div key={r.name} className="srb-row group relative" tabIndex={0}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className={cn('font-sans text-[15px] font-bold tracking-[-0.01em]', r.you ? 'text-orange-aa' : 'text-ink')}>
                {r.you ? (
                  <>
                    Company <Redact mode="locked">X</Redact>
                  </>
                ) : (
                  r.name
                )}
              </p>
              <p className="flex items-baseline gap-3">
                {/* Platform dots: which platforms named them */}
                <span
                  className="font-mono text-[11px] tracking-[0.1em]"
                  aria-label={`Named on: ${r.platforms.map((p, pi) => `${PLATFORMS[pi]} ${p ? 'yes' : 'no'}`).join(', ')}`}
                >
                  <span aria-hidden="true">
                    {r.platforms.map((p, pi) => (
                      <span key={pi} className={p ? 'text-ink' : 'text-ink/25'}>
                        {p ? '●' : '○'}
                      </span>
                    ))}
                  </span>
                </span>
                <span className={cn(`srb-val-${i}`, 'tnum font-mono text-[0.9rem]', r.you ? 'font-bold text-orange-aa' : 'text-ink')}>
                  0%
                </span>
              </p>
            </div>
            <div className="mt-1.5 h-6 border border-ink/60 bg-paper-2 transition-colors group-hover:bg-paper-2/60 group-focus-visible:bg-paper-2/60">
              <div className={cn(`srb-fill-${i}`, 'h-full', r.you ? 'bg-orange' : 'bg-ink')} style={{ width: '0%' }} />
            </div>
            {r.you && (
              <p className="mt-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-soft">
                appeared once — misattributed to a brand name retired in 2022
              </p>
            )}
            {/* Tooltip: exact query examples (max 3) */}
            <div
              role="tooltip"
              className="pointer-events-none absolute -top-2 left-0 z-20 max-w-full -translate-y-full border border-ink bg-paper px-3 py-2 opacity-0 shadow-[4px_4px_0_rgba(26,26,46,.15)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-soft">NAMED IN QUERIES:</span>
              {r.queries.map((q) => (
                <span key={q} className="block truncate font-mono text-[10.5px] tracking-[0.02em] text-ink">
                  “{q}”
                </span>
              ))}
            </div>
          </div>
        ))}
        <p className="pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/80">
          PLATFORM DOTS: CHATGPT · GEMINI · PERPLEXITY · COPILOT · AI OVERVIEWS
        </p>
      </div>

      {/* Why they're winning */}
      <div className="srb-analysis-grid mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-14">
        <div className="srb-analysis border border-ink/70 bg-paper-2/60 p-6">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink">WHAT THE WINNERS HAVE</h3>
          <ul className="mt-5 space-y-3.5">
            {WINNERS.map((item) => (
              <li key={item} className="srb-check flex items-baseline gap-3 font-mono text-[12.5px] leading-[1.55] text-ink">
                <span aria-hidden="true" className="shrink-0 text-teal-aa">▣</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="srb-analysis border border-ink/70 bg-paper-2/60 p-6">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink">WHAT COMPANY X HAS</h3>
          <ul className="mt-5 space-y-3.5">
            {COMPANYX.map((item) => (
              <li key={item} className="srb-check flex items-baseline gap-3 font-mono text-[12.5px] leading-[1.55] text-ink">
                <span aria-hidden="true" className="shrink-0 text-orange-aa">▨</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
