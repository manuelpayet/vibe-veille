# AGENTS.md — vibe-veille

> **Règle d'or : ce fichier doit rester à jour.** À chaque modification du repo
> (nouveau module, changement de workflow, de schéma de données, de commande, de piège),
> mettre à jour la section concernée de ce AGENTS.md **dans le même commit**.
> Une nouvelle session ne doit rien avoir à redécouvrir.

## C'est quoi

Veille SRE quotidienne, 100 % statique, hébergée sur GitHub Pages
(`https://manuelpayet.github.io/vibe-veille/`, repo `manuelpayet/vibe-veille`, public).
Un workflow GitHub Actions collecte des sources tech, l'API Mistral résume/structure,
le résultat est commité dans `data/` et publié sous forme de PWA SvelteKit, avec
notification ntfy.sh.

## Architecture

```
generator/   package Node/TS (workspace npm) exécuté par le workflow "veille"
             src/sources/   fetchers : rss (RSS2.0/Atom/RDF), hackernews (API v0),
                            reddit (RSS .rss par subreddit), statuspage (API statuspage.io)
             src/mistral/   client API chat completions (retry 429/backoff, json_object),
                            prompts FR, analyze.ts (résumés small + analyse large)
             src/pipeline.ts  collecte -> fenêtre 24h -> dédup par URL -> LLM -> data/
             src/output.ts    écrit data/veille-<date>.json + index.json
             config/          sources.json (liste des sources), themes.json (thèmes fixes pro)
             scripts/         check-sources.ts (testeur de sources), peek.ts (sonde d'URL)
app/         PWA SvelteKit 3 (SPA, adapter-static, fallback 404.html)
             src/lib/VeilleView.svelte  layout B : sidebar thèmes (paysage) /
                                       chips sticky (portrait) + grille de cartes
             src/lib/api.ts   BASE (base path) + fetchIndex/fetchVeille
             src/lib/notifications.ts  badge "Nouveau" (localStorage) + lien ntfy
             src/service-worker.js     précache + stale-while-revalidate (ignoreVary!)
             scripts/sync-data.mjs     copie repo data/ -> app/static/data (prebuild)
             static/                   manifest.webmanifest, icons/, config.json (généré au deploy)
data/        veilles commitées par le bot (tout l'historique conservé)
e2e/         tests Playwright + fixtures (e2e/fixtures/data)
.github/workflows/  ci.yml (typecheck+tests+build+dry-run+e2e), veille.yml (cron 07:00 UTC
                    + manuel : génère, commit data/, notif ntfy), deploy-pages.yml (push main)
```

## Commandes

```bash
npm ci
npm run typecheck          # tsc (generator) + svelte-check (app)
npm test                   # unitaires generator + app
npm run test:e2e           # Playwright : build fixtures + preview local
npm run build              # build le site (prebuild embarque data/)
npm run dev                # dev server app
npm run start -w generator                      # veille réelle (MISTRAL_API_KEY requis)
npm run start -w generator -- --no-llm --out /tmp/x   # dry-run sans LLM
npm run check-sources -w generator              # teste toutes les sources
```

## Conventions

