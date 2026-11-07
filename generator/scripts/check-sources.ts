// Outil de maintenance : teste chaque source de config/sources.json et affiche
// le nombre d'articles récupérés (sans filtre de fenêtre) ou l'erreur rencontrée.
// Usage : npx tsx scripts/check-sources.ts [--config ../config/sources.json]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFetcher, loadSources } from '../src/sources/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const i = args.indexOf('--config');
const configPath = path.resolve(here, i >= 0 ? args[i + 1] : '../config/sources.json');

const sources = loadSources(configPath);
for (const source of sources) {
  try {
    const articles = await getFetcher(source)(source, new Date());
    const first = articles[0]?.title?.slice(0, 70) ?? '-';
    console.log(`OK    ${source.id.padEnd(20)} ${String(articles.length).padStart(4)} articles  ex: ${first}`);
  } catch (err) {
    console.log(`ECHEC ${source.id.padEnd(20)} ${(err as Error).message}`);
  }
}
