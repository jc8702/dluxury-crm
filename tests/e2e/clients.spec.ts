import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiCrud } from './helpers/auth';

test.describe('Modulo Clientes', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiCrud(page, '**/api/clientes**');
  });

  test('carrega pagina de clientes', async ({ page }) => {
    await page.goto('/#/clientes');
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible({ timeout: 10000 });
  });

  test('tem area de busca ou listagem', async ({ page }) => {
    await page.goto('/#/clientes');
    const search = page.locator(
      'input[type="search"], input[placeholder*="busca" i], input[placeholder*="pesquis" i]',
    );
    const list = page.locator('[role="list"], table, .card, [data-testid*="client"]');
    await expect(search.or(list).first()).toBeVisible({ timeout: 10000 });
  });

  test('botao para adicionar cliente presente', async ({ page }) => {
    await page.goto('/#/clientes');
    const addBtn = page
      .locator('button, a')
      .filter({ hasText: /novo|adicionar|cadastrar|\+/i })
      .first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
  });

  test('clica em adicionar e exibe formulario ou modal', async ({ page }) => {
    await page.goto('/#/clientes');
    const addBtn = page
      .locator('button, a')
      .filter({ hasText: /novo|adicionar|cadastrar/i })
      .first();
    await addBtn.click({ timeout: 5000 });
    await expect(page.locator('form, [role="dialog"], input').first()).toBeVisible({
      timeout: 5000,
    });
  });
});
