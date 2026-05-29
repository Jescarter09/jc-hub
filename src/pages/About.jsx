import { Link } from 'react-router-dom';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/About.css';

const creatorLinks = [
  {
    label: 'X',
    href: 'https://x.com/jessyNgnambongo'
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/jessy-ngnambongo-904b50401/'
  },
  {
    label: 'GitHub',
    href: 'https://github.com/Jescarter09/jc-hub'
  }
];

const stats = [
  {
    value: '2 ans',
    text: "d'idée, de construction et d'amélioration continue."
  },
  {
    value: '4 axes',
    text: 'apprendre, comprendre, réparer et publier.'
  },
  {
    value: '1 ton',
    text: 'simple, humain et orienté résultat concret.'
  },
  {
    value: '0 jargon',
    text: 'quand une explication simple suffit.'
  }
];

const storyItems = [
  {
    step: '01',
    title: 'Rendre les bases accessibles',
    text: "Internet, ordinateur, sécurité, outils et projets expliqués sans impression d'examen."
  },
  {
    step: '02',
    title: 'Aider à faire concrètement',
    text: 'Chaque guide doit donner une action claire, pas seulement une idée générale.'
  },
  {
    step: '03',
    title: 'Construire une ressource durable',
    text: 'Un site qui grandit avec ses lecteurs, ses tutoriels et ses retours.'
  }
];

const values = [
  {
    tag: 'Clarté',
    title: 'Expliquer simplement',
    text: 'Le contenu doit être compréhensible même quand le lecteur découvre le sujet.'
  },
  {
    tag: 'Utilité',
    title: 'Donner une action',
    text: 'Un bon article doit permettre de réparer, comprendre, publier ou progresser.'
  },
  {
    tag: 'Confiance',
    title: 'Avancer sans pression',
    text: "Le lecteur doit sentir qu'il peut apprendre à son rythme, sans honte de débuter."
  }
];

const audiences = [
  {
    title: 'Débutants',
    text: 'Pour comprendre les bases du numérique avec des explications calmes et progressives.'
  },
  {
    title: 'Étudiants',
    text: 'Pour apprendre à créer, organiser ses outils, présenter un projet et gagner en autonomie.'
  },
  {
    title: 'Curieux',
    text: 'Pour rester à jour, découvrir des méthodes simples et mieux utiliser son ordinateur.'
  }
];

const topics = [
  {
    title: 'Comprendre',
    text: 'Internet, outils, tendances et notions de base.'
  },
  {
    title: 'Apprendre',
    text: 'Tutoriels progressifs et projets guidés.'
  },
  {
    title: 'Réparer',
    text: 'Maintenance PC, sécurité et bons réflexes.'
  },
  {
    title: 'Gagner du temps',
    text: 'Bureautique, organisation et méthodes simples.'
  }
];

const ecosystem = [
  {
    title: 'Présence en ligne',
    text: 'Construire des espaces visibles, utiles et simples à comprendre.'
  },
  {
    title: 'Expérience utilisateur',
    text: 'Penser les pages pour que les visiteurs sachent quoi faire ensuite.'
  },
  {
    title: 'Vision long terme',
    text: 'Faire évoluer les projets progressivement, avec cohérence.'
  }
];

