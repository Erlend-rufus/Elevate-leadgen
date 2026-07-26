import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

/**
 * JourneyCurve — the signature dotted arrow retold as an honest growth story.
 *
 * Narrative: the line starts flat/slightly declining and *dim* (life before
 * Elevate). At the workshop checkpoint the brand gradient literally enters
 * the picture. The rise is modest at first (foundations take weeks), then
 * compounds — steep but never vertical, because hype curves trigger
 * BS-detectors in this audience.
 *
 * Motion discipline: ONE IntersectionObserver (via useInView) triggers the
 * whole sequence, it plays once, then rests — only the gradient dots keep a
 * slow, subtle drift. prefers-reduced-motion gets the final state directly.
 */

interface Checkpoint {
  x: number
  y: number
  label: string
  sub: string
}

interface VariantConfig {
  viewBox: string
  height: number // viewBox height, for overlay % math
  beforePath: string
  afterPath: string
  gradient: { x1: number; y1: number; x2: number; y2: number }
  arrowHead: string
  checkpoints: Checkpoint[]
  /** Emphasis pulse ring on this checkpoint index (the turning point) */
  pulseIndex?: number
  beforeCaption?: { x: number; y: number; text: string }
  timing: {
    base: number
    beforeDuration: number
    afterDuration: number
    caption: number
    checkpoints: number[] // one delay per checkpoint
    head: number
  }
}

const HERO: VariantConfig = {
  viewBox: '0 0 1000 340',
  height: 340,
  // Before: flat with a slight sag — stagnation, not catastrophe
  beforePath: 'M 40 186 C 110 176, 160 192, 210 197 C 250 201, 290 211, 330 214',
  // After: gentle at first, then compounding — steep, never vertical
  afterPath:
    'M 330 214 C 400 210, 470 196, 540 184 C 650 165, 730 136, 810 102 C 860 81, 915 55, 952 30',
  gradient: { x1: 330, y1: 214, x2: 952, y2: 30 },
  arrowHead: 'M 941.5 51.6 L 952 30 L 928.1 31.7',
  checkpoints: [
    { x: 330, y: 214, label: 'Audit + workshop', sub: 'Week 1–2' },
    { x: 540, y: 184, label: 'First results', sub: 'Month 1–2' },
    { x: 810, y: 102, label: 'Compounding', sub: 'Month 4–6' },
  ],
  pulseIndex: 0,
  beforeCaption: { x: 118, y: 243, text: 'Before Elevate' },
  timing: {
    base: 0.5,
    beforeDuration: 1.9,
    afterDuration: 2.9,
    caption: 1.1,
    checkpoints: [2.6, 3.7, 4.7],
    head: 5.5,
  },
}

const PROCESS: VariantConfig = {
  viewBox: '0 0 1000 220',
  height: 220,
  beforePath: 'M 40 176 C 90 173, 130 168, 166 164',
  afterPath:
    'M 166 164 C 300 148, 420 128, 500 116 C 620 100, 740 66, 833 50 C 878 41, 925 28, 956 16',
  gradient: { x1: 166, y1: 164, x2: 956, y2: 16 },
  arrowHead: 'M 942.2 33.1 L 956 16 L 934.2 19.3',
  checkpoints: [
    { x: 166, y: 164, label: '01 · Audit', sub: 'The honest picture' },
    { x: 500, y: 116, label: '02 · Strategy', sub: 'Plan + forecast' },
    { x: 833, y: 50, label: '03 · Scale', sub: 'Compounding growth' },
  ],
  timing: {
    base: 0.2,
    beforeDuration: 0.9,
    afterDuration: 2.2,
    caption: 0,
    checkpoints: [1.2, 2.0, 2.8],
    head: 3.4,
  },
}

interface JourneyCurveProps {
  variant: 'hero' | 'process'
  className?: string
}

