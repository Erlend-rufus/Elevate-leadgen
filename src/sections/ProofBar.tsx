import { Reveal } from '@/components/Reveal'
import { proof } from '@/content'

/** Slim horizontal strip of key figures in large gradient type. */
export function ProofBar() {
  return (
    <section className="border-y border-subtle bg-surface/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-14 sm:px-8 lg:grid-cols-4">
        {proof.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.08} className="text-center lg:text-left">
            <p className="text-gradient font-display text-5xl font-bold leading-none tracking-[-0.02em] sm:text-6xl lg:text-7xl">
              {stat.value}
            </p>
            <p className="mt-3 text-sm leading-snug text-dim">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
