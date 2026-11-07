import { describe, it, expect, vi, afterEach } from 'vitest';
import { BASE, fetchIndex, fetchVeille } from './api.js';

afterEach(() => vi.unstubAllGlobals());

describe('api (base path)', () => {
  it('BASE est un chemin absolu avec slash final', () => {
    expect(BASE.startsWith('/')).toBe(true);
    expect(BASE.endsWith('/')).toBe(true);
  });

  it('fetchIndex appelle <BASE>data/index.json', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ veilles: [{ date: '2026-11-07' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const index = await fetchIndex();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}data/index.json`);
    expect(index.veilles[0].date).toBe('2026-11-07');
  });

  it('fetchVeille retourne null sur 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    expect(await fetchVeille('veille-2020-01-01.json')).toBeNull();
  });

  it('fetchIndex retourne un index vide sur erreur réseau', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await fetchIndex()).toEqual({ veilles: [] });
  });
});
