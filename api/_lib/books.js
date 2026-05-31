const SOURCE_LABELS = {
  gutendex: 'Gutendex',
  librivox: 'LibriVox',
  'google-books': 'Google Books',
  openlibrary: 'OpenLibrary',
  'internet-archive': 'Internet Archive',
  github: 'GitHub',
  'free-programming-books': 'Free Programming Books',
  'mdn-web-docs': 'MDN Web Docs',
  'react-documentation': 'React Documentation',
  'firebase-documentation': 'Firebase Documentation',
  'vite-documentation': 'Vite Documentation'
};

export const BOOKS_COLLECTION = String(process.env.BOOKS_COLLECTION || 'books').trim();

export function sanitizeBookText(value, maxLength = 400) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function toSeoSlug(value, fallback = 'livre') {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return slug || fallback;
}

function getCategoryLabel(categorySlug) {
  const labels = {
    developpement: 'Développement',
    design: 'Design',
    business: 'Business',
    science: 'Science',
    education: 'Éducation',
    litterature: 'Littérature',
    histoire: 'Histoire',
    documents: 'Documents',
    general: 'Général'
  };

  return labels[categorySlug] || 'Général';
}

export function inferBookCategory(book) {
  const haystack = `${book?.title || ''} ${book?.description || ''} ${book?.source || ''}`.toLowerCase();

  if (
    /javascript|react|python|java|programming|programmation|code|coding|developer|developpeur|web|software|logiciel|api|database|base de donnees|firebase|cloud|computer|ordinateur/.test(
      haystack
    )
  ) {
    return 'developpement';
  }

  if (/design|ux|ui|typography|graphisme|interface|creative|figma/.test(haystack)) return 'design';
  if (/business|startup|marketing|finance|management|entrepreneur|commerce/.test(haystack)) return 'business';
  if (/science|physics|biology|mathematics|math|chimie|biologie|astronomy/.test(haystack)) return 'science';
  if (/education|learning|apprendre|school|cours|tutorial|guide|manuel/.test(haystack)) return 'education';
  if (/history|histoire|war|guerre|archive|memoir|biography/.test(haystack)) return 'histoire';
  if (/novel|roman|poetry|poeme|literature|litterature|fiction|theatre/.test(haystack)) return 'litterature';
  if (book?.source === 'internet-archive') return 'documents';

  return 'general';
}

export function withBookRouting(book) {
  const categorySlug = toSeoSlug(book?.categorySlug || book?.category || inferBookCategory(book), 'general');
  const category = sanitizeBookText(book?.category || getCategoryLabel(categorySlug), 80);
  const slug = toSeoSlug(book?.slug || book?.title || book?.sourceId || book?.id, 'livre');

  return {
    ...book,
    category,
    categorySlug,
    slug,
    detailPath: `/ebooks/${categorySlug}/${slug}`
  };
}

export function normalizeLicense(value) {
  const normalized = sanitizeBookText(value, 120).toLowerCase();
  if (!normalized) return 'unknown';
  if (
    normalized.includes('public domain') ||
    normalized.includes('domaine public') ||
    normalized.includes('publicdomain') ||
    normalized.includes('public-domain')
  ) {
    return 'public-domain';
  }
  if (normalized.includes('cc0') || normalized.includes('/publicdomain/zero/') || normalized.includes('zero/1.0')) {
    return 'cc0';
  }
  if (normalized.includes('cc-by-nc-nd') || normalized.includes('/licenses/by-nc-nd/')) {
    return 'cc-by-nc-nd';
  }
  if (normalized.includes('cc-by-nc-sa') || normalized.includes('/licenses/by-nc-sa/')) {
    return 'cc-by-nc-sa';
  }
  if (normalized.includes('cc-by-nc') || normalized.includes('/licenses/by-nc/')) {
    return 'cc-by-nc';
  }
  if (normalized.includes('cc-by-nd') || normalized.includes('/licenses/by-nd/')) {
    return 'cc-by-nd';
  }
  if (normalized.includes('cc-by-sa') || normalized.includes('/licenses/by-sa/')) {
    return 'cc-by-sa';
  }
  if (
    normalized.includes('cc-by') ||
    normalized.includes('creativecommons.org/licenses/by/') ||
    normalized === 'creative commons attribution'
  ) {
    return 'cc-by';
  }
  if (normalized.includes('creativecommons') || normalized.includes('creative commons') || normalized.startsWith('cc')) {
    return 'cc';
  }
  return normalized;
}

export function isCreativeCommons(value) {
  const normalized = normalizeLicense(value);
  return normalized === 'cc' || normalized.includes('creativecommons') || normalized.includes('creative commons');
}

