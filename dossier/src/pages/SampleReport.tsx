import { useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap'
import Cover from './sample-report/Cover'
import { TocRail, TocChipBar } from './sample-report/Toc'
import ExecutiveSummary from './sample-report/ExecutiveSummary'
import PlatformResults from './sample-report/PlatformResults'
import Benchmark from './sample-report/Benchmark'
import Findings from './sample-report/Findings'
import Plan from './sample-report/Plan'
import NextStep from './sample-report/NextStep'

const TITLE = 'Sample GEO Audit Report — What AI Says About You | Elevate Marketing'
const DESCRIPTION =
  'A complete illustrative GEO audit: how AI assistants describe a firm, whether it appears when buyers ask, the gaps keeping it out of AI answers, and a prioritised list of fixes in plain English.'

/**
 * /sample-report — "Exhibit: The Audit, In Full" (sample-report.md).
 * The page IS the product demo: a dossier document rendered as a web page.
 */
export default function SampleReport() {
  const root = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // Reading progress bar (2px teal) under the navbar — page-specific
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
        if (progressRef.current) progressRef.current.style.width = `${p * 100}%`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      // The document rises from below, hard shadow drawing in
      gsap.fromTo(
        '.sr-document',
        { y: 60, boxShadow: '0px 0px 0 rgba(26,26,46,0)' },
        { y: 0, boxShadow: '8px 8px 0 rgba(26,26,46,.1)', duration: 0.7, ease: 'snap' },
      )
    },
    { scope: root },
  )

  return (
    <div ref={root} className="bg-paper-2">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://it.getelevateleads.com/audit/sample-report" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content="https://it.getelevateleads.com/audit/sample-report" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
      </Helmet>

      {/* Reading progress bar (2px teal), fixed under the 72px navbar */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-[72px] z-40 h-0.5 bg-ink/10">
        <div ref={progressRef} className="h-full bg-teal" style={{ width: '0%' }} />
      </div>

      <div className="mx-auto max-w-[1200px] px-6 py-8 md:py-12 lg:px-12 lg:py-14">
        {/* The document */}
        <article className="sr-document border border-ink bg-paper shadow-[8px_8px_0_rgba(26,26,46,.1)]">
          <Cover />

          {/* Mobile/tablet sticky chip TOC */}
          <TocChipBar />

          {/* Body: sticky TOC rail + content column */}
          <div className="lg:grid lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="border-line-paper lg:border-r">
              <TocRail />
            </div>
            <div className="min-w-0">
              <ExecutiveSummary />
              <PlatformResults />
              <Benchmark />
              <Findings />
              <Plan />
              <NextStep />
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
