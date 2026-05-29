import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/Search.css';

const normalizeSearchText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getCategoryLabel = (category) => {
  const normalized = normalizeSearchText(category);
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

const getSearchText = (post) =>
  normalizeSearchText(
    [
      post.title,
      post.excerpt,
      post.author,
      post.category,
      ...(post.tags || []),
      ...(post.sections || []).flatMap((section) => [
        section.title,
        ...(section.paragraphs || [])
      ])
    ].join(' ')
  );

const scorePost = (post, tokens) => {
  const title = normalizeSearchText(post.title);
  const excerpt = normalizeSearchText(post.excerpt);
  const category = normalizeSearchText(post.category);
  const tags = normalizeSearchText((post.tags || []).join(' '));
  const fullText = getSearchText(post);

  return tokens.reduce((score, token) => {
    if (!token) return score;
    if (title.includes(token)) return score + 8;
    if (category.includes(token) || tags.includes(token)) return score + 5;
    if (excerpt.includes(token)) return score + 3;
    if (fullText.includes(token)) return score + 1;
    return score;
  }, 0);
};

const quickSearches = ['internet', 'sécurité', 'ordinateur', 'windows', 'excel', 'débutant'];

export default function Search() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);

  const categories = useMemo(() => {
    const values = [...new Set(blogPosts.map((post) => post.category).filter(Boolean))];
    return values.slice(0, 7);
  }, []);

  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  const results = useMemo(() => {
    const sortedPosts = [...blogPosts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (tokens.length === 0) {
      return sortedPosts.slice(0, 8).map((post) => ({ post, score: 0 }));
    }

    return sortedPosts
      .map((post) => ({ post, score: scorePost(post, tokens) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.post.publishedAt) - new Date(a.post.publishedAt));
  }, [tokens]);
  const primaryResult = results[0]?.post || null;
  const secondaryResults = results.slice(1).map((item) => item.post);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

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
        nextParams.set('q', cleanQuery);
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
    updateQueryParam('');
    inputRef.current?.focus();
  };

  usePageSeo({
    title: normalizedQuery ? `Recherche: ${query.trim()}` : 'Recherche',
    description:
      'Recherche les guides JC Hub par sujet: sécurité, ordinateur, Internet, Windows, Excel, tutoriels et numérique.',
    image: primaryResult?.image || '/android-chrome-512x512.png',
    path: normalizedQuery ? `/search?q=${encodeURIComponent(query.trim())}` : '/search'
  });

  return (
    <div className="search-soft">
      <section className="search-soft-section search-soft-hero">
        <div className="search-soft-hero-panel">
          <p className="search-soft-kicker">Recherche JC Hub</p>
          <h1>
            Chercher un article, <span>sans quitter le parcours.</span>
          </h1>
          <p>
            La recherche du menu arrive ici: un espace dédié pour retrouver un guide,
            une catégorie ou un sujet précis sans passer par la page Blog.
          </p>

          <div className="search-soft-search-box">
            <label htmlFor="search-query">Tape ta recherche ici</label>
            <form className="search-soft-form" onSubmit={handleSubmit}>
              <span className="search-soft-search-icon" aria-hidden="true">
                <i className="fas fa-magnifying-glass"></i>
              </span>
              <input
                id="search-query"
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex: sécurité, Excel, Internet, ordinateur..."
                aria-label="Rechercher dans JC Hub"
              />
              {query.trim() && (
                <button type="button" className="search-soft-clear" onClick={clearSearch}>
                  Effacer
                </button>
              )}
              <button type="submit">Rechercher</button>
            </form>
          </div>

          <div className="search-soft-quick" aria-label="Recherches rapides">
            {quickSearches.map((item) => (
              <button key={item} type="button" onClick={() => handleQuickSearch(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="search-soft-section search-soft-results-wrap">
        <div className="search-soft-results-head">
          <div>
            <p className="search-soft-kicker">Résultats</p>
            <h2>{results.length} résultat{results.length > 1 ? 's' : ''}</h2>
          </div>
          <p>
            {normalizedQuery
              ? `Résultats pour "${query.trim()}".`
              : 'Les derniers articles sont affichés tant que la recherche est vide.'}
          </p>
        </div>

        <div className="search-soft-topic-strip" aria-label="Catégories rapides">
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => handleQuickSearch(category)}>
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <div className="search-soft-empty">
            <h2>Aucun résultat trouvé.</h2>
            <p>Essaie un mot plus simple: ordinateur, internet, sécurité, windows ou guide.</p>
            <button type="button" onClick={clearSearch}>Réinitialiser la recherche</button>
          </div>
        ) : (
          <>
            {primaryResult && (
              <article className="search-soft-feature-result">
                <div className="search-soft-feature-body">
                  <div className="search-soft-meta">
                    <span>Meilleur résultat</span>
                    <span>{getCategoryLabel(primaryResult.category)}</span>
                    <span>{primaryResult.readMinutes} min</span>
                  </div>
                  <Link to={`/blog/${primaryResult.slug}`}>
                    <h2>{primaryResult.title}</h2>
                  </Link>
                  <p>{primaryResult.excerpt}</p>
                  <div className="search-soft-feature-actions">
                    <Link to={`/blog/${primaryResult.slug}`} className="search-soft-read">
                      Lire l'article
                    </Link>
                    <span>{primaryResult.dateLabel}</span>
                  </div>
                </div>

                <Link to={`/blog/${primaryResult.slug}`} className="search-soft-feature-image">
                  <img
                    src={primaryResult.image || '/jchub_monogram.png'}
                    alt={primaryResult.title}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = '/jchub_monogram.png';
                    }}
                  />
                </Link>
              </article>
            )}

            {secondaryResults.length > 0 && (
              <div className="search-soft-results-grid">
                {secondaryResults.map((post) => (
                  <article key={post.slug} className="search-soft-result-card">
                    <Link to={`/blog/${post.slug}`} className="search-soft-result-image">
                      <img
                        src={post.image || '/jchub_monogram.png'}
                        alt={post.title}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = '/jchub_monogram.png';
                        }}
                      />
                    </Link>

                    <div className="search-soft-result-body">
                      <div className="search-soft-meta">
                        <span>{getCategoryLabel(post.category)}</span>
                        <span>{post.readMinutes} min</span>
                      </div>
                      <Link to={`/blog/${post.slug}`}>
                        <h2>{post.title}</h2>
                      </Link>
                      <p>{post.excerpt}</p>
                      <div className="search-soft-card-footer">
                        <span>{post.dateLabel}</span>
                        <Link to={`/blog/${post.slug}`} className="search-soft-read">
                          Lire
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
