import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const DEFAULT_INPUT_DIR = 'drafts/Content';
const DEFAULT_DB_PATH = 'src/data/database.json';
const DEFAULT_EXPORT_PATH = 'drafts/generated/content-articles-firestore.json';
const PROJECT_NAME = 'JC Hub';

function parseArgs(argv) {
  const args = {
    apply: false,
    inputDir: DEFAULT_INPUT_DIR,
    dbPath: DEFAULT_DB_PATH,
    exportPath: DEFAULT_EXPORT_PATH,
    start: '2026-06-08T00:00:00+01:00',
    weekly: 1,
    limit: null
  };

  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    if (arg.startsWith('--input-dir=')) args.inputDir = arg.slice('--input-dir='.length).trim() || args.inputDir;
    if (arg.startsWith('--db-path=')) args.dbPath = arg.slice('--db-path='.length).trim() || args.dbPath;
    if (arg.startsWith('--export=')) args.exportPath = arg.slice('--export='.length).trim() || args.exportPath;
    if (arg.startsWith('--start=')) args.start = arg.slice('--start='.length).trim() || args.start;
    if (arg.startsWith('--weekly=')) {
      const weekly = Number(arg.slice('--weekly='.length).trim());
      args.weekly = Number.isFinite(weekly) && weekly > 0 ? Math.floor(weekly) : args.weekly;
    }
    if (arg.startsWith('--limit=')) {
      const limit = Number(arg.slice('--limit='.length).trim());
      args.limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
    }
  }

  return args;
}

function slugify(value) {
  return String(value || 'article')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'article';
}

function readMetadata(text) {
  const pairs = [
    ['title', /META TITLE[^\n]*:\s*\n([^\n]+)/i],
    ['description', /META DESCRIPTION[^\n]*:\s*\n([^\n]+)/i],
    ['slug', /URL SLUG\s*:\s*\n([^\n]+)/i],
    ['category', /CATEGORIE\s*:\s*\n([^\n]+)/i],
    ['tags', /TAGS\s*:\s*\n([^\n]+)/i],
    ['readingTime', /TEMPS DE LECTURE\s*:\s*\n([^\n]+)/i],
    ['author', /AUTEUR\s*:\s*\n([^\n]+)/i]
  ];
  const metadata = {};
  for (const [key, pattern] of pairs) {
    metadata[key] = text.match(pattern)?.[1]?.trim() || '';
  }
  metadata.h1 = text.match(/^H1\s*:\s*(.+)$/im)?.[1]?.trim() || metadata.title;
  metadata.slug = slugify(String(metadata.slug || metadata.title).replace(/^\//, ''));
  metadata.tags = metadata.tags
    ? metadata.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];
  return metadata;
}

function stripMetadata(text) {
  const h1Index = text.search(/^H1\s*:/im);
  return h1Index >= 0 ? text.slice(h1Index) : text;
}

function isImageDetail(line) {
  return /^- (Fichier|Alt text|Position|PSI)\s*:/i.test(line.trim());
}

function isCodeLine(line) {
  const clean = line.trim();
  return (
    /^<\/?[a-z][\w:-]*(\s|>|$)/i.test(clean) ||
    /^<!--/.test(clean) ||
    /^[├└│]/.test(clean) ||
    /^[\w.-]+\/$/.test(clean) ||
    clean.startsWith('<?') ||
    clean.startsWith('?>') ||
    clean.startsWith('];') ||
    clean === '}' ||
    clean === '};' ||
    clean.startsWith('SELECT ') ||
    clean.startsWith('FROM ') ||
    clean.startsWith('WHERE ') ||
    clean.startsWith('GROUP BY') ||
    clean.startsWith('ORDER BY') ||
    clean.startsWith('import ') ||
    clean.startsWith('//') ||
    clean.includes(' = ') ||
    clean.includes('=>') ||
    clean.includes('$_POST') ||
    clean.includes('$_GET')
  );
}

function parseTable(lines) {
  const rows = lines.map((line) => line.split('|').map((cell) => cell.trim()));
  if (rows.length < 2) return null;
  const headers = rows[0];
  const bodyRows = rows.slice(1).filter((row) => row.length === headers.length);
  if (headers.length < 2 || bodyRows.length === 0) return null;
  return {
    type: 'table',
    content: lines.join('\n'),
    headers,
    rows: bodyRows,
    metadata: { variant: 'compare' }
  };
}

function buildContentBlocks(text) {
  const lines = stripMetadata(text).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let order = 0;
  let paragraph = [];
  let code = [];
  let table = [];
  let currentImage = null;

  const pushBlock = (block) => {
    blocks.push({
      ...block,
      id: `block-${order + 1}`,
      index: order,
      order
    });
    order += 1;
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    pushBlock({ type: 'paragraph', content: paragraph.join('\n') });
    paragraph = [];
  };

  const flushCode = () => {
    if (!code.length) return;
    pushBlock({ type: 'code', content: code.join('\n'), metadata: { language: 'php' } });
    code = [];
  };

  const flushTable = () => {
    if (!table.length) return;
    const parsed = parseTable(table);
    if (parsed) pushBlock(parsed);
    else pushBlock({ type: 'paragraph', content: table.join('\n') });
    table = [];
  };

  const flushImage = () => {
    if (!currentImage?.src) {
      currentImage = null;
      return;
    }
    pushBlock({
      type: 'image',
      content: currentImage.src,
      caption: currentImage.caption || PROJECT_NAME,
      alt: `${PROJECT_NAME} - ${currentImage.alt || currentImage.caption || 'article'}`
    });
    currentImage = null;
  };

  for (const rawLine of lines) {
    const clean = rawLine.trim();

    if (!clean || /^-{8,}$/.test(clean)) {
      flushParagraph();
      flushCode();
      flushTable();
      flushImage();
      continue;
    }

    const h1 = clean.match(/^H1\s*:\s*(.+)$/i);
    const h2 = clean.match(/^H2\s*:\s*(.+)$/i);
    const h3 = clean.match(/^H3\s*:\s*(.+)$/i);
    if (h1 || h2 || h3) {
      flushParagraph();
      flushCode();
      flushTable();
      flushImage();
      pushBlock({ type: 'subtitle', content: (h1 || h2 || h3)[1].trim() });
      continue;
    }

    if (clean.startsWith('[IMAGE')) {
      flushParagraph();
      flushCode();
      flushTable();
      flushImage();
      currentImage = { caption: clean.replace(/^\[|\]$/g, '') };
      continue;
    }

    if (currentImage && isImageDetail(clean)) {
      const match = clean.match(/^- (Fichier|Alt text|Position|PSI)\s*:\s*(.+)$/i);
      const key = match?.[1]?.toLowerCase();
      const value = match?.[2]?.trim().replace(/^"|"$/g, '') || '';
      if (key === 'fichier') currentImage.src = value;
      if (key === 'alt text') currentImage.alt = value;
      continue;
    }

    flushImage();

    if (/^(WARNING|POINTS?|CONSEIL|CHECKLIST|QUESTION|ERREUR|PRATIQUE)\b/i.test(clean)) {
      flushParagraph();
      flushCode();
      flushTable();
      const [rawLabel, ...rest] = clean.split(':');
      pushBlock({
        type: 'callout',
        content: rest.join(':').trim() || clean,
        metadata: {
          label: rawLabel.trim(),
          title: rawLabel.trim(),
          variant: /CHECKLIST/i.test(rawLabel) ? 'checklist' : /QUESTION/i.test(rawLabel) ? 'question' : 'warning'
        }
      });
      continue;
    }

    if (clean.includes('|') && !clean.startsWith('http')) {
      flushParagraph();
      flushCode();
      table.push(clean);
      continue;
    }

    if (code.length > 0 && /^\s{2,}\S/.test(rawLine)) {
      code.push(rawLine);
      continue;
    }

    if (isCodeLine(rawLine)) {
      flushParagraph();
      flushTable();
      code.push(rawLine);
      continue;
    }

    flushCode();
    flushTable();
    paragraph.push(clean);
  }

  flushParagraph();
  flushCode();
  flushTable();
  flushImage();

  return blocks.filter((block) => {
    if (block.type !== 'subtitle') return true;
    return !/^liste des images/i.test(block.content);
  });
}

function addWeeks(date, weeks) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + weeks * 7);
  return next;
}

