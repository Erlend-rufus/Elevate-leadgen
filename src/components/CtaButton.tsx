import { ArrowUpRight } from 'lucide-react'
import { site, cta } from '@/content'

interface CtaButtonProps {
  size?: 'md' | 'lg'
  className?: string
  label?: string
}

/**
 * The single primary CTA used everywhere: identical wording and styling
 * in header, hero, process and final CTA — one conversion target.
 */
export function CtaButton({ size = 'md', className = '', label = cta.primary }: CtaButtonProps) {
  const sizing =
    size === 'lg' ? 'px-8 py-4 text-base' : 'px-5 py-2.5 text-sm'

  return (
    <a
      href={site.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2 rounded-xl bg-brand-gradient font-semibold text-white shadow-lg shadow-brand-navy/30 transition-all hover:shadow-brand-cyan/25 hover:brightness-110 ${sizing} ${className}`}
    >
      {label}
      <ArrowUpRight className={`cta-arrow ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />
    </a>
  )
}
