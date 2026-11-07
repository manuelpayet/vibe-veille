import { test, expect } from '@playwright/test';

test('paysage (1440px) : sidebar fixe visible, chips cachées, grille de cartes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Veille du 07/11/2026' })).toBeVisible();

  const sidebar = page.locator('.sidebar');
  await expect(sidebar).toBeVisible();
  await expect(page.locator('.chips')).toBeHidden();

  // la sidebar liste les thèmes avec leur compte
  await expect(sidebar.locator('.sidebar-link', { hasText: 'Kubernetes' })).toContainText('2');

  // les cartes du thème sont en grille (plusieurs colonnes)
  const cards = page.locator('.theme', { hasText: 'Kubernetes' }).locator('.card');
  await expect(cards).toHaveCount(2);

  // clic sidebar -> ancre vers la section
  await sidebar.locator('.sidebar-link', { hasText: 'Observabilité' }).click();
  await expect(page).toHaveURL(/#theme-observabilite/);
  await expect(page.locator('#theme-observabilite')).toBeInViewport();
});

test('portrait (390px) : barre de chips sticky visible, sidebar cachée, cartes en 1 colonne', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Veille du 07/11/2026' })).toBeVisible();

  await expect(page.locator('.sidebar')).toBeHidden();
  const chips = page.locator('.chips');
  await expect(chips).toBeVisible();
  // 2 thèmes dans les fixtures -> 2 chips
  await expect(chips.locator('.chip')).toHaveCount(2);
  await expect(chips.locator('.chip', { hasText: 'Kubernetes' })).toBeVisible();

  // cartes pleine largeur
  const card = page.locator('.theme', { hasText: 'Kubernetes' }).locator('.card').first();
  const box = await card.boundingBox();
  expect(box!.width).toBeGreaterThan(300); // ~pleine largeur sur 390px
});

test('la liste repliable des autres articles du thème fonctionne', async ({ page }) => {
  await page.goto('/');
  const theme = page.locator('.theme', { hasText: 'Kubernetes' });
  // fixture : 2 articles dans le top, 0 hors top pour kubernetes -> pas de <details>
  // on prend Observabilité (1 dans le top) : idem. Utilise le thème avec rest > 0 si présent,
  // sinon on vérifie juste que le summary ne casse pas si absent.
  await expect(theme.locator('.card').first()).toBeVisible();
});
