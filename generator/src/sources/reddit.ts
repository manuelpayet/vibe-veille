import type { Article, SourceConfig } from '../types.js';
import { fetchText } from '../http.js';
import { articleId, parseFeed } from './rss.js';

type RedditSource = Extract<SourceConfig, { type: 'reddit' }>;

// Nouveaux posts des subreddits configurés via le flux RSS public de Reddit
// (l'API JSON renvoie souvent 403 depuis une IP datacenter).
export async function fetchReddit(source: RedditSource, now: Date = new Date()): Promise<Article[]> {
  const out: Article[] = [];
  for (const [i, sub] of source.subreddits.entries()) {
    try {
      // Reddit rate-limite agressivement : petite pause entre subreddits
      if (i > 0) await new Promise((r) => setTimeout(r, 1000));
      const xml = await fetchText(`${source.baseUrl}/r/${sub}/new/.rss?limit=${source.limit}`);
      for (const item of parseFeed(xml, now)) {
        if (!item.url) continue;
        out.push({
          id: articleId(item.url),
          title: item.title || item.url,
          url: item.url,
          source: source.id,
          sourceName: source.name,
          publishedAt: item.publishedAt,
          excerpt: item.excerpt,
          summary: null,
          theme: null,
          score: null
        });
      }
    } catch (err) {
      // un subreddit en 429/403 ne bloque pas les autres
      console.error(`[veille] reddit r/${sub} en échec:`, (err as Error).message);
    }
  }
  return out;
}
