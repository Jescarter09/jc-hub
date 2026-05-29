async function readApiJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.code || 'Requete impossible.');
  }
  return payload;
}

export async function fetchHostedBooks({ limit = 24 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`/api/books/list?${params.toString()}`);
  const payload = await readApiJson(response);
  return payload.books || [];
}

export async function searchBooks(query, { sources = [] } = {}) {
  const params = new URLSearchParams({ q: query });
  if (sources.length > 0) {
    params.set('sources', sources.join(','));
  }

  const response = await fetch(`/api/books/search?${params.toString()}`);
  const payload = await readApiJson(response);
  return {
    results: payload.results || [],
    errors: payload.errors || []
  };
}
