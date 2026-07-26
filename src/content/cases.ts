/**
 * The 3 case studies (cases-audit-pages.md §A–B).
 * Every number is a placeholder — [REPLACE] markers stay verbatim.
 */
export const resultsIndex = {
  meta: {
    title: 'Results — Elevate Marketing',
    description:
      'Case studies in numbers: lead generation, paid social and SEO results for UK businesses.',
  },
  title: 'Results, in numbers.',
  sub: 'Three engagements, three channels, one way of measuring: money in, money out. Figures are placeholders pending client-approved data.',
  readCase: 'Read the case',
};

/** Shared labels for the reusable CasePage template (cases-audit-pages.md §B). */
export const casePage = {
  eyebrow: 'Case study',
  situationTitle: 'The situation',
  approachTitle: 'The approach',
  resultsTitle: 'The results',
  meaningTitle: 'What this means for you',
  primaryCta: 'Book a free audit',
  allResults: 'All results',
  /** `{service}` is replaced with the related service name at render time. */
  relatedServiceLink: 'See how {service} works',
};

export interface CaseStudy {
  slug: string;
  title: string;
  industry: string;
  service: string;
  period: string;
  /** One-line card summary for the /results index. */
  summary: string;
  headlineMetric: { value: string; label: string };
  situation: string[];
  approach: { title: string; desc: string }[];
  results: { value: string; label: string }[];
  meaning: string[];
  quote: { text: string; name: string; role: string };
  relatedService: string;
  meta: { title: string; description: string };
}

