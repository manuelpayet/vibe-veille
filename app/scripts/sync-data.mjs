// Copie les veilles générées (repo data/) dans app/static/data pour qu'elles
// soient servies avec le site buildé. DATA_SRC permet de surcharger la source (e2e).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.resolve(appDir, process.env.DATA_SRC ?? '../../data');
const dest = path.join(appDir, 'static', 'data');

if (!existsSync(src)) {
  console.log(`[sync-data] ${src} absent, rien à copier`);
  process.exit(0);
}
mkdirSync(path.dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[sync-data] ${src} -> ${dest}`);
