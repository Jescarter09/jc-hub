const SOURCE_LABELS = {
  gutendex: 'Gutendex',
  'google-books': 'Google Books',
  openlibrary: 'OpenLibrary',
  'internet-archive': 'Internet Archive'
};

export const BOOKS_COLLECTION = String(process.env.BOOKS_COLLECTION || 'books').trim();

export function sanitizeBookText(value, maxLength = 400) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizeLicense(value) {
  const normalized = sanitizeBookText(value, 120).toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized.includes('public domain') || normalized.includes('domaine public')) return 'public-domain';
  if (normalized.includes('creativecommons') || normalized.includes('creative commons') || normalized.startsWith('cc')) {
    return 'cc';
  }
  return normalized;
}

export function isCreativeCommons(value) {
  const normalized = normalizeLicense(value);
  return normalized === 'cc' || normalized.includes('creativecommons') || normalized.includes('creative commons');
}

export function canRedistributeBook(book) {
  const source = String(book?.source || '').toLowerCase();
  const license = normalizeLicense(book?.license || book?.licenseUrl || book?.rights);

  return (
    source === 'gutendex' ||
    book?.publicDomain === true ||
    license === 'public-domain' ||
    license === 'cc' ||
    isCreativeCommons(license)
  );
}

export function getSourceLabel(source) {
  return SOURCE_LABELS[source] || source || 'Source externe';
}

export function toStableBookId(book) {
  const source = sanitizeBookText(book?.source, 80).toLowerCase() || 'book';
  const sourceId = sanitizeBookText(book?.sourceId || book?.id, 140)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (sourceId) return `${source}-${sourceId}`.slice(0, 180);

  return `${source}-${sanitizeBookText(book?.title, 120)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')}`.slice(0, 180);
}

function pickFormat(formats, matcher) {
  return (
    Object.entries(formats || {}).find(([type, url]) => matcher(type, url) && String(url || '').startsWith('http'))?.[1] ||
    ''
  );
}

function normalizeAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) return 'Auteur inconnu';
  return authors
    .map((author) => sanitizeBookText(author?.name || author, 120))
    .filter(Boolean)
    .slice(0, 3)
    .join(', ') || 'Auteur inconnu';
}

export function normalizeGutendexBook(item) {
  const formats = item?.formats || {};
  const pdfUrl = pickFormat(formats, (type) => type.includes('pdf'));
  const epubUrl = pickFormat(formats, (type) => type.includes('epub'));
  const textUrl = pickFormat(formats, (type) => type.includes('text/plain'));
  const htmlUrl = pickFormat(formats, (type) => type.includes('text/html'));
  const thumbnail = pickFormat(formats, (type) => type.includes('image'));
  const downloadUrl = pdfUrl || epubUrl || textUrl || htmlUrl;
  const preferredFormat = pdfUrl ? 'pdf' : epubUrl ? 'epub' : textUrl ? 'txt' : 'html';

  return {
    id: `gutendex-${item.id}`,
    sourceId: String(item.id),
    source: 'gutendex',
    sourceLabel: getSourceLabel('gutendex'),
    title: sanitizeBookText(item?.title, 220) || 'Livre sans titre',
    author: normalizeAuthors(item?.authors),
    description: (Array.isArray(item?.subjects) ? item.subjects : []).slice(0, 3).join(' - '),
    thumbnail,
    externalLink: htmlUrl || `https://www.gutenberg.org/ebooks/${item.id}`,
    downloadUrl,
    preferredFormat,
    license: 'public-domain',
    publicDomain: true,
    canRedistribute: true,
    isHosted: false,
    pdfUrl: '',
    requiresReview: false
  };
}

