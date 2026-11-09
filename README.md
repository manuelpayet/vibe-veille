# Vibe Veille

Veille SRE quotidienne, 100 % statique : un workflow GitHub Actions collecte les sources,
l'API Mistral résume et structure les tendances, le résultat est commité dans `data/` et
publié sur GitHub Pages sous forme de PWA SvelteKit, avec notification ntfy.sh.

## Architecture

```
generator/   package Node/TS exécuté par le workflow : fetch des sources -> résumé de chaque
             article (mistral-small-latest) -> analyse globale des tendances (mistral-large-latest)
             -> data/veille-<date>.json + data/index.json
app/         PWA SvelteKit (adapter-static, SPA) : veille du jour, historique /veille/<date>,
             badge "Nouveau", service worker offline, manifest
 data/        veilles générées, commitées par le workflow (tout l'historique est conservé)
e2e/         tests Playwright (fixtures dans e2e/fixtures/data)
watchdog/    Worker Cloudflare (cron triggers 07:07/07:37/08:22 UTC) qui déclenche veille.yml
             via l'API workflow_dispatch (GH_PAT en secret) — déclencheur principal, car le
             scheduler GitHub `schedule:` est best-effort et droppe des runs sans trace.
             Voir watchdog/README.md (alternative zero-code : cron-job.org)
.github/workflows/veille.yml        cron 07:07/07:37/08:22 UTC (fallback) + manuel (case « force ») :
                                    génère la veille, commit data/, notif ntfy, ping healthchecks.io —
                                    garde-fou idempotent (1 veille/jour max)
.github/workflows/deploy-pages.yml  sur push main : build app (data/ embarqué) + deploy-pages
.github/workflows/ci.yml            typecheck + tests unitaires + build + dry-run générateur + e2e
```

Flux d'une veille : `veille.yml` (créneaux 07:07 / 07:37 / 08:22 UTC) → collecte (RSS/Atom, API Hacker News, RSS Reddit,
statuspage.io) sur les dernières 24 h → dédup par URL → **mistral-small-latest** résume chaque
article en FR (1 phrase) → **mistral-large-latest** classe par thème (liste fixe pro, voir
`generator/config/themes.json`), score 0-100, tendance du thème en 2-3 phrases, top 5 par thème
→ écrit `data/veille-<date>.json` → commit sur `main` → notif `ntfy.sh/<topic>` → `deploy-pages.yml`
rebuild et déploie le site avec les nouvelles données.

## Setup (à faire une fois sur GitHub)

