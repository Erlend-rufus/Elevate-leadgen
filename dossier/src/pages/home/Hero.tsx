import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import ConsoleCard from '@/components/ConsoleCard'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import { useTypewriter } from '@/hooks/useTypewriter'
import { PRELOADER_EXIT_EVENT, preloaderWillShow } from '@/lib/preloader'
import { cn } from '@/lib/utils'
import { typeformUrl } from '@/lib/typeform'

const CASE_TAG = 'CASE FILE Nº 001 — AI VISIBILITY ASSESSMENT'

type Chip = { q: string; answer: string[] }

const CHIPS: Chip[] = [
  {
    q: 'Best MSPs in Manchester?',
    answer: [
      '1. Northbeam IT — 24/7 monitoring, strong reviews',
      '2. Corelan Systems — enterprise focus',
      '3. BrightByte — fast-growing, competitive pricing',
    ],
  },
  {
    q: 'Top cybersecurity firms for finance?',
    answer: [
      '1. HexGuard Security — FCA-aligned SOC, City clients',
      '2. Corelan Systems — enterprise focus',
      '3. Vaultline — finance-sector specialists',
    ],
  },
  {
    q: 'IT support for a growing accountancy firm?',
    answer: [
      '1. Northbeam IT — accountancy-sector clients',
      '2. BrightByte — responsive helpdesk, London',
      '3. Fieldstone IT — mid-market specialists',
    ],
  },
]

const VERDICT_PRE = '— 3 providers recommended. Your company: '
const VERDICT_REDACTED = 'not mentioned.'

