import { describe, it, expect } from 'vitest';
import { articleMap, formatDateFR, restArticlesByTheme, sourceLabel } from './veille-utils.js';
import type { Veille } from './types.js';

const veille: Veille = {
  date: '2026-11-07',
  generatedAt: '2026-11-07T07:00:00.000Z',
  window: { from: '2026-11-06T07:00:00.000Z', to: '2026-11-07T07:00:00.000Z' },
  sources: [{ id: 'hn', name: 'Hacker News', count: 3 }],
  articles: [
    { id: 'aaa', title: 'A', url: 'https://x.test/a', source: 'hn', sourceName: 'Hacker News', publishedAt: '2026-11-07T08:00:00.000Z', excerpt: '', summary: null, theme: 'kubernetes', score: 90 },
    { id: 'bbb', title: 'B', url: 'https://x.test/b', source: 'hn', sourceName: 'Hacker News', publishedAt: '2026-11-07T09:00:00.000Z', excerpt: '', summary: null, theme: null, score: null }
  ],
  themes: []
};

describe('veille-utils', () => {
  it('articleMap indexe par id', () => {
    const m = articleMap(veille);
    expect(m.get('aaa')?.title).toBe('A');
    expect(m.size).toBe(2);
  });

  it('formatDateFR', () => {
    expect(formatDateFR('2026-11-07')).toBe('07/11/2026');
  });

  it('sourceLabel retombe sur l id si inconnu', () => {
    expect(sourceLabel(veille, 'hn')).toBe('Hacker News');
    expect(sourceLabel(veille, 'inconnu')).toBe('inconnu');
  });
});

describe('restArticlesByTheme (double vue)', () => {
  const art = (id: string, theme: string | null, dynamicTheme: string | null, score: number | null) => ({
    id, title: id.toUpperCase(), url: `https://x.test/${id}`, source: 'hn', sourceName: 'Hacker News',
    publishedAt: '2026-11-07T08:00:00.000Z', excerpt: '', summary: null, theme, dynamicTheme, score
  });
  const veilleDouble: Veille = {
    ...veille,
    articles: [
      art('aaa', 'kubernetes', 'releases', 90),
      art('bbb', null, 'releases', 50),
      art('ccc', 'kubernetes', 'releases', 70),
      art('ddd', 'hors-sujet', 'hors-perso', 10)
    ],
    themes: [{ id: 'kubernetes', label: 'Kubernetes', trend: 't', topArticles: ['aaa'] }],
    dynamicThemes: [
      { id: 'releases', label: 'Releases majeures', trend: 't', topArticles: ['aaa', 'bbb'] },
      { id: 'hors-perso', label: 'Hors périmètre pro', trend: 't', topArticles: ['ddd'] }
    ]
  };

  it('vue prédéfinis : reste = articles du thème hors top 5, triés par score desc', () => {
    const rest = restArticlesByTheme(veilleDouble, veilleDouble.themes, 'theme');
    expect(rest.get('kubernetes')?.map((a) => a.id)).toEqual(['ccc']); // aaa est dans le top, bbb sans thème fixe
  });

  it('vue dynamiques : assignation via dynamicTheme, hors-périmètre non filtré', () => {
    const rest = restArticlesByTheme(veilleDouble, veilleDouble.dynamicThemes!, 'dynamicTheme');
    expect(rest.get('releases')?.map((a) => a.id)).toEqual(['ccc']); // aaa/bbb dans le top
    expect(rest.get('hors-perso')).toEqual([]); // ddd est dans le top
  });

  it('veille ancienne sans dynamicThemes : champ optionnel absent', () => {
    expect(veille.dynamicThemes).toBeUndefined();
    expect(restArticlesByTheme(veille, veille.themes, 'dynamicTheme').size).toBe(0);
  });
});
