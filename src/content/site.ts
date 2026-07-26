export interface NavItem {
  label: string;
  to: string;
}

export interface FooterColumn {
  title: string;
  links: NavItem[];
}

export const site = {
  brand: 'Elevate Marketing',
  shortBrand: 'Elevate',
  domain: 'getelevateleads.com',
  url: 'https://getelevateleads.com',
  email: 'hello@getelevateleads.com',
  /** When false, BookingEmbed renders the [REPLACE] placeholder card. */
  bookingEnabled: true,
  /** Calendly event URL for the inline booking widget (used by BookingEmbed). */
  calendlyUrl:
    'https://calendly.com/eb-growwithelevate/elevate-marketing-intro-meeting-clone-1?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=00a3d6',
  /** Legal entity (trading as Elevate Marketing), per Brønnøysund/proff.no. */
  companyNo: 'EngeCo AS · Org.nr 924 490 926',
  /** Footer brand blurb (reuses the home meta description). */
  blurb:
    'Google Ads, Meta Ads, SEO and AI-search optimisation for UK businesses that measure marketing in revenue, not impressions.',
  nav: [
    { label: 'Services', to: '/services' },
    { label: 'Results', to: '/results' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ] as NavItem[],
  primaryCta: { label: 'Free audit', to: '/growth-audit' } as NavItem,
  footer: {
    columns: [
      {
        title: 'Services',
        links: [
          { label: 'Google Ads', to: '/services/google-ads' },
          { label: 'Meta Ads', to: '/services/meta-ads' },
          { label: 'SEO', to: '/services/seo' },
          { label: 'GEO (AI search)', to: '/services/geo' },
          { label: 'Web Design', to: '/services/web-design' },
          { label: 'Email Marketing', to: '/services/email-marketing' },
          { label: 'Consulting', to: '/services/consulting' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', to: '/about' },
          { label: 'Results', to: '/results' },
          { label: 'Contact', to: '/contact' },
          { label: 'Free audit', to: '/growth-audit' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy', to: '/privacy' },
          { label: 'Terms', to: '/terms' },
        ],
      },
    ] as FooterColumn[],
  },
};
