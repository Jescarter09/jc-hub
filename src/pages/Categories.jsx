import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import { usePageSeo } from '../hooks/usePageSeo';
import { blogPosts } from '../data/blogPosts';
import { fetchHostedBooks } from '../services/ebookService';
import {
  PLATFORM_CATEGORIES,
  getBookDetailPath,
  normalizeSearchText,
  toSeoSlug
} from '../utils/platformSearch';
import categoriesHeroImage from '../assets/categories-hero.svg';
import '../styles/Categories.css';

const categoryCounts = [120, 96, 58, 76, 42, 48, 52, 64, 38, 44];
const categoryTones = ['purple', 'blue', 'blue', 'green', 'red', 'blue', 'purple', 'orange', 'green', 'orange'];
const CATEGORIES_PAGE_SIZE = 6;
const CATEGORY_CONTENT_PAGE_SIZE = 8;

const categoryCards = PLATFORM_CATEGORIES.map((category, index) => ({
  ...category,
  title: category.name,
  count: categoryCounts[index] || 28,
  tone: categoryTones[index % categoryTones.length] || 'purple',
  search: category.name
}));

const contentFilters = [
  { label: 'Tous', value: 'all' },
  { label: 'Articles', value: 'article' },
  { label: 'Ebooks', value: 'ebook' },
  { label: 'Guides', value: 'guide' },
  { label: 'Tutoriels', value: 'tutorial' }
];

const stats = [
  { icon: 'fas fa-table-cells-large', value: `${PLATFORM_CATEGORIES.length}+`, label: 'Catégories' },
  { icon: 'far fa-file-lines', value: '500+', label: 'Ressources' },
  { icon: 'fas fa-download', value: '15 000+', label: 'Téléchargements' },
  { icon: 'fas fa-stopwatch', value: 'Mises à jour', label: 'Chaque semaine' }
];

const filterGroups = [
  {
    title: 'Type de ressource',
    items: [
      { icon: 'fas fa-book-open', label: 'Ebooks', count: 156 },
      { icon: 'far fa-file-lines', label: 'Guides', count: 132 },
      { icon: 'fas fa-display', label: 'Tutoriels', count: 98 },
      { icon: 'far fa-file', label: 'Livres blancs', count: 64 },
      { icon: 'far fa-circle-play', label: 'Outils & Templates', count: 50 },
      { icon: 'fas fa-video', label: 'Vidéos', count: 38 }
    ]
  },
  {
    title: 'Niveau',
    items: [
      { icon: 'far fa-square', label: 'Débutant', count: 120 },
      { icon: 'far fa-square', label: 'Intermédiaire', count: 190 },
      { icon: 'far fa-square', label: 'Avancé', count: 110 }
    ]
  },
  {
    title: 'Format',
    items: [
      { icon: 'far fa-file-pdf', label: 'PDF', count: 320 },
      { icon: 'fas fa-book', label: 'EPUB', count: 120 },
      { icon: 'fas fa-link', label: 'Outil en ligne', count: 60 },
      { icon: 'far fa-circle-play', label: 'Vidéo', count: 38 }
    ]
  }
];

const trendingTopics = [
  { title: 'IA générative', count: 245, icon: 'fas fa-brain', tone: 'purple' },
  { title: 'Sécurité des données', count: 189, icon: 'fas fa-lock', tone: 'pink' },
  { title: 'React', count: 156, icon: 'fab fa-react', tone: 'blue' },
  { title: 'Python', count: 145, icon: 'fab fa-python', tone: 'orange' },
  { title: 'Cloud AWS', count: 134, icon: 'fas fa-cloud-arrow-up', tone: 'blue' }
];

function getSearchPath(value) {
  return `/search?q=${encodeURIComponent(value)}`;
}

function getCategoryPath(category) {
  return `/categories/${category.slug}`;
}

function getCategoryMatchText(category) {
  return normalizeSearchText([
    category.name,
    category.slug,
    category.description,
    ...(category.keywords || [])
  ].join(' '));
}

function matchesCategory(category, value) {
  const source = normalizeSearchText(value);
  if (!source) return false;

  const categoryWords = getCategoryMatchText(category).split(' ').filter(Boolean);
  return categoryWords.some((word) => word.length > 2 && source.includes(word));
}

