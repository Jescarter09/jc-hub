import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';
import { CONTENT_CATEGORIES } from '../data/categoriesCatalog';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import { usePageSeo } from '../hooks/usePageSeo';
import { subscribeBlogMetricsMap } from '../services/blogInteractionsService';
import { fetchHostedBooks } from '../services/ebookService';
import aboutHeroImage from '../assets/Reasons We Do Things We Know Are Wrong_.jpg';
import '../styles/About.css';

const missionCards = [
  {
    icon: 'fas fa-book-open',
    title: 'Éducation accessible',
    text: 'Nous créons du contenu clair et pratique pour aider chacun à apprendre et progresser à son rythme.',
    tone: 'purple'
  },
  {
    icon: 'fas fa-shield-heart',
    title: 'Qualité et fiabilité',
    text: 'Nos ressources sont vérifiées pour garder des informations fiables, utiles et à jour.',
    tone: 'green'
  },
  {
    icon: 'fas fa-rocket',
    title: 'Innovation continue',
    text: 'Nous suivons les évolutions du numérique pour proposer des contenus pertinents et actuels.',
    tone: 'orange'
  },
  {
    icon: 'fas fa-user-group',
    title: 'Communauté engagée',
    text: 'Nous croyons à la force du partage et de l’entraide pour apprendre ensemble.',
    tone: 'blue'
  }
];

const teamMembers = [
  {
    name: 'Jessy C.',
    role: 'Fondateur & Rédacteur en chef',
    text: 'Passionné de technologie et de pédagogie numérique.',
    initials: 'JC',
    socials: ['linkedin-in', 'twitter', 'github']
  },
  {
    name: 'Marie L.',
    role: 'Rédactrice & Community Manager',
    text: 'Spécialiste en communication digitale et en contenu.',
    initials: 'ML',
    socials: ['linkedin-in', 'twitter', 'instagram']
  },
  {
    name: 'Alex T.',
    role: 'Expert technique',
    text: 'Développeur et expert en cybersécurité.',
    initials: 'AT',
    socials: ['linkedin-in', 'github', 'twitter']
  },
  {
    name: 'Sara M.',
    role: 'Designer UI/UX',
    text: 'Conçoit des expériences simples, modernes et intuitives.',
    initials: 'SM',
    socials: ['dribbble', 'linkedin-in', 'instagram']
  }
];

const testimonials = [
  {
    quote: 'Une plateforme incroyable qui m’aide au quotidien à rester à jour dans le domaine du numérique.',
    author: 'Thomas R.',
    role: 'Développeur Web'
  },
  {
    quote: 'Grâce à JC Hub, j’ai pu améliorer mes compétences avec des ressources claires et pratiques.',
    author: 'Aïcha K.',
    role: 'Étudiante en Informatique'
  },
  {
    quote: 'Le meilleur endroit pour trouver des guides et ebooks de qualité en français. Bravo à toute l’équipe !',
    author: 'Julien P.',
    role: 'Entrepreneur'
  }
];

const BOOKS_STATS_REFRESH_MS = 60000;

const formatStatValue = (value) => {
  if (value === null) return '...';
  return new Intl.NumberFormat('fr-FR', {
    notation: Number(value) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1
  }).format(Math.max(0, Number(value) || 0));
};

