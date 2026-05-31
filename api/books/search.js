import { FieldValue, getAdminDb } from '../_lib/firebaseAdmin.js';
import { readJsonBody, sendJson } from '../_lib/http.js';
import { checkRateLimit } from '../_lib/rateLimit.js';
import { uploadRemoteResourceToCloudinary } from '../_lib/cloudinaryUpload.js';
import {
  BOOKS_COLLECTION,
  getBookAccessDecision,
  normalizeHostedBook,
  normalizeArchiveBook,
  normalizeGoogleBook,
  normalizeGutendexBook,
  normalizeLibriVoxBook,
  normalizeOpenLibraryBook,
  sanitizeBookText,
  toBookCatalogPayload,
  toStableBookId,
  withBookAccess,
  withBookRouting
} from '../_lib/books.js';

const DEFAULT_SOURCES = [
  'gutendex',
  'librivox',
  'google-books',
  'openlibrary',
  'internet-archive',
  'github',
  'free-programming-books',
  'mdn-web-docs',
  'react-documentation',
  'firebase-documentation',
  'vite-documentation'
];

const OFFICIAL_DOCS = [
  {
    source: 'react-documentation',
    sourceLabel: 'React Documentation',
    author: 'React',
    title: 'React - Démarrage rapide',
    description: 'Guide officiel React pour apprendre les composants, JSX, props, state et hooks.',
    url: 'https://react.dev/learn',
    keywords: ['react', 'jsx', 'hooks', 'components', 'frontend', 'javascript']
  },
  {
    source: 'react-documentation',
    sourceLabel: 'React Documentation',
    author: 'React',
    title: 'React - Référence des Hooks',
    description: 'Documentation officielle des hooks React : useState, useEffect, useMemo et hooks personnalisés.',
    url: 'https://react.dev/reference/react',
    keywords: ['react', 'hooks', 'usestate', 'useeffect', 'reference']
  },
  {
    source: 'firebase-documentation',
    sourceLabel: 'Firebase Documentation',
    author: 'Firebase',
    title: 'Firebase Documentation',
    description: 'Guides officiels Firebase pour Auth, Firestore, Hosting, Storage, Functions et règles de sécurité.',
    url: 'https://firebase.google.com/docs',
    keywords: ['firebase', 'firestore', 'auth', 'hosting', 'storage', 'functions', 'rules']
  },
  {
    source: 'firebase-documentation',
    sourceLabel: 'Firebase Documentation',
    author: 'Firebase',
    title: 'Cloud Firestore',
    description: 'Documentation officielle Cloud Firestore : données, requêtes, règles, index et bonnes pratiques.',
    url: 'https://firebase.google.com/docs/firestore',
    keywords: ['firebase', 'firestore', 'database', 'rules', 'index']
  },
  {
    source: 'firebase-documentation',
    sourceLabel: 'Firebase Documentation',
    author: 'Firebase',
    title: 'Firebase Security Rules',
    description: 'Guides officiels pour sécuriser Firestore, Storage et les accès aux données Firebase.',
    url: 'https://firebase.google.com/docs/rules',
    keywords: ['firebase', 'security', 'rules', 'firestore', 'storage']
  },
  {
    source: 'vite-documentation',
    sourceLabel: 'Vite Documentation',
    author: 'Vite',
    title: 'Vite Guide',
    description: 'Guide officiel Vite pour créer, configurer, développer et builder des applications modernes.',
    url: 'https://vite.dev/guide/',
    keywords: ['vite', 'build', 'frontend', 'dev server', 'react']
  },
  {
    source: 'vite-documentation',
    sourceLabel: 'Vite Documentation',
    author: 'Vite',
    title: 'Vite Config',
    description: 'Référence officielle de configuration Vite : plugins, build, server, env et optimisations.',
    url: 'https://vite.dev/config/',
    keywords: ['vite', 'config', 'plugins', 'build', 'server', 'env']
  },
  {
    source: 'vite-documentation',
    sourceLabel: 'Vite Documentation',
    author: 'Vite',
    title: 'Déployer une app Vite',
    description: 'Documentation officielle pour déployer une application Vite sur Vercel, Netlify, GitHub Pages et autres.',
    url: 'https://vite.dev/guide/static-deploy.html',
    keywords: ['vite', 'deploy', 'vercel', 'netlify', 'github pages']
  }
];

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesQuery(item, query) {
  const terms = normalizeSearchText(query).split(' ').filter((term) => term.length > 1);
  if (terms.length === 0) return false;

  const haystack = normalizeSearchText([
    item.title,
    item.description,
    item.author,
    item.sourceLabel,
    ...(item.keywords || [])
  ].join(' '));

  return terms.every((term) => haystack.includes(term));
}