function getContentKind(item) {
  const haystack = normalizeSearchText(`${item.title} ${item.description} ${item.category} ${item.format}`);
  if (item.kind === 'article') return 'article';
  if (haystack.includes('tutoriel') || haystack.includes('tutorial')) return 'tutorial';
  if (haystack.includes('guide')) return 'guide';
  return 'ebook';
}

function buildCategoryArticles(category) {
  return blogPosts
    .filter((post) =>
      matchesCategory(category, `${post.title} ${post.excerpt} ${post.category} ${(post.tags || []).join(' ')}`)
    )
    .slice(0, 12)
    .map((post) => ({
      id: `article-${post.slug}`,
      kind: 'article',
      typeLabel: 'Article',
      title: post.title,
      description: post.excerpt,
      category: post.category,
      image: post.image,
      path: `/blog/${post.slug}`,
      meta: `${post.dateLabel} • ${post.readMinutes} min de lecture`
    }));
}

function buildCategoryBooks(category, books) {
  return books
    .filter((book) =>
      matchesCategory(category, `${book.title} ${book.description} ${book.category} ${book.author} ${book.license}`)
    )
    .slice(0, 12)
    .map((book) => {
      const kind = getContentKind({
        title: book.title,
        description: book.description,
        category: book.category,
        format: book.preferredFormat || book.format
      });

      return {
        id: `ebook-${book.id || book.sourceId || book.slug || book.title}`,
        kind,
        typeLabel: kind === 'guide' ? 'Guide' : kind === 'tutorial' ? 'Tutoriel' : 'Ebook',
        title: book.title,
        description: book.description || `Ressource ${category.name} disponible dans la bibliothèque.`,
        category: book.category || category.name,
        image: book.thumbnail,
        path: getBookDetailPath(book),
        meta: `${book.author || 'Auteur inconnu'} • ${book.preferredFormat || 'PDF'}`
      };
    });
}

function getCategoryFallbackItems(category) {
  const slug = category.slug;
  return [
    {
      id: `${slug}-article-1`,
      kind: 'article',
      typeLabel: 'Article',
      title: `Comprendre ${category.name} en 2026`,
      description: category.description,
      category: category.name,
      path: `/search?q=${encodeURIComponent(toSeoSlug(category.name))}`,
      meta: 'Article de découverte'
    },
    {
      id: `${slug}-guide-1`,
      kind: 'guide',
      typeLabel: 'Guide',
      title: `Guide complet : ${category.name}`,
      description: `Une ressource pratique pour progresser en ${category.name}.`,
      category: category.name,
      path: `/search?q=${encodeURIComponent(`${toSeoSlug(category.name)}-guide`)}`,
      meta: 'Guide PDF'
    },
    {
      id: `${slug}-ebook-1`,
      kind: 'ebook',
      typeLabel: 'Ebook',
      title: `${category.name} pour débutants`,
      description: `Les bases, les méthodes et les outils essentiels liés à ${category.name}.`,
      category: category.name,
      path: `/search?q=${encodeURIComponent(`${toSeoSlug(category.name)}-ebook`)}`,
      meta: 'Ebook'
    },
    {
      id: `${slug}-tutorial-1`,
      kind: 'tutorial',
      typeLabel: 'Tutoriel',
      title: `Tutoriel pratique : démarrer avec ${category.name}`,
      description: `Un parcours simple pour appliquer ${category.name} avec des exemples concrets.`,
      category: category.name,
      path: `/search?q=${encodeURIComponent(`${toSeoSlug(category.name)}-tutoriel`)}`,
      meta: 'Tutoriel'
    }
  ];
}

function getPaginationItems(totalPages) {
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}

