import { useRef } from 'react'
import DocCard from '@/components/DocCard'
import Stamp from '@/components/Stamp'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { typeformUrl } from '@/lib/typeform'

const CHECKLIST = [
  'How AI assistants describe your firm today',
  'Whether you appear when buyers ask in your area or niche',
  'The gaps keeping you out of AI answers',
  'A prioritised list of fixes, in plain English',
]

/** S8 — FORM 06 "Request for Assessment" (paper). The CTA links out to the Typeform. */
export default function AuditForm() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '.af-check',
        { x: -20, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'snap',
          stagger: 0.08,
          scrollTrigger: { trigger: '.af-checklist', start: 'top 78%', once: true },
        },
      )
      gsap.fromTo(
        '.af-tick',
        { color: 'rgba(26,26,46,.2)' },
        {
          color: 'var(--teal-aa)',
          duration: 0.3,
          stagger: 0.08,
          scrollTrigger: { trigger: '.af-checklist', start: 'top 78%', once: true },
        },
      )
      gsap.fromTo(
        '.af-doc',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'snap', scrollTrigger: { trigger: '.af-doc', start: 'top 80%', once: true } },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} id="form" data-nav="paper" className="relative border-t border-line-paper bg-paper">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:grid lg:grid-cols-12 lg:gap-10 lg:px-12 lg:py-36">
        {/* Persuasion panel */}
        <div className="relative lg:col-span-5">
          <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa">
            FORM 06 — REQUEST FOR ASSESSMENT
          </p>
          <h2 className="mt-4 font-serif text-[clamp(2.4rem,5.4vw,4.25rem)] font-medium leading-none tracking-[-0.02em] text-ink">
            Open your <em className="italic">case file.</em>
          </h2>
          <p className="mt-6 max-w-[52ch] text-[1.125rem] leading-[1.65] text-ink-soft">
            Free. Fixed scope. If we're not the right people to fix what we find, we'll say so.
          </p>
          <ul className="af-checklist mt-8 space-y-3.5">
            {CHECKLIST.map((c) => (
              <li key={c} className="af-check flex items-center gap-3 font-mono text-[13px] tracking-[0.02em] text-ink">
                <span aria-hidden="true" className="af-tick text-[15px] text-teal-aa">▣</span>
                {c}
              </li>
            ))}
          </ul>
          <Stamp color="orange" className="mt-10 lg:absolute lg:-bottom-4 lg:left-2 lg:mt-0">
            FREE — NO CARD REQUIRED
          </Stamp>
        </div>

        {/* CTA document */}
        <div className="af-doc mt-16 lg:col-span-7 lg:mt-0">
          <DocCard fileNo="FORM 06 — GEO AUDIT REQUEST" className="hover:translate-y-0 hover:shadow-none">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              REF: GEO-26-____
            </p>
            <p className="max-w-[46ch] text-[1.05rem] leading-[1.65] text-ink-soft">
              The request takes two minutes. We go through the findings with you on a short walkthrough call — they are yours to keep either way.
            </p>
            <div className="mt-8">
              <a
                href={typeformUrl()}
                data-event="cta_form"
                data-cursor="OPEN →"
                className="group flex h-14 w-full items-center justify-center border-2 border-ink bg-orange font-sans text-[15px] font-bold tracking-[0.02em] text-ink shadow-[4px_4px_0_var(--ink)] transition-all [transition-duration:.18s] ease-snap hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0_0_0_var(--ink)] active:scale-[0.98]"
              >
                Get My Free Audit{' '}
                <span aria-hidden="true" className="ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
              </a>
              <p className="mt-3 text-center font-mono text-[11px] tracking-[0.04em] text-ink-soft">
                We never share your data. Unsubscribe anytime.
              </p>
            </div>
          </DocCard>
        </div>
      </div>
    </section>
  )
}
