import { getSiteUrl } from './_lib/seo.js';

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

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed');
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end(req.method === 'HEAD' ? '' : renderRobotsTxt());
}
