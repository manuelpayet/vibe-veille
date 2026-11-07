import type { Article, SourceConfig } from '../types.js';
import { fetchJson, mapLimit } from '../http.js';
import { articleId, stripHtml, MAX_EXCERPT_LENGTH } from './rss.js';

type HnSource = Extract<SourceConfig, { type: 'hackernews' }>;

interface HnItem {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  text?: string;
  time?: number;
  score?: number;
}

// Top stories HN via l'API officielle (un appel /v0/item/<id> par story, concurrence limitée).
export async function fetchHackerNews(source: HnSource, now: Date = new Date()): Promise<Article[]> {
  const ids = (await fetchJson(`${source.baseUrl}/v0/topstories.json`)) as number[];
  const picked = ids.slice(0, source.limit);
  const items = await mapLimit(picked, 6, async (id): Promise<HnItem | null> => {
    try {
      return (await fetchJson(`${source.baseUrl}/v0/item/${id}.json`)) as HnItem;
    } catch {
      return null;
    }
  });
  return items
    .filter((it): it is HnItem => !!it && it.type === 'story' && typeof it.url === 'string')
    .map((it) => ({
      id: articleId(it.url!),
      title: it.title ?? it.url!,
      url: it.url!,
      source: source.id,
      sourceName: source.name,
      publishedAt: new Date((it.time ?? now.getTime() / 1000) * 1000).toISOString(),
      excerpt: stripHtml(it.text ?? '').slice(0, MAX_EXCERPT_LENGTH),
      summary: null,
      theme: null,
      score: null
    }));
}
