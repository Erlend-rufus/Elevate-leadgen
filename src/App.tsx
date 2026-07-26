import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import Home from './pages/Home'
import { CookieConsent } from '@/components/CookieConsent'
import { ScrollProgress } from '@/components/ScrollProgress'

// Route-level code splitting: visitors landing on / only download the home
// bundle. Subpages load on demand (prefetch happens naturally on nav click).
const Results = lazy(() => import('./pages/Results'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Book = lazy(() => import('./pages/Book'))

/**
 * Handles three scroll cases:
 *  - location.state.scrollTo (nav clicked from another page → /#services)
 *  - plain #hash in the URL (direct link to /results#slug)
 *  - otherwise, back to top on page change
 */
function ScrollManager() {
  const location = useLocation()

  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo
    const hash = location.hash?.replace('#', '')
    const target = scrollTo || hash

    if (target) {
      // Wait for the (possibly lazy-loaded) page to render before scrolling
      const t = setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
      return () => clearTimeout(t)
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname, location.hash, location.state])

  return null
}

/** Bare-minimum dark shell while a subpage chunk loads — no spinner theatre. */
function PageFallback() {
  return <div className="min-h-screen" aria-hidden="true" />
}

export default function App() {
  return (
    <>
      <ScrollProgress />
      <ScrollManager />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/book" element={<Book />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
      <CookieConsent />
    </>
  )
}
