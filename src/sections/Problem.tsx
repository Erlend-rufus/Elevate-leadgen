import { Reveal } from '@/components/Reveal'
import { problem } from '@/content'

/** Short agitation section: what typically goes wrong with agencies. */
export function Problem() {
  return (
    <section className="section-pad">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
            {problem.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-dim">{problem.sub}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {problem.cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.1}>
              <div className="card-dark card-dark-hover h-full p-7">
                <span className="text-gradient text-xs font-bold uppercase tracking-[0.16em]">
                  {card.pillar}
                </span>
                <h3 className="font-display mt-3 text-xl font-bold text-white">{card.title}</h3>
                <p className="mt-3 leading-relaxed text-dim">{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
