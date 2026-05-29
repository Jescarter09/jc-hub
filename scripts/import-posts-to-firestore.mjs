import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SOURCE = 'src/data/database.json';
const DEFAULT_COLLECTION = 'blogs';

function parseArgs(argv) {
  const args = {
    apply: false,
    allStatuses: false,
    source: DEFAULT_SOURCE,
    collection: DEFAULT_COLLECTION,
    docIdMode: 'slug',
    forceAuthorId: false,
    limit: null
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      args.apply = true;
      continue;
    }
    if (arg === '--all-statuses') {
      args.allStatuses = true;
      continue;
    }
    if (arg.startsWith('--source=')) {
      args.source = arg.slice('--source='.length).trim() || DEFAULT_SOURCE;
      continue;
    }
    if (arg.startsWith('--collection=')) {
      args.collection = arg.slice('--collection='.length).trim() || DEFAULT_COLLECTION;
      continue;
    }
    if (arg.startsWith('--doc-id=')) {
      const mode = arg.slice('--doc-id='.length).trim().toLowerCase();
      args.docIdMode = mode === 'slug' ? 'slug' : 'key';
      continue;
    }
    if (arg === '--force-author-id') {
      args.forceAuthorId = true;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const raw = Number(arg.slice('--limit='.length).trim());
      args.limit = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
      continue;
    }
  }

  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
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

function toSlug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function sanitizeDocId(value) {
  let docId = String(value || '').trim();
  if (!docId) docId = `post-${Date.now()}`;
  docId = docId.replace(/\//g, '-');
  if (docId === '.' || docId === '..' || /^__.*__$/.test(docId)) {
    docId = `post-${docId.replace(/\./g, '-')}`;
  }
  return docId.slice(0, 1500);
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function toMillis(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && value.trim().length >= 10) {
      return Math.trunc(asNumber);
    }
    const asDate = Date.parse(value);
    if (Number.isFinite(asDate)) return Math.trunc(asDate);
  }
  return null;
}

function numberField(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value === undefined) return { nullValue: null };

  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { nullValue: null };
    }
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    const values = value.map((item) => toFirestoreValue(item));
    return { arrayValue: { values } };
  }

  if (typeof value === 'object') {
    const fields = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      fields[key] = toFirestoreValue(item);
    }
    return { mapValue: { fields } };
  }

  return { stringValue: String(value) };
}

