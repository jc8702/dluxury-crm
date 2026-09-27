import type { Page } from '@playwright/test';

/**
 * Intercepta a API para os testes E2E de formulários (TSK-10).
 *
 * Além de responder com sucesso, captura as requisições POST/PUT em
 * `captured.<metodo>` para que os testes façam assertions sobre o payload
 * enviado (validação ponta a ponta: UI → request body).
 *
 * Endpoints cobertos:
 * - /api/clients  (GET lista, POST cria, PUT atualiza, DELETE remove)
 * - /api/quotations (GET lista/detalhe, POST cria rascunho, PUT atualiza header)
 * - /api/auth, /api/dashboard, /api/notifications (dados de suporte)
 */
export function setupFormApiMock(page: Page) {
  const captured: Record<string, unknown[]> = {};

  // Estado "persistido" do orçamento mockado: os PUTs mesclam aqui e os GETs
  // devolvem este estado — igual a um servidor real. Isso evita corridas em que
  // o reload pós-PUT desfaz edições ainda não refletidas.
  const quotationState: Record<string, unknown> = { ...quotationMock() };

  const record = (method: string, payload: unknown) => {
    captured[method] = captured[method] || [];
    captured[method].push(payload);
  };

  const ok = (data: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  });

  // ── Clientes ──────────────────────────────────────────────────────────────
  page.route('**/api/clients**', async (route) => {
    const method = route.request().method();
    const payload =
      method === 'POST' || method === 'PUT' || method === 'PATCH'
        ? route.request().postDataJSON()
        : null;

    if (method === 'POST') record('POST_CLIENT', payload);
    if (method === 'PUT' || method === 'PATCH') record('PUT_CLIENT', payload);

    if (method === 'GET') {
      await route.fulfill(ok([clienteMock()]));
    } else {
      await route.fulfill(ok(clienteMock(payload)));
    }
  });

  // ── Orçamentos ────────────────────────────────────────────────────────────
  page.route('**/api/quotations**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const payload =
      method === 'POST' || method === 'PUT' || method === 'PATCH'
        ? route.request().postDataJSON()
        : null;

    if (method === 'POST') record('POST_QUOTATION', payload);
    if (method === 'PUT' || method === 'PATCH') record('PUT_QUOTATION', payload);

    if (method === 'POST') {
      // inicializar() → retorna { id } e navega para ?id=...#/quotations
      await route.fulfill(ok(quotationMock()));
      return;
    }

    if (method === 'PUT') {
      // Persiste as mudanças no estado mockado (PUT do app envia updates parciais)
      Object.assign(quotationState, payload || {});
      await route.fulfill(ok({ ...quotationState }));
      return;
    }

    if (method === 'GET') {
      if (/[?&]id=/.test(url)) {
        record('GET_QUOTATION_DETAIL', url);
        await route.fulfill(ok({ ...quotationState }));
      } else {
        await route.fulfill(ok([{ ...quotationState }]));
      }
      return;
    }

    await route.fulfill(ok({}));
  });

  // ── Suporte (auth, dashboard, notificações) ───────────────────────────────
  page.route('**/api/dashboard**', (route) => route.fulfill(ok({})));
  page.route('**/api/notifications**', (route) => route.fulfill(ok([])));

  return captured;
}

// ── Factories de resposta ───────────────────────────────────────────────────

export function clienteMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-e2e-001',
    nome: 'Maria da Silva Teste',
    razao_social: 'Maria da Silva Teste',
    telefone: '(47) 99789-6229',
    email: 'maria.silva.teste@exemplo.com',
    cidade: 'Joinville',
    status: 'ativo',
    situacao_cadastral: 'ATIVA',
    criado_em: new Date().toISOString(),
    ...overrides,
  };
}

export function quotationMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quotation-e2e-001',
    number: 'ORC-0001',
    status: 'RASCUNHO',
    clienteId: 'client-e2e-001',
    margemLucroPercentual: 30,
    taxaFinanceiraPercentual: 0,
    validadeDias: 15,
    descontoPercentual: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itens: [],
    ...overrides,
  };
}