/** The interactive Prompt Simulator (hero right column). */
function PromptSimulator({ started }: { started: boolean }) {
  const [prompt, setPrompt] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [verdict, setVerdict] = useState<'hidden' | 'typing' | 'done'>('hidden')
  const [verdictText, setVerdictText] = useState('')
  const [activeChip, setActiveChip] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [hasClicked, setHasClicked] = useState(false)
  const hasRun = useRef(false)
  const cancelRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const run = (idx: number) => {
    if (running) return
    cancelRef.current = false
    setRunning(true)
    setHasClicked(true)
    setActiveChip(idx)
    setLines([])
    setVerdict('hidden')
    setVerdictText('')
    const chip = CHIPS[idx]
    const typePrompt = hasRun.current ? Promise.resolve() : typeText(chip.q, setPrompt, 34)
    if (hasRun.current) setPrompt(chip.q)
    else setPrompt('')
    hasRun.current = true

    void typePrompt.then(async () => {
      for (let i = 0; i < chip.answer.length; i++) {
        if (cancelRef.current) return
        await wait(120)
        const line = chip.answer[i]
        setLines((prev) => [...prev, ''])
        await typeText(line, (t) => {
          setLines((prev) => {
            const next = [...prev]
            next[next.length - 1] = t
            return next
          })
        }, 46)
      }
      if (cancelRef.current) return
      setVerdict('typing')
      await typeText(VERDICT_PRE + VERDICT_REDACTED, setVerdictText, 40)
      if (cancelRef.current) return
      setVerdict('done')
      setRunning(false)
    })
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [prompt, lines, verdictText])

  useEffect(() => () => {
    cancelRef.current = true
  }, [])

  const showCaret = running || verdict === 'typing'

  return (
    <div className="hero-console relative">
      <ConsoleCard
        title="QUERY LOG — LIVE INTERROGATION"
        footer="Simulated answer. Your audit shows how AI assistants really answer your buyers' questions."
        className="relative transition-all duration-300 ease-snap hover:-translate-y-1 hover:shadow-[10px_10px_0_rgba(5,23,41,.45)]"
        bodyClassName="px-4 py-4"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}hero-texture.png)` }}
        />
        {/* Question chips */}
        <div className="relative z-10 mb-4 flex flex-wrap gap-2">
          {CHIPS.map((c, i) => (
            <button
              key={c.q}
              type="button"
              onClick={() => run(i)}
              disabled={running}
              className={cn(
                'chip border border-teal/40 px-2.5 py-1.5 font-mono text-[12px] text-teal transition-colors',
                'hover:border-teal hover:bg-teal/10 focus-visible:bg-teal/10 disabled:opacity-60',
                activeChip === i && 'border-teal bg-teal/10',
                i === 0 && started && !hasClicked && 'chip-invite',
              )}
            >
              {c.q}
            </button>
          ))}
        </div>

        {/* Stream */}
        <div ref={scrollRef} role="log" aria-live="polite" className="relative z-10 max-h-[240px] min-h-[180px] overflow-y-auto">
          {prompt && (
            <p className="whitespace-pre-wrap text-paper-on-navy">
              <span className="text-teal">&gt; </span>
              {prompt}
            </p>
          )}
          {lines.map((l, i) => (
            <p key={i} className="whitespace-pre-wrap text-paper-on-navy/85">
              {l}
            </p>
          ))}
          {verdict !== 'hidden' && (
            <p className="whitespace-pre-wrap text-orange">
              {verdict === 'done' ? (
                <>
                  {VERDICT_PRE}
                  <span className="relative inline-block">
                    <span>{VERDICT_REDACTED}</span>
                    <span aria-hidden="true" className="verdict-bar absolute inset-0 origin-right bg-ink" />
                  </span>
                </>
              ) : (
                verdictText
              )}
            </p>
          )}
          <p aria-hidden="true" className={cn('text-teal', showCaret ? 'animate-caret-blink' : 'opacity-40')}>
            ▍
          </p>
        </div>

        {/* Mini stamp */}
        {verdict === 'done' && (
          <motion.span
            initial={{ scale: 1.7, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -8, opacity: 1 }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            aria-hidden="true"
            className="stamp-double absolute -right-2 -top-3 border-2 border-orange px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-orange"
          >
            NOT MENTIONED
          </motion.span>
        )}
      </ConsoleCard>
    </div>
  )
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function typeText(full: string, set: (t: string) => void, cps: number): Promise<void> {
  if (prefersReducedMotion()) {
    set(full)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    let i = 0
    const tick = () => {
      i += 1
      set(full.slice(0, i))
      if (i >= full.length) resolve()
      else setTimeout(tick, (1000 / cps) * (0.92 + Math.random() * 0.16))
    }
    setTimeout(tick, 1000 / cps)
  })
}

/** S1 — Hero "The Interrogation" (paper). */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const [introStarted, setIntroStarted] = useState(false)
  const { out: tagText, done: tagDone } = useTypewriter(CASE_TAG, { start: introStarted, cps: 84 })

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      if (reduced) {
        gsap.set('.hero-line-inner, .hero-sub, .hero-cta, .hero-proof, .hero-console', { clearProps: 'all', opacity: 1 })
        gsap.set('.hero-redact-bar', { scaleX: 0 })
        gsap.set('.hero-underline', { scaleX: 1 })
        setIntroStarted(true)
        return
      }
      const tl = gsap.timeline({ paused: true })
      tl
        .fromTo('.hero-line-inner', { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'snap', stagger: 0.09 }, 0.5)
        .set('.hero-inv-text', { color: '#B43E18' }, 1.55)
        .to('.hero-redact-bar', { scaleX: 0, duration: 0.7, ease: 'wipe', transformOrigin: 'right center' }, 1.55)
        .to('.hero-inv-text', { color: '#1A1A2E', duration: 0.2 }, 2.25)
        .to('.hero-underline', { scaleX: 1, duration: 0.4, ease: 'snap', transformOrigin: 'left center' }, 2.3)
        .fromTo('.hero-sub', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'snap' }, 1.6)
        .fromTo('.hero-cta', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'snap', stagger: 0.06 }, 1.8)
        .fromTo('.hero-proof', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 2.1)
        .fromTo('.hero-console', { x: 40, rotate: 1.5, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, duration: 0.8, ease: 'snap' }, 1.4)

      const play = () => {
        setIntroStarted(true)
        tl.play(0)
      }
      if (preloaderWillShow()) {
        const onExit = () => window.setTimeout(play, 100)
        window.addEventListener(PRELOADER_EXIT_EVENT, onExit, { once: true })
        return () => window.removeEventListener(PRELOADER_EXIT_EVENT, onExit)
      }
      const t = window.setTimeout(play, 100)
      return () => window.clearTimeout(t)
    },
    { scope: root },
  )

  // Scroll parallax: left stack 0.9×, console 1.05× (yPercent ±6, scrub), disabled <lg
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        gsap.to('.hero-left', {
          yPercent: -6,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        gsap.to('.hero-console', {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} id="opening" data-nav="paper" className="relative overflow-hidden">
      {/* Margin note, far-left gutter ≥xl */}
      <p
        aria-hidden="true"
        className="writing-vertical absolute left-16 top-40 hidden font-mono text-[0.72rem] tracking-[0.24em] text-ink-soft xl:block"
      >
        FOR UK IT &amp; MSP FIRMS
      </p>

      <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1200px] grid-cols-1 items-center gap-12 px-6 pb-20 pt-[88px] lg:grid-cols-12 lg:gap-8 lg:px-12">
        {/* Left stack */}
        <div className="hero-left lg:col-span-7">
          <p className="min-h-[1.4em] font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-orange-aa">
            {tagText}
            {!tagDone && introStarted && <span aria-hidden="true" className="animate-caret-blink">▍</span>}
          </p>

          <h1 className="mt-6 font-serif text-[clamp(2.6rem,5vw,4.2rem)] font-medium leading-[0.98] tracking-[-0.025em] text-ink">
            <span className="mask-line">
              <span className="mask-inner hero-line-inner">Is Your IT Business</span>
            </span>
            <span className="mask-line">
              <span className="mask-inner hero-line-inner">
                <span className="relative inline-block italic">
                  <span className="hero-inv-text transition-colors duration-200">Invisible</span>
                  <span aria-hidden="true" className="hero-redact-bar absolute inset-0 origin-right bg-ink" />
                  <span aria-hidden="true" className="hero-underline absolute bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-teal" />
                </span>{' '}
                to ChatGPT?
              </span>
            </span>
          </h1>

          <p className="hero-sub mt-8 max-w-[56ch] text-[1.125rem] leading-[1.65] text-ink-soft">
            More and more buyers ask AI before they ask Google. Get your free GEO audit and see if ChatGPT, Gemini and
            Perplexity know you exist — or if they're{' '}
            <em className="font-serif italic text-ink">sending your prospects to competitors.</em>
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <a
              href={typeformUrl()}
              data-event="cta_primary_hero"
              className="hero-cta group inline-flex h-14 items-center border-2 border-ink bg-orange px-7 font-sans text-[15px] font-bold tracking-[0.02em] text-ink shadow-[4px_4px_0_var(--ink)] transition-all [transition-duration:.18s] ease-snap hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0_0_0_var(--ink)] active:scale-[0.98]"
            >
              Get My Free Audit <span aria-hidden="true" className="ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
            </a>
            <Link
              to="/sample-report"
              data-event="cta_secondary_hero"
              className="hero-cta group font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-orange-aa"
            >
              See a sample audit report{' '}
              <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">↗</span>
            </Link>
          </div>

          <p className="hero-proof mt-8 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft">
            FREE AUDIT · NO CARD REQUIRED · UNSUBSCRIBE ANYTIME
          </p>
        </div>

        {/* Right: Prompt Simulator */}
        <div className="lg:col-span-5">
          <PromptSimulator started={introStarted} />
        </div>
      </div>
    </section>
  )
}
