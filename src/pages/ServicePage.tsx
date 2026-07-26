import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowRight, Check, ChevronDown, X } from 'lucide-react';
import CtaButton from '@/components/CtaButton';
import Reveal from '@/components/Reveal';
import Icon from '@/components/Icon';
import FinalCTA from '@/components/FinalCTA';
import { JsonLd } from '@/components/HomeStructuredData';
import { usePageMeta } from '@/components/usePageMeta';
import { servicePage, services } from '@/content/services';
import { cases } from '@/content/cases';
import { site } from '@/content/site';

/**
 * /services/:slug — one reusable component rendering the 8-section template
 * (services.md) for any of the 7 services. Unknown slugs redirect to /services.
 */
export default function ServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const service = services.find((s) => s.slug === slug);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  usePageMeta(
    service?.meta.title ?? 'Services — Elevate Marketing',
    service?.meta.description ?? '',
  );

  if (!service) {
    return <Navigate to="/services" replace />;
  }

  const relatedCase = cases.find((c) => c.slug === service.relatedCase);

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.meta.description,
    provider: {
      '@type': 'Organization',
      name: site.brand,
      url: site.url,
    },
    areaServed: 'GB',
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: service.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <main>
      <JsonLd data={[serviceJsonLd, faqJsonLd]} />

      {/* 1. Hero */}
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-4xl">
            <p className="eyebrow">
              {servicePage.heroEyebrow} {service.name}
            </p>
            <h1 className="mt-6">
              {service.heroTitle.before}
              <span className="text-gradient">{service.heroTitle.highlight}</span>
              {service.heroTitle.after}
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-[#b9bbd9]">{service.sub}</p>
            <div className="mt-10">
              <CtaButton to="/growth-audit">{servicePage.heroCta}</CtaButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. Who it's for / when it's wrong */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="card-dark h-full">
              <h2 className="text-2xl">{servicePage.fit.forYou}</h2>
              <ul className="mt-6 space-y-4">
                {service.whoFor.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#00a3d6]" aria-hidden="true" />
                    <span className="text-[0.9375rem] text-[#b9bbd9]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="card-dark h-full">
              <h2 className="text-2xl">{servicePage.fit.wrongSpend}</h2>
              <ul className="mt-6 space-y-4">
                {service.notFor.map((item) => (
                  <li key={item} className="flex gap-3">
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-[#7c7ea6]" aria-hidden="true" />
                    <span className="text-[0.9375rem] text-[#b9bbd9]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. What's included */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <h2>{servicePage.includedTitle}</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {service.included.map((item, i) => (
              <Reveal key={item.title} delay={i * 75}>
                <div className="card-dark h-full">
                  <Icon name={item.icon} className="h-7 w-7 text-[#00a3d6]" />
                  <h3 className="mt-5">{item.title}</h3>
                  <p className="mt-3 text-[0.9375rem] text-[#b9bbd9]">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. First 30 days */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <h2>{servicePage.process.title}</h2>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {service.process30.map((step, i) => (
              <Reveal key={step.title} delay={i * 150}>
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0b0b2e] font-display text-lg font-bold text-[#f4f5ff]">
                    {i + 1}
                  </div>
                  <h3 className="mt-6">{step.title}</h3>
                  <p className="mt-1 text-sm font-medium uppercase tracking-[0.14em] text-[#7c7ea6]">
                    {servicePage.process.weeks[i]}
                  </p>
                  <p className="mt-4 text-[0.9375rem] text-[#b9bbd9]">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Pricing guidance */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <h2>{servicePage.pricingTitle}</h2>
            <div className="card-dark mt-10">
              <div className="font-display text-3xl font-bold text-[#f4f5ff] md:text-4xl">
                {service.pricingFrom}
              </div>
              <p className="mt-4 text-[0.9375rem] text-[#b9bbd9]">{service.pricingNote}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. Related case */}
      {relatedCase && (
        <section className="section-pad border-t border-white/5">
          <div className="container-site">
            <Reveal className="max-w-3xl">
              <h2>{servicePage.relatedCase.title}</h2>
            </Reveal>
            <Reveal delay={100} className="mt-10 max-w-3xl">
              <Link to={`/results/${relatedCase.slug}`} className="group block">
                <div className="card-dark flex h-full flex-col">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#7c7ea6]">
                      {relatedCase.industry}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#7c7ea6]">
                      {relatedCase.service}
                    </span>
                  </div>
                  <div className="text-gradient mt-6 font-display text-5xl font-bold">
                    {relatedCase.headlineMetric.value}
                  </div>
                  <div className="mt-1 text-sm text-[#7c7ea6]">
                    {relatedCase.headlineMetric.label}
                  </div>
                  <p className="mt-4 text-[0.9375rem] text-[#b9bbd9]">
                    {relatedCase.meta.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-[#f4f5ff]">
                    {servicePage.relatedCase.readCase}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* 7. Mini-FAQ */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{servicePage.faq.eyebrow}</p>
            <h2 className="mt-4">{servicePage.faq.title}</h2>
          </Reveal>
          <div className="mt-14 max-w-3xl divide-y divide-white/5 border-y border-white/5">
            {service.faq.map((item, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={item.q} delay={i * 50}>
                  <div>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`service-faq-panel-${i}`}
                      id={`service-faq-button-${i}`}
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
                      id={`service-faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`service-faq-button-${i}`}
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

      {/* 8. FinalCTA */}
      <FinalCTA />
    </main>
  );
}
