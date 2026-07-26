import { useRef } from 'react'
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '@/lib/gsap'
import { SectionHeader } from './shared'

const SCORE = 23
const CX = 110
const CY = 108
const R = 88
const LEN = Math.PI * R // semicircle arc length ≈ 276.46

function polar(v: number, r: number): [number, number] {
  const a = Math.PI * (1 - v / 100)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

function arc(v0: number, v1: number, r: number): string {
  const [x0, y0] = polar(v0, r)
  const [x1, y1] = polar(v1, r)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${v1 - v0 > 50 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

const MINI_SCORES = [
  { name: 'ChatGPT', v: 18 },
  { name: 'Gemini', v: 27 },
  { name: 'Perplexity', v: 31 },
  { name: 'Copilot', v: 19 },
  { name: 'AIO', v: 21 },
]

/** S3 — 01 Executive Summary: verdict copy + Visibility Score gauge (sample-report.md §S3). */
export default function ExecutiveSummary() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      const arcEl = root.current?.querySelector<SVGPathElement>('.sr-gauge-arc')
      const needleEl = root.current?.querySelector<SVGGElement>('.sr-gauge-needle')
      const numEl = root.current?.querySelector<HTMLElement>('.sr-gauge-num')
      const finalDeg = 180 * (1 - SCORE / 100)

      if (reduced) {
        if (arcEl) {
          arcEl.style.strokeDasharray = `${LEN}`
          arcEl.style.strokeDashoffset = `${LEN * (1 - SCORE / 100)}`
        }
        if (needleEl) needleEl.setAttribute('transform', `rotate(${finalDeg} ${CX} ${CY})`)
        if (numEl) numEl.textContent = String(SCORE)
        return
      }

      // Verdict paragraphs: mask-up per line
      const verdictEl = root.current?.querySelector<HTMLElement>('.sr-verdict')
      const split = verdictEl ? SplitText.create(verdictEl, { type: 'lines', mask: 'lines' }) : null
      if (!split) return
      gsap.fromTo(
        split.lines,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 0.9,
          ease: 'snap',
          stagger: 0.05,
          scrollTrigger: { trigger: '.sr-verdict', start: 'top 78%', once: true },
        },
      )

      // Examiner's note: hairline draws, quote slides from right
      const noteTl = gsap.timeline({
        scrollTrigger: { trigger: '.sr-examiner-note', start: 'top 78%', once: true },
      })
      noteTl
        .fromTo('.sr-examiner-rule', { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'wipe', transformOrigin: 'left center' })
        .fromTo('.sr-examiner-quote', { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'snap' }, 0.15)

      // Gauge: arc + needle sweep 0→23, number counts in sync; labels fade after settle
      const gaugeTl = gsap.timeline({
        scrollTrigger: { trigger: '.sr-gauge', start: 'top 70%', once: true },
      })
      if (arcEl) {
        arcEl.style.strokeDasharray = `${LEN}`
        arcEl.style.strokeDashoffset = `${LEN}`
      }
      if (needleEl) needleEl.setAttribute('transform', `rotate(180 ${CX} ${CY})`)

      const counter = { v: 0 }
      gaugeTl
        .to(arcEl ?? {}, { strokeDashoffset: LEN * (1 - SCORE / 100), duration: 1.4, ease: 'power2.out' }, 0)
        .to(needleEl ?? {}, { rotation: finalDeg, duration: 1.4, ease: 'power2.out', svgOrigin: `${CX} ${CY}` }, 0)
        .to(
          counter,
          {
            v: SCORE,
            duration: 1.4,
            ease: 'power2.out',
            onUpdate: () => {
              if (numEl) numEl.textContent = String(Math.round(counter.v))
            },
          },
          0,
        )
        .fromTo('.sr-gauge-zonelabel', { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.08 }, 1.45)

      return () => {
        split.revert()
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="report-summary" data-nav="paper" aria-label="Executive summary" className="px-5 py-16 md:px-8 lg:py-24">
      <SectionHeader index="01" title="Executive summary." />

      <div className="mt-10 grid grid-cols-1 gap-12 min-[820px]:grid-cols-12 min-[820px]:gap-8 lg:mt-14">
        {/* Verdict copy */}
        <div className="min-[820px]:col-span-7">
          <p className="sr-verdict max-w-[62ch] text-[1.125rem] leading-[1.65] text-ink-soft">
            Company X ranks on page one of Google for “IT support Manchester”. Google can see them.{' '}
            <strong className="font-bold text-ink">The AIs cannot.</strong> Across 52 buyer-style queries on five
            platforms, Company X was named in answers just <strong className="font-bold text-ink">4 times</strong> —
            and three of those four carried factual errors. Four competitors are being recommended in their place, in
            answers being read right now by the buyers Company X wants most.
          </p>

          {/* Examiner's note */}
          <aside className="sr-examiner-note mt-10 max-w-[62ch]">
            <div className="sr-examiner-rule h-px w-full bg-line-paper" />
            <p className="mt-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-ink-soft">
              EXAMINER'S NOTE
            </p>
            <blockquote className="sr-examiner-quote mt-3 font-serif text-[clamp(1.6rem,3vw,2.4rem)] font-medium italic leading-[1.1] tracking-[-0.01em] text-orange-aa">
              “Page one on Google. A footnote to the machines.”
            </blockquote>
          </aside>
        </div>

        {/* Gauge */}
        <div className="min-[820px]:col-span-5">
          <div className="min-[820px]:sticky min-[820px]:top-[120px]">
            <div
              className="sr-gauge group relative border border-ink/70 bg-paper-2/40 px-5 pb-6 pt-5"
              tabIndex={0}
              role="img"
              aria-label={`Illustrative visibility gauge: ${SCORE} out of 100, in the “at risk” zone. Example data for a fictional firm. Per-platform: ChatGPT 18, Gemini 27, Perplexity 31, Copilot 19, AI Overviews 21.`}
            >
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-ink-soft">
                EXHIBIT 01-A — VISIBILITY (ILLUSTRATIVE)
              </p>

              {/* Hover tooltip: per-platform mini-scores */}
              <div
                role="tooltip"
                className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-ink bg-paper px-3 py-2 opacity-0 shadow-[4px_4px_0_rgba(26,26,46,.15)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.04em] text-ink">
                  {MINI_SCORES.map((m, i) => (
                    <span key={m.name} className="flex items-center gap-1">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-teal-aa" />
                      {m.name} <span className="tnum font-bold">{m.v}</span>
                      {i < MINI_SCORES.length - 1 && <span aria-hidden="true" className="ml-1 text-ink/30">·</span>}
                    </span>
                  ))}
                </span>
              </div>

              <svg viewBox="0 0 220 132" className="mt-3 w-full" aria-hidden="true">
                {/* Track hairline */}
                <path d={arc(0, 100, R)} fill="none" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="1" />
                {/* Zones: 0–40 AT RISK / 40–70 PARTIAL / 70–100 RECOMMENDED */}
                <path d={arc(0, 40, R)} fill="none" stroke="var(--orange)" strokeOpacity="0.35" strokeWidth="10" />
                <path d={arc(40, 70, R)} fill="none" stroke="var(--ink)" strokeOpacity="0.18" strokeWidth="10" />
                <path d={arc(70, 100, R)} fill="none" stroke="var(--teal)" strokeOpacity="0.45" strokeWidth="10" />
                {/* Zone boundary ticks */}
                {[0, 40, 70, 100].map((v) => {
                  const [x0, y0] = polar(v, R - 6)
                  const [x1, y1] = polar(v, R - 14)
                  return (
                    <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--ink)" strokeOpacity="0.5" strokeWidth="1.5" />
                  )
                })}
                {/* Score arc (animated) */}
                <path
                  className="sr-gauge-arc"
                  d={arc(0, 100, R)}
                  fill="none"
                  stroke="var(--orange)"
                  strokeWidth="10"
                  strokeDasharray={`0 ${LEN}`}
                />
                {/* Needle */}
                <g className="sr-gauge-needle" transform={`rotate(180 ${CX} ${CY})`}>
                  <line x1={CX} y1={CY} x2={CX + R - 16} y2={CY} stroke="var(--ink)" strokeWidth="2.5" />
                  <circle cx={CX} cy={CY} r="5" fill="var(--ink)" />
                </g>
                {/* Zone labels */}
                <text x="34" y="127" textAnchor="middle" className="sr-gauge-zonelabel" fontSize="7.5" letterSpacing="1" fill="var(--ink-soft)" fontFamily="'JetBrains Mono', monospace">
                  AT RISK
                </text>
                <text x={CX} y="10" textAnchor="middle" className="sr-gauge-zonelabel" fontSize="7.5" letterSpacing="1" fill="var(--ink-soft)" fontFamily="'JetBrains Mono', monospace">
                  PARTIAL
                </text>
                <text x="186" y="127" textAnchor="middle" className="sr-gauge-zonelabel" fontSize="7.5" letterSpacing="1" fill="var(--ink-soft)" fontFamily="'JetBrains Mono', monospace">
                  RECOMMENDED
                </text>
              </svg>

              <div className="-mt-5 text-center">
                <span className="sr-gauge-num tnum font-serif text-[3.5rem] font-medium leading-none text-ink">0</span>
                <span className="ml-2 font-mono text-[11px] font-medium tracking-[0.18em] text-ink-soft">
                  /100 VISIBILITY
                </span>
              </div>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft/80">
                ILLUSTRATIVE EXAMPLE — INVENTED DATA
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
