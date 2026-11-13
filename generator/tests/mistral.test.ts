import { createServer, type Server } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, it, expect } from 'vitest';
import { chat } from '../src/mistral/client.js';
import { enrichWithLlm } from '../src/mistral/analyze.js';
import { loadThemesConfig } from '../src/mistral/themes.js';
import { runPipeline } from '../src/pipeline.js';
import { veilleSchema, type Article } from '../src/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Serveur local qui émule à la fois une source RSS et l'API Mistral.
let server: Server;
let baseUrl: string;
let mistralHits: { model: string; body: any }[] = [];
let failFirstWith429 = false;
let nullContentOnce = false;
let nullContentForLarge = false;

beforeAll(async () => {
  server = createServer((req, res) => {
    const u = req.url ?? '';
    if (u === '/feed.xml') {
      res.setHeader('content-type', 'application/rss+xml');
      return res.end(
        '<?xml version="1.0"?><rss version="2.0"><channel>' +
          '<item><title>Article A</title><link>https://ext.test/a</link><pubDate>Fri, 07 Nov 2026 08:00:00 GMT</pubDate><description>contenu A</description></item>' +
          '<item><title>Article B</title><link>https://ext.test/b</link><pubDate>Fri, 07 Nov 2026 09:00:00 GMT</pubDate><description>contenu B</description></item>' +
          '</channel></rss>'
      );
    }
    if (u === '/chat/completions' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const body = JSON.parse(raw);
        mistralHits.push({ model: body.model, body });
        if (failFirstWith429) {
          failFirstWith429 = false;
          res.writeHead(429, { 'retry-after': '0', 'content-type': 'application/json' });
          return res.end('{"error":"rate limited"}');
        }
        const prompt = body.messages.map((m: any) => m.content).join('\n');
        if ((nullContentOnce || (nullContentForLarge && body.model.includes('large')))) {
          nullContentOnce = false;
          res.setHeader('content-type', 'application/json');
          return res.end(JSON.stringify({
            choices: [{ message: { content: null }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 100, completion_tokens: 0, total_tokens: 100 }
          }));
        }
        let content: string;
        if (body.model.includes('small') && !prompt.includes('Thèmes autorisés')) {
          content = JSON.stringify({ summary: 'Résumé mock FR.' });
        } else {
          // extrait les ids d'articles présents dans le prompt pour construire la réponse
          const ids = [...prompt.matchAll(/- id: ([a-f0-9]{12})/g)].map((m) => m[1]);
          content = JSON.stringify({
            assignments: ids.map((id, i) => ({ articleId: id, theme: i === 0 ? 'hors-sujet' : 'kubernetes', score: 90 - i })),
            themes: [
              { id: 'kubernetes', label: 'Kubernetes', trend: 'Tendance mock : grosse activité K8s.', topArticles: ids.slice(1) },
              { id: 'hors-sujet', label: 'Hors sujet', trend: 'hors périmètre', topArticles: ids.slice(0, 1) }
            ]
          });
        }
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({
          choices: [{ message: { content } }],
          usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 }
        }));
      });
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('pas d adresse');
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

afterEach(() => {
  mistralHits = [];
  failFirstWith429 = false;
  nullContentOnce = false;
  nullContentForLarge = false;
  delete process.env.MISTRAL_API_KEY;
  delete process.env.MISTRAL_BASE_URL;
});

describe('client Mistral', () => {
  it('appelle /chat/completions avec la clé et renvoie contenu + usage', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    const r = await chat([{ role: 'user', content: 'hello' }], { model: 'mistral-small-latest', json: true, baseUrl: baseUrl });
    expect(r.content).toContain('summary');
    expect(r.usage.totalTokens).toBe(120);
    expect(mistralHits[0].body.response_format).toEqual({ type: 'json_object' });
  });

  it('retry sur 429 puis succès', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    failFirstWith429 = true;
    const r = await chat([{ role: 'user', content: 'hello' }], { model: 'mistral-small-latest', baseUrl: baseUrl, retries: 2 });
    expect(r.usage.totalTokens).toBe(120);
    expect(mistralHits.length).toBe(2);
  });

  it('échoue proprement sans MISTRAL_API_KEY', async () => {
    await expect(chat([{ role: 'user', content: 'x' }], { model: 'mistral-small-latest', baseUrl: baseUrl })).rejects.toThrow(/MISTRAL_API_KEY/);
  });

  it('retry sur une réponse 200 sans contenu texte, puis succès', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    nullContentOnce = true;
    const r = await chat([{ role: 'user', content: 'hello' }], { model: 'mistral-small-latest', baseUrl: baseUrl, retries: 2 });
    expect(r.content).toContain('summary');
    expect(mistralHits.length).toBe(2);
  });

  it('échoue avec diagnostic si le contenu reste absent après les retries', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    nullContentForLarge = true;
    await expect(
      chat([{ role: 'user', content: 'hello' }], { model: 'mistral-large-latest', baseUrl: baseUrl, retries: 1 })
    ).rejects.toThrow(/sans contenu texte.*finish_reason=stop/s);
  });
});

