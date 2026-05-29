import fs from 'node:fs';
import path from 'node:path';
import { generateArticleDraftFromResearch, generateArticleDraftFromTitle } from '../src/utils/articleGenerator.js';

const rawArgs = process.argv.slice(2);
const titleParts = [];
let outputArg = '';
let modeArg = 'local';
let categoryArg = '';

for (const arg of rawArgs) {
  if (arg.startsWith('--output=')) {
    outputArg = arg.replace('--output=', '').trim();
  } else if (arg.startsWith('--mode=')) {
    modeArg = arg.replace('--mode=', '').trim().toLowerCase();
  } else if (arg.startsWith('--category=')) {
    categoryArg = arg.replace('--category=', '').trim();
  } else {
    titleParts.push(arg);
  }
}

const titleArg = titleParts.join(' ').trim();

if (!titleArg) {
  console.error('Usage: node scripts/generate-article.mjs <titre> [--mode=local|web] [--category=Nom] [--output=fichier.json]');
  process.exit(1);
}

if (!['local', 'web'].includes(modeArg)) {
  console.error('Mode invalide. Utilise --mode=local ou --mode=web');
  process.exit(1);
}

function readEnvFile(filePath = '.env') {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    parsed[key] = value;
  }
  return parsed;
}

async function searchGoogleFromNode(query) {
  const envFromFile = readEnvFile();
  const apiKey = process.env.SERPER_API_KEY || process.env.VITE_SERPER_API_KEY || envFromFile.SERPER_API_KEY || envFromFile.VITE_SERPER_API_KEY;

  if (!apiKey) {
    throw new Error('Cle Serper absente. Ajoute VITE_SERPER_API_KEY dans .env');
  }

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({
      q: query,
      gl: 'fr',
      hl: 'fr',
      num: 5
    })
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    throw new Error(`Erreur recherche web (${response.status}) ${txt.slice(0, 120)}`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload?.organic) ? payload.organic : [])
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      title: String(item?.title || '').trim(),
      snippet: String(item?.snippet || '').replace(/\s+/g, ' ').trim(),
      link: String(item?.link || '').trim(),
      source: String(item?.source || '').trim()
    }))
    .filter((item) => item.title && item.snippet && item.link);

  return {
    provider: 'serper-google',
    query,
    createdAt: new Date().toISOString(),
    items
  };
}

let draft;
try {
  if (modeArg === 'web') {
    const research = await searchGoogleFromNode(titleArg);
    draft = generateArticleDraftFromResearch(titleArg, research, categoryArg || undefined);
  } else {
    draft = generateArticleDraftFromTitle(titleArg, categoryArg || undefined);
  }
} catch (error) {
  console.error(`Generation echouee: ${error.message}`);
  process.exit(1);
}

if (!draft) {
  console.error('Impossible de generer un article avec ce titre.');
  process.exit(1);
}

const article = {
  title: titleArg,
  mode: modeArg,
  category: draft.category,
  description: draft.description,
  tags: draft.tags,
  content: draft.content,
  sources: draft.sources || []
};

if (outputArg) {
  const outputPath = path.resolve(process.cwd(), outputArg);
  fs.writeFileSync(outputPath, JSON.stringify(article, null, 2), 'utf8');
  console.log(`Brouillon ecrit dans: ${outputPath}`);
} else {
  console.log(JSON.stringify(article, null, 2));
}
