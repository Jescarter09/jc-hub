import { resolveBrevoListIds, upsertBrevoContact } from './_lib/brevo.js';
import { FieldValue, getAdminDb } from './_lib/firebaseAdmin.js';
import { isValidEmail, readJsonBody, sendJson } from './_lib/http.js';
import { checkRateLimit, isLikelyBotSubmission } from './_lib/rateLimit.js';

const COLLECTION_NAME = String(process.env.CONTACT_COLLECTION || 'contactLeads').trim();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function toSource(value) {
  const cleaned = sanitizeText(value, 64).toLowerCase();
  return cleaned || 'contact-form';
}

function toDocId(email) {
  return encodeURIComponent(email);
}

function parseExtraBrevoAttributes(message) {
  const attributeName = String(process.env.BREVO_CONTACT_MESSAGE_ATTRIBUTE || '').trim();
  if (!attributeName) return {};

  return {
    [attributeName]: message
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, code: 'contact/method-not-allowed' });
  }

  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'contact',
    limit: 5,
    windowMs: 15 * 60 * 1000
  });

  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return sendJson(res, 429, {
      success: false,
      code: 'contact/rate-limited',
      message: 'Trop de messages envoyes en peu de temps. Reessaie dans quelques minutes.'
    });
  }

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, {
      success: false,
      code: 'contact/invalid-json',
      message: 'Le corps de la requete doit etre un JSON valide.'
    });
  }

  if (isLikelyBotSubmission(body)) {
    return sendJson(res, 200, {
      success: true,
      status: 'ignored'
    });
  }

  const name = sanitizeText(body?.name, 120);
  const email = normalizeEmail(body?.email);
  const message = sanitizeText(body?.message, 4000);
  const source = toSource(body?.source);

  if (!name) {
    return sendJson(res, 422, {
      success: false,
      code: 'contact/invalid-name',
      message: 'Le nom est requis.'
    });
  }

  if (!isValidEmail(email)) {
    return sendJson(res, 422, {
      success: false,
      code: 'contact/invalid-email',
      message: 'Adresse email invalide.'
    });
  }

  if (!message) {
    return sendJson(res, 422, {
      success: false,
      code: 'contact/invalid-message',
      message: 'Le message est requis.'
    });
  }

  try {
    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();
    const leadRef = db.collection(COLLECTION_NAME).doc();

    await leadRef.set({
      name,
      email,
      message,
      source,
      status: 'new',
      createdAt: now,
      updatedAt: now
    });

    const byEmailRef = db.collection(`${COLLECTION_NAME}ByEmail`).doc(toDocId(email));
    await byEmailRef.set(
      {
        name,
        email,
        source,
        lastMessage: message,
        updatedAt: now,
        lastContactAt: now
      },
      { merge: true }
    );
  } catch (error) {
    console.error('contact/firestore-write-error', error);
    return sendJson(res, 500, {
      success: false,
      code: 'contact/database-write-failed',
      message: "Impossible d'enregistrer le contact dans la base de donnees."
    });
  }

  try {
    await upsertBrevoContact({
      email,
      fullName: name,
      listIds: resolveBrevoListIds({ type: 'contact' }),
      extraAttributes: parseExtraBrevoAttributes(message)
    });
  } catch (error) {
    console.error('contact/brevo-sync-error', error);
    const details = String(error?.message || '').trim().slice(0, 240);
    return sendJson(res, 502, {
      success: false,
      code: 'contact/brevo-sync-failed',
      message: 'Contact enregistre, mais la synchronisation Brevo a echoue.',
      details
    });
  }

  return sendJson(res, 200, {
    success: true
  });
}
