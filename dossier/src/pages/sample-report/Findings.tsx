import { useRef } from 'react'
import type { ReactNode } from 'react'
import DocCard from '@/components/DocCard'
import Redact from '@/components/Redact'
import Stamp from '@/components/Stamp'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { SectionHeader } from './shared'

type Finding = {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  stampColor: 'orange' | 'ink' | 'teal-aa'
  no: string
  title: string
  body: string
  evidence: ReactNode
  evidenceLabel: string
  note?: string
}

/** peek redaction with the mono "HOVER TO DECLASSIFY" tag on the bar (sample-report.md §S6). */
function Declassify({ children }: { children: string }) {
  return (
    <span className="group/declassify relative inline-block">
      <Redact mode="peek">{children}</Redact>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover/declassify:opacity-0 group-focus-within/declassify:opacity-0"
      >
        <span className="whitespace-nowrap bg-ink px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-paper">
          HOVER TO DECLASSIFY
        </span>
      </span>
    </span>
  )
}

const FINDINGS: Finding[] = [
  {
    severity: 'CRITICAL',
    stampColor: 'orange',
    no: 'FINDING 01',
    title: 'AI is quoting retired pricing.',
    body: 'Perplexity and Gemini both cite a pricing page taken offline in 2023 — quoting long-retired figures to every prospect who asks.',
    evidence: (
      <>
        &gt; “Company X's managed plans start at <Declassify>[retired price]</Declassify>…”
      </>
    ),
    evidenceLabel: 'Quote: "Company X\'s managed plans start at [retired price]…"',
    note: 'SOURCE: CACHED PAGE, REMOVED 2023',
  },
  {
    severity: 'CRITICAL',
    stampColor: 'orange',
    no: 'FINDING 02',
    title: 'Misattributed brand.',
    body: "ChatGPT attributes Company X's flagship case study to a similarly named firm in Leeds. The answer names the wrong company with full confidence.",
    evidence: (
      <>
        &gt; “<Declassify>XServe Ltd</Declassify> delivered a 400-seat migration…”
      </>
    ),
    evidenceLabel: 'Quote: "XServe Ltd delivered a 400-seat migration…"',
    note: 'WRONG COMPANY — SAME SECTOR, SAME CITY',
  },
  {
    severity: 'HIGH',
    stampColor: 'ink',
    no: 'FINDING 03',
    title: 'Directory silence.',
    body: 'The three directories ChatGPT cites most for "MSP Manchester" queries list all four competitors. Company X appears in none. This alone likely explains the ChatGPT absence.',
    evidence: (
      <>
        SOURCES CHECKED: <Declassify>▓▓▓▓▓▓▓</Declassify> — 0/3 LISTINGS
      </>
    ),
    evidenceLabel: 'Sources checked: directory names redacted — 0 of 3 listings',
  },
  {
    severity: 'MEDIUM',
    stampColor: 'teal-aa',
    no: 'FINDING 04',
    title: 'No machine-readable identity.',
    body: 'No Organization schema, no consistent NAP, no sameAs links. AI has to guess who Company X is — and guessing is where the errors come from.',
    evidence: <>SCHEMA DETECTED: NONE · NAP VARIANTS FOUND: 5</>,
    evidenceLabel: 'Schema detected: none. NAP variants found: 5',
  },
]

/** S6 — 04 Key Findings: severity cards (sample-report.md §S6). */
export default function Findings() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return

      // Cards stagger up
      gsap.fromTo(
        '.srf-card',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'snap',
          stagger: 0.12,
          scrollTrigger: { trigger: '.srf-grid', start: 'top 75%', once: true },
        },
      )

      // Evidence lines type in (stepped clip-path ≈ 20ms/char) when card is ~60% visible
      gsap.utils.toArray<HTMLElement>('.srf-evidence').forEach((el) => {
        const steps = 48
        gsap.fromTo(
          el,
          { clipPath: 'inset(0 100% 0 0)' },
          {
            clipPath: 'inset(0 0% 0 0)',
            duration: steps * 0.02,
            ease: `steps(${steps})`,
            scrollTrigger: { trigger: el, start: 'top 62%', once: true },
          },
        )
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="report-findings" data-nav="paper" aria-label="Key findings" className="border-t border-line-paper px-5 py-16 md:px-8 lg:py-24">
      <SectionHeader index="04" title="Seven errors, four findings that matter" />

      <div className="srf-grid mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-14">
        {FINDINGS.map((f) => (
          <div key={f.no} className="srf-card">
            <DocCard
              fileNo={f.no}
              stamp={
                <Stamp color={f.stampColor} rotate={-8}>
                  {f.severity}
                </Stamp>
              }
              meta={f.note}
              className="h-full"
            >
              <h3 className="font-sans text-[clamp(1.25rem,2vw,1.6rem)] font-bold leading-[1.2] tracking-[-0.01em] text-ink">
                {f.title}
              </h3>
              <p className="mt-3 leading-[1.65] text-ink-soft">{f.body}</p>
              <p
                className="srf-evidence mt-5 overflow-x-auto whitespace-nowrap border-l-2 border-ink/40 bg-paper-2/60 px-3 py-2.5 font-mono text-[12px] leading-[1.55] text-ink"
                aria-label={f.evidenceLabel}
              >
                {f.evidence}
              </p>
            </DocCard>
          </div>
        ))}
      </div>
    </section>
  )
}
