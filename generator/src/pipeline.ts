import type { Article, Veille } from './types.js';
import { getFetcher, loadSources } from './sources/index.js';
import { writeVeille } from './output.js';
import { enrichWithLlm, type LlmStats } from './mistral/analyze.js';
import { loadThemesConfig } from './mistral/themes.js';

export interface PipelineOptions {
  configPath: string;
  outDir: string;
  now?: Date;
  windowHours?: number;
  themesPath?: string;
  llm?: boolean; // défaut true ; false = collecte brute sans appel Mistral (dry-run)
  maxArticlesForLlm?: number; // plafond d'articles envoyés au LLM (coût), défaut 80
  mistralBaseUrl?: string; // override de l'API Mistral (tests)
}

function inWindow(publishedAt: string, from: Date, to: Date): boolean {
  const t = new Date(publishedAt).getTime();
  return !Number.isNaN(t) && t >= from.getTime() && t <= to.getTime();
}

export function dedupe(articles: Article[]): Article[] {
  const seen = new Map<string, Article>();
  for (const a of articles) {
    const key = a.url || a.title;
    if (!seen.has(key)) seen.set(key, a);
  }
  return [...seen.values()];
}

// Pipeline complet (incrément 1 : collecte brute, sans LLM).
// L'analyse Mistral sera branchée ici à l'incrément 3.
export async function runPipeline(opts: PipelineOptions): Promise<Veille> {
  const now = opts.now ?? new Date();
  const windowHours = opts.windowHours ?? 24;
  const from = new Date(now.getTime() - windowHours * 3_600_000);

  const sources = loadSources(opts.configPath);
  const all: Article[] = [];
  const sourceStats: Veille['sources'] = [];

  for (const source of sources) {
    try {
      const articles = await getFetcher(source)(source, now);
      const kept = articles.filter((a) => inWindow(a.publishedAt, from, now));
      sourceStats.push({ id: source.id, name: source.name, count: kept.length });
      all.push(...kept);
    } catch (err) {
      // une source en échec ne bloque pas la veille
      console.error(`[veille] source ${source.id} en échec:`, (err as Error).message);
      sourceStats.push({ id: source.id, name: source.name, count: 0 });
    }
  }

  const articles = dedupe(all).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const veille: Veille = {
    date: now.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    window: { from: from.toISOString(), to: now.toISOString() },
    sources: sourceStats,
    articles,
    themes: [],
    dynamicThemes: []
  };

  // Étape LLM : résumés (small) + analyse des tendances (large)
  if (opts.llm !== false) {
    const themesPath =
      opts.themesPath ?? new URL('../config/themes.json', import.meta.url).pathname;
    const themesConfig = loadThemesConfig(themesPath);
    const maxArticles = opts.maxArticlesForLlm ?? 80;
    const llmArticles = articles.slice(0, maxArticles);
    if (articles.length > maxArticles) {
      console.error(`[veille] ${articles.length - maxArticles} articles au-delà du plafond LLM (${maxArticles})`);
    }
    const { themes, dynamicThemes, stats } = await enrichWithLlm(llmArticles, themesConfig, {
      baseUrl: opts.mistralBaseUrl
    });
    veille.themes = themes;
    veille.dynamicThemes = dynamicThemes;
    veille.stats = stats;
    console.error(
      `[veille] LLM: ${stats.llmCalls} appels, ${stats.promptTokens + stats.completionTokens} tokens, ~${stats.estimatedCostEur.toFixed(4)} EUR`
    );
  }

  writeVeille(opts.outDir, veille);
  return veille;
}
