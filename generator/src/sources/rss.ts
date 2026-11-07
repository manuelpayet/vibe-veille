import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import type { Article, SourceConfig } from '../types.js';
import { fetchText } from '../http.js';

export const MAX_EXCERPT_LENGTH = 2000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true
});

export interface RawItem {
  title: string;
  url: string;
  publishedAt: string; // ISO 8601
  excerpt: string;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoDate(raw: unknown, fallback: Date): string {
  if (typeof raw !== 'string' || raw.trim() === '') return fallback.toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
}

function atomLink(entry: Record<string, unknown>): string {
  const links = asArray(entry.link);
  const alternate = links.find((l) => (l as Record<string, unknown>)?.['@_rel'] === 'alternate') ?? links[0];
  if (!alternate) return '';
  if (typeof alternate === 'string') return alternate;
  return String((alternate as Record<string, unknown>)['@_href'] ?? '');
}

// Un élément XML avec attributs est parsé en objet { '@_attr': ..., '#text': ... }
function textOf(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && '#text' in v) return String((v as Record<string, unknown>)['#text']);
  return '';
}

// Parse un flux RSS 2.0, RSS 1.0/RDF ou Atom en items normalisés.
export function parseFeed(xml: string, fetchedAt: Date = new Date()): RawItem[] {
  const doc = parser.parse(xml) as Record<string, any>;
  if (doc['rdf:RDF']) {
    return asArray(doc['rdf:RDF'].item).map((item: Record<string, any>) => ({
      title: textOf(item.title),
      url: textOf(item.link),
      publishedAt: toIsoDate(textOf(item['dc:date']) || textOf(item.pubDate), fetchedAt),
      excerpt: stripHtml(textOf(item['content:encoded']) || textOf(item.description)).slice(0, MAX_EXCERPT_LENGTH)
    }));
  }
  if (doc.rss?.channel ?? doc.rss) {
    const channel = doc.rss.channel ?? doc.rss;
    return asArray(channel.item).map((item: Record<string, any>) => ({
      title: textOf(item.title),
      url: textOf(item.link) || textOf(item.guid),
      publishedAt: toIsoDate(textOf(item.pubDate) || textOf(item['dc:date']) || textOf(item.date), fetchedAt),
      excerpt: stripHtml(textOf(item['content:encoded']) || textOf(item.description) || textOf(item.summary)).slice(0, MAX_EXCERPT_LENGTH)
    }));
  }
  if (doc.feed) {
    return asArray(doc.feed.entry).map((entry: Record<string, any>) => ({
      title: textOf(entry.title),
      url: atomLink(entry),
      publishedAt: toIsoDate(textOf(entry.published) || textOf(entry.updated), fetchedAt),
      excerpt: stripHtml(textOf(entry.content) || textOf(entry.summary)).slice(0, MAX_EXCERPT_LENGTH)
    }));
  }
  throw new Error('Flux non reconnu (ni RSS 2.0 ni Atom)');
}

export function articleId(url: string): string {
  return createHash('sha1').update(url).digest('hex').slice(0, 12);
}

// Fetch une source RSS et produit des articles bruts (sans appel LLM).
export async function fetchRssSource(source: SourceConfig, now: Date = new Date()): Promise<Article[]> {
  const xml = await fetchText(source.url);
  const items = parseFeed(xml, now);
  return items
    .filter((it) => it.url !== '')
    .map((it) => ({
      id: articleId(it.url),
      title: it.title || it.url,
      url: it.url,
      source: source.id,
      sourceName: source.name,
      publishedAt: it.publishedAt,
      excerpt: it.excerpt,
      summary: null,
      theme: null,
      score: null
    }));
}
