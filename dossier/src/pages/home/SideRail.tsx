import { useEffect, useState } from 'react'

const MARKERS = [
  { id: 'opening', label: 'OPENING' },
  { id: 'exhibit-a', label: 'EXHIBIT A' },
  { id: 'exhibit-b', label: 'EXHIBIT B' },
  { id: 'exhibit-c', label: 'EXHIBIT C' },
  { id: 'exhibit-d', label: 'EXHIBIT D' },
  { id: 'form', label: 'FORM 06' },
  { id: 'closing', label: 'CLOSING' },
]

/** Fixed left rail (≥1280px): current EXHIBIT marker + thin progress line (home only). */
export default function SideRail() {
  const [active, setActive] = useState('OPENING')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const probe = window.scrollY + window.innerHeight * 0.55
        let current = MARKERS[0].label
        for (const m of MARKERS) {
          const el = document.getElementById(m.id)
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY
            if (top <= probe) current = m.label
          }
        }
        setActive(current)
        const max = document.documentElement.scrollHeight - window.innerHeight
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <aside aria-hidden="true" className="fixed left-0 top-0 z-40 hidden h-full w-12 xl:block">
      {/* Progress line */}
      <div className="absolute bottom-0 left-1/2 top-[72px] w-px bg-line-paper">
        <div className="w-px origin-top bg-orange" style={{ height: `${progress * 100}%` }} />
      </div>
      {/* Current marker */}
      <p className="writing-vertical absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[0.72rem] uppercase tracking-[0.24em] text-ink-soft">
        {active}
      </p>
    </aside>
  )
}
