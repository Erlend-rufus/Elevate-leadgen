import { useEffect, useRef, useState } from 'react'
import { scrollToTarget } from '@/lib/lenis'
import { cn } from '@/lib/utils'

export const TOC_ITEMS = [
  { id: 'report-summary', index: '01', label: 'Executive Summary' },
  { id: 'report-platforms', index: '02', label: 'Platform Results' },
  { id: 'report-benchmark', index: '03', label: 'Who Appears Instead' },
  { id: 'report-findings', index: '04', label: 'Key Findings' },
  { id: 'report-plan', index: '05', label: 'The Fixes' },
  { id: 'report-next-step', index: '06', label: 'Your Next Step' },
] as const

/** Scroll-spy: section occupying the middle band of the viewport is active (rootMargin -40%). */
function useScrollSpy(): string {
  const [active, setActive] = useState<string>(TOC_ITEMS[0].id)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 },
    )
    TOC_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])
  return active
}

function goTo(id: string) {
  scrollToTarget(`#${id}`, { offset: -96 })
}

/** Desktop (≥1024): sticky left rail inside the document. */
export function TocRail() {
  const active = useScrollSpy()
  return (
    <nav aria-label="Report contents" className="hidden lg:block">
      <div className="sticky top-[120px] py-16 pl-8 pr-6 xl:py-24">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-soft/70">CONTENTS</p>
        <ul className="mt-4 space-y-3.5">
          {TOC_ITEMS.map((item) => {
            const isActive = active === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(item.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'group flex items-baseline gap-1.5 text-left font-mono text-[11px] font-medium uppercase leading-[1.5] tracking-[0.12em] transition-colors duration-200',
                    isActive ? 'text-teal-aa' : 'text-ink-soft hover:text-ink',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mr-0.5 inline-block transition-all duration-200',
                      isActive ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
                    )}
                  >
                    ▸
                  </span>
                  <span className="tnum">{item.index}</span> {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

/** Mobile/tablet (<1024): horizontal chip bar, sticky under the navbar. */
export function TocChipBar() {
  const active = useScrollSpy()
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chip = barRef.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`)
    chip?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [active])

  return (
    <div className="sticky top-[72px] z-30 border-b border-line-paper bg-paper-2 lg:hidden">
      <div
        ref={barRef}
        role="navigation"
        aria-label="Report contents"
        className="flex gap-2 overflow-x-auto px-5 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TOC_ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              data-chip={item.id}
              onClick={() => goTo(item.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'shrink-0 whitespace-nowrap border px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] transition-colors duration-200',
                isActive
                  ? 'border-teal-aa bg-paper text-teal-aa'
                  : 'border-line-paper bg-paper text-ink-soft hover:text-ink',
              )}
            >
              {isActive && <span aria-hidden="true">▸ </span>}
              <span className="tnum">{item.index}</span> {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
