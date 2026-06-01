import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiCrud } from './helpers/auth';

test.describe('Modulo Financeiro', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiCrud(page, '**/api/financeiro**');
  });

  test('carrega pagina principal de financeiro', async ({ page }) => {
    await page.goto('/#/financeiro');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('sub-rota de contas a pagar', async ({ page }) => {
    await mockApiCrud(page, '**/api/financeiro/titulos-pagar**');
    await page.goto('/#/financeiro/titulos-pagar');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('sub-rota de contas a receber', async ({ page }) => {
    await mockApiCrud(page, '**/api/financeiro/titulos-receber**');
    await page.goto('/#/financeiro/titulos-receber');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('sub-rota de fluxo de caixa', async ({ page }) => {
    await mockApiCrud(page, '**/api/financeiro/fluxo-caixa**');
    await page.goto('/#/financeiro/fluxo-caixa');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });
});
