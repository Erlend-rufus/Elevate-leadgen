/**
 * Every string on the home page (home.md). No copy lives in components.
 */
export const home = {
  meta: {
    title: 'Elevate Marketing | Performance marketing that turns into pipeline',
    description:
      'Google Ads, Meta Ads, SEO and AI-search optimisation for UK businesses that measure marketing in revenue, not impressions. Book a free audit.',
  },
  hero: {
    eyebrow: 'Performance marketing · UK',
    titleBefore: 'Marketing that turns into ',
    titleHighlight: 'pipeline',
    titleAfter: '. Not just reports.',
    sub: 'Google Ads, Meta Ads, SEO and AI-search optimisation for UK businesses that measure marketing in revenue, not impressions.',
    primaryCta: 'Book a free audit',
    secondaryCta: 'See the results',
    microcopy: 'Free audit. No obligations. Reply within one working day.',
  },
  /** Figures confirmed by the client (July 2026). */
  proofBar: [
    { value: '£2.4M+', label: 'Ad spend managed' },
    { value: '4.2×', label: 'Average ROAS' },
    { value: '92%', label: 'Client retention' },
    { value: '10', label: 'Years trading' },
  ],
  problem: {
    eyebrow: 'The problem',
    title: 'Most marketing reports look busy. Most pipelines stay flat.',
    cards: [
      {
        icon: 'LineChart',
        title: 'Optimised for the wrong numbers',
        body: 'Clicks, impressions and engagement are easy to inflate. They are also easy to report. None of them pay salaries. We optimise for cost per qualified lead and revenue.',
      },
      {
        icon: 'Shuffle',
        title: 'Channels run in silos',
        body: 'Ads say one thing, the site says another, and nobody owns the handover to sales. We run search, social and site as one system with one measurement plan.',
      },
      {
        icon: 'EyeOff',
        title: 'No straight answers',
        body: 'If your agency cannot tell you which pound produced which customer, you are funding their learning curve. Our reporting shows spend in, revenue out.',
      },
    ],
  },
  services: {
    eyebrow: 'What we do',
    title: 'One team. Every channel that matters.',
    intro:
      'Seven services, one measurement plan. Each links to exactly what is included, who it suits, and when it is the wrong spend.',
    learnMore: 'Learn more',
    items: [
      { icon: 'Target', name: 'Google Ads', outcome: 'Capture demand that already exists.', slug: 'google-ads' },
      { icon: 'Share2', name: 'Meta Ads', outcome: 'Create demand where your buyers scroll.', slug: 'meta-ads' },
      { icon: 'Search', name: 'SEO', outcome: 'Own the searches that decide the shortlist.', slug: 'seo' },
      { icon: 'Bot', name: 'GEO (AI search)', outcome: 'Be the answer AI assistants give.', slug: 'geo' },
      { icon: 'LayoutTemplate', name: 'Web Design', outcome: 'Pages built to convert, not decorate.', slug: 'web-design' },
      { icon: 'Mail', name: 'Email Marketing', outcome: 'Revenue from the list you already own.', slug: 'email-marketing' },
      { icon: 'Compass', name: 'Consulting', outcome: 'Senior direction without the retainer.', slug: 'consulting' },
    ],
  },
  process: {
    eyebrow: 'How it works',
    title: 'Audit. Strategy. Scale.',
    steps: [
      {
        title: 'Audit',
        body: 'We review your accounts, site and data, and show you exactly where money is made or lost. Free, and yours to keep whatever you decide.',
        time: 'Week 1',
      },
      {
        title: 'Strategy',
        body: 'A 90-day plan with budgets, forecasts and the numbers we will be judged on. You approve it before a pound is spent.',
        time: 'Weeks 2–3',
      },
      {
        title: 'Scale',
        body: 'Launch, measure weekly, scale what pays and cut what does not. Monthly reporting in plain English.',
        time: 'Week 4 onwards',
      },
    ],
    cta: 'Start with the free audit',
  },
  resultsTeaser: {
    eyebrow: 'Results',
    title: 'Recent work, in numbers.',
    readCase: 'Read the case',
    allResults: 'All results',
    /** [REPLACE] */
    disclaimer: 'Figures shown are placeholders pending client-approved data.',
  },
  // Testimonials section removed from Home per client request (July 2026);
  // reinstate with real, attributable quotes only.
  aboutTeaser: {
    eyebrow: 'Who we are',
    title: 'Senior marketers. No account-manager telephone.',
    body: 'Elevate Marketing is a small, senior team. The people in your kickoff call are the people in your accounts. We take on few enough clients to know each P&L properly, and we say no to work we do not believe will pay.',
    cta: 'More about us',
  },
  faq: {
    eyebrow: 'Questions',
    title: 'Asked before every engagement.',
    items: [
      {
        q: 'How much does it cost?',
        a: 'Most engagements start from €1,500 per month, depending on channels and spend. You see the full fee structure before signing anything. No percentage-of-spend surprises.',
      },
      {
        q: 'How fast will we see results?',
        a: 'Paid channels usually produce signal within 2–4 weeks. SEO and AI-search work compounds over 3–6 months. The audit gives you a realistic forecast for your market, not a generic promise.',
      },
      {
        q: 'Do you require long contracts?',
        a: 'Our standard agreement runs month to month after an initial 90-day period. If we are not earning our fee, you should be free to leave.',
      },
      {
        q: 'Who actually works on our account?',
        a: 'The senior people you meet in the audit. We do not hand delivery to juniors, and we cap client numbers so every account gets weekly attention.',
      },
      {
        q: 'What do you need from us?',
        a: 'Access to your ad accounts and analytics, 30 minutes a fortnight, and honest feedback on lead quality. We handle the rest.',
      },
    ],
  },
  finalCta: {
    title: 'Find out where your next customer is coming from.',
    sub: 'The audit is free, specific to your business, and yours to keep, whoever you work with.',
    cta: 'Book a free audit',
    microcopy: 'No obligations · No cold calls · Reply within one working day',
  },
};