const contentSourceGroups = [
  {
    title: 'Sources libres et téléchargeables',
    tone: 'green',
    items: [
      {
        name: 'Gutendex',
        description: 'Livres du domaine public basés sur Project Gutenberg, avec formats EPUB, TXT et HTML.',
        links: [
          { label: 'Gutendex', url: 'https://gutendex.com' },
          { label: 'Project Gutenberg', url: 'https://www.gutenberg.org' }
        ]
      },
      {
        name: 'Internet Archive',
        description: 'Livres numériques, PDFs, audiobooks et archives éducatives.',
        links: [
          { label: 'Site', url: 'https://archive.org' },
          { label: 'API', url: 'https://archive.org/developers/' }
        ]
      },
      {
        name: 'LibriVox',
        description: 'Livres audio gratuits issus du domaine public.',
        links: [{ label: 'Site', url: 'https://librivox.org' }]
      },
      {
        name: 'Free Programming Books',
        description: 'Livres de programmation gratuits, ressources open-source et guides développeurs.',
        links: [{ label: 'GitHub', url: 'https://github.com/EbookFoundation/free-programming-books' }]
      },
      {
        name: 'GitHub',
        description: 'Repositories open-source, documentation, guides techniques et ressources éducatives.',
        links: [{ label: 'Site', url: 'https://github.com' }]
      }
    ]
  },
  {
    title: 'Métadonnées, aperçus et documentations officielles',
    tone: 'yellow',
    items: [
      {
        name: 'Google Books',
        description: 'Recherche de livres, métadonnées, aperçus et lecteur officiel.',
        links: [
          { label: 'Site', url: 'https://books.google.com' },
          { label: 'API', url: 'https://developers.google.com/books' }
        ]
      },
      {
        name: 'Open Library',
        description: 'Métadonnées de livres, couvertures et recherche globale.',
        links: [
          { label: 'Site', url: 'https://openlibrary.org' },
          { label: 'API', url: 'https://openlibrary.org/developers/api' }
        ]
      },
      {
        name: 'MDN Web Docs',
        description: 'Documentation HTML, CSS, JavaScript et références Web APIs.',
        links: [{ label: 'Site', url: 'https://developer.mozilla.org' }]
      },
      {
        name: 'React Documentation',
        description: 'Documentation officielle React.',
        links: [{ label: 'Site', url: 'https://react.dev' }]
      },
      {
        name: 'Firebase Documentation',
        description: 'Documentation Firebase, guides backend et authentification.',
        links: [{ label: 'Docs', url: 'https://firebase.google.com/docs' }]
      },
      {
        name: 'Vite Documentation',
        description: 'Documentation officielle Vite.',
        links: [{ label: 'Docs', url: 'https://vitejs.dev' }]
      }
    ]
  }
];

