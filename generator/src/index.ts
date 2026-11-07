import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from './pipeline.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function arg(name: string, def: string): string {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}
function flag(name: string): boolean {
  return args.includes(name);
}

const outDir = path.resolve(here, arg('--out', '../../data'));
const configPath = path.resolve(here, arg('--config', '../config/sources.json'));
const themesPath = path.resolve(here, arg('--themes', '../config/themes.json'));
const windowHours = Number(arg('--window-hours', '24'));
const llm = !flag('--no-llm'); // --no-llm = collecte brute, sans appel Mistral (dry-run CI)

const veille = await runPipeline({ outDir, configPath, themesPath, windowHours, llm });
console.log(
  `[veille] ${veille.date} : ${veille.articles.length} articles, ${veille.themes.length} thèmes depuis ${veille.sources.length} sources -> ${outDir}`
);
