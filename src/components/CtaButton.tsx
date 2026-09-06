import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

interface CtaButtonProps {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'sm';
  className?: string;
  /**
   * Subtly pulls the label toward the cursor inside the button, springing
   * back on leave. Reserved for FinalCTA — the one place a hover flourish
   * beyond the standard scale/brightness is sanctioned (design.md §1).
   * No-op under prefers-reduced-motion.
   */
  magnetic?: boolean;
}

const PULL = 10;

export default function CtaButton({
  to,
  children,
  variant = 'primary',
  size = 'md',
  className,
  magnetic = false,
}: CtaButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [pull, setPull] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!magnetic) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      setPull({ x: nx * PULL, y: ny * PULL });
    };
    const reset = () => setPull({ x: 0, y: 0 });

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('blur', reset);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', reset);
      el.removeEventListener('blur', reset);
    };
  }, [magnetic]);

  return (
    <Link
      ref={ref}
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
      <span
        className={magnetic ? 'transition-transform duration-300 ease-out' : undefined}
        style={magnetic ? { transform: `translate(${pull.x}px, ${pull.y}px)` } : undefined}
      >
        {children}
      </span>
    </Link>
  );
}
