import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

interface CtaButtonProps {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'sm';
  className?: string;
}

export default function CtaButton({
  to,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: CtaButtonProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-display font-semibold transition-all duration-300',
        size === 'md' ? 'px-7 py-3.5 text-base' : 'px-5 py-2.5 text-sm',
        variant === 'primary'
          ? 'bg-brand-gradient text-white hover:scale-[1.03] hover:brightness-110'
          : 'border border-white/20 text-[#f4f5ff] hover:border-white/40',
        className,
      )}
    >
      {children}
    </Link>
  );
}
