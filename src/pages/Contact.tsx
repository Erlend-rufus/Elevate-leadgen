import { Mail, MapPin, Phone } from 'lucide-react'
import { Header } from '@/sections/Header'
import { Footer } from '@/sections/Footer'
import { BookingEmbed } from '@/components/BookingEmbed'
import { Reveal } from '@/components/Reveal'
import { usePageMeta } from '@/hooks/usePageMeta'
import { contact } from '@/content'

export default function Contact() {
  usePageMeta(
    'Contact — Elevate Marketing',
    'Book a free strategy call directly into our calendar, or email hello@getelevateleads.com — a senior marketer replies within one working day.'
  )

  const icons = [Mail, Phone, MapPin]

  return (
    <>
      <Header />
      <main className="pt-32">
        <section className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-brand-cyan">CONTACT</p>
            <h1 className="font-display mt-4 text-4xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl">
              {contact.heading}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-dim">{contact.sub}</p>
          </Reveal>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.3fr]">
          {/* Details */}
          <Reveal>
            <div className="card-dark h-full p-8">
              <h2 className="font-display text-xl font-bold text-white">Direct lines</h2>
              <ul className="mt-6 space-y-5">
                {contact.details.map((d, i) => {
                  const Icon = icons[i] ?? Mail
                  const inner = (
                    <>
                      <span className="gradient-ring rounded-lg p-2.5">
                        <Icon className="h-5 w-5 text-brand-cyan" />
                      </span>
                      <span>
                        <span className="block text-xs uppercase tracking-[0.14em] text-dim">{d.label}</span>
                        <span className="mt-0.5 block font-medium text-white">{d.value}</span>
                      </span>
                    </>
                  )
                  return (
                    <li key={d.label}>
                      {d.href ? (
                        <a href={d.href} className="flex items-center gap-4 transition-opacity hover:opacity-80">
                          {inner}
                        </a>
                      ) : (
                        <span className="flex items-center gap-4">{inner}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="mt-8 border-t border-subtle pt-6 text-sm leading-relaxed text-dim">
                {contact.responseNote}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-dim">
                Free audit included with every strategy call · No lock-in · Cancel monthly
              </p>
            </div>
          </Reveal>

          {/* Booking widget embedded — not a contact form */}
          <Reveal delay={0.12}>
            <BookingEmbed />
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}
