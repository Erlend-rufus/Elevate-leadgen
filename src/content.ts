/**
 * content.ts — single source of truth for all site copy and data.
 *
 * Everything marked [REPLACE] is a placeholder that must be swapped for
 * real, documentable figures/content before launch. Nothing on the site
 * should show a number that cannot be evidenced.
 */

export const site = {
  name: 'Elevate Marketing',
  domain: 'getelevateleads.com',
  url: 'https://getelevateleads.com',
  tagline: 'The transparent growth partner for UK service businesses.',
  email: 'hello@getelevateleads.com',
  // [REPLACE] UK phone number (virtual office is fine to start)
  phone: '+44 20 7946 0000',
  // [REPLACE] Registered UK office address
  address: '71 Shelton Street, Covent Garden, London WC2H 9JQ',
  // [REPLACE] Companies House number, if registered
  companyNumber: '',
  // [REPLACE] Cal.com booking link (UK timezone configured in Cal.com)
  bookingUrl: 'https://cal.com/elevate-marketing/strategy-call',
  // Flip to true once bookingUrl is the real calendar — until then the site
  // shows a designed placeholder instead of an empty iframe.
  bookingEnabled: false,
  social: {
    // Only channels actually in use — no template leftovers
    linkedin: 'https://www.linkedin.com/company/elevate-marketing',
  },
}

