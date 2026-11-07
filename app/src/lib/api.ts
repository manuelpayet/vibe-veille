import type { Index, Veille } from './types.js';

// Les JSON de veille sont servis avec le site (copiés dans static/data au build).
export async function fetchIndex(): Promise<Index> {
  try {
    const r = await fetch('/data/index.json');
    if (!r.ok) return { veilles: [] };
    return (await r.json()) as Index;
  } catch {
    return { veilles: [] };
  }
}

export async function fetchVeille(file: string): Promise<Veille | null> {
  try {
    const r = await fetch(`/data/${file}`);
    if (!r.ok) return null;
    return (await r.json()) as Veille;
  } catch {
    return null;
  }
}
