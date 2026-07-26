/**
 * All 7 services (services.md). One reusable ServicePage renders any slug.
 * `heroTitle.highlight` is the word rendered with the brand gradient.
 * `icon` values are lucide-react icon names (see src/components/Icon.tsx).
 */
export const servicesIndex = {
  meta: {
    title: 'Services | Elevate Marketing',
    description:
      'Google Ads, Meta Ads, SEO, AI-search (GEO), web design, email and consulting: one team, one measurement plan.',
  },
  title: 'Every channel that matters. One measurement plan.',
  sub: 'Each service page says exactly what is included, what it costs from, and when it is the wrong spend.',
};
export interface ServiceIncluded {
  title: string;
  desc: string;
  icon: string;
}

export interface ProcessStep {
  title: string;
  desc: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Service {
  slug: string;
  name: string;
  icon: string;
  heroTitle: { before: string; highlight: string; after: string };
  sub: string;
  whoFor: string[];
  notFor: string[];
  included: ServiceIncluded[];
  process30: ProcessStep[];
  pricingFrom: string;
  pricingNote: string;
  relatedCase: string;
  faq: FaqItem[];
  meta: { title: string; description: string };
}

export const services: Service[] = [
  {
    slug: 'google-ads',
    name: 'Google Ads',
    icon: 'Target',
    heroTitle: { before: 'Show up when buyers are ready to ', highlight: 'buy', after: '.' },
    sub: 'Search and Shopping campaigns managed against cost per qualified lead, not clicks.',
    whoFor: [
      'You have proven demand and people already search for what you sell.',
      'Your site converts, or you will let us fix it.',
      'You can handle more enquiries within 30 days.',
      'You know what a lead is worth to you.',
    ],
    notFor: [
      'Nobody searches for your product yet (consider Meta Ads instead).',
      'Your margin cannot support paid clicks in your niche; we will tell you in the audit.',
      'You want guaranteed #1 rankings. Nobody honest sells that.',
    ],
    included: [
      {
        title: 'Account audit & restructure',
        desc: 'Full review of keywords, waste and tracking; most accounts we take over waste 20–40% of spend.',
        icon: 'ClipboardCheck',
      },
      {
        title: 'Search & Shopping campaigns',
        desc: 'Build-out around buying-intent terms, not vanity traffic.',
        icon: 'Search',
      },
      {
        title: 'Conversion tracking that works',
        desc: 'Calls, forms and purchases tracked to revenue, fixed before scaling.',
        icon: 'Crosshair',
      },
      {
        title: 'Landing page recommendations',
        desc: 'Specific changes, ranked by expected impact.',
        icon: 'LayoutTemplate',
      },
      {
        title: 'Weekly optimisation',
        desc: 'Bids, negatives, budgets: reviewed every week, not every quarter.',
        icon: 'RefreshCw',
      },
      {
        title: 'Plain-English reporting',
        desc: 'Spend in, revenue out, and what we are doing next.',
        icon: 'FileText',
      },
    ],
    process30: [
      { title: 'Audit', desc: 'We map where current spend makes or loses money.' },
      { title: 'Strategy', desc: 'Restructure plan with forecast cost per lead.' },
      { title: 'Scale', desc: 'Relaunch, measure weekly, scale winners.' },
    ],
    /** Engagement start confirmed by client (July 2026). */
    pricingFrom: 'From €1,500/month',
    pricingNote: 'Fee depends on spend level and campaign count.',
    relatedCase: 'trades-lead-gen',
    faq: [
      {
        q: 'What budget do we need?',
        a: 'Most UK SMEs see meaningful signal from £1,500/month in media spend. The audit tells you what is realistic in your niche.',
      },
      {
        q: 'Do you work with existing accounts?',
        a: 'Yes. Most clients come to us with an account that needs restructuring. We keep what works and cut what does not.',
      },
      {
        q: "How is this different from Google's own recommendations?",
        a: "Google's reps optimise for Google revenue. We optimise for yours, including telling you when to spend less.",
      },
    ],
    meta: {
      title: 'Google Ads management | Elevate Marketing',
      description:
        'Search and Shopping campaigns managed against cost per qualified lead. Free audit, plain-English reporting, no long contracts.',
    },
  },
  {
    slug: 'meta-ads',
    name: 'Meta Ads',
    icon: 'Share2',
    heroTitle: { before: 'Create demand where your buyers ', highlight: 'scroll', after: '.' },
    sub: 'Facebook and Instagram campaigns that turn cold audiences into booked calls and orders.',
    whoFor: [
      'Your buyers are consumers or prosumers who discover products on social.',
      'You have (or will let us produce) thumb-stopping creative.',
      'You can follow up leads within 24 hours.',
      'Your offer has a clear, provable promise.',
    ],
    notFor: [
      'Your product needs long, considered B2B sales cycles (consider Consulting or LinkedIn; we do not run LinkedIn).',
      'You have no creative assets and no budget to make them.',
      'You judge campaigns on likes.',
    ],
    included: [
      {
        title: 'Creative strategy & production briefs',
        desc: 'Angles and hooks we write; formats proven on your audience.',
        icon: 'PenTool',
      },
      {
        title: 'Full-funnel campaign structure',
        desc: 'Prospecting, retargeting and retention, not one blended mess.',
        icon: 'Filter',
      },
      {
        title: 'Pixel + Conversions API setup',
        desc: 'Server-side tracking so reporting survives iOS.',
        icon: 'Cable',
      },
      {
        title: 'Audience testing roadmap',
        desc: 'Structured tests with clear pass/fail rules.',
        icon: 'Users',
      },
      {
        title: 'Weekly creative iteration',
        desc: 'Fatigue is the silent killer; we refresh before performance drops.',
        icon: 'RefreshCw',
      },
      {
        title: 'Reporting tied to revenue',
        desc: 'Cost per purchase or lead, compared against your margin.',
        icon: 'PoundSterling',
      },
    ],
    process30: [
      { title: 'Audit', desc: 'Account, pixel and creative review with quick wins.' },
      { title: 'Strategy', desc: 'Angle matrix + 90-day testing plan.' },
      { title: 'Scale', desc: 'Launch tests, kill losers fast, scale winners.' },
    ],
    /** Engagement start confirmed by client (July 2026). */
    pricingFrom: 'From €1,500/month',
    pricingNote: 'Fee depends on creative volume and spend.',
    relatedCase: 'clinic-meta-ads',
    faq: [
      {
        q: 'How much creative do we need?',
        a: 'Plan for 4–8 new concepts a month. We brief them; you can produce in-house or with our partners.',
      },
      {
        q: 'Will this work for B2B?',
        a: 'Sometimes, but it is rarely the first channel we recommend. The audit will tell you honestly.',
      },
      {
        q: 'What happened to tracking after iOS 14?',
        a: 'We run Conversions API and modelled reporting, and we triangulate against your actual sales data.',
      },
    ],
    meta: {
      title: 'Meta Ads management | Elevate Marketing',
      description:
        'Facebook and Instagram campaigns that turn cold audiences into customers. Creative-led, tracked to revenue.',
    },
  },
  {
    slug: 'seo',
    name: 'SEO',
    icon: 'Search',
    heroTitle: { before: 'Own the searches that decide the ', highlight: 'shortlist', after: '.' },
    sub: 'Technical fixes, content that ranks, and authority built the slow, honest way.',
    whoFor: [
      'Your customers research before they buy.',
      'You can commit 3–6 months; SEO compounds.',
      'You want an asset, not a tap that stops when spend stops.',
      'Your site has real expertise worth ranking.',
    ],
    notFor: [
      'You need leads next week (start with Google Ads).',
      'Your niche is dominated by aggregators with 100× your budget; we will say so in the audit.',
      'You want 50 blog posts a month. That is not SEO.',
    ],
    included: [
      {
        title: 'Technical audit & fixes',
        desc: 'Crawl, speed, indexation, schema: the unglamorous work that makes rankings possible.',
        icon: 'Wrench',
      },
      {
        title: 'Keyword & intent mapping',
        desc: 'Terms ranked by commercial value, not search volume vanity.',
        icon: 'Map',
      },
      {
        title: 'Content that earns rankings',
        desc: 'Fewer, better pages written to satisfy search intent.',
        icon: 'FileText',
      },
      {
        title: 'Authority building',
        desc: 'Digital PR and links from real sites, never link farms.',
        icon: 'Link2',
      },
      {
        title: 'Local SEO',
        desc: 'For location-based businesses: maps, reviews, citations.',
        icon: 'MapPin',
      },
      {
        title: 'Quarterly strategy reviews',
        desc: 'Search shifts; the plan shifts with it.',
        icon: 'CalendarCheck',
      },
    ],
    process30: [
      { title: 'Audit', desc: 'Technical + content gap analysis against your top 3 competitors.' },
      { title: 'Strategy', desc: 'Prioritised 90-day roadmap by expected commercial impact.' },
      { title: 'Scale', desc: 'Ship fixes, publish, build authority, measure rankings-to-revenue.' },
    ],
    /** Engagement start confirmed by client (July 2026). */
    pricingFrom: 'From €1,500/month',
    pricingNote: 'Fee depends on site size and competitiveness.',
    relatedCase: 'b2b-services-seo',
    faq: [
      {
        q: 'How long until we rank?',
        a: 'Technical wins can show in weeks; competitive terms take 3–6 months. Anyone promising page one in 30 days is lying.',
      },
      {
        q: 'Do you write the content?',
        a: 'Yes: researched, expert-reviewed content. You approve before publishing.',
      },
      {
        q: 'Is SEO dead because of AI search?',
        a: 'No, but it is changing. That is why we run SEO and GEO together.',
      },
    ],
    meta: {
      title: 'SEO services | Elevate Marketing',
      description:
        'Technical SEO, content and authority building for UK businesses. Compounding organic growth, honestly forecast.',
    },
  },
  {
    slug: 'geo',
    name: 'GEO (AI Search)',
    icon: 'Bot',
    heroTitle: { before: 'Be the answer AI assistants ', highlight: 'give', after: '.' },
    sub: 'Generative Engine Optimisation: making ChatGPT, Gemini and Perplexity recommend you.',
    whoFor: [
      'Your buyers already ask AI assistants for recommendations.',
      'You want first-mover advantage while competitors ignore this channel.',
      'You have genuine expertise and proof worth citing.',
      'You already invest in SEO and want the next edge.',
    ],
    notFor: [
      'Your fundamentals (site, reviews, content) are weak; fix those first.',
      'You expect guaranteed AI placements. Nobody can audit or promise that yet; we show you exactly how we measure instead.',
    ],
    included: [
      {
        title: 'AI visibility audit',
        desc: 'We test how major AI assistants answer buying questions in your category, and whether you appear.',
        icon: 'Bot',
      },
      {
        title: 'Citation & entity optimisation',
        desc: 'Making your brand, people and proof machine-readable and citable.',
        icon: 'BookOpen',
      },
      {
        title: 'Content structured for AI answers',
        desc: 'Pages that directly answer the questions buyers ask assistants.',
        icon: 'MessagesSquare',
      },
      {
        title: 'Review & third-party presence',
        desc: 'AI leans on consensus; we strengthen the sources it trusts.',
        icon: 'Star',
      },
      {
        title: 'Monthly AI visibility tracking',
        desc: 'Panel of buyer questions, tracked across assistants over time.',
        icon: 'TrendingUp',
      },
    ],
    process30: [
      { title: 'Audit', desc: 'Baseline: where you appear in AI answers today vs competitors.' },
      { title: 'Strategy', desc: 'Prioritised fixes by visibility impact.' },
      { title: 'Scale', desc: 'Implement, publish, track the panel monthly.' },
    ],
    /** Engagement start confirmed by client (July 2026). */
    pricingFrom: 'From €1,500/month',
    pricingNote: 'Usually run alongside SEO; combined pricing in the audit.',
    relatedCase: 'b2b-services-seo',
    faq: [
      {
        q: 'Is GEO just SEO with a new name?',
        a: 'It overlaps, but the ranking signals differ: AI assistants weight citations, consensus and structured answers differently from Google.',
      },
      {
        q: 'Can you guarantee ChatGPT will recommend us?',
        a: 'No, and distrust anyone who does. We can show you measurable movement in AI visibility, tracked monthly.',
      },
      {
        q: 'Why now?',
        a: 'Because the businesses AI assistants learn to trust first will be expensive to displace later.',
      },
    ],
    meta: {
      title: 'AI search optimisation (GEO) | Elevate Marketing',
      description:
        'Get recommended by ChatGPT, Gemini and Perplexity. AI visibility audits, citation optimisation and monthly tracking.',
    },
  },
  {
    slug: 'web-design',
    name: 'Web Design',
    icon: 'LayoutTemplate',
    heroTitle: { before: 'Pages built to ', highlight: 'convert', after: ', not decorate.' },
    sub: 'Fast, focused websites and landing pages designed around one job: turning visits into enquiries.',
    whoFor: [
      'Your current site loses the leads your marketing earns.',
      'You want a senior, small team, not a 6-month agency saga.',
      'You measure the site on enquiries, not awards.',
      'You need landing pages for paid traffic.',
    ],
    notFor: [
      'You want a brand showcase with no commercial goal.',
      'You need a complex web application; we build marketing sites, not software.',
    ],
    included: [
      {
        title: 'Conversion-first design',
        desc: 'Structure and copy hierarchy built around the action you need visitors to take.',
        icon: 'MousePointerClick',
      },
      {
        title: 'Copywriting support',
        desc: 'We write with you: clear, concrete, no filler.',
        icon: 'PenLine',
      },
      {
        title: 'Speed as standard',
        desc: 'Core Web Vitals green targets; slow sites pay more for every click.',
        icon: 'Zap',
      },
      {
        title: 'Analytics & call tracking wired in',
        desc: 'You see exactly what the site produces.',
        icon: 'Activity',
      },
      {
        title: 'CMS you can actually edit',
        desc: 'Update text and pages without a developer.',
        icon: 'Pencil',
      },
      {
        title: 'Landing page systems',
        desc: 'Reusable templates for campaigns and services.',
        icon: 'LayoutTemplate',
      },
    ],
    process30: [
      { title: 'Audit', desc: 'CRO review of your current site with a fix-list by impact.' },
      { title: 'Strategy', desc: 'Sitemap, wireframes and copy plan approved by you.' },
      { title: 'Scale', desc: 'Design, build, launch, then iterate on real data.' },
    ],
    /** Engagement start confirmed by client (July 2026). */
    pricingFrom: 'From €1,500/month',
    pricingNote: 'Project-based; most engagements start from €1,500/month.',
    relatedCase: 'trades-lead-gen',
    faq: [
      {
        q: 'How long does a site take?',
        a: 'A focused marketing site: 4–6 weeks. Landing pages: 1–2 weeks.',
      },
      {
        q: 'Do you write the copy?',
        a: 'Yes, with you. You know the business; we know what converts.',
      },
      {
        q: 'What platform?',
        a: 'We recommend the simplest stack that fits your team.',
      },
    ],
    meta: {
      title: 'Web design that converts | Elevate Marketing',
      description:
        'Fast, conversion-focused websites and landing pages for UK businesses. Wired to analytics from day one.',
    },
  },
  {
    slug: 'email-marketing',
    name: 'Email Marketing',
    icon: 'Mail',
    heroTitle: { before: 'Revenue from the list you already ', highlight: 'own', after: '.' },
    sub: 'Flows and campaigns that turn subscribers into repeat buyers without burning the list.',
    whoFor: [
      'You have a list you barely email.',
      'You want revenue that does not depend on ad platforms.',
      'You sell products or services worth a considered follow-up.',
      'You will give email the same seriousness as ads.',
    ],
    notFor: [
      'You have no list and no traffic to build one (start with ads + site first).',
      'You want to blast weekly discounts. That trains customers to wait for sales.',
    ],
    included: [
      {
        title: 'Core revenue flows',
        desc: 'Welcome, abandoned checkout, post-purchase, win-back: the flows that pay for everything else.',
        icon: 'Workflow',
      },
      {
        title: 'Campaign calendar',
        desc: 'Planned sends your audience actually opens.',
        icon: 'CalendarDays',
      },
      {
        title: 'List growth strategy',
        desc: 'On-site capture that converts without annoying.',
        icon: 'UserPlus',
      },
      {
        title: 'Segmentation & hygiene',
        desc: 'Right message, right segment, healthy deliverability.',
        icon: 'Filter',
      },
      {
        title: 'Design & copy',
        desc: 'On-brand emails written to be read.',
        icon: 'PenLine',
      },
      {
        title: 'Revenue reporting',
        desc: 'Per-flow and per-campaign, in pounds.',
        icon: 'PoundSterling',
      },
    ],
    process30: [
      { title: 'Audit', desc: 'Account, list health and flow review with quick revenue wins.' },
      { title: 'Strategy', desc: 'Flow map + 90-day campaign calendar.' },
      { title: 'Scale', desc: 'Build flows, launch calendar, optimise on revenue per recipient.' },
    ],
    /** Engagement start confirmed by client (July 2026). */
    pricingFrom: 'From €1,500/month',
    pricingNote: 'Fee depends on list size and send volume.',
    relatedCase: 'clinic-meta-ads',
    faq: [
      {
        q: 'Which platform do you use?',
        a: 'We typically work in Klaviyo, and in your existing platform where possible.',
      },
      {
        q: 'How often should we email?',
        a: 'Enough to stay remembered, never enough to be noise: typically 2–4 campaigns a month plus flows. We test, not guess.',
      },
      {
        q: 'Is email still worth it?',
        a: 'It is consistently the highest-ROI channel we run, because you own the audience.',
      },
    ],
    meta: {
      title: 'Email marketing | Elevate Marketing',
      description:
        'Flows and campaigns that turn your list into repeat revenue. Strategy, copy, design and reporting in pounds.',
    },
  },
  {
    slug: 'consulting',
    name: 'Consulting',
    icon: 'Compass',
    heroTitle: { before: 'Senior direction without the ', highlight: 'retainer', after: '.' },
    sub: 'Audits, second opinions and fractional leadership for teams that execute in-house.',
    whoFor: [
      'You have an in-house team or agency and want senior oversight.',
      'You want an honest second opinion before committing budget.',
      'You are hiring for marketing and want the role defined right.',
      'You want a one-off deep audit, not an ongoing contract.',
    ],
    notFor: [
      'You want done-for-you execution (that is our managed services).',
      'You want a report that tells you everything is fine.',
    ],
    included: [
      {
        title: 'One-off growth audit',
        desc: 'Channels, site, tracking and economics: a written verdict with priorities.',
        icon: 'FileSearch',
      },
      {
        title: 'Fractional CMO days',
        desc: 'Senior direction 1–4 days a month for in-house teams.',
        icon: 'Briefcase',
      },
      {
        title: 'Agency oversight',
        desc: "We review your agency's work and hold them to the numbers.",
        icon: 'Eye',
      },
      {
        title: 'Hiring support',
        desc: 'Role specs, interview questions, candidate assessment.',
        icon: 'UserPlus',
      },
      {
        title: 'Forecasting & budget planning',
        desc: 'What results your budget can realistically buy.',
        icon: 'TrendingUp',
      },
    ],
    process30: [
      { title: 'Audit', desc: 'Scoped review of the question you need answered.' },
      { title: 'Strategy', desc: 'Findings + prioritised recommendations in writing.' },
      { title: 'Scale', desc: 'Optional ongoing cadence, or hand the plan to your team.' },
    ],
    /** Engagement start confirmed by client (July 2026). */
    pricingFrom: 'From €1,500/month',
    pricingNote: 'Fixed-fee audit; fractional days priced per month.',
    relatedCase: 'b2b-services-seo',
    faq: [
      {
        q: 'Will you just sell us your managed services?',
        a: 'No. If the honest answer is "keep doing what you are doing", that is what the report says.',
      },
      {
        q: 'Can you work alongside our current agency?',
        a: 'Yes, much of our consulting is exactly that.',
      },
      {
        q: 'What does an audit cover?',
        a: 'Channels, site, tracking and unit economics, benchmarked against what your budget should buy.',
      },
    ],
    meta: {
      title: 'Marketing consulting | Elevate Marketing',
      description: 'Audits, second opinions and fractional CMO support. Senior direction without a retainer.',
    },
  },
];

/**
 * Shared labels for the ServicePage template (services.md, section order 1–8).
 * Rendered by src/pages/ServicePage.tsx for every slug.
 */
export const servicePage = {
  /** Eyebrow rendered as `Services · {name}`. */
  heroEyebrow: 'Services ·',
  heroCta: 'Book a free audit',
  fit: {
    forYou: 'Built for you if…',
    wrongSpend: 'Wrong spend if…',
  },
  includedTitle: "What's included",
  process: {
    title: 'The first 30 days',
    /** Week labels for the Audit → Strategy → Scale steps. */
    weeks: ['Week 1', 'Weeks 2–3', 'Week 4 onwards'],
  },
  pricingTitle: 'Pricing guidance',
  relatedCase: {
    title: 'Related case',
    readCase: 'Read the case',
  },
  faq: {
    eyebrow: 'Questions',
    title: 'Asked about this service.',
  },
};
