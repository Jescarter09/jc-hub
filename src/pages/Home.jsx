import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/Home.css';

const fallbackImage = '/jchub_monogram.png';

const needCards = [
  {
    label: 'Comprendre',
    title: 'Les bases sans jargon',
    text: 'Internet, outils, securite et notions simples pour partir du bon pied.'
  },
  {
    label: 'Apprendre',
    title: 'Des guides pas a pas',
    text: 'Des formats progressifs pour pratiquer, refaire et avancer a ton rythme.'
  },
  {
    label: 'Reparer',
    title: 'Un ordinateur plus propre',
    text: 'Maintenance, lenteurs, protection et bons reflexes avant de paniquer.'
  },
  {
    label: 'Gagner du temps',
    title: 'Bureautique utile',
    text: 'Word, Excel, PowerPoint et methodes simples pour mieux travailler.'
  }
];

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function getUniqueRecentPosts(posts) {
  const seenTitles = new Set();

  return [...posts]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .filter((post) => {
      const key = normalizeText(post.title);
      if (!key || seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });
}

function findPost(posts, words, excludedSlugs = new Set()) {
  return posts.find((post) => {
    if (excludedSlugs.has(post.slug)) return false;
    const haystack = normalizeText(`${post.title} ${post.excerpt} ${post.category} ${(post.tags || []).join(' ')}`);
    return words.some((word) => haystack.includes(normalizeText(word)));
  });
}

function pickArticleSet(posts) {
  const pickedSlugs = new Set();
  const picks = [];
  const criteria = [
    ['fonctionne internet', 'bases du web', 'url', 'dns'],
    ['virus', 'securiser', 'ordinateur', 'pc'],
    ['nettoyer', 'booster', 'windows', 'ordinateur'],
    ['excel', 'word', 'powerpoint', 'bureautique'],
    ['apprendre', 'peu de moyens', 'informatique'],
    ['deployer', 'projet en ligne', 'vercel']
  ];

  criteria.forEach((words) => {
    const post = findPost(posts, words, pickedSlugs);
    if (!post) return;
    pickedSlugs.add(post.slug);
    picks.push(post);
  });

  return [...picks, ...posts.filter((post) => !pickedSlugs.has(post.slug))].slice(0, 6);
}

function ArticleCard({ article, compact = false }) {
  if (!article) return null;

  return (
    <Link to={`/blog/${article.slug}`} className={`home-soft-article-card ${compact ? 'home-soft-article-card-compact' : ''}`}>
      <div className="home-soft-article-image">
        <img
          src={article.image || fallbackImage}
          alt={article.title}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = fallbackImage;
          }}
        />
      </div>
      <div className="home-soft-article-body">
        <div className="home-soft-meta">
          <span>{article.category}</span>
          <span>{article.readMinutes} min</span>
        </div>
        <h3>{article.title}</h3>
        <p>{article.excerpt}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  usePageSeo({
    title: 'JC Hub - Guides simples pour mieux comprendre le numérique',
    description:
      'JC Hub aide les débutants, étudiants et curieux à comprendre Internet, la sécurité, la bureautique et les projets web avec des guides simples.',
    image: '/desktop.webp',
    path: '/'
  });

  const posts = getUniqueRecentPosts(blogPosts);
  const featuredPost = findPost(posts, ['fonctionne internet', 'internet', 'debutant']) || posts[0] || null;
  const articleSet = pickArticleSet(posts).filter((post) => post.slug !== featuredPost?.slug);
  const sideArticles = articleSet.slice(0, 3);

  return (
    <div className="home-soft">
      <section className="home-soft-hero">
        <div className="home-soft-hero-grid">
          <div className="home-soft-hero-copy">
            <p className="home-soft-kicker">Blog simple et pratique</p>
            <h1>
              Des guides simples pour mieux utiliser <span>le numerique.</span>
            </h1>
            <p className="home-soft-lead">
              JC Hub aide les debutants, les etudiants et les curieux a comprendre Internet,
              entretenir leur ordinateur, progresser en bureautique et publier leurs premiers projets.
            </p>

            <div className="home-soft-actions">
              <Link to="/blog" className="home-soft-button home-soft-button-primary">
                Lire les articles
              </Link>
              <a href="#categories" className="home-soft-button home-soft-button-secondary">
                Choisir un sujet
              </a>
            </div>

            <div className="home-soft-notes">
              <div>
                <strong>Clair</strong>
                <span>Des explications sans vocabulaire inutile.</span>
              </div>
              <div>
                <strong>Utile</strong>
                <span>Des conseils applicables tout de suite.</span>
              </div>
              <div>
                <strong>Accessible</strong>
                <span>Pour apprendre meme quand on part de zero.</span>
              </div>
            </div>
          </div>

          <div className="home-soft-cover-stack" aria-label="Apercu JC Hub">
            <article className="home-soft-cover-card">
              <div className="home-soft-cover-image">
                <picture>
                  <source media="(max-width: 767px)" srcSet="/mobile.webp" type="image/webp" />
                  <source srcSet="/desktop.webp" type="image/webp" />
                  <img
                    src="/desktop.png"
                    alt="Apercu JC Hub"
                    fetchPriority="high"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                </picture>
                <span>Guide de la semaine</span>
              </div>
              <div className="home-soft-cover-content">
                <h2>Apprendre a son rythme.</h2>
                <p>Une porte d'entree plus douce pour comprendre, pratiquer et avancer sans pression.</p>
              </div>
            </article>

            <article className="home-soft-floating-card home-soft-floating-left">
              <span>01</span>
              <h3>Moins de jargon.</h3>
              <p>On explique les choses simplement, avec des exemples du quotidien.</p>
            </article>

            <article className="home-soft-floating-card home-soft-floating-right">
              <span>02</span>
              <h3>Plus pratique.</h3>
              <p>PC, bureautique, Internet, securite et projets: tout part d'un besoin reel.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-soft-section home-soft-about-panel">
        <div className="home-soft-about-copy">
          <p className="home-soft-kicker">A propos de JC Hub</p>
          <h2>Un espace pour apprendre sans pression.</h2>
          <p>
            L'objectif est simple: rendre l'informatique plus comprehensible, plus utile et moins intimidante.
            Chaque contenu doit aider a faire quelque chose de concret.
          </p>
        </div>

        <div className="home-soft-about-points">
          <article>
            <strong>Pour les debutants</strong>
            <span>Des bases expliquees avec des mots simples et des exemples du quotidien.</span>
          </article>
          <article>
            <strong>Pour les etudiants</strong>
            <span>Des guides pour progresser, creer, publier et mieux utiliser les outils.</span>
          </article>
          <article>
            <strong>Pour le quotidien</strong>
            <span>Des conseils sur l'ordinateur, la securite, la bureautique et les bonnes pratiques.</span>
          </article>
        </div>
      </section>

      <section className="home-soft-section">
        <div className="home-soft-section-head">
          <div>
            <p className="home-soft-kicker">A lire maintenant</p>
            <h2>Des articles utiles.</h2>
          </div>
          <p>
            La selection met en avant les sujets les plus accessibles: comprendre, proteger,
            apprendre et gagner du temps.
          </p>
        </div>

        <div className="home-soft-feature-grid">
          {featuredPost && (
            <Link to={`/blog/${featuredPost.slug}`} className="home-soft-feature-card">
              <img
                src={featuredPost.image || '/desktop.webp'}
                alt={featuredPost.title}
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.src = '/desktop.png';
                }}
              />
              <div>
                <p className="home-soft-kicker">A la une</p>
                <h3>{featuredPost.title}</h3>
                <p>{featuredPost.excerpt}</p>
              </div>
            </Link>
          )}

          <div className="home-soft-side-list">
            {sideArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="home-soft-section" id="categories">
        <div className="home-soft-section-head">
          <div>
            <p className="home-soft-kicker">Categories</p>
            <h2>Choisir par besoin.</h2>
          </div>
          <p>Les rubriques deviennent des chemins simples: comprendre, apprendre, reparer ou gagner du temps.</p>
        </div>

        <div className="home-soft-need-grid">
          {needCards.map((card) => (
            <article key={card.title} className="home-soft-need-card">
              <span>{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-soft-section home-soft-more">
        <div className="home-soft-section-head">
          <div>
            <p className="home-soft-kicker">Explorer plus</p>
            <h2>Continuer avec les derniers articles.</h2>
          </div>
          <Link to="/blog" className="home-soft-text-link">
            Voir tout le blog
          </Link>
        </div>

        <div className="home-soft-more-grid">
          {articleSet.slice(3, 6).map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      <section className="home-soft-newsletter">
        <div>
          <p className="home-soft-kicker">Newsletter JC Hub</p>
          <h2>Recevoir les meilleurs guides, sans bruit.</h2>
          <p>
            Une invitation simple pour recevoir les articles utiles et les conseils pratiques.
          </p>
        </div>
        <Link to="/blog" className="home-soft-button home-soft-button-primary">
          Commencer par le blog
        </Link>
      </section>
    </div>
  );
}
