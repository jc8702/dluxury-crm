import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiCrud } from './helpers/auth';
import { setupFormApiMock } from './helpers/formApi';

test.describe('Orçamentos', () => {
  test.beforeEach(async ({ page }) => {
    // Cobertura ampla primeiro; os mocks específicos (auth/orçamentos) registrados
    // depois têm prioridade no Playwright.
    await mockApiCrud(page, '**/api/**');
    await mockAuthenticatedSession(page);
    setupFormApiMock(page);
  });

  test('usuário consegue navegar até orçamentos', async ({ page }) => {
    await page.goto('/#/painel');
    await expect(page.getByRole('link', { name: 'Painel Geral' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: 'Orçamentos' }).first().click();

    await expect(page).toHaveURL(/#\/quotations/, { timeout: 5000 });
    await expect(page.getByRole('button', { name: /novo orçamento/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('página de orçamentos carrega sem erro', async ({ page }) => {
    await page.goto('/#/quotations');
    await expect(page.locator('[class*="error-boundary"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /novo orçamento/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
