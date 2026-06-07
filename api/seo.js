import { assertCronAuthorized } from './_lib/cronAuth.js';
import { sendJson } from './_lib/http.js';
import { getIndexNowKey, submitSitemapToIndexNow } from './_lib/indexNow.js';
import { collectSitemapUrls, getSiteUrl, renderSitemapXml } from './_lib/seo.js';

function getSeoType(req) {
  const params = new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`).searchParams;
  return String(params.get('type') || '').trim().toLowerCase();
}

function renderRobotsTxt() {
  return [
    'User-agent: *',
    '',
    'Allow: /',
    'Allow: /ebooks',
    'Allow: /blog',
    'Allow: /categories',
    'Allow: /about',
    '',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /private',
    'Disallow: /api/internal',
    '',
    `Sitemap: ${getSiteUrl()}/sitemap.xml`,
    ''
  ].join('\n');
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8', cache = false) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  if (cache) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  }
  res.end(text);
}

function handleRobots(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'Method not allowed');
  }

  return sendText(res, 200, req.method === 'HEAD' ? '' : renderRobotsTxt(), 'text/plain; charset=utf-8', true);
}

async function handleSitemap(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'Method not allowed');
  }

  try {
    const urls = await collectSitemapUrls();
    const xml = renderSitemapXml(urls);
    return sendText(res, 200, req.method === 'HEAD' ? '' : xml, 'application/xml; charset=utf-8', true);
  } catch (error) {
    console.error('sitemap/generation-failed', error);
    return sendText(res, 503, 'Sitemap unavailable');
  }
}

function handleIndexNowKey(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'Method not allowed');
  }

  const key = getIndexNowKey();
  if (!key) {
    return sendText(res, 503, 'INDEXNOW_KEY is not configured');
  }

  return sendText(res, 200, req.method === 'HEAD' ? '' : key, 'text/plain; charset=utf-8', true);
}

async function handleIndexNow(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { success: false, code: 'indexnow/method-not-allowed' });
  }

  const authorization = assertCronAuthorized(req, { codePrefix: 'indexnow' });
  if (!authorization.ok) {
    return sendJson(res, authorization.status, {
      success: false,
      code: authorization.code,
      message: authorization.message
    });
  }

  const params = new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`).searchParams;
  const full = params.get('full') === '1' || params.get('full') === 'true';

  try {
    const result = await submitSitemapToIndexNow({ changedOnly: !full });
    return sendJson(res, result.submitted ? 200 : 202, {
      success: result.submitted,
      authMode: authorization.mode,
      result
    });
  } catch (error) {
    console.error('indexnow/submit-failed', error);
    return sendJson(res, 500, {
      success: false,
      code: 'indexnow/submit-failed',
      message: 'Soumission IndexNow impossible.',
      details: String(error?.message || error).slice(0, 240)
    });
  }
}

export default async function handler(req, res) {
  const type = getSeoType(req);

  if (type === 'robots') return handleRobots(req, res);
  if (type === 'sitemap') return handleSitemap(req, res);
  if (type === 'indexnow-key') return handleIndexNowKey(req, res);
  if (type === 'indexnow') return handleIndexNow(req, res);

  return sendJson(res, 404, {
    success: false,
    code: 'seo/unknown-type',
    message: 'Route SEO inconnue.'
  });
}
