import { defineConfig } from 'vitest/config';

// Tests unitaires du front (helpers purs) — sans le plugin SvelteKit.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
