import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('carrega a landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/D'Luxury/);
  });

  test('exibe o hero com branding D Luxury', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /O ERP Definitivo/i })).toBeVisible();
  });

  test('lista modulos do produto na landing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Plano de Corte/i).first()).toBeVisible();
    await expect(page.locator('strong', { hasText: 'CRM' }).first()).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Orçamentos' }).first()).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Produção' }).first()).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Estoque' }).first()).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Financeiro' }).first()).toBeVisible();
  });

  test('usuario nao logado ve CTA de entrada', async ({ page }) => {
    await page.goto('/');
    const ctaButton = page
      .locator('a, button')
      .filter({ hasText: /entrar|acesse|login/i })
      .first();
    await expect(ctaButton).toBeVisible();
  });
});
