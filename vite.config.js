import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import contactHandler from './api/contact.js';
import newsletterHandler from './api/newsletter.js';
import newsletterStatsHandler from './api/newsletter-stats.js';

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

function createLocalApiPlugin() {
  const middlewares = [
    createApiMiddleware('/api/contact', contactHandler),
    createApiMiddleware('/api/newsletter', newsletterHandler),
    createApiMiddleware('/api/newsletter-stats', newsletterStatsHandler)
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

  return {
    plugins: [react(), createLocalApiPlugin()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: true
    }
  };
});
