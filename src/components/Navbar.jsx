import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoSvg from '../assets/jc-hub-logo.svg';
import { fetchHostedBooks } from '../services/ebookService';
import {
  POPULAR_SEARCHES,
  PLATFORM_CATEGORIES,
  buildPlatformSearchIndex,
  getResultIcon,
  getSearchParam,
  getSearchSuggestions
} from '../utils/platformSearch';
import '../styles/Navbar.css';

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

const CATEGORY_TRENDS = [
  { label: 'Intelligence Artificielle', to: '/categories/intelligence-artificielle' },
  { label: 'Cybersécurité', to: '/categories/cybersecurite' },
  { label: 'Développement Web', to: '/categories/developpement-web' },
  { label: 'React', to: '/search?q=react' },
  { label: 'Firebase', to: '/search?q=firebase' }
];

const NAVBAR_CATEGORIES = PLATFORM_CATEGORIES.filter((category) => category.isFeatured).slice(0, 10);

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const deferredInstallPromptRef = useRef(null);
  const searchBoxRef = useRef(null);
  const hasLoadedSearchSourcesRef = useRef(false);
  const mobilePanelRef = useRef(null);
  const mobileTriggerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [articles, setArticles] = useState([]);
  const [books, setBooks] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [isInstallingApp, setIsInstallingApp] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const searchItems = useMemo(() => buildPlatformSearchIndex({ articles, books }), [articles, books]);
  const suggestions = useMemo(
    () => getSearchSuggestions(searchQuery, searchItems, 6),
    [searchItems, searchQuery]
  );
  const shouldShowSuggestions = isSearchOpen && (searchQuery.trim().length >= 2 || !searchQuery.trim());
  const popularItems = POPULAR_SEARCHES.slice(0, 5);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileCategoriesOpen(false);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setIsMobileCategoriesOpen(false);
      return;
    }

    if (isActive('/categories')) {
      setIsMobileCategoriesOpen(true);
    }
  }, [isMobileMenuOpen, location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        isMobileMenuOpen &&
        !mobilePanelRef.current?.contains(event.target) &&
        !mobileTriggerRef.current?.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }

      if (isSearchOpen && !searchBoxRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen, isSearchOpen]);

  const loadSearchSources = () => {
    if (hasLoadedSearchSourcesRef.current) return;
    hasLoadedSearchSourcesRef.current = true;

    import('../data/blogPosts')
      .then((module) => setArticles(module.blogPosts || []))
      .catch(() => setArticles([]));

    fetchHostedBooks({ limit: 30 })
      .then((nextBooks) => setBooks(nextBooks))
      .catch(() => setBooks([]));
  };

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

  const submitSearch = (value = searchQuery) => {
    const cleanQuery = value.trim();
    if (!cleanQuery) {
      navigate('/search', { state: { focusSearch: true } });
      setIsSearchOpen(false);
      setIsMobileMenuOpen(false);
      return;
    }

    navigate(`/search?q=${encodeURIComponent(getSearchParam(cleanQuery))}`);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    submitSearch();
  };

  const handleSuggestionClick = () => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handlePopularSearch = (value) => {
    setSearchQuery(value);
    submitSearch(value);
  };

  return (
    <>
      <nav className="neo-nav fixed inset-x-0 top-0 z-50">
        <div className="neo-nav-inner mx-auto flex h-[74px] w-full max-w-7xl items-center justify-between px-3 sm:h-[80px] sm:px-6 lg:px-8">
          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-label="Ouvrir le menu"
            className={`neo-burger neo-top-burger ${isMobileMenuOpen ? 'neo-burger-open' : ''}`}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <Link to="/" className="neo-brand">
            <img src={logoSvg} alt="JC Hub Logo" className="h-12 w-12 rounded-lg" />
            <span className="neo-brand-copy">
              <strong>JC Hub</strong>
              <small>Blog & Bibliothèque</small>
            </span>
          </Link>

          <div className="neo-desktop-links">
            <NavItem to="/" active={location.pathname === '/' && !location.hash}>Accueil</NavItem>
            <NavItem to="/blog" active={isActive('/blog')}>Blog</NavItem>
            <NavItem to="/ebooks" active={isActive('/ebooks')}>Bibliothèque</NavItem>
            <div className="neo-categories-wrap">
              <Link
                to="/categories"
                className={`neo-nav-link neo-categories-trigger ${
                  isActive('/categories') ? 'neo-nav-link-active' : ''
                }`}
                aria-haspopup="true"
              >
                Catégories
                <i className="fas fa-chevron-down"></i>
              </Link>

              <div className="neo-categories-mega" aria-label="Catégories JC Hub">
                <div className="neo-categories-mega-head">
                  <span>
                    <i className="fas fa-folder-open"></i>
                  </span>
                  <div>
                    <strong>Catégories</strong>
                    <p>Explore les articles, ebooks et guides par domaine.</p>
                  </div>
                </div>

                <div className="neo-categories-mega-grid">
                  {NAVBAR_CATEGORIES.map((category) => (
                    <Link
                      key={category.slug}
                      to={`/categories/${category.slug}`}
                      className={`neo-categories-mega-item ${
                        location.pathname === `/categories/${category.slug}`
                          ? 'neo-categories-mega-item-active'
                          : ''
                      }`}
                    >
                      <span>
                        <i className={category.icon}></i>
                      </span>
                      <div>
                        <strong>{category.name}</strong>
                        <small>{category.description}</small>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="neo-categories-trends">
                  <span>
                    <i className="fas fa-fire"></i>
                    Tendances
                  </span>
                  <div>
                    {CATEGORY_TRENDS.map((trend) => (
                      <Link key={trend.label} to={trend.to}>
                        {trend.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <NavItem to="/about" active={isActive('/about')}>À propos</NavItem>
            <NavItem to="/contact" active={isActive('/contact')}>Contact</NavItem>
          </div>

          <div className="neo-nav-actions">
            <button
              type="button"
              className="neo-mobile-icon-button"
              onClick={() => {
                loadSearchSources();
                navigate('/search', { state: { focusSearch: true } });
              }}
              aria-label="Ouvrir la recherche"
            >
              <i className="fas fa-magnifying-glass"></i>
            </button>

            <button type="button" className="neo-mobile-icon-button" aria-label="Notifications">
              <i className="far fa-bell"></i>
            </button>

            <div className="neo-search-wrap" ref={searchBoxRef}>
              <form
                className={`neo-header-search-form ${
                  isActive('/search') ? 'neo-search-button-active' : ''
                }`}
                onSubmit={handleSearchSubmit}
              >
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setIsSearchOpen(true);
                    loadSearchSources();
                  }}
                  onFocus={() => {
                    setIsSearchOpen(true);
                    loadSearchSources();
                  }}
                  placeholder="Rechercher un article, ebook ou catégorie..."
                  aria-label="Rechercher un article, ebook ou catégorie"
                />
                <button type="submit" aria-label="Rechercher">
                  <i className="fas fa-magnifying-glass"></i>
                </button>
              </form>

              {shouldShowSuggestions && (
                <div className="neo-search-suggestions" role="listbox">
                  {searchQuery.trim().length < 2 ? (
                    <>
                      <p>Recherches populaires</p>
                      <div className="neo-search-popular">
                        {popularItems.map((item) => (
                          <button key={item} type="button" onClick={() => handlePopularSearch(item)}>
                            <i className="fas fa-arrow-trend-up"></i>
                            {item}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((item) => (
                      <Link
                        key={item.id}
                        to={item.path}
                        className="neo-search-suggestion"
                        onClick={handleSuggestionClick}
                      >
                        <i className={getResultIcon(item)}></i>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.typeLabel}</small>
                        </span>
                      </Link>
                    ))
                  ) : (
                    <button type="button" className="neo-search-empty" onClick={() => submitSearch()}>
                      Rechercher “{searchQuery.trim()}”
                    </button>
                  )}
                </div>
              )}
            </div>

            <Link className="neo-library-cta" to="/ebooks">
              <i className="fas fa-book-open"></i>
              <span>Explorer la bibliothèque</span>
            </Link>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="neo-mobile-shell neo-mobile-shell-open" aria-hidden={!isMobileMenuOpen}>
          <div className="neo-mobile-backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>

          <aside ref={mobilePanelRef} className="neo-mobile-panel" aria-label="Menu mobile">
            <div className="neo-mobile-panel-head">
              <Link to="/" className="neo-mobile-brand" onClick={() => setIsMobileMenuOpen(false)}>
                <img src={logoSvg} alt="JC Hub Logo" />
                <span>JC Hub</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="neo-mobile-close"
                aria-label="Fermer le menu"
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            {isMobileCategoriesOpen ? (
              <div className="neo-mobile-category-view">
                <button
                  type="button"
                  className="neo-mobile-back-button"
                  onClick={() => setIsMobileCategoriesOpen(false)}
                >
                  <i className="fas fa-arrow-left"></i>
                  Retour
                </button>

                <div className="neo-mobile-category-title">
                  <span>
                    <i className="fas fa-folder-open"></i>
                  </span>
                  <div>
                    <h2>Catégories</h2>
                    <p>Choisis un domaine pour voir les articles, ebooks et ressources associés.</p>
                  </div>
                </div>

                <div className="neo-mobile-category-view-list">
                  {NAVBAR_CATEGORIES.map((category) => (
                    <Link
                      key={category.slug}
                      to={`/categories/${category.slug}`}
                      className={`neo-mobile-category-link ${
                        location.pathname === `/categories/${category.slug}`
                          ? 'neo-mobile-category-link-active'
                          : ''
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span>
                        <i className={category.icon}></i>
                        {category.name}
                      </span>
                      <i className="fas fa-chevron-right"></i>
                    </Link>
                  ))}
                </div>

                <div className="neo-mobile-category-trends">
                  <strong>
                    <i className="fas fa-fire"></i>
                    Tendances
                  </strong>
                  <div>
                    {CATEGORY_TRENDS.map((trend) => (
                      <Link key={trend.label} to={trend.to} onClick={() => setIsMobileMenuOpen(false)}>
                        {trend.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  className="neo-mobile-all-categories"
                  to="/categories"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Voir toutes les catégories
                  <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            ) : (
              <div className="neo-mobile-links">
                <NavItem to="/" active={location.pathname === '/' && !location.hash}>
                  <i className="fas fa-house mr-2 text-xs"></i>
                  Accueil
                </NavItem>
                <NavItem to="/blog" active={isActive('/blog')}>
                  <i className="fas fa-newspaper mr-2 text-xs"></i>
                  Blog
                </NavItem>
                <NavItem to="/ebooks" active={isActive('/ebooks')}>
                  <i className="fas fa-book-open mr-2 text-xs"></i>
                  Bibliothèque
                </NavItem>
                <button
                  type="button"
                  className={`neo-mobile-categories-trigger ${
                    isActive('/categories') ? 'neo-mobile-categories-trigger-open' : ''
                  }`}
                  onClick={() => setIsMobileCategoriesOpen(true)}
                  aria-expanded={isMobileCategoriesOpen}
                >
                  <span>
                    <i className="fas fa-layer-group"></i>
                    Catégories
                  </span>
                  <i className="fas fa-chevron-right"></i>
                </button>
                <NavItem to="/about" active={isActive('/about')}>
                  <i className="fas fa-circle-info mr-2 text-xs"></i>
                  À propos
                </NavItem>
                <NavItem to="/contact" active={isActive('/contact')}>
                  <i className="fas fa-envelope mr-2 text-xs"></i>
                  Contact
                </NavItem>
              </div>
            )}

            <div className="neo-mobile-footer">
              <Link className="neo-mobile-library-link" to="/ebooks" onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-book-open"></i>
                Explorer la bibliothèque
              </Link>

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

              <div className="neo-mobile-socials" aria-label="Réseaux sociaux">
                <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                <a href="#" aria-label="X"><i className="fab fa-x-twitter"></i></a>
                <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                <a href="#" aria-label="YouTube"><i className="fab fa-youtube"></i></a>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
