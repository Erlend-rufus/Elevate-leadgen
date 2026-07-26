import { Compass, PoundSterling, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import CtaButton from '@/components/CtaButton';
import Reveal from '@/components/Reveal';
import FinalCTA from '@/components/FinalCTA';
import { usePageMeta } from '@/components/usePageMeta';
import { about } from '@/content/about';

const valueIcons: Record<string, LucideIcon> = { PoundSterling, Compass, Users };

/** /about: about the agency (cases-audit-pages.md §D). */
export default function About() {
  usePageMeta(about.meta.title, about.meta.description);
  return (
    <main>
      {/* Hero + story */}
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-4xl">
            <h1>
              {about.hero.titleBefore}
              <span className="text-gradient">{about.hero.titleHighlight}</span>
              {about.hero.titleAfter}
            </h1>
          </Reveal>
          <div className="mt-14 max-w-3xl space-y-8">
            {about.story.map((paragraph, i) => (
              <Reveal key={i} delay={i * 100}>
                <p className="text-lg text-[#b9bbd9]">{paragraph}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal>
            <h2>The people in your accounts.</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {about.team.map((person, i) => (
              <Reveal key={person.name} delay={i * 100}>
                <div className="card-dark h-full">
                  <div className="flex items-center gap-5">
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#12123d] font-display text-lg font-semibold text-[#f4f5ff]"
                      aria-hidden="true"
                    >
                      {person.initials}
                    </span>
                    <div>
                      <h3 className="font-display text-xl">{person.name}</h3>
                      <p className="text-sm text-[#7c7ea6]">
                        {person.role} · {person.location}
                      </p>
                    </div>
                  </div>
                  <p className="mt-6 text-[0.9375rem] text-[#b9bbd9]">{person.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8">
            <p className="text-sm text-[#7c7ea6]">{about.teamNote}</p>
          </Reveal>
        </div>
      </section>

      {/* Values + CTA */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <div className="grid gap-6 md:grid-cols-3">
            {about.values.map((value, i) => {
              const ValueIcon = valueIcons[value.icon] ?? Compass;
              return (
                <Reveal key={value.title} delay={i * 100}>
                  <div className="card-dark h-full">
                    <ValueIcon className="h-7 w-7 text-[#00a3d6]" aria-hidden="true" />
                    <h3 className="mt-5">{value.title}</h3>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Reveal className="mt-14">
            <CtaButton to="/growth-audit">{about.cta}</CtaButton>
          </Reveal>
        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
