import { Mail } from 'lucide-react'
import { ArrowMotif } from '@/components/ArrowMotif'
import { BookingEmbed } from '@/components/BookingEmbed'
import { Reveal } from '@/components/Reveal'
import { site, finalCta } from '@/content'

/** Full-width closing CTA with the booking widget embedded on-page. */
export function FinalCTA() {
  return (
    <section className="glow-gradient relative overflow-hidden border-t border-subtle">
      <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-32">
        <Reveal>
          <h2 className="font-display text-5xl font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-6xl lg:text-7xl">
            {finalCta.heading}{' '}
            <span className="text-gradient">{finalCta.headingGradient}</span>
          </h2>
          <div className="pointer-events-none mx-auto -mt-4 max-w-md">
            <ArrowMotif className="h-auto w-full" />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-dim">
            {finalCta.sub}
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-12 text-left">
          <BookingEmbed />
        </Reveal>

        {/* Email alternative + trust line only when the live calendar is on —
            the placeholder card already carries both. */}
        {site.bookingEnabled && (
          <Reveal delay={0.2} className="mt-8">
            <a
              href={`mailto:${site.email}`}
              className="group inline-flex items-center gap-2 text-base font-semibold text-white transition-colors hover:text-brand-cyan"
            >
              <Mail className="h-4 w-4 text-brand-cyan" />
              {finalCta.emailLabel} {site.email}
            </a>
            <p className="mt-3 text-sm text-dim">Free audit included · No lock-in · Cancel monthly</p>
          </Reveal>
        )}
      </div>
    </section>
  )
}
