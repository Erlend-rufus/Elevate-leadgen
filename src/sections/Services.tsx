import { Target, Megaphone, Search, Sparkles, LayoutTemplate, Mail, Compass } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { services } from '@/content'

const icons: Record<string, typeof Target> = {
  target: Target,
  megaphone: Megaphone,
  search: Search,
  sparkles: Sparkles,
  layout: LayoutTemplate,
  mail: Mail,
  compass: Compass,
}

/** Bento grid of services — each card sells the outcome, not the feature. */
export function Services() {
  return (
    <section id={services.id} className="section-pad bg-surface/30">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
            {services.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-dim">{services.sub}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map((item, i) => {
            const Icon = icons[item.icon] ?? Target
            // Bento rhythm: first and last cards span two columns on large screens
            const span = i === 0 || i === services.items.length - 1 ? 'lg:col-span-2' : ''
            return (
              <Reveal key={item.name} delay={(i % 3) * 0.08} className={span}>
                <div className="card-dark card-dark-hover group flex h-full items-start gap-5 p-7">
                  <div className="gradient-ring rounded-xl p-3">
                    <Icon className="h-6 w-6 text-brand-cyan" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white">{item.name}</h3>
                    <p className="mt-2 leading-relaxed text-dim">{item.outcome}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
