import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    n: '01',
    title: 'Submit your details',
    body: "Two minutes. Name, work email, website — and one competitor, if you like. That's all we need to open the file.",
    chip: '2 MIN',
  },
  {
    n: '02',
    title: 'We run the audit',
    body: 'We put the questions your buyers actually ask to the major AI platforms and log every answer — how you are described, where you appear, and where you are absent.',
    chip: 'READY QUICKLY',
  },
  {
    n: '03',
    title: 'Walk through the findings',
    body: 'A free 30-minute call. We go through what we found and answer anything. The exact timing depends on when you book.',
    chip: '30 MIN · FREE',
  },
  {
    n: '04',
    title: 'Keep the findings',
    body: "The findings are yours to keep, whatever happens next. If we're not the right people to fix what we find, we'll say so.",
    chip: 'YOURS TO KEEP',
  },
]

/** Dashed connector segment: grey dashed rail + teal draw line (scrubbed). */
function Connector({ vertical = false, first = false }: { vertical?: boolean; first?: boolean }) {
  if (vertical) {
    return (
      <svg aria-hidden="true" className="absolute -left-6 top-0 h-full w-[2px] overflow-visible lg:hidden" preserveAspectRatio="none">
        <line x1="1" y1="0" x2="1" y2="100%" pathLength={1} className="ed-rail stroke-ink/30" strokeWidth={2} strokeDasharray="0.012 0.018" vectorEffect="non-scaling-stroke" />
        <line x1="1" y1="0" x2="1" y2="100%" pathLength={1} className="ed-draw stroke-teal" strokeWidth={2} strokeDasharray={1} strokeDashoffset={first ? 1 : 1} vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" className="ed-conn absolute -left-1/2 top-[26px] hidden h-[2px] w-full overflow-visible lg:block" preserveAspectRatio="none">
      <line x1="0" y1="1" x2="100%" y2="1" pathLength={1} className="ed-rail stroke-ink/30" strokeWidth={2} strokeDasharray="0.012 0.018" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="1" x2="100%" y2="1" pathLength={1} className="ed-draw stroke-teal" strokeWidth={2} strokeDasharray={1} strokeDashoffset={1} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** S6 — EXHIBIT D "Chain of Custody": 4-step process (paper-2). */
export default function ExhibitD() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      if (reduced) {
        gsap.set('.ed-draw', { strokeDashoffset: 0 })
        gsap.set('.ed-num', { color: 'var(--ink)' })
        gsap.set('.ed-chip', { scale: 1, opacity: 1 })
        return
      }
      const tl = gsap.timeline({
        defaults: { ease: 'snap' },
        scrollTrigger: { trigger: '.ed-track', start: 'top 70%', end: 'bottom 55%', scrub: true },
      })
      // The custody line draws across; each step activates as it arrives.
      STEPS.forEach((_, i) => {
        const pos = i * 0.25
        tl.to(`.ed-step-${i} .ed-draw`, { strokeDashoffset: 0, duration: 0.25, ease: 'none' }, pos)
          .to(`.ed-step-${i} .ed-num`, { color: 'var(--ink)', duration: 0.08 }, pos + 0.12)
          .fromTo(`.ed-step-${i} .ed-title-inner`, { yPercent: 110 }, { yPercent: 0, duration: 0.1 }, pos + 0.12)
          .fromTo(
            `.ed-step-${i} .ed-chip`,
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.1, ease: 'thump' },
            pos + 0.18,
          )
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="exhibit-d" data-nav="paper" className="relative border-t border-line-paper bg-paper-2">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-12 lg:py-36">
        <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa">
          EXHIBIT D — CHAIN OF CUSTODY
        </p>
        <h2 className="mt-4 max-w-3xl font-serif text-[clamp(2.4rem,5.4vw,4.25rem)] font-medium leading-none tracking-[-0.02em] text-ink">
          From form to findings in <em className="italic">four steps.</em>
        </h2>

        <div className="ed-track mt-16 grid grid-cols-1 gap-12 pl-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:pl-0">
          {STEPS.map((s, i) => (
            <div key={s.n} className={cn('ed-step group relative', `ed-step-${i}`)}>
              {/* Vertical rail on mobile/tablet */}
              <Connector vertical first={i === 0} />
              {/* Horizontal connector desktop */}
              {i > 0 && <Connector />}
              {i === 0 && (
                <svg aria-hidden="true" className="absolute -left-8 top-[26px] hidden h-[2px] w-8 overflow-visible lg:block" preserveAspectRatio="none">
                  <line x1="0" y1="1" x2="100%" y2="1" pathLength={1} className="ed-rail stroke-ink/30" strokeWidth={2} strokeDasharray="0.012 0.018" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1="1" x2="100%" y2="1" pathLength={1} className="ed-draw stroke-teal" strokeWidth={2} strokeDasharray={1} strokeDashoffset={1} vectorEffect="non-scaling-stroke" />
                </svg>
              )}
              <p className="ed-num relative z-10 -ml-1 inline-block bg-paper-2 pl-1 pr-3 tnum font-mono text-[3rem] font-bold leading-none" style={{ color: 'rgba(26,26,46,.2)' }}>
                {s.n}
              </p>
              <h3 className="mask-line mt-4">
                <span className="mask-inner ed-title-inner font-sans text-[clamp(1.25rem,2vw,1.6rem)] font-bold leading-[1.2] tracking-[-0.01em] text-ink">
                  {s.title}
                </span>
              </h3>
              <p className="mt-3 leading-[1.65] text-ink-soft">{s.body}</p>
              <span className="ed-chip mt-5 inline-block border border-ink/50 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink opacity-0">
                {s.chip}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
