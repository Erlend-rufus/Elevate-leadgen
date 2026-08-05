import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { marked } from 'marked';
import Reveal from '@/components/Reveal';
import FinalCTA from '@/components/FinalCTA';
import CtaButton from '@/components/CtaButton';
import { JsonLd } from '@/components/HomeStructuredData';
import { usePageMeta } from '@/components/usePageMeta';
import { findArticle } from '@/content/blog';
import { site } from '@/content/site';

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * /blog/:slug: renders a registry article. Bodies are QA'd first-party markdown
 * (see the blog pilot brief), so the marked output is trusted as-is.
 */
export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? findArticle(slug) : undefined;
  const [html, setHtml] = useState<string | null>(null);

  usePageMeta(
    article?.metaTitle ?? 'Blog | Elevate Marketing',
    article?.description ?? '',
  );

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    if (article) {
      article.load().then((md) => {
        if (!cancelled) setHtml(marked.parse(md, { async: false }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [article]);

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: { '@type': 'Organization', name: site.brand, url: site.url },
    publisher: { '@type': 'Organization', name: site.brand, url: site.url },
    mainEntityOfPage: `${site.url}/blog/${article.slug}`,
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <article className="section-pad">
        <div className="container-site">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-sm text-[#7c7ea6] transition-colors hover:text-[#b9bbd9]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All articles
              </Link>
              <p className="eyebrow mt-8">{article.tags.join(' · ')}</p>
              <h1 className="mt-4">{article.title}</h1>
              <p className="mt-5 text-sm text-[#7c7ea6]">
                {formatDate(article.date)} · {article.author}
              </p>
            </Reveal>

            {html === null ? (
              <div className="mt-12 flex justify-center" role="status" aria-label="Loading article">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00a3d6]" />
              </div>
            ) : (
              <Reveal className="prose-blog mt-12" >
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </Reveal>
            )}

            {article.sources.length > 0 && (
              <div className="mt-14 border-t border-white/5 pt-8">
                <p className="eyebrow">Sources</p>
                <ul className="mt-4 space-y-2 text-sm text-[#7c7ea6]">
                  {article.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-[#b9bbd9]"
                      >
                        {s.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card-dark mt-14 p-8">
              <h2 className="text-xl font-semibold">See where you stand first</h2>
              <p className="mt-3 text-[#b9bbd9]">
                Our free growth audit shows you what is working, what is not, and what to fix first,
                before you spend another pound. No obligation, and the findings are yours to keep.
              </p>
              <div className="mt-6">
                <CtaButton to="/growth-audit">Get the free growth audit</CtaButton>
              </div>
            </div>
          </div>
        </div>
      </article>
      <FinalCTA />
    </>
  );
}
