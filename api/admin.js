import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS_COLLECTION, normalizeHostedBook, sanitizeBookText, toBookPublishAtMillis } from './_lib/books.js';
import { getAdminDb, getAdminRtdb } from './_lib/firebaseAdmin.js';
import { sendJson } from './_lib/http.js';

const NEWSLETTER_COLLECTION = String(process.env.NEWSLETTER_COLLECTION || 'newsletterSubscribers').trim();
const CONTACT_COLLECTION = String(process.env.CONTACT_COLLECTION || 'contactLeads').trim();
const REPORT_COLLECTION = String(process.env.AUTOMATION_REPORT_COLLECTION || 'automationReports').trim();
const MAX_LIST_LIMIT = 80;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BLOG_DATABASE_PATH = path.resolve(PROJECT_ROOT, 'src', 'data', 'database.json');

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || process.env.FIREBASE_IMPORT_EMAIL || '').trim().toLowerCase();
}

function getAdminPassword() {
  return String(process.env.ADMIN_PASSWORD || process.env.FIREBASE_IMPORT_PASSWORD || '').trim();
}

function getAdminToken() {
  return String(process.env.ADMIN_TOKEN || '').trim();
}

function getHeader(req, name) {
  const direct = req.headers?.[name.toLowerCase()];
  return Array.isArray(direct) ? direct[0] : String(direct || '');
}

function parseBasicAuth(value) {
  const raw = String(value || '').trim();
  if (!raw.toLowerCase().startsWith('basic ')) return null;

  try {
    const decoded = Buffer.from(raw.slice(6), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 1) return null;

    return {
      email: decoded.slice(0, separatorIndex).trim().toLowerCase(),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

function assertAdminAuthorized(req) {
  const authorization = getHeader(req, 'authorization');
  const token = getAdminToken();

  if (token && authorization === `Bearer ${token}`) {
    return { ok: true, mode: 'token' };
  }

  const expectedEmail = getAdminEmail();
  const expectedPassword = getAdminPassword();
  if (!expectedEmail || !expectedPassword) {
    return {
      ok: false,
      status: 503,
      code: 'admin/not-configured',
      message: 'ADMIN_EMAIL/ADMIN_PASSWORD ou FIREBASE_IMPORT_EMAIL/FIREBASE_IMPORT_PASSWORD doivent etre configures.'
    };
  }

  const credentials = parseBasicAuth(authorization);
  if (credentials?.email === expectedEmail && credentials.password === expectedPassword) {
    return { ok: true, mode: 'basic' };
  }

  return {
    ok: false,
    status: 401,
    code: 'admin/unauthorized',
    message: 'Identifiants admin invalides.'
  };
}

function toLimit(value, fallback = 24) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(Math.floor(numeric), MAX_LIST_LIMIT);
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toIso(value) {
  const millis = toMillis(value);
  return millis ? new Date(millis).toISOString() : '';
}

function serializeValue(value) {
  if (!value) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value.toMillis === 'function') return new Date(value.toMillis()).toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, serializeValue(nested)]));
  }
  return value;
}

function serializeDoc(doc) {
  return {
    id: doc.id,
    ...serializeValue(doc.data() || {})
  };
}

function toSeoSlug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getAllowedPostPrefixes() {
  const rawValue = String(process.env.VITE_BLOG_POST_KEY_PREFIXES || '').trim();
  if (!rawValue) return ['article-'];
  const prefixes = rawValue.split(',').map((item) => item.trim()).filter(Boolean);
  return prefixes.length > 0 ? prefixes : ['article-'];
}

function readLocalArticleMap() {
  try {
    const raw = JSON.parse(fs.readFileSync(BLOG_DATABASE_PATH, 'utf8'));
    const posts = raw?.blogPosts && typeof raw.blogPosts === 'object' ? raw.blogPosts : {};
    const prefixes = getAllowedPostPrefixes();
    const allowAll = prefixes.includes('*');
    const bySlug = new Map();

    for (const [id, post] of Object.entries(posts)) {
      if (!allowAll && !prefixes.some((prefix) => id.startsWith(prefix))) continue;

      const slug = sanitizeBookText(post?.slug || toSeoSlug(post?.title || id), 220);
      if (!slug) continue;

      bySlug.set(slug, {
        id,
        slug,
        title: sanitizeBookText(post?.title || slug, 220),
        category: sanitizeBookText(post?.category || 'Article', 120),
        publishedAt: post?.date || post?.publishedAt || post?.createdAt || '',
        baselineViews: Math.max(0, Math.floor(Number(post?.views) || 0))
      });
    }

    return bySlug;
  } catch {
    return new Map();
  }
}

async function safeCount(collectionRef) {
  try {
    const snapshot = await collectionRef.count().get();
    return Math.max(0, Math.floor(Number(snapshot?.data()?.count || 0)));
  } catch {
    const snapshot = await collectionRef.get();
    return snapshot.size;
  }
}

