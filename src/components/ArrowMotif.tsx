/**
 * Small gradient arrow SVG: the brand mark.
 * Approved applications only: Logo, FinalCTA background flourish (design.md §1).
 */
export default function ArrowMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="arrow-motif-gradient" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00A3D6" />
          <stop offset="0.5" stopColor="#006ABA" />
          <stop offset="1" stopColor="#02009A" />
        </linearGradient>
      </defs>
      <path
        d="M4 26 C 12 24, 20 16, 26 7"
        stroke="url(#arrow-motif-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M18 5 L 27 6 L 26 15"
        stroke="url(#arrow-motif-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
