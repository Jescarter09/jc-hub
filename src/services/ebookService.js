const DEFAULT_BOOKS_LIMIT = 500;

function getHostedBooksLimit() {
  return DEFAULT_BOOKS_LIMIT;
}

function toBookInteractionPayload(book = {}) {
  return {
    id: book.id || '',
    sourceId: book.sourceId || '',
    source: book.source || '',
    sourceLabel: book.sourceLabel || '',
    category: book.category || '',
    categorySlug: book.categorySlug || '',
    slug: book.slug || '',
    detailPath: book.detailPath || '',
    title: book.title || '',
    author: book.author || '',
    description: book.description || '',
    thumbnail: book.thumbnail || '',
    externalLink: book.externalLink || '',
    previewLink: book.previewLink || '',
    readerUrl: book.readerUrl || '',
    downloadUrl: book.downloadUrl || '',
    fileUrl: book.fileUrl || '',
    pdfUrl: book.pdfUrl || '',
    preferredFormat: book.preferredFormat || '',
    license: book.license || '',
    publicDomain: book.publicDomain === true,
    canRedistribute: book.canRedistribute === true,
    canReadOnline: book.canReadOnline === true,
    canDownload: book.canDownload === true,
    isHosted: book.isHosted === true,
    sourceType: book.sourceType || '',
    readerType: book.readerType || '',
    requiresReview: book.requiresReview === true
  };
}

function buildInteractionParams(book = {}) {
  const params = new URLSearchParams();
  if (book.id) params.set('id', book.id);
  if (book.categorySlug || book.category) params.set('category', book.categorySlug || book.category);
  if (book.slug || book.title) params.set('slug', book.slug || book.title);
  return params;
}

async function readApiJson(response) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok || payload?.success === false || !payload) {
    throw new Error(payload?.message || payload?.code || `API ebooks indisponible (${response.status}).`);
  }

  return payload;
}

export async function fetchHostedBooks({ limit = getHostedBooksLimit() } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`/api/books/list?${params.toString()}`, {
    headers: {
      Accept: 'application/json'
    }
  });
  const payload = await readApiJson(response);
  return payload.books || [];
}

export async function searchBooks(query, { sources = [] } = {}) {
  const params = new URLSearchParams({ q: query });
  if (sources.length > 0) {
    params.set('sources', sources.join(','));
  }

  const response = await fetch(`/api/books/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json'
    }
  });
  const payload = await readApiJson(response);
  return {
    results: payload.results || [],
    sourceCounts: payload.sourceCounts || {},
    catalog: payload.catalog || null,
    errors: payload.errors || []
  };
}

export async function fetchBookDetail(category, slug) {
  const params = new URLSearchParams({ category, slug });
  const response = await fetch(`/api/books/detail?${params.toString()}`, {
    headers: {
      Accept: 'application/json'
    }
  });
  const payload = await readApiJson(response);
  return payload.book || null;
}

export async function fetchBookInteractions(book) {
  const params = buildInteractionParams(book);
  const response = await fetch(`/api/books/interactions?${params.toString()}`, {
    headers: {
      Accept: 'application/json'
    }
  });
  const payload = await readApiJson(response);
  return payload.stats || null;
}

export async function registerBookView(book) {
  const response = await fetch('/api/books/interactions', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'view',
      book: toBookInteractionPayload(book)
    })
  });
  const payload = await readApiJson(response);
  return payload.stats || null;
}

export async function submitBookAppreciation(book, { rating, authorName, comment }) {
  const response = await fetch('/api/books/interactions', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'appreciation',
      rating,
      authorName,
      comment,
      book: toBookInteractionPayload(book)
    })
  });
  const payload = await readApiJson(response);
  return payload.stats || null;
}