async function listCollection(collectionRef, { orderBy = 'createdAt', direction = 'desc', limit = 24 } = {}) {
  try {
    const snapshot = await collectionRef.orderBy(orderBy, direction).limit(limit).get();
    return snapshot.docs.map(serializeDoc);
  } catch {
    const snapshot = await collectionRef.limit(limit).get();
    return snapshot.docs.map(serializeDoc);
  }
}

function getBookIssues(doc) {
  const data = doc.data() || {};
  const issues = [];
  if (!toBookPublishAtMillis(data.publishAt)) issues.push('publishAt');
  if (!sanitizeBookText(data.title, 220)) issues.push('titre');
  if (!sanitizeBookText(data.author, 220)) issues.push('auteur');
  if (!sanitizeBookText(data.thumbnail, 800)) issues.push('miniature');
  if (!sanitizeBookText(data.readerUrl || data.externalLink || data.previewLink || data.fileUrl, 800)) {
    issues.push('lien');
  }
  if (data.newsletterSent !== true && data.newsletterSent !== false) issues.push('newsletterSent');
  return issues;
}

async function getBooksAdmin(db, limit) {
  const snapshot = await db.collection(BOOKS_COLLECTION).get();
  const now = Date.now();
  const rows = [];
  let published = 0;
  let scheduled = 0;
  let incomplete = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const publishAtMillis = toBookPublishAtMillis(data.publishAt);
    const issues = getBookIssues(doc);
    const normalized = normalizeHostedBook(doc.id, data);

    if (publishAtMillis && publishAtMillis <= now) published += 1;
    if (publishAtMillis && publishAtMillis > now) scheduled += 1;
    if (issues.length > 0) incomplete += 1;

    rows.push({
      id: doc.id,
      title: normalized.title,
      author: normalized.author,
      category: normalized.category,
      viewsCount: Math.max(0, Math.floor(Number(data.viewsCount) || 0)),
      publishAt: publishAtMillis ? new Date(publishAtMillis).toISOString() : '',
      status: publishAtMillis && publishAtMillis <= now ? 'visible' : publishAtMillis ? 'programme' : 'incomplet',
      issues,
      detailPath: normalized.detailPath
    });
  }

  rows.sort((left, right) => {
    if (left.issues.length !== right.issues.length) return right.issues.length - left.issues.length;
    return String(left.publishAt || '').localeCompare(String(right.publishAt || ''));
  });

  return {
    stats: {
      total: snapshot.size,
      published,
      scheduled,
      incomplete
    },
    books: rows.slice(0, limit)
  };
}

async function getViewsAdmin(db, limit) {
  const booksSnapshot = await db.collection(BOOKS_COLLECTION).get();
  const bookRows = booksSnapshot.docs.map((doc) => {
    const data = doc.data() || {};
    const normalized = normalizeHostedBook(doc.id, data);
    return {
      id: doc.id,
      title: normalized.title,
      category: normalized.category,
      viewsCount: Math.max(0, Math.floor(Number(data.viewsCount) || 0)),
      detailPath: normalized.detailPath
    };
  });

  let articleRows = [];
  try {
    const articleMap = readLocalArticleMap();
    const snapshot = await getAdminRtdb().ref('blogMetrics').get();
    const metrics = snapshot.exists() && snapshot.val() && typeof snapshot.val() === 'object' ? snapshot.val() : {};
    const knownSlugs = new Set([...articleMap.keys(), ...Object.keys(metrics)]);

    articleRows = [...knownSlugs].map((slug) => {
      const meta = articleMap.get(slug) || {};
      const metric = metrics[slug] && typeof metrics[slug] === 'object' ? metrics[slug] : {};
      const viewsCount = Math.max(
        Math.floor(Number(metric.viewsCount) || 0),
        Math.floor(Number(meta.baselineViews) || 0),
        0
      );

      return {
        id: meta.id || slug,
        slug,
        title: meta.title || slug,
        category: meta.category || 'Article',
        viewsCount,
        likesCount: Math.max(0, Math.floor(Number(metric.likesCount) || 0)),
        savesCount: Math.max(0, Math.floor(Number(metric.savesCount) || 0)),
        avgReadSeconds: Math.max(
          0,
          Math.round((Number(metric.totalReadSeconds) || 0) / Math.max(1, Number(metric.readSessionsCount) || 0))
        ),
        detailPath: `/blog/${slug}`
      };
    });
  } catch {
    articleRows = [...readLocalArticleMap().values()].map((article) => ({
      ...article,
      viewsCount: article.baselineViews || 0,
      likesCount: 0,
      savesCount: 0,
      avgReadSeconds: 0,
      detailPath: `/blog/${article.slug}`
    }));
  }

  const totalBookViews = bookRows.reduce((total, book) => total + book.viewsCount, 0);
  const totalArticleViews = articleRows.reduce((total, article) => total + article.viewsCount, 0);
  const sortByViews = (left, right) => right.viewsCount - left.viewsCount || left.title.localeCompare(right.title);

  return {
    stats: {
      bookViews: totalBookViews,
      articleViews: totalArticleViews,
      totalViews: totalBookViews + totalArticleViews
    },
    books: bookRows.sort(sortByViews).slice(0, limit),
    articles: articleRows.sort(sortByViews).slice(0, limit)
  };
}

