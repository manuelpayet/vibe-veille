import type { Article, SourceConfig } from '../types.js';
import { fetchJson } from '../http.js';
import { articleId, stripHtml, MAX_EXCERPT_LENGTH } from './rss.js';

type StatusSource = Extract<SourceConfig, { type: 'statuspage' }>;

// Incidents récents d'une status page hébergée sur statuspage.io (API v2 publique).
export async function fetchStatuspage(source: StatusSource, now: Date = new Date()): Promise<Article[]> {
  const incidents = (await fetchJson(`${source.apiBase}/api/v2/incidents.json?limit=${source.limit}`)) as any[];
  const list = Array.isArray(incidents) ? incidents : [];
  return list.map((inc) => {
    const updates = Array.isArray(inc.incident_updates) ? inc.incident_updates : [];
    const latest = updates[0];
    const url =
      typeof inc.shortlink === 'string' && inc.shortlink !== ''
        ? inc.shortlink
        : `${source.apiBase}/incidents/${inc.id}`;
    const date = inc.created_at ?? inc.updated_at;
    return {
      id: articleId(url),
      title: String(inc.name ?? url),
      url,
      source: source.id,
      sourceName: source.name,
      publishedAt: new Date(date ?? now).toISOString(),
      excerpt: stripHtml(String(latest?.body ?? '')).slice(0, MAX_EXCERPT_LENGTH),
      summary: null,
      theme: null,
      score: null
    };
  });
}
