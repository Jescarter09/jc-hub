import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROJECT_ROOT = process.cwd();
const DEFAULT_INPUT_DIR = 'drafts/Content';
const DEFAULT_OUTPUT_DIR = 'drafts/previews';

function parseArgs(argv) {
  const args = {
    inputDir: DEFAULT_INPUT_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    open: false
  };

  for (const arg of argv) {
    if (arg === '--open') {
      args.open = true;
      continue;
    }
    if (arg.startsWith('--input-dir=')) {
      args.inputDir = arg.slice('--input-dir='.length).trim() || args.inputDir;
      continue;
    }
    if (arg.startsWith('--output-dir=')) {
      args.outputDir = arg.slice('--output-dir='.length).trim() || args.outputDir;
    }
  }

  return args;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderInline(value) {
  return escapeHtml(value)
    .replace(/(&lt;\?(?:php|=)[\s\S]*?\?&gt;)/g, '<code class="inline-code">$1</code>')
    .replace(/(&lt;\/?[a-z][\w:-]*(?:\s[^&]*?)?&gt;)/gi, '<code class="inline-code">$1</code>');
}

function slugify(value) {
  return String(value || 'article-preview')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'article-preview';
}

function readMetadata(text) {
  const pairs = [
    ['title', /META TITLE[^\n]*:\s*\n([^\n]+)/i],
    ['description', /META DESCRIPTION[^\n]*:\s*\n([^\n]+)/i],
    ['slug', /URL SLUG\s*:\s*\n([^\n]+)/i],
    ['category', /CATEGORIE\s*:\s*\n([^\n]+)/i],
    ['tags', /TAGS\s*:\s*\n([^\n]+)/i],
    ['readingTime', /TEMPS DE LECTURE\s*:\s*\n([^\n]+)/i],
    ['date', /DATE DE PUBLICATION\s*:\s*\n([^\n]+)/i],
    ['author', /AUTEUR\s*:\s*\n([^\n]+)/i]
  ];

  const metadata = {};
  for (const [key, pattern] of pairs) {
    const match = text.match(pattern);
    metadata[key] = match?.[1]?.trim() || '';
  }

  const h1 = text.match(/^H1\s*:\s*(.+)$/im)?.[1]?.trim();
  metadata.h1 = h1 || metadata.title;
  return metadata;
}

function stripMetadata(text) {
  const h1Index = text.search(/^H1\s*:/im);
  return h1Index >= 0 ? text.slice(h1Index) : text;
}

function isCodeLine(line) {
  return (
    /^<\/?[a-z][\w:-]*(\s|>|$)/i.test(line) ||
    /^<!--/.test(line) ||
    /^[├└│]/.test(line) ||
    /^[\w.-]+\/$/.test(line) ||
    line.startsWith('<?') ||
    line.startsWith('?>') ||
    line.startsWith('];') ||
    line === '}' ||
    line === '};' ||
    line.startsWith('<!DOCTYPE') ||
    line.startsWith('<html') ||
    line.startsWith('<head') ||
    line.startsWith('<body') ||
    line.startsWith('<form') ||
    line.startsWith('<ul') ||
    line.startsWith('<li') ||
    line.startsWith('<p') ||
    line.startsWith('<h') ||
    line.startsWith('</') ||
    line.startsWith('SELECT ') ||
    line.startsWith('FROM ') ||
    line.startsWith('WHERE ') ||
    line.startsWith('GROUP BY') ||
    line.startsWith('ORDER BY') ||
    line.startsWith('import ') ||
    line.startsWith('//') ||
    line.includes(' = ') ||
    line.includes('=>') ||
    line.includes('$_POST') ||
    line.includes('$_GET')
  );
}

function buildBlocks(text) {
  const lines = stripMetadata(text)
    .replace(/\r\n/g, '\n')
    .split('\n');
  const blocks = [];
  let paragraph = [];
  let code = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraph.join(' ') });
      paragraph = [];
    }
  }

  function flushCode() {
    if (code.length > 0) {
      blocks.push({ type: 'code', content: code.join('\n') });
      code = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const clean = line.trim();

    if (!clean || clean.startsWith('---')) {
      flushParagraph();
      flushCode();
      continue;
    }

    if (/^-{8,}$/.test(clean)) {
      flushParagraph();
      flushCode();
      continue;
    }

    const h1 = clean.match(/^H1\s*:\s*(.+)$/i);
    const h2 = clean.match(/^H2\s*:\s*(.+)$/i);
    const h3 = clean.match(/^H3\s*:\s*(.+)$/i);

    if (h1 || h2 || h3) {
      flushParagraph();
      flushCode();
      blocks.push({ type: h1 ? 'h1' : h2 ? 'h2' : 'h3', content: (h1 || h2 || h3)[1].trim() });
      continue;
    }

    if (code.length > 0 && /^\s{2,}\S/.test(rawLine)) {
      code.push(rawLine);
      continue;
    }

    if (code.length > 0 && (clean === '?>' || clean === '];' || clean === '}' || clean === '};')) {
      code.push(rawLine);
      continue;
    }

    if (clean.startsWith('[IMAGE')) {
      flushParagraph();
      flushCode();
      blocks.push({ type: 'image-note', content: clean.replace(/^\[|\]$/g, '') });
      continue;
    }

    const imageDetail = clean.match(/^- (Fichier|Alt text|Position|PSI)\s*:\s*(.+)$/i);
    if (imageDetail && blocks.at(-1)?.type === 'image-note') {
      const key = imageDetail[1].toLowerCase();
      const value = imageDetail[2].trim().replace(/^"|"$/g, '');
      blocks.at(-1).details = [...(blocks.at(-1).details || []), imageDetail[0].replace(/^- /, '')];
      if (key === 'fichier') blocks.at(-1).src = value;
      if (key === 'alt text') blocks.at(-1).alt = value;
      continue;
    }

    if (/^(WARNING|POINTS?|CONSEIL|CHECKLIST|QUESTION|ERREUR|PRATIQUE)\b/i.test(clean)) {
      flushParagraph();
      flushCode();
      blocks.push({ type: 'callout', content: clean });
      continue;
    }

    if (clean.includes('|') && !clean.startsWith('http')) {
      flushParagraph();
      flushCode();
      blocks.push({ type: 'table-line', content: clean });
      continue;
    }

    if (isCodeLine(clean)) {
      flushParagraph();
      code.push(rawLine);
      continue;
    }

    flushCode();
    paragraph.push(clean);
  }

  flushParagraph();
  flushCode();
  return blocks;
}

