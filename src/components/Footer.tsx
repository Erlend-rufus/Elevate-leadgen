import { Link } from 'react-router';
import Logo from './Logo';
import { site } from '@/content/site';

/**
 * 4 columns: Brand+blurb, Services (7 links), Company, Legal.
 * Bottom row: © year + company number.
 */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/5">
      <div className="container-site section-pad grid gap-12 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-[#7c7ea6]">{site.blurb}</p>
        </div>
        {site.footer.columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="eyebrow mb-4">{column.title}</h3>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-[#b9bbd9] transition-colors hover:text-[#f4f5ff]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="container-site flex flex-col gap-2 py-6 text-xs text-[#7c7ea6] sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {site.brand}
          </span>
          <span>{site.companyNo}</span>
        </div>
      </div>
    </footer>
  );
}