export const cases: CaseStudy[] = [
  {
    slug: 'trades-lead-gen',
    title: 'Doubling qualified leads for a UK trades business',
    industry: 'Trades & home services',
    service: 'Google Ads',
    summary:
      'Google Ads spend was rising while the diary stayed empty — rebuilt tracking and a restructure around job value doubled qualified leads.',
    /** [REPLACE: e.g. 6 months] */
    period: '[REPLACE: e.g. 6 months]',
    /** [REPLACE] */
    headlineMetric: { value: '2.1×', label: 'qualified leads' },
    /** [REPLACE: confirm with client] */
    situation: [
      'A regional trades company was spending on Google Ads with no conversion tracking. Spend went up every quarter; the diary did not. Cost per lead was unknown, and the office could not tell which campaigns produced paying jobs.',
    ],
    approach: [
      {
        title: 'Rebuilt tracking end-to-end',
        desc: 'Calls, forms and quote requests tied to actual booked jobs, so optimisation ran on revenue, not clicks.',
      },
      {
        title: 'Restructured campaigns around job value',
        desc: 'Split by service line and margin, with budgets weighted to the most profitable work.',
      },
      {
        title: 'Cut wasted spend',
        desc: 'Aggressive negative-keyword work and location pruning removed [REPLACE: ~30%] of spend that never produced a job.',
      },
      {
        title: 'New landing pages per service',
        desc: 'Each campaign sent to a page built for that job, not the homepage.',
      },
    ],
    results: [
      /** [REPLACE] */
      { value: '2.1×', label: 'qualified leads' },
      /** [REPLACE] */
      { value: '-38%', label: 'cost per lead' },
      { value: '[REPLACE]%', label: 'lead-to-job rate' },
      /** [REPLACE] */
      { value: '4.2×', label: 'ROAS' },
    ],
    meaning: [
      'If you cannot say which campaign produced your last ten customers, your tracking — not your ads — is the first thing to fix.',
      'Weighting budget by job value usually matters more than any bid strategy.',
    ],
    quote: {
      text: '[REPLACE: client quote]',
      name: '[REPLACE]',
      role: '[REPLACE]',
    },
    relatedService: 'google-ads',
    meta: {
      title: 'Case study: Doubling qualified leads for a UK trades business — Elevate Marketing',
      description:
        'Rebuilt tracking and restructured Google Ads around job value — 2.1× qualified leads at a lower cost per lead.',
    },
  },
  {
    slug: 'clinic-meta-ads',
    title: "Filling a clinic's diary with Meta Ads",
    industry: 'Health & wellness clinic',
    service: 'Meta Ads',
    summary:
      'Growth from word of mouth had stalled — an offer-first Meta strategy and a frictionless booking path filled the diary with consultations.',
    /** [REPLACE] */
    period: '[REPLACE]',
    /** [REPLACE] */
    headlineMetric: { value: '63', label: 'booked consultations / month' },
    /** [REPLACE: confirm] */
    situation: [
      'A private clinic relied on word of mouth and had stopped growing. Previous boosted posts produced likes, not bookings. The team was sceptical that social could produce patients who actually showed up.',
    ],
    approach: [
      {
        title: 'Offer before creative',
        desc: 'A specific, low-friction first-visit offer replaced generic awareness ads.',
      },
      {
        title: 'Creative built on patient questions',
        desc: 'Every ad answered a real question the front desk heard weekly.',
      },
      {
        title: 'Frictionless booking path',
        desc: 'Ad → dedicated landing page → live calendar; no phone tag.',
      },
      {
        title: 'Server-side tracking',
        desc: 'Conversions API kept reporting honest after iOS changes.',
      },
    ],
    results: [
      /** [REPLACE] */
      { value: '63', label: 'booked consultations / month' },
      { value: '£[REPLACE]', label: 'cost per booking' },
      { value: '[REPLACE]%', label: 'show-up rate' },
      /** [REPLACE] */
      { value: '4.8×', label: 'return on ad spend' },
    ],
    meaning: [
      'On Meta, the offer does more work than the audience.',
      'A booking path with no friction beats any targeting trick.',
    ],
    quote: {
      text: '[REPLACE: client quote]',
      name: '[REPLACE]',
      role: '[REPLACE]',
    },
    relatedService: 'meta-ads',
    meta: {
      title: "Case study: Filling a clinic's diary with Meta Ads — Elevate Marketing",
      description:
        'Offer-first Meta campaigns and a frictionless booking path — 63 booked consultations a month for a private clinic.',
    },
  },
  {
    slug: 'b2b-services-seo',
    title: 'Compounding organic pipeline for a B2B services firm',
    industry: 'B2B professional services',
    service: 'SEO',
    summary:
      'Every lead was bought through paid channels — technical fixes and decision-stage content built an organic pipeline that compounds.',
    /** [REPLACE] */
    period: '[REPLACE]',
    /** [REPLACE] */
    headlineMetric: { value: '+312%', label: 'organic demo requests' },
    /** [REPLACE: confirm] */
    situation: [
      'A B2B firm bought all its pipeline through paid channels with rising CPCs. The site ranked for its own name and nothing else. Competitors with weaker services owned every comparison and "how to choose" search.',
    ],
    approach: [
      {
        title: 'Technical foundation first',
        desc: 'Fixed indexation, speed and schema so content could rank at all.',
      },
      {
        title: 'Decision-stage content',
        desc: 'Fewer, better pages targeting the searches buyers make when shortlisting suppliers.',
      },
      {
        title: 'Authority through digital PR',
        desc: 'Expert commentary and data placements earned links from real publications.',
      },
      {
        title: 'AI-search readiness',
        desc: 'Content structured so AI assistants can cite it — GEO layered onto SEO.',
      },
    ],
    results: [
      /** [REPLACE] */
      { value: '+312%', label: 'organic demo requests' },
      { value: '[REPLACE]', label: 'page-one terms' },
      { value: '-[REPLACE]%', label: 'paid spend dependency' },
      { value: '[REPLACE]', label: 'AI-assistant citations tracked' },
    ],
    meaning: [
      'In B2B, the shortlisting searches are the ones worth owning.',
      'SEO and AI search now compound together — the same work feeds both.',
    ],
    quote: {
      text: '[REPLACE: client quote]',
      name: '[REPLACE]',
      role: '[REPLACE]',
    },
    relatedService: 'seo',
    meta: {
      title: 'Case study: Compounding organic pipeline for a B2B services firm — Elevate Marketing',
      description:
        'Technical SEO and decision-stage content compounded into +312% organic demo requests for a B2B firm.',
    },
  },
];
