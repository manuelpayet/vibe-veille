import type { Article } from '../types.js';
import type { ThemesConfig } from './themes.js';
import type { ChatMessage } from './client.js';

// Résumé d'un article : une phrase, max ~25 mots, en français.
export function summaryMessages(article: Article): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'Tu es un SRE senior francophone qui fait de la veille technologique. Tu réponds UNIQUEMENT en JSON valide, sans texte autour.'
    },
    {
      role: 'user',
      content: `Résume cet article en UNE phrase de 25 mots maximum, en français, en disant l'essentiel pour un SRE (quoi + pourquoi c'est important).

Titre : ${article.title}
Source : ${article.sourceName}
URL : ${article.url}
Extrait : ${article.excerpt.slice(0, 1500) || "(pas d'extrait disponible)"}

JSON attendu : {"summary": "..."}`
    }
  ];
}

export interface AnalysisInputArticle {
  id: string;
  source: string;
  title: string;
  summary: string;
}

// Analyse globale : classification par thème + score + tendance + top 5 par thème.
export function analysisMessages(articles: AnalysisInputArticle[], cfg: ThemesConfig): ChatMessage[] {
  const list = articles
    .map((a) => `- id: ${a.id} | source: ${a.source} | titre: ${a.title} | résumé: ${a.summary || "(non résumé)"}`)
    .join('\n');
  const themes = cfg.themes.map((t) => `- ${t.id} : ${t.label} — ${t.description}`).join('\n');
  return [
    {
      role: 'system',
      content:
        'Tu es un analyste de veille tech pour un profil SRE / platform engineer francophone. Tu réponds UNIQUEMENT en JSON valide, sans texte autour.'
    },
    {
      role: 'user',
      content: `Voici les articles collectés aujourd'hui (veille SRE) :

${list}

Thèmes autorisés (liste fixe) :
${themes}

Hors périmètre : ${cfg.horsPerimetre}

Tâches :
1. Pour chaque article, choisir UN thème parmi la liste (id exact). Si aucun ne convient vraiment, tu peux créer un nouveau thème (id en slug anglais, label en français).
2. Donner un score de pertinence 0-100 pour ce profil SRE pro (impact plateforme, risque, utilité concrète).
3. Pour chaque thème ayant au moins 1 article : écrire une "trend" en français (2-3 phrases) résumant la tendance du jour sur ce thème, et lister le top 5 des articles du thème dans "topArticles" (ids, max 5, par score décroissant).

JSON attendu :
{
  "assignments": [{ "articleId": "...", "theme": "kubernetes", "score": 85 }],
  "themes": [{ "id": "kubernetes", "label": "Kubernetes", "trend": "...", "topArticles": ["id1", "id2"] }]
}`
    }
  ];
}

// Analyse dynamique : clustering LIBRE des articles en thèmes émergents de la
// journée (aucune liste imposée) — c'est la seconde vue de la veille. Même
// format de sortie que l'analyse fixe ; le score des assignments est ignoré ici.
export function dynamicThemesMessages(articles: AnalysisInputArticle[]): ChatMessage[] {
  const list = articles
    .map((a) => `- id: ${a.id} | source: ${a.source} | titre: ${a.title} | résumé: ${a.summary || "(non résumé)"}`)
    .join('\n');
  return [
    {
      role: 'system',
      content:
        'Tu es un analyste de veille tech pour un profil SRE / platform engineer francophone. Tu réponds UNIQUEMENT en JSON valide, sans texte autour.'
    },
    {
      role: 'user',
      content: `Voici les articles collectés aujourd'hui (veille SRE) :

${list}

Tâche : regroupe librement ces articles en THÈMES DYNAMIQUES, ceux qui émergent vraiment aujourd'hui :
1. 4 à 8 thèmes maximum, nommés d'après ce qui ressort concrètement de la liste (AUCUNE liste imposée) : id en slug anglais, label en français. Ne crée pas de thème "hors-sujet" : même les sujets hors périmètre pro (ex. inférence LLM, homelab) forment leurs propres thèmes ici.
2. Pour chaque article, un assignment vers UN thème dynamique (id exact de ta liste).
3. Pour chaque thème : écrire une "trend" en français (2-3 phrases) résumant ce qui bouge aujourd'hui sur ce sujet, et lister dans "topArticles" les ids des meilleurs articles du thème (max 5).

JSON attendu :
{
  "assignments": [{ "articleId": "...", "theme": "releases-majeures", "score": 0 }],
  "themes": [{ "id": "releases-majeures", "label": "Releases majeures", "trend": "...", "topArticles": ["id1", "id2"] }]
}`
    }
  ];
}
