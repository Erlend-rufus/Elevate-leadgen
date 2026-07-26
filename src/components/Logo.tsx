interface LogoProps {
  className?: string
  /** Height in px — defaults to the 60px header variant */
  height?: number
}

/**
 * White Elevate wordmark with the curved gradient arrow as the signature
 * finish on the final "e". Inline SVG so it stays crisp on retina.
 * [REPLACE] Swap for the official SVG logo asset when delivered.
 */
export function Logo({ className = '', height = 40 }: LogoProps) {
  return (
    <span className={`inline-flex items-end gap-1 ${className}`} style={{ height }} aria-label="Elevate Marketing">
      <span
        className="font-display font-bold leading-none text-white"
        style={{ fontSize: height * 0.62, letterSpacing: '-0.03em' }}
      >
        elevate
      </span>
      <svg
        viewBox="0 0 64 44"
        fill="none"
        style={{ height: height * 0.72, marginBottom: height * 0.08 }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logo-arrow-gradient" x1="0" y1="44" x2="64" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#02009A" />
            <stop offset="55%" stopColor="#006ABA" />
            <stop offset="100%" stopColor="#00A3D6" />
          </linearGradient>
        </defs>
        <path
          d="M 6 38 C 22 36, 40 26, 54 8"
          stroke="url(#logo-arrow-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="0.1 7"
          fill="none"
        />
        <path
          d="M 46 16 L 54 8 L 44 6"
          stroke="url(#logo-arrow-gradient)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  )
}
