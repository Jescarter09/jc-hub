import { sendBrevoTransactionalEmail } from './_lib/brevo.js';
import { BOOKS_COLLECTION, normalizeHostedBook, sanitizeBookText } from './_lib/books.js';
import { FieldValue, Timestamp, getAdminDb } from './_lib/firebaseAdmin.js';
import { sendJson } from './_lib/http.js';

const NEWSLETTER_COLLECTION = String(process.env.NEWSLETTER_COLLECTION || 'newsletterSubscribers').trim();
const MAX_BOOKS_PER_EMAIL = Math.min(Math.max(Number(process.env.BOOKS_NEWSLETTER_LIMIT) || 30, 1), 50);
const MAX_RECIPIENTS_PER_SEND = Math.min(Math.max(Number(process.env.BREVO_NEWSLETTER_BATCH_SIZE) || 80, 1), 99);
const DEFAULT_SITE_URL = 'https://jchub.vercel.app';

function getHeader(req, name) {
  const direct = req.headers?.[name.toLowerCase()];
  return Array.isArray(direct) ? direct[0] : String(direct || '');
}

function assertCronAuthorized(req) {
  const expectedSecret = String(process.env.CRON_SECRET || '').trim();

  if (!expectedSecret) {
    return {
      ok: false,
      status: 503,
      code: 'books-newsletter/cron-secret-missing',
      message: 'CRON_SECRET doit etre configure cote serveur.'
    };
  }

  const authorization = getHeader(req, 'authorization');
  if (authorization !== `Bearer ${expectedSecret}`) {
    return {
      ok: false,
      status: 401,
      code: 'books-newsletter/unauthorized',
      message: 'Execution non autorisee.'
    };
  }

  return { ok: true };
}

function getSiteUrl() {
  return String(process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function toSubscriberEmail(doc) {
  const data = doc.data() || {};
  return String(data.email || '').trim().toLowerCase();
}

async function getActiveSubscriberEmails(db) {
  const collection = db.collection(NEWSLETTER_COLLECTION);
  const snapshots = await Promise.allSettled([
    collection.where('status', '==', 'active').get(),
    collection.where('isActive', '==', true).get()
  ]);
  const emails = new Set();

  for (const snapshot of snapshots) {
    if (snapshot.status !== 'fulfilled') continue;
    for (const doc of snapshot.value.docs) {
      const email = toSubscriberEmail(doc);
      if (email) emails.add(email);
    }
  }

  return [...emails];
}

async function reservePublishedBooks(db) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const leaseUntil = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);
  const snapshot = await db
    .collection(BOOKS_COLLECTION)
    .where('newsletterSent', '==', false)
    .get();
  const now = Date.now();
  const docs = snapshot.docs
    .filter((doc) => {
      const publishAt = doc.data()?.publishAt;
      const publishAtMillis = publishAt?.toMillis?.() || 0;
      return publishAtMillis > 0 && publishAtMillis <= now;
    })
    .sort((left, right) => {
      const leftMillis = left.data()?.publishAt?.toMillis?.() || 0;
      const rightMillis = right.data()?.publishAt?.toMillis?.() || 0;
      return leftMillis - rightMillis;
    })
    .slice(0, MAX_BOOKS_PER_EMAIL);

  const reserved = [];

  for (const doc of docs) {
    const reservedDoc = await db.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(doc.ref);
      const data = freshDoc.data() || {};
      const leaseExpiredAt = data.newsletterLeaseUntil?.toMillis?.() || 0;
      const isLocked = data.newsletterStatus === 'sending' && leaseExpiredAt > Date.now();

      if (!freshDoc.exists || data.newsletterSent === true || isLocked) {
        return null;
      }

      transaction.set(
        doc.ref,
        {
          newsletterStatus: 'sending',
          newsletterRunId: runId,
          newsletterLeaseUntil: leaseUntil,
          newsletterReservedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      return { id: doc.id, ref: doc.ref, data };
    });

    if (reservedDoc) reserved.push(reservedDoc);
  }

  return { runId, books: reserved };
}

