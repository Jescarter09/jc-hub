import { readJsonBody, sendJson } from '../_lib/http.js';
import { checkRateLimit } from '../_lib/rateLimit.js';
import {
  normalizeArchiveBook,
  normalizeGoogleBook,
  normalizeGutendexBook,
  normalizeOpenLibraryBook
} from '../_lib/books.js';

const DEFAULT_SOURCES = ['gutendex', 'google-books', 'openlibrary', 'internet-archive'];

async function fetchJson(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json'
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

async function searchGutendex(query) {
  const payload = await fetchJson(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`);
  return (payload?.results || []).slice(0, 12).map(normalizeGutendexBook);
}

async function searchGoogleBooks(query) {
  const payload = await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12`
  );
  return (payload?.items || []).slice(0, 12).map(normalizeGoogleBook);
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
    'google-books': searchGoogleBooks,
    openlibrary: searchOpenLibrary,
    'internet-archive': searchInternetArchive
  };

  const responses = await Promise.allSettled(sources.map((source) => sourceTasks[source](query)));
  const results = responses.flatMap((response) => (response.status === 'fulfilled' ? response.value : []));
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
    count: results.length,
    results,
    errors
  });
}
