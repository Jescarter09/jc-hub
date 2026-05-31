import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FieldValue, Timestamp, getAdminDb } from '../api/_lib/firebaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DAY_MS = 24 * 60 * 60 * 1000;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex < 1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getArgValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function getPositiveIntArg(name, fallback) {
  const value = Number(getArgValue(name, fallback));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getSortValue(doc) {
  const data = doc.data();
  return [
    String(data?.publishOrder ?? '').padStart(8, '0'),
    String(data?.categorySlug || data?.category || ''),
    String(data?.title || ''),
    doc.id
  ].join('|').toLowerCase();
}

function getScheduleDate(index, { startDate, initialVisible, weeklyCount, intervalDays }) {
  if (index < initialVisible) return startDate;

  const wave = Math.floor((index - initialVisible) / weeklyCount) + 1;
  return new Date(startDate.getTime() + wave * intervalDays * DAY_MS);
}

async function commitBatches(db, writes) {
  const chunkSize = 450;

  for (let startIndex = 0; startIndex < writes.length; startIndex += chunkSize) {
    const batch = db.batch();
    const chunk = writes.slice(startIndex, startIndex + chunkSize);

    for (const write of chunk) {
      batch.set(write.ref, write.data, { merge: true });
    }

    await batch.commit();
  }
}

async function main() {
  loadEnvFile(path.join(projectRoot, '.env'));
  loadEnvFile(path.join(projectRoot, '.env.local'));

  const apply = process.argv.includes('--apply');
  const overwrite = process.argv.includes('--overwrite');
  const collectionName = String(process.env.BOOKS_COLLECTION || 'books').trim();
  const initialVisible = getPositiveIntArg('initial', 30);
  const weeklyCount = getPositiveIntArg('weekly', 10);
  const intervalDays = getPositiveIntArg('interval-days', 7);
  const startValue = getArgValue('start', new Date().toISOString());
  const startMillis = Date.parse(startValue);

  if (!Number.isFinite(startMillis)) {
    throw new Error(`Invalid --start value: ${startValue}`);
  }

  const startDate = new Date(startMillis);
  const db = getAdminDb();
  const snapshot = await db.collection(collectionName).get();
  const docs = snapshot.docs.sort((left, right) => getSortValue(left).localeCompare(getSortValue(right)));
  const writes = [];

  docs.forEach((doc, index) => {
    const data = doc.data();
    const hasPublishAt = toMillis(data?.publishAt) > 0;
    const needsPublishAt = !hasPublishAt || overwrite;
    const needsNewsletterSent = data?.newsletterSent !== true && data?.newsletterSent !== false;
    if (!needsPublishAt && !needsNewsletterSent) return;

    const publishAt = getScheduleDate(index, {
      startDate,
      initialVisible,
      weeklyCount,
      intervalDays
    });
    const payload = {};

    if (needsPublishAt) {
      Object.assign(payload, {
        publishAt: Timestamp.fromDate(publishAt),
        publishWave: index < initialVisible ? 0 : Math.floor((index - initialVisible) / weeklyCount) + 1,
        publishOrder: index + 1,
        publishScheduleUpdatedAt: FieldValue.serverTimestamp()
      });
    }

    if (needsNewsletterSent) {
      payload.newsletterSent = false;
    }

    writes.push({
      ref: doc.ref,
      data: payload
    });
  });

  console.log(`Books collection: ${collectionName}`);
  console.log(`Books found: ${docs.length}`);
  console.log(`Books to schedule: ${writes.length}`);
  console.log(`Launch visible: ${initialVisible}`);
  console.log(`Weekly release: ${weeklyCount}`);
  console.log(`Start: ${startDate.toISOString()}`);
  console.log(`Mode: ${apply ? 'apply' : 'dry-run'}`);

  if (writes.length > 0) {
    const preview = writes.slice(0, 8).map((write) => ({
      id: write.ref.id,
      publishAt: write.data.publishAt?.toDate?.().toISOString() || '(unchanged)',
      publishOrder: write.data.publishOrder
    }));
    console.table(preview);
  }

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to write to Firestore.');
    return;
  }

  await commitBatches(db, writes);
  console.log(`Done. Scheduled ${writes.length} books.`);
}

main().catch((error) => {
  console.error('Unable to schedule books:', error.message);
  process.exit(1);
});
