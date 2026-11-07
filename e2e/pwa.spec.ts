import { test, expect } from '@playwright/test';

test('le manifest PWA est servi et valide', async ({ page }) => {
  const res = await page.request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toBe('Vibe Veille');
  expect(manifest.display).toBe('standalone');
  expect(['./', '/']).toContain(manifest.start_url); // relatif = compatible base path
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  // le manifest est linké dans le HTML (href relatif ou absolu selon le base path)
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest$/);
});

test('les icônes sont servies', async ({ page }) => {
  for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png']) {
    const res = await page.request.get(icon);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});

test('le service worker s enregistre et la dernière veille reste lisible hors-ligne', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Veille du 07/11/2026' })).toBeVisible();

  // attend que le SW soit actif, contrôle la page, et ait précaché les données
  const swReady = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg?.active;
  });
  expect(swReady).toBe(true);
  await page.waitForFunction(async () => {
    if (!navigator.serviceWorker.controller) return false;
    const keys = await caches.keys();
    for (const k of keys) {
      const c = await caches.open(k);
      if (await c.match('/data/index.json', { ignoreVary: true })) return true;
    }
    return false;
  }, undefined, { timeout: 15_000 });

  // hors-ligne : la page et les données doivent venir du cache
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Veille du 07/11/2026' })).toBeVisible();
  await expect(page.locator('.card').first()).toContainText('Kubernetes 1.35 released');
  await context.setOffline(false);
});
