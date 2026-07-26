import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLocation } from 'react-router'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import Stamp from '@/components/Stamp'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { useTypewriter } from '@/hooks/useTypewriter'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Submission echo: case ref + email handed over from the audit form   */
/* (router state or sessionStorage). Without it, the placeholder shows */
/* ------------------------------------------------------------------ */

type AuditEcho = { email?: string; ref?: string; ts?: number }

function parseEcho(raw: unknown): AuditEcho | null {
  if (!raw || typeof raw !== 'object') return null
  const cand = (raw as Record<string, unknown>).audit ?? raw
  if (!cand || typeof cand !== 'object') return null
  const c = cand as Record<string, unknown>
  const email = typeof c.email === 'string' && c.email.includes('@') ? c.email : undefined
  const ref =
    typeof c.ref === 'string' ? c.ref : typeof c.caseRef === 'string' ? (c.caseRef as string) : undefined
  const ts =
    typeof c.ts === 'number' ? c.ts : typeof c.timestamp === 'number' ? (c.timestamp as number) : undefined
  return email || ref || ts ? { email, ref, ts } : null
}

function readEcho(state: unknown): AuditEcho | null {
  const fromState = parseEcho(state)
  if (fromState) return fromState
  try {
    const raw = window.sessionStorage.getItem('elevate:audit-request')
    if (raw) return parseEcho(JSON.parse(raw))
  } catch {
    /* sessionStorage unavailable — placeholder path */
  }
  return null
}