export function normalizeGoogleBook(item) {
  const volume = item?.volumeInfo || {};
  const access = item?.accessInfo || {};
  const imageLinks = volume.imageLinks || {};
  const thumbnail = String(imageLinks.thumbnail || imageLinks.smallThumbnail || '').replace(/^http:/, 'https:');

  return {
    id: `google-books-${item.id}`,
    sourceId: String(item.id || ''),
    source: 'google-books',
    sourceLabel: getSourceLabel('google-books'),
    title: sanitizeBookText(volume.title, 220) || 'Livre sans titre',
    author: normalizeAuthors(volume.authors),
    description: sanitizeBookText(volume.description, 700),
    thumbnail,
    externalLink: volume.infoLink || volume.previewLink || access.webReaderLink || '',
    previewLink: volume.previewLink || access.webReaderLink || '',
    downloadUrl: '',
    preferredFormat: '',
    license: 'restricted',
    publicDomain: false,
    canRedistribute: false,
    isHosted: false,
    pdfUrl: '',
    requiresReview: false
  };
}

export function normalizeOpenLibraryBook(item) {
  const coverId = item?.cover_i || item?.cover_edition_key;
  const thumbnail = coverId
    ? `https://covers.openlibrary.org/b/${item.cover_i ? 'id' : 'olid'}/${coverId}-L.jpg`
    : '';

  return {
    id: `openlibrary-${item.key || item.edition_key?.[0] || item.cover_edition_key || item.title}`,
    sourceId: sanitizeBookText(item.key || item.edition_key?.[0] || item.cover_edition_key, 140),
    source: 'openlibrary',
    sourceLabel: getSourceLabel('openlibrary'),
    title: sanitizeBookText(item.title, 220) || 'Livre sans titre',
    author: normalizeAuthors(item.author_name),
    description: sanitizeBookText([item.first_publish_year, item.subject?.slice(0, 3).join(' - ')].filter(Boolean).join(' - '), 700),
    thumbnail,
    externalLink: item.key ? `https://openlibrary.org${item.key}` : 'https://openlibrary.org',
    downloadUrl: '',
    preferredFormat: '',
    license: 'unknown',
    publicDomain: false,
    canRedistribute: false,
    isHosted: false,
    pdfUrl: '',
    requiresReview: true
  };
}

export function normalizeArchiveBook(item) {
  const license = normalizeLicense(item?.licenseurl || item?.rights || item?.license);
  const redistributable = license === 'public-domain' || license === 'cc';
  const identifier = sanitizeBookText(item?.identifier, 140);

  return {
    id: `internet-archive-${identifier}`,
    sourceId: identifier,
    source: 'internet-archive',
    sourceLabel: getSourceLabel('internet-archive'),
    title: sanitizeBookText(item?.title, 220) || 'Document Internet Archive',
    author: normalizeAuthors(Array.isArray(item?.creator) ? item.creator : [item?.creator].filter(Boolean)),
    description: sanitizeBookText(item?.description, 700),
    thumbnail: identifier ? `https://archive.org/services/img/${identifier}` : '',
    externalLink: identifier ? `https://archive.org/details/${identifier}` : 'https://archive.org',
    downloadUrl: '',
    preferredFormat: '',
    license,
    publicDomain: license === 'public-domain',
    canRedistribute: redistributable,
    isHosted: false,
    pdfUrl: '',
    requiresReview: true
  };
}

export function normalizeHostedBook(docId, data) {
  return {
    id: docId,
    sourceId: sanitizeBookText(data?.sourceId, 140),
    source: sanitizeBookText(data?.source, 80),
    sourceLabel: getSourceLabel(data?.source),
    title: sanitizeBookText(data?.title, 220) || 'Livre sans titre',
    author: sanitizeBookText(data?.author, 220) || 'Auteur inconnu',
    description: sanitizeBookText(data?.description, 900),
    thumbnail: sanitizeBookText(data?.thumbnail, 500),
    externalLink: sanitizeBookText(data?.externalLink, 500),
    downloadUrl: sanitizeBookText(data?.downloadUrl, 500),
    preferredFormat: sanitizeBookText(data?.preferredFormat, 40),
    license: normalizeLicense(data?.license),
    publicDomain: data?.publicDomain === true,
    canRedistribute: data?.canRedistribute === true,
    isHosted: data?.isHosted === true,
    pdfUrl: sanitizeBookText(data?.pdfUrl, 500),
    requiresReview: data?.requiresReview === true
  };
}
