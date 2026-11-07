import type { Index, Veille } from './types.js';

// Base path du déploiement, toujours sous forme de chemin absolu avec slash final :
// '/' en local/e2e, '/vibe-veille/' sur GitHub Pages projet.
// (import.meta.env.BASE_URL vaut './' quand kit.paths.base est vide -> on normalise)
export const BASE = (import.meta.env.BASE_URL ?? '/').replace(/^\.?\//, '/');

// Les JSON de veille sont servis avec le site (copiés dans static/data au build).
export async function fetchIndex(): Promise<Index> {
  try {
    const r = await fetch(`${BASE}data/index.json`);
    if (!r.ok) return { veilles: [] };
    return (await r.json()) as Index;
  } catch {
    return { veilles: [] };
  }
}

export async function fetchVeille(file: string): Promise<Veille | null> {
  try {
    const r = await fetch(`${BASE}data/${file}`);
    if (!r.ok) return null;
    return (await r.json()) as Veille;
  } catch {
    return null;
  }
}
