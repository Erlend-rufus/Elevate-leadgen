import { useEffect } from 'react';
import { CalendarClock } from 'lucide-react';
import { site } from '@/content/site';
import { audit } from '@/content/audit';

const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js';

/**
 * Reads site.bookingEnabled. When false, renders the placeholder card.
 * When true, renders the Calendly inline widget (script loaded once, async).
 */
export default function BookingEmbed() {
  const enabled = site.bookingEnabled;

  useEffect(() => {
    if (!enabled) return;
    if (document.querySelector(`script[src="${CALENDLY_SCRIPT}"]`)) return;
    const script = document.createElement('script');
    script.src = CALENDLY_SCRIPT;
    script.async = true;
    document.body.appendChild(script);
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="card-dark flex flex-col items-center gap-4 text-center">
        <CalendarClock className="h-8 w-8 text-[#7c7ea6]" aria-hidden="true" />
        <p className="text-[#b9bbd9]">{audit.booking.placeholder}</p>
        <a
          href={`mailto:${site.email}`}
          className="font-medium text-[#f4f5ff] underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white/70"
        >
          {audit.booking.mailtoLabel}
        </a>
      </div>
    );
  }

  return (
    <div className="card-dark">
      <div
        className="calendly-inline-widget"
        data-url={site.calendlyUrl}
        style={{ minWidth: '320px', height: '700px' }}
      />
      <p className="mt-6 text-center">
        <a
          href={`mailto:${site.email}`}
          className="font-medium text-[#b9bbd9] underline decoration-white/30 underline-offset-4 transition-colors hover:text-[#f4f5ff] hover:decoration-white/70"
        >
          {audit.booking.mailtoLabel}
        </a>
      </p>
    </div>
  );
}
