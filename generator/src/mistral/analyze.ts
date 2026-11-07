import { z } from 'zod';
import type { Article, Theme } from '../types.js';
import { mapLimit } from '../http.js';
import { chat, estimateCostEur, type ChatMessage } from './client.js';
import { analysisMessages, summaryMessages, type AnalysisInputArticle } from './prompts.js';
import type { ThemesConfig } from './themes.js';

export const MODELS = {
  summary: process.env.MISTRAL_MODEL_SUMMARY ?? 'mistral-small-latest',
  analysis: process.env.MISTRAL_MODEL_ANALYSIS ?? 'mistral-large-latest'
} as const;

export const TOP_ARTICLES_PER_THEME = 5;

export interface LlmStats {
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostEur: number;
}

export interface LlmEnrichOptions {
  summaryModel?: string;
  analysisModel?: string;
  concurrency?: number;
  baseUrl?: string;
}

const summaryOutputSchema = z.object({ summary: z.string() });
const analysisOutputSchema = z.object({
  assignments: z.array(z.object({ articleId: z.string(), theme: z.string(), score: z.number().min(0).max(100) })),
  themes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      trend: z.string(),
      topArticles: z.array(z.string())
    })
  )
});

// Enrichit les articles (résumé + thème + score) et produit les tendances par thème.
// `hors-sujet` est exclu de la liste des thèmes (veille pro uniquement).
export async function enrichWithLlm(
  articles: Article[],
  themesConfig: ThemesConfig,
  opts: LlmEnrichOptions = {}
): Promise<{ themes: Theme[]; stats: LlmStats }> {
  const stats: LlmStats = { llmCalls: 0, promptTokens: 0, completionTokens: 0, estimatedCostEur: 0 };
  const summaryModel = opts.summaryModel ?? MODELS.summary;
  const analysisModel = opts.analysisModel ?? MODELS.analysis;
  const track = (model: string, usage: { promptTokens: number; completionTokens: number }): void => {
    stats.llmCalls += 1;
    stats.promptTokens += usage.promptTokens;
    stats.completionTokens += usage.completionTokens;
    stats.estimatedCostEur += estimateCostEur(model, usage.promptTokens, usage.completionTokens);
  };

  // 1. Résumé de chaque article (modèle léger, appels concurrents limités)
  const summaries = await mapLimit(articles, opts.concurrency ?? 4, async (a): Promise<readonly [string, string | null]> => {
    try {
      const messages: ChatMessage[] = summaryMessages(a);
      const r = await chat(messages, {
        model: summaryModel,
        json: true,
        temperature: 0.2,
        maxTokens: 150,
        baseUrl: opts.baseUrl
      });
      track(summaryModel, r.usage);
      const parsed = summaryOutputSchema.parse(JSON.parse(r.content));
      return [a.id, parsed.summary.slice(0, 300)] as const;
    } catch (err) {
      console.error(`[llm] résumé en échec pour ${a.id}:`, (err as Error).message);
      return [a.id, null] as const;
    }
  });
  const summaryMap = new Map<string, string | null>(summaries);
  for (const a of articles) a.summary = summaryMap.get(a.id) ?? a.summary;

  // 2. Analyse globale (modèle fort, 1 appel) : thèmes + scores + tendances
  const input: AnalysisInputArticle[] = articles.map((a) => ({
    id: a.id,
    source: a.sourceName,
    title: a.title,
    summary: a.summary ?? ''
  }));
  const r = await chat(analysisMessages(input, themesConfig), {
    model: analysisModel,
    json: true,
    temperature: 0.3,
    maxTokens: 6000,
    baseUrl: opts.baseUrl
  });
  track(analysisModel, r.usage);
  const analysis = analysisOutputSchema.parse(JSON.parse(r.content));

  const assignments = new Map(analysis.assignments.map((x) => [x.articleId, x]));
  for (const a of articles) {
    const asg = assignments.get(a.id);
    if (asg) {
      a.theme = asg.theme;
      a.score = asg.score;
    }
  }

  // Top 5 par thème imposé côté code (tri par score), thèmes hors-sujet exclus
  const themes: Theme[] = analysis.themes
    .filter((t) => t.id !== 'hors-sujet')
    .map((t) => {
      const inTheme = articles.filter((a) => a.theme === t.id);
      const top = [...inTheme].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, TOP_ARTICLES_PER_THEME);
      return { id: t.id, label: t.label, trend: t.trend, topArticles: top.map((a) => a.id) };
    })
    .filter((t) => t.topArticles.length > 0)
    .sort((a, b) => b.topArticles.length - a.topArticles.length);

  return { themes, stats };
}
