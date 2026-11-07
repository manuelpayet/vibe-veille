<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchIndex } from '#lib/api.js';
  import { formatDateFR } from '#lib/veille-utils.js';
  import type { Index } from '#lib/types.js';

  let index = $state<Index>({ veilles: [] });
  let loading = $state(true);

  onMount(async () => {
    index = await fetchIndex();
    loading = false;
  });
</script>

<h1>Historique des veilles</h1>

{#if loading}
  <p>Chargement…</p>
{:else if index.veilles.length === 0}
  <p>Aucune veille archivée pour l'instant.</p>
{:else}
  <ul class="history">
    {#each index.veilles as v (v.date)}
      <li>
        <a href="/veille/{v.date}">{formatDateFR(v.date)}</a>
        <span class="muted">— {v.articlesCount} articles, {v.sourcesCount} sources</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .history {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .muted {
    color: var(--muted);
  }
</style>
