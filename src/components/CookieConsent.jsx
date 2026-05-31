import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const COOKIE_NAME = 'jchub_cookie_consent';
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

const readCookie = () => {
  if (typeof document === 'undefined') return 'unknown';

  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${COOKIE_NAME}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : 'unknown';
};

const writeCookie = (value) => {
  if (typeof document === 'undefined') return;

  const secureFlag =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    value
  )}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secureFlag}`;
};

const readConsent = () => {
  if (typeof window === 'undefined') return 'unknown';
  return readCookie();
};

const writeConsent = (value) => {
  if (typeof window === 'undefined') return;

  writeCookie(value);
};

export default function CookieConsent() {
  const [consent, setConsent] = useState('loading');

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  const handleChoice = (value) => {
    writeConsent(value);
    setConsent(value);
  };

  if (consent !== 'unknown') {
    return null;
  }

  return (
    <section className="cookie-consent" role="dialog" aria-label="Choix des cookies">
      <div className="cookie-consent-icon" aria-hidden="true">
        <i className="fas fa-cookie-bite"></i>
      </div>

      <div className="cookie-consent-copy">
        <p className="cookie-consent-kicker">Confidentialité</p>
        <h2>Une navigation plus claire.</h2>
        <p>
          JC Hub utilise un vrai cookie navigateur pour mémoriser ton choix. Tu peux accepter les préférences utiles
          ou garder uniquement l’essentiel.
        </p>
      </div>

      <div className="cookie-consent-actions">
        <button type="button" onClick={() => handleChoice('accepted')}>
          Accepter
        </button>
        <button type="button" className="cookie-consent-secondary" onClick={() => handleChoice('necessary')}>
          Nécessaires seulement
        </button>
        <Link to="/res/cookies">En savoir plus</Link>
      </div>
    </section>
  );
}
