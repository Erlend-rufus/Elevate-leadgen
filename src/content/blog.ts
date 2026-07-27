/**
 * Blog article registry (content registry pattern — see CLAUDE.md §Architecture).
 * Metadata lives here (type-safe, drives the index, sitemap and JSON-LD);
 * article bodies are markdown files in src/content/blog/, loaded lazily.
 *
 * Publishing checklist for a new article:
 *  1. Drop the QA'd markdown body in src/content/blog/<slug>.md (no H1 in body).
 *  2. Add its entry below (draft: false).
 *  3. Add <url> to public/sitemap.xml (priority 0.6).
 * Compliance rules (no unsourced numbers, no invented cases, British English,
 * no exclamation marks) apply to every article — see the blog pilot brief.
 */

export interface BlogSource {
  name: string;
  url: string;
}

export interface BlogArticle {
  slug: string;
  /** H1 as rendered on the page. */
  title: string;
  /** <title> tag, max ~60 chars. */
  metaTitle: string;
  /** Meta description, max ~155 chars. */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  author: string;
  tags: string[];
  /** Named, linkable sources backing every figure used in the body. */
  sources: BlogSource[];
  /** Drafts render at their direct URL for QA but are excluded from the index. */
  draft?: boolean;
  /** Lazy-loads the markdown body. */
  load: () => Promise<string>;
}

export const blogIndex = {
  meta: {
    title: 'Blog | Elevate Marketing',
    description:
      'Plain-English guides on growth marketing, AI search visibility and paid media for UK service businesses. No hype, sources cited.',
  },
  eyebrow: 'THE BLOG',
  title: 'Marketing, explained properly.',
  sub: 'Plain-English guides for UK service businesses. Every figure sourced, no hype, and honest about when something is not worth your money.',
  empty: 'Articles are on their way. In the meantime, the free growth audit is the fastest way to see where you stand.',
};

export const articles: BlogArticle[] = [
  {
    slug: 'generative-engine-optimisation-explained',
    title: 'What is Generative Engine Optimisation (GEO)? A plain-English guide',
    metaTitle: 'What is GEO? A Plain-English Guide | Elevate Marketing',
    description:
      'Generative Engine Optimisation explained for UK service businesses: what GEO is, how it differs from SEO, and how to tell whether you need it.',
    date: '2026-07-27',
    author: 'Elevate Marketing',
    tags: ['geo', 'ai-search'],
    sources: [],
    draft: true,
    load: () => import('./blog/generative-engine-optimisation-explained.md?raw').then((m) => m.default),
  },
];

/** Articles shown on the index and eligible for the sitemap, newest first. */
export function publishedArticles(): BlogArticle[] {
  return articles
    .filter((a) => !a.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function findArticle(slug: string): BlogArticle | undefined {
  return articles.find((a) => a.slug === slug);
}
