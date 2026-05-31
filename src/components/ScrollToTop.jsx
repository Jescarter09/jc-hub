import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './ScrollToTop.css';

export default function ScrollToTop() {
  const { hash, pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (hash) {
      const frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo(0, 0);
        }
      });

      return () => window.cancelAnimationFrame(frame);
    }

    window.scrollTo(0, 0);
    return undefined;
  }, [hash, pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 420);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      className={`back-to-top ${isVisible ? 'back-to-top-visible' : ''}`}
      onClick={handleBackToTop}
      aria-label="Retour en haut"
    >
      <i className="fas fa-arrow-up"></i>
    </button>
  );
}
