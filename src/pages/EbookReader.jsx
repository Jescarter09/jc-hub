import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchBookDetail, registerBookView } from '../services/ebookService';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/EbookDetail.css';

function toArchiveEmbedUrl(value) {
  const input = String(value || '').trim();
  const match = input.match(/archive\.org\/details\/([^/?#]+)/i);
  return match?.[1] ? `https://archive.org/embed/${encodeURIComponent(match[1])}` : '';
}

function toGoogleBooksEmbedUrl(value) {
  const input = String(value || '').trim();
  const id = new URLSearchParams(input.split('?')[1] || '').get('id') || input.match(/[?&]id=([^&#]+)/i)?.[1];
  return id ? `https://books.google.com/books?id=${encodeURIComponent(id)}&printsec=frontcover&output=reader` : '';
}

function getReaderFrameUrl(book) {
  const localUrl = String(book?.localReaderUrl || '').trim();
  if (localUrl) return localUrl;

  const readerUrl = String(book?.readerUrl || book?.previewLink || '').trim();
  if (!readerUrl) return '';

  if (/archive\.org\/details\//i.test(readerUrl)) return toArchiveEmbedUrl(readerUrl) || readerUrl;
  if (/books\.google\./i.test(readerUrl)) return toGoogleBooksEmbedUrl(readerUrl) || readerUrl;
  return readerUrl;
}

function getOfficialUrl(book) {
  return String(book?.externalLink || book?.previewLink || book?.readerUrl || '').trim();
}

export default function EbookReader() {
  const { category, slug } = useParams();
  const location = useLocation();
  const initialBook = location.state?.book || null;
  const [book, setBook] = useState(initialBook);
  const [isLoading, setIsLoading] = useState(!initialBook);
  const [feedback, setFeedback] = useState('');
  const [frameLoaded, setFrameLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(!initialBook);
    setFeedback('');
    setFrameLoaded(false);

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
        setFeedback(error.message || 'Lecture indisponible pour ce livre.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, initialBook, slug]);

  useEffect(() => {
    if (!book) return;
    registerBookView(book).catch(() => {});
  }, [book]);

  const readerUrl = useMemo(() => getReaderFrameUrl(book), [book]);
  const officialUrl = useMemo(() => getOfficialUrl(book), [book]);

  usePageSeo({
    title: book?.title ? `Lire ${book.title}` : 'Lecture ebook',
    description: book?.description || 'Lecture en ligne sur JC Hub.',
    image: book?.thumbnail || undefined,
    path: `/ebooks/${category || book?.categorySlug || 'general'}/${slug || book?.slug || 'livre'}/read`,
    type: 'article'
  });

  if (isLoading) {
    return (
      <div className="ebook-detail-page ebook-reader-page">
        <section className="ebook-detail-shell ebook-detail-state">
          <p className="ebook-detail-kicker">Lecteur JC Hub</p>
          <h1>Chargement du lecteur...</h1>
        </section>
      </div>
    );
  }

  if (!book || !readerUrl) {
    return (
      <div className="ebook-detail-page ebook-reader-page">
        <section className="ebook-detail-shell ebook-detail-state">
          <p className="ebook-detail-kicker">Lecteur indisponible</p>
          <h1>Impossible de lire ce livre directement ici.</h1>
          {feedback && <p>{feedback}</p>}
          <Link className="ebook-detail-link" to={`/ebooks/${category || 'general'}/${slug || ''}`}>
            Retour aux détails
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="ebook-detail-page ebook-reader-page">
      <section className="ebook-reader-shell">
        <header className="ebook-reader-topbar">
          <div>
            <p className="ebook-detail-kicker">Lecteur JC Hub</p>
            <h1>{book.title}</h1>
            <span>{book.author || book.sourceLabel || 'Source officielle'}</span>
          </div>
          <nav>
            <Link to={book.detailPath || `/ebooks/${category}/${slug}`}>
              <i className="fas fa-arrow-left"></i>
              Détails
            </Link>
            {officialUrl && (
              <a href={officialUrl} target="_blank" rel="noopener noreferrer">
                Source officielle
                <i className="fas fa-arrow-up-right-from-square"></i>
              </a>
            )}
          </nav>
        </header>

        <div className="ebook-reader-frame-wrap">
          {!frameLoaded && (
            <div className="ebook-reader-loading">
              <i className="fas fa-circle-notch fa-spin"></i>
              Ouverture du lecteur...
            </div>
          )}
          <iframe
            title={`Lecture de ${book.title}`}
            src={readerUrl}
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen"
            onLoad={() => setFrameLoaded(true)}
          />
        </div>

        <p className="ebook-reader-note">
          Le livre reste servi par sa source officielle ou par JC Hub lorsqu’il est hébergé légalement. Si le lecteur
          externe bloque l’affichage intégré, utilise le bouton Source officielle.
        </p>
      </section>
    </div>
  );
}
