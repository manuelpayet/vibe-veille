import { describe, it, expect } from 'vitest';
import {
  formatIssueBody,
  parseIssueBody,
  domainOf,
  INBOX_LABEL_TODO,
  INBOX_LABEL_DONE,
  INBOX_LABEL_SOURCE_CANDIDATE,
  INBOX_LABEL_SOURCE_OK,
  INBOX_LABEL_SOURCE_REFUSED
} from '../src/inbox/schema.js';
import { articleSchema } from '../src/types.js';

const sample = {
  version: 1 as const,
  url: 'https://blog.exemple.test/article-k8s',
  title: 'Un article intéressant',
  excerpt: "Un extrait de l'article.",
  publishedAt: '2026-11-05T08:00:00.000Z',
  note: 'vu sur HN',
  addedAt: '2026-11-08T09:30:00.000Z',
  sourceDomain: 'blog.exemple.test'
};

describe('labels de l’inbox', () => {
  it('sont stables (contrat avec le workflow du repo inbox)', () => {
    expect([INBOX_LABEL_TODO, INBOX_LABEL_DONE, INBOX_LABEL_SOURCE_CANDIDATE, INBOX_LABEL_SOURCE_OK, INBOX_LABEL_SOURCE_REFUSED])
      .toEqual(['a-traiter', 'traite', 'source-candidate', 'source-ok', 'source-refuse']);
  });
});

describe('formatIssueBody / parseIssueBody', () => {
  it('fait un aller-retour', () => {
    expect(parseIssueBody(formatIssueBody(sample))).toEqual(sample);
  });

  it('accepte un body avec du texte autour du bloc json', () => {
    const raw = `Ajouté depuis Chrome.\n\n\`\`\`json\n${JSON.stringify(sample)}\n\`\`\`\n`;
    expect(parseIssueBody(raw)).toEqual(sample);
  });

  it('accepte un body qui est un JSON nu (sans fence)', () => {
    expect(parseIssueBody(JSON.stringify(sample))).toEqual(sample);
  });

  it('applique les défauts (excerpt/note vides, publishedAt null)', () => {
    const minimal = {
      version: 1 as const,
      url: 'https://exemple.test/a',
      title: 't',
      addedAt: '2026-11-08T00:00:00.000Z',
      sourceDomain: 'exemple.test'
    };
    const parsed = parseIssueBody(formatIssueBody(minimal));
    expect(parsed).toMatchObject({ excerpt: '', note: '', publishedAt: null });
  });

  it('retourne null si pas de JSON valide', () => {
    expect(parseIssueBody('pas de json ici')).toBeNull();
    expect(parseIssueBody('```json\n{invalid\n```')).toBeNull();
    expect(parseIssueBody('')).toBeNull();
  });

  it('retourne null si version != 1 ou url invalide', () => {
    const badVersion = '```json\n' + JSON.stringify({ ...sample, version: 2 }) + '\n```';
    expect(parseIssueBody(badVersion)).toBeNull();
    const badUrl = '```json\n' + JSON.stringify({ ...sample, url: 'pas-une-url' }) + '\n```';
    expect(parseIssueBody(badUrl)).toBeNull();
  });

  it('formatIssueBody throw si le payload est invalide', () => {
    expect(() => formatIssueBody({ ...sample, url: 'pas-une-url' })).toThrow();
  });
});

describe('domainOf', () => {
  it('extrait le host sans www, sans le port ni le path', () => {
    expect(domainOf('https://www.blog.exemple.test:8443/a/b?c=1')).toBe('blog.exemple.test');
    expect(domainOf('https://exemple.test/')).toBe('exemple.test');
  });

  it('retourne null sur une url invalide', () => {
    expect(domainOf('pas une url')).toBeNull();
  });
});

describe('articleSchema (rétrocompat inbox)', () => {
  const base = {
    id: 'abc123',
    title: 't',
    url: 'https://exemple.test/a',
    source: 's',
    sourceName: 'S',
    publishedAt: '2026-11-07T00:00:00.000Z',
    excerpt: 'e',
    summary: null,
    theme: null,
    score: null
  };

  it('accepte un article collecté sans champs manuels (veilles existantes)', () => {
    const a = articleSchema.parse(base);
    expect(a.origin).toBeUndefined();
    expect(a.note).toBeUndefined();
    expect(a.addedAt).toBeUndefined();
  });

  it('accepte un article manuel avec origin/note/addedAt', () => {
    const a = articleSchema.parse({ ...base, origin: 'manuel', note: 'note perso', addedAt: '2026-11-08T09:30:00.000Z' });
    expect(a.origin).toBe('manuel');
    expect(a.note).toBe('note perso');
    expect(a.addedAt).toBe('2026-11-08T09:30:00.000Z');
  });

  it('rejette une origin inconnue', () => {
    expect(() => articleSchema.parse({ ...base, origin: 'spam' })).toThrow();
  });
});