export function isOpenSourceLicense(value) {
  const normalized = normalizeLicense(value);
  return [
    'mit',
    'apache',
    'apache-2',
    'apache-2.0',
    'gpl',
    'gpl-2',
    'gpl-2.0',
    'gpl-3',
    'gpl-3.0',
    'lgpl',
    'agpl',
    'bsd',
    'bsd-2',
    'bsd-3',
    'mpl',
    'mpl-2',
    'mpl-2.0',
    'isc',
    'unlicense'
  ].some((license) => normalized === license || normalized.includes(license));
}

export function isRedistributableLicense(value) {
  const normalized = normalizeLicense(value);
  return (
    normalized === 'public-domain' ||
    normalized === 'cc' ||
    normalized === 'cc0' ||
    normalized === 'cc-by' ||
    normalized === 'cc-by-sa' ||
    isOpenSourceLicense(normalized)
  );
}

export function getBookReaderUrl(book) {
  const hostedUrl = sanitizeBookText(book?.fileUrl || book?.pdfUrl, 800);
  if (book?.isHosted === true && hostedUrl) return hostedUrl;

  return sanitizeBookText(
    book?.readerUrl ||
      book?.embedUrl ||
      book?.webReaderLink ||
      book?.previewLink ||
      book?.officialReaderUrl ||
      '',
    800
  );
}

function getPotentialReadUrl(book) {
  return sanitizeBookText(getBookReaderUrl(book) || book?.downloadUrl || book?.fileUrl || book?.pdfUrl, 800);
}

export function canRedistributeBook(book) {
  const source = String(book?.source || '').toLowerCase();
  const license = normalizeLicense(book?.license || book?.licenseUrl || book?.licenseurl || book?.rights);
  const isOpenSourceBook =
    book?.openSource === true ||
    book?.isOpenSource === true ||
    (['github', 'free-programming-books'].includes(source) && isOpenSourceLicense(license));

  return (
    source === 'gutendex' ||
    source === 'librivox' ||
    book?.publicDomain === true ||
    book?.copyright === false ||
    isOpenSourceBook ||
    isRedistributableLicense(license)
  );
}

export function getBookAccessDecision(book) {
  const source = String(book?.source || '').toLowerCase();
  const license = normalizeLicense(book?.license || book?.licenseUrl || book?.licenseurl || book?.rights);
  const canRedistribute = canRedistributeBook(book);
  const requiresReview = book?.requiresReview === true || source === 'internet-archive';
  const hostedUrl = sanitizeBookText(book?.fileUrl || book?.pdfUrl, 800);
  const sourceDownloadUrl = sanitizeBookText(book?.downloadUrl || book?.pdfUrl, 800);
  const officialReaderUrl = getBookReaderUrl(book);
  const readerUrl = getPotentialReadUrl(book);
  const canDownload = Boolean(canRedistribute && (hostedUrl || sourceDownloadUrl));
  const canReadHosted = Boolean(canRedistribute && readerUrl);

  if (source === 'google-books') {
    const canReadOnline = Boolean(officialReaderUrl);
    return {
      isHosted: false,
      canRedistribute: false,
      sourceType: canReadOnline ? 'preview' : 'official_only',
      canReadOnline,
      canDownload: false,
      readerUrl: officialReaderUrl,
      readerType: canReadOnline ? 'official' : 'none',
      requiresReview: false,
      action: canReadOnline ? 'official-reader' : 'external-only',
      reason: canReadOnline ? 'google-books-preview-available' : 'google-books-restricted'
    };
  }

  if (source === 'openlibrary') {
    const canReadOnline = Boolean(officialReaderUrl);
    return {
      isHosted: false,
      canRedistribute: false,
      sourceType: canReadOnline ? 'preview' : 'official_only',
      canReadOnline,
      canDownload: false,
      readerUrl: officialReaderUrl,
      readerType: canReadOnline ? 'official' : 'none',
      requiresReview: true,
      action: canReadOnline ? 'official-reader' : 'external-only',
      reason: canReadOnline ? 'openlibrary-reader-available' : 'openlibrary-rights-not-guaranteed'
    };
  }

  if (source === 'gutendex') {
    return {
      isHosted: false,
      canRedistribute: true,
      sourceType: 'public_domain',
      canReadOnline: canReadHosted,
      canDownload,
      readerUrl,
      readerType: canReadHosted ? 'integrated' : 'none',
      requiresReview: false,
      action: 'hostable',
      reason: 'gutendex-public-domain'
    };
  }

  if (source === 'librivox') {
    return {
      isHosted: false,
      canRedistribute: true,
      sourceType: 'public_domain',
      canReadOnline: canReadHosted,
      canDownload,
      readerUrl,
      readerType: canReadHosted ? 'integrated' : 'none',
      requiresReview: false,
      action: 'hostable',
      reason: 'librivox-public-domain'
    };
  }

  if (canRedistribute) {
    return {
      isHosted: false,
      canRedistribute: true,
      sourceType: 'public_domain',
      canReadOnline: canReadHosted,
      canDownload,
      readerUrl,
      readerType: canReadHosted ? 'integrated' : 'none',
      requiresReview: false,
      action: 'hostable',
      reason: isOpenSourceLicense(license)
        ? 'open-source-license'
        : license === 'cc0' || license === 'cc-by' || license === 'cc-by-sa' || license === 'cc'
          ? license
          : 'public-domain-or-approved-license'
    };
  }

  if (officialReaderUrl) {
    return {
      isHosted: false,
      canRedistribute: false,
      sourceType: 'preview',
      canReadOnline: true,
      canDownload: false,
      readerUrl: officialReaderUrl,
      readerType: 'official',
      requiresReview,
      action: 'official-reader',
      reason: 'official-preview-available'
    };
  }

  return {
    isHosted: false,
    canRedistribute: false,
    sourceType: 'official_only',
    canReadOnline: false,
    canDownload: false,
    readerUrl: '',
    readerType: 'none',
    requiresReview,
    action: 'external-only',
    reason: 'redistribution-not-authorized'
  };
}

