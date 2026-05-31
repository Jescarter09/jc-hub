import { BOOKS_COLLECTION, normalizeHostedBook } from '../_lib/books.js';
import { Timestamp, getAdminDb } from '../_lib/firebaseAdmin.js';
import { sendJson } from '../_lib/http.js';
import { checkRateLimit } from '../_lib/rateLimit.js';

const DEFAULT_BOOKS_LIMIT = 500;
const MAX_BOOKS_LIMIT = 500;

function getDefaultBooksLimit() {
  const configured = Number(process.env.BOOKS_VISIBLE_LIMIT);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 1), MAX_BOOKS_LIMIT) : DEFAULT_BOOKS_LIMIT;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { success: false, code: 'books-list/method-not-allowed' });
  }

  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'books-list',
    limit: 60,
    windowMs: 15 * 60 * 1000
  });

  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, {
      success: false,
      code: 'books-list/rate-limited'
    });
  }

  const params = new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`).searchParams;
  const limit = Math.min(Math.max(Number(params.get('limit')) || getDefaultBooksLimit(), 1), MAX_BOOKS_LIMIT);

  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(BOOKS_COLLECTION)
      .where('publishAt', '<=', Timestamp.now())
      .orderBy('publishAt', 'desc')
      .limit(limit)
      .get();
    const books = snapshot.docs.map((doc) => normalizeHostedBook(doc.id, doc.data()));

    return sendJson(res, 200, {
      success: true,
      count: books.length,
      books
    });
  } catch (error) {
    console.error('books-list/firestore-read-error', error);
    return sendJson(res, 200, {
      success: true,
      count: 0,
      books: [],
      warning: 'books-list/unavailable'
    });
  }
}
