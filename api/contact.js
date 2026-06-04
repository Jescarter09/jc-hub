import { resolveBrevoListIds, sendBrevoTransactionalEmail, upsertBrevoContact } from './_lib/brevo.js';
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toMultilineHtml(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function getSiteUrl() {
  return String(process.env.VITE_SITE_URL || 'https://jchub.vercel.app').trim().replace(/\/+$/, '');
}

function getContactNotificationEmail() {
  return String(
    process.env.CONTACT_NOTIFICATION_EMAIL ||
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.BREVO_SENDER_EMAIL ||
      process.env.NEWSLETTER_SENDER_EMAIL ||
      ''
  ).trim();
}

function buildEmailLayout({ eyebrow, title, intro, children, footer }) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f5f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e8edf5;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(23,32,51,.08);">
            <tr>
              <td style="background:#172033;padding:26px 28px;color:#ffffff;">
                <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9ee8c6;font-weight:700;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0;font-size:26px;line-height:1.2;color:#ffffff;">${escapeHtml(title)}</h1>
                <p style="margin:12px 0 0;color:#dbe5f3;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${children}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e8edf5;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">${escapeHtml(footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildContactAutoReplyEmail({ name, subject }) {
  const safeName = name || 'Bonjour';
  const htmlContent = buildEmailLayout({
    eyebrow: 'Message recu',
    title: 'Nous avons bien recu votre message',
    intro: `Merci ${safeName}. L'equipe JC Hub va lire votre demande et vous repondre dans les prochaines 24h.`,
    children: `
      <div style="border:1px solid #e8edf5;border-radius:14px;background:#f8fafc;padding:18px 20px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;">Sujet</p>
        <p style="margin:0;color:#172033;font-size:16px;line-height:1.6;">${escapeHtml(subject)}</p>
      </div>
      <p style="margin:22px 0 0;color:#334155;font-size:15px;line-height:1.8;">
        Vous n'avez rien d'autre a faire pour le moment. Si votre demande contient une urgence ou une precision importante,
        vous pouvez repondre directement a cet email.
      </p>
      <p style="margin:24px 0 0;">
        <a href="${escapeHtml(getSiteUrl())}" style="display:inline-block;background:#5b3dff;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;">Retourner sur JC Hub</a>
      </p>
    `,
    footer: 'JC Hub vous envoie cet accuse de reception automatique apres votre message via le formulaire de contact.'
  });

  return {
    subject: 'JC Hub - Nous avons bien recu votre message',
    htmlContent,
    textContent: `Bonjour ${safeName},\n\nNous avons bien recu votre message (${subject}). Nous allons vous repondre dans les prochaines 24h.\n\nJC Hub`
  };
}

function buildContactNotificationEmail({ name, email, subject, message, source }) {
  const htmlContent = buildEmailLayout({
    eyebrow: 'Nouveau contact',
    title: 'Nouveau message recu sur JC Hub',
    intro: `${name} vient d'envoyer un message depuis ${source}.`,
    children: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e8edf5;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:14px 18px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:700;width:130px;">Nom</td><td style="padding:14px 18px;color:#172033;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:14px 18px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:700;">Email</td><td style="padding:14px 18px;color:#172033;">${escapeHtml(email)}</td></tr>
        <tr><td style="padding:14px 18px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:700;">Sujet</td><td style="padding:14px 18px;color:#172033;">${escapeHtml(subject)}</td></tr>
      </table>
      <div style="margin-top:18px;border:1px solid #e8edf5;border-radius:14px;background:#ffffff;padding:18px 20px;">
        <p style="margin:0 0 10px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;">Message</p>
        <p style="margin:0;color:#172033;font-size:15px;line-height:1.8;">${toMultilineHtml(message)}</p>
      </div>
    `,
    footer: 'Reponds directement a cet email pour contacter le visiteur.'
  });

  return {
    subject: `JC Hub - Nouveau message: ${subject}`,
    htmlContent,
    textContent: `Nouveau message JC Hub\n\nNom: ${name}\nEmail: ${email}\nSujet: ${subject}\nSource: ${source}\n\n${message}`
  };
}

async function sendContactEmails({ name, email, subject, message, source }) {
  const notificationEmail = getContactNotificationEmail();
  const autoReply = buildContactAutoReplyEmail({ name, subject });
  const notification = buildContactNotificationEmail({ name, email, subject, message, source });

  await sendBrevoTransactionalEmail({
    to: [email],
    subject: autoReply.subject,
    htmlContent: autoReply.htmlContent,
    textContent: autoReply.textContent,
    replyTo: notificationEmail || undefined
  });

  if (notificationEmail) {
    await sendBrevoTransactionalEmail({
      to: [notificationEmail],
      subject: notification.subject,
      htmlContent: notification.htmlContent,
      textContent: notification.textContent,
      replyTo: email
    });
  }
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
        },
        email: {
          status: 'pending',
          sentAt: null,
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

  try {
    await sendContactEmails({ name, email, subject, message, source });

    if (leadRef) {
      await leadRef.set(
        {
          integrations: {
            email: {
              status: 'sent',
              sentAt: FieldValue.serverTimestamp(),
              error: ''
            }
          },
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('contact/email-send-error', error);
    const details = String(error?.message || '').trim().slice(0, 240);

    if (leadRef) {
      await leadRef.set(
        {
          integrations: {
            email: {
              status: 'failed',
              sentAt: null,
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
      code: 'contact/email-send-failed',
      message: 'Contact enregistre, mais l’envoi des emails automatiques a echoue.',
      details
    });
  }

  return sendJson(res, 200, {
    success: true
  });
}
