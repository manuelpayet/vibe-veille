import type { Article, Theme, Veille } from './types.js';

export function articleMap(veille: Veille): Map<string, Article> {
  return new Map(veille.articles.map((a) => [a.id, a]));
}

// Articles d'un thème hors top 5 (liste repliable), triés par score desc.
// `field` = assignation à utiliser : 'theme' (vue prédéfinis) ou 'dynamicTheme' (vue dynamiques).
export function restArticlesByTheme(
  veille: Veille,
  themes: Theme[],
  field: 'theme' | 'dynamicTheme'
): Map<string, Article[]> {
  const map = new Map<string, Article[]>(themes.map((t) => [t.id, []]));
  for (const a of veille.articles) {
    const key = a[field];
    const theme = key ? themes.find((t) => t.id === key) : undefined;
    if (theme && !theme.topArticles.includes(a.id)) {
      map.get(theme.id)!.push(a);
    }
  }
  for (const list of map.values()) list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return map;
}

// '2026-11-07' -> '07/11/2026'
export function formatDateFR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function sourceLabel(veille: Veille, sourceId: string): string {
  return veille.sources.find((s) => s.id === sourceId)?.name ?? sourceId;
}
