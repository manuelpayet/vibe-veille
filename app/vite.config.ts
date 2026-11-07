import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// GitHub Pages "project" : le site est servi sous /<repo>/ -> base path à préfixer.
// VIBE_VEILLE_BASE=/vibe-veille au déploiement ; '' en local/e2e (base relative './').
const BASE_PATH = (process.env.VIBE_VEILLE_BASE ?? '') as '' | `/${string}`;

export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      paths: {
        base: BASE_PATH,
        // base renseigné -> URLs absolues (sinon kit 3 reste en relatif './')
        ...(BASE_PATH ? { relative: false } : {})
      },
      // fallback 404.html = mode SPA : GitHub Pages sert 404.html sur les routes inconnues,
      // le routage client prend le relais (nécessaire pour l'historique /veille/<date>)
      adapter: adapter({ fallback: '404.html', precompress: false, strict: true })
    })
  ]
});
