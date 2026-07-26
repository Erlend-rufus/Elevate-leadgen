import { useEffect, useState } from 'react'
import { PRELOADER_EXIT_EVENT, SEEN_KEY, preloaderWillShow } from '@/lib/preloader'

export { PRELOADER_EXIT_EVENT }

const LINES = ['ELEVATE MARKETING — GEO UNIT', 'OPENING CASE FILE Nº 001 …', 'QUERYING THE AI ASSISTANTS ']

/** S0 — "Opening the file": mono boot log, wipes up ≤1.1s, skipped on repeat/reduced motion. */
export default function Preloader() {
  const [show, setShow] = useState(() => preloaderWillShow())
  const [typed, setTyped] = useState<string[]>(['', '', ''])
  const [check, setCheck] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!show) return
    window.sessionStorage.setItem(SEEN_KEY, '1')
    let li = 0
    let ci = 0
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const typeNext = () => {
      if (cancelled) return
      const line = LINES[li]
      ci += 1
      setTyped((prev) => {
        const next = [...prev]
        next[li] = line.slice(0, ci)
        return next
      })
      if (ci < line.length) {
        timers.push(setTimeout(typeNext, 9))
      } else if (li < LINES.length - 1) {
        li += 1
        ci = 0
        timers.push(setTimeout(typeNext, 60))
      } else {
        timers.push(setTimeout(() => !cancelled && setCheck(true), 120))
        // Exit: wipe up 0.45s; hero starts 0.1s after wipe begins
        timers.push(
          setTimeout(() => {
            if (cancelled) return
            setExiting(true)
            window.dispatchEvent(new CustomEvent(PRELOADER_EXIT_EVENT))
          }, 320),
        )
        timers.push(setTimeout(() => !cancelled && setShow(false), 320 + 480))
      }
    }
    timers.push(setTimeout(typeNext, 80))
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [show])

  if (!show) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-paper transition-[clip-path] [transition-duration:.45s] ease-wipe"
      style={{ clipPath: exiting ? 'inset(0 0 100% 0)' : 'inset(0 0 0% 0)' }}
    >
      <div className="font-mono text-[14px] leading-[2] text-ink">
        {LINES.map((_, i) => (
          <p key={i} className="whitespace-pre">
            {typed[i]}
            {i === 2 && check && <span className="font-bold text-teal-aa">✓</span>}
            {i === 0 && typed[0].length < LINES[0].length && <span className="animate-caret-blink">▍</span>}
          </p>
        ))}
      </div>
      <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" width={32} height={32} className="absolute bottom-6 right-6 opacity-50" />
    </div>
  )
}
