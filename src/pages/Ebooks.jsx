import { useEffect, useMemo, useState } from 'react';
import { fetchHostedBooks, searchBooks } from '../services/ebookService';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/Ebooks.css';

const sourceFilters = [
  { label: 'Toutes les sources', value: '' },
  { label: 'Livres libres', value: 'gutendex' },
  { label: 'Google Books', value: 'google-books' },
  { label: 'OpenLibrary', value: 'openlibrary' },
  { label: 'Archive à vérifier', value: 'internet-archive' }
];

function getAction(book) {
  if (book.isHosted && book.pdfUrl) {
    return {
      label: 'Télécharger',
      href: book.pdfUrl,
      className: 'ebooks-card-action ebooks-card-action-primary'
    };
  }

  if (book.canRedistribute && book.downloadUrl) {
    return {
      label: 'Voir la source libre',
      href: book.externalLink || book.downloadUrl,
      className: 'ebooks-card-action ebooks-card-action-soft'
    };
  }

  return {
    label: book.source === 'google-books' ? 'Lire sur Google Books' : 'Voir source officielle',
    href: book.externalLink || book.previewLink || '#',
    className: 'ebooks-card-action'
  };
}

function BookCard({ book }) {
  const action = getAction(book);
  const licenseLabel = book.canRedistribute ? 'Redistribution autorisée' : 'Redirection externe';
  const hostedLabel = book.isHosted ? 'Hébergé JC Hub' : 'Non hébergé';

  return (
    <article className="ebooks-card">
      <div className="ebooks-card-cover">
        {book.thumbnail ? (
          <img src={book.thumbnail} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{book.title?.charAt(0) || 'L'}</span>
        )}
      </div>

      <div className="ebooks-card-body">
        <div className="ebooks-card-meta">
          <span>{book.sourceLabel || book.source || 'Source'}</span>
          <span>{hostedLabel}</span>
        </div>

        <h3>{book.title}</h3>
        <p className="ebooks-card-author">{book.author || 'Auteur inconnu'}</p>
        {book.description && <p className="ebooks-card-description">{book.description}</p>}

        <div className="ebooks-card-flags">
          <span className={book.canRedistribute ? 'is-safe' : 'is-external'}>{licenseLabel}</span>
          {book.requiresReview && <span>Vérification requise</span>}
          {book.license && <span>{book.license}</span>}
        </div>

        <a className={action.className} href={action.href} target="_blank" rel="noopener noreferrer">
          {action.label}
          <i className="fas fa-arrow-up-right-from-square"></i>
        </a>
      </div>
    </article>
  );
}

export default function Ebooks() {
  const [hostedBooks, setHostedBooks] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('javascript');
  const [source, setSource] = useState('');
  const [isLoadingHosted, setIsLoadingHosted] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState('');

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
    if (results.length > 0) return results;
    return hostedBooks;
  }, [hostedBooks, results]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2 || isSearching) return;

    setIsSearching(true);
    setFeedback('');

    try {
      const payload = await searchBooks(cleanQuery, {
        sources: source ? [source] : []
      });
      setResults(payload.results);
      if (payload.results.length === 0) {
        setFeedback('Aucun livre trouvé pour cette recherche.');
      } else if (payload.errors.length > 0) {
        setFeedback('Certaines sources externes n’ont pas répondu, mais les résultats disponibles sont affichés.');
      }
    } catch (error) {
      setFeedback(error.message || 'Recherche impossible pour le moment.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="ebooks-page">
      <section className="ebooks-hero">
        <div className="ebooks-hero-copy">
          <p className="ebooks-kicker">Bibliothèque numérique JC Hub</p>
          <h1>
            Trouver des livres utiles, <span>sans jouer avec les droits.</span>
          </h1>
          <p>
            Les livres libres peuvent être hébergés proprement. Les livres protégés restent sur leur
            plateforme officielle. Le système privilégie la découverte, la clarté et la prudence.
          </p>

          <form className="ebooks-search" onSubmit={handleSubmit}>
            <label htmlFor="ebooks-query">Rechercher un livre</label>
            <div className="ebooks-search-row">
              <input
                id="ebooks-query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="React, Python, design, roman..."
              />
              <select value={source} onChange={(event) => setSource(event.target.value)}>
                {sourceFilters.map((filter) => (
                  <option key={filter.label} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={isSearching}>
                {isSearching ? 'Recherche...' : 'Explorer'}
              </button>
            </div>
          </form>
        </div>

        <aside className="ebooks-hero-panel">
          <div>
            <span>01</span>
            <strong>Libre</strong>
            <p>Gutendex, domaine public et Creative Commons peuvent être importés.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Protégé</strong>
            <p>Google Books et OpenLibrary restent en lien officiel.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Vérifié</strong>
            <p>Internet Archive demande une validation avant tout réhébergement.</p>
          </div>
        </aside>
      </section>

      <section className="ebooks-rules">
        <article>
          <i className="fas fa-cloud-arrow-up"></i>
          <h2>Cloudinary seulement si autorisé</h2>
          <p>Le backend refuse l’import si le livre n’est pas public domain, Creative Commons ou Gutendex.</p>
        </article>
        <article>
          <i className="fas fa-database"></i>
          <h2>Firestore garde les métadonnées</h2>
          <p>Titre, auteur, licence, source, lien officiel et lien Cloudinary quand le fichier est hébergé.</p>
        </article>
        <article>
          <i className="fas fa-shield-halved"></i>
          <h2>Import protégé</h2>
          <p>L’upload est réservé au serveur avec un token, pas aux visiteurs publics.</p>
        </article>
      </section>

      <section className="ebooks-results">
        <div className="ebooks-section-head">
          <div>
            <p className="ebooks-kicker">{results.length > 0 ? 'Résultats API' : 'Livres hébergés'}</p>
            <h2>{results.length > 0 ? 'Résultats trouvés' : 'Bibliothèque validée'}</h2>
          </div>
          <span>
            {isLoadingHosted && results.length === 0
              ? 'Chargement...'
              : `${visibleBooks.length} livre${visibleBooks.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {feedback && <p className="ebooks-feedback">{feedback}</p>}

        <div className="ebooks-grid">
          {visibleBooks.map((book) => (
            <BookCard key={`${book.source}-${book.id || book.sourceId || book.title}`} book={book} />
          ))}
        </div>

        {!isLoadingHosted && visibleBooks.length === 0 && !feedback && (
          <div className="ebooks-empty">
            <h3>Aucun livre hébergé pour l’instant.</h3>
            <p>Lance une recherche ou importe des livres libres depuis Gutendex côté serveur.</p>
          </div>
        )}
      </section>
    </div>
  );
}
