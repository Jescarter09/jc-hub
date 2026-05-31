const CONTACT_ENDPOINT = '/api/contact';
const CONTACT_ERROR_PREFIX = 'contact/';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const createContactError = (code, message, cause) => {
  const error = new Error(message);
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
};

const normalizeText = (value, maxLength) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
export const normalizeContactEmail = (value) => String(value || '').trim().toLowerCase();

export function getContactErrorMessage(error) {
  const details = String(error?.details || '').trim();

  switch (error?.code) {
    case 'contact/invalid-name':
      return 'Entre ton nom complet.';
    case 'contact/invalid-email':
      return 'Entre une adresse email valide.';
    case 'contact/invalid-message':
      return 'Entre ton message avant envoi.';
    case 'contact/brevo-sync-failed':
      return details
        ? `Ton message est enregistre, mais Brevo a renvoye: ${details}`
        : 'Ton message est enregistré, mais Brevo ne répond pas. Réessaie dans un instant.';
    case 'contact/server-error':
      return 'Le serveur de contact est indisponible pour le moment.';
    case 'contact/rate-limited':
      return 'Trop de messages envoyés en peu de temps. Réessaie dans quelques minutes.';
    default:
      return "Impossible d'envoyer ton message pour le moment. Réessaie dans quelques instants.";
  }
}

export async function sendContactMessage({
  name,
  email,
  subject,
  message,
  source = 'faq-contact',
  website = '',
  formStartedAt = 0
}) {
  const safeName = normalizeText(name, 120);
  const safeEmail = normalizeContactEmail(email);
  const safeSubject = normalizeText(subject, 160);
  const safeMessage = normalizeText(message, 4000);
  const safeSource = normalizeText(source, 64).toLowerCase() || 'faq-contact';

  if (!safeName) {
    throw createContactError('contact/invalid-name', 'Name is required.');
  }

  if (!EMAIL_PATTERN.test(safeEmail)) {
    throw createContactError('contact/invalid-email', 'Invalid email.');
  }

  if (!safeMessage) {
    throw createContactError('contact/invalid-message', 'Message is required.');
  }

  try {
    const response = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: safeName,
        email: safeEmail,
        subject: safeSubject,
        message: safeMessage,
        source: safeSource,
        website: String(website || '').trim(),
        formStartedAt: Number(formStartedAt) || 0
      })
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const code = String(data?.code || '');
      const messageText = String(data?.message || '').trim();
      const details = String(data?.details || '').trim();
      const fallbackCode = response.status >= 500 ? 'contact/server-error' : `${CONTACT_ERROR_PREFIX}unknown`;
      const error = createContactError(code || fallbackCode, messageText || 'Contact API error.');
      if (details) {
        error.details = details;
      }
      throw error;
    }

    return {
      success: true
    };
  } catch (error) {
    const code = String(error?.code || '');
    if (code.startsWith(CONTACT_ERROR_PREFIX)) {
      throw error;
    }
    throw createContactError('contact/server-error', 'Unexpected contact error.', error);
  }
}
