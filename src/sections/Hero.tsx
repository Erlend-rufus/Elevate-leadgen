import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { JourneyCurve } from '@/components/JourneyCurve'
import { CtaButton } from '@/components/CtaButton'
import { hero, cta } from '@/content'

export function Hero() {
  const reduce = useReducedMotion()

  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  })

  const scrollToResults = () => {
    document.getElementById('results-teaser')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="glow-gradient relative overflow-hidden pb-16 pt-36 sm:pt-44">
      {/* Soft glow orb behind the headline */}
      <div className="glow-orb pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2" aria-hidden="true" />

      <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
        <motion.p
          {...fade(0)}
          className="mx-auto inline-block rounded-full border border-subtle bg-surface/60 px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-brand-cyan sm:text-xs"
        >
          {hero.eyebrow}
        </motion.p>

        <motion.h1
          {...fade(0.1)}
          className="font-display mt-6 text-5xl font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-6xl lg:text-7xl"
        >
          {hero.titleLead}{' '}
          <span className="text-gradient">{hero.titleGradient}</span>{' '}
          {hero.titleTail}
        </motion.h1>

        <motion.p
          {...fade(0.2)}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-dim sm:text-xl"
        >
          {hero.sub}
        </motion.p>

        <motion.div {...fade(0.3)} className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <CtaButton size="lg" />
          <button
            onClick={scrollToResults}
            className="group inline-flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-white transition-colors hover:text-brand-cyan"
          >
            {cta.secondary}
            <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </button>
        </motion.div>

        {/* The growth story: stagnation → workshop turning point → compounding */}
        <motion.div {...fade(0.45)} className="mx-auto mt-2 max-w-3xl">
          <JourneyCurve variant="hero" className="w-full" />
        </motion.div>

        {/* Stat chips — placeholder figures, replace via content.ts */}
        <motion.div {...fade(0.55)} className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {hero.stats.map((s) => (
            <div key={s.label} className="gradient-ring flex items-baseline gap-2 rounded-full px-5 py-2.5">
              <span className="text-gradient font-display text-lg font-bold">{s.value}</span>
              <span className="text-xs text-dim sm:text-sm">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
