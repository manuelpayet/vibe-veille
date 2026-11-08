import { z } from 'zod';

// Contrat des issues du repo privé "vibe-veille-inbox" : une issue = un article
// proposé manuellement (extension navigateur / partage Android de la PWA),
// consommée par le workflow inbox de ce repo (voir AGENTS.md).

export const INBOX_LABEL_TODO = 'a-traiter';
export const INBOX_LABEL_DONE = 'traite';
export const INBOX_LABEL_SOURCE_CANDIDATE = 'source-candidate';
export const INBOX_LABEL_SOURCE_OK = 'source-ok';
export const INBOX_LABEL_SOURCE_REFUSED = 'source-refuse';

export const inboxIssueBodySchema = z.object({
  version: z.literal(1),
  url: z.url(),
  title: z.string().min(1),
  excerpt: z.string().default(''), // extrait auto (meta description / og:description)
  publishedAt: z.string().nullable().default(null), // ISO 8601, si la page l'expose
  note: z.string().default(''), // note perso optionnelle de la capture
  addedAt: z.string(), // ISO 8601, date de la capture
  sourceDomain: z.string().min(1) // domaine de l'article, candidat comme source
});
export type InboxIssueBody = z.infer<typeof inboxIssueBodySchema>;
// Type d'entrée (champs avec .default() omissibles) pour les clients de l'inbox.
export type InboxIssueBodyInput = z.input<typeof inboxIssueBodySchema>;

// Sérialise le body d'une issue : un bloc de code json dans un texte lisible.
// Valide au passage (throw si invalide) pour attraper les erreurs côté client.
export function formatIssueBody(input: InboxIssueBodyInput): string {
  const body = inboxIssueBodySchema.parse(input);
  return [
    `Article proposé manuellement pour la veille (ajouté le ${body.addedAt}).`,
    '',
    '```json',
    JSON.stringify(body, null, 2),
    '```'
  ].join('\n');
}

// Parse défensif du body d'une issue : extrait le bloc ```json (ou le body entier
// s'il est déjà un JSON nu), valide le schéma. Retourne null si invalide
// (issue éditée à la main, schéma d'une autre version, etc.).
export function parseIssueBody(raw: string): InboxIssueBody | null {
  const match = raw.match(/```json\s*([\s\S]*?)```/i);
  const text = match ? match[1] : raw.trim();
  try {
    return inboxIssueBodySchema.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

// Extrait le domaine (host sans "www.") d'une URL, pour le candidat source.
export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
