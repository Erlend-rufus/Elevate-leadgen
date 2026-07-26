import { useEffect } from 'react'
import { site } from '@/content'
import { ArrowUpRight, CalendarDays, Check, Mail } from 'lucide-react'

const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js'

/**
 * Embedded Calendly booking widget (the real event, brand colours on a
 * light plate inside the dark card). Falls back to a designed placeholder
 * if site.bookingEnabled is ever flipped back to false.
 */
export function BookingEmbed() {
  useEffect(() => {
    if (!site.bookingEnabled) return
    if (document.querySelector(`script[src="${CALENDLY_SCRIPT}"]`)) return
    const script = document.createElement('script')
    script.src = CALENDLY_SCRIPT
    script.async = true
    document.body.appendChild(script)
  }, [])

  if (!site.bookingEnabled) {
    return (
      <div className="card-dark relative overflow-hidden p-10 sm:p-14">
        <div className="glow-orb pointer-events-none absolute -right-24 -top-24 h-72 w-72" aria-hidden="true" />
        <div className="relative mx-auto max-w-lg text-center">
          <span className="gradient-ring mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
            <CalendarDays className="h-7 w-7 text-brand-cyan" />
          </span>
          <h3 className="font-display mt-6 text-2xl font-bold text-white sm:text-3xl">
            The calendar opens here soon
          </h3>
          <p className="mt-3 leading-relaxed text-dim">
            Online booking is being connected. Until then, one email is all it takes — we reply
            within one working day with proposed times.
          </p>
          <a
            href={`mailto:${site.email}?subject=Free%20strategy%20call`}
            className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-navy/30 transition-all hover:shadow-brand-cyan/25 hover:brightness-110"
          >
            <Mail className="h-4 w-4" />
            Book via email
            <ArrowUpRight className="cta-arrow h-4 w-4" />
          </a>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-dim">
            {['Free audit included', 'No lock-in', 'Cancel monthly'].map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-brand-cyan" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="card-dark overflow-hidden">
      {/* Light plate: Calendly renders its own light UI inside our dark card.
          min-height keeps the plate visible while the widget JS loads. */}
      <div className="bg-white" style={{ minHeight: '700px' }}>
        <div
          className="calendly-inline-widget w-full"
          data-url={site.bookingUrl}
          style={{ minWidth: '320px', height: '700px' }}
        />
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-subtle px-5 py-3">
        <p className="text-xs text-dim">Calendar not loading?</p>
        <a
          href={site.bookingDirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1 text-xs font-semibold text-brand-cyan hover:opacity-80"
        >
          Open the calendar directly
          <ArrowUpRight className="cta-arrow h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
