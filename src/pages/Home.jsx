import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';
import { CONTENT_CATEGORIES } from '../data/categoriesCatalog';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import { usePageSeo } from '../hooks/usePageSeo';
import { subscribeBlogMetricsMap } from '../services/blogInteractionsService';
import { fetchHostedBooks } from '../services/ebookService';
import partner2mdLogo from '../assets/partner-2md.jpg';
import partnerEadLogo from '../assets/partner-ead.png';
import partnerNjdwebLogo from '../assets/partner-njdweb.png';
import '../styles/HomeHub.css';

const categories = [
  {
    icon: 'fas fa-code',
    title: 'Technologies',
    description: 'IA, Dev, Cloud, outils.',
    color: 'violet',
    link: '/blog?category=Technologie'
  },
  {
    icon: 'fas fa-lock',
    title: 'Cybersécurité',
    description: 'Sécurité, vie privée, protection.',
    color: 'green',
    link: '/blog?category=Securite'
  },
  {
    icon: 'fas fa-globe',
    title: 'Développement Web',
    description: 'Web, mobile, frameworks.',
    color: 'blue',
    link: '/blog?category=Tutoriels'
  },
  {
    icon: 'fas fa-palette',
    title: 'Design & UX',
    description: 'UI/UX, graphisme, expérience.',
    color: 'pink',
    link: '/blog?category=Design'
  },
  {
    icon: 'fas fa-bullhorn',
    title: 'Marketing digital',
    description: 'SEO, réseaux sociaux, stratégie.',
    color: 'orange',
    link: '/blog?category=Outils'
  },
  {
    icon: 'fas fa-chart-simple',
    title: 'Data & IA',
    description: 'Données, analyse, intelligence artificielle.',
    color: 'purple',
    link: '/blog?category=Technologie'
  }
];

const partners = [
  {
    name: '2MD Designer',
    role: 'Design graphique & identité visuelle',
    logo: partner2mdLogo,
    tone: 'purple'
  },
  {
    name: 'NJDWeb',
    role: 'Développement web & solutions digitales',
    logo: partnerNjdwebLogo,
    tone: 'blue'
  },
  {
    name: 'EAD',
    role: 'École de formation professionnelle',
    logo: partnerEadLogo,
    tone: 'green'
  }
];

const contentSourcesPreview = [
  {
    name: 'Gutendex',
    label: 'Domaine public',
    url: 'https://gutendex.com',
    icon: 'fas fa-book-open'
  },
  {
    name: 'Internet Archive',
    label: 'Archives éducatives',
    url: 'https://archive.org',
    icon: 'fas fa-box-archive'
  },
  {
    name: 'Open Library',
    label: 'Métadonnées & couvertures',
    url: 'https://openlibrary.org',
    icon: 'fas fa-layer-group'
  },
  {
    name: 'Google Books',
    label: 'Aperçus officiels',
    url: 'https://books.google.com',
    icon: 'fas fa-magnifying-glass'
  }
];

const formatStatValue = (value) => {
  if (value === null) return '...';
  return new Intl.NumberFormat('fr-FR').format(Math.max(0, Number(value) || 0));
};

const formatViewCount = (value) => `${formatStatValue(value)} vue${Number(value) > 1 ? 's' : ''}`;
const BOOKS_STATS_REFRESH_MS = 60000;

const toSeoSlug = (value, fallback = 'livre') => {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return slug || fallback;
};

const getBookDetailPath = (book) => {
  if (book?.detailPath) return book.detailPath;
  const categorySlug = toSeoSlug(book?.categorySlug || book?.category || 'general', 'general');
  const slug = toSeoSlug(book?.slug || book?.title || book?.sourceId || book?.id, 'livre');
  return `/ebooks/${categorySlug}/${slug}`;
};

const fallbackArticleImage = '/jchub_monogram.png';

