const NEWSLETTER_ENDPOINT = '/api/newsletter';
const NEWSLETTER_ERROR_PREFIX = 'newsletter/';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const isNewsletterErrorCode = (code) =>
  typeof code === 'string' && code.startsWith(NEWSLETTER_ERROR_PREFIX);

const createNewsletterError = (code, message, cause) => {
  const error = new Error(message);
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
};

const sanitizeSource = (source) => {
  const cleaned = String(source || '').trim().toLowerCase();
  if (!cleaned) return 'unknown';
  return cleaned.slice(0, 64);
};

export const normalizeNewsletterEmail = (value) => String(value || '').trim().toLowerCase();

export const isValidNewsletterEmail = (value) => EMAIL_PATTERN.test(normalizeNewsletterEmail(value));

const mapToNewsletterError = (error) => {
  const code = String(error?.code || '');
  if (isNewsletterErrorCode(code)) {
    return error;
  }

  if (code === 'newsletter/unavailable') {
    return createNewsletterError(
      'newsletter/unavailable',
      "Le service newsletter est momentanément indisponible.",
      error
    );
  }

  if (code === 'newsletter/server-error' || code === 'newsletter/database-write-failed') {
    return createNewsletterError(
      'newsletter/server-error',
      "Le serveur newsletter est indisponible pour l'instant.",
      error
    );
  }

  if (code === 'newsletter/rate-limited') {
    return createNewsletterError(
      'newsletter/rate-limited',
      "Trop de tentatives d'inscription. Réessaie un peu plus tard.",
      error
    );
  }

  if (code === 'newsletter/brevo-sync-failed') {
    return createNewsletterError(
      'newsletter/brevo-sync-failed',
      "Ton email est sauvegardé, mais la synchronisation Brevo a échoué. Réessaie dans un instant.",
      error
    );
  }

  return createNewsletterError('newsletter/unknown', "L'inscription newsletter a échoué.", error);
};

export function getNewsletterErrorMessage(error) {
  const details = String(error?.details || '').trim();

  switch (error?.code) {
    case 'newsletter/invalid-email':
      return 'Entre une adresse email valide (exemple: nom@domaine.com).';
    case 'newsletter/server-error':
      return "Le serveur newsletter est indisponible pour l'instant. Réessaie dans quelques minutes.";
    case 'newsletter/brevo-sync-failed':
      return details
        ? `Ton email est enregistre, mais Brevo a renvoye: ${details}`
        : 'Ton email est enregistré, mais Brevo ne répond pas. Réessaie dans un instant.';
    case 'newsletter/unavailable':
      return 'Le service est temporairement indisponible. Réessaie dans un instant.';
    case 'newsletter/rate-limited':
      return "Trop de tentatives d'inscription. Réessaie un peu plus tard.";
    default:
      return "Impossible de finaliser l'abonnement pour le moment. Réessaie dans quelques instants.";
  }
}

export async function subscribeToNewsletter(email, options = {}) {
  const normalizedEmail = normalizeNewsletterEmail(email);

  if (!isValidNewsletterEmail(normalizedEmail)) {
    throw createNewsletterError('newsletter/invalid-email', 'Invalid newsletter email.');
  }

  const source = sanitizeSource(options.source);
  const website = String(options.website || '').trim();
  const formStartedAt = Number(options.formStartedAt) || 0;
  try {
    const response = await fetch(NEWSLETTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: normalizedEmail,
        source,
        website,
        formStartedAt
      })
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const remoteCode = String(data?.code || '');
      const remoteMessage = String(data?.message || '').trim();
      const remoteDetails = String(data?.details || '').trim();
      const fallbackCode = response.status >= 500 ? 'newsletter/server-error' : 'newsletter/unknown';
      const error = createNewsletterError(remoteCode || fallbackCode, remoteMessage || 'Newsletter API error.');
      if (remoteDetails) {
        error.details = remoteDetails;
      }
      throw error;
    }

    const status = String(data?.status || '').trim() || 'subscribed';

    return {
      status,
      email: normalizedEmail
    };
  } catch (error) {
    throw mapToNewsletterError(error);
  }
}
