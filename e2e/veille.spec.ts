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

test('bascule entre la vue prédéfinis et la vue dynamiques', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Veille du 07/11/2026' })).toBeVisible();

  // défaut : vue prédéfinis
  await expect(page.getByRole('button', { name: 'Prédéfinis' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.theme', { hasText: 'Kubernetes' })).toBeVisible();

  await page.getByRole('button', { name: 'Dynamiques' }).click();
  await expect(page.getByRole('button', { name: 'Dynamiques' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.theme', { hasText: 'Releases majeures' })).toBeVisible();
  await expect(page.locator('.theme', { hasText: 'Bases de données' })).toContainText('PostgreSQL 18');
  // le hors-sujet de la vue fixe redevient un thème en vue dynamique
  await expect(page.locator('.theme', { hasText: 'Hors périmètre pro' })).toContainText('Show HN fixture');
  // les thèmes prédéfinis ne sont plus affichés
  await expect(page.locator('.theme', { hasText: 'Observabilité' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Prédéfinis' }).click();
  await expect(page.locator('.theme', { hasText: 'Kubernetes' })).toBeVisible();
  await expect(page.locator('.theme', { hasText: 'Releases majeures' })).toHaveCount(0);
});

test('une veille ancienne sans thèmes dynamiques n affiche pas la bascule', async ({ page }) => {
  await page.goto('/veille/2026-11-06');
  await expect(page.locator('.theme', { hasText: 'GitLab CI' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dynamiques' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prédéfinis' })).toHaveCount(0);
});
