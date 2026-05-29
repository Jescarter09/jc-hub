import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import { usePageSeo } from '../hooks/usePageSeo';
import { subscribeBlogMetricsMap } from '../services/blogInteractionsService';
import blogHeaderImage from '../assets/blog.webp';
import '../styles/Blog.css';

const AUTHOR_AVATAR = '/carter.webp';

const normalizeSearchText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatViews = (views) => {
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return `${views}`;
};

const formatDurationFromSeconds = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

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

const scrollToArticles = () => {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    document.getElementById('blog-soft-articles')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
};

export default function Blog() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef(null);
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category')?.trim() || 'Tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const [shouldFocusSearch, setShouldFocusSearch] = useState(Boolean(location.state?.focusSearch));
  const newsletter = useNewsletterForm({ source: 'blog-sidebar' });
  const articleSlugs = useMemo(() => blogPosts.map((post) => post.slug).filter(Boolean), []);
  const tagChips = useMemo(() => {
    const counts = blogPosts.reduce((acc, blog) => {
      for (const rawTag of Array.isArray(blog.tags) ? blog.tags : []) {
        const tag = String(rawTag || '').trim();
        if (!tag) continue;
        acc.set(tag, (acc.get(tag) || 0) + 1);
      }
      return acc;
    }, new Map());

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
      .slice(0, 10)
      .map(([tag]) => tag);
  }, []);

  useEffect(() => {
    if (location.state?.focusSearch) {
      setShouldFocusSearch(true);
    }
  }, [location.state]);

  useEffect(() => {
    if (!shouldFocusSearch) return;

    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
      setShouldFocusSearch(false);
    }
  }, [shouldFocusSearch]);

  useEffect(() => {
    const handleFocusSearch = () => {
      setShouldFocusSearch(true);
    };

    window.addEventListener('jchub:focus-blog-search', handleFocusSearch);
    return () => {
      window.removeEventListener('jchub:focus-blog-search', handleFocusSearch);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBlogMetricsMap(articleSlugs, (nextMap) => {
      setMetricsBySlug(nextMap);
    });
    return () => unsubscribe();
  }, [articleSlugs]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchTerm, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts = blogPosts.reduce((acc, blog) => {
      acc[blog.category] = (acc[blog.category] || 0) + 1;
      return acc;
    }, {});
    return {
      Tous: blogPosts.length,
      ...counts
    };
  }, []);

  const categories = useMemo(() => Object.keys(categoryCounts), [categoryCounts]);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category')?.trim() || 'Tous';
    const isValidCategory = categoryFromUrl === 'Tous' || categories.includes(categoryFromUrl);
    const nextCategory = isValidCategory ? categoryFromUrl : 'Tous';

    setSelectedCategory((current) => (current === nextCategory ? current : nextCategory));

    if (!isValidCategory) {
      setSearchParams((current) => {
        const nextParams = new URLSearchParams(current);
        nextParams.delete('category');
        return nextParams;
      }, { replace: true });
    }
  }, [categories, searchParams, setSearchParams]);

  const handleCategorySelect = (category) => {
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      if (category === 'Tous') {
        nextParams.delete('category');
      } else {
        nextParams.set('category', category);
      }
      return nextParams;
    }, { replace: true });
  };

  const applyQuickPath = ({ category = 'Tous', term = '' }) => {
    handleCategorySelect(category);
    setSearchTerm(term);
    scrollToArticles();
  };

  const filteredBlogs = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    return blogPosts.filter((blog) => {
      const matchesCategory = selectedCategory === 'Tous' || blog.category === selectedCategory;
      const title = normalizeSearchText(blog.title);
      const excerpt = normalizeSearchText(blog.excerpt);
      const author = normalizeSearchText(blog.author);
      const category = normalizeSearchText(blog.category);
      const tags = blog.tags.map((tag) => normalizeSearchText(tag));
      const matchesSearch =
        normalizedSearch.length === 0 ||
        title.includes(normalizedSearch) ||
        excerpt.includes(normalizedSearch) ||
        author.includes(normalizedSearch) ||
        category.includes(normalizedSearch) ||
        tags.some((tag) => tag.includes(normalizedSearch));
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const resolveViews = (article) => {
    const metric = metricsBySlug[article.slug];
    const baselineViews = Number(article.views) || 0;
    if (metric && Number.isFinite(metric.viewsCount)) {
      return Math.max(baselineViews, metric.viewsCount);
    }
    return baselineViews;
  };

  const resolveReadingSeconds = (article) => {
    const metric = metricsBySlug[article.slug];
    if (metric && Number.isFinite(metric.avgReadSeconds) && metric.avgReadSeconds > 0) {
      return metric.avgReadSeconds;
    }
    return Math.max(0, Math.round((Number(article.readMinutes) || 0) * 60));
  };

  const resolveReadingLabel = (article) => {
    const metric = metricsBySlug[article.slug];
    if (metric && Number.isFinite(metric.avgReadSeconds) && metric.avgReadSeconds > 0) {
      return formatDurationFromSeconds(metric.avgReadSeconds);
    }
    return `${article.readMinutes} min`;
  };

  const sortedBlogs = useMemo(() => {
    const clone = [...filteredBlogs];
    if (sortBy === 'popular') {
      return clone.sort((a, b) => resolveViews(b) - resolveViews(a));
    }
    if (sortBy === 'reading') {
      return clone.sort((a, b) => resolveReadingSeconds(a) - resolveReadingSeconds(b));
    }
    return clone.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [filteredBlogs, metricsBySlug, sortBy]);

  const featuredArticle = sortedBlogs[0] || null;
  const listArticles = sortedBlogs.slice(1);

  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(listArticles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedArticles = listArticles.slice(pageStart, pageStart + pageSize);
  const rangeStart = listArticles.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = listArticles.length === 0 ? 0 : pageStart + paginatedArticles.length;

  const pageNumbers = useMemo(() => {
    const numbers = [];
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    for (let i = start; i <= end; i += 1) {
      numbers.push(i);
    }
    if (numbers[0] !== 1) {
      numbers.unshift(1);
    }
    if (numbers[numbers.length - 1] !== totalPages) {
      numbers.push(totalPages);
    }
    return [...new Set(numbers)];
  }, [currentPage, totalPages]);

  const newsletterFeedbackClassName =
    newsletter.feedback.kind === 'error'
      ? 'blog-soft-newsletter-feedback blog-soft-newsletter-feedback-error'
      : newsletter.feedback.kind === 'info'
        ? 'blog-soft-newsletter-feedback blog-soft-newsletter-feedback-info'
        : 'blog-soft-newsletter-feedback blog-soft-newsletter-feedback-success';

  const tutorielCategory = categories.find((category) => normalizeSearchText(category).includes('tutoriel')) || 'Tous';
  const securityCategory = categories.find((category) => normalizeSearchText(category).includes('securite')) || 'Tous';
  const projectCategory = categories.find((category) => normalizeSearchText(category).includes('outil')) || tutorielCategory;
  const hasActiveFilters = selectedCategory !== 'Tous' || searchTerm.trim().length > 0;

  usePageSeo({
    title: 'Articles et guides pratiques',
    description:
      'Explore les articles JC Hub: guides simples, tutoriels, sécurité, ordinateur, bureautique et projets numériques pour progresser sans jargon.',
    image: featuredArticle?.image || blogHeaderImage,
    path: '/blog'
  });

  return (
    <div className="blog-soft">
      <section className="blog-soft-section blog-soft-hero">
        <div className="blog-soft-hero-grid">
          <div className="blog-soft-hero-copy">
            <p className="blog-soft-kicker">Bibliothèque JC Hub</p>
            <h1>
              Trouver le bon article, <span>sans perdre du temps.</span>
            </h1>
            <p className="blog-soft-hero-text">
              Une page blog plus calme et plus claire: recherche visible, catégories simples,
              articles mieux hiérarchisés et parcours de lecture pour apprendre progressivement.
            </p>

            <div className="blog-soft-hero-actions">
              <button type="button" className="blog-soft-button blog-soft-button-primary" onClick={scrollToArticles}>
                Voir les articles
              </button>
              <button
                type="button"
                className="blog-soft-button blog-soft-button-secondary"
                onClick={() => {
                  document.getElementById('blog-soft-parcours')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Explorer par besoin
              </button>
            </div>
          </div>

          <article className="blog-soft-hero-card">
            <img
              src={featuredArticle?.image || blogHeaderImage}
              alt={featuredArticle?.title || 'Illustration JC Hub'}
              fetchPriority="high"
              decoding="async"
              onError={(event) => {
                event.currentTarget.src = '/jchub_monogram.png';
              }}
            />
            <div className="blog-soft-hero-card-content">
              <p className="blog-soft-kicker">Article de la semaine</p>
              <h2>{featuredArticle?.title || 'Les meilleurs articles JC Hub'}</h2>
              <p>{featuredArticle?.excerpt || 'Une sélection douce pour commencer la lecture au bon endroit.'}</p>
            </div>
          </article>
        </div>

        <div className="blog-soft-search-panel" id="categories">
          <div className="blog-soft-search-row">
            <label className="blog-soft-search-box">
              <i className="fas fa-search" aria-hidden="true"></i>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Rechercher: ordinateur, Excel, Internet, sécurité..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              {searchTerm.trim().length > 0 && (
                <button type="button" onClick={() => setSearchTerm('')} aria-label="Effacer la recherche">
                  <i className="fas fa-xmark"></i>
                </button>
              )}
            </label>

            <label className="blog-soft-sort-pill">
              <span>Tri</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recent">Plus récents</option>
                <option value="popular">Plus populaires</option>
                <option value="reading">Lecture rapide</option>
              </select>
            </label>
          </div>

          <div className="blog-soft-chips" aria-label="Catégories">
            {categories.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className={`blog-soft-chip ${active ? 'blog-soft-chip-active' : ''}`}
                >
                  {getCategoryLabel(category)}
                  <span>{categoryCounts[category]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="blog-soft-section blog-soft-main-layout">
        <div className="blog-soft-content">
          <div className="blog-soft-section-head">
            <div>
              <p className="blog-soft-kicker">Articles récents</p>
              <h2 id="blog-soft-articles">La sélection du moment.</h2>
            </div>
            <p>
              {filteredBlogs.length} article{filteredBlogs.length > 1 ? 's' : ''} trouvé
              {filteredBlogs.length > 1 ? 's' : ''}, dans une grille plus respirante.
            </p>
          </div>

          {hasActiveFilters && (
            <div className="blog-soft-active-filters">
              <span>Filtres actifs</span>
              {selectedCategory !== 'Tous' && (
                <button type="button" onClick={() => handleCategorySelect('Tous')}>
                  {getCategoryLabel(selectedCategory)}
                  <i className="fas fa-xmark"></i>
                </button>
              )}
              {searchTerm.trim().length > 0 && (
                <button type="button" onClick={() => setSearchTerm('')}>
                  {searchTerm}
                  <i className="fas fa-xmark"></i>
                </button>
              )}
              <button
                type="button"
                className="blog-soft-reset-filter"
                onClick={() => {
                  handleCategorySelect('Tous');
                  setSearchTerm('');
                }}
              >
                Réinitialiser
              </button>
            </div>
          )}

          {!featuredArticle ? (
            <div className="blog-soft-empty">
              <h3>Aucun article trouvé.</h3>
              <p>Essaie une autre recherche ou retire certains filtres.</p>
              <button
                type="button"
                onClick={() => {
                  handleCategorySelect('Tous');
                  setSearchTerm('');
                }}
              >
                Revenir à tous les articles
              </button>
            </div>
          ) : (
            <>
              <article className="blog-soft-featured">
                <Link to={`/blog/${featuredArticle.slug}`} className="blog-soft-featured-image">
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = '/jchub_monogram.png';
                    }}
                  />
                </Link>
                <div className="blog-soft-featured-body">
                  <div className="blog-soft-meta">
                    <span className="blog-soft-badge">À la une</span>
                    <span>{getCategoryLabel(featuredArticle.category)} · {featuredArticle.dateLabel}</span>
                  </div>
                  <Link to={`/blog/${featuredArticle.slug}`}>
                    <h3>{featuredArticle.title}</h3>
                  </Link>
                  <p>{featuredArticle.excerpt}</p>

                  <div className="blog-soft-featured-footer">
                    <div className="blog-soft-author">
                      <img
                        src={AUTHOR_AVATAR}
                        alt={featuredArticle.author}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = '/jchub_monogram.png';
                        }}
                      />
                      <span>{featuredArticle.author}</span>
                    </div>
                    <div>
                      <span>{resolveReadingLabel(featuredArticle)}</span>
                      <span>{formatViews(resolveViews(featuredArticle))} vues</span>
                    </div>
                  </div>

                  <Link to={`/blog/${featuredArticle.slug}`} className="blog-soft-read-link">
                    Lire l'article
                  </Link>
                </div>
              </article>

              {paginatedArticles.length > 0 ? (
                <div className="blog-soft-articles-grid">
                  {paginatedArticles.map((article) => (
                    <article key={article.slug} className="blog-soft-article-card">
                      <Link to={`/blog/${article.slug}`} className="blog-soft-article-image">
                        <img
                          src={article.image}
                          alt={article.title}
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            event.currentTarget.src = '/jchub_monogram.png';
                          }}
                        />
                      </Link>

                      <div className="blog-soft-article-body">
                        <div className="blog-soft-meta">
                          <span className="blog-soft-badge">{getCategoryLabel(article.category)}</span>
                          <span>{resolveReadingLabel(article)}</span>
                        </div>

                        <Link to={`/blog/${article.slug}`}>
                          <h3>{article.title}</h3>
                        </Link>
                        <p>{article.excerpt}</p>

                        <div className="blog-soft-article-footer">
                          <span>{article.dateLabel}</span>
                          <span>
                            <i className="far fa-eye"></i> {formatViews(resolveViews(article))}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="blog-soft-empty blog-soft-empty-small">
                  <h3>Un seul article dans cette sélection.</h3>
                  <p>Change de catégorie ou enlève la recherche pour voir plus de cartes.</p>
                </div>
              )}

              {listArticles.length > 0 && (
                <div className="blog-soft-pagination" aria-label="Pagination blog">
                  <p>
                    Affichage de {rangeStart}-{rangeEnd} sur {listArticles.length} article
                    {listArticles.length > 1 ? 's' : ''}
                  </p>

                  <div className="blog-soft-page-controls">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      <i className="fas fa-arrow-left"></i>
                      <span>Précédent</span>
                    </button>

                    <div className="blog-soft-page-buttons">
                      {pageNumbers.map((pageNumber, index) => {
                        const showEllipsis = index > 0 && pageNumber - pageNumbers[index - 1] > 1;
                        return (
                          <span key={pageNumber} className="blog-soft-page-number-wrap">
                            {showEllipsis && <span className="blog-soft-page-ellipsis">...</span>}
                            <button
                              type="button"
                              onClick={() => setPage(pageNumber)}
                              className={currentPage === pageNumber ? 'blog-soft-page-active' : ''}
                            >
                              {pageNumber}
                            </button>
                          </span>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      <span>Suivant</span>
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="blog-soft-sidebar">
          <div className="blog-soft-side-card" id="blog-soft-parcours">
            <p className="blog-soft-kicker">Parcours</p>
            <h3>Commencer par quoi ?</h3>
            <p>Des chemins de lecture pour ne pas se sentir perdu dans la liste d'articles.</p>

            <div className="blog-soft-path-list">
              <button type="button" onClick={() => applyQuickPath({ category: 'Tous', term: 'debutant' })}>
                <strong>Je débute</strong>
                <span>Internet, vocabulaire simple, premiers repères.</span>
              </button>
              <button type="button" onClick={() => applyQuickPath({ category: securityCategory, term: '' })}>
                <strong>Je sécurise mon PC</strong>
                <span>Sécurité, nettoyage, lenteurs et sauvegardes.</span>
              </button>
              <button type="button" onClick={() => applyQuickPath({ category: projectCategory, term: 'projet' })}>
                <strong>Je veux publier</strong>
                <span>Créer une page, organiser un projet, le mettre en ligne.</span>
              </button>
            </div>
          </div>

          <div className="blog-soft-side-card">
            <p className="blog-soft-kicker">Tags utiles</p>
            <h3>Recherches rapides</h3>
            <div className="blog-soft-chips blog-soft-tag-chips">
              {tagChips.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="blog-soft-chip"
                  onClick={() => {
                    setSearchTerm(tag);
                    scrollToArticles();
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="blog-soft-side-card blog-soft-newsletter" id="newsletter">
            <p className="blog-soft-kicker">Newsletter</p>
            <h3>Recevoir les prochains guides</h3>
            <p>Un petit rendez-vous pour apprendre sans bruit, avec les meilleurs articles JC Hub.</p>
            <form onSubmit={newsletter.handleSubmit} className="blog-soft-form">
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
              {newsletter.feedback.text && (
                <p className={newsletterFeedbackClassName}>{newsletter.feedback.text}</p>
              )}
            </form>
          </div>
        </aside>
      </section>
    </div>
  );
}
