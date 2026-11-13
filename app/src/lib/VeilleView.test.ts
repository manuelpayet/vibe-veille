import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import VeilleView from './VeilleView.svelte';
import type { Veille } from './types.js';

const art = (id: string, title: string, theme: string | null, dynamicTheme: string | null, score: number | null) => ({
  id,
  title,
  url: `https://ext.test/${id}`,
  source: 'hn',
  sourceName: 'Hacker News',
  publishedAt: '2026-11-07T08:00:00.000Z',
  excerpt: '',
  summary: `Résumé ${id}.`,
  theme,
  dynamicTheme,
  score
});

const veille: Veille = {
  date: '2026-11-07',
  generatedAt: '2026-11-07T07:05:00.000Z',
  window: { from: '2026-11-06T07:00:00.000Z', to: '2026-11-07T07:05:00.000Z' },
  sources: [{ id: 'hn', name: 'Hacker News', count: 2 }],
  articles: [
    art('aaaaaaa11111', 'Kubernetes 1.35 released', 'kubernetes', 'releases-majeures', 95),
    art('ddddddd44444', 'Show HN fixture', 'hors-sujet', 'hors-perso', 10)
  ],
  themes: [{ id: 'kubernetes', label: 'Kubernetes', trend: 'Tendance fixe.', topArticles: ['aaaaaaa11111'] }],
  dynamicThemes: [
    { id: 'releases-majeures', label: 'Releases majeures', trend: 'Tendance dynamique.', topArticles: ['aaaaaaa11111'] },
    { id: 'hors-perso', label: 'Hors périmètre pro', trend: 'Hors pro.', topArticles: ['ddddddd44444'] }
  ],
  stats: { llmCalls: 4, promptTokens: 1000, completionTokens: 200, estimatedCostEur: 0.03 }
};

describe('VeilleView (rendu SSR)', () => {
  it('affiche la bascule et la vue prédéfinis par défaut (dynamiques masqués)', () => {
    const { body } = render(VeilleView, { props: { veille } });
    expect(body).toContain('Prédéfinis');
    expect(body).toContain('Dynamiques');
    expect(body).toContain('aria-pressed="true"');
    // vue par défaut : thème prédéfini visible, thèmes dynamiques absents
    expect(body).toContain('Kubernetes');
    expect(body).toContain('Kubernetes 1.35 released');
    expect(body).not.toContain('Releases majeures');
    expect(body).not.toContain('Hors périmètre pro');
    // le hors-sujet n'est pas affiché en vue prédéfinis
    expect(body).not.toContain('Show HN fixture');
  });

  it('veille sans dynamicThemes (veille ancienne) : pas de bascule, vue prédéfinis seule', () => {
    const { body } = render(VeilleView, { props: { veille: { ...veille, dynamicThemes: undefined } } });
    expect(body).not.toContain('view-toggle');
    expect(body).not.toContain('Dynamiques');
    expect(body).toContain('Kubernetes');
  });

  it('veille sans aucun thème : liste plate de secours', () => {
    const { body } = render(VeilleView, {
      props: { veille: { ...veille, themes: [], dynamicThemes: [] } }
    });
    expect(body).toContain('Aucun thème détecté');
    expect(body).toContain('Kubernetes 1.35 released');
  });
});