export const nav = [
  { label: 'Services', href: '/#services' },
  { label: 'Results', href: '/results' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export const cta = {
  primary: 'Book a free strategy call',
  secondary: 'See our results',
  micro: 'Start with a free audit',
}

export const hero = {
  eyebrow: 'GROWTH MARKETING FOR UK SERVICE BUSINESSES',
  titleLead: 'Marketing that',
  titleGradient: 'pays',
  titleTail: 'for itself.',
  sub: 'We turn ad spend into predictable revenue — with complete transparency on where every pound goes and what it brings back.',
  // [REPLACE] All three chips must be real, documentable numbers
  stats: [
    { value: '£2.4M+', label: 'Ad spend managed' },
    { value: '4.2×', label: 'Avg. return on ad spend' },
    { value: '120+', label: 'Campaigns delivered' },
  ],
}

export const proof = [
  // [REPLACE] Percentages and quality metrics over small absolute counts
  { value: '92%', label: 'Client retention, year over year' },
  { value: '£2.4M+', label: 'Ad spend managed profitably' },
  { value: '4.2×', label: 'Average ROAS across accounts' },
  { value: '0', label: 'Lock-in contracts. Ever.' },
]

export const problem = {
  heading: 'Burned by an agency before?',
  sub: 'Most of our clients came to us after a bad experience. The pattern is always the same — and we built Elevate to be the opposite of it.',
  cards: [
    {
      title: 'Vanity metrics',
      body: 'Impressions and clicks look great in a slide deck. Revenue looks better in your bank account. We report on what you actually take home.',
      pillar: 'Transparency',
    },
    {
      title: 'Lock-in contracts',
      body: 'Twelve-month contracts exist to protect agencies, not clients. We earn your renewal monthly — cancel any time.',
      pillar: 'Predictability',
    },
    {
      title: 'Jargon instead of answers',
      body: "If an agency can't explain what they're doing in plain English, they usually don't know. You'll always know what we're doing and why.",
      pillar: 'Simplicity',
    },
  ],
}

export const services = {
  id: 'services',
  heading: 'What we do',
  sub: 'No bloated service menu. Seven disciplines, one focus: predictable revenue per pound spent.',
  items: [
    {
      icon: 'target',
      name: 'Google Ads',
      outcome: 'Capture demand the moment it appears.',
    },
    {
      icon: 'megaphone',
      name: 'Meta Ads',
      outcome: 'Profitable reach on Facebook & Instagram.',
    },
    {
      icon: 'search',
      name: 'SEO',
      outcome: 'Compounding organic growth, month over month.',
    },
    {
      icon: 'sparkles',
      name: 'GEO',
      outcome: 'Get found in AI-driven search.',
    },
    {
      icon: 'layout',
      name: 'Web Design',
      outcome: 'Sites built to convert, not just to look good.',
    },
    {
      icon: 'mail',
      name: 'Email Marketing',
      outcome: 'Revenue on autopilot from your list.',
    },
    {
      icon: 'compass',
      name: 'Consulting',
      outcome: 'A senior second brain on your growth.',
    },
  ],
}

export const process = {
  heading: 'How we work',
  sub: 'Three steps. No mystery. You see everything from day one.',
  steps: [
    {
      number: '01',
      title: 'Audit',
      body: 'We analyse your funnel, ads and data. You get the honest picture, free.',
    },
    {
      number: '02',
      title: 'Strategy',
      body: 'Clear plan, measurable milestones, transparent forecast.',
    },
    {
      number: '03',
      title: 'Scale',
      body: 'We execute, report weekly, and double down on what works.',
    },
  ],
}

export interface CaseStudy {
  slug: string
  industry: string
  service: string
  headline: string
  timeframe: string
  summary: string
  challenge: string
  approach: string[]
  results: { value: string; label: string }[]
}

// [REPLACE] Case studies: use real engagements. Keep industry rather than
// client name where the name is unknown in the UK market.
export const cases: CaseStudy[] = [
  {
    slug: 'trades-lead-gen',
    industry: 'Trades & Home Services',
    service: 'Google Ads + Landing Pages',
    headline: '+212% qualified leads in 4 months',
    timeframe: '4 months',
    summary:
      'A regional home-services company came to us with rising cost per lead and no visibility into which ads worked. We rebuilt tracking, restructured the account and replaced generic landing pages with service-specific ones.',
    challenge:
      'Cost per lead had doubled in a year, and reporting stopped at "clicks". The owner had no way to connect ad spend to booked jobs.',
    approach: [
      'Full conversion-tracking rebuild: calls, forms and booked jobs attributed per keyword.',
      'Account restructure around high-intent service keywords, pausing 60% of spend that produced no revenue.',
      'Service-specific landing pages with clear pricing signals and one call to action.',
      'Weekly reporting against cost per booked job — not cost per click.',
    ],
    results: [
      { value: '+212%', label: 'Qualified leads' },
      { value: '-38%', label: 'Cost per lead' },
      { value: '4', label: 'Months to turnaround' },
    ],
  },
  {
    slug: 'clinic-meta-ads',
    industry: 'Health & Wellness Clinic',
    service: 'Meta Ads + Email Marketing',
    headline: '5.1× return on ad spend in 6 months',
    timeframe: '6 months',
    summary:
      'A multi-location clinic was relying on word of mouth. We built a Meta Ads funnel for new-patient offers and an email sequence that turned one-off visits into recurring bookings.',
    challenge:
      'Growth was flat and entirely referral-dependent. Previous agency spend had generated likes, not patients.',
    approach: [
      'Offer-led Meta campaigns targeted by location and treatment interest.',
      'New-patient landing page with online booking — no phone tag.',
      'Automated email follow-up converting first visits into treatment plans.',
      'Monthly forecasting so the clinic knew expected bookings per pound before spending it.',
    ],
    results: [
      { value: '5.1×', label: 'Return on ad spend' },
      { value: '+164%', label: 'New patient bookings' },
      { value: '31%', label: 'Rebook rate via email' },
    ],
  },
  {
    slug: 'b2b-services-seo',
    industry: 'B2B Professional Services',
    service: 'SEO + GEO',
    headline: 'First-page rankings for 23 commercial keywords',
    timeframe: '9 months',
    summary:
      'A professional-services firm invisible in search despite strong referrals. We built a content and technical SEO programme — extended to AI-driven search — that now drives a steady flow of inbound enquiries.',
    challenge:
      'Zero organic pipeline: the site ranked for its own name and nothing else. Competitors dominated every commercial search.',
    approach: [
      'Technical audit and rebuild of site structure around service lines.',
      'Content programme answering the exact questions prospects ask before buying.',
      'GEO optimisation so the firm appears in AI-generated answers and overviews.',
      'Digital PR and citation building to close the authority gap.',
    ],
    results: [
      { value: '23', label: 'First-page commercial keywords' },
      { value: '+340%', label: 'Organic enquiries' },
      { value: '9', label: 'Months to compounding growth' },
    ],
  },
]

export const testimonials = {
  heading: 'What clients say',
  // [REPLACE] Prefer UK client quotes as soon as available. Norwegian quotes
  // translated and attributed by industry until then.
  items: [
    {
      quote:
        'For the first time I can see exactly what every pound of marketing brings back. No jargon, no hiding — just numbers I can act on.',
      name: 'Philip Antonetti',
      role: 'Founder, technology company, Norway',
    },
    {
      quote:
        'They told us things we did not want to hear in month one — and they were right. Six months later the leads speak for themselves.',
      name: 'Sarah Whitfield',
      role: 'Managing Director, home services company',
    },
    {
      quote:
        'Weekly reports I actually read, a forecast that holds up, and no contract keeping me there. I stay because it works.',
      name: 'James Calloway',
      role: 'Owner, multi-location clinic',
    },
  ],
}

export const aboutTeaser = {
  heading: 'Norwegian work ethic. UK market focus.',
  body: 'Elevate Marketing is a Norwegian growth agency with a dedicated UK division. We bring Scandinavian directness to British marketing: honest numbers, plain English and zero lock-in.',
  body2:
    'You will work with senior people — including our UK lead Erlend — not a rotating cast of juniors. Small by choice, senior by design.',
  linkText: 'Meet the team',
}

export const team = [
  // [REPLACE] Real photos (never stock) and full bios before launch
  {
    name: 'Erlend',
    role: 'Head of UK Division',
    bio: 'Leads the UK operation and works directly with every client on strategy.',
  },
  {
    name: 'Team member',
    role: 'Paid Media Lead',
    bio: 'Runs Google and Meta accounts across the portfolio.',
  },
  {
    name: 'Team member',
    role: 'SEO & Content Lead',
    bio: 'Owns organic and AI-search growth programmes.',
  },
  {
    name: 'Team member',
    role: 'Web & CRO',
    bio: 'Builds and optimises the pages your ads land on.',
  },
]

export const faq = {
  heading: 'Fair questions, straight answers',
  items: [
    {
      q: 'How much does it cost?',
      a: 'Most clients start from £1,500/month plus ad spend, depending on scope. After a free audit we give you a fixed, itemised quote — no hidden fees, no percentage-of-spend pricing that rewards us for wasting your money.',
    },
    {
      q: 'How quickly can we start?',
      a: 'Typically within two weeks of the strategy call. The audit takes a few days, the strategy a week, and then campaigns or content go into production.',
    },
    {
      q: 'Am I locked into a contract?',
      a: 'No. Everything runs month to month. We earn your renewal by performing — if we stop delivering, you can walk away. That keeps us sharp.',
    },
    {
      q: 'Are we too small to work with you?',
      a: 'If you have a proven service and the capacity to handle more work, you are big enough. Most of our clients have 5–50 employees. If we genuinely cannot help, we will tell you on the first call.',
    },
    {
      q: 'What do you need from us?',
      a: 'Access to your ad accounts and analytics, one decision-maker on a monthly call, and honest feedback on lead quality. We handle the rest.',
    },
    {
      q: 'How does reporting work?',
      a: 'A live dashboard you can check any time, a written summary every week, and a monthly review against forecast. Every figure ties back to money in — money out.',
    },
  ],
}

export const finalCta = {
  heading: 'Ready to',
  headingGradient: 'grow?',
  sub: 'Book a free strategy call. We will look at your funnel before the call and tell you honestly whether we can help — either way you leave with something useful.',
  emailLabel: 'Prefer email?',
}

export const footer = {
  blurb:
    'The transparent growth partner for UK service businesses. Predictable revenue from Google, Meta, search and email — reported in plain English, with no lock-in.',
  columns: [
    {
      title: 'Services',
      links: [
        { label: 'Google Ads', href: '/#services' },
        { label: 'Meta Ads', href: '/#services' },
        { label: 'SEO', href: '/#services' },
        { label: 'GEO', href: '/#services' },
        { label: 'Web Design', href: '/#services' },
        { label: 'Email Marketing', href: '/#services' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'Results', href: '/results' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
  ],
}

export const contact = {
  heading: 'Talk to a senior marketer, not a salesperson.',
  sub: 'Book directly into our calendar below, or send us an email — a real person replies within one working day.',
  details: [
    { label: 'Email', value: site.email, href: `mailto:${site.email}` },
    { label: 'Phone', value: site.phone, href: `tel:${site.phone.replace(/\s/g, '')}` },
    { label: 'Office', value: site.address, href: undefined },
  ],
  responseNote: 'We reply within one working day, UK business hours.',
}

export const about = {
  heading: 'A small, senior team that treats your budget like its own.',
  story: [
    'Elevate Marketing started in Norway with a simple frustration: too many agencies hide behind jargon, vanity metrics and long contracts. We wanted to build the agency we would have hired ourselves.',
    'Our UK division exists because British service businesses deserve the same thing — a partner that connects every pound of marketing to revenue, and says so plainly when something is not working.',
    'We stay deliberately small. Every account is run by a senior marketer, and every client has a direct line to the people doing the work — including Erlend, who leads the UK operation.',
  ],
  pillars: [
    {
      title: 'Transparency',
      body: 'Open reporting, honest numbers, no lock-in. You see what we see — including the misses.',
    },
    {
      title: 'Predictability',
      body: 'Strategy, milestones and forecasting. You should know what to expect before we spend a pound.',
    },
    {
      title: 'Simplicity',
      body: 'Only what works, cut from the noise. We would rather do three things well than ten things adequately.',
    },
  ],
}

export const resultsPage = {
  heading: 'Results we can stand behind.',
  sub: 'Specifics over adjectives: real industries, real numbers, real timeframes. Names withheld where clients prefer privacy — every figure can be evidenced on a call.',
  ctaNote: 'Want numbers like these? Start with a free audit.',
}
