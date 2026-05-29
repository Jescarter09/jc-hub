import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const targets = [
  'dist',
  path.join('public', 'mockups'),
  path.join('public', 'assets'),
  path.join('src', 'assets', 'hero.png')
];

for (const target of targets) {
  const targetPath = path.resolve(projectRoot, target);
  const staysInsideProject = targetPath.startsWith(`${projectRoot}${path.sep}`);

  if (!staysInsideProject) {
    console.log(`Skip unsafe target: ${target}`);
    continue;
  }

  if (!fs.existsSync(targetPath)) {
    console.log(`Already clean: ${target}`);
    continue;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log(`Removed: ${target}`);
}
