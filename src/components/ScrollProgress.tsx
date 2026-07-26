import { useEffect, useState } from 'react';

/**
 * Thin gradient bar fixed at the top; width = scroll progress.
 * Disabled entirely with prefers-reduced-motion.
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setEnabled(true);
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-brand-gradient"
      style={{ transform: `scaleX(${progress})` }}
    />
  );
}
