import { test, expect } from '@playwright/test';

test('la page d accueil affiche la dernière veille avec thèmes et top articles', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Veille du 07/11/2026' })).toBeVisible();
  await expect(page.locator('.sub')).toContainText('4 articles');

  // thème Kubernetes avec sa tendance et ses 2 articles top
  const theme = page.locator('.theme', { hasText: 'Kubernetes' });
  await expect(theme.locator('.trend')).toContainText('Tendance fixture');
  const cards = theme.locator('.card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('Kubernetes 1.35 released');
  await expect(cards.first()).toContainText('Résumé fixture : K8s 1.35');
  await expect(cards.first().locator('a.title')).toHaveAttribute('href', 'https://ext.test/k8s-1-35');
  await expect(cards.first().locator('.score')).toHaveText('95');
  await expect(cards.first().locator('.score')).toHaveClass(/high/); // pastille verte >= 80

  // le thème hors-sujet n est pas affiché
  await expect(page.locator('.theme', { hasText: 'Hors sujet' })).toHaveCount(0);
});

test('la page historique liste les veilles et navigue vers une veille archivée', async ({ page }) => {
  await page.goto('/historique');
  await expect(page.getByRole('heading', { name: 'Historique des veilles' })).toBeVisible();
  await expect(page.getByRole('link', { name: /07\/11\/2026/ })).toBeVisible();
  await page.getByRole('link', { name: /06\/11\/2026/ }).click();
  await expect(page).toHaveURL(/\/veille\/2026-11-06/);
  await expect(page.getByRole('heading', { name: 'Veille du 06/11/2026' })).toBeVisible();
  await expect(page.locator('.theme', { hasText: 'GitLab CI' })).toBeVisible();
});

test('accès direct à une veille archivée via son URL', async ({ page }) => {
  await page.goto('/veille/2026-11-07');
  await expect(page.getByRole('heading', { name: 'Veille du 07/11/2026' })).toBeVisible();
  await expect(page.locator('.card').first()).toContainText('Kubernetes 1.35 released');
});

test('une date inconnue affiche une page introuvable', async ({ page }) => {
  await page.goto('/veille/2020-01-01');
  await expect(page.getByRole('heading', { name: 'Veille introuvable' })).toBeVisible();
});
