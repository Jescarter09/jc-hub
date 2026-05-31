import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  fetchBookDetail,
  fetchBookInteractions,
  fetchHostedBooks,
  registerBookView,
  submitBookAppreciation
} from '../services/ebookService';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/EbookDetail.css';

const DEFAULT_INTERACTIONS = {
  viewsCount: 0,
  ratingCount: 0,
  averageRating: 0,
  appreciationCount: 0,
  latestAppreciation: null,
  recentAppreciations: []
};

function toSafeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function getBookInteractionKey(book) {
  return ['jchub', 'ebook-view', book?.id || book?.sourceId || book?.slug || book?.title || 'livre'].join(':');
}

function normalizeInteractionStats(book, stats = {}) {
  return {
    viewsCount: Math.floor(toSafeNumber(stats.viewsCount ?? book?.viewsCount)),
    ratingCount: Math.floor(toSafeNumber(stats.ratingCount ?? book?.ratingCount)),
    averageRating: toSafeNumber(stats.averageRating ?? book?.averageRating),
    appreciationCount: Math.floor(toSafeNumber(stats.appreciationCount ?? book?.appreciationCount)),
    latestAppreciation: stats.latestAppreciation || book?.latestAppreciation || null,
    recentAppreciations: Array.isArray(stats.recentAppreciations) ? stats.recentAppreciations : []
  };
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(toSafeNumber(value));
}

function formatRating(value) {
  const rating = toSafeNumber(value);
  return rating > 0 ? rating.toFixed(1).replace('.', ',') : '—';
}

function getOfficialAction(book) {
  const href = book?.externalLink || book?.previewLink || book?.readerUrl || '';
  const labels = {
    gutendex: 'Voir sur Gutenberg',
    'google-books': 'Continuer sur Google Books',
    openlibrary: 'Voir sur OpenLibrary',
    'internet-archive': 'Voir sur Internet Archive'
  };

  return {
    href,
    label: labels[book?.source] || 'Voir officiellement'
  };
}

function getReaderAction(book) {
  const href = book?.readerUrl || (book?.isHosted ? book?.fileUrl || book?.pdfUrl : '') || book?.previewLink || '';
  if (!href || book?.canReadOnline === false) return null;

  return {
    href,
    label: book?.readerType === 'official' || book?.sourceType === 'preview' ? 'Lire un aperçu' : 'Lire sur le site',
    icon: book?.readerType === 'official' || book?.sourceType === 'preview' ? 'fas fa-eye' : 'fas fa-book-open-reader'
  };
}

function getDownloadAction(book) {
  if (book?.canDownload === false) return null;

  if (book?.isHosted && book?.fileUrl) {
    return {
      href: book.fileUrl,
      label: 'Télécharger'
    };
  }

  if (book?.isHosted && book?.pdfUrl) {
    return {
      href: book.pdfUrl,
      label: 'Télécharger'
    };
  }

  if ((book?.canDownload || book?.canRedistribute) && book?.downloadUrl) {
    return {
      href: book.downloadUrl,
      label: 'Télécharger depuis la source libre'
    };
  }

  return null;
}

function getAccessLabel(book) {
  if (book?.sourceType === 'public_domain' || book?.canRedistribute) return 'Livre libre';
  if (book?.sourceType === 'preview' || book?.canReadOnline) return 'Aperçu officiel';
  return 'Source officielle';
}

function getAccessNote(book) {
  if (book?.sourceType === 'public_domain' || book?.canRedistribute) {
    return 'Lecture en ligne · Téléchargement autorisé selon la licence';
  }

  if (book?.sourceType === 'preview' || book?.canReadOnline) {
    return 'Aperçu officiel · Aucun fichier réhébergé';
  }

  return 'Métadonnées uniquement · Redirection vers la source officielle';
}

