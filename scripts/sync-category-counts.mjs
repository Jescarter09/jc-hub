import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FieldValue, getAdminDb } from '../api/_lib/firebaseAdmin.js';
import { CONTENT_CATEGORIES, CONTENT_CATEGORY_GROUPS } from '../src/data/categoriesCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');

const outputPath = path.join(projectRoot, 'src', 'data', 'categories.txt');

let blogsCollection = 'blogs';
let booksCollection = 'books';
let categoriesCollection = 'categories';
let groupsCollection = 'categoryGroups';

const legacyCategorySlugMap = new Map([
  ['developpement', 'developpement-web'],
  ['development', 'developpement-web'],
  ['programming', 'developpement-web'],
  ['design', 'ui-ux-design'],
  ['business', 'entrepreneuriat'],
  ['science', 'sciences'],
  ['education', 'education-numerique'],
  ['litterature', 'livres-numeriques'],
  ['literature', 'livres-numeriques'],
  ['documents', 'livres-blancs'],
  ['general', 'livres-numeriques']
]);

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

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/&/g, ' et ')
    .replace(/[#.]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlug(value) {
  return normalizeText(value).replace(/\s+/g, '-');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasNormalizedTerm(text, term) {
  if (!term || term.length < 3) return false;
  const normalizedText = ` ${text} `;
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;

  if (normalizedTerm.includes(' ')) {
    return normalizedText.includes(` ${normalizedTerm} `);
  }

  return new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}(\\s|$)`).test(text);
}

function flattenValues(value) {
  if (Array.isArray(value)) {
    return value.flatMap(flattenValues);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(flattenValues);
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [String(value)];
}

function toNormalizedSet(values) {
  return new Set(
    flattenValues(values)
      .map(normalizeText)
      .filter(Boolean)
  );
}

function toSlugSet(values) {
  const slugs = new Set();

  for (const value of flattenValues(values)) {
    const slug = toSlug(value);
    if (!slug) continue;

    slugs.add(slug);
    if (legacyCategorySlugMap.has(slug)) {
      slugs.add(legacyCategorySlugMap.get(slug));
    }
  }

  return slugs;
}

function getExplicitCategoryValues(data) {
  return flattenValues([
    data?.categorySlug,
    data?.category_slug,
    data?.category,
    data?.categories,
    data?.primaryCategory,
    data?.mainCategory,
    data?.subcategory,
    data?.subCategory,
    data?.tags,
    data?.keywords
  ]);
}

function getDocumentSearchValues(data) {
  return flattenValues([
    data?.title,
    data?.name,
    data?.description,
    data?.excerpt,
    data?.summary,
    getExplicitCategoryValues(data)
  ]);
}

function buildProfiles() {
  return CONTENT_CATEGORIES.map((category) => {
    const exactSlugs = toSlugSet([category.slug, category.name, ...(category.keywords || [])]);
    const exactTerms = toNormalizedSet([category.slug, category.name]);
    const searchTerms = toNormalizedSet([category.name, ...(category.keywords || [])]);

    return {
      category,
      exactSlugs,
      exactTerms,
      searchTerms: [...searchTerms].filter((term) => term.length >= 3)
    };
  });
}

function isPublicArticle(data) {
  const status = normalizeText(data?.status || 'published');
  return !status || status === 'published' || status === 'public';
}

function matchesCategory(data, profile) {
  const explicitValues = getExplicitCategoryValues(data);
  const explicitSlugs = toSlugSet(explicitValues);
  const explicitTerms = toNormalizedSet(explicitValues);

  for (const value of explicitSlugs) {
    if (profile.exactSlugs.has(value)) return true;
  }

  for (const value of explicitTerms) {
    if (profile.exactTerms.has(value)) return true;
  }

  const searchableText = normalizeText(getDocumentSearchValues(data).join(' '));
  if (!searchableText) return false;

  return profile.searchTerms.some((term) => hasNormalizedTerm(searchableText, term));
}

function createEmptyCounts() {
  return new Map(
    CONTENT_CATEGORIES.map((category) => [
      category.slug,
      {
        category,
        articleIds: new Set(),
        bookIds: new Set()
      }
    ])
  );
}

function incrementMatches(counts, profiles, docs, type) {
  for (const doc of docs) {
    const data = doc.data();
    if (type === 'article' && !isPublicArticle(data)) continue;

    for (const profile of profiles) {
      if (!matchesCategory(data, profile)) continue;
      const count = counts.get(profile.category.slug);
      if (type === 'article') {
        count.articleIds.add(doc.id);
      } else {
        count.bookIds.add(doc.id);
      }
    }
  }
}

function toCountRows(counts) {
  return [...counts.values()].map((entry) => {
    const articlesCount = entry.articleIds.size;
    const booksCount = entry.bookIds.size;

    return {
      ...entry.category,
      articlesCount,
      booksCount,
      totalCount: articlesCount + booksCount
    };
  });
}

function groupRows(categoryRows) {
  const byGroup = new Map(
    CONTENT_CATEGORY_GROUPS.map((group) => [
      group.slug,
      {
        ...group,
        articlesCount: 0,
        booksCount: 0,
        totalCount: 0
      }
    ])
  );

  for (const row of categoryRows) {
    const group = byGroup.get(row.groupSlug);
    if (!group) continue;

    group.articlesCount += row.articlesCount;
    group.booksCount += row.booksCount;
    group.totalCount += row.totalCount;
  }

  return [...byGroup.values()];
}

function formatTxt(categoryRows, groupRowsData, sourceStats) {
  const updatedAt = new Date().toISOString();
  const lines = [
    'Catalogue des catégories JC Hub',
    `Dernière mise à jour: ${updatedAt}`,
    `Source: Firestore (${blogsCollection} + ${booksCollection})`,
    `Articles lus: ${sourceStats.articles}`,
    `Livres lus: ${sourceStats.books}`,
    '',
    'Format: groupe | slug | catégorie | articles | livres | total',
    ''
  ];

  for (const group of groupRowsData) {
    lines.push(
      `# ${group.name} — articles: ${group.articlesCount} | livres: ${group.booksCount} | total: ${group.totalCount}`
    );

    for (const row of categoryRows.filter((category) => category.groupSlug === group.slug)) {
      lines.push(
        `${row.group} | ${row.slug} | ${row.name} | articles: ${row.articlesCount} | livres: ${row.booksCount} | total: ${row.totalCount}`
      );
    }

    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
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

  blogsCollection = String(process.env.BLOGS_COLLECTION || blogsCollection).trim();
  booksCollection = String(process.env.BOOKS_COLLECTION || booksCollection).trim();
  categoriesCollection = String(process.env.CATEGORIES_COLLECTION || categoriesCollection).trim();
  groupsCollection = String(process.env.CATEGORY_GROUPS_COLLECTION || groupsCollection).trim();

  const db = getAdminDb();
  const [articlesSnapshot, booksSnapshot] = await Promise.all([
    db.collection(blogsCollection).get(),
    db.collection(booksCollection).get()
  ]);

  const counts = createEmptyCounts();
  const profiles = buildProfiles();

  incrementMatches(counts, profiles, articlesSnapshot.docs, 'article');
  incrementMatches(counts, profiles, booksSnapshot.docs, 'book');

  const categoryRows = toCountRows(counts);
  const groupRowsData = groupRows(categoryRows);
  const txtContent = formatTxt(categoryRows, groupRowsData, {
    articles: articlesSnapshot.size,
    books: booksSnapshot.size
  });

  console.log(`📚 Articles Firestore lus : ${articlesSnapshot.size}`);
  console.log(`📖 Livres Firestore lus : ${booksSnapshot.size}`);
  console.log(`🗂️  Catégories calculées : ${categoryRows.length}`);
  console.table(
    categoryRows
      .filter((row) => row.totalCount > 0)
      .sort((left, right) => right.totalCount - left.totalCount)
      .slice(0, 15)
      .map((row) => ({
        slug: row.slug,
        articles: row.articlesCount,
        livres: row.booksCount,
        total: row.totalCount
      }))
  );

  if (isDryRun) {
    console.log('🧪 Mode dry-run : aucun fichier ni document Firestore modifié.');
    return;
  }

  fs.writeFileSync(outputPath, txtContent, 'utf8');

  const categoryWrites = categoryRows.map((row) => ({
    ref: db.collection(categoriesCollection).doc(row.slug),
    data: {
      articlesCount: row.articlesCount,
      booksCount: row.booksCount,
      totalCount: row.totalCount,
      counts: {
        articles: row.articlesCount,
        books: row.booksCount,
        total: row.totalCount
      },
      countsSource: {
        articlesCollection: blogsCollection,
        booksCollection,
        matchedBy: 'category-fields-and-search-terms'
      },
      countsUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }
  }));

  const groupWrites = groupRowsData.map((group) => ({
    ref: db.collection(groupsCollection).doc(group.slug),
    data: {
      articlesCount: group.articlesCount,
      booksCount: group.booksCount,
      totalCount: group.totalCount,
      counts: {
        articles: group.articlesCount,
        books: group.booksCount,
        total: group.totalCount
      },
      countsUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }
  }));

  await commitBatches(db, [...categoryWrites, ...groupWrites]);

  console.log(`✅ ${categoryRows.length} catégories mises à jour dans "${categoriesCollection}".`);
  console.log(`✅ ${groupRowsData.length} groupes mis à jour dans "${groupsCollection}".`);
  console.log(`✅ Fichier mis à jour : ${path.relative(projectRoot, outputPath)}`);
}

main().catch((error) => {
  console.error('❌ Synchronisation des compteurs impossible :', error.message);
  process.exit(1);
});
