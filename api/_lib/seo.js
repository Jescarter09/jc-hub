import { BOOKS_COLLECTION, normalizeHostedBook, toBookPublishAtMillis, toSeoSlug } from './books.js';
import { Timestamp, getAdminDb } from './firebaseAdmin.js';

const DEFAULT_SITE_URL = 'https://jchub.vercel.app';
const BLOGS_COLLECTION = String(process.env.BLOGS_COLLECTION || process.env.ARTICLES_COLLECTION || 'blogs').trim();

export function getSiteUrl() {
  return String(process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');
}

export function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function toSitemapLoc(pathname = '') {
  const siteUrl = getSiteUrl();
  const cleanPath = String(pathname || '').trim();
  const normalizedPath = cleanPath ? `/${cleanPath.replace(/^\/+/, '')}` : '';
  return encodeURI(`${siteUrl}${normalizedPath}`);
}

export function toDateOnly(value, fallback = new Date()) {
  const millis = toBookPublishAtMillis(value) || toBookPublishAtMillis(fallback) || Date.now();
  return new Date(millis).toISOString().slice(0, 10);
}

function isArticlePublished(data, now = Date.now()) {
  const status = String(data?.status || '').trim().toLowerCase();
  const publishAtMillis = toBookPublishAtMillis(data?.publishAt || data?.publish_at);
  const publishedAtMillis = toBookPublishAtMillis(data?.publishedAt || data?.published_at);

  if (publishAtMillis) return publishAtMillis <= now;
  if (publishedAtMillis) return true;
  return !status || status === 'published' || status === 'public';
}

function toArticlePath(docId, data) {
  const slug = toSeoSlug(data?.slug || docId, '');
  return slug ? `/blog/${slug}` : '';
}

function toArticleLastmod(data) {
  return toDateOnly(
    data?.updatedAt ||
      data?.updated_at ||
      data?.publishedAt ||
      data?.published_at ||
      data?.publishAt ||
      data?.publish_at ||
      data?.createdAt ||
      data?.created_at
  );
}

function toBookLastmod(data) {
  return toDateOnly(data?.updatedAt || data?.updated_at || data?.publishedAt || data?.publishAt || data?.createdAt);
}

export async function collectSitemapUrls() {
  const db = getAdminDb();
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: toSitemapLoc('/'), lastmod: today, changefreq: 'weekly', priority: '1.0' },
    { loc: toSitemapLoc('/blog'), lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: toSitemapLoc('/ebooks'), lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: toSitemapLoc('/categories'), lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: toSitemapLoc('/about'), lastmod: today, changefreq: 'monthly', priority: '0.7' },
    { loc: toSitemapLoc('/contact'), lastmod: today, changefreq: 'monthly', priority: '0.6' },
    { loc: toSitemapLoc('/search'), lastmod: today, changefreq: 'weekly', priority: '0.5' },
    { loc: toSitemapLoc('/res/faq'), lastmod: today, changefreq: 'monthly', priority: '0.5' },
    { loc: toSitemapLoc('/res/mentions-legales'), lastmod: today, changefreq: 'yearly', priority: '0.3' },
    { loc: toSitemapLoc('/res/confidentialite'), lastmod: today, changefreq: 'yearly', priority: '0.3' },
    { loc: toSitemapLoc('/res/cookies'), lastmod: today, changefreq: 'yearly', priority: '0.3' }
  ];

  const [booksSnapshot, articlesSnapshot] = await Promise.all([
    db.collection(BOOKS_COLLECTION).where('publishAt', '<=', Timestamp.now()).limit(5000).get(),
    db.collection(BLOGS_COLLECTION).limit(5000).get()
  ]);

  for (const doc of booksSnapshot.docs) {
    const data = doc.data() || {};
    const book = normalizeHostedBook(doc.id, data);
    const path = book.detailPath || `/ebooks/${book.categorySlug}/${book.slug}`;
    if (!book.slug || !book.categorySlug) continue;

    urls.push({
      loc: toSitemapLoc(path),
      lastmod: toBookLastmod(data),
      changefreq: 'monthly',
      priority: '0.7'
    });
  }

  for (const doc of articlesSnapshot.docs) {
    const data = doc.data() || {};
    if (!isArticlePublished(data, now)) continue;

    const path = toArticlePath(doc.id, data);
    if (!path) continue;

    urls.push({
      loc: toSitemapLoc(path),
      lastmod: toArticleLastmod(data),
      changefreq: 'monthly',
      priority: '0.7'
    });
  }

  return [...new Map(urls.map((url) => [url.loc, url])).values()];
}

export function renderSitemapXml(urls) {
  const items = urls
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${escapeXml(url.lastmod)}</lastmod>
    <changefreq>${escapeXml(url.changefreq)}</changefreq>
    <priority>${escapeXml(url.priority)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>
`;
}
