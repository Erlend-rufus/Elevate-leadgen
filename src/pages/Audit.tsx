import { CheckCircle2, ClipboardCheck, Eye, MessagesSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Reveal from '@/components/Reveal';
import JourneyCurve from '@/components/JourneyCurve';
import BookingEmbed from '@/components/BookingEmbed';
import { usePageMeta } from '@/components/usePageMeta';
import { audit } from '@/content/audit';

const riskIcons: Record<string, LucideIcon> = { ClipboardCheck, Eye, MessagesSquare };

/**
 * /audit — free audit conversion landing page (cases-audit-pages.md §C).
 * Chrome: App.tsx detects /growth-audit and renders minimal chrome (logo-only header,
 * legal-only footer) so this page stays distraction-free for ad traffic.
 */
export default function Audit() {
  usePageMeta(audit.meta.title, audit.meta.description);
  return (
    <main>
      {/* 1. Hero */}
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-4xl">
            <h1>
              {audit.hero.titleBefore}
              <span className="text-gradient">{audit.hero.titleHighlight}</span>
              {audit.hero.titleAfter}
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-[#b9bbd9]">{audit.hero.sub}</p>
          </Reveal>
        </div>
      </section>

      {/* 2 + 3. What the audit covers / What it costs */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site grid items-start gap-12 md:grid-cols-2">
          <Reveal>
            <h2>{audit.covers.title}</h2>
            <ul className="mt-10 space-y-5">
              {audit.covers.items.map((item) => (
                <li key={item} className="flex items-start gap-4">
                  <CheckCircle2
                    className="mt-0.5 h-6 w-6 shrink-0 text-[#00a3d6]"
                    aria-hidden="true"
                  />
                  <span className="text-lg text-[#b9bbd9]">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <div className="card-dark">
              <h3>{audit.cost.title}</h3>
              <div className="text-gradient mt-6 font-display text-6xl font-bold md:text-7xl">
                {audit.cost.value}
              </div>
              <p className="mt-6 text-[0.9375rem] text-[#b9bbd9]">{audit.cost.body}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. What happens after — allowed JourneyCurve exception (design.md §1) */}
      <section className="section-pad relative overflow-hidden border-t border-white/5">
        <JourneyCurve
          variant="process"
          className="pointer-events-none absolute inset-x-0 bottom-8 hidden h-48 w-full opacity-40 md:block"
        />
        <div className="container-site relative">
          <Reveal className="max-w-3xl">
            <h2>{audit.after.title}</h2>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {audit.after.steps.map((step, i) => (
              <Reveal key={step} delay={i * 150}>
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0b0b2e] font-display text-lg font-bold text-[#f4f5ff]">
                    {i + 1}
                  </div>
                  <h3 className="mt-6">{step}</h3>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12">
            <p className="text-sm text-[#7c7ea6]">{audit.after.note}</p>
          </Reveal>
        </div>
      </section>

      {/* 5. Booking */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="mx-auto max-w-3xl">
            <BookingEmbed />
          </Reveal>
        </div>
      </section>

      {/* 6. Risk reducers */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <div className="grid gap-6 md:grid-cols-3">
            {audit.riskReducers.map((card, i) => {
              const RiskIcon = riskIcons[card.icon] ?? ClipboardCheck;
              return (
                <Reveal key={card.title} delay={i * 100}>
                  <div className="card-dark h-full">
                    <RiskIcon className="h-7 w-7 text-[#00a3d6]" aria-hidden="true" />
                    <h3 className="mt-5">{card.title}</h3>
                    <p className="mt-3 text-[0.9375rem] text-[#b9bbd9]">{card.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
