import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { ArrowMotif } from '@/components/ArrowMotif'
import { Reveal } from '@/components/Reveal'
import { aboutTeaser, about } from '@/content'

/** About teaser pointing to /about — abstract brand panel instead of stock photos. */
export function AboutTeaser() {
  return (
    <section className="section-pad bg-surface/30">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
            {aboutTeaser.heading}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-dim">{aboutTeaser.body}</p>
          <p className="mt-4 leading-relaxed text-dim">{aboutTeaser.body2}</p>
          <Link
            to="/about"
            className="group mt-7 inline-flex items-center gap-2 text-base font-semibold text-brand-cyan transition-opacity hover:opacity-80"
          >
            {aboutTeaser.linkText}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        {/* Brand panel: arrow motif + the three pillars, no stock photography */}
        <Reveal delay={0.15}>
          <div className="card-dark relative overflow-hidden p-8 sm:p-10">
            <div className="glow-orb pointer-events-none absolute -right-20 -top-20 h-64 w-64" aria-hidden="true" />
            <ArrowMotif className="h-auto w-full max-w-md" />
            <ul className="relative mt-8 space-y-4">
              {about.pillars.map((p) => (
                <li key={p.title} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-gradient" aria-hidden="true" />
                  <div>
                    <span className="font-display font-bold text-white">{p.title}</span>
                    <span className="text-dim"> — {p.body}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
