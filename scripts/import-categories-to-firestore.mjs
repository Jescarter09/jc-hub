import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FieldValue, getAdminDb } from '../api/_lib/firebaseAdmin.js';
import { CONTENT_CATEGORIES, CONTENT_CATEGORY_GROUPS } from '../src/data/categoriesCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const isDryRun = process.argv.includes('--dry-run');
const categoriesCollection = 'categories';
const groupsCollection = 'categoryGroups';

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

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchTokens(category) {
  const rawTokens = [
    category.name,
    category.slug,
    category.group,
    category.description,
    ...(category.keywords || [])
  ];

  const tokens = new Set();
  for (const token of rawTokens) {
    const normalized = normalizeToken(token);
    if (!normalized) continue;
    tokens.add(normalized);
    for (const part of normalized.split(' ')) {
      if (part.length > 1) tokens.add(part);
    }
  }

  return [...tokens].sort();
}

function toFirestoreCategory(category) {
  return {
    ...category,
    searchTokens: buildSearchTokens(category),
    updatedAt: FieldValue.serverTimestamp(),
    seededAt: FieldValue.serverTimestamp()
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

  console.log(`📚 Catégories préparées : ${CONTENT_CATEGORIES.length}`);
  console.log(`🗂️  Groupes préparés : ${CONTENT_CATEGORY_GROUPS.length}`);

  if (isDryRun) {
    console.log('🧪 Mode dry-run : aucun document Firestore ne sera modifié.');
    console.table(CONTENT_CATEGORIES.slice(0, 12).map((category) => ({
      slug: category.slug,
      name: category.name,
      group: category.group
    })));
    return;
  }

  const db = getAdminDb();
  const writes = [
    ...CONTENT_CATEGORY_GROUPS.map((group) => ({
      ref: db.collection(groupsCollection).doc(group.slug),
      data: {
        ...group,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
        seededAt: FieldValue.serverTimestamp()
      }
    })),
    ...CONTENT_CATEGORIES.map((category) => ({
      ref: db.collection(categoriesCollection).doc(category.slug),
      data: toFirestoreCategory(category)
    }))
  ];

  await commitBatches(db, writes);

  console.log(`✅ ${CONTENT_CATEGORY_GROUPS.length} groupes importés dans "${groupsCollection}".`);
  console.log(`✅ ${CONTENT_CATEGORIES.length} catégories importées dans "${categoriesCollection}".`);
}

main().catch((error) => {
  console.error('❌ Import catégories impossible :', error.message);
  process.exit(1);
});
