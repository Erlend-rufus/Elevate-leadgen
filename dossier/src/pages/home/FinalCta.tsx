import { useRef } from 'react'
import Stamp from '@/components/Stamp'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { typeformUrl } from '@/lib/typeform'

/** S10 — Final CTA "Closing Statement" (navy, full-bleed). */
export default function FinalCta() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '.fc-line',
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 0.9,
          ease: 'snap',
          stagger: 0.12,
          scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
        },
      )
      gsap.fromTo(
        '.fc-btn',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'snap',
          scrollTrigger: { trigger: root.current, start: 'top 60%', once: true },
        },
      )
      // Subtle background ring drift (scrub scale 1→1.04)
      gsap.fromTo(
        '.fc-bg',
        { scale: 1 },
        {
          scale: 1.04,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="closing"
      data-nav="navy"
      className="console-vignette relative overflow-hidden text-paper-on-navy"
    >
      <div
        aria-hidden="true"
        className="fc-bg absolute inset-0 bg-cover bg-center opacity-50"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}hero-texture.png)` }}
      />
      <div className="grain-screen" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 py-[120px] text-center lg:px-12 lg:py-40">
        <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-teal">
          CLOSING STATEMENT
        </p>
        <h2 className="mt-8 font-serif text-[clamp(2.8rem,5.4vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.025em]">
          <span className="mask-line">
            <span className="mask-inner fc-line">Your buyers are already asking.</span>
          </span>
          <span className="mask-line">
            <span className="mask-inner fc-line italic text-teal">What did the AI say about you?</span>
          </span>
        </h2>
        <p className="mt-8 max-w-[48ch] text-[1.125rem] leading-[1.65] text-paper-on-navy/70">
          Free audit, fixed scope, findings yours to keep either way.
        </p>
        <div className="fc-btn relative mt-12 flex items-center gap-6">
          <a
            href={typeformUrl()}
            data-event="cta_final"
            className="group inline-flex h-14 items-center border-2 border-ink bg-orange px-8 font-sans text-[15px] font-bold tracking-[0.02em] text-ink shadow-[4px_4px_0_rgba(0,212,170,.4)] transition-all [transition-duration:.18s] ease-snap hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0_0_0_rgba(0,212,170,0)] active:scale-[0.98] motion-safe:animate-pulse-ring"
          >
            Get My Free Audit{' '}
            <span aria-hidden="true" className="ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
          </a>
          <Stamp color="teal" className="hidden lg:inline-block">
            FREE
          </Stamp>
        </div>
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-paper-on-navy/50">
          TAKES 2 MINUTES · NO CARD · UNSUBSCRIBE ANYTIME
        </p>
      </div>
    </section>
  )
}
