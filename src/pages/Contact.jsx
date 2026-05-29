import { Link } from 'react-router-dom';
import ContactForm from '../components/ContactForm';
import { usePageSeo } from '../hooks/usePageSeo';
import contactHeaderImage from '../assets/contact.webp';
import '../styles/Contact.css';

const contactHighlights = [
  'Réponse sous 24-48h',
  'Partenariat & collaboration',
  'Corrections de contenu prioritaires'
];

const contactReasons = [
  {
    title: 'Une collaboration',
    text: 'Proposer un partenariat, une idée de projet ou une demande autour de JC Hub.'
  },
  {
    title: 'Un sujet à traiter',
    text: "Suggérer un article, un tutoriel ou une question que tu aimerais voir expliquée simplement."
  },
  {
    title: 'Une correction',
    text: 'Signaler une erreur, une précision manquante ou une amélioration utile sur un contenu.'
  }
];

const steps = [
  {
    value: '01',
    title: 'Tu écris',
    text: 'Un message clair avec le contexte et ce que tu attends.'
  },
  {
    value: '02',
    title: 'Je lis',
    text: 'Je regarde la demande et je vérifie comment y répondre utilement.'
  },
  {
    value: '03',
    title: 'On avance',
    text: 'Je réponds avec une suite simple: correction, échange ou prochaine action.'
  }
];

export default function Contact() {
  usePageSeo({
    title: 'Contact',
    description:
      'Contacte JC Hub pour proposer un sujet, signaler une correction, demander une précision ou discuter d’une collaboration.',
    image: contactHeaderImage,
    path: '/contact'
  });

  return (
    <div className="contact-soft">
      <section className="contact-soft-section contact-soft-hero">
        <div className="contact-soft-hero-grid">
          <div className="contact-soft-hero-copy">
            <p className="contact-soft-kicker">Contact JC Hub</p>
            <h1>
              Une question, une idée, <span>un message simple.</span>
            </h1>
            <p className="contact-soft-lead">
              Utilise cette page pour proposer un sujet, signaler une correction, discuter d'une
              collaboration ou poser une question autour de JC Hub. Pour signaler une erreur ou demander
              une correction, tu peux aussi écrire à{' '}
              <a className="contact-soft-email-link" href="mailto:jchubassistance@gmail.com">
                jchubassistance@gmail.com
              </a>.
            </p>
            <div className="contact-soft-actions">
              <a href="#contact-form" className="contact-soft-button contact-soft-button-primary">
                Écrire maintenant
              </a>
              <Link to="/blog" className="contact-soft-button contact-soft-button-secondary">
                Voir les articles
              </Link>
            </div>
          </div>

          <article className="contact-soft-visual-card">
            <div className="contact-soft-visual">
              <img
                src={contactHeaderImage}
                alt="Illustration contact JC Hub"
                fetchPriority="high"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.src = '/jchub_monogram.png';
                }}
              />
              <span>Message reçu avec soin</span>
            </div>
            <div className="contact-soft-visual-body">
              <h2>Un contact plus humain.</h2>
              <p>
                Pas besoin d'un long discours: explique ton besoin, ajoute le contexte important,
                et on garde une suite claire.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="contact-soft-section contact-soft-strip" aria-label="Informations rapides">
        {contactHighlights.map((item) => (
          <div key={item} className="contact-soft-stat">
            <strong>{item}</strong>
            <span>Un repère simple avant d'envoyer ton message.</span>
          </div>
        ))}
      </section>

      <section className="contact-soft-section contact-soft-main" id="contact-form">
        <aside className="contact-soft-side">
          <p className="contact-soft-kicker">Avant d'écrire</p>
          <h2>Ce que tu peux envoyer ici.</h2>
          <div className="contact-soft-reasons">
            {contactReasons.map((item) => (
              <article key={item.title} className="contact-soft-reason">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </aside>

        <div className="contact-soft-form-panel">
          <div className="contact-soft-form-head">
            <p className="contact-soft-kicker">Formulaire</p>
            <h2>Parlons de ton besoin.</h2>
            <p>
              Remplis les champs ci-dessous, ou écris directement à{' '}
              <a className="contact-soft-email-link" href="mailto:jchubassistance@gmail.com">
                jchubassistance@gmail.com
              </a>
              . Le message sera transmis pour le suivi.
            </p>
          </div>
          <ContactForm source="contact-page" />
        </div>
      </section>

      <section className="contact-soft-section contact-soft-steps">
        <div className="contact-soft-section-head">
          <h2>Après l'envoi.</h2>
          <p>Un parcours volontairement simple pour éviter les échanges flous.</p>
        </div>

        <div className="contact-soft-steps-grid">
          {steps.map((step) => (
            <article key={step.value} className="contact-soft-step">
              <span>{step.value}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-soft-section contact-soft-cta">
        <div className="contact-soft-cta-panel">
          <div>
            <p className="contact-soft-kicker">Raccourci</p>
            <h2>Tu veux juste continuer à lire ?</h2>
            <p>Tu peux retourner aux articles, ou découvrir la page About si tu veux comprendre la mission de JC Hub.</p>
          </div>
          <div className="contact-soft-cta-links">
            <Link to="/blog">Lire les articles</Link>
            <Link className="contact-soft-secondary" to="/about">
              Découvrir About
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
