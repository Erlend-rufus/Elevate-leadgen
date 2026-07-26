import { Link, useLocation, useNavigate } from 'react-router'
import { Linkedin, Mail, MapPin, Phone } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { site, footer } from '@/content'

export function Footer() {
  const navigate = useNavigate()
  const location = useLocation()

  const go = (href: string) => {
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
    <footer className="border-t border-subtle bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link to="/" aria-label="Elevate Marketing — home">
              <Logo height={36} />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-dim">{footer.blurb}</p>
            <a
              href={site.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Elevate Marketing on LinkedIn"
              className="mt-5 inline-flex rounded-lg border border-subtle p-2.5 text-dim transition-colors hover:border-brand-cyan/40 hover:text-brand-cyan"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>

          {/* Link columns */}
          {footer.columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => go(link.href)}
                      className="text-sm text-dim transition-colors hover:text-white"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Contact strip */}
        <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 border-t border-subtle pt-8 text-sm text-dim">
          <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
            <Mail className="h-4 w-4 text-brand-cyan" /> {site.email}
          </a>
          <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
            <Phone className="h-4 w-4 text-brand-cyan" /> {site.phone}
          </a>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-cyan" /> {site.address}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-8 text-xs text-dim">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>
            {site.companyNumber
              ? `Registered in England & Wales, No. ${site.companyNumber}`
              : 'Elevate Marketing — UK division'}
          </p>
        </div>
      </div>
    </footer>
  )
}
