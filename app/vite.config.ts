import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      // fallback 404.html = mode SPA : GitHub Pages sert 404.html sur les routes inconnues,
      // le routage client prend le relais (nécessaire pour l'historique /veille/<date>)
      adapter: adapter({ fallback: '404.html', precompress: false, strict: true })
    })
  ]
});
