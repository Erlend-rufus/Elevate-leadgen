import { Header } from '@/sections/Header'
import { Footer } from '@/sections/Footer'
import { FinalCTA } from '@/sections/FinalCTA'
import { ArrowMotif } from '@/components/ArrowMotif'
import { Reveal } from '@/components/Reveal'
import { usePageMeta } from '@/hooks/usePageMeta'
import { about, team } from '@/content'

export default function About() {
  usePageMeta(
    'About — Elevate Marketing',
    'A Norwegian growth agency with a dedicated UK division. Senior people, honest numbers, no lock-in — meet the team behind Elevate Marketing.'
  )

  return (
    <>
      <Header />
      <main className="pt-32">
        <section className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-brand-cyan">ABOUT ELEVATE</p>
            <h1 className="font-display mt-4 text-4xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl">
              {about.heading}
            </h1>
          </Reveal>
        </section>

        {/* Story */}
        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
          <Reveal className="space-y-5">
            {about.story.map((para, i) => (
              <p key={i} className="text-lg leading-relaxed text-dim">
                {para}
              </p>
            ))}
          </Reveal>
          <Reveal delay={0.15}>
            <div className="card-dark relative overflow-hidden p-8">
              <div className="glow-orb pointer-events-none absolute -right-16 -top-16 h-56 w-56" aria-hidden="true" />
              <ArrowMotif className="h-auto w-full" />
              <p className="mt-6 text-sm leading-relaxed text-dim">
                The arrow in our logo is the whole job in one shape: from where your marketing is
                today, to where it should be — visibly, measurably, upwards.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Pillars */}
        <section className="bg-surface/30 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <Reveal>
              <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
                Three pillars, in everything
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {about.pillars.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.1}>
                  <div className="card-dark card-dark-hover h-full p-7">
                    <span className="text-gradient text-xs font-bold uppercase tracking-[0.16em]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-display mt-3 text-xl font-bold text-white">{p.title}</h3>
                    <p className="mt-3 leading-relaxed text-dim">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              The people on your account
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-dim">
              Senior marketers only — no handoffs to juniors after the pitch. Real photos land
              here before launch; we would rather show faces than stock.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="card-dark card-dark-hover h-full p-6 text-center">
                  <span className="gradient-ring mx-auto flex h-20 w-20 items-center justify-center rounded-full font-display text-xl font-bold text-brand-cyan">
                    {member.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                  <h3 className="font-display mt-4 text-lg font-bold text-white">{member.name}</h3>
                  <p className="mt-1 text-sm font-medium text-brand-cyan">{member.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-dim">{member.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