function resolvePreviewImageSrc(src) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/assets/')) return `../../public${value}`;
  if (value.startsWith('assets/')) return `../../public/${value}`;
  if (value.startsWith('public/')) return `../../${value}`;
  return value;
}

function renderBlocks(blocks) {
  const html = [];
  for (const block of blocks) {
    if (block.type === 'h1') continue;
    if (block.type === 'h2') html.push(`<h2>${renderInline(block.content)}</h2>`);
    if (block.type === 'h3') html.push(`<h3>${renderInline(block.content)}</h3>`);
    if (block.type === 'paragraph') html.push(`<p>${renderInline(block.content)}</p>`);
    if (block.type === 'code') {
      html.push(`<div class="code-window"><div class="code-top"><span></span><span></span><span></span><strong>exemple.php</strong></div><pre><code>${escapeHtml(block.content)}</code></pre></div>`);
    }
    if (block.type === 'callout') html.push(`<aside class="callout">${renderInline(block.content)}</aside>`);
    if (block.type === 'table-line') html.push(`<div class="table-line">${renderInline(block.content)}</div>`);
    if (block.type === 'image-note') {
      const src = String(block.src || '').trim();
      const previewSrc = resolvePreviewImageSrc(src);
      const looksLikeDirectImage = /^(https?:\/\/|\.{0,2}\/|public\/|assets\/|[a-z]:\\?)/i.test(previewSrc) && /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(previewSrc);
      const imageHtml = looksLikeDirectImage
        ? `<img src="${escapeHtml(previewSrc)}" alt="${escapeHtml(block.alt || block.content)}" loading="lazy">`
        : '';
      const sourceLink = /^https?:\/\//i.test(src)
        ? `<a class="image-source" href="${escapeHtml(src)}" target="_blank" rel="noreferrer">Voir la source image</a>`
        : '';
      html.push(`<figure class="image-note">${imageHtml}<figcaption><div>${escapeHtml(block.content)}</div>${sourceLink}</figcaption></figure>`);
    }
  }
  return html.join('\n');
}

