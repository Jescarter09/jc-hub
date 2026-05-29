import { resolveBrevoListIds, upsertBrevoContact } from './_lib/brevo.js';
import { FieldValue, getAdminDb } from './_lib/firebaseAdmin.js';
import { isValidEmail, readJsonBody, sendJson } from './_lib/http.js';
import { checkRateLimit, isLikelyBotSubmission } from './_lib/rateLimit.js';

const COLLECTION_NAME = String(process.env.NEWSLETTER_COLLECTION || 'newsletterSubscribers').trim();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeSource(value) {
  const cleaned = String(value || '').trim().toLowerCase();
  if (!cleaned) return 'unknown';
  return cleaned.slice(0, 64);
}

function toSubscriberDocId(email) {
  return encodeURIComponent(email);
}

function toUniqueSources(existingSources, nextSource) {
  const safeList = Array.isArray(existingSources)
    ? existingSources
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  if (!safeList.includes(nextSource)) {
    safeList.push(nextSource);
  }

  return safeList;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, code: 'newsletter/method-not-allowed' });
  }

  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'newsletter',
    limit: 8,
    windowMs: 60 * 60 * 1000
  });

  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, {
      success: false,
      code: 'newsletter/rate-limited',
      message: "Trop de tentatives d'inscription. Reessaie un peu plus tard."
    });
  }

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, {
      success: false,
      code: 'newsletter/invalid-json',
      message: 'Le corps de la requete doit etre un JSON valide.'
    });
  }

  if (isLikelyBotSubmission(body, { minAgeMs: 1000 })) {
    return sendJson(res, 200, {
      success: true,
      status: 'ignored'
    });
  }

  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) {
    return sendJson(res, 422, {
      success: false,
      code: 'newsletter/invalid-email',
      message: 'Adresse email invalide.'
    });
  }

  const source = sanitizeSource(body?.source);

  let status = 'subscribed';
  try {
    const db = getAdminDb();
    const docRef = db.collection(COLLECTION_NAME).doc(toSubscriberDocId(email));
    const snapshot = await docRef.get();
    const existing = snapshot.exists ? snapshot.data() || {} : null;
    const existingStatus = String(existing?.status || '').toLowerCase();

    status = existing
      ? existingStatus === 'active'
        ? 'already-subscribed'
        : 'reactivated'
      : 'subscribed';

    const payload = {
      email,
      status: 'active',
      consent: true,
      source,
      lastSource: source,
      sources: toUniqueSources(existing?.sources, source),
      updatedAt: FieldValue.serverTimestamp(),
      lastSignupAttemptAt: FieldValue.serverTimestamp()
    };

    if (!existing) {
      payload.createdAt = FieldValue.serverTimestamp();
      payload.subscribedAt = FieldValue.serverTimestamp();
    }

    if (existing && existingStatus !== 'active') {
      payload.reactivatedAt = FieldValue.serverTimestamp();
      payload.unsubscribedAt = null;
    }

    await docRef.set(payload, { merge: true });
  } catch (error) {
    console.error('newsletter/firestore-write-error', error);
    return sendJson(res, 500, {
      success: false,
      code: 'newsletter/database-write-failed',
      message: "Impossible d'enregistrer l'abonnement dans la base de donnees."
    });
  }

  try {
    await upsertBrevoContact({
      email,
      listIds: resolveBrevoListIds({ type: 'newsletter' })
    });
  } catch (error) {
    console.error('newsletter/brevo-sync-error', error);
    const details = String(error?.message || '').trim().slice(0, 240);
    return sendJson(res, 502, {
      success: false,
      code: 'newsletter/brevo-sync-failed',
      message: 'Abonnement sauvegarde, mais la synchronisation Brevo a echoue.',
      details
    });
  }

  return sendJson(res, 200, {
    success: true,
    status,
    email
  });
}
