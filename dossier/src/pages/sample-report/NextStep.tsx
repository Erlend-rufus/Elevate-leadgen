import { useRef } from 'react'
import { Link } from 'react-router'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { typeformUrl } from '@/lib/typeform'

/** S8 — 06 Your Next Step: navy interrogation-room panel closing the file (sample-report.md §S8). */
export default function NextStep() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return

      // Panel fades to navy on entry
      gsap.fromTo(
        '.srn-vignette',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          ease: 'power1.out',
          scrollTrigger: { trigger: '.srn-panel', start: 'top 75%', once: true },
        },
      )

      // Headline masks
      gsap.fromTo(
        '.srn-line',
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 0.9,
          ease: 'snap',
          stagger: 0.09,
          scrollTrigger: { trigger: '.srn-panel', start: 'top 72%', once: true },
        },
      )

      // The "?" pulses once (1 → 1.15 → 1, thump)
      gsap.fromTo(
        '.srn-q',
        { scale: 1 },
        {
          scale: 1.15,
          duration: 0.19,
          ease: 'thump',
          yoyo: true,
          repeat: 1,
          transformOrigin: 'center center',
          scrollTrigger: { trigger: '.srn-panel', start: 'top 70%', once: true },
        },
      )

      // CTA rises
      gsap.fromTo(
        '.srn-ctas',
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'snap',
          delay: 0.3,
          scrollTrigger: { trigger: '.srn-panel', start: 'top 65%', once: true },
        },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} id="report-next-step" data-nav="navy" aria-label="Your next step" className="border-t border-line-paper px-5 py-16 md:px-8 lg:py-20">
      <div className="srn-panel on-navy relative overflow-hidden border border-ink bg-navy">
        {/* Navy vignette fades in on entry */}
        <div aria-hidden="true" className="srn-vignette console-vignette absolute inset-0" />
        <div aria-hidden="true" className="grain-screen" />

        <div className="relative grid grid-cols-1 gap-10 px-6 py-10 md:px-10 md:py-12 lg:grid-cols-12 lg:gap-8">
          {/* Copy */}
          <div className="lg:col-span-7">
            <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-teal">
              06 — YOUR NEXT STEP
            </p>
            <h2 className="mt-5 font-serif text-[clamp(2rem,4.4vw,3.5rem)] font-medium leading-[1.02] tracking-[-0.02em] text-paper-on-navy">
              <span className="mask-line">
                <span className="mask-inner srn-line">This is Company X's file.</span>
              </span>
              <span className="mask-line">
                <span className="mask-inner srn-line italic text-teal">Yours is a two-minute request away.</span>
              </span>
            </h2>
            <p className="mt-6 max-w-[58ch] text-[1.125rem] leading-[1.65] text-paper-on-navy/70">
              Free, fixed scope, findings yours to keep either way. If AI already describes you well, we'll
              tell you that too.
            </p>
          </div>

          {/* Score teaser */}
          <div className="lg:col-span-5">
            <div className="mx-auto max-w-[260px] border border-line-navy px-6 pb-6 pt-5 lg:ml-auto lg:mr-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-paper-on-navy/60">
                EXHIBIT 06-A — UNEXAMINED
              </p>
              <div className="relative mt-2">
                <svg viewBox="0 0 120 68" className="w-full" aria-hidden="true">
                  <path
                    d="M 12 60 A 48 48 0 0 1 108 60"
                    fill="none"
                    stroke="var(--paper-on-navy)"
                    strokeOpacity="0.35"
                    strokeWidth="1.5"
                    strokeDasharray="3 4"
                  />
                  {[0, 50, 100].map((v) => {
                    const a = Math.PI * (1 - v / 100)
                    const x0 = 60 + 42 * Math.cos(a)
                    const y0 = 60 - 42 * Math.sin(a)
                    const x1 = 60 + 48 * Math.cos(a)
                    const y1 = 60 - 48 * Math.sin(a)
                    return (
                      <line
                        key={v}
                        x1={x0}
                        y1={y0}
                        x2={x1}
                        y2={y1}
                        stroke="var(--paper-on-navy)"
                        strokeOpacity="0.5"
                        strokeWidth="1.5"
                      />
                    )
                  })}
                </svg>
                <div className="absolute inset-x-0 bottom-0 text-center">
                  <span className="srn-q inline-block font-serif text-[2.75rem] font-medium italic leading-none text-teal">
                    ?
                  </span>
                </div>
              </div>
              <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-paper-on-navy/70">
                YOUR SCORE — <span className="font-bold text-teal">UNKNOWN</span>
              </p>
            </div>
          </div>

          {/* CTA row */}
          <div className="srn-ctas flex flex-wrap items-center gap-x-8 gap-y-4 lg:col-span-12">
            <a
              href={typeformUrl()}
              data-event="cta_sample_report"
              className="group inline-flex h-12 items-center border-2 border-ink bg-orange px-6 font-sans text-[15px] font-bold tracking-[0.02em] text-ink shadow-[4px_4px_0_rgba(0,212,170,.4)] transition-all [transition-duration:.18s] ease-snap hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0_0_0_rgba(0,212,170,0)] active:scale-[0.98]"
            >
              Get My Free Audit{' '}
              <span aria-hidden="true" className="ml-2 transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </a>
            <Link
              to="/"
              className="underline-sweep font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-paper-on-navy/80"
            >
              Back to the audit page ↩
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