export function withBookAccess(book) {
  const decision = getBookAccessDecision(book);

  return {
    ...book,
    sourceType: decision.sourceType,
    canRedistribute: decision.canRedistribute,
    canReadOnline: decision.canReadOnline,
    canDownload: decision.canDownload,
    readerUrl: decision.readerUrl || book?.readerUrl || '',
    readerType: decision.readerType,
    accessAction: decision.action,
    accessReason: decision.reason,
    requiresReview: decision.requiresReview
  };
}

export function getSourceLabel(source) {
  return SOURCE_LABELS[source] || source || 'Source externe';
}

export function toBookPublishAtMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return null;
}

export function isBookPublished(data, now = Date.now()) {
  const publishAt = toBookPublishAtMillis(data?.publishAt);
  return publishAt !== null && publishAt <= now;
}

function toSafeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
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

function normalizeLibriVoxAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) return 'Auteur inconnu';
  return authors
    .map((author) => sanitizeBookText([author?.first_name, author?.last_name].filter(Boolean).join(' ') || author?.name, 120))
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

  return withBookRouting(withBookAccess({
    id: `gutendex-${item.id}`,
    sourceId: String(item.id),
    source: 'gutendex',
    sourceLabel: getSourceLabel('gutendex'),
    title: sanitizeBookText(item?.title, 220) || 'Livre sans titre',
    author: normalizeAuthors(item?.authors),
    description: (Array.isArray(item?.subjects) ? item.subjects : []).slice(0, 3).join(' - '),
    thumbnail,
    externalLink: htmlUrl || `https://www.gutenberg.org/ebooks/${item.id}`,
    readerUrl: htmlUrl || pdfUrl || epubUrl || textUrl,
    downloadUrl,
    preferredFormat,
    license: 'public-domain',
    publicDomain: true,
    canRedistribute: true,
    isHosted: false,
    fileUrl: '',
    pdfUrl: '',
    requiresReview: false
  }));
}

export function normalizeGoogleBook(item) {
  const volume = item?.volumeInfo || {};
  const access = item?.accessInfo || {};
  const imageLinks = volume.imageLinks || {};
  const thumbnail = String(imageLinks.thumbnail || imageLinks.smallThumbnail || '').replace(/^http:/, 'https:');

  return withBookRouting(withBookAccess({
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
    readerUrl: access.webReaderLink || volume.previewLink || '',
    downloadUrl: '',
    preferredFormat: '',
    license: 'restricted',
    publicDomain: false,
    canRedistribute: false,
    isHosted: false,
    fileUrl: '',
    pdfUrl: '',
    requiresReview: false
  }));
}

