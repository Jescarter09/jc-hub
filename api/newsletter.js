import { resolveBrevoListIds, sendBrevoTransactionalEmail, upsertBrevoContact } from './_lib/brevo.js';
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSiteUrl() {
  return String(process.env.VITE_SITE_URL || 'https://jchub.vercel.app').trim().replace(/\/+$/, '');
}

function buildNewsletterWelcomeEmail() {
  const siteUrl = getSiteUrl();
  const htmlContent = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bienvenue dans la newsletter JC Hub</title>
  </head>
  <body style="margin:0;background:#f5f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e8edf5;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(23,32,51,.08);">
            <tr>
              <td style="background:#172033;padding:28px;color:#ffffff;">
                <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9ee8c6;font-weight:700;">Newsletter confirmee</p>
                <h1 style="margin:0;font-size:27px;line-height:1.2;color:#ffffff;">Bienvenue dans JC Hub</h1>
                <p style="margin:12px 0 0;color:#dbe5f3;font-size:15px;line-height:1.7;">Votre inscription est bien prise en compte. Vous recevrez les prochains livres, articles et ressources utiles directement par email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <div style="display:block;border:1px solid #e8edf5;border-radius:14px;background:#f8fafc;padding:18px 20px;">
                  <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;">Ce que vous allez recevoir</p>
                  <ul style="margin:0;padding-left:20px;color:#334155;font-size:15px;line-height:1.9;">
                    <li>Nouveaux livres disponibles sur la plateforme</li>
                    <li>Articles pratiques et guides JC Hub</li>
                    <li>Ressources choisies pour apprendre plus efficacement</li>
                  </ul>
                </div>
                <p style="margin:24px 0 0;">
                  <a href="${escapeHtml(siteUrl)}/ebooks" style="display:inline-block;background:#5b3dff;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;">Explorer les livres</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e8edf5;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">Vous recevez cet email car vous venez de vous inscrire a la newsletter JC Hub.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: 'Bienvenue dans la newsletter JC Hub',
    htmlContent,
    textContent:
      'Bienvenue dans la newsletter JC Hub.\n\nVotre inscription est bien prise en compte. Vous recevrez les prochains livres, articles et ressources utiles directement par email.\n\nExplorer les livres: ' +
      `${siteUrl}/ebooks`
  };
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
  let subscriberRef = null;
  try {
    const db = getAdminDb();
    subscriberRef = db.collection(COLLECTION_NAME).doc(toSubscriberDocId(email));
    const snapshot = await subscriberRef.get();
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

    await subscriberRef.set(payload, { merge: true });
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

  if (status !== 'already-subscribed') {
    try {
      const welcomeEmail = buildNewsletterWelcomeEmail();
      await sendBrevoTransactionalEmail({
        to: [email],
        subject: welcomeEmail.subject,
        htmlContent: welcomeEmail.htmlContent,
        textContent: welcomeEmail.textContent
      });

      if (subscriberRef) {
        await subscriberRef.set(
          {
            welcomeEmail: {
              status: 'sent',
              sentAt: FieldValue.serverTimestamp(),
              error: ''
            },
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('newsletter/welcome-email-error', error);
      const details = String(error?.message || '').trim().slice(0, 240);

      if (subscriberRef) {
        await subscriberRef.set(
          {
            welcomeEmail: {
              status: 'failed',
              sentAt: null,
              error: details
            },
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        ).catch(() => {});
      }

      return sendJson(res, 502, {
        success: false,
        code: 'newsletter/welcome-email-failed',
        message: 'Abonnement sauvegarde, mais l’email de confirmation a echoue.',
        details
      });
    }
  }

  return sendJson(res, 200, {
    success: true,
    status,
    email
  });
}