export default function About() {
  usePageSeo({
    title: 'À propos',
    description:
      'Découvre la mission de JC Hub: rendre le numérique plus clair, plus utile et plus accessible avec des guides simples et concrets.',
    image: '/carter.webp',
    path: '/about'
  });

  return (
    <div className="about-soft">
      <section className="about-soft-section about-soft-hero" id="about">
        <div className="about-soft-hero-grid">
          <div className="about-soft-hero-copy">
            <p className="about-soft-kicker">À propos de JC Hub</p>
            <h1>
              Un espace pour apprendre <span>sans pression.</span>
            </h1>
            <p className="about-soft-hero-lead">
              JC Hub existe pour rendre le numérique plus clair, plus utile et moins intimidant.
              Ici, on apprend avec des mots simples, des exemples concrets et des guides que l'on peut appliquer.
            </p>
            <div className="about-soft-hero-actions">
              <a className="about-soft-button about-soft-button-primary" href="#story">
                Découvrir l'histoire
              </a>
              <Link className="about-soft-button about-soft-button-secondary" to="/blog">
                Lire les articles
              </Link>
            </div>
          </div>

          <article className="about-soft-profile-card">
            <div className="about-soft-profile-image">
              <img
                src="/carter.webp"
                alt="Jessy Carter Ngnambongo"
                fetchPriority="high"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.src = '/jchub_monogram.png';
                }}
              />
              <span>Fondateur JC Hub</span>
            </div>
            <div className="about-soft-profile-body">
              <h2>Jessy Carter Ngnambongo</h2>
              <p>
                Créateur de JC Hub, avec une envie simple: transmettre ce qu'il apprend et aider
                d'autres personnes à progresser plus vite.
              </p>
              <div className="about-soft-socials">
                {creatorLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="about-soft-section about-soft-intro-strip" aria-label="Résumé JC Hub">
        {stats.map((item) => (
          <div key={item.value} className="about-soft-stat">
            <strong>{item.value}</strong>
            <span>{item.text}</span>
          </div>
        ))}
      </section>

      <section className="about-soft-section about-soft-story" id="story">
        <div className="about-soft-section-head">
          <h2>Pourquoi JC Hub existe.</h2>
          <p>
            La page About explique la mission: aider à apprendre avec moins de bruit, plus de clarté
            et des guides que l'on peut vraiment utiliser.
          </p>
        </div>

        <div className="about-soft-story-grid">
          <div className="about-soft-story-note">
            <h2>Apprendre devrait être plus simple.</h2>
            <p>
              Beaucoup de contenus numériques sont trop rapides, trop complexes ou trop dispersés.
              JC Hub prend le chemin inverse: expliquer calmement, montrer l'utile, aider à passer à l'action.
            </p>
          </div>

          <div className="about-soft-story-list">
            {storyItems.map((item) => (
              <article key={item.step} className="about-soft-story-item">
                <span>{item.step}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-soft-section about-soft-values">
        <div className="about-soft-section-head">
          <h2>La façon JC Hub.</h2>
          <p>Une ligne éditoriale claire pour éviter l'effet “template vide”.</p>
        </div>

        <div className="about-soft-values-grid">
          {values.map((value) => (
            <article key={value.title} className="about-soft-value-card">
              <span>{value.tag}</span>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-soft-section about-soft-audience">
        <div className="about-soft-section-head">
          <h2>Pour qui ?</h2>
          <p>JC Hub s'adresse aux personnes qui veulent comprendre et avancer sans se sentir perdues.</p>
        </div>

        <div className="about-soft-audience-panel">
          {audiences.map((item) => (
            <article key={item.title} className="about-soft-audience-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-soft-section about-soft-topics" id="topics">
        <div className="about-soft-section-head">
          <h2>Ce qu'on trouve sur JC Hub.</h2>
          <p>Des catégories pensées comme des besoins, pas comme des mots-clés froids.</p>
        </div>

        <div className="about-soft-topic-grid">
          {topics.map((topic) => (
            <div key={topic.title} className="about-soft-topic">
              <strong>{topic.title}</strong>
              <span>{topic.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about-soft-section about-soft-ecosystem">
        <div className="about-soft-ecosystem-panel">
          <div>
            <p className="about-soft-kicker">Écosystème</p>
            <h2>JC Hub avance avec d'autres projets.</h2>
            <p>
              Jessy pilote aussi Baruck-Online. On en parle sobrement: comme un projet parallèle,
              pas comme un bloc trop spécialisé.
            </p>
          </div>
          <div className="about-soft-ecosystem-list">
            {ecosystem.map((item) => (
              <article key={item.title} className="about-soft-ecosystem-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-soft-section about-soft-cta" id="contact">
        <div className="about-soft-cta-panel">
          <div>
            <h2>Continuer avec JC Hub.</h2>
            <p>La page About finit sur une action simple: lire, contacter ou rejoindre la suite.</p>
          </div>
          <div className="about-soft-cta-links">
            <Link to="/blog">Lire les articles</Link>
            <Link className="about-soft-secondary" to="/contact">
              Contact
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
