import { ArrowRight } from 'lucide-react'
import { JourneyCurve } from '@/components/JourneyCurve'
import { Reveal } from '@/components/Reveal'
import { site, process, cta } from '@/content'

/** Three-step process, anchored by the journey curve beneath the steps. */
export function Process() {
  return (
    <section className="section-pad">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
            {process.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-dim">{process.sub}</p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {process.steps.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.12}>
              <div className="card-dark card-dark-hover h-full p-7 text-center md:text-left">
                <p className="text-gradient font-display text-4xl font-bold">{step.number}</p>
                <h3 className="font-display mt-3 text-2xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-dim">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* The same growth story, annotated with the three steps */}
        <Reveal delay={0.15} className="mx-auto mt-10 max-w-5xl">
          <JourneyCurve variant="process" className="w-full" />
        </Reveal>

        <Reveal delay={0.2} className="mt-10 text-center">
          <a
            href={site.bookingDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-base font-semibold text-brand-cyan transition-opacity hover:opacity-80"
          >
            {cta.micro}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
