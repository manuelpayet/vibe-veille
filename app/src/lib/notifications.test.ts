import { describe, it, expect, beforeEach } from 'vitest';
import { getLastSeenDate, markVeilleSeen, hasNewVeille, ntfySubscribeUrl } from './notifications.js';

function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    }
  } as Storage;
}

let storage: Storage;
beforeEach(() => {
  storage = makeStorage();
});

describe('badge nouvelle veille', () => {
  it('pas de badge si aucune veille publiée', () => {
    expect(hasNewVeille(null, storage)).toBe(false);
  });

  it('badge affiché si jamais vu', () => {
    expect(hasNewVeille('2026-11-07', storage)).toBe(true);
  });

  it('badge affiché si la dernière veille publiée est plus récente que la vue', () => {
    markVeilleSeen('2026-11-06', storage);
    expect(hasNewVeille('2026-11-07', storage)).toBe(true);
  });

  it('pas de badge si la veille publiée a déjà été vue', () => {
    markVeilleSeen('2026-11-07', storage);
    expect(hasNewVeille('2026-11-07', storage)).toBe(false);
    expect(getLastSeenDate(storage)).toBe('2026-11-07');
  });
});

describe('ntfySubscribeUrl', () => {
  it('construit l URL du topic', () => {
    expect(ntfySubscribeUrl('vibe-veille-abc')).toBe('https://ntfy.sh/vibe-veille-abc');
  });

  it('repli sur la home ntfy sans topic', () => {
    expect(ntfySubscribeUrl(null)).toBe('https://ntfy.sh');
  });
});