export default function About() {
  const newsletter = useNewsletterForm({ source: 'about-page' });
  const [hostedBooks, setHostedBooks] = useState([]);
  const [hasLoadedBooks, setHasLoadedBooks] = useState(false);
  const [blogMetricsBySlug, setBlogMetricsBySlug] = useState({});
  const articleSlugs = useMemo(() => blogPosts.map((post) => post.slug).filter(Boolean), []);
  const newsletterFeedbackClassName =
    newsletter.feedback.kind === 'error'
      ? 'about-newsletter-feedback about-newsletter-feedback-error'
      : newsletter.feedback.kind === 'info'
        ? 'about-newsletter-feedback about-newsletter-feedback-info'
        : 'about-newsletter-feedback about-newsletter-feedback-success';

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
    const sourcesCount = contentSourceGroups.reduce((total, group) => total + group.items.length, 0);

    return [
      {
        icon: 'fas fa-users',
        value: formatStatValue(hasLoadedBooks ? articleViews + bookViews : articleViews),
        label: 'Lecteurs actifs'
      },
      {
        icon: 'fas fa-book-open',
        value: formatStatValue(hasLoadedBooks ? hostedBooks.length : null),
        label: 'Ressources disponibles'
      },
      { icon: 'far fa-file-lines', value: formatStatValue(blogPosts.length), label: 'Articles publiés' },
      { icon: 'fas fa-layer-group', value: formatStatValue(CONTENT_CATEGORIES.length), label: 'Catégories' },
      { icon: 'fas fa-link', value: formatStatValue(sourcesCount), label: 'Sources connectées' }
    ];
  }, [blogMetricsBySlug, hasLoadedBooks, hostedBooks]);

  usePageSeo({
    title: 'À propos',
    description:
      'Découvre la mission de JC Hub: rendre le numérique plus clair, plus utile et plus accessible avec des guides simples, des articles et des ressources.',
    image: aboutHeroImage,
    path: '/about'
  });

  return (
    <div className="about-soft">
      <section className="about-soft-section about-hero" id="about">
        <div className="about-hero-copy">
          <nav className="about-breadcrumb" aria-label="Fil d’Ariane">
            <Link to="/">Accueil</Link>
            <i className="fas fa-chevron-right"></i>
            <span>À propos</span>
          </nav>

          <h1>
            À propos de <span>JC Hub</span>
          </h1>
          <p className="about-hero-lead">
            JC Hub est une plateforme dédiée à la vulgarisation du numérique et au partage de connaissances
            accessibles à tous.
          </p>
          <p>
            Notre mission est de démocratiser l’accès à une information de qualité dans les domaines de la
            technologie, du développement, de la cybersécurité et de l’intelligence artificielle.
          </p>

          <a className="about-primary-button" href="#mission">
            Découvrir notre mission
            <i className="fas fa-arrow-right"></i>
          </a>
        </div>

        <div className="about-hero-visual">
          <img src={aboutHeroImage} alt="JC Hub - aperçu visuel de la plateforme et de la bibliothèque numérique" />
        </div>
      </section>

      <section className="about-soft-section about-mission" id="mission">
        <div className="about-section-heading">
          <h2>Notre mission</h2>
          <p>Rendre le savoir numérique accessible, clair et utile pour tous.</p>
        </div>

        <div className="about-mission-grid">
          {missionCards.map((card) => (
            <article key={card.title} className={`about-mission-card about-mission-card-${card.tone}`}>
              <i className={card.icon}></i>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-soft-section about-stats" aria-label="Statistiques JC Hub">
        {stats.map((item) => (
          <article key={item.label}>
            <i className={item.icon}></i>
            <div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="about-soft-section about-team">
        <div className="about-section-heading">
          <h2>L’équipe derrière JC Hub</h2>
          <p>Une équipe passionnée par le numérique et l’éducation.</p>
        </div>

        <div className="about-team-grid">
          {teamMembers.map((member) => (
            <article key={member.name} className="about-team-card">
              <div className="about-avatar" aria-hidden="true">
                {member.initials}
              </div>
              <h3>{member.name}</h3>
              <strong>{member.role}</strong>
              <p>{member.text}</p>
              <div className="about-socials">
                {member.socials.map((social) => (
                  <span key={social}>
                    <i className={`fab fa-${social}`}></i>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-soft-section about-testimonials">
        <div className="about-section-heading">
          <h2>Ils parlent de JC Hub</h2>
        </div>

        <div className="about-testimonials-grid">
          {testimonials.map((testimonial) => (
            <article key={testimonial.author} className="about-testimonial-card">
              <i className="fas fa-quote-left"></i>
              <p>{testimonial.quote}</p>
              <div>
                <span className="about-mini-avatar">{testimonial.author.charAt(0)}</span>
                <span>
                  <strong>{testimonial.author}</strong>
                  <small>{testimonial.role}</small>
                </span>
                <span className="about-stars" aria-label="5 étoiles">
                  ★★★★★
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-soft-section about-content-sources">
        <div className="about-section-heading">
          <h2>Sources et partenaires de contenu</h2>
          <p>
            JC Hub s’appuie sur des sources publiques, open-source et officielles pour proposer des livres,
            guides, ressources éducatives et contenus numériques.
          </p>
        </div>

        <div className="about-source-groups">
          {contentSourceGroups.map((group) => (
            <article className={`about-source-group is-${group.tone}`} key={group.title}>
              <h3>{group.title}</h3>
              <div className="about-source-list">
                {group.items.map((source) => (
                  <div className="about-source-card" key={source.name}>
                    <strong>{source.name}</strong>
                    <p>{source.description}</p>
                    <div>
                      {source.links.map((link) => (
                        <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>
                          {link.label}
                          <i className="fas fa-arrow-up-right-from-square"></i>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-soft-section about-newsletter" id="newsletter">
        <div className="about-newsletter-copy">
          <i className="far fa-envelope"></i>
          <div>
            <h2>Restez à jour avec JC Hub</h2>
            <p>Recevez nos derniers articles, guides et ressources directement dans votre boîte mail.</p>
          </div>
        </div>

        <form onSubmit={newsletter.handleSubmit} className="about-newsletter-form">
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
