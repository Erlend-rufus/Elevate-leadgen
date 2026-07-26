import { useRef } from 'react'
import { Link } from 'react-router'
import DocCard from '@/components/DocCard'
import Stamp from '@/components/Stamp'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'

const CARDS = [
  {
    file: 'FILE 01',
    stamp: 'FINDINGS',
    stampColor: 'orange' as const,
    title: 'How AI Describes You Today',
    body: 'We put the questions your buyers actually ask to ChatGPT, Gemini, Perplexity, Copilot and Google AI Overviews — and document how they describe your firm, and whether you appear at all.',
    meta: 'EVERY MENTION · EVERY OMISSION · EVERY MISSTATEMENT',
    rotate: -3,
  },
  {
    file: 'FILE 02',
    stamp: 'GAPS',
    stampColor: 'ink' as const,
    title: 'The Gaps Keeping You Out',
    body: 'See who the AIs name when buyers ask in your area or niche, and what keeps your firm out of the answers. Documented, not guessed.',
    meta: 'WHO APPEARS · WHERE YOU ARE ABSENT · WHY',
    rotate: 0,
  },
  {
    file: 'FILE 03',
    stamp: 'FIXES',
    stampColor: 'teal-aa' as const,
    title: 'What to Fix First',
    body: 'A prioritised list of fixes, in plain English: the facts to correct, the sources to earn, and where to start. Ordered by impact.',
    meta: 'PRIORITISED · PLAIN ENGLISH · YOURS TO KEEP',
    rotate: 3,
  },
]

/** S5 — EXHIBIT C "What You Get": three DocCards fanned in (paper). */
export default function ExhibitC() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        gsap.fromTo(
          '.ec-card',
          { rotate: (i) => CARDS[i].rotate, y: 60, opacity: 0 },
          {
            rotate: 0,
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'snap',
            stagger: 0.12,
            scrollTrigger: { trigger: '.ec-cards', start: 'top 70%', once: true },
          },
        )
      })
      mm.add('(max-width: 1023px)', () => {
        gsap.fromTo(
          '.ec-card',
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: 'snap',
            stagger: 0.12,
            scrollTrigger: { trigger: '.ec-cards', start: 'top 75%', once: true },
          },
        )
      })
      gsap.fromTo(
        '.ec-banner',
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.6,
          ease: 'wipe',
          scrollTrigger: { trigger: '.ec-banner', start: 'top 78%', once: true },
        },
      )
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} id="exhibit-c" data-nav="paper" className="relative border-t border-line-paper bg-paper">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-12 lg:py-36">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa">
              EXHIBIT C — THE DELIVERABLES
            </p>
            <h2 className="mt-4 font-serif text-[clamp(2.4rem,5.4vw,4.25rem)] font-medium leading-none tracking-[-0.02em] text-ink">
              Your audit, <em className="italic">in evidence.</em>
            </h2>
          </div>
          <div className="mt-8 lg:col-span-5 lg:mt-2 lg:text-right">
            <p className="text-[1.125rem] leading-[1.65] text-ink-soft lg:ml-auto lg:max-w-[42ch]">
              A free, fixed-scope audit. One picture: how AI describes you today, who it names instead,
              and what to fix first.
            </p>
          </div>
        </div>

        <div className="ec-cards mt-14 grid grid-cols-1 gap-6 md:gap-5 lg:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.file} className="ec-card">
              <DocCard
                fileNo={c.file}
                stamp={<Stamp color={c.stampColor} className="text-[0.7rem]">{c.stamp}</Stamp>}
                meta={c.meta}
                className="h-full"
              >
                <h3 className="font-sans text-[clamp(1.25rem,2vw,1.6rem)] font-bold leading-[1.2] tracking-[-0.01em] text-ink">
                  {c.title}
                </h3>
                <p className="mt-4 leading-[1.65] text-ink-soft">{c.body}</p>
              </DocCard>
            </div>
          ))}
        </div>

        {/* Secondary CTA banner */}
        <div className="ec-banner mt-12 flex flex-col items-start gap-5 border border-ink/60 bg-paper-2 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink-soft">
            EXHIBIT C.1 — SEE IT FIRST
          </p>
          <p className="font-serif text-[1.15rem] italic leading-snug text-ink md:max-w-[38ch]">
            See exactly what your audit findings look like before you commit two minutes.
          </p>
          <Link
            to="/sample-report"
            data-event="sample_report_view"
            className="group relative inline-flex h-12 shrink-0 items-center overflow-hidden border-2 border-ink px-6 font-sans text-[14px] font-bold text-ink transition-colors duration-200"
          >
            <span aria-hidden="true" className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform [transition-duration:.25s] ease-wipe group-hover:scale-x-100" />
            <span className="relative transition-colors duration-200 group-hover:text-paper">See a sample audit report ↗</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
