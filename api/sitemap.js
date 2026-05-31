import { collectSitemapUrls, renderSitemapXml } from './_lib/seo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed');
    return;
  }

  try {
    const urls = await collectSitemapUrls();
    const xml = renderSitemapXml(urls);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.end(req.method === 'HEAD' ? '' : xml);
  } catch (error) {
    console.error('sitemap/generation-failed', error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Sitemap unavailable');
  }
}
