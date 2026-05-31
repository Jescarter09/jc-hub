import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Loading from './components/Loading';
import Navbar from './components/Navbar';
import CookieConsent from './components/CookieConsent';
import ScrollToTop from './components/ScrollToTop';
import AppErrorBoundary from './components/AppErrorBoundary';
import './App.css';
import ServerError from './pages/ServerError';

const Footer = lazy(() => import('./components/Footer'));
const Home = lazy(() => import('./pages/Home'));
const Blog = lazy(() => import('./pages/Blog'));
const Ebooks = lazy(() => import('./pages/Ebooks'));
const EbookDetail = lazy(() => import('./pages/EbookDetail'));
const Categories = lazy(() => import('./pages/Categories'));
const Search = lazy(() => import('./pages/Search'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));
const MentionsLegales = lazy(() => import('./res/MentionsLegales'));
const Confidentialite = lazy(() => import('./res/Confidentialite'));
const Cookies = lazy(() => import('./res/Cookies'));
const Faq = lazy(() => import('./res/Faq'));
const ROUTE_LOADING_PATHS = new Set(['/', '/blog', '/ebooks', '/bibliotheque', '/about', '/contact']);
const ROUTE_LOADING_DURATION_MS = 650;

function RouteLoadingOverlay() {
  const location = useLocation();
  const [isRouteLoading, setIsRouteLoading] = useState(() => ROUTE_LOADING_PATHS.has(location.pathname));

  useEffect(() => {
    if (!ROUTE_LOADING_PATHS.has(location.pathname)) {
      setIsRouteLoading(false);
      return undefined;
    }

    setIsRouteLoading(true);
    const timerId = window.setTimeout(() => {
      setIsRouteLoading(false);
    }, ROUTE_LOADING_DURATION_MS);

    return () => window.clearTimeout(timerId);
  }, [location.key, location.pathname]);

  return isRouteLoading ? <Loading /> : null;
}

function AppShell() {
  return (
    <>
      <Navbar />
      <RouteLoadingOverlay />
      <main className="app-main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/ebooks" element={<Ebooks />} />
            <Route path="/ebooks/:category/:slug" element={<EbookDetail />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:slug" element={<Categories />} />
            <Route path="/bibliotheque" element={<Ebooks />} />
            <Route path="/bibliotheque/:category/:slug" element={<EbookDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/500" element={<ServerError />} />
            <Route path="/res/mentions-legales" element={<MentionsLegales />} />
            <Route path="/res/confidentialite" element={<Confidentialite />} />
            <Route path="/res/cookies" element={<Cookies />} />
            <Route path="/res/faq" element={<Faq />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <CookieConsent />
    </>
  );
}

function AppContent() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <AppErrorBoundary resetKey={location.pathname}>
        <AppShell />
      </AppErrorBoundary>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
