<script lang="ts">
  import VeilleView from '#lib/VeilleView.svelte';
  import { BASE } from '#lib/api.js';

  let { data } = $props();
</script>

{#if data.notFound || !data.veille}
  <h1>Veille introuvable</h1>
  <p>
    Aucune veille archivée pour le {data.date}.
    <a href="{BASE}historique">Voir l'historique</a>
  </p>
{:else}
  <VeilleView veille={data.veille} />
{/if}
