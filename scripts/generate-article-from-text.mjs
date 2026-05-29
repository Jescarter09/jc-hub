import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const DEFAULTS = {
  input: 'drafts/article.txt',
  output: '',
  assetsDir: 'assets',
  publicDir: 'public/assets/articles',
  publicUrlBase: '/assets/articles',
  category: 'Technologie',
  status: 'published',
  imageHost: 'cloudinary',
  saveDb: true,
  dbPath: 'src/data/database.json',
  authorName: '',
  authorId: '',
  cloudinaryFolder: '',
  projectName: '',
  withLogo: true,
  logoPath: 'src/assets/jc-hub-logo.png',
  logoScalePercent: 16,
  logoOpacity: 0.85,
  logoMargin: 24,
  browserPreview: true,
  previewDir: 'drafts/previews',
  autoOpenPreview: true,
  confirmBeforePublish: true,
  yes: false
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'];
const METADATA_KEYS = {
  titre: 'title',
  title: 'title',
  description: 'description',
  excerpt: 'description',
  resume: 'description',
  categorie: 'category',
  category: 'category',
  tags: 'tags',
  banniere: 'banner',
  banner: 'banner'
};

const TAG_FORCE_UPPERCASE = new Set([
  'ai',
  'api',
  'css',
  'crm',
  'erp',
  'html',
  'ia',
  'ios',
  'js',
  'pc',
  'seo',
  'sql',
  'ui',
  'ux'
]);

const TAG_STOP_WORDS = new Set([
  'a', 'abord', 'afin', 'ai', 'aie', 'ainsi', 'alors', 'apres', 'au', 'aucun', 'aucune', 'aupres', 'auquel',
  'aura', 'aurait', 'aussi', 'autre', 'autres', 'aux', 'avaient', 'avais', 'avait', 'avant', 'avec', 'avoir',
  'avons', 'ayant', 'b', 'bien', 'blog', 'c', 'ca', 'car', 'ce', 'ceci', 'cela', 'celle', 'celles', 'celui',
  'ces', 'cet', 'cette', 'ceux', 'chacun', 'chaque', 'chez', 'comment', 'comme', 'contre', 'd', 'dans', 'de',
  'dedans', 'dehors', 'deja', 'depuis', 'derriere', 'des', 'desormais', 'deux', 'devant', 'doit', 'donc', 'dont',
  'du', 'duquel', 'durant', 'e', 'elle', 'elles', 'en', 'encore', 'entre', 'envers', 'es', 'est', 'et', 'etaient',
  'etais', 'etait', 'etant', 'ete', 'etes', 'etre', 'eux', 'f', 'fait', 'font', 'g', 'h', 'i', 'ici', 'il', 'ils',
  'j', 'je', 'jusque', 'k', 'l', 'la', 'le', 'les', 'leur', 'leurs', 'lors', 'lorsque', 'lui', 'm', 'ma', 'mais',
  'malgre', 'me', 'meme', 'mes', 'moi', 'moins', 'mon', 'n', 'ne', 'ni', 'non', 'nos', 'notre', 'nous', 'o', 'on',
  'ont', 'or', 'ou', 'ouais', 'outre', 'p', 'par', 'parce', 'parfois', 'pas', 'pendant', 'peu', 'peut', 'plus',
  'pour', 'pourquoi', 'q', 'qu', 'quand', 'que', 'quel', 'quelle', 'quelles', 'quels', 'qui', 'quoi', 'r', 's',
  'sa', 'sans', 'se', 'ses', 'si', 'sinon', 'soi', 'son', 'sont', 'sous', 'sur', 't', 'ta', 'te', 'tel', 'telle',
  'tes', 'toi', 'ton', 'tous', 'tout', 'toute', 'toutes', 'tres', 'tu', 'u', 'un', 'une', 'v', 'vers', 'via',
  'vos', 'votre', 'vous', 'w', 'x', 'y', 'z',
  'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'if', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
  'that', 'the', 'their', 'this', 'to', 'was', 'were', 'with',
  'article', 'articles', 'etape', 'etapes', 'partie', 'parties', 'section', 'sections', 'http', 'https', 'www',
  'com', 'org', 'net'
]);

const TERMINAL_CODE_LANGUAGES = new Set([
  'bash',
  'sh',
  'shell',
  'zsh',
  'fish',
  'powershell',
  'pwsh',
  'ps1',
  'cmd',
  'bat',
  'batch',
  'console',
  'terminal'
]);

const HTML_CODE_LANGUAGES = new Set([
  'html',
  'xml',
  'svg',
  'xhtml',
  'htm'
]);

const IMAGE_MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml'
};

