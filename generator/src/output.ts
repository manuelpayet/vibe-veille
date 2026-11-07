import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { indexSchema, type IndexEntry, type Veille } from './types.js';

// Écrit data/veille-<date>.json et met à jour data/index.json (trié par date desc).
export function writeVeille(outDir: string, veille: Veille): { file: string; indexEntry: IndexEntry } {
  mkdirSync(outDir, { recursive: true });
  const file = `veille-${veille.date}.json`;
  writeFileSync(join(outDir, file), JSON.stringify(veille, null, 2) + '\n');

  const indexPath = join(outDir, 'index.json');
  let veilles: IndexEntry[] = [];
  if (existsSync(indexPath)) {
    veilles = indexSchema.parse(JSON.parse(readFileSync(indexPath, 'utf8'))).veilles;
  }
  veilles = veilles.filter((v) => v.date !== veille.date);
  const indexEntry: IndexEntry = {
    date: veille.date,
    generatedAt: veille.generatedAt,
    file,
    articlesCount: veille.articles.length,
    sourcesCount: veille.sources.length
  };
  veilles.push(indexEntry);
  veilles.sort((a, b) => b.date.localeCompare(a.date));
  writeFileSync(indexPath, JSON.stringify({ veilles }, null, 2) + '\n');

  return { file, indexEntry };
}
