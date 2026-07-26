import { Link, useLocation } from 'react-router'
import { scrollToTarget, setPendingAnchor } from '@/lib/lenis'
import { useNavigate } from 'react-router'
import { typeformUrl } from '@/lib/typeform'

/** Dossier footer (design.md §7.2) — navy, all pages. */
export default function Footer() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const goFaq = (e: React.MouseEvent) => {
    e.preventDefault()
    if (pathname === '/') scrollToTarget('#faq')
    else {
      setPendingAnchor('#faq')
      navigate('/')
    }
  }

  return (
    <footer data-nav="navy" className="console-vignette relative border-t border-line-navy text-paper-on-navy">
      <div className="grain-screen" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1200px] px-6 py-16 lg:px-12 lg:py-20">
        {/* Top zone */}
        <div className="flex flex-col items-start justify-between gap-8 border-b border-line-navy pb-12 md:flex-row md:items-center">
          <p className="max-w-md font-serif text-[clamp(1.6rem,3vw,2.4rem)] font-medium italic leading-[1.1] tracking-[-0.01em]">
            “Be the answer, not the omission.”
          </p>
          {pathname === '/thank-you' ? (
            <Link
              to="/"
              className="inline-flex h-12 items-center border-2 border-ink bg-orange px-6 font-sans text-[15px] font-bold tracking-[0.02em] text-ink shadow-[4px_4px_0_rgba(0,212,170,.4)] transition-all [transition-duration:.18s] ease-snap hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0_0_0_rgba(0,212,170,0)]"
            >
              ← Back to the case file
            </Link>
          ) : (
            <a
              href={typeformUrl()}
              data-event="cta_footer"
              className="group inline-flex h-12 items-center border-2 border-ink bg-orange px-6 font-sans text-[15px] font-bold tracking-[0.02em] text-ink shadow-[4px_4px_0_rgba(0,212,170,.4)] transition-all [transition-duration:.18s] ease-snap hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0_0_0_rgba(0,212,170,0)] active:scale-[0.98]"
            >
              Get My Free Audit <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
            </a>
          )}
        </div>

        {/* Middle grid */}
        <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-teal">Case</h2>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              <li><Link className="underline-sweep" to="/">The Audit</Link></li>
              <li><Link className="underline-sweep" to="/sample-report">Sample Report</Link></li>
              <li><a className="underline-sweep" href="/#faq" onClick={goFaq}>FAQ</a></li>
            </ul>
          </div>
          <div>
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-teal">Legal</h2>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              <li><Link className="underline-sweep" to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link className="underline-sweep" to="/terms">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-teal">Contact</h2>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              <li><a className="underline-sweep" href="mailto:post@elevatemarketing.no">post@elevatemarketing.no</a></li>
              <li className="text-paper-on-navy/70">Serving UK IT &amp; MSP firms</li>
            </ul>
          </div>
          <div>
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-teal">File note</h2>
            <p className="mt-4 font-mono text-[12px] leading-relaxed text-paper-on-navy/60">
              Free GEO audits for UK MSPs, IT support and cybersecurity firms. Zero obligation.
            </p>
            <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" width={32} height={32} className="mt-6 opacity-70" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-line-navy pt-8 md:flex-row md:items-center">
          <p className="font-mono text-[11px] tracking-[0.06em] text-paper-on-navy/60">
            © 2026 Elevate Marketing (EngeCo AS)
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper-on-navy/50">
            Registered in England &amp; Wales
          </p>
          <button
            type="button"
            onClick={() => scrollToTarget(0, { offset: 0 })}
            className="underline-sweep font-mono text-[11px] uppercase tracking-[0.18em] text-paper-on-navy/80"
          >
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  )
}
