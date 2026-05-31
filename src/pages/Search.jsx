import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';
import { usePageSeo } from '../hooks/usePageSeo';
import { fetchHostedBooks } from '../services/ebookService';
import {
  PLATFORM_CATEGORIES,
  POPULAR_SEARCHES,
  buildPlatformSearchIndex,
  getResultIcon,
  getSearchParam,
  normalizeSearchText,
  searchPlatformItems
} from '../utils/platformSearch';
import '../styles/Search.css';

const typeFilters = [
  { value: 'all', label: 'Tous' },
  { value: 'article', label: 'Articles' },
  { value: 'ebook', label: 'Ebooks' },
  { value: 'guide', label: 'Guides' },
  { value: 'tutorial', label: 'Tutoriels' },
  { value: 'category', label: 'Catégories' }
];

const levelFilters = [
  { label: 'Débutant', count: 45 },
  { label: 'Intermédiaire', count: 53 },
  { label: 'Avancé', count: 30 }
];

const formatFilters = [
  { label: 'PDF', count: 58 },
  { label: 'EPUB', count: 16 },
  { label: 'Vidéo', count: 8 },
  { label: 'En ligne', count: 46 }
];

const PAGE_SIZE = 5;

function getPaginationItems(totalPages, currentPage) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1, 2, 3, 4];
  if (currentPage > 4 && currentPage < totalPages - 1) {
    items.push('…', currentPage);
  } else {
    items.push('…');
  }
  items.push(totalPages);
  return [...new Set(items)];
}

function getReadableQuery(query) {
  return String(query || '').trim().replace(/-/g, ' ');
}