function buildNewsletterEmail(books) {
  const siteUrl = getSiteUrl();
  const booksUrl = `${siteUrl}/ebooks`;
  const normalizedBooks = books.map((book) => normalizeHostedBook(book.id, book.data));
  const rows = normalizedBooks
    .map((book) => {
      const detailUrl = `${siteUrl}${book.detailPath || '/ebooks'}`;
      const author = book.author ? ` - ${book.author}` : '';

      return `
        <li style="margin:0 0 12px 0;">
          <a href="${escapeHtml(detailUrl)}" style="color:#0f766e;text-decoration:none;font-weight:700;">${escapeHtml(book.title)}</a>
          <span style="color:#475569;">${escapeHtml(author)}</span>
        </li>
      `;
    })
    .join('');

  const textLines = normalizedBooks.map((book) => `- ${book.title}${book.author ? ` - ${book.author}` : ''}`);

  return {
    subject: `Nouveaux livres disponibles sur JC Hub (${normalizedBooks.length})`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;">
        <h1 style="font-size:24px;margin:0 0 12px 0;">Nouveaux livres disponibles</h1>
        <p style="margin:0 0 20px 0;color:#334155;">Une nouvelle serie de livres vient d'etre ajoutee a la bibliotheque JC Hub.</p>
        <ul style="padding-left:20px;margin:0 0 24px 0;">${rows}</ul>
        <p style="margin:0 0 24px 0;">
          <a href="${escapeHtml(booksUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:12px 16px;border-radius:6px;text-decoration:none;font-weight:700;">Voir tous les livres</a>
        </p>
        <p style="font-size:12px;color:#64748b;margin:0;">Tu recois cet email car tu es abonne a la newsletter JC Hub.</p>
      </div>
    `,
    textContent: [
      'Nouveaux livres disponibles',
      '',
      "Une nouvelle serie de livres vient d'etre ajoutee a la bibliotheque JC Hub.",
      '',
      ...textLines,
      '',
      `Voir tous les livres: ${booksUrl}`
    ].join('\n')
  };
}

async function markBooksSent(db, books, { runId, recipientsCount }) {
  const batch = db.batch();
  for (const book of books) {
    batch.set(
      book.ref,
      {
        newsletterSent: true,
        newsletterSentAt: FieldValue.serverTimestamp(),
        newsletterStatus: 'sent',
        newsletterRunId: runId,
        newsletterRecipientsCount: recipientsCount,
        newsletterLeaseUntil: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }
  await batch.commit();
}

async function releaseBooksAfterFailure(db, books, { runId, error }) {
  const batch = db.batch();
  for (const book of books) {
    batch.set(
      book.ref,
      {
        newsletterStatus: 'failed',
        newsletterRunId: runId,
        newsletterLastError: sanitizeBookText(error?.message || error, 240),
        newsletterLeaseUntil: FieldValue.delete(),
        newsletterFailedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }
  await batch.commit();
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { success: false, code: 'books-newsletter/method-not-allowed' });
  }

  const authorization = assertCronAuthorized(req);
  if (!authorization.ok) {
    return sendJson(res, authorization.status, {
      success: false,
      code: authorization.code,
      message: authorization.message
    });
  }

  const db = getAdminDb();
  const { runId, books } = await reservePublishedBooks(db);

  if (books.length === 0) {
    return sendJson(res, 200, {
      success: true,
      status: 'no-books',
      runId,
      books: 0
    });
  }

  const subscribers = await getActiveSubscriberEmails(db);
  if (subscribers.length === 0) {
    await releaseBooksAfterFailure(db, books, {
      runId,
      error: 'No active newsletter subscribers.'
    });
    return sendJson(res, 200, {
      success: true,
      status: 'no-subscribers',
      runId,
      books: books.length,
      subscribers: 0
    });
  }

  const email = buildNewsletterEmail(books);

  try {
    for (const recipients of chunk(subscribers, MAX_RECIPIENTS_PER_SEND)) {
      await sendBrevoTransactionalEmail({
        to: [String(process.env.BREVO_SENDER_EMAIL || process.env.NEWSLETTER_SENDER_EMAIL || '').trim()],
        bcc: recipients,
        ...email
      });
    }

    await markBooksSent(db, books, {
      runId,
      recipientsCount: subscribers.length
    });

    return sendJson(res, 200, {
      success: true,
      status: 'sent',
      runId,
      books: books.length,
      subscribers: subscribers.length
    });
  } catch (error) {
    console.error('books-newsletter/send-failed', error);
    await releaseBooksAfterFailure(db, books, { runId, error });
    return sendJson(res, 502, {
      success: false,
      code: 'books-newsletter/send-failed',
      message: "L'envoi Brevo a echoue.",
      details: sanitizeBookText(error?.message || error, 240),
      runId
    });
  }
}