function toOfficialResource(item, fallbackIndex = 0) {
  const book = {
    id: `${item.source}-${sanitizeBookText(item.id || item.title || fallbackIndex, 120)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')}`,
    sourceId: sanitizeBookText(item.id || item.url || item.title, 160),
    source: item.source,
    sourceLabel: item.sourceLabel,
    title: sanitizeBookText(item.title, 220) || item.sourceLabel,
    author: sanitizeBookText(item.author || item.sourceLabel, 120),
    description: sanitizeBookText(item.description, 900),
    thumbnail: sanitizeBookText(item.thumbnail, 800),
    externalLink: sanitizeBookText(item.url, 800),
    previewLink: sanitizeBookText(item.url, 800),
    readerUrl: sanitizeBookText(item.url, 800),
    downloadUrl: '',
    preferredFormat: 'html',
    license: sanitizeBookText(item.license || 'official-docs', 120),
    publicDomain: false,
    canRedistribute: false,
    isHosted: false,
    fileUrl: '',
    pdfUrl: '',
    category: sanitizeBookText(item.category || 'Documentation officielle', 80),
    categorySlug: sanitizeBookText(item.categorySlug || 'documentation-officielle', 120),
    requiresReview: false
  };

  return withBookRouting(withBookAccess(book));
}