1. Créer le repo (ici `manuelpayet/vibe-veille`), activer **Settings → Pages → Source: GitHub Actions**.
2. Secrets (**Settings → Secrets and variables → Actions**) :
   - `MISTRAL_API_KEY` : clé API Mistral (https://console.mistral.ai)
   - `NTFY_TOPIC` : topic ntfy.sh (nom long et non guessable, ex. `vibe-veille-x7f2...`)
   - `NTFY_TOKEN` : token d'accès ntfy (optionnel, si le topic est protégé) — `ntfy token` dans l'app
3. **Watchdog externe (recommandé)** : déployer `watchdog/` (Worker Cloudflare gratuit) qui
   déclenche le workflow 3x le matin via l'API — voir [watchdog/README.md](watchdog/README.md).
   Créer un PAT GitHub (scope `workflow`, ou fine-grained `Actions: read and write` sur ce repo)
   et le stocker en secret Cloudflare `GH_PAT` (jamais dans le repo).
4. **Alarme veille manquante** : créer un check sur https://healthchecks.io (période 1 jour,
   grace 2 h) et mettre son Ping URL dans les secrets Actions : `HEALTHCHECKS_PING_URL`.
   `veille.yml` ping cette URL à chaque run (`/fail` si échec) : si aucun ping n'arrive,
   healthchecks.io alerte (le cron GitHub ne prévient jamais d'un run droppé).
5. Premier run : **Actions → "Veille quotidienne" → Run workflow** (ou attendre le premier créneau, 07:07 UTC).
   Le workflow est idempotent : si `data/veille-<date du jour>.json` existe déjà, il ne régénère rien
   (sauf dispatch manuel avec la case « force » cochée).
4. Notifications push : ouvrir le lien « Notifs push » du site (pointe vers `https://ntfy.sh/<topic>`)
   et cliquer « Subscribe » dans l'app web ntfy (ou s'abonner au topic dans l'app mobile ntfy).
   La Push API interdit l'abonnement web push cross-origin, donc la notif proactive passe par
   l'app ntfy ; la PWA affiche en plus un badge « Nouveau » tant que la veille n'est pas lue.
   - Au clic sur la notif, l'en-tête ntfy `Click` ouvre `$SITE_URL` : onglet navigateur sur PC,
     **PWA installée sur Android** (l'URL est dans le scope de la webapp ; iOS ouvre Safari).
   - Variable de repo optionnelle : `SITE_URL` (Settings → Variables) pour surcharger l'URL par défaut
     `https://manuelpayet.github.io/vibe-veille/`.

## Déploiement GitHub Pages (project pages)

Le site est servi sous `https://<user>.github.io/<repo>/` : le workflow `deploy-pages.yml`
build avec `VIBE_VEILLE_BASE=/vibe-veille` (`paths.base` + `paths.relative=false` dans
`app/vite.config.ts`), donc toutes les URLs (data, manifest, SW, nav) sont préfixées.
En local/e2e, aucun base path n'est défini (URLs relatives à la racine).

## Développement local

```bash
npm ci
npm run typecheck     # tsc (generator) + svelte-check (app)
npm test              # tests unitaires generator + app
npm run test:e2e      # Playwright : build avec fixtures + preview local
npm run build         # build le site (copie data/ -> app/static/data si data/ existe)
npm run dev           # dev server de l'app
npm run start -w generator            # génère une veille (MISTRAL_API_KEY requis, écrit dans data/)
npm run start -w generator -- --no-llm --out /tmp/x   # dry-run sans LLM
npm run check-sources -w generator    # teste chaque source de config/sources.json
```

## Ajouter une source

Éditer `generator/config/sources.json` (types : `rss`, `hackernews`, `reddit`, `statuspage`),
puis valider avec `npm run check-sources -w generator`.

## Thèmes

`generator/config/themes.json` : liste fixe des thèmes pro (CCaaS Genesys/AWS, IA contact center,
Kubernetes, observabilité, sécurité/supply-chain, GitLab CI, OpenTofu, Helm/Traefik, Java/JVM,
build tooling). Le LLM peut créer un thème ponctuel si besoin (hybride) ; `horsPerimetre`
(vLLM, inférence LLM, GPU scheduling) est exclu de la veille pro.

## Coût LLM

Par veille : ~N appels `mistral-small-latest` (1/article, plafond 80) + 1 appel
`mistral-large-latest`. Le coût estimé est loggé dans le run et stocké dans `stats.estimatedCostEur`
de chaque veille (ordre de grandeur, constants dans `generator/src/mistral/client.ts`).

## Limites connues

- Les **runs planifiés GitHub Actions sont peu fiables** : la doc officielle admet que
  sous forte charge « some queued jobs may be dropped », sans aucun run créé ni notification.
  Dégradation massive constatée depuis les incidents du 2026-08-26 (discussions GitHub
  Community #206019 / #206027 / #207346) : sur ce repo aucun run `schedule` n'a jamais été
  créé (test ping `*/10 * * * *` le 2026-11-09 : 5 créneaux manqués d'affilée, workflow
  pourtant `active`). D'où le **watchdog externe** (`watchdog/`, Worker Cloudflare) comme
  déclencheur principal, les créneaux décalés en minutes en fallback, le garde-fou
  idempotent (une seule veille par jour) et le heartbeat healthchecks.io.
- Reddit rate-limite les IPs datacenter (429) : le fetcher est tolérant par subreddit.
- Azure Updates, le blog GCP et le blog Genesys n'exposent plus de flux RSS publics utilisables ;
  leur actu passe par AWS What's New / HN / Reddit / releases GitHub.
- Status pages AWS/GCP/Azure ne sont pas sur statuspage.io ; seul Cloudflare est suivi en
  incidents directs (les autres remontent via les blogs/What's New).