function buildPost(filePath, index, startDate) {
  const text = fs.readFileSync(filePath, 'utf8');
  const metadata = readMetadata(text);
  const publishDate = addWeeks(startDate, index);
  const publishMs = publishDate.getTime();
  const blocks = buildContentBlocks(text);
  const firstParagraph = blocks.find((block) => block.type === 'paragraph')?.content || metadata.description;
  const firstImage = blocks.find((block) => block.type === 'image')?.content || '/jchub_monogram.png';
  const key = `article-scheduled-${metadata.slug}`;

  return [
    key,
    {
      id: key,
      title: metadata.title,
      slug: metadata.slug,
      description: metadata.description,
      excerpt: firstParagraph,
      category: metadata.category || 'Guide',
      tags: metadata.tags,
      image: firstImage,
      imageAlt: `${PROJECT_NAME} - ${metadata.title}`,
      status: 'published',
      author: metadata.author || PROJECT_NAME,
      author_name: metadata.author || PROJECT_NAME,
      role: 'Auteur JC Hub',
      views: 0,
      likes: 0,
      content: blocks,
      contentBlocks: blocks,
      sourceFile: path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/'),
      publishAt: publishDate.toISOString(),
      publishedAt: publishDate.toISOString(),
      createdAt: publishDate.toISOString(),
      updatedAt: new Date().toISOString(),
      publishOrder: index + 1,
      created_at: publishMs,
      published_at: publishMs,
      updated_at: Date.now()
    }
  ];
}

const args = parseArgs(process.argv.slice(2));
const inputDir = path.resolve(PROJECT_ROOT, args.inputDir);
const dbPath = path.resolve(PROJECT_ROOT, args.dbPath);
const exportPath = path.resolve(PROJECT_ROOT, args.exportPath);
const startDate = new Date(args.start);

if (Number.isNaN(startDate.getTime())) {
  throw new Error(`Date start invalide: ${args.start}`);
}

const files = fs.readdirSync(inputDir)
  .filter((file) => file.toLowerCase().endsWith('.txt'))
  .sort()
  .slice(0, args.limit || undefined)
  .map((file) => path.join(inputDir, file));

const posts = files.map((file, index) => buildPost(file, index * args.weekly, startDate));

console.table(posts.map(([key, post]) => ({
  key,
  title: post.title,
  slug: post.slug,
  publishAt: post.publishAt,
  blocks: post.contentBlocks.length
})));

if (!args.apply) {
  console.log('Dry run. Re-run with --apply to update database/export files.');
  process.exit(0);
}

const database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
database.blog ||= {};
database.blog.posts ||= {};
for (const [key, post] of posts) {
  database.blog.posts[key] = post;
}

fs.mkdirSync(path.dirname(exportPath), { recursive: true });
fs.writeFileSync(dbPath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
fs.writeFileSync(exportPath, `${JSON.stringify({ blog: { posts: Object.fromEntries(posts) } }, null, 2)}\n`, 'utf8');
console.log(`Updated ${dbPath}`);
console.log(`Wrote Firestore export ${exportPath}`);
