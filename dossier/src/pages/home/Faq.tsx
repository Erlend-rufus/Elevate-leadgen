import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { cn } from '@/lib/utils'

const QA: { q: string; a: React.ReactNode; plain: string }[] = [
  {
    q: 'What is GEO?',
    plain:
      "Generative Engine Optimisation: making sure AI assistants — ChatGPT, Gemini, Perplexity, Copilot and Google's AI Overviews — describe and recommend your firm accurately when buyers ask. As buyers move from search results to AI answers, that's where visibility has to be earned.",
    a: (
      <>
        Generative Engine Optimisation: making sure AI assistants{' '}
        <em className="font-serif italic text-ink">describe and recommend your firm accurately</em> when buyers ask —
        ChatGPT, Gemini, Perplexity, Copilot and Google's AI Overviews. As buyers move from search results to AI
        answers, that's where visibility has to be earned.
      </>
    ),
  },
  {
    q: 'How is this different from SEO?',
    plain:
      'SEO optimises for a ranked list of links. GEO optimises for the answer itself: the sources AI cites, the facts it repeats, the competitors it names. Different inputs, different levers — and right now, far less competition for them.',
    a: (
      <>
        SEO optimises for a ranked list of links. GEO optimises for{' '}
        <em className="font-serif italic text-ink">the answer itself</em>: the sources AI cites, the facts it repeats,
        the competitors it names. Different inputs, different levers — and right now, far less competition for them.
      </>
    ),
  },
  {
    q: 'Do I need to change my website?',
    plain:
      "Usually less than you'd think. Many of the highest-impact fixes are off-site: citations, directories and the sources AI already trusts. Your audit tells you exactly which lever to pull first.",
    a: (
      <>
        Usually less than you'd think. Many of the highest-impact fixes are{' '}
        <em className="font-serif italic text-ink">off-site: citations, directories and the sources AI already trusts</em>.
        Your audit tells you exactly which lever to pull first.
      </>
    ),
  },
  {
    q: 'How long does the audit take?',
    plain:
      'The audit itself is ready quickly. We go through the findings with you on a short call, so the exact timing depends on when you book it. The walkthrough call is 30 minutes.',
    a: (
      <>
        The audit itself is <em className="font-serif italic text-ink">ready quickly</em>. We go through the findings
        with you on a short call, so the exact timing depends on when you book it. The walkthrough call is 30 minutes.
      </>
    ),
  },
  {
    q: 'Is this really free?',
    plain:
      'Yes — no card, no catch. We already run lead generation for UK IT and MSP firms, and some audits turn into client engagements. Whatever happens, the findings are yours to keep.',
    a: (
      <>
        Yes — <em className="font-serif italic text-ink">no card, no catch</em>. We already run lead generation for UK
        IT and MSP firms, and some audits turn into client engagements. Whatever happens, the findings are yours to
        keep.
      </>
    ),
  },
]

/** S9 — FAQ "Cross-Examination" (paper-2). */
export default function Faq() {
  const root = useRef<HTMLElement>(null)
  const [open, setOpen] = useState<number | null>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        setOpen(0)
        return
      }
      gsap.fromTo(
        '.fq-item',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'snap',
          stagger: 0.08,
          scrollTrigger: { trigger: '.fq-list', start: 'top 78%', once: true },
        },
      )
      // First item auto-opens as an invitation
      const st = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } })
      st.add(() => setOpen(0), 0.4)
    },
    { scope: root },
  )

  return (
    <section ref={root} id="faq" data-nav="paper" className="relative border-t border-line-paper bg-paper-2">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:grid lg:grid-cols-12 lg:gap-10 lg:px-12 lg:py-36">
        {/* Sticky header */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[120px]">
            <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa">
              FILE 07 — CROSS-EXAMINATION
            </p>
            <h2 className="mt-4 font-serif text-[clamp(2.4rem,5.4vw,4.25rem)] font-medium leading-none tracking-[-0.02em] text-ink">
              Straight answers, <em className="italic">on the record.</em>
            </h2>
            <p className="mt-8 font-mono text-[0.72rem] leading-[1.6] tracking-[0.04em] text-ink-soft">
              Anything else?{' '}
              <a href="mailto:post@elevatemarketing.no" className="underline-sweep text-ink">
                post@elevatemarketing.no
              </a>
            </p>
          </div>
        </div>

        {/* Accordion */}
        <div className="fq-list mt-12 lg:col-span-8 lg:mt-0">
          {QA.map((item, i) => {
            const isOpen = open === i
            const qid = `faq-q-${i}`
            const aid = `faq-a-${i}`
            return (
              <div key={item.q} className="fq-item border-b border-line-paper first:border-t">
                <h3>
                  <button
                    type="button"
                    id={qid}
                    aria-expanded={isOpen}
                    aria-controls={aid}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-baseline gap-5 py-6 text-left"
                  >
                    <span
                      className={cn(
                        'tnum shrink-0 font-mono text-[12px] font-medium tracking-[0.1em] transition-colors duration-300',
                        isOpen ? 'text-teal-aa' : 'text-ink-soft/60',
                      )}
                    >
                      Q.0{i + 1}
                    </span>
                    <span className="flex-1 font-sans text-[1.15rem] font-bold leading-[1.3] tracking-[-0.01em] text-ink">
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'font-mono text-[20px] leading-none text-ink transition-transform duration-300 ease-snap',
                        isOpen && 'rotate-45',
                      )}
                    >
                      +
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={aid}
                      role="region"
                      aria-labelledby={qid}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 0.9, 0.24, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-line-paper pb-7 pl-[3.4rem] pr-4 pt-5 leading-[1.65] text-ink-soft">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
