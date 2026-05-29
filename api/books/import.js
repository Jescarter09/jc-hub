import { FieldValue, getAdminDb } from '../_lib/firebaseAdmin.js';
import { readJsonBody, sendJson } from '../_lib/http.js';
import { checkRateLimit } from '../_lib/rateLimit.js';
import { uploadRemoteResourceToCloudinary } from '../_lib/cloudinaryUpload.js';
import { BOOKS_COLLECTION, canRedistributeBook, sanitizeBookText, toStableBookId } from '../_lib/books.js';

function getHeader(req, name) {
  const direct = req.headers?.[name.toLowerCase()];
  return Array.isArray(direct) ? direct[0] : String(direct || '');
}

function assertImportAuthorized(req) {
  const expectedToken = String(process.env.BOOKS_IMPORT_TOKEN || '').trim();
  if (!expectedToken) {
    return {
      ok: false,
      status: 503,
      code: 'books-import/token-not-configured',
      message: 'BOOKS_IMPORT_TOKEN doit etre configure cote serveur avant les imports.'
    };
  }

  const providedToken = getHeader(req, 'x-import-token') || getHeader(req, 'authorization').replace(/^Bearer\s+/i, '');
  if (providedToken !== expectedToken) {
    return {
      ok: false,
      status: 401,
      code: 'books-import/unauthorized',
      message: 'Import non autorise.'
    };
  }

  return { ok: true };
}

function getCloudinaryFolder() {
  return String(process.env.CLOUDINARY_BOOKS_FOLDER || 'jc-hub/books').trim();
}

function isTrustedGutendexDownload(remoteFileUrl) {
  try {
    const hostname = new URL(remoteFileUrl).hostname.toLowerCase();
    return hostname === 'gutenberg.org' || hostname.endsWith('.gutenberg.org') || hostname.endsWith('.pglaf.org');
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, code: 'books-import/method-not-allowed' });
  }

  const authorization = assertImportAuthorized(req);
  if (!authorization.ok) {
    return sendJson(res, authorization.status, {
      success: false,
      code: authorization.code,
      message: authorization.message
    });
  }

  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'books-import',
    limit: 12,
    windowMs: 60 * 60 * 1000
  });

  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, {
      success: false,
      code: 'books-import/rate-limited'
    });
  }

  let body = {};
  try {
    body = await readJsonBody(req, { maxBytes: 64 * 1024 });
  } catch {
    return sendJson(res, 400, {
      success: false,
      code: 'books-import/invalid-json'
    });
  }

  const book = body?.book || body;
  if (!canRedistributeBook(book)) {
    return sendJson(res, 403, {
      success: false,
      code: 'books-import/not-redistributable',
      message: 'Ce livre ne peut pas etre re heberge automatiquement. Utilise un lien externe.'
    });
  }

  const remoteFileUrl = sanitizeBookText(book?.downloadUrl || book?.pdfUrl, 800);
  if (!remoteFileUrl || !/^https?:\/\//i.test(remoteFileUrl)) {
    return sendJson(res, 422, {
      success: false,
      code: 'books-import/missing-download-url',
      message: 'Aucun fichier distant valide a importer.'
    });
  }

  const source = sanitizeBookText(book?.source, 80).toLowerCase();
  const reviewApproved = body?.reviewApproved === true || book?.reviewApproved === true;

  if (source === 'gutendex' && !isTrustedGutendexDownload(remoteFileUrl)) {
    return sendJson(res, 403, {
      success: false,
      code: 'books-import/untrusted-gutendex-url',
      message: 'Le fichier Gutendex doit provenir de Gutenberg ou de son CDN officiel.'
    });
  }

  if (source !== 'gutendex' && !reviewApproved) {
    return sendJson(res, 409, {
      success: false,
      code: 'books-import/manual-review-required',
      message: 'Cette source demande une validation manuelle avant re hebergement.'
    });
  }

  const docId = toStableBookId(book);
  const folder = getCloudinaryFolder();
  const publicId = `${docId}-${Date.now()}`.slice(0, 180);

  try {
    const uploadedFile = await uploadRemoteResourceToCloudinary(remoteFileUrl, {
      resourceType: 'raw',
      folder,
      publicId
    });

    let hostedThumbnail = sanitizeBookText(book?.thumbnail, 800);
    if (hostedThumbnail && /^https?:\/\//i.test(hostedThumbnail) && book?.source === 'gutendex') {
      try {
        const uploadedCover = await uploadRemoteResourceToCloudinary(hostedThumbnail, {
          resourceType: 'image',
          folder: `${folder}/covers`,
          publicId: `${publicId}-cover`
        });
        hostedThumbnail = uploadedCover.secure_url || hostedThumbnail;
      } catch (error) {
        console.warn('books-import/cover-upload-skipped', error);
      }
    }

    const now = FieldValue.serverTimestamp();
    const payload = {
      title: sanitizeBookText(book?.title, 220),
      author: sanitizeBookText(book?.author, 220),
      description: sanitizeBookText(book?.description, 900),
      thumbnail: hostedThumbnail,
      source: sanitizeBookText(book?.source, 80),
      sourceId: sanitizeBookText(book?.sourceId || book?.id, 160),
      sourceLabel: sanitizeBookText(book?.sourceLabel, 80),
      isHosted: true,
      pdfUrl: uploadedFile.secure_url,
      downloadUrl: remoteFileUrl,
      externalLink: sanitizeBookText(book?.externalLink, 800),
      license: sanitizeBookText(book?.license || 'public-domain', 120),
      canRedistribute: true,
      publicDomain: book?.publicDomain === true,
      preferredFormat: sanitizeBookText(book?.preferredFormat || uploadedFile.format || 'raw', 40),
      cloudinaryPublicId: uploadedFile.public_id,
      cloudinaryResourceType: uploadedFile.resource_type,
      importedAt: now,
      updatedAt: now
    };

    await getAdminDb().collection(BOOKS_COLLECTION).doc(docId).set(payload, { merge: true });

    return sendJson(res, 200, {
      success: true,
      book: {
        id: docId,
        ...payload,
        importedAt: Date.now(),
        updatedAt: Date.now()
      }
    });
  } catch (error) {
    console.error('books-import/failed', error);
    return sendJson(res, 502, {
      success: false,
      code: 'books-import/upload-failed',
      message: "Impossible d'importer ce livre pour le moment."
    });
  }
}
