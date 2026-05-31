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

function toSubject(value) {
  return sanitizeText(value, 160) || 'Question générale';
}

function toSubjectKey(value) {
  return sanitizeText(value, 160)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'question-generale';
}

function toSafeTimestampMillis(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function getRequestMetadata(req) {
  return {
    userAgent: sanitizeText(req.headers?.['user-agent'], 360),
    referer: sanitizeText(req.headers?.referer || req.headers?.referrer, 500),
    acceptLanguage: sanitizeText(req.headers?.['accept-language'], 160)
  };
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
  const subject = toSubject(body?.subject);
  const subjectKey = toSubjectKey(subject);
  const message = sanitizeText(body?.message, 4000);
  const source = toSource(body?.source);
  const formStartedAtMillis = toSafeTimestampMillis(body?.formStartedAt);
  const submittedAtMillis = Date.now();
  const completionMs = formStartedAtMillis ? Math.max(0, submittedAtMillis - formStartedAtMillis) : null;
  const metadata = getRequestMetadata(req);

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

  let leadRef = null;
  let byEmailRef = null;

  try {
    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();
    leadRef = db.collection(COLLECTION_NAME).doc();

    await leadRef.set({
      schemaVersion: 2,
      name,
      email,
      subject,
      message,
      source,
      status: 'new',
      priority: subjectKey === 'partenariat' ? 'high' : 'normal',
      contact: {
        name,
        email
      },
      messageInfo: {
        subject,
        subjectKey,
        body: message,
        preview: message.slice(0, 180),
        length: message.length
      },
      form: {
        source,
        hasSubject: Boolean(sanitizeText(body?.subject, 160)),
        startedAtMillis: formStartedAtMillis || null,
        submittedAtMillis,
        completionMs
      },
      tracking: metadata,
      integrations: {
        brevo: {
          status: 'pending',
          syncedAt: null,
          error: ''
        }
      },
      createdAt: now,
      updatedAt: now
    });

    byEmailRef = db.collection(`${COLLECTION_NAME}ByEmail`).doc(toDocId(email));
    await byEmailRef.set(
      {
        schemaVersion: 2,
        name,
        email,
        subject,
        source,
        lastMessage: message,
        contact: {
          name,
          email
        },
        latestMessage: {
          id: leadRef.id,
          subject,
          subjectKey,
          body: message,
          preview: message.slice(0, 180),
          source,
          status: 'new',
          createdAt: now
        },
        stats: {
          messageCount: FieldValue.increment(1)
        },
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

    if (leadRef) {
      await leadRef.set(
        {
          integrations: {
            brevo: {
              status: 'synced',
              syncedAt: FieldValue.serverTimestamp(),
              error: ''
            }
          },
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('contact/brevo-sync-error', error);
    const details = String(error?.message || '').trim().slice(0, 240);

    if (leadRef) {
      await leadRef.set(
        {
          integrations: {
            brevo: {
              status: 'failed',
              syncedAt: null,
              error: details
            }
          },
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      ).catch(() => {});
    }

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
