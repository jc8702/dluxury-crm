import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiCrud } from './helpers/auth';

test.describe('Modulo Estoque', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiCrud(page, '**/api/estoque**');
    await mockApiCrud(page, '**/api/movimentos-estoque**');
  });

  test('carrega pagina de estoque', async ({ page }) => {
    await page.goto('/#/estoque');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('rota de pecas/SKUs renderiza', async ({ page }) => {
    await mockApiCrud(page, '**/api/pecas**');
    await page.goto('/#/pecas');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('rota de fornecedores renderiza', async ({ page }) => {
    await mockApiCrud(page, '**/api/fornecedores**');
    await page.goto('/#/fornecedores');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('rota de compras renderiza', async ({ page }) => {
    await mockApiCrud(page, '**/api/compras**');
    await page.goto('/#/compras');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });
});
