import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router';
import Header from './components/Header';
import Footer from './components/Footer';
import Logo from './components/Logo';
import ScrollProgress from './components/ScrollProgress';
import CookieConsent from './components/CookieConsent';

const Home = lazy(() => import('./pages/Home'));
const ServicesIndex = lazy(() => import('./pages/ServicesIndex'));
const ServicePage = lazy(() => import('./pages/ServicePage'));
const ResultsIndex = lazy(() => import('./pages/ResultsIndex'));
const CasePage = lazy(() => import('./pages/CasePage'));
const Audit = lazy(() => import('./pages/Audit'));
const Book = lazy(() => import('./pages/Book'));
const About = lazy(() => import('./pages/About'));
const BlogIndex = lazy(() => import('./pages/BlogIndex'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

function PageLoader() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00a3d6]" />
    </div>
  );
}

/** Minimal chrome for ad-traffic landing pages (/growth-audit): logo-only header, legal-only footer. */
function MinimalChrome() {
  return (
    <>
      <header className="container-site flex items-center py-6">
        <Logo />
      </header>
    </>
  );
}

function MinimalFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="container-site flex flex-col items-center justify-between gap-4 py-8 text-sm text-[#7C7EA6] sm:flex-row">
        <Logo />
        <nav className="flex items-center gap-6" aria-label="Legal">
          <Link to="/privacy" className="transition-colors hover:text-[#B9BBD9]">Privacy</Link>
          <Link to="/terms" className="transition-colors hover:text-[#B9BBD9]">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  const minimal = pathname === '/growth-audit' || pathname === '/book';
  return (
    <div className="flex min-h-[100dvh] flex-col">
      {minimal ? <MinimalChrome /> : <Header />}
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<ServicesIndex />} />
            <Route path="/services/:slug" element={<ServicePage />} />
            <Route path="/results" element={<ResultsIndex />} />
            <Route path="/results/:slug" element={<CasePage />} />
            <Route path="/growth-audit" element={<Audit />} />
            <Route path="/book" element={<Book />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </div>
      {minimal ? <MinimalFooter /> : <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollProgress />
      <AppShell />
      <CookieConsent />
    </BrowserRouter>
  );
}
