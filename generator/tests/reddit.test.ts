import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchReddit } from '../src/sources/reddit.js';
import type { SourceConfig } from '../src/types.js';

const source = {
  id: 'reddit',
  name: 'Reddit',
  type: 'reddit',
  baseUrl: 'https://reddit.test',
  subreddits: ['sre'],
  limit: 25,
  enabled: true
} as Extract<SourceConfig, { type: 'reddit' }>;

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>r/sre</title>
  <item>
    <title>PostgreSQL 18 is out</title>
    <link>https://reddit.test/r/sre/comments/abc/postgres/</link>
    <pubDate>Fri, 07 Nov 2026 09:00:00 GMT</pubDate>
    <description>&lt;p&gt;Discussion about PostgreSQL 18&lt;/p&gt;</description>
  </item>
</channel></rss>`;

afterEach(() => vi.unstubAllGlobals());

describe('fetchReddit (via RSS public)', () => {
  it('mappe les nouveaux posts du subreddit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: any) => {
        expect(String(url)).toBe('https://reddit.test/r/sre/new/.rss?limit=25');
        return new Response(RSS, { status: 200, headers: { 'content-type': 'application/rss+xml' } });
      })
    );

    const articles = await fetchReddit(source, new Date('2026-11-07T10:00:00Z'));
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('PostgreSQL 18 is out');
    expect(articles[0].url).toBe('https://reddit.test/r/sre/comments/abc/postgres/');
    expect(articles[0].publishedAt).toBe('2026-11-07T09:00:00.000Z');
    expect(articles[0].excerpt).toBe('Discussion about PostgreSQL 18');
    expect(articles[0].source).toBe('reddit');
  });
});