function parseArgs(argv) {
  const args = {
    input: DEFAULTS.input,
    output: DEFAULTS.output,
    assetsDir: DEFAULTS.assetsDir,
    publicDir: DEFAULTS.publicDir,
    publicUrlBase: DEFAULTS.publicUrlBase,
    category: DEFAULTS.category,
    status: DEFAULTS.status,
    imageHost: DEFAULTS.imageHost,
    saveDb: DEFAULTS.saveDb,
    dbPath: DEFAULTS.dbPath,
    authorName: DEFAULTS.authorName,
    authorId: DEFAULTS.authorId,
    cloudinaryFolder: DEFAULTS.cloudinaryFolder,
    projectName: DEFAULTS.projectName,
    withLogo: DEFAULTS.withLogo,
    logoPath: DEFAULTS.logoPath,
    logoScalePercent: DEFAULTS.logoScalePercent,
    logoOpacity: DEFAULTS.logoOpacity,
    logoMargin: DEFAULTS.logoMargin,
    browserPreview: DEFAULTS.browserPreview,
    previewDir: DEFAULTS.previewDir,
    autoOpenPreview: DEFAULTS.autoOpenPreview,
    confirmBeforePublish: DEFAULTS.confirmBeforePublish,
    yes: DEFAULTS.yes
  };

  for (const arg of argv) {
    if (arg === '-y' || arg === '--yes') {
      args.yes = true;
      args.confirmBeforePublish = false;
      continue;
    }
    if (arg === '--no-confirm') {
      args.confirmBeforePublish = false;
      continue;
    }
    if (arg === '--no-browser-preview' || arg === '--no-web-preview') {
      args.browserPreview = false;
      continue;
    }
    if (arg === '--browser-preview' || arg === '--web-preview') {
      args.browserPreview = true;
      continue;
    }
    if (arg === '--no-open-preview') {
      args.autoOpenPreview = false;
      continue;
    }
    if (arg === '--open-preview') {
      args.autoOpenPreview = true;
      continue;
    }
    if (arg === '--confirm') {
      args.confirmBeforePublish = true;
      continue;
    }
    if (arg === '--save-db') {
      args.saveDb = true;
      continue;
    }
    if (arg === '--no-save-db') {
      args.saveDb = false;
      continue;
    }
    if (arg.startsWith('--input=')) {
      args.input = arg.slice('--input='.length).trim() || args.input;
      continue;
    }
    if (arg.startsWith('--output=')) {
      args.output = arg.slice('--output='.length).trim();
      continue;
    }
    if (arg.startsWith('--preview-dir=')) {
      args.previewDir = arg.slice('--preview-dir='.length).trim() || args.previewDir;
      continue;
    }
    if (arg.startsWith('--assets-dir=')) {
      args.assetsDir = arg.slice('--assets-dir='.length).trim() || args.assetsDir;
      continue;
    }
    if (arg.startsWith('--public-dir=')) {
      args.publicDir = arg.slice('--public-dir='.length).trim() || args.publicDir;
      continue;
    }
    if (arg.startsWith('--public-url-base=')) {
      args.publicUrlBase = arg.slice('--public-url-base='.length).trim() || args.publicUrlBase;
      continue;
    }
    if (arg.startsWith('--category=')) {
      args.category = arg.slice('--category='.length).trim() || args.category;
      continue;
    }
    if (arg.startsWith('--status=')) {
      args.status = arg.slice('--status='.length).trim() || args.status;
      continue;
    }
    if (arg.startsWith('--image-host=')) {
      const host = arg.slice('--image-host='.length).trim().toLowerCase();
      args.imageHost = host === 'local' ? 'local' : 'cloudinary';
      continue;
    }
    if (arg.startsWith('--db-path=')) {
      args.dbPath = arg.slice('--db-path='.length).trim() || args.dbPath;
      continue;
    }
    if (arg.startsWith('--author-name=')) {
      args.authorName = arg.slice('--author-name='.length).trim() || args.authorName;
      continue;
    }
    if (arg.startsWith('--author-id=')) {
      args.authorId = arg.slice('--author-id='.length).trim() || args.authorId;
      continue;
    }
    if (arg.startsWith('--cloudinary-folder=')) {
      args.cloudinaryFolder = arg.slice('--cloudinary-folder='.length).trim() || args.cloudinaryFolder;
      continue;
    }
    if (arg.startsWith('--project-name=')) {
      args.projectName = arg.slice('--project-name='.length).trim() || args.projectName;
      continue;
    }
    if (arg === '--no-logo') {
      args.withLogo = false;
      continue;
    }
    if (arg.startsWith('--logo-path=')) {
      args.logoPath = arg.slice('--logo-path='.length).trim() || args.logoPath;
      continue;
    }
    if (arg.startsWith('--logo-scale=')) {
      const value = Number(arg.slice('--logo-scale='.length).trim());
      if (Number.isFinite(value) && value > 0 && value <= 100) {
        args.logoScalePercent = value;
      }
      continue;
    }
    if (arg.startsWith('--logo-opacity=')) {
      const value = Number(arg.slice('--logo-opacity='.length).trim());
      if (Number.isFinite(value) && value >= 0.05 && value <= 1) {
        args.logoOpacity = value;
      }
      continue;
    }
    if (arg.startsWith('--logo-margin=')) {
      const value = Number(arg.slice('--logo-margin='.length).trim());
      if (Number.isFinite(value) && value >= 0) {
        args.logoMargin = Math.floor(value);
      }
      continue;
    }
    if (!arg.startsWith('-')) {
      args.input = arg;
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
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
}

function stripQuotes(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
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

function truncate(value, max = 220) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readProjectNameFromPackageJson() {
  try {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) return '';
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    return String(parsed?.name || '').trim();
  } catch {
    return '';
  }
}

function resolveProjectSlug(args) {
  const rawProjectName = String(
    args.projectName ||
      process.env.PROJECT_NAME ||
      process.env.VITE_PROJECT_NAME ||
      readProjectNameFromPackageJson() ||
      'project'
  ).trim();

  const slug = toSlug(rawProjectName);
  return slug || 'project';
}

function randomSuffix() {
  return crypto.randomBytes(3).toString('hex');
}

function normalizeImageExtension(filePath) {
  const raw = path.extname(filePath).toLowerCase();
  if (raw === '.svg') {
    return '.png';
  }
  if (IMAGE_EXTENSIONS.includes(raw)) {
    return raw;
  }
  return '.png';
}

async function applyLogoWatermark({
  sourceFilePath,
  outputFilePath,
  logoFilePath,
  scalePercent,
  opacity,
  margin
}) {
  const sourceMeta = await sharp(sourceFilePath).metadata();
  if (!sourceMeta.width || !sourceMeta.height) {
    fs.copyFileSync(sourceFilePath, outputFilePath);
    return;
  }

  const targetLogoWidth = Math.max(
    56,
    Math.round(sourceMeta.width * (Number(scalePercent) / 100))
  );

  const logoBuffer = await sharp(logoFilePath)
    .resize({ width: targetLogoWidth, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha(Math.max(0.05, Math.min(1, Number(opacity) || 0.85)))
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoBuffer).metadata();
  if (!logoMeta.width || !logoMeta.height) {
    fs.copyFileSync(sourceFilePath, outputFilePath);
    return;
  }

  const safeMargin = Math.max(0, Math.floor(Number(margin) || 0));
  const left = Math.max(0, sourceMeta.width - logoMeta.width - safeMargin);
  const top = Math.max(0, sourceMeta.height - logoMeta.height - safeMargin);

  await sharp(sourceFilePath)
    .composite([{ input: logoBuffer, left, top }])
    .toFile(outputFilePath);
}

function createImagePreparer(args) {
  const projectSlug = resolveProjectSlug(args);
  const withLogo = args.withLogo !== false;
  const logoPath = path.resolve(process.cwd(), args.logoPath || DEFAULTS.logoPath);

  if (withLogo && !fs.existsSync(logoPath)) {
    throw new Error(`Logo introuvable: ${logoPath}`);
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jc-hub-images-'));
  const preparedCache = new Map();

  const prepare = async (sourceFilePath) => {
    const absoluteSource = path.resolve(sourceFilePath);
    if (preparedCache.has(absoluteSource)) {
      return preparedCache.get(absoluteSource);
    }

    const ext = normalizeImageExtension(absoluteSource);
    const base = toSlug(path.basename(absoluteSource, path.extname(absoluteSource))) || 'image';
    const fileBase = `${projectSlug}-${base}-${Date.now()}-${randomSuffix()}`;
    const outputFileName = `${fileBase}${ext}`;
    const preparedPath = path.join(tempRoot, outputFileName);

    if (withLogo) {
      await applyLogoWatermark({
        sourceFilePath: absoluteSource,
        outputFilePath: preparedPath,
        logoFilePath: logoPath,
        scalePercent: args.logoScalePercent,
        opacity: args.logoOpacity,
        margin: args.logoMargin
      });
    } else {
      fs.copyFileSync(absoluteSource, preparedPath);
    }

    const prepared = {
      projectSlug,
      preparedPath,
      outputFileName,
      publicId: fileBase
    };

    preparedCache.set(absoluteSource, prepared);
    return prepared;
  };

  const cleanup = () => {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // No-op cleanup.
    }
  };

  return {
    projectSlug,
    withLogo,
    logoPath,
    prepare,
    cleanup
  };
}

function parseMetadataLine(line) {
  const match = String(line || '').trim().match(/^([a-zA-ZÀ-ÿ]+)\s*[:=]\s*(.+)$/);
  if (!match) return null;

  const rawKey = match[1]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const key = METADATA_KEYS[rawKey];
  if (!key) return null;

  return {
    key,
    value: stripQuotes(match[2])
  };
}

function parseBannerShortcut(line) {
  const trimmed = String(line || '').trim();
  const quoted = trimmed.match(/^(?:banniere|banner)\s+("(?:[^"\\]|\\.)+"|'(?:[^'\\]|\\.)+')$/i);
  if (quoted) {
    return stripQuotes(quoted[1]);
  }

  const singleToken = trimmed.match(/^(?:banniere|banner)\s+([^\s]+)$/i);
  if (!singleToken) return '';
  return stripQuotes(singleToken[1]);
}

function parseImageShortcut(line) {
  const trimmed = String(line || '').trim();
  const quoted = trimmed.match(/^(?:image|images|img)\s+("(?:[^"\\]|\\.)+"|'(?:[^'\\]|\\.)+')$/i);
  if (quoted) {
    return stripQuotes(quoted[1]);
  }

  const singleToken = trimmed.match(/^(?:image|images|img)\s+([^\s]+)$/i);
  if (!singleToken) return '';
  return stripQuotes(singleToken[1]);
}

function normalizeMarkerText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isSeparatorLine(line) {
  return /^[-_=]{5,}$/.test(String(line || '').trim());
}

function splitTableRow(line) {
  const raw = String(line || '').trim();
  if (!raw.includes('|')) return [];
  return raw
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function isTableRowLine(line) {
  return splitTableRow(line).length >= 2;
}

function isMarkdownTableSeparator(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableBlock(tableLines) {
  const rows = tableLines
    .map((line) => splitTableRow(line))
    .filter((cells) => cells.length >= 2 && !isMarkdownTableSeparator(cells));

  if (rows.length < 2) return null;

  const headers = rows[0];
  const bodyRows = rows.slice(1).filter((row) => row.some(Boolean));
  if (headers.length < 2 || bodyRows.length === 0) return null;

  return {
    type: 'table',
    content: tableLines.join('\n'),
    headers,
    rows: bodyRows,
    metadata: {
      variant: 'compare'
    }
  };
}

function getCalloutVariant(label, title) {
  const marker = normalizeMarkerText(`${label} ${title}`);
  if (
    marker.includes('warning') ||
    marker.includes('danger') ||
    marker.includes('attention') ||
    marker.includes('critique') ||
    marker.includes('arnaque')
  ) {
    return 'warning';
  }
  if (marker.includes('question')) return 'question';
  if (marker.includes('conseil')) return 'advice';
  if (marker.includes('chiffre')) return 'metric';
  if (marker.includes('checklist')) return 'checklist';
  return 'note';
}

function parseCalloutShortcut(line) {
  let trimmed = String(line || '').trim();
  if (!trimmed) return null;

  if (/^warning\s*:/i.test(trimmed)) {
    trimmed = trimmed.replace(/^warning\s*:\s*/i, '');
    if (!/^(WARNING|DANGER|ATTENTION|CONSEIL|NB|NOTE|QUESTION|POINTS?|CHECKLIST|CHIFFRE|R[ÉE]SUM[ÉE])\b/i.test(trimmed)) {
      trimmed = `WARNING : ${trimmed}`;
    }
  }

  const match = trimmed.match(
    /^(WARNING|DANGER|ATTENTION|CONSEIL|NB|NOTE|QUESTION(?:\s+POUR\s+TOI)?|POINTS?\s+LES\s+PLUS\s+IMPORTANTS|CHECKLIST\s+[ÀA]?\s*SUIVRE\s+MAINTENANT|CHIFFRE\s+CL[ÉE]|R[ÉE]SUM[ÉE]\s+ESSENTIEL)\s*(?:\/\s*([^:]+))?\s*:\s*(.*)$/i
  );
  if (!match) return null;

  const label = match[1].trim();
  const title = String(match[2] || match[1]).trim();
  const content = String(match[3] || '').trim();

  return {
    type: 'callout',
    content,
    metadata: {
      label,
      title,
      variant: getCalloutVariant(label, title)
    }
  };
}

function isListLikeLine(line) {
  const trimmed = String(line || '').trim();
  return /^[-*]\s+/.test(trimmed) || /^\[[ xX]\]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
}

function normalizeInlineAssetPlaceholders(text) {
  let normalized = String(text || '');

  // Ex: [banniere ici : ...]**
  normalized = normalized.replace(
    /\[\s*(?:banni[eè]re|banner)[^\]]*\]\**/gi,
    '\nbanniere banniere\n'
  );

  // Ex: [Image 2 ici : ...]** -> image image2
  normalized = normalized.replace(
    /\[\s*(?:image|images|img)\s*([0-9]+)[^\]]*\]\**/gi,
    (_, index) => `\nimage image${index}\n`
  );

  return normalized;
}

function createAssetResolver(assetsDir) {
  const absoluteAssetsDir = path.resolve(process.cwd(), assetsDir);
  if (!fs.existsSync(absoluteAssetsDir)) {
    throw new Error(`Dossier assets introuvable: ${absoluteAssetsDir}`);
  }

  const directFiles = fs.readdirSync(absoluteAssetsDir, { withFileTypes: true }).filter((entry) => entry.isFile());
  const byFileName = new Map();
  const byBaseName = new Map();

  for (const entry of directFiles) {
    const fullPath = path.join(absoluteAssetsDir, entry.name);
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) {
      continue;
    }

    const fileNameKey = entry.name.toLowerCase();
    byFileName.set(fileNameKey, fullPath);

    const baseKey = path.basename(entry.name, ext).toLowerCase();
    const list = byBaseName.get(baseKey) || [];
    list.push(fullPath);
    byBaseName.set(baseKey, list);
  }

  for (const list of byBaseName.values()) {
    list.sort((a, b) => {
      const extA = path.extname(a).toLowerCase();
      const extB = path.extname(b).toLowerCase();
      return IMAGE_EXTENSIONS.indexOf(extA) - IMAGE_EXTENSIONS.indexOf(extB);
    });
  }

  return (reference) => {
    const raw = stripQuotes(reference);
    if (!raw) return '';

    const withFileName = path.basename(raw);
    const directByName = byFileName.get(withFileName.toLowerCase());
    if (directByName) {
      return directByName;
    }

    const ext = path.extname(withFileName).toLowerCase();
    if (ext) {
      return '';
    }

    const fromBase = byBaseName.get(withFileName.toLowerCase());
    if (fromBase && fromBase.length > 0) {
      return fromBase[0];
    }

    const numeric = withFileName.toLowerCase().match(/^(\d+)$/);
    if (numeric) {
      const fromImageNumeric = byBaseName.get(`image${numeric[1]}`);
      if (fromImageNumeric && fromImageNumeric.length > 0) {
        return fromImageNumeric[0];
      }
    }

    return '';
  };
}

function createPublicAssetCopier(publicDir, publicUrlBase) {
  const absolutePublicDir = path.resolve(process.cwd(), publicDir);
  ensureDir(absolutePublicDir);

  const copied = new Map();
  const reservedFileNames = new Set(
    fs
      .readdirSync(absolutePublicDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name.toLowerCase())
  );

  return (sourceFilePath) => {
    const absoluteSource = path.resolve(sourceFilePath);
    if (copied.has(absoluteSource)) {
      return copied.get(absoluteSource);
    }

    const ext = path.extname(absoluteSource).toLowerCase() || '.png';
    const originalBase = path.basename(absoluteSource, ext);
    const safeBase = toSlug(originalBase) || 'image';

    let fileName = `${safeBase}${ext}`;
    let suffix = 2;
    while (reservedFileNames.has(fileName.toLowerCase())) {
      fileName = `${safeBase}-${suffix}${ext}`;
      suffix += 1;
    }
    reservedFileNames.add(fileName.toLowerCase());

    const destination = path.join(absolutePublicDir, fileName);
    fs.copyFileSync(absoluteSource, destination);

    const normalizedBaseUrl = (publicUrlBase || '/assets/articles').replace(/\/+$/, '');
    const publicUrl = `${normalizedBaseUrl}/${fileName}`.replace(/\\/g, '/');
    copied.set(absoluteSource, publicUrl);
    return publicUrl;
  };
}

function getCloudinaryConfig(args) {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
  const uploadPreset = String(process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();
  const folder = String(
    args.cloudinaryFolder ||
      process.env.CLOUDINARY_FOLDER ||
      process.env.VITE_CLOUDINARY_FOLDER ||
      ''
  ).trim();

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary non configure. Ajoute VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET dans .env'
    );
  }

  return { cloudName, uploadPreset, folder };
}

function shouldRetryUploadWithoutPublicId(message) {
  const lowered = String(message || '').toLowerCase();
  return (
    lowered.includes('public_id') ||
    lowered.includes('disallow_public_id') ||
    lowered.includes('unsigned')
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientCloudinaryError(error) {
  const status = Number(error?.status || 0);
  if (Number.isFinite(status) && status >= 500 && status <= 599) {
    return true;
  }

  const lowered = String(error?.message || '').toLowerCase();
  return (
    lowered.includes('http 5') ||
    lowered.includes('fetch failed') ||
    lowered.includes('network') ||
    lowered.includes('timeout') ||
    lowered.includes('timed out') ||
    lowered.includes('econnreset') ||
    lowered.includes('socket hang up')
  );
}

async function uploadImageToCloudinary(preparedImage, cloudinaryConfig) {
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`;
  const sourceBuffer = fs.readFileSync(preparedImage.preparedPath);
  const formData = new FormData();
  const blob = new Blob([sourceBuffer]);

  const performUpload = async (withPublicId) => {
    const data = new FormData();
    data.append('file', blob, preparedImage.outputFileName);
    data.append('upload_preset', cloudinaryConfig.uploadPreset);
    if (cloudinaryConfig.folder) {
      data.append('folder', cloudinaryConfig.folder);
    }
    if (withPublicId) {
      data.append('public_id', preparedImage.publicId);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: data
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || payload?.error?.name || `HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload;
  };

  const performUploadWithRetry = async (withPublicId) => {
    const retryDelaysMs = [0, 900, 1800, 3000];
    let lastError = null;

    for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
      if (attempt > 0) {
        await delay(retryDelaysMs[attempt]);
      }

      try {
        return await performUpload(withPublicId);
      } catch (error) {
        lastError = error;
        if (attempt === retryDelaysMs.length - 1 || !isTransientCloudinaryError(error)) {
          throw error;
        }
        console.log(
          `Cloudinary temporairement indisponible (${preparedImage.outputFileName}), nouvelle tentative ${attempt + 2}/${retryDelaysMs.length}...`
        );
      }
    }

    throw lastError || new Error('Unknown Cloudinary upload error');
  };

  let payload;
  try {
    payload = await performUploadWithRetry(true);
  } catch (firstError) {
    if (!shouldRetryUploadWithoutPublicId(firstError.message)) {
      throw new Error(
        `Cloudinary upload failed (${preparedImage.outputFileName}): ${firstError.message}`
      );
    }

    try {
      payload = await performUploadWithRetry(false);
    } catch (fallbackError) {
      throw new Error(
        `Cloudinary upload failed (${preparedImage.outputFileName}): ${fallbackError.message}`
      );
    }
  }

  const secureUrl = String(payload?.secure_url || '').trim();
  if (!secureUrl) {
    throw new Error(`Cloudinary secure_url manquant pour ${preparedImage.outputFileName}`);
  }

  return secureUrl;
}

function createImagePublisher(args) {
  const imagePreparer = createImagePreparer(args);

  if (args.imageHost === 'local') {
    const copyToPublic = createPublicAssetCopier(args.publicDir, args.publicUrlBase);
    const uploaded = new Map();

    return {
      projectSlug: imagePreparer.projectSlug,
      withLogo: imagePreparer.withLogo,
      logoPath: imagePreparer.logoPath,
      cleanup: imagePreparer.cleanup,
      publish: async (sourceFilePath) => {
        const absoluteSource = path.resolve(sourceFilePath);
        if (uploaded.has(absoluteSource)) {
          return uploaded.get(absoluteSource);
        }
        const prepared = await imagePreparer.prepare(absoluteSource);
        const url = copyToPublic(prepared.preparedPath);
        uploaded.set(absoluteSource, url);
        return url;
      }
    };
  }

  const cloudinaryConfig = getCloudinaryConfig(args);
  const uploaded = new Map();

  return {
    projectSlug: imagePreparer.projectSlug,
    withLogo: imagePreparer.withLogo,
    logoPath: imagePreparer.logoPath,
    cleanup: imagePreparer.cleanup,
    publish: async (sourceFilePath) => {
      const absoluteSource = path.resolve(sourceFilePath);
      if (uploaded.has(absoluteSource)) {
        return uploaded.get(absoluteSource);
      }
      const prepared = await imagePreparer.prepare(absoluteSource);
      const url = await uploadImageToCloudinary(prepared, cloudinaryConfig);
      uploaded.set(absoluteSource, url);
      return url;
    }
  };
}

function normalizeTags(tagsLine) {
  if (!tagsLine) return [];
  return String(tagsLine)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeForTagAnalysis(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeForTags(text) {
  const normalized = normalizeForTagAnalysis(text);
  if (!normalized) return [];

  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => {
      if (!token) return false;
      if (TAG_STOP_WORDS.has(token)) return false;
      if (/^\d+$/.test(token)) return false;
      if (token.length < 3 && !TAG_FORCE_UPPERCASE.has(token)) return false;
      return true;
    });
}

function toTagLabel(token) {
  const raw = String(token || '').trim();
  if (!raw) return '';

  if (raw.includes(' ')) {
    return raw
      .split(' ')
      .filter(Boolean)
      .map((word) => toTagLabel(word))
      .join(' ');
  }

  if (TAG_FORCE_UPPERCASE.has(raw)) {
    return raw.toUpperCase();
  }

  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function generateAutoTags({ title, description, category, contentBlocks, maxTags = 8 }) {
  const scores = new Map();

  const addTokens = (tokens, weight) => {
    for (const token of tokens) {
      scores.set(token, (scores.get(token) || 0) + weight);
    }
  };

  const titleTokens = tokenizeForTags(title);
  addTokens(titleTokens, 8);

  for (let i = 0; i < titleTokens.length - 1; i += 1) {
    const first = titleTokens[i];
    const second = titleTokens[i + 1];
    if (first.length >= 4 && second.length >= 4) {
      addTokens([`${first} ${second}`], 10);
    }
  }

  addTokens(tokenizeForTags(description), 4);
  addTokens(tokenizeForTags(category), 3);

  let paragraphCount = 0;
  for (const block of contentBlocks || []) {
    const type = String(block?.type || '').toLowerCase();
    const content = String(block?.content || '');
    if (!content.trim()) continue;

    if (type === 'subtitle') {
      addTokens(tokenizeForTags(content), 6);
      continue;
    }

    if (type === 'paragraph') {
      paragraphCount += 1;
      addTokens(tokenizeForTags(content), paragraphCount <= 2 ? 3 : 1);
    }
  }

  const ranked = Array.from(scores.entries())
    .filter(([token]) => !/^\d+$/.test(token))
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'fr');
    })
    .map(([token]) => toTagLabel(token))
    .filter(Boolean);

  const unique = [];
  const seen = new Set();

  for (const item of ranked) {
    const key = normalizeForTagAnalysis(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= maxTags) break;
  }

  const safeCategory = String(category || '').trim();
  if (safeCategory) {
    const normalizedCategory = normalizeForTagAnalysis(safeCategory);
    if (normalizedCategory && !seen.has(normalizedCategory)) {
      unique.unshift(safeCategory);
      if (unique.length > maxTags) {
        unique.length = maxTags;
      }
    }
  }

  return unique;
}

