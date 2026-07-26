import { motion, useReducedMotion } from 'framer-motion'

interface ArrowMotifProps {
  className?: string
  /** Run the stroke-draw animation when it enters the viewport */
  animate?: boolean
  /** Delay before the draw animation starts (seconds) */
  delay?: number
}

/**
 * The signature dotted gradient arrow from the Elevate logo.
 * Dots travel slowly along the stroke (CSS), and in the hero the arrow
 * draws itself on scroll via a mask whose pathLength is animated.
 */
export function ArrowMotif({ className = '', animate = false, delay = 0 }: ArrowMotifProps) {
  const reduce = useReducedMotion()

  const curve = 'M 30 220 C 180 210, 380 150, 520 40'
  const head = 'M 507 65 L 520 40 L 493 46'

  return (
    <svg
      viewBox="0 0 600 260"
      fill="none"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient
          id="arrow-gradient"
          gradientUnits="userSpaceOnUse"
          x1="30"
          y1="220"
          x2="520"
          y2="40"
        >
          <stop offset="0%" stopColor="#02009A" />
          <stop offset="55%" stopColor="#006ABA" />
          <stop offset="100%" stopColor="#00A3D6" />
        </linearGradient>
        <mask id="arrow-draw-mask">
          <motion.path
            d={curve}
            stroke="#fff"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
            initial={animate && !reduce ? { pathLength: 0 } : { pathLength: 1 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1.4, delay, ease: 'easeInOut' }}
          />
        </mask>
      </defs>

      {/* Dotted curve, revealed through the animated mask */}
      <g mask={animate ? 'url(#arrow-draw-mask)' : undefined}>
        <path
          d={curve}
          stroke="url(#arrow-gradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="0.1 13"
          className={reduce ? '' : 'arrow-flow'}
          fill="none"
        />
      </g>

      {/* Arrowhead pops in as the draw completes */}
      <motion.path
        d={head}
        stroke="url(#arrow-gradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={animate && !reduce ? { opacity: 0 } : { opacity: 1 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.35, delay: animate ? delay + 1.15 : 0, ease: 'easeOut' }}
      />
    </svg>
  )
}
