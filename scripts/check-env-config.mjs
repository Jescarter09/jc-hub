import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('.env introuvable.');
  }

  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex < 1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

const env = parseEnv(envPath);
const checks = [
  ['CRON_SECRET', 'required'],
  ['BREVO_API_KEY', 'required'],
  ['BREVO_SENDER_EMAIL', 'required'],
  ['BREVO_SENDER_NAME', 'recommended'],
  ['NEWSLETTER_COLLECTION', 'required'],
  ['BOOKS_COLLECTION', 'required'],
  ['FIREBASE_SERVICE_ACCOUNT_JSON', 'one-of'],
  ['FIREBASE_SERVICE_ACCOUNT_BASE64', 'one-of'],
  ['FIREBASE_SERVICE_ACCOUNT_KEY_PATH', 'one-of'],
  ['VITE_SITE_URL', 'recommended']
];

for (const [key, level] of checks) {
  const value = String(env[key] || '').trim();
  const status = value ? 'OK' : level === 'required' ? 'MISSING' : 'empty';
  console.log(`${status.padEnd(7)} ${key}`);
}

const hasFirebaseAdminCredential = Boolean(
  String(env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim() ||
    String(env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim() ||
    String(env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || '').trim()
);

console.log('');
console.log(`Firebase Admin credentials: ${hasFirebaseAdminCredential ? 'OK' : 'MISSING'}`);

if (env.BREVO_API_KEY?.startsWith('xsmtpsib-')) {
  console.log('WARN    BREVO_API_KEY looks like an SMTP key. Brevo API keys usually start with xkeysib-.');
}

if (env.BREVO_SENDER_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(env.BREVO_SENDER_EMAIL)) {
  console.log('WARN    BREVO_SENDER_EMAIL does not look like a valid email.');
}

if (env.CRON_SECRET && env.CRON_SECRET.length < 32) {
  console.log('WARN    CRON_SECRET is present but short. Prefer at least 32 random characters.');
}
