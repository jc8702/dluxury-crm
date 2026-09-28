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
 * - /api/quotations?action=search-skus (busca unificada: módulo/estoque/material)
 * - /api/quotations?action=add-item    (adiciona item e persiste em `itens`)
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
    if (/([?&])action=add-item/.test(url)) record('PUT_ADD_ITEM', payload);

    if (method === 'POST') {
      // inicializar() → retorna { id } e navega para ?id=...#/quotations
      await route.fulfill(ok(quotationMock()));
      return;
    }

    // Busca unificada do catálogo (módulos de engenharia + estoque + materiais)
    if (method === 'GET' && /([?&])action=search-skus/.test(url)) {
      const termo = (new URL(url).searchParams.get('q') || '').trim().toLowerCase();
      record('GET_SEARCH_SKUS', termo);
      const data =
        termo.length < 2
          ? []
          : catalogoMock().filter(
              (i) => i.nome.toLowerCase().includes(termo) || i.codigo.toLowerCase().includes(termo),
            );
      await route.fulfill(ok(data));
      return;
    }

    // Adicionar item ao orçamento: persiste em quotationState.itens para que o
    // GET de detalhe seguinte devolva o item (igual ao servidor real).
    if (method === 'PUT' && /([?&])action=add-item/.test(url)) {
      const { skuId, quantidade } = (payload || {}) as { skuId?: string; quantidade?: number };
      const sku = catalogoMock().find((i) => i.id === String(skuId));
      const itens = quotationState.itens as Record<string, any>[];
      const qtd = Number(quantidade) || 1;

      if (sku) {
        const existente = itens.find((i) => i.skuCodigo === sku.codigo);
        if (existente) {
          existente.quantidade = Number(existente.quantidade) + qtd;
        } else {
          itens.push({
            id: `item-e2e-${itens.length + 1}`,
            nomeCustomizado: sku.nome,
            skuCodigo: sku.codigo,
            skuDescricao: sku.nome,
            quantidade: qtd,
            unidadeMedida: 'UN',
            origemDados: sku.origem,
            custoUnitarioCalculado: sku.valor,
            custoBaseEstoque: sku.valor,
            precoVendaUnitario: Number((sku.valor * 1.3).toFixed(2)),
            margemLucro: 30,
            possuiOverride: false,
          });
        }
      }

      await route.fulfill(ok({}));
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

/**
 * Catálogo devolvido por /api/quotations?action=search-skus.
 * Espelha o shape real: { id, nome, codigo, valor, origem, tipo }.
 */
export function catalogoMock() {
  return [
    {
      id: '42',
      nome: 'Parafuso 4x40',
      codigo: 'PAR-440',
      valor: 0.35,
      origem: 'ESTOQUE',
      tipo: 'ITEM ESTOQUE',
    },
    {
      id: '7',
      nome: 'MDF 15mm Branco',
      codigo: 'MDF-15',
      valor: 120.5,
      origem: 'ESTOQUE',
      tipo: 'ITEM ESTOQUE',
    },
    {
      id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
      nome: 'Armário Aéreo 2 Portas',
      codigo: 'MOD-001',
      valor: 1500,
      origem: 'MODULO',
      tipo: 'MÓDULO',
    },
  ];
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
