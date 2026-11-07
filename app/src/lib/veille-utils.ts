import type { Article, Veille } from './types.js';

export function articleMap(veille: Veille): Map<string, Article> {
  return new Map(veille.articles.map((a) => [a.id, a]));
}

// '2026-11-07' -> '07/11/2026'
export function formatDateFR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function sourceLabel(veille: Veille, sourceId: string): string {
  return veille.sources.find((s) => s.id === sourceId)?.name ?? sourceId;
}
