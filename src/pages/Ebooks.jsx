import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTENT_CATEGORIES } from '../data/categoriesCatalog';
import { fetchHostedBooks, searchBooks } from '../services/ebookService';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import { usePageSeo } from '../hooks/usePageSeo';
import booksHeroImage from '../assets/books-library-hero.svg';
import '../styles/Ebooks.css';

const sourceFilters = [
  { label: 'Toutes les sources', value: '' },
  { label: 'Livres libres', value: 'gutendex' },
  { label: 'Livres audio libres', value: 'librivox' },
  { label: 'Google Books', value: 'google-books' },
  { label: 'OpenLibrary', value: 'openlibrary' },
  { label: 'Archive à vérifier', value: 'internet-archive' },
  { label: 'GitHub', value: 'github' },
  { label: 'Free Programming Books', value: 'free-programming-books' },
  { label: 'MDN Web Docs', value: 'mdn-web-docs' },
  { label: 'React Docs', value: 'react-documentation' },
  { label: 'Firebase Docs', value: 'firebase-documentation' },
  { label: 'Vite Docs', value: 'vite-documentation' }
];

const typeFilters = [
  { label: 'Ebooks', value: 'gutendex' },
  { label: 'Guides', value: 'google-books' },
  { label: 'Tutoriels', value: 'openlibrary' },
  { label: 'Livres blancs', value: 'internet-archive' },
  { label: 'Livres audio', value: 'librivox' },
  { label: 'Docs officielles', value: 'mdn-web-docs' },
  { label: 'Open source', value: 'github' }
];

const levelFilters = [
  { label: 'Débutant' },
  { label: 'Intermédiaire' },
  { label: 'Avancé' }
];

const formatFilters = [
  { label: 'PDF' },
  { label: 'EPUB' },
  { label: 'Lien officiel' },
  { label: 'Audio' }
];

const categoryCards = [
  { label: 'Technologies', icon: 'fas fa-code', tone: 'purple', search: 'technologie' },
  { label: 'Développement Web', icon: 'fas fa-globe', tone: 'blue', search: 'web development' },
  { label: 'Cybersécurité', icon: 'fas fa-lock', tone: 'green', search: 'cybersecurity' },
  { label: 'Intelligence Artificielle', icon: 'fas fa-brain', tone: 'purple', search: 'artificial intelligence' },
  { label: 'Design & UX', icon: 'fas fa-palette', tone: 'red', search: 'design ux' },
  { label: 'Marketing Digital', icon: 'fas fa-bullhorn', tone: 'orange', search: 'digital marketing' },
  { label: 'Data & Analytics', icon: 'fas fa-chart-column', tone: 'purple', search: 'data analytics' },
  { label: 'Cloud & DevOps', icon: 'fas fa-cloud-arrow-up', tone: 'blue', search: 'cloud devops' }
];

const sourceLabels = {
  gutendex: 'Gutendex',
  librivox: 'LibriVox',
  'google-books': 'Google Books',
  openlibrary: 'OpenLibrary',
  'internet-archive': 'Internet Archive',
  github: 'GitHub',
  'free-programming-books': 'Free Programming Books',
  'mdn-web-docs': 'MDN Web Docs',
  'react-documentation': 'React Documentation',
  'firebase-documentation': 'Firebase Documentation',
  'vite-documentation': 'Vite Documentation'
};

const BOOKS_PAGE_SIZE = 8;

function formatViewCount(value) {
  const views = Math.max(0, Number(value) || 0);
  const formatted = new Intl.NumberFormat('fr-FR', {
    notation: views >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1
  }).format(views);
  return `${formatted} vue${views > 1 ? 's' : ''}`;
}

function toSeoSlug(value, fallback = 'livre') {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return slug || fallback;
}

function getBookDetailPath(book) {
  if (book.detailPath) return book.detailPath;

  const categorySlug = toSeoSlug(book.categorySlug || book.category || 'general', 'general');
  const slug = toSeoSlug(book.slug || book.title || book.sourceId || book.id, 'livre');
  return `/ebooks/${categorySlug}/${slug}`;
}

function formatSourceCounts(sourceCounts = {}, errors = []) {
  const failedSources = new Set(errors.map((item) => item.source));
  return Object.entries(sourceCounts)
    .map(([source, count]) => {
      const label = sourceLabels[source] || source;
      return failedSources.has(source) ? `${label}: indisponible` : `${label}: ${count}`;
    })
    .join(' · ');
}

