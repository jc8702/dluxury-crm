import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './helpers/auth';

/**
 * TSK-15 — inserção de dados em módulos sem cobertura E2E.
 * Estoque: cadastro de material via modal (POST capturado e validado).
 */

type Post = { url: string; body: Record<string, unknown> };

/** Responde toda /api/** com shapes mínimos e grava os POST/PUT/PATCH. */
async function mockApi(page: import('@playwright/test').Page, posts: Post[]) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/auth')) {
      if (url.includes('action=me') || url.endsWith('/api/auth/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'user-test-001',
                email: 'admin@dluxury.com',
                nome: 'Admin Teste',
                role: 'admin',
                tenantId: '00000000-0000-0000-0000-000000000000',
                planoTier: 'enterprise',
              },
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
      return;
    }

    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      posts.push({ url, body: route.request().postDataJSON() });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'material-e2e-001' } }),
      });
      return;
    }

    const data = url.includes('type=categories') ? [{ id: 'cat-e2e-1', nome: 'Madeira' }] : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  });

  await mockAuthenticatedSession(page);
}

test.describe('Estoque — cadastro de material (TSK-15)', () => {
  test('abre o modal, preenche e submete com POST validado', async ({ page }) => {
    const posts: Post[] = [];
    await mockApi(page, posts);

    await page.goto('/#/estoque');
    await page
      .getByRole('button', { name: /novo material/i })
      .first()
      .click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // a categoria primeiro: ao trocar, o formulário autogera o SKU sequencial
    await dialog.locator('select[required]').selectOption('cat-e2e-1');
    await dialog.getByLabel(/sku/i).fill('SKU-E2E-001');
    await dialog.getByLabel(/nome comercial/i).fill('Chapa MDF 18mm E2E');
    await dialog.getByRole('button', { name: /salvar material/i }).click();

    // sucesso → modal fecha
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    expect(posts.length).toBeGreaterThan(0);
    const post = posts.find((p) => p.url.includes('/api/estoque'));
    expect(post).toBeTruthy();
    const payload = JSON.stringify(post!.body);
    expect(payload).toContain('SKU-E2E-001');
    expect(payload).toContain('Chapa MDF 18mm E2E');
    expect(payload).toContain('cat-e2e-1');
  });

  test('bloqueia a submissão sem SKU (validação obrigatória)', async ({ page }) => {
    const posts: Post[] = [];
    await mockApi(page, posts);

    await page.goto('/#/estoque');
    await page
      .getByRole('button', { name: /novo material/i })
      .first()
      .click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByLabel(/nome comercial/i).fill('Sem SKU E2E');
    await dialog.locator('select[required]').selectOption('cat-e2e-1');
    // limpa o SKU autogerado para exercitar a validação obrigatória
    await dialog.getByLabel(/sku/i).fill('');
    await dialog.getByRole('button', { name: /salvar material/i }).click();

    // formulário nativo bloqueia envio sem campo obrigatório → modal segue aberto
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByLabel(/sku/i)).toHaveValue('');
    expect(posts.filter((p) => p.url.includes('/api/estoque'))).toHaveLength(0);
  });
});
