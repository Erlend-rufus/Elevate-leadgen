import { Check, ShieldCheck, UserCheck, Zap } from 'lucide-react'
import { BookingEmbed } from '@/components/BookingEmbed'
import { JourneyCurve } from '@/components/JourneyCurve'
import { Reveal } from '@/components/Reveal'
import { usePageMeta } from '@/hooks/usePageMeta'
import { bookingPage } from '@/content'

/**
 * /book — conversion-focused landing page for the free strategy call.
 * Standalone (no site chrome): ad traffic lands here and only here.
 */
export default function Book() {
  usePageMeta(
    'Book a free strategy call — Elevate Marketing',
    'A focused 30-minute call to explore how predictable, transparent growth marketing could work for your business. No obligation, no hard sell.'
  )

  const trust = [
    { icon: ShieldCheck, label: 'No obligation' },
    { icon: Zap, label: 'No hard sell' },
    { icon: UserCheck, label: 'Senior marketer' },
  ]

  return (
    <main className="glow-gradient relative min-h-screen overflow-hidden">
      <div className="glow-orb pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          {/* Left: the pitch */}
          <div>
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-cyan">
                {bookingPage.eyebrow}
              </p>
              <h1 className="font-display mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
                {bookingPage.titleLead}{' '}
                <span className="text-gradient">{bookingPage.titleGradient}</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-dim">
                {bookingPage.sub}
              </p>
            </Reveal>

            {/* Compact journey curve — reinforces "this call is the turning point" */}
            <Reveal delay={0.1} className="mt-8 hidden max-w-sm lg:block">
              <JourneyCurve variant="process" className="w-full" />
            </Reveal>

            <Reveal delay={0.15}>
              <h2 className="font-display mt-12 text-sm font-bold uppercase tracking-[0.16em] text-white">
                {bookingPage.coversHeading}
              </h2>
              <ul className="mt-4 space-y-3">
                {bookingPage.covers.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="gradient-ring mt-0.5 rounded-full p-1">
                      <Check className="h-3.5 w-3.5 text-brand-cyan" />
                    </span>
                    <span className="leading-relaxed text-dim">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 font-display text-lg font-semibold text-white">
                {bookingPage.closing}
              </p>
            </Reveal>

            {/* Trust chips */}
            <Reveal delay={0.2} className="mt-8 flex flex-wrap gap-3">
              {trust.map((t) => (
                <span
                  key={t.label}
                  className="gradient-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white"
                >
                  <t.icon className="h-4 w-4 text-brand-cyan" />
                  {t.label}
                </span>
              ))}
            </Reveal>
          </div>

          {/* Right: the calendar */}
          <Reveal delay={0.2} className="lg:sticky lg:top-8">
            <BookingEmbed />
            <p className="mt-4 text-center text-xs text-white/55">
              {bookingPage.reassurance}
            </p>
          </Reveal>
        </div>
      </div>
    </main>
  )
}
