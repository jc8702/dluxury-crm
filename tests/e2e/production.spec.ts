import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiCrud, mockApiGet } from './helpers/auth';

test.describe('Modulo Producao', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiCrud(page, '**/api/producao**');
    await mockApiGet(page, '**/api/kanban-producao/board**', {
      a_fazer: [],
      em_progresso: [],
      bloqueado: [],
      concluido: []
    });
  });

  test('carrega pagina de producao', async ({ page }) => {
    await page.goto('/#/producao');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('exibe controles de fase de producao', async ({ page }) => {
    await page.goto('/#/producao');
    await expect(page.locator('button').first()).toBeVisible({ timeout: 10000 });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('tem botoes de acao de producao', async ({ page }) => {
    await page.goto('/#/producao');
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
  });

  test('rota de plano de corte renderiza', async ({ page }) => {
    await mockApiCrud(page, '**/api/plano-corte**');
    await page.goto('/#/plano-de-corte');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });
});
