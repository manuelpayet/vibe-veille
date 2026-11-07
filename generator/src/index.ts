import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from './pipeline.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function arg(name: string, def: string): string {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}

const outDir = path.resolve(here, arg('--out', '../../data'));
const configPath = path.resolve(here, arg('--config', '../config/sources.json'));
const windowHours = Number(arg('--window-hours', '24'));

const veille = await runPipeline({ outDir, configPath, windowHours });
console.log(
  `[veille] ${veille.date} : ${veille.articles.length} articles depuis ${veille.sources.length} sources -> ${outDir}`
);
