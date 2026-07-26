import { LegalPage } from '@/components/LegalPage'
import { site } from '@/content'

// [REVIEW] Drafted to UK GDPR / PECR structure — have legal counsel review
// before launch, and insert final company registration details.
export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      metaTitle="Privacy Policy — Elevate Marketing"
      metaDescription="How Elevate Marketing collects, uses and protects your personal data, in line with UK GDPR and the Data Protection Act 2018."
      updated="22 July 2026"
      intro={`This policy explains how ${site.name} ("we", "us") handles personal data on ${site.domain}. We keep it plain: we collect as little as possible, use it only to run and improve our services, and never sell it.`}
      sections={[
        {
          heading: 'Who we are',
          body: (
            <p>
              {site.name} is the data controller for personal data processed through this website.
              You can reach us at {site.email} or by post at {site.address}.
            </p>
          ),
        },
        {
          heading: 'What we collect',
          body: (
            <>
              <p>
                <strong className="text-white">Information you give us:</strong> when you book a
                strategy call or email us, we collect your name, email address, phone number and
                anything you tell us about your business.
              </p>
              <p>
                <strong className="text-white">Analytics data:</strong> with your consent, we use
                privacy-respecting analytics to understand how the site is used — pages visited,
                approximate location (country), device type and referral source. No advertising
                cookies are set without consent.
              </p>
            </>
          ),
        },
        {
          heading: 'How we use it',
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>To respond to enquiries and deliver booked calls (performance of a contract or steps towards one).</li>
              <li>To improve the site and our services (legitimate interest, balanced against your rights).</li>
              <li>To measure our own marketing — only where you have consented to cookies.</li>
              <li>To meet legal and accounting obligations.</li>
            </ul>
          ),
        },
        {
          heading: 'Who we share it with',
          body: (
            <p>
              We use a small number of processors to run the site: our booking provider (Cal.com),
              hosting provider (Vercel) and email provider. Each processes data only on our
              instructions and under a data processing agreement. Where data is transferred outside
              the UK/EEA, it is protected by an adequacy decision or standard contractual clauses.
            </p>
          ),
        },
        {
          heading: 'How long we keep it',
          body: (
            <p>
              Enquiry data is kept for up to 24 months after our last contact, unless you become a
              client — in which case we keep records for the duration of the engagement plus the
              period required by UK tax and company law. Analytics data is retained for 14 months.
            </p>
          ),
        },
        {
          heading: 'Your rights',
          body: (
            <p>
              Under UK GDPR you can request access, correction, deletion, restriction or
              portability of your personal data, and object to processing based on legitimate
              interest. Email {site.email} and we will respond within one month. You also have the
              right to complain to the Information Commissioner's Office (ICO) at ico.org.uk.
            </p>
          ),
        },
        {
          heading: 'Cookies',
          body: (
            <p>
              We set a single essential cookie to remember your consent choice. Analytics cookies
              are only set if you accept them in the consent banner, in line with PECR. You can
              change your choice at any time by clearing site data in your browser.
            </p>
          ),
        },
        {
          heading: 'Changes',
          body: (
            <p>
              If we change this policy we will update the date above and, for significant changes,
              note them on this page.
            </p>
          ),
        },
      ]}
    />
  )
}
