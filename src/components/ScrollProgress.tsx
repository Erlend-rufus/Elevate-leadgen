import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

/**
 * Subtle scroll-progress indicator shaped as the brand arrow's path:
 * a 3px gradient track across the top of the viewport, tipped with the
 * arrowhead once you start moving. Pure transform — costs nothing.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 })
  // Arrowhead only exists once the track has somewhere to point from
  const tipOpacity = useTransform(scrollYProgress, [0, 0.02], [0, 1])

  if (reduce) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]" aria-hidden="true">
      <motion.div
        className="relative h-full origin-left bg-brand-gradient"
        style={{ scaleX }}
      >
        {/* Arrowhead riding the leading edge */}
        <motion.svg
          viewBox="0 0 24 14"
          className="absolute -right-1 top-1/2 h-3 w-5 -translate-y-1/2"
          style={{ opacity: tipOpacity }}
          fill="none"
        >
          <path
            d="M 2 12 L 22 2 M 13 1.5 L 22 2 L 20.5 11"
            stroke="#00A3D6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </motion.div>
    </div>
  )
}
