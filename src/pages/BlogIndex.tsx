import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/Reveal';
import FinalCTA from '@/components/FinalCTA';
import CtaButton from '@/components/CtaButton';
import { usePageMeta } from '@/components/usePageMeta';
import { blogIndex, publishedArticles } from '@/content/blog';

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** /blog: article index. Drafts are excluded (they render at their direct URL for QA). */
export default function BlogIndex() {
  usePageMeta(blogIndex.meta.title, blogIndex.meta.description);
  const items = publishedArticles();

  return (
    <>
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{blogIndex.eyebrow}</p>
            <h1 className="mt-4">{blogIndex.title}</h1>
            <p className="mt-6 text-lg text-[#b9bbd9]">{blogIndex.sub}</p>
          </Reveal>

          {items.length === 0 ? (
            <Reveal className="card-dark mt-14 max-w-2xl p-8">
              <p className="text-[#b9bbd9]">{blogIndex.empty}</p>
              <div className="mt-6">
                <CtaButton to="/growth-audit">Get the free growth audit</CtaButton>
              </div>
            </Reveal>
          ) : (
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {items.map((a, i) => (
                <Reveal key={a.slug} delay={i * 60}>
                  <Link
                    to={`/blog/${a.slug}`}
                    className="card-dark group flex h-full flex-col p-8 transition-colors hover:border-[#00a3d6]/40"
                  >
                    <p className="text-sm text-[#7c7ea6]">
                      {formatDate(a.date)} · {a.tags.join(' · ')}
                    </p>
                    <h2 className="mt-3 text-xl font-semibold leading-snug">{a.title}</h2>
                    <p className="mt-3 flex-1 text-[#b9bbd9]">{a.description}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#00a3d6]">
                      Read the article
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
