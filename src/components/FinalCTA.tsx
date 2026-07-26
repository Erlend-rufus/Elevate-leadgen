import ArrowMotif from './ArrowMotif';
import CtaButton from './CtaButton';
import Reveal from './Reveal';
import { home } from '@/content/home';

/**
 * Full-width final CTA with a subtle ArrowMotif background flourish
 * (approved arrow application, design.md §1).
 */
export default function FinalCTA() {
  const { finalCta } = home;
  return (
    <section className="section-pad relative overflow-hidden border-t border-white/5">
      <ArrowMotif
        className="pointer-events-none absolute -right-16 bottom-0 h-[28rem] w-[28rem] opacity-[0.07]"
      />
      <div className="container-site relative">
        <Reveal className="max-w-3xl">
          <h2>{finalCta.title}</h2>
          <p className="mt-6 text-lg text-[#b9bbd9]">{finalCta.sub}</p>
          <div className="mt-10">
            <CtaButton to="/growth-audit">{finalCta.cta}</CtaButton>
          </div>
          <p className="mt-5 text-sm text-[#7c7ea6]">{finalCta.microcopy}</p>
        </Reveal>
      </div>
    </section>
  );
}
