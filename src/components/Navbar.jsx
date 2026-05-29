import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoSvg from '../assets/jc-hub-logo.svg';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import '../styles/Navbar.css';

const CATEGORY_OPTIONS = ['Tous', 'Tutoriels', 'Securite', 'Outils', 'Actualites', 'Windows', 'Technologie'];

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  const iOSStandalone = window.navigator?.standalone === true;
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches === true;
  return iOSStandalone || mediaStandalone;
}

function NavItem({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`neo-nav-link ${active ? 'neo-nav-link-active' : ''}`}
    >
      {children}
    </Link>
  );
}

const getCategoryLabel = (category) => {
  const normalized = String(category || '').trim().toLowerCase();
  const labels = {
    tous: 'Tous',
    tutoriels: 'Tutoriels',
    securite: 'Sécurité',
    actualites: 'Actualités',
    outils: 'Outils',
    windows: 'Windows',
    technologie: 'Numérique'
  };

  return labels[normalized] || category;
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const deferredInstallPromptRef = useRef(null);
  const desktopCategoriesRef = useRef(null);
  const newsletterPanelRef = useRef(null);
  const mobilePanelRef = useRef(null);
  const mobileTriggerRef = useRef(null);
  const [isDesktopCategoriesOpen, setIsDesktopCategoriesOpen] = useState(false);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [isInstallingApp, setIsInstallingApp] = useState(false);
  const newsletter = useNewsletterForm({ source: 'navbar-top' });
  const newsletterFeedbackClassName =
    newsletter.feedback.kind === 'error'
      ? 'neo-newsletter-feedback neo-newsletter-feedback-error'
      : newsletter.feedback.kind === 'info'
        ? 'neo-newsletter-feedback neo-newsletter-feedback-info'
        : 'neo-newsletter-feedback neo-newsletter-feedback-success';
  const activeCategory = useMemo(
    () => new URLSearchParams(location.search).get('category') || 'Tous',
    [location.search]
  );
  const categories = CATEGORY_OPTIONS;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const closeDesktopCategories = () => {
    setIsDesktopCategoriesOpen(false);
  };

  useEffect(() => {
    setIsDesktopCategoriesOpen(false);
    setIsNewsletterOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileCategoriesOpen(false);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        isDesktopCategoriesOpen &&
        !desktopCategoriesRef.current?.contains(event.target)
      ) {
        setIsDesktopCategoriesOpen(false);
      }

      if (
        isNewsletterOpen &&
        !newsletterPanelRef.current?.contains(event.target)
      ) {
        setIsNewsletterOpen(false);
      }

      if (
        isMobileMenuOpen &&
        !mobilePanelRef.current?.contains(event.target) &&
        !mobileTriggerRef.current?.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsDesktopCategoriesOpen(false);
        setIsNewsletterOpen(false);
        setIsMobileMenuOpen(false);
        setIsMobileCategoriesOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDesktopCategoriesOpen, isMobileMenuOpen, isNewsletterOpen]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (isStandaloneDisplayMode()) {
      setCanInstallApp(false);
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredInstallPromptRef.current = event;
      setCanInstallApp(true);
    };

    const handleAppInstalled = () => {
      deferredInstallPromptRef.current = null;
      setCanInstallApp(false);
      setIsInstallingApp(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const toggleDesktopCategories = () => {
    setIsDesktopCategoriesOpen((open) => !open);
  };

  const toggleMobileCategories = () => {
    setIsMobileCategoriesOpen((open) => !open);
  };

  const toggleNewsletterPanel = () => {
    setIsNewsletterOpen((open) => !open);
  };

  const handleInstallApp = async () => {
    const promptEvent = deferredInstallPromptRef.current;
    if (!promptEvent || isInstallingApp) return;

    setIsInstallingApp(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (error) {
      console.error('Install prompt failed:', error);
    } finally {
      deferredInstallPromptRef.current = null;
      setCanInstallApp(false);
      setIsInstallingApp(false);
      setIsMobileMenuOpen(false);
    }
  };

  const handleOpenSearch = () => {
    setIsDesktopCategoriesOpen(false);
    setIsNewsletterOpen(false);
    setIsMobileCategoriesOpen(false);

    if (location.pathname !== '/search') {
      navigate('/search', { state: { focusSearch: true } });
      setIsMobileMenuOpen(false);
      return;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jchub:focus-search'));
    }

    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="neo-nav fixed inset-x-0 top-0 z-50">
        <div className="neo-nav-inner mx-auto flex h-[74px] w-full max-w-7xl items-center justify-between px-3 sm:h-[80px] sm:px-6 lg:px-8">
          <Link to="/" className="neo-brand">
            <img src={logoSvg} alt="JC Hub Logo" className="h-12 w-12 rounded-lg" />
            
          </Link>

          <div className="neo-desktop-links">
            <NavItem to="/" active={location.pathname === '/' && !location.hash}>Accueil</NavItem>
            <NavItem to="/about" active={isActive('/about')}>About</NavItem>
            <NavItem to="/blog" active={isActive('/blog')}>Article</NavItem>

            <div
              ref={desktopCategoriesRef}
              className="relative neo-categories-wrap"
              onMouseEnter={() => setIsDesktopCategoriesOpen(true)}
              onMouseLeave={closeDesktopCategories}
              onFocus={() => setIsDesktopCategoriesOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  closeDesktopCategories();
                }
              }}
            >
              <button
                type="button"
                onClick={toggleDesktopCategories}
                aria-expanded={isDesktopCategoriesOpen}
                aria-haspopup="menu"
                className={`neo-nav-link ${isActive('/blog') && activeCategory !== 'Tous' ? 'neo-nav-link-active' : ''}`}
              >
                Catégories
                <i
                  className={`fas fa-chevron-down ml-2 text-[10px] transition-transform duration-300 ${
                    isDesktopCategoriesOpen ? 'rotate-180' : ''
                  }`}
                ></i>
              </button>

              <div
                className={`neo-categories-menu ${
                  isDesktopCategoriesOpen ? 'neo-categories-menu-open' : ''
                }`}
              >
                <p className="neo-categories-title">Explorer par thème</p>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const query =
                      category === 'Tous'
                        ? ''
                        : `?${new URLSearchParams({ category }).toString()}`;
                    const isCurrent = (activeCategory || 'Tous') === category;

                    return (
                      <Link
                        key={category}
                        to={{ pathname: '/blog', search: query }}
                        onClick={() => setIsDesktopCategoriesOpen(false)}
                        className={`neo-category-item ${isCurrent ? 'neo-category-item-active' : ''}`}
                      >
                        <span>{getCategoryLabel(category)}</span>
                        {isCurrent && <i className="fas fa-circle-check text-[11px]"></i>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <NavItem to="/contact" active={isActive('/contact')}>Contact</NavItem>
          </div>

          <div className="neo-nav-actions">
            <div className="neo-bonline-chip" aria-hidden="true">
              <span className="neo-bonline-chip-label">Guides simples</span>
              <span className="neo-bonline-chip-core"></span>
              <span className="neo-bonline-chip-glow"></span>
            </div>

            {canInstallApp && (
              <button
                type="button"
                className="neo-install-button neo-header-install-button"
                onClick={handleInstallApp}
                disabled={isInstallingApp}
              >
                <i className="fas fa-download"></i>
                <span>{isInstallingApp ? "Installation..." : "Installer l'app"}</span>
              </button>
            )}

            <button
              type="button"
              className={`neo-search-button neo-header-search-button ${
                isActive('/search') ? 'neo-search-button-active' : ''
              }`}
              onClick={handleOpenSearch}
            >
              <i className="fas fa-magnifying-glass"></i>
              <span>Recherche</span>
            </button>

            <div ref={newsletterPanelRef} className="neo-newsletter-wrap">
              <button
                type="button"
                onClick={toggleNewsletterPanel}
                aria-expanded={isNewsletterOpen}
                aria-label="Ouvrir le formulaire newsletter"
                className={`neo-subscribe-button neo-header-subscribe-button ${
                  isNewsletterOpen ? 'neo-subscribe-button-active' : ''
                }`}
              >
                <i className="fas fa-envelope text-xs"></i>
                <span>Newsletter</span>
              </button>

              <div className={`neo-newsletter-popover ${isNewsletterOpen ? 'neo-newsletter-popover-open' : ''}`}>
                <p className="neo-newsletter-kicker">La lettre JC Hub</p>
                <h3>Rejoins la newsletter JC Hub</h3>
                <p className="neo-newsletter-copy">
                  Reçois les articles utiles et conseils pratiques directement dans ta boite mail.
                </p>

                <form onSubmit={newsletter.handleSubmit} className="neo-newsletter-form">
                  <input
                    type="email"
                    placeholder="ton@email.com"
                    value={newsletter.email}
                    onChange={(event) => {
                      newsletter.setEmail(event.target.value);
                      newsletter.resetFeedback();
                    }}
                    autoComplete="email"
                    required
                  />
                  <button type="submit" disabled={newsletter.isSubmitting}>
                    {newsletter.isSubmitting ? 'Inscription...' : "Je m'abonne"}
                  </button>
                </form>

                {newsletter.feedback.text && (
                  <p className={newsletterFeedbackClassName}>{newsletter.feedback.text}</p>
                )}
              </div>
            </div>

            <button
              ref={mobileTriggerRef}
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Ouvrir le menu"
              className={`neo-burger ${isMobileMenuOpen ? 'neo-burger-open' : ''}`}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="neo-mobile-shell neo-mobile-shell-open" aria-hidden={!isMobileMenuOpen}>
          <div className="neo-mobile-backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>

          <aside ref={mobilePanelRef} className="neo-mobile-panel" aria-label="Menu mobile">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="neo-mobile-close"
              aria-label="Fermer le menu"
            >
              <i className="fas fa-xmark"></i>
              <span>Fermer</span>
            </button>

            <div className="neo-mobile-links">
              <NavItem to="/" active={location.pathname === '/' && !location.hash}>
                <i className="fas fa-house mr-2 text-xs"></i>
                Accueil
              </NavItem>
              <NavItem to="/blog" active={isActive('/blog')}>
                <i className="fas fa-newspaper mr-2 text-xs"></i>
                Article
              </NavItem>
              <NavItem to="/about" active={isActive('/about')}>
                <i className="fas fa-circle-info mr-2 text-xs"></i>
                About
              </NavItem>
              <NavItem to="/contact" active={isActive('/contact')}>
                <i className="fas fa-envelope mr-2 text-xs"></i>
                Contact
              </NavItem>
            </div>

            <div
              className="neo-mobile-categories"
              onMouseEnter={() => setIsMobileCategoriesOpen(true)}
              onMouseLeave={() => setIsMobileCategoriesOpen(false)}
            >
              <button
                type="button"
                onClick={toggleMobileCategories}
                className={`neo-mobile-categories-trigger ${
                  isMobileCategoriesOpen ? 'neo-mobile-categories-trigger-open' : ''
                }`}
                aria-expanded={isMobileCategoriesOpen}
              >
                <span>
                  <i className="fas fa-layer-group mr-2 text-xs"></i>
                  Catégories
                </span>
                <i
                  className={`fas fa-chevron-down text-[10px] transition-transform ${
                    isMobileCategoriesOpen ? 'rotate-180' : ''
                  }`}
                ></i>
              </button>

              <div
                className={`neo-mobile-categories-list ${
                  isMobileCategoriesOpen ? 'neo-mobile-categories-list-open' : ''
                }`}
              >
                {categories.map((category) => {
                  const query =
                    category === 'Tous'
                      ? ''
                      : `?${new URLSearchParams({ category }).toString()}`;
                  const isCurrent = (activeCategory || 'Tous') === category;

                  return (
                    <Link
                      key={category}
                      to={{ pathname: '/blog', search: query }}
                      className={`neo-mobile-category-link ${isCurrent ? 'neo-mobile-category-link-active' : ''}`}
                      onClick={() => {
                        setIsMobileCategoriesOpen(false);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span>{getCategoryLabel(category)}</span>
                      {isCurrent && <i className="fas fa-check text-[10px]"></i>}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="neo-mobile-footer">
              {canInstallApp && (
                <button
                  type="button"
                  className="neo-install-button w-full justify-center"
                  onClick={handleInstallApp}
                  disabled={isInstallingApp}
                >
                  <i className="fas fa-download"></i>
                  <span>{isInstallingApp ? "Installation..." : "Installer l'app"}</span>
                </button>
              )}

              <button
                type="button"
                className="neo-search-button w-full justify-center"
                onClick={handleOpenSearch}
              >
                <i className="fas fa-magnifying-glass"></i>
                <span>Rechercher</span>
              </button>

              <form onSubmit={newsletter.handleSubmit} className="neo-mobile-newsletter-form">
                <p className="neo-mobile-newsletter-title">Newsletter JC Hub</p>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={newsletter.email}
                  onChange={(event) => {
                    newsletter.setEmail(event.target.value);
                    newsletter.resetFeedback();
                  }}
                  autoComplete="email"
                  required
                />
                <button type="submit" className="neo-subscribe-button w-full justify-center" disabled={newsletter.isSubmitting}>
                  <i className="fas fa-envelope text-xs"></i>
                  <span>{newsletter.isSubmitting ? 'Inscription...' : "Je m'abonne"}</span>
                </button>
                {newsletter.feedback.text && (
                  <p className={newsletterFeedbackClassName}>{newsletter.feedback.text}</p>
                )}
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
