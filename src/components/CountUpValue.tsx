import { useEffect, useRef, useState } from 'react';

const NUMBER_RE = /-?\d+(?:\.\d+)?/;

interface CountUpValueProps {
  /** Full display string, e.g. "£2.4M+", "-38%", "4.2×", "10". */
  value: string;
  duration?: number;
}

/**
 * Renders a metric string, counting its numeric portion up from 0 once it
 * scrolls into view (IntersectionObserver, once only — same threshold and
 * once-only contract as Reveal). A string with no digits at all (a
 * "[REPLACE]%" placeholder) is rendered as-is: no fake number ever counts
 * up. Respects prefers-reduced-motion by skipping straight to the final
 * value, also matching Reveal.
 */
export default function CountUpValue({ value, duration = 1200 }: CountUpValueProps) {
  const match = value.match(NUMBER_RE);
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(() => {
    if (!match || match.index === undefined) return value;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return value;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice(match.index + match[0].length);
    const decimals = match[0].includes('.') ? match[0].split('.')[1].length : 0;
    return `${prefix}${(0).toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    const localMatch = value.match(NUMBER_RE);
    if (!localMatch || localMatch.index === undefined) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;

    const prefix = value.slice(0, localMatch.index);
    const suffix = value.slice(localMatch.index + localMatch[0].length);
    const target = parseFloat(localMatch[0]);
    const decimals = localMatch[0].includes('.') ? localMatch[0].split('.')[1].length : 0;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          let start: number | null = null;
          const step = (timestamp: number) => {
            if (start === null) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - (1 - progress) ** 3;
            setDisplay(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`);
            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              setDisplay(value);
            }
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display}</span>;
}