export function JourneyCurve({ variant, className = '' }: JourneyCurveProps) {
  const cfg = variant === 'hero' ? HERO : PROCESS
  const t = cfg.timing
  const uid = `journey-${variant}`
  const reduce = useReducedMotion()

  // One observer for the whole sequence — robust and fires exactly once
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const play = !reduce && inView

  return (
    <div ref={ref} className={`relative ${className}`}>
      <svg viewBox={cfg.viewBox} fill="none" className="h-auto w-full" aria-hidden="true" role="presentation">
        <defs>
          <linearGradient
            id={`${uid}-grad`}
            gradientUnits="userSpaceOnUse"
            x1={cfg.gradient.x1}
            y1={cfg.gradient.y1}
            x2={cfg.gradient.x2}
            y2={cfg.gradient.y2}
          >
            <stop offset="0%" stopColor="#02009A" />
            <stop offset="55%" stopColor="#006ABA" />
            <stop offset="100%" stopColor="#00A3D6" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <mask id={`${uid}-before-mask`}>
            <motion.path
              d={cfg.beforePath}
              stroke="#fff"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: play || reduce ? 1 : 0 }}
              transition={{ duration: t.beforeDuration, delay: t.base, ease: 'easeInOut' }}
            />
          </mask>
          <mask id={`${uid}-after-mask`}>
            <motion.path
              d={cfg.afterPath}
              stroke="#fff"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: play || reduce ? 1 : 0 }}
              transition={{
                duration: t.afterDuration,
                delay: t.base + t.beforeDuration,
                ease: 'easeInOut',
              }}
            />
          </mask>
        </defs>

        {/* Before: dim, stagnant — no brand colour yet */}
        <g mask={`url(#${uid}-before-mask)`}>
          <path
            d={cfg.beforePath}
            stroke="rgba(148, 163, 196, 0.55)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="0.1 13"
            fill="none"
          />
        </g>

        {/* After: the gradient enters with Elevate */}
        <g mask={`url(#${uid}-after-mask)`}>
          <path
            d={cfg.afterPath}
            stroke={`url(#${uid}-grad)`}
            strokeWidth="16"
            opacity="0.28"
            filter={`url(#${uid}-glow)`}
            strokeLinecap="round"
            strokeDasharray="0.1 13"
            fill="none"
          />
          <path
            d={cfg.afterPath}
            stroke={`url(#${uid}-grad)`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="0.1 13"
            className={reduce ? '' : 'arrow-flow'}
            fill="none"
          />
        </g>

        {/* Arrowhead: pops in as the draw completes */}
        <motion.path
          d={cfg.arrowHead}
          stroke={`url(#${uid}-grad)`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: play || reduce ? 1 : 0 }}
          transition={{ duration: 0.4, delay: t.head, ease: 'easeOut' }}
        />

        {/* Checkpoint dots */}
        {cfg.checkpoints.map((cp, i) => (
          <motion.g
            key={i}
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={play || reduce ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{
              delay: t.checkpoints[i],
              type: 'spring',
              stiffness: 300,
              damping: 18,
            }}
            style={{ transformOrigin: `${cp.x}px ${cp.y}px` }}
          >
            <circle cx={cp.x} cy={cp.y} r="9" fill="#04041C" stroke="#00A3D6" strokeWidth="3.5" />
            {/* One-off emphasis pulse on the turning point */}
            {i === cfg.pulseIndex && !reduce && (
              <motion.circle
                cx={cp.x}
                cy={cp.y}
                r="9"
                fill="none"
                stroke="#00A3D6"
                strokeWidth="2"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={play ? { scale: 3, opacity: 0 } : { scale: 1, opacity: 0.7 }}
                transition={{
                  duration: 1.4,
                  delay: t.checkpoints[i] + 0.1,
                  repeat: 1,
                  repeatDelay: 0.4,
                  ease: 'easeOut',
                }}
                style={{ transformOrigin: `${cp.x}px ${cp.y}px` }}
              />
            )}
          </motion.g>
        ))}
      </svg>

      {/* Checkpoint labels — real HTML so they stay readable on mobile */}
      {cfg.checkpoints.map((cp, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute whitespace-nowrap text-center"
          style={{
            left: `${(cp.x / 1000) * 100}%`,
            top: `${(cp.y / cfg.height) * 100}%`,
            x: '-50%',
            y: '-185%',
          }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: play || reduce ? 1 : 0 }}
          transition={{ duration: 0.5, delay: play ? t.checkpoints[i] + 0.15 : 0, ease: 'easeOut' }}
        >
          <p className="text-[11px] font-semibold text-white sm:text-xs">{cp.label}</p>
          <p className="mt-0.5 text-[10px] text-white/55">{cp.sub}</p>
        </motion.div>
      ))}

      {/* "Before" caption, dim like the line it describes */}
      {cfg.beforeCaption && (
        <motion.p
          className="pointer-events-none absolute text-[11px] italic text-white/50"
          style={{
            left: `${(cfg.beforeCaption.x / 1000) * 100}%`,
            top: `${(cfg.beforeCaption.y / cfg.height) * 100}%`,
            x: '-50%',
          }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: play || reduce ? 1 : 0 }}
          transition={{ duration: 0.6, delay: t.caption }}
        >
          {cfg.beforeCaption.text}
        </motion.p>
      )}
    </div>
  )
}
