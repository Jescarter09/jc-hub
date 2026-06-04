import { sendBrevoTransactionalEmail } from './_lib/brevo.js';
import {
  BOOKS_COLLECTION,
  getBookAccessDecision,
  normalizeHostedBook,
  sanitizeBookText,
  toBookPublishAtMillis
} from './_lib/books.js';
import { assertCronAuthorized } from './_lib/cronAuth.js';
import { FieldValue, Timestamp, getAdminDb } from './_lib/firebaseAdmin.js';
import { sendJson } from './_lib/http.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NEWSLETTER_COLLECTION = String(process.env.NEWSLETTER_COLLECTION || 'newsletterSubscribers').trim();
const CONTACT_COLLECTION = String(process.env.CONTACT_COLLECTION || 'contactLeads').trim();
const REPORT_COLLECTION = String(process.env.AUTOMATION_REPORT_COLLECTION || 'automationReports').trim();
const DEFAULT_SITE_URL = 'https://jchub.vercel.app';

function getSiteUrl() {
  return String(process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');
}

function getAdminEmail() {
  return String(
    process.env.AUTOMATION_REPORT_EMAIL ||
      process.env.CONTACT_NOTIFICATION_EMAIL ||
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.BREVO_SENDER_EMAIL ||
      process.env.NEWSLETTER_SENDER_EMAIL ||
      ''
  ).trim();
}

function getPositiveIntEnv(name, fallback, max = 10000) {
  const numeric = Number(process.env[name]);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(Math.floor(numeric), max);
}

function getStartDate() {
  const configured =
    String(process.env.BOOKS_GROWTH_DATE || process.env.BOOKS_SCHEDULE_START || '').trim() ||
    new Date().toISOString();
  const parsed = Date.parse(configured);
  return new Date(Number.isFinite(parsed) ? parsed : Date.now());
}

function toMillis(value) {
  return toBookPublishAtMillis(value) || 0;
}

function getSortValue(doc) {
  const data = doc.data() || {};
  return [
    String(data.publishOrder ?? '').padStart(8, '0'),
    String(data.categorySlug || data.category || ''),
    String(data.title || ''),
    doc.id
  ].join('|').toLowerCase();
}

function getScheduleDate(index, { startDate, initialVisible, weeklyCount, intervalDays }) {
  if (index < initialVisible) return startDate;
  const wave = Math.floor((index - initialVisible) / weeklyCount) + 1;
  return new Date(startDate.getTime() + wave * intervalDays * DAY_MS);
}

function toBatchChunks(values, size = 450) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function commitWrites(db, writes) {
  for (const chunk of toBatchChunks(writes)) {
    const batch = db.batch();
    for (const write of chunk) {
      batch.set(write.ref, write.data, { merge: true });
    }
    await batch.commit();
  }
}

function toIsoDate(value) {
  const millis = toMillis(value);
  return millis ? new Date(millis).toISOString() : '';
}

function pickBookUrl(data) {
  return sanitizeBookText(data?.readerUrl || data?.externalLink || data?.previewLink || data?.fileUrl || '', 800);
}

function findBookIssues(doc) {
  const data = doc.data() || {};
  const issues = [];
  const publishAtMillis = toMillis(data.publishAt);

  if (!publishAtMillis) issues.push('missing-publishAt');
  if (!sanitizeBookText(data.title, 220)) issues.push('missing-title');
  if (!sanitizeBookText(data.author, 220)) issues.push('missing-author');
  if (!sanitizeBookText(data.thumbnail, 800)) issues.push('missing-thumbnail');
  if (!pickBookUrl(data)) issues.push('missing-reader-or-external-link');
  if (data.newsletterSent !== true && data.newsletterSent !== false) issues.push('missing-newsletterSent');

  return issues;
}

function buildBookRepairPayload(doc, index, scheduleConfig) {
  const data = doc.data() || {};
  const normalized = normalizeHostedBook(doc.id, data);
  const decision = getBookAccessDecision(data);
  const payload = {};

  if (!toMillis(data.publishAt)) {
    const publishAt = getScheduleDate(index, scheduleConfig);
    payload.publishAt = Timestamp.fromDate(publishAt);
    payload.publishWave = index < scheduleConfig.initialVisible
      ? 0
      : Math.floor((index - scheduleConfig.initialVisible) / scheduleConfig.weeklyCount) + 1;
    payload.publishOrder = index + 1;
    payload.publishScheduleUpdatedAt = FieldValue.serverTimestamp();
  }

  if (data.newsletterSent !== true && data.newsletterSent !== false) {
    payload.newsletterSent = false;
  }

  const safeFields = {
    slug: normalized.slug,
    category: normalized.category,
    categorySlug: normalized.categorySlug,
    detailPath: normalized.detailPath,
    sourceLabel: normalized.sourceLabel,
    sourceType: normalized.sourceType,
    readerType: normalized.readerType || decision.readerType,
    accessAction: normalized.accessAction || decision.action,
    accessReason: normalized.accessReason || decision.reason
  };

  for (const [key, value] of Object.entries(safeFields)) {
    if (!data[key] && value) {
      payload[key] = value;
    }
  }

  const booleanFields = {
    canRedistribute: decision.canRedistribute,
    canReadOnline: decision.canReadOnline,
    canDownload: decision.canDownload,
    requiresReview: decision.requiresReview
  };

  for (const [key, value] of Object.entries(booleanFields)) {
    if (typeof data[key] !== 'boolean') {
      payload[key] = Boolean(value);
    }
  }

  if (Object.keys(payload).length > 0) {
    payload.automationUpdatedAt = FieldValue.serverTimestamp();
  }

  return payload;
}

function buildDuplicateSummary(docs) {
  const bySlug = new Map();
  const bySource = new Map();

  for (const doc of docs) {
    const data = doc.data() || {};
    const normalized = normalizeHostedBook(doc.id, data);
    const slugKey = `${normalized.categorySlug}/${normalized.slug}`;
    const sourceKey = `${sanitizeBookText(data.source, 80).toLowerCase()}::${sanitizeBookText(data.sourceId || data.id, 160).toLowerCase()}`;

    if (normalized.slug) {
      bySlug.set(slugKey, [...(bySlug.get(slugKey) || []), doc.id]);
    }
    if (sourceKey !== '::') {
      bySource.set(sourceKey, [...(bySource.get(sourceKey) || []), doc.id]);
    }
  }

  const toDuplicates = (map) =>
    [...map.entries()]
      .filter(([, ids]) => ids.length > 1)
      .slice(0, 20)
      .map(([key, ids]) => ({ key, ids }));

  return {
    bySlug: toDuplicates(bySlug),
    bySource: toDuplicates(bySource)
  };
}

async function safeCount(collectionRef) {
  try {
    const snapshot = await collectionRef.count().get();
    return Math.max(0, Math.floor(Number(snapshot?.data()?.count || 0)));
  } catch {
    const snapshot = await collectionRef.get();
    return snapshot.size;
  }
}

async function countRecent(collectionRef, fieldName, sinceMillis) {
  try {
    const snapshot = await collectionRef.where(fieldName, '>=', Timestamp.fromMillis(sinceMillis)).count().get();
    return Math.max(0, Math.floor(Number(snapshot?.data()?.count || 0)));
  } catch {
    return 0;
  }
}

async function headOk(url) {
  const safeUrl = String(url || '').trim();
  if (!safeUrl.startsWith('http')) return { ok: false, status: 0, error: 'invalid-url' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    let response = await fetch(safeUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(safeUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
    }

    return {
      ok: response.ok,
      status: response.status,
      error: ''
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: sanitizeBookText(error?.name || error?.message || error, 80)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkPublishedBookLinks(docs, now) {
  const limit = getPositiveIntEnv('AUTOMATION_LINK_CHECK_LIMIT', 12, 40);
  const candidates = docs
    .filter((doc) => {
      const data = doc.data() || {};
      return toMillis(data.publishAt) <= now && pickBookUrl(data);
    })
    .slice(0, limit);

  const broken = [];
  for (const doc of candidates) {
    const data = doc.data() || {};
    const url = pickBookUrl(data);
    const result = await headOk(url);
    if (!result.ok) {
      broken.push({
        id: doc.id,
        title: sanitizeBookText(data.title, 120),
        url,
        status: result.status,
        error: result.error
      });
    }
  }

  return {
    checked: candidates.length,
    broken
  };
}

function shouldSendReport(nowDate, force) {
  if (force) return true;
  const frequency = String(process.env.AUTOMATION_REPORT_FREQUENCY || 'weekly').trim().toLowerCase();
  if (frequency === 'never' || frequency === 'off') return false;
  if (frequency === 'daily') return true;
  return nowDate.getUTCDay() === 0;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items, emptyLabel) {
  if (!items.length) {
    return `<p style="margin:0;color:#64748b;font-size:14px;">${escapeHtml(emptyLabel)}</p>`;
  }

  return `<ul style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`;
}

function buildAdminReportEmail(report) {
  const issueItems = report.books.issueSamples.map((item) => `${item.id}: ${item.issues.join(', ')}`);
  const duplicateItems = [
    ...report.books.duplicates.bySlug.map((item) => `Slug ${item.key}: ${item.ids.join(', ')}`),
    ...report.books.duplicates.bySource.map((item) => `Source ${item.key}: ${item.ids.join(', ')}`)
  ].slice(0, 10);
  const brokenItems = report.links.broken.map((item) => `${item.title || item.id}: ${item.status || item.error}`);

  const htmlContent = `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;background:#f5f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e8edf5;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(23,32,51,.08);">
          <tr>
            <td style="background:#172033;padding:28px;color:#ffffff;">
              <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9ee8c6;font-weight:700;">Rapport automatique</p>
              <h1 style="margin:0;font-size:27px;line-height:1.2;color:#ffffff;">JC Hub - ${escapeHtml(report.generatedAt.slice(0, 10))}</h1>
              <p style="margin:12px 0 0;color:#dbe5f3;font-size:15px;line-height:1.7;">Résumé des livres, abonnés, messages et contrôles automatiques.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  ${[
                    ['Livres', report.books.total],
                    ['Visibles', report.books.published],
                    ['Abonnés', report.newsletter.total],
                    ['Messages 7j', report.contacts.last7Days]
                  ]
                    .map(
                      ([label, value]) =>
                        `<td style="width:25%;padding:8px;"><div style="border:1px solid #e8edf5;border-radius:14px;background:#f8fafc;padding:14px;"><p style="margin:0;color:#64748b;font-size:12px;font-weight:700;">${escapeHtml(label)}</p><strong style="display:block;margin-top:8px;color:#172033;font-size:24px;">${escapeHtml(value)}</strong></div></td>`
                    )
                    .join('')}
                </tr>
              </table>
              <h2 style="margin:24px 0 10px;color:#172033;font-size:18px;">Actions automatiques</h2>
              ${renderList(
                [
                  `${report.actions.scheduledBooks} livres planifies`,
                  `${report.actions.repairedBooks} livres enrichis/repares`,
                  `${report.actions.newsletterDefaults} champs newsletterSent initialises`
                ],
                'Aucune action automatique necessaire.'
              )}
              <h2 style="margin:24px 0 10px;color:#172033;font-size:18px;">Points a verifier</h2>
              ${renderList(issueItems, 'Aucun livre incomplet detecte dans les echantillons.')}
              <h2 style="margin:24px 0 10px;color:#172033;font-size:18px;">Doublons possibles</h2>
              ${renderList(duplicateItems, 'Aucun doublon evident detecte.')}
              <h2 style="margin:24px 0 10px;color:#172033;font-size:18px;">Liens verifies</h2>
              ${renderList(brokenItems, `${report.links.checked} liens verifies, aucun probleme detecte.`)}
              <p style="margin:24px 0 0;">
                <a href="${escapeHtml(getSiteUrl())}/sitemap.xml" style="display:inline-block;background:#5b3dff;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;">Voir le sitemap</a>
              </p>
            </td>
          </tr>
          <tr><td style="padding:18px 24px;background:#f8fafc;border-top:1px solid #e8edf5;"><p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">Rapport genere automatiquement par Vercel Cron.</p></td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    subject: `JC Hub - Rapport automatique ${report.generatedAt.slice(0, 10)}`,
    htmlContent,
    textContent: [
      `JC Hub - Rapport automatique ${report.generatedAt}`,
      `Livres: ${report.books.total}`,
      `Livres visibles: ${report.books.published}`,
      `Abonnes newsletter: ${report.newsletter.total}`,
      `Messages contact 7j: ${report.contacts.last7Days}`,
      `Livres planifies: ${report.actions.scheduledBooks}`,
      `Livres repares: ${report.actions.repairedBooks}`,
      `Liens verifies: ${report.links.checked}`,
      `Liens casses: ${report.links.broken.length}`
    ].join('\n')
  };
}

async function sendAdminReport(report) {
  const email = getAdminEmail();
  if (!email) {
    return { sent: false, reason: 'missing-admin-email' };
  }

  const message = buildAdminReportEmail(report);
  await sendBrevoTransactionalEmail({
    to: [email],
    subject: message.subject,
    htmlContent: message.htmlContent,
    textContent: message.textContent
  });

  return { sent: true, email };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { success: false, code: 'automation-daily/method-not-allowed' });
  }

  const authorization = assertCronAuthorized(req, { codePrefix: 'automation-daily' });
  if (!authorization.ok) {
    return sendJson(res, authorization.status, {
      success: false,
      code: authorization.code,
      message: authorization.message
    });
  }

  const params = new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`).searchParams;
  const dryRun = params.get('dryRun') === '1' || params.get('dryRun') === 'true';
  const forceReport = params.get('sendReport') === '1' || params.get('sendReport') === 'true';
  const now = Date.now();
  const nowDate = new Date(now);
  const startDate = getStartDate();
  const scheduleConfig = {
    startDate,
    initialVisible: getPositiveIntEnv('BOOKS_INITIAL_VISIBLE', 30, 500),
    weeklyCount: getPositiveIntEnv('BOOKS_WEEKLY_RELEASE', 10, 500),
    intervalDays: getPositiveIntEnv('BOOKS_RELEASE_INTERVAL_DAYS', 7, 365)
  };

  try {
    const db = getAdminDb();
    const booksSnapshot = await db.collection(BOOKS_COLLECTION).get();
    const docs = booksSnapshot.docs.sort((left, right) => getSortValue(left).localeCompare(getSortValue(right)));
    const writes = [];
    const issueSamples = [];
    let scheduledBooks = 0;
    let repairedBooks = 0;
    let newsletterDefaults = 0;
    let published = 0;
    let next7Days = 0;

    docs.forEach((doc, index) => {
      const data = doc.data() || {};
      const publishAt = toMillis(data.publishAt);
      if (publishAt && publishAt <= now) published += 1;
      if (publishAt && publishAt > now && publishAt <= now + 7 * DAY_MS) next7Days += 1;

      const issues = findBookIssues(doc);
      if (issues.length > 0 && issueSamples.length < 20) {
        issueSamples.push({
          id: doc.id,
          title: sanitizeBookText(data.title, 120),
          issues
        });
      }

      const payload = buildBookRepairPayload(doc, index, scheduleConfig);
      if (Object.keys(payload).length > 0) {
        if (payload.publishAt) scheduledBooks += 1;
        if (payload.newsletterSent === false) newsletterDefaults += 1;
        if (Object.keys(payload).some((key) => !['publishAt', 'publishWave', 'publishOrder', 'publishScheduleUpdatedAt', 'newsletterSent', 'automationUpdatedAt'].includes(key))) {
          repairedBooks += 1;
        }
        writes.push({ ref: doc.ref, data: payload });
      }
    });

    if (!dryRun && writes.length > 0) {
      await commitWrites(db, writes);
    }

    const links = await checkPublishedBookLinks(docs, now);
    const duplicates = buildDuplicateSummary(docs);
    const last7Days = now - 7 * DAY_MS;
    const newsletterRef = db.collection(NEWSLETTER_COLLECTION);
    const contactsRef = db.collection(CONTACT_COLLECTION);

    const report = {
      generatedAt: nowDate.toISOString(),
      dryRun,
      authMode: authorization.mode,
      books: {
        total: docs.length,
        published,
        next7Days,
        issueSamples,
        duplicates
      },
      newsletter: {
        total: await safeCount(newsletterRef),
        last7Days: await countRecent(newsletterRef, 'subscribedAt', last7Days)
      },
      contacts: {
        total: await safeCount(contactsRef),
        last7Days: await countRecent(contactsRef, 'createdAt', last7Days)
      },
      links,
      actions: {
        scheduledBooks,
        repairedBooks,
        newsletterDefaults,
        writes: writes.length
      },
      seo: {
        sitemap: `${getSiteUrl()}/sitemap.xml`,
        robots: `${getSiteUrl()}/robots.txt`
      }
    };

    let email = { sent: false, reason: 'not-scheduled-today' };
    if (!dryRun && shouldSendReport(nowDate, forceReport)) {
      try {
        email = await sendAdminReport(report);
      } catch (error) {
        email = {
          sent: false,
          reason: 'send-failed',
          error: sanitizeBookText(error?.message || error, 240)
        };
      }
    }

    report.email = email;

    if (!dryRun) {
      await db.collection(REPORT_COLLECTION).add({
        ...report,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    return sendJson(res, 200, {
      success: true,
      report
    });
  } catch (error) {
    console.error('automation-daily/failed', error);
    return sendJson(res, 500, {
      success: false,
      code: 'automation-daily/failed',
      message: "L'automatisation quotidienne a echoue.",
      details: sanitizeBookText(error?.message || error, 240)
    });
  }
}
