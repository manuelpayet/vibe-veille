import { createServer, type Server } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { runPipeline } from '../src/pipeline.js';
import { veilleSchema } from '../src/types.js';

// Serveur local qui émule l'API HN, le JSON Reddit et une status page,
// pour valider le pipeline multi-sources de bout en bout.
let server: Server;
let baseUrl: string;
let outDir: string;
let configPath: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const u = req.url ?? '';
    const json = (body: unknown) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (u === '/hn/v0/topstories.json') return json([1, 2]);
    if (u === '/hn/v0/item/1.json')
      return json({ id: 1, type: 'story', title: 'HN story A', url: 'https://ext.test/a', time: 1794042000 });
    if (u === '/hn/v0/item/2.json')
      return json({ id: 2, type: 'story', title: 'HN story B', url: 'https://ext.test/b', time: 1794042600 });
    if (u.startsWith('/reddit/r/sre/new/.rss')) {
      res.setHeader('content-type', 'application/rss+xml');
      return res.end(
        '<?xml version="1.0"?><rss version="2.0"><channel><item><title>Reddit post</title><link>https://ext.test/a</link><pubDate>Fri, 07 Nov 2026 09:00:00 GMT</pubDate><description>rediscussion</description></item></channel></rss>'
      );
    }
    if (u.startsWith('/status/api/v2/incidents.json'))
      return json([{ id: 'i1', name: 'Incident X', shortlink: 'https://ext.test/incident-x', created_at: '2026-11-07T07:00:00Z', incident_updates: [{ body: 'investigating' }] }]);
    if (u === '/feed.xml') {
      res.setHeader('content-type', 'application/rss+xml');
      return res.end(
        '<?xml version="1.0"?><rss version="2.0"><channel><item><title>RSS post</title><link>https://ext.test/rss</link><pubDate>Fri, 07 Nov 2026 08:00:00 GMT</pubDate><description>d</description></item></channel></rss>'
      );
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('pas d adresse');
  baseUrl = `http://127.0.0.1:${addr.port}`;

  outDir = mkdtempSync(path.join(tmpdir(), 'vibe-veille-sources-'));
  configPath = path.join(outDir, 'sources.json');
  writeFileSync(
    configPath,
    JSON.stringify([
      { id: 'hn', name: 'HN', type: 'hackernews', baseUrl: `${baseUrl}/hn`, limit: 5 },
      { id: 'reddit', name: 'Reddit', type: 'reddit', baseUrl: `${baseUrl}/reddit`, subreddits: ['sre'], limit: 10 },
      { id: 'status', name: 'Status', type: 'statuspage', apiBase: `${baseUrl}/status` },
      { id: 'rss', name: 'RSS', type: 'rss', url: `${baseUrl}/feed.xml` }
    ])
  );
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('pipeline multi-sources (intégration)', () => {
  it('agrège HN + Reddit + statuspage + RSS avec dédup cross-source', async () => {
    const now = new Date('2026-11-07T10:00:00Z'); // fenêtre 24h : tout passe
    const veille = await runPipeline({ configPath, outDir, now, windowHours: 24 });
    expect(() => veilleSchema.parse(veille)).not.toThrow();

    const bySource = Object.fromEntries(veille.sources.map((s) => [s.id, s.count]));
    expect(bySource).toEqual({ hn: 2, reddit: 1, status: 1, rss: 1 });

    // le post Reddit pointe vers https://ext.test/a, déjà vu côté HN -> dédupliqué
    const urls = veille.articles.map((a) => a.url).sort();
    expect(urls).toEqual(['https://ext.test/a', 'https://ext.test/b', 'https://ext.test/incident-x', 'https://ext.test/rss']);

    // l'article dédupliqué garde la première source rencontrée (ordre du config : hn avant reddit)
    const a = veille.articles.find((x) => x.url === 'https://ext.test/a');
    expect(a?.source).toBe('hn');
  });
});
