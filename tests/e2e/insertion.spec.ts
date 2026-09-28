import { test, expect } from '@playwright/test';
import { mockInsertionApi, postsWith } from './helpers/insertionMock';

/**
 * TSK-15 — inserção de dados nos módulos sem cobertura E2E.
 * Cada teste abre o formulário de criação, preenche os campos obrigatórios,
 * submete e valida o payload enviado à API.
 */

test.describe('Inserção — Suprimentos/Engenharia', () => {
  test('Fornecedores — cadastra fornecedor', async ({ page }) => {
    const posts = await mockInsertionApi(page);
    await page.goto('/#/fornecedores');
    await page.getByRole('button', { name: /novo fornecedor/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 6000 });
    await dialog.getByLabel(/razão social/i).fill('Fornecedor E2E Teste');
    await dialog.getByRole('button', { name: /salvar fornecedor/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 8000 });
    expect(postsWith(posts, 'Fornecedor E2E Teste').length).toBeGreaterThan(0);
  });

  test('Engenharia — cadastra módulo', async ({ page }) => {
    const posts = await mockInsertionApi(page);
    await page.goto('/#/engenharia');
    await page.getByRole('button', { name: /novo módulo/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 6000 });
    await dialog.getByLabel(/nome do módulo/i).fill('Módulo E2E Teste');
    await dialog.getByLabel(/código do modelo/i).fill('MOD-E2E-1');
    await dialog.getByRole('button', { name: /salvar módulo/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 8000 });
    expect(postsWith(posts, 'Módulo E2E Teste').length).toBeGreaterThan(0);
  });

  test('Peças/SKU — cadastra SKU', async ({ page }) => {
    const posts = await mockInsertionApi(page);
    await page.goto('/#/pecas');
    await page.getByRole('button', { name: /novo sku/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 6000 });
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /chapas/i }).click();
    await dialog.getByLabel(/nome da peça/i).fill('Peça E2E Teste');
    await dialog.getByLabel(/preço base de custo/i).fill('12.5');
    await dialog.getByRole('button', { name: /salvar sku/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 8000 });
    expect(postsWith(posts, 'Peça E2E Teste').length).toBeGreaterThan(0);
  });

  test('Compras — salva novo pedido', async ({ page }) => {
    const posts = await mockInsertionApi(page);
    await page.goto('/#/compras');
    await page.getByRole('button', { name: /novo pedido/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 6000 });
    await dialog.getByRole('button', { name: /salvar pedido/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 8000 });
    expect(posts.filter((p) => p.url.includes('/api/compras')).length).toBeGreaterThan(0);
  });
});

test.describe('Inserção — Pós-Venda e Projetos', () => {
  test('Pós-Venda — abre chamado', async ({ page }) => {
    const posts = await mockInsertionApi(page);
    await page.goto('/#/pos-venda');
    await page.getByRole('button', { name: /novo chamado/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 6000 });
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /cliente e2e/i }).click();
    await dialog.getByLabel(/título do problema/i).fill('Chamado E2E Teste');
    await dialog
      .getByPlaceholder(/descreva o que aconteceu/i)
      .fill('Descrição do chamado gerado pelo teste E2E.');
    await dialog.getByRole('button', { name: /abrir chamado/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 8000 });
    expect(postsWith(posts, 'Chamado E2E Teste').length).toBeGreaterThan(0);
  });

  test('Projetos — cria projeto', async ({ page }) => {
    const posts = await mockInsertionApi(page);
    await page.goto('/#/projetos');
    await page.getByRole('button', { name: /novo projeto/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 6000 });

    const clientSelect = dialog.getByRole('combobox').first();
    await clientSelect.click();
    await page.getByRole('option', { name: /cliente e2e/i }).click();
    await dialog.getByPlaceholder(/detalhes/i).fill('Projeto criado pelo teste E2E de inserção.');
    await dialog.getByRole('button', { name: /criar projeto/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 8000 });
    expect(postsWith(posts, 'Projeto criado pelo teste E2E').length).toBeGreaterThan(0);
  });
});

test.describe('Inserção — Financeiro', () => {
  test('Títulos a Receber — wizard gera títulos', async ({ page }) => {
    const posts = await mockInsertionApi(page);
    await page.goto('/#/financeiro/titulos-receber');
    await page.getByRole('button', { name: /novo recebimento/i }).click();

    const drawer = page
      .locator('div.fixed.inset-0')
      .filter({ hasText: 'Novo Lançamento - Contas a Receber' })
      .first();
    await expect(drawer).toBeVisible({ timeout: 6000 });

    // Passo 1 — identificação
    await drawer.locator('select').nth(0).selectOption({ index: 1 });
    await drawer.locator('select').nth(1).selectOption({ index: 1 });
    await drawer.getByLabel(/número do documento/i).fill('TIT-E2E-42');
    await drawer.getByRole('button', { name: /próximo/i }).click();

    // Passo 2 — valores → preview de parcelas (POST)
    await drawer.getByRole('button', { name: /próximo/i }).click();

    // Passo 3 — confirmação
    await drawer.getByRole('button', { name: /confirmar e gerar títulos/i }).click();

    await expect(drawer).not.toBeVisible({ timeout: 8000 });
    expect(postsWith(posts, 'TIT-E2E-42').length).toBeGreaterThan(0);
  });
});
