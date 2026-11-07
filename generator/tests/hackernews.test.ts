import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchHackerNews } from '../src/sources/hackernews.js';
import type { SourceConfig } from '../src/types.js';

const source = {
  id: 'hn',
  name: 'Hacker News',
  type: 'hackernews',
  baseUrl: 'https://hn.test',
  limit: 3,
  enabled: true
} as Extract<SourceConfig, { type: 'hackernews' }>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchHackerNews', () => {
  it('récupère les top stories et ne garde que les stories avec URL', async () => {
    const now = new Date('2026-11-07T10:00:00Z');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: any) => {
        const u = String(url);
        if (u.endsWith('/v0/topstories.json')) return jsonResponse([101, 102, 103]);
        if (u.endsWith('/v0/item/101.json'))
          return jsonResponse({ id: 101, type: 'story', title: 'K8s 1.35', url: 'https://x.test/k8s', time: 1762520400 });
        if (u.endsWith('/v0/item/102.json')) return jsonResponse({ id: 102, type: 'comment', title: 'c' }); // ignoré
        if (u.endsWith('/v0/item/103.json')) return jsonResponse({ id: 103, type: 'story', title: 'Self post', text: '<p>hello</p>', time: 1762520500 }); // sans url -> ignoré
        return jsonResponse({}, 404);
      })
    );

    const articles = await fetchHackerNews(source, now);
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('K8s 1.35');
    expect(articles[0].url).toBe('https://x.test/k8s');
    expect(articles[0].publishedAt).toBe(new Date(1762520400 * 1000).toISOString());
    expect(articles[0].source).toBe('hn');
  });

  it('tolère un item en échec', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: any) => {
        const u = String(url);
        if (u.endsWith('/v0/topstories.json')) return jsonResponse([1, 2]);
        if (u.endsWith('/v0/item/1.json')) throw new Error('boom');
        if (u.endsWith('/v0/item/2.json'))
          return jsonResponse({ id: 2, type: 'story', title: 'OK', url: 'https://x.test/ok', time: 1762520400 });
        return jsonResponse({}, 404);
      })
    );
    const articles = await fetchHackerNews({ ...source, limit: 2 }, new Date());
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('OK');
  });
});
