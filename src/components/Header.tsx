import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { ChevronDown, Menu, X } from 'lucide-react';
import Logo from './Logo';
import CtaButton from './CtaButton';
import { site } from '@/content/site';
import { services } from '@/content/services';

/**
 * Sticky header. Desktop: nav + Services dropdown (all 7 services).
 * Mobile: hamburger → full-screen overlay menu with expandable Services.
 */
export default function Header() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const location = useLocation();

  // Close menus on navigation
  useEffect(() => {
    setServicesOpen(false);
    setMobileOpen(false);
    setMobileServicesOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile overlay is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#04041c]/85 backdrop-blur">
      <div className="container-site flex h-16 items-center justify-between">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              onClick={() => setServicesOpen((open) => !open)}
              className="flex items-center gap-1 text-sm font-medium text-[#b9bbd9] transition-colors hover:text-[#f4f5ff]"
            >
              Services
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {servicesOpen && (
              <div className="absolute left-1/2 top-full w-64 -translate-x-1/2 pt-3">
                <div className="rounded-2xl border border-white/10 bg-[#0b0b2e] p-2 shadow-xl shadow-black/40">
                  <Link
                    to="/services"
                    className="block rounded-lg px-4 py-2.5 text-sm font-medium text-[#f4f5ff] transition-colors hover:bg-[#12123d]"
                  >
                    All services
                  </Link>
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      to={`/services/${service.slug}`}
                      className="block rounded-lg px-4 py-2.5 text-sm text-[#b9bbd9] transition-colors hover:bg-[#12123d] hover:text-[#f4f5ff]"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {site.nav
            .filter((item) => item.label !== 'Services')
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-[#b9bbd9] transition-colors hover:text-[#f4f5ff]"
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="hidden md:block">
          <CtaButton to={site.primaryCta.to} size="sm">
            {site.primaryCta.label}
          </CtaButton>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="p-2 text-[#f4f5ff] md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile overlay menu — portalled to body: the header's backdrop-blur would
          otherwise become the containing block for this fixed overlay and collapse
          its height to the header's. */}
      {mobileOpen && createPortal(
        <div className="fixed inset-0 top-16 z-40 overflow-y-auto bg-[#04041c] md:hidden">
          <nav className="container-site flex flex-col gap-2 py-8" aria-label="Mobile">
            <button
              type="button"
              aria-expanded={mobileServicesOpen}
              onClick={() => setMobileServicesOpen((open) => !open)}
              className="flex items-center justify-between rounded-lg px-2 py-3 text-left font-display text-lg font-semibold text-[#f4f5ff]"
            >
              Services
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {mobileServicesOpen && (
              <div className="mb-2 flex flex-col gap-1 border-l border-white/10 pl-4">
                <Link to="/services" className="px-2 py-2 text-[#f4f5ff]">
                  All services
                </Link>
                {services.map((service) => (
                  <Link
                    key={service.slug}
                    to={`/services/${service.slug}`}
                    className="px-2 py-2 text-[#b9bbd9]"
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            )}
            {site.nav
              .filter((item) => item.label !== 'Services')
              .map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-2 py-3 font-display text-lg font-semibold text-[#f4f5ff]"
                >
                  {item.label}
                </Link>
              ))}
            <div className="mt-6">
              <CtaButton to={site.primaryCta.to}>{site.primaryCta.label}</CtaButton>
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </header>
  );
}