function summarizeBlocks(contentBlocks) {
  const counts = { subtitle: 0, paragraph: 0, image: 0, code: 0, callout: 0, table: 0, other: 0 };
  for (const block of contentBlocks || []) {
    const type = String(block?.type || '').toLowerCase();
    if (type === 'subtitle' || type === 'paragraph' || type === 'image' || type === 'code' || type === 'callout' || type === 'table') {
      counts[type] += 1;
    } else {
      counts.other += 1;
    }
  }
  return counts;
}

function collectImageReferences(contentBlocks) {
  const refs = [];
  const seen = new Set();
  for (const block of contentBlocks || []) {
    if (String(block?.type || '').toLowerCase() !== 'image') continue;
    const sourcePath = String(block?.sourcePath || '').trim();
    if (!sourcePath || seen.has(sourcePath)) continue;
    seen.add(sourcePath);
    refs.push(sourcePath);
  }
  return refs;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownLinksToHtml(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
    (_, label, url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
  );
}

function codeSurface(language) {
  const normalized = String(language || '').trim().toLowerCase();
  if (!normalized) return 'generic';
  if (TERMINAL_CODE_LANGUAGES.has(normalized)) return 'terminal';
  if (HTML_CODE_LANGUAGES.has(normalized)) return 'html';
  return 'generic';
}

function filePathToEmbeddedImageSource(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return '';
  }

  const extension = path.extname(absolutePath).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES[extension];
  if (!mimeType) {
    return '';
  }

  try {
    const raw = fs.readFileSync(absolutePath);
    return `data:${mimeType};base64,${raw.toString('base64')}`;
  } catch {
    return '';
  }
}

