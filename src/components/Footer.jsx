import { Link } from 'react-router-dom';
import logoSvg from '../assets/jc-hub-logo.svg';
import { blogPosts } from '../data/blogPosts';
import { subscribeBlogMetricsMap } from '../services/blogInteractionsService';
import { useEffect, useMemo, useState } from 'react';
import '../styles/Footer.css';

const formatNumber = (value) => new Intl.NumberFormat('fr-FR').format(Math.max(0, Number(value) || 0));

const getCategoryLabel = (category) => {
  const normalized = String(category || '').trim().toLowerCase();
  const labels = {
    tutoriels: 'Tutoriels',
    securite: 'Sécurité',
    actualites: 'Actualités',
    outils: 'Outils',
    windows: 'Windows',
    technologie: 'Numérique'
  };

  return labels[normalized] || category;
};

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const articleSlugs = useMemo(() => blogPosts.map((post) => post.slug).filter(Boolean), []);

  const { topCategories, totalArticles, totalViews, totalCategories } = useMemo(() => {
    const categoryCounts = blogPosts.reduce((acc, post) => {
      const category = String(post?.category || '').trim();
      if (!category) return acc;
      acc.set(category, (acc.get(category) || 0) + 1);
      return acc;
    }, new Map());

    const topCategoriesResult = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));

    const totals = blogPosts.reduce(
      (acc, post) => {
        const baselineViews = Number(post?.views) || 0;
        const realtimeViews = Number(metricsBySlug[post.slug]?.viewsCount);
        acc.views += Number.isFinite(realtimeViews) ? Math.max(baselineViews, realtimeViews) : baselineViews;
        return acc;
      },
      { views: 0 }
    );

    return {
      topCategories: topCategoriesResult,
      totalArticles: blogPosts.length,
      totalViews: totals.views,
      totalCategories: categoryCounts.size
    };
  }, [metricsBySlug]);

  useEffect(() => {
    const unsubscribe = subscribeBlogMetricsMap(articleSlugs, (nextMap) => {
      setMetricsBySlug(nextMap);
    });

    return () => unsubscribe();
  }, [articleSlugs]);

  useEffect(() => {
    let active = true;

    const loadSubscribersCount = async () => {
      try {
        const response = await fetch('/api/newsletter-stats');
        if (!response.ok) return;

        const payload = await response.json();
        const nextCount = Math.max(0, Math.floor(Number(payload?.subscribers) || 0));
        if (active) {
          setSubscribersCount(nextCount);
        }
      } catch {
        // Keep default fallback value when endpoint is unavailable.
      }
    };

    loadSubscribersCount();
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="site-footer">
      <div className="site-footer-shell">
        <section className="site-footer-main" aria-label="Pied de page JC Hub">
          <div className="site-footer-brand-card">
            <Link to="/" className="site-footer-logo">
              <img src={logoSvg} alt="JC Hub Logo" loading="lazy" decoding="async" />
              <span>JC Hub</span>
            </Link>

            <p className="site-footer-description">
              Un espace simple pour lire, comprendre et avancer dans le numérique sans se perdre dans
              le jargon. Articles utiles, guides pratiques et idées claires, au même endroit.
            </p>

            <div className="site-footer-stats" aria-label="Statistiques JC Hub">
              <span>{formatNumber(totalArticles)} article{totalArticles > 1 ? 's' : ''}</span>
              <span>{formatNumber(totalViews)} vues</span>
              <span>{formatNumber(subscribersCount)} abonné{subscribersCount > 1 ? 's' : ''}</span>
              <span>{formatNumber(totalCategories)} catégorie{totalCategories > 1 ? 's' : ''}</span>
            </div>

            <div className="site-footer-socials">
              <a
                href="https://x.com/jessyNgnambongo"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Profil X de Jessy Ngnambongo"
              >
                <i className="fab fa-twitter"></i>
              </a>
              <a
                href="https://github.com/Jescarter09/jc-hub"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Repository GitHub JC Hub"
              >
                <i className="fab fa-github"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/jessy-ngnambongo-904b50401/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Profil LinkedIn de Jessy Ngnambongo"
              >
                <i className="fab fa-linkedin"></i>
              </a>
            </div>
          </div>

          <div className="site-footer-column">
            <h4>Navigation</h4>
            <Link to="/">Accueil</Link>
            <Link to="/about">About</Link>
            <Link to="/blog">Article</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="site-footer-column">
            <h4>Catégories</h4>
            {topCategories.map((category) => (
              <Link
                key={category.name}
                to={`/blog?${new URLSearchParams({ category: category.name }).toString()}`}
              >
                {getCategoryLabel(category.name)}
                <span>{category.count}</span>
              </Link>
            ))}
            <Link to="/blog">Toutes les catégories</Link>
          </div>

          <div className="site-footer-column">
            <h4>Ressources</h4>
            <Link to="/res/mentions-legales">Mentions légales</Link>
            <Link to="/res/confidentialite">Confidentialité</Link>
            <Link to="/res/cookies">Cookies</Link>
            <Link to="/res/faq">FAQ</Link>
          </div>
        </section>

        <section className="site-footer-cta" aria-label="Invitation JC Hub">
          <div>
            <p>Pour continuer tranquillement</p>
            <h3>Lis un article maintenant, garde les ressources sous la main.</h3>
          </div>
          <div className="site-footer-cta-actions">
            <Link to="/blog">Voir les articles</Link>
            <Link to="/res/faq">Voir les ressources</Link>
          </div>
        </section>

        <div className="site-footer-bottom">
          <p>&copy; {currentYear} JCHUB - Jessy Carter Ngnambongo. Tous droits réservés.</p>
          <div>
            <span>Guides simples</span>
            <span>Lecture utile</span>
            <span>Design maison</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