async function getOverview(db) {
  const books = await getBooksAdmin(db, 8);
  const views = await getViewsAdmin(db, 6);
  const contactsRef = db.collection(CONTACT_COLLECTION);
  const subscribersRef = db.collection(NEWSLETTER_COLLECTION);
  const reportsRef = db.collection(REPORT_COLLECTION);
  const [contactsTotal, subscribersTotal, reportsTotal, latestContacts, latestReports] = await Promise.all([
    safeCount(contactsRef),
    safeCount(subscribersRef),
    safeCount(reportsRef),
    listCollection(contactsRef, { orderBy: 'createdAt', limit: 5 }),
    listCollection(reportsRef, { orderBy: 'createdAt', limit: 3 })
  ]);

  return {
    stats: {
      books: books.stats.total,
      visibleBooks: books.stats.published,
      scheduledBooks: books.stats.scheduled,
      incompleteBooks: books.stats.incomplete,
      contacts: contactsTotal,
      subscribers: subscribersTotal,
      reports: reportsTotal,
      bookViews: views.stats.bookViews,
      articleViews: views.stats.articleViews
    },
    latestContacts,
    latestReports,
    booksToReview: books.books,
    topViewedBooks: views.books.slice(0, 5),
    topViewedArticles: views.articles.slice(0, 5)
  };
}

function sanitizeContact(item) {
  return {
    id: item.id,
    name: sanitizeBookText(item.name || item.contact?.name, 120),
    email: sanitizeBookText(item.email || item.contact?.email, 180),
    subject: sanitizeBookText(item.subject || item.messageInfo?.subject, 160),
    message: sanitizeBookText(item.message || item.messageInfo?.body || item.latestMessage?.body, 600),
    status: sanitizeBookText(item.status || item.latestMessage?.status, 80),
    source: sanitizeBookText(item.source || item.form?.source, 80),
    createdAt: item.createdAt || item.latestMessage?.createdAt || ''
  };
}

function sanitizeSubscriber(item) {
  return {
    id: item.id,
    email: sanitizeBookText(item.email, 180),
    status: sanitizeBookText(item.status || (item.isActive ? 'active' : ''), 80),
    source: sanitizeBookText(item.lastSource || item.source, 80),
    subscribedAt: item.subscribedAt || item.createdAt || '',
    updatedAt: item.updatedAt || ''
  };
}

function sanitizeReport(item) {
  return {
    id: item.id,
    generatedAt: item.generatedAt || item.createdAt || '',
    dryRun: item.dryRun === true,
    books: item.books || {},
    contacts: item.contacts || {},
    newsletter: item.newsletter || {},
    actions: item.actions || {},
    links: item.links || {},
    email: item.email || {}
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { success: false, code: 'admin/method-not-allowed' });
  }

  const authorization = assertAdminAuthorized(req);
  if (!authorization.ok) {
    return sendJson(res, authorization.status, {
      success: false,
      code: authorization.code,
      message: authorization.message
    });
  }

  const params = new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`).searchParams;
  const view = String(params.get('view') || 'overview').trim().toLowerCase();
  const limit = toLimit(params.get('limit'));
  const db = getAdminDb();

  try {
    if (view === 'overview') {
      return sendJson(res, 200, {
        success: true,
        view,
        authMode: authorization.mode,
        data: await getOverview(db)
      });
    }

    if (view === 'contacts') {
      const items = await listCollection(db.collection(CONTACT_COLLECTION), { orderBy: 'createdAt', limit });
      return sendJson(res, 200, { success: true, view, data: items.map(sanitizeContact) });
    }

    if (view === 'subscribers') {
      const items = await listCollection(db.collection(NEWSLETTER_COLLECTION), { orderBy: 'updatedAt', limit });
      return sendJson(res, 200, { success: true, view, data: items.map(sanitizeSubscriber) });
    }

    if (view === 'books') {
      return sendJson(res, 200, { success: true, view, data: await getBooksAdmin(db, limit) });
    }

    if (view === 'views') {
      return sendJson(res, 200, { success: true, view, data: await getViewsAdmin(db, limit) });
    }

    if (view === 'reports') {
      const items = await listCollection(db.collection(REPORT_COLLECTION), { orderBy: 'createdAt', limit });
      return sendJson(res, 200, { success: true, view, data: items.map(sanitizeReport) });
    }

    return sendJson(res, 404, {
      success: false,
      code: 'admin/unknown-view',
      message: 'Vue admin inconnue.'
    });
  } catch (error) {
    console.error('admin/read-failed', error);
    return sendJson(res, 500, {
      success: false,
      code: 'admin/read-failed',
      message: 'Lecture admin impossible.',
      details: sanitizeBookText(error?.message || error, 240)
    });
  }
}
