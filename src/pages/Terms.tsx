import { LegalPage } from '@/components/LegalPage'
import { site } from '@/content'

// [REVIEW] Template terms for the website and engagement principles —
// have legal counsel review before launch.
export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      metaTitle="Terms of Service — Elevate Marketing"
      metaDescription="The terms that govern use of getelevateleads.com and the working principles for engagements with Elevate Marketing."
      updated="22 July 2026"
      intro={`These terms govern your use of ${site.domain} and set out the working principles for engagements with ${site.name}. Specific scopes, deliverables and fees are agreed per client in a written statement of work.`}
      sections={[
        {
          heading: 'Using this website',
          body: (
            <p>
              The content of this site is provided for general information. It is not advice, and
              no client relationship is formed by using the site or booking a call. You may not
              misuse the site, attempt to disrupt it, or scrape it in bulk.
            </p>
          ),
        },
        {
          heading: 'Our services',
          body: (
            <>
              <p>
                Engagements begin with a free audit and a written proposal. Work starts only after
                both parties agree scope, deliverables, timeline and fees in writing.
              </p>
              <p>
                <strong className="text-white">No lock-in:</strong> unless otherwise agreed in
                writing, services run month to month and either party may end the engagement with
                30 days' notice. Fees already incurred remain payable.
              </p>
            </>
          ),
        },
        {
          heading: 'Forecasts and results',
          body: (
            <p>
              We provide transparent forecasts and report against them, but marketing outcomes
              depend on factors outside our control (market, budget, offer, sales capacity).
              Figures shown on this site are illustrative until agreed in a statement of work, and
              past performance does not guarantee future results.
            </p>
          ),
        },
        {
          heading: 'Your responsibilities',
          body: (
            <p>
              You agree to provide timely access to ad accounts, analytics and website as needed,
              to ensure claims in your ads comply with applicable law (including the CAP Code), and
              to give honest feedback on lead quality so we can optimise for revenue, not volume.
            </p>
          ),
        },
        {
          heading: 'Intellectual property',
          body: (
            <p>
              Upon full payment, deliverables created for you (ads, copy, designs, landing pages)
              are yours. Our pre-existing tools, templates and know-how remain ours, licensed to
              you as needed to use the deliverables.
            </p>
          ),
        },
        {
          heading: 'Liability',
          body: (
            <p>
              Nothing in these terms excludes liability that cannot be excluded by law. Otherwise,
              our total liability in connection with the services is capped at the fees paid in the
              three months preceding the claim, and we are not liable for indirect or
              consequential losses.
            </p>
          ),
        },
        {
          heading: 'Governing law',
          body: (
            <p>
              These terms are governed by the laws of England and Wales, and the courts of England
              and Wales have exclusive jurisdiction. Questions? Email {site.email}.
            </p>
          ),
        },
      ]}
    />
  )
}
