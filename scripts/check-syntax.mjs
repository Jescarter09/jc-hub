import { spawnSync } from 'node:child_process';

const files = [
  'api/_lib/books.js',
  'api/_lib/brevo.js',
  'api/_lib/firebaseAdmin.js',
  'api/_lib/seo.js',
  'api/books/detail.js',
  'api/books/import.js',
  'api/books/interactions.js',
  'api/books/list.js',
  'api/books/search.js',
  'api/contact.js',
  'api/newsletter.js',
  'api/newsletter-stats.js',
  'api/robots.js',
  'api/send-books-newsletter.js',
  'api/sitemap.js',
  'scripts/check-env-config.mjs',
  'scripts/generate-cron-secret.mjs',
  'scripts/schedule-books-publish-at.mjs',
  'vite.config.js'
];

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax OK (${files.length} files).`);
