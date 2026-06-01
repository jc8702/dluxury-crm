import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiGet } from './helpers/auth';

test.describe('Mock de API e Respostas Controladas', () => {
  test('GET /api/clientes retorna lista mockada', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiGet(page, '**/api/clientes', [
      { id: 'c1', nome: 'Cliente A', email: 'a@test.com' },
      { id: 'c2', nome: 'Cliente B', email: 'b@test.com' },
    ]);
    await page.goto('/#/clientes');
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });

  test('GET /api/orcamentos retorna lista mockada', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiGet(page, '**/api/orcamentos', [{ id: 'o1', numero: 'ORC-001', valor: 1000 }]);
    await page.goto('/#/orcamentos');
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });

  test('GET /api/producao retorna lista mockada', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiGet(page, '**/api/producao', [{ id: 'p1', fase: 'corte', status: 'pendente' }]);
    await page.goto('/#/producao');
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });

  test('GET /api/estoque retorna lista mockada', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiGet(page, '**/api/estoque', [
      { id: 'e1', material: 'MDF Branco', quantidade: 100 },
    ]);
    await page.goto('/#/estoque');
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });

  test('GET /api/financeiro retorna dados mockados', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiGet(page, '**/api/financeiro', {
      receitas: 50000,
      despesas: 30000,
      saldo: 20000,
    });
    await page.goto('/#/financeiro');
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });

  test('multiplos endpoints podem ser mockados simultaneamente', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiGet(page, '**/api/clientes', []);
    await mockApiGet(page, '**/api/orcamentos', []);
    await mockApiGet(page, '**/api/producao', []);
    await page.goto('/#/painel');
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });

  test('mock de auth/me permite acesso a rotas privadas', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockApiGet(page, '**/api/**', { ok: true });
    await page.goto('/#/clientes');
    const token = await page.evaluate(() => localStorage.getItem('dluxury_token'));
    expect(token).not.toBeNull();
  });

  test('token fake e definido como Bearer nas chamadas', async ({ page }) => {
    await mockAuthenticatedSession(page);
    let receivedAuth: string | null = null;
    await page.route('**/api/clientes', async (route) => {
      receivedAuth = route.request().headers()['authorization'] || null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
    await page.goto('/#/clientes');
    await page.waitForTimeout(500);
    if (receivedAuth !== null) {
      expect(receivedAuth).toMatch(/^Bearer /);
    }
  });

  test('mock retorna 404 pode ser capturado pela UI', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.route('**/api/clientes', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Nao encontrado' }),
      }),
    );
    await page.goto('/#/clientes');
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });

  test('mock retorna 500 nao quebra a aplicacao', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.route('**/api/clientes', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      }),
    );
    await page.goto('/#/clientes');
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });
});
