import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { cn } from '@/lib/utils'

export type RedactProps = {
  /** Full text — always exposed to screen readers via aria-label. */
  children: string
  /**
   * wipe: ink bar opens on scroll (or on load when trigger='load').
   * peek: hover/focus slides the bar to 92% width; releases back on leave.
   * locked: never opens (details withheld in the illustrative example).
   */
  mode?: 'wipe' | 'peek' | 'locked'
  /** wipe only: open on scroll into view (default) or after `delay` from mount. */
  trigger?: 'scroll' | 'load'
  delay?: number
  className?: string
  barClassName?: string
  /** locked only: show the mono anonymisation note after the bar. */
  showNote?: boolean
}

export default function Redact({
  children,
  mode = 'wipe',
  trigger = 'scroll',
  delay = 0,
  className,
  barClassName,
  showNote = false,
}: RedactProps) {
  const root = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const txt = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      if (mode !== 'wipe' || !bar.current || !txt.current) return
      if (prefersReducedMotion()) {
        gsap.set(bar.current, { scaleX: 0 })
        return
      }
      const run = () => {
        txt.current?.classList.add('text-orange-aa')
        gsap.to(bar.current, {
          scaleX: 0,
          duration: 0.7,
          ease: 'wipe',
          transformOrigin: 'right center',
          onComplete: () => {
            window.setTimeout(() => txt.current?.classList.remove('text-orange-aa'), 200)
          },
        })
      }
      if (trigger === 'load') {
        gsap.delayedCall(delay, run)
      } else {
        gsap.timeline({
          scrollTrigger: { trigger: root.current, start: 'top 62%', once: true },
        }).add(() => run(), delay)
      }
    },
    { scope: root, dependencies: [mode, trigger, delay] },
  )

  if (mode === 'locked') {
    return (
      <span className={cn('relative inline-block', className)} aria-label={children}>
        <span aria-hidden="true" className="relative inline-block">
          <span className="invisible">{children}</span>
          <span className={cn('absolute inset-0 bg-ink', barClassName)} />
        </span>
        {showNote && (
          <span aria-hidden="true" className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            WITHHELD — ILLUSTRATIVE
          </span>
        )}
      </span>
    )
  }

  if (mode === 'peek') {
    return (
      <span
        className={cn('group/redact relative inline-block cursor-help', className)}
        aria-label={children}
        tabIndex={0}
      >
        <span aria-hidden="true" className="relative inline-block">
          <span>{children}</span>
          <span
            className={cn(
              'absolute inset-0 bg-ink transition-[width] duration-300 ease-wipe',
              'w-full group-hover/redact:w-[92%] group-focus-visible/redact:w-[92%]',
              barClassName,
            )}
          />
        </span>
      </span>
    )
  }

  // wipe (default)
  return (
    <span ref={root} className={cn('relative inline-block', className)} aria-label={children}>
      <span aria-hidden="true" className="relative inline-block">
        <span ref={txt} className="transition-colors duration-200">
          {children}
        </span>
        <span ref={bar} className={cn('absolute inset-0 origin-right bg-ink', barClassName)} />
      </span>
    </span>
  )
}
