import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { CtaButton } from '@/components/CtaButton'
import { nav } from '@/content'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    if (href.startsWith('/#')) {
      const id = href.slice(2)
      if (location.pathname !== '/') {
        navigate('/', { state: { scrollTo: id } })
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      navigate(href)
    }
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled || open ? 'header-glass' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="Elevate Marketing — home" onClick={() => setOpen(false)}>
          <Logo height={40} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.label}
              onClick={() => go(item.href)}
              className="text-sm font-medium text-dim transition-colors hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:block">
          <CtaButton />
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded-lg border border-subtle p-2 text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="header-glass border-t border-subtle md:hidden">
          <nav className="flex flex-col gap-1 px-5 py-4" aria-label="Mobile navigation">
            {nav.map((item) => (
              <button
                key={item.label}
                onClick={() => go(item.href)}
                className="rounded-lg px-3 py-3 text-left text-base font-medium text-white transition-colors hover:bg-surface-2"
              >
                {item.label}
              </button>
            ))}
            <div className="px-3 pb-2 pt-3">
              <CtaButton className="w-full justify-center" />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
