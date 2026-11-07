import { createServer, type Server } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { runPipeline, dedupe } from '../src/pipeline.js';
import { veilleSchema, indexSchema, type Article } from '../src/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(path.join(here, 'fixtures', name), 'utf8');

// Deux flux servis localement : feed2 reprend l'URL du premier item de feed1 (dédup)
// et ajoute un item dans la fenêtre.
const FEED2 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>f2</title>
  <item>
    <title>Sortie de Kubernetes 1.35 (doublon cross-source)</title>
    <link>https://exemple.test/k8s-1-35</link>
    <pubDate>Fri, 07 Nov 2026 08:00:00 GMT</pubDate>
    <description>doublon</description>
  </item>
  <item>
    <title>OpenTofu 1.11</title>
    <link>https://exemple.test/opentofu-1-11</link>
    <pubDate>Fri, 07 Nov 2026 09:00:00 GMT</pubDate>
    <description>Nouvelle version d'OpenTofu.</description>
  </item>
</channel></rss>`;

let server: Server;
let baseUrl: string;
let outDir: string;
let configPath: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/feed1.xml') {
      res.setHeader('content-type', 'application/rss+xml');
      res.end(fixture('feed-rss.xml'));
    } else if (req.url === '/feed2.xml') {
      res.setHeader('content-type', 'application/rss+xml');
      res.end(FEED2);
    } else {
      res.statusCode = 404;
      res.end('nope');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('pas d adresse');
  baseUrl = `http://127.0.0.1:${addr.port}`;

  outDir = mkdtempSync(path.join(tmpdir(), 'vibe-veille-test-'));
  configPath = path.join(outDir, 'sources.json');
  writeFileSync(
    configPath,
    JSON.stringify([
      { id: 'f1', name: 'Flux 1', type: 'rss', url: `${baseUrl}/feed1.xml` },
      { id: 'f2', name: 'Flux 2', type: 'rss', url: `${baseUrl}/feed2.xml` },
      { id: 'ko', name: 'Flux en panne', type: 'rss', url: `${baseUrl}/404` }
    ])
  );
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('runPipeline (intégration, serveur HTTP local)', () => {
  it('produit une veille valide : fenêtre 24h, dédup cross-source, source en échec tolérée', async () => {
    const now = new Date('2026-11-07T10:00:00Z');
    const veille = await runPipeline({ configPath, outDir, now, windowHours: 24 });

    // schéma zod
    expect(() => veilleSchema.parse(veille)).not.toThrow();

    // fenêtre : l'item du 20 octobre est exclu ; le doublon cross-source est dédupliqué
    // -> 3 articles uniques : k8s-1-35, guid-1, opentofu-1-11
    expect(veille.articles.length).toBe(3);
    const urls = veille.articles.map((a) => a.url).sort();
    expect(urls).toEqual([
      'https://exemple.test/guid-1',
      'https://exemple.test/k8s-1-35',
      'https://exemple.test/opentofu-1-11'
    ]);

    // tri par date desc
    expect(veille.articles[0].publishedAt >= veille.articles[1].publishedAt).toBe(true);

    // stats sources : la source en panne compte 0 mais est listée
    const ko = veille.sources.find((s) => s.id === 'ko');
    expect(ko?.count).toBe(0);

    // fichiers écrits
    const file = path.join(outDir, `veille-${veille.date}.json`);
    expect(existsSync(file)).toBe(true);
    const onDisk = JSON.parse(readFileSync(file, 'utf8'));
    expect(veilleSchema.parse(onDisk).articles.length).toBe(3);

    const index = JSON.parse(readFileSync(path.join(outDir, 'index.json'), 'utf8'));
    expect(indexSchema.parse(index).veilles).toHaveLength(1);
    expect(index.veilles[0].date).toBe('2026-11-07');
    expect(index.veilles[0].articlesCount).toBe(3);
  });

  it('met à jour index.json sans doublon de date', async () => {
    const now = new Date('2026-11-07T11:00:00Z');
    await runPipeline({ configPath, outDir, now, windowHours: 24 });
    const index = JSON.parse(readFileSync(path.join(outDir, 'index.json'), 'utf8'));
    expect(index.veilles).toHaveLength(1);
    expect(index.veilles[0].generatedAt).toBe('2026-11-07T11:00:00.000Z');
  });
});

describe('dedupe', () => {
  it('garde le premier article par url', () => {
    const a: Article = {
      id: '1', title: 'A', url: 'https://x.test/a', source: 's1', sourceName: 'S1',
      publishedAt: '2026-11-07T08:00:00.000Z', excerpt: '', summary: null, theme: null, score: null
    };
    const b: Article = { ...a, id: '2', source: 's2' };
    const out = dedupe([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('s1');
  });
});