function SectionTitle({ title, action, to }) {
  return (
    <div className="home-numerik-section-title">
      <h2>{title}</h2>
      {to && (
        <Link to={to}>
          {action}
          <i className="fas fa-arrow-right"></i>
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const newsletter = useNewsletterForm({ source: 'home-redesign' });
  const [hostedBooks, setHostedBooks] = useState([]);
  const [hasLoadedBooks, setHasLoadedBooks] = useState(false);
  const [blogMetricsBySlug, setBlogMetricsBySlug] = useState({});
  const articleSlugs = useMemo(() => blogPosts.map((post) => post.slug).filter(Boolean), []);

  useEffect(() => {
    let active = true;

    const loadBooks = () => {
      fetchHostedBooks()
        .then((books) => {
          if (active) setHostedBooks(books);
        })
        .catch(() => {
          if (active) setHostedBooks([]);
        })
        .finally(() => {
          if (active) setHasLoadedBooks(true);
        });
    };

    loadBooks();
    const refreshId = window.setInterval(loadBooks, BOOKS_STATS_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBlogMetricsMap(articleSlugs, setBlogMetricsBySlug);
    return () => unsubscribe();
  }, [articleSlugs]);

  const stats = useMemo(() => {
    const articleViews = blogPosts.reduce((total, post) => {
      const liveViews = Number(blogMetricsBySlug[post.slug]?.viewsCount) || 0;
      const baselineViews = Number(post.views) || 0;
      return total + Math.max(liveViews, baselineViews);
    }, 0);
    const bookViews = hostedBooks.reduce((total, book) => total + (Number(book.viewsCount) || 0), 0);

    return [
      { value: formatStatValue(blogPosts.length), label: 'Articles publiés', icon: 'fas fa-file-lines' },
      {
        value: formatStatValue(hasLoadedBooks ? hostedBooks.length : null),
        label: 'Ressources disponibles',
        icon: 'fas fa-book-open'
      },
      {
        value: formatStatValue(hasLoadedBooks ? articleViews + bookViews : articleViews),
        label: 'Lecteurs actifs',
        icon: 'far fa-eye'
      },
      { value: formatStatValue(CONTENT_CATEGORIES.length), label: 'Catégories', icon: 'fas fa-layer-group' },
    ];
  }, [blogMetricsBySlug, hasLoadedBooks, hostedBooks]);

  const latestArticles = useMemo(
    () =>
      [...blogPosts]
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, 6),
    []
  );

  const homeResources = useMemo(
    () =>
      [...hostedBooks]
        .sort((a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0))
        .slice(0, 6),
    [hostedBooks]
  );

  usePageSeo({
    title: 'JC Hub - Blog, bibliothèque et ressources numériques',
    description:
      'JC Hub rassemble des articles, guides pratiques et une bibliothèque de ressources pour apprendre, comprendre et progresser dans le numérique.',
    path: '/'
  });

  return (
    <main className="home-numerik">
      <section className="home-numerik-hero">
        <div className="home-numerik-hero-copy">
          <h1>
            Explorez <span>JC Hub.</span>
            <br />
            Apprenez sans limite.
          </h1>
          <p>
            Des articles, des guides pratiques et une bibliothèque de ressources pour comprendre et maîtriser le monde
            numérique.
          </p>

          <div className="home-numerik-actions">
            <Link className="home-numerik-button home-numerik-button-primary" to="/ebooks">
              <i className="fas fa-book-open"></i>
              Explorer la bibliothèque
            </Link>
            <Link className="home-numerik-button home-numerik-button-secondary" to="/blog">
              <i className="fas fa-pen-to-square"></i>
              Lire le blog
            </Link>
          </div>

          <div className="home-numerik-mini-stats" aria-label="Statistiques JC Hub">
            {stats.map((item) => (
              <div key={item.label}>
                <i className={item.icon}></i>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="home-numerik-hero-visual" aria-label="JC Hub bibliothèque numérique">
          <div className="home-numerik-wire home-numerik-wire-one"></div>
          <div className="home-numerik-wire home-numerik-wire-two"></div>
          <span className="home-numerik-float-icon is-cloud">
            <i className="fas fa-cloud-arrow-down"></i>
          </span>
          <span className="home-numerik-float-icon is-lock">
            <i className="fas fa-lock"></i>
          </span>
          <span className="home-numerik-float-icon is-chart">
            <i className="fas fa-chart-line"></i>
          </span>
          <span className="home-numerik-float-icon is-book">
            <i className="fas fa-book-open"></i>
          </span>

          <div className="home-numerik-laptop">
            <div className="home-numerik-laptop-screen">
              <div className="home-numerik-screen-top">
                <strong>Bibliothèque</strong>
                <span>
                  <i className="fas fa-arrow-left"></i>
                  <i className="fas fa-arrow-right"></i>
                </span>
              </div>
              <div className="home-numerik-search-fake">
                <i className="fas fa-magnifying-glass"></i>
                <span>Rechercher une ressource...</span>
              </div>
              <div className="home-numerik-screen-layout">
                <div className="home-numerik-screen-menu">
                  <span>Toutes</span>
                  <span>Guides</span>
                  <span>Livres blancs</span>
                  <span>Tutoriels</span>
                  <span>Outils</span>
                </div>
                <div className="home-numerik-screen-cards">
                  {['Cybersécurité', 'Développement Web', 'Intelligence Artificielle'].map((title, index) => (
                    <div key={title}>
                      <i className={index === 0 ? 'fas fa-shield-halved' : index === 1 ? 'fas fa-code' : 'fas fa-brain'}></i>
                      <strong>{title}</strong>
                      <span></span>
                      <span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="home-numerik-laptop-base"></div>
          </div>

          <div className="home-numerik-phone">
            <strong>Guide</strong>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="home-numerik-plant" aria-hidden="true"></div>
        </div>
      </section>

      <section className="home-numerik-section home-numerik-categories-section">
        <SectionTitle title="Explorer par catégorie" action="Voir toutes les catégories" to="/blog" />
        <div className="home-numerik-category-grid">
          {categories.map((category) => (
            <Link className={`home-numerik-category is-${category.color}`} to={category.link} key={category.title}>
              <span>
                <i className={category.icon}></i>
              </span>
              <div>
                <strong>{category.title}</strong>
                <p>{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-numerik-section">
        <SectionTitle title="Derniers articles du blog" action="Voir tous les articles" to="/blog" />
        <div className="home-numerik-article-slider" aria-label="Derniers articles récents">
          <div className="home-numerik-article-track">
            {[0, 1].map((groupIndex) => (
              <div
                className="home-numerik-article-set"
                key={`article-group-${groupIndex}`}
                aria-hidden={groupIndex === 1}
              >
                {latestArticles.map((article) => (
                  <article className="home-numerik-article" key={`${groupIndex}-${article.slug}`}>
                    <Link
                      className="home-numerik-article-image has-image"
                      to={`/blog/${article.slug}`}
                      aria-label={article.title}
                      tabIndex={groupIndex === 1 ? -1 : undefined}
                    >
                      <img
                        src={article.image || fallbackArticleImage}
                        alt={`JC Hub - ${article.title}`}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = fallbackArticleImage;
                        }}
                      />
                      <span>{article.category}</span>
                    </Link>
                    <div>
                      <p className="home-numerik-tag">{article.category}</p>
                      <h3>{article.title}</h3>
                      <p>{article.excerpt}</p>
                      <div className="home-numerik-article-meta">
                        <span>
                          <i className="fas fa-user"></i>
                          {article.author || 'JC Hub'}
                        </span>
                        <span>{article.dateLabel}</span>
                        <span>{article.readMinutes} min</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-numerik-section">
        <SectionTitle title="Ressources populaires" action="Voir toute la bibliothèque" to="/ebooks" />
        <div className="home-numerik-resource-grid">
          {!hasLoadedBooks && (
            <p className="home-numerik-resource-feedback">Chargement des livres...</p>
          )}

          {hasLoadedBooks && homeResources.length === 0 && (
            <p className="home-numerik-resource-feedback">Aucun livre disponible pour le moment.</p>
          )}

          {homeResources.map((book) => (
            <Link className="home-numerik-resource" to={getBookDetailPath(book)} state={{ book }} key={book.id || book.title}>
              <span className="home-numerik-resource-cover">
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
              <span className="home-numerik-resource-meta">
                <em>{book.category || book.sourceLabel || 'Livre'}</em>
                <span>
                  <i className="far fa-eye"></i>
                  {formatViewCount(book.viewsCount)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-numerik-proof">
        <div className="home-numerik-proof-stats">
          {stats.slice(0, 3).map((item) => (
            <div key={item.label}>
              <i className={item.icon}></i>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="home-numerik-why">
          <h2>Pourquoi choisir JC Hub ?</h2>
          <ul>
            <li>Ressources de qualité et vérifiées</li>
            <li>Contenu mis à jour régulièrement</li>
            <li>Accès gratuit à de nombreuses ressources</li>
            <li>Téléchargements rapides et sécurisés</li>
          </ul>
        </div>
        <div className="home-numerik-target" aria-hidden="true">
          <i className="fas fa-bullseye"></i>
        </div>
      </section>

      <section className="home-numerik-section home-numerik-sources">
        <SectionTitle title="Sources de nos ressources" action="Voir toutes les sources" to="/about" />
        <div className="home-numerik-source-grid">
          {contentSourcesPreview.map((source) => (
            <a
              className="home-numerik-source"
              href={source.url}
              target="_blank"
              rel="noreferrer"
              key={source.name}
            >
              <span>
                <i className={source.icon}></i>
              </span>
              <div>
                <strong>{source.name}</strong>
                <p>{source.label}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="home-numerik-section">
        <SectionTitle title="Nos partenaires" />
        <div className="home-numerik-partner-slider" aria-label="Partenaires JC Hub">
          <div className="home-numerik-partner-grid">
            {partners.map((partner) => (
              <article className={`home-numerik-partner is-${partner.tone}`} key={partner.name}>
                <span className="home-numerik-partner-icon">
                  <img src={partner.logo} alt={`Logo ${partner.name}`} loading="lazy" decoding="async" />
                </span>
                <div>
                  <strong>{partner.name}</strong>
                  <p>{partner.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-numerik-newsletter">
        <div className="home-numerik-newsletter-icon">
          <i className="fas fa-envelope"></i>
        </div>
        <div>
          <h2>Restez à jour avec notre newsletter</h2>
          <p>Recevez nos derniers articles, guides et ressources directement dans votre boîte mail.</p>
        </div>
        <form onSubmit={newsletter.handleSubmit}>
          <input
            type="email"
            placeholder="Votre adresse e-mail"
            value={newsletter.email}
            onChange={(event) => newsletter.setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <button type="submit" disabled={newsletter.isSubmitting}>
            {newsletter.isSubmitting ? 'Envoi...' : "S'abonner"}
          </button>
        </form>
      </section>
    </main>
  );
}
