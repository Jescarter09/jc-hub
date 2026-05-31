import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';
import { CONTENT_CATEGORIES } from '../data/categoriesCatalog';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import { usePageSeo } from '../hooks/usePageSeo';
import { subscribeBlogMetricsMap } from '../services/blogInteractionsService';
import blogHeaderImage from '../assets/blog.webp';
import '../styles/Blog.css';

const AUTHOR_AVATAR = '/carter.webp';

const TOPIC_FILTERS = [
  { key: 'all', label: 'Tous', category: 'Tous' },
  { key: 'tech', label: 'Technologies', term: 'technologie' },
  { key: 'dev', label: 'Développement Web', category: 'Tutoriels' },
  { key: 'security', label: 'Cybersécurité', category: 'Securite' },
  { key: 'ai', label: 'IA', term: 'ia' },
  { key: 'design', label: 'Design & UX', term: 'design' },
  { key: 'marketing', label: 'Marketing', term: 'marketing' }
];

const DEFAULT_KEYWORDS = ['IA', 'Web', 'Sécurité', 'Python', 'JavaScript', 'SEO', 'UX', 'DevOps', 'Cloud', 'Données'];

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
  const safeViews = Math.max(0, Number(views) || 0);
  if (safeViews >= 1000) {
    return `${(safeViews / 1000).toFixed(1)}K`;
  }
  return `${safeViews}`;
};

const getCategoryLabel = (category) => {
  const normalized = normalizeSearchText(category);
  const labels = {
    tous: 'Tous',
    tutoriels: 'Développement Web',
    securite: 'Cybersécurité',
    actualites: 'Culture Numérique',
    outils: 'Technologies',
    windows: 'Windows',
    technologie: 'Technologies'
  };

  return labels[normalized] || category;
};

const getAuthorName = (author) => {
  const name = String(author || '').trim();
  if (!name) return 'JC Hub';
  if (/^[a-z0-9_-]{18,}$/i.test(name)) return 'JC Hub';
  return name;
};

