import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { cases } from '@/content'

/** Case teaser cards linking through to /results. */
export function ResultsTeaser() {
  return (
    <section id="results-teaser" className="section-pad bg-surface/30">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
              Specifics over adjectives.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-dim">
              Real industries, real numbers, real timeframes — every figure can be evidenced on a call.
            </p>
          </div>
          <Link
            to="/results"
            className="group inline-flex items-center gap-2 text-base font-semibold text-brand-cyan transition-opacity hover:opacity-80"
          >
            All results
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cases.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.1}>
              <Link
                to={`/results#${c.slug}`}
                className="card-dark card-dark-hover group flex h-full flex-col p-7"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-subtle px-3 py-1 text-xs font-medium text-dim">
                    {c.industry}
                  </span>
                  <span className="rounded-full border border-subtle px-3 py-1 text-xs font-medium text-dim">
                    {c.service}
                  </span>
                </div>
                <p className="text-gradient font-display mt-6 text-3xl font-bold leading-tight">
                  {c.headline}
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-dim">{c.summary}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  Read the case study
                  <ArrowUpRight className="cta-arrow h-4 w-4 text-brand-cyan" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
