import {
  BOOKS_COLLECTION,
  normalizeHostedBook,
  sanitizeBookText,
  toBookCatalogPayload,
  toSeoSlug,
  toStableBookId
} from '../_lib/books.js';
import { FieldValue, getAdminDb } from '../_lib/firebaseAdmin.js';
import { readJsonBody, sendJson } from '../_lib/http.js';
import { checkRateLimit } from '../_lib/rateLimit.js';

function getSearchParams(req) {
  const host = req.headers?.host || 'localhost';
  return new URL(req.url || '/', `https://${host}`).searchParams;
}

function toDocIdCandidate(value) {
  return sanitizeBookText(value, 180)
    .toLowerCase()
    .replace(/[\/#?\[\]]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPositiveInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

function toAverageRating(data) {
  const average = Number(data?.averageRating);
  if (Number.isFinite(average) && average > 0) return Math.min(5, Math.max(0, average));

  const ratingCount = toPositiveInteger(data?.ratingCount);
  const ratingTotal = Number(data?.ratingTotal);
  if (ratingCount > 0 && Number.isFinite(ratingTotal)) {
    return Math.min(5, Math.max(0, ratingTotal / ratingCount));
  }

  return 0;
}

function serializeTimestamp(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeAppreciation(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    rating: Math.min(5, Math.max(1, Math.round(Number(data?.rating) || 1))),
    authorName: sanitizeBookText(data?.authorName, 80) || 'Lecteur JC Hub',
    comment: sanitizeBookText(data?.comment, 500),
    createdAt: serializeTimestamp(data?.createdAt)
  };
}

async function getRecentAppreciations(docRef) {
  try {
    const snapshot = await docRef.collection('appreciations').orderBy('createdAt', 'desc').limit(3).get();
    return snapshot.docs.map(normalizeAppreciation).filter((item) => item.comment);
  } catch {
    return [];
  }
}

async function buildStats(docRef, data) {
  const recentAppreciations = await getRecentAppreciations(docRef);
  const latestAppreciation =
    recentAppreciations[0] ||
    (data?.latestAppreciation
      ? {
          id: 'latest',
          rating: Math.min(5, Math.max(1, Math.round(Number(data.latestAppreciation.rating) || 1))),
          authorName: sanitizeBookText(data.latestAppreciation.authorName, 80) || 'Lecteur JC Hub',
          comment: sanitizeBookText(data.latestAppreciation.comment, 500),
          createdAt: serializeTimestamp(data.latestAppreciation.createdAt)
        }
      : null);

  return {
    viewsCount: toPositiveInteger(data?.viewsCount),
    ratingCount: toPositiveInteger(data?.ratingCount),
    averageRating: Number(toAverageRating(data).toFixed(1)),
    appreciationCount: toPositiveInteger(data?.appreciationCount),
    latestAppreciation,
    recentAppreciations
  };
}

function getPayloadIdentifiers(req, body = {}) {
  const params = getSearchParams(req);
  const book = body.book || {};

  return {
    id: toDocIdCandidate(params.get('id') || body.id || book.id),
    categorySlug: toSeoSlug(params.get('category') || body.categorySlug || body.category || book.categorySlug || book.category, 'general'),
    slug: toSeoSlug(params.get('slug') || body.slug || book.slug || book.title, ''),
    book
  };
}

async function resolveBookDoc(collection, identifiers, { allowCreate = false } = {}) {
  const candidates = [
    identifiers.id,
    toDocIdCandidate(identifiers.book?.id),
    identifiers.book?.title ? toDocIdCandidate(toStableBookId(identifiers.book)) : ''
  ].filter(Boolean);

  for (const candidate of [...new Set(candidates)]) {
    const ref = collection.doc(candidate);
    const snapshot = await ref.get();
    if (snapshot.exists) return { ref, snapshot };
  }

  if (identifiers.slug) {
    const snapshot = await collection.where('slug', '==', identifiers.slug).limit(10).get();
    const matchingDoc =
      snapshot.docs.find((doc) => toSeoSlug(doc.data()?.categorySlug || doc.data()?.category, 'general') === identifiers.categorySlug) ||
      snapshot.docs[0];

    if (matchingDoc) return { ref: matchingDoc.ref, snapshot: matchingDoc };
  }

  if (allowCreate && identifiers.book?.title) {
    const docId = toDocIdCandidate(toStableBookId(identifiers.book));
    const ref = collection.doc(docId);
    await ref.set(toBookCatalogPayload(identifiers.book, { now: FieldValue.serverTimestamp() }), { merge: true });
    return { ref, snapshot: await ref.get() };
  }

  return null;
}

function getRateLimit(req, action) {
  return checkRateLimit(req, {
    keyPrefix: `books-interactions-${action}`,
    limit: action === 'appreciation' ? 12 : 120,
    windowMs: 15 * 60 * 1000
  });
}

async function handleRead(req, res) {
  const rateLimit = getRateLimit(req, 'read');
  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, { success: false, code: 'books-interactions/rate-limited' });
  }

  const collection = getAdminDb().collection(BOOKS_COLLECTION);
  const resolved = await resolveBookDoc(collection, getPayloadIdentifiers(req), { allowCreate: false });

  if (!resolved) {
    return sendJson(res, 404, {
      success: false,
      code: 'books-interactions/not-found',
      message: "Ce livre n'est pas encore disponible dans le catalogue."
    });
  }

  return sendJson(res, 200, {
    success: true,
    book: normalizeHostedBook(resolved.ref.id, resolved.snapshot.data()),
    stats: await buildStats(resolved.ref, resolved.snapshot.data())
  });
}

async function handleView(req, res, body) {
  const rateLimit = getRateLimit(req, 'view');
  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, { success: false, code: 'books-interactions/rate-limited' });
  }

  const collection = getAdminDb().collection(BOOKS_COLLECTION);
  const resolved = await resolveBookDoc(collection, getPayloadIdentifiers(req, body), { allowCreate: true });

  if (!resolved) {
    return sendJson(res, 404, {
      success: false,
      code: 'books-interactions/not-found',
      message: "Ce livre n'est pas encore disponible dans le catalogue."
    });
  }

  await resolved.ref.set(
    {
      viewsCount: FieldValue.increment(1),
      lastViewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  const snapshot = await resolved.ref.get();
  return sendJson(res, 200, {
    success: true,
    book: normalizeHostedBook(resolved.ref.id, snapshot.data()),
    stats: await buildStats(resolved.ref, snapshot.data())
  });
}

async function handleAppreciation(req, res, body) {
  const rateLimit = getRateLimit(req, 'appreciation');
  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, { success: false, code: 'books-interactions/rate-limited' });
  }

  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 0)));
  const authorName = sanitizeBookText(body.authorName, 80);
  const comment = sanitizeBookText(body.comment, 500);

  if (!rating || authorName.length < 2 || comment.length < 3) {
    return sendJson(res, 422, {
      success: false,
      code: 'books-interactions/invalid-appreciation',
      message: 'Ajoute ton nom, une note et un commentaire d’au moins 3 caractères.'
    });
  }

  const db = getAdminDb();
  const collection = db.collection(BOOKS_COLLECTION);
  const resolved = await resolveBookDoc(collection, getPayloadIdentifiers(req, body), { allowCreate: true });

  if (!resolved) {
    return sendJson(res, 404, {
      success: false,
      code: 'books-interactions/not-found',
      message: "Ce livre n'est pas encore disponible dans le catalogue."
    });
  }

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(resolved.ref);
    const data = snapshot.data() || {};
    const nextRatingCount = toPositiveInteger(data.ratingCount) + 1;
    const nextRatingTotal = Number(data.ratingTotal || 0) + rating;
    const appreciationRef = resolved.ref.collection('appreciations').doc();
    const appreciation = {
      rating,
      authorName,
      comment,
      createdAt: FieldValue.serverTimestamp()
    };

    transaction.set(appreciationRef, appreciation);
    transaction.set(
      resolved.ref,
      {
        ratingCount: nextRatingCount,
        ratingTotal: nextRatingTotal,
        averageRating: Number((nextRatingTotal / nextRatingCount).toFixed(2)),
        appreciationCount: FieldValue.increment(1),
        latestAppreciation: appreciation,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });

  const snapshot = await resolved.ref.get();
  return sendJson(res, 200, {
    success: true,
    book: normalizeHostedBook(resolved.ref.id, snapshot.data()),
    stats: await buildStats(resolved.ref, snapshot.data())
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { success: false, code: 'books-interactions/method-not-allowed' });
  }

  try {
    if (req.method === 'GET') return handleRead(req, res);

    const body = await readJsonBody(req, { maxBytes: 24 * 1024 }).catch(() => ({}));
    const action = sanitizeBookText(body.action, 40).toLowerCase();

    if (action === 'view') return handleView(req, res, body);
    if (action === 'appreciation') return handleAppreciation(req, res, body);

    return sendJson(res, 422, {
      success: false,
      code: 'books-interactions/invalid-action',
      message: 'Action livre invalide.'
    });
  } catch (error) {
    console.error('books-interactions/error', error);
    return sendJson(res, 503, {
      success: false,
      code: 'books-interactions/unavailable',
      message: 'Les interactions du livre ne sont pas disponibles pour le moment.'
    });
  }
}
