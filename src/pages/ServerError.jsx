import { Link } from 'react-router-dom';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/ErrorPages.css';

export default function ServerError({ boundary = false }) {
  usePageSeo({
    title: 'Erreur serveur',
    description:
      'Une erreur technique est survenue sur JC Hub. Reviens à l’accueil, réessaie la page ou contacte le support.',
    image: '/android-chrome-512x512.png',
    path: '/500'
  });

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="error-page error-page-500">
      <div className="error-page-orbit error-page-orbit-one" aria-hidden="true" />
      <div className="error-page-orbit error-page-orbit-two" aria-hidden="true" />

      <section className="error-page-shell">
        <div className="error-page-copy">
          <p className="error-page-kicker">Erreur 500</p>
          <h1>
            Le moteur a besoin <span>d’une pause.</span>
          </h1>
          <p>
            {boundary
              ? "Une partie de l’application a rencontré un souci inattendu."
              : "Le serveur ou l’application a rencontré un souci temporaire."}{' '}
            Tu peux réessayer, revenir à l’accueil ou nous écrire si le problème continue.
          </p>

          <div className="error-page-actions">
            <button type="button" onClick={handleReload} className="error-page-button error-page-button-primary">
              Réessayer
            </button>
            <Link to="/" className="error-page-button error-page-button-secondary">
              Retour à l'accueil
            </Link>
            <Link to="/contact" className="error-page-button error-page-button-ghost">
              Signaler le souci
            </Link>
          </div>
        </div>

        <div className="error-page-stage error-page-stage-500" aria-hidden="true">
          <div className="error-page-plate error-page-plate-alert">
            <div className="error-page-number">
              <span>5</span>
              <span>0</span>
              <span>0</span>
            </div>
          </div>

          <div className="error-page-server">
            <div className="error-page-server-lights">
              <span />
              <span />
              <span />
            </div>
            <div className="error-page-server-slot" />
            <div className="error-page-server-slot" />
          </div>

          <div className="error-page-sticker error-page-sticker-tool">Maintenance</div>
          <div className="error-page-sticker error-page-sticker-bolt">!</div>
          <div className="error-page-cube error-page-cube-one" />
          <div className="error-page-cube error-page-cube-two" />
          <div className="error-page-ring" />
        </div>
      </section>
    </div>
  );
}
