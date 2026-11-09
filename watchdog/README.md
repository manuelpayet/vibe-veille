# Watchdog externe — déclencheur fiable de la veille

Le scheduler `schedule:` de GitHub Actions est best-effort : la doc officielle admet que
sous forte charge « some queued jobs may be dropped », sans aucun run créé ni notification
(dégradation massive constatée depuis les incidents du 2026-08-26, cf. discussions
GitHub Community #206019, #206027, #207346). D'où ce watchdog externe qui déclenche
le workflow `veille.yml` via l'API `workflow_dispatch`, 3 fois le matin :
**07:07 / 07:37 / 08:22 UTC**. Le garde-fou idempotent de `veille.yml` garantit qu'une
seule veille est générée par jour (les appels suivants sont des no-op).

## Option A (recommandée) : Worker Cloudflare, gratuit

1. Compte Cloudflare gratuit sur https://dash.cloudflare.com, puis dans ce dossier :
   ```bash
   cd watchdog
   npm install
   npx wrangler login
   ```
2. Créer un token GitHub : **Settings → Developer settings → Personal access tokens**.
   - Fine-grained : ressource `manuelpayet/vibe-veille`, permission **Actions: Read and write** ; ou
   - Classic : scope **`workflow`**.
3. Stocker le token en secret Cloudflare (jamais dans le repo) :
   ```bash
   npx wrangler secret put GH_PAT
   ```
4. Déployer :
   ```bash
   npm run deploy
   ```
5. Vérifier : `npm run tail` (logs des déclenchements) ou dashboard Cloudflare →
   Workers & Pages → `vibe-veille-watchdog` → Logs. Un run doit apparaître dans
   Actions → « Veille quotidienne » à chaque créneau (événement `workflow_dispatch`).
6. Test manuel sans attendre le cron : `npm run dev` puis
   `curl "http://localhost:8787/__scheduled?cron=7+7+*+*+*"`.

## Option B (zéro code) : cron-job.org, gratuit

Créer 3 jobs (fréquence cron, UTC) :

- URL : `https://api.github.com/repos/manuelpayet/vibe-veille/actions/workflows/veille.yml/dispatches`
- Méthode : `POST`, body : `{"ref":"main"}`
- Headers :
  - `Authorization: Bearer <PAT>` (même PAT qu'en option A)
  - `Accept: application/vnd.github+json`
  - `X-GitHub-Api-Version: 2022-11-28`
- Crons : `7 7 * * *`, `37 7 * * *`, `22 8 * * *`

Inconvénients : pas de SLA, timeout 30 s (suffisant ici, l'API répond en < 1 s), pas de retry.

## Alarme « veille manquante » : healthchecks.io (gratuit, 20 checks)

Le cron GitHub ne prévient pas quand un run est droppé. Pour être alerté :

1. Créer un check sur https://healthchecks.io : période **1 jour**, grace time **2 h**,
   alertes par email (ou webhook/ntfy).
2. Copier son **Ping URL** (`https://hc-ping.com/<uuid>`) dans les secrets Actions du
   repo : `HEALTHCHECKS_PING_URL`.
3. `veille.yml` ping cette URL à chaque fin de run (`/fail` en cas d'échec du job) :
   si aucun ping n'arrive dans la fenêtre, healthchecks.io envoie une alerte.

## Ce qui reste en place

- Le `schedule:` dans `.github/workflows/veille.yml` reste en fallback (harmless grâce
  au garde-fou idempotent).
- Le run manuel (Actions → « Veille quotidienne » → Run workflow, case « force » pour
  régénérer) reste disponible.
