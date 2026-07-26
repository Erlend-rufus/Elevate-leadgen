import { useRef } from 'react'
import { Link } from 'react-router'
import Stamp from '@/components/Stamp'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { cn } from '@/lib/utils'

const PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'AI Overviews']

const ROWS = [
  { name: 'Northbeam IT', value: 78, platforms: [true, true, true, true, false] },
  { name: 'Corelan Systems', value: 64, platforms: [true, true, false, true, true] },
  { name: 'HexGuard Security', value: 51, platforms: [true, false, true, true, false] },
  { name: 'BrightByte', value: 43, platforms: [false, true, true, false, true] },
  { name: 'YOUR COMPANY', value: 4, platforms: [false, false, true, false, false], you: true },
]

/** S4 — EXHIBIT B "The Line-Up": mention-share bar race (paper). */
export default function ExhibitB() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      if (reduced) {
        ROWS.forEach((r) => {
          const fill = root.current?.querySelector<HTMLElement>(`.eb-fill-${cssEscape(r.name)}`)
          const val = root.current?.querySelector<HTMLElement>(`.eb-val-${cssEscape(r.name)}`)
          if (fill) fill.style.width = `${r.value}%`
          if (val) val.textContent = `${r.value}%`
        })
        gsap.set('.eb-you-bar', { scaleX: 0 })
        gsap.set('.eb-you-note', { opacity: 1 })
        return
      }

      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.eb-chart', start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
      })

      ROWS.forEach((r, i) => {
        const pos = i * 0.12
        const cls = cssEscape(r.name)
        tl.fromTo(`.eb-fill-${cls}`, { width: '0%' }, { width: `${r.value}%`, duration: 0.5, ease: 'none' }, pos)
        const valEl = root.current?.querySelector<HTMLElement>(`.eb-val-${cls}`)
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

      // "YOUR COMPANY" redaction holds until the final 20% of the scrub
      tl.to('.eb-you-bar', { scaleX: 0, duration: 0.12, ease: 'wipe', transformOrigin: 'right center' }, 0.8)
        .fromTo('.eb-you-note', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.88)
    },
    { scope: root },
  )

  return (
    <section ref={root} id="exhibit-b" data-nav="paper" className="relative bg-paper">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-12 lg:py-36">
        {/* Header */}
        <div className="lg:col-span-6">
          <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa">
            EXHIBIT B — THE LINE-UP
          </p>
          <h2 className="mt-4 font-serif text-[clamp(2.4rem,5.4vw,4.25rem)] font-medium leading-none tracking-[-0.02em] text-ink">
            Who does the AI recommend <em className="italic">instead of you?</em>
          </h2>
        </div>
        <div className="mt-8 lg:col-span-5 lg:col-start-8 lg:mt-2">
          <p className="max-w-[62ch] text-[1.125rem] leading-[1.65] text-ink-soft">
            We ask ChatGPT, Gemini, Perplexity, Copilot and Google AI Overviews the questions your buyers ask — then
            we look at who gets named. Here's an illustrative example for a Manchester MSP:
          </p>
        </div>

        {/* Chart */}
        <div className="relative mt-14 lg:col-span-8 lg:mt-20">
          <Stamp color="ink" className="absolute -top-5 right-0 z-10 bg-paper">
            ILLUSTRATIVE EXAMPLE
          </Stamp>
          <div className="eb-chart space-y-5 border border-line-paper bg-paper p-6 md:p-8">
            {ROWS.map((r) => (
              <div key={r.name} className="eb-row group relative" tabIndex={0}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className={cn('font-sans text-[15px] font-bold tracking-[-0.01em]', r.you ? 'text-orange-aa' : 'text-ink')}>
                    {r.name}
                  </p>
                  <p className={cn('eb-val-' + cssEscape(r.name), 'tnum font-mono text-[0.9rem]', r.you ? 'font-bold text-orange-aa' : 'text-ink')}>
                    0%
                  </p>
                </div>
                <div className="mt-1.5 h-6 border border-ink/60 bg-paper-2 transition-colors group-hover:bg-paper-2/60 group-focus-visible:bg-paper-2/60">
                  <div
                    className={cn('eb-fill-' + cssEscape(r.name), 'h-full', r.you ? 'bg-orange' : 'bg-ink')}
                    style={{ width: '0%' }}
                  />
                </div>
                {r.you && (
                  <>
                    <span
                      aria-hidden="true"
                      className="eb-you-bar absolute left-0 top-[1.9rem] h-6 w-full origin-right bg-ink md:top-[1.85rem]"
                    >
                      <span className="sr-only">Redacted</span>█
                    </span>
                    <p className="eb-you-note mt-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-soft opacity-0">
                      mentioned once, misattributed to a former brand name
                    </p>
                  </>
                )}
                {/* Tooltip: platform mentions */}
                <div
                  role="tooltip"
                  className="pointer-events-none absolute -top-9 left-0 z-20 flex items-center gap-1.5 border border-ink bg-paper px-2.5 py-1.5 opacity-0 shadow-[4px_4px_0_rgba(26,26,46,.15)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {r.you ? (
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink">
                      This is where the audit starts.
                    </span>
                  ) : (
                    <>
                      {r.platforms.map((on, pi) => (
                        <span
                          key={pi}
                          title={PLATFORMS[pi]}
                          aria-label={`${PLATFORMS[pi]}: ${on ? 'mentioned' : 'not mentioned'}`}
                          className={cn('size-2.5 rounded-full', on ? 'bg-teal' : 'bg-ink/20')}
                        />
                      ))}
                      <span className="ml-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
                        named on {r.platforms.filter(Boolean).length} platforms
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
            <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft/80">
              ILLUSTRATIVE SAMPLE — HOW AI ANSWERS BUYER-STYLE QUESTIONS
            </p>
          </div>
        </div>

        {/* Aside */}
        <aside className="mt-12 lg:col-span-4 lg:mt-24">
          <div className="border-l-2 border-orange pl-5">
            <p className="font-mono text-[0.72rem] leading-[1.6] tracking-[0.04em] text-ink-soft">
              Many firms assume they're "kind of visible". The AI answers often say otherwise.
            </p>
            <Link
              to="/sample-report"
              data-event="sample_report_view"
              className="group mt-4 inline-block font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-orange-aa"
            >
              See the full sample report{' '}
              <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">↗</span>
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}

function cssEscape(s: string) {
  return s.replace(/[^a-zA-Z0-9]/g, '-')
}
