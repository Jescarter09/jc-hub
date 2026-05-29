import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const DATABASE_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'database.json');
const SHOULD_WRITE = process.argv.includes('--write');

const toTimestamp = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = new Date(value || '').getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getContentWeight = (post) => {
  const blocks = Array.isArray(post?.contentBlocks) ? post.contentBlocks : [];
  const blockText = blocks
    .map((block) => `${block?.type || ''} ${block?.content || ''} ${block?.caption || ''}`)
    .join(' ');

  return [
    post?.title,
    post?.excerpt,
    post?.description,
    post?.content,
    blockText,
    Array.isArray(post?.tags) ? post.tags.join(' ') : post?.tags
  ]
    .map((value) => String(value || '').trim())
    .join(' ')
    .length;
};

const getPostRank = ([key, post]) => {
  const status = String(post?.status || '').trim().toLowerCase();
  const statusRank = status === 'published' ? 3 : status === 'draft' ? 2 : 1;
  const contentWeight = getContentWeight(post);
  const updatedAt = Math.max(toTimestamp(post?.updated_at), toTimestamp(post?.created_at), toTimestamp(post?.published_at));
  const keyRank = String(key || '').startsWith('article-') ? 1 : 0;

  return {
    statusRank,
    contentWeight,
    updatedAt,
    keyRank
  };
};

const compareRank = (a, b) => {
  const rankA = getPostRank(a);
  const rankB = getPostRank(b);

  return (
    rankB.statusRank - rankA.statusRank ||
    rankB.contentWeight - rankA.contentWeight ||
    rankB.updatedAt - rankA.updatedAt ||
    rankB.keyRank - rankA.keyRank ||
    String(a[0]).localeCompare(String(b[0]))
  );
};

const readDatabase = () => JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));

const writeBackup = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(PROJECT_ROOT, 'src', 'data', `database.backup-${stamp}.json`);
  fs.copyFileSync(DATABASE_PATH, backupPath);
  return backupPath;
};

const database = readDatabase();
const posts = database?.blog?.posts || {};
const groups = new Map();

for (const entry of Object.entries(posts)) {
  const slug = String(entry[1]?.slug || '').trim().toLowerCase();
  if (!slug) continue;
  if (!groups.has(slug)) groups.set(slug, []);
  groups.get(slug).push(entry);
}

const duplicateGroups = [...groups.entries()].filter(([, entries]) => entries.length > 1);
const keysToRemove = new Set();
const report = [];

for (const [slug, entries] of duplicateGroups) {
  const sorted = [...entries].sort(compareRank);
  const [keeperKey] = sorted[0];
  const removed = sorted.slice(1).map(([key]) => key);

  removed.forEach((key) => keysToRemove.add(key));
  report.push({ slug, keep: keeperKey, remove: removed });
}

if (report.length === 0) {
  console.log('Aucun doublon de slug trouve dans src/data/database.json.');
  process.exit(0);
}

for (const item of report) {
  console.log(`Slug: ${item.slug}`);
  console.log(`  garder: ${item.keep}`);
  console.log(`  retirer: ${item.remove.join(', ')}`);
}

console.log(`Total doublons a retirer: ${keysToRemove.size}`);

if (!SHOULD_WRITE) {
  console.log('Mode lecture seule. Relance avec --write pour appliquer.');
  process.exit(0);
}

const backupPath = writeBackup();
for (const key of keysToRemove) {
  delete posts[key];
}

fs.writeFileSync(DATABASE_PATH, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
console.log(`Sauvegarde creee: ${backupPath}`);
console.log('database.json nettoye.');
