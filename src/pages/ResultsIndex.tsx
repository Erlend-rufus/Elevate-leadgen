import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import FinalCTA from '@/components/FinalCTA';
import Reveal from '@/components/Reveal';
import { usePageMeta } from '@/components/usePageMeta';
import { cases, resultsIndex } from '@/content/cases';

export default function ResultsIndex() {
  usePageMeta(resultsIndex.meta.title, resultsIndex.meta.description);

  return (
    <main>
      {/* Hero */}
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <h1>{resultsIndex.title}</h1>
            <p className="mt-8 max-w-2xl text-lg text-[#b9bbd9]">{resultsIndex.sub}</p>
          </Reveal>
        </div>
      </section>

      {/* Case cards */}
      <section className="border-t border-white/5">
        <div className="container-site space-y-6 py-24 md:py-32">
          {cases.map((study, i) => (
            <Reveal key={study.slug} delay={i * 100}>
              <Link to={`/results/${study.slug}`} className="group block">
                <article className="card-dark">
                  <div className="flex flex-wrap gap-2">
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
                  <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="text-gradient font-display text-6xl font-bold md:text-7xl">
                        {study.headlineMetric.value}
                      </div>
                      <div className="mt-2 text-sm text-[#7c7ea6]">
                        {study.headlineMetric.label}
                      </div>
                    </div>
                    <div className="md:max-w-xl">
                      <h2 className="font-display text-xl font-semibold text-[#f4f5ff] md:text-2xl">
                        {study.title}
                      </h2>
                      <p className="mt-3 text-[0.9375rem] text-[#b9bbd9]">{study.summary}</p>
                      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#f4f5ff]">
                        {resultsIndex.readCase}
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
