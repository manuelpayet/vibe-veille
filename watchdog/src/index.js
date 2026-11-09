// Watchdog externe de la veille : déclenche le workflow "Veille quotidienne"
// via l'API workflow_dispatch, 3 fois le matin (07:07 / 07:37 / 08:22 UTC).
// Le garde-fou idempotent du workflow garantit 1 veille/jour max.
// Le token GitHub (PAT avec scope "workflow" ou fine-grained "Actions: read and write"
// sur ce repo) est stocké en secret Cloudflare : GH_PAT. Jamais commité.
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(declencherVeille(event.cron, env));
  }
};

async function declencherVeille(cron, env) {
  const url =
    'https://api.github.com/repos/manuelpayet/vibe-veille/actions/workflows/veille.yml/dispatches';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GH_PAT}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'vibe-veille-watchdog'
      },
      body: JSON.stringify({ ref: 'main' })
    });
    const body = await res.text();
    // 204 = run créé ; 403/404/422 = token ou workflow introuvable -> visible dans les logs
    console.log(`[${cron}] dispatch veille.yml -> HTTP ${res.status} ${body}`);
  } catch (err) {
    console.error(`[${cron}] dispatch en erreur :`, err);
  }
}
