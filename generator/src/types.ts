import { z } from 'zod';

// Un article brut collecté depuis une source. `summary`, `theme` et `score`
// sont remplis par le pipeline LLM (incrément 3) ; null avant.
export const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  source: z.string(),
  sourceName: z.string(),
  publishedAt: z.string(), // ISO 8601
  excerpt: z.string(), // extrait brut (HTML retiré, tronqué) pour le futur résumé LLM
  summary: z.string().nullable(),
  theme: z.string().nullable(),
  score: z.number().nullable()
});
export type Article = z.infer<typeof articleSchema>;

export const veilleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string(), // ISO 8601
  window: z.object({ from: z.string(), to: z.string() }),
  sources: z.array(z.object({ id: z.string(), name: z.string(), count: z.number() })),
  articles: z.array(articleSchema)
});
export type Veille = z.infer<typeof veilleSchema>;

export const indexEntrySchema = z.object({
  date: z.string(),
  generatedAt: z.string(),
  file: z.string(),
  articlesCount: z.number(),
  sourcesCount: z.number()
});
export const indexSchema = z.object({ veilles: z.array(indexEntrySchema) });
export type IndexEntry = z.infer<typeof indexEntrySchema>;

// Configuration d'une source de veille (generator/config/sources.json).
const baseSource = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().default(true)
});

export const sourceConfigSchema = z.discriminatedUnion('type', [
  baseSource.extend({ type: z.literal('rss'), url: z.string() }),
  baseSource.extend({
    type: z.literal('hackernews'),
    baseUrl: z.string().default('https://hacker-news.firebaseio.com'),
    limit: z.number().default(30)
  }),
  baseSource.extend({
    type: z.literal('reddit'),
    baseUrl: z.string().default('https://www.reddit.com'),
    subreddits: z.array(z.string()).min(1),
    limit: z.number().default(25)
  }),
  baseSource.extend({
    type: z.literal('statuspage'),
    apiBase: z.string(), // ex: https://www.cloudflarestatus.com (API publique statuspage.io)
    limit: z.number().default(20)
  })
]);
export type SourceConfig = z.infer<typeof sourceConfigSchema>;
