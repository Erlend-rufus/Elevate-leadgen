import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { consumePendingAnchor, scrollToTarget } from '@/lib/lenis'
import Preloader from './home/Preloader'
import Hero from './home/Hero'
import Ticker from './home/Ticker'
import ExhibitA from './home/ExhibitA'
import ExhibitB from './home/ExhibitB'
import ExhibitC from './home/ExhibitC'
import ExhibitD from './home/ExhibitD'
import AuditForm from './home/AuditForm'
import Faq from './home/Faq'
import FinalCta from './home/FinalCta'
import SideRail from './home/SideRail'

/** Folio mark: 1px rule with a centred mono § case-number (design.md §5). */
function Folio({ mark }: { mark: string }) {
  return (
    <div aria-hidden="true" className="relative flex items-center justify-center bg-paper">
      <span className="h-px w-full bg-line-paper" />
      <span className="absolute bg-paper px-4 font-mono text-[11px] tracking-[0.22em] text-ink-soft/70">{mark}</span>
    </div>
  )
}

export default function Home() {
  useEffect(() => {
    // Cross-page anchor handoff from Navbar (e.g. /sample-report → /#faq)
    const pending = consumePendingAnchor()
    if (pending) {
      const t = window.setTimeout(() => scrollToTarget(pending), 450)
      return () => window.clearTimeout(t)
    }
  }, [])

  return (
    <>
      <Helmet>
        <title>Is Your IT Business Invisible to ChatGPT? | Free GEO Audit — Elevate Marketing</title>
        <meta
          name="description"
          content="More and more buyers start their search in AI tools. Get a free GEO audit and see how ChatGPT, Gemini and Copilot describe your firm — and what to fix first."
        />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://it.getelevateleads.com/audit/" />
        <meta property="og:title" content="Is Your IT Business Invisible to ChatGPT? | Free GEO Audit — Elevate Marketing" />
        <meta
          property="og:description"
          content="More and more buyers start their search in AI tools. Get a free GEO audit and see how ChatGPT, Gemini and Copilot describe your firm — and what to fix first."
        />
        <meta property="og:url" content="https://it.getelevateleads.com/audit/" />
      </Helmet>

      <Preloader />
      <SideRail />
      <Hero />
      <Ticker />
      <ExhibitA />
      <ExhibitB />
      <Folio mark="§ FILE 02" />
      <ExhibitC />
      <Folio mark="§ FILE 03" />
      <ExhibitD />
      <Folio mark="§ FILE 05" />
      <AuditForm />
      <Faq />
      <FinalCta />
    </>
  )
}
