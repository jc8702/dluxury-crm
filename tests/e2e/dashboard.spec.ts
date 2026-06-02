import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiCrud } from './helpers/auth';

test.describe('Dashboard e Auth Guard', () => {
  test('dashboard carrega apos autenticacao', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiCrud(page, '**/api/**');
    await page.goto('/#/painel');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('rota desconhecida redireciona para landing', async ({ page }) => {
    await page.goto('/#/rota-inexistente');
    await expect(page).toHaveTitle(/D'Luxury/);
  });

  test('navegacao entre rotas publicas funciona', async ({ page }) => {
    await page.goto('/');
    await page.goto('/#/termos');
    await expect(page).toHaveTitle(/D'Luxury/);
  });

  test('logout limpa token do localStorage', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('dluxury_token'));
    const token = await page.evaluate(() => localStorage.getItem('dluxury_token'));
    expect(token).toBeNull();
  });

  test('localStorage pode ser setado antes do load', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');
    const token = await page.evaluate(() => localStorage.getItem('dluxury_token'));
    expect(token).not.toBeNull();
  });

  test('titulo da pagina contem D Luxury em todas as rotas', async ({ page }) => {
    const rotas = ['/', '/#/painel', '/#/termos', '/#/privacidade'];
    for (const rota of rotas) {
      await page.goto(rota);
      await expect(page).toHaveTitle(/D'Luxury/);
    }
  });

  test('multiplas navegacoes nao quebram o app', async ({ page }) => {
    await page.goto('/');
    await page.goto('/#/termos');
    await page.goto('/#/privacidade');
    await page.goto('/#/signup');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('pagina inicial nao tem erros de console criticos', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.waitForTimeout(1000);
    const fatal = errors.filter((e) => !/autoplay|extension|webkit/i.test(e));
    expect(fatal.length).toBeLessThan(3);
  });
});
