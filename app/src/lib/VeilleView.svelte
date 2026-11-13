<script lang="ts">
  import type { Article, Veille } from './types.js';
  import { articleMap, formatDateFR } from './veille-utils.js';

  let { veille }: { veille: Veille } = $props();

  const byId = $derived(articleMap(veille));

  // repli quand l'analyse globale a échoué (0 thèmes) : liste plate des articles, plus récent d'abord
  const flatArticles = $derived(
    [...veille.articles].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  );

  // articles du thème hors top 5 (liste repliable)
  const restByTheme = $derived.by(() => {
    const map = new Map<string, Article[]>();
    for (const t of veille.themes) map.set(t.id, []);
    for (const a of veille.articles) {
      const theme = veille.themes.find((t) => t.id === a.theme);
      if (theme && a.theme && !theme.topArticles.includes(a.id)) {
        map.get(a.theme)!.push(a);
      }
    }
    for (const list of map.values()) list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return map;
  });

  function scoreClass(score: number | null): string {
    if (score === null) return '';
    if (score >= 80) return 'high';
    if (score >= 60) return 'mid';
    return 'low';
  }
</script>

<header class="veille-header">
  <h1>Veille du {formatDateFR(veille.date)}</h1>
  <p class="sub">
    {veille.articles.length} articles · {veille.sources.length} sources{#if veille.stats}
      · {veille.stats.llmCalls} appels LLM · ~{veille.stats.estimatedCostEur.toFixed(3)} €{/if}
  </p>
</header>

{#if veille.themes.length === 0}
  {#if flatArticles.length > 0}
    <p class="empty">Aucun thème détecté pour cette veille — voici les {flatArticles.length} articles collectés :</p>
    <ul class="flat">
      {#each flatArticles as a (a.id)}
        <li>
          <div class="flat-head">
            <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
            <span class="source">{a.sourceName}</span>
          </div>
          {#if a.summary}<p class="summary">{a.summary}</p>{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Aucun thème détecté pour cette veille.</p>
  {/if}
{:else}
  <div class="layout">
    <!-- paysage : sidebar fixe -->
    <aside class="sidebar">
      <p class="sidebar-title">Thèmes</p>
      <nav>
        {#each veille.themes as theme (theme.id)}
          <a class="sidebar-link" href="#theme-{theme.id}">
            <span class="sidebar-label">{theme.label}</span>
            <span class="count">{theme.topArticles.length}</span>
          </a>
        {/each}
      </nav>
    </aside>

    <!-- portrait : barre de chips sticky -->
    <div class="chips" aria-label="Thèmes">
      {#each veille.themes as theme (theme.id)}
        <a class="chip" href="#theme-{theme.id}">{theme.label} · {theme.topArticles.length}</a>
      {/each}
    </div>

    <main class="content">
      {#each veille.themes as theme (theme.id)}
        <section class="theme" id="theme-{theme.id}">
          <div class="theme-head">
            <h2>{theme.label}</h2>
            <span class="count">{theme.topArticles.length} article{theme.topArticles.length > 1 ? 's' : ''}</span>
          </div>
          <p class="trend">{theme.trend}</p>
          <div class="cards">
            {#each theme.topArticles as id (id)}
              {@const a = byId.get(id)}
              {#if a}
                <article class="card">
                  <div class="card-head">
                    <a class="title" href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
                    {#if a.score !== null}<span class="score {scoreClass(a.score)}">{a.score}</span>{/if}
                  </div>
                  <span class="source">{a.sourceName}</span>
                  {#if a.summary}<p class="summary">{a.summary}</p>{/if}
                </article>
              {/if}
            {/each}
          </div>
          {#if (restByTheme.get(theme.id) ?? []).length > 0}
            <details class="more">
              <summary>{(restByTheme.get(theme.id) ?? []).length} autre{(restByTheme.get(theme.id) ?? []).length > 1 ? 's' : ''} article{(restByTheme.get(theme.id) ?? []).length > 1 ? 's' : ''} dans ce thème</summary>
              <ul>
                {#each restByTheme.get(theme.id) ?? [] as a (a.id)}
                  <li>
                    <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
                    <span class="source">{a.sourceName}</span>
                    {#if a.score !== null}<span class="score {scoreClass(a.score)}">{a.score}</span>{/if}
                  </li>
                {/each}
              </ul>
            </details>
          {/if}
        </section>
      {/each}
    </main>
  </div>
{/if}

<style>
  .veille-header h1 {
    margin-bottom: 0.25rem;
  }
  .sub {
    color: var(--muted);
    margin-top: 0;
  }

  .layout {
    display: grid;
    grid-template-columns: 15rem 1fr;
    gap: 2rem;
    align-items: start;
  }

  /* --- sidebar (paysage) --- */
  .sidebar {
    position: sticky;
    top: 4.5rem;
  }
  .sidebar-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 0 0 0.5rem;
  }
  .sidebar nav {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .sidebar-link {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: 0.5rem;
    color: var(--text);
    text-decoration: none;
    font-size: 0.9rem;
  }
  .sidebar-link:hover {
    background: var(--card);
  }
  .sidebar-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .count {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: var(--muted);
    background: var(--border);
    border-radius: 999px;
    padding: 0.05rem 0.45rem;
  }

  /* --- chips (portrait) : cachées en paysage --- */
  .chips {
    display: none;
  }

  /* --- contenu --- */
  .content {
    min-width: 0;
  }
  .theme {
    scroll-margin-top: 8rem;
    margin-bottom: 2.5rem;
  }
  .theme-head {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.4rem;
  }
  .theme-head h2 {
    margin: 0;
    font-size: 1.15rem;
  }
  .trend {
    color: var(--muted);
    margin: 0.6rem 0 1rem;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
    gap: 0.9rem;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 0.8rem 1rem;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .card:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: flex-start;
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
    font-size: 0.75rem;
    font-weight: 700;
    border-radius: 999px;
    padding: 0.15rem 0.5rem;
    color: #fff;
    background: var(--muted);
  }
  .score.high {
    background: #16a34a;
  }
  .score.mid {
    background: #d97706;
  }
  .score.low {
    background: #64748b;
  }
  .source {
    font-size: 0.8rem;
    color: var(--muted);
  }
  .summary {
    margin: 0.4rem 0 0;
    font-size: 0.92rem;
  }

  .more {
    margin-top: 0.75rem;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .more summary {
    cursor: pointer;
  }
  .more ul {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    display: grid;
    gap: 0.35rem;
  }
  .more li {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }
  .more li a {
    color: var(--text);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .more li a:hover {
    text-decoration: underline;
  }

  .flat {
    list-style: none;
    padding: 0;
    margin: 0.75rem 0 0;
    display: grid;
    gap: 0.9rem;
  }
  .flat-head {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .flat-head a {
    color: var(--text);
    text-decoration: none;
  }
  .flat-head a:hover {
    text-decoration: underline;
  }

  .empty {
    color: var(--muted);
  }

  /* --- portrait : sidebar -> chips sticky, cartes en 1 colonne --- */
  @media (max-width: 60rem) {
    .layout {
      display: block;
    }
    .sidebar {
      display: none;
    }
    .chips {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      position: sticky;
      top: 3.6rem;
      z-index: 9;
      background: var(--bg);
      padding: 0.5rem 0;
      scrollbar-width: none;
    }
    .chips::-webkit-scrollbar {
      display: none;
    }
    .chip {
      flex-shrink: 0;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.3rem 0.8rem;
      color: var(--text);
      text-decoration: none;
      font-size: 0.85rem;
    }
    .chip:active {
      border-color: var(--accent);
    }
    .cards {
      grid-template-columns: 1fr;
    }
    .theme {
      scroll-margin-top: 7rem;
    }
  }
</style>
