import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    email: '',
    password: '',
    showToken: false
  };

  for (const arg of argv) {
    if (arg.startsWith('--email=')) {
      args.email = arg.slice('--email='.length).trim();
      continue;
    }
    if (arg.startsWith('--password=')) {
      args.password = arg.slice('--password='.length).trim();
      continue;
    }
    if (arg === '--show-token') {
      args.showToken = true;
      continue;
    }
  }

  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
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

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

function getAuthErrorMessage(payload) {
  return payload?.error?.message || 'UNKNOWN_AUTH_ERROR';
}

async function createOrSignInImportUser({ apiKey, email, password }) {
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`;
  const signUp = await postJson(signUpUrl, {
    email,
    password,
    returnSecureToken: true
  });

  if (signUp.ok) {
    return {
      mode: 'created',
      localId: signUp.payload.localId || '',
      idToken: signUp.payload.idToken || ''
    };
  }

  const signUpError = getAuthErrorMessage(signUp.payload);
  if (signUpError !== 'EMAIL_EXISTS') {
    throw new Error(`Firebase Auth signUp failed: ${signUpError}`);
  }

  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
  const signIn = await postJson(signInUrl, {
    email,
    password,
    returnSecureToken: true
  });

  if (!signIn.ok) {
    const signInError = getAuthErrorMessage(signIn.payload);
    throw new Error(`Firebase Auth signIn failed: ${signInError}`);
  }

  return {
    mode: 'existing',
    localId: signIn.payload.localId || '',
    idToken: signIn.payload.idToken || ''
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(path.resolve('.env'));

  const apiKey = String(process.env.VITE_FIREBASE_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('VITE_FIREBASE_API_KEY is missing in .env');
  }

  const email = args.email || String(process.env.FIREBASE_IMPORT_EMAIL || '').trim();
  const password = args.password || String(process.env.FIREBASE_IMPORT_PASSWORD || '').trim();

  if (!email || !password) {
    throw new Error(
      'Missing import credentials. Set FIREBASE_IMPORT_EMAIL and FIREBASE_IMPORT_PASSWORD in .env or pass --email and --password.'
    );
  }

  const result = await createOrSignInImportUser({ apiKey, email, password });

  console.log(`Import user: ${result.mode === 'created' ? 'created' : 'already exists'}`);
  console.log(`Email: ${email}`);
  console.log(`UID: ${result.localId}`);
  console.log('\nAdd or keep these lines in .env:');
  console.log(`FIREBASE_IMPORT_EMAIL=${email}`);
  console.log(`FIREBASE_IMPORT_PASSWORD=${password}`);
  console.log('FIREBASE_IMPORT_FORCE_AUTHOR_ID=true');

  if (args.showToken && result.idToken) {
    console.log('\nOne-time FIREBASE_ID_TOKEN (optional):');
    console.log(`FIREBASE_ID_TOKEN=${result.idToken}`);
  }
}

main().catch((error) => {
  console.error('Create import user error:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
