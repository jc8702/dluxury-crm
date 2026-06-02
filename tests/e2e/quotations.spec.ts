import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiCrud } from './helpers/auth';

test.describe('Modulo Orcamentos', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiCrud(page, '**/api/orcamentos**');
    await mockApiCrud(page, '**/api/clientes**');
  });

  test('carrega formulario de novo orcamento', async ({ page }) => {
    await page.goto('/#/orcamentos');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('exibe campos principais do orcamento', async ({ page }) => {
    await page.goto('/#/orcamentos');
    await expect(page.getByText(/cliente/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('tem campo de margem de lucro', async ({ page }) => {
    await page.goto('/#/orcamentos');
    await expect(page.getByText(/margem de lucro/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('tem campo de taxa financeira', async ({ page }) => {
    await page.goto('/#/orcamentos');
    await expect(page.getByText(/taxa financeira/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('tem campo de validade em dias', async ({ page }) => {
    await page.goto('/#/orcamentos');
    await expect(page.getByText(/validade/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('formulario e editavel - inputs de numero', async ({ page }) => {
    await page.goto('/#/orcamentos');
    const numericInputs = page.locator('input[type="number"]');
    await expect(numericInputs.first()).toBeVisible({ timeout: 10000 });
  });

  test('botao de acao presente no formulario', async ({ page }) => {
    await page.goto('/#/orcamentos');
    const actions = page.locator('button').filter({ hasText: /salvar|gerar|exportar|adicionar/i });
    await expect(actions.first()).toBeVisible({ timeout: 10000 });
  });
});