function getDownloadUrl(book) {
  if (book.canDownload === false) return '';
  if (book.isHosted && book.fileUrl) return book.fileUrl;
  if (book.isHosted && book.pdfUrl) return book.pdfUrl;
  if ((book.canDownload || book.canRedistribute) && book.downloadUrl) return book.downloadUrl;
  return '';
}

function getResourceType(book) {
  if (book.sourceType === 'preview') return 'Aperçu';
  if (book.isHosted || book.canRedistribute) return book.source === 'librivox' ? 'Audio' : 'Libre';
  if (book.source === 'librivox') return 'Audio';
  if (book.source === 'google-books') return 'Ebook';
  if (book.source === 'openlibrary') return 'Guide';
  return 'Ressource';
}

function getFileLabel(book) {
  if (book.fileSize) return book.fileSize;
  if (getDownloadUrl(book)) return 'Téléchargeable';
  if (book.canReadOnline || book.readerUrl || book.previewLink) return 'Lecture officielle';
  return 'Source officielle';
}

function BookCard({ book }) {
  const detailPath = getBookDetailPath(book);
  const canDownload = Boolean(getDownloadUrl(book));
  const canReadOnline = Boolean(book.canReadOnline || book.readerUrl || book.previewLink);

  return (
    <article className="ebooks-card">
      <Link className="ebooks-card-cover" to={detailPath} state={{ book }}>
        {book.thumbnail ? (
          <img
            src={book.thumbnail}
            alt={`JC Hub - couverture du livre ${book.title}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span>{book.title?.charAt(0) || 'L'}</span>
        )}
      </Link>

      <div className="ebooks-card-body">
        <span className="ebooks-card-type">{getResourceType(book)}</span>
        <Link to={detailPath} state={{ book }}>
          <h3>{book.title}</h3>
        </Link>
        <p>{book.author || book.sourceLabel || 'Auteur inconnu'}</p>

        <div className="ebooks-card-footer">
          <span>{getFileLabel(book)}</span>
          <Link
            className="ebooks-card-download"
            to={detailPath}
            state={{ book }}
            aria-label={`${canDownload ? 'Voir le téléchargement' : canReadOnline ? 'Voir la lecture' : 'Voir la source officielle'} pour ${book.title}`}
          >
            <i className={`fas ${canDownload ? 'fa-download' : canReadOnline ? 'fa-book-open-reader' : 'fa-arrow-right'}`}></i>
          </Link>
        </div>
      </div>
    </article>
  );
}

function PopularResourceCard({ book }) {
  const detailPath = getBookDetailPath(book);

  return (
    <Link to={detailPath} state={{ book }} className="ebooks-popular-card">
      <span className="ebooks-popular-card-cover">
        {book.thumbnail ? (
          <img
            src={book.thumbnail}
            alt={`JC Hub - couverture du livre ${book.title}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <i className="fas fa-book-open"></i>
        )}
      </span>
      <strong>{book.title}</strong>
      <span className="ebooks-popular-card-meta">
        <em>{book.category || book.sourceLabel || getResourceType(book)}</em>
        <span>{book.author || book.sourceLabel || 'Auteur inconnu'}</span>
        <span className="ebooks-popular-card-views">
          <i className="far fa-eye"></i>
          {formatViewCount(book.viewsCount)}
        </span>
      </span>
    </Link>
  );
}

export default function Ebooks() {
  const [hostedBooks, setHostedBooks] = useState([]);
  const [results, setResults] = useState([]);
  const [hasSearchRun, setHasSearchRun] = useState(false);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingHosted, setIsLoadingHosted] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState('');
  const resultsTopRef = useRef(null);
  const newsletter = useNewsletterForm({ source: 'ebooks-page' });

  usePageSeo({
    title: 'Bibliothèque numérique',
    description:
      'Explore une bibliothèque numérique prudente: livres libres téléchargeables, contenus protégés redirigés vers leurs plateformes officielles.',
    path: '/ebooks'
  });

  useEffect(() => {
    let active = true;

    fetchHostedBooks()
      .then((books) => {
        if (active) setHostedBooks(books);
      })
      .catch(() => {
        if (active) setFeedback("Les livres hébergés ne sont pas disponibles pour le moment.");
      })
      .finally(() => {
        if (active) setIsLoadingHosted(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleBooks = useMemo(() => {
    if (hasSearchRun) return results;
    return hostedBooks;
  }, [hasSearchRun, hostedBooks, results]);

  const filteredBooks = useMemo(() => {
    const sourceFiltered = source
      ? visibleBooks.filter((book) => book.source === source || book.sourceSlug === source)
      : visibleBooks;

    const sorted = [...sourceFiltered];
    if (sortBy === 'title') {
      sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'fr'));
    } else if (sortBy === 'popular') {
      sorted.sort((a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0));
    } else if (sortBy === 'downloadable') {
      sorted.sort((a, b) => Number(Boolean(getDownloadUrl(b))) - Number(Boolean(getDownloadUrl(a))));
    }
    return sorted;
  }, [sortBy, source, visibleBooks]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / BOOKS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * BOOKS_PAGE_SIZE;
  const booksToShow = filteredBooks.slice(pageStart, pageStart + BOOKS_PAGE_SIZE);
  const pageRangeStart = filteredBooks.length === 0 ? 0 : pageStart + 1;
  const pageRangeEnd = filteredBooks.length === 0 ? 0 : pageStart + booksToShow.length;
  const totalBookViews = hostedBooks.reduce((total, book) => total + (Number(book.viewsCount) || 0), 0);
  const popularBooks = useMemo(
    () =>
      [...hostedBooks]
        .sort((a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0))
        .slice(0, 6),
    [hostedBooks]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [hasSearchRun, results.length, hostedBooks.length, source, sortBy]);

  const handlePageChange = (page) => {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(nextPage);
    window.requestAnimationFrame(() => {
      resultsTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  };

  const loadHostedBooks = async () => {
    setIsLoadingHosted(true);
    setFeedback('');

    try {
      const books = await fetchHostedBooks();
      setHostedBooks(books);
      setResults([]);
      setHasSearchRun(false);
    } catch {
      setFeedback("Les livres Firebase ne sont pas disponibles pour le moment.");
    } finally {
      setIsLoadingHosted(false);
    }
  };

  const runSearch = async (searchValue, nextSource = source) => {
    const cleanQuery = String(searchValue || '').trim();
    if (isSearching) return;

    if (!cleanQuery) {
      await loadHostedBooks();
      return;
    }

    if (cleanQuery.length < 2) {
      setFeedback('La recherche doit contenir au moins 2 caractères.');
      return;
    }

    setIsSearching(true);
    setFeedback('');

    try {
      const payload = await searchBooks(cleanQuery, {
        sources: nextSource ? [nextSource] : []
      });
      setResults(payload.results);
      setHasSearchRun(true);
      const sourceSummary = formatSourceCounts(payload.sourceCounts, payload.errors);
      if (payload.results.length === 0) {
        setFeedback(sourceSummary ? `Aucun livre trouvé. ${sourceSummary}` : 'Aucun livre trouvé pour cette recherche.');
      } else if (payload.errors.length > 0) {
        const failedSources = payload.errors.map((item) => sourceLabels[item.source] || item.source).join(', ');
        setFeedback(
          `Certaines sources n’ont pas répondu (${failedSources}). Résultats affichés. ${
            sourceSummary ? `Détail: ${sourceSummary}` : ''
          }`
        );
      } else if (payload.catalog?.saved > 0) {
        setFeedback(
          `${payload.catalog.saved} résultat${payload.catalog.saved > 1 ? 's' : ''} catalogué${
            payload.catalog.saved > 1 ? 's' : ''
          } dans Firestore. ${sourceSummary}`
        );
      } else if (payload.catalog?.warning) {
        setFeedback('Résultats affichés, mais la sauvegarde Firestore est indisponible pour le moment.');
      } else if (sourceSummary) {
        setFeedback(sourceSummary);
      }
    } catch (error) {
      setFeedback(error.message || 'Recherche impossible pour le moment.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await runSearch(query, source);
  };

  const handleCategoryExplore = (category) => {
    setQuery(category.search);
    setSource('');
    runSearch(category.search, '');
  };

  const resetFilters = () => {
    setSource('');
    setSortBy('recent');
  };

  const newsletterFeedbackClassName =
    newsletter.feedback.kind === 'error'
      ? 'ebooks-newsletter-feedback ebooks-newsletter-feedback-error'
      : newsletter.feedback.kind === 'info'
        ? 'ebooks-newsletter-feedback ebooks-newsletter-feedback-info'
        : 'ebooks-newsletter-feedback ebooks-newsletter-feedback-success';

  return (
    <div className="ebooks-page">
      <section className="ebooks-hero">
        <div className="ebooks-hero-copy">
          <h1>
            Bibliothèque <span>numérique</span>
          </h1>
          <p>Accédez à des ressources de qualité pour apprendre, comprendre et progresser dans le monde du numérique.</p>

          <form className="ebooks-search" onSubmit={handleSubmit}>
            <input
              id="ebooks-query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une ressource, un livre, un guide..."
            />
            <button type="submit" disabled={isSearching} aria-label="Rechercher dans la bibliothèque">
              <i className={`fas ${isSearching ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
            </button>
          </form>

          <div className="ebooks-hero-stats" aria-label="Statistiques de la bibliothèque JC Hub">
            <span>
              <i className="far fa-file-lines"></i>
              <strong>{Math.max(visibleBooks.length, hostedBooks.length)}+</strong>
              <small>Ressources</small>
            </span>
            <span>
              <i className="fas fa-border-all"></i>
              <strong>{CONTENT_CATEGORIES.length}+</strong>
              <small>Catégories</small>
            </span>
            <span>
              <i className="far fa-eye"></i>
              <strong>{formatViewCount(totalBookViews)}</strong>
              <small>Vues livres</small>
            </span>
            <span>
              <i className="far fa-clock"></i>
              <strong>Mises à jour</strong>
              <small>Chaque semaine</small>
            </span>
          </div>
        </div>

        <div className="ebooks-hero-photo">
          <img src={booksHeroImage} alt="JC Hub - bibliothèque numérique et livres" loading="eager" decoding="async" />
        </div>
      </section>

      <section className="ebooks-section ebooks-categories" aria-labelledby="ebooks-categories-title">
        <div className="ebooks-section-heading">
          <h2 id="ebooks-categories-title">Explorer par catégorie</h2>
          <button type="button" onClick={() => runSearch('technology', '')}>
            Voir toutes les catégories <i className="fas fa-arrow-right"></i>
          </button>
        </div>

        <div className="ebooks-category-grid">
          {categoryCards.map((category) => (
            <button
              key={category.label}
              type="button"
              className={`ebooks-category-card ebooks-category-card-${category.tone}`}
              onClick={() => handleCategoryExplore(category)}
            >
              <i className={category.icon}></i>
              <strong>{category.label}</strong>
              <span>Explorer</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ebooks-section ebooks-library-layout">
        <aside className="ebooks-filters" aria-label="Filtres de ressources">
          <h2>Filtres</h2>

          <div className="ebooks-filter-group">
            <h3>Type de ressource</h3>
            {typeFilters.map((filter) => (
              <label key={filter.value}>
                <input
                  type="checkbox"
                  checked={source === filter.value}
                  onChange={() => setSource((current) => (current === filter.value ? '' : filter.value))}
                />
                <span>{filter.label}</span>
              </label>
            ))}
          </div>

          <div className="ebooks-filter-group">
            <h3>Niveau</h3>
            {levelFilters.map((filter) => (
              <label key={filter.label}>
                <input type="checkbox" />
                <span>{filter.label}</span>
              </label>
            ))}
          </div>

          <div className="ebooks-filter-group">
            <h3>Format</h3>
            {formatFilters.map((filter) => (
              <label key={filter.label}>
                <input type="checkbox" />
                <span>{filter.label}</span>
              </label>
            ))}
          </div>

          <button type="button" className="ebooks-reset-filter" onClick={resetFilters}>
            Réinitialiser les filtres
          </button>
        </aside>

        <main className="ebooks-results" ref={resultsTopRef}>
          <div className="ebooks-results-head">
            <div>
              <h2>Toutes les ressources</h2>
              <p>
                {isLoadingHosted && !hasSearchRun
                  ? 'Chargement...'
                  : `${pageRangeStart}-${pageRangeEnd} / ${filteredBooks.length} ressource${
                      filteredBooks.length > 1 ? 's' : ''
                    }`}
              </p>
            </div>

            <label>
              <span>Trier par :</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recent">Plus récentes</option>
                <option value="popular">Plus vues</option>
                <option value="title">Titre A-Z</option>
                <option value="downloadable">Téléchargeables</option>
              </select>
            </label>
          </div>

          {feedback && <p className="ebooks-feedback">{feedback}</p>}

          {booksToShow.length > 0 ? (
            <div className="ebooks-grid">
              {booksToShow.map((book) => (
                <BookCard key={`${book.source}-${book.id || book.sourceId || book.title}`} book={book} />
              ))}
            </div>
          ) : (
            !isLoadingHosted && (
              <div className="ebooks-empty">
                <h3>Aucune ressource trouvée.</h3>
                <p>Lance une recherche ou importe des livres libres depuis Gutendex côté serveur.</p>
              </div>
            )
          )}

          {totalPages > 1 && (
            <nav className="ebooks-pagination" aria-label="Pagination des livres">
              <button type="button" disabled={safeCurrentPage === 1} onClick={() => handlePageChange(safeCurrentPage - 1)}>
                <i className="fas fa-chevron-left"></i>
                <span>Précédent</span>
              </button>

              <div>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={page === safeCurrentPage ? 'ebooks-pagination-active' : ''}
                    onClick={() => handlePageChange(page)}
                    aria-current={page === safeCurrentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button type="button" disabled={safeCurrentPage === totalPages} onClick={() => handlePageChange(safeCurrentPage + 1)}>
                <span>Suivant</span>
                <i className="fas fa-chevron-right"></i>
              </button>
            </nav>
          )}
        </main>
      </section>

      {popularBooks.length > 0 && (
        <section className="ebooks-section ebooks-popular">
          <div className="ebooks-section-heading">
            <h2>Ressources les plus populaires</h2>
            <Link to="/ebooks">
              Voir toutes les ressources populaires <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          <div className="ebooks-popular-grid">
            {popularBooks.map((book) => (
              <PopularResourceCard key={`popular-${book.source}-${book.id || book.sourceId || book.title}`} book={book} />
            ))}
          </div>
        </section>
      )}

      <section className="ebooks-section ebooks-benefits" aria-label="Avantages de la bibliothèque JC Hub">
        <article>
          <i className="fas fa-shield-halved"></i>
          <div>
            <h3>Ressources de qualité</h3>
            <p>Contenu vérifié et organisé pour apprendre plus vite.</p>
          </div>
        </article>
        <article>
          <i className="fas fa-heart"></i>
          <div>
            <h3>Accès gratuit</h3>
            <p>Des ressources libres ou redirigées vers leur source officielle.</p>
          </div>
        </article>
        <article>
          <i className="fas fa-download"></i>
          <div>
            <h3>Téléchargement rapide</h3>
            <p>Les livres libres peuvent être téléchargés depuis leur fiche.</p>
          </div>
        </article>
        <article>
          <i className="far fa-clock"></i>
          <div>
            <h3>Mises à jour régulières</h3>
            <p>De nouvelles ressources peuvent être ajoutées chaque semaine.</p>
          </div>
        </article>
      </section>

      <section className="ebooks-section ebooks-newsletter">
        <div className="ebooks-newsletter-copy">
          <i className="far fa-envelope"></i>
          <div>
            <h2>Restez à jour avec notre newsletter</h2>
            <p>Recevez nos derniers guides, articles et ressources directement dans votre boîte mail.</p>
          </div>
        </div>

        <form onSubmit={newsletter.handleSubmit} className="ebooks-newsletter-form">
          <input
            type="email"
            placeholder="Votre adresse e-mail"
            value={newsletter.email}
            onChange={(event) => {
              newsletter.setEmail(event.target.value);
              newsletter.resetFeedback();
            }}
            autoComplete="email"
            required
          />
          <button type="submit" disabled={newsletter.isSubmitting}>
            {newsletter.isSubmitting ? 'Inscription...' : "S'abonner"}
          </button>
          {newsletter.feedback.text && (
            <p className={newsletterFeedbackClassName}>{newsletter.feedback.text}</p>
          )}
        </form>
      </section>
    </div>
  );
}
