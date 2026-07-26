/**
 * Legal page copy (cases-audit-pages.md §F). Rendered by the LegalPage component.
 * Company details confirmed July 2026 (EngeCo AS, org.nr 924 490 926).
 */
export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  meta: { title: string; description: string };
  title: string;
  updated: string;
  sections: LegalSection[];
}

export const privacy: LegalDoc = {
  meta: {
    title: 'Privacy policy — Elevate Marketing',
    description: 'How Elevate Marketing collects, uses and protects your personal data.',
  },
  title: 'Privacy policy',
  updated: 'Last updated: July 2026',
  sections: [
    {
      heading: 'Who we are',
      body: [
        'EngeCo AS (trading as Elevate Marketing, "we", "us"), org.nr 924 490 926, Midtfjellet 66, 5363 Ågotnes, Norway, is the data controller for this website. You can contact us about privacy at hello@getelevateleads.com.',
      ],
    },
    {
      heading: 'What we collect',
      body: [
        'Contact details you give us (name, email, company, message) when you enquire or book an audit.',
        'Usage data about how you use this site, collected through analytics cookies where you have consented. We use Google Analytics 4 and Microsoft Clarity, and other analytics providers at client request.',
      ],
    },
    {
      heading: 'How we use your data and lawful bases',
      body: [
        'To respond to enquiries and deliver audits — legitimate interest (UK GDPR Art. 6(1)(f)) or steps towards a contract (Art. 6(1)(b)).',
        'To measure and improve the site — consent (Art. 6(1)(a)), given via the cookie banner. You can withdraw it at any time.',
      ],
    },
    {
      heading: 'Cookies',
      body: [
        'We use analytics cookies (Google Analytics 4 and Microsoft Clarity) only with your consent, managed via the cookie banner on this site. Declining cookies does not affect your use of the site.',
      ],
    },
    {
      heading: 'Who we share it with',
      body: [
        'We do not sell personal data. We share it only with service providers who process it on our instructions: hosting (Netlify), email, analytics (Google Analytics 4, Microsoft Clarity) and booking (Calendly).',
      ],
    },
    {
      heading: 'International transfers',
      body: [
        'Personal data is stored on European servers. Where a processor outside the EEA is involved (for example Calendly, which processes bookings in the US), the transfer relies on approved safeguards such as the UK IDTA or the UK addendum to EU standard contractual clauses.',
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        'Enquiry data (contact details and messages) is kept for up to 24 months. Analytics data is kept for up to 14 months, after which it is deleted or anonymised.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'You have the right to access, rectify, erase, restrict or object to processing of your personal data, and to data portability. To exercise any of these, email hello@getelevateleads.com.',
        'You can complain to the Information Commissioner\u2019s Office (ICO) at ico.org.uk if you are unhappy with how we handle your data.',
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [
        'We may update this policy from time to time. The latest version is always on this page.',
      ],
    },
  ],
};

export const terms: LegalDoc = {
  meta: {
    title: 'Terms of service — Elevate Marketing',
    description: 'The terms that apply to work carried out by Elevate Marketing.',
  },
  title: 'Terms of service',
  updated: 'Last updated: July 2026',
  sections: [
    {
      heading: 'Who we are',
      body: [
        'These terms are between you and EngeCo AS (trading as Elevate Marketing), org.nr 924 490 926, Midtfjellet 66, 5363 Ågotnes, Norway.',
      ],
    },
    {
      heading: 'Services',
      body: [
        'We provide performance marketing services including paid media, SEO, AI-search optimisation, web design, email marketing and consulting. The scope for each engagement is set out in a written proposal or statement of work.',
      ],
    },
    {
      heading: 'Fees and payment',
      body: [
        'Fees are invoiced monthly in arrears, with payment terms of 15–30 days as stated on each invoice. Media spend is paid by you directly to the platforms unless agreed otherwise in writing.',
      ],
    },
    {
      heading: 'Your responsibilities',
      body: [
        'You will give us timely access to the accounts, analytics and information we need, and tell us honestly about lead quality and outcomes so we can optimise against real numbers.',
      ],
    },
    {
      heading: 'Results',
      body: [
        'Marketing performance depends on factors outside our control (your market, pricing, sales follow-up). Forecasts are honest estimates, not guarantees of specific results.',
      ],
    },
    {
      heading: 'Intellectual property',
      body: [
        'Work we create for you (campaigns, copy, designs, reports) becomes yours once paid for in full.',
      ],
    },
    {
      heading: 'Liability',
      body: [
        'Nothing in these terms limits liability that cannot be limited by law. We accept no retrospective liability: our responsibility covers only the active engagement period and does not extend to losses arising before the engagement began or after it ended.',
      ],
    },
    {
      heading: 'Termination',
      body: [
        'Either side may end ongoing work with 30 days written notice after any agreed initial period. Fees due for work done remain payable.',
      ],
    },
    {
      heading: 'Governing law',
      body: [
        'These terms are governed by the law of England and Wales, and the courts of England and Wales have exclusive jurisdiction.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        'Questions about these terms: hello@getelevateleads.com.',
      ],
    },
  ],
};
