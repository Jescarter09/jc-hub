import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAdminView,
  getStoredAdminCredentials,
  loginAdmin,
  logoutAdmin
} from '../services/adminService';
import { usePageSeo } from '../hooks/usePageSeo';
import '../styles/Admin.css';

const tabs = [
  { id: 'overview', label: 'Vue globale', icon: 'fas fa-chart-line' },
  { id: 'contacts', label: 'Messages', icon: 'far fa-envelope' },
  { id: 'subscribers', label: 'Newsletter', icon: 'fas fa-users' },
  { id: 'books', label: 'Livres', icon: 'fas fa-book-open' },
  { id: 'views', label: 'Vues', icon: 'far fa-eye' },
  { id: 'reports', label: 'Rapports', icon: 'fas fa-clipboard-list' }
];

function formatDate(value) {
  if (!value) return 'Non défini';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Non défini';
  return date.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function formatNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('fr-FR');
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  return `${Math.round(safeSeconds / 60)} min`;
}

function MetricBars({ items = [] }) {
  const maxValue = Math.max(...items.map((item) => Number(item.value) || 0), 1);

  return (
    <div className="admin-metric-bars">
      {items.map((item) => {
        const value = Math.max(0, Number(item.value) || 0);
        const width = Math.max(4, Math.round((value / maxValue) * 100));

        return (
          <div key={item.label} className="admin-metric-bar-row">
            <div>
              <span>{item.label}</span>
              <strong>{formatNumber(value)}</strong>
            </div>
            <div className="admin-metric-track" aria-hidden="true">
              <span style={{ width: `${width}%` }}></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatGrid({ stats = {} }) {
  const items = [
    ['Livres', stats.books, 'fas fa-book-open', 'purple'],
    ['Visibles', stats.visibleBooks, 'fas fa-eye', 'blue'],
    ['Vues livres', stats.bookViews, 'fas fa-book-reader', 'cyan'],
    ['Vues articles', stats.articleViews, 'far fa-newspaper', 'pink'],
    ['Programmés', stats.scheduledBooks, 'far fa-calendar-check', 'green'],
    ['À vérifier', stats.incompleteBooks, 'fas fa-triangle-exclamation', 'orange'],
    ['Messages', stats.contacts, 'far fa-envelope', 'lime'],
    ['Abonnés', stats.subscribers, 'fas fa-users', 'blue'],
    ['Rapports', stats.reports, 'fas fa-clipboard-list', 'purple']
  ];

  return (
    <div className="admin-stat-grid">
      {items.map(([label, value, icon, tone]) => (
        <article key={label} className={`admin-stat-card admin-stat-card-${tone}`}>
          <i className={icon}></i>
          <span>{label}</span>
          <strong>{formatNumber(value)}</strong>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="admin-empty">
      <i className="far fa-folder-open"></i>
      <p>{label}</p>
    </div>
  );
}

function ContactsList({ items = [] }) {
  if (!items.length) return <EmptyState label="Aucun message pour le moment." />;

  return (
    <div className="admin-list">
      {items.map((item) => (
        <article key={item.id} className="admin-list-item">
          <div>
            <strong>{item.subject || 'Message sans sujet'}</strong>
            <span>{item.name || 'Nom inconnu'} · {item.email}</span>
          </div>
          <p>{item.message}</p>
          <small>{formatDate(item.createdAt)} · {item.status || 'new'}</small>
        </article>
      ))}
    </div>
  );
}

function SubscribersList({ items = [] }) {
  if (!items.length) return <EmptyState label="Aucun abonné trouvé." />;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Statut</th>
            <th>Source</th>
            <th>Inscription</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.email}</td>
              <td>{item.status || 'active'}</td>
              <td>{item.source || 'unknown'}</td>
              <td>{formatDate(item.subscribedAt || item.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BooksList({ payload = {} }) {
  const books = payload.books || [];
  if (!books.length) return <EmptyState label="Aucun livre à afficher." />;

  return (
    <div className="admin-list">
      {books.map((book) => (
        <article key={book.id} className="admin-book-row">
          <div>
            <strong>{book.title}</strong>
            <span>{book.author} · {book.category}</span>
          </div>
          <div className="admin-book-meta">
            <span className={`admin-pill admin-pill-${book.status}`}>{book.status}</span>
            <small>
              <i className="far fa-eye"></i>
              {' '}{formatNumber(book.viewsCount)} vues
            </small>
            <small>{formatDate(book.publishAt)}</small>
          </div>
          {book.issues?.length > 0 && (
            <p>À vérifier : {book.issues.join(', ')}</p>
          )}
          {book.detailPath && (
            <Link to={book.detailPath}>Voir sur le site</Link>
          )}
        </article>
      ))}
    </div>
  );
}

function ViewsList({ items = [], type = 'book' }) {
  if (!items.length) return <EmptyState label={type === 'article' ? 'Aucune vue article trouvée.' : 'Aucune vue livre trouvée.'} />;

  return (
    <div className="admin-list admin-views-list">
      {items.map((item, index) => (
        <article key={item.id || item.slug} className="admin-view-row">
          <span className="admin-rank">{index + 1}</span>
          <div>
            <strong>{item.title}</strong>
            <span>{item.category || (type === 'article' ? 'Article' : 'Livre')}</span>
          </div>
          <div className="admin-view-metrics">
            <strong>{formatNumber(item.viewsCount)}</strong>
            <small>vues</small>
          </div>
          {type === 'article' && (
            <div className="admin-view-extra">
              <small>{formatNumber(item.likesCount)} likes</small>
              <small>{formatNumber(item.savesCount)} sauvegardes</small>
              <small>{formatDuration(item.avgReadSeconds)} lecture moy.</small>
            </div>
          )}
          {item.detailPath && <Link to={item.detailPath}>Voir</Link>}
        </article>
      ))}
    </div>
  );
}

function ViewsDashboard({ payload = {} }) {
  const stats = payload.stats || {};
  const metricItems = [
    { label: 'Articles', value: stats.articleViews },
    { label: 'Livres', value: stats.bookViews },
    { label: 'Total', value: stats.totalViews }
  ];

  return (
    <div className="admin-panel-grid">
      <section className="admin-panel admin-panel-wide">
        <div className="admin-section-head">
          <div>
            <span className="admin-panel-eyebrow">Analytics</span>
            <h2>Vues du site</h2>
          </div>
          <small>Temps réel</small>
        </div>
        <div className="admin-stat-grid admin-stat-grid-compact">
          {[
            ['Total vues', stats.totalViews, 'fas fa-chart-simple', 'purple'],
            ['Articles', stats.articleViews, 'far fa-newspaper', 'pink'],
            ['Livres', stats.bookViews, 'fas fa-book-reader', 'cyan']
          ].map(([label, value, icon, tone]) => (
            <article key={label} className={`admin-stat-card admin-stat-card-${tone}`}>
              <i className={icon}></i>
              <span>{label}</span>
              <strong>{formatNumber(value)}</strong>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-panel admin-panel-wide">
        <div className="admin-section-head">
          <div>
            <span className="admin-panel-eyebrow">Répartition</span>
            <h2>Lecture du trafic</h2>
          </div>
        </div>
        <MetricBars items={metricItems} />
      </section>
      <section className="admin-panel">
        <h2>Articles les plus vus</h2>
        <ViewsList items={payload.articles || []} type="article" />
      </section>
      <section className="admin-panel">
        <h2>Livres les plus vus</h2>
        <ViewsList items={payload.books || []} type="book" />
      </section>
    </div>
  );
}

function ReportsList({ items = [] }) {
  if (!items.length) return <EmptyState label="Aucun rapport automatique trouvé." />;

  return (
    <div className="admin-list">
      {items.map((report) => (
        <article key={report.id} className="admin-list-item">
          <div>
            <strong>Rapport du {formatDate(report.generatedAt)}</strong>
            <span>
              Livres {report.books?.total || 0} · Messages 7j {report.contacts?.last7Days || 0} · Abonnés {report.newsletter?.total || 0}
            </span>
          </div>
          <p>
            Actions : {report.actions?.scheduledBooks || 0} livres planifiés,
            {' '}{report.actions?.repairedBooks || 0} réparés.
          </p>
          <small>Email : {report.email?.sent ? 'envoyé' : report.email?.reason || 'non envoyé'}</small>
        </article>
      ))}
    </div>
  );
}

function Overview({ data }) {
  const stats = data?.stats || {};
  const metricItems = [
    { label: 'Vues articles', value: stats.articleViews },
    { label: 'Vues livres', value: stats.bookViews },
    { label: 'Messages', value: stats.contacts },
    { label: 'Abonnés', value: stats.subscribers }
  ];

  return (
    <div className="admin-panel-grid">
      <section className="admin-panel admin-panel-wide">
        <div className="admin-section-head">
          <div>
            <span className="admin-panel-eyebrow">Overview</span>
            <h2>Indicateurs</h2>
          </div>
          <small>Données du catalogue</small>
        </div>
        <StatGrid stats={stats} />
      </section>
      <section className="admin-panel admin-panel-wide">
        <div className="admin-section-head">
          <div>
            <span className="admin-panel-eyebrow">Traffic</span>
            <h2>Vue synthétique</h2>
          </div>
        </div>
        <MetricBars items={metricItems} />
      </section>
      <section className="admin-panel">
        <h2>Derniers messages</h2>
        <ContactsList items={data?.latestContacts || []} />
      </section>
      <section className="admin-panel">
        <h2>Livres à vérifier</h2>
        <BooksList payload={{ books: data?.booksToReview || [] }} />
      </section>
      <section className="admin-panel">
        <h2>Articles les plus vus</h2>
        <ViewsList items={data?.topViewedArticles || []} type="article" />
      </section>
      <section className="admin-panel">
        <h2>Livres les plus vus</h2>
        <ViewsList items={data?.topViewedBooks || []} type="book" />
      </section>
      <section className="admin-panel admin-panel-wide">
        <h2>Derniers rapports</h2>
        <ReportsList items={data?.latestReports || []} />
      </section>
    </div>
  );
}

function AdminContent({ activeTab, data }) {
  if (activeTab === 'overview') return <Overview data={data} />;
  if (activeTab === 'contacts') return <ContactsList items={data || []} />;
  if (activeTab === 'subscribers') return <SubscribersList items={data || []} />;
  if (activeTab === 'books') return <BooksList payload={data || {}} />;
  if (activeTab === 'views') return <ViewsDashboard payload={data || {}} />;
  if (activeTab === 'reports') return <ReportsList items={data || []} />;
  return null;
}

export default function Admin() {
  const [credentials, setCredentials] = useState(() => getStoredAdminCredentials());
  const [activeTab, setActiveTab] = useState('overview');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState({ kind: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const activeLabel = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.label || 'Admin',
    [activeTab]
  );

  usePageSeo({
    title: 'Admin',
    description: 'Tableau de bord privé JC Hub.',
    path: '/admin',
    type: 'website'
  });

  useEffect(() => {
    if (!credentials) return;

    let active = true;
    setIsLoading(true);
    setStatus({ kind: '', text: '' });

    fetchAdminView(activeTab, { credentials, limit: activeTab === 'books' ? 40 : 24 })
      .then((response) => {
        if (!active) return;
        setPayload(response.data);
      })
      .catch((error) => {
        if (!active) return;
        setPayload(null);
        setStatus({
          kind: 'error',
          text: error?.code === 'admin/unauthorized'
            ? 'Identifiants admin invalides.'
            : error?.message || 'Impossible de charger le tableau de bord.'
        });
        if (error?.code === 'admin/unauthorized') {
          logoutAdmin();
          setCredentials('');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, credentials]);

  const handleLogin = async (event) => {
    event.preventDefault();
    const nextCredentials = loginAdmin(loginForm.email, loginForm.password);
    setCredentials(nextCredentials);
    setActiveTab('overview');
  };

  const handleLogout = () => {
    logoutAdmin();
    setCredentials('');
    setPayload(null);
    setLoginForm({ email: '', password: '' });
  };

  if (!credentials) {
    return (
      <div className="admin-page">
        <section className="admin-login">
          <div>
            <span className="admin-kicker">JC Hub Admin</span>
            <h1>Connexion privée</h1>
            <p>Utilisez le compte admin configuré dans les variables d’environnement du projet.</p>
          </div>
          <form onSubmit={handleLogin}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                autoComplete="username"
                required
              />
            </label>
            <label>
              <span>Mot de passe</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit">
              <i className="fas fa-lock"></i>
              Entrer
            </button>
          </form>
          {status.text && <p className="admin-feedback admin-feedback-error">{status.text}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <section className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <span>JC</span>
            <div>
              <strong>JC Hub</strong>
              <small>Analytics</small>
            </div>
          </div>

          <nav className="admin-tabs" aria-label="Navigation admin">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'active' : ''}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <small>Dashboard privé</small>
            <button type="button" onClick={handleLogout} className="admin-logout">
              <i className="fas fa-right-from-bracket"></i>
              Déconnexion
            </button>
          </div>
        </aside>

        <section className="admin-main">
          <header className="admin-topbar">
            <div>
              <span className="admin-kicker">Admin Analytics</span>
              <h1>{activeLabel}</h1>
            </div>
            <div className="admin-search" aria-hidden="true">
              <i className="fas fa-signal"></i>
              <span>Production · jchub.vercel.app</span>
            </div>
            <div className="admin-profile">
              <span>J</span>
              <div>
                <strong>Admin</strong>
                <small>JC Hub</small>
              </div>
            </div>
          </header>

          {status.text && <p className={`admin-feedback admin-feedback-${status.kind || 'info'}`}>{status.text}</p>}
          {isLoading ? (
            <div className="admin-loading">
              <i className="fas fa-circle-notch fa-spin"></i>
              Chargement...
            </div>
          ) : (
            <AdminContent activeTab={activeTab} data={payload} />
          )}
        </section>
      </section>
    </div>
  );
}
