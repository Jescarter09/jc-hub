import { collectSitemapUrls, getSiteUrl } from './seo.js';

const DEFAULT_INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export function getIndexNowKey() {
  return String(process.env.INDEXNOW_KEY || '').trim();
}

export function getIndexNowKeyLocation() {
  return `${getSiteUrl()}/indexnow-key.txt`;
}

function getIndexNowEndpoint() {
  return String(process.env.INDEXNOW_ENDPOINT || DEFAULT_INDEXNOW_ENDPOINT).trim();
}

function toHostName(siteUrl) {
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return '';
  }
}

function getPositiveIntEnv(name, fallback, max = 10000) {
  const numeric = Number(process.env[name]);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(Math.floor(numeric), max);
}

function shouldSubmitUrl(url, { changedOnly = true } = {}) {
  if (!changedOnly) return true;

  const lastmod = Date.parse(`${url.lastmod}T23:59:59.999Z`);
  if (!Number.isFinite(lastmod)) return false;

  const lookbackDays = getPositiveIntEnv('INDEXNOW_LOOKBACK_DAYS', 2, 30);
  return lastmod >= Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
}

export async function submitUrlsToIndexNow(urls, { changedOnly = true } = {}) {
  const key = getIndexNowKey();
  const siteUrl = getSiteUrl();
  const host = toHostName(siteUrl);

  if (!key) {
    return { submitted: false, reason: 'missing-indexnow-key', urls: [] };
  }

  if (!host) {
    return { submitted: false, reason: 'invalid-site-url', urls: [] };
  }

  const limit = getPositiveIntEnv('INDEXNOW_SUBMIT_LIMIT', 100, 10000);
  const urlList = [...new Set(urls.filter((url) => shouldSubmitUrl(url, { changedOnly })).map((url) => url.loc))]
    .filter((url) => String(url || '').startsWith(`${siteUrl}/`) || String(url || '') === siteUrl)
    .slice(0, limit);

  if (urlList.length === 0) {
    return { submitted: false, reason: 'no-eligible-urls', urls: [] };
  }

  const response = await fetch(getIndexNowEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      host,
      key,
      keyLocation: getIndexNowKeyLocation(),
      urlList
    })
  });

  const responseText = await response.text().catch(() => '');

  return {
    submitted: response.ok,
    status: response.status,
    reason: response.ok ? 'submitted' : 'request-failed',
    responseText: responseText.slice(0, 500),
    urls: urlList
  };
}

export async function submitSitemapToIndexNow(options = {}) {
  const urls = await collectSitemapUrls();
  return submitUrlsToIndexNow(urls, options);
}