export default function Search() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);
  const resultsTopRef = useRef(null);
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [books, setBooks] = useState([]);
  const [activeType, setActiveType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('pertinence');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const searchItems = useMemo(() => buildPlatformSearchIndex({ articles: blogPosts, books }), [books]);
  const normalizedQuery = normalizeSearchText(query);

  const typedResults = useMemo(
    () => searchPlatformItems(query, searchItems, { activeType }),
    [activeType, query, searchItems]
  );

  const filteredResults = useMemo(() => {
    const categoryFiltered = selectedCategory
      ? typedResults.filter((result) => result.item.category === selectedCategory)
      : typedResults;

    const nextResults = [...categoryFiltered];
    if (sortBy === 'az') {
      return nextResults.sort((a, b) => a.item.title.localeCompare(b.item.title));
    }
    if (sortBy === 'type') {
      return nextResults.sort((a, b) => a.item.typeLabel.localeCompare(b.item.typeLabel));
    }
    return nextResults.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  }, [selectedCategory, sortBy, typedResults]);

  const typeCounts = useMemo(() => {
    const counts = {
      all: searchPlatformItems(query, searchItems).length,
      article: searchPlatformItems(query, searchItems, { activeType: 'article' }).length,
      ebook: searchPlatformItems(query, searchItems, { activeType: 'ebook' }).length,
      guide: searchPlatformItems(query, searchItems, { activeType: 'guide' }).length,
      tutorial: searchPlatformItems(query, searchItems, { activeType: 'tutorial' }).length,
      category: searchPlatformItems(query, searchItems, { activeType: 'category' }).length
    };
    return counts;
  }, [query, searchItems]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const pageResults = filteredResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const primaryResult = filteredResults[0]?.item || null;
  const readableQuery = getReadableQuery(query);
  const resultLabel = normalizedQuery ? `“${readableQuery}”` : 'tous les contenus';

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    fetchHostedBooks({ limit: 30 })
      .then((nextBooks) => {
        if (active) setBooks(nextBooks);
      })
      .catch(() => {
        if (active) setBooks([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeType, normalizedQuery, selectedCategory, sortBy]);

  useEffect(() => {
    if (!location.state?.focusSearch) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [location.state]);

  useEffect(() => {
    const handleFocusSearch = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener('jchub:focus-search', handleFocusSearch);
    return () => window.removeEventListener('jchub:focus-search', handleFocusSearch);
  }, []);

  const updateQueryParam = (nextQuery) => {
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      const cleanQuery = nextQuery.trim();

      if (cleanQuery) {
        nextParams.set('q', getSearchParam(cleanQuery));
      } else {
        nextParams.delete('q');
      }

      return nextParams;
    }, { replace: true });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateQueryParam(query);
  };

  const handleQuickSearch = (value) => {
    setQuery(value);
    updateQueryParam(value);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery('');
    setActiveType('all');
    setSelectedCategory('');
    updateQueryParam('');
    inputRef.current?.focus();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.requestAnimationFrame(() => {
      resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  usePageSeo({
    title: normalizedQuery ? `Recherche: ${readableQuery}` : 'Recherche',
    description:
      'Recherche publique dans les articles, ebooks, guides, tutoriels et catégories JC Hub.',
    image: primaryResult?.image || '/android-chrome-512x512.png',
    path: normalizedQuery ? `/search?q=${encodeURIComponent(getSearchParam(query))}` : '/search'
  });

  const filtersContent = (
    <>
      <div className="search-soft-filter-head">
        <h2>Filtres</h2>
        <button type="button" onClick={clearSearch}>
          <i className="fas fa-rotate-left"></i>
          Réinitialiser
        </button>
      </div>

      <div className="search-soft-filter-group">
        <h3>Type de contenu</h3>
        {typeFilters.map((filter) => (
          <label key={filter.value}>
            <span>
              <input
                type="checkbox"
                checked={activeType === filter.value}
                onChange={() => setActiveType(filter.value)}
              />
              {filter.label}
            </span>
            <small>{typeCounts[filter.value] || 0}</small>
          </label>
        ))}
      </div>

      <div className="search-soft-filter-group">
        <h3>Catégorie</h3>
        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
          <option value="">Toutes les catégories</option>
          {PLATFORM_CATEGORIES.map((category) => (
            <option key={category.slug} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="search-soft-filter-group">
        <h3>Niveau</h3>
        {levelFilters.map((filter) => (
          <label key={filter.label}>
            <span>
              <input type="checkbox" />
              {filter.label}
            </span>
            <small>{filter.count}</small>
          </label>
        ))}
      </div>

      <div className="search-soft-filter-group">
        <h3>Format</h3>
        {formatFilters.map((filter) => (
          <label key={filter.label}>
            <span>
              <input type="checkbox" />
              {filter.label}
            </span>
            <small>{filter.count}</small>
          </label>
        ))}
      </div>
    </>
  );

  return (
    <div className="search-soft">
      <section className="search-soft-hero" aria-labelledby="search-title">
        <div className="search-soft-hero-icon">
          <i className="fas fa-magnifying-glass"></i>
        </div>
        <div>
          <h1 id="search-title">
            Résultats de <span>recherche</span>
          </h1>
          <p>
            Résultats pour : <strong>{resultLabel}</strong>
          </p>
          <form className="search-soft-inline-form" onSubmit={handleSubmit}>
            <label htmlFor="search-query" className="sr-only">
              Rechercher dans JC Hub
            </label>
            <input
              id="search-query"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Modifier la recherche..."
            />
            <button type="submit" aria-label="Lancer la recherche">
              <i className="fas fa-magnifying-glass"></i>
            </button>
          </form>
        </div>
        <p className="search-soft-count">
          <strong>{filteredResults.length}</strong> résultat{filteredResults.length > 1 ? 's' : ''} trouvé
          {filteredResults.length > 1 ? 's' : ''}
        </p>
      </section>

      <section className="search-soft-shell" aria-label="Résultats de recherche JC Hub">
        <aside className="search-soft-filters" aria-label="Filtres de recherche">
          {filtersContent}
        </aside>

        <main className="search-soft-results" ref={resultsTopRef}>
          <div className="search-soft-toolbar">
            <button type="button" className="search-soft-filter-toggle" onClick={() => setIsFiltersOpen(true)}>
              <i className="fas fa-sliders"></i>
              Filtres
            </button>
            <div className="search-soft-type-tabs" aria-label="Filtres rapides">
              {typeFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={activeType === filter.value ? 'is-active' : ''}
                  onClick={() => setActiveType(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="search-soft-sort">
              <span>Trier par :</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="pertinence">Plus pertinents</option>
                <option value="type">Type de contenu</option>
                <option value="az">A à Z</option>
              </select>
            </label>
          </div>

          {filteredResults.length === 0 ? (
            <div className="search-soft-empty">
              <h2>Aucun résultat trouvé.</h2>
              <p>Essaie un mot plus simple : IA, Python, React, Firebase ou cybersécurité.</p>
              <button type="button" onClick={clearSearch}>Réinitialiser la recherche</button>
            </div>
          ) : (
            <div className="search-soft-result-list">
              {pageResults.map(({ item }) => (
                <article className="search-soft-result-card" key={item.id}>
                  <Link to={item.path} className="search-soft-result-image">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = '/jchub_monogram.png';
                        }}
                      />
                    ) : (
                      <span className="search-soft-result-placeholder">
                        <i className={getResultIcon(item)}></i>
                      </span>
                    )}
                  </Link>

                  <div className="search-soft-result-body">
                    <span className="search-soft-badge">{item.typeLabel}</span>
                    <Link to={item.path}>
                      <h2>{item.title}</h2>
                    </Link>
                    <p>{item.description}</p>

                    <div className="search-soft-meta">
                      {item.type === 'article' ? (
                        <>
                          <span className="search-soft-avatar">{item.author?.charAt(0) || 'J'}</span>
                          <strong>{item.author}</strong>
                          <span>{item.dateLabel}</span>
                          <span>{item.readMinutes} min de lecture</span>
                        </>
                      ) : item.type === 'resource' ? (
                        <>
                          <span>{item.author || item.category}</span>
                          <span>{item.format}</span>
                        </>
                      ) : (
                        <span>Explorer la catégorie</span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={item.path}
                    className="search-soft-save"
                    aria-label={`Ouvrir ${item.title}`}
                  >
                    <i className={item.type === 'resource' ? 'fas fa-book-open' : 'far fa-bookmark'}></i>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {filteredResults.length > PAGE_SIZE && (
            <nav className="search-soft-pagination" aria-label="Pagination des résultats">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              >
                <i className="fas fa-chevron-left"></i>
                Précédent
              </button>
              {getPaginationItems(totalPages, currentPage).map((page) =>
                page === '…' ? (
                  <span key={`ellipsis-${page}`} className="search-soft-ellipsis">...</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    className={page === currentPage ? 'is-active' : ''}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              >
                Suivant
                <i className="fas fa-chevron-right"></i>
              </button>
            </nav>
          )}
        </main>

        <aside className="search-soft-sidebar" aria-label="Suggestions de recherche">
          <section className="search-soft-panel">
            <h2>Recherches populaires</h2>
            <div className="search-soft-popular-list">
              {POPULAR_SEARCHES.map((item) => (
                <button key={item} type="button" onClick={() => handleQuickSearch(item)}>
                  <i className="fas fa-arrow-trend-up"></i>
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="search-soft-learning-card">
            <span>
              <i className="fas fa-graduation-cap"></i>
            </span>
            <div>
              <h2>Besoin d’apprendre plus ?</h2>
              <p>Explorez notre bibliothèque complète</p>
              <Link to="/ebooks">Explorer maintenant</Link>
            </div>
          </section>

          <section className="search-soft-panel search-soft-categories-panel">
            <h2>Catégories</h2>
            <div className="search-soft-category-list">
              {PLATFORM_CATEGORIES.slice(0, 8).map((category) => (
                <Link key={category.slug} to={`/categories/${category.slug}`}>
                  <span>
                    <i className={category.icon}></i>
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
            <Link className="search-soft-panel-link" to="/categories">
              Voir toutes les catégories
              <i className="fas fa-arrow-right"></i>
            </Link>
          </section>
        </aside>
      </section>

      {isFiltersOpen && (
        <div className="search-soft-drawer" role="dialog" aria-modal="true" aria-label="Filtres de recherche">
          <button type="button" className="search-soft-drawer-backdrop" onClick={() => setIsFiltersOpen(false)}></button>
          <div className="search-soft-drawer-panel">
            <button type="button" className="search-soft-drawer-close" onClick={() => setIsFiltersOpen(false)}>
              <i className="fas fa-xmark"></i>
              Fermer
            </button>
            {filtersContent}
          </div>
        </div>
      )}
    </div>
  );
}
