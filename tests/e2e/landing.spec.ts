import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('carrega a landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/D'Luxury/);
  });

  test('exibe o hero com branding D Luxury', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('CRM & Clientes')).toBeVisible();
  });

  test('lista modulos do produto na landing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Plano de Corte')).toBeVisible();
    await expect(page.getByText('Simulador 3D CNC')).toBeVisible();
    await expect(page.getByText('Controle de Produção')).toBeVisible();
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
