import { Header } from '@/sections/Header'
import { Footer } from '@/sections/Footer'
import { FinalCTA } from '@/sections/FinalCTA'
import { Reveal } from '@/components/Reveal'
import { CtaButton } from '@/components/CtaButton'
import { usePageMeta } from '@/hooks/usePageMeta'
import { cases, resultsPage } from '@/content'

export default function Results() {
  usePageMeta(
    'Results — Elevate Marketing',
    'Case studies with real numbers: qualified leads, ROAS and organic growth for service businesses. Every figure can be evidenced on a call.'
  )

  return (
    <>
      <Header />
      <main className="pt-32">
        <section className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl">
              {resultsPage.heading}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-dim">{resultsPage.sub}</p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-7xl space-y-8 px-5 py-16 sm:px-8 sm:py-20">
          {cases.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.05}>
              <article id={c.slug} className="card-dark scroll-mt-28 overflow-hidden">
                <div className="grid lg:grid-cols-[1.5fr_1fr]">
                  {/* Narrative */}
                  <div className="p-8 sm:p-10">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-subtle px-3 py-1 text-xs font-medium text-dim">
                        {c.industry}
                      </span>
                      <span className="rounded-full border border-subtle px-3 py-1 text-xs font-medium text-dim">
                        {c.service}
                      </span>
                      <span className="rounded-full border border-subtle px-3 py-1 text-xs font-medium text-dim">
                        {c.timeframe}
                      </span>
                    </div>
                    <h2 className="text-gradient font-display mt-5 text-3xl font-bold leading-tight sm:text-4xl">
                      {c.headline}
                    </h2>
                    <h3 className="font-display mt-8 text-sm font-bold uppercase tracking-[0.14em] text-white">
                      The situation
                    </h3>
                    <p className="mt-2 leading-relaxed text-dim">{c.challenge}</p>
                    <h3 className="font-display mt-6 text-sm font-bold uppercase tracking-[0.14em] text-white">
                      What we did
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {c.approach.map((step, j) => (
                        <li key={j} className="flex items-start gap-3 text-dim">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gradient" aria-hidden="true" />
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Metrics panel */}
                  <div className="flex flex-col justify-center gap-6 border-t border-subtle bg-surface-2/50 p-8 sm:p-10 lg:border-l lg:border-t-0">
                    {c.results.map((r) => (
                      <div key={r.label}>
                        <p className="text-gradient font-display text-4xl font-bold leading-none sm:text-5xl">
                          {r.value}
                        </p>
                        <p className="mt-2 text-sm text-dim">{r.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 text-center sm:px-8">
          <Reveal>
            <p className="text-lg text-dim">{resultsPage.ctaNote}</p>
            <CtaButton size="lg" className="mt-5" />
          </Reveal>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