function renderArticle(metadata, blocks, sourceName) {
  const tags = metadata.tags
    ? metadata.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(metadata.title || metadata.h1)}</title>
  <style>
    :root{color-scheme:light;--ink:#111827;--muted:#667085;--line:#e7eaf0;--soft:#f6f7fb;--brand:#111827;--accent:#5b4df1}
    *{box-sizing:border-box}
    body{margin:0;background:#f3f4f8;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.72}
    .shell{max-width:1120px;margin:0 auto;padding:38px 20px 72px}
    .top{display:flex;justify-content:space-between;gap:16px;margin-bottom:22px;color:var(--muted);font-size:13px}
    .paper{background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 70px rgba(17,24,39,.08);overflow:hidden}
    .hero{padding:52px clamp(22px,5vw,72px) 36px;background:linear-gradient(135deg,#101828,#29245f 58%,#0f766e);color:white}
    .eyebrow{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}
    .pill{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.12);border-radius:999px;padding:7px 12px;font-size:13px}
    h1{max-width:940px;margin:0;font-size:clamp(34px,5vw,64px);line-height:1.02;letter-spacing:0}
    .description{max-width:820px;margin:20px 0 0;color:rgba(255,255,255,.84);font-size:18px}
    .content{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:42px;padding:42px clamp(22px,5vw,72px)}
    article{min-width:0}
    aside.meta{align-self:start;position:sticky;top:20px;border:1px solid var(--line);border-radius:18px;padding:18px;background:var(--soft)}
    .meta h2{font-size:14px;margin:0 0 12px;text-transform:uppercase;color:#475467}
    .meta-row{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);padding:11px 0;font-size:14px}
    .meta-row:first-of-type{border-top:0}
    .tag-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
    .tag{background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 9px;font-size:12px;color:#475467}
    h2{margin:42px 0 14px;font-size:30px;line-height:1.18;letter-spacing:0}
    h3{margin:28px 0 10px;font-size:22px;line-height:1.25}
    p{margin:0 0 18px;font-size:17px;color:#293142}
    .inline-code{display:inline-block;padding:2px 7px;border:1px solid #dbe4ef;border-radius:7px;background:#f8fafc;color:#111827;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;line-height:1.45}
    .code-window{max-width:100%;overflow:hidden;margin:22px 0;border:1px solid #1f2937;border-radius:18px;background:#101828;box-shadow:0 18px 45px rgba(16,24,40,.18)}
    .code-top{height:42px;display:flex;align-items:center;gap:8px;padding:0 14px;background:#1f2937;border-bottom:1px solid rgba(255,255,255,.08)}
    .code-top span{width:11px;height:11px;border-radius:999px;display:inline-block}
    .code-top span:nth-child(1){background:#ff5f57}
    .code-top span:nth-child(2){background:#ffbd2e}
    .code-top span:nth-child(3){background:#28c840}
    .code-top strong{margin-left:8px;color:#cbd5e1;font-size:12px;font-weight:800;letter-spacing:0;text-transform:uppercase}
    pre{max-width:100%;overflow:auto;margin:0;padding:20px;background:#101828;color:#e6edf7;font-size:14px;line-height:1.65}
    .callout{margin:22px 0;padding:18px 20px;border-left:5px solid var(--accent);border-radius:16px;background:#f5f3ff;color:#322659;font-weight:700}
    .image-note{margin:24px 0;border:1px dashed #a7b0c0;border-radius:18px;background:#f8fafc;color:#475467;overflow:hidden}
    .image-note img{display:block;width:100%;max-height:520px;object-fit:cover;background:#e7eaf0}
    .image-note figcaption{padding:18px 20px}
    .image-note div{font-weight:800;color:#111827}
    .image-note ul{margin:10px 0 0;padding-left:20px}
    .image-source{display:inline-flex;margin-top:14px;padding:9px 12px;border:1px solid #d0d5dd;border-radius:999px;color:#111827;text-decoration:none;background:#fff;font-weight:700;font-size:13px}
    .table-line{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;margin:8px 0;padding:10px 12px;background:#f8fafc;border:1px solid var(--line);border-radius:10px;overflow:auto}
    @media (max-width:860px){.content{grid-template-columns:1fr}.meta{position:static}.hero{padding-top:38px}h1{font-size:34px}}
  </style>
</head>
<body>
  <main class="shell">
    <div class="top">
      <span>Preview locale - ${escapeHtml(sourceName)}</span>
      <span>Non publie, non connecte a Firestore</span>
    </div>
    <section class="paper">
      <header class="hero">
        <div class="eyebrow">
          ${metadata.category ? `<span class="pill">${escapeHtml(metadata.category)}</span>` : ''}
          ${metadata.readingTime ? `<span class="pill">${escapeHtml(metadata.readingTime)}</span>` : ''}
          ${metadata.date ? `<span class="pill">${escapeHtml(metadata.date)}</span>` : ''}
        </div>
        <h1>${escapeHtml(metadata.h1 || metadata.title)}</h1>
        ${metadata.description ? `<p class="description">${escapeHtml(metadata.description)}</p>` : ''}
      </header>
      <div class="content">
        <article>${renderBlocks(blocks)}</article>
        <aside class="meta">
          <h2>Infos article</h2>
          <div class="meta-row"><strong>Auteur</strong><span>${escapeHtml(metadata.author || '-')}</span></div>
          <div class="meta-row"><strong>Slug</strong><span>${escapeHtml(metadata.slug || '-')}</span></div>
          <div class="meta-row"><strong>Categorie</strong><span>${escapeHtml(metadata.category || '-')}</span></div>
          <div class="tag-list">${tags.slice(0, 18).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
        </aside>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function buildPreviewForFile(filePath, outputDir) {
  const text = fs.readFileSync(filePath, 'utf8');
  const metadata = readMetadata(text);
  const blocks = buildBlocks(text);
  const baseName = slugify(metadata.slug || metadata.title || path.basename(filePath, '.txt'));
  const outputPath = path.join(outputDir, `${baseName}-content-preview.html`);
  fs.writeFileSync(outputPath, renderArticle(metadata, blocks, path.basename(filePath)), 'utf8');
  return outputPath;
}

const args = parseArgs(process.argv.slice(2));
const inputDir = path.resolve(PROJECT_ROOT, args.inputDir);
const outputDir = path.resolve(PROJECT_ROOT, args.outputDir);
fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(inputDir)
  .filter((file) => file.toLowerCase().endsWith('.txt'))
  .sort()
  .map((file) => path.join(inputDir, file));

if (files.length === 0) {
  console.log(`Aucun fichier .txt trouve dans ${inputDir}`);
  process.exit(0);
}

const outputs = files.map((file) => buildPreviewForFile(file, outputDir));
for (const output of outputs) {
  console.log(pathToFileURL(output).href);
}
