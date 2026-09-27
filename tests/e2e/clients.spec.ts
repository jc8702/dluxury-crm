import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './helpers/auth';
import { setupFormApiMock } from './helpers/formApi';
import { CLIENTE_FIXO } from './helpers/formData';

test.describe('Modulo Clientes — formulário ponta a ponta (TSK-10)', () => {
  let captured: Record<string, unknown[]>;

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    captured = setupFormApiMock(page);
    await page.goto('/#/clientes');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
  });

  test('carrega pagina de clientes', async ({ page }) => {
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible({ timeout: 10000 });
  });

  test('clica em Novo Cliente e o modal abre com o formulario', async ({ page }) => {
    await page
      .getByRole('button', { name: /novo cliente/i })
      .first()
      .click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('#client-form')).toBeVisible();
  });

  test('preenche e submete o cadastro completo (POST /api/clients)', async ({ page }) => {
    await page
      .getByRole('button', { name: /novo cliente/i })
      .first()
      .click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('#client-form')).toBeVisible({ timeout: 5000 });

    // ── Dados Pessoais ──
    await dialog.getByLabel('Nome Completo').fill(CLIENTE_FIXO.nome);
    await dialog.getByLabel('CPF (opcional)').fill(CLIENTE_FIXO.cpf);

    // ── Contato ──
    await dialog.getByLabel('WhatsApp').fill(CLIENTE_FIXO.telefone);
    await dialog.getByLabel('E-mail').fill(CLIENTE_FIXO.email);

    // ── Endereço ──
    await dialog.getByLabel('Endereço', { exact: true }).fill(CLIENTE_FIXO.endereco);
    await dialog.getByLabel('Bairro').fill(CLIENTE_FIXO.bairro);
    await dialog.getByLabel('Cidade').fill(CLIENTE_FIXO.cidade);
    await dialog.getByLabel('UF').fill(CLIENTE_FIXO.uf);

    // ── Perfil do Lead ──
    await dialog.getByLabel('Tipo de Imóvel').selectOption(CLIENTE_FIXO.tipoImovel);
    await dialog.getByLabel('Como chegou').selectOption(CLIENTE_FIXO.origem);

    // ── Cômodos (chips) ──
    await dialog.locator('button', { hasText: CLIENTE_FIXO.comodo }).first().click();

    // ── Observações ──
    await dialog.getByLabel('Observações').fill(CLIENTE_FIXO.observacoes);

    // ── Submissão ──
    await dialog.locator('button[type="submit"]').click();

    // Toast de sucesso (feedback global — TSK-09)
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/cadastrado com sucesso/i)).toBeVisible();

    // Payload capturado na interceptação de rede
    // (telefone chega normalizado — o Zod do app remove a máscara)
    const telefoneNormalizado = CLIENTE_FIXO.telefone.replace(/\D/g, '');
    const posts = (captured['POST_CLIENT'] || []) as Record<string, unknown>[];
    expect(posts.length).toBeGreaterThan(0);
    const payload = posts[0];
    expect(payload.nome).toBe(CLIENTE_FIXO.nome);
    expect(payload.telefone).toBe(telefoneNormalizado);
    expect(payload.email).toBe(CLIENTE_FIXO.email);
    expect(payload.cidade).toBe(CLIENTE_FIXO.cidade);
    expect(payload.uf).toBe(CLIENTE_FIXO.uf);
    expect(payload.origem).toBe(CLIENTE_FIXO.origem);
  });

  test('validacao obrigatoria: submeter sem nome bloqueia envio', async ({ page }) => {
    await page
      .getByRole('button', { name: /novo cliente/i })
      .first()
      .click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('#client-form')).toBeVisible({ timeout: 5000 });

    // Preenche apenas o telefone (nome fica vazio) — o form fica dirty e o botão habilita
    await dialog.getByLabel('WhatsApp').fill(CLIENTE_FIXO.telefone);

    // Submete: a validação Zod deve bloquear e exibir erro de validação no campo
    await dialog.locator('button[type="submit"]').click();

    // Mensagem de erro do campo obrigatório (hint de erro do Input)
    await expect(dialog.getByText(/mínimo 3 caracteres/i)).toBeVisible({ timeout: 5000 });

    // Nenhum POST deve ter sido enviado
    expect((captured['POST_CLIENT'] || []).length).toBe(0);

    // Modal continua aberto (form não fechou)
    await expect(dialog).toBeVisible();
  });
});

// Mantém os testes de smoke originais
test.describe('Modulo Clientes — smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    setupFormApiMock(page);
  });

  test('tem area de busca ou listagem', async ({ page }) => {
    await page.goto('/#/clientes');
    const search = page.locator(
      'input[type="search"], input[placeholder*="busca" i], input[placeholder*="pesquis" i]',
    );
    const list = page.locator('[role="list"], table, .card, [data-testid*="client"]');
    await expect(search.or(list).first()).toBeVisible({ timeout: 10000 });
  });

  test('botao para adicionar cliente presente', async ({ page }) => {
    await page.goto('/#/clientes');
    const addBtn = page
      .locator('button, a')
      .filter({ hasText: /novo|adicionar|cadastrar|\+/i })
      .first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
  });
});
