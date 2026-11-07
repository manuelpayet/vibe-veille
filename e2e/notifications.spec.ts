import { test, expect } from '@playwright/test';

test('badge "Nouveau" tant que la dernière veille n est pas consultée, puis il disparaît', async ({ page }) => {
  // premier chargement sur /historique : jamais vu -> badge visible
  await page.goto('/historique');
  await expect(page.locator('.badge')).toHaveText('Nouveau');

  // visiter la veille du jour marque comme vu
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Veille du 07/11/2026' })).toBeVisible();
  await page.goto('/historique');
  await expect(page.locator('.badge')).toHaveCount(0);
});

test('lien vers le topic ntfy configuré', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Notifs push' })).toHaveAttribute(
    'href',
    'https://ntfy.sh/vibe-veille-test-topic'
  );
});
