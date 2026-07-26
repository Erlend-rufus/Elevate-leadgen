import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/Reveal';
import Icon from '@/components/Icon';
import FinalCTA from '@/components/FinalCTA';
import { usePageMeta } from '@/components/usePageMeta';
import { servicesIndex } from '@/content/services';
import { home } from '@/content/home';

/**
 * /services: hero + bento grid of all 7 services (mirrors the home Services
 * section, reusing its card copy) + shared FinalCTA.
 */
export default function ServicesIndex() {
  usePageMeta(servicesIndex.meta.title, servicesIndex.meta.description);
  return (
    <main>
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-4xl">
            <h1>{servicesIndex.title}</h1>
            <p className="mt-8 max-w-2xl text-lg text-[#b9bbd9]">{servicesIndex.sub}</p>
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
      <FinalCTA />
    </main>
  );
}
