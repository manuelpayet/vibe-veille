<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<header class="topbar">
  <nav>
    <a class="brand" href="/">Vibe Veille</a>
    <a href="/">Veille du jour</a>
    <a href="/historique">Historique</a>
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
  .page {
    max-width: 52rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }
</style>
