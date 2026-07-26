import { useEffect, useState } from 'react'
import { Link } from 'react-router'

const STORAGE_KEY = 'elevate-cookie-consent'

/**
 * Cookie consent banner (UK GDPR / PECR). Analytics must not load before
 * consent is stored here — wire GA4 behind `localStorage[STORAGE_KEY]`.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  const choose = (value: 'accepted' | 'declined') => {
    localStorage.setItem(STORAGE_KEY, value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:max-w-md">
      <div className="card-dark p-5 shadow-2xl shadow-black/50">
        <p className="text-sm font-semibold text-white">Cookies on this site</p>
        <p className="mt-1.5 text-sm leading-relaxed text-dim">
          We use cookies to understand how the site is used and to measure our own marketing. No
          advertising cookies are set without your consent. Read our{' '}
          <Link to="/privacy" className="text-brand-cyan underline underline-offset-2 hover:opacity-80">
            privacy policy
          </Link>
          .
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => choose('accepted')}
            className="bg-brand-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Accept
          </button>
          <button
            onClick={() => choose('declined')}
            className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-surface-2"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
