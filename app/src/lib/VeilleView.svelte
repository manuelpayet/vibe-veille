<script lang="ts">
  import type { Veille } from './types.js';
  import { articleMap, formatDateFR } from './veille-utils.js';

  let { veille }: { veille: Veille } = $props();

  const byId = $derived(articleMap(veille));
</script>

<section class="meta">
  <h1>Veille du {formatDateFR(veille.date)}</h1>
  <p class="sub">
    {veille.articles.length} articles · {veille.sources.length} sources{#if veille.stats}
      · {veille.stats.llmCalls} appels LLM · ~{veille.stats.estimatedCostEur.toFixed(3)} €{/if}
  </p>
</section>

{#if veille.themes.length === 0}
  <p class="empty">Aucun thème détecté pour cette veille.</p>
{/if}

{#each veille.themes as theme (theme.id)}
  <section class="theme">
    <h2>{theme.label}</h2>
    <p class="trend">{theme.trend}</p>
    <ol class="top">
      {#each theme.topArticles as id (id)}
        {@const a = byId.get(id)}
        {#if a}
          <li class="card">
            <div class="card-head">
              <a class="title" href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
              {#if a.score !== null}<span class="score">{a.score}/100</span>{/if}
            </div>
            <span class="source">{a.sourceName}</span>
            {#if a.summary}<p class="summary">{a.summary}</p>{/if}
          </li>
        {/if}
      {/each}
    </ol>
  </section>
{/each}

<style>
  .meta h1 {
    margin-bottom: 0.25rem;
  }
  .sub {
    color: var(--muted);
    margin-top: 0;
  }
  .theme {
    margin-top: 2rem;
  }
  .theme h2 {
    margin-bottom: 0.25rem;
  }
  .trend {
    color: var(--muted);
    margin-top: 0;
  }
  .top {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: baseline;
  }
  .title {
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
  }
  .title:hover {
    text-decoration: underline;
  }
  .score {
    flex-shrink: 0;
    font-size: 0.8rem;
    background: var(--accent);
    color: #fff;
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
  }
  .source {
    font-size: 0.8rem;
    color: var(--muted);
  }
  .summary {
    margin: 0.4rem 0 0;
  }
  .empty {
    color: var(--muted);
  }
</style>
