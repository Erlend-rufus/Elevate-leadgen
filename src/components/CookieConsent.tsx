import { useEffect, useState } from 'react';

const STORAGE_KEY = 'elevate-cookie-consent';

/**
 * Fixed bottom cookie bar. Accept/decline stored in localStorage.
 * Analytics cookies only load after consent.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* storage unavailable — just hide */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0b0b2e]/95 backdrop-blur"
    >
      <div className="container-site flex flex-col items-start gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-[#b9bbd9]">
          We use analytics cookies to understand how the site is used. Accept or decline — the site
          works the same either way.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="rounded-full bg-brand-gradient px-5 py-2.5 font-display text-sm font-semibold text-white transition-all duration-300 hover:brightness-110"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => choose('declined')}
            className="rounded-full border border-white/20 px-5 py-2.5 font-display text-sm font-semibold text-[#f4f5ff] transition-colors hover:border-white/40"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
