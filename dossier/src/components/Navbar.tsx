import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { scrollToTarget, setPendingAnchor, stopScroll, startScroll } from '@/lib/lenis'
import { cn } from '@/lib/utils'
import { typeformUrl } from '@/lib/typeform'

const NAV_LINKS = [
  { label: 'The Problem', hash: '#exhibit-a' },
  { label: 'What You Get', hash: '#exhibit-c' },
  { label: 'How It Works', hash: '#exhibit-d' },
  { label: 'FAQ', hash: '#faq' },
]

/** Fixed dossier navbar (design.md §7.1): 72px, scroll-aware, section-aware inversion. */
export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [onNavy, setOnNavy] = useState(false)
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setScrolled(y > 40)
        // Section-aware inversion: which themed section sits under the nav?
        const sections = document.querySelectorAll<HTMLElement>('[data-nav]')
        let navy = false
        sections.forEach((s) => {
          const r = s.getBoundingClientRect()
          if (r.top <= 72 && r.bottom > 72) navy = s.dataset.nav === 'navy'
        })
        setOnNavy(navy)
        // Home scroll progress (2px orange bar)
        const max = document.documentElement.scrollHeight - window.innerHeight
        setProgress(max > 0 ? Math.min(1, y / max) : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [pathname])

  const goAnchor = useCallback(
    (hash: string) => (e: React.MouseEvent) => {
      e.preventDefault()
      setOpen(false)
      startScroll()
      if (pathname === '/') {
        scrollToTarget(hash)
      } else {
        setPendingAnchor(hash)
        navigate('/')
      }
    },
    [pathname, navigate],
  )

  useEffect(() => {
    if (!open) return
    stopScroll()
    const first = overlayRef.current?.querySelector<HTMLElement>('a, button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'Tab' && overlayRef.current) {
        // Lightweight focus trap
        const items = Array.from(overlayRef.current.querySelectorAll<HTMLElement>('a, button'))
        if (items.length === 0) return
        const firstI = items[0]
        const lastI = items[items.length - 1]
        if (e.shiftKey && document.activeElement === firstI) {
          e.preventDefault()
          lastI.focus()
        } else if (!e.shiftKey && document.activeElement === lastI) {
          e.preventDefault()
          firstI.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      startScroll()
    }
  }, [open])

  const dark = onNavy || open

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled
          ? dark
            ? 'border-b border-line-navy bg-navy/95 shadow-[0_8px_24px_-16px_rgba(5,23,41,.8)] backdrop-blur-sm'
            : 'border-b border-line-paper bg-paper/95 shadow-[0_8px_24px_-16px_rgba(26,26,46,.35)] backdrop-blur-sm'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6 lg:px-12">
        <Link to="/" aria-label="Elevate Marketing — home" className="flex shrink-0 items-center">
          <img src={import.meta.env.BASE_URL + (dark ? 'logo-inverse.svg' : 'logo.svg')} alt="Elevate Marketing" width={240} height={48} className="h-8 w-auto md:h-9" />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.hash}
              href={l.hash}
              onClick={goAnchor(l.hash)}
              className={cn(
                'font-mono text-[12px] font-medium uppercase tracking-[0.18em] transition-colors',
                dark ? 'text-paper-on-navy/80 hover:text-teal' : 'text-ink-soft hover:text-ink',
              )}
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/sample-report"
            data-event="sample_report_view"
            className={cn(
              'font-mono text-[12px] font-medium uppercase tracking-[0.18em] transition-colors',
              dark ? 'text-paper-on-navy/80 hover:text-orange' : 'text-ink-soft hover:text-orange-aa',
            )}
          >
            Sample Report ↗
          </Link>
          <a
            href={typeformUrl()}
            data-event="cta_nav"
            className={cn(
              'inline-flex h-10 items-center border-2 border-ink bg-orange px-4 font-sans text-[13px] font-bold tracking-[0.02em] text-ink',
              'shadow-[3px_3px_0_var(--ink)] transition-all [transition-duration:.18s] ease-snap',
              'hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0_0_0_var(--ink)] active:scale-[0.98]',
            )}
          >
            Get My Free Audit
          </a>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
          className={cn('flex h-11 w-11 flex-col items-center justify-center gap-2 lg:hidden', dark ? 'text-paper-on-navy' : 'text-ink')}
        >
          <span className={cn('h-px w-6 bg-current transition-transform duration-300 ease-snap', open && 'translate-y-[4.5px] rotate-45')} />
          <span className={cn('h-px w-6 bg-current transition-transform duration-300 ease-snap', open && '-translate-y-[4.5px] -rotate-45')} />
        </button>
      </nav>

      {pathname === '/' && (
        <div aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 w-full bg-transparent">
          <div className="h-full bg-orange transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="console-vignette fixed inset-0 top-0 z-[-1] flex flex-col justify-center bg-navy px-8 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grain-screen" aria-hidden="true" />
            <nav aria-label="Mobile" className="relative flex flex-col gap-5">
              {[...NAV_LINKS, { label: 'Sample Report', hash: '/sample-report' }].map((l, i) => (
                <motion.div
                  key={l.label}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ delay: 0.06 + i * 0.07, duration: 0.5, ease: [0.22, 0.9, 0.24, 1] }}
                >
                  {l.hash.startsWith('/') ? (
                    <Link to={l.hash} onClick={() => setOpen(false)} className="font-serif text-[2.2rem] font-medium leading-tight text-paper-on-navy">
                      {l.label} <span className="text-teal">↗</span>
                    </Link>
                  ) : (
                    <a href={l.hash} onClick={goAnchor(l.hash)} className="font-serif text-[2.2rem] font-medium leading-tight text-paper-on-navy">
                      {l.label}
                    </a>
                  )}
                </motion.div>
              ))}
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 0.9, 0.24, 1] }}
                className="mt-6 border-t border-line-navy pt-6"
              >
                <a
                  href={typeformUrl()}
                  className="inline-flex h-12 items-center border-2 border-ink bg-orange px-6 font-sans text-[15px] font-bold text-ink shadow-[4px_4px_0_rgba(0,212,170,.4)]"
                >
                  Get My Free Audit →
                </a>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-paper-on-navy/60">
                  post@elevatemarketing.no · CASE FILE Nº 001
                </p>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