export function normalizeLibriVoxBook(item) {
  const sourceId = sanitizeBookText(item?.id, 140);
  const thumbnail = sanitizeBookText(item?.coverart_jpg || item?.coverart_thumbnail, 500);

  return withBookRouting(withBookAccess({
    id: `librivox-${sourceId}`,
    sourceId,
    source: 'librivox',
    sourceLabel: getSourceLabel('librivox'),
    title: sanitizeBookText(item?.title, 220) || 'Livre audio LibriVox',
    author: normalizeLibriVoxAuthors(item?.authors),
    description: sanitizeBookText(item?.description, 700),
    thumbnail,
    externalLink: sanitizeBookText(item?.url_librivox || item?.url_project || item?.url_iarchive, 800),
    readerUrl: sanitizeBookText(item?.url_librivox || item?.url_project || item?.url_iarchive, 800),
    downloadUrl: sanitizeBookText(item?.url_zip_file || item?.url_rss, 800),
    preferredFormat: item?.url_zip_file ? 'audio-zip' : 'rss',
    license: 'public-domain',
    publicDomain: true,
    canRedistribute: true,
    isHosted: false,
    fileUrl: '',
    pdfUrl: '',
    requiresReview: false
  }));
}

export function normalizeOpenLibraryBook(item) {
  const coverId = item?.cover_i || item?.cover_edition_key;
  const thumbnail = coverId
    ? `https://covers.openlibrary.org/b/${item.cover_i ? 'id' : 'olid'}/${coverId}-L.jpg`
    : '';
  const archiveId = Array.isArray(item?.ia) ? item.ia[0] : item?.ia;
  const openLibraryUrl = item.key ? `https://openlibrary.org${item.key}` : 'https://openlibrary.org';
  const readerUrl =
    archiveId
      ? `https://archive.org/details/${archiveId}`
      : item?.has_fulltext || item?.ebook_access
        ? openLibraryUrl
        : '';

  return withBookRouting(withBookAccess({
    id: `openlibrary-${item.key || item.edition_key?.[0] || item.cover_edition_key || item.title}`,
    sourceId: sanitizeBookText(item.key || item.edition_key?.[0] || item.cover_edition_key, 140),
    source: 'openlibrary',
    sourceLabel: getSourceLabel('openlibrary'),
    title: sanitizeBookText(item.title, 220) || 'Livre sans titre',
    author: normalizeAuthors(item.author_name),
    description: sanitizeBookText([item.first_publish_year, item.subject?.slice(0, 3).join(' - ')].filter(Boolean).join(' - '), 700),
    thumbnail,
    externalLink: openLibraryUrl,
    previewLink: readerUrl,
    readerUrl,
    downloadUrl: '',
    preferredFormat: '',
    license: 'unknown',
    publicDomain: false,
    canRedistribute: false,
    isHosted: false,
    fileUrl: '',
    pdfUrl: '',
    requiresReview: true
  }));
}

export function normalizeArchiveBook(item) {
  const license = normalizeLicense(item?.licenseurl || item?.rights || item?.license);
  const redistributable = isRedistributableLicense(license);
  const identifier = sanitizeBookText(item?.identifier, 140);
  const externalLink = identifier ? `https://archive.org/details/${identifier}` : 'https://archive.org';

  return withBookRouting(withBookAccess({
    id: `internet-archive-${identifier}`,
    sourceId: identifier,
    source: 'internet-archive',
    sourceLabel: getSourceLabel('internet-archive'),
    title: sanitizeBookText(item?.title, 220) || 'Document Internet Archive',
    author: normalizeAuthors(Array.isArray(item?.creator) ? item.creator : [item?.creator].filter(Boolean)),
    description: sanitizeBookText(item?.description, 700),
    thumbnail: identifier ? `https://archive.org/services/img/${identifier}` : '',
    externalLink,
    previewLink: externalLink,
    readerUrl: externalLink,
    downloadUrl: '',
    preferredFormat: '',
    license,
    publicDomain: license === 'public-domain',
    canRedistribute: redistributable,
    isHosted: false,
    fileUrl: '',
    pdfUrl: '',
    requiresReview: !redistributable
  }));
}