export default function EbookDetail() {
  const { category, slug } = useParams();
  const location = useLocation();
  const initialBook = location.state?.book || null;
  const [book, setBook] = useState(initialBook);
  const [isLoading, setIsLoading] = useState(!initialBook);
  const [feedback, setFeedback] = useState('');
  const [interactions, setInteractions] = useState(DEFAULT_INTERACTIONS);
  const [rating, setRating] = useState(5);
  const [appreciationName, setAppreciationName] = useState('');
  const [appreciationComment, setAppreciationComment] = useState('');
  const [appreciationFeedback, setAppreciationFeedback] = useState('');
  const [isSubmittingAppreciation, setIsSubmittingAppreciation] = useState(false);
  const [similarBooks, setSimilarBooks] = useState([]);

  useEffect(() => {
    let active = true;
    setIsLoading(!initialBook);
    setFeedback('');

    fetchBookDetail(category, slug)
      .then((foundBook) => {
        if (active) setBook(foundBook || initialBook);
      })
      .catch((error) => {
        if (!active) return;
        if (initialBook) {
          setBook(initialBook);
          return;
        }
        setFeedback(error.message || 'Détails du livre indisponibles.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, initialBook, slug]);

  useEffect(() => {
    if (!book) return undefined;

    let active = true;
    const viewKey = getBookInteractionKey(book);
    const initialStats = normalizeInteractionStats(book);
    setInteractions(initialStats);

    const loadInteractions = async () => {
      let hasViewed = false;

      try {
        hasViewed = window.sessionStorage.getItem(viewKey) === '1';
      } catch {
        hasViewed = false;
      }

      try {
        const stats = hasViewed ? await fetchBookInteractions(book) : await registerBookView(book);
        if (!active || !stats) return;
        setInteractions(normalizeInteractionStats(book, stats));

        if (!hasViewed) {
          try {
            window.sessionStorage.setItem(viewKey, '1');
          } catch {
            // sessionStorage can be unavailable in private contexts.
          }
        }
      } catch {
        if (active) setInteractions(initialStats);
      }
    };

    loadInteractions();

    return () => {
      active = false;
    };
  }, [book]);

  useEffect(() => {
    if (!book) return undefined;

    let active = true;
    fetchHostedBooks({ limit: 120 })
      .then((books) => {
        if (!active) return;
        const currentId = book.id || book.sourceId || book.slug || book.title;
        const related = books
          .filter((item) => {
            const itemId = item.id || item.sourceId || item.slug || item.title;
            if (itemId === currentId) return false;
            return (
              item.categorySlug === book.categorySlug ||
              item.category === book.category ||
              item.source === book.source
            );
          })
          .sort((a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0))
          .slice(0, 4);
        setSimilarBooks(related);
      })
      .catch(() => {
        if (active) setSimilarBooks([]);
      });

    return () => {
      active = false;
    };
  }, [book]);

  const officialAction = useMemo(() => getOfficialAction(book), [book]);
  const readerAction = useMemo(() => getReaderAction(book), [book]);
  const downloadAction = useMemo(() => getDownloadAction(book), [book]);
  const seoDescription =
    book?.description ||
    `Découvre les détails de ce livre, sa source officielle et ses conditions d'accès dans la bibliothèque numérique JC Hub.`;

  usePageSeo({
    title: book?.title ? `${book.title} - Ebook` : 'Détails du livre',
    description: seoDescription,
    image: book?.thumbnail || undefined,
    path: `/ebooks/${category || book?.categorySlug || 'general'}/${slug || book?.slug || 'livre'}`,
    type: 'article'
  });

  if (isLoading) {
    return (
      <div className="ebook-detail-page">
        <section className="ebook-detail-shell ebook-detail-state">
          <p className="ebook-detail-kicker">Bibliothèque numérique</p>
          <h1>Chargement du livre...</h1>
        </section>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="ebook-detail-page">
        <section className="ebook-detail-shell ebook-detail-state">
          <p className="ebook-detail-kicker">Livre introuvable</p>
          <h1>Impossible d’afficher ces détails.</h1>
          {feedback && <p>{feedback}</p>}
          <Link className="ebook-detail-link" to="/ebooks">
            Retour à la bibliothèque
          </Link>
        </section>
      </div>
    );
  }

  const licenseLabel = book.canRedistribute ? 'Redistribution autorisée' : 'Redirection externe uniquement';
  const hostedLabel = book.isHosted ? 'Hébergé sur Cloudinary' : 'Non réhébergé';
  const accessLabel = getAccessLabel(book);
  const accessNote = getAccessNote(book);
  const recentAppreciations =
    interactions.recentAppreciations.length > 0
      ? interactions.recentAppreciations
      : interactions.latestAppreciation
        ? [interactions.latestAppreciation]
        : [];

  const handleAppreciationSubmit = async (event) => {
    event.preventDefault();
    setAppreciationFeedback('');
    setIsSubmittingAppreciation(true);

    try {
      const stats = await submitBookAppreciation(book, {
        rating,
        authorName: appreciationName,
        comment: appreciationComment
      });
      setInteractions(normalizeInteractionStats(book, stats));
      setAppreciationComment('');
      setAppreciationFeedback('Merci, ton appréciation a été enregistrée.');
    } catch (error) {
      setAppreciationFeedback(error.message || "Impossible d'enregistrer ton appréciation pour le moment.");
    } finally {
      setIsSubmittingAppreciation(false);
    }
  };

  const detailFacts = [
    { label: 'Auteur', value: book.author || 'Auteur inconnu' },
    { label: 'Vues', value: formatCompactNumber(interactions.viewsCount) },
    { label: 'Date de publication', value: book.publishedDate || book.year || '—' },
    { label: 'Format', value: book.preferredFormat || 'PDF' },
    { label: 'Pages', value: book.pageCount || book.pages || '—' },
    { label: 'Accès', value: accessLabel }
  ];

  const keyInfos = [
    { icon: 'far fa-folder', label: 'Catégorie', value: book.category || category || 'Général' },
    { icon: 'far fa-folder-open', label: 'Sous-catégorie', value: book.subcategory || 'Ressource numérique' },
    { icon: 'far fa-language', label: 'Langue', value: book.language || 'Français' },
    { icon: 'far fa-file-pdf', label: 'Format', value: book.preferredFormat || 'PDF' },
    { icon: 'far fa-file-lines', label: 'Pages', value: book.pageCount || book.pages || '—' },
    { icon: 'far fa-eye', label: 'Vues', value: formatCompactNumber(interactions.viewsCount) },
    { icon: 'fas fa-download', label: 'Taille du fichier', value: book.fileSize || '—' },
    { icon: 'far fa-star', label: 'Niveau', value: book.level || 'Intermédiaire' },
    { icon: 'far fa-circle-check', label: 'Licence', value: book.license || (book.canRedistribute ? 'Libre' : 'Source officielle') },
    { icon: 'far fa-eye', label: 'Lecture en ligne', value: book.canReadOnline ? 'Oui' : 'Non' },
    { icon: 'fas fa-download', label: 'Téléchargement', value: book.canDownload ? 'Oui' : 'Non' }
  ];

  return (
    <div className="ebook-detail-page">
      <section className="ebook-detail-shell">
        <nav className="ebook-detail-breadcrumb" aria-label="Fil d’Ariane">
          <Link to="/">Accueil</Link>
          <span>›</span>
          <Link to="/ebooks">Bibliothèque</Link>
          <span>›</span>
          <Link to={`/categories/${book.categorySlug || category || 'general'}`}>{book.category || category || 'Général'}</Link>
          <span>›</span>
          <span>{book.title}</span>
        </nav>

        <div className="ebook-detail-hero">
          <div className="ebook-detail-cover">
            {book.thumbnail ? (
              <img src={book.thumbnail} alt={`JC Hub - couverture de ${book.title}`} loading="lazy" decoding="async" />
            ) : (
              <span>{book.title?.charAt(0) || 'L'}</span>
            )}
          </div>

          <div className="ebook-detail-copy">
            <p className="ebook-detail-kicker">{book.isHosted ? 'EBOOK' : book.sourceLabel || book.source || 'RESSOURCE'}</p>
            <h1>{book.title}</h1>
            <p className="ebook-detail-author">
              {book.description || `Une ressource complète pour progresser sur ${book.category || 'ce sujet'} avec des explications claires et pratiques.`}
            </p>

            <div className="ebook-detail-rating-line" aria-label="Note du livre">
              <strong>{formatRating(interactions.averageRating)}</strong>
              <span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <i key={star} className="fas fa-star"></i>
                ))}
              </span>
              <small>({formatCompactNumber(interactions.appreciationCount || interactions.ratingCount)} avis)</small>
              <small className="ebook-detail-view-count">
                <i className="far fa-eye"></i>
                {formatCompactNumber(interactions.viewsCount)} vue{interactions.viewsCount > 1 ? 's' : ''}
              </small>
            </div>

            <div className="ebook-detail-facts">
              {detailFacts.map((fact) => (
                <span key={fact.label}>
                  <small>{fact.label}</small>
                  <strong>{fact.value}</strong>
                </span>
              ))}
            </div>

            <div className="ebook-detail-actions">
              {readerAction && (
                <a className="ebook-detail-action is-primary" href={readerAction.href} target="_blank" rel="noopener noreferrer">
                  <i className={readerAction.icon}></i>
                  {readerAction.label}
                </a>
              )}
              {downloadAction && (
                <a
                  className={`ebook-detail-action ${readerAction ? '' : 'is-primary'}`}
                  href={downloadAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fas fa-download"></i>
                  {downloadAction.label}
                </a>
              )}
              {officialAction.href && officialAction.href !== readerAction?.href && officialAction.href !== downloadAction?.href && (
                <a
                  className={`ebook-detail-action ${readerAction || downloadAction ? '' : 'is-primary'}`}
                  href={officialAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fas fa-arrow-up-right-from-square"></i>
                  {readerAction || downloadAction ? 'Continuer sur source officielle' : officialAction.label}
                </a>
              )}
            </div>

            <p className="ebook-detail-microcopy">{accessNote}</p>
          </div>
        </div>

        <nav className="ebook-detail-tabs" aria-label="Sections du livre">
          <a href="#description">Description</a>
          <a href="#reviews">Avis ({formatCompactNumber(interactions.appreciationCount || interactions.ratingCount)})</a>
        </nav>

        <div className="ebook-detail-content-grid">
          <article className="ebook-detail-panel ebook-detail-description" id="description">
            <h2>À propos de cet ebook</h2>
            <p>{book.description || 'Aucune description détaillée disponible pour ce livre.'}</p>

            <div className="ebook-detail-perfect">
              <i className="fas fa-puzzle-piece"></i>
              <span>Parfait pour : développeurs, étudiants, curieux et passionnés de nouvelles technologies.</span>
            </div>
          </article>

          <aside className="ebook-detail-side" id="details">
            <section className="ebook-detail-panel ebook-detail-key-card">
              <h2>Informations clés</h2>
              <ul>
                {keyInfos.map((info) => (
                  <li key={info.label}>
                    <span>
                      <i className={info.icon}></i>
                      {info.label}
                    </span>
                    <strong>{info.value}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        {similarBooks.length > 0 && (
          <section className="ebook-detail-related">
            <div className="ebook-detail-section-head">
              <h2>Ressources similaires</h2>
              <Link to="/ebooks">
                Voir plus de ressources
                <i className="fas fa-arrow-right"></i>
              </Link>
            </div>

            <div className="ebook-detail-related-grid">
              {similarBooks.map((resource) => (
                <Link
                  key={`${resource.source}-${resource.id || resource.sourceId || resource.title}`}
                  className="ebook-detail-related-card"
                  to={resource.detailPath}
                  state={{ book: resource }}
                >
                  <div>
                    {resource.thumbnail ? (
                      <img src={resource.thumbnail} alt={resource.title} loading="lazy" decoding="async" />
                    ) : (
                      <span>{resource.title.charAt(0)}</span>
                    )}
                  </div>
                  <section>
                    <small>{resource.category || resource.sourceLabel || 'Livre'}</small>
                    <h3>{resource.title}</h3>
                    <p>
                      {resource.author || resource.sourceLabel || 'Auteur inconnu'}
                      <strong>{formatCompactNumber(resource.viewsCount)} <i className="far fa-eye"></i></strong>
                    </p>
                  </section>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="ebook-detail-panel ebook-detail-appreciation" id="reviews">
          <div className="ebook-detail-panel-head">
            <div>
              <p className="ebook-detail-kicker">Avis lecteurs</p>
              <h2>Note et commentaire d’appréciation</h2>
            </div>
            <p>
              Note moyenne : <strong>{formatRating(interactions.averageRating)}/5</strong>
            </p>
          </div>

          <form className="ebook-detail-appreciation-form" onSubmit={handleAppreciationSubmit}>
            <label>
              Ton nom
              <input
                type="text"
                value={appreciationName}
                maxLength={80}
                onChange={(event) => setAppreciationName(event.target.value)}
                placeholder="Ex: Jessy Carter"
                autoComplete="name"
                required
              />
            </label>

            <label>
              Ta note
              <span className="ebook-detail-rating-options" aria-label="Choisir une note">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={star <= rating ? 'is-active' : ''}
                    aria-pressed={star <= rating}
                    onClick={() => setRating(star)}
                  >
                    <i className="fas fa-star"></i>
                  </button>
                ))}
              </span>
            </label>

            <label>
              Commentaire d’appréciation
              <textarea
                value={appreciationComment}
                maxLength={500}
                onChange={(event) => setAppreciationComment(event.target.value)}
                placeholder="Dis ce que tu penses du livre, de son utilité ou de sa clarté..."
                required
              />
            </label>

            <button className="ebook-detail-action is-primary" type="submit" disabled={isSubmittingAppreciation}>
              {isSubmittingAppreciation ? 'Envoi...' : 'Envoyer mon appréciation'}
              <i className="fas fa-paper-plane"></i>
            </button>
            {appreciationFeedback && <p className="ebook-detail-form-feedback">{appreciationFeedback}</p>}
          </form>

          <div className="ebook-detail-appreciations-list">
            <h3>Dernières appréciations</h3>
            {recentAppreciations.length > 0 ? (
              recentAppreciations.map((item) => (
                <article key={item.id || item.comment} className="ebook-detail-appreciation-item">
                  <strong>
                    {item.authorName || 'Lecteur JC Hub'} · {formatRating(item.rating)}/5
                  </strong>
                  <p>{item.comment}</p>
                </article>
              ))
            ) : (
              <p>Sois le premier à laisser une appréciation sur ce livre.</p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
