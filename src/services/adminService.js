const ADMIN_STORAGE_KEY = 'jchub.admin.basic';

function toBasicCredentials(email, password) {
  return btoa(`${String(email || '').trim().toLowerCase()}:${String(password || '')}`);
}

function readStoredCredentials() {
  try {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredCredentials(value) {
  try {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures.
  }
}

function clearStoredCredentials() {
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false || !payload) {
    const error = new Error(payload?.message || payload?.code || 'Admin API indisponible.');
    error.code = payload?.code || 'admin/unknown';
    error.details = payload?.details || '';
    throw error;
  }
  return payload;
}

export function getStoredAdminCredentials() {
  return readStoredCredentials();
}

export function loginAdmin(email, password) {
  const credentials = toBasicCredentials(email, password);
  writeStoredCredentials(credentials);
  return credentials;
}

export function logoutAdmin() {
  clearStoredCredentials();
}

export async function fetchAdminView(view = 'overview', { limit = 24, credentials = readStoredCredentials() } = {}) {
  if (!credentials) {
    const error = new Error('Connexion admin requise.');
    error.code = 'admin/missing-credentials';
    throw error;
  }

  const params = new URLSearchParams({
    view,
    limit: String(limit)
  });
  const response = await fetch(`/api/admin?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`
    }
  });

  return readJson(response);
}
