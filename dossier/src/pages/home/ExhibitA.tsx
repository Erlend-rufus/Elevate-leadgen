import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { scrollToTarget } from '@/lib/lenis'
import { cn } from '@/lib/utils'

/* Qualitative by design: no market statistics anywhere in this exhibit.
   The problem framing must stay verifiable — shifts, not numbers. */
const SCENES = [
  { id: 'zero-click', tab: '01 ZERO-CLICK', headline: 'No click.' },
  { id: 'ai-first', tab: '02 AI-FIRST BUYERS', headline: 'AI first.' },
  { id: 'error-rate', tab: '03 WRONG FACTS', headline: 'Wrong facts.' },
]

/** S3 — EXHIBIT A "The Shift": pinned scene sequence (navy, 300vh scrub). */
export default function ExhibitA() {
  const root = useRef<HTMLElement>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // ── Desktop pinned scrub sequence ─────────────────────────────
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const scenes = gsap.utils.toArray<HTMLElement>('.ea-scene')
        gsap.set(scenes, { position: 'absolute', inset: 0 })
        gsap.set(scenes.slice(1), { opacity: 0, x: 60 })
        gsap.set('.ea-closing', { opacity: 0 })

        const tl = gsap.timeline({
          defaults: { ease: 'snap' },
          scrollTrigger: {
            trigger: wrap.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: (self) => {
              const p = self.progress
              // Index tabs: active state + per-tab progress underline
              const active = Math.min(2, Math.floor(p * 3.0001))
              root.current?.querySelectorAll<HTMLElement>('.ea-tab').forEach((t, i) => {
                t.classList.toggle('text-teal', i === active)
                t.classList.toggle('text-paper-on-navy/40', i !== active)
                const bar = t.querySelector<HTMLElement>('.ea-tab-bar')
                if (bar) {
                  const local = gsap.utils.clamp(0, 1, p * 3 - i)
                  bar.style.transform = `scaleX(${local})`
                }
              })
            },
          },
        })

        // Scene 1 — searches end without a click
        tl.fromTo('.ea-s1 .ea-cap-line', { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 0.18 }, 0.04)
          .fromTo('.ea-s1 .ea-meta', { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.1)
          // out / scene 2 in
          .to('.ea-s1', { x: -60, opacity: 0, duration: 0.12 }, 0.88)
          .to('.ea-s2', { x: 0, opacity: 1, duration: 0.12 }, 0.96)

        // Scene 2 — buyers start in AI chatbots
        tl.fromTo('.ea-s2 .ea-cap-line', { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 0.18 }, 1.02)
          .fromTo('.ea-s2 .ea-meta', { opacity: 0 }, { opacity: 1, duration: 0.12 }, 1.08)
          .fromTo('.ea-m2-fill', { width: '0%' }, { width: '50%', duration: 0.4, ease: 'power2.out' }, 1.04)
          .to('.ea-s2', { x: -60, opacity: 0, duration: 0.12 }, 1.88)
          .to('.ea-s3', { x: 0, opacity: 1, duration: 0.12 }, 1.96)

        // Scene 3 — AI answers can get the facts wrong
        tl.fromTo('.ea-s3 .ea-cap-line', { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 0.18 }, 2.02)
          .fromTo('.ea-s3 .ea-meta', { opacity: 0 }, { opacity: 1, duration: 0.12 }, 2.08)
          .to('.ea-m3 .strike', { scaleX: 1, duration: 0.1, stagger: 0.1, ease: 'wipe' }, 2.1)
          .fromTo('.ea-m3 .fix', { opacity: 0 }, { opacity: 1, duration: 0.08, stagger: 0.1 }, 2.14)
          .fromTo(
            '.ea-m3-stamp',
            { opacity: 0, scale: 1.7, rotate: -14 },
            { opacity: 1, scale: 1, rotate: -8, duration: 0.1, ease: 'thump' },
            2.5,
          )
          // Closing beat — last 10%
          .to('.ea-scenes', { opacity: 0, duration: 0.1 }, 2.9)
          .to('.ea-closing', { opacity: 1, duration: 0.1 }, 2.96)
          .fromTo('.ea-closing-line', { yPercent: 110 }, { yPercent: 0, duration: 0.12 }, 2.98)
          .to({}, { duration: 0.34 }) // hold — positions above are in scene units; scrub normalises
        return () => {
          tl.scrollTrigger?.kill()
          tl.kill()
        }
      })

      // ── Mobile / reduced-motion: static scenes, metaphors resolved ──
      mm.add('(max-width: 767px), (prefers-reduced-motion: reduce)', () => {
        // Metaphors render resolved (design.md §6 reduced-motion contract)
        gsap.set('.ea-m2-fill', { width: '50%' })
        gsap.set('.ea-m3 .strike', { scaleX: 1 })
        gsap.set('.ea-m3 .fix', { opacity: 1 })
        gsap.set('.ea-m3-stamp', { opacity: 1 })
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  const goScene = (i: number) => {
    const el = wrap.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const range = el.offsetHeight - window.innerHeight
    scrollToTarget(top + range * (i / 3 + 0.02), { offset: 0 })
  }

  return (
    <section ref={root} id="exhibit-a" data-nav="navy" className="console-vignette relative text-paper-on-navy">
      <div className="grain-screen" aria-hidden="true" />
      <div ref={wrap} className="relative md:h-[300vh]">
        <div className="relative flex flex-col overflow-hidden px-6 py-20 md:sticky md:top-0 md:h-screen md:px-12 md:py-0 lg:px-16">
          <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col md:justify-center">
            {/* Header */}
            <div className="md:absolute md:left-12 md:top-10 lg:left-16">
              <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.22em] text-teal">
                EXHIBIT A — THE SHIFT
              </p>
              <p className="mt-2 font-mono text-[0.72rem] tracking-[0.04em] text-paper-on-navy/60">
                Evidence: three shifts your pipeline already feels
              </p>
            </div>

            {/* Scenes */}
            <div className="ea-scenes relative mt-14 flex-1 md:mt-0">
              {/* Scene 1 */}
              <div className="ea-scene ea-s1 flex flex-col gap-10 py-14 md:h-full md:flex-row md:items-center md:gap-8 md:py-0">
                <div className="md:w-3/5">
                  <p className="font-serif text-[clamp(3.6rem,9vw,7rem)] font-medium leading-none tracking-[-0.02em] text-teal">
                    <span className="mask-line"><span className="mask-inner ea-cap-line">No click.</span></span>
                  </p>
                  <p className="ea-meta mt-6 max-w-[46ch] text-[1.05rem] leading-[1.65] text-paper-on-navy/85">
                    <span className="mask-line"><span className="mask-inner ea-cap-line">More and more searches end without a click.</span></span>
                    <span className="mask-line"><span className="mask-inner ea-cap-line">AI answers the question directly — your website</span></span>
                    <span className="mask-line"><span className="mask-inner ea-cap-line">never gets the visit.</span></span>
                  </p>
                </div>
                {/* Metaphor: a search bar whose cursor never clicks */}
                <div className="ea-meta md:w-2/5">
                  <div className="border border-line-navy bg-navy-deep/70 p-5 font-mono text-[0.85rem]">
                    <div className="flex items-center gap-2 border border-line-navy bg-navy px-3 py-2.5 text-paper-on-navy/80">
                      <span>best MSP near me</span>
                      <span aria-hidden="true" className="animate-caret-blink text-teal">▍</span>
                    </div>
                    <div className="mt-4 space-y-1.5 text-[0.78rem] uppercase tracking-[0.1em]">
                      <p className="text-paper-on-navy/70">ANSWER: <span className="text-teal">GIVEN</span></p>
                      <p className="text-paper-on-navy/70">CLICKS: <span className="tnum bg-orange px-1 font-bold text-ink">0</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scene 2 */}
              <div className="ea-scene ea-s2 flex flex-col gap-10 py-14 md:h-full md:flex-row md:items-center md:gap-8 md:py-0">
                <div className="md:w-3/5">
                  <p className="font-serif text-[clamp(3.6rem,9vw,7rem)] font-medium leading-none tracking-[-0.02em] text-teal">
                    <span className="mask-line"><span className="mask-inner ea-cap-line">AI first.</span></span>
                  </p>
                  <p className="ea-meta mt-6 max-w-[46ch] text-[1.05rem] leading-[1.65] text-paper-on-navy/85">
                    <span className="mask-line"><span className="mask-inner ea-cap-line">Buyers increasingly start research in an AI chatbot,</span></span>
                    <span className="mask-line"><span className="mask-inner ea-cap-line">not a search engine. The shortlist is written</span></span>
                    <span className="mask-line"><span className="mask-inner ea-cap-line">before you know they exist.</span></span>
                  </p>
                </div>
                {/* Metaphor: the balance shifting towards AI */}
                <div className="ea-meta md:w-2/5">
                  <div className="border border-line-navy bg-navy-deep/70 p-5 font-mono text-[0.78rem] uppercase tracking-[0.1em]">
                    <div className="flex justify-between text-paper-on-navy/70">
                      <span className="text-teal">ASKS AI</span>
                      <span>ASKS GOOGLE</span>
                    </div>
                    <div className="relative mt-3 h-5 border border-line-navy bg-ink/60">
                      <div className="ea-m2-fill h-full bg-teal" style={{ width: '0%' }} />
                    </div>
                    <p className="mt-2 text-right text-paper-on-navy/50">AND RISING</p>
                  </div>
                </div>
              </div>

              {/* Scene 3 */}
              <div className="ea-scene ea-s3 flex flex-col gap-10 py-14 md:h-full md:flex-row md:items-center md:gap-8 md:py-0">
                <div className="md:w-3/5">
                  <p className="font-serif text-[clamp(3.6rem,9vw,7rem)] font-medium leading-none tracking-[-0.02em] text-teal">
                    <span className="mask-line"><span className="mask-inner ea-cap-line">Wrong facts.</span></span>
                  </p>
                  <p className="ea-meta mt-6 max-w-[46ch] text-[1.05rem] leading-[1.65] text-paper-on-navy/85">
                    <span className="mask-line"><span className="mask-inner ea-cap-line">AI answers can contain factual errors. If an AI</span></span>
                    <span className="mask-line"><span className="mask-inner ea-cap-line">describes your business at all, it may be</span></span>
                    <span className="mask-line"><span className="mask-inner ea-cap-line">describing it wrong.</span></span>
                  </p>
                </div>
                {/* Metaphor: glitching company description (fictional example firm) */}
                <div className="ea-meta md:w-2/5">
                  <div className="ea-m3 relative border border-line-navy bg-navy-deep/70 p-5 font-mono text-[0.85rem] leading-[1.7] text-paper-on-navy/85">
                    <p>
                      “Northbeam IT, founded{' '}
                      <Swap orig="2019" fix="2009" />, offers{' '}
                      <Swap orig="24/7 support" fix="office hours" /> from its HQ in{' '}
                      <Swap orig="Manchester" fix="Leeds" />.”
                    </p>
                    <span className="ea-m3-stamp stamp-double absolute -right-2 -top-3 inline-block border-2 border-orange px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-orange opacity-0">
                      UNVERIFIED
                    </span>
                  </div>
                </div>
              </div>

              {/* Closing beat */}
              <div className="ea-closing absolute inset-0 hidden items-center opacity-0 md:flex">
                <p className="mask-line w-full text-center">
                  <span className="mask-inner ea-closing-line font-mono text-[clamp(0.9rem,2vw,1.3rem)] uppercase tracking-[0.14em] text-paper-on-navy">
                    FEWER CLICKS · AI-FIRST BUYERS · WRONG FACTS — <span className="text-teal">and no one told you.</span>
                  </span>
                </p>
              </div>
            </div>

            {/* Index tabs */}
            <div className="mt-6 hidden gap-8 md:absolute md:bottom-10 md:left-12 md:mt-0 md:flex lg:left-16" role="tablist" aria-label="Exhibit A scenes">
              {SCENES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === 0}
                  onClick={() => goScene(i)}
                  className={cn('ea-tab pb-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] transition-colors', i === 0 ? 'text-teal' : 'text-paper-on-navy/40')}
                >
                  {s.tab}
                  <span aria-hidden="true" className="mt-1.5 block h-0.5 w-full origin-left scale-x-0 bg-teal ea-tab-bar" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** A word with an animated strikethrough and its "corrected" replacement. */
function Swap({ orig, fix }: { orig: string; fix: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative inline-block">
        {orig}
        <span aria-hidden="true" className="strike absolute left-0 top-1/2 h-[2px] w-full origin-left scale-x-0 bg-orange" />
      </span>
      <span className="fix ml-1.5 inline-block bg-orange/15 px-1 text-orange opacity-0">{fix}</span>
    </span>
  )
}
