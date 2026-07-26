import { Header } from '@/sections/Header'
import { Hero } from '@/sections/Hero'
import { ProofBar } from '@/sections/ProofBar'
import { Problem } from '@/sections/Problem'
import { Services } from '@/sections/Services'
import { Process } from '@/sections/Process'
import { ResultsTeaser } from '@/sections/ResultsTeaser'
import { Testimonials } from '@/sections/Testimonials'
import { AboutTeaser } from '@/sections/AboutTeaser'
import { FAQ } from '@/sections/FAQ'
import { FinalCTA } from '@/sections/FinalCTA'
import { Footer } from '@/sections/Footer'
import { HomeStructuredData } from '@/components/HomeStructuredData'
import { usePageMeta } from '@/hooks/usePageMeta'

export default function Home() {
  usePageMeta(
    'Elevate Marketing — Growth Marketing for UK Service Businesses',
    'We turn ad spend into predictable revenue for UK service businesses — with complete transparency on where every pound goes and what it brings back. Book a free strategy call.'
  )

  return (
    <>
      <HomeStructuredData />
      <Header />
      <main>
        <Hero />
        <ProofBar />
        <Problem />
        <Services />
        <Process />
        <ResultsTeaser />
        <Testimonials />
        <AboutTeaser />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
