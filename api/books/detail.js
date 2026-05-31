import { BOOKS_COLLECTION, isBookPublished, normalizeHostedBook, toSeoSlug } from '../_lib/books.js';
import { Timestamp, getAdminDb } from '../_lib/firebaseAdmin.js';
import { sendJson } from '../_lib/http.js';
import { checkRateLimit } from '../_lib/rateLimit.js';

function getSearchParams(req) {
  const host = req.headers?.host || 'localhost';
  return new URL(req.url || '/', `https://${host}`).searchParams;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { success: false, code: 'books-detail/method-not-allowed' });
  }

  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'books-detail',
    limit: 80,
    windowMs: 15 * 60 * 1000
  });

  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, {
      success: false,
      code: 'books-detail/rate-limited'
    });
  }

  const params = getSearchParams(req);
  const categorySlug = toSeoSlug(params.get('category'), 'general');
  const slug = toSeoSlug(params.get('slug'), '');

  if (!slug) {
    return sendJson(res, 422, {
      success: false,
      code: 'books-detail/missing-slug',
      message: 'Slug du livre manquant.'
    });
  }

  try {
    const collection = getAdminDb().collection(BOOKS_COLLECTION);
    const snapshot = await collection.where('slug', '==', slug).limit(10).get();

    const publishedDocs = snapshot.docs.filter((doc) => isBookPublished(doc.data()));
    const matchingDoc =
      publishedDocs.find((doc) => toSeoSlug(doc.data()?.categorySlug || doc.data()?.category, 'general') === categorySlug) ||
      publishedDocs[0];

    if (matchingDoc) {
      const book = normalizeHostedBook(matchingDoc.id, matchingDoc.data());
      return sendJson(res, 200, {
        success: true,
        book
      });
    }

    const fallbackSnapshot = await collection.where('publishAt', '<=', Timestamp.now()).limit(500).get();
    const fallbackDoc = fallbackSnapshot.docs.find((doc) => {
      const book = normalizeHostedBook(doc.id, doc.data());
      return book.slug === slug && book.categorySlug === categorySlug;
    });

    if (!fallbackDoc) {
      return sendJson(res, 404, {
        success: false,
        code: 'books-detail/not-found',
        message: "Ce livre n'est pas encore disponible dans le catalogue."
      });
    }

    const book = normalizeHostedBook(fallbackDoc.id, fallbackDoc.data());
    return sendJson(res, 200, {
      success: true,
      book
    });
  } catch (error) {
    console.error('books-detail/firestore-read-error', error);
    return sendJson(res, 503, {
      success: false,
      code: 'books-detail/unavailable',
      message: 'Les détails du livre ne sont pas disponibles pour le moment.'
    });
  }
}
