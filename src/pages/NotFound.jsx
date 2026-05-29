import { Link } from 'react-router-dom';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/ErrorPages.css';

export default function NotFound() {
  usePageSeo({
    title: 'Page introuvable',
    description: 'Cette page JC Hub est introuvable. Reviens à l’accueil, lance une recherche ou explore les articles.',
    image: '/android-chrome-512x512.png'
  });

  return (
    <div className="error-page error-page-404">
      <div className="error-page-orbit error-page-orbit-one" aria-hidden="true" />
      <div className="error-page-orbit error-page-orbit-two" aria-hidden="true" />

      <section className="error-page-shell">
        <div className="error-page-copy">
          <p className="error-page-kicker">Erreur 404</p>
          <h1>
            Cette page s’est <span>égarée.</span>
          </h1>
          <p>
            On a fouillé le carnet, retourné les tiroirs et demandé au petit robot:
            cette adresse ne mène plus à une page disponible.
          </p>

          <div className="error-page-actions">
            <Link to="/" className="error-page-button error-page-button-primary">
              Retour à l'accueil
            </Link>
            <Link to="/search" className="error-page-button error-page-button-secondary">
              Lancer une recherche
            </Link>
            <Link to="/blog" className="error-page-button error-page-button-ghost">
              Voir les articles
            </Link>
          </div>
        </div>

        <div className="error-page-stage" aria-hidden="true">
          <div className="error-page-plate">
            <div className="error-page-number">
              <span>4</span>
              <span>0</span>
              <span>4</span>
            </div>
          </div>

          <div className="error-page-robot">
            <div className="error-page-robot-antenna" />
            <div className="error-page-robot-head">
              <span />
              <span />
            </div>
            <div className="error-page-robot-body">
              <i />
            </div>
          </div>

          <div className="error-page-sticker error-page-sticker-map">Carte perdue</div>
          <div className="error-page-sticker error-page-sticker-pin">?</div>
          <div className="error-page-cube error-page-cube-one" />
          <div className="error-page-cube error-page-cube-two" />
          <div className="error-page-ring" />
        </div>
      </section>
    </div>
  );
}
