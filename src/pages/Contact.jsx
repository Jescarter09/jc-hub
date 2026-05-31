import { Link } from 'react-router-dom';
import ContactForm from '../components/ContactForm';
import { useNewsletterForm } from '../hooks/useNewsletterForm';
import { usePageSeo } from '../hooks/usePageSeo';
import contactHeaderImage from '../assets/contact.webp';
import '../styles/Contact.css';

const contactHighlights = [
  {
    icon: 'far fa-clock',
    title: 'Réponse rapide',
    text: 'Nous répondons sous 24 à 48h ouvrées.'
  },
  {
    icon: 'fas fa-headset',
    title: 'Équipe à l’écoute',
    text: 'Une équipe dédiée pour vous accompagner.'
  },
  {
    icon: 'fas fa-shield-halved',
    title: 'Service fiable',
    text: 'Vos données sont traitées avec confidentialité.'
  }
];

const contactDetails = [
  {
    icon: 'far fa-envelope',
    title: 'Email',
    text: 'jchubassistance@gmail.com',
    href: 'mailto:jchubassistance@gmail.com'
  },
  {
    icon: 'fas fa-phone',
    title: 'Téléphone',
    text: 'Réponse via formulaire',
    href: '#contact-form'
  },
  {
    icon: 'fas fa-location-dot',
    title: 'Adresse',
    text: 'Plateforme numérique en ligne',
    href: '#contact-form'
  },
  {
    icon: 'far fa-clock',
    title: 'Horaires',
    text: 'Lun - Ven : 9h00 - 18h00',
    href: '#contact-form'
  }
];

const faqItems = [
  {
    question: 'Quel est le délai de réponse ?',
    answer: 'Nous nous efforçons de répondre à tous les messages sous 24 à 48h ouvrées.'
  },
  {
    question: 'Comment soumettre un article ou une ressource ?',
    answer: 'Vous pouvez envoyer votre proposition via le formulaire de contact en sélectionnant le sujet approprié.'
  },
  {
    question: 'Proposez-vous des partenariats ?',
    answer: 'Oui, nous sommes ouverts aux collaborations et partenariats. Contactez-nous via le formulaire ou par e-mail.'
  },
  {
    question: 'Puis-je signaler un problème sur le site ?',
    answer: 'Bien sûr. Sélectionnez le sujet “Signalement d’un problème” et décrivez-nous la situation.'
  }
];

export default function Contact() {
  const newsletter = useNewsletterForm({ source: 'contact-page' });
  const newsletterFeedbackClassName =
    newsletter.feedback.kind === 'error'
      ? 'contact-newsletter-feedback contact-newsletter-feedback-error'
      : newsletter.feedback.kind === 'info'
        ? 'contact-newsletter-feedback contact-newsletter-feedback-info'
        : 'contact-newsletter-feedback contact-newsletter-feedback-success';

  usePageSeo({
    title: 'Contact',
    description:
      'Contacte JC Hub pour proposer un sujet, signaler une correction, demander une précision ou discuter d’une collaboration.',
    image: contactHeaderImage,
    path: '/contact'
  });

  return (
    <div className="contact-soft">
      <section className="contact-soft-section contact-hero">
        <div className="contact-hero-copy">
          <p className="contact-kicker">Contactez-nous</p>
          <h1>
            Nous sommes là pour <span>vous aider</span>
          </h1>
          <p>
            Une question, une suggestion ou un besoin de partenariat ? N’hésitez pas à nous écrire,
            notre équipe vous répondra dans les plus brefs délais.
          </p>

          <div className="contact-highlights" aria-label="Points forts du contact JC Hub">
            {contactHighlights.map((item) => (
              <article key={item.title}>
                <i className={item.icon}></i>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="contact-hero-visual">
          <img src={contactHeaderImage} alt="JC Hub - illustration contact avec enveloppe et ordinateur" />
        </div>
      </section>

      <section className="contact-soft-section contact-main" id="contact-form">
        <div className="contact-form-panel">
          <div className="contact-panel-heading">
            <h2>Envoyez-nous un message</h2>
            <p>Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.</p>
          </div>
          <ContactForm source="contact-page" showSubject />
        </div>

        <aside className="contact-side">
          <section className="contact-info-card">
            <h2>Nos coordonnées</h2>
            <p>Vous pouvez également nous contacter directement via les moyens suivants.</p>

            <div className="contact-detail-list">
              {contactDetails.map((item) => (
                <a key={item.title} href={item.href}>
                  <i className={item.icon}></i>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="contact-partner-card">
            <div>
              <h2>Vous êtes une organisation ou une entreprise ?</h2>
              <p>Contactez-nous pour des partenariats, des collaborations ou des demandes spécifiques.</p>
              <a href="#contact-form">
                <i className="far fa-handshake"></i>
                Demander un partenariat
              </a>
            </div>
            <span aria-hidden="true">
              <i className="fas fa-handshake"></i>
            </span>
          </section>
        </aside>
      </section>

      <section className="contact-soft-section contact-faq">
        <div className="contact-section-heading">
          <h2>Questions fréquentes</h2>
          <p>Retrouvez les réponses aux questions les plus courantes.</p>
        </div>

        <div className="contact-faq-grid">
          {faqItems.map((item) => (
            <details key={item.question} className="contact-faq-item">
              <summary>
                {item.question}
                <i className="fas fa-chevron-down"></i>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="contact-soft-section contact-newsletter" id="newsletter">
        <div className="contact-newsletter-copy">
          <i className="far fa-envelope"></i>
          <div>
            <h2>Restez à jour avec JC Hub</h2>
            <p>Recevez nos derniers articles, guides et actualités directement dans votre boîte mail.</p>
          </div>
        </div>

        <form onSubmit={newsletter.handleSubmit} className="contact-newsletter-form">
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