- Travail par **incréments testés puis commités** (un commit par incrément, push sur
  `main` après validation de l'utilisateur).
- Tests : unitaires (vitest) + intégration (serveurs HTTP locaux / fetch stubé) +
  e2e Playwright (fixtures dans `e2e/fixtures/`). Toujours lancer `npm run typecheck`,
  `npm test`, `npm run test:e2e` avant de commit.
- Commits en français, format du repo (ne pas toucher au tag co-auteur ajouté par l'outil).
- UI et contenus en **français**. Thème sombre uniquement.
- Ne JAMAIS committer de secret : `mistral-api-key.txt` et `*.pem` sont gitignorés.

## Schéma d'une veille (`data/veille-<date>.json`)

```json
{
  "date": "YYYY-MM-DD", "generatedAt": "ISO",
  "window": { "from": "ISO", "to": "ISO" },
  "sources": [{ "id": "...", "name": "...", "count": 0 }],
  "articles": [{ "id": "sha1(url)[:12]", "title": "...", "url": "...", "source": "...",
                 "sourceName": "...", "publishedAt": "ISO", "excerpt": "...",
                 "summary": "résumé FR (LLM) | null", "theme": "... | null", "score": 0-100 | null }],
  "themes": [{ "id": "...", "label": "...", "trend": "2-3 phrases FR", "topArticles": ["id", "... max 5"] }],
  "stats": { "llmCalls": 0, "promptTokens": 0, "completionTokens": 0, "estimatedCostEur": 0 }
}
```
`data/index.json` = `{ "veilles": [{ date, generatedAt, file, articlesCount, sourcesCount }] }` (tri date desc).

## Pièges connus (ne pas les redécouvrir)

- **Base path GitHub Pages projet** : le site est servi sous `/vibe-veille/`. Le build de
  déploiement passe `VIBE_VEILLE_BASE=/vibe-veille` (voir `deploy-pages.yml`) →
  `paths.base` + `paths.relative=false` dans `app/vite.config.ts`. Côté client, utiliser
  `BASE` (`app/src/lib/api.ts`, normalisé en chemin absolu) pour toutes les URLs internes.
  En local/e2e : pas de base (racine `/`).
- **SvelteKit 3** : plus de `svelte.config.js` (config dans le plugin `sveltekit()` du
  vite.config) ; `$lib` supprimé → subpath imports `#lib` déclarés dans `app/package.json` ;
  `$app/*` (ex: `$app/manifest`, `$app/env`) ne fonctionnent que dans les modules résolus
  par le plugin kit (ex: le service worker) — dans le code app, préférer `import.meta.env.BASE_URL`.
  `import.meta.env.BASE_URL` vaut `./` quand base est vide → toujours normaliser.
- **Service worker** : `$service-worker` supprimé en v3 ; utiliser `$app/manifest`/`$app/env`.
  `caches.match(..., { ignoreVary: true })` sinon les `import()` module échouent hors-ligne
  (Vary: Origin). Précache en chemins relatifs au SW (`./`, `404.html`).
- **`app/scripts/sync-data.mjs`** : chemin source = `../data` (relatif à `app/`), destination
  vidée avant copie (ne pas mélanger fixtures e2e et vraies données).
- **ntfy web push cross-origin** : impossible depuis la PWA (limite Push API) → la notif
  proactive passe par l'app ntfy (web `ntfy.sh/app` ou mobile) ; la PWA a le badge « Nouveau ».
  Au clic, l'en-tête `Click` ouvre `$SITE_URL` (variable de repo `SITE_URL`, fallback URL Pages) :
  PC = onglet navigateur, Android = PWA installée (scope), iOS = Safari.
- **Reddit** rate-limite les IPs datacenter (429) : toléré par subreddit, ne pas s'alarmer.
- **Sources sans RSS public** : Azure Updates, blog GCP, blog Genesys (leur actu passe par
  AWS What's New / HN / Reddit / releases GitHub). `npm run check-sources -w generator` pour valider.
- **LLM** : `mistral-small-latest` = résumé par article, `mistral-large-latest` = analyse globale.
  Le parsing de la réponse d'analyse est défensif (`parseAnalysisOutput`) ; en cas d'échec total,
  la veille sort sans thèmes mais garde les résumés. Coût ~0,03 €/veille, loggé dans `stats`.
- **Mistral** : clé dans `mistral-api-key.txt` (LOCAL uniquement, gitignoré) → secret GitHub
  `MISTRAL_API_KEY`. Ne jamais la committer (vérifier `git log --all -- mistral-api-key.txt` = vide).

## Setup GitHub (one-time)

1. Settings → Pages → Source: **GitHub Actions**.
2. Secrets Actions : `MISTRAL_API_KEY`, `NTFY_TOPIC`, `NTFY_TOKEN` (optionnel).
3. Variable de repo optionnelle : `SITE_URL`.
4. Premier run manuel : Actions → « Veille quotidienne » → Run workflow.

## Déploiement

`deploy-pages.yml` sur chaque push `main` : `npm ci` → écrit `app/static/config.json`
depuis `NTFY_TOPIC` → `npm run build -w app` avec `VIBE_VEILLE_BASE=/vibe-veille`
(prebuild embarque `data/`) → `upload-pages-artifact` (app/build) → `deploy-pages`.
