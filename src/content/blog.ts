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
    slug: 'what-is-generative-engine-optimisation',
    title: 'What is Generative Engine Optimisation (GEO)? A plain-English guide',
    metaTitle: 'What Is GEO? Generative Engine Optimisation Explained',
    description:
      'Generative engine optimisation (GEO) explained in plain English: what it is, how AI assistants choose their sources, and what UK service businesses can do.',
    date: '2026-07-27',
    author: 'Elevate Marketing',
    tags: ['geo', 'ai-search'],
    sources: [
      { name: 'Gartner press release: Gartner Predicts Search Engine Volume Will Drop 25% by 2026, February 2024', url: 'https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents' },
      { name: 'Google Search Central: AI features and your website', url: 'https://developers.google.com/search/docs/appearance/ai-features' },
      { name: 'OpenAI documentation: OpenAI crawlers', url: 'https://developers.openai.com/api/docs/bots' },
      { name: 'TechCrunch: Sam Altman says ChatGPT has hit 800M weekly active users, October 2025', url: 'https://techcrunch.com/2025/10/06/sam-altman-says-chatgpt-has-hit-800m-weekly-active-users/' },
    ],
    load: () => import('./blog/what-is-generative-engine-optimisation.md?raw').then((m) => m.default),
  },
  {
    slug: 'business-not-showing-in-chatgpt',
    title: 'Why doesn\'t my business show up in ChatGPT\'s answers?',
    metaTitle: 'Why Your Business Doesn\'t Show Up in ChatGPT\'s Answers',
    description:
      'Your business is invisible in ChatGPT for specific, fixable reasons. How assistants choose sources, how to check your visibility, and what to fix.',
    date: '2026-07-27',
    author: 'Elevate Marketing',
    tags: ['ai-search', 'geo', 'chatgpt'],
    sources: [
      { name: 'OpenAI documentation: OpenAI crawlers', url: 'https://developers.openai.com/api/docs/bots' },
      { name: 'TechCrunch: Sam Altman says ChatGPT has hit 800M weekly active users, October 2025', url: 'https://techcrunch.com/2025/10/06/sam-altman-says-chatgpt-has-hit-800m-weekly-active-users/' },
      { name: 'Pew Research Center: Google users are less likely to click on links when an AI summary appears, July 2025', url: 'https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/' },
      { name: 'Google Search Central: Creating helpful, reliable, people-first content', url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content' },
    ],
    load: () => import('./blog/business-not-showing-in-chatgpt.md?raw').then((m) => m.default),
  },
  {
    slug: 'ai-overviews-zero-click-search-uk',
    title: 'AI Overviews and zero-click search: what UK service businesses should actually do',
    metaTitle: 'AI Overviews and Zero-Click Search: What UK Firms Should Do',
    description:
      'AI Overviews are cutting clicks on some searches. What the best current research actually shows, what it means for UK service businesses, and the response.',
    date: '2026-07-27',
    author: 'Elevate Marketing',
    tags: ['seo', 'ai-overviews', 'ai-search'],
    sources: [
      { name: 'Pew Research Center: Google users are less likely to click on links when an AI summary appears, July 2025', url: 'https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/' },
      { name: 'Google Search Central: AI features and your website', url: 'https://developers.google.com/search/docs/appearance/ai-features' },
      { name: 'Google Search Central: Creating helpful, reliable, people-first content', url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content' },
      { name: 'Gartner press release: Gartner Predicts Search Engine Volume Will Drop 25% by 2026, February 2024', url: 'https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents' },
    ],
    load: () => import('./blog/ai-overviews-zero-click-search-uk.md?raw').then((m) => m.default),
  },
  {
    slug: 'google-ads-agency-wasting-budget',
    title: 'How to tell if your Google Ads agency is wasting your budget',
    metaTitle: 'Is Your Google Ads Agency Wasting Your Budget? 7 Signs',
    description:
      'Seven practical checks to tell whether your Google Ads agency is wasting your budget, from conversion tracking and search terms to access and reporting.',
    date: '2026-07-27',
    author: 'Elevate Marketing',
    tags: ['google-ads', 'ppc'],
    sources: [
      { name: 'Google Ads Help: About Quality Score', url: 'https://support.google.com/google-ads/answer/6167118' },
      { name: 'Google Ads Help: About Smart Bidding', url: 'https://support.google.com/google-ads/answer/7065882' },
      { name: 'Google Ads Help: About optimisation score', url: 'https://support.google.com/google-ads/answer/9061546' },
    ],
    load: () => import('./blog/google-ads-agency-wasting-budget.md?raw').then((m) => m.default),
  },
  {
    slug: 'how-to-choose-a-marketing-agency-uk',
    title: 'How to choose a marketing agency when you\'ve been burned before',
    metaTitle: 'How to Choose a Marketing Agency After Being Burned',
    description:
      'Been let down by a marketing agency before? Practical checks, from Companies House to contract terms, for choosing your next UK agency with confidence.',
    date: '2026-07-27',
    author: 'Elevate Marketing',
    tags: ['marketing-agency', 'buying'],
    sources: [
      { name: 'ASA/CAP Advice Online: Misleading advertising', url: 'https://www.asa.org.uk/advice-online/misleading-advertising.html' },
      { name: 'ASA/CAP Advice Online: Substantiation', url: 'https://www.asa.org.uk/advice-online/substantiation.html' },
      { name: 'ASA/CAP Advice Online: Testimonials and endorsements', url: 'https://www.asa.org.uk/advice-online/testimonials-and-endorsements.html' },
      { name: 'Companies House: Find and update company information', url: 'https://find-and-update.company-information.service.gov.uk/' },
    ],
    load: () => import('./blog/how-to-choose-a-marketing-agency-uk.md?raw').then((m) => m.default),
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
