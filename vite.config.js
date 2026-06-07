import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import contactHandler from './api/contact.js';
import newsletterHandler from './api/newsletter.js';
import seoHandler from './api/seo.js';
import booksDetailHandler from './api/books/detail.js';
import booksImportHandler from './api/books/import.js';
import booksInteractionsHandler from './api/books/interactions.js';
import booksListHandler from './api/books/list.js';
import booksReadHandler from './api/books/read.js';
import booksSearchHandler from './api/books/search.js';
import adminHandler from './api/admin.js';

function jsonReply(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function matchesRoute(req, routePath) {
  const requestUrl = String(req.url || '');
  return requestUrl === routePath || requestUrl.startsWith(`${routePath}?`);
}

function createApiMiddleware(routePath, handler) {
  return async (req, res, next) => {
    if (!matchesRoute(req, routePath)) {
      next();
      return;
    }

    try {
      await handler(req, res);
      if (!res.writableEnded && !res.headersSent) {
        res.statusCode = 204;
        res.end();
      }
    } catch (error) {
      console.error(`[local-api:${routePath}]`, error);
      if (!res.headersSent) {
        jsonReply(res, 500, { message: 'Erreur API locale.' });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  };
}

function createSeoMiddleware(routePath, type) {
  return async (req, res, next) => {
    if (!matchesRoute(req, routePath)) {
      next();
      return;
    }

    const originalUrl = req.url;
    const originalQuery = String(originalUrl || '').split('?')[1] || '';
    req.url = `/api/seo?type=${encodeURIComponent(type)}${originalQuery ? `&${originalQuery}` : ''}`;

    try {
      await seoHandler(req, res);
      if (!res.writableEnded && !res.headersSent) {
        res.statusCode = 204;
        res.end();
      }
    } catch (error) {
      console.error(`[local-api:${routePath}]`, error);
      if (!res.headersSent) {
        jsonReply(res, 500, { message: 'Erreur API locale.' });
      } else if (!res.writableEnded) {
        res.end();
      }
    } finally {
      req.url = originalUrl;
    }
  };
}

function createLocalApiPlugin() {
  const middlewares = [
    createApiMiddleware('/api/contact', contactHandler),
    createApiMiddleware('/api/newsletter', newsletterHandler),
    createSeoMiddleware('/api/robots', 'robots'),
    createSeoMiddleware('/api/sitemap', 'sitemap'),
    createSeoMiddleware('/api/indexnow', 'indexnow'),
    createSeoMiddleware('/robots.txt', 'robots'),
    createSeoMiddleware('/sitemap.xml', 'sitemap'),
    createSeoMiddleware('/indexnow-key.txt', 'indexnow-key'),
    createApiMiddleware('/api/books/detail', booksDetailHandler),
    createApiMiddleware('/api/books/import', booksImportHandler),
    createApiMiddleware('/api/books/interactions', booksInteractionsHandler),
    createApiMiddleware('/api/books/list', booksListHandler),
    createApiMiddleware('/api/books/read', booksReadHandler),
    createApiMiddleware('/api/books/search', booksSearchHandler),
    createApiMiddleware('/api/admin', adminHandler)
  ];

  return {
    name: 'local-api-routes',
    configureServer(server) {
      for (const middleware of middlewares) {
        server.middlewares.use(middleware);
      }
    },
    configurePreviewServer(server) {
      for (const middleware of middlewares) {
        server.middlewares.use(middleware);
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (typeof process.env[key] === 'undefined') {
      process.env[key] = value;
    }
  }

  const devPort = Number(process.env.PORT || env.PORT) || 5173;
  const hmrHost = String(process.env.VITE_HMR_HOST || env.VITE_HMR_HOST || 'localhost').trim();

  return {
    plugins: [react(), createLocalApiPlugin()],
    server: {
      host: '0.0.0.0',
      port: devPort,
      strictPort: true,
      open: true,
      hmr: {
        protocol: 'ws',
        host: hmrHost,
        clientPort: devPort
      }
    }
  };
});