function resolvePreviewImageSource(filePath) {
  const embedded = filePathToEmbeddedImageSource(filePath);
  if (embedded) {
    return embedded;
  }
  return pathToFileURL(path.resolve(filePath)).href;
}

function renderParagraphBlock(content) {
  const lines = String(content || '').split('\n');
  const trimmed = lines.map((line) => line.trim()).filter(Boolean);
  const listLike = trimmed.length > 0 && trimmed.every((line) => isListLikeLine(line));

  if (listLike) {
    const items = trimmed
      .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\[[ xX]\]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .map((line) => `<li>${markdownLinksToHtml(line)}</li>`)
      .join('\n');
    return `<ul>\n${items}\n</ul>`;
  }

  const body = lines.map((line) => markdownLinksToHtml(line)).join('<br />');
  return `<p>${body}</p>`;
}

function renderCodeBlock(content, language) {
  const surface = codeSurface(language);
  const safeLanguage = escapeHtml(language || 'text');
  const className =
    surface === 'terminal'
      ? 'preview-code preview-code-terminal'
      : surface === 'html'
        ? 'preview-code preview-code-html'
        : 'preview-code';
  const label =
    surface === 'terminal'
      ? `Terminal - ${safeLanguage}`
      : surface === 'html'
        ? `HTML - ${safeLanguage}`
        : safeLanguage;

  return [
    `<section class="${className}">`,
    `<div class="preview-code-head">${label}</div>`,
    `<pre><code>${escapeHtml(content || '')}</code></pre>`,
    '</section>'
  ].join('\n');
}

