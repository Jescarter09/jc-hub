import { lazy, Suspense } from 'react';
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
const Search = lazy(() => import('./pages/Search'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));
const MentionsLegales = lazy(() => import('./res/MentionsLegales'));
const Confidentialite = lazy(() => import('./res/Confidentialite'));
const Cookies = lazy(() => import('./res/Cookies'));
const Faq = lazy(() => import('./res/Faq'));

function AppShell() {
  return (
    <>
      <Navbar />
      <main className="app-main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
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
