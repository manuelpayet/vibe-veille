<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { fetchIndex } from '#lib/api.js';
  import { fetchAppConfig, hasNewVeille, markVeilleSeen, ntfySubscribeUrl } from '#lib/notifications.js';

  let { children } = $props();

  let newBadge = $state(false);
  let ntfyUrl = $state('https://ntfy.sh');

  onMount(async () => {
    const [index, config] = await Promise.all([fetchIndex(), fetchAppConfig()]);
    ntfyUrl = ntfySubscribeUrl(config.ntfyTopic ?? null);
    const latest = index.veilles[0]?.date ?? null;
    if (latest && window.location.pathname === '/') {
      // visiter la veille du jour la marque comme vue
      markVeilleSeen(latest, localStorage);
      newBadge = false;
    } else {
      newBadge = hasNewVeille(latest, localStorage);
    }
  });
</script>

<header class="topbar">
  <nav>
    <a class="brand" href="/">Vibe Veille</a>
    <a href="/">
      Veille du jour
      {#if newBadge}<span class="badge">Nouveau</span>{/if}
    </a>
    <a href="/historique">Historique</a>
    <a href={ntfyUrl} target="_blank" rel="noopener noreferrer" title="S'abonner aux notifications push (ntfy)">
      Notifs push
    </a>
  </nav>
</header>

<main class="page">
  {@render children()}
</main>

<style>
  .topbar {
    border-bottom: 1px solid var(--border);
    background: var(--card);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  nav {
    max-width: 52rem;
    margin: 0 auto;
    padding: 0.75rem 1rem;
    display: flex;
    gap: 1.25rem;
    align-items: baseline;
  }
  .brand {
    font-weight: 700;
    color: var(--text);
    text-decoration: none;
    margin-right: auto;
  }
  nav a {
    color: var(--muted);
    text-decoration: none;
  }
  nav a:hover {
    color: var(--text);
  }
  .badge {
    margin-left: 0.4rem;
    background: var(--accent);
    color: #fff;
    font-size: 0.7rem;
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
    vertical-align: middle;
  }
  .page {
    max-width: 52rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }
</style>