function renderCalloutBlock(block) {
  const variant = String(block?.metadata?.variant || 'note').trim().toLowerCase();
  const title = String(block?.metadata?.title || block?.metadata?.label || 'Note').trim();
  const content = String(block?.content || '').trim();
  return [
    `<aside class="preview-callout preview-callout-${escapeHtml(variant)}">`,
    `<strong>${escapeHtml(title)}</strong>`,
    content ? renderParagraphBlock(content) : '',
    '</aside>'
  ].join('\n');
}

function renderTableBlock(block) {
  const headers = Array.isArray(block?.headers) ? block.headers : [];
  const rows = Array.isArray(block?.rows) ? block.rows : [];
  if (headers.length === 0 || rows.length === 0) return '';

  const headHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const bodyHtml = rows
    .map((row) => `<tr>${headers.map((_, index) => `<td>${escapeHtml(row?.[index] || '')}</td>`).join('')}</tr>`)
    .join('\n');

  return [
    '<div class="preview-table-wrap">',
    '<table>',
    `<thead><tr>${headHtml}</tr></thead>`,
    `<tbody>${bodyHtml}</tbody>`,
    '</table>',
    '</div>'
  ].join('\n');
}

function resolvePreviewBannerSource({ bannerReference, blocks, resolveAsset }) {
  if (bannerReference) {
    const source = resolveAsset(bannerReference);
    if (source) return source;
  }
  return blocks.find((block) => block.type === 'image')?.sourcePath || '';
}