describe('enrichWithLlm + pipeline LLM (API mockée)', () => {
  it('produit résumés, thèmes, top 5 et stats ; hors-sujet exclu des thèmes', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    const themesConfig = loadThemesConfig(path.join(here, '..', 'config', 'themes.json'));
    expect(themesConfig.themes.length).toBeGreaterThan(5);

    const outDir = mkdtempSync(path.join(tmpdir(), 'vibe-veille-llm-'));
    const configPath = path.join(outDir, 'sources.json');
    writeFileSync(configPath, JSON.stringify([{ id: 'rss', name: 'RSS', type: 'rss', url: `${baseUrl}/feed.xml` }]));

    const veille = await runPipeline({
      configPath,
      outDir,
      now: new Date('2026-11-07T10:00:00Z'),
      windowHours: 24,
      themesPath: path.join(here, '..', 'config', 'themes.json'),
      mistralBaseUrl: baseUrl
    });

    expect(() => veilleSchema.parse(veille)).not.toThrow();
    // 2 résumés (small) + 1 analyse (large)
    expect(veille.stats?.llmCalls).toBe(3);
    expect(veille.stats?.promptTokens).toBe(300);
    expect(veille.stats && veille.stats.estimatedCostEur > 0).toBe(true);

    const arts = veille.articles;
    expect(arts.every((a) => a.summary === 'Résumé mock FR.')).toBe(true);
    expect(arts[0].theme).toBe('hors-sujet');
    expect(arts[1].theme).toBe('kubernetes');
    expect(arts[1].score).toBe(89);

    // hors-sujet exclu ; kubernetes présent avec top <= 5
    expect(veille.themes.map((t) => t.id)).toEqual(['kubernetes']);
    expect(veille.themes[0].topArticles.length).toBeLessThanOrEqual(5);
    expect(veille.themes[0].topArticles).toContain(arts[1].id);
    expect(veille.themes[0].trend).toContain('Tendance mock');

    // le prompt d'analyse contient bien la liste fixe des thèmes pro
    const analysisCall = mistralHits.find((h) => h.model.includes('large'));
    expect(analysisCall).toBeDefined();
    const prompt = analysisCall!.body.messages.map((m: any) => m.content).join('\n');
    expect(prompt).toContain('ccaas-genesys');
    expect(prompt).toContain('kubernetes');
    expect(prompt).toContain('vLLM'); // consigne hors périmètre pro

    // le JSON écrit sur disque est valide aussi
    const onDisk = JSON.parse(readFileSync(path.join(outDir, `veille-${veille.date}.json`), 'utf8'));
    veilleSchema.parse(onDisk);
  });

  it('enrichWithLlm : un résumé en échec ne bloque pas les autres', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    const themesConfig = loadThemesConfig(path.join(here, '..', 'config', 'themes.json'));
    const articles: Article[] = [
      { id: 'aaaaaaaaaaaa', title: 'A', url: 'https://x.test/a', source: 's', sourceName: 'S', publishedAt: '2026-11-07T08:00:00.000Z', excerpt: 'x', summary: null, theme: null, score: null }
    ];
    const { themes, stats } = await enrichWithLlm(articles, themesConfig, { baseUrl: baseUrl });
    expect(stats.llmCalls).toBe(2); // 1 résumé + 1 analyse
    expect(articles[0].summary).toBe('Résumé mock FR.');
    expect(themes.length).toBeGreaterThanOrEqual(0);
  });

  it('enrichWithLlm : repli sur le modèle summary si l analyse large renvoie sans contenu texte', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    nullContentForLarge = true;
    const themesConfig = loadThemesConfig(path.join(here, '..', 'config', 'themes.json'));
    const articles: Article[] = [
      { id: 'aaaaaaaaaaaa', title: 'A', url: 'https://x.test/a', source: 's', sourceName: 'S', publishedAt: '2026-11-07T08:00:00.000Z', excerpt: 'x', summary: null, theme: null, score: null },
      { id: 'bbbbbbbbbbbb', title: 'B', url: 'https://x.test/b', source: 's', sourceName: 'S', publishedAt: '2026-11-07T09:00:00.000Z', excerpt: 'y', summary: null, theme: null, score: null }
    ];
    const { themes } = await enrichWithLlm(articles, themesConfig, { baseUrl: baseUrl, retries: 0 });
    const isAnalysis = (h: { body: any }) => h.body.messages.map((m: any) => m.content).join('\n').includes('Thèmes autorisés');
    expect(mistralHits.filter((h) => h.model.includes('large') && isAnalysis(h)).length).toBe(1);
    expect(mistralHits.filter((h) => h.model.includes('small') && isAnalysis(h)).length).toBe(1);
    expect(themes.map((t) => t.id)).toContain('kubernetes');
    expect(articles.every((a) => a.theme !== null && a.score !== null)).toBe(true);
  });
});
