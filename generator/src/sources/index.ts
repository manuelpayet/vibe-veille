import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { sourceConfigSchema, type Article, type SourceConfig } from '../types.js';
import { fetchRssSource } from './rss.js';
import { fetchHackerNews } from './hackernews.js';
import { fetchReddit } from './reddit.js';
import { fetchStatuspage } from './statuspage.js';

export function loadSources(configPath: string): SourceConfig[] {
  const raw = JSON.parse(readFileSync(configPath, 'utf8'));
  const sources = z.array(sourceConfigSchema).parse(raw);
  return sources.filter((s) => s.enabled);
}

export type Fetcher = (source: SourceConfig, now: Date) => Promise<Article[]>;

export function getFetcher(source: SourceConfig): Fetcher {
  switch (source.type) {
    case 'rss':
      return (s, now) => fetchRssSource(s as Extract<SourceConfig, { type: 'rss' }>, now);
    case 'hackernews':
      return (s, now) => fetchHackerNews(s as Extract<SourceConfig, { type: 'hackernews' }>, now);
    case 'reddit':
      return (s, now) => fetchReddit(s as Extract<SourceConfig, { type: 'reddit' }>, now);
    case 'statuspage':
      return (s, now) => fetchStatuspage(s as Extract<SourceConfig, { type: 'statuspage' }>, now);
  }
}