async function fetchJson(url, { timeoutMs = 8000, headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'JC-Hub-Ebooks/1.0',
        ...headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, { timeoutMs = 8000, headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'JC-Hub-Ebooks/1.0',
        ...headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function searchGutendex(query) {
  const payload = await fetchJson(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`);
  return (payload?.results || []).slice(0, 12).map(normalizeGutendexBook);
}

async function searchGoogleBooks(query) {
  const params = new URLSearchParams({
    q: query,
    maxResults: '12',
    orderBy: 'relevance'
  });
  const apiKey = String(process.env.GOOGLE_BOOKS_API_KEY || process.env.VITE_GOOGLE_BOOKS_API_KEY || '').trim();

  if (apiKey) {
    params.set('key', apiKey);
  }

  const payload = await fetchJson(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  return (payload?.items || []).slice(0, 12).map(normalizeGoogleBook);
}

async function searchLibriVox(query) {
  const params = new URLSearchParams({
    title: query,
    format: 'json',
    extended: '1',
    coverart: '1',
    limit: '8'
  });
  const payload = await fetchJson(`https://librivox.org/api/feed/audiobooks?${params.toString()}`);
  return (payload?.books || []).slice(0, 8).map(normalizeLibriVoxBook);
}

async function searchOpenLibrary(query) {
  const payload = await fetchJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12`);
  return (payload?.docs || []).slice(0, 12).map(normalizeOpenLibraryBook);
}

async function searchInternetArchive(query) {
  const params = new URLSearchParams({
    q: `title:(${query}) AND mediatype:texts`,
    output: 'json',
    rows: '8'
  });

  ['identifier', 'title', 'creator', 'description', 'licenseurl', 'rights'].forEach((field) => {
    params.append('fl[]', field);
  });

  const payload = await fetchJson(`https://archive.org/advancedsearch.php?${params.toString()}`);
  return (payload?.response?.docs || []).slice(0, 8).map(normalizeArchiveBook);
}

async function searchGitHub(query) {
  const params = new URLSearchParams({
    q: `${query} in:name,description stars:>10`,
    sort: 'stars',
    order: 'desc',
    per_page: '8'
  });
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const headers = {
    Accept: 'application/vnd.github+json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const payload = await fetchJson(`https://api.github.com/search/repositories?${params.toString()}`, { headers });

  return (payload?.items || []).slice(0, 8).map((item) => {
    const license = item?.license?.spdx_id && item.license.spdx_id !== 'NOASSERTION'
      ? item.license.spdx_id.toLowerCase()
      : 'unknown';

    return withBookRouting(withBookAccess({
      id: `github-${item.id}`,
      sourceId: String(item.id || ''),
      source: 'github',
      sourceLabel: 'GitHub',
      title: sanitizeBookText(item.full_name || item.name, 220),
      author: sanitizeBookText(item.owner?.login || 'GitHub', 120),
      description: sanitizeBookText(item.description || 'Repository GitHub lié à la recherche.', 900),
      thumbnail: sanitizeBookText(item.owner?.avatar_url, 800),
      externalLink: sanitizeBookText(item.html_url, 800),
      previewLink: sanitizeBookText(item.html_url, 800),
      readerUrl: sanitizeBookText(item.html_url, 800),
      downloadUrl: '',
      preferredFormat: 'repository',
      license,
      openSource: license !== 'unknown',
      publicDomain: false,
      canRedistribute: false,
      isHosted: false,
      fileUrl: '',
      pdfUrl: '',
      category: 'Open Source',
      categorySlug: 'open-source',
      requiresReview: false
    }));
  });
}

function parseFreeProgrammingBooks(markdown, query) {
  const entries = [];
  const pattern = /^\s*[-*]\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:\s*[-–—]\s*(.+))?/gm;
  let match;

  while ((match = pattern.exec(markdown)) && entries.length < 80) {
    const [, title, url, author] = match;
    const item = {
      source: 'free-programming-books',
      sourceLabel: 'Free Programming Books',
      author: sanitizeBookText(author || 'Free Programming Books', 120),
      title: sanitizeBookText(title, 220),
      description: 'Ressource issue de la liste Free Programming Books. Licence à vérifier sur la source officielle.',
      url,
      license: 'unknown',
      category: 'Livres numériques',
      categorySlug: 'livres-numeriques',
      keywords: ['free programming books', 'programming', 'ebook', 'guide', title, author]
    };

    if (matchesQuery(item, query)) {
      entries.push(toOfficialResource(item, entries.length));
    }
  }

  return entries.slice(0, 10);
}

async function searchFreeProgrammingBooks(query) {
  const markdown = await fetchText(
    'https://raw.githubusercontent.com/EbookFoundation/free-programming-books/main/books/free-programming-books-langs.md',
    { timeoutMs: 7000 }
  );

  return parseFreeProgrammingBooks(markdown, query);
}

async function searchMdnWebDocs(query) {
  const params = new URLSearchParams({
    q: query,
    locale: 'fr'
  });
  const payload = await fetchJson(`https://developer.mozilla.org/api/v1/search?${params.toString()}`);
  const documents = payload?.documents || payload?.results || [];

  return documents.slice(0, 10).map((doc, index) => {
    const url = doc.mdn_url
      ? `https://developer.mozilla.org${doc.mdn_url}`
      : doc.url || doc.document_url || 'https://developer.mozilla.org/';

    return toOfficialResource({
      id: doc.slug || doc.mdn_url || url,
      source: 'mdn-web-docs',
      sourceLabel: 'MDN Web Docs',
      author: 'MDN Web Docs',
      title: doc.title || doc.slug || 'Documentation MDN',
      description: doc.summary || doc.excerpt || 'Documentation officielle MDN Web Docs.',
      url,
      category: 'Documentation officielle',
      categorySlug: 'documentation-officielle',
      keywords: ['mdn', 'web docs', 'html', 'css', 'javascript', query]
    }, index);
  });
}

function searchOfficialDocs(source) {
  return async (query) => OFFICIAL_DOCS
    .filter((item) => item.source === source && matchesQuery(item, query))
    .slice(0, 8)
    .map(toOfficialResource);
}

function getRequestedSources(value) {
  const requested = String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return requested.length > 0 ? requested.filter((source) => DEFAULT_SOURCES.includes(source)) : DEFAULT_SOURCES;
}

function getSearchParams(req) {
  const host = req.headers?.host || 'localhost';
  return new URL(req.url || '/', `https://${host}`).searchParams;
}

function isFalseLike(value) {
  return ['0', 'false', 'no', 'off'].includes(String(value || '').trim().toLowerCase());
}

function shouldAutoCatalog(params, body) {
  if (isFalseLike(params.get('catalog') || body?.catalog)) return false;
  return !isFalseLike(process.env.BOOKS_SEARCH_AUTOSAVE || 'true');
}

function shouldAutoHost(params, body) {
  if (isFalseLike(params.get('host') || body?.host)) return false;
  return !isFalseLike(process.env.BOOKS_AUTO_HOST_ON_SEARCH || 'true');
}

const BOOKS_GROWTH_DATE = Date.parse(process.env.BOOKS_GROWTH_DATE || '2026-06-05T00:00:00+01:00');
const INITIAL_CATALOG_LIMIT = 30;
const GROWN_CATALOG_LIMIT = 50;

function getDefaultCatalogLimit() {
  return Date.now() >= BOOKS_GROWTH_DATE ? GROWN_CATALOG_LIMIT : INITIAL_CATALOG_LIMIT;
}

function getCatalogLimit() {
  const configured = Number(process.env.BOOKS_SEARCH_CATALOG_LIMIT);
  if (Number.isFinite(configured)) {
    return Math.min(Math.max(configured, 0), GROWN_CATALOG_LIMIT);
  }

  return getDefaultCatalogLimit();
}

function getAutoHostLimit() {
  const configured = Number(process.env.BOOKS_AUTO_HOST_LIMIT);
  if (Number.isFinite(configured)) {
    return Math.min(Math.max(configured, 0), 8);
  }

  return 3;
}

function selectBalancedCatalogResults(results, limit) {
  if (limit <= 0 || results.length <= limit) return results.slice(0, limit);

  const grouped = new Map();
  for (const book of results) {
    const source = String(book?.source || 'unknown');
    if (!grouped.has(source)) grouped.set(source, []);
    grouped.get(source).push(book);
  }

  const sourceOrder = DEFAULT_SOURCES.filter((source) => grouped.has(source));
  const selected = [];

  while (selected.length < limit && sourceOrder.length > 0) {
    let addedThisRound = false;

    for (const source of sourceOrder) {
      const group = grouped.get(source);
      if (!group || group.length === 0) continue;

      selected.push(group.shift());
      addedThisRound = true;

      if (selected.length >= limit) break;
    }

    if (!addedThisRound) break;
  }

  return selected;
}

function getCloudinaryFolder() {
  return String(process.env.CLOUDINARY_BOOKS_FOLDER || 'jc-hub/books').trim();
}

function isTrustedAutoHostUrl(book, remoteFileUrl) {
  try {
    const source = String(book?.source || '').toLowerCase();
    const hostname = new URL(remoteFileUrl).hostname.toLowerCase();

    if (source === 'gutendex') {
      return hostname === 'gutenberg.org' || hostname.endsWith('.gutenberg.org') || hostname.endsWith('.pglaf.org');
    }

    if (source === 'librivox') {
      return hostname === 'librivox.org' || hostname.endsWith('.librivox.org') || hostname === 'archive.org' || hostname.endsWith('.archive.org');
    }

    if (source === 'internet-archive') {
      return hostname === 'archive.org' || hostname.endsWith('.archive.org');
    }

    return false;
  } catch {
    return false;
  }
}

function pickArchiveDownloadFile(files = []) {
  const candidates = files.filter((file) => {
    const name = String(file?.name || '').toLowerCase();
    const format = String(file?.format || '').toLowerCase();
    if (!name || name.includes('encrypted') || format.includes('encrypted')) return false;
    return name.endsWith('.pdf') || name.endsWith('.epub') || name.endsWith('.txt');
  });

  return (
    candidates.find((file) => String(file.name || '').toLowerCase().endsWith('.pdf')) ||
    candidates.find((file) => String(file.name || '').toLowerCase().endsWith('.epub')) ||
    candidates[0] ||
    null
  );
}

function toArchiveDownloadUrl(identifier, fileName) {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${String(fileName || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`;
}

async function withArchiveDownload(book) {
  if (book?.source !== 'internet-archive' || book?.downloadUrl || !book?.canRedistribute || !book?.sourceId) {
    return book;
  }

  const metadata = await fetchJson(`https://archive.org/metadata/${encodeURIComponent(book.sourceId)}`, { timeoutMs: 6000 });
  const file = pickArchiveDownloadFile(metadata?.files || []);
  if (!file) return book;

  const fileName = sanitizeBookText(file.name, 500);
  const preferredFormat = fileName.toLowerCase().endsWith('.pdf')
    ? 'pdf'
    : fileName.toLowerCase().endsWith('.epub')
      ? 'epub'
      : 'txt';

  return {
    ...book,
    downloadUrl: toArchiveDownloadUrl(book.sourceId, fileName),
    preferredFormat
  };
}

async function prepareBookForHosting(book) {
  if (book?.source === 'internet-archive') {
    return withArchiveDownload(book);
  }

  return book;
}

async function persistSearchResults(results, { enabled, autoHost }) {
  const limit = enabled ? getCatalogLimit() : 0;
  if (limit <= 0 || results.length === 0) {
    return {
      enabled,
      autoHost,
      attempted: 0,
      saved: 0,
      hosted: 0,
      hostFailed: 0,
      failed: 0
    };
  }

  try {
    const db = getAdminDb();
    const collection = db.collection(BOOKS_COLLECTION);
    const selectedResults = selectBalancedCatalogResults(results, limit);
    const persistedBooks = new Map();
    let saved = 0;
    let hosted = 0;
    let hostFailed = 0;
    let failed = 0;
    let remainingUploads = autoHost ? getAutoHostLimit() : 0;

    for (const originalBook of selectedResults) {
      try {
        let book = originalBook;
        const docId = toStableBookId(book);
        const docRef = collection.doc(docId);
        const existingDoc = await docRef.get();
        const existingData = existingDoc.data();

        if (existingData?.isHosted === true) {
          const hostedBook = normalizeHostedBook(docId, existingData);
          persistedBooks.set(docId, hostedBook);
          await docRef.set({ lastSeenAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          saved += 1;
          continue;
        }

        book = await prepareBookForHosting(book).catch(() => book);
        const payload = toBookCatalogPayload(book, { now: FieldValue.serverTimestamp() });

        if (existingDoc.exists) {
          delete payload.catalogedAt;
          delete payload.createdAt;
        }

        const decision = getBookAccessDecision(book);
        const remoteFileUrl = sanitizeBookText(book?.fileUrl || book?.downloadUrl || book?.pdfUrl, 800);
        const canUpload =
          remainingUploads > 0 &&
          decision.canRedistribute === true &&
          remoteFileUrl &&
          /^https?:\/\//i.test(remoteFileUrl) &&
          isTrustedAutoHostUrl(book, remoteFileUrl);

        if (canUpload) {
          try {
            remainingUploads -= 1;
            const uploadedFile = await uploadRemoteResourceToCloudinary(remoteFileUrl, {
              resourceType: 'raw',
              folder: getCloudinaryFolder(),
              publicId: docId
            });

            payload.isHosted = true;
            payload.fileUrl = uploadedFile.secure_url;
            payload.pdfUrl = uploadedFile.secure_url;
            payload.readerUrl = uploadedFile.secure_url;
            payload.sourceType = 'public_domain';
            payload.canReadOnline = true;
            payload.canDownload = true;
            payload.readerType = 'integrated';
            payload.cloudinaryPublicId = uploadedFile.public_id;
            payload.cloudinaryResourceType = uploadedFile.resource_type;
            payload.accessAction = 'download';
            payload.hostedAt = FieldValue.serverTimestamp();
            hosted += 1;
          } catch (error) {
            console.warn('books-search/auto-host-skipped', error);
            hostFailed += 1;
          }
        }

        await docRef.set(payload, { merge: true });
        persistedBooks.set(docId, {
          id: docId,
          ...book,
          isHosted: payload.isHosted,
          fileUrl: payload.fileUrl,
          pdfUrl: payload.pdfUrl,
          readerUrl: payload.readerUrl,
          downloadUrl: payload.downloadUrl,
          externalLink: payload.externalLink,
          previewLink: payload.previewLink,
          license: payload.license,
          canRedistribute: payload.canRedistribute,
          canReadOnline: payload.canReadOnline,
          canDownload: payload.canDownload,
          sourceType: payload.sourceType,
          publicDomain: payload.publicDomain,
          requiresReview: payload.requiresReview,
          accessAction: payload.accessAction,
          accessReason: payload.accessReason,
          readerType: payload.readerType,
          cloudinaryPublicId: payload.cloudinaryPublicId,
          cloudinaryResourceType: payload.cloudinaryResourceType,
          hostedAt: payload.isHosted ? Date.now() : undefined
        });
        saved += 1;
      } catch (error) {
        console.warn('books-search/catalog-one-skipped', error);
        failed += 1;
      }
    }

    return {
      enabled,
      autoHost,
      attempted: selectedResults.length,
      saved,
      hosted,
      hostFailed,
      failed,
      books: persistedBooks
    };
  } catch (error) {
    console.warn('books-search/catalog-skipped', error);
    return {
      enabled,
      autoHost,
      attempted: 0,
      saved: 0,
      hosted: 0,
      hostFailed: 0,
      failed: results.length,
      warning: 'books-search/catalog-unavailable'
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { success: false, code: 'books-search/method-not-allowed' });
  }

  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'books-search',
    limit: 40,
    windowMs: 15 * 60 * 1000
  });

  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, {
      success: false,
      code: 'books-search/rate-limited',
      message: 'Trop de recherches en peu de temps. Reessaie dans quelques minutes.'
    });
  }

  const body = req.method === 'POST' ? await readJsonBody(req).catch(() => ({})) : {};
  const params = getSearchParams(req);
  const query = String(params.get('q') || body?.q || '').trim().slice(0, 120);
  const sources = getRequestedSources(params.get('sources') || body?.sources);

  if (query.length < 2) {
    return sendJson(res, 422, {
      success: false,
      code: 'books-search/query-too-short',
      message: 'La recherche doit contenir au moins 2 caracteres.'
    });
  }

  const sourceTasks = {
    gutendex: searchGutendex,
    librivox: searchLibriVox,
    'google-books': searchGoogleBooks,
    openlibrary: searchOpenLibrary,
    'internet-archive': searchInternetArchive,
    github: searchGitHub,
    'free-programming-books': searchFreeProgrammingBooks,
    'mdn-web-docs': searchMdnWebDocs,
    'react-documentation': searchOfficialDocs('react-documentation'),
    'firebase-documentation': searchOfficialDocs('firebase-documentation'),
    'vite-documentation': searchOfficialDocs('vite-documentation')
  };

  const responses = await Promise.allSettled(sources.map((source) => sourceTasks[source](query)));
  const results = responses.flatMap((response) => (response.status === 'fulfilled' ? response.value : []));
  const sourceCounts = Object.fromEntries(
    responses.map((response, index) => [
      sources[index],
      response.status === 'fulfilled' ? response.value.length : 0
    ])
  );
  const catalog = await persistSearchResults(results, {
    enabled: shouldAutoCatalog(params, body),
    autoHost: shouldAutoHost(params, body)
  });
  const persistedBooks = catalog.books || new Map();
  const hydratedResults = results.map((book) => persistedBooks.get(toStableBookId(book)) || book);
  delete catalog.books;
  const errors = responses
    .map((response, index) => ({
      source: sources[index],
      error: response.status === 'rejected' ? String(response.reason?.message || response.reason) : ''
    }))
    .filter((item) => item.error);

  return sendJson(res, 200, {
    success: true,
    query,
    sources,
    sourceCounts,
    count: hydratedResults.length,
    results: hydratedResults,
    catalog,
    errors
  });
}
