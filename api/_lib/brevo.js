const DEFAULT_BREVO_BASE_URL = 'https://api.brevo.com/v3';

function getBrevoBaseUrl() {
  return String(process.env.BREVO_API_BASE_URL || DEFAULT_BREVO_BASE_URL).trim().replace(/\/+$/, '');
}

function getBrevoApiKey() {
  return String(process.env.BREVO_API_KEY || '').trim();
}

function splitName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function parseListId(rawValue) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

export function resolveBrevoListIds({ type }) {
  const fallbackListId = parseListId(process.env.BREVO_LIST_ID);
  const newsletterListId = parseListId(process.env.BREVO_LIST_ID_NEWSLETTER);
  const contactListId = parseListId(process.env.BREVO_LIST_ID_CONTACTS);

  if (type === 'newsletter') {
    return [newsletterListId || fallbackListId].filter(Boolean);
  }

  if (type === 'contact') {
    return [contactListId || fallbackListId].filter(Boolean);
  }

  return [fallbackListId].filter(Boolean);
}

function getContactAttributes({ fullName }) {
  const attributes = {};
  const { firstName, lastName } = splitName(fullName);

  if (firstName) attributes.FIRSTNAME = firstName;
  if (lastName) attributes.LASTNAME = lastName;

  return attributes;
}

export async function upsertBrevoContact({
  email,
  listIds = [],
  fullName = '',
  extraAttributes = {}
}) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is missing.');
  }

  if (apiKey.startsWith('xsmtpsib-')) {
    throw new Error(
      'BREVO_API_KEY appears to be an SMTP key (xsmtpsib-). Use a Brevo API key from SMTP & API > API Keys (usually xkeysib-).'
    );
  }

  const payload = {
    email,
    updateEnabled: true
  };

  if (Array.isArray(listIds) && listIds.length > 0) {
    payload.listIds = listIds;
  }

  const attributes = {
    ...getContactAttributes({ fullName }),
    ...(extraAttributes && typeof extraAttributes === 'object' ? extraAttributes : {})
  };

  if (Object.keys(attributes).length > 0) {
    payload.attributes = attributes;
  }

  const response = await fetch(`${getBrevoBaseUrl()}/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = text || `Brevo request failed with status ${response.status}.`;

    try {
      const parsed = text ? JSON.parse(text) : null;
      const fallbackMessage = parsed?.message || parsed?.code;
      if (fallbackMessage) {
        message = String(fallbackMessage);
      }
    } catch {
      // Keep raw text fallback.
    }

    throw new Error(message.slice(0, 280));
  }
}