function toFirestoreFields(payload) {
  const fields = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

async function signInWithEmailPassword(apiKey, email, password) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Firebase Auth signin failed: ${message}`);
  }

  return {
    idToken: body.idToken,
    uid: body.localId
  };
}

function buildPostPayload({
  key,
  post,
  fallbackAuthorId,
  importedAtIso,
  useSlugAsDocId,
  forceAuthorId
}) {
  const title = String(post?.title || '').trim();
  if (!title) return null;

  const status = String(post?.status || 'published').trim().toLowerCase();
  const slug = String(post?.slug || '').trim() || toSlug(title) || sanitizeDocId(key);

  const createdMs =
    toMillis(post?.created_at) ??
    toMillis(post?.createdAt) ??
    toMillis(post?.published_at) ??
    toMillis(post?.updated_at) ??
    Date.now();
  const updatedMs = toMillis(post?.updated_at) ?? toMillis(post?.updatedAt) ?? createdMs;
  const publishedMs = toMillis(post?.published_at) ?? createdMs;

  const contentBlocks = Array.isArray(post?.contentBlocks)
    ? post.contentBlocks
    : Array.isArray(post?.content)
      ? post.content
      : [];

  const markdownContent = typeof post?.content === 'string' ? post.content : '';
  const excerpt = String(post?.excerpt || post?.description || '').trim();
  const authorName = String(post?.author_name || post?.author || 'Administrateur').trim();
  const originalAuthorId = String(post?.author_id || post?.authorId || '').trim();
  const finalAuthorId = forceAuthorId
    ? (fallbackAuthorId || originalAuthorId || '')
    : (originalAuthorId || fallbackAuthorId || '');

  const docIdSource = useSlugAsDocId ? slug : key;
  const docId = sanitizeDocId(docIdSource);

  return {
    docId,
    payload: {
      id: String(post?.id || key),
      slug,
      title,
      description: String(post?.description || excerpt).trim(),
      excerpt: excerpt || 'Article importe depuis database.json.',
      content: markdownContent,
      contentBlocks,
      category: String(post?.category || 'technologie').trim(),
      tags: normalizeTags(post?.tags),
      image: String(post?.image || '').trim(),
      status,
      views: numberField(post?.views, 0),
      likes: numberField(post?.likes, 0),
      author: authorName,
      authorId: finalAuthorId,
      author_name: authorName,
      author_id: finalAuthorId,
      sourceKey: key,
      sourceFile: 'src/data/database.json',
      importSource: 'database-json-cli',
      importedAt: importedAtIso,
      created_at: createdMs,
      updated_at: updatedMs,
      published_at: publishedMs,
      createdAt: new Date(createdMs),
      updatedAt: new Date(updatedMs),
      publishedAt: new Date(publishedMs)
    }
  };
}

async function upsertDocument({
  projectId,
  collection,
  docId,
  fields,
  idToken
}) {
  const docPath = `${collection}/${docId.split('/').map(encodeURIComponent).join('/')}`;
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${docPath}`;

  const headers = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  const bodyText = await response.text();
  if (!response.ok) {
    let message = bodyText;
    try {
      const parsed = JSON.parse(bodyText);
      message = parsed?.error?.message || bodyText;
    } catch {
      // keep body text as-is
    }
    throw new Error(`PATCH ${collection}/${docId} failed (${response.status}): ${message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(path.resolve('.env'));

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;

  if (!projectId) {
    throw new Error('VITE_FIREBASE_PROJECT_ID is missing in .env');
  }
  if (!apiKey) {
    throw new Error('VITE_FIREBASE_API_KEY is missing in .env');
  }

  const sourcePath = path.resolve(args.source);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const raw = fs.readFileSync(sourcePath, 'utf8');
  const database = JSON.parse(raw);
  const posts = database?.blog?.posts || {};
  const entries = Object.entries(posts);

  const importedAtIso = new Date().toISOString();
  const draftCount = entries.length;

  let idToken = process.env.FIREBASE_ID_TOKEN || '';
  let importUid = process.env.FIREBASE_IMPORT_UID || '';
  const importEmail = process.env.FIREBASE_IMPORT_EMAIL || '';
  const importPassword = process.env.FIREBASE_IMPORT_PASSWORD || '';
  const forceAuthorIdFromEnv = String(process.env.FIREBASE_IMPORT_FORCE_AUTHOR_ID || '').trim().toLowerCase() === 'true';
  const forceAuthorId = args.forceAuthorId || forceAuthorIdFromEnv;

  if (!idToken && importEmail && importPassword) {
    const authResult = await signInWithEmailPassword(apiKey, importEmail, importPassword);
    idToken = authResult.idToken;
    importUid = authResult.uid;
  }

  const prepared = [];
  const skipped = [];
  const useSlugAsDocId = args.docIdMode === 'slug';

  for (const [key, post] of entries) {
    const built = buildPostPayload({
      key,
      post,
      fallbackAuthorId: importUid,
      importedAtIso,
      useSlugAsDocId,
      forceAuthorId
    });

    if (!built) {
      skipped.push({ key, reason: 'missing title' });
      continue;
    }

    const status = String(built.payload.status || '').toLowerCase();
    if (!args.allStatuses && status !== 'published') {
      skipped.push({ key, reason: `status=${status || 'unknown'}` });
      continue;
    }

    prepared.push(built);
  }

  const dedupedByDocId = new Map();
  let duplicateCandidates = 0;
  for (const item of prepared) {
    if (dedupedByDocId.has(item.docId)) {
      duplicateCandidates += 1;
    }
    dedupedByDocId.set(item.docId, item);
  }
  const deduped = Array.from(dedupedByDocId.values());
  const limited = args.limit ? deduped.slice(0, args.limit) : deduped;

  console.log(`Source posts: ${draftCount}`);
  console.log(`Prepared posts: ${prepared.length}`);
  console.log(`After dedupe by docId: ${deduped.length}`);
  console.log(`Duplicates ignored: ${duplicateCandidates}`);
  console.log(`Skipped posts: ${skipped.length}`);
  if (args.limit) {
    console.log(`Limit applied: ${limited.length}/${deduped.length}`);
  }
  console.log(`Collection: ${args.collection}`);
  console.log(`Doc ID mode: ${args.docIdMode}`);
  console.log(`Auth mode: ${idToken ? 'authenticated' : 'unauthenticated'}`);
  console.log(`Force authorId: ${forceAuthorId ? 'yes' : 'no'}`);
  if (importUid) {
    console.log(`Import UID: ${importUid}`);
  }

  if (args.apply && !idToken) {
    throw new Error(
      'Import blocked: no Firebase auth token. Add FIREBASE_IMPORT_EMAIL and FIREBASE_IMPORT_PASSWORD in .env (or FIREBASE_ID_TOKEN), then retry.'
    );
  }

  if (!args.apply) {
    console.log('\nPreview (first 10):');
    for (const item of limited.slice(0, 10)) {
      console.log(`- ${item.docId} -> ${item.payload.title}`);
    }
    console.log('\nDry run complete. Re-run with --apply to write to Firestore.');
    return;
  }

  let success = 0;
  const failures = [];

  for (const item of limited) {
    try {
      await upsertDocument({
        projectId,
        collection: args.collection,
        docId: item.docId,
        fields: toFirestoreFields(item.payload),
        idToken
      });
      success += 1;
      console.log(`OK ${success}/${limited.length}: ${item.docId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ docId: item.docId, message });
      console.log(`FAIL ${item.docId}: ${message}`);
    }
  }

  console.log('\nImport finished.');
  console.log(`Success: ${success}`);
  console.log(`Failures: ${failures.length}`);
  if (failures.length > 0) {
    console.log('Failure details:');
    for (const failure of failures) {
      console.log(`- ${failure.docId}: ${failure.message}`);
    }

    if (!idToken) {
      console.log('\nHint: add FIREBASE_IMPORT_EMAIL and FIREBASE_IMPORT_PASSWORD in .env, then retry.');
    } else {
      console.log('\nHint: retry with --force-author-id if your rules require request.auth.uid == request.resource.data.authorId.');
    }
  }
}

main().catch((error) => {
  console.error('Import error:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
