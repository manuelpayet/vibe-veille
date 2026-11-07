// Service worker PWA : précache les assets du build (dont /data/*) à l'installation,
// puis stale-while-revalidate en runtime -> la dernière veille reste lisible hors-ligne.
import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `vibe-veille-${version}`;
// en SvelteKit 3, immutable/assets/prerendered sont des { path } (ou des strings)
const toPath = (x) => (typeof x === 'string' ? x : x.path);
// chemins relatifs à la racine du SW (base incluse) : valables à la racine ET sous /vibe-veille/
const ASSETS = [...immutable, ...assets, ...prerendered].map(toPath).concat(['./', '404.html']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // tolérant : un asset en échec n'empêche pas l'installation
      .then((cache) => Promise.all(ASSETS.map((a) => cache.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // cross-origin : on ne touche pas

  event.respondWith(
    // ignoreVary : les réponses servies par le serveur de preview ont un Vary: Origin
    // qui empêcherait le match pour les requêtes module (import dynamique)
    caches.match(event.request, { ignoreVary: true }).then((cached) => {
      const fetched = fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached); // hors-ligne : on retombe sur le cache
      return cached ?? fetched;
    })
  );
});
