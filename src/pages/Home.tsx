import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ChevronDown, Star } from 'lucide-react';
import CtaButton from '@/components/CtaButton';
import Reveal from '@/components/Reveal';
import Icon from '@/components/Icon';
import JourneyCurve from '@/components/JourneyCurve';
import FinalCTA from '@/components/FinalCTA';
import HomeStructuredData, { JsonLd } from '@/components/HomeStructuredData';
import { usePageMeta } from '@/components/usePageMeta';
import { home } from '@/content/home';
import { cases } from '@/content/cases';

export default function Home() {
  usePageMeta(home.meta.title, home.meta.description);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: home.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <main>
      <HomeStructuredData />
      <JsonLd data={faqJsonLd} />

      {/* 1. Hero */}
      <section className="section-pad relative overflow-hidden">
        <JourneyCurve
          variant="process"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full opacity-30"
        />
        <div className="container-site relative">
          <Reveal className="max-w-4xl">
            <p className="eyebrow">{home.hero.eyebrow}</p>
            <h1 className="mt-6">
              {home.hero.titleBefore}
              <span className="text-gradient">{home.hero.titleHighlight}</span>
              {home.hero.titleAfter}
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-[#b9bbd9]">{home.hero.sub}</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <CtaButton to="/growth-audit">{home.hero.primaryCta}</CtaButton>
              <CtaButton to="/results" variant="ghost">
                {home.hero.secondaryCta}
              </CtaButton>
            </div>
            <p className="mt-5 text-sm text-[#7c7ea6]">{home.hero.microcopy}</p>
          </Reveal>
        </div>
      </section>

      {/* 2. ProofBar */}
      <section className="border-y border-white/5">
        <div className="container-site grid grid-cols-2 divide-white/5 py-12 md:grid-cols-4 md:divide-x">
          {home.proofBar.map((metric, i) => (
            <Reveal key={metric.label} delay={i * 100} className="px-6 py-4 text-center">
              <div className="text-gradient font-display text-4xl font-bold md:text-5xl">
                {metric.value}
              </div>
              <div className="mt-2 text-sm text-[#7c7ea6]">{metric.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3. Problem */}
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{home.problem.eyebrow}</p>
            <h2 className="mt-4">{home.problem.title}</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {home.problem.cards.map((card, i) => (
              <Reveal key={card.title} delay={i * 100}>
                <div className="card-dark h-full">
                  <Icon name={card.icon} className="h-7 w-7 text-[#00a3d6]" />
                  <h3 className="mt-5">{card.title}</h3>
                  <p className="mt-3 text-[0.9375rem] text-[#b9bbd9]">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Services bento */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{home.services.eyebrow}</p>
            <h2 className="mt-4">{home.services.title}</h2>
            <p className="mt-6 text-lg text-[#b9bbd9]">{home.services.intro}</p>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {home.services.items.map((item, i) => (
              <Reveal key={item.slug} delay={i * 75} className={i === 0 ? 'md:col-span-2' : ''}>
                <Link to={`/services/${item.slug}`} className="group block h-full">
                  <div className="card-dark flex h-full flex-col">
                    <Icon name={item.icon} className="h-7 w-7 text-[#00a3d6]" />
                    <h3 className="mt-5">{item.name}</h3>
                    <p className="mt-2 text-[0.9375rem] text-[#b9bbd9]">{item.outcome}</p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-[#f4f5ff]">
                      {home.services.learnMore}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Process */}
      <section className="section-pad relative overflow-hidden border-t border-white/5">
        <JourneyCurve
          variant="process"
          className="pointer-events-none absolute inset-x-0 bottom-8 hidden h-48 w-full opacity-40 md:block"
        />
        <div className="container-site relative">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{home.process.eyebrow}</p>
            <h2 className="mt-4">{home.process.title}</h2>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {home.process.steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 150}>
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0b0b2e] font-display text-lg font-bold text-[#f4f5ff]">
                    {i + 1}
                  </div>
                  <h3 className="mt-6">{step.title}</h3>
                  <p className="mt-1 text-sm font-medium uppercase tracking-[0.14em] text-[#7c7ea6]">
                    {step.time}
                  </p>
                  <p className="mt-4 text-[0.9375rem] text-[#b9bbd9]">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-14">
            <CtaButton to="/growth-audit" variant="ghost">
              {home.process.cta}
            </CtaButton>
          </Reveal>
        </div>
      </section>

      {/* 6. ResultsTeaser */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="eyebrow">{home.resultsTeaser.eyebrow}</p>
              <h2 className="mt-4">{home.resultsTeaser.title}</h2>
            </div>
            <Link
              to="/results"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#f4f5ff] transition-colors hover:text-white"
            >
              {home.resultsTeaser.allResults}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {cases.map((study, i) => (
              <Reveal key={study.slug} delay={i * 100}>
                <Link to={`/results/${study.slug}`} className="group block h-full">
                  <div className="card-dark flex h-full flex-col">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#7c7ea6]">
                        {study.industry}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#7c7ea6]">
                        {study.service}
                      </span>
                    </div>
                    <div className="text-gradient mt-6 font-display text-5xl font-bold">
                      {study.headlineMetric.value}
                    </div>
                    <div className="mt-1 text-sm text-[#7c7ea6]">{study.headlineMetric.label}</div>
                    <p className="mt-4 text-[0.9375rem] text-[#b9bbd9]">{study.meta.description}</p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-[#f4f5ff]">
                      {home.resultsTeaser.readCase}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8">
            <p className="text-xs text-[#7c7ea6]">{home.resultsTeaser.disclaimer}</p>
          </Reveal>
        </div>
      </section>

      {/* 7. Testimonials */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{home.testimonials.eyebrow}</p>
            <h2 className="mt-4">{home.testimonials.title}</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {home.testimonials.items.map((item, i) => (
              <Reveal key={i} delay={i * 100}>
                <figure className="card-dark flex h-full flex-col">
                  <div className="flex gap-1" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-[#00a3d6] text-[#00a3d6]" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-5 text-[0.9375rem] text-[#b9bbd9]">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-auto flex items-center gap-3 pt-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#12123d] font-display text-sm font-semibold text-[#f4f5ff]">
                      {item.name.replace(/[[\]]/g, '').charAt(0) || '?'}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-[#f4f5ff]">{item.name}</span>
                      <span className="block text-xs text-[#7c7ea6]">{item.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 8. AboutTeaser */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{home.aboutTeaser.eyebrow}</p>
            <h2 className="mt-4">{home.aboutTeaser.title}</h2>
            <p className="mt-6 text-lg text-[#b9bbd9]">{home.aboutTeaser.body}</p>
            <div className="mt-10">
              <CtaButton to="/about" variant="ghost">
                {home.aboutTeaser.cta}
              </CtaButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{home.faq.eyebrow}</p>
            <h2 className="mt-4">{home.faq.title}</h2>
          </Reveal>
          <div className="mt-14 max-w-3xl divide-y divide-white/5 border-y border-white/5">
            {home.faq.items.map((item, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={item.q} delay={i * 50}>
                  <div>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`faq-panel-${i}`}
                      id={`faq-button-${i}`}
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-4 py-6 text-left"
                    >
                      <span className="font-display text-lg font-semibold text-[#f4f5ff]">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-[#7c7ea6] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    <div
                      id={`faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`faq-button-${i}`}
                      hidden={!open}
                    >
                      <p className="pb-6 text-[0.9375rem] text-[#b9bbd9]">{item.a}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. FinalCTA */}
      <FinalCTA />
    </main>
  );
}