/** Case number from the submission timestamp: GEO-{yy}-{mmss serial}. */
function deriveRef(echo: AuditEcho | null): string | null {
  if (!echo) return null
  if (echo.ref) return echo.ref.replace(/^REF:\s*/i, '').trim() || null
  const ts = echo.ts ?? (echo.email ? Date.now() : null)
  if (!ts) return null
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  const yy = String(d.getFullYear()).slice(-2)
  const serial = `${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
  return `GEO-${yy}-${serial}`
}

/* ------------------------------------------------------------------ */
/* Nav override (thank-you.md §Global): the conversion already         */
/* happened, so the navbar CTA becomes a quiet "Back to site" link.    */
/* Scoped to this page's mount; targets the scaffold Navbar's desktop  */
/* CTA (data-event="cta_nav"). NOTE: shared Navbar is off-limits.      */
/* ------------------------------------------------------------------ */
const NAV_OVERRIDE_CSS = `
header nav a[data-event="cta_nav"] {
  height: auto; padding: 8px 0; border-color: transparent; background: transparent;
  box-shadow: none; font-size: 0; transform: none;
}
header nav a[data-event="cta_nav"]:hover { transform: none; box-shadow: none; }
header nav a[data-event="cta_nav"]::after {
  content: '← Back to site';
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-soft); transition: color .2s ease;
}
header nav a[data-event="cta_nav"]:hover::after { color: var(--ink); }
`

/* ------------------------------------------------------------------ */
/* S1 backdrop: two offset document silhouettes with ≤4px parallax     */
/* ------------------------------------------------------------------ */
const Silhouettes = memo(function Silhouettes({ visible }: { visible: boolean }) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x1 = useTransform(mx, (v) => v * 8) // ±4px
  const y1 = useTransform(my, (v) => v * 8)
  const x2 = useTransform(mx, (v) => v * -5) // ±2.5px
  const y2 = useTransform(my, (v) => v * -5)

  useEffect(() => {
    if (prefersReducedMotion()) return
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5)
      my.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [mx, my])

  const enter = (delay: string) =>
    cn(
      'absolute transition-all ease-snap motion-reduce:transition-none motion-reduce:transform-none',
      delay,
      visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
    )

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex">
      <div className={enter('')} style={{ transitionDuration: '800ms' }}>
        <motion.div style={{ x: x1, y: y1, rotate: -2 }} className="-ml-6 mt-2 h-[440px] w-[600px] border border-ink/50 bg-ink/5" />
      </div>
      <div className={enter('[transition-delay:200ms]')} style={{ transitionDuration: '800ms' }}>
        <motion.div style={{ x: x2, y: y2, rotate: 1.5 }} className="ml-5 -mt-3 h-[440px] w-[600px] border border-ink/40 bg-ink/5" />
      </div>
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* S2 data: mini chain-of-custody                                      */
/* ------------------------------------------------------------------ */
const STEPS = [
  {
    n: '01',
    time: 'FIRST',
    title: 'Examiner assigned',
    body: 'A real person reviews your submission and queues your query set.',
  },
  {
    n: '02',
    time: 'READY QUICKLY',
    title: 'The audit is run',
    body: 'How AI describes you, where you appear, the gaps, and what to fix first — documented in plain English.',
  },
  {
    n: '03',
    time: "WHEN YOU'RE READY",
    title: '30-minute walkthrough',
    body: 'A booking link arrives with the report. Take the call, or just keep the report.',
  },
]

/** Vertical dashed rail (mobile, per step). */
function RailV() {
  return (
    <svg aria-hidden="true" className="absolute -left-6 top-0 h-full w-[2px] overflow-visible md:hidden" preserveAspectRatio="none">
      <line x1="1" y1="0" x2="1" y2="100%" pathLength={1} className="stroke-ink/30" strokeWidth={2} strokeDasharray="0.012 0.018" vectorEffect="non-scaling-stroke" />
      <line x1="1" y1="0" x2="1" y2="100%" pathLength={1} className="ty2-draw stroke-teal" strokeWidth={2} strokeDasharray={1} strokeDashoffset={1} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Horizontal dashed connector (md+, between steps). */
function RailH() {
  return (
    <svg aria-hidden="true" className="absolute -left-1/2 top-[14px] hidden h-[2px] w-full overflow-visible md:block" preserveAspectRatio="none">
      <line x1="0" y1="1" x2="100%" y2="1" pathLength={1} className="stroke-ink/30" strokeWidth={2} strokeDasharray="0.012 0.018" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="1" x2="100%" y2="1" pathLength={1} className="ty2-draw stroke-teal" strokeWidth={2} strokeDasharray={1} strokeDashoffset={1} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const CASE_TAG = 'FORM 06 — RECEIVED'

/** /thank-you — "Request Logged" (design: thank-you.md). */
export default function ThankYou() {
  const root = useRef<HTMLDivElement>(null)
  const { state } = useLocation()
  const echo = useMemo(() => readEcho(state), [state])
  const ref = useMemo(() => deriveRef(echo), [echo])
  const refDisplay = ref ? `REF: ${ref}` : ''

  /* Choreography phases: 0 load → 1 tag types → 2 H1 mask-up → 3 ref types → 4 body */
  const [phase, setPhase] = useState(0)
  const { out: tagOut, done: tagDone } = useTypewriter(CASE_TAG, {
    start: phase >= 1,
    cps: 33,
    onDone: () => setPhase(2),
  })
  const { out: refOut, done: refDone } = useTypewriter(refDisplay, {
    start: phase >= 3 && !!refDisplay,
    cps: 33, // 30ms per character
    onDone: () => setPhase(4),
  })

  useEffect(() => {
    const t = window.setTimeout(() => setPhase(1), prefersReducedMotion() ? 0 : 700) // after the stamp settles
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (phase !== 2) return
    const t = window.setTimeout(() => setPhase(3), prefersReducedMotion() ? 0 : 750) // let the H1 land first
    return () => window.clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 3 || refDisplay) return // with a ref, the typewriter's onDone advances the phase
    const t = window.setTimeout(() => setPhase(4), prefersReducedMotion() ? 0 : 350)
    return () => window.clearTimeout(t)
  }, [phase, refDisplay])

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      if (reduced) {
        gsap.set('.ty-stamp', { opacity: 1, scale: 1, rotation: -8, filter: 'blur(0px)' })
        gsap.set('.ty2-draw', { strokeDashoffset: 0 })
        gsap.set('.ty2-num', { color: 'var(--ink)' })
        gsap.set('.ty2-chip', { opacity: 1, scale: 1 })
        gsap.set('.ty3-banner', { clipPath: 'inset(0 0% 0 0)' })
        return
      }
      // S1 — the stamp is the first beat: thumps in on load (0.38s thump, 0.15s delay)
      gsap.fromTo(
        '.ty-stamp',
        { opacity: 0, scale: 1.7, rotation: -14, filter: 'blur(1px)' },
        { opacity: 1, scale: 1, rotation: -8, filter: 'blur(0px)', duration: 0.38, ease: 'thump', delay: 0.15 },
      )
      // S2 — custody line draws on entry (scrub); steps activate sequentially
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.ty2-track', start: 'top 75%', end: 'top 35%', scrub: 0.6 },
      })
      STEPS.forEach((_, i) => {
        const pos = i * 0.3
        tl.to(`.ty2-step-${i} .ty2-draw`, { strokeDashoffset: 0, duration: 0.3 }, pos)
          .to(`.ty2-step-${i} .ty2-num`, { color: 'var(--ink)', duration: 0.1 }, pos + 0.15)
          .fromTo(
            `.ty2-step-${i} .ty2-chip`,
            { opacity: 0, scale: 0.85 },
            { opacity: 1, scale: 1, duration: 0.12, ease: 'thump' },
            pos + 0.2,
          )
      })
      // S3 — banner wipes in clip-path L→R (0.6s wipe)
      gsap.set('.ty3-banner', { clipPath: 'inset(0 100% 0 0)' })
      gsap.to('.ty3-banner', {
        clipPath: 'inset(0 0% 0 0)',
        duration: 0.6,
        ease: 'wipe',
        scrollTrigger: { trigger: '.ty3-banner', start: 'top 80%', once: true },
      })
    },
    { scope: root },
  )

  const bodyCls = (delay: string) =>
    cn(
      'transition-all duration-500 ease-snap motion-reduce:transition-none motion-reduce:transform-none',
      delay,
      phase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
    )

  return (
    <div ref={root}>
      <Helmet>
        <title>Request received — Elevate Marketing</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <style>{NAV_OVERRIDE_CSS}</style>

      {/* S1 · Confirmation hero */}
      <section data-nav="paper" className="relative overflow-hidden">
        <Silhouettes visible={phase >= 1} />
        <div className="relative mx-auto flex min-h-[72dvh] w-full max-w-[720px] flex-col items-center px-6 pb-24 pt-[108px] text-center">
          <Stamp
            animate={false}
            color="orange"
            className="ty-stamp px-5 py-3 text-[1.1rem] md:px-7 md:py-4 md:text-[1.6rem]"
          >
            REQUEST LOGGED
          </Stamp>

          <p
            aria-label={CASE_TAG}
            className="mt-8 min-h-[1.4em] font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa"
          >
            <span aria-hidden="true">
              {tagOut}
              {phase >= 1 && !tagDone && <span className="animate-caret-blink">▍</span>}
            </span>
          </p>

          <h1 className="mt-5 font-serif text-[clamp(2.4rem,5.4vw,4.25rem)] font-medium leading-[1.0] tracking-[-0.02em] text-ink">
            <span className="mask-line">
              <span
                style={{ transitionDuration: '900ms' }}
                className={cn(
                  'mask-inner transition-transform ease-snap motion-reduce:transition-none motion-reduce:transform-none',
                  phase >= 2 ? 'translate-y-0' : 'translate-y-[110%]',
                )}
              >
                Your case file is
              </span>
            </span>
            <span className="mask-line">
              <span
                style={{ transitionDuration: '900ms' }}
                className={cn(
                  'mask-inner transition-transform ease-snap [transition-delay:90ms] motion-reduce:transition-none motion-reduce:transform-none',
                  phase >= 2 ? 'translate-y-0' : 'translate-y-[110%]',
                )}
              >
                <em className="italic">open.</em>
              </span>
            </span>
          </h1>

          <div
            aria-label={ref ? refDisplay : 'REF: GEO-26-____'}
            className="mt-7 inline-flex min-h-[42px] min-w-[20ch] items-center justify-center border border-line-paper px-4 py-2.5"
          >
            <span aria-hidden="true" className="tnum font-mono text-[14px] tracking-[0.12em] text-ink">
              {ref ? refOut : 'REF: GEO-26-____'}
              {ref && phase >= 3 && !refDone && <span className="animate-caret-blink">▍</span>}
            </span>
          </div>
          {!ref && (
            <p className="mt-3 font-mono text-[11px] tracking-[0.06em] text-ink-soft/80">
              Reference appears after a completed request.
            </p>
          )}

          <p className={cn('mt-7 max-w-[52ch] text-[1.125rem] leading-[1.65] text-ink-soft', bodyCls(''))}>
            Check your inbox — confirmation is on its way. One of our examiners picks up your file, and we go
            through the findings with you on the walkthrough call.
          </p>

          <div className={cn('mt-6 space-y-1.5 font-mono text-[11px] tracking-[0.06em] text-ink-soft', bodyCls('[transition-delay:120ms]'))}>
            {echo?.email && (
              <p>
                SENT TO: <span className="text-ink">{echo.email}</span>
              </p>
            )}
            <p className="mx-auto max-w-[52ch]">
              TIP: add post@elevatemarketing.no to your contacts so our reply doesn't land in junk.
            </p>
          </div>
        </div>
      </section>

      {/* S2 · What happens next (mini chain-of-custody) */}
      <section data-nav="paper" aria-labelledby="ty-next" className="relative border-t border-line-paper bg-paper-2">
        <h2 id="ty-next" className="sr-only">
          What happens next
        </h2>
        <div className="mx-auto max-w-[1200px] px-6 py-16 lg:px-12 lg:py-20">
          <div className="ty2-track grid grid-cols-1 gap-10 pl-8 md:grid-cols-3 md:gap-8 md:pl-0">
            {STEPS.map((s, i) => (
              <div key={s.n} className={cn('ty2-step relative', `ty2-step-${i}`)}>
                <RailV />
                {i > 0 && <RailH />}
                <div className="flex items-start justify-between gap-3">
                  <p
                    className="ty2-num tnum relative z-10 -ml-1 inline-block bg-paper-2 pl-1 pr-3 font-mono text-[2rem] font-bold leading-none"
                    style={{ color: 'rgba(26,26,46,.2)' }}
                  >
                    {s.n}
                  </p>
                  <span className="ty2-chip mt-1 inline-block border border-ink/50 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink opacity-0">
                    {s.time}
                  </span>
                </div>
                <h3 className="mt-3 font-sans text-[1.05rem] font-bold leading-[1.25] tracking-[-0.01em] text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.65] text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* S3 · While you wait (cross-sell strip) */}
      <section data-nav="paper" className="relative bg-paper">
        <div className="mx-auto max-w-[1200px] px-6 py-16 lg:px-12 lg:py-24">
          <div className="ty3-banner group relative overflow-hidden border border-ink bg-paper">
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-left scale-x-0 bg-paper-2 transition-transform duration-500 ease-wipe group-hover:scale-x-100 motion-reduce:transition-none"
            />
            <div className="relative flex flex-col items-start gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between lg:px-10">
              <p className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink-soft">
                WHILE YOU WAIT — SAMPLE REPORT
              </p>
              <p className="font-serif text-[1.4rem] font-medium italic leading-[1.15] tracking-[-0.01em] text-ink md:max-w-[38ch]">
                See exactly what your audit findings look like.
              </p>
              <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                <Link
                  to="/sample-report"
                  data-event="sample_report_view"
                  className="group/btn relative inline-flex h-12 items-center overflow-hidden border-2 border-ink px-6 font-sans text-[15px] font-bold tracking-[0.02em] text-ink"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-wipe group-hover/btn:scale-x-100 motion-reduce:transition-none"
                  />
                  <span className="relative transition-colors duration-300 group-hover/btn:text-paper">
                    Read the sample report{' '}
                    <span aria-hidden="true" className="ml-1 inline-block transition-transform duration-200 group-hover/btn:translate-x-1">
                      ↗
                    </span>
                  </span>
                </Link>
                <Link to="/" className="underline-sweep font-mono text-[12px] uppercase tracking-[0.18em] text-ink-soft">
                  Or back to the audit page ↩
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
