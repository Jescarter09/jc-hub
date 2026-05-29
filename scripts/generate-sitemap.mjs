import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Firebase imports
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex < 1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Load env files
loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(__dirname, '..', '.env.local'));

const PROJECT_ROOT = path.join(__dirname, '..');

// Configuration
const BASE_URL = String(process.env.VITE_SITE_URL || 'https://example.com').replace(/\/+$/, '');
const COLLECTION = 'blogs';
const ROOT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'sitemap.xml');
const PUBLIC_OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'sitemap.xml');
const LOCAL_DATABASE_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'database.json');
const OUTPUT_PATHS = [ROOT_OUTPUT_PATH, PUBLIC_OUTPUT_PATH];

const toSitemapLoc = (pathname = '') => {
  const cleanPath = String(pathname || '').trim();
  const normalizedPath = cleanPath ? `/${cleanPath.replace(/^\/+/, '')}` : '';
  return encodeURI(`${BASE_URL}${normalizedPath}`);
};

// Ensure output directories exist
for (const outputPath of OUTPUT_PATHS) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

/**
 * Format date to ISO 8601 (YYYY-MM-DD)
 */
function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

function initFirestoreOrNull() {
  try {
    const rawServiceAccountPath = String(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || '').trim();
    const serviceAccountPath = rawServiceAccountPath
      ? path.resolve(PROJECT_ROOT, rawServiceAccountPath)
      : '';

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log(`✅ Firebase Admin initialized with service account: ${serviceAccountPath}`);
      return getFirestore();
    }

    const adcPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
    if (adcPath) {
      initializeApp();
      console.log('✅ Firebase Admin initialized with Application Default Credentials.');
      return getFirestore();
    }

    console.log('⚠️  FIREBASE_SERVICE_ACCOUNT_KEY_PATH non configure. Fallback sur src/data/database.json');
    return null;
  } catch (error) {
    console.log(`⚠️  Firebase indisponible (${error.message}). Fallback sur src/data/database.json`);
    return null;
  }
}

function collectPublishedFromLocalDatabase() {
  if (!fs.existsSync(LOCAL_DATABASE_PATH)) {
    console.log(`⚠️  Base locale introuvable: ${LOCAL_DATABASE_PATH}`);
    return [];
  }

  try {
    const raw = fs.readFileSync(LOCAL_DATABASE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const posts = parsed?.blog?.posts || {};
    const entries = Object.values(posts);
    return entries.filter((post) => String(post?.status || '').toLowerCase() === 'published');
  } catch (error) {
    console.log(`⚠️  Erreur lecture base locale: ${error.message}`);
    return [];
  }
}

/**
 * Generate sitemap.xml from Firestore
 */
async function generateSitemap() {
  console.log('🔄 Generating sitemap from Firestore...');
  const db = initFirestoreOrNull();
  
  const urls = [];
  
  // Add home page
  urls.push({
    loc: toSitemapLoc(),
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '1.0'
  });

  // Add static pages
  const staticPages = [
    { path: 'about', priority: '0.8' },
    { path: 'contact', priority: '0.8' },
    { path: 'blog', priority: '0.9' },
    { path: 'search', priority: '0.6' },
    { path: 'res/mentions-legales', priority: '0.5' },
    { path: 'res/confidentialite', priority: '0.5' },
    { path: 'res/cookies', priority: '0.5' },
    { path: 'res/faq', priority: '0.6' }
  ];

  staticPages.forEach(page => {
    urls.push({
      loc: toSitemapLoc(page.path),
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: page.priority
    });
  });

  if (db) {
    try {
      // Fetch all blog posts from Firestore
      const snapshot = await db.collection(COLLECTION).where('status', '==', 'published').get();
      
      if (snapshot.empty) {
        console.log('⚠️  No published blog posts found in Firestore');
      } else {
        console.log(`✅ Found ${snapshot.size} published articles (Firestore)`);
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const slug = data.slug || doc.id;
          const lastmod = formatDate(data.updated_at || data.created_at);
          
          urls.push({
            loc: toSitemapLoc(`/blog/${slug}`),
            lastmod: lastmod,
            changefreq: 'monthly',
            priority: '0.7'
          });
        });
      }
    } catch (error) {
      console.log(`⚠️  Erreur Firestore: ${error.message}`);
    }
  }

  if (urls.filter((url) => url.loc.includes('/blog/')).length === 0) {
    const localPublishedPosts = collectPublishedFromLocalDatabase();
    if (localPublishedPosts.length > 0) {
      console.log(`✅ Found ${localPublishedPosts.length} published articles (database.json)`);
      for (const post of localPublishedPosts) {
        const slug = String(post?.slug || '').trim();
        if (!slug) continue;
        const lastmod = formatDate(post?.updated_at || post?.created_at || post?.published_at);
        urls.push({
          loc: toSitemapLoc(`/blog/${slug}`),
          lastmod,
          changefreq: 'monthly',
          priority: '0.7'
        });
      }
    } else {
      console.log('⚠️  Aucun article publie trouve (Firestore/database.json).');
    }
  }

  const uniqueUrls = [...new Map(urls.map((url) => [url.loc, url])).values()];
  if (uniqueUrls.length !== urls.length) {
    console.log(`🧹 ${urls.length - uniqueUrls.length} URL dupliquee(s) retiree(s) du sitemap.`);
  }

  // Generate XML
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const xmlNamespace = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const xmlFooter = '</urlset>';

  const urlElements = uniqueUrls
    .map(url => {
      return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
    })
    .join('\n');

  const sitemapXml = xmlHeader + xmlNamespace + urlElements + '\n' + xmlFooter;

  // Write files
  for (const outputPath of OUTPUT_PATHS) {
    fs.writeFileSync(outputPath, sitemapXml, 'utf8');
    console.log(`✅ Sitemap generated successfully: ${outputPath}`);
  }
  console.log(`📄 Total URLs in sitemap: ${uniqueUrls.length}`);
}

/**
 * Escape special characters for XML
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Run the function
generateSitemap().catch(error => {
  console.error('❌ Sitemap generation failed:', error);
  process.exit(1);
});
