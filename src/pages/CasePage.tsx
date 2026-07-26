import { Link, Navigate, useParams } from 'react-router';
import { ArrowRight } from 'lucide-react';
import CtaButton from '@/components/CtaButton';
import FinalCTA from '@/components/FinalCTA';
import Reveal from '@/components/Reveal';
import { usePageMeta } from '@/components/usePageMeta';
import { casePage, cases } from '@/content/cases';
import { services } from '@/content/services';

export default function CasePage() {
  const { slug } = useParams<{ slug: string }>();
  const study = cases.find((c) => c.slug === slug);
  usePageMeta(
    study?.meta.title ?? 'Case study | Elevate Marketing',
    study?.meta.description ?? '',
  );

  if (!study) {
    return <Navigate to="/results" replace />;
  }

  const relatedService = services.find((s) => s.slug === study.relatedService);

  return (
    <main>
      {/* 1. Hero */}
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-4xl">
            <p className="eyebrow">{`${casePage.eyebrow} · ${study.industry}`}</p>
            <h1 className="mt-6">{study.title}</h1>
            <div className="mt-12">
              <div className="text-gradient font-display text-7xl font-bold md:text-8xl">
                {study.headlineMetric.value}
              </div>
              <div className="mt-3 text-sm text-[#7c7ea6]">{study.headlineMetric.label}</div>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#7c7ea6]">
                {study.industry}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#7c7ea6]">
                {study.service}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#7c7ea6]">
                {study.period}
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. Situation */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <h2>{casePage.situationTitle}</h2>
            <div className="mt-8 space-y-6">
              {study.situation.map((paragraph) => (
                <p key={paragraph} className="text-lg text-[#b9bbd9]">
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. Approach */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <h2>{casePage.approachTitle}</h2>
          </Reveal>
          <ol className="mt-14 max-w-3xl space-y-12">
            {study.approach.map((step, i) => (
              <Reveal key={step.title} delay={i * 100} as="li">
                <div className="flex gap-6 md:gap-10">
                  <span
                    className="font-display text-2xl font-bold text-[#7c7ea6]"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p className="mt-3 text-[0.9375rem] text-[#b9bbd9]">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Results panel (ProofBar style) */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <h2>{casePage.resultsTitle}</h2>
          </Reveal>
          <Reveal className="mt-14">
            <div className="card-dark">
              <div className="grid grid-cols-2 divide-white/5 md:grid-cols-4 md:divide-x">
                {study.results.map((metric) => (
                  <div key={metric.label} className="px-4 py-4 text-center md:px-6">
                    <div className="text-gradient font-display text-4xl font-bold md:text-5xl">
                      {metric.value}
                    </div>
                    <div className="mt-2 text-sm text-[#7c7ea6]">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. What this means for you */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <h2>{casePage.meaningTitle}</h2>
          </Reveal>
          <ul className="mt-12 max-w-3xl space-y-6">
            {study.meaning.map((item, i) => (
              <Reveal key={item} delay={i * 100} as="li">
                <div className="flex items-start gap-4">
                  <ArrowRight
                    className="mt-1.5 h-5 w-5 shrink-0 text-[#00a3d6]"
                    aria-hidden="true"
                  />
                  <p className="text-lg text-[#b9bbd9]">{item}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Quote block ([REPLACE] markers stay verbatim) */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal>
            <figure className="card-dark mx-auto max-w-4xl md:p-12">
              <blockquote className="font-display text-2xl font-semibold leading-snug text-[#f4f5ff] md:text-3xl">
                “{study.quote.text}”
              </blockquote>
              <figcaption className="mt-8 text-sm text-[#7c7ea6]">
                {study.quote.name} · {study.quote.role}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 7. CTA row + related service */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="flex flex-wrap items-center gap-4">
            <CtaButton to="/growth-audit">{casePage.primaryCta}</CtaButton>
            <CtaButton to="/results" variant="ghost">
              {casePage.allResults}
            </CtaButton>
          </Reveal>
          {relatedService && (
            <Reveal className="mt-8">
              <Link
                to={`/services/${relatedService.slug}`}
                className="group inline-flex items-center gap-2 text-sm font-medium text-[#f4f5ff] transition-colors hover:text-white"
              >
                {casePage.relatedServiceLink.replace('{service}', relatedService.name)}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Reveal>
          )}
        </div>
      </section>

      {/* 8. Final CTA */}
      <FinalCTA />
    </main>
  );
}
