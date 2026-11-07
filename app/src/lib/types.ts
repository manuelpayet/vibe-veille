// Miroir des schémas du generator (generator/src/types.ts), côté front.
export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceName: string;
  publishedAt: string;
  excerpt: string;
  summary: string | null;
  theme: string | null;
  score: number | null;
}

export interface Theme {
  id: string;
  label: string;
  trend: string;
  topArticles: string[]; // ids, max 5
}

export interface VeilleStats {
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostEur: number;
}

export interface Veille {
  date: string; // YYYY-MM-DD
  generatedAt: string;
  window: { from: string; to: string };
  sources: { id: string; name: string; count: number }[];
  articles: Article[];
  themes: Theme[];
  stats?: VeilleStats;
}

export interface IndexEntry {
  date: string;
  generatedAt: string;
  file: string;
  articlesCount: number;
  sourcesCount: number;
}

export interface Index {
  veilles: IndexEntry[];
}