export function normalizeHostedBook(docId, data) {
  const decision = getBookAccessDecision(data);
  const fileUrl = sanitizeBookText(data?.fileUrl || data?.pdfUrl, 500);
  const readerUrl = sanitizeBookText(data?.readerUrl || decision.readerUrl || fileUrl || data?.previewLink, 500);
  const publishAtMillis = toBookPublishAtMillis(data?.publishAt);

  return withBookRouting({
    id: docId,
    sourceId: sanitizeBookText(data?.sourceId, 140),
    source: sanitizeBookText(data?.source, 80),
    sourceType: sanitizeBookText(data?.sourceType || decision.sourceType, 80),
    sourceLabel: getSourceLabel(data?.source),
    category: sanitizeBookText(data?.category, 80),
    categorySlug: sanitizeBookText(data?.categorySlug, 120),
    slug: sanitizeBookText(data?.slug, 140),
    detailPath: sanitizeBookText(data?.detailPath, 260),
    title: sanitizeBookText(data?.title, 220) || 'Livre sans titre',
    author: sanitizeBookText(data?.author, 220) || 'Auteur inconnu',
    description: sanitizeBookText(data?.description, 900),
    thumbnail: sanitizeBookText(data?.thumbnail, 500),
    externalLink: sanitizeBookText(data?.externalLink, 500),
    previewLink: sanitizeBookText(data?.previewLink, 500),
    readerUrl,
    fileUrl,
    downloadUrl: sanitizeBookText(data?.downloadUrl, 500),
    preferredFormat: sanitizeBookText(data?.preferredFormat, 40),
    license: normalizeLicense(data?.license),
    publicDomain: data?.publicDomain === true,
    canRedistribute: data?.canRedistribute === true || decision.canRedistribute === true,
    canReadOnline: data?.canReadOnline === true || decision.canReadOnline === true || Boolean(readerUrl),
    canDownload: data?.canDownload === true || decision.canDownload === true || Boolean(data?.isHosted === true && fileUrl),
    isHosted: data?.isHosted === true,
    pdfUrl: sanitizeBookText(data?.pdfUrl, 500),
    requiresReview: data?.requiresReview === true,
    accessAction: sanitizeBookText(data?.accessAction, 80),
    accessReason: sanitizeBookText(data?.accessReason, 120),
    readerType: sanitizeBookText(data?.readerType || decision.readerType, 80),
    publishAt: publishAtMillis ? new Date(publishAtMillis).toISOString() : '',
    viewsCount: Math.floor(toSafeNumber(data?.viewsCount)),
    ratingCount: Math.floor(toSafeNumber(data?.ratingCount)),
    ratingTotal: toSafeNumber(data?.ratingTotal),
    averageRating: toSafeNumber(data?.averageRating),
    appreciationCount: Math.floor(toSafeNumber(data?.appreciationCount)),
    latestAppreciation: data?.latestAppreciation
      ? {
          rating: Math.min(5, Math.max(1, Math.round(toSafeNumber(data.latestAppreciation.rating, 1)))),
          authorName: sanitizeBookText(data.latestAppreciation.authorName, 80),
          comment: sanitizeBookText(data.latestAppreciation.comment, 500)
        }
      : null
  });
}

export function toBookCatalogPayload(book, { now } = {}) {
  const decision = getBookAccessDecision(book);
  const source = sanitizeBookText(book?.source, 80).toLowerCase();
  const license = normalizeLicense(book?.license || book?.licenseUrl || book?.licenseurl || book?.rights);
  const canExposeDownload = decision.canDownload === true;
  const routedBook = withBookRouting({ ...book, source });
  const readerUrl = sanitizeBookText(decision.readerUrl || book?.readerUrl || book?.webReaderLink || book?.embedUrl || book?.previewLink, 800);

  return {
    title: sanitizeBookText(book?.title, 220) || 'Livre sans titre',
    author: sanitizeBookText(book?.author, 220) || 'Auteur inconnu',
    description: sanitizeBookText(book?.description, 900),
    thumbnail: sanitizeBookText(book?.thumbnail, 800),
    source,
    sourceType: decision.sourceType,
    sourceId: sanitizeBookText(book?.sourceId || book?.id, 160),
    sourceLabel: sanitizeBookText(book?.sourceLabel || getSourceLabel(source), 80),
    category: routedBook.category,
    categorySlug: routedBook.categorySlug,
    slug: routedBook.slug,
    detailPath: routedBook.detailPath,
    isHosted: false,
    fileUrl: '',
    pdfUrl: '',
    downloadUrl: canExposeDownload ? sanitizeBookText(book?.downloadUrl || book?.pdfUrl, 800) : '',
    readerUrl,
    externalLink: sanitizeBookText(book?.externalLink || book?.infoLink || book?.previewLink, 800),
    previewLink: sanitizeBookText(book?.previewLink || book?.webReaderLink || readerUrl, 800),
    license,
    canRedistribute: decision.canRedistribute,
    canReadOnline: decision.canReadOnline,
    canDownload: decision.canDownload,
    publicDomain: book?.publicDomain === true || license === 'public-domain',
    requiresReview: decision.requiresReview,
    preferredFormat: sanitizeBookText(book?.preferredFormat, 40),
    accessAction: decision.action,
    accessReason: decision.reason,
    readerType: decision.readerType,
    createdAt: now,
    catalogedAt: now,
    updatedAt: now,
    lastSeenAt: now
  };
}