function buildBrowserPreviewHtml({ title, description, category, tags, status, bannerSource, blocks }) {
  const titleSafe = escapeHtml(title);
  const descriptionSafe = escapeHtml(description);
  const categorySafe = escapeHtml(category);
  const statusSafe = escapeHtml(status);
  const tagsHtml = (tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const bannerUrl = bannerSource ? resolvePreviewImageSource(bannerSource) : '';

  const contentHtml = (blocks || [])
    .map((block) => {
      const type = String(block?.type || '').toLowerCase();
      if (type === 'subtitle') {
        return `<h2>${escapeHtml(block.content || '')}</h2>`;
      }
      if (type === 'paragraph') {
        return renderParagraphBlock(block.content || '');
      }
      if (type === 'image') {
        const source = String(block?.sourcePath || block?.content || '').trim();
        if (!source) return '';
        return `<figure><img src="${escapeHtml(resolvePreviewImageSource(source))}" alt="Illustration article" /></figure>`;
      }
      if (type === 'code') {
        const language = String(block?.metadata?.language || '').trim();
        return renderCodeBlock(block.content || '', language);
      }
      if (type === 'callout') {
        return renderCalloutBlock(block);
      }
      if (type === 'table') {
        return renderTableBlock(block);
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');

  return [
    '<!doctype html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>Apercu - ${titleSafe}</title>`,
    '<style>',
    'body{margin:0;background:#f2f4f8;color:#0e1623;font-family:Segoe UI,Arial,sans-serif;}',
    '.wrap{max-width:980px;margin:32px auto;padding:0 18px 40px;}',
    '.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 12px 40px rgba(15,31,56,.08);}',
    '.eyebrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;}',
    '.chip{font-size:12px;padding:4px 10px;border-radius:999px;background:#e7eefc;color:#143062;font-weight:600;}',
    '.title{font-size:34px;line-height:1.15;margin:0 0 12px;}',
    '.desc{color:#3e4b63;line-height:1.55;margin:0 0 14px;}',
    '.banner{margin:0 0 22px;}',
    '.banner img{width:100%;border-radius:12px;display:block;object-fit:cover;max-height:380px;}',
    '.tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}',
    '.tag{font-size:12px;padding:4px 10px;border-radius:999px;background:#f0f3f9;color:#1c304f;}',
    'article{display:grid;gap:16px;}',
    'article p{line-height:1.72;margin:0;color:#1f2a3f;}',
    'article h2{margin:18px 0 4px;font-size:24px;line-height:1.25;}',
    'article ul{margin:0;padding-left:22px;display:grid;gap:8px;}',
    'article figure{margin:10px 0 2px;}',
    'article figure img{max-width:100%;border-radius:10px;display:block;}',
    '.preview-code{border:1px solid #d9e2f2;border-radius:12px;overflow:hidden;background:#0f1622;}',
    '.preview-code-head{font-size:12px;padding:8px 12px;background:#1b2740;color:#f3f6ff;}',
    '.preview-code pre{margin:0;overflow:auto;padding:14px;color:#dfe9ff;}',
    '.preview-code-terminal{background:#091017;border-color:#1e3346;}',
    '.preview-code-terminal .preview-code-head{background:#0d1c2a;color:#95d2ff;}',
    '.preview-code-html{background:#12121a;border-color:#34344a;}',
    '.preview-code-html .preview-code-head{background:#1f1f2d;color:#ffd08d;}',
    '.preview-callout{border:1px solid #d6dee9;border-left-width:6px;border-radius:12px;padding:14px 16px;background:#f8fafc;}',
    '.preview-callout strong{display:block;margin-bottom:6px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;}',
    '.preview-callout-warning{border-left-color:#e24d3b;background:#fff5f3;}',
    '.preview-callout-advice{border-left-color:#16845b;background:#f0fff8;}',
    '.preview-callout-question{border-left-color:#2563eb;background:#f2f7ff;}',
    '.preview-callout-metric{border-left-color:#b7791f;background:#fffbeb;}',
    '.preview-callout-checklist{border-left-color:#6d5bd0;background:#f7f5ff;}',
    '.preview-table-wrap{overflow-x:auto;border:1px solid #ccd8e7;border-radius:12px;background:#fff;}',
    '.preview-table-wrap table{width:100%;min-width:620px;border-collapse:collapse;}',
    '.preview-table-wrap th{background:#123047;color:#fff;text-align:left;}',
    '.preview-table-wrap td,.preview-table-wrap th{padding:11px 12px;border-bottom:1px solid #e2e8f0;}',
    '.preview-table-wrap tbody tr:nth-child(even){background:#f4f8fb;}',
    'a{color:#0c5bd8;text-decoration:none;}a:hover{text-decoration:underline;}',
    '.hint{margin-top:16px;font-size:12px;color:#5b667a;}',
    '@media (max-width:700px){.title{font-size:27px}.card{padding:18px}}',
    '</style>',
    '</head>',
    '<body>',
    '<main class="wrap">',
    '<section class="card">',
    '<div class="eyebrow">',
    `<span class="chip">${categorySafe}</span>`,
    `<span class="chip">Statut: ${statusSafe}</span>`,
    '</div>',
    `<h1 class="title">${titleSafe}</h1>`,
    `<p class="desc">${descriptionSafe}</p>`,
    `<div class="tags">${tagsHtml || '<span class="tag">Aucun tag</span>'}</div>`,
    bannerUrl ? `<figure class="banner"><img src="${escapeHtml(bannerUrl)}" alt="Banniere" /></figure>` : '',
    `<article>${contentHtml}</article>`,
    `<p class="hint">Apercu local genere depuis le terminal. Fermez la page puis revenez au terminal pour publier.</p>`,
    '</section>',
    '</main>',
    '</body>',
    '</html>'
  ].join('\n');
}

function writeBrowserPreviewFile({ title, description, category, tags, status, bannerReference, blocks, resolveAsset, args }) {
  const previewDir = path.resolve(process.cwd(), args.previewDir || DEFAULTS.previewDir);
  ensureDir(previewDir);

  const bannerSource = resolvePreviewBannerSource({
    bannerReference,
    blocks,
    resolveAsset
  });

  const html = buildBrowserPreviewHtml({
    title,
    description,
    category,
    tags,
    status,
    bannerSource,
    blocks
  });

  const baseName = toSlug(title) || `article-${Date.now()}`;
  const previewPath = path.join(previewDir, `${baseName}-preview.html`);
  fs.writeFileSync(previewPath, html, 'utf8');
  return previewPath;
}

async function openPreviewInBrowser(previewPath) {
  const absolutePath = path.resolve(previewPath);
  const previewUrl = pathToFileURL(absolutePath).href;

  const command =
    process.platform === 'win32'
      ? { cmd: 'cmd', args: ['/c', 'start', '', previewUrl] }
      : process.platform === 'darwin'
        ? { cmd: 'open', args: [previewUrl] }
        : { cmd: 'xdg-open', args: [previewUrl] };

  return new Promise((resolve) => {
    try {
      const child = spawn(command.cmd, command.args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.on('error', () => resolve(false));
      child.unref();
      resolve(true);
    } catch {
      resolve(false);
    }
  });
}

function buildPublishPreview({
  title,
  category,
  description,
  tags,
  status,
  bannerReference,
  contentBlocks,
  args
}) {
  const counts = summarizeBlocks(contentBlocks);
  const imageRefs = collectImageReferences(contentBlocks);
  return {
    title,
    category,
    description,
    tags,
    status,
    bannerReference,
    counts,
    imageRefs,
    imageHost: args.imageHost,
    saveDb: args.saveDb,
    dbPath: args.dbPath,
    browserPreviewPath: args.browserPreviewPath || ''
  };
}

function printPublishPreview(preview) {
  console.log('\n----------------------------------------');
  console.log('Apercu avant publication');
  console.log('----------------------------------------');
  console.log(`Titre: ${preview.title}`);
  console.log(`Categorie: ${preview.category}`);
  console.log(`Description: ${preview.description}`);
  console.log(`Tags: ${preview.tags.join(', ') || 'aucun'}`);
  console.log(`Statut: ${preview.status}`);
  console.log(`Hebergement images: ${preview.imageHost}`);
  console.log(
    `Blocs: total ${preview.counts.subtitle + preview.counts.paragraph + preview.counts.image + preview.counts.code + preview.counts.callout + preview.counts.table + preview.counts.other} | ` +
      `sous-titres ${preview.counts.subtitle}, paragraphes ${preview.counts.paragraph}, images ${preview.counts.image}, code ${preview.counts.code}, encadres ${preview.counts.callout}, tableaux ${preview.counts.table}`
  );
  console.log(`Banniere source: ${preview.bannerReference || 'non definie (premiere image si disponible)'}`);
  if (preview.imageRefs.length > 0) {
    console.log(`Images detectees (${preview.imageRefs.length}):`);
    for (const imagePath of preview.imageRefs.slice(0, 10)) {
      console.log(`- ${imagePath}`);
    }
    if (preview.imageRefs.length > 10) {
      console.log(`- ... ${preview.imageRefs.length - 10} autre(s)`);
    }
  } else {
    console.log('Images detectees: aucune');
  }
  console.log(`Enregistrement DB: ${preview.saveDb ? `oui (${preview.dbPath})` : 'non (--no-save-db)'}`);
  console.log(
    `Apercu navigateur: ${preview.browserPreviewPath ? preview.browserPreviewPath : 'desactive (--no-browser-preview)'}`
  );
  console.log('----------------------------------------\n');
}

async function askPublishConfirmation(preview, args) {
  if (!args.confirmBeforePublish || args.yes) {
    return true;
  }

  printPublishPreview(preview);

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('Confirmation requise mais terminal non interactif. Relance avec --yes pour valider automatiquement.');
    return false;
  }

  const hasBrowserPreview = Boolean(preview.browserPreviewPath);
  if (hasBrowserPreview && args.autoOpenPreview) {
    const opened = await openPreviewInBrowser(preview.browserPreviewPath);
    if (opened) {
      console.log(`Apercu navigateur ouvert: ${preview.browserPreviewPath}`);
      console.log('Verifie le rendu dans ton navigateur puis reviens ici pour publier.');
    } else {
      console.log(`Impossible d'ouvrir automatiquement le navigateur. Ouvre ce fichier manuellement: ${preview.browserPreviewPath}`);
    }
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('Choix:');
    if (hasBrowserPreview) {
      console.log('1. Ouvrir/rafraichir l\'apercu navigateur');
      console.log('2. Publier maintenant');
      console.log('3. Annuler');
    } else {
      console.log('1. Publier maintenant');
      console.log('2. Annuler');
    }

    while (true) {
      const answer = await rl.question(hasBrowserPreview ? 'Selection (1/2/3): ' : 'Selection (1/2): ');
      const normalized = String(answer || '').trim().toLowerCase();

      if (
        hasBrowserPreview &&
        ['1', 'apercu', 'preview', 'voir', 'ouvrir', 'open', 'rafraichir', 'refresh'].includes(normalized)
      ) {
        const opened = await openPreviewInBrowser(preview.browserPreviewPath);
        if (opened) {
          console.log(`Apercu navigateur ouvert: ${preview.browserPreviewPath}`);
        } else {
          console.log(`Impossible d'ouvrir automatiquement le navigateur. Ouvre ce fichier manuellement: ${preview.browserPreviewPath}`);
        }
        continue;
      }

      if (
        (!hasBrowserPreview && ['1', 'p', 'publier', 'o', 'oui', 'y', 'yes'].includes(normalized)) ||
        (hasBrowserPreview && ['2', 'p', 'publier', 'o', 'oui', 'y', 'yes'].includes(normalized))
      ) {
        return true;
      }

      if (
        (!hasBrowserPreview && ['2', 'a', 'annuler', 'n', 'non', 'cancel'].includes(normalized)) ||
        (hasBrowserPreview && ['3', 'a', 'annuler', 'n', 'non', 'cancel'].includes(normalized))
      ) {
        return false;
      }

      if (hasBrowserPreview) {
        console.log('Choix invalide. Tape 1 (apercu), 2 (publier) ou 3 (annuler).');
      } else {
        console.log('Choix invalide. Tape 1 pour publier ou 2 pour annuler.');
      }
    }
  } finally {
    rl.close();
  }
}

function parseInputDocument(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const metadata = {
    title: '',
    description: '',
    category: '',
    tags: '',
    banner: ''
  };
  const bodyLines = [];
  let metadataPhase = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (metadataPhase) {
      if (!trimmed) {
        continue;
      }

      const metadataMatch = parseMetadataLine(trimmed);
      if (metadataMatch) {
        metadata[metadataMatch.key] = metadataMatch.value;
        continue;
      }

      const bannerShortcut = parseBannerShortcut(trimmed);
      if (bannerShortcut) {
        metadata.banner = bannerShortcut;
        continue;
      }

      metadataPhase = false;
    }

    bodyLines.push(line);
  }

  return { metadata, bodyLines };
}

async function buildContentBlocks(bodyLines, resolveAsset, publishImage, existingBannerReference, options = {}) {
  const deferImagePublish = options.deferImagePublish === true;
  const blocks = [];
  let paragraphBuffer = [];
  let codeBuffer = [];
  let codeLanguage = '';
  let inCodeBlock = false;
  let titleFromH1 = '';
  let bannerReference = existingBannerReference || '';

  const pushBlock = (block) => {
    blocks.push({
      ...block,
      index: blocks.length,
      order: blocks.length
    });
  };

  const flushParagraph = () => {
    const content = paragraphBuffer.join('\n').trim();
    if (!content) {
      paragraphBuffer = [];
      return;
    }
    pushBlock({
      type: 'paragraph',
      content
    });
    paragraphBuffer = [];
  };

  const flushCode = () => {
    const content = codeBuffer.join('\n').trimEnd();
    if (!content) {
      codeBuffer = [];
      codeLanguage = '';
      return;
    }
    const metadata = codeLanguage ? { language: codeLanguage } : {};
    pushBlock({
      type: 'code',
      content,
      metadata
    });
    codeBuffer = [];
    codeLanguage = '';
  };

  for (let lineIndex = 0; lineIndex < bodyLines.length; lineIndex += 1) {
    const line = String(bodyLines[lineIndex] || '');
    const trimmed = line.trim();

    if (inCodeBlock) {
      if (trimmed.startsWith('```')) {
        flushCode();
        inCodeBlock = false;
        continue;
      }
      codeBuffer.push(line);
      continue;
    }

    if (!titleFromH1 && trimmed.match(/^#\s+.+/)) {
      titleFromH1 = trimmed.replace(/^#\s+/, '').trim();
      continue;
    }

    if (trimmed.startsWith('```')) {
      flushParagraph();
      inCodeBlock = true;
      codeLanguage = trimmed.replace(/^```/, '').trim().toLowerCase();
      continue;
    }

    if (isSeparatorLine(trimmed)) {
      flushParagraph();
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const bannerShortcut = parseBannerShortcut(trimmed);
    if (bannerShortcut) {
      flushParagraph();
      if (!bannerReference) {
        bannerReference = bannerShortcut;
      }
      continue;
    }

    const calloutShortcut = parseCalloutShortcut(trimmed);
    if (calloutShortcut) {
      flushParagraph();
      const collectedLines = [];
      let nextIndex = lineIndex + 1;

      while (nextIndex < bodyLines.length && !String(bodyLines[nextIndex] || '').trim()) {
        nextIndex += 1;
      }

      if (!calloutShortcut.content && nextIndex < bodyLines.length && isListLikeLine(bodyLines[nextIndex])) {
        while (nextIndex < bodyLines.length && isListLikeLine(bodyLines[nextIndex])) {
          collectedLines.push(String(bodyLines[nextIndex] || '').trim());
          nextIndex += 1;
        }
        lineIndex = nextIndex - 1;
      }

      pushBlock({
        ...calloutShortcut,
        content: calloutShortcut.content || collectedLines.join('\n')
      });
      continue;
    }

    if (isTableRowLine(trimmed)) {
      flushParagraph();
      const tableLines = [];
      let nextIndex = lineIndex;
      while (nextIndex < bodyLines.length && isTableRowLine(bodyLines[nextIndex])) {
        tableLines.push(String(bodyLines[nextIndex] || '').trim());
        nextIndex += 1;
      }

      const tableBlock = parseTableBlock(tableLines);
      if (tableBlock) {
        pushBlock(tableBlock);
        lineIndex = nextIndex - 1;
        continue;
      }
    }

    const subtitleMatch = trimmed.match(/^##\s+(.+)$/);
    if (subtitleMatch) {
      flushParagraph();
      pushBlock({
        type: 'subtitle',
        content: subtitleMatch[1].trim()
      });
      continue;
    }

    const imageReference = parseImageShortcut(trimmed);
    if (imageReference) {
      flushParagraph();
      const source = resolveAsset(imageReference);
      if (!source) {
        throw new Error(`Image introuvable dans assets: "${imageReference}"`);
      }
      if (deferImagePublish) {
        pushBlock({
          type: 'image',
          content: source,
          sourcePath: source
        });
        continue;
      }
      const publishedUrl = await publishImage(source);
      pushBlock({
        type: 'image',
        content: publishedUrl,
        sourcePath: source
      });
      continue;
    }

    paragraphBuffer.push(line);
  }

  if (inCodeBlock) {
    flushCode();
  }
  flushParagraph();

  return {
    blocks,
    titleFromH1,
    bannerReference
  };
}

function buildPostPayload({
  title,
  description,
  category,
  tags,
  bannerUrl,
  contentBlocks,
  status
}) {
  const now = Date.now();
  const slug = toSlug(title) || `article-${now}`;
  const id = `article-${now}`;

  return {
    id,
    slug,
    title,
    description,
    excerpt: description,
    content: contentBlocks,
    contentBlocks,
    category,
    tags,
    image: bannerUrl,
    status,
    created_at: now,
    updated_at: now,
    published_at: now
  };
}

function writePayloadFile(payload, outputArg) {
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.resolve(process.cwd(), 'drafts', 'generated', `${payload.slug}.json`);

  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  return outputPath;
}

function savePayloadToDatabase(payload, options) {
  const dbPath = path.resolve(process.cwd(), options.dbPath);
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database introuvable: ${dbPath}`);
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const database = JSON.parse(raw);
  if (!database.blog || typeof database.blog !== 'object') {
    database.blog = {};
  }
  if (!database.blog.posts || typeof database.blog.posts !== 'object') {
    database.blog.posts = {};
  }

  const posts = database.blog.posts;
  const payloadSlug = String(payload.slug || '').trim().toLowerCase();
  let key = '';
  if (payloadSlug) {
    for (const [candidateKey, candidatePost] of Object.entries(posts)) {
      const existingSlug = String(candidatePost?.slug || '').trim().toLowerCase();
      if (existingSlug && existingSlug === payloadSlug) {
        key = candidateKey;
        break;
      }
    }
  }

  const replacedExisting = Boolean(key);
  if (!key) {
    const baseKey = payload.id;
    key = baseKey;
    let counter = 2;
    while (Object.prototype.hasOwnProperty.call(posts, key)) {
      key = `${baseKey}-${counter}`;
      counter += 1;
    }
  }

  const authorName = String(
    options.authorName ||
      process.env.BLOG_AUTHOR_NAME ||
      process.env.FIREBASE_IMPORT_EMAIL ||
      'Auteur CLI'
  ).trim();
  const authorId = String(
    options.authorId ||
      process.env.BLOG_AUTHOR_ID ||
      process.env.FIREBASE_IMPORT_UID ||
      'cli-author'
  ).trim();

  posts[key] = {
    author_id: authorId,
    author_name: authorName,
    category: payload.category,
    content: payload.contentBlocks,
    contentBlocks: payload.contentBlocks,
    created_at: payload.created_at,
    description: payload.description,
    excerpt: payload.excerpt,
    image: payload.image,
    likes: 0,
    published_at: payload.published_at,
    slug: payload.slug,
    status: payload.status,
    tags: payload.tags,
    title: payload.title,
    updated_at: payload.updated_at,
    views: 0
  };

  fs.writeFileSync(dbPath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
  return { dbPath, key, replacedExisting };
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), args.input);

  if (!fs.existsSync(inputPath)) {
    console.error(`Fichier introuvable: ${inputPath}`);
    console.error('Usage: npm run draft:from-text -- --input=drafts/article.txt');
    process.exit(1);
  }

  const rawText = fs.readFileSync(inputPath, 'utf8');
  const normalizedText = normalizeInlineAssetPlaceholders(rawText);
  const { metadata, bodyLines } = parseInputDocument(normalizedText);

  const resolveAsset = createAssetResolver(args.assetsDir);
  const previewDraft = await buildContentBlocks(
    bodyLines,
    resolveAsset,
    async () => '',
    metadata.banner,
    { deferImagePublish: true }
  );

  const title = metadata.title || previewDraft.titleFromH1;
  if (!title) {
    console.error('Titre manquant. Ajoute "Titre: ..." ou une ligne "# Mon titre".');
    process.exit(1);
  }

  const firstParagraph = previewDraft.blocks.find((block) => block.type === 'paragraph')?.content || '';
  const description = metadata.description || truncate(firstParagraph || title, 220);
  const category = metadata.category || args.category;
  const manualTags = normalizeTags(metadata.tags);
  const tags =
    manualTags.length > 0
      ? manualTags
      : generateAutoTags({
          title,
          description,
          category,
          contentBlocks: previewDraft.blocks
        });

  const preview = buildPublishPreview({
    title,
    category,
    description,
    tags,
    status: args.status,
    bannerReference: previewDraft.bannerReference,
    contentBlocks: previewDraft.blocks,
    args
  });

  if (args.browserPreview) {
    preview.browserPreviewPath = writeBrowserPreviewFile({
      title,
      description,
      category,
      tags,
      status: args.status,
      bannerReference: previewDraft.bannerReference,
      blocks: previewDraft.blocks,
      resolveAsset,
      args
    });
  }

  const confirmed = await askPublishConfirmation(preview, args);
  if (!confirmed) {
    console.log('Publication annulee par utilisateur. Aucune image uploadee, aucune ecriture en base.');
    return;
  }

  const imagePublisher = createImagePublisher(args);
  try {
    const { blocks, bannerReference } = await buildContentBlocks(
      bodyLines,
      resolveAsset,
      imagePublisher.publish,
      metadata.banner
    );

    let bannerUrl = '';
    if (bannerReference) {
      const bannerSource = resolveAsset(bannerReference);
      if (!bannerSource) {
        console.error(`Image de banniere introuvable dans assets: "${bannerReference}"`);
        process.exit(1);
      }
      bannerUrl = await imagePublisher.publish(bannerSource);
    } else {
      bannerUrl = blocks.find((block) => block.type === 'image')?.content || '';
    }

    const payload = buildPostPayload({
      title,
      description,
      category,
      tags,
      bannerUrl,
      contentBlocks: blocks,
      status: args.status
    });

    const outputPath = writePayloadFile(payload, args.output);

    let dbSaveInfo = null;
    if (args.saveDb) {
      dbSaveInfo = savePayloadToDatabase(payload, args);
    }

    console.log(`Article genere: ${outputPath}`);
    console.log(`Blocs: ${payload.contentBlocks.length}`);
    console.log(`Banniere: ${payload.image || 'aucune'}`);
    console.log(`Hebergement images: ${args.imageHost}`);
    console.log(`Tags: ${payload.tags.join(', ') || 'aucun'}`);
    console.log(`Projet image prefixe: ${imagePublisher.projectSlug}`);
    console.log(`Logo applique: ${imagePublisher.withLogo ? 'oui' : 'non'}`);
    if (imagePublisher.withLogo) {
      console.log(`Logo source: ${imagePublisher.logoPath}`);
    }
    if (dbSaveInfo) {
      console.log(`Database mise a jour: ${dbSaveInfo.dbPath}`);
      console.log(`Cle enregistree: ${dbSaveInfo.key}`);
      console.log(`Mode DB: ${dbSaveInfo.replacedExisting ? 'mise a jour (slug existant)' : 'nouvelle entree'}`);
    } else {
      console.log('Database: non modifiee (--no-save-db actif)');
    }
  } finally {
    imagePublisher.cleanup();
  }
}

main().catch((error) => {
  console.error(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