const getBlogSearchText = (blog) =>
  normalizeSearchText(
    [
      blog.title,
      blog.excerpt,
      blog.author,
      blog.category,
      ...(Array.isArray(blog.tags) ? blog.tags : [])
    ].join(' ')
  );

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
    const nextCategory = category || 'Tous';
    setSelectedCategory(nextCategory);
    setSearchTerm('');
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      if (nextCategory === 'Tous') {
        nextParams.delete('category');
      } else {
        nextParams.set('category', nextCategory);
      }
      return nextParams;
    }, { replace: true });
  };

  const handleTopicSelect = (filter) => {
    if (filter.category) {
      handleCategorySelect(filter.category);
    } else {
      handleCategorySelect('Tous');
      setSearchTerm(filter.term || '');
    }
    scrollToArticles();
  };

  const filteredBlogs = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    return blogPosts.filter((blog) => {
      const matchesCategory = selectedCategory === 'Tous' || blog.category === selectedCategory;
      const matchesSearch = normalizedSearch.length === 0 || getBlogSearchText(blog).includes(normalizedSearch);
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

  const resolveReadingMinutes = (article) => {
    const metric = metricsBySlug[article.slug];
    if (metric && Number.isFinite(metric.avgReadSeconds) && metric.avgReadSeconds > 0) {
      return Math.max(1, Math.round(metric.avgReadSeconds / 60));
    }
    return Math.max(1, Math.round(Number(article.readMinutes) || 1));
  };

  const sortedBlogs = useMemo(() => {
    const clone = [...filteredBlogs];
    if (sortBy === 'popular') {
      return clone.sort((a, b) => resolveViews(b) - resolveViews(a));
    }
    if (sortBy === 'reading') {
      return clone.sort((a, b) => resolveReadingMinutes(a) - resolveReadingMinutes(b));
    }
    return clone.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [filteredBlogs, metricsBySlug, sortBy]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(sortedBlogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedArticles = sortedBlogs.slice(pageStart, pageStart + pageSize);
  const rangeStart = sortedBlogs.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = sortedBlogs.length === 0 ? 0 : pageStart + paginatedArticles.length;

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

  const popularArticles = useMemo(
    () => [...blogPosts].sort((a, b) => resolveViews(b) - resolveViews(a)).slice(0, 5),
    [metricsBySlug]
  );

  const tagChips = useMemo(() => {
    const dataTags = blogPosts.flatMap((blog) => (Array.isArray(blog.tags) ? blog.tags : []));
    return [...new Set([...DEFAULT_KEYWORDS, ...dataTags].map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12);
  }, []);

  const sidebarCategories = useMemo(
    () =>
      categories
        .filter((category) => category !== 'Tous')
        .slice(0, 7)
        .map((category) => ({
          category,
          label: getCategoryLabel(category),
          count: categoryCounts[category] || 0
        })),
    [categories, categoryCounts]
  );

  const activeTopicKey = useMemo(() => {
    const normalizedTerm = normalizeSearchText(searchTerm);
    const match = TOPIC_FILTERS.find((filter) => {
      if (filter.category) return selectedCategory === filter.category && normalizedTerm.length === 0;
      return selectedCategory === 'Tous' && normalizedTerm === normalizeSearchText(filter.term);
    });
    return match?.key || '';
  }, [searchTerm, selectedCategory]);

  const newsletterFeedbackClassName =
    newsletter.feedback.kind === 'error'
      ? 'blog-soft-newsletter-feedback blog-soft-newsletter-feedback-error'
      : newsletter.feedback.kind === 'info'
        ? 'blog-soft-newsletter-feedback blog-soft-newsletter-feedback-info'
        : 'blog-soft-newsletter-feedback blog-soft-newsletter-feedback-success';

  const heroArticle = sortedBlogs[0] || blogPosts[0] || null;
  const hasActiveFilters = selectedCategory !== 'Tous' || searchTerm.trim().length > 0;

  const resetFilters = () => {
    handleCategorySelect('Tous');
    setSearchTerm('');
  };

  const applyKeyword = (keyword) => {
    handleCategorySelect('Tous');
    setSearchTerm(keyword);
    scrollToArticles();
  };

  usePageSeo({
    title: 'Blog',
    description:
      'Articles, conseils et ressources JC Hub pour comprendre et maîtriser le monde numérique.',
    image: heroArticle?.image || blogHeaderImage,
    path: '/blog'
  });

  return (
    <div className="blog-soft">
      <section className="blog-soft-section blog-soft-hero" aria-labelledby="blog-title">
        <div className="blog-soft-hero-copy">
          <h1 id="blog-title">Blog</h1>
          <p>
            Des articles, des conseils et des ressources pour comprendre et maîtriser le monde numérique.
          </p>

          <div className="blog-soft-hero-stats" aria-label="Statistiques du blog JC Hub">
            <span>
              <i className="far fa-file-lines"></i>
              <strong>{blogPosts.length}+</strong>
              <small>Articles publiés</small>
            </span>
            <span>
              <i className="fas fa-border-all"></i>
              <strong>{CONTENT_CATEGORIES.length}+</strong>
              <small>Catégories</small>
            </span>
            <span>
              <i className="far fa-clock"></i>
              <strong>Mises à jour</strong>
              <small>Chaque semaine</small>
            </span>
          </div>
        </div>

        <div className="blog-soft-hero-visual">
          <img
            src={blogHeaderImage}
            alt="JC Hub - illustration de la page blog"
            fetchPriority="high"
            decoding="async"
            onError={(event) => {
              event.currentTarget.src = '/jchub_monogram.png';
            }}
          />
          <span className="blog-soft-floating-icon blog-soft-floating-icon-chat">
            <i className="fas fa-comment-dots"></i>
          </span>
          <span className="blog-soft-floating-icon blog-soft-floating-icon-code">
            <i className="fas fa-code"></i>
          </span>
        </div>
      </section>

      <section className="blog-soft-section blog-soft-main-layout">
        <main className="blog-soft-content">
          <div className="blog-soft-toolbar" id="blog-soft-articles">
            <div>
              <h2>Tous les articles</h2>
              <div className="blog-soft-topic-filters" aria-label="Filtres rapides du blog">
                {TOPIC_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`blog-soft-topic ${activeTopicKey === filter.key ? 'blog-soft-topic-active' : ''}`}
                    onClick={() => handleTopicSelect(filter)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="blog-soft-sort-pill">
              <span>Trier par</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recent">Plus récents</option>
                <option value="popular">Plus populaires</option>
                <option value="reading">Lecture rapide</option>
              </select>
              <i className="fas fa-chevron-down"></i>
            </label>
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
              <button type="button" className="blog-soft-reset-filter" onClick={resetFilters}>
                Réinitialiser
              </button>
            </div>
          )}

          {paginatedArticles.length > 0 ? (
            <div className="blog-soft-article-list">
              {paginatedArticles.map((article) => (
                <article key={article.slug} className="blog-soft-article-row">
                  <Link to={`/blog/${article.slug}`} className="blog-soft-article-image">
                    <img
                      src={article.image}
                      alt={`JC Hub - ${article.title}`}
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.src = '/jchub_monogram.png';
                      }}
                    />
                  </Link>

                  <div className="blog-soft-article-body">
                    <span className="blog-soft-badge">{getCategoryLabel(article.category)}</span>
                    <Link to={`/blog/${article.slug}`}>
                      <h3>{article.title}</h3>
                    </Link>
                    <p>{article.excerpt}</p>

                    <div className="blog-soft-article-meta">
                      <span className="blog-soft-author">
                        <img
                          src={AUTHOR_AVATAR}
                          alt={`JC Hub - avatar de ${getAuthorName(article.author)}`}
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            event.currentTarget.src = '/jchub_monogram.png';
                          }}
                        />
                        {getAuthorName(article.author)}
                      </span>
                      <span>{article.dateLabel}</span>
                      <span>{resolveReadingMinutes(article)} min de lecture</span>
                    </div>
                  </div>

                  <Link to={`/blog/${article.slug}`} className="blog-soft-bookmark" aria-label={`Lire ${article.title}`}>
                    <i className="far fa-bookmark"></i>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="blog-soft-empty">
              <h3>Aucun article trouvé.</h3>
              <p>Essaie une autre recherche ou retire certains filtres.</p>
              <button type="button" onClick={resetFilters}>
                Revenir à tous les articles
              </button>
            </div>
          )}

          {sortedBlogs.length > pageSize && (
            <div className="blog-soft-pagination" aria-label="Pagination blog">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                <i className="fas fa-chevron-left"></i>
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
                <i className="fas fa-chevron-right"></i>
              </button>

              <p>
                {rangeStart}-{rangeEnd} / {sortedBlogs.length}
              </p>
            </div>
          )}
        </main>

        <aside className="blog-soft-sidebar">
          <section className="blog-soft-side-card">
            <h3>Rechercher un article</h3>
            <form
              className="blog-soft-sidebar-search"
              onSubmit={(event) => {
                event.preventDefault();
                scrollToArticles();
              }}
            >
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(event) => {
                  handleCategorySelect('Tous');
                  setSearchTerm(event.target.value);
                }}
              />
              <button type="submit" aria-label="Rechercher un article">
                <i className="fas fa-search"></i>
              </button>
            </form>
          </section>

          <section className="blog-soft-side-card">
            <h3>Catégories</h3>
            <div className="blog-soft-category-list">
              {sidebarCategories.map((item) => (
                <button
                  key={item.category}
                  type="button"
                  className={selectedCategory === item.category ? 'blog-soft-category-active' : ''}
                  onClick={() => {
                    handleCategorySelect(item.category);
                    scrollToArticles();
                  }}
                >
                  <span>
                    <i className="far fa-circle-dot"></i>
                    {item.label}
                  </span>
                  <small>{item.count}</small>
                </button>
              ))}
            </div>
            <button type="button" className="blog-soft-side-link" onClick={resetFilters}>
              Voir toutes les catégories <i className="fas fa-arrow-right"></i>
            </button>
          </section>

          <section className="blog-soft-side-card">
            <h3>Articles populaires</h3>
            <div className="blog-soft-popular-list">
              {popularArticles.map((article) => (
                <Link key={article.slug} to={`/blog/${article.slug}`} className="blog-soft-popular-item">
                  <img
                    src={article.image}
                    alt={`JC Hub - ${article.title}`}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = '/jchub_monogram.png';
                    }}
                  />
                  <span>
                    <strong>{article.title}</strong>
                    <small>{resolveReadingMinutes(article)} min de lecture</small>
                  </span>
                </Link>
              ))}
            </div>
            <Link to="/blog" className="blog-soft-side-link">
              Voir tous les articles populaires <i className="fas fa-arrow-right"></i>
            </Link>
          </section>

          <section className="blog-soft-side-card blog-soft-newsletter" id="newsletter">
            <i className="far fa-envelope"></i>
            <div>
              <h3>Restez à jour</h3>
              <p>Recevez nos derniers articles directement dans votre boîte mail.</p>
            </div>
            <form onSubmit={newsletter.handleSubmit} className="blog-soft-form">
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

          <section className="blog-soft-side-card">
            <h3>Mots-clés populaires</h3>
            <div className="blog-soft-keywords">
              {tagChips.map((tag) => (
                <button key={tag} type="button" onClick={() => applyKeyword(tag)}>
                  {tag}
                </button>
              ))}
            </div>
            <button type="button" className="blog-soft-side-link" onClick={() => applyKeyword('')}>
              Voir tous les mots-clés <i className="fas fa-arrow-right"></i>
            </button>
          </section>
        </aside>
      </section>
    </div>
  );
}
