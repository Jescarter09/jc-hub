import { Readable } from 'node:stream';
import { BOOKS_COLLECTION, isBookPublished, sanitizeBookText } from '../_lib/books.js';
import { getAdminDb } from '../_lib/firebaseAdmin.js';
import { sendJson } from '../_lib/http.js';
import { checkRateLimit } from '../_lib/rateLimit.js';

function getSearchParams(req) {
  return new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`).searchParams;
}

function toSafeFilename(value) {
  return `${sanitizeBookText(value, 120) || 'jc-hub-book'}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'jc-hub-book';
}

function getHostedFileUrl(data) {
  return sanitizeBookText(data?.fileUrl || data?.pdfUrl, 900);
}

function copyHeader(source, target, name) {
  const value = source.headers.get(name);
  if (value) target.setHeader(name, value);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { success: false, code: 'books-read/method-not-allowed' });
  }

  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'books-read',
    limit: 120,
    windowMs: 15 * 60 * 1000
  });

  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, {
      success: false,
      code: 'books-read/rate-limited'
    });
  }

  const params = getSearchParams(req);
  const id = sanitizeBookText(params.get('id'), 220);
  const download = params.get('download') === '1' || params.get('download') === 'true';

  if (!id) {
    return sendJson(res, 422, {
      success: false,
      code: 'books-read/missing-id',
      message: 'Identifiant du livre manquant.'
    });
  }

  try {
    const doc = await getAdminDb().collection(BOOKS_COLLECTION).doc(id).get();
    if (!doc.exists || !isBookPublished(doc.data())) {
      return sendJson(res, 404, {
        success: false,
        code: 'books-read/not-found',
        message: "Ce livre n'est pas disponible."
      });
    }

    const data = doc.data() || {};
    const fileUrl = getHostedFileUrl(data);
    const canReadInternally = data.isHosted === true && data.canReadOnline !== false && Boolean(fileUrl);

    if (!canReadInternally || !/^https:\/\//i.test(fileUrl)) {
      return sendJson(res, 403, {
        success: false,
        code: 'books-read/not-internal',
        message: 'La lecture interne est disponible uniquement pour les livres heberges par JC Hub.'
      });
    }

    const upstream = await fetch(fileUrl, {
      headers: req.headers?.range ? { Range: req.headers.range } : undefined,
      redirect: 'follow'
    });

    if (!upstream.ok && upstream.status !== 206) {
      return sendJson(res, 502, {
        success: false,
        code: 'books-read/upstream-unavailable',
        message: 'Le fichier du livre est temporairement indisponible.'
      });
    }

    const filename = `${toSafeFilename(data.title || doc.id)}.pdf`;
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/pdf');
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    copyHeader(upstream, res, 'content-length');
    copyHeader(upstream, res, 'content-range');
    copyHeader(upstream, res, 'accept-ranges');

    if (req.method === 'HEAD') {
      res.end();
      return undefined;
    }

    if (!upstream.body) {
      res.end();
      return undefined;
    }

    return Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    console.error('books-read/error', error);
    return sendJson(res, 503, {
      success: false,
      code: 'books-read/unavailable',
      message: 'La lecture du livre est indisponible pour le moment.'
    });
  }
}
