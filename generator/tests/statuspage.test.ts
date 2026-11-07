import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchStatuspage } from '../src/sources/statuspage.js';
import type { SourceConfig } from '../src/types.js';

const source = {
  id: 'cf-status',
  name: 'Cloudflare Status',
  type: 'statuspage',
  apiBase: 'https://status.test',
  limit: 20,
  enabled: true
} as Extract<SourceConfig, { type: 'statuspage' }>;

afterEach(() => vi.unstubAllGlobals());

describe('fetchStatuspage', () => {
  it('mappe les incidents avec la dernière mise à jour en excerpt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: any) => {
        expect(String(url)).toBe('https://status.test/api/v2/incidents.json?limit=20');
        return new Response(
          JSON.stringify([
            {
              id: 'inc1',
              name: 'Elevated API errors',
              shortlink: 'https://status.test/incidents/inc1',
              created_at: '2026-11-07T06:00:00Z',
              incident_updates: [{ body: '<p>We are investigating.</p>' }, { body: '<p>Older update</p>' }]
            }
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      })
    );

    const articles = await fetchStatuspage(source, new Date('2026-11-07T10:00:00Z'));
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Elevated API errors');
    expect(articles[0].url).toBe('https://status.test/incidents/inc1');
    expect(articles[0].excerpt).toBe('We are investigating.');
    expect(articles[0].publishedAt).toBe('2026-11-07T06:00:00.000Z');
  });

  it('gère une réponse vide ou invalide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('null', { status: 200 })));
    const articles = await fetchStatuspage(source);
    expect(articles).toEqual([]);
  });
});
