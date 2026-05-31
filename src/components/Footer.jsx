import { useState } from 'react';
import { Link } from 'react-router-dom';
import logoSvg from '../assets/jc-hub-logo.svg';
import '../styles/Footer.css';

const navigationLinks = [
  ['Accueil', '/'],
  ['Blog', '/blog'],
  ['Bibliothèque', '/ebooks'],
  ['Catégories', '/categories'],
  ['À propos', '/about'],
  ['Contact', '/contact']
];

const categoryLinks = [
  ['Technologies', '/search?q=technologies'],
  ['Cybersécurité', '/search?q=cybers%C3%A9curit%C3%A9'],
  ['Développement Web', '/search?q=d%C3%A9veloppement%20web'],
  ['Design & UX', '/search?q=design%20ux'],
  ['Marketing Digital', '/search?q=marketing%20digital'],
  ['Data & IA', '/search?q=intelligence%20artificielle']
];

const resourceLinks = [
  ['Guides', '/blog'],
  ['Tutoriels', '/blog?category=Tutoriels'],
  ['Livres blancs', '/ebooks'],
  ['Outils', '/blog?category=Outils'],
  ['Vidéos', '/blog'],
  ['Ressources gratuites', '/ebooks']
];

const aboutLinks = [
  ['Notre mission', '/about'],
  ['Équipe', '/about'],
  ['Partenaires', '/contact'],
  ['Mentions légales', '/res/mentions-legales'],
  ['Politique de confidentialité', '/res/confidentialite']
];

function FooterColumn({ title, links, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`site-footer-column ${isOpen ? 'site-footer-column-open' : ''}`}>
      <button
        type="button"
        className="site-footer-column-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{title}</span>
        <i className="fas fa-chevron-down"></i>
      </button>
      <div className="site-footer-links">
        {links.map(([label, to]) => (
          <Link key={label} to={to}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-shell">
        <section className="site-footer-main" aria-label="Pied de page JC Hub">
          <div className="site-footer-brand">
            <Link to="/" className="site-footer-logo">
              <img src={logoSvg} alt="JC Hub Logo" loading="lazy" decoding="async" />
              <span>
                <strong>JC Hub</strong>
                <small>Blog & Bibliothèque en ligne</small>
              </span>
            </Link>
            <p>
              Blog et bibliothèque en ligne dédiés à la culture tech, aux compétences numériques et aux ressources
              utiles pour apprendre simplement.
            </p>
            <div className="site-footer-socials">
              <a href="https://x.com/jessyNgnambongo" target="_blank" rel="noopener noreferrer" aria-label="X JC Hub">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://www.linkedin.com/in/jessy-ngnambongo-904b50401/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn JC Hub">
                <i className="fab fa-linkedin-in"></i>
              </a>
              <a href="https://github.com/Jescarter09/jc-hub" target="_blank" rel="noopener noreferrer" aria-label="GitHub JC Hub">
                <i className="fab fa-github"></i>
              </a>
              <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube JC Hub">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>

          <FooterColumn title="Navigation" links={navigationLinks} defaultOpen />
          <FooterColumn title="Catégories" links={categoryLinks} />
          <FooterColumn title="Ressources" links={resourceLinks} />
          <FooterColumn title="À propos" links={aboutLinks} />
        </section>

        <div className="site-footer-bottom">
          <p>© {currentYear} JC Hub - Tous droits réservés</p>
          <div>
            <Link to="/res/mentions-legales">Mentions légales</Link>
            <Link to="/res/confidentialite">Confidentialité</Link>
            <Link to="/res/cookies">Conditions d’utilisation</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
