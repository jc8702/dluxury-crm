import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockApiCrud } from './helpers/auth';
import { setupFormApiMock } from './helpers/formApi';
import { ORCAMENTO_FIXO } from './helpers/formData';

test.describe('Modulo Orcamentos — formulário ponta a ponta (TSK-10)', () => {
  let captured: Record<string, unknown[]>;

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    captured = setupFormApiMock(page);
  });

  test('cadastra cliente e cria orcamento vinculado (fluxo completo)', async ({ page }) => {
    // ── Etapa 1: cadastrar cliente via formulário ──
    await page.goto('/#/clientes');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
    await page
      .getByRole('button', { name: /novo cliente/i })
      .first()
      .click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('#client-form')).toBeVisible({ timeout: 5000 });
    await dialog.getByLabel('Nome Completo').fill('Maria da Silva Teste');
    await dialog.getByLabel('WhatsApp').fill('(47) 99789-6229');
    await dialog.locator('button[type="submit"]').click();
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });

    // ── Etapa 2: criar orçamento ──
    await page.goto('/#/quotations');
    await expect(page.getByRole('button', { name: /novo orçamento/i }).first()).toBeVisible({
      timeout: 10000,
    });
    await page
      .getByRole('button', { name: /novo orçamento/i })
      .first()
      .click();

    // POST /api/quotations acontece e o app navega para ?id=...#/quotations
    await page.waitForURL(/\?id=.+#\/quotations/, { timeout: 10000 });

    const posts = (captured['POST_QUOTATION'] || []) as Record<string, unknown>[];
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]).toHaveProperty('header');
  });

  test('edita configuracoes comerciais e salva o orcamento (PUT /api/quotations)', async ({
    page,
  }) => {
    // Abre diretamente um orçamento existente (mock retornará quotationMock())
    await page.goto('/?id=quotation-e2e-001#/quotations');
    await expect(page.getByText(/configurações comerciais/i).first()).toBeVisible({
      timeout: 10000,
    });

    // ── Editar campos do cabeçalho ──
    // Serializa cada edição: após cada PUT o app recarrega o orçamento (GET de
    // detalhe) e isso reseta os campos locais. Esperar o GET correspondente
    // elimina a corrida UI × background-refresh entre fill e blur.
    const putCount = () => (captured['PUT_QUOTATION'] || []).length;
    const getDetailCount = () => (captured['GET_QUOTATION_DETAIL'] || []).length;

    const taxa = page.getByLabel('Taxa Financeira (%)');
    await expect(taxa).toBeVisible({ timeout: 10000 });

    // Carga inicial concluída (1º GET de detalhe já aconteceu)
    await expect.poll(getDetailCount, { timeout: 10000 }).toBeGreaterThanOrEqual(1);
    const baselineGets = await getDetailCount();

    await taxa.fill(ORCAMENTO_FIXO.taxaFinanceiraPercentual);
    await taxa.blur(); // onBlur dispara o PUT
    await expect.poll(putCount, { timeout: 5000 }).toBe(1);
    await expect.poll(getDetailCount, { timeout: 5000 }).toBe(baselineGets + 1); // reload pós-PUT concluído

    const validade = page.getByLabel('Validade (Dias)');
    await validade.fill(ORCAMENTO_FIXO.validadeDias);
    await validade.blur(); // onBlur dispara o PUT
    await expect.poll(putCount, { timeout: 5000 }).toBe(2);
    await expect.poll(getDetailCount, { timeout: 5000 }).toBe(baselineGets + 2);

    // ── Salvar proposta ──
    await page.getByRole('button', { name: /salvar proposta/i }).click();
    await expect.poll(putCount, { timeout: 5000 }).toBe(3);
    await expect.poll(getDetailCount, { timeout: 5000 }).toBe(baselineGets + 3);

    // Toast de sucesso
    await expect(page.getByText(/salva como rascunho com sucesso/i)).toBeVisible({
      timeout: 5000,
    });

    // PUTs capturados: taxa, validade e o clique em Salvar Proposta
    const puts = (captured['PUT_QUOTATION'] || []) as Record<string, unknown>[];
    expect(puts).toHaveLength(3);
    expect(Number(puts[0].taxaFinanceiraPercentual)).toBe(2);
    expect(Number(puts[1].validadeDias)).toBe(20);
    expect(puts[2].status).toBe('RASCUNHO');
  });

  test('campos principais do orcamento estao presentes e editaveis', async ({ page }) => {
    await page.goto('/?id=quotation-e2e-001#/quotations');
    await expect(page.getByText(/configurações comerciais/i).first()).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByLabel('Cliente')).toBeVisible();
    await expect(page.getByLabel('Margem de Lucro (%)')).toBeVisible();
    await expect(page.getByLabel('Taxa Financeira (%)')).toBeVisible();
    await expect(page.getByLabel('Validade (Dias)')).toBeVisible();

    const numericInputs = page.locator('input[type="number"]');
    expect(await numericInputs.count()).toBeGreaterThanOrEqual(3);
  });

  test('seleciona cliente no dropdown do orcamento', async ({ page }) => {
    await page.goto('/?id=quotation-e2e-001#/quotations');
    await expect(page.getByText(/configurações comerciais/i).first()).toBeVisible({
      timeout: 10000,
    });

    const clienteSelect = page.getByLabel('Cliente');
    await expect(clienteSelect).toBeVisible({ timeout: 10000 });
    // O mock de /api/clients fornece o cliente fixo como opção
    await clienteSelect.selectOption({ label: ORCAMENTO_FIXO.clienteNome });

    // A troca de cliente dispara PUT com o clienteId (aguarda a requisição assíncrona)
    await expect
      .poll(
        () =>
          ((captured['PUT_QUOTATION'] || []) as Record<string, unknown>[]).some(
            (p) => p.clienteId === 'client-e2e-001',
          ),
        { timeout: 5000 },
      )
      .toBeTruthy();
  });
});

// Mantém os testes de smoke originais
test.describe('Modulo Orcamentos — smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    setupFormApiMock(page);
  });

  test('carrega formulario de novo orcamento', async ({ page }) => {
    await page.goto('/#/quotations');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('botao de acao presente no formulario', async ({ page }) => {
    await page.goto('/?id=quotation-e2e-001#/quotations');
    const actions = page.locator('button').filter({ hasText: /salvar|gerar|exportar|enviar/i });
    await expect(actions.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Modulo Orcamentos — navegação e carga da lista', () => {
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
