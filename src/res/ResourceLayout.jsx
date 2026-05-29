import { NavLink } from 'react-router-dom';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/Resources.css';

const resourceLinks = [
  { to: '/res/mentions-legales', label: 'Mentions légales' },
  { to: '/res/confidentialite', label: 'Confidentialité' },
  { to: '/res/cookies', label: 'Cookies' },
  { to: '/res/faq', label: 'FAQ' }
];

export default function ResourceLayout({ title, subtitle, lastUpdated, children }) {
  usePageSeo({
    title,
    description:
      subtitle || 'Ressource JC Hub pour comprendre les informations utiles, les données, les cookies et les contacts.',
    image: '/android-chrome-512x512.png'
  });

  return (
    <div className="res-page">
      <div className="res-orb res-orb-one" aria-hidden="true" />
      <div className="res-orb res-orb-two" aria-hidden="true" />

      <section className="res-head">
        <div className="res-shell res-head-grid">
          <div className="res-head-main">
            <p className="res-kicker">Ressources utiles</p>
            <h1>{title}</h1>
            {subtitle && <p className="res-subtitle">{subtitle}</p>}
            <div className="res-head-meta" aria-label="Informations rapides">
              <span>Lecture claire</span>
              <span>Version simple</span>
              <span>À jour</span>
            </div>
          </div>

          <aside className="res-head-side" aria-label="Résumé de la page">
            <p className="res-side-title">Repères</p>
            <div className="res-side-list">
              <div className="res-side-item">
                <span>Version</span>
                <strong>2026.05</strong>
              </div>
              <div className="res-side-item">
                <span>Dernière mise à jour</span>
                <strong>{lastUpdated}</strong>
              </div>
              <div className="res-side-item">
                <span>Couverture</span>
                <strong>Infos légales, aide et données</strong>
              </div>
            </div>
            <p className="res-side-note">
              Des pages pratiques pour comprendre rapidement les règles et contacter JC Hub si besoin.
            </p>
          </aside>
        </div>
      </section>

      <section className="res-main">
        <div className="res-shell">
          <nav className="res-tabs" aria-label="Navigation ressources">
            {resourceLinks.map((item, index) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `res-tab ${isActive ? 'res-tab-active' : ''}`}
              >
                <span className="res-tab-index">{String(index + 1).padStart(2, '0')}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="res-content">{children}</div>
        </div>
      </section>
    </div>
  );
}
