import { test, expect } from '@playwright/test';

test.describe('Paginas Publicas - Autenticacao', () => {
  test('rota /login redireciona para /painel que cai no login', async ({ page }) => {
    await page.goto('/#/login');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('form de login tem campo de e-mail', async ({ page }) => {
    await page.goto('/#/painel');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('form de login tem campo de senha', async ({ page }) => {
    await page.goto('/#/painel');
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
  });

  test('form de login tem botao de submit', async ({ page }) => {
    await page.goto('/#/painel');
    const submit = page.locator('button[type="submit"]').first();
    await expect(submit).toBeVisible({ timeout: 10000 });
  });

  test('pagina de signup renderiza formulario', async ({ page }) => {
    await page.goto('/#/signup');
    await expect(page.getByText(/cadastro|criar conta|empresa/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('signup tem campo de empresa', async ({ page }) => {
    await page.goto('/#/signup');
    await expect(page.locator('#input-empresa')).toBeVisible({ timeout: 10000 });
  });

  test('signup tem campo de e-mail', async ({ page }) => {
    await page.goto('/#/signup');
    await expect(page.locator('#input-email')).toBeVisible({ timeout: 10000 });
  });

  test('signup tem campo de senha e confirmacao', async ({ page }) => {
    await page.goto('/#/signup');
    await expect(page.locator('#input-senha')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#input-confirmar-senha')).toBeVisible({ timeout: 10000 });
  });

  test('pagina de termos de uso renderiza', async ({ page }) => {
    await page.goto('/#/termos');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('pagina de politica de privacidade renderiza', async ({ page }) => {
    await page.goto('/#/privacidade');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
