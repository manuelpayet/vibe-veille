<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchIndex, fetchVeille } from '#lib/api.js';
  import VeilleView from '#lib/VeilleView.svelte';
  import type { Veille } from '#lib/types.js';

  let veille = $state<Veille | null>(null);
  let loading = $state(true);

  onMount(async () => {
    const index = await fetchIndex();
    const latest = index.veilles[0];
    if (latest) veille = await fetchVeille(latest.file);
    loading = false;
  });
</script>

{#if loading}
  <p>Chargement de la veille…</p>
{:else if veille}
  <VeilleView {veille} />
{:else}
  <h1>Veille du jour</h1>
  <p>Aucune veille générée pour l'instant — le premier run du workflow GitHub Actions arrive vers 07:07 UTC.</p>
{/if}
