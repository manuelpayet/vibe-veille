# Vibe Veille

Veille SRE quotidienne, 100 % statique : un workflow GitHub Actions collecte les sources,
l'API Mistral résume et structure les tendances, le résultat est commité dans `data/` et
publié sur GitHub Pages sous forme d'app SvelteKit (PWA, notifications via ntfy.sh).

## Architecture

```
generator/   package Node/TS exécuté par le workflow : fetch des sources (RSS blogs/newsletters,
             API Hacker News, JSON Reddit, status pages cloud) → résumé de chaque article
             (mistral-small-latest) → analyse globale des tendances (mistral-large-latest)
             → data/veille-<date>.json + data/index.json
app/         front SvelteKit (adapter-static) : veille du jour + historique, PWA installable,
             badge "nouvelle veille" + notifications push ntfy.sh
data/        veilles générées, commitées par le workflow
.github/workflows/veille.yml        cron 07:00 UTC + manuel : génère la veille, commit, notif ntfy
.github/workflows/deploy-pages.yml  déploiement GitHub Pages sur push main
```

## Développement local

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev        # front en local
npm run start -w generator   # lance le générateur en local (nécessite MISTRAL_API_KEY)
```

## Secrets GitHub requis

`MISTRAL_API_KEY`, `NTFY_TOPIC`, `NTFY_TOKEN` (voir README à jour en fin de projet).
