/**
 * SVG gradient curve with arrowhead: suggests upward trajectory.
 * variant 'process': used behind the Process steps (home) and optionally /audit.
 */
interface JourneyCurveProps {
  variant: 'process';
  className?: string;
}

export default function JourneyCurve({ variant, className }: JourneyCurveProps) {
  if (variant !== 'process') return null;
  return (
    <svg
      viewBox="0 0 1200 220"
      fill="none"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="journey-curve-gradient" x1="0" y1="220" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00A3D6" />
          <stop offset="0.5" stopColor="#006ABA" />
          <stop offset="1" stopColor="#02009A" />
        </linearGradient>
      </defs>
      <path
        d="M0 200 C 300 190, 500 140, 700 100 C 900 60, 1050 45, 1160 30"
        stroke="url(#journey-curve-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M1142 18 L 1178 26 L 1154 50"
        stroke="url(#journey-curve-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}