export default function Categories() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const newsletter = useNewsletterForm({ source: 'categories-page' });
  const categoriesTopRef = useRef(null);
  const categoryContentTopRef = useRef(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularite');
  const [activeFilter, setActiveFilter] = useState('all');
  const [categoryBooks, setCategoryBooks] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [categoryContentPage, setCategoryContentPage] = useState(1);

  const activeCategory = useMemo(
    () => categoryCards.find((category) => category.slug === slug) || null,
    [slug]
  );

  const sortedCategories = useMemo(() => {
    const nextCategories = [...categoryCards];
    if (sortBy === 'az') {
      return nextCategories.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortBy === 'ressources') {
      return nextCategories.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
    }
    return nextCategories.sort((a, b) => b.count - a.count);
  }, [sortBy]);

  const popularCategories = useMemo(
    () => [...categoryCards].sort((a, b) => b.count - a.count).slice(0, 5),
    []
  );

  const totalCategoryPages = Math.max(1, Math.ceil(sortedCategories.length / CATEGORIES_PAGE_SIZE));
  const safeCategoriesPage = Math.min(categoriesPage, totalCategoryPages);
  const paginatedCategories = sortedCategories.slice(
    (safeCategoriesPage - 1) * CATEGORIES_PAGE_SIZE,
    safeCategoriesPage * CATEGORIES_PAGE_SIZE
  );

  const categoryContent = useMemo(() => {
    if (!activeCategory) return [];

    const dynamicItems = [
      ...buildCategoryArticles(activeCategory),
      ...buildCategoryBooks(activeCategory, categoryBooks)
    ];

    const items = dynamicItems.length > 0 ? dynamicItems : getCategoryFallbackItems(activeCategory);

    if (activeFilter === 'all') return items;
    return items.filter((item) => item.kind === activeFilter);
  }, [activeCategory, activeFilter, categoryBooks]);

  const categoryStats = useMemo(() => {
    if (!activeCategory) return null;

    const allItems = [
      ...buildCategoryArticles(activeCategory),
      ...buildCategoryBooks(activeCategory, categoryBooks)
    ];
    const items = allItems.length > 0 ? allItems : getCategoryFallbackItems(activeCategory);

    return {
      articles: Math.max(items.filter((item) => item.kind === 'article').length, Math.round(activeCategory.count * 0.58)),
      ebooks: Math.max(items.filter((item) => item.kind === 'ebook').length, Math.round(activeCategory.count * 0.28)),
      guides: Math.max(items.filter((item) => item.kind === 'guide').length, Math.round(activeCategory.count * 0.09)),
      tutorials: Math.max(items.filter((item) => item.kind === 'tutorial').length, Math.round(activeCategory.count * 0.05))
    };
  }, [activeCategory, categoryBooks]);

  const totalContentPages = Math.max(1, Math.ceil(categoryContent.length / CATEGORY_CONTENT_PAGE_SIZE));
  const safeContentPage = Math.min(categoryContentPage, totalContentPages);
  const paginatedCategoryContent = categoryContent.slice(
    (safeContentPage - 1) * CATEGORY_CONTENT_PAGE_SIZE,
    safeContentPage * CATEGORY_CONTENT_PAGE_SIZE
  );

  useEffect(() => {
    if (!activeCategory) return undefined;

    let isMounted = true;
    setIsLoadingBooks(true);

    fetchHostedBooks({ limit: 50 })
      .then((books) => {
        if (isMounted) setCategoryBooks(books);
      })
      .catch(() => {
        if (isMounted) setCategoryBooks([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBooks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  useEffect(() => {
    setActiveFilter('all');
    setCategoryContentPage(1);
  }, [slug]);

  useEffect(() => {
    setCategoriesPage(1);
  }, [sortBy]);

  useEffect(() => {
    setCategoryContentPage(1);
  }, [activeFilter, activeCategory]);

  const newsletterFeedbackClassName =
    newsletter.feedback.kind === 'error'
      ? 'categories-newsletter-feedback categories-newsletter-feedback-error'
      : newsletter.feedback.kind === 'info'
        ? 'categories-newsletter-feedback categories-newsletter-feedback-info'
        : 'categories-newsletter-feedback categories-newsletter-feedback-success';

  usePageSeo({
    title: activeCategory ? `${activeCategory.name} - Catégories` : 'Catégories',
    description: activeCategory
      ? activeCategory.description
      : 'Explorez les catégories JC Hub : IA, cybersécurité, développement web, design, cloud, data, marketing et productivité.',
    image: categoriesHeroImage,
    path: activeCategory ? `/categories/${activeCategory.slug}` : '/categories'
  });

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    navigate(getSearchPath(cleanQuery));
  };

  const scrollToBlock = (ref) => {
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleCategoriesPageChange = (page) => {
    setCategoriesPage(page);
    scrollToBlock(categoriesTopRef);
  };

  const handleCategoryContentPageChange = (page) => {
    setCategoryContentPage(page);
    scrollToBlock(categoryContentTopRef);
  };

  if (activeCategory) {
    return (
      <div className="categories-page">
        <section className="category-detail-hero" aria-labelledby="category-detail-title">
          <div>
            <Link className="category-detail-back" to="/categories">
              <i className="fas fa-arrow-left"></i>
              Toutes les catégories
            </Link>
            <span className={`categories-icon is-${activeCategory.tone}`}>
              <i className={activeCategory.icon}></i>
            </span>
            <h1 id="category-detail-title">{activeCategory.name}</h1>
            <p>{activeCategory.description}</p>
          </div>

          <div className="category-detail-stats" aria-label={`Statistiques ${activeCategory.name}`}>
            <div>
              <strong>{categoryStats?.articles ?? 0}</strong>
              <span>Articles</span>
            </div>
            <div>
              <strong>{categoryStats?.ebooks ?? 0}</strong>
              <span>Ebooks</span>
            </div>
            <div>
              <strong>{categoryStats?.guides ?? 0}</strong>
              <span>Guides</span>
            </div>
            <div>
              <strong>{categoryStats?.tutorials ?? 0}</strong>
              <span>Tutoriels</span>
            </div>
          </div>
        </section>

        <main className="category-detail-main" ref={categoryContentTopRef}>
          <div className="category-detail-toolbar">
            <div>
              <h2>Contenus classés</h2>
              <p>
                {isLoadingBooks
                  ? 'Chargement des ressources de la bibliothèque...'
                  : `${categoryContent.length} contenu${categoryContent.length > 1 ? 's' : ''} disponible${categoryContent.length > 1 ? 's' : ''}.`}
              </p>
            </div>
            <div className="category-detail-filters" aria-label="Filtres de contenu">
              {contentFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={activeFilter === filter.value ? 'is-active' : ''}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="category-detail-grid">
            {paginatedCategoryContent.map((item) => (
              <Link className="category-content-card" to={item.path} key={item.id}>
                {item.image ? (
                  <img src={item.image} alt={`JC Hub - ${item.title}`} loading="lazy" decoding="async" />
                ) : (
                  <span>
                    <i className={item.kind === 'article' ? 'far fa-file-lines' : 'fas fa-book-open'}></i>
                  </span>
                )}
                <div>
                  <small>{item.typeLabel}</small>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <em>{item.meta}</em>
                </div>
              </Link>
            ))}
          </div>

          {categoryContent.length > CATEGORY_CONTENT_PAGE_SIZE && (
            <nav className="categories-pagination" aria-label="Pagination des contenus de la catégorie">
              <button
                type="button"
                disabled={safeContentPage === 1}
                onClick={() => handleCategoryContentPageChange(Math.max(1, safeContentPage - 1))}
              >
                <i className="fas fa-chevron-left"></i>
                Précédent
              </button>
              <div>
                {getPaginationItems(totalContentPages).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={page === safeContentPage ? 'is-active' : ''}
                    onClick={() => handleCategoryContentPageChange(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={safeContentPage === totalContentPages}
                onClick={() => handleCategoryContentPageChange(Math.min(totalContentPages, safeContentPage + 1))}
              >
                Suivant
                <i className="fas fa-chevron-right"></i>
              </button>
            </nav>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <section className="categories-hero" aria-labelledby="categories-hero-title">
        <div className="categories-hero-copy">
          <h1 id="categories-hero-title">Catégories</h1>
          <p>
            <strong>Trouvez facilement</strong> les ressources qui correspondent à vos centres d’intérêt.
          </p>

          <form className="categories-search" onSubmit={handleSearchSubmit}>
            <label htmlFor="categories-search-input" className="sr-only">
              Rechercher une catégorie
            </label>
            <input
              id="categories-search-input"
              type="search"
              placeholder="Rechercher une catégorie, un sujet..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" aria-label="Rechercher">
              <i className="fas fa-magnifying-glass"></i>
            </button>
          </form>

          <div className="categories-stats" aria-label="Statistiques des catégories">
            {stats.map((stat) => (
              <div className="categories-stat" key={stat.label}>
                <i className={stat.icon}></i>
                <span>
                  <strong>{stat.value}</strong>
                  <small>{stat.label}</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="categories-hero-visual">
          <img
            src={categoriesHeroImage}
            alt="JC Hub - aperçu des catégories de ressources numériques"
            loading="eager"
            decoding="async"
          />
        </div>
      </section>

      <main className="categories-main">
        <section className="categories-list" aria-labelledby="categories-list-title" ref={categoriesTopRef}>
          <div className="categories-section-head">
            <h2 id="categories-list-title">Toutes les catégories</h2>
            <label>
              <span>Trier par :</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="popularite">Popularité</option>
                <option value="ressources">Ressources</option>
                <option value="az">A à Z</option>
              </select>
            </label>
          </div>

          <div className="categories-grid">
            {paginatedCategories.map((category) => (
              <Link
                className="categories-card"
                to={getCategoryPath(category)}
                key={category.title}
              >
                <span className={`categories-icon is-${category.tone}`}>
                  <i className={category.icon}></i>
                </span>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <span className="categories-card-footer">
                  <strong>{category.count} ressources</strong>
                  <i className="fas fa-arrow-right"></i>
                </span>
              </Link>
            ))}
          </div>

          {sortedCategories.length > CATEGORIES_PAGE_SIZE && (
            <nav className="categories-pagination" aria-label="Pagination des catégories">
              <button
                type="button"
                disabled={safeCategoriesPage === 1}
                onClick={() => handleCategoriesPageChange(Math.max(1, safeCategoriesPage - 1))}
              >
                <i className="fas fa-chevron-left"></i>
                Précédent
              </button>
              <div>
                {getPaginationItems(totalCategoryPages).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={page === safeCategoriesPage ? 'is-active' : ''}
                    onClick={() => handleCategoriesPageChange(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={safeCategoriesPage === totalCategoryPages}
                onClick={() => handleCategoriesPageChange(Math.min(totalCategoryPages, safeCategoriesPage + 1))}
              >
                Suivant
                <i className="fas fa-chevron-right"></i>
              </button>
            </nav>
          )}
        </section>

        <aside className="categories-sidebar" aria-label="Filtres et catégories populaires">
          <section className="categories-panel">
            <h3>Filtres</h3>
            {filterGroups.map((group) => (
              <div className="categories-filter-group" key={group.title}>
                <h4>{group.title}</h4>
                {group.items.map((item) => (
                  <label key={item.label}>
                    <span>
                      <i className={item.icon}></i>
                      {item.label}
                    </span>
                    <small>{item.count}</small>
                  </label>
                ))}
              </div>
            ))}
            <button type="button" className="categories-reset-button">
              Réinitialiser les filtres
            </button>
          </section>

          <section className="categories-panel categories-popular">
            <h3>Catégories populaires</h3>
            <ol>
              {popularCategories.map((category, index) => (
                <li key={category.title}>
                  <Link to={getCategoryPath(category)}>
                    <span>{index + 1}</span>
                    <strong>{category.title}</strong>
                    <small>{category.count}</small>
                  </Link>
                </li>
              ))}
            </ol>
            <Link className="categories-panel-link" to="/categories">
              Voir toutes les catégories
              <i className="fas fa-arrow-right"></i>
            </Link>
          </section>
        </aside>
      </main>

      <section className="categories-trending" aria-labelledby="categories-trending-title">
        <div className="categories-section-head">
          <h2 id="categories-trending-title">Sujets en tendance</h2>
          <Link to="/search">
            Voir tous les sujets en tendance
            <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        <div className="categories-trending-grid">
          {trendingTopics.map((topic) => (
            <Link to={getSearchPath(topic.title)} className="categories-topic" key={topic.title}>
              <span className={`categories-topic-icon is-${topic.tone}`}>
                <i className={topic.icon}></i>
              </span>
              <span>
                <strong>{topic.title}</strong>
                <small>{topic.count} ressources</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="categories-newsletter" aria-labelledby="categories-newsletter-title">
        <div className="categories-newsletter-copy">
          <i className="far fa-envelope"></i>
          <div>
            <h2 id="categories-newsletter-title">Restez à jour avec notre newsletter</h2>
            <p>Recevez nos derniers guides, articles et ressources directement dans votre boîte mail.</p>
          </div>
        </div>
        <form onSubmit={newsletter.handleSubmit} className="categories-newsletter-form">
          <input
            type="email"
            placeholder="Votre adresse e-mail"
            value={newsletter.email}
            onChange={(event) => {
              newsletter.setEmail(event.target.value);
              newsletter.resetFeedback();
            }}
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
