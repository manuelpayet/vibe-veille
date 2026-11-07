import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseFeed, stripHtml, articleId, MAX_EXCERPT_LENGTH } from '../src/sources/rss.js';
import type { SourceConfig } from '../src/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(path.join(here, 'fixtures', name), 'utf8');

describe('stripHtml', () => {
  it('retire les balises et décode les entités', () => {
    expect(stripHtml('<p>Bonjour &amp; <b>monde</b>!</p>')).toBe('Bonjour & monde !');
  });
});

describe('parseFeed RSS 2.0', () => {
  const items = parseFeed(fixture('feed-rss.xml'), new Date('2026-11-07T10:00:00Z'));

  it('parse tous les items', () => {
    expect(items).toHaveLength(3);
  });

  it('normalise titre, url et date en ISO', () => {
    expect(items[0].title).toBe('Sortie de Kubernetes 1.35');
    expect(items[0].url).toBe('https://exemple.test/k8s-1-35');
    expect(items[0].publishedAt).toBe('2026-11-07T08:00:00.000Z');
  });

  it('préfère content:encoded et retire le HTML', () => {
    expect(items[0].excerpt).toBe('La release 1.35 de Kubernetes arrive avec des changements de sécurité.');
  });

  it('utilise le guid comme url de secours', () => {
    expect(items[2].url).toBe('https://exemple.test/guid-1');
  });
});

describe('parseFeed Atom', () => {
  it('parse les entrées Atom', () => {
    const items = parseFeed(fixture('feed-atom.xml'), new Date('2026-11-07T10:00:00Z'));
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Grafana 12.2 disponible');
    expect(items[0].url).toBe('https://exemple-atom.test/grafana-12-2');
    expect(items[0].publishedAt).toBe('2026-11-07T07:15:00.000Z');
    expect(items[0].excerpt).toContain('Grafana 12.2 est sorti');
  });
});

describe('parseFeed invalide', () => {
  it('rejette un document qui n est ni RSS ni Atom', () => {
    expect(() => parseFeed('<html><body>nope</body></html>')).toThrow(/non reconnu/);
  });
});

describe('articleId / troncature', () => {
  it('produit un id stable', () => {
    expect(articleId('https://exemple.test/a')).toBe(articleId('https://exemple.test/a'));
    expect(articleId('https://exemple.test/a')).not.toBe(articleId('https://exemple.test/b'));
  });

  it('tronque les extraits trop longs', () => {
    const long = '<p>' + 'a'.repeat(MAX_EXCERPT_LENGTH + 500) + '</p>';
    const [item] = parseFeed(
      `<?xml version="1.0"?><rss version="2.0"><channel><item><title>t</title><link>https://x.test/1</link><pubDate>Fri, 07 Nov 2026 08:00:00 GMT</pubDate><description>${long}</description></item></channel></rss>`
    );
    expect(item.excerpt.length).toBeLessThanOrEqual(MAX_EXCERPT_LENGTH);
  });
});

describe('SourceConfig', () => {
  it('accepte une source rss valide', () => {
    const src: SourceConfig = {
      id: 'test',
      name: 'Test',
      type: 'rss',
      url: 'https://exemple.test/feed.xml',
      enabled: true
    };
    expect(src.type).toBe('rss');
  });
});
