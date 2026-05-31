import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const isDryRun = process.argv.includes('--dry-run');

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

function asBoolean(value) {
  return value === true;
}

function comparableValue(value) {
  if (typeof value === 'boolean') return value;
  return String(value || '').trim();
}

function hasMeaningfulDifference(data, patch) {
  const fields = [
    'sourceType',
    'canRedistribute',
    'canReadOnline',
    'canDownload',
    'readerUrl',
    'readerType',
    'accessAction',
    'accessReason'
  ];

  return fields.some((field) => comparableValue(data?.[field]) !== comparableValue(patch[field]));
}

function buildPatch(data, { getBookAccessDecision, sanitizeBookText, FieldValue }) {
  const decision = getBookAccessDecision(data);
  const hostedFileUrl = sanitizeBookText(data?.fileUrl || data?.pdfUrl, 800);
  const readerUrl = sanitizeBookText(
    decision.readerUrl || data?.readerUrl || (data?.isHosted === true ? hostedFileUrl : '') || data?.previewLink,
    800
  );
  const canReadOnline = asBoolean(decision.canReadOnline) || Boolean(readerUrl);
  const canDownload = asBoolean(decision.canDownload) || Boolean(data?.isHosted === true && hostedFileUrl);

  return {
    sourceType: sanitizeBookText(decision.sourceType || 'official_only', 80),
    canRedistribute: asBoolean(decision.canRedistribute),
    canReadOnline,
    canDownload,
    readerUrl,
    readerType: sanitizeBookText(decision.readerType || (canReadOnline ? 'official' : 'none'), 80),
    accessAction: sanitizeBookText(decision.action || (canReadOnline ? 'official-reader' : 'external-only'), 80),
    accessReason: sanitizeBookText(decision.reason || 'backfilled-access-decision', 160),
    accessBackfilledAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
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

  const [{ FieldValue, getAdminDb }, { getBookAccessDecision, sanitizeBookText }] = await Promise.all([
    import('../api/_lib/firebaseAdmin.js'),
    import('../api/_lib/books.js')
  ]);

  const booksCollection = String(process.env.BOOKS_COLLECTION || 'books').trim();
  const db = getAdminDb();
  const snapshot = await db.collection(booksCollection).get();
  const writes = [];
  const previewRows = [];
  const sourceTypeCounts = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    const patch = buildPatch(data, { getBookAccessDecision, sanitizeBookText, FieldValue });
    sourceTypeCounts[patch.sourceType] = (sourceTypeCounts[patch.sourceType] || 0) + 1;

    if (!hasMeaningfulDifference(data, patch)) return;

    writes.push({
      ref: doc.ref,
      data: patch
    });

    if (previewRows.length < 20) {
      previewRows.push({
        id: doc.id,
        source: data?.source || '',
        sourceType: patch.sourceType,
        canReadOnline: patch.canReadOnline,
        canDownload: patch.canDownload
      });
    }
  });

  console.log(`📚 Collection livres : ${booksCollection}`);
  console.log(`📖 Livres lus : ${snapshot.size}`);
  console.log(`🧩 Livres à backfiller : ${writes.length}`);
  console.log('📊 Types calculés :', sourceTypeCounts);

  if (previewRows.length > 0) {
    console.table(previewRows);
  }

  if (isDryRun) {
    console.log('🧪 Mode dry-run : aucun document Firestore ne sera modifié.');
    return;
  }

  await commitBatches(db, writes);
  console.log(`✅ ${writes.length} livres mis à jour dans "${booksCollection}".`);
}

main().catch((error) => {
  console.error('❌ Backfill des champs livres impossible :', error.message);
  process.exit(1);
});
