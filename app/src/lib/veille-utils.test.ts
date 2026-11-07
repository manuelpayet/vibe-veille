import { describe, it, expect } from 'vitest';
import { articleMap, formatDateFR, sourceLabel } from './veille-utils.js';
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
