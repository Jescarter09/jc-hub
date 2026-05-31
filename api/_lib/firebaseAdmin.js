import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function parseJson(label, raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} contains invalid JSON.`);
  }
}

function parseServiceAccountFromEnv() {
  const inlineJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (inlineJson) {
    return parseJson('FIREBASE_SERVICE_ACCOUNT_JSON', inlineJson);
  }

  const base64 = String(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim();
  if (base64) {
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return parseJson('FIREBASE_SERVICE_ACCOUNT_BASE64', decoded);
  }

  const projectId = String(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey
    };
  }

  return null;
}

function parseServiceAccountFromFile() {
  const configuredPath = String(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || '').trim();
  const absoluteConfiguredPath = configuredPath
    ? path.resolve(PROJECT_ROOT, configuredPath)
    : null;

  const fallbackPath = path.resolve(PROJECT_ROOT, 'firebase-service-account.json');
  const pathToRead = absoluteConfiguredPath || fallbackPath;

  if (!fs.existsSync(pathToRead)) return null;
  return parseJson(path.basename(pathToRead), fs.readFileSync(pathToRead, 'utf8'));
}

function initializeAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = parseServiceAccountFromEnv() || parseServiceAccountFromFile();
  const projectId = String(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '').trim() || undefined;

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id || serviceAccount.projectId
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId
  });
}

export function getAdminDb() {
  return getFirestore(initializeAdminApp());
}

export { FieldValue, Timestamp };
