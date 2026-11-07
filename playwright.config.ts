import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173'
  },
  webServer: {
    // build l'app avec les données fixture, puis sert le build en preview
    command: 'npm run build:e2e -w app && npm run preview -w app -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
